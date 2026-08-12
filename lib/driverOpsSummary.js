/**
 * Driver Ops / Payment Summary helpers (owner + SA).
 * Pure JS — no Firebase. Used by unit tests and mirrored in page scripts.
 */
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const {
  aggregateDriverShiftMinutes,
  resolveDriverId,
  fmtDur,
} = require('./shiftReportFlatten.js');

/** @typedef {'cash'|'card'|'eftpos'|'tm'|'hoist'|'account'|'other'} PayBucket */

/**
 * Track C: Card Mark Paid stream (independent lock).
 * `other` rides with Card (same as pre-split owedTotal misc).
 */
export const PLATFORM_CARD_OWED_BUCKETS = Object.freeze(['card', 'other']);

/**
 * Track C: TM Mark Paid stream (independent lock). Hoist stays with TM.
 */
export const PLATFORM_TM_OWED_BUCKETS = Object.freeze(['tm', 'hoist']);

/**
 * BookaWaka platform-mediated buckets (union of Card + TM streams).
 * Future channels should plug into a stream list — not ad-hoc owedTotal sums.
 */
export const PLATFORM_OWED_BUCKETS = Object.freeze(['card', 'tm', 'hoist']);

/**
 * Visible in DOS with gross×count, but excluded from BookaWaka Mark Paid / Total Unpaid.
 * Account/ACC = company settles with their own clients; Track B owns company→driver unpaid.
 */
export const TRACKED_NOT_PLATFORM_OWED = Object.freeze(['cash', 'eftpos', 'account']);

export function isPlatformOwedBucket(bucket) {
  return PLATFORM_OWED_BUCKETS.includes(String(bucket || ''));
}

export function isSettlementLocked(settlement) {
  return !!(settlement && (settlement.locked || settlement.status === 'paid'));
}

/**
 * Resolve Card / TM lock flags. Legacy combined driverSettlements lock
 * applies to both streams (read-only fallback — do not re-owe already-paid drivers).
 */
export function resolveStreamLocks(opts = {}) {
  const legacyLocked = isSettlementLocked(opts.legacySettlement || opts.settlement);
  const cardLocked = legacyLocked || isSettlementLocked(opts.cardSettlement);
  const tmLocked = legacyLocked || isSettlementLocked(opts.tmSettlement);
  return { cardLocked, tmLocked, legacyLocked };
}

/** @typedef {'card'|'tm'} PlatformSettlementKind */

export function platformSettlementRoot(kind) {
  const k = String(kind || '');
  if (k === 'card') return 'cardDriverSettlements';
  if (k === 'tm') return 'tmDriverSettlements';
  return 'driverSettlements';
}

export function platformSettlementPath(kind, companyId, periodKey, driverId) {
  return `${platformSettlementRoot(kind)}/${companyId}/${periodKey}/${driverId}`;
}

/**
 * Classify a payment method string into a report bucket.
 * Hoist is detected from job economics flags, not payment method alone —
 * callers should use jobPaymentLines(job) for hoist splits.
 * Card = one bucket for manual card entry and Tap to Pay / NFC.
 * ACC / Business Account → account (company-client settlement, not BW Mark Paid).
 */
export function classifyPaymentMethod(pm) {
  const s = String(pm || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  if (!s || s === '—' || s === '-') return 'other';
  if (s.includes('cash')) return 'cash';
  if (s.includes('mobility') || s === 'tm' || s.includes('totalmobility')) return 'tm';
  if (s.includes('account') || s === 'acc' || s.includes('business') || s.includes('corporate')) {
    return 'account';
  }
  if (s.includes('eftpos')) return 'eftpos';
  if (
    s.includes('card') ||
    s.includes('stripe') ||
    s.includes('visa') ||
    s.includes('master') ||
    s.includes('amex') ||
    s.includes('debit') ||
    s.includes('credit') ||
    s.includes('tap') ||
    s.includes('nfc') ||
    s.includes('taptopay')
  ) {
    return 'card';
  }
  return 'other';
}

/** Detect Total Mobility jobs even when PaymentType is Cash/other. */
export function isTmJob(job) {
  if (!job || typeof job !== 'object') return false;
  if (job.isTotalMobility === true || job.tmUsed === true) return true;
  if (job.tmPaymentType === 'total_mobility' || job.paymentCategory === 'total_mobility') return true;
  const pm = job.PaymentType || job.paymentType || job.PaymentMethod || job.paymentMethod || '';
  if (classifyPaymentMethod(pm) === 'tm') return true;
  if (job.tmSubsidyFare != null && job.tmSubsidyFare !== '') return true;
  if (job.tmSubsidy != null && job.tmSubsidy !== '') return true;
  if (job.tmCouncilPays != null && job.tmCouncilPays !== '') return true;
  if (job.councilPays != null && job.councilPays !== '') return true;
  if (job.tmCardNumber || job.tmVoucherNo) return true;
  return false;
}

/**
 * Amount BookaWaka Mark Paid owes the driver for this fare+method.
 * Cash / EFTPOS / Account(ACC): $0 here — tracked via gross×count only (company-side settlement).
 * Card: fare minus company% and driver-card% from cardSettings.
 * TM PaymentType alone still returns full fare here — callers must use jobPaymentLines,
 * which settles TM as subsidy (+ hoist), not full fare.
 */
export function companyOwesDriver(fareNum, paymentMethod, cardSettings = {}) {
  const gross = Math.max(0, parseFloat(fareNum) || 0);
  const bucket = classifyPaymentMethod(paymentMethod);
  if (gross <= 0) return { bucket, gross: 0, owed: 0, commission: 0 };
  if (TRACKED_NOT_PLATFORM_OWED.includes(bucket)) {
    return { bucket, gross, owed: 0, commission: 0 };
  }
  if (bucket === 'card') {
    const compPct = parseFloat(cardSettings.companyPercent) || 0;
    const drvPct = parseFloat(cardSettings.driverPercent) || 0;
    const commission = (gross * compPct) / 100 + (gross * drvPct) / 100;
    const owed = Math.max(0, gross - commission);
    return { bucket, gross, owed, commission };
  }
  return { bucket, gross, owed: gross, commission: 0 };
}

/**
 * Meter-side TM subsidy (council) dollars + optional per-trip %.
 * Prefer tmSubsidyFare; legacy combined tmSubsidy/councilPays falls back to combined − hoist.
 * When only passenger portion is known: subsidy = fare − hoist − passenger.
 * Period display % uses dollar-effective totals in buildDriverSummaryRow — not these per-trip %.
 */
export function tmSubsidyParts(job) {
  const fare =
    parseFloat(
      job?.TotalFare ||
        job?.totalFare ||
        job?.tmTotalFare ||
        job?.Fare ||
        job?.fare ||
        job?.RideCost ||
        job?.EstimatedFare ||
        0,
    ) || 0;
  const hoistAmt =
    parseFloat(job?.tmSubsidyHoist || job?.hoistFare || job?.HoistFare || job?.hoistAmount || 0) ||
    0;
  let subsidy = 0;
  if (job?.tmSubsidyFare != null && job.tmSubsidyFare !== '') {
    subsidy = parseFloat(job.tmSubsidyFare) || 0;
  } else {
    const combined =
      parseFloat(job?.tmSubsidy || job?.tmCouncilPays || job?.councilPays || 0) || 0;
    if (combined > 0) {
      subsidy = hoistAmt > 0 ? Math.max(0, combined - hoistAmt) : combined;
    } else {
      const hasPaxField =
        (job?.tmPassengerPays != null && job.tmPassengerPays !== '') ||
        (job?.passengerPays != null && job.passengerPays !== '') ||
        (job?.patientPays != null && job.patientPays !== '');
      if (hasPaxField) {
        const pax =
          parseFloat(job.tmPassengerPays || job.passengerPays || job.patientPays || 0) || 0;
        subsidy = Math.max(0, fare - hoistAmt - pax);
      }
    }
  }
  subsidy = Math.round(Math.max(0, subsidy) * 100) / 100;

  const pax =
    parseFloat(job?.tmPassengerPays || job?.passengerPays || job?.patientPays || 0) || 0;
  const meterBase = Math.max(0, fare - hoistAmt);

  let councilPct = parseFloat(
    job?.tmSubsidyPercent || job?.subsidyPercent || job?.councilPercent || job?.tmPercent || '',
  );
  if (!isFinite(councilPct) || councilPct <= 0) councilPct = null;
  let passengerPct = parseFloat(job?.tmPassengerPercent || job?.passengerPercent || '');
  if (!isFinite(passengerPct) || passengerPct <= 0) passengerPct = null;

  if (councilPct == null && meterBase > 0.009 && subsidy > 0) {
    councilPct = Math.round((subsidy / meterBase) * 1000) / 10;
  }
  if (passengerPct == null && meterBase > 0.009 && pax > 0) {
    passengerPct = Math.round((pax / meterBase) * 1000) / 10;
  } else if (passengerPct == null && councilPct != null) {
    passengerPct = Math.round((100 - councilPct) * 10) / 10;
  }

  return {
    fare: Math.round(fare * 100) / 100,
    subsidy,
    hoistAmt: Math.round(Math.max(0, hoistAmt) * 100) / 100,
    passengerPays: Math.round(Math.max(0, pax) * 100) / 100,
    meterBase: Math.round(meterBase * 100) / 100,
    councilPct,
    passengerPct,
  };
}

/**
 * Split a job into payment lines (main fare + optional TM subsidy + hoist).
 * TM: cash/EFTPOS/Account remainder stays $0-owed (tracked only); council subsidy
 * still enters pay.tm.owed. PaymentType===TM never owes full fare — subsidy only.
 * Hoist is a separate owed line summed with subsidy for the TM Mark Paid stream.
 */
export function jobPaymentLines(job, cardSettings = {}) {
  const fare = parseFloat(
    job.TotalFare || job.totalFare || job.Fare || job.fare || job.RideCost || job.EstimatedFare || 0,
  );
  const pm = job.PaymentType || job.paymentType || job.PaymentMethod || job.paymentMethod || '';
  const hoistAmt = parseFloat(
    job.tmSubsidyHoist || job.hoistFare || job.HoistFare || job.hoistAmount || 0,
  );
  const hoistUses =
    parseInt(job.hoistUses || job.HoistUses || job.hoistCount || job.tmHoistCount || 0, 10) || 0;
  const lines = [];
  const main = companyOwesDriver(fare, pm, cardSettings);
  const tmJob = isTmJob(job);

  if (tmJob) {
    // Remainder PaymentType stays visible with owed $0 (not BookaWaka Mark Paid).
    // Gross = passenger portion only — never full meter (council subsidy is not cash held).
    const parts = tmSubsidyParts(job);
    if (TRACKED_NOT_PLATFORM_OWED.includes(main.bucket)) {
      const paxGross =
        parts.passengerPays > 0
          ? parts.passengerPays
          : Math.max(0, Math.round((parts.fare - parts.hoistAmt - parts.subsidy) * 100) / 100);
      lines.push({
        kind: 'main',
        bucket: main.bucket,
        gross: paxGross,
        owed: 0,
        commission: 0,
      });
    }
    // PaymentType TM / other / card on a TM job: do not put full fare into tm.owed.
    if (parts.subsidy > 0) {
      lines.push({
        kind: 'tm_subsidy',
        bucket: 'tm',
        gross: parts.subsidy,
        owed: parts.subsidy,
        commission: 0,
      });
    }
  } else {
    lines.push({
      kind: 'main',
      bucket: main.bucket,
      gross: main.gross,
      owed: main.owed,
      commission: main.commission,
    });
  }

  if (hoistAmt > 0 || hoistUses > 0) {
    const hGross = hoistAmt > 0 ? hoistAmt : 0;
    lines.push({
      kind: 'hoist',
      bucket: 'hoist',
      gross: hGross,
      owed: hGross,
      commission: 0,
      uses: hoistUses,
    });
  }
  return lines;
}

export function normalizeJobOutcome(status) {
  const s = String(status || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  if (!s) return 'other';
  if (s.includes('complete') || s === 'closed' || s === 'done' || s === 'finished') return 'completed';
  if (s.includes('cancel')) return 'cancelled';
  if (s.includes('reject') || s.includes('declin')) return 'rejected';
  if (s.includes('noshow') || s === 'ns') return 'no_show';
  return 'other';
}

export function normalizeJobSource(job) {
  // Owner manual TM entry — check BEFORE food/freight/app so strings like
  // manual_owner never land in an unrelated vertical bucket.
  if (
    job &&
    (job.manuallyAddedByCompany === true ||
      job.manuallyAddedByCompany === 'true' ||
      String(job.source || job.bookingSource || '')
        .toLowerCase()
        .includes('manual_owner') ||
      String(job.source || '')
        .toLowerCase()
        .includes('manual owner'))
  ) {
    return 'manual';
  }
  const raw = String(
    job.source || job.bookingSource || job.BookingSource || job.Source || job.via || job.Via || '',
  ).toLowerCase();
  const svc = String(
    job.serviceType || job.ServiceType || job.bookingType || job.Bookingtype || '',
  ).toLowerCase();
  if (svc.includes('food') || raw.includes('food')) return 'food';
  if (svc.includes('freight') || raw.includes('freight') || raw.includes('parcel')) return 'freight';
  // Driver App / hail before generic "app"
  if (
    raw.includes('hail') ||
    raw.includes('driverapp') ||
    raw.includes('driver_app') ||
    raw.includes('driver-app') ||
    raw.includes('driver created') ||
    raw.includes('street') ||
    raw === 'queue' ||
    raw.includes('driverqueue')
  ) {
    return 'hail';
  }
  if (raw.includes('dispatch') || raw.includes('console')) return 'dispatch';
  if (raw.includes('web') || raw.includes('website')) return 'website';
  if (raw.includes('passenger') || raw.includes('rider') || raw.includes('pax')) return 'passenger_app';
  if (raw.includes('app')) return 'passenger_app';
  return raw ? 'other' : 'unknown';
}

/** Format "$12.50 ×3" — count always shown when > 0. */
export function formatPayWithCount(owedOrGross, count) {
  const n = Math.round((parseFloat(owedOrGross) || 0) * 100) / 100;
  const c = parseInt(count, 10) || 0;
  const money = '$' + n.toFixed(2);
  if (c > 0) return money + ' ×' + c;
  return money;
}

/** NZ-friendly period bounds. Supports month/week/day/range. */
export function periodBounds(mode, refMs = Date.now(), rangeFromYmd = '', rangeToYmd = '') {
  const d = new Date(refMs);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const startOfDay = (yy, mm, dd) => new Date(yy, mm, dd, 0, 0, 0, 0).getTime();
  const endOfDay = (yy, mm, dd) => new Date(yy, mm, dd, 23, 59, 59, 999).getTime();

  if (mode === 'range') {
    const fromParts = String(rangeFromYmd || '').split('-').map(Number);
    const toParts = String(rangeToYmd || rangeFromYmd || '').split('-').map(Number);
    if (fromParts.length === 3 && fromParts[0] && toParts.length === 3 && toParts[0]) {
      let fromMs = startOfDay(fromParts[0], fromParts[1] - 1, fromParts[2]);
      let toMs = endOfDay(toParts[0], toParts[1] - 1, toParts[2]);
      if (toMs < fromMs) {
        const tmp = fromMs;
        fromMs = startOfDay(toParts[0], toParts[1] - 1, toParts[2]);
        toMs = endOfDay(fromParts[0], fromParts[1] - 1, fromParts[2]);
      }
      const fromLabel = new Date(fromMs).toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const toLabel = new Date(toMs).toLocaleDateString('en-NZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      return {
        mode: 'range',
        fromMs,
        toMs,
        key: `R${rangeFromYmd}_${rangeToYmd || rangeFromYmd}`,
        label: fromLabel === toLabel ? fromLabel : fromLabel + ' – ' + toLabel,
      };
    }
  }

  if (mode === 'day') {
    return {
      mode: 'day',
      fromMs: startOfDay(y, m, day),
      toMs: endOfDay(y, m, day),
      key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-NZ', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    };
  }
  if (mode === 'week') {
    const dow = (d.getDay() + 6) % 7;
    const mon = new Date(y, m, day - dow);
    const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    const key = `W${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
    return {
      mode: 'week',
      fromMs: startOfDay(mon.getFullYear(), mon.getMonth(), mon.getDate()),
      toMs: endOfDay(sun.getFullYear(), sun.getMonth(), sun.getDate()),
      key,
      label: `${mon.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })} – ${sun.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}`,
    };
  }
  const last = new Date(y, m + 1, 0).getDate();
  return {
    mode: 'month',
    fromMs: startOfDay(y, m, 1),
    toMs: endOfDay(y, m, last),
    key: `${y}-${String(m + 1).padStart(2, '0')}`,
    label: d.toLocaleDateString('en-NZ', { month: 'long', year: 'numeric' }),
  };
}

export function emptyPayTotals() {
  return {
    cash: { gross: 0, owed: 0, count: 0 },
    card: { gross: 0, owed: 0, count: 0 },
    eftpos: { gross: 0, owed: 0, count: 0 },
    tm: { gross: 0, owed: 0, count: 0 },
    hoist: { gross: 0, owed: 0, count: 0, uses: 0 },
    account: { gross: 0, owed: 0, count: 0 },
    other: { gross: 0, owed: 0, count: 0 },
  };
}

export function emptyOutcomeTotals() {
  return { completed: 0, cancelled: 0, rejected: 0, no_show: 0, other: 0, total: 0 };
}

export function emptySourceTotals() {
  return {
    dispatch: 0,
    passenger_app: 0,
    website: 0,
    food: 0,
    freight: 0,
    hail: 0,
    manual: 0,
    other: 0,
    unknown: 0,
  };
}

export function emptyTmDetail() {
  return {
    trips: 0,
    fare: 0,
    subsidy: 0,
    hoist: 0,
    hoistUses: 0,
    passengerPays: 0,
    owed: 0,
    paid: 0,
    councilPct: null,
    passengerPct: null,
  };
}

/**
 * Build one driver summary row from jobs + optional shift minutes + settlements.
 * Track C: cardSettlement and tmSettlement lock independently.
 * Optional `settlement` = legacy combined driverSettlements (both streams locked if paid).
 */
export function buildDriverSummaryRow(opts) {
  const {
    driverId,
    driverName,
    jobs = [],
    workMinutes = 0,
    breakMinutes = 0,
    cardSettings = {},
    settlement = null,
    cardSettlement = null,
    tmSettlement = null,
  } = opts;

  const pay = emptyPayTotals();
  const outcomes = emptyOutcomeTotals();
  const sources = emptySourceTotals();
  const tmDetail = emptyTmDetail();
  const vehicles = {};

  for (const job of jobs) {
    const outcome = normalizeJobOutcome(
      job.jobstatus || job.JobStatus || job.status || job.Status || '',
    );
    outcomes[outcome] = (outcomes[outcome] || 0) + 1;
    outcomes.total += 1;

    const src = normalizeJobSource(job);
    sources[src] = (sources[src] || 0) + 1;

    const veh = String(
      job.vehicleId || job.VehicleId || job.taxiNumber || job.TaxiNumber || job.carNumber || '',
    ).trim();
    if (veh) vehicles[veh] = (vehicles[veh] || 0) + 1;

    if (outcome !== 'completed') continue;

    const tmJob = isTmJob(job);
    if (tmJob) {
      tmDetail.trips += 1;
      const parts = tmSubsidyParts(job);
      tmDetail.fare += parts.fare;
      tmDetail.subsidy += parts.subsidy;
      tmDetail.hoist += parts.hoistAmt;
      tmDetail.passengerPays += parts.passengerPays;
      const uses =
        parseInt(job.hoistUses || job.HoistUses || job.hoistCount || job.tmHoistCount || 0, 10) ||
        0;
      tmDetail.hoistUses += uses;
    }

    for (const line of jobPaymentLines(job, cardSettings)) {
      const b = line.bucket;
      if (!pay[b]) pay[b] = { gross: 0, owed: 0, count: 0 };
      pay[b].gross += line.gross;
      pay[b].owed += line.owed;
      pay[b].count += 1;
      if (b === 'hoist' && line.uses) pay.hoist.uses = (pay.hoist.uses || 0) + line.uses;
    }
  }

  // Dollar-effective meter split for the period (excludes hoist). Not Council Config rate,
  // not an unweighted mean of per-trip %.
  const meterSplitBase = tmDetail.subsidy + tmDetail.passengerPays;
  if (meterSplitBase > 0.009) {
    tmDetail.councilPct =
      Math.round((tmDetail.subsidy / meterSplitBase) * 1000) / 10;
    tmDetail.passengerPct = Math.round((100 - tmDetail.councilPct) * 10) / 10;
  }

  tmDetail.owed = Math.round((pay.tm.owed + pay.hoist.owed) * 100) / 100;
  tmDetail.fare = Math.round(tmDetail.fare * 100) / 100;
  tmDetail.subsidy = Math.round(tmDetail.subsidy * 100) / 100;
  tmDetail.hoist = Math.round(tmDetail.hoist * 100) / 100;
  tmDetail.passengerPays = Math.round(tmDetail.passengerPays * 100) / 100;

  // Track C: Card stream (card + other) and TM stream (tm + hoist) lock independently.
  // Account/ACC/cash/eftpos stay visible via pay.*.gross/count — Track B settles Account separately.
  const cardOwedBeforeLock = Math.round((pay.card.owed + pay.other.owed) * 100) / 100;
  const tmOwedBeforeLock = Math.round((pay.tm.owed + pay.hoist.owed) * 100) / 100;
  const owedBeforeLock = Math.round((cardOwedBeforeLock + tmOwedBeforeLock) * 100) / 100;

  const locks = resolveStreamLocks({
    cardSettlement,
    tmSettlement,
    legacySettlement: settlement,
  });
  const { cardLocked, tmLocked } = locks;
  const locked = cardLocked && tmLocked;
  let status = 'open';
  if (locked) status = 'paid';
  else if (cardLocked || tmLocked) status = 'partial';

  if (tmLocked) {
    tmDetail.paid = tmDetail.owed;
    tmDetail.owed = 0;
  }

  const cardOwed = cardLocked ? 0 : cardOwedBeforeLock;
  const tmOwed = tmLocked ? 0 : tmOwedBeforeLock;
  const owedTotal = Math.round((cardOwed + tmOwed) * 100) / 100;

  return {
    driverId: String(driverId || ''),
    driverName: String(driverName || driverId || 'Driver'),
    workMinutes: Math.max(0, workMinutes | 0),
    breakMinutes: Math.max(0, breakMinutes | 0),
    workHours: Math.round((Math.max(0, workMinutes) / 60) * 10) / 10,
    outcomes,
    sources,
    tmDetail,
    vehicles: Object.keys(vehicles).sort(),
    pay,
    cashHeld: pay.cash.gross,
    cardOwed,
    tmOwed,
    cardOwedBeforeLock,
    tmOwedBeforeLock,
    owedTotal,
    owedBeforeLock,
    status,
    locked,
    cardLocked,
    tmLocked,
    cardSettlement: cardSettlement || null,
    tmSettlement: tmSettlement || null,
    settlement: settlement || null,
  };
}

/** Legacy combined path (read-only fallback). New writes use platformSettlementPath. */
export function settlementPath(companyId, periodKey, driverId) {
  return `driverSettlements/${companyId}/${periodKey}/${driverId}`;
}

export { aggregateDriverShiftMinutes, resolveDriverId, fmtDur };
