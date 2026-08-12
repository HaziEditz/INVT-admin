/**
 * Assemble pages/driverOpsSummary.js from SA helpers + owner wiring + chrome.
 */
import fs from 'fs';

const sa = fs.readFileSync(
  'C:/Users/64275/Projects/INVT-superadmin/taxitime.co.nz/superadmin360taxi/SA-DriverOpsSummary.aspx',
  'utf8',
);
const scriptMatch = sa.match(/<script>\r?\n([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error('no SA script');
const saJs = scriptMatch[1];
const start = saJs.indexOf('var DOS_MAX_SESSION_MIN');
const pageWire = saJs.indexOf('window._fbOnLogin');
if (start < 0 || pageWire < 0) throw new Error('markers missing');
const helpers = saJs.slice(start, pageWire).trim();
let wiring = fs.readFileSync('C:/Users/64275/Projects/INVT-admin/tmp-dos-owner-wiring.js', 'utf8');
// Wiring file was written for embedding in template literals (\\'). For JSON-embedded
// final browser script we need actual \' sequences in the browser source.
wiring = wiring.replace(/dosMarkPaid\(\\\\''/g, "dosMarkPaid(\\''").replace(/\\\\'\)"/g, "\\')\"");
wiring = wiring.replace(/dosOpenDetail\(\\\\''/g, "dosOpenDetail(\\''");
wiring = wiring.replace(/confirm\('Mark '\+r\.driverName\+' as PAID for '\+\(_dosPeriod&&_dosPeriod\.label\)\+'\\\\n\\\\nAmount:/g,
  "confirm('Mark '+r.driverName+' as PAID for '+(_dosPeriod&&_dosPeriod.label)+'\\n\\nAmount:");
wiring = wiring.replace(/\\\\nThis locks/g, '\\nThis locks');
wiring = wiring.replace(/lines\.join\('\\\\n'\)/g, "lines.join('\\n')");
wiring = wiring.replace(/\/\[",\\\\n\]\//g, '/[",\\n]/');

const body = fs.readFileSync('C:/Users/64275/Projects/INVT-admin/tmp-dos-owner-body.html', 'utf8');

const cssBlock = `<style>
.rpt-panel{background:#fff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.08);overflow:hidden;border:1px solid #e8e8e8}
.rpt-toolbar{display:flex;align-items:center;gap:12px;padding:14px 20px;border-bottom:1px solid #f0f0f0;background:linear-gradient(135deg,#00695C 0%,#00897B 100%)}
.rpt-toolbar-title{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.rpt-toolbar-title .material-icons{color:rgba(255,255,255,.85);font-size:20px}
.rpt-toolbar-title h3{margin:0;font-size:15px;font-weight:600;color:#fff}
.rpt-toolbar-meta{font-size:11px;color:rgba(255,255,255,.65)}.rpt-toolbar-meta b{color:#fff}
.rpt-toolbar-actions{display:flex;gap:6px;align-items:center;flex-shrink:0}
.rpt-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;border-radius:5px;border:none;font-size:12px;font-weight:600;cursor:pointer;height:32px}
.rpt-btn-white{background:rgba(255,255,255,.18);color:#fff;border:1px solid rgba(255,255,255,.3)}
.rpt-btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1px solid rgba(255,255,255,.2)}
.rpt-btn .material-icons{font-size:14px}
.rpt-filter-panel{background:#fafafa;border-bottom:1px solid #efefef;padding:12px 20px}
.rpt-filter-grid{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}
.rpt-fi{display:flex;flex-direction:column;gap:3px}
.rpt-fi label{font-size:10px;font-weight:700;color:#9e9e9e;text-transform:uppercase;letter-spacing:.5px}
.rpt-fi input,.rpt-fi select{padding:5px 10px;border:1px solid #e0e0e0;border-radius:5px;font-size:12px;height:32px;background:#fff}
.rpt-state-box{text-align:center;padding:52px 20px;color:#bdbdbd}
.rpt-spinner{display:inline-block;width:32px;height:32px;border:3px solid #e0e0e0;border-top-color:#00695C;border-radius:50%;animation:dos-spin .8s linear infinite;margin-bottom:12px}
@keyframes dos-spin{to{transform:rotate(360deg)}}
.dos-wrap{max-width:1680px;margin:0 auto}
.dos-hint{background:#E0F2F1;border:1px solid #B2DFDB;border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#00695C;line-height:1.55}
.dos-hint b{color:#004D40}
.dos-stats{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;padding:14px 18px;border-bottom:1px solid #f0f0f0}
.dos-stat{background:#fafafa;border:1px solid #eee;border-radius:8px;padding:10px 12px}
.dos-stat .v{font-size:20px;font-weight:800;color:#00695C;line-height:1.1}
.dos-stat .v.owed{color:#E65100}
.dos-stat .v.paid{color:#2E7D32}
.dos-stat .l{font-size:10px;color:#9e9e9e;text-transform:uppercase;letter-spacing:.4px;margin-top:3px;font-weight:700}
.dos-tbl-wrap{overflow-x:auto;max-height:640px;overflow-y:auto}
.dos-tbl{width:100%;border-collapse:collapse;font-size:12px;min-width:1400px}
.dos-tbl thead th{position:sticky;top:0;z-index:2;background:#F8FAFF;color:#546e7a;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:9px 8px;border-bottom:2px solid #e3ecf7;white-space:nowrap;cursor:pointer}
.dos-tbl td{padding:8px;border-bottom:1px solid #f5f5f5;vertical-align:middle;color:#333}
.dos-tbl tbody tr:hover{background:#F3F7FF}
.dos-money{font-weight:700;font-variant-numeric:tabular-nums}
.dos-owed{color:#E65100}.dos-cash{color:#546e7a}.dos-zero{color:#bdbdbd}
.dos-sub{font-size:10px;color:#90a4ae;margin-top:2px;font-weight:500}
.dos-pill{display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px}
.dos-pill.open{background:#FFF3E0;color:#E65100}
.dos-pill.paid{background:#E8F5E9;color:#2E7D32}
.dos-pill.partial{background:#E3F2FD;color:#1565C0}
.dos-btn{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:5px;border:1px solid #e0e0e0;background:#fff;font-size:11px;font-weight:600;cursor:pointer;color:#37474f}
.dos-btn:hover{border-color:#00695C;color:#00695C}
.dos-btn.primary{background:#00695C;color:#fff;border-color:#00695C}
.dos-btn.primary:hover{background:#004D40}
.dos-btn:disabled{opacity:.45;cursor:not-allowed}
.dos-ov{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:10000;align-items:flex-start;justify-content:center;overflow-y:auto;padding:28px 16px}
.dos-ov.show{display:flex}
.dos-modal{background:#fff;border-radius:14px;width:780px;max-width:100%;box-shadow:0 20px 60px rgba(0,0,0,.22);margin:auto;overflow:hidden}
.dos-modal-h{padding:14px 18px;background:linear-gradient(135deg,#00695C,#00897B);color:#fff;display:flex;justify-content:space-between;align-items:center}
.dos-modal-h h3{margin:0;font-size:15px}
.dos-modal-b{padding:16px 18px}
.dos-kv{display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;margin-bottom:14px}
.dos-kv .k{font-size:10px;font-weight:700;color:#9e9e9e;text-transform:uppercase}
.dos-kv .val{font-size:13px;font-weight:600;color:#212121}
.dos-note{font-size:11px;color:#78909c;margin-top:10px;line-height:1.5}
.dos-disp{margin-top:18px}
.dos-bank{font-size:11px;color:#546e7a;font-family:monospace}
</style>`;

const browserJs = '<script>\n' + helpers + '\n' + wiring + '\n</script>\n';

const out = `/**
 * Driver Ops & Payment Summary — owner panel page.
 * Mark Paid locks cardDriverSettlements / tmDriverSettlements independently (Track C).
 * Legacy driverSettlements is read-only fallback (both streams locked).
 * Hours use the same Shift Reports algorithm (workedMinutes + canon + collapse).
 */
module.exports = function driverOpsSummaryPage(pageWrap, commonHead, commonScripts) {
  const css = ${JSON.stringify(cssBlock)};
  const body = ${JSON.stringify(body)};
  // Must wrap in <script> — commonScripts appends extraJs after a closed </script>.
  const js = ${JSON.stringify(browserJs)};
  return pageWrap(commonHead('Driver Ops & Payment Summary', css), body, commonScripts(js));
};
`;

fs.writeFileSync('C:/Users/64275/Projects/INVT-admin/pages/driverOpsSummary.js', out);
console.log('wrote', out.length, 'browserJs', browserJs.length);
