import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Absolute URL for a route in this deployment (works with BrowserRouter and HashRouter). */
export function appUrl(route) {
  const { origin, pathname, hash } = window.location;
  const base = origin + pathname.replace(/index\.html$/, "");
  return hash || import.meta.env.VITE_HASH_ROUTER === "1" ? `${base}#${route}` : `${origin}${route}`;
}

export default function VesselQr({ vessel }) {
  const [png, setPng] = useState("");
  const url = appUrl(`/v/${vessel.slug}`);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 600, margin: 2, color: { dark: "#244061", light: "#ffffff" } }).then(setPng);
  }, [url]);

  function print() {
    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html><head><title>${vessel.name} — sign-on QR</title>
<style>body{font-family:Calibri,Arial,sans-serif;text-align:center;padding:40px;color:#244061}
img{width:70mm;height:70mm} h1{margin:0 0 4px;font-size:22px} p{margin:4px 0;color:#404040;font-size:14px}
.box{border:2px solid #244061;border-radius:12px;padding:24px;display:inline-block}</style></head><body>
<div class="box"><h1>${vessel.name}</h1><p>UVI ${vessel.uvi} · ${vessel.doc_prefix}</p>
<img src="${png}"/><p><strong>Scan before boarding</strong></p>
<p>Vessel induction and daily sign-on<br/>Franmarine Underwater Services</p>
<p style="font-size:11px">${url}</p></div>
<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <section className="panel">
      <div className="panel-head">Vessel QR code — display at the helm / boarding point</div>
      <div className="panel-body qr-body">
        {png && <img src={png} alt={`QR for ${vessel.name}`} className="qr-img" />}
        <div>
          <p className="topic-body small">
            Scanning opens this vessel directly. Franmarine crew are taken to their induction or sign-on; visitors
            without an account get the special-personnel induction and sign-on form.
          </p>
          <p className="hint" style={{ wordBreak: "break-all" }}>{url}</p>
          <div className="chip-row">
            <a className="btn btn-ghost" href={png} download={`${vessel.slug}-signon-qr.png`}>Download PNG</a>
            <button type="button" className="btn btn-ghost" onClick={print}>Print</button>
          </div>
        </div>
      </div>
    </section>
  );
}
