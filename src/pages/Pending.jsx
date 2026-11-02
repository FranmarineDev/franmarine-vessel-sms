import { useAuth } from "../lib/auth";
import AppShell from "../components/AppShell";

export default function Pending() {
  const { profile, refreshProfile } = useAuth();
  const suspended = profile.status === "suspended";
  return (
    <AppShell>
      <div className="gate">
        <div className="gate-head">
          <span className="gate-kicker">{suspended ? "Account suspended" : "Awaiting approval"}</span>
          <h1>{profile.full_name}</h1>
        </div>
        <div className={`notice ${suspended ? "notice-warn" : "notice-info"}`}>
          {suspended
            ? "Your account has been suspended. Contact your Regional Manager."
            : `Your account is registered for ${profile.region}. A manager needs to approve it before you can sign on to a vessel — this usually takes a few minutes during work hours. If you're on the wharf now, tell the master; they can record you as special personnel for today.`}
        </div>
        {!suspended && (
          <button className="btn btn-inline" onClick={refreshProfile}>Check again</button>
        )}
      </div>
    </AppShell>
  );
}
