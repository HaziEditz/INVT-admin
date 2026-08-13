/**
 * Company-ledger driver settlements (Track B).
 * Separate from BookaWaka PLATFORM_OWED Mark Paid (driverSettlements).
 *
 * Kind "account" → Account/ACC unpaid tracking.
 * Future verticals (food/freight/rentals/towing) can reuse the same path helper
 * + row builder with a new kind + bucket filter — avoid per-vertical rebuilds.
 */
import {
  classifyPaymentMethod,
  formatPayWithCount,
  isTmJob,
  normalizeJobOutcome,
  periodBounds,
  tmSubsidyParts,
} from './driverOpsSummary.js';

/** @typedef {'account'} CompanyLedgerKind */

/** Buckets this ledger settles for a given kind (extensible). */
export const COMPANY_LEDGER_BUCKETS = Object.freeze({
  account: Object.freeze(['account']),
});

export function companyLedgerSettlementRoot(kind) {
  const k = String(kind || 'account');
  if (k === 'account') return 'accountDriverSettlements';
  return 'companyLedgerSettlements/' + k;
}

export function companyLedgerSettlementPath(kind, companyId, periodKey, driverId) {
  const root = companyLedgerSettlementRoot(kind);
  return `${root}/${companyId}/${periodKey}/${driverId}`;
}

/** Alias for Account/ACC Track B. */
export function accountSettlementPath(companyId, periodKey, driverId) {
  return companyLedgerSettlementPath('account', companyId, periodKey, driverId);
}

export function isCompanyLedgerPayment(kind, paymentMethod) {
  const buckets = COMPANY_LEDGER_BUCKETS[kind] || [];
  return buckets.includes(classifyPaymentMethod(paymentMethod));
}

export function isAccountLedgerPayment(paymentMethod) {
  return isCompanyLedgerPayment('account', paymentMethod);
}

/**
 * Amount the company ledger tracks for a completed job.
 * TM: passenger portion only (council subsidy is not an Account/ACC collectible).
 * Non-TM: full TotalFare.
 */
export function jobFare(job) {
  const full =
    parseFloat(
      job.TotalFare || job.totalFare || job.Fare || job.fare || job.RideCost || job.EstimatedFare || 0,
    ) || 0;
  if (!isTmJob(job)) return full;
  const parts = tmSubsidyParts(job);
  if (parts.passengerPays > 0) return parts.passengerPays;
  return Math.max(0, Math.round((parts.fare - parts.hoistAmt - parts.subsidy) * 100) / 100);
}

export function jobPaymentMethod(job) {
  return job.PaymentType || job.paymentType || job.PaymentMethod || job.paymentMethod || '';
}

/**
 * Build one driver row for a company ledger (Account/ACC unpaid tracking).
 * owed = sum of completed ledger-bucket amounts (TM = passenger portion; else full fare).
 */
export function buildCompanyLedgerDriverRow(opts) {
  const kind = opts.kind || 'account';
  const buckets = new Set(COMPANY_LEDGER_BUCKETS[kind] || ['account']);
  const jobs = opts.jobs || [];
  const settlement = opts.settlement || null;
  const ledgerJobs = [];
  let gross = 0;
  let completedCount = 0;
  let cancelled = 0;
  let rejected = 0;
  let noShow = 0;
  let otherOut = 0;
  const vehicles = {};
  const accountRefs = {};

  for (const job of jobs) {
    const pm = jobPaymentMethod(job);
    const bucket = classifyPaymentMethod(pm);
    if (!buckets.has(bucket)) continue;
    ledgerJobs.push(job);
    const outcome = normalizeJobOutcome(
      job.jobstatus || job.JobStatus || job.status || job.Status || '',
    );
    if (outcome === 'cancelled') cancelled += 1;
    else if (outcome === 'rejected') rejected += 1;
    else if (outcome === 'no_show') noShow += 1;
    else if (outcome !== 'completed') otherOut += 1;

    const veh = String(
      job.vehicleId || job.VehicleId || job.taxiNumber || job.TaxiNumber || job.carNumber || '',
    ).trim();
    if (veh) vehicles[veh] = (vehicles[veh] || 0) + 1;

    const ref = String(
      job.accountNumber ||
        job.AccountNumber ||
        job.accountCode ||
        job.AccountCode ||
        job.accountId ||
        job.AccountId ||
        job.accClientId ||
        '',
    ).trim();
    if (ref) accountRefs[ref] = (accountRefs[ref] || 0) + 1;

    if (outcome !== 'completed') continue;
    completedCount += 1;
    gross += jobFare(job);
  }

  gross = Math.round(gross * 100) / 100;
  const locked = !!(settlement && (settlement.locked || settlement.status === 'paid'));
  const status = locked ? 'paid' : 'open';

  return {
    kind,
    driverId: String(opts.driverId || ''),
    driverName: String(opts.driverName || opts.driverId || 'Driver'),
    jobs: ledgerJobs,
    jobCount: ledgerJobs.length,
    completedCount,
    cancelled,
    rejected,
    noShow,
    otherOutcomes: otherOut,
    gross,
    owedTotal: locked ? 0 : gross,
    owedBeforeLock: gross,
    status,
    locked,
    settlement,
    vehicles: Object.keys(vehicles).sort(),
    accountRefs: Object.keys(accountRefs).sort(),
    bankName: opts.bankName || '',
    accountName: opts.accountName || '',
    accountNumber: opts.accountNumber || '',
    formatAmount: formatPayWithCount(locked ? 0 : gross, completedCount),
  };
}

export function buildAccountDriverSummaryRow(opts) {
  return buildCompanyLedgerDriverRow({ ...opts, kind: 'account' });
}

export { periodBounds, formatPayWithCount, classifyPaymentMethod, normalizeJobOutcome };
