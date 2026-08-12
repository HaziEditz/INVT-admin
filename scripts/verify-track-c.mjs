import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const html = require('../pages/driverOpsSummary.js')((h, b, s) => h + b + s, (t, c) => c || '', (j) => j);
const sa = fs.readFileSync(
  'C:/Users/64275/Projects/INVT-superadmin/taxitime.co.nz/superadmin360taxi/SA-DriverOpsSummary.aspx',
  'utf8',
);
const checks = {
  owner_cardPath: html.includes('cardDriverSettlements'),
  owner_tmPath: html.includes('tmDriverSettlements'),
  owner_markCard: html.includes('dosMarkCardPaid'),
  owner_markTm: html.includes('dosMarkTmPaid'),
  owner_independent: /independent/i.test(html),
  owner_noCombinedWrite: !/adminWrite\('driverSettlements\//.test(html),
  sa_cardPath: sa.includes('cardDriverSettlements'),
  sa_tmPath: sa.includes('tmDriverSettlements'),
  sa_markCard: sa.includes('dosMarkCardPaid'),
  sa_markTm: sa.includes('dosMarkTmPaid'),
  sa_independent: /independent/i.test(sa),
  sa_noCombinedWrite: !/_fbPost\('driverSettlements\//.test(sa),
  owner_layoutGrp: /dos-grp|g-owed/.test(html),
  owner_buildStamp: /Track C/.test(html),
  sa_layoutGrp: sa.includes('g-owed') && sa.includes('dos-build'),
  sa_buildStamp: sa.includes('track-c-v2-layout'),
};
console.log(JSON.stringify(checks, null, 2));
if (Object.values(checks).some((v) => !v)) process.exit(1);
console.log('TRACK_C_OK');
