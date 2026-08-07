# Owner Panel Clarity Review

Living notes for simplifying how owners find completed trips by payment type.
Part of the same simplification effort as the **TM admin redesign**.

## Goal

Clear, consistent **payment-type trip visibility** in the owner panel so **every** supported payment type is easy to find and work through the same way — not only TM / Account / ACC.

Driver-supported payment types today: **Cash, Card, EFTPOS, Account, TM, ACC**.

## Current landscape (by payment type)

| Payment type | Dedicated summary / billing view? | Where owners look today | Notes |
|---|---|---|---|
| **TM** | **Yes** — TM Trip History (+ claim batches) | Total Mobility → Trip History; also Reports → Total Mobility Jobs; dashboard “Total TM Trips” | Closest to a clean aggregate list + totals |
| **Account** | **Yes** — by business account | Accounts → Monthly Invoicing (`BusinessAccountBilling`); also Reports → Driver Account Jobs (flat list) | Invoice blocks: account → Z trips → $Y |
| **ACC** | **Yes** — by ACC client | Accounts → ACC Billing; ACC Clients for master data | Invoice blocks by client; claim/PO shown inside, not as primary rollup axis |
| **Card** | **No** equivalent | Reports → Closed Jobs; dashboard tile “Card Payments” → `CardCommission.aspx` | Tile href has **no matching page** in owner routes. Settings → Company Card % is commission config only, not a trip summary |
| **EFTPOS** | **No** | Closed Jobs / Driver Jobs only | Treated as “card-like” for commission helpers (`isCardPaymentMethod` includes eftpos) but **no** EFTPOS summary/billing page |
| **Cash** | **No** | Closed Jobs / Driver Jobs only | Settings can enable/disable cash for passenger app; no cash usage summary |

### Nearby pages that are *not* payment-type billing hubs

| Page | What it actually is |
|---|---|
| **Closed Jobs** | All completed trips (any payment) — flat list, filterable, not a per-type rollup |
| **Create Invoices / Invoice Report** | Driver payout invoices, not Card/Account/ACC customer billing |
| **Company Card %** | Card commission % settings |
| **Driver Account Jobs** | Flat Account-payment trip report (not by business) |

Ad feedback: Account / ACC / Card / TM are hard to find because pages are scattered and named inconsistently. **Card / EFTPOS / Cash have the largest gap** — no Monthly Invoicing / ACC Billing / TM Trip History equivalent at all.

## Simplification backlog (TM admin redesign + clarity)

1. **Single mental model** — one place (or a clear index) that answers “where do I see trips paid by X?” for **TM, Account, ACC, Card, EFTPOS, Cash**.
2. **Parity for Card / EFTPOS / Cash** — either dedicated summary views (period totals + trip list, analogous to TM Trip History / Monthly Invoicing / ACC Billing) **or** one shared “Payments” hub with a payment-type filter that makes each type first-class. (Dashboard Card Payments dead link to `CardCommission.aspx` temporarily redirected to `ClosedJobsReports.aspx?pay=card` until real summary pages exist.)
3. **Aligned detection** — shared TM / Account / ACC / card-family matching across claims, reports, and dashboard tiles.
4. **Consistent naming** — e.g. “TM Trips” vs “Total Mobility Jobs”; “Driver Account Jobs” vs “Business Account Billing” / “Monthly Invoicing”; stop implying Card has a commission summary page when it doesn’t.
5. **Payment-type trip visibility** — treat all six driver payment types as first-class filters or deep links from a single completed-trips surface (or nav group), not only buried in report subtypes or Accounts-only for some types.
6. **Data sources** — prefer the same merge rules everywhere (`completedJobs` + `closedJobs` + `allbookings` / `tmTripStatus` as appropriate) so a trip does not appear in one view and vanish in another.

## Concrete fixes already shipped (context)

- Owner TM Trip History merges `completedJobs` + `closedJobs` + `tmTripStatus` (council/SA-style inclusion).
- Total Mobility Jobs report + dashboard TM tile use the same TM detection logic; report flatten keeps TM economics fields.
- Business Account Billing matches driver `accountId` aliases and reads `closedJobs`.
- Driver Account Jobs (AccReport) defaults to the current calendar month and flattens `paymentType` into payment method.

*Last updated: Aug 2026 — added Card / EFTPOS / Cash parity gap to backlog.*
