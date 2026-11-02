import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, isCompanyEmail, COMPANY_DOMAIN } from "../lib/auth";

export default function SignUp() {
  const { signUp, demo } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("NSW");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await signUp({ fullName, email, region, password });
      if (demo) navigate("/", { replace: true });
      else setSent(true);
    } catch (err) {
      setError(err.message || "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  const company = isCompanyEmail(email);

  return (
    <div className="login-shell">
      <div className="login-wrap">
        <form className="login-card" onSubmit={onSubmit}>
          <img className="login-logo" src={`${import.meta.env.BASE_URL}franmarine-logo.jpeg`} alt="Franmarine Underwater Services" />
          <p className="login-kicker">Franmarine Underwater Services</p>
          <h1 className="login-title">Create crew account</h1>

          {sent ? (
            <>
              <div className="notice notice-ok">
                Account created. Check <strong>{email}</strong> for a confirmation link, then sign in.
                {!company && " Your account will be activated once a manager approves it."}
              </div>
              <Link className="btn" to="/login">Back to sign in</Link>
            </>
          ) : (
            <>
              {error && <div className="error">{error}</div>}
              <div className="field">
                <label htmlFor="name">Full name (as it should appear on records)</label>
                <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                {email.includes("@") && (
                  <p className="hint" style={{ marginTop: 6 }}>
                    {company
                      ? `@${COMPANY_DOMAIN} — your account will be active straight away.`
                      : "Personal email — a manager will approve your account before you can sign on to a vessel."}
                  </p>
                )}
              </div>
              <div className="field">
                <label>Region</label>
                <div className="chip-row">
                  {["NSW", "WA"].map((r) => (
                    <button type="button" key={r} className={`chip ${region === r ? "chip-on" : ""}`} onClick={() => setRegion(r)}>
                      {r === "NSW" ? "NSW — East" : "WA — West"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="field">
                <label htmlFor="password">Password (8+ characters)</label>
                <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create account"}
              </button>
              <p className="hint" style={{ textAlign: "center" }}>
                Already have one? <Link to="/login">Sign in</Link>
              </p>
            </>
          )}
        </form>
      </div>
      <div className="login-footer">© {new Date().getFullYear()} Franmarine Underwater Services Pty Ltd</div>
    </div>
  );
}
