# Special Tariffs Module — Full Handoff for Super Admin Panel

Paste this entire document to your Replit AI agent. It contains everything needed to rebuild the Special Tariffs page.

---

## 1. What This Module Is

The **Special Tariffs** module lets the company set alternative fare structures that override the standard meter:

- **Passenger App — Flat Rate by Distance:** When enabled, the passenger booking app shows fixed prices per km band (e.g. "up to 1 km = $5.00, up to 2 km = $8.00…"). If no rate matches the trip distance, the normal tariff applies.
- **Food Delivery — Base Price:** A fixed base fare charged for food delivery jobs, set manually.
- **Freight / Courier — Base Price:** A fixed base fare charged for freight/courier jobs, set manually.

**Company ID in Firebase:** `1216`  
**Firebase DB URL:** `https://bookawaka2026-564e1-default-rtdb.firebaseio.com`  
**Required secrets:** `FIREBASE_DB_SECRET`, `FIREBASE_SERVICE_ACCOUNT`

---

## 2. Firebase Data Schema

All Special Tariff data lives under:

```
specialTariffs/1216/
  passenger/
    enabled: true                    ← whether flat rates are active in passenger app
    rates: {                         ← km band → price map
      "1": 5.00,
      "2": 8.00,
      "5": 15.00,
      "10": 24.00
    }
    updatedAt: 1234567890

  foodDelivery/
    basePrice: 12.00
    updatedAt: 1234567890

  freight/
    basePrice: 20.00
    updatedAt: 1234567890
```

**Key rule:** The `rates` object uses string keys (the km distance) and numeric values (the price). When rendering, sort keys numerically so they display in ascending km order.

---

## 3. How It Connects to the Passenger App & Dispatch System

- When `passenger.enabled = true`, the passenger booking app reads `specialTariffs/1216/passenger/rates` to show price estimates.
- The food delivery and freight base prices are read by the dispatch system when creating jobs of those types.
- The standard meter tariff (stored under `tariffZones/`) is still used for all other job types.

---

## 4. Admin Helpers Required

Your super admin panel needs these Firebase helpers (adapt to your existing setup):

```javascript
// Read a Firebase path once — returns Promise<data>
adminRead(nodePath)

// Write to a Firebase path — returns Promise
adminWrite(nodePath, method, data)  // method: 'PUT' | 'PATCH' | 'DELETE'

// Company ID
var COMPANY_ID = '1216';
```

---

## 5. CSS Styles

Add these to your page styles:

```css
.sp-section {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,.1);
  padding: 20px 22px;
  margin-bottom: 20px;
}
.sp-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.sp-toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}
.sp-toggle input { opacity: 0; width: 0; height: 0; }
.sp-slider {
  position: absolute;
  inset: 0;
  background: #ccc;
  border-radius: 28px;
  transition: .3s;
  cursor: pointer;
}
.sp-slider:before {
  position: absolute;
  content: "";
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background: #fff;
  border-radius: 50%;
  transition: .3s;
}
.sp-toggle input:checked + .sp-slider { background: #43A047; }
.sp-toggle input:checked + .sp-slider:before { transform: translateX(24px); }
.sp-rate-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}
.sp-rate-table th {
  font-size: 11px;
  font-weight: 700;
  color: #757575;
  text-transform: uppercase;
  padding: 8px 10px;
  background: #F5F5F5;
  text-align: left;
}
.sp-rate-table td {
  padding: 7px 10px;
  border-bottom: 1px solid #f0f0f0;
  vertical-align: middle;
}
.sp-rate-table input[type=number] {
  width: 90px;
  padding: 5px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.sp-add-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  margin-top: 12px;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 6px;
}
.sp-add-row .sp-field { flex: 1; }
.sp-add-row .sp-field label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: #616161;
  text-transform: uppercase;
  letter-spacing: .5px;
  margin-bottom: 5px;
}
.sp-add-row .sp-field input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  box-sizing: border-box;
}
.sp-price-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.sp-price-row label {
  font-size: 13px;
  font-weight: 600;
  color: #424242;
  min-width: 140px;
}
.sp-price-input {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sp-price-input input {
  width: 100px;
  padding: 7px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
}
.sp-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 7px 14px;
  border-radius: 4px;
  border: 1px solid #ddd;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  background: #fff;
}
.sp-btn-primary { background: #1976D2; color: #fff; border-color: #1976D2; }
.sp-btn-primary:hover { background: #1565C0; }
.sp-btn-danger { background: #FFEBEE; color: #C62828; border-color: #FFCDD2; }
```

---

## 6. Full Page HTML

```html
<div style="padding: 20px; max-width: 900px;">

  <div style="margin-bottom: 24px;">
    <h2 style="margin: 0 0 4px; font-size: 20px; font-weight: 700; color: #212121;">
      Special Tariffs
    </h2>
    <p style="margin: 0; font-size: 13px; color: #9e9e9e;">
      Set flat-rate fares by distance for the passenger app, and adjust base prices for food delivery and freight.
    </p>
  </div>

  <!-- Section 1: Passenger App Flat Rates -->
  <div class="sp-section">
    <div class="sp-toggle-row">
      <div>
        <div style="font-size: 14px; font-weight: 700; color: #212121;">
          Passenger App — Flat Rate by Distance
        </div>
        <div style="font-size: 12px; color: #9e9e9e; margin-top: 2px;">
          When ON, the passenger app uses these fixed prices. If the exact km is not in the list, normal tariff applies.
        </div>
      </div>
      <label class="sp-toggle" title="Enable/disable passenger special tariff">
        <input type="checkbox" id="sp-pax-enabled" onchange="spUpdateStatus()"/>
        <span class="sp-slider"></span>
      </label>
    </div>
    <div id="sp-pax-status" style="font-size: 12px; font-weight: 700; margin-bottom: 14px; color: #9E9E9E;">
      ● OFF — passenger app uses normal tariff
    </div>

    <table class="sp-rate-table">
      <thead>
        <tr>
          <th>Distance (km)</th>
          <th>Flat Price ($)</th>
          <th style="width: 50px;"></th>
        </tr>
      </thead>
      <tbody id="sp-pax-tbody">
        <tr><td colspan="3" style="text-align: center; color: #9e9e9e; padding: 20px;">Loading…</td></tr>
      </tbody>
    </table>

    <!-- Add new row -->
    <div class="sp-add-row">
      <div class="sp-field">
        <label>Distance (km)</label>
        <input type="number" id="sp-new-km" min="0.1" step="0.1" placeholder="e.g. 1"/>
      </div>
      <div class="sp-field">
        <label>Flat Price ($)</label>
        <input type="number" id="sp-new-price" min="0" step="0.50" placeholder="e.g. 5.00"/>
      </div>
      <button class="sp-btn sp-btn-primary" onclick="spAddRow()" style="white-space: nowrap;">
        + Add
      </button>
    </div>

    <div id="sp-pax-msg" style="display: none; margin-top: 10px; font-size: 12px; padding: 8px 12px; border-radius: 4px;"></div>
    <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
      <button class="sp-btn sp-btn-primary" onclick="spSavePassenger()">
        Save Passenger Rates
      </button>
    </div>
  </div>

  <!-- Section 2: Food Delivery -->
  <div class="sp-section">
    <div style="font-size: 14px; font-weight: 700; color: #212121; margin-bottom: 4px;">
      Food Delivery — Base Price
    </div>
    <div style="font-size: 12px; color: #9e9e9e; margin-bottom: 16px;">
      Manual price used as the base fare for food delivery jobs.
    </div>
    <div class="sp-price-row">
      <label>Base Price ($)</label>
      <div class="sp-price-input">
        <button class="sp-btn" onclick="spAdjust('fd', -0.5)" style="padding: 5px 10px; font-size: 16px; font-weight: 700;">−</button>
        <input type="number" id="sp-fd-price" min="0" step="0.50" value="0.00"/>
        <button class="sp-btn" onclick="spAdjust('fd', 0.5)" style="padding: 5px 10px; font-size: 16px; font-weight: 700;">+</button>
      </div>
    </div>
    <div id="sp-fd-msg" style="display: none; font-size: 12px; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;"></div>
    <div style="display: flex; justify-content: flex-end;">
      <button class="sp-btn sp-btn-primary" onclick="spSaveDelivery()">
        Save Food Delivery Price
      </button>
    </div>
  </div>

  <!-- Section 3: Freight / Courier -->
  <div class="sp-section">
    <div style="font-size: 14px; font-weight: 700; color: #212121; margin-bottom: 4px;">
      Freight / Courier — Base Price
    </div>
    <div style="font-size: 12px; color: #9e9e9e; margin-bottom: 16px;">
      Manual price used as the base fare for freight and courier jobs.
    </div>
    <div class="sp-price-row">
      <label>Base Price ($)</label>
      <div class="sp-price-input">
        <button class="sp-btn" onclick="spAdjust('fr', -0.5)" style="padding: 5px 10px; font-size: 16px; font-weight: 700;">−</button>
        <input type="number" id="sp-fr-price" min="0" step="0.50" value="0.00"/>
        <button class="sp-btn" onclick="spAdjust('fr', 0.5)" style="padding: 5px 10px; font-size: 16px; font-weight: 700;">+</button>
      </div>
    </div>
    <div id="sp-fr-msg" style="display: none; font-size: 12px; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px;"></div>
    <div style="display: flex; justify-content: flex-end;">
      <button class="sp-btn sp-btn-primary" onclick="spSaveFreight()">
        Save Freight Price
      </button>
    </div>
  </div>

</div>
```

---

## 7. Full JavaScript

```javascript
var _spPaxRates = {};  // km (string key) -> price (number)
var COMPANY_ID = '1216';

// Called when Firebase auth/admin session is ready
window._fbOnLogin = function() {
  loadSpecialTariffs();
};

function loadSpecialTariffs() {
  adminRead('specialTariffs/' + COMPANY_ID).then(function(data) {
    data = data || {};

    // Passenger section
    var pax = data.passenger || {};
    document.getElementById('sp-pax-enabled').checked = !!pax.enabled;
    spUpdateStatus();
    _spPaxRates = pax.rates || {};
    renderSpPaxTable();

    // Food Delivery section
    var fd = data.foodDelivery || {};
    document.getElementById('sp-fd-price').value = (fd.basePrice || 0).toFixed(2);

    // Freight section
    var fr = data.freight || {};
    document.getElementById('sp-fr-price').value = (fr.basePrice || 0).toFixed(2);

  }).catch(function() {
    _spPaxRates = {};
    renderSpPaxTable();
  });
}

function spUpdateStatus() {
  var on = document.getElementById('sp-pax-enabled').checked;
  var el = document.getElementById('sp-pax-status');
  if (on) {
    el.style.color = '#43A047';
    el.textContent = '● ON — passenger app will use these flat rates';
  } else {
    el.style.color = '#9E9E9E';
    el.textContent = '● OFF — passenger app uses normal tariff';
  }
}

function renderSpPaxTable() {
  var tbody = document.getElementById('sp-pax-tbody');
  var keys = Object.keys(_spPaxRates).map(Number).sort(function(a, b) { return a - b; });
  if (!keys.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#9e9e9e;padding:20px">No rates added yet — use the form below to add entries.</td></tr>';
    return;
  }
  tbody.innerHTML = keys.map(function(km) {
    var price = _spPaxRates[String(km)];
    return '<tr>' +
      '<td style="font-weight:600">' + km + ' km</td>' +
      '<td style="color:#1B5E20;font-weight:700">$' + parseFloat(price).toFixed(2) + '</td>' +
      '<td>' +
        '<button class="sp-btn sp-btn-danger" onclick="spRemoveRow(' + km + ')" style="padding:3px 8px">' +
          '<span style="font-size:13px">✕</span>' +
        '</button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function spAddRow() {
  var km    = parseFloat(document.getElementById('sp-new-km').value);
  var price = parseFloat(document.getElementById('sp-new-price').value);
  if (isNaN(km) || km <= 0)     { spMsg('pax', 'Enter a valid distance.', false); return; }
  if (isNaN(price) || price < 0) { spMsg('pax', 'Enter a valid price.', false); return; }
  _spPaxRates[String(km)] = price;
  document.getElementById('sp-new-km').value    = '';
  document.getElementById('sp-new-price').value = '';
  renderSpPaxTable();
}

function spRemoveRow(km) {
  delete _spPaxRates[String(km)];
  renderSpPaxTable();
}

function spSavePassenger() {
  var enabled   = document.getElementById('sp-pax-enabled').checked;
  var rateCount = Object.keys(_spPaxRates).length;
  var payload   = { enabled: enabled, rates: _spPaxRates, updatedAt: Date.now() };
  adminWrite('specialTariffs/' + COMPANY_ID + '/passenger', 'PUT', payload).then(function() {
    spMsg('pax', 'Passenger rates saved.', true);
  }).catch(function(e) { spMsg('pax', 'Save failed: ' + e.message, false); });
}

function spSaveDelivery() {
  var price = parseFloat(document.getElementById('sp-fd-price').value) || 0;
  adminWrite('specialTariffs/' + COMPANY_ID + '/foodDelivery', 'PUT', { basePrice: price, updatedAt: Date.now() }).then(function() {
    spMsg('fd', 'Food delivery price saved.', true);
  }).catch(function(e) { spMsg('fd', 'Save failed: ' + e.message, false); });
}

function spSaveFreight() {
  var price = parseFloat(document.getElementById('sp-fr-price').value) || 0;
  adminWrite('specialTariffs/' + COMPANY_ID + '/freight', 'PUT', { basePrice: price, updatedAt: Date.now() }).then(function() {
    spMsg('fr', 'Freight price saved.', true);
  }).catch(function(e) { spMsg('fr', 'Save failed: ' + e.message, false); });
}

function spAdjust(type, delta) {
  var id = type === 'fd' ? 'sp-fd-price' : 'sp-fr-price';
  var el = document.getElementById(id);
  var val = Math.max(0, (parseFloat(el.value) || 0) + delta);
  el.value = val.toFixed(2);
}

function spMsg(type, msg, ok) {
  var el = document.getElementById('sp-' + type + '-msg');
  if (!el) return;
  el.style.display      = 'block';
  el.style.background   = ok ? '#E8F5E9' : '#FFEBEE';
  el.style.color        = ok ? '#1B5E20' : '#C62828';
  el.style.borderLeft   = '4px solid ' + (ok ? '#4CAF50' : '#F44336');
  el.textContent        = msg;
  setTimeout(function() { el.style.display = 'none'; }, 3500);
}
```

---

## 8. Notes for Integration

1. **Company ID is `1216`** — all Firebase paths use `specialTariffs/1216/...`
2. **`_spPaxRates` is an in-memory object** — keys are km as strings (`"1"`, `"2.5"`, etc.), values are numeric prices. You sort by `Number(key)` for display.
3. **The toggle (enabled/disabled)** only controls whether the passenger app reads these rates — it does not affect food delivery or freight.
4. **The +/− buttons on food/freight** adjust the input in 50-cent steps using `spAdjust()`.
5. **No server-side code required** — all reads and writes go directly to Firebase via the admin helpers (client-side).
6. **Admin notifications:** The original code called `pushAdminNotif(...)` on save — wire this up to your super admin notification system if you have one, or simply remove those calls.
7. **Add a nav link** to your super admin sidebar under a "Tariffs" or "Pricing" section pointing to this page.
