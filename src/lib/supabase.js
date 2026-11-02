import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when no Supabase credentials are configured — app runs on local demo data. */
export const DEMO_MODE = !url || !anonKey;

export const supabase = DEMO_MODE ? null : createClient(url, anonKey);
