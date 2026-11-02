// Demo-mode data. Used only when VITE_SUPABASE_URL / ANON_KEY are not set.
// Vessel particulars here are placeholders — replace via Supabase once live.

export const DEMO_USERS = {
  "nsw@franmarine.com.au": {
    password: "demo",
    profile: { id: "demo-nsw", full_name: "NSW Demo User", region: "NSW", role: "manager" },
  },
  "wa@franmarine.com.au": {
    password: "demo",
    profile: { id: "demo-wa", full_name: "WA Demo User", region: "WA", role: "manager" },
  },
};

// Vessels come from src/data/vessels.js (real NSW register). WA shows the empty state until vessels are added.
