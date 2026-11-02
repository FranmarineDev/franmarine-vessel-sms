// Supabase Edge Function: alerts-digest
// Emails each region's managers a summary of overdue + upcoming compliance items.
// Mirrors src/lib/alerts.js. Schedule daily at 06:30 Sydney (see README).
//
// Secrets: RESEND_API_KEY (resend.com — free tier is fine), ALERT_FROM (e.g. "Vessel SMS <sms@franmarine.com.au>"),
//          APP_URL. Service role key is injected automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const DAY = 86400000;
const INDUCTION_VALID_DAYS = 365, ABSENCE_DAYS = 183;
const WARN = { induction: 30, smsReview: 60, absence: 150 };
const DRILLS = [
  { key: "fire", label: "Fire", interval: 31, warn: 7 }, { key: "mob", label: "Person overboard", interval: 31, warn: 7 },
  { key: "medical", label: "Medical emergency", interval: 92, warn: 14 }, { key: "abandon", label: "Abandon vessel", interval: 92, warn: 14 },
  { key: "flooding", label: "Flooding / damage control", interval: 92, warn: 14 }, { key: "diving", label: "Diving emergency", interval: 31, warn: 7 },
];
const dayDiff = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);
const addDays = (d: string, n: number) => new Date(new Date(d).getTime() + n * DAY).toISOString().slice(0, 10);
const fmt = (d: string) => new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "Australia/Sydney" });

type Alert = { level: "overdue" | "due"; title: string; detail: string; vessel: string | null; days: number };

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Australia/Sydney" });
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";

  const { data: recipients } = await admin.from("alert_recipients").select("*");
  const regions = [...new Set((recipients ?? []).map((r) => r.region))];
  const out: Record<string, unknown> = {};

  for (const region of regions) {
    const { data: vessels } = await admin.from("vessels").select("*").eq("region", region);
    const ids = (vessels ?? []).map((v) => v.id);
    const since = addDays(today, -400);
    const [{ data: crew }, { data: inductions }, { data: signOns }, { data: preDeps }, { data: drills }] = await Promise.all([
      admin.from("profiles").select("*").eq("region", region),
      admin.from("inductions").select("*").in("vessel_id", ids),
      admin.from("sign_ons").select("*").in("vessel_id", ids).gte("sign_on_date", since),
      admin.from("pre_departures").select("*").in("vessel_id", ids).gte("check_date", since),
      admin.from("drills").select("vessel_id, drill_type, drill_date").in("vessel_id", ids).gte("drill_date", since),
    ]);
    const alerts = compute({ vessels: vessels ?? [], crew: crew ?? [], inductions: inductions ?? [], signOns: signOns ?? [], preDeps: preDeps ?? [], drills: drills ?? [] }, today);
    const overdue = alerts.filter((a) => a.level === "overdue"), due = alerts.filter((a) => a.level === "due");
    out[region] = { overdue: overdue.length, due: due.length };
    if (!alerts.length || dryRun) continue;

    const html = render(region, overdue, due, Deno.env.get("APP_URL") ?? "");
    const to = (recipients ?? []).filter((r) => r.region === region || r.role === "admin").map((r) => r.email);
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) { out[region] = { ...out[region] as object, note: "RESEND_API_KEY not set — not sent" }; continue; }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: Deno.env.get("ALERT_FROM") ?? "Vessel SMS <onboarding@resend.dev>", to, subject: `Vessel SMS ${region}: ${overdue.length} overdue, ${due.length} upcoming`, html }),
    });
    out[region] = { ...out[region] as object, sent: res.ok, to };
  }
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});

function compute(d: any, today: string): Alert[] {
  const alerts: Alert[] = [];
  const byId = Object.fromEntries(d.vessels.map((v: any) => [v.id, v]));
  const crewById = Object.fromEntries(d.crew.map((c: any) => [c.id, c]));
  for (const v of d.vessels) {
    if (!v.sms_review_due) continue;
    const days = dayDiff(today, v.sms_review_due);
    if (days < 0) alerts.push({ level: "overdue", title: "SMS review overdue", detail: `${v.name} annual review was due ${fmt(v.sms_review_due)}`, vessel: v.name, days });
    else if (days <= WARN.smsReview) alerts.push({ level: "due", title: `SMS review due in ${days} days`, detail: `${v.name} — ${fmt(v.sms_review_due)}`, vessel: v.name, days });
  }
  const latest: Record<string, any> = {}, lastSO: Record<string, string> = {};
  for (const i of d.inductions) { const k = i.user_id + "|" + i.vessel_id; if (!latest[k] || i.completed_at > latest[k].completed_at) latest[k] = i; }
  for (const s of d.signOns) { const k = s.user_id + "|" + s.vessel_id; if (!lastSO[k] || s.sign_on_date > lastSO[k]) lastSO[k] = s.sign_on_date; }
  for (const [k, ind] of Object.entries(latest)) {
    const v = byId[ind.vessel_id], p = crewById[ind.user_id];
    if (!v || !p || p.status !== "approved") continue;
    const expires = addDays(ind.completed_at, INDUCTION_VALID_DAYS), days = dayDiff(today, expires);
    if (ind.sms_revision !== v.sms_revision) { alerts.push({ level: "overdue", title: "Re-induction required — SMS revised", detail: `${p.full_name} inducted on ${ind.sms_revision}, vessel now ${v.sms_revision}`, vessel: v.name, days: 0 }); continue; }
    if (days < 0) alerts.push({ level: "overdue", title: "Induction expired", detail: `${p.full_name} — expired ${fmt(expires)}`, vessel: v.name, days });
    else if (days <= WARN.induction) alerts.push({ level: "due", title: `Induction expires in ${days} days`, detail: `${p.full_name} — ${fmt(expires)}`, vessel: v.name, days });
    const lastActive = lastSO[k] || ind.completed_at.slice(0, 10), absent = dayDiff(lastActive, today);
    if (absent > ABSENCE_DAYS) alerts.push({ level: "overdue", title: `Re-induction required — ${absent} days absent`, detail: `${p.full_name} last signed on ${fmt(lastActive)}`, vessel: v.name, days: ABSENCE_DAYS - absent });
    else if (absent > WARN.absence) alerts.push({ level: "due", title: `Absence limit in ${ABSENCE_DAYS - absent} days`, detail: `${p.full_name} last signed on ${fmt(lastActive)}`, vessel: v.name, days: ABSENCE_DAYS - absent });
  }
  for (const v of d.vessels) for (const t of DRILLS) {
    const last = d.drills.filter((x: any) => x.vessel_id === v.id && x.drill_type === t.key).sort((a: any, b: any) => b.drill_date.localeCompare(a.drill_date))[0];
    if (!last) { alerts.push({ level: "overdue", title: `${t.label} drill — no record`, detail: `${v.name}: none recorded`, vessel: v.name, days: 0 }); continue; }
    const due = addDays(last.drill_date, t.interval), days = dayDiff(today, due);
    if (days < 0) alerts.push({ level: "overdue", title: `${t.label} drill overdue`, detail: `${v.name}: last ${fmt(last.drill_date)}, due ${fmt(due)}`, vessel: v.name, days });
    else if (days <= t.warn) alerts.push({ level: "due", title: `${t.label} drill due in ${days} days`, detail: `${v.name}: last ${fmt(last.drill_date)}`, vessel: v.name, days });
  }
  for (const pd of d.preDeps.filter((p: any) => p.check_date === today && !p.fit_to_depart)) {
    const v = byId[pd.vessel_id]; if (v) alerts.push({ level: "overdue", title: "NOT FIT TO DEPART", detail: `${v.name}: ${pd.defects ?? "critical defect"} (${pd.master_name})`, vessel: v.name, days: 0 });
  }
  for (const p of d.crew.filter((c: any) => c.status === "pending")) alerts.push({ level: "due", title: "Account awaiting approval", detail: `${p.full_name} (${p.email})`, vessel: null, days: 0 });
  return alerts.sort((a, b) => (a.level === b.level ? a.days - b.days : a.level === "overdue" ? -1 : 1));
}

function render(region: string, overdue: Alert[], due: Alert[], appUrl: string) {
  const row = (a: Alert, color: string) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #DCE2EA"><strong style="color:${color}">${a.title}</strong><br><span style="color:#404040;font-size:13px">${a.detail}</span></td><td style="padding:6px 10px;border-bottom:1px solid #DCE2EA;font-size:12px;color:#244061;white-space:nowrap">${a.vessel ?? ""}</td></tr>`;
  const sec = (t: string, items: Alert[], color: string) => items.length ? `<h3 style="color:#244061;margin:18px 0 6px">${t} (${items.length})</h3><table style="border-collapse:collapse;width:100%">${items.map((a) => row(a, color)).join("")}</table>` : "";
  return `<div style="font-family:Calibri,Arial,sans-serif;max-width:640px;color:#000">
<h2 style="color:#244061;border-bottom:3px solid #244061;padding-bottom:6px">Franmarine Vessel SMS — ${region} daily alerts</h2>
${sec("Overdue", overdue, "#C00000")}${sec("Upcoming", due, "#7a5a00")}
<p style="margin-top:20px"><a href="${appUrl}/compliance" style="background:#244061;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Open compliance page</a></p>
<p style="color:#808080;font-size:12px">Sent automatically each morning. Thresholds: inductions 30 days, SMS review 60 days, absence rule warning at 150 days.</p></div>`;
}
