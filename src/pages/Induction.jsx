import { useState } from "react";
import { useAuth } from "../lib/auth";
import { recordInduction, INDUCTION_REASONS } from "../lib/compliance";

// Topics per FUS-SMS-xx-04A §2.2 (minimum induction content). Vessel-specific text comes from vessel.induction.
function buildTopics(v) {
  const i = v.induction || {};
  return [
    {
      key: "particulars",
      title: "Vessel particulars and operating approval",
      body: null,
      table: { Vessel: `${v.name} · UVI ${v.uvi}`, Class: v.vessel_class, Approval: v.approval, ...v.particulars },
      ack: "I have read the vessel particulars and understand the vessel's class and approval conditions.",
    },
    {
      key: "layout",
      title: "Vessel layout, access points and means of escape",
      body: i.layout,
      ack: "I know how to board safely and how to get off the vessel in an emergency.",
    },
    {
      key: "safetyEquipment",
      title: "Location and operation of safety equipment",
      body: i.safetyEquipment,
      ack: "I know where the lifejackets, lifebuoy, flares, first aid kit, EPIRB, extinguishers and bilge pumps are stowed on this vessel.",
    },
    {
      key: "radio",
      title: "VHF radio and distress procedures",
      body: i.radio,
      ack: "I know how to send a distress call on VHF Ch 16 and which VTS channels apply.",
    },
    {
      key: "mob",
      title: "Person overboard procedure and recovery",
      body: i.mob,
      ack: "I understand the person-overboard procedure for this vessel.",
    },
    {
      key: "fireEmergency",
      title: "Fire, emergency response and assembly station",
      body: i.fireEmergency,
      ack: "I know my emergency duties and that the assembly station is the AFT DECK with a verbal roll call.",
    },
    {
      key: "hazards",
      title: "Vessel-specific hazards and risk controls",
      body: i.hazards,
      ack: `I have read the ${v.doc_prefix}-02 risk controls relevant to my role and will comply with them.`,
    },
    {
      key: "limits",
      title: "Operational limitations and weather criteria",
      body: i.limits,
      ack: "I understand the operating limits and will not operate outside them.",
    },
    {
      key: "fitness",
      title: "Fitness for work — drug and alcohol policy",
      body:
        "FRA-POL-008 Fitness for Work Policy applies on this vessel. Zero blood alcohol while on duty. No illicit drugs. Prescription medication that may impair you must be declared to the master before sign-on. Random and for-cause testing may be conducted.",
      ack: "I have read and will comply with FRA-POL-008 Fitness for Work Policy.",
    },
    {
      key: "fatigue",
      title: "Fatigue management",
      body:
        `Day vessel, no berthed accommodation. Normal limit 12 hours work with at least 10 hours rest in each 24-hour period (${v.doc_prefix}-10 and HSE-PLA-005). You must tell the master if you are fatigued or have not had adequate rest. Crew rotation is provided on multi-day campaigns.`,
      ack: "I understand the fatigue limits and will report if I am not adequately rested.",
    },
    {
      key: "reporting",
      title: "Reporting of hazards and incidents",
      body:
        "Report all hazards, near misses, injuries, damage and pollution to the master immediately. The master reports to the Designated Person (Kirby Hamilton, 0439 389 261). Marine incidents are reported to AMSA within the required timeframes (" +
        v.doc_prefix +
        "-08).",
      ack: "I will report hazards, near misses and incidents immediately.",
    },
  ];
}

export default function Induction({ vessel, reason, onComplete }) {
  const { user, profile } = useAuth();
  const topics = buildTopics(vessel);
  const [step, setStep] = useState(0); // 0..topics.length-1, then topics.length = declaration
  const [acks, setAcks] = useState({});
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isDeclaration = step === topics.length;
  const topic = topics[step];
  const progress = Math.round((step / topics.length) * 100);

  async function finish() {
    if (signature.trim().toLowerCase() !== (profile?.full_name || "").trim().toLowerCase()) {
      setError(`Type your full name exactly as registered: ${profile?.full_name}`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await recordInduction({
        userId: user.id,
        vesselId: vessel.id,
        smsRevision: vessel.sms_revision,
        acknowledgements: topics.map((t) => ({ topic: t.key, title: t.title, acknowledged_at: acks[t.key] })),
        signature: signature.trim(),
      });
      onComplete();
    } catch (e) {
      setError(e.message || "Could not save induction.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate">
      <div className="gate-head">
        <span className="gate-kicker">Vessel induction · {vessel.doc_prefix}-04A</span>
        <h1>{vessel.name}</h1>
        <p className="sub">{INDUCTION_REASONS[reason] || INDUCTION_REASONS.first_trip}</p>
      </div>

      <div className="progress">
        <div className="progress-bar" style={{ width: `${isDeclaration ? 100 : progress}%` }} />
      </div>
      <div className="progress-label">
        {isDeclaration ? "Declaration" : `Topic ${step + 1} of ${topics.length}`}
      </div>

      {!isDeclaration && (
        <section className="panel">
          <div className="panel-head">{topic.title}</div>
          <div className="panel-body">
            {topic.table && (
              <div className="kv kv-stack">
                {Object.entries(topic.table).map(([k, val]) => (
                  <div key={k}><span>{k}</span><span>{val}</span></div>
                ))}
              </div>
            )}
            {topic.body && <p className="topic-body">{topic.body}</p>}
            <label className={`ack ${acks[topic.key] ? "ack-on" : ""}`}>
              <input
                type="checkbox"
                checked={!!acks[topic.key]}
                onChange={(e) =>
                  setAcks({ ...acks, [topic.key]: e.target.checked ? new Date().toISOString() : undefined })
                }
              />
              <span>{topic.ack}</span>
            </label>
          </div>
        </section>
      )}

      {isDeclaration && (
        <section className="panel">
          <div className="panel-head">Induction declaration</div>
          <div className="panel-body">
            <p className="topic-body">
              I, <strong>{profile?.full_name}</strong>, confirm that I have completed the vessel-specific induction for{" "}
              <strong>{vessel.name}</strong> (SMS {vessel.sms_revision}) covering all {topics.length} topics above, that I
              understood the content, and that I had the opportunity to ask questions. I understand this record is
              entered in the induction register ({vessel.doc_prefix}-04A) and retained for 5 years under Marine Order
              504 Schedule 1 clause 9(7).
            </p>
            <ul className="ack-summary">
              {topics.map((t) => (
                <li key={t.key}>✓ {t.title}</li>
              ))}
            </ul>
            <div className="field">
              <label htmlFor="sig">Type your full name to sign</label>
              <input id="sig" value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={profile?.full_name} />
            </div>
            {error && <div className="error">{error}</div>}
          </div>
        </section>
      )}

      <div className="gate-actions">
        <button className="btn btn-ghost" disabled={step === 0 || busy} onClick={() => setStep(step - 1)}>
          Back
        </button>
        {!isDeclaration ? (
          <button className="btn btn-inline" disabled={!acks[topic.key]} onClick={() => setStep(step + 1)}>
            {step === topics.length - 1 ? "Review and sign" : "Next"}
          </button>
        ) : (
          <button className="btn btn-inline" disabled={busy || !signature} onClick={finish}>
            {busy ? "Saving…" : "Sign induction"}
          </button>
        )}
      </div>
    </div>
  );
}
