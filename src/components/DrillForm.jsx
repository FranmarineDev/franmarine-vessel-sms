import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import { DRILL_TYPES } from "../data/drills";
import { listTodayCrew, recordDrill } from "../lib/compliance";

export default function DrillForm({ vessel, onDone, onCancel }) {
  const { user, profile } = useAuth();
  const [type, setType] = useState("fire");
  const [other, setOther] = useState("");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [location, setLocation] = useState("");
  const [scenario, setScenario] = useState("");
  const [crew, setCrew] = useState([]);
  const [selected, setSelected] = useState({});
  const [extra, setExtra] = useState("");
  const [outcome, setOutcome] = useState("");
  const [actions, setActions] = useState("");
  const [notes, setNotes] = useState("");
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listTodayCrew(vessel.id).then((c) => {
      setCrew(c);
      setSelected(Object.fromEntries(c.map((p) => [p.id, true]))); // everyone on board by default
    }).catch(() => {});
  }, [vessel.id]);

  const t = DRILL_TYPES.find((d) => d.key === type);
  const participants = [
    ...crew.filter((c) => selected[c.id]).map((c) => ({ name: c.display_name, role: c.role_today, kind: c.kind, user_id: c.user_id || null })),
    ...extra.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name, role: "", kind: "manual" })),
  ];

  async function submit(e) {
    e.preventDefault();
    if (sig.trim().toLowerCase() !== (profile?.full_name || "").trim().toLowerCase()) return setError(`Type your full name exactly as registered: ${profile?.full_name}`);
    if (!scenario.trim()) return setError("Describe the scenario.");
    if (!participants.length) return setError("At least one participant is required.");
    if (type === "other" && !other.trim()) return setError("Name the drill type.");
    setBusy(true);
    setError("");
    try {
      await recordDrill({
        vesselId: vessel.id, drillType: type, drillTypeOther: other, drillDate: date, location, scenario: scenario.trim(),
        participants, outcome: outcome.trim(), correctiveActions: actions.trim(), notes: notes.trim(),
        conductedById: user.id, conductedByName: profile.full_name, signature: sig.trim(),
      });
      onDone();
    } catch (err) {
      setError(err.message || "Could not save drill.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <div className="gate-head">
        <span className="gate-kicker">Emergency drill record · {vessel.doc_prefix}-04B</span>
        <h1>{vessel.name}</h1>
      </div>

      <section className="panel">
        <div className="panel-head">Drill</div>
        <div className="panel-body">
          <div className="chip-row">
            {DRILL_TYPES.map((d) => (
              <button type="button" key={d.key} className={`chip ${type === d.key ? "chip-on" : ""}`} onClick={() => setType(d.key)}>{d.label}</button>
            ))}
          </div>
          {type === "other" && (
            <div className="field" style={{ marginTop: 10 }}><label htmlFor="dother">Drill type</label><input id="dother" value={other} onChange={(e) => setOther(e.target.value)} /></div>
          )}
          <p className="hint">Reference procedure {vessel.doc_prefix}-{t.ref} · minimum frequency: {t.freq.toLowerCase()}.</p>
          <div className="two-col">
            <div className="field"><label htmlFor="ddate">Date</label><input id="ddate" type="date" value={date} max={new Date().toLocaleDateString("en-CA")} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="field"><label htmlFor="dloc">Location</label><input id="dloc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. alongside Garden Island" /></div>
          </div>
          <div className="field"><label htmlFor="dscen">Scenario description</label><textarea id="dscen" rows={3} value={scenario} onChange={(e) => setScenario(e.target.value)} placeholder="Realistic, scenario-based (§4.2). What was simulated, where, what equipment was used." /></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Participants</div>
        <div className="panel-body">
          {crew.length === 0 && <p className="hint">Nobody signed on to this vessel today — add names below.</p>}
          {crew.map((c) => (
            <label key={c.id} className={`ack ${selected[c.id] ? "ack-on" : ""}`}>
              <input type="checkbox" checked={!!selected[c.id]} onChange={(e) => setSelected({ ...selected, [c.id]: e.target.checked })} />
              <span>{c.display_name} <span className="crew-sub" style={{ display: "inline" }}>· {c.role_today}</span></span>
            </label>
          ))}
          <div className="field" style={{ marginTop: 8 }}><label htmlFor="dextra">Other participants (one per line)</label><textarea id="dextra" rows={2} value={extra} onChange={(e) => setExtra(e.target.value)} /></div>
          <p className="hint">Participants are recorded with the drill. Their sign-on today stands as their attendance signature.</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Outcome</div>
        <div className="panel-body">
          <div className="field"><label htmlFor="dout">Outcome and deficiencies identified</label><textarea id="dout" rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)} /></div>
          <div className="field"><label htmlFor="dact">Corrective actions</label><textarea id="dact" rows={2} value={actions} onChange={(e) => setActions(e.target.value)} /></div>
          <div className="field"><label htmlFor="dnotes">Notes</label><textarea id="dnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Drill conducted by</div>
        <div className="panel-body">
          <div className="field"><label htmlFor="dsig">{profile.full_name} — type your full name to sign</label><input id="dsig" value={sig} onChange={(e) => setSig(e.target.value)} /></div>
          {error && <div className="error">{error}</div>}
          <div className="gate-actions">
            <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>Cancel</button>
            <button className="btn btn-inline" type="submit" disabled={busy}>{busy ? "Saving…" : "Save drill record"}</button>
          </div>
        </div>
      </section>
    </form>
  );
}
