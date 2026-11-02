import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { listTodayCrew } from "../lib/compliance";
import GuestForm from "./GuestForm";

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
}

export default function TodayCrew({ vessel, mySignOn }) {
  const { user, profile } = useAuth();
  const [crew, setCrew] = useState(null);
  const [adding, setAdding] = useState(false);
  const isMaster = mySignOn?.role_today === "Master" || ["manager", "admin"].includes(profile?.role);

  const refresh = useCallback(() => listTodayCrew(vessel.id).then(setCrew).catch(() => setCrew([])), [vessel.id]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const maxPersons = (vessel.particulars?.["Max persons"] || "").match(/^\d+/)?.[0];

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <span>Today's crew</span>
        {crew && (
          <span className="pill-light">
            {crew.length}{maxPersons ? ` / ${maxPersons} max` : ""} on board
          </span>
        )}
      </div>
      {!crew && <div className="panel-body sub">Loading…</div>}
      {crew && (
        <ul className="crew-list">
          {crew.map((c) => (
            <li key={c.id}>
              <div>
                <strong>{c.display_name}</strong>
                <span className="crew-sub">
                  {c.role_today}
                  {c.kind === "guest" && c.company ? ` · ${c.company}` : ""}
                  {c.kind === "guest" ? " · signed on via " + (c.added_by_name ? "master" : "QR") : ""}
                </span>
              </div>
              <span className="crew-time">{fmtTime(c.signed_at)}</span>
            </li>
          ))}
        </ul>
      )}
      {crew && !adding && (
        <div className="panel-body" style={{ paddingTop: 0 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setAdding(true)}>
            + Add special personnel
          </button>
          {isMaster && (
            <p className="hint">
              Master: confirm this list against the verbal roll call before departure. Anyone not listed has not signed on.
            </p>
          )}
        </div>
      )}
      {adding && (
        <div className="panel-body guest-embed">
          <GuestForm
            vessel={vessel}
            mode="master"
            addedBy={{ id: user.id, name: profile.full_name }}
            onCancel={() => setAdding(false)}
            onDone={() => {
              setAdding(false);
              refresh();
            }}
          />
        </div>
      )}
    </section>
  );
}
