import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { listCrew, updateCrew } from "../lib/crewAdmin";
import AppShell from "../components/AppShell";
import InvitePanel from "../components/InvitePanel";

const ROLES = ["crew", "master", "manager"];
const STATUS = { pending: "Awaiting approval", approved: "Active", suspended: "Suspended" };

export default function Crew() {
  const { profile } = useAuth();
  const [crew, setCrew] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(() => listCrew(profile.region).then(setCrew).catch((e) => setError(e.message)), [profile.region]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  async function change(p, patch) {
    try {
      await updateCrew(p.id, patch);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  const pending = crew?.filter((p) => p.status === "pending") || [];
  const others = crew?.filter((p) => p.status !== "pending") || [];

  return (
    <AppShell>
      <div className="crumb"><Link to="/">← Vessels</Link></div>
      <div className="page-head">
        <div>
          <h1>Crew accounts — {profile.region}</h1>
          <p>Invite crew, approve sign-ups and set roles.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {!crew && <div className="loading">Loading…</div>}

      {crew && (
        <>
          <InvitePanel />
          <section className="panel">
            <div className="panel-head panel-head-row">
              <span>Awaiting approval</span>
              <span className="pill-light">{pending.length}</span>
            </div>
            {pending.length === 0 && <div className="panel-body sub">Nothing waiting.</div>}
            <ul className="crew-list">
              {pending.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.full_name}</strong>
                    <span className="crew-sub">{p.email}</span>
                  </div>
                  <div className="chip-row">
                    <button className="btn btn-inline btn-small" onClick={() => change(p, { status: "approved" })}>Approve</button>
                    <button className="btn btn-ghost btn-small" onClick={() => change(p, { status: "suspended" })}>Reject</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel">
            <div className="panel-head panel-head-row">
              <span>All crew</span>
              <span className="pill-light">{others.length}</span>
            </div>
            <ul className="crew-list">
              {others.map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.full_name}</strong>
                    <span className="crew-sub">
                      {p.email} · {STATUS[p.status] || p.status}
                    </span>
                  </div>
                  {p.builtIn || p.role === "admin" || p.id === profile.id ? (
                    <span className="access">{p.role}</span>
                  ) : (
                    <div className="chip-row">
                      <select className="select" value={p.role} onChange={(e) => change(p, { role: e.target.value })}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {p.status === "approved" ? (
                        <button className="btn btn-ghost btn-small" onClick={() => change(p, { status: "suspended" })}>Suspend</button>
                      ) : (
                        <button className="btn btn-inline btn-small" onClick={() => change(p, { status: "approved" })}>Reactivate</button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
