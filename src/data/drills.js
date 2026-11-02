// Emergency drill types and minimum frequencies — FUS-SMS-xx-04 §4.1 (same for all three vessels).
// intervalDays: minimum frequency. warnDays: alert this many days before due.
export const DRILL_TYPES = [
  { key: "fire",     label: "Fire",                      ref: "06A", intervalDays: 31,  warnDays: 7,  freq: "Monthly" },
  { key: "mob",      label: "Person overboard",          ref: "06B", intervalDays: 31,  warnDays: 7,  freq: "Monthly" },
  { key: "medical",  label: "Medical emergency",         ref: "06C", intervalDays: 92,  warnDays: 14, freq: "Quarterly" },
  { key: "abandon",  label: "Abandon vessel",            ref: "06",  intervalDays: 92,  warnDays: 14, freq: "Quarterly" },
  { key: "flooding", label: "Flooding / damage control", ref: "06I", intervalDays: 92,  warnDays: 14, freq: "Quarterly" },
  { key: "diving",   label: "Diving emergency",          ref: "06C", intervalDays: 31,  warnDays: 7,  freq: "Before each dive operation, or monthly during active campaigns" },
  { key: "other",    label: "Other",                     ref: "06",  intervalDays: null, warnDays: null, freq: "As required" },
];

export const drillByKey = (k) => DRILL_TYPES.find((d) => d.key === k);
