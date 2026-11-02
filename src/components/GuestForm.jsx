import { useState } from "react";
import { recordGuestSignOn } from "../lib/compliance";

// Special personnel induction (FUS-SMS-xx-04 §2): emergency procedures, safety equipment,
// assembly station, lifejackets, D&A policy — condensed, then the daily declaration.
function inductionTopics(v) {
  const i = v.induction || {};
  return [
    { key: "emergency", title: "Emergency procedures and assembly station", body: i.fireEmergency },
    { key: "equipment", title: "Safety equipment", body: i.safetyEquipment },
    { key: "mob", title: "Person overboard", body: i.mob },
    { key: "lifejackets", title: "Lifejackets", body: "You will be issued a lifejacket / PFD and shown how to fit it. Wear it when directed by the master and at all times on deck while underway." },
    { key: "da", title: "Fitness for work", body: "FRA-POL-008 applies: zero blood alcohol, no illicit drugs, declare any medication that may impair you to the master." },
    { key: "hazards", title: "Vessel hazards", body: i.hazards },
  ];
}

const DECLS = [
  "I am fit for work, sober and not fatigued.",
  "I have been inducted on this vessel's emergency procedures, safety equipment and assembly station (aft deck).",
  "I will wear a lifejacket as directed and follow the master's instructions at all times.",
  "I will report any hazard or incident to the master immediately.",
];

/**
 * props: vessel, mode: 'master' | 'public', addedBy: {id,name} (master mode), onDone(record)
 */
export default function GuestForm({ vessel, mode, addedBy, onDone, onCancel }) {
  const topics = inductionTopics(vessel);
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("Special personnel");
  const [acks, setAcks] = useState({});
  const [decls, setDecls] = useState({});
  const [sig, setSig] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready =
    name.trim() &&
    topics.every((t) => acks[t.key]) &&
    DECLS.every((_, i) => decls[i]) &&
    sig.trim().toLowerCase() === name.trim().toLowerCase();

  async function submit(e) {
    e.preventDefault();
    if (!ready) {
      setError("Complete every item and type your name exactly as entered above.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const rec = await recordGuestSignOn({
        vesselId: vessel.id,
        fullName: name.trim(),
        company: company.trim(),
        roleToday: role,
        declarations: DECLS.map((text) => ({ text, confirmed: true })),
        inductionAcks: topics.map((t) => ({ topic: t.key, acknowledged_at: acks[t.key] })),
        signature: sig.trim(),
        addedById: addedBy?.id,
        addedByName: addedBy?.name,
      });
      onDone(rec);
    } catch (err) {
      setError(err.message || "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <section className="panel">
        <div className="panel-head">Who you are</div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="gname">Full name</label>
            <input id="gname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="gco">Company / organisation</label>
            <input id="gco" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Thales, Babcock, client" />
          </div>
          <div className="chip-row">
            {["Special personnel", "Client representative", "Subcontractor", "Trainee"].map((r) => (
              <button type="button" key={r} className={`chip ${role === r ? "chip-on" : ""}`} onClick={() => setRole(r)}>
                {r}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Vessel induction · {vessel.name}</div>
        <div className="panel-body">
          {topics.map((t) => (
            <div key={t.key} className="guest-topic">
              <strong>{t.title}</strong>
              <p className="topic-body small">{t.body}</p>
              <label className={`ack ${acks[t.key] ? "ack-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={!!acks[t.key]}
                  onChange={(e) => setAcks({ ...acks, [t.key]: e.target.checked ? new Date().toISOString() : undefined })}
                />
                <span>Understood</span>
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Declaration and sign-on</div>
        <div className="panel-body">
          {DECLS.map((d, i) => (
            <label key={i} className={`ack ${decls[i] ? "ack-on" : ""}`}>
              <input type="checkbox" checked={!!decls[i]} onChange={(e) => setDecls({ ...decls, [i]: e.target.checked })} />
              <span>{d}</span>
            </label>
          ))}
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="gsig">Type your full name to sign</label>
            <input id="gsig" value={sig} onChange={(e) => setSig(e.target.value)} placeholder={name || "Your name"} />
          </div>
          {mode === "master" && (
            <p className="hint">Being recorded by {addedBy?.name} (master) on {vessel.name}.</p>
          )}
          {error && <div className="error">{error}</div>}
          <div className="gate-actions">
            {onCancel && (
              <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
                Cancel
              </button>
            )}
            <button className="btn btn-inline" type="submit" disabled={busy || !ready}>
              {busy ? "Saving…" : "Sign on"}
            </button>
          </div>
        </div>
      </section>
    </form>
  );
}
