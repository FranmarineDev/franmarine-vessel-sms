// Manager functions: list crew accounts in region, approve / suspend, change role.
import { supabase, DEMO_MODE } from "./supabase";
import { demoAccounts, demoSaveAccounts } from "./auth";
import { DEMO_USERS } from "./demoData";

export async function listCrew(region) {
  if (DEMO_MODE) {
    const builtIn = Object.entries(DEMO_USERS).map(([email, u]) => ({ ...u.profile, email, status: "approved", builtIn: true }));
    const self = Object.entries(demoAccounts()).map(([email, a]) => ({ ...a.profile, email }));
    return [...builtIn, ...self]
      .filter((p) => p.region === region)
      .sort((a, b) => (a.status === "pending" ? -1 : 1) - (b.status === "pending" ? -1 : 1) || a.full_name.localeCompare(b.full_name));
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, region, role, status, created_at")
    .eq("region", region)
    .order("status")
    .order("full_name");
  if (error) throw error;
  return data;
}

export async function updateCrew(id, patch) {
  if (DEMO_MODE) {
    const a = demoAccounts();
    for (const key of Object.keys(a)) {
      if (a[key].profile.id === id) {
        a[key].profile = { ...a[key].profile, ...patch };
        demoSaveAccounts(a);
        return a[key].profile;
      }
    }
    throw new Error("Built-in demo accounts can't be changed.");
  }
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function countPending(region) {
  const list = await listCrew(region).catch(() => []);
  return list.filter((p) => p.status === "pending").length;
}

// ---------- Invitations ----------
const DEMO_INV = "fus-sms-demo-invitations";
function demoInvites() {
  try { return JSON.parse(localStorage.getItem(DEMO_INV)) || []; } catch { return []; }
}

export async function listInvitations(region) {
  if (DEMO_MODE) return demoInvites().filter((i) => i.region === region && !i.accepted_at);
  const { data, error } = await supabase
    .from("invitations").select("*").eq("region", region).is("accepted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Record the invitation (pre-approval) and, in Supabase mode, email it via the invite-crew edge function.
 * Returns { emailed: bool, message }.
 */
export async function inviteCrew({ email, fullName, region, role, inviter }) {
  const key = email.trim().toLowerCase();
  if (DEMO_MODE) {
    const list = demoInvites().filter((i) => i.email !== key);
    list.unshift({ id: crypto.randomUUID(), email: key, full_name: fullName, region, role, invited_by_name: inviter.full_name, created_at: new Date().toISOString(), accepted_at: null });
    localStorage.setItem(DEMO_INV, JSON.stringify(list));
    return { emailed: false, message: "Demo mode: no email sent. Share the link instead." };
  }
  const { data, error } = await supabase.functions.invoke("invite-crew", {
    body: { email: key, full_name: fullName, region, role },
  });
  if (error) {
    // Function not deployed? Fall back to recording the invitation only.
    const { error: e2 } = await supabase.from("invitations").upsert(
      { email: key, full_name: fullName, region, role, invited_by: inviter.id, invited_by_name: inviter.full_name, accepted_at: null },
      { onConflict: "email" }
    );
    if (e2) throw e2;
    return { emailed: false, message: "Pre-approved, but the email could not be sent — share the link instead." };
  }
  if (data?.error) throw new Error(data.error);
  return { emailed: !!data?.emailed, message: data?.message || "Invite sent." };
}

export async function cancelInvitation(id) {
  if (DEMO_MODE) {
    localStorage.setItem(DEMO_INV, JSON.stringify(demoInvites().filter((i) => i.id !== id)));
    return;
  }
  const { error } = await supabase.from("invitations").delete().eq("id", id);
  if (error) throw error;
}

// Demo-mode hook: auth.jsx checks this at sign-up to mirror the DB trigger.
export function demoConsumeInvitation(email) {
  const list = demoInvites();
  const inv = list.find((i) => i.email === email && !i.accepted_at);
  if (inv) {
    inv.accepted_at = new Date().toISOString();
    localStorage.setItem(DEMO_INV, JSON.stringify(list));
  }
  return inv || null;
}
