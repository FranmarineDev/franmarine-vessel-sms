// Vessel register + vessel-specific induction content.
// Source: FUS-SMS-{INT3,ROH,SGL}-01 (core), -03 (crewing), -04/04A (induction), -06 (emergency), Rev 01, 7 July 2026.
// In Supabase mode the `vessels` table is the register of record; this file supplies
// the induction content keyed by `slug` (content is version-controlled with the app).

export const VESSELS = [
  {
    id: "integrity-iii",
    slug: "integrity-iii",
    name: "MV Integrity III",
    region: "NSW",
    uvi: "414562",
    vessel_class: "2C Restricted",
    home_port: "Sydney",
    doc_prefix: "FUS-SMS-INT3",
    sms_status: "current",
    sms_revision: "Rev 01",
    sms_issued: "2026-07-07",
    sms_review_due: "2027-07-07",
    approval: "EX40-133 · COO-690-006",
    particulars: {
      "Type / hull": "Power monohull, aluminium — Air Rider 7.45 m",
      "Length / beam / draft": "7.68 m / 2.7 m / 0.8 m",
      Propulsion: "2 × Suzuki DF175 outboards (petrol, ~650 L)",
      "Max persons": "6 (4 crew + 2 special personnel)",
      Equipment: "SSBA dive spread, 5 t deck winch",
      "Areas of operation": "Port Jackson, Botany Bay, NSW coastline (2C Restricted)",
      Conditions: "EX40: stability booklet on board; no towing, oil & gas support, dangerous goods",
    },
    induction: {
      layout:
        "Open-deck 7.68 m monohull. Access via the stern platform. Means of escape is over the side from any point on deck; there are no enclosed spaces. Keep the aft deck clear — it is the assembly station.",
      safetyEquipment:
        "Coastal lifejackets (6) with lights; liferaft for 100% complement; 1 lifebuoy with light; 3 parachute rockets, 2 red hand flares, 1 orange smoke; Scale F medical kit; float-free 406 MHz EPIRB; 2 manual bilge pumps on the transom (port and starboard); fire extinguishers per the risk assessment; torch per crew member.",
      radio:
        "Fixed-mount and handheld VHF. Monitor Ch 16 at all times. Sydney VTS Ch 13; Botany Bay VTS Ch 12; Defence precincts (Garden Island / Waterhen Tower) Ch 14. Distress: MAYDAY ×3 on Ch 16, vessel name, position, nature of distress, persons on board.",
      mob:
        "Shout 'man overboard', point continuously, throw the lifebuoy, master manoeuvres to recover from the stern platform with engines in neutral. Procedure FUS-SMS-INT3-06B.",
      fireEmergency:
        "Raise the alarm, master takes command and makes the urgency/distress call, crew fight fire with extinguishers if safe to do so, muster on the aft deck for a verbal roll call. Assembly station: AFT DECK. Fire: 06A; Medical/diving: 06C; Master incapacitated: 06D.",
      hazards:
        "Twin outboard propellers at the stern; 5 t winch wire under load; SSBA dive spread hoses and umbilicals on deck; petrol fuel system (no ignition sources during refuelling); hot exhausts.",
      limits:
        "Do not depart: sustained wind ≥25 kn, significant wave height ≥2.5 m, BOM gale/storm warning. Cease operations: gusts ≥35 kn (plan gusts as forecast × 1.4). Day operations only. Max deadweight 532 kg excluding persons.",
    },
  },
  {
    id: "rohani",
    slug: "rohani",
    name: "MV Rohani",
    region: "NSW",
    uvi: "457394",
    vessel_class: "2C",
    home_port: "Sydney",
    doc_prefix: "FUS-SMS-ROH",
    sms_status: "current",
    sms_revision: "Rev 01",
    sms_issued: "2026-07-07",
    sms_review_due: "2027-07-07",
    approval: "COS-94585-003 · COO-690-006",
    particulars: {
      "Type / hull": "Self-propelled crane barge, aluminium (1994)",
      "Length / beam / draft": "10.8 m / 5.6 m / 1.0 m",
      Propulsion: "2 × Detroit Diesel 6V-92T inboards (diesel, 2 × 1,149 L)",
      "Max persons": "4 (1 crew + 3 special personnel)",
      Equipment: "Unic UB-V504J crane (3.5 t), 2 spud legs, SSBA dive spread, 6 t bollard pull",
      "Areas of operation": "Port Jackson, Botany Bay, NSW coastline (2C); lifting in smooth/partially smooth waters only",
      Conditions: "Operate within stability book limits; 2C transit deck cargo 10 t (crane stowed)",
    },
    induction: {
      layout:
        "10.8 m open-deck barge with wheelhouse and an enclosed engine room (confined space — entry only under FUS-SMS-ROH-05N permit). Boarding at the designated access point. Escape is over the side from any point on deck. Aft deck is the assembly station.",
      safetyEquipment:
        "SOLAS lifejackets in the wheelhouse for 100% complement (crew also wear auto-inflate 150 PFDs); liferaft for 100% complement; 1 lifebuoy with light and heaving line; 3 parachute rockets, 2 red hand flares, 1 orange smoke; Scale F medical kit; float-free EPIRB in its bracket outside the wheelhouse; 3 automatic power bilge pumps (forward, aft, engine room); fire extinguishers per the risk assessment; torch per crew member.",
      radio:
        "Fixed-mount and handheld VHF. Monitor Ch 16 at all times. Sydney VTS Ch 13; Botany Bay VTS Ch 12; Defence precincts (Garden Island / Waterhen Tower) Ch 14. Operate within LCS VHF coverage. Distress: MAYDAY ×3 on Ch 16, vessel name, position, nature of distress, persons on board.",
      mob:
        "Shout 'man overboard', point continuously, throw the lifebuoy, master manoeuvres to recover — propellers are inboard, engines to neutral before recovery alongside. Procedure FUS-SMS-ROH-06B.",
      fireEmergency:
        "Raise the alarm, master takes command and makes the urgency/distress call, crew fight fire if safe to do so (engine-room fire: close hatches, do not enter), muster on the aft deck for a verbal roll call. Assembly station: AFT DECK. Fire: 06A; Medical/diving: 06C; Master incapacitated: 06D.",
      hazards:
        "Crane lifting operations and suspended loads (stay clear of the swing radius); spud leg deployment; towing/pushing lines under tension; engine room confined space; diesel fuel system; SSBA umbilicals on deck.",
      limits:
        "Do not depart: sustained wind ≥25 kn, significant wave height ≥2.5 m, BOM gale/storm warning. Cease operations: gusts ≥35 kn (plan gusts as forecast × 1.4). Lifting only in smooth and partially smooth waters. Day operations only, 12 h working day, 10 h rest in 24.",
    },
  },
  {
    id: "seagull",
    slug: "seagull",
    name: "MV Seagull",
    region: "NSW",
    uvi: "425689",
    vessel_class: "2D, 2E",
    home_port: "Sydney",
    doc_prefix: "FUS-SMS-SGL",
    sms_status: "current",
    sms_revision: "Rev 01",
    sms_issued: "2026-07-07",
    sms_review_due: "2027-07-07",
    approval: "EX02-10309 · COO-690-006 (non-survey)",
    particulars: {
      "Type / hull": "CLGC landing barge, aluminium",
      "Length / beam / draft": "6.5 m / 2.3 m / 0.8 m",
      Propulsion: "Single Yamaha F150XD outboard (petrol)",
      "Max persons": "6 (4 crew + 2 special personnel)",
      Equipment: "SSBA dive spread, drop-down bow ramp",
      "Areas of operation": "NSW partially smooth (2D) and smooth (2E) waters only",
      Conditions: "EX02: NSW only; no towing, oil & gas support, dangerous goods; max deck load 1.2 t",
    },
    induction: {
      layout:
        "6.5 m open landing barge with a drop-down bow ramp. Board over the ramp when lowered, otherwise at the stern. Keep clear of the ramp hinge and never stand on the ramp while it is being raised or lowered (procedure 05I). Escape is over the side from any point on deck. Aft deck is the assembly station.",
      safetyEquipment:
        "Coastal lifejackets (6) with lights; liferaft or dinghy for all persons; 1 lifebuoy with 30 m buoyant line and light; 3 parachute rockets, 2 red hand flares, 1 orange smoke; Scale G first aid kit; 1 manual bilge pump midships under the port gunwale; fire extinguishers per the risk assessment; torch per crew member.",
      radio:
        "Fixed-mount and handheld VHF. Monitor Ch 16 at all times. Sydney VTS Ch 13; Botany Bay VTS Ch 12; Defence precincts Ch 14. Distress: MAYDAY ×3 on Ch 16, vessel name, position, nature of distress, persons on board.",
      mob:
        "Shout 'man overboard', point continuously, throw the lifebuoy, master manoeuvres to recover — engine to neutral, recover over the lowered bow ramp or the side. Procedure FUS-SMS-SGL-06B.",
      fireEmergency:
        "Raise the alarm, master takes command and makes the urgency/distress call, crew fight fire with extinguishers if safe to do so, muster on the aft deck for a verbal roll call. Assembly station: AFT DECK. Fire: 06A; Medical/diving: 06C; Master incapacitated: 06D.",
      hazards:
        "Bow ramp operations (crush points, ramp drop); single outboard propeller at the stern; low freeboard when loaded; petrol fuel system; SSBA umbilicals on deck.",
      limits:
        "Partially smooth and smooth waters only — never beyond 2D limits. Do not depart: sustained wind ≥25 kn, BOM gale/storm warning. Cease operations: gusts ≥35 kn. Max deck load 1.2 t. Day operations only.",
    },
  },
];

export const INDUCTION_VALID_DAYS = 365; // review at least every 12 months (FUS-SMS-xx-04)
export const INDUCTION_ABSENCE_DAYS = 183; // re-induct after >6 months absence (FUS-SMS-xx-04A §2.1)

export function vesselBySlug(slug) {
  return VESSELS.find((v) => v.slug === slug || v.id === slug) || null;
}
