import { useEffect, useState, useCallback } from "react";
import { DRILL_TYPES, drillByKey } from "../data/drills";
import { listDrills } from "../lib/compliance";
import DrillForm from "./DrillForm";

const DAY = 86400000;
const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }) : "—");
const addDays = (d, n) => new Date(new Date(d).getTime() + n * DAY).toISOString().slice(0, 10);

export default function DrillsPanel({ vessel, canRecord }) {
  const [drills, setDrills] = useState(null);
  const [recording, setRecording] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");

  const refresh = useCallback(() => listDrills(vessel.id).then(setDrills).catch(() => setDrills([])), [vessel.id]);
  useEffect(() => { refresh(); }, [refresh]);

  if (recording) {
    return <DrillForm vessel={vessel} onCancel={() => setRecording(false)} onDone={() => { setRecording(false); refresh(); }} />;
  }

  const status = DRILL_TYPES.filter((t) => t.intervalDays).map((t) => {
    const last = drills?.find((d) => d.drill_type === t.key);
    const due = last ? addDays(last.drill_date, t.intervalDays) : null;
    const days = due ? Math.round((new Date(due) - new Date(today)) / DAY) : null;
    const state = !last ? "none" : days < 0 ? "overdue" : days <= t.warnDays ? "due" : "ok";
    return { t, last, due, days, state };
  });
  const LBL = { ok: ["Current", "st-ok"], due: ["Due soon", "st-warn"], overdue: ["Overdue", "st-crit"], none: ["No record", "st-crit"] };

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <span>Emergency drills · {vessel.doc_prefix}-04B</span>
        {drills && <button type="button" className="linklike-light" onClick={() => setShowLog(!showLog)}>{showLog ? "Status" : `Log (${drills.length})`}</button>}
      </div>
      {!drills && <div className="panel-body sub">Loading…</div>}
      {drills && !showLog && (
        <ul className="crew-list">
          {status.map(({ t, last, due, days, state }) => (
            <li key={t.key}>
              <div>
                <strong>{t.label}</strong>
                <span className="crew-sub">
                  {t.freq} · {last ? `last ${fmt(last.drill_date)} · due ${fmt(due)}${days < 0 ? ` (${-days} days ago)` : days <= t.warnDays ? ` (${days} days)` : ""}` : "never recorded"}
                </span>
              </div>
              <span className={`st ${LBL[state][1]}`}>{LBL[state][0]}</span>
            </li>
          ))}
        </ul>
      )}
      {drills && showLog && (
        <ul className="crew-list">
          {drills.length === 0 && <li className="sub">No drills recorded yet.</li>}
          {drills.map((d) => (
            <li key={d.id}>
              <div>
                <strong>{drillByKey(d.drill_type)?.label || d.drill_type}{d.drill_type_other ? ` — ${d.drill_type_other}` : ""} · {fmt(d.drill_date)}</strong>
                <span className="crew-sub">
                  {d.scenario}{d.outcome ? ` · Outcome: ${d.outcome}` : ""} · {d.participants?.length || 0} participants · by {d.conducted_by_name}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
      {drills && canRecord && (
        <div className="panel-body" style={{ paddingTop: 8 }}>
          <button type="button" className="btn btn-inline" onClick={() => setRecording(true)}>+ Record a drill</button>
        </div>
      )}
    </section>
  );
}
