import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const html = require("../pages/driverOpsSummary.js")((h,b,s)=>h+b+s,(t,c)=>c||"",j=>j);
const sa = fs.readFileSync("C:/Users/64275/Projects/INVT-superadmin/taxitime.co.nz/superadmin360taxi/SA-DriverOpsSummary.aspx","utf8");
const checks = {
  owner_accountNotOwed: /bucket==='cash'\|\|bucket==='eftpos'\|\|bucket==='account'/.test(html),
  owner_noAccountInOwedSum: !/pay\.account\.owed\+/.test(html) && !/pay\.hoist\.owed\+pay\.account/.test(html),
  owner_accountGross: /account\.gross/.test(html),
  owner_banner: /Account\/ACC/.test(html),
  owner_hoistStill: /pay\.hoist\.owed/.test(html),
  sa_accountNotOwed: /bucket==='cash'\|\|bucket==='eftpos'\|\|bucket==='account'/.test(sa),
  sa_accountGross: /account\.gross/.test(sa),
  sa_banner: /Account\/ACC/.test(sa),
  sa_owedNoAccount: /cardOwedBeforeLock[\s\S]*tmOwedBeforeLock/.test(sa) && !/pay\.account\.owed\+/.test(sa),
};
console.log(JSON.stringify(checks,null,2));
if(Object.values(checks).some(v=>!v)) process.exit(1);
console.log("TRACK_A_OK");
