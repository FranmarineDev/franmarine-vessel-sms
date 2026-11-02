import { useState } from "react";
import { useAuth } from "../lib/auth";
import { recordSignOn } from "../lib/compliance";

const ROLES = ["Master", "Crew", "Diver", "Dive Supervisor", "Special personnel"];

function buildDeclarations(v) {
  return [
    { key: "fit", text: "I am fit for work and free from injury or illness that could affect my duties." },
    { key: "da", text: "I have a zero blood alcohol level and have taken no illicit drugs (FRA-POL-008)." },
    { key: "meds", text: "Any prescription medication that may impair me has been declared to the master." },
    { key: "rest", text: "I have had at least 10 hours rest in the last 24 hours and am not fatigued." },
    { key: "duties", text: "I have been briefed on today's task and know my emergency duties and the assembly station (aft deck)." },
    { key: "pfd", text: `I will wear a lifejacket / PFD as required by ${v.doc_prefix}-05E.` },
    { key: "ppe", text: "I have the PPE required for today's task (PFD, footwear, hearing/eye protection as applicable)." },
    { key: "report", text: "I will report any hazard, near miss or incident to the master immediately." },
  ];
}

export default function SignOn({ vessel, induction, onComplete }) {
  const { user, profile } = useAuth();
  const decls = buildDeclarations(vessel);
  const [role, setRole] = useState(profile?.role === "master" ? "Master" : "Crew");
  const [master, setMaster] = useState("");
  const [checked, setChecked] = useState({});
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allChecked = decls.every((d) => checked[d.key]);
  const today = new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  async function submit(e) {
    e.preventDefault();
    if (signature.trim().toLowerCase() !== (profile?.full_name || "").trim().toLowerCase()) {
      setError(`Type your full name exactly as registered: ${profile?.full_name}`);
      return;
    }
    if (role !== "Master" && !master.trim()) {
      setError("Enter the name of today's master.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await recordSignOn({
        userId: user.id,
        vesselId: vessel.id,
        roleToday: role,
        masterName: role === "Master" ? profile.full_name : master.trim(),
        declarations: decls.map((d) => ({ key: d.key, text: d.text, confirmed: true })),
        signature: signature.trim(),
      });
      onComplete();
    } catch (err) {
      setError(err.message || "Could not save sign-on.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gate" onSubmit={submit}>
      <div className="gate-head">
        <span className="gate-kicker">Daily sign-on</span>
        <h1>{vessel.name}</h1>
        <p className="sub">{today}</p>
      </div>

      <div className="notice notice-ok">
        Induction current — completed{" "}
        {new Date(induction.completed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}{" "}
        against SMS {induction.sms_revision}.
      </div>

      <section className="panel">
        <div className="panel-head">Today's role</div>
        <div className="panel-body">
          <div className="chip-row">
            {ROLES.map((r) => (
              <button type="button" key={r} className={`chip ${role === r ? "chip-on" : ""}`} onClick={() => setRole(r)}>
                {r}
              </button>
            ))}
          </div>
          {role !== "Master" && (
            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="master">Master for today</label>
              <input id="master" value={master} onChange={(e) => setMaster(e.target.value)} placeholder="Name" />
            </div>
          )}
          {role === "Master" && (
            <p className="hint">
              As master you must also complete the pre-departure checks ({vessel.doc_prefix}-05A) before departure.
            </p>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Fitness for work declaration</div>
        <div className="panel-body">
          {decls.map((d) => (
            <label key={d.key} className={`ack ${checked[d.key] ? "ack-on" : ""}`}>
              <input
                type="checkbox"
                checked={!!checked[d.key]}
                onChange={(e) => setChecked({ ...checked, [d.key]: e.target.checked })}
              />
              <span>{d.text}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">Sign</div>
        <div className="panel-body">
          <div className="field">
            <label htmlFor="sig">Type your full name to sign on</label>
            <input id="sig" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={profile?.full_name} />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" type="submit" disabled={!allChecked || !signature || busy}>
            {busy ? "Signing on…" : "Sign on and open SMS"}
          </button>
          {!allChecked && <p className="hint">All declarations must be confirmed. If you cannot confirm one, speak to the master before signing on.</p>}
        </div>
      </section>
    </form>
  );
}
