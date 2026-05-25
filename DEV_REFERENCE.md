# BookaWaka — Dev Team Reference & Data Integrity Checklist

**Firebase project:** `bookawaka2026-564e1` | **DB URL:** `https://bookawaka2026-564e1-default-rtdb.firebaseio.com`
**Company ID example:** `620611` (Invercargill Southland Taxi Limited)
**Audit status:** ✅ FULLY CLOSED — May 2026. All five teams signed off on both sides. Three non-blocking sprint items tracked below.

---

## How to use this document

When any dev team replies, check their answer against the three items below **in priority order**. A mismatch = data loss, wrong reports, or broken payouts.

### ✅ Checklist — confirm for every dev reply

| # | Check | Pass | Fail = action |
|---|-------|------|---------------|
| 1 | **Timezone** — all timestamps stored as UTC ISO strings; all display/grouping uses company IANA timezone from `companySettings/{cid}/timezone` | They say `new Date().toISOString()` to store; `toLocaleDateString('en-CA', {timeZone: companyTZ})` to read | Flag every `setHours(0,0,0,0)`, `toISOString().slice(0,7)`, `toLocaleString()` with no timeZone, `Intl.DateTimeFormat().resolvedOptions()` |
| 2 | **Firebase path** — the path they write to matches the path the SA/Owner portals read from | Path in their code matches the canonical table below | Flag mismatched or invented paths — data written there is invisible to reports |
| 3 | **Required fields** — every field in the "Required fields" column is written | They list all required fields | Flag missing fields — broken subsidy calc, broken payout, broken report |

---

## Timezone Standard

```
Store timestamps:  new Date().toISOString()                                    ← UTC, always
Get today's date:  new Date().toLocaleDateString('en-CA', {timeZone: cTZ})     ← "YYYY-MM-DD"
Get month key:     new Date(ms).toLocaleDateString('en-CA', {timeZone: cTZ}).slice(0,7)  ← "YYYY-MM"
Get midnight ms:   _tzTodayStart(cTZ)                                          ← see helper
Display a time:    new Date(ts).toLocaleString('en-NZ', {timeZone: cTZ, ...})  ← always pass timeZone
```

**Company timezone is stored at:** `companySettings/{cid}/timezone` (IANA string, e.g. `"Pacific/Auckland"`)

**Known bad patterns — flag immediately:**
- `new Date().setHours(0,0,0,0)` — UTC midnight, not company midnight
- `new Date().toISOString().slice(0,7)` — UTC month, wrong at month boundaries for NZ (UTC+12/13)
- `new Date().toISOString().slice(0,10)` — UTC date, wrong for NZ trips after 12:00 UTC = midnight NZ
- `date.toLocaleString()` or `toLocaleDateString()` with no `timeZone` option — uses device timezone
- `Intl.DateTimeFormat().resolvedOptions().timeZone` — returns browser's local timezone, not company's
- `completedAt` field (local string) used as a timestamp — use `completedAt_ISO` instead

---

## Canonical Firebase Path Reference

### Completed Trips — taxi, food, freight, TM

| Path | Scope | Who reads it | Notes |
|------|-------|-------------|-------|
| `completedJobs/{cid}/{pushKey}` | Company | Owner portal, SA portal, ACC billing, TM trips | **Primary path for all completed trips** (taxi, TM, food hail, freight hail). Written by driver app when meter stops. Filter by `bookingType` field to distinguish service types. |
| `foodOrders/{cid}/{bookingId}` | Company | Owner portal — Food Delivery Jobs page | **Dispatched food orders only** (not hail). Written by dispatch app for food delivery jobs. Keyed by `bookingId` directly (flat, not nested by driver). |
| `freightOrders/{cid}/{bookingId}` | Company | Owner portal — Freight Jobs page | **Dispatched freight orders only** (not hail). Written by dispatch app for freight/cargo jobs. Same flat structure as `foodOrders`. |
| `joback/{bookingId}/{driverId}` | **GLOBAL** (not company-scoped) | SA portal watchdog, owner portal (limitToLast:500 fallback) | Legacy flat log — mixed company data. Owner portal merges this but `completedJobs` overwrites it. Do NOT use as a primary source for per-company reports. |
| `accClients/{cid}/{clientKey}/trips/{tripId}` | Company | ACC Billing page | Hail-mode ACC trips written here by driver app. Must also appear in `completedJobs/{cid}`. |

**Required fields for `completedJobs/{cid}/{pushKey}`:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `bookingId` | string | ✅ | Unique booking reference |
| `companyId` | string | ✅ | Must match the `{cid}` key |
| `driverId` | string | ✅ | Dispatcher ID (e.g. `"D001"`) |
| `driverName` | string | ✅ | Display name |
| `vehicleId` | string | ✅ | e.g. `"TAXI01"` |
| `completedAt_ISO` | string | ✅ | **UTC ISO 8601** — `new Date().toISOString()`. Used for all date grouping and filtering. |
| `startedAt_ISO` | string | ✅ | UTC ISO 8601 — when meter started |
| `fare` | number | ✅ | Total fare in dollars |
| `flagFallAmount` | number | ✅ | Flag fall component |
| `distanceCost` | number | ✅ | Distance component |
| `waitingCost` | number | ✅ | Waiting time component |
| `distanceKm` | number | ✅ | Total distance |
| `paymentType` | string | ✅ | `"cash"`, `"card"`, `"total_mobility"`, `"account"` |
| `paymentMethod` | string | recommended | `"cash"`, `"card"`, `"account"` |
| `bookingType` | string | ✅ | **Confirmed canonical field** for service classification. Values: `"taxi"`, `"food"`, `"freight"`, `"tm"`. Used by owner portal to route jobs to the correct report page. Do NOT use `serviceType` — that field does not exist in driver app data. |
| `source` | string | ✅ | `"hail"` or `"dispatch"` |
| `pickupAddress` | string | ✅ | Human-readable pickup |
| `dropAddress` | string | ✅ | Human-readable drop-off |
| `tariffId` | string | ✅ | Links to tariff used |
| `tariffName` | string | ✅ | Display name of tariff |
| `status` | string | ✅ | `"Completed"` |
| `zone` | string | recommended | Zone name if applicable |
| `completedAt` | string | ⚠️ **DO NOT USE FOR PARSING** | Driver app writes this as a local-formatted string (e.g. `"06/05/2026, 12:42:43 am"`). It is NOT a parseable UTC timestamp. Only use `completedAt_ISO`. |
| `startedAt` | string | ⚠️ **DO NOT USE FOR PARSING** | Same issue as `completedAt`. Use `startedAt_ISO`. |
| `serviceType` | — | ❌ **DO NOT WRITE** | This field does not exist in driver app data. Confirmed by driver app team audit. The owner portal previously filtered on this — now fixed to use `bookingType`. |

**Additional required fields for Total Mobility trips (`paymentType === "total_mobility"`):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `tmVoucherNo` | string | ✅ | TM voucher number |
| `tmPassengerName` | string | ✅ | Passenger's full name |
| `tmPassengerPays` | number | ✅ | Passenger contribution (dollars) |
| `tmSubsidy` | number | ✅ | Council subsidy amount |
| `tmTripCategory` | string | ✅ | e.g. `"other"`, `"medical"` |

**Additional required fields for ACC trips (`accClientRef` set on job):**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `accClientRef` | string | ✅ | Human-readable client ID (e.g. `"ACC-001"`). Links to `accClients/{cid}` record. |
| `poNumber` | string | ✅ | Purchase order number — used for invoice grouping |

---

### Drivers

| Path | Scope | Who reads it |
|------|-------|-------------|
| `drivers/{cid}/{uid}` | Company | Owner portal, driver compliance, dispatch |
| `driverRegistrations/{cid}/{regKey}` | Company | Owner portal driver approval flow |

**Required fields for `drivers/{cid}/{uid}`:**

| Field | Type | Required |
|-------|------|----------|
| `uid` | string | ✅ |
| `id` (dispatcherId) | string | ✅ | e.g. `"D001"` |
| `companyId` | string | ✅ |
| `email` | string | ✅ |
| `name` | string | ✅ |
| `vehicleId` | string | ✅ |
| `assignedVehicles` | array | ✅ |
| `allowedServices` | object | ✅ | `{taxi, food, freight, tm}` booleans |
| `lastLogin` | string | ✅ | UTC ISO string |

---

### Vehicles

| Path | Scope | Notes |
|------|-------|-------|
| `vehicles/{taxiNumber}` | **GLOBAL** (not company-scoped) | Keyed by taxi number. Read by owner portal, driver login expiry check. |

**Required fields:**

| Field | Type | Required |
|-------|------|----------|
| `taxiNumber` | string | ✅ |
| `companyId` | string | ✅ |
| `registration` | string | ✅ |
| `make` / `model` | string | ✅ |
| `regoExpiry` | string | ✅ | Format: `"YYYY-MM-DD"` |
| `cofExpiry` | string | ✅ | Format: `"YYYY-MM-DD"` |
| `status` | string | ✅ | `"active"` or `"inactive"` |
| `vehicleType` | string | ✅ |

---

### ACC (Accident Compensation Corporation)

| Path | Scope | Who reads it |
|------|-------|-------------|
| `accClients/{cid}/{clientKey}` | Company | ACC Clients page, ACC Billing page |
| `accClients/{cid}/{clientKey}/trips/{tripId}` | Company | ACC Billing page (hail jobs) |
| `accClients/{cid}/{clientKey}/purchaseOrders/{poKey}` | Company | ACC Clients page, billing date matching |
| `companySettings/{cid}/accVendorId` | Company | ACC Billing invoice header |

**Required fields for ACC client record:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `clientRef` | string | ✅ | Human-readable ID e.g. `"ACC-001"`. Shared key between driver app and owner portal. |
| `email` | string | ✅ |
| `phone` | string | recommended |
| `active` | boolean | ✅ |
| `createdAt` | number | ✅ | `Date.now()` |

**Required fields for ACC purchase order:**

| Field | Type | Required |
|-------|------|----------|
| `poNumber` | string | ✅ | e.g. `"PO-2026-001"` |
| `dateFrom` | string | ✅ | `"YYYY-MM-DD"` |
| `dateTo` | string | ✅ | `"YYYY-MM-DD"` |
| `maxAmount` | number | ✅ | Approved spend limit |
| `managerName` | string | ✅ | PO approver name |
| `managerEmail` | string | ✅ | PO approver email (used for invoice send) |
| `createdAt` | number | ✅ | `Date.now()` |

**Required fields for ACC hail trip (under `accClients/{cid}/{clientKey}/trips/{tripId}`):**

| Field | Type | Required |
|-------|------|----------|
| `completedAt_ISO` | string | ✅ | UTC ISO — used for date-range filtering |
| `fare` | number | ✅ |
| `poNumber` | string | ✅ | Must match active PO for that date |
| `accClientRef` | string | ✅ | Must match parent client's `clientRef` |
| `pickupAddress` | string | ✅ |
| `dropAddress` | string | ✅ |
| `driverId` | string | ✅ |
| `bookingId` | string | ✅ |

---

### Total Mobility (TM)

| Path | Scope | Who reads it |
|------|-------|-------------|
| `tmTariffs/{cid}` | Company | TM Tariffs page, fare calculation |
| `tmCompanyAccess/{cid}/{councilId}` | Company | TM Councils page |
| `tmBatches/{councilId}/{cid}/{yearMonth}` | Company | TM Batches page |
| `tmTripStatus/{cid}/{tripId}` | Company | TM Trips status tracking |
| `tmCouncilAccess/{councilId}` | Global | Council portal login + config |
| `tmConfig` | Global | Global TM settings |

**`tmBatches` `{yearMonth}` key format:** `"YYYY-MM"` — **must be in NZ timezone**, not UTC.

---

### Business Accounts

| Path | Scope | Who reads it |
|------|-------|-------------|
| `businessAccounts/{cid}/{accountId}` | Company | Business Accounts page |

**Required fields:**

| Field | Type | Required |
|-------|------|----------|
| `name` | string | ✅ |
| `contact` | string | ✅ |
| `email` | string | ✅ |
| `accountCode` | string | ✅ | Short code used in invoice numbers |
| `paymentTerms` | string | ✅ | e.g. `"30 days"` |
| `active` | boolean | ✅ |
| `createdAt` | number | ✅ | `Date.now()` |

---

### Company Settings & Config

| Path | Scope | Notes |
|------|-------|-------|
| `companySettings/{cid}/timezone` | Company | **IANA string required.** e.g. `"Pacific/Auckland"`. All portals read this. |
| `companySettings/{cid}/features` | Company | Feature flags: `accEnabled`, `businessAccounts` |
| `companySettings/{cid}/accVendorId` | Company | Required for ACC billing invoices |
| `companySettings/{cid}/paymentMethods` | Company | Payment method flags |
| `companyProfiles/{cid}` | Company | Display info, services enabled |
| `companies/{cid}/cardSettings` | Company | Card commission rates |
| `companies/{cid}/bankDetails` | Company | Bank account for payouts |
| `bw_billing/{cid}/plan` | Company | Subscription plan |
| `bw_billing/{cid}/payments/{key}` | Company | Payment history |
| `lastshifttime/{driverId}` | Global | Last shift end time — **keyed by legacy numeric dispatcher ID, NOT new driver UID** |
| `online/{cid}/{vehicleId}` | Company | Live GPS position — ephemeral, not used in reports |

---

### Shift / Session Tracking

| Path | Scope | Notes |
|------|-------|-------|
| `shiftLogs/{cid}/{driverId}/{shiftId}` | Company | **Does not exist yet for company 620611.** Driver app is NOT writing here. Owner portal compliance dashboard reads this path — currently shows no data. |
| `drivers/{cid}/{uid}/activeSessionId` | Company | Set when driver starts a session. **Must be cleared on logout or app close.** A stuck `activeSessionId` makes dispatch show driver as online when they are not. |

**⚠️ Known gap:** The driver app does not write to `shiftLogs/{cid}`. Compliance dashboard has no data. The driver app tracks session history locally on-device. Until the driver app writes structured session data to Firebase, the owner portal compliance dashboard cannot display it.

**Required fields for `shiftLogs/{cid}/{driverId}/{shiftId}` (when implemented):**

| Field | Type | Required |
|-------|------|----------|
| `startTs` | number | ✅ | `Date.now()` — Unix ms |
| `endTs` | number | ✅ | `Date.now()` at logout. If session is active, omit (or null). |
| `isActive` | boolean | ✅ | `true` while shift is running, `false` / omit when ended |
| `driverId` | string | ✅ |
| `vehicleId` | string | ✅ |
| `breakMin` | number | recommended | Total break minutes within shift |

---

## Known Data Gaps & Mismatches

| # | Gap | Impact | Status |
|---|-----|--------|--------|
| 1 | `completedAt` stored as local formatted string `"06/05/2026, 12:42:43 am"` — not parseable as UTC | Wrong date grouping in ACC billing | ✅ **Owner portal fixed** — reads `completedAt_ISO` first. Driver app team to remove or correct the field. |
| 2 | `shiftLogs/{cid}` path is empty — driver app does not write here | Owner portal compliance dashboard shows no data for any driver | ⏳ Driver app team — sprint item to write session start/end records |
| 3 | `joback` is not company-scoped (global flat node) | Reading without `companyId` filter shows jobs from all companies | ✅ **Confirmed** — owner portal uses `completedJobs/{cid}` as primary; `joback` is fallback only |
| 4 | `lastshifttime` keyed by legacy numeric dispatcher IDs — new driver app uses `"D001"` format | Shift reports page cannot match shift times to new-format drivers | ⏳ Driver app team to confirm which key format is being written |
| 5 | Food/freight dispatched orders — `foodOrders/{cid}/{bookingId}` and `freightOrders/{cid}/{bookingId}` | Jobs written elsewhere invisible to report pages | ✅ **Closed** — paths confirmed by driver app team. Owner portal now reads both paths. |
| 6 | `activeSessionId` not cleared on driver app crash / network loss | Dispatch shows driver as online when offline | ✅ **Closed** — driver app team confirmed `.onDisconnect().remove()` implemented |
| 7 | `allbookings/{cid}` uses Title-Case field names: `FinalFare`, `CompletedAt_ISO`, `RideCost` — not matched by camelCase pickers | Revenue from `allbookings`-only records showed $0 fare and no date | ✅ **Owner portal fixed** — fare and timestamp pickers now include both cases. **SA portal to verify same fix on their side** if they read `allbookings/{cid}`. |
| 8 | Commission/card fee not deducted from driver payout display | Both owner portal and SA portal show gross fare — drivers see wrong take-home amount | ⏳ **Joint sprint item** — both portals to implement net payout split using `companies/{cid}/cardSettings` schema, aligned in the same sprint. |
| 9 | Ratings page reads/writes `jobRatings` (global, unscoped) instead of `driverRatings/{cid}/{bookingId}` | All companies' ratings are mixed in one flat node — any company can read another's ratings | ✅ **Owner portal fixed** — listener, save, and delete all now use `driverRatings/COMPANY_ID/{bookingId}`. Keyed by bookingId to match driver app writes. |
| 10 | Freight POD fields (`deliveryConfirmed`, `deliveryPhoto`, etc.) at `freightOrders/{cid}/{bookingId}` are not read or displayed | Owner portal shows no delivery confirmation status for any freight job | ✅ **Owner portal fixed** — `pickupConfirmed`, `deliveryConfirmed`, `deliveredAt` added to `buildRow` and to freight report columns. Green/red badges shown in Freight Jobs report. |

## Future Sprint Items (non-blocking, tracked)

| # | Item | Owner | When shipped — portal impact |
|---|------|-------|------------------------------|
| A | Driver app **job type selector** on meter start — writes `bookingType: "food"\|"freight"\|"taxi"` to `completedJobs` at completion. Closes the hail food/freight under-reporting gap. | Driver app team | Owner portal and SA portal pick it up automatically — **no portal changes needed** |
| B | `jobDetails/{bookingId}` **company isolation** — add one-line `companyId` filter for multi-company scaling safety | SA/Dispatcher team | No owner portal changes needed |
| C | **Gross/net payout split** — read `companies/{cid}/cardSettings` (company commission %, driver card fee), apply per `paymentMethod` per job, show gross and net as separate report columns | Owner portal + SA portal (joint) | Schema alignment needed before implementation — raise joint ticket when sprint is scoped |
| D | ~~**Ratings path fix**~~ | ~~Owner portal~~ | ✅ **Shipped** — `driverRatings/COMPANY_ID/{bookingId}` live. Note: existing `jobRatings` legacy data is orphaned — one-off migration script needed if historical ratings must be preserved. |
| E | ~~**Freight POD display**~~ | ~~Owner portal~~ | ✅ **Shipped** — `pickupConfirmed`, `deliveryConfirmed`, `deliveredAt` in freight report. `deliveryPhoto`/`podSignature` not yet shown (confirm field names with driver app team if needed). |
| F | **Website booking audit (3 items — out of scope for owner portal repo)** — (1) confirm website calls `POST /api/job/create` on the correct server (not defined in owner portal); (2) confirm `pickupLocation`/`dropoffLocation` written as `{address, lat, lng}` objects; (3) confirm website booking form checks `bwConfig/paymentMethods/cashEnabled` before showing cash option. Owner portal has no booking creation code — these must be verified in the website codebase directly. | Website dev team | Owner portal is unaffected — reads completed job data from Firebase only |

---

## Quick Reply Scoring

When a dev team sends a reply, score it against these questions:

```
1. TIMEZONE
   [ ] Timestamps stored with new Date().toISOString()
   [ ] No setHours(0,0,0,0) used anywhere
   [ ] No toISOString().slice(0,7) used for month grouping
   [ ] Display/grouping uses companySettings/{cid}/timezone
   [ ] completedAt_ISO used (not completedAt) for date parsing

2. FIREBASE PATHS
   [ ] Completed trips written to completedJobs/{cid}/{pushKey}
   [ ] ACC hail trips also written to accClients/{cid}/{clientKey}/trips/{tripId}
   [ ] Shift sessions written to shiftLogs/{cid}/{driverId}/{shiftId}
   [ ] activeSessionId cleared on logout AND on disconnect
   [ ] lastshifttime/{driverId} key format confirmed (numeric vs string)

3. REQUIRED FIELDS
   [ ] completedAt_ISO present on every completed job
   [ ] startedAt_ISO present on every completed job
   [ ] fare (number) present
   [ ] paymentType present
   [ ] companyId present (matches {cid} in path)
   [ ] driverId present
   [ ] vehicleId present
   [ ] tmVoucherNo / tmPassengerName / tmPassengerPays / tmSubsidy on TM trips
   [ ] accClientRef / poNumber on ACC trips
```

---

## Cross-Team Status Board — May 2026 E2E Sprint

*Updated after E2E test run. Use this to track outstanding items before next test pass.*

### ✅ Completed

| Item | Team | Notes |
|------|------|-------|
| Firebase rules deployed | Infra | Live |
| Email (RESEND_API_KEY) | Infra | Live |
| SA portal — driver loading fix | SA portal | Shipped |
| Web booking — all 6 bugs | Web booking | Shipped |
| Stripe webhook registered | Infra | Live |
| Dispatch — inactive fleet filter | Dispatch | Shipped |
| Driver app — notification path fix | Driver app | Shipped |
| Owner portal — BUG 1 (SHA-256 passwords) | **Owner portal (this repo)** | ✅ Shipped May 2026 — SHA-256 via SubtleCrypto; server login verifies SHA-256 → base64 → plaintext fallback |
| Owner portal — BUG 2 (EID optional label) | **Owner portal (this repo)** | ✅ Shipped — label updated, field already not validated |
| Owner portal — BUG 3 (vehicle field uppercase) | **Owner portal (this repo)** | ✅ Shipped — `vehicleId` and `assignedVehicles` both `.toUpperCase()` |
| Owner portal — BUG 4 (durationLabel in reports) | **Owner portal (this repo)** | ✅ Shipped — `flattenJoback` now reads `durationLabel` first |
| Owner portal — BUG 5 (driver trip history panel) | **Owner portal (this repo)** | ✅ Shipped — "Recent Trips" section added to driver record view |
| Owner portal — BUG 6 (duplicate dispatcherId) | **Owner portal (this repo)** | ✅ Shipped — client passes `dispId`, server checks it in duplicate API |

### ✅ Additional Closed (since last update)

| Item | Resolution |
|------|-----------|
| Job offers reaching driver | ✅ Closed |
| Driver messages reaching dispatch | ✅ Closed |
| Owner Portal — vehicle field format blocker | ✅ Closed — driver app now reads both `allocatedVehicles` (object) AND `assignedVehicles` (array); no Owner Portal changes required |

### ⏳ Waiting / Outstanding

| Item | Waiting on | Notes |
|------|-----------|-------|
| Owner Portal agent — BUG 1 plaintext passwords (their repo) | Owner Portal agent | SHA-256 required; SA portal is reference implementation. Message sent. |
| Owner Portal agent — BUG 2 EID field optional (their repo) | Owner Portal agent | Must be non-blocking for NZ companies. Message sent. |
| Driver app — hail job IDs | Driver app dev | Pending |
| Driver app — TM subsidy fields | Driver app dev | Pending |
| Dispatch — scheduled jobs | Dispatch dev | Pending |
| Dispatch — closed job data completeness | Dispatch dev | Pending |
| Passenger app — not receiving requests | Passenger app dev | Pending |
| Web booking — card payment live browser test | Owner (manual test) | Needs real browser |

---

*Last updated: May 2026. Verified against live Firebase `bookawaka2026-564e1` database.*
