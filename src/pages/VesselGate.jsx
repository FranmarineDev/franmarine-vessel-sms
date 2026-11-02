import { useEffect, useState, useCallback } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { getVessel } from "../lib/vessels";
import { getVesselStatus } from "../lib/compliance";
import AppShell from "../components/AppShell";
import Induction from "./Induction";
import SignOn from "./SignOn";
import VesselSms from "./VesselSms";

export default function VesselGate() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [vessel, setVessel] = useState(undefined);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");

  const refresh = useCallback(
    async (v) => {
      try {
        setStatus(await getVesselStatus(user.id, v));
      } catch (e) {
        setError(e.message || "Could not check your induction status.");
      }
    },
    [user.id]
  );

  useEffect(() => {
    getVessel(id)
      .then((v) => {
        setVessel(v);
        if (v) refresh(v);
      })
      .catch(() => setVessel(null));
  }, [id, refresh]);

  if (vessel === undefined || (vessel && !status && !error)) {
    return (
      <AppShell>
        <div className="loading">Checking your access…</div>
      </AppShell>
    );
  }
  if (!vessel || vessel.region !== profile?.region) return <Navigate to="/" replace />;

  return (
    <AppShell>
      <div className="crumb">
        <Link to="/">← Vessels</Link>
      </div>
      {error && <div className="error">{error}</div>}
      {status?.step === "induction" && (
        <Induction vessel={vessel} reason={status.reason} onComplete={() => refresh(vessel)} />
      )}
      {status?.step === "sign_on" && (
        <SignOn vessel={vessel} induction={status.induction} onComplete={() => refresh(vessel)} />
      )}
      {status?.step === "ok" && <VesselSms vessel={vessel} status={status} />}
    </AppShell>
  );
}
