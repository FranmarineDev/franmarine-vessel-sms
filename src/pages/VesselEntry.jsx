import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getVessel } from "../lib/vessels";
import GuestForm from "../components/GuestForm";

/**
 * QR landing: /v/:slug
 *  - signed-in user → straight to the vessel gate (induction / sign-on / SMS)
 *  - visitor → special-personnel induction + sign-on, no account needed
 */
export default function VesselEntry() {
  const { slug } = useParams();
  const { user, loading } = useAuth();
  const [vessel, setVessel] = useState(undefined);
  const [done, setDone] = useState(null);

  useEffect(() => {
    getVessel(slug).then(setVessel).catch(() => setVessel(null));
  }, [slug]);

  if (loading || vessel === undefined) return <div className="loading">Loading…</div>;
  if (user) return <Navigate to={`/vessels/${slug}`} replace />;
  if (!vessel) return <Navigate to="/login" replace />;

  return (
    <div className="public-shell">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}franmarine-logo.jpeg`} alt="Franmarine Underwater Services" />
        <div className="topbar-title">
          <strong>{vessel.name}</strong>
          <span>UVI {vessel.uvi} · {vessel.vessel_class}</span>
        </div>
        <Link to="/login" className="btn btn-ghost">Crew login</Link>
      </header>
      <main className="content">
        {done ? (
          <div className="gate">
            <div className="notice notice-ok">
              <strong>Signed on.</strong> {done.full_name} is recorded on {vessel.name} for today. Report to the master,
              collect your lifejacket, and follow all instructions.
            </div>
            <p className="sub">Assembly station: <strong>aft deck</strong>. In an emergency, muster there for the roll call.</p>
          </div>
        ) : (
          <>
            <div className="gate-head">
              <span className="gate-kicker">Special personnel · {vessel.doc_prefix}-04 §2</span>
              <h1>Welcome aboard {vessel.name}</h1>
              <p className="sub">
                Complete this short induction and sign-on before departure. Franmarine crew: use <Link to="/login">crew login</Link> instead.
              </p>
            </div>
            <GuestForm vessel={vessel} mode="public" onDone={setDone} />
          </>
        )}
      </main>
    </div>
  );
}
