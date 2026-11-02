import { supabase, DEMO_MODE } from "./supabase";
import { VESSELS, vesselBySlug } from "../data/vessels";

/**
 * Vessels for the signed-in user's region. RLS enforces this server-side too.
 * In Supabase mode the DB row is the register of record; induction content and
 * particulars come from src/data/vessels.js keyed by slug.
 */
export async function listVessels(region) {
  if (DEMO_MODE) {
    return VESSELS.filter((v) => v.region === region);
  }
  const { data, error } = await supabase
    .from("vessels")
    .select("id, slug, name, region, uvi, vessel_class, home_port, sms_status, sms_revision, sms_review_due")
    .eq("region", region)
    .order("name");
  if (error) throw error;
  return data.map(mergeContent);
}

export async function getVessel(idOrSlug) {
  if (DEMO_MODE) {
    return vesselBySlug(idOrSlug);
  }
  const { data, error } = await supabase
    .from("vessels")
    .select("*")
    .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
    .maybeSingle();
  if (error) throw error;
  return data ? mergeContent(data) : null;
}

function mergeContent(row) {
  const content = vesselBySlug(row.slug) || {};
  return { ...content, ...row, particulars: content.particulars, induction: content.induction, doc_prefix: content.doc_prefix };
}

/**
 * Open an SMS document. Live: short-lived signed URL from the private `sms-docs` bucket (RLS = region).
 * Demo: static file under public/sms-demo (a small sample) or the manifest path if present.
 */
export async function openSmsDocument(manifestPath) {
  const objectPath = manifestPath.replace(/^sms\//, "");
  if (DEMO_MODE) {
    window.open(import.meta.env.BASE_URL + manifestPath, "_blank", "noopener");
    return;
  }
  const { data, error } = await supabase.storage.from("sms-docs").createSignedUrl(objectPath, 300);
  if (error) throw new Error(error.message === "Object not found" ? "Document not available in this region." : error.message);
  window.open(data.signedUrl, "_blank", "noopener");
}
