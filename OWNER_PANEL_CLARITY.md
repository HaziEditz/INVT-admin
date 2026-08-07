# Owner Panel Clarity Review

Living notes for simplifying how owners find completed trips by payment type.
Part of the same simplification effort as the **TM admin redesign**.

## Goal

Clear, consistent **payment-type trip visibility** in the owner panel so Account / ACC / Card / TM / Cash trips are each obvious to find — without hunting across differently named Reports vs Accounts vs Total Mobility pages.

## Current landscape (confusing)

| Payment type | Where owners look today | Notes |
|---|---|---|
| **TM** | Total Mobility → TM Trip History; also Reports → Total Mobility Jobs; dashboard “Total TM Trips” | Claims page vs report vs tile historically used different detection / data sources |
| **Account** | Accounts → Business Account Billing; Reports → Driver Account Jobs; Reports → Closed Jobs | Billing vs report vs closed list; Account IDs not always matched |
| **ACC** | Accounts → ACC Billing / ACC Clients | Separate from Business Account Billing |
| **Card / Cash / EFTPOS** | Reports → Closed Jobs (and Driver/Car Jobs) | No dedicated payment-type hub |

Ad feedback: it is genuinely confusing to find where Account / ACC / Card / TM trips are each viewable because pages are scattered and named inconsistently.

## Simplification backlog (TM admin redesign + clarity)

1. **Single mental model** — one place (or a clear index) that answers “where do I see trips paid by X?”
2. **Aligned detection** — TM economics detection (`isOwnerTmCompletedJob`) and Account matching shared across claims, reports, and dashboard tiles.
3. **Consistent naming** — e.g. “TM Trips” vs “Total Mobility Jobs”; “Driver Account Jobs” vs “Business Account Billing”.
4. **Payment-type trip visibility** — treat Account / ACC / Card / TM / Cash as first-class filters or deep links from a single completed-trips surface (or nav group), not only buried in report subtypes.
5. **Data sources** — prefer the same merge rules everywhere (`completedJobs` + `closedJobs` + `allbookings` / `tmTripStatus` as appropriate) so a trip does not appear in one view and vanish in another.

## Concrete fixes shipped alongside this note

- Owner TM Trip History merges `completedJobs` + `closedJobs` + `tmTripStatus` (council/SA-style inclusion).
- Total Mobility Jobs report + dashboard TM tile use the same TM detection logic.
- Business Account Billing matches driver `accountId` / `Account_id` / `jobAccountId` and reads `closedJobs`.
- Driver Account Jobs (AccReport) defaults to the current calendar month (not today-only) and flattens `paymentType` into payment method.

*Last updated: Aug 2026.*
