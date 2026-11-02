import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../lib/auth";
import { inviteCrew, listInvitations, cancelInvitation } from "../lib/crewAdmin";
import { appUrl } from "./VesselQr";

const ROLES = ["crew", "master", "manager"];

function shareText(inv, link) {
  return `Hi ${inv.full_name.split(" ")[0]}, you've been set up on the Franmarine Vessel SMS app (${inv.region}). Create your account here using ${inv.email}: ${link}`;
}

export default function InvitePanel() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ fullName: "", email: "", role: "crew" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const link = appUrl("/signup");

  const refresh = useCallback(() => listInvitations(profile.region).then(setList).catch(() => {}), [profile.region]);
  useEffect(() => {
    refresh();
  }, [refresh]);

  async function share(inv) {
    const text = shareText(inv, link);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Franmarine Vessel SMS", text });
        return;
      } catch {
        /* cancelled */
      }
    }
    await navigator.clipboard?.writeText(text);
    setMsg("Invite message copied — paste it into a text or email.");
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await inviteCrew({ ...form, region: profile.region, inviter: { id: user.id, full_name: profile.full_name } });
      setMsg(r.message);
      setForm({ fullName: "", email: "", role: "crew" });
      setOpen(false);
      refresh();
    } catch (err) {
      setError(err.message || "Could not invite.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-head panel-head-row">
        <span>Invite crew</span>
        <span className="pill-light">{list.length} open</span>
      </div>
      <div className="panel-body">
        {msg && <div className="notice notice-ok">{msg}</div>}
        {error && <div className="error">{error}</div>}
        {!open && (
          <button type="button" className="btn btn-inline" onClick={() => setOpen(true)}>
            + Invite someone
          </button>
        )}
        {open && (
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="iname">Full name</label>
              <input id="iname" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="field">
              <label htmlFor="iemail">Email (any domain)</label>
              <input id="iemail" type="email" inputMode="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="field">
              <label>Role</label>
              <div className="chip-row">
                {ROLES.map((r) => (
                  <button type="button" key={r} className={`chip ${form.role === r ? "chip-on" : ""}`} onClick={() => setForm({ ...form, role: r })}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <p className="hint">
              They're pre-approved for {profile.region} as {form.role}: when they create their account with this email they're active immediately, no approval step.
            </p>
            <div className="gate-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</button>
              <button className="btn btn-inline" type="submit" disabled={busy}>{busy ? "Sending…" : "Send invite"}</button>
            </div>
          </form>
        )}
      </div>
      {list.length > 0 && (
        <ul className="crew-list">
          {list.map((inv) => (
            <li key={inv.id}>
              <div>
                <strong>{inv.full_name}</strong>
                <span className="crew-sub">{inv.email} · {inv.role} · not yet registered</span>
              </div>
              <div className="chip-row">
                <button type="button" className="btn btn-inline btn-small" onClick={() => share(inv)}>Share link</button>
                <button type="button" className="btn btn-ghost btn-small" onClick={() => cancelInvitation(inv.id).then(refresh)}>Cancel</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
