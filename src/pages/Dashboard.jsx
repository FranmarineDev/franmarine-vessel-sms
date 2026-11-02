import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listVessels } from "../lib/vessels";
import { getVesselStatus } from "../lib/compliance";
import AppShell from "../components/AppShell";
import StatusBadge from "../components/StatusBadge";
import AlertList from "../components/AlertList";
import { regionAlerts, myAlerts } from "../lib/alerts";
import { Link } from "react-router-dom";

const REGION_NAMES = { NSW: "New South Wales", WA: "Western Australia" };

const ACCESS = {
  induction: { label: "Induction required", cls: "access-induction" },
  sign_on: { label: "Sign on today", cls: "access-signon" },
  ok: { label: "Signed on", cls: "access-ok" },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [vessels, setVessels] = useState(null);
  const [access, setAccess] = useState({});
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState(null);
  const isManager = ["manager", "admin"].includes(profile?.role);

  useEffect(() => {
    if (!profile?.region) return;
    let live = true;
    listVessels(profile.region)
      .then(async (list) => {
        if (!live) return;
        setVessels(list);
        const entries = await Promise.all(
          list.map(async (v) => [v.id, await getVesselStatus(user.id, v).catch(() => null)])
        );
        if (live) setAccess(Object.fromEntries(entries));
      })
      .catch((e) => setError(e.message || "Could not load vessels."));
    regionAlerts(profile.region).then((a) => live && setAlerts(isManager ? a : myAlerts(a, user.id))).catch(() => setAlerts([]));
    return () => {
      live = false;
    };
  }, [profile?.region, user.id, isManager]);

  return (
    <AppShell>
      <div className="page-head">
        <div>
          <h1>Vessels — {REGION_NAMES[profile?.region] || profile?.region}</h1>
          <p>Select the vessel you are operating today.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {alerts && alerts.length > 0 && (
        <section className="panel">
          <div className="panel-head panel-head-row">
            <span>{isManager ? "Alerts" : "Your alerts"}</span>
            {isManager && <Link to="/compliance" className="linklike-light">View all</Link>}
          </div>
          <AlertList alerts={alerts} limit={isManager ? 5 : undefined} />
        </section>
      )}

      {!vessels && !error && <div className="loading">Loading vessels…</div>}

      {vessels && vessels.length === 0 && (
        <div className="empty">No vessels have been added for {profile?.region} yet.</div>
      )}

      {vessels && vessels.length > 0 && (
        <div className="vessel-grid">
          {vessels.map((v) => {
            const st = access[v.id];
            const a = st ? ACCESS[st.step] : null;
            return (
              <button key={v.id} className="vessel-card" onClick={() => navigate(`/vessels/${v.slug || v.id}`)}>
                <h2>
                  {v.name}
                  <StatusBadge status={v.sms_status} />
                </h2>
                <dl className="vessel-meta">
                  <dt>UVI</dt>
                  <dd>{v.uvi || "—"}</dd>
                  <dt>Class</dt>
                  <dd>{v.vessel_class || "—"}</dd>
                  <dt>SMS</dt>
                  <dd>{v.sms_revision || "—"} · review {fmtDate(v.sms_review_due)}</dd>
                </dl>
                <div className="card-foot">
                  {a ? <span className={`access ${a.cls}`}>{a.label}</span> : <span className="access">Checking…</span>}
                  <span className="go">{st?.step === "ok" ? "Open SMS →" : "Start →"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
