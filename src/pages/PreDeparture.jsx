import { useState, useMemo } from "react";
import { useAuth } from "../lib/auth";
import { predepartureFor } from "../data/predeparture";
import { recordPreDeparture } from "../lib/compliance";

const RESULTS = [
  { v: "pass", label: "OK" },
  { v: "fail", label: "Fail" },
  { v: "na", label: "N/A" },
];

export default function PreDeparture({ vessel, onComplete, onCancel }) {
  const { user, profile } = useAuth();
  const sections = predepartureFor(vessel.slug);
  const allItems = useMemo(() => sections.flatMap((s) => s.items.map((i) => ({ ...i, section: s.title, optional: s.optional }))), [sections]);
  const [results, setResults] = useState({});
  const [notes, setNotes] = useState({});
  const [defects, setDefects] = useState("");
  const [fuel, setFuel] = useState("");
  const [pob, setPob] = useState("");
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const answered = allItems.filter((i) => results[i.id]).length;
  const complete = allItems.every((i) => results[i.id]);
  const criticalFails = allItems.filter((i) => i.critical && results[i.id] === "fail");
  const nonCriticalFails = allItems.filter((i) => !i.critical && results[i.id] === "fail");
  const fitToDepart = complete && criticalFails.length === 0;

  function setAll(sectionTitle, v) {
    const next = { ...results };
    sections.find((s) => s.title === sectionTitle).items.forEach((i) => (next[i.id] = v));
    setResults(next);
  }

  async function submit(e) {
    e.preventDefault();
    if (sig.trim().toLowerCase() !== (profile?.full_name || "").trim().toLowerCase()) {
      setError(`Type your full name exactly as registered: ${profile?.full_name}`);
      return;
    }
    if ((criticalFails.length || nonCriticalFails.length) && !defects.trim()) {
      setError("Describe the failed items and action taken in the defects box.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await recordPreDeparture({
        vesselId: vessel.id,
        masterId: user.id,
        masterName: profile.full_name,
        items: allItems.map((i) => ({ id: i.id, section: i.section, text: i.text, critical: !!i.critical, result: results[i.id], note: notes[i.id] || null })),
        defects: defects.trim(),
        fitToDepart,
        fuelLitres: fuel ? Number(fuel) : null,
        pob: pob ? Number(pob) : null,
        signature: sig.trim(),
      });
      onComplete();
    } catch (err) {
      setError(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <div className="gate-head">
        <span className="gate-kicker">Pre-departure checks · {vessel.doc_prefix}-05A</span>
        <h1>{vessel.name}</h1>
        <p className="sub">
          Master: {profile.full_name} · {new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })}.
          Items marked <span className="crit-tag">critical</span> must pass or the vessel does not depart (§5).
        </p>
      </div>

      <div className="progress"><div className="progress-bar" style={{ width: `${(answered / allItems.length) * 100}%` }} /></div>
      <div className="progress-label">{answered} of {allItems.length} items</div>

      {sections.map((s) => (
        <section className="panel" key={s.title}>
          <div className="panel-head panel-head-row">
            <span>{s.title}</span>
            <button type="button" className="linklike-light" onClick={() => setAll(s.title, s.optional ? "na" : "pass")}>
              {s.optional ? "All N/A" : "All OK"}
            </button>
          </div>
          <ul className="check-list">
            {s.items.map((i) => (
              <li key={i.id} className={results[i.id] === "fail" ? (i.critical ? "row-crit" : "row-warn") : ""}>
                <div className="check-text">
                  {i.critical && <span className="crit-tag">critical</span>} {i.text}
                </div>
                <div className="seg">
                  {RESULTS.map((r) => (
                    <button
                      type="button"
                      key={r.v}
                      className={`seg-btn seg-${r.v} ${results[i.id] === r.v ? "on" : ""}`}
                      onClick={() => setResults({ ...results, [i.id]: r.v })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {results[i.id] === "fail" && (
                  <input className="note-in" placeholder="What's wrong / action taken" value={notes[i.id] || ""} onChange={(e) => setNotes({ ...notes, [i.id]: e.target.value })} />
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="panel">
        <div className="panel-head">Voyage details</div>
        <div className="panel-body two-col">
          <div className="field">
            <label htmlFor="fuel">Fuel on board (L)</label>
            <input id="fuel" inputMode="numeric" value={fuel} onChange={(e) => setFuel(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="pob">Persons on board</label>
            <input id="pob" inputMode="numeric" value={pob} onChange={(e) => setPob(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Pre-departure decision</div>
        <div className="panel-body">
          {!complete && <div className="notice notice-info">Answer every item to see the decision.</div>}
          {complete && criticalFails.length > 0 && (
            <div className="notice notice-crit">
              <strong>DO NOT DEPART.</strong> {criticalFails.length} critical item{criticalFails.length > 1 ? "s" : ""} failed:
              <ul>{criticalFails.map((i) => <li key={i.id}>{i.text}</li>)}</ul>
              The vessel shall not depart until rectified. Record the defect and notify the Operations Superintendent.
            </div>
          )}
          {complete && criticalFails.length === 0 && nonCriticalFails.length > 0 && (
            <div className="notice notice-warn">
              <strong>Fit to depart</strong> with {nonCriticalFails.length} non-critical defect{nonCriticalFails.length > 1 ? "s" : ""} — recorded and reported to the Operations Superintendent.
            </div>
          )}
          {complete && criticalFails.length === 0 && nonCriticalFails.length === 0 && (
            <div className="notice notice-ok"><strong>Fit to depart.</strong> All items passed.</div>
          )}
          {(criticalFails.length > 0 || nonCriticalFails.length > 0) && (
            <div className="field">
              <label htmlFor="defects">Defects and action taken</label>
              <textarea id="defects" rows={3} value={defects} onChange={(e) => setDefects(e.target.value)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="psig">Master's signature — type your full name</label>
            <input id="psig" value={sig} onChange={(e) => setSig(e.target.value)} placeholder={profile.full_name} />
          </div>
          {error && <div className="error">{error}</div>}
          <div className="gate-actions">
            {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Later</button>}
            <button className="btn btn-inline" type="submit" disabled={!complete || !sig || busy}>
              {busy ? "Saving…" : fitToDepart ? "Sign — fit to depart" : "Sign — record defects"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
