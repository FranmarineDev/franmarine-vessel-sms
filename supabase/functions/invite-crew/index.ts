// Supabase Edge Function: invite-crew
// Called by a signed-in manager/admin. Verifies the caller, records the invitation (pre-approval),
// then sends a Supabase invite email so the person sets a password and lands in the app approved.
//
// Deploy:  supabase functions deploy invite-crew
// Secrets: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
//          Set APP_URL (e.g. https://sms.franmarine.com.au) with: supabase secrets set APP_URL=...
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appUrl = Deno.env.get("APP_URL") ?? "";

    // 1. Who is calling? (user-scoped client, RLS applies)
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);
    const { data: me } = await caller.from("profiles").select("full_name, region, role, status").eq("id", user.id).single();
    if (!me || me.status !== "approved" || !["manager", "admin"].includes(me.role)) {
      return json({ error: "Managers only" }, 403);
    }

    // 2. Validate request
    const { email, full_name, region, role = "crew" } = await req.json();
    if (!email || !full_name || !region) return json({ error: "email, full_name and region are required" }, 400);
    if (!["crew", "master", "manager"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (me.role !== "admin" && region !== me.region) return json({ error: "You can only invite to your own region" }, 403);

    // 3. Record invitation (upsert) — the DB trigger approves them on sign-up
    const admin = createClient(url, service);
    const { error: invErr } = await admin.from("invitations").upsert(
      { email: email.toLowerCase(), full_name, region, role, invited_by: user.id, invited_by_name: me.full_name, accepted_at: null },
      { onConflict: "email" },
    );
    if (invErr) return json({ error: invErr.message }, 400);

    // 4. Send the invite email (creates the auth user; they set a password via the link)
    const { error: mailErr } = await admin.auth.admin.inviteUserByEmail(email.toLowerCase(), {
      data: { full_name, region },
      redirectTo: appUrl ? `${appUrl}/login` : undefined,
    });
    if (mailErr && !/already/i.test(mailErr.message)) return json({ error: mailErr.message }, 400);

    return json({ ok: true, emailed: !mailErr, message: mailErr ? "Already registered — pre-approved for next login." : "Invite email sent." });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
