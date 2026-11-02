import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { countPending } from "../lib/crewAdmin";
import { regionAlerts } from "../lib/alerts";
import { useAuth } from "../lib/auth";

export default function AppShell({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isManager = ["manager", "admin"].includes(profile?.role);
  const [pending, setPending] = useState(0);
  const [overdue, setOverdue] = useState(0);
  useEffect(() => {
    if (isManager && profile?.region) {
      countPending(profile.region).then(setPending);
      regionAlerts(profile.region).then((a) => setOverdue(a.filter((x) => x.level === "overdue").length)).catch(() => {});
    }
  }, [isManager, profile?.region]);

  async function handleSignOut() {
    await signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <img src={`${import.meta.env.BASE_URL}franmarine-logo.jpeg`} alt="Franmarine Underwater Services" />
        <div className="topbar-title">
          <strong>Vessel SMS</strong>
          <span>{profile?.full_name}</span>
        </div>
        {isManager && (
          <Link to="/compliance" className="btn btn-ghost crew-link">
            Alerts{overdue > 0 && <span className="badge">{overdue}</span>}
          </Link>
        )}
        {isManager && (
          <Link to="/crew" className="btn btn-ghost crew-link">
            Crew{pending > 0 && <span className="badge">{pending}</span>}
          </Link>
        )}
        {profile?.region && <span className="region-pill">{profile.region}</span>}
        <button className="btn btn-ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <main className="content">{children}</main>
    </div>
  );
}
