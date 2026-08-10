import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function pageWrap(head, body, scripts) {
  return `<!DOCTYPE html><html><head>${head}</head><body>${body}${scripts}</body></html>`;
}
function commonHead(title, css) {
  return `<title>${title}</title>${css || ''}`;
}
function commonScripts(extraJs) {
  return `<script>/*common*/</script>\n${extraJs || ''}`;
}

const build = require('../pages/driverOpsSummary.js');
const html = build(pageWrap, commonHead, commonScripts);

const scripts = [];
const re = /<script(\b[^>]*)>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html))) scripts.push(m[2]);

const dos = scripts.find((s) => s.includes('function dosLoad') && s.includes('function dosMoney'));
if (!dos) {
  console.error('FAIL: dos script block not found inside <script>');
  process.exit(1);
}

// Bare function outside script?
const stripped = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
if (/function\s+dosMoney/.test(stripped) || /function\s+dosLoad/.test(stripped)) {
  console.error('FAIL: dos functions appear outside <script> (would render as text)');
  process.exit(1);
}

try {
  // eslint-disable-next-line no-new-func
  new Function(dos);
  console.log('SYNTAX_OK len', dos.length);
} catch (e) {
  console.error('SYNTAX_ERROR', e.message);
  process.exit(1);
}

console.log('PASS scriptCount', scripts.length, 'htmlLen', html.length);
fs.writeFileSync(process.env.TEMP + '/dos_fixed_check.html', html);
