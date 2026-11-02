import { useState, useEffect } from "react";
import PreDeparture from "./PreDeparture";
import { getTodayPreDeparture } from "../lib/compliance";
import StatusBadge from "../components/StatusBadge";
import manifest from "../data/smsManifest.json";
import TodayCrew from "../components/TodayCrew";
import VesselQr from "../components/VesselQr";
import DrillsPanel from "../components/DrillsPanel";
import { useAuth } from "../lib/auth";
import { openSmsDocument } from "../lib/vessels";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}
function fmtSize(b) {
  return b > 1024 * 1024 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

export default function VesselSms({ vessel, status }) {
  const { profile } = useAuth();
  const sections = manifest[vessel.slug] || [];
  const [open, setOpen] = useState(null);
  const [preDep, setPreDep] = useState(undefined);
  const [doingPreDep, setDoingPreDep] = useState(false);
  const [docError, setDocError] = useState("");
  const isMaster = status.signOn.role_today === "Master";
  useEffect(() => {
    getTodayPreDeparture(vessel.id).then(setPreDep).catch(() => setPreDep(null));
  }, [vessel.id]);

  if (doingPreDep) {
    return (
      <PreDeparture
        vessel={vessel}
        onCancel={() => setDoingPreDep(false)}
        onComplete={() => {
          setDoingPreDep(false);
          getTodayPreDeparture(vessel.id).then(setPreDep);
        }}
      />
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{vessel.name}</h1>
          <p>
            Safety Management System · {vessel.sms_revision} · issued {fmtDate(vessel.sms_issued)} · review{" "}
            {fmtDate(vessel.sms_review_due)}
          </p>
        </div>
        <StatusBadge status={vessel.sms_status} />
      </div>

      <div className="notice notice-ok">
        Signed on today as <strong>{status.signOn.role_today}</strong>
        {status.signOn.role_today !== "Master" && <> · Master: {status.signOn.master_name}</>} · induction valid to{" "}
        {fmtDate(new Date(new Date(status.induction.completed_at).getTime() + 365 * 86400000))}
      </div>

      {preDep !== undefined && (
        preDep ? (
          <div className={`notice ${preDep.fit_to_depart ? "notice-ok" : "notice-crit"}`}>
            <strong>{preDep.fit_to_depart ? "Pre-departure checks complete — fit to depart." : "NOT FIT TO DEPART — critical defect recorded."}</strong>{" "}
            Master {preDep.master_name}, {new Date(preDep.completed_at).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}.
            {preDep.defects && <> Defects: {preDep.defects}</>}
          </div>
        ) : isMaster ? (
          <div className="notice notice-warn predep-cta">
            <div><strong>Pre-departure checks not done today.</strong> Complete {vessel.doc_prefix}-05A before departure.</div>
            <button type="button" className="btn btn-inline" onClick={() => setDoingPreDep(true)}>Start checks</button>
          </div>
        ) : (
          <div className="notice notice-info">Pre-departure checks not yet recorded today — master to complete before departure.</div>
        )
      )}

      <TodayCrew vessel={vessel} mySignOn={status.signOn} />

      <DrillsPanel vessel={vessel} canRecord={isMaster || ["manager", "admin"].includes(profile?.role)} />

      <section className="panel">
        <div className="panel-head">Vessel</div>
        <div className="kv">
          <div><span>UVI</span><span>{vessel.uvi}</span></div>
          <div><span>Class</span><span>{vessel.vessel_class}</span></div>
          <div><span>Approval</span><span>{vessel.approval}</span></div>
          <div><span>Home port</span><span>{vessel.home_port}</span></div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">SMS documents · {vessel.doc_prefix}</div>
        {docError && <div className="error" style={{ margin: 10 }}>{docError}</div>}
        <ul className="sms-sections">
          {sections.map((s) => {
            const isOpen = open === s.num;
            return (
              <li key={s.num}>
                <button type="button" className="sms-section" onClick={() => setOpen(isOpen ? null : s.num)}>
                  <span className="code">{s.num}</span>
                  <span className="sms-section-title">{s.title}</span>
                  <span className="count">{s.docs.length}</span>
                  <span className="chev">{isOpen ? "▾" : "▸"}</span>
                </button>
                {isOpen && (
                  <ul className="sms-docs">
                    {s.docs.map((d) => (
                      <li key={d.file}>
                        <button type="button" className="doc-link" onClick={() => { setDocError(""); openSmsDocument(d.file).catch((e) => setDocError(e.message)); }}>
                          <span className="code">{d.code ? `${vessel.doc_prefix}-${d.code}` : "Certificate"}</span>
                          {d.title}
                          <span className="size">{fmtSize(d.size)}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      {["manager", "admin"].includes(profile?.role) && <VesselQr vessel={vessel} />}
    </>
  );
}
