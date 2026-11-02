// Per-user, per-vessel compliance: induction records and daily sign-ons.
// Supabase tables: inductions, sign_ons (see supabase/schema.sql).
// Demo mode: localStorage, same shape.

import { supabase, DEMO_MODE } from "./supabase";
import { INDUCTION_VALID_DAYS, INDUCTION_ABSENCE_DAYS } from "../data/vessels";

const LS_KEY = "fus-sms-demo-compliance";

function todayLocal() {
  // Sign-ons are a calendar-day record in the vessel's local time.
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}

// ---------- demo storage ----------
function demoLoad() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || { inductions: [], sign_ons: [] };
  } catch {
    return { inductions: [], sign_ons: [] };
  }
}
function demoSave(db) {
  localStorage.setItem(LS_KEY, JSON.stringify(db));
}

// ---------- records ----------
export async function getLatestInduction(userId, vesselId) {
  if (DEMO_MODE) {
    const rows = demoLoad().inductions.filter((r) => r.user_id === userId && r.vessel_id === vesselId);
    return rows.sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0] || null;
  }
  const { data, error } = await supabase
    .from("inductions")
    .select("*")
    .eq("user_id", userId)
    .eq("vessel_id", vesselId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getLatestSignOn(userId, vesselId) {
  if (DEMO_MODE) {
    const rows = demoLoad().sign_ons.filter((r) => r.user_id === userId && r.vessel_id === vesselId);
    return rows.sort((a, b) => b.sign_on_date.localeCompare(a.sign_on_date))[0] || null;
  }
  const { data, error } = await supabase
    .from("sign_ons")
    .select("*")
    .eq("user_id", userId)
    .eq("vessel_id", vesselId)
    .order("sign_on_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function recordInduction({ userId, vesselId, smsRevision, acknowledgements, signature }) {
  const row = {
    user_id: userId,
    vessel_id: vesselId,
    sms_revision: smsRevision,
    acknowledgements,
    signature_name: signature,
    completed_at: new Date().toISOString(),
  };
  if (DEMO_MODE) {
    const db = demoLoad();
    db.inductions.push({ id: crypto.randomUUID(), ...row });
    demoSave(db);
    return row;
  }
  const { data, error } = await supabase.from("inductions").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function recordSignOn({ userId, vesselId, roleToday, masterName, declarations, signature }) {
  const row = {
    user_id: userId,
    vessel_id: vesselId,
    sign_on_date: todayLocal(),
    role_today: roleToday,
    master_name: masterName,
    declarations,
    signature_name: signature,
    signed_at: new Date().toISOString(),
  };
  if (DEMO_MODE) {
    const db = demoLoad();
    db.sign_ons = db.sign_ons.filter(
      (r) => !(r.user_id === userId && r.vessel_id === vesselId && r.sign_on_date === row.sign_on_date)
    );
    db.sign_ons.push({ id: crypto.randomUUID(), ...row });
    demoSave(db);
    return row;
  }
  const { data, error } = await supabase
    .from("sign_ons")
    .upsert(row, { onConflict: "user_id,vessel_id,sign_on_date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---------- status ----------
/**
 * Returns:
 *  { step: 'induction' | 'sign_on' | 'ok', reason, induction, signOn }
 * Induction is required when: none on file; SMS revision changed since induction;
 * induction older than 12 months; or no sign-on to this vessel in the last 6 months.
 */
export async function getVesselStatus(userId, vessel) {
  const [induction, signOn] = await Promise.all([
    getLatestInduction(userId, vessel.id),
    getLatestSignOn(userId, vessel.id),
  ]);
  const today = todayLocal();

  let reason = null;
  if (!induction) reason = "first_trip";
  else if (induction.sms_revision !== vessel.sms_revision) reason = "sms_revised";
  else if (daysBetween(induction.completed_at, today) > INDUCTION_VALID_DAYS) reason = "expired";
  else {
    const lastActivity = signOn ? signOn.sign_on_date : induction.completed_at;
    if (daysBetween(lastActivity, today) > INDUCTION_ABSENCE_DAYS) reason = "absence";
  }
  if (reason) return { step: "induction", reason, induction, signOn };

  if (!signOn || signOn.sign_on_date !== today) return { step: "sign_on", reason: null, induction, signOn };
  return { step: "ok", reason: null, induction, signOn };
}

export const INDUCTION_REASONS = {
  first_trip: "Vessel induction is required before your first trip on this vessel.",
  sms_revised: "The SMS has been revised since your last induction. Re-induction is required.",
  expired: "Your induction is more than 12 months old and must be renewed.",
  absence: "You have been absent from this vessel for more than 6 months. Re-induction is required.",
};

// ---------- Today's crew (everyone signed on to a vessel today) ----------
export async function listTodayCrew(vesselId) {
  const today = todayLocal();
  if (DEMO_MODE) {
    const db = demoLoad();
    const crew = db.sign_ons
      .filter((r) => r.vessel_id === vesselId && r.sign_on_date === today)
      .map((r) => ({ ...r, kind: "crew", display_name: r.signature_name }));
    const guests = (db.guest_sign_ons || [])
      .filter((r) => r.vessel_id === vesselId && r.sign_on_date === today)
      .map((r) => ({ ...r, kind: "guest", display_name: r.full_name }));
    return [...crew, ...guests].sort((a, b) => a.signed_at.localeCompare(b.signed_at));
  }
  const [{ data: crew, error: e1 }, { data: guests, error: e2 }] = await Promise.all([
    supabase
      .from("sign_ons")
      .select("id, role_today, master_name, signature_name, signed_at, profiles(full_name)")
      .eq("vessel_id", vesselId)
      .eq("sign_on_date", today),
    supabase
      .from("guest_sign_ons")
      .select("id, full_name, company, role_today, signed_at, added_by_name")
      .eq("vessel_id", vesselId)
      .eq("sign_on_date", today),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  return [
    ...crew.map((r) => ({ ...r, kind: "crew", display_name: r.profiles?.full_name || r.signature_name })),
    ...guests.map((r) => ({ ...r, kind: "guest", display_name: r.full_name })),
  ].sort((a, b) => a.signed_at.localeCompare(b.signed_at));
}

// ---------- Special personnel / guest sign-on (no account) ----------
// Used both by the master-led "add special personnel" flow and the public QR route.
export async function recordGuestSignOn({ vesselId, fullName, company, roleToday, declarations, signature, addedById, addedByName, inductionAcks }) {
  const row = {
    vessel_id: vesselId,
    sign_on_date: todayLocal(),
    full_name: fullName,
    company: company || null,
    role_today: roleToday || "Special personnel",
    declarations,
    induction_acks: inductionAcks || null,
    signature_name: signature,
    added_by: addedById || null,
    added_by_name: addedByName || null,
    signed_at: new Date().toISOString(),
  };
  if (DEMO_MODE) {
    const db = demoLoad();
    db.guest_sign_ons = db.guest_sign_ons || [];
    db.guest_sign_ons.push({ id: crypto.randomUUID(), ...row });
    demoSave(db);
    return row;
  }
  const { data, error } = await supabase.from("guest_sign_ons").insert(row).select().single();
  if (error) throw error;
  return data;
}

// ---------- Pre-departure checks (FUS-SMS-xx-05A) ----------
export async function getTodayPreDeparture(vesselId) {
  const today = todayLocal();
  if (DEMO_MODE) {
    const rows = (demoLoad().pre_departures || []).filter((r) => r.vessel_id === vesselId && r.check_date === today);
    return rows.sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0] || null;
  }
  const { data, error } = await supabase
    .from("pre_departures").select("*").eq("vessel_id", vesselId).eq("check_date", today)
    .order("completed_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function recordPreDeparture({ vesselId, masterId, masterName, items, defects, fitToDepart, fuelLitres, pob, signature }) {
  const row = {
    vessel_id: vesselId,
    check_date: todayLocal(),
    master_id: masterId,
    master_name: masterName,
    items,                       // [{id, section, text, critical, result: 'pass'|'fail'|'na', note}]
    defects: defects || null,
    fit_to_depart: fitToDepart,
    fuel_litres: fuelLitres || null,
    persons_on_board: pob || null,
    signature_name: signature,
    completed_at: new Date().toISOString(),
  };
  if (DEMO_MODE) {
    const db = demoLoad();
    db.pre_departures = db.pre_departures || [];
    db.pre_departures.push({ id: crypto.randomUUID(), ...row });
    demoSave(db);
    return row;
  }
  const { data, error } = await supabase.from("pre_departures").insert(row).select().single();
  if (error) throw error;
  return data;
}

// ---------- Emergency drills (FUS-SMS-xx-04B) ----------
export async function listDrills(vesselId, limit = 50) {
  if (DEMO_MODE) {
    return (demoLoad().drills || []).filter((d) => d.vessel_id === vesselId).sort((a, b) => b.drill_date.localeCompare(a.drill_date)).slice(0, limit);
  }
  const { data, error } = await supabase.from("drills").select("*").eq("vessel_id", vesselId).order("drill_date", { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function recordDrill({ vesselId, drillType, drillTypeOther, drillDate, location, scenario, participants, outcome, correctiveActions, notes, conductedById, conductedByName, signature }) {
  const row = {
    vessel_id: vesselId,
    drill_type: drillType,
    drill_type_other: drillTypeOther || null,
    drill_date: drillDate,
    location: location || null,
    scenario,
    participants,            // [{name, role, kind:'crew'|'guest', user_id?}]
    outcome: outcome || null,
    corrective_actions: correctiveActions || null,
    notes: notes || null,
    conducted_by: conductedById,
    conducted_by_name: conductedByName,
    signature_name: signature,
    created_at: new Date().toISOString(),
  };
  if (DEMO_MODE) {
    const db = demoLoad();
    db.drills = db.drills || [];
    db.drills.push({ id: crypto.randomUUID(), ...row });
    demoSave(db);
    return row;
  }
  const { data, error } = await supabase.from("drills").insert(row).select().single();
  if (error) throw error;
  return data;
}
