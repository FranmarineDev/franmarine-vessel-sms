// Pre-departure checklist content per vessel — FUS-SMS-{INT3,ROH,SGL}-05A Rev 01 §3–4.
// `critical: true` items fall under §5: any failure = vessel shall not depart until rectified.
// Non-critical failures are recorded and reported to the East Coast Operations Superintendent.

const COMMON_COMMS = [
  { id: "vhf", text: "VHF radio functional and on Ch 16 for distress monitoring", critical: true },
  { id: "siglight", text: "Signalling light present and functional (NSCV C7B)", critical: true },
  { id: "vts", text: "Daily vessel movements schedule checked (Port Authority of NSW); VTS channels noted — Sydney Ch 13, Botany Bay Ch 12, Defence towers Ch 14" },
  { id: "plotter", text: "Chart plotter / ECS operational with current charts and backup (NSCV C7C)", critical: true },
  { id: "gnss", text: "GNSS operational" },
  { id: "sounder", text: "Echo sounder operational, transducer in good condition" },
];
const COMMON_LIGHTS = [
  { id: "navlights", text: "Navigation lights (port, starboard, masthead, stern) functional", critical: true },
  { id: "anchorlight", text: "All-round white (anchor) light functional" },
  { id: "decklight", text: "Auxiliary / deck lighting functional" },
];
const COMMON_GROUND = [
  { id: "anchor", text: "Anchor, cables, hawsers and warps present and serviceable", critical: true },
  { id: "seaanchor", text: "Sea anchor present (NSCV C7D)" },
];
const TRAILER = [
  { id: "trwinch", text: "Trailer recovery winch functional, handle present (if trailer launching)" },
  { id: "trbinder", text: "Trailer load binder / secondary chain in place (if trailer launching)" },
];
const PYRO = [
  { id: "rockets", text: "3 × parachute distress rockets — present and in date", critical: true },
  { id: "flares", text: "2 × red hand-held flares — present and in date", critical: true },
  { id: "smoke", text: "1 × hand-held orange smoke — present and in date", critical: true },
];
const NAVEQ = [
  { id: "binocs", text: "Binoculars, clock, compass (75 mm card), speed/distance indicator, sound signal on board (NSCV C7C)" },
  { id: "pubs", text: "Nautical publications current edition" },
];
const SPILL = [{ id: "spill", text: "Spill kit present and serviceable (pads, boom/socks, bags, nitrile gloves)" }];
const docs = (prefix, guide) => [
  { id: "doc_sms", text: `SMS on board (${prefix}) incl. emergency response manual ${prefix}-06`, critical: true },
  { id: "doc_ops", text: "Operations manual, MSDS register, digital charts" },
  { id: "doc_swms", text: "Vessel SWMS for current scope of work", critical: true },
  { id: "doc_coo", text: "Certificate of Operation (COO-690-006) and logbook (MO504)", critical: true },
  { id: "doc_guide", text: guide },
];

export const PREDEPARTURE = {
  "integrity-iii": [
    { title: "3.1 Hull and structure", items: [
      { id: "hull", text: "Aluminium hull free of damage, dents, cracks, impact marks", critical: true },
      { id: "obdamage", text: "Outboards free of damage — leg, propeller, cowling", critical: true },
      { id: "tidy", text: "Vessel clean and tidy, no loose items" },
      { id: "bungs", text: "All bungs in place and secure", critical: true },
    ]},
    { title: "3.2 Electrical and batteries", items: [
      { id: "batt", text: "Both battery isolators ON, selector on 1+2 (BOTH)", critical: true },
      { id: "empower", text: "Emergency power source functional (3-hour, NSCV C5B)" },
    ]},
    { title: "3.3 Outboard engines", items: [
      { id: "trim", text: "Outboard trim functional, chocks removed", critical: true },
      { id: "mounts", text: "Outboard mounts good, fixings secure", critical: true },
      { id: "strap", text: "Securing strap removed for launch" },
    ]},
    { title: "3.4 Steering", items: [{ id: "steer", text: "Steering functioning and smooth; fluid topped up if needed", critical: true }] },
    { title: "3.5 Fuel", items: [
      { id: "fuel", text: "Adequate fuel for voyage plus 30% reserve", critical: true },
      { id: "fueltype", text: "Fuel is premium unleaded, no ethanol" },
    ]},
    { title: "3.6 Communications and electronics", items: COMMON_COMMS },
    { title: "3.7 Navigation lights and signals", items: COMMON_LIGHTS },
    { title: "3.8 Ground tackle", items: COMMON_GROUND },
    { title: "3.9 Trailer (if applicable)", items: TRAILER, optional: true },
    { title: "4.1–4.4 Lifesaving", items: [
      { id: "lj", text: "SOLAS lifejackets in bow compartment for 100% complement, lights fitted; crew 150 PFDs available", critical: true },
      { id: "lifebuoy", text: "1 × lifebuoy with light and buoyant heaving line, accessible", critical: true },
      { id: "torch", text: "Torch for each crew member" },
      { id: "epirb", text: "Float-free EPIRB in bracket, in date (battery and AMSA registration)", critical: true },
    ]},
    { title: "4.5 Medical", items: [
      { id: "fak", text: "First aid kit (bow compartment) present, complete, in date — Scale F basis", critical: true },
      { id: "o2", text: "Oxygen administration kit present (diving operations)", critical: true },
    ]},
    { title: "4.6 Firefighting", items: [
      { id: "ext", text: "2 × 4.5 kg ABE DCP extinguishers (stbd under gunwale near helm; bow compartment) present, in date", critical: true },
      { id: "blanket", text: "Fire blanket present" },
    ]},
    { title: "4.7 Pyrotechnics", items: PYRO },
    { title: "4.8 Spill kit", items: SPILL },
    { title: "4.9 Navigation equipment", items: NAVEQ },
    { title: "4.10 Bilge pumps", items: [
      { id: "bilge", text: "2 × manual bilge pumps (transom port and stbd) operational", critical: true },
      { id: "bucket", text: "Bailing buckets on board" },
    ]},
    { title: "4.11 Documentation", items: docs("FUS-SMS-INT3", "AMSA Class 2C equipment guidance on board; Marine VHF Radio Operators Handbook") },
  ],

  rohani: [
    { title: "3.1 Hull and structure", items: [
      { id: "hull", text: "Aluminium hull free of damage, dents, cracks, impact marks", critical: true },
      { id: "shafts", text: "Shafts, propellers and rudders clear of fouling and undamaged (where accessible)", critical: true },
      { id: "tidy", text: "Vessel clean and tidy, no loose items" },
      { id: "bungs", text: "All bungs in place and secure", critical: true },
    ]},
    { title: "3.2 Electrical and batteries", items: [
      { id: "batt", text: "Port, Starboard and House battery isolators ON; emergency parallel isolator OFF", critical: true },
      { id: "empower", text: "Emergency power source functional (3-hour, NSCV C5B)" },
    ]},
    { title: "3.3 Main engines", items: [
      { id: "neutral", text: "Gearboxes in neutral, engine controls free through full range", critical: true },
      { id: "seasuction", text: "Sea suction valves open, raw-water strainers clear", critical: true },
      { id: "mounts", text: "Engine mounts and shaft couplings good, fixings secure (visual)" },
    ]},
    { title: "3.4 Steering", items: [{ id: "steer", text: "Steering functioning and smooth; fluid topped up if needed", critical: true }] },
    { title: "3.5 Fuel", items: [{ id: "fuel", text: "Adequate diesel for voyage plus 30% reserve", critical: true }] },
    { title: "3.6 Communications and electronics", items: COMMON_COMMS },
    { title: "3.7 Navigation lights and signals", items: COMMON_LIGHTS },
    { title: "3.8 Ground tackle", items: COMMON_GROUND },
    { title: "4.1–4.4 Lifesaving", items: [
      { id: "lj", text: "SOLAS lifejackets in wheelhouse for 100% complement, lights fitted; crew 150 PFDs available", critical: true },
      { id: "lifebuoy", text: "1 × lifebuoy with light and buoyant heaving line, accessible", critical: true },
      { id: "torch", text: "Torch for each crew member" },
      { id: "epirb", text: "Float-free EPIRB in bracket outside wheelhouse, in date (battery and AMSA registration)", critical: true },
    ]},
    { title: "4.5 Medical", items: [
      { id: "fak", text: "First aid kit (wheelhouse) present, complete, in date — Scale F basis", critical: true },
      { id: "o2", text: "Oxygen administration kit present (diving operations)", critical: true },
    ]},
    { title: "4.6 Firefighting", items: [
      { id: "ext", text: "1 × 9 L foam (AB) + 1 × 4.5 kg DCP (ABE) in wheelhouse — seals intact, gauges green, service dates current", critical: true },
      { id: "blanket", text: "Fire blanket present" },
    ]},
    { title: "4.7 Pyrotechnics", items: PYRO },
    { title: "4.8 Spill kit", items: SPILL },
    { title: "4.9 Navigation equipment", items: NAVEQ },
    { title: "4.10 Bilge pumps", items: [
      { id: "bilge", text: "3 × power bilge pumps (fwd, aft, engine room) run in auto and manual; float switches free", critical: true },
      { id: "bucket", text: "Bailing buckets on board" },
    ]},
    { title: "4.11 Documentation", items: docs("FUS-SMS-ROH", "AMSA Class 2C equipment guidance on board; Marine VHF Radio Operators Handbook") },
  ],

  seagull: [
    { title: "3.1 Hull and structure", items: [
      { id: "hull", text: "Aluminium hull free of damage, dents, cracks, impact marks", critical: true },
      { id: "obdamage", text: "Outboard free of damage — leg, propeller, cowling", critical: true },
      { id: "ramp", text: "Bow ramp secured and raised for transit; hinge and latches sound", critical: true },
      { id: "tidy", text: "Vessel clean and tidy, no loose items" },
      { id: "bungs", text: "All bungs in place and secure", critical: true },
    ]},
    { title: "3.2 Electrical and batteries", items: [
      { id: "batt", text: "Both battery isolators ON, selector on 1+2 (BOTH)", critical: true },
      { id: "empower", text: "Emergency power source functional (3-hour, NSCV C5B)" },
    ]},
    { title: "3.3 Outboard engine", items: [
      { id: "trim", text: "Outboard trim functional, chocks removed", critical: true },
      { id: "mounts", text: "Outboard mounts good, fixings secure", critical: true },
      { id: "strap", text: "Securing strap removed for launch" },
    ]},
    { title: "3.4 Steering", items: [{ id: "steer", text: "Steering functioning and smooth; fluid topped up if needed", critical: true }] },
    { title: "3.5 Fuel", items: [{ id: "fuel", text: "Adequate petrol for voyage plus 30% reserve", critical: true }] },
    { title: "3.6 Communications and electronics", items: COMMON_COMMS },
    { title: "3.7 Navigation lights and signals", items: COMMON_LIGHTS },
    { title: "3.8 Ground tackle", items: COMMON_GROUND },
    { title: "3.9 Trailer (if applicable)", items: TRAILER, optional: true },
    { title: "4.1–4.3 Lifesaving", items: [
      { id: "lj", text: "SOLAS lifejackets in deck storage midships for 100% complement, lights fitted; crew 150 PFDs available", critical: true },
      { id: "lifebuoy", text: "1 × lifebuoy with 30 m buoyant line and light, accessible", critical: true },
      { id: "torch", text: "Torch for each crew member" },
    ]},
    { title: "4.4 Medical", items: [
      { id: "fak", text: "First aid kit (aft deck storage) present, complete, in date — Scale G basis", critical: true },
      { id: "o2", text: "Oxygen administration kit present (diving operations)", critical: true },
    ]},
    { title: "4.5 Firefighting", items: [
      { id: "ext", text: "2 × 4.5 kg ABE DCP extinguishers under central helm console — present, in date", critical: true },
      { id: "blanket", text: "Fire blanket present" },
    ]},
    { title: "4.6 Pyrotechnics", items: PYRO },
    { title: "4.7 Spill kit", items: SPILL },
    { title: "4.8 Navigation equipment", items: NAVEQ },
    { title: "4.9 Bilge pumps", items: [
      { id: "bilge", text: "1 × manual bilge pump (midships, port under gunwale) operational", critical: true },
      { id: "bucket", text: "Bailing buckets on board" },
    ]},
    { title: "4.10 Documentation", items: docs("FUS-SMS-SGL", "AMSA NSCV C7 Class 2D Equipment Guide (P200608) on board") },
  ],
};

export function predepartureFor(slug) {
  return PREDEPARTURE[slug] || [];
}
