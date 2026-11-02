import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/auth";

export default function Login() {
  const { signIn, resetPassword, demo } = useAuth();
  const [info, setInfo] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signIn(email, password);
      const to = location.state?.from || "/";
      navigate(to, { replace: true });
    } catch (err) {
      setError(err.message || "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-wrap">
        <form className="login-card" onSubmit={onSubmit}>
          <img className="login-logo" src={`${import.meta.env.BASE_URL}franmarine-logo.jpeg`} alt="Franmarine Underwater Services" />
          <p className="login-kicker">Franmarine Underwater Services</p>
          <h1 className="login-title">Vessel Safety Management System</h1>

          {error && <div className="error">{error}</div>}
          {info && <div className="notice notice-ok">{info}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="login-links">
            <Link to="/signup">Create crew account</Link>
            <button
              type="button"
              className="linklike"
              onClick={async () => {
                setError(""); setInfo("");
                if (!email) return setError("Enter your email first, then tap Forgot password.");
                try { await resetPassword(email); setInfo("Password reset email sent."); } catch (e) { setError(e.message); }
              }}
            >
              Forgot password
            </button>
          </div>

          {demo && (
            <div className="demo-note">
              <strong>Demo mode</strong> (no Supabase configured).<br />
              NSW: <code>nsw@franmarine.com.au</code> / <code>demo</code>
              <br />
              WA: <code>wa@franmarine.com.au</code> / <code>demo</code>
            </div>
          )}
        </form>
      </div>
      <div className="login-footer">
        © {new Date().getFullYear()} Franmarine Underwater Services Pty Ltd · Authorised users only
      </div>
    </div>
  );
}
