# Total Mobility (TM) Module — Full Handoff for Super Admin Panel

Paste this entire document to your Replit AI agent. It contains everything needed to rebuild the TM module.

---

## 1. What This Module Is

The **Total Mobility (TM)** system is a New Zealand government-funded taxi subsidy program. Eligible passengers carry a TM card. The taxi company processes TM trips, and the relevant local council reimburses a capped percentage of the fare.

**Company ID in Firebase:** `1216`  
**Firebase DB URL:** `https://bookawaka2026-564e1-default-rtdb.firebaseio.com`  
**Required secrets (already in Replit):** `FIREBASE_DB_SECRET`, `FIREBASE_SERVICE_ACCOUNT`

---

## 2. Firebase Data Schema

All TM data lives under these nodes (separate from existing dispatch data):

```
tmConfig/{councilId}           ← per-council settings
  name: "Invercargill City Council"
  region: "Invercargill"
  approverEmail: "council@icc.govt.nz"
  capAmount: 37.50             ← max council pays per trip
  subsidyPercent: 75           ← council pays 75% of meter fare (up to cap)
  hoistRatePerUse: 10.00       ← wheelchair hoist fee per use
  hoistCoveredByCouncil: true  ← whether council pays hoist fee
  maxHoistsPerTrip: 2
  monthlyLimitPerPassenger: null (or integer)
  dailyLimitPerPassenger: null (or integer)
  active: true
  notes: "..."
  updatedAt: 1234567890

tmCards/{cardNumber}           ← passenger TM cards (key = card number string)
  passengerName: "John Smith"
  councilId: "invercargill_city_council"
  cardRegion: "Invercargill"
  usageLimitMonthly: null (or integer)
  usageLimitDaily: null (or integer)
  active: true
  notes: "..."
  updatedAt: 1234567890

tmTrips/1216/{jobId}           ← all TM trips (key = job ID from dispatch system)
  councilId: "invercargill_city_council"
  cardNumber: "413196"
  passengerName: "John Smith"
  cardRegion: "Invercargill"
  driverName: "Mike Jones"
  vehicleId: "ABC123"
  vehicleHoistEquipped: false
  pickup: "45 Dee St, Invercargill"
  dropoff: "Hospital, Invercargill"
  startTime: "2025-04-15T09:30:00"
  endTime: "2025-04-15T09:45:00"
  duration: "15 min"
  distance: 4.2
  passengers: 1
  meterFare: 18.50
  waitingCharge: 0             ← always 0 for TM (excluded from subsidy)
  hoistUsed: false
  hoistCount: 0
  hoistTotal: 0
  tmSubsidyFare: 13.88         ← min(meterFare × subsidyPercent%, capAmount)
  tmSubsidyHoist: 0            ← hoistTotal if hoistCoveredByCouncil
  totalCouncilPays: 13.88      ← tmSubsidyFare + tmSubsidyHoist
  passengerPays: 4.62          ← meterFare + hoistTotal - totalCouncilPays
  status: "pending"            ← pending | flagged | company_approved | approved | rejected
  flagReasons: []              ← array of flag reason strings
  companyApproved: false
  resolutionNote: ""
  councilComment: ""
  approvedAt: null
  approvedBy: null
  rejectedAt: null
  rejectedBy: null
  updatedAt: 1234567890
  recordedAt: 1234567890

tmCouncilAccess/{councilId}    ← portal login credentials
  email: "council@icc.govt.nz"
  passwordHash: "sha256hex..."   ← SHA-256("tm360nz:" + password)
  active: true
  lastLogin: 1234567890
  createdAt: 1234567890
```

### Fare Calculation Formula
```
tmSubsidyFare   = min(meterFare × (subsidyPercent/100), capAmount)
tmSubsidyHoist  = hoistCoveredByCouncil ? hoistTotal : 0
totalCouncilPays = tmSubsidyFare + tmSubsidyHoist
passengerPays   = meterFare + hoistTotal - totalCouncilPays
```
Waiting charges are always excluded from TM subsidy calculation.

### Flag Reasons
- `waiting_charged` — trip has waiting charges (not allowed for TM)
- `hoist_vehicle_mismatch` — hoist used but vehicle not hoist-equipped
- `hoist_count_exceeded` — hoist count > maxHoistsPerTrip
- `hoist_rate_mismatch` — hoist rate doesn't match council config
- `fare_mismatch` — fare doesn't match expected calculation
- `limit_exceeded_daily` — passenger exceeded daily trip limit
- `limit_exceeded_monthly` — passenger exceeded monthly trip limit
- `card_inactive` — TM card is inactive/suspended
- `unapproved_tariff` — tariff used is not approved for TM

### Approval Workflow
```
Trip recorded → status: "pending"
     ↓ (flag check fails)
status: "flagged"  ← admin reviews in TM Flagged page, edits fare/hoist
     ↓ (admin clicks Save & Company Approve)
status: "company_approved"  ← council sees this in portal, can Approve or Reject
     ↓
status: "approved" OR "rejected"
```

---

## 3. Admin Pages Required (5 pages)

All pages need access to Firebase. They use client-side Firebase SDK.

### Helper functions your server must provide to each page:

Each page's HTML needs these global JS helpers injected (your super admin panel likely already has equivalents):

```javascript
// Read a Firebase node once — returns Promise<data>
window.adminRead = function(nodePath) { /* Firebase read */ }

// Write/patch/delete a Firebase node — returns Promise
window.adminWrite = function(nodePath, method, data) { /* Firebase write */ }
  // method = 'PUT' | 'PATCH' | 'DELETE'

// Listen to a Firebase node in real time
window.adminListen = function(nodePath, callback) { /* Firebase .on('value') */ }

// Company ID
var COMPANY_ID = '1216';

// Called when Firebase auth is ready
window._fbOnLogin = function() { /* page init */ }
```

If your super admin panel already has Firebase SDK initialized and admin write access, adapt accordingly.

---

## 4. Shared CSS (inject into all 5 TM admin pages)

```html
<style>
.tm-wrap{padding:20px}
.tm-card{background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.12);margin-bottom:20px;overflow:hidden}
.tm-bar{background:#37474F;color:#fff;padding:13px 18px;display:flex;align-items:center;justify-content:space-between}
.tm-bar h3{margin:0;font-size:15px;font-weight:600}
.tm-tbl{width:100%;border-collapse:collapse;font-size:13px}
.tm-tbl th{background:#f5f5f5;padding:9px 11px;text-align:left;font-weight:600;border-bottom:2px solid #e0e0e0;white-space:nowrap}
.tm-tbl td{padding:8px 11px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
.tm-tbl tr:hover td{background:#fafafa}
.bx{display:inline-block;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:600;white-space:nowrap}
.bx-g{background:#E8F5E9;color:#2E7D32}.bx-r{background:#FFEBEE;color:#C62828}
.bx-a{background:#FFF8E1;color:#E65100}.bx-b{background:#E3F2FD;color:#1565C0}
.bx-gr{background:#F5F5F5;color:#616161}
.tm-btn{display:inline-flex;align-items:center;gap:4px;padding:6px 13px;border-radius:4px;border:none;cursor:pointer;font-size:13px;font-weight:500}
.tm-btn-p{background:#37474F;color:#fff}.tm-btn-p:hover{background:#263238}
.tm-btn-e{background:#E3F2FD;color:#1565C0}.tm-btn-d{background:#FFEBEE;color:#C62828}
.tm-btn-ok{background:#E8F5E9;color:#2E7D32}.tm-btn-am{background:#FFF8E1;color:#E65100}
.tm-btn-wh{background:rgba(255,255,255,.15);color:#fff}
.tm-ov{display:none;position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:999;align-items:center;justify-content:center}
.tm-ov.open{display:flex}
.tm-modal{background:#fff;border-radius:8px;width:680px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.25)}
.tm-mh{background:#37474F;color:#fff;padding:14px 18px;display:flex;align-items:center;justify-content:space-between;border-radius:8px 8px 0 0}
.tm-mh h3{margin:0;font-size:15px}
.tm-mb{padding:18px}.tm-mf{padding:12px 18px;border-top:1px solid #eee;display:flex;gap:8px;justify-content:flex-end}
.tm-fg{display:grid;grid-template-columns:1fr 1fr;gap:12px 18px}
.tm-ff label{display:block;font-size:12px;color:#757575;margin-bottom:3px;font-weight:500}
.tm-ff input,.tm-ff select,.tm-ff textarea{width:100%;padding:7px 9px;border:1px solid #ddd;border-radius:4px;font-size:13px;box-sizing:border-box}
.tm-ff input:focus,.tm-ff select:focus{outline:none;border-color:#37474F}
.tm-msg{margin-top:8px;font-size:13px}.tm-msg.ok{color:#2E7D32}.tm-msg.err{color:#C62828}
.fc{display:inline-block;background:#FFEBEE;color:#C62828;border:1px solid #FFCDD2;border-radius:10px;padding:1px 7px;font-size:11px;font-weight:600;margin:1px}
.filt{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:11px 18px;background:#fafafa;border-bottom:1px solid #f0f0f0}
.filt select,.filt input[type=text],.filt input[type=date]{padding:6px 9px;border:1px solid #ddd;border-radius:4px;font-size:13px}
.sum-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:14px;padding:18px}
.sum-box{background:#f9f9f9;border-radius:6px;padding:14px 16px;border-left:4px solid #37474F}
.sum-box .sv{font-size:22px;font-weight:700;color:#37474F}
.sum-box .sl{font-size:12px;color:#9e9e9e;margin-top:2px}
</style>
```

---

## 5. Page 1 — TM Council Config

**Route:** `/tm-council-config` (or whatever your super admin uses)  
**Firebase node:** `tmConfig/{councilId}`  
**Purpose:** CRUD for per-council settings. Also sets council staff portal login credentials.

### HTML Body
```html
<div class="tm-wrap">
<div class="tm-card">
  <div class="tm-bar">
    <h3>TM Council Config <small id="cc-count" style="opacity:.75;font-size:12px"></small></h3>
    <div style="display:flex;gap:8px">
      <button class="tm-btn tm-btn-p" onclick="openCC()">+ Add Council</button>
      <button class="tm-btn tm-btn-wh" onclick="refreshCC()">↺</button>
    </div>
  </div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Council Name</th><th>Region</th><th>Cap ($)</th><th>Subsidy %</th>
        <th>Hoist/Use ($)</th><th>Hoist By</th><th>Monthly Limit</th><th>Daily Limit</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody id="cc-tb"><tr><td colspan="10" style="text-align:center;padding:40px;color:#9e9e9e">Loading…</td></tr></tbody>
    </table>
  </div>
</div></div>

<!-- Add/Edit Modal -->
<div class="tm-ov" id="cc-ov">
<div class="tm-modal">
  <div class="tm-mh"><h3 id="cc-mtitle">Add Council</h3>
    <button onclick="closeCC()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1">✕</button></div>
  <div class="tm-mb"><div class="tm-fg">
    <div class="tm-ff" style="grid-column:1/-1"><label>Council Name *</label><input id="cc-name" placeholder="e.g. Invercargill City Council"/></div>
    <div class="tm-ff"><label>Region</label><input id="cc-region" placeholder="e.g. Invercargill"/></div>
    <div class="tm-ff"><label>Approver Email</label><input id="cc-email" type="email" placeholder="council@example.govt.nz"/></div>
    <div class="tm-ff"><label>Subsidy Cap per Trip ($) *</label><input id="cc-cap" type="number" step="0.01" min="0" placeholder="37.50"/></div>
    <div class="tm-ff"><label>Subsidy Percentage (%) *</label><input id="cc-pct" type="number" step="1" min="1" max="100" placeholder="75"/></div>
    <div class="tm-ff"><label>Hoist Fee per Use ($)</label><input id="cc-hrate" type="number" step="0.01" min="0" placeholder="10.00"/></div>
    <div class="tm-ff"><label>Hoist Covered By</label>
      <select id="cc-hcov"><option value="true">Council</option><option value="false">Passenger</option></select></div>
    <div class="tm-ff"><label>Max Hoists per Trip</label><input id="cc-hmx" type="number" min="0" placeholder="2"/></div>
    <div class="tm-ff"><label>Monthly Trip Limit per Passenger</label><input id="cc-ml" type="number" min="0" placeholder="No limit"/></div>
    <div class="tm-ff"><label>Daily Trip Limit per Passenger</label><input id="cc-dl" type="number" min="0" placeholder="No limit"/></div>
    <div class="tm-ff"><label>Status</label>
      <select id="cc-act"><option value="true">Active</option><option value="false">Inactive</option></select></div>
    <div class="tm-ff"><label>Notes</label><input id="cc-notes" placeholder="Optional notes"/></div>
    <div style="grid-column:1/-1;border-top:1px solid #e8e8e8;margin-top:6px;padding-top:14px">
      <p style="font-size:12px;font-weight:600;color:#37474F;margin-bottom:10px">🔑 Council Portal Access</p>
    </div>
    <div class="tm-ff"><label>Portal Email (auto-filled from Approver Email)</label><input id="cc-portal-email" type="email" readonly style="background:#f5f5f5;color:#777"/></div>
    <div class="tm-ff"><label>Set / Reset Portal Password</label><input id="cc-pw" type="password" placeholder="Leave blank to keep existing"/></div>
    <div class="tm-ff"><label>Confirm Password</label><input id="cc-pw2" type="password" placeholder="Re-enter new password"/></div>
    <div class="tm-ff" style="grid-column:1/-1"><p style="font-size:11.5px;color:#888">Set a password to create or update this council's portal login. Council staff can then log in at <strong>/council-portal</strong> to view trips and approve flagged trips.</p></div>
  </div>
  <div id="cc-msg" class="tm-msg"></div></div>
  <div class="tm-mf">
    <button class="tm-btn" style="background:#eee;color:#333" onclick="closeCC()">Cancel</button>
    <button class="tm-btn tm-btn-p" onclick="saveCC()">Save Council</button>
  </div>
</div></div>
```

### JavaScript
```javascript
var ccData = {}, ccEid = null;

// Called when Firebase auth is ready
window._fbOnLogin = function() { loadCC(); };

function loadCC() {
  adminListen('tmConfig', function(d) { ccData = d || {}; renderCC(); });
}
function refreshCC() {
  document.getElementById('cc-tb').innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#9e9e9e">Refreshing…</td></tr>';
  adminRead('tmConfig').then(function(d) { ccData = d || {}; renderCC(); });
}
function renderCC() {
  var e = Object.entries(ccData);
  document.getElementById('cc-count').textContent = e.length + ' council(s)';
  if (!e.length) { document.getElementById('cc-tb').innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#9e9e9e">No councils configured yet.</td></tr>'; return; }
  document.getElementById('cc-tb').innerHTML = e.map(function(kv) {
    var id = kv[0], c = kv[1], sid = JSON.stringify(id);
    return '<tr>' +
      '<td><strong>' + (c.name || '—') + '</strong></td>' +
      '<td>' + (c.region || '—') + '</td>' +
      '<td style="font-weight:600;color:#2E7D32">$' + parseFloat(c.capAmount || 0).toFixed(2) + '</td>' +
      '<td>' + (c.subsidyPercent || 0) + '%</td>' +
      '<td>$' + parseFloat(c.hoistRatePerUse || 0).toFixed(2) + '</td>' +
      '<td>' + (c.hoistCoveredByCouncil === false ? 'Passenger' : 'Council') + '</td>' +
      '<td>' + (c.monthlyLimitPerPassenger || '—') + '</td>' +
      '<td>' + (c.dailyLimitPerPassenger || '—') + '</td>' +
      '<td>' + (c.active !== false ? '<span class="bx bx-g">Active</span>' : '<span class="bx bx-r">Inactive</span>') + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="tm-btn tm-btn-e" onclick="editCC(' + sid + ')" style="margin-right:4px">Edit</button>' +
        '<button class="tm-btn tm-btn-d" onclick="delCC(' + sid + ')">Delete</button>' +
      '</td></tr>';
  }).join('');
}
function ccClearPwFields() {
  document.getElementById('cc-pw').value = ''; document.getElementById('cc-pw2').value = '';
}
function ccSyncPortalEmail() {
  document.getElementById('cc-portal-email').value = document.getElementById('cc-email').value.trim();
}
function openCC() {
  ccEid = null; document.getElementById('cc-mtitle').textContent = 'Add Council';
  ['cc-name','cc-region','cc-email','cc-cap','cc-pct','cc-hrate','cc-hmx','cc-ml','cc-dl','cc-notes'].forEach(function(x) { document.getElementById(x).value = ''; });
  document.getElementById('cc-hcov').value = 'true'; document.getElementById('cc-act').value = 'true';
  document.getElementById('cc-msg').textContent = ''; ccClearPwFields(); ccSyncPortalEmail();
  document.getElementById('cc-email').addEventListener('input', ccSyncPortalEmail);
  document.getElementById('cc-ov').classList.add('open');
}
function closeCC() { document.getElementById('cc-ov').classList.remove('open'); }
function editCC(id) {
  ccEid = id; var c = ccData[id] || {};
  document.getElementById('cc-mtitle').textContent = 'Edit Council';
  document.getElementById('cc-name').value = c.name || '';
  document.getElementById('cc-region').value = c.region || '';
  document.getElementById('cc-email').value = c.approverEmail || '';
  document.getElementById('cc-cap').value = c.capAmount || '';
  document.getElementById('cc-pct').value = c.subsidyPercent || '';
  document.getElementById('cc-hrate').value = c.hoistRatePerUse || '';
  document.getElementById('cc-hcov').value = c.hoistCoveredByCouncil === false ? 'false' : 'true';
  document.getElementById('cc-hmx').value = c.maxHoistsPerTrip || '';
  document.getElementById('cc-ml').value = c.monthlyLimitPerPassenger || '';
  document.getElementById('cc-dl').value = c.dailyLimitPerPassenger || '';
  document.getElementById('cc-act').value = c.active === false ? 'false' : 'true';
  document.getElementById('cc-notes').value = c.notes || '';
  document.getElementById('cc-msg').textContent = '';
  ccClearPwFields(); ccSyncPortalEmail();
  document.getElementById('cc-email').addEventListener('input', ccSyncPortalEmail);
  document.getElementById('cc-ov').classList.add('open');
}
function saveCC() {
  var nm = document.getElementById('cc-name').value.trim(),
      cap = parseFloat(document.getElementById('cc-cap').value),
      pct = parseFloat(document.getElementById('cc-pct').value);
  if (!nm) { ccMsg('Council name required.', false); return; }
  if (isNaN(cap) || cap <= 0) { ccMsg('Enter valid cap amount.', false); return; }
  if (isNaN(pct) || pct < 1 || pct > 100) { ccMsg('Subsidy % must be 1–100.', false); return; }
  var pw = document.getElementById('cc-pw').value.trim();
  var pw2 = document.getElementById('cc-pw2').value.trim();
  if (pw && pw !== pw2) { ccMsg('Passwords do not match.', false); return; }
  if (pw && pw.length < 6) { ccMsg('Password must be at least 6 characters.', false); return; }
  var email = document.getElementById('cc-email').value.trim();
  if (pw && !email) { ccMsg('Set an Approver Email before enabling portal access.', false); return; }
  var key = ccEid || ('cncl_' + nm.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''));
  var data = {
    name: nm, region: document.getElementById('cc-region').value.trim(),
    approverEmail: email, capAmount: cap, subsidyPercent: pct,
    hoistRatePerUse: parseFloat(document.getElementById('cc-hrate').value) || 0,
    hoistCoveredByCouncil: document.getElementById('cc-hcov').value === 'true',
    maxHoistsPerTrip: parseInt(document.getElementById('cc-hmx').value) || null,
    monthlyLimitPerPassenger: parseInt(document.getElementById('cc-ml').value) || null,
    dailyLimitPerPassenger: parseInt(document.getElementById('cc-dl').value) || null,
    active: document.getElementById('cc-act').value === 'true',
    notes: document.getElementById('cc-notes').value.trim(), updatedAt: Date.now()
  };
  adminWrite('tmConfig/' + key, 'PUT', data).then(function() {
    ccData[key] = data;
    if (pw) {
      return fetch('/api/set-council-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ councilId: key, email: email, password: pw })
      }).then(function(r) { return r.json(); }).then(function(res) {
        if (res.error) { ccMsg('Council saved but portal password failed: ' + res.error, false); }
        else { ccMsg('Council saved + portal access set!', true); setTimeout(function() { renderCC(); closeCC(); }, 1800); }
      }).catch(function(e) { ccMsg('Council saved but portal password error: ' + e.message, false); });
    }
    renderCC(); closeCC();
  }).catch(function(e) { ccMsg('Save failed: ' + e.message, false); });
}
function delCC(id) {
  if (!confirm('Delete council "' + ((ccData[id] || {}).name || id) + '"?')) return;
  adminWrite('tmConfig/' + id, 'DELETE', null).then(function() { delete ccData[id]; renderCC(); })
    .catch(function(e) { alert('Delete failed: ' + e.message); });
}
function ccMsg(m, ok) { var el = document.getElementById('cc-msg'); el.textContent = m; el.className = 'tm-msg ' + (ok ? 'ok' : 'err'); }
```

---

## 6. Page 2 — TM Passenger Cards

**Route:** `/tm-cards`  
**Firebase nodes:** `tmCards/{cardNumber}`, `tmConfig` (for council dropdown)  
**Purpose:** CRUD for TM passenger cards.

### HTML Body
```html
<div class="tm-wrap">
<div class="tm-card">
  <div class="tm-bar">
    <h3>TM Passenger Cards <small id="card-count" style="opacity:.75;font-size:12px"></small></h3>
    <div style="display:flex;gap:8px">
      <button class="tm-btn tm-btn-p" onclick="openCard()">+ Add Card</button>
      <button class="tm-btn tm-btn-wh" onclick="refreshCards()">↺</button>
    </div>
  </div>
  <div class="filt">
    <select id="card-f-council" onchange="renderCards()"><option value="">All Councils</option></select>
    <select id="card-f-status" onchange="renderCards()"><option value="">All</option><option value="true">Active</option><option value="false">Inactive</option></select>
    <input type="text" id="card-f-search" placeholder="Search card # or name…" oninput="renderCards()" style="min-width:200px"/>
  </div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Card Number</th><th>Passenger Name</th><th>Council</th><th>Region</th>
        <th>Monthly Limit</th><th>Daily Limit</th><th>Notes</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody id="card-tb"><tr><td colspan="9" style="text-align:center;padding:40px;color:#9e9e9e">Loading…</td></tr></tbody>
    </table>
  </div>
</div></div>

<div class="tm-ov" id="card-ov">
<div class="tm-modal">
  <div class="tm-mh"><h3 id="card-mtitle">Add TM Card</h3>
    <button onclick="closeCard()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1">✕</button></div>
  <div class="tm-mb"><div class="tm-fg">
    <div class="tm-ff"><label>Card Number *</label><input id="cd-num" placeholder="e.g. 413196"/></div>
    <div class="tm-ff"><label>Passenger Name *</label><input id="cd-name" placeholder="Full name"/></div>
    <div class="tm-ff"><label>Council</label>
      <select id="cd-council"><option value="">— Select Council —</option></select></div>
    <div class="tm-ff"><label>Card Region</label><input id="cd-region" placeholder="Auto-filled from council"/></div>
    <div class="tm-ff"><label>Monthly Trip Limit</label><input id="cd-ml" type="number" min="0" placeholder="Leave blank = use council default"/></div>
    <div class="tm-ff"><label>Daily Trip Limit</label><input id="cd-dl" type="number" min="0" placeholder="Leave blank = use council default"/></div>
    <div class="tm-ff"><label>Status</label>
      <select id="cd-act"><option value="true">Active</option><option value="false">Inactive / Suspended</option></select></div>
    <div class="tm-ff" style="grid-column:1/-1"><label>Notes</label><input id="cd-notes" placeholder="Any notes about this card or passenger"/></div>
  </div>
  <div id="card-msg" class="tm-msg"></div></div>
  <div class="tm-mf">
    <button class="tm-btn" style="background:#eee;color:#333" onclick="closeCard()">Cancel</button>
    <button class="tm-btn tm-btn-p" onclick="saveCard()">Save Card</button>
  </div>
</div></div>
```

### JavaScript
```javascript
var cardData = {}, councilData = {}, cardEid = null;
window._fbOnLogin = function() {
  adminListen('tmCards', function(d) { cardData = d || {}; renderCards(); });
  adminRead('tmConfig').then(function(d) { councilData = d || {}; populateCouncilDropdowns(); });
};
function populateCouncilDropdowns() {
  var opts = '<option value="">— Select Council —</option>';
  Object.entries(councilData).forEach(function(kv) { opts += '<option value="' + kv[0] + '">' + ((kv[1].name) || kv[0]) + '</option>'; });
  document.getElementById('cd-council').innerHTML = opts;
  var fopts = '<option value="">All Councils</option>';
  Object.entries(councilData).forEach(function(kv) { fopts += '<option value="' + kv[0] + '">' + ((kv[1].name) || kv[0]) + '</option>'; });
  document.getElementById('card-f-council').innerHTML = fopts;
}
function refreshCards() {
  document.getElementById('card-tb').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:#9e9e9e">Refreshing…</td></tr>';
  adminRead('tmCards').then(function(d) { cardData = d || {}; renderCards(); });
}
function renderCards() {
  var fCouncil = document.getElementById('card-f-council').value;
  var fStatus = document.getElementById('card-f-status').value;
  var fSearch = (document.getElementById('card-f-search').value || '').toLowerCase();
  var entries = Object.entries(cardData).filter(function(kv) {
    var c = kv[1];
    if (fCouncil && c.councilId !== fCouncil) return false;
    if (fStatus !== '' && String(c.active !== false) !== fStatus) return false;
    if (fSearch && !(kv[0].toLowerCase().includes(fSearch) || (c.passengerName || '').toLowerCase().includes(fSearch))) return false;
    return true;
  });
  document.getElementById('card-count').textContent = Object.keys(cardData).length + ' card(s)';
  if (!entries.length) { document.getElementById('card-tb').innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#9e9e9e">No cards found.</td></tr>'; return; }
  var cnames = {};
  Object.entries(councilData).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  document.getElementById('card-tb').innerHTML = entries.map(function(kv) {
    var id = kv[0], c = kv[1], sid = JSON.stringify(id);
    return '<tr>' +
      '<td style="font-family:monospace;font-weight:600">' + id + '</td>' +
      '<td>' + (c.passengerName || '—') + '</td>' +
      '<td>' + (cnames[c.councilId] || c.councilId || '—') + '</td>' +
      '<td>' + (c.cardRegion || '—') + '</td>' +
      '<td>' + (c.usageLimitMonthly || '—') + '</td>' +
      '<td>' + (c.usageLimitDaily || '—') + '</td>' +
      '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (c.notes || '—') + '</td>' +
      '<td>' + (c.active !== false ? '<span class="bx bx-g">Active</span>' : '<span class="bx bx-r">Inactive</span>') + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="tm-btn tm-btn-e" onclick="editCard(' + sid + ')" style="margin-right:4px">Edit</button>' +
        '<button class="tm-btn tm-btn-d" onclick="delCard(' + sid + ')">Delete</button>' +
      '</td></tr>';
  }).join('');
}
function openCard() {
  cardEid = null; document.getElementById('card-mtitle').textContent = 'Add TM Card';
  ['cd-num','cd-name','cd-region','cd-ml','cd-dl','cd-notes'].forEach(function(x) { document.getElementById(x).value = ''; });
  document.getElementById('cd-council').value = ''; document.getElementById('cd-act').value = 'true';
  document.getElementById('cd-num').removeAttribute('readonly');
  document.getElementById('card-msg').textContent = ''; document.getElementById('card-ov').classList.add('open');
}
function closeCard() { document.getElementById('card-ov').classList.remove('open'); }
function editCard(id) {
  cardEid = id; var c = cardData[id] || {};
  document.getElementById('card-mtitle').textContent = 'Edit TM Card';
  document.getElementById('cd-num').value = id; document.getElementById('cd-num').setAttribute('readonly', 'readonly');
  document.getElementById('cd-name').value = c.passengerName || '';
  document.getElementById('cd-council').value = c.councilId || '';
  document.getElementById('cd-region').value = c.cardRegion || '';
  document.getElementById('cd-ml').value = c.usageLimitMonthly || '';
  document.getElementById('cd-dl').value = c.usageLimitDaily || '';
  document.getElementById('cd-act').value = c.active === false ? 'false' : 'true';
  document.getElementById('cd-notes').value = c.notes || '';
  document.getElementById('card-msg').textContent = ''; document.getElementById('card-ov').classList.add('open');
}
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('cd-council').addEventListener('change', function() {
    var cid = this.value, cn = councilData[cid] || {};
    if (cid && cn.region) document.getElementById('cd-region').value = cn.region;
  });
});
function saveCard() {
  var num = (document.getElementById('cd-num').value || '').trim().replace(/\s+/g, '');
  var nm = document.getElementById('cd-name').value.trim();
  if (!num) { cardMsg('Card number required.', false); return; }
  if (!nm) { cardMsg('Passenger name required.', false); return; }
  var cid = document.getElementById('cd-council').value;
  var cn = councilData[cid] || {};
  var data = {
    passengerName: nm, councilId: cid,
    cardRegion: document.getElementById('cd-region').value.trim() || (cn.region || ''),
    usageLimitMonthly: parseInt(document.getElementById('cd-ml').value) || null,
    usageLimitDaily: parseInt(document.getElementById('cd-dl').value) || null,
    active: document.getElementById('cd-act').value === 'true',
    notes: document.getElementById('cd-notes').value.trim(), updatedAt: Date.now()
  };
  adminWrite('tmCards/' + num, 'PUT', data).then(function() {
    cardData[num] = data; renderCards(); closeCard();
  }).catch(function(e) { cardMsg('Save failed: ' + e.message, false); });
}
function delCard(id) {
  if (!confirm('Delete card ' + id + ' (' + ((cardData[id] || {}).passengerName || '') + ')?')) return;
  adminWrite('tmCards/' + id, 'DELETE', null).then(function() { delete cardData[id]; renderCards(); })
    .catch(function(e) { alert('Delete failed: ' + e.message); });
}
function cardMsg(m, ok) { var el = document.getElementById('card-msg'); el.textContent = m; el.className = 'tm-msg ' + (ok ? 'ok' : 'err'); }
```

---

## 7. Page 3 — TM Trips

**Route:** `/tm-trips`  
**Firebase nodes:** `tmTrips/1216`, `tmConfig`  
**Purpose:** View all TM trips. Filter by council, status, date. Company-approve trips. View detailed fare breakdown.

### HTML Body
```html
<div class="tm-wrap">
<div class="tm-card">
  <div class="tm-bar">
    <h3>TM Trips <small id="tt-count" style="opacity:.75;font-size:12px"></small></h3>
    <button class="tm-btn tm-btn-wh" onclick="refreshTT()">↺</button>
  </div>
  <div class="filt">
    <select id="tt-f-council" onchange="renderTT()"><option value="">All Councils</option></select>
    <select id="tt-f-status" onchange="renderTT()"><option value="">All Statuses</option><option value="pending">Pending</option><option value="flagged">Flagged</option><option value="company_approved">Company Approved</option><option value="approved">Council Approved</option><option value="rejected">Rejected</option></select>
    <input type="date" id="tt-f-from" onchange="renderTT()"/>
    <input type="date" id="tt-f-to" onchange="renderTT()"/>
    <input type="text" id="tt-f-search" placeholder="Job ID / Driver / Card #…" oninput="renderTT()" style="min-width:180px"/>
    <button class="tm-btn" style="background:#fff;border:1px solid #ddd;color:#333;font-size:12px" onclick="clearTTFilters()">Clear</button>
  </div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Job ID</th><th>Driver</th><th>Vehicle</th><th>Card #</th><th>Passenger</th><th>Council</th>
        <th>Date</th><th>Pickup</th><th>Dropoff</th><th>Fare</th><th>TM Sub.</th><th>Hoist</th><th>Pax Pays</th><th>Status</th><th>Actions</th>
      </tr></thead>
      <tbody id="tt-tb"><tr><td colspan="15" style="text-align:center;padding:40px;color:#9e9e9e">Loading…</td></tr></tbody>
    </table>
  </div>
</div></div>

<div class="tm-ov" id="tt-ov">
<div class="tm-modal" style="width:760px">
  <div class="tm-mh"><h3 id="tt-dtitle">Trip Details</h3>
    <button onclick="closeTTDetail()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1">✕</button></div>
  <div class="tm-mb" id="tt-detail-body"></div>
  <div class="tm-mf" id="tt-detail-foot"></div>
</div></div>
```

### JavaScript
```javascript
var ttData = {}, ttCouncils = {};
var COMPANY_ID = '1216';
window._fbOnLogin = function() {
  adminRead('tmConfig').then(function(d) { ttCouncils = d || {}; populateTTCouncils(); });
  loadTT();
};
function populateTTCouncils() {
  var o = '<option value="">All Councils</option>';
  Object.entries(ttCouncils).forEach(function(kv) { o += '<option value="' + kv[0] + '">' + ((kv[1].name) || kv[0]) + '</option>'; });
  document.getElementById('tt-f-council').innerHTML = o;
}
function loadTT() {
  adminListen('tmTrips/' + COMPANY_ID, function(d) { ttData = d || {}; renderTT(); });
}
function refreshTT() {
  document.getElementById('tt-tb').innerHTML = '<tr><td colspan="15" style="text-align:center;padding:30px;color:#9e9e9e">Refreshing…</td></tr>';
  adminRead('tmTrips/' + COMPANY_ID).then(function(d) { ttData = d || {}; renderTT(); });
}
function clearTTFilters() {
  ['tt-f-council','tt-f-status'].forEach(function(x) { document.getElementById(x).value = ''; });
  ['tt-f-from','tt-f-to','tt-f-search'].forEach(function(x) { document.getElementById(x).value = ''; });
  renderTT();
}
function renderTT() {
  var fC = document.getElementById('tt-f-council').value;
  var fS = document.getElementById('tt-f-status').value;
  var fFrom = document.getElementById('tt-f-from').value;
  var fTo = document.getElementById('tt-f-to').value;
  var fQ = (document.getElementById('tt-f-search').value || '').toLowerCase();
  var entries = Object.entries(ttData).filter(function(kv) {
    var t = kv[1];
    if (fC && t.councilId !== fC) return false;
    if (fS && t.status !== fS) return false;
    if (fFrom && t.startTime && t.startTime.slice(0,10) < fFrom) return false;
    if (fTo && t.startTime && t.startTime.slice(0,10) > fTo) return false;
    if (fQ) { var s = (kv[0] + ' ' + (t.driverName || '') + ' ' + (t.cardNumber || '') + ' ' + (t.vehicleId || '')).toLowerCase(); if (!s.includes(fQ)) return false; }
    return true;
  });
  entries.sort(function(a,b) { return (b[1].startTime || '').localeCompare(a[1].startTime || ''); });
  document.getElementById('tt-count').textContent = entries.length + ' of ' + Object.keys(ttData).length + ' trip(s)';
  if (!entries.length) { document.getElementById('tt-tb').innerHTML = '<tr><td colspan="15" style="text-align:center;padding:40px;color:#9e9e9e">No trips found.</td></tr>'; return; }
  var cnames = {}; Object.entries(ttCouncils).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  document.getElementById('tt-tb').innerHTML = entries.map(function(kv) {
    var id = kv[0], t = kv[1], sid = JSON.stringify(id);
    var flags = (t.flagReasons || []);
    var statusBadge = ttStatusBadge(t.status);
    var flagHtml = flags.length ? flags.map(function(f) { return '<span class="fc">' + f + '</span>'; }).join('') : '';
    var dt = t.startTime ? (t.startTime.slice(0,10) + ' ' + t.startTime.slice(11,16)) : '—';
    var hoistAmt = parseFloat(t.hoistTotal || 0);
    return '<tr>' +
      '<td style="font-family:monospace;font-size:12px">' + id + '</td>' +
      '<td>' + (t.driverName || '—') + '</td>' +
      '<td>' + (t.vehicleId || '—') + (t.vehicleHoistEquipped ? '<br><span class="bx bx-b" style="font-size:10px">Hoist Vehicle</span>' : '') + '</td>' +
      '<td style="font-family:monospace">' + (t.cardNumber || '—') + '</td>' +
      '<td>' + (t.passengerName || '—') + '</td>' +
      '<td>' + (cnames[t.councilId] || t.councilId || '—') + '</td>' +
      '<td style="white-space:nowrap">' + dt + '</td>' +
      '<td>' + (t.pickup || '—') + '</td>' +
      '<td>' + (t.dropoff || '—') + '</td>' +
      '<td style="font-weight:600">$' + parseFloat(t.meterFare || 0).toFixed(2) + '</td>' +
      '<td style="color:#2E7D32;font-weight:600">$' + parseFloat(t.tmSubsidyFare || 0).toFixed(2) + '</td>' +
      '<td>' + (hoistAmt > 0 ? '<span style="color:#1565C0;font-weight:600">$' + hoistAmt.toFixed(2) + '</span>' : '—') + '</td>' +
      '<td>$' + parseFloat(t.passengerPays || 0).toFixed(2) + '</td>' +
      '<td>' + statusBadge + '<br>' + flagHtml + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="tm-btn tm-btn-e" onclick="viewTT(' + sid + ')" style="margin-right:4px" title="View Details">👁</button>' +
        (t.status === 'pending' || t.status === 'flagged' ? '<button class="tm-btn tm-btn-ok" onclick="approveTT(' + sid + ')" title="Mark Company Approved">✓</button>' : '') +
      '</td></tr>';
  }).join('');
}
function ttStatusBadge(s) {
  var map = { pending: '<span class="bx bx-gr">Pending</span>', flagged: '<span class="bx bx-r">⚠ Flagged</span>',
    company_approved: '<span class="bx bx-b">Co. Approved</span>', approved: '<span class="bx bx-g">Approved</span>',
    rejected: '<span class="bx bx-r">Rejected</span>' };
  return map[s] || ('<span class="bx bx-gr">' + (s || 'Unknown') + '</span>');
}
function viewTT(id) {
  var t = ttData[id] || {};
  var cnames = {}; Object.entries(ttCouncils).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  var flags = (t.flagReasons || []);
  var flagHtml = flags.length ? '<div style="margin:10px 0;padding:10px;background:#FFEBEE;border-radius:4px;border-left:4px solid #C62828"><strong style="color:#C62828">⚠ Flag Reasons:</strong><br>' + flags.map(function(f) { return '<span class="fc">' + f + '</span>'; }).join('') + '</div>' : '';
  document.getElementById('tt-dtitle').textContent = 'Trip ' + id;
  document.getElementById('tt-detail-body').innerHTML = flagHtml +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;font-size:13px">' +
    row2('Job ID', id) + row2('Status', ttStatusBadge(t.status)) +
    row2('Driver', (t.driverName || '—')) + row2('Vehicle', (t.vehicleId || '—') + (t.vehicleHoistEquipped ? ' (Hoist Vehicle)' : '')) +
    row2('Card #', (t.cardNumber || '—')) + row2('Passenger', (t.passengerName || '—')) +
    row2('Council', (cnames[t.councilId] || t.councilId || '—')) + row2('Card Region', (t.cardRegion || '—')) +
    row2('Pickup', (t.pickup || '—')) + row2('Dropoff', (t.dropoff || '—')) +
    row2('Start', t.startTime || '—') + row2('End', t.endTime || '—') +
    row2('Duration', (t.duration || '—')) + row2('Distance', (t.distance ? t.distance + ' km' : '—')) +
    '</div>' +
    '<div style="margin-top:14px;background:#F1F8E9;border-radius:6px;padding:14px;font-size:13px">' +
    '<strong>Fare Breakdown</strong><table style="width:100%;margin-top:8px">' +
    frow('Meter Fare', '$' + parseFloat(t.meterFare || 0).toFixed(2)) +
    frow('Waiting (excl. from TM)', '$' + parseFloat(t.waitingCharge || 0).toFixed(2), '#9e9e9e') +
    frow('Hoist Fee', '$' + parseFloat(t.hoistTotal || 0).toFixed(2)) +
    frow('TM Subsidy (Fare)', '$' + parseFloat(t.tmSubsidyFare || 0).toFixed(2), '#2E7D32') +
    frow('TM Subsidy (Hoist)', '$' + parseFloat(t.tmSubsidyHoist || 0).toFixed(2), '#2E7D32') +
    '<tr style="border-top:2px solid #ddd"><td style="padding:6px 0"><strong>Total Council Pays</strong></td><td style="text-align:right"><strong style="color:#2E7D32;font-size:15px">$' + parseFloat(t.totalCouncilPays || 0).toFixed(2) + '</strong></td></tr>' +
    '<tr><td style="padding:4px 0">Passenger Pays</td><td style="text-align:right"><strong>$' + parseFloat(t.passengerPays || 0).toFixed(2) + '</strong></td></tr>' +
    '</table></div>';
  document.getElementById('tt-detail-foot').innerHTML =
    '<button class="tm-btn" style="background:#eee;color:#333" onclick="closeTTDetail()">Close</button>' +
    (t.status === 'pending' || t.status === 'flagged' ? '<button class="tm-btn tm-btn-ok" onclick="approveTT(' + JSON.stringify(id) + ');closeTTDetail()">✓ Mark Company Approved</button>' : '');
  document.getElementById('tt-ov').classList.add('open');
}
function row2(l, v) { return '<div class="tm-ff"><label>' + l + '</label><div style="padding:6px 0;font-weight:500">' + v + '</div></div>'; }
function frow(l, v, c) { return '<tr><td style="padding:3px 0;color:' + (c || '#333') + '">' + l + '</td><td style="text-align:right;color:' + (c || '#333') + '">' + v + '</td></tr>'; }
function closeTTDetail() { document.getElementById('tt-ov').classList.remove('open'); }
function approveTT(id) {
  if (!confirm('Mark trip ' + id + ' as Company Approved?')) return;
  adminWrite('tmTrips/' + COMPANY_ID + '/' + id + '/status', 'PUT', 'company_approved')
    .then(function() { if (ttData[id]) ttData[id].status = 'company_approved'; renderTT(); })
    .catch(function(e) { alert('Error: ' + e.message); });
}
```

---

## 8. Page 4 — TM Flagged Trips

**Route:** `/tm-flagged`  
**Firebase nodes:** `tmTrips/1216` (flagged/company_approved/rejected only), `tmConfig`  
**Purpose:** Admin reviews flagged trips, edits fare/hoist, then company-approves to send to council.

### HTML Body
```html
<div class="tm-wrap">
<div class="tm-card">
  <div class="tm-bar" style="background:#B71C1C">
    <h3>Flagged TM Trips <small id="fl-count" style="opacity:.85;font-size:12px"></small></h3>
    <button class="tm-btn tm-btn-wh" onclick="refreshFL()">↺</button>
  </div>
  <div class="filt">
    <select id="fl-f-council" onchange="renderFL()"><option value="">All Councils</option></select>
    <select id="fl-f-reason" onchange="renderFL()">
      <option value="">All Flag Reasons</option>
      <option value="waiting_charged">Waiting Charged</option>
      <option value="hoist_vehicle_mismatch">Hoist Vehicle Mismatch</option>
      <option value="hoist_count_exceeded">Hoist Count Exceeded</option>
      <option value="hoist_rate_mismatch">Hoist Rate Mismatch</option>
      <option value="fare_mismatch">Fare Mismatch</option>
      <option value="limit_exceeded_daily">Daily Limit Exceeded</option>
      <option value="limit_exceeded_monthly">Monthly Limit Exceeded</option>
      <option value="card_inactive">Card Inactive</option>
      <option value="unapproved_tariff">Unapproved Tariff</option>
    </select>
    <select id="fl-f-stage" onchange="renderFL()">
      <option value="">All Stages</option>
      <option value="flagged">Awaiting Company Fix</option>
      <option value="company_approved">Awaiting Council</option>
      <option value="rejected">Rejected by Council</option>
    </select>
  </div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Job ID</th><th>Driver</th><th>Card #</th><th>Council</th><th>Date</th>
        <th>Fare</th><th>TM Sub.</th><th>Flag Reasons</th><th>Stage</th><th>Actions</th>
      </tr></thead>
      <tbody id="fl-tb"><tr><td colspan="10" style="text-align:center;padding:40px;color:#9e9e9e">Loading…</td></tr></tbody>
    </table>
  </div>
</div></div>

<div class="tm-ov" id="fl-ov">
<div class="tm-modal" style="width:700px">
  <div class="tm-mh" style="background:#B71C1C"><h3 id="fl-etitle">Resolve Flagged Trip</h3>
    <button onclick="closeFLEdit()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:20px;line-height:1">✕</button></div>
  <div class="tm-mb">
    <div id="fl-flag-box" style="padding:10px;background:#FFEBEE;border-radius:4px;border-left:4px solid #C62828;margin-bottom:14px"></div>
    <div class="tm-fg">
      <div class="tm-ff"><label>Meter Fare ($)</label><input id="fl-fare" type="number" step="0.01" min="0"/></div>
      <div class="tm-ff"><label>Waiting Charge ($) — must be 0 for TM</label><input id="fl-wait" type="number" step="0.01" min="0"/></div>
      <div class="tm-ff"><label>Hoist Used</label>
        <select id="fl-hoist"><option value="false">No</option><option value="true">Yes</option></select></div>
      <div class="tm-ff"><label>Hoist Count</label><input id="fl-hcnt" type="number" min="0" value="0"/></div>
      <div class="tm-ff" style="grid-column:1/-1"><label>Resolution Notes</label><input id="fl-resnote" placeholder="Explain what was corrected…"/></div>
    </div>
    <div id="fl-msg" class="tm-msg"></div>
  </div>
  <div class="tm-mf">
    <button class="tm-btn" style="background:#eee;color:#333" onclick="closeFLEdit()">Cancel</button>
    <button class="tm-btn tm-btn-am" onclick="saveFL(false)">Save &amp; Keep Flagged</button>
    <button class="tm-btn tm-btn-ok" onclick="saveFL(true)">Save &amp; Company Approve</button>
  </div>
</div></div>
```

### JavaScript
```javascript
var flData = {}, flCouncils = {}, flEid = null;
var COMPANY_ID = '1216';
window._fbOnLogin = function() {
  adminRead('tmConfig').then(function(d) { flCouncils = d || {}; populateFLCouncils(); });
  loadFL();
};
function populateFLCouncils() {
  var o = '<option value="">All Councils</option>';
  Object.entries(flCouncils).forEach(function(kv) { o += '<option value="' + kv[0] + '">' + ((kv[1].name) || kv[0]) + '</option>'; });
  document.getElementById('fl-f-council').innerHTML = o;
}
function loadFL() {
  adminListen('tmTrips/' + COMPANY_ID, function(d) {
    flData = {};
    Object.entries(d || {}).forEach(function(kv) {
      if (kv[1].status === 'flagged' || kv[1].status === 'company_approved' || kv[1].status === 'rejected') flData[kv[0]] = kv[1];
    });
    renderFL();
  });
}
function refreshFL() {
  document.getElementById('fl-tb').innerHTML = '<tr><td colspan="10" style="text-align:center;padding:30px;color:#9e9e9e">Refreshing…</td></tr>';
  adminRead('tmTrips/' + COMPANY_ID).then(function(d) {
    flData = {};
    Object.entries(d || {}).forEach(function(kv) {
      if (kv[1].status === 'flagged' || kv[1].status === 'company_approved' || kv[1].status === 'rejected') flData[kv[0]] = kv[1];
    });
    renderFL();
  });
}
function renderFL() {
  var fC = document.getElementById('fl-f-council').value;
  var fR = document.getElementById('fl-f-reason').value;
  var fSt = document.getElementById('fl-f-stage').value;
  var entries = Object.entries(flData).filter(function(kv) {
    var t = kv[1];
    if (fC && t.councilId !== fC) return false;
    if (fR && !(t.flagReasons || []).includes(fR)) return false;
    if (fSt && t.status !== fSt) return false;
    return true;
  });
  entries.sort(function(a,b) { return (b[1].startTime || '').localeCompare(a[1].startTime || ''); });
  document.getElementById('fl-count').textContent = entries.length + ' flagged trip(s)';
  if (!entries.length) { document.getElementById('fl-tb').innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:#9e9e9e">No flagged trips — all clear!</td></tr>'; return; }
  var cnames = {}; Object.entries(flCouncils).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  document.getElementById('fl-tb').innerHTML = entries.map(function(kv) {
    var id = kv[0], t = kv[1], sid = JSON.stringify(id);
    var flags = (t.flagReasons || []).map(function(f) { return '<span class="fc">' + f + '</span>'; }).join('');
    var stageMap = { flagged: '<span class="bx bx-r">Needs Fix</span>', company_approved: '<span class="bx bx-b">Sent to Council</span>', rejected: '<span class="bx bx-r">Rejected</span>' };
    var dt = t.startTime ? (t.startTime.slice(0,10) + ' ' + t.startTime.slice(11,16)) : '—';
    return '<tr style="background:#FFF8F8">' +
      '<td style="font-family:monospace;font-size:12px;font-weight:600">' + id + '</td>' +
      '<td>' + (t.driverName || '—') + '</td>' +
      '<td style="font-family:monospace">' + (t.cardNumber || '—') + '</td>' +
      '<td>' + (cnames[t.councilId] || t.councilId || '—') + '</td>' +
      '<td>' + dt + '</td>' +
      '<td>$' + parseFloat(t.meterFare || 0).toFixed(2) + '</td>' +
      '<td style="color:#2E7D32;font-weight:600">$' + parseFloat(t.tmSubsidyFare || 0).toFixed(2) + '</td>' +
      '<td>' + flags + '</td>' +
      '<td>' + (stageMap[t.status] || t.status) + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="tm-btn tm-btn-e" onclick="editFL(' + sid + ')" style="margin-right:4px">Fix</button>' +
        (t.status === 'flagged' ? '<button class="tm-btn tm-btn-ok" onclick="approveFL(' + sid + ')" title="Mark Company Approved">✓</button>' : '') +
      '</td></tr>';
  }).join('');
}
function editFL(id) {
  flEid = id; var t = flData[id] || {};
  document.getElementById('fl-etitle').textContent = 'Fix Trip ' + id;
  var flags = (t.flagReasons || []).map(function(f) { return '<span class="fc">' + f + '</span>'; }).join('');
  document.getElementById('fl-flag-box').innerHTML = '<strong style="color:#C62828">Flags:</strong> ' + flags;
  document.getElementById('fl-fare').value = t.meterFare || '';
  document.getElementById('fl-wait').value = t.waitingCharge || 0;
  document.getElementById('fl-hoist').value = t.hoistUsed ? 'true' : 'false';
  document.getElementById('fl-hcnt').value = t.hoistCount || 0;
  document.getElementById('fl-resnote').value = t.resolutionNote || '';
  document.getElementById('fl-msg').textContent = '';
  document.getElementById('fl-ov').classList.add('open');
}
function closeFLEdit() { document.getElementById('fl-ov').classList.remove('open'); }
function saveFL(doApprove) {
  var id = flEid; if (!id) return;
  var fare = parseFloat(document.getElementById('fl-fare').value);
  var wait = parseFloat(document.getElementById('fl-wait').value) || 0;
  if (isNaN(fare) || fare < 0) { flMsg('Enter valid fare.', false); return; }
  if (wait > 0) { flMsg('Waiting charge must be 0 for TM trips.', false); return; }
  var t = flData[id] || {};
  var councilCfg = flCouncils[t.councilId] || {};
  var pct = (councilCfg.subsidyPercent || 75) / 100;
  var cap = councilCfg.capAmount || 37.50;
  var hoistUsed = document.getElementById('fl-hoist').value === 'true';
  var hoistCnt = parseInt(document.getElementById('fl-hcnt').value) || 0;
  var hoistRate = councilCfg.hoistRatePerUse || 0;
  var hoistTotal = hoistUsed ? hoistRate * hoistCnt : 0;
  var tmSubFare = Math.min(fare * pct, cap);
  var tmSubHoist = councilCfg.hoistCoveredByCouncil !== false ? hoistTotal : 0;
  var totalCouncil = tmSubFare + tmSubHoist;
  var paxPays = fare + hoistTotal - totalCouncil;
  var updates = {
    meterFare: fare, waitingCharge: 0, hoistUsed: hoistUsed, hoistCount: hoistCnt, hoistTotal: hoistTotal,
    tmSubsidyFare: parseFloat(tmSubFare.toFixed(2)), tmSubsidyHoist: parseFloat(tmSubHoist.toFixed(2)),
    totalCouncilPays: parseFloat(totalCouncil.toFixed(2)), passengerPays: parseFloat(paxPays.toFixed(2)),
    resolutionNote: document.getElementById('fl-resnote').value.trim(),
    status: doApprove ? 'company_approved' : 'flagged',
    companyApproved: doApprove, updatedAt: Date.now()
  };
  adminWrite('tmTrips/' + COMPANY_ID + '/' + id, 'PATCH', updates)
    .then(function() {
      Object.assign(flData[id], updates);
      if (doApprove) { delete flData[id]; }
      renderFL(); closeFLEdit();
    }).catch(function(e) { flMsg('Save failed: ' + e.message, false); });
}
function approveFL(id) {
  if (!confirm('Mark trip ' + id + ' as Company Approved and send to council queue?')) return;
  adminWrite('tmTrips/' + COMPANY_ID + '/' + id + '/status', 'PUT', 'company_approved')
    .then(function() {
      adminWrite('tmTrips/' + COMPANY_ID + '/' + id + '/companyApproved', 'PUT', true);
      if (flData[id]) flData[id].status = 'company_approved';
      renderFL();
    }).catch(function(e) { alert('Error: ' + e.message); });
}
function flMsg(m, ok) { var el = document.getElementById('fl-msg'); el.textContent = m; el.className = 'tm-msg ' + (ok ? 'ok' : 'err'); }
```

---

## 9. Page 5 — TM Monthly Reports

**Route:** `/tm-reports`  
**Firebase nodes:** `tmTrips/1216`, `tmConfig`  
**Purpose:** Aggregated monthly council claims. Summary totals, detail table, CSV export.

### HTML Body
```html
<div class="tm-wrap">
<div class="tm-card">
  <div class="tm-bar">
    <h3>TM Monthly Reports <small id="rp-count" style="opacity:.75;font-size:12px"></small></h3>
    <div style="display:flex;gap:8px">
      <button class="tm-btn tm-btn-p" onclick="exportRPCSV()">Export CSV</button>
      <button class="tm-btn tm-btn-wh" onclick="refreshRP()">↺</button>
    </div>
  </div>
  <div class="filt">
    <select id="rp-f-council" onchange="renderRP()"><option value="">All Councils</option></select>
    <select id="rp-f-month" onchange="renderRP()"><option value="">All Months</option></select>
    <select id="rp-f-status" onchange="renderRP()"><option value="">All Statuses</option><option value="pending">Pending</option><option value="flagged">Flagged</option><option value="company_approved">Company Approved</option><option value="approved">Council Approved</option></select>
  </div>
  <div id="rp-summary" class="sum-grid"></div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Council</th><th>Month</th><th>Trips</th><th>Flagged</th><th>Total Fare</th>
        <th>TM Subsidy</th><th>Hoist Subsidy</th><th>Total Council Claim</th><th>Pax Total</th><th>Status Breakdown</th>
      </tr></thead>
      <tbody id="rp-tb"><tr><td colspan="10" style="text-align:center;padding:40px;color:#9e9e9e">Loading…</td></tr></tbody>
    </table>
  </div>
</div>
<div class="tm-card" style="margin-top:0">
  <div class="tm-bar" style="background:#455A64">
    <h3>Trip Detail for Selection <small id="rp-detail-count" style="opacity:.75;font-size:12px"></small></h3>
  </div>
  <div style="overflow-x:auto">
    <table class="tm-tbl">
      <thead><tr>
        <th>Job ID</th><th>Driver</th><th>Vehicle</th><th>Card #</th><th>Passenger</th>
        <th>Date</th><th>Pickup</th><th>Dropoff</th><th>Dist</th><th>Fare</th><th>TM Sub.</th><th>Hoist</th><th>Pax Pays</th><th>Hoist Used</th><th>Status</th>
      </tr></thead>
      <tbody id="rp-detail-tb"><tr><td colspan="15" style="text-align:center;padding:20px;color:#9e9e9e">Select filters above to see trip detail.</td></tr></tbody>
    </table>
  </div>
</div>
</div>
```

### JavaScript
```javascript
var rpData = {}, rpCouncils = {};
var COMPANY_ID = '1216';
window._fbOnLogin = function() {
  adminRead('tmConfig').then(function(d) { rpCouncils = d || {}; populateRPCouncils(); });
  loadRP();
};
function populateRPCouncils() {
  var o = '<option value="">All Councils</option>';
  Object.entries(rpCouncils).forEach(function(kv) { o += '<option value="' + kv[0] + '">' + ((kv[1].name) || kv[0]) + '</option>'; });
  document.getElementById('rp-f-council').innerHTML = o;
}
function loadRP() {
  adminListen('tmTrips/' + COMPANY_ID, function(d) { rpData = d || {}; buildMonthFilter(); renderRP(); });
}
function refreshRP() {
  adminRead('tmTrips/' + COMPANY_ID).then(function(d) { rpData = d || {}; buildMonthFilter(); renderRP(); });
}
function buildMonthFilter() {
  var months = {};
  Object.values(rpData).forEach(function(t) { if (t.startTime) months[t.startTime.slice(0,7)] = true; });
  var sorted = Object.keys(months).sort().reverse();
  var cur = document.getElementById('rp-f-month').value;
  var o = '<option value="">All Months</option>';
  sorted.forEach(function(m) { o += '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + m + '</option>'; });
  document.getElementById('rp-f-month').innerHTML = o;
}
function renderRP() {
  var fC = document.getElementById('rp-f-council').value;
  var fM = document.getElementById('rp-f-month').value;
  var fS = document.getElementById('rp-f-status').value;
  var filtered = Object.entries(rpData).filter(function(kv) {
    var t = kv[1];
    if (fC && t.councilId !== fC) return false;
    if (fM && (t.startTime || '').slice(0,7) !== fM) return false;
    if (fS && t.status !== fS) return false;
    return true;
  });
  document.getElementById('rp-count').textContent = filtered.length + ' trips';
  var cnames = {}; Object.entries(rpCouncils).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  var agg = {};
  filtered.forEach(function(kv) {
    var t = kv[1];
    var month = (t.startTime || '').slice(0,7) || 'Unknown';
    var council = t.councilId || 'unknown';
    var aggKey = council + '||' + month;
    if (!agg[aggKey]) agg[aggKey] = { council: council, month: month, trips: 0, flagged: 0, totalFare: 0, tmSubFare: 0, tmSubHoist: 0, totalClaim: 0, paxTotal: 0, statuses: {} };
    var a = agg[aggKey];
    a.trips++;
    if (t.status === 'flagged') a.flagged++;
    a.totalFare += parseFloat(t.meterFare || 0);
    a.tmSubFare += parseFloat(t.tmSubsidyFare || 0);
    a.tmSubHoist += parseFloat(t.tmSubsidyHoist || 0);
    a.totalClaim += parseFloat(t.totalCouncilPays || 0);
    a.paxTotal += parseFloat(t.passengerPays || 0);
    a.statuses[t.status || 'pending'] = (a.statuses[t.status || 'pending'] || 0) + 1;
  });
  var totFare = 0, totClaim = 0, totTrips = 0, totFlagged = 0;
  Object.values(agg).forEach(function(a) { totFare += a.totalFare; totClaim += a.totalClaim; totTrips += a.trips; totFlagged += a.flagged; });
  document.getElementById('rp-summary').innerHTML =
    sumBox('Total Trips', totTrips, '') + sumBox('Flagged', totFlagged, '#B71C1C') +
    sumBox('Total Fare', '$' + totFare.toFixed(2), '') + sumBox('Total Council Claim', '$' + totClaim.toFixed(2), '#2E7D32');
  var rows = Object.values(agg).sort(function(a,b) { return b.month.localeCompare(a.month) || a.council.localeCompare(b.council); });
  document.getElementById('rp-tb').innerHTML = !rows.length
    ? '<tr><td colspan="10" style="text-align:center;padding:30px;color:#9e9e9e">No trips match the selected filters.</td></tr>'
    : rows.map(function(a) {
      var stBreak = Object.entries(a.statuses).map(function(kv) { return kv[0] + ':' + kv[1]; }).join(', ');
      return '<tr>' +
        '<td><strong>' + (cnames[a.council] || a.council) + '</strong></td>' +
        '<td>' + a.month + '</td>' +
        '<td style="font-weight:600">' + a.trips + '</td>' +
        '<td>' + (a.flagged > 0 ? '<span class="bx bx-r">' + a.flagged + '</span>' : '0') + '</td>' +
        '<td>$' + a.totalFare.toFixed(2) + '</td>' +
        '<td style="color:#2E7D32;font-weight:600">$' + a.tmSubFare.toFixed(2) + '</td>' +
        '<td style="color:#1565C0">$' + a.tmSubHoist.toFixed(2) + '</td>' +
        '<td style="font-weight:700;color:#2E7D32;font-size:14px">$' + a.totalClaim.toFixed(2) + '</td>' +
        '<td>$' + a.paxTotal.toFixed(2) + '</td>' +
        '<td style="font-size:11px;color:#9e9e9e">' + stBreak + '</td></tr>';
    }).join('');
  var detailRows = filtered.sort(function(a,b) { return (b[1].startTime || '').localeCompare(a[1].startTime || ''); });
  document.getElementById('rp-detail-count').textContent = detailRows.length + ' trips';
  document.getElementById('rp-detail-tb').innerHTML = !detailRows.length
    ? '<tr><td colspan="15" style="text-align:center;padding:20px;color:#9e9e9e">No trips.</td></tr>'
    : detailRows.map(function(kv) {
      var id = kv[0], t = kv[1];
      var dt = t.startTime ? (t.startTime.slice(0,10) + ' ' + t.startTime.slice(11,16)) : '—';
      var stMap = { pending: '<span class="bx bx-gr">Pending</span>', flagged: '<span class="bx bx-r">Flagged</span>', company_approved: '<span class="bx bx-b">Co.Approved</span>', approved: '<span class="bx bx-g">Approved</span>', rejected: '<span class="bx bx-r">Rejected</span>' };
      return '<tr>' +
        '<td style="font-family:monospace;font-size:12px">' + id + '</td>' +
        '<td>' + (t.driverName || '—') + '</td>' +
        '<td>' + (t.vehicleId || '—') + '</td>' +
        '<td style="font-family:monospace">' + (t.cardNumber || '—') + '</td>' +
        '<td>' + (t.passengerName || '—') + '</td>' +
        '<td>' + dt + '</td>' +
        '<td>' + (t.pickup || '—') + '</td>' +
        '<td>' + (t.dropoff || '—') + '</td>' +
        '<td>' + (t.distance ? t.distance + ' km' : '—') + '</td>' +
        '<td>$' + parseFloat(t.meterFare || 0).toFixed(2) + '</td>' +
        '<td style="color:#2E7D32;font-weight:600">$' + parseFloat(t.tmSubsidyFare || 0).toFixed(2) + '</td>' +
        '<td style="color:#1565C0">$' + parseFloat(t.tmSubsidyHoist || 0).toFixed(2) + '</td>' +
        '<td>$' + parseFloat(t.passengerPays || 0).toFixed(2) + '</td>' +
        '<td>' + (t.hoistUsed ? 'Yes (' + t.hoistCount + ')' : 'No') + '</td>' +
        '<td>' + (stMap[t.status] || t.status || '—') + '</td></tr>';
    }).join('');
}
function sumBox(label, val, color) {
  return '<div class="sum-box"><div class="sv" style="' + (color ? 'color:' + color : '') + '">' + val + '</div><div class="sl">' + label + '</div></div>';
}
function exportRPCSV() {
  var fC = document.getElementById('rp-f-council').value;
  var fM = document.getElementById('rp-f-month').value;
  var fS = document.getElementById('rp-f-status').value;
  var cnames = {}; Object.entries(rpCouncils).forEach(function(kv) { cnames[kv[0]] = (kv[1].name) || kv[0]; });
  var rows = [['Job ID','Driver','Vehicle','Card #','Passenger','Council','Date','Pickup','Dropoff','Distance(km)','Meter Fare','TM Subsidy Fare','TM Subsidy Hoist','Total Council Pays','Passenger Pays','Hoist Used','Hoist Count','Waiting','Status','Flag Reasons']];
  Object.entries(rpData).forEach(function(kv) {
    var t = kv[1];
    if (fC && t.councilId !== fC) return;
    if (fM && (t.startTime || '').slice(0,7) !== fM) return;
    if (fS && t.status !== fS) return;
    rows.push([kv[0], t.driverName || '', t.vehicleId || '', t.cardNumber || '', t.passengerName || '',
      cnames[t.councilId] || t.councilId || '', t.startTime ? t.startTime.slice(0,16) : '',
      t.pickup || '', t.dropoff || '', t.distance || '',
      parseFloat(t.meterFare || 0).toFixed(2), parseFloat(t.tmSubsidyFare || 0).toFixed(2),
      parseFloat(t.tmSubsidyHoist || 0).toFixed(2), parseFloat(t.totalCouncilPays || 0).toFixed(2),
      parseFloat(t.passengerPays || 0).toFixed(2), t.hoistUsed ? 'Yes' : 'No', t.hoistCount || 0,
      parseFloat(t.waitingCharge || 0).toFixed(2), t.status || '', (t.flagReasons || []).join(';')]);
  });
  var csv = rows.map(function(r) { return r.map(function(v) { return '"' + String(v).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'TM_Report_' + (fM || 'All') + '_' + (fC || 'AllCouncils') + '.csv';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}
```

---

## 10. Council Staff Portal (Server-Side)

This is a **completely separate portal** for council staff — NOT part of the admin dashboard. It requires server-side code.

**URL:** `/council-portal`  
**Auth:** URL-token-based sessions (no cookies needed — works through proxies)  
**Access:** Council staff log in with email + password set by admin in TM Council Config page

### Required: Server-side API endpoints

Your Node.js server needs these API endpoints. They use `proxyFirebaseRead` and `proxyFirebaseWrite` (server-side Firebase REST calls using `FIREBASE_DB_SECRET`).

#### `/api/set-council-password` (POST, JSON body)
Called from admin TM Council Config when saving a council portal password.

```javascript
// Body: { councilId, email, password }
// Hashes password with SHA-256 and stores in tmCouncilAccess/{councilId}
const crypto = require('crypto');
function cpHash(pwd) {
  return crypto.createHash('sha256').update('tm360nz:' + pwd).digest('hex');
}

// Handler:
app.post('/api/set-council-password', (req, res) => {
  const { councilId, email, password } = req.body;
  if (!councilId || !email || !password) return res.status(400).json({ error: 'Missing fields' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const data = { email: email.toLowerCase().trim(), passwordHash: cpHash(password), active: true, createdAt: Date.now() };
  // Write to Firebase: tmCouncilAccess/{councilId}
  firebaseWrite('PUT', 'tmCouncilAccess/' + councilId, data, (err) => {
    res.json(err ? { error: err } : { ok: true });
  });
});
```

#### Session management (in-memory)
```javascript
const councilSessions = new Map();
const CP_TTL = 24 * 60 * 60 * 1000; // 24 hours

function cpMakeToken() { return require('crypto').randomBytes(32).toString('hex'); }
function cpSetSession(councilId, name, email) {
  const t = cpMakeToken();
  councilSessions.set(t, { councilId, name, email, exp: Date.now() + CP_TTL });
  return t;
}
function cpGetSession(token) {
  if (!token) return null;
  const s = councilSessions.get(token);
  if (!s) return null;
  if (Date.now() > s.exp) { councilSessions.delete(token); return null; }
  return s;
}
```

#### `/api/council-login` (POST, form-encoded)
```javascript
// Form: email, password
// Validates against tmCouncilAccess in Firebase
// Redirects to /council-portal/dashboard?t=TOKEN on success
app.post('/api/council-login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) return res.redirect('/council-portal?err=missing');
  firebaseRead('tmCouncilAccess', (err, data) => {
    if (err || !data) return res.redirect('/council-portal?err=nodata');
    const hashedPw = cpHash(password);
    let matched = null;
    for (const [cid, acc] of Object.entries(data)) {
      if (acc && acc.email && acc.email.toLowerCase() === email && acc.passwordHash === hashedPw && acc.active !== false) {
        matched = { councilId: cid, ...acc }; break;
      }
    }
    if (!matched) return res.redirect('/council-portal?err=invalid');
    firebaseRead('tmConfig/' + matched.councilId, (e2, cfg) => {
      const name = cfg && cfg.name ? cfg.name : matched.councilId;
      const token = cpSetSession(matched.councilId, name, email);
      firebaseWrite('PUT', 'tmCouncilAccess/' + matched.councilId + '/lastLogin', Date.now(), () => {});
      res.redirect('/council-portal/dashboard?t=' + encodeURIComponent(token));
    });
  });
});
```

#### `/api/council-logout` (GET)
```javascript
app.get('/api/council-logout', (req, res) => {
  const tok = req.query.t || '';
  if (tok) councilSessions.delete(tok);
  res.redirect('/council-portal');
});
```

#### `/api/council-approve` (POST, form-encoded)
```javascript
// Form: _token, tripId, action (approve|reject)
app.post('/api/council-approve', (req, res) => {
  const token = req.body._token || '';
  const tripId = req.body.tripId || '';
  const action = req.body.action || '';
  const sess = cpGetSession(token);
  const te = encodeURIComponent(token);
  if (!sess || !tripId || !['approve', 'reject'].includes(action)) {
    return res.redirect('/council-portal/flagged?t=' + te + '&msg=Invalid+request&mt=err');
  }
  const newStatus = action === 'approve' ? 'approved' : 'rejected';
  const patch = { status: newStatus, [action + 'dAt']: Date.now(), [action + 'dBy']: sess.name || sess.councilId };
  firebaseWrite('PATCH', 'tmTrips/1216/' + tripId, patch, (err) => {
    if (err) return res.redirect('/council-portal/flagged?t=' + te + '&msg=Update+failed&mt=err');
    const msg = action === 'approve' ? 'Trip approved successfully.' : 'Trip rejected.';
    res.redirect('/council-portal/flagged?t=' + te + '&msg=' + encodeURIComponent(msg) + '&mt=ok');
  });
});
```

### Portal Pages (SSR HTML)

The portal has 4 pages rendered server-side. Each reads from Firebase using the server-side Firebase REST API.

**Important:** All nav links and form actions must include `?t=TOKEN` so the session token travels with every request (no cookies used — works through proxies).

**Portal CSS:**
```css
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#F4F7F4;color:#333;font-size:14px;min-height:100vh}
a{color:inherit;text-decoration:none}
.cp-nav{background:#1B5E20;color:#fff;height:52px;padding:0 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.cp-nav-brand{font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px}
.cp-nav-links{display:flex}
.cp-nav-links a{color:rgba(255,255,255,.78);padding:17px 13px;font-size:12.5px;display:flex;align-items:center;gap:4px;border-bottom:3px solid transparent;transition:all .15s}
.cp-nav-links a:hover{background:rgba(255,255,255,.1);color:#fff}
.cp-nav-links a.on{color:#fff;border-bottom-color:#69F0AE;background:rgba(255,255,255,.08)}
.cp-nav-right{font-size:12px;opacity:.75;display:flex;align-items:center;gap:14px}
.cp-main{padding:22px 24px;max-width:1280px;margin:0 auto}
.cp-card{background:#fff;border-radius:6px;box-shadow:0 1px 4px rgba(0,0,0,.1);margin-bottom:18px;overflow:hidden}
.cp-card-hd{padding:13px 18px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between}
.cp-card-hd h3{font-size:14px;font-weight:700;color:#1B5E20;display:flex;align-items:center;gap:6px}
.cp-card-bd{padding:16px 18px}
.cp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:18px}
.cp-stat{background:#fff;border-radius:6px;padding:14px 18px;box-shadow:0 1px 4px rgba(0,0,0,.1);border-left:4px solid #2E7D32}
.cp-stat.warn{border-left-color:#E65100}
.cp-stat.flag{border-left-color:#C62828}
.cp-stat-v{font-size:26px;font-weight:700;color:#1B5E20;line-height:1.1}
.cp-stat.warn .cp-stat-v{color:#E65100}
.cp-stat.flag .cp-stat-v{color:#C62828}
.cp-stat-l{font-size:11.5px;color:#888;margin-top:4px}
.cp-tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.cp-tbl th{background:#F1F8E9;padding:9px 11px;text-align:left;font-size:11.5px;font-weight:700;color:#33691E;border-bottom:2px solid #C5E1A5;white-space:nowrap}
.cp-tbl td{padding:8px 11px;border-bottom:1px solid #f5f5f5;vertical-align:middle}
.cp-tbl tr:last-child td{border-bottom:none}
.cp-tbl tr:hover td{background:#FAFFF7}
.cp-tbl tfoot td{background:#F1F8E9;font-weight:700;font-size:12px;color:#2E7D32;border-top:2px solid #C5E1A5}
.cp-empty{text-align:center;color:#aaa;padding:24px;font-style:italic}
.cp-btn{display:inline-flex;align-items:center;gap:4px;padding:7px 14px;border-radius:4px;border:none;cursor:pointer;font-size:12.5px;font-weight:600}
.cp-btn-g{background:#2E7D32;color:#fff}.cp-btn-r{background:#C62828;color:#fff}
.cp-bdg-b{display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600;background:#E3F2FD;color:#1565C0}
.cp-bdg-r{background:#FFEBEE;color:#C62828;display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600}
.cp-bdg-g{background:#E8F5E9;color:#2E7D32;display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600}
.cp-bdg-a{background:#FFF8E1;color:#E65100;display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600}
.cp-bdg-gr{background:#F5F5F5;color:#757575;display:inline-block;padding:1px 7px;border-radius:10px;font-size:11px;font-weight:600}
.cp-month-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px}
.cp-month-row label{font-size:13px;color:#555;font-weight:500}
.cp-bar-wrap{background:#E0E0E0;border-radius:4px;height:8px;overflow:hidden}
.cp-bar-fill{background:#2E7D32;height:100%;border-radius:4px;transition:width .3s}
.cp-bar-fill.over{background:#C62828}
.cp-notice{padding:12px 16px;border-radius:6px;margin-bottom:16px;font-size:13px}
.cp-notice.ok{background:#E8F5E9;color:#1B5E20;border-left:4px solid #2E7D32}
.cp-notice.err{background:#FFEBEE;color:#B71C1C;border-left:4px solid #C62828}
```

**Portal Login Page (`/council-portal`):**
```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Council Portal</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:linear-gradient(135deg,#1B5E20,#2E7D32);min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif}
.login-box{background:#fff;border-radius:10px;padding:40px;width:400px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,.25)}
.login-box h1{font-size:22px;color:#1B5E20;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.login-box p{color:#888;font-size:13px;margin-bottom:28px}
label{display:block;font-size:12.5px;font-weight:600;color:#555;margin-bottom:5px}
input{width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:6px;font-size:14px;margin-bottom:18px;box-sizing:border-box}
input:focus{outline:none;border-color:#2E7D32;box-shadow:0 0 0 3px rgba(46,125,50,.1)}
button{width:100%;padding:12px;background:#2E7D32;color:#fff;border:none;border-radius:6px;font-size:15px;font-weight:600;cursor:pointer}
button:hover{background:#1B5E20}
.err-msg{background:#FFEBEE;color:#C62828;padding:10px 14px;border-radius:6px;font-size:13px;margin-bottom:16px;border-left:4px solid #C62828}
.hint{text-align:center;font-size:12px;color:#aaa;margin-top:18px}
</style>
</head>
<body>
<div class="login-box">
  <h1>🏛 Council Portal</h1>
  <p>360Taxi — Total Mobility System</p>
  <!-- Show error if ?err=invalid/missing/nodata -->
  <form method="POST" action="/api/council-login">
    <label>Email Address</label>
    <input type="email" name="email" placeholder="you@council.govt.nz" required autocomplete="email"/>
    <label>Password</label>
    <input type="password" name="password" required autocomplete="current-password"/>
    <button type="submit">Sign In</button>
  </form>
  <p class="hint">Forgot your password?<br>Contact your 360Taxi administrator to reset access.</p>
</div>
</body>
</html>
```

**Portal nav wrapper (use on every portal page):**
```javascript
// All portal page nav links need ?t=TOKEN
function renderNav(session, token, activePage) {
  const te = encodeURIComponent(token);
  const pages = [
    ['dashboard', '📊 Dashboard'],
    ['trips', '🚕 Trips'],
    ['flagged', '🚩 Flagged'],
    ['reports', '📋 Reports']
  ];
  const links = pages.map(([pg, lbl]) =>
    `<a href="/council-portal/${pg}?t=${te}" class="${activePage === pg ? 'on' : ''}">${lbl}</a>`
  ).join('');
  return `
<nav class="cp-nav">
  <div class="cp-nav-brand">🏛 <span>${session.name || 'Council Portal'}</span></div>
  <div class="cp-nav-links">${links}</div>
  <div class="cp-nav-right">
    <span>${session.email || ''}</span>
    <a href="/api/council-logout?t=${te}">Sign Out</a>
  </div>
</nav>`;
}
```

**Portal Dashboard page** reads from `tmTrips/1216` and `tmConfig/{councilId}` — filters trips to current month for this council, shows stats (trip count, council pays, flagged count, avg pay), config summary card, and recent trips table.

**Portal Trips page** reads from `tmTrips/1216` — filter by month (GET form with hidden `t` field), shows full trip table with totals.

**Portal Flagged page** reads from `tmTrips/1216` — shows `company_approved` trips with Approve/Reject buttons (POST forms to `/api/council-approve` with `_token`, `tripId`, `action` fields).

**Portal Reports page** reads from `tmTrips/1216` and `tmConfig/{councilId}` — month selector (GET form with hidden `t` field), summary totals, per-passenger breakdown, cap utilisation bar.

---

## 11. Pre-seeded test data

**Invercargill City Council** is already configured in Firebase:
- `tmConfig/invercargill_city_council`: name="Invercargill City Council", cap=$37.50, subsidy=75%, active
- `tmCouncilAccess/invercargill_city_council`: email=`council@icc.govt.nz`, password=`TM360test!`, active

---

## 12. Key notes for integration

1. **Company ID is `1216`** — hardcoded in all TM Firebase paths (e.g. `tmTrips/1216/`)
2. **The portal uses URL tokens, not cookies** — pass `?t=TOKEN` in every link and form action
3. **`adminWrite` must support `PATCH`** — used in flagged trip resolution to update individual fields
4. **No client-side Firebase SDK in the council portal** — all data is fetched server-side
5. **Password hashing:** SHA-256 of `"tm360nz:" + password` (Node.js: `crypto.createHash('sha256').update('tm360nz:'+pwd).digest('hex')`)
6. **The `saveFL()` function recalculates fare** using council config — don't skip this, it's the core TM business logic
7. **The sidebar/nav in the admin panel needs links to all 5 TM pages** under a "Total Mobility" section
