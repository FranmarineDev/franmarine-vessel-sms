// Alerts: upcoming and overdue compliance items for a region.
// Pure function `computeAlerts(data, today)` so the same logic runs in-app and in the email digest.
import { supabase, DEMO_MODE } from "./supabase";
import { listVessels } from "./vessels";
import { listCrew } from "./crewAdmin";
import { INDUCTION_VALID_DAYS, INDUCTION_ABSENCE_DAYS } from "../data/vessels";
import { DRILL_TYPES } from "../data/drills";

export const THRESHOLDS = {
  inductionWarnDays: 30,   // induction expiring within 30 days
  smsReviewWarnDays: 60,   // SMS annual review due within 60 days
  absenceWarnDays: 150,    // 6-month absence rule (183) — warn at 150 so you can re-induct before the gate catches them
};

const DAY = 86400000;
const dayDiff = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY).toISOString().slice(0, 10);

/**
 * data = { vessels, crew, inductions, signOns, preDepartures }  (all rows for the region)
 * Returns alerts sorted: overdue first, then by days remaining.
 * alert = { level: 'overdue'|'due'|'info', type, vesselId, vesselName, personId, personName, title, detail, dueDate, days }
 */
export function computeAlerts(data, today = new Date().toLocaleDateString("en-CA")) {
  const { vessels, crew, inductions, signOns, preDepartures } = data;
  const alerts = [];
  const byId = Object.fromEntries(vessels.map((v) => [v.id, v]));
  const crewById = Object.fromEntries(crew.map((c) => [c.id, c]));

  // 1. SMS annual review
  for (const v of vessels) {
    if (!v.sms_review_due) continue;
    const days = dayDiff(today, v.sms_review_due);
    if (days < 0) alerts.push(mk("overdue", "sms_review", v, null, `SMS review overdue`, `${v.doc_prefix || v.name} annual review was due ${fmt(v.sms_review_due)}`, v.sms_review_due, days));
    else if (days <= THRESHOLDS.smsReviewWarnDays) alerts.push(mk("due", "sms_review", v, null, `SMS review due in ${days} days`, `${v.doc_prefix || v.name} annual review due ${fmt(v.sms_review_due)}`, v.sms_review_due, days));
  }

  // 2. Inductions: latest per person per vessel
  const latest = {};
  for (const i of inductions) {
    const k = i.user_id + "|" + i.vessel_id;
    if (!latest[k] || i.completed_at > latest[k].completed_at) latest[k] = i;
  }
  const lastSignOn = {};
  for (const s of signOns) {
    const k = s.user_id + "|" + s.vessel_id;
    if (!lastSignOn[k] || s.sign_on_date > lastSignOn[k]) lastSignOn[k] = s.sign_on_date;
  }
  for (const [k, ind] of Object.entries(latest)) {
    const v = byId[ind.vessel_id];
    const p = crewById[ind.user_id];
    if (!v || !p || p.status !== "approved") continue;
    const expires = addDays(ind.completed_at, INDUCTION_VALID_DAYS);
    const days = dayDiff(today, expires);
    if (ind.sms_revision !== v.sms_revision) {
      alerts.push(mk("overdue", "induction_revision", v, p, `Re-induction required — SMS revised`, `${p.full_name} was inducted on ${ind.sms_revision}; vessel now ${v.sms_revision}`, today, 0));
      continue;
    }
    if (days < 0) alerts.push(mk("overdue", "induction_expired", v, p, `Induction expired`, `${p.full_name} — ${v.name} induction expired ${fmt(expires)}`, expires, days));
    else if (days <= THRESHOLDS.inductionWarnDays) alerts.push(mk("due", "induction_expiring", v, p, `Induction expires in ${days} days`, `${p.full_name} — ${v.name}, expires ${fmt(expires)}`, expires, days));
    // absence rule
    const lastActive = lastSignOn[k] || ind.completed_at.slice(0, 10);
    const absent = dayDiff(lastActive, today);
    if (absent > INDUCTION_ABSENCE_DAYS) alerts.push(mk("overdue", "absence", v, p, `Re-induction required — ${absent} days absent`, `${p.full_name} last signed on to ${v.name} ${fmt(lastActive)}`, addDays(lastActive, INDUCTION_ABSENCE_DAYS), INDUCTION_ABSENCE_DAYS - absent));
    else if (absent > THRESHOLDS.absenceWarnDays) alerts.push(mk("due", "absence", v, p, `Absence limit in ${INDUCTION_ABSENCE_DAYS - absent} days`, `${p.full_name} last on ${v.name} ${fmt(lastActive)} — re-induct before ${fmt(addDays(lastActive, INDUCTION_ABSENCE_DAYS))}`, addDays(lastActive, INDUCTION_ABSENCE_DAYS), INDUCTION_ABSENCE_DAYS - absent));
  }

  // 3. Pre-departure not done today on vessels with crew signed on today
  const active = new Set(signOns.filter((s) => s.sign_on_date === today).map((s) => s.vessel_id));
  const pdToday = new Set(preDepartures.filter((p) => p.check_date === today).map((p) => p.vessel_id));
  for (const vid of active) {
    const v = byId[vid];
    if (v && !pdToday.has(vid)) alerts.push(mk("overdue", "predeparture", v, null, `Pre-departure checks not done today`, `Crew signed on to ${v.name} but no 05A record for today`, today, 0));
  }
  // 3b. Unfit-to-depart today
  for (const pd of preDepartures.filter((p) => p.check_date === today && !p.fit_to_depart)) {
    const v = byId[pd.vessel_id];
    if (v) alerts.push(mk("overdue", "unfit", v, null, `NOT FIT TO DEPART`, `${v.name}: critical defect recorded by ${pd.master_name}`, today, 0));
  }

  // 4. Emergency drills — per vessel per type (FUS-SMS-xx-04 §4.1)
  const drills = data.drills || [];
  for (const v of vessels) {
    for (const t of DRILL_TYPES.filter((t) => t.intervalDays)) {
      const last = drills.filter((d) => d.vessel_id === v.id && d.drill_type === t.key).sort((a, b) => b.drill_date.localeCompare(a.drill_date))[0];
      if (!last) {
        alerts.push(mk("overdue", "drill", v, null, `${t.label} drill — no record`, `${v.name}: ${t.freq.toLowerCase()} drill, none recorded (${v.doc_prefix}-04 §4.1)`, today, 0));
        continue;
      }
      const due = addDays(last.drill_date, t.intervalDays);
      const days = dayDiff(today, due);
      if (days < 0) alerts.push(mk("overdue", "drill", v, null, `${t.label} drill overdue`, `${v.name}: last ${fmt(last.drill_date)}, was due ${fmt(due)}`, due, days));
      else if (days <= t.warnDays) alerts.push(mk("due", "drill", v, null, `${t.label} drill due in ${days} days`, `${v.name}: last ${fmt(last.drill_date)}, due ${fmt(due)}`, due, days));
    }
  }

  // 5. Pending accounts
  for (const p of crew.filter((c) => c.status === "pending")) {
    alerts.push(mk("due", "pending_account", null, p, `Account awaiting approval`, `${p.full_name} (${p.email})`, today, 0));
  }

  const rank = { overdue: 0, due: 1, info: 2 };
  return alerts.sort((a, b) => rank[a.level] - rank[b.level] || a.days - b.days);
}

function mk(level, type, v, p, title, detail, dueDate, days) {
  return { level, type, vesselId: v?.id || null, vesselName: v?.name || null, personId: p?.id || null, personName: p?.full_name || null, title, detail, dueDate, days };
}
function fmt(d) {
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

// ---------- data loading ----------
export async function loadRegionData(region) {
  const vessels = await listVessels(region);
  const crew = await listCrew(region);
  if (DEMO_MODE) {
    const db = JSON.parse(localStorage.getItem("fus-sms-demo-compliance") || "{}");
    return { vessels, crew, inductions: db.inductions || [], signOns: db.sign_ons || [], guestSignOns: db.guest_sign_ons || [], preDepartures: db.pre_departures || [], drills: db.drills || [] };
  }
  const ids = vessels.map((v) => v.id);
  const since = new Date(Date.now() - 400 * DAY).toISOString().slice(0, 10);
  const [i, s, g, p, d] = await Promise.all([
    supabase.from("inductions").select("*").in("vessel_id", ids),
    supabase.from("sign_ons").select("*").in("vessel_id", ids).gte("sign_on_date", since),
    supabase.from("guest_sign_ons").select("*").in("vessel_id", ids).gte("sign_on_date", since),
    supabase.from("pre_departures").select("*").in("vessel_id", ids).gte("check_date", since),
    supabase.from("drills").select("*").in("vessel_id", ids).gte("drill_date", since),
  ]);
  for (const r of [i, s, g, p, d]) if (r.error) throw r.error;
  return { vessels, crew, inductions: i.data, signOns: s.data, guestSignOns: g.data, preDepartures: p.data, drills: d.data };
}

export async function regionAlerts(region) {
  return computeAlerts(await loadRegionData(region));
}

/** Drill status matrix: vessel × type → { last, due, state } */
export function drillMatrix(data, today = new Date().toLocaleDateString("en-CA")) {
  const rows = [];
  for (const v of data.vessels) {
    for (const t of DRILL_TYPES.filter((t) => t.intervalDays)) {
      const last = (data.drills || []).filter((d) => d.vessel_id === v.id && d.drill_type === t.key).sort((a, b) => b.drill_date.localeCompare(a.drill_date))[0];
      const due = last ? addDays(last.drill_date, t.intervalDays) : null;
      const days = due ? dayDiff(today, due) : null;
      const state = !last ? "none" : days < 0 ? "overdue" : days <= t.warnDays ? "due" : "ok";
      rows.push({ vessel: v.name, vesselId: v.id, type: t.label, freq: t.freq, last: last?.drill_date || null, due, days, state });
    }
  }
  return rows;
}

/** Alerts relevant to one crew member (their own inductions). */
export function myAlerts(all, userId) {
  return all.filter((a) => a.personId === userId);
}
