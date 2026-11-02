import { createContext, useContext, useEffect, useState } from "react";
import { supabase, DEMO_MODE } from "./supabase";
import { DEMO_USERS } from "./demoData";
import { demoConsumeInvitation } from "./crewAdmin";

const AuthContext = createContext(null);
const DEMO_KEY = "fus-sms-demo-session";
const DEMO_ACCOUNTS = "fus-sms-demo-accounts"; // self-registered demo accounts

export const COMPANY_DOMAIN = "franmarine.com.au";
export function isCompanyEmail(email) {
  return (email || "").trim().toLowerCase().endsWith("@" + COMPANY_DOMAIN);
}

// ---- demo account store (mirrors the profiles table) ----
export function demoAccounts() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ACCOUNTS)) || {};
  } catch {
    return {};
  }
}
export function demoSaveAccounts(a) {
  localStorage.setItem(DEMO_ACCOUNTS, JSON.stringify(a));
}
function demoLookup(email) {
  const key = email.trim().toLowerCase();
  if (DEMO_USERS[key]) return { ...DEMO_USERS[key], profile: { ...DEMO_USERS[key].profile, status: "approved", email: key } };
  const a = demoAccounts()[key];
  return a ? { password: a.password, profile: { ...a.profile, email: key } } : null;
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, region, role, status, email")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // { full_name, region, role, status }
  const [loading, setLoading] = useState(true);

  async function loadProfile(u) {
    try {
      setProfile(await fetchProfile(u.id));
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    if (DEMO_MODE) {
      const saved = sessionStorage.getItem(DEMO_KEY);
      if (saved) {
        const p = JSON.parse(saved);
        // re-read status in case a manager approved us in another tab
        const fresh = demoLookup(p.email)?.profile || p;
        setUser({ id: fresh.id, email: fresh.email });
        setProfile(fresh);
      }
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!active) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    if (DEMO_MODE) {
      const rec = demoLookup(email);
      if (!rec || rec.password !== password) throw new Error("Invalid email or password.");
      sessionStorage.setItem(DEMO_KEY, JSON.stringify(rec.profile));
      setUser({ id: rec.profile.id, email: rec.profile.email });
      setProfile(rec.profile);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /** Self-registration. Company emails are approved immediately; others wait for a manager. */
  async function signUp({ fullName, email, region, password }) {
    const key = email.trim().toLowerCase();
    if (DEMO_MODE) {
      if (demoLookup(key)) throw new Error("An account with that email already exists.");
      const a = demoAccounts();
      const inv = demoConsumeInvitation(key);
      a[key] = {
        password,
        profile: {
          id: "demo-" + crypto.randomUUID().slice(0, 8),
          full_name: fullName.trim(),
          region: inv ? inv.region : region,
          role: inv ? inv.role : "crew",
          status: inv || isCompanyEmail(key) ? "approved" : "pending",
          created_at: new Date().toISOString(),
        },
      };
      demoSaveAccounts(a);
      await signIn(key, password);
      return;
    }
    const { error } = await supabase.auth.signUp({
      email: key,
      password,
      options: { data: { full_name: fullName.trim(), region } },
    });
    if (error) throw error;
    // If "Confirm email" is on in Supabase, the user must click the link before the session exists.
  }

  async function resetPassword(email) {
    if (DEMO_MODE) throw new Error("Password reset isn't available in demo mode.");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin + "/login",
    });
    if (error) throw error;
  }

  async function refreshProfile() {
    if (DEMO_MODE) {
      if (!profile) return;
      const fresh = demoLookup(profile.email)?.profile;
      if (fresh) {
        setProfile(fresh);
        sessionStorage.setItem(DEMO_KEY, JSON.stringify(fresh));
      }
      return;
    }
    if (user) await loadProfile(user);
  }

  async function signOut() {
    if (DEMO_MODE) {
      sessionStorage.removeItem(DEMO_KEY);
      setUser(null);
      setProfile(null);
      return;
    }
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signIn, signUp, resetPassword, refreshProfile, signOut, demo: DEMO_MODE }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
