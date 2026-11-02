import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { loadRegionData, computeAlerts, drillMatrix } from "../lib/alerts";
import { drillByKey } from "../data/drills";
import { INDUCTION_VALID_DAYS } from "../data/vessels";
import { downloadCsv } from "../lib/csv";
import AppShell from "../components/AppShell";
import AlertList from "../components/AlertList";

const DAY = 86400000;
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fmtT = (d) => new Date(d).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function Compliance() {
  const { profile } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [vesselId, setVesselId] = useState("all");
  const [tab, setTab] = useState("register");

  useEffect(() => {
    loadRegionData(profile.region).then(setData).catch((e) => setError(e.message));
  }, [profile.region]);

  const alerts = useMemo(() => (data ? computeAlerts(data) : []), [data]);
  const today = new Date().toLocaleDateString("en-CA");

  // Induction register: crew × vessel
  const register = useMemo(() => {
    if (!data) return [];
    const latest = {};
    for (const i of data.inductions) {
      const k = i.user_id + "|" + i.vessel_id;
      if (!latest[k] || i.completed_at > latest[k].completed_at) latest[k] = i;
    }
    const rows = [];
    for (const p of data.crew.filter((c) => c.status === "approved")) {
      for (const v of data.vessels) {
        if (vesselId !== "all" && v.id !== vesselId) continue;
        const ind = latest[p.id + "|" + v.id];
        let state = "none", expires = null;
        if (ind) {
          expires = new Date(new Date(ind.completed_at).getTime() + INDUCTION_VALID_DAYS * DAY).toISOString().slice(0, 10);
          const days = Math.round((new Date(expires) - new Date(today)) / DAY);
          state = ind.sms_revision !== v.sms_revision ? "revised" : days < 0 ? "expired" : days <= 30 ? "expiring" : "current";
        }
        rows.push({ person: p.full_name, role: p.role, vessel: v.name, state, inducted: ind ? ind.completed_at.slice(0, 10) : null, revision: ind?.sms_revision || null, expires });
      }
    }
    return rows.sort((a, b) => a.person.localeCompare(b.person) || a.vessel.localeCompare(b.vessel));
  }, [data, vesselId, today]);

  const signOns = useMemo(() => {
    if (!data) return [];
    const names = Object.fromEntries(data.crew.map((c) => [c.id, c.full_name]));
    const vn = Object.fromEntries(data.vessels.map((v) => [v.id, v.name]));
    const crew = data.signOns.map((s) => ({ date: s.sign_on_date, vessel: vn[s.vessel_id], person: names[s.user_id] || s.signature_name, role: s.role_today, master: s.master_name, kind: "Crew", signed_at: s.signed_at }));
    const guests = (data.guestSignOns || []).map((s) => ({ date: s.sign_on_date, vessel: vn[s.vessel_id], person: s.full_name, role: s.role_today + (s.company ? ` (${s.company})` : ""), master: s.added_by_name || "self (QR)", kind: "Special personnel", signed_at: s.signed_at }));
    return [...crew, ...guests].filter((r) => vesselId === "all" || r.vessel === vn[vesselId]).sort((a, b) => b.signed_at.localeCompare(a.signed_at));
  }, [data, vesselId]);

  const preDeps = useMemo(() => {
    if (!data) return [];
    const vn = Object.fromEntries(data.vessels.map((v) => [v.id, v.name]));
    return data.preDepartures
      .filter((p) => vesselId === "all" || p.vessel_id === vesselId)
      .map((p) => ({ date: p.check_date, vessel: vn[p.vessel_id], master: p.master_name, fit: p.fit_to_depart ? "Fit to depart" : "NOT FIT", fails: (p.items || []).filter((i) => i.result === "fail").length, defects: p.defects || "", fuel: p.fuel_litres, pob: p.persons_on_board, completed_at: p.completed_at }))
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at));
  }, [data, vesselId]);

  const drillRows = useMemo(() => (data ? drillMatrix(data).filter((r) => vesselId === "all" || r.vesselId === vesselId) : []), [data, vesselId]);
  const drillLog = useMemo(() => {
    if (!data) return [];
    const vn = Object.fromEntries(data.vessels.map((v) => [v.id, v.name]));
    return (data.drills || []).filter((d) => vesselId === "all" || d.vessel_id === vesselId)
      .map((d) => ({ date: d.drill_date, vessel: vn[d.vessel_id], type: drillByKey(d.drill_type)?.label || d.drill_type, scenario: d.scenario, participants: (d.participants || []).map((p) => p.name).join("; "), outcome: d.outcome || "", corrective_actions: d.corrective_actions || "", conducted_by: d.conducted_by_name }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, vesselId]);
  const DSTATE = { ok: ["Current", "st-ok"], due: ["Due soon", "st-warn"], overdue: ["Overdue", "st-crit"], none: ["No record", "st-crit"] };

  const STATE = { current: ["Current", "st-ok"], expiring: ["Expiring", "st-warn"], expired: ["Expired", "st-crit"], revised: ["SMS revised", "st-crit"], none: ["Not inducted", "st-none"] };
  const stamp = today;

  return (
    <AppShell>
      <div className="crumb"><Link to="/">← Vessels</Link></div>
      <div className="page-head">
        <div>
          <h1>Compliance — {profile.region}</h1>
          <p>Induction register (04A), sign-on log, pre-departure log (05A), alerts.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {!data && !error && <div className="loading">Loading…</div>}

      {data && (
        <>
          <section className="panel">
            <div className="panel-head panel-head-row">
              <span>Alerts</span>
              <span className="pill-light">{alerts.filter((a) => a.level === "overdue").length} overdue · {alerts.filter((a) => a.level === "due").length} upcoming</span>
            </div>
            <AlertList alerts={alerts} />
          </section>

          <div className="toolbar">
            <select className="select" value={vesselId} onChange={(e) => setVesselId(e.target.value)}>
              <option value="all">All vessels</option>
              {data.vessels.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <div className="chip-row">
              {[["register", "Inductions"], ["drills", "Drills"], ["signons", "Sign-ons"], ["predep", "Pre-departure"]].map(([k, l]) => (
                <button key={k} type="button" className={`chip ${tab === k ? "chip-on" : ""}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>

          {tab === "register" && (
            <section className="panel">
              <div className="panel-head panel-head-row">
                <span>Induction register</span>
                <button type="button" className="linklike-light" onClick={() => downloadCsv(`induction-register-${profile.region}-${stamp}.csv`, register)}>Export CSV</button>
              </div>
              <ul className="crew-list">
                {register.map((r, i) => (
                  <li key={i}>
                    <div>
                      <strong>{r.person}</strong>
                      <span className="crew-sub">{r.vessel} · {r.inducted ? `inducted ${fmt(r.inducted)} (${r.revision}) · expires ${fmt(r.expires)}` : "no induction on file"}</span>
                    </div>
                    <span className={`st ${STATE[r.state][1]}`}>{STATE[r.state][0]}</span>
                  </li>
                ))}
                {register.length === 0 && <li className="sub">No approved crew yet.</li>}
              </ul>
            </section>
          )}

          {tab === "drills" && (
            <>
              <section className="panel">
                <div className="panel-head panel-head-row">
                  <span>Drill status (04 §4.1)</span>
                  <button type="button" className="linklike-light" onClick={() => downloadCsv(`drill-status-${profile.region}-${stamp}.csv`, drillRows.map(({ vesselId: _v, ...r }) => r))}>Export CSV</button>
                </div>
                <ul className="crew-list">
                  {drillRows.map((r, i) => (
                    <li key={i}>
                      <div>
                        <strong>{r.vessel} — {r.type}</strong>
                        <span className="crew-sub">{r.freq} · {r.last ? `last ${fmt(r.last)} · due ${fmt(r.due)}` : "never recorded"}</span>
                      </div>
                      <span className={`st ${DSTATE[r.state][1]}`}>{DSTATE[r.state][0]}</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="panel">
                <div className="panel-head panel-head-row">
                  <span>Drill log (04B)</span>
                  <button type="button" className="linklike-light" onClick={() => downloadCsv(`drill-log-${profile.region}-${stamp}.csv`, drillLog)}>Export CSV</button>
                </div>
                <ul className="crew-list">
                  {drillLog.map((r, i) => (
                    <li key={i}>
                      <div>
                        <strong>{r.vessel} — {r.type} · {fmt(r.date)}</strong>
                        <span className="crew-sub">{r.scenario} · {r.participants} · by {r.conducted_by}{r.outcome ? ` · ${r.outcome}` : ""}</span>
                      </div>
                    </li>
                  ))}
                  {drillLog.length === 0 && <li className="sub">No drills recorded.</li>}
                </ul>
              </section>
            </>
          )}

          {tab === "signons" && (
            <section className="panel">
              <div className="panel-head panel-head-row">
                <span>Sign-on log (last 400 days)</span>
                <button type="button" className="linklike-light" onClick={() => downloadCsv(`sign-ons-${profile.region}-${stamp}.csv`, signOns)}>Export CSV</button>
              </div>
              <ul className="crew-list">
                {signOns.slice(0, 200).map((r, i) => (
                  <li key={i}>
                    <div>
                      <strong>{r.person}</strong>
                      <span className="crew-sub">{r.vessel} · {r.role} · master {r.master} · {r.kind}</span>
                    </div>
                    <span className="crew-time">{fmtT(r.signed_at)}</span>
                  </li>
                ))}
                {signOns.length === 0 && <li className="sub">No sign-ons recorded.</li>}
              </ul>
            </section>
          )}

          {tab === "predep" && (
            <section className="panel">
              <div className="panel-head panel-head-row">
                <span>Pre-departure log</span>
                <button type="button" className="linklike-light" onClick={() => downloadCsv(`pre-departure-${profile.region}-${stamp}.csv`, preDeps)}>Export CSV</button>
              </div>
              <ul className="crew-list">
                {preDeps.map((r, i) => (
                  <li key={i}>
                    <div>
                      <strong>{r.vessel} — {fmt(r.date)}</strong>
                      <span className="crew-sub">
                        Master {r.master} · {r.fails} fail{r.fails === 1 ? "" : "s"}{r.fuel ? ` · ${r.fuel} L` : ""}{r.pob ? ` · POB ${r.pob}` : ""}
                        {r.defects && <> · {r.defects}</>}
                      </span>
                    </div>
                    <span className={`st ${r.fit.startsWith("Fit") ? "st-ok" : "st-crit"}`}>{r.fit}</span>
                  </li>
                ))}
                {preDeps.length === 0 && <li className="sub">No pre-departure checks recorded.</li>}
              </ul>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
