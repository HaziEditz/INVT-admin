/**
 * Driver Ops / Payment Summary helpers (owner + SA).
 * Pure JS — no Firebase. Used by unit tests and mirrored in page scripts.
 */

/** @typedef {'cash'|'card'|'eftpos'|'tm'|'hoist'|'account'|'other'} PayBucket */

/**
 * Classify a payment method string into a report bucket.
 * Hoist is detected from job economics flags, not payment method alone —
 * callers should use classifyJobPayments(job) for hoist splits.
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
    s.includes('credit')
  ) {
    return 'card';
  }
  return 'other';
}

/**
 * Amount the company owes the driver for this fare+method.
 * Cash: $0 (driver already holds cash; no company↔driver cash commission in cardSettings).
 * Card/EFTPOS: fare minus company% and driver-card% from cardSettings.
 * TM / Account / other non-cash: full fare (company collected / will collect).
 */
export function companyOwesDriver(fareNum, paymentMethod, cardSettings = {}) {
  const gross = Math.max(0, parseFloat(fareNum) || 0);
  const bucket = classifyPaymentMethod(paymentMethod);
  if (gross <= 0) return { bucket, gross: 0, owed: 0, commission: 0 };
  if (bucket === 'cash') {
    return { bucket, gross, owed: 0, commission: 0 };
  }
  if (bucket === 'card' || bucket === 'eftpos') {
    const compPct = parseFloat(cardSettings.companyPercent) || 0;
    const drvPct = parseFloat(cardSettings.driverPercent) || 0;
    const commission = (gross * compPct) / 100 + (gross * drvPct) / 100;
    const owed = Math.max(0, gross - commission);
    return { bucket, gross, owed, commission };
  }
  // TM, Account, other company-settled methods — company owes full fare to driver.
  return { bucket, gross, owed: gross, commission: 0 };
}

/**
 * Split a job into payment lines (main fare + optional hoist).
 * Hoist dollars are company-settled (TM) → always owed unless cash (shouldn't happen).
 */
export function jobPaymentLines(job, cardSettings = {}) {
  const fare = parseFloat(
    job.TotalFare || job.totalFare || job.Fare || job.fare || job.RideCost || job.EstimatedFare || 0,
  );
  const pm = job.PaymentType || job.paymentType || job.PaymentMethod || job.paymentMethod || '';
  const hoistAmt = parseFloat(
    job.tmSubsidyHoist || job.hoistFare || job.HoistFare || job.hoistAmount || 0,
  );
  const hoistUses = parseInt(job.hoistUses || job.HoistUses || job.hoistCount || 0, 10) || 0;
  const lines = [];

  const main = companyOwesDriver(fare, pm, cardSettings);
  // If hoist is embedded in TotalFare, avoid double-count: prefer explicit hoist field only as hoist line
  // and keep main as full fare. Owners reconcile hoist separately in UI.
  lines.push({
    kind: 'main',
    bucket: main.bucket,
    gross: main.gross,
    owed: main.owed,
    commission: main.commission,
  });

  if (hoistAmt > 0 || hoistUses > 0) {
    const hGross = hoistAmt > 0 ? hoistAmt : 0;
    lines.push({
      kind: 'hoist',
      bucket: 'hoist',
      gross: hGross,
      owed: hGross, // company/council path — owed until marked paid
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
  const raw = String(
    job.source || job.bookingSource || job.BookingSource || job.Source || job.via || job.Via || '',
  ).toLowerCase();
  const svc = String(job.serviceType || job.ServiceType || job.bookingType || job.Bookingtype || '').toLowerCase();
  if (svc.includes('food') || raw.includes('food')) return 'food';
  if (svc.includes('freight') || raw.includes('freight') || raw.includes('parcel')) return 'freight';
  if (raw.includes('passenger') || raw.includes('app')) return 'passenger_app';
  if (raw.includes('web') || raw.includes('website')) return 'website';
  if (raw.includes('hail')) return 'hail';
  if (raw.includes('dispatch') || raw.includes('console')) return 'dispatch';
  return raw ? 'other' : 'unknown';
}

/** NZ-friendly period bounds (local calendar). refMs defaults to now. */
export function periodBounds(mode, refMs = Date.now()) {
  const d = new Date(refMs);
  const y = d.getFullYear();
  const m = d.getMonth();
  const day = d.getDate();
  const startOfDay = (yy, mm, dd) => new Date(yy, mm, dd, 0, 0, 0, 0).getTime();
  const endOfDay = (yy, mm, dd) => new Date(yy, mm, dd, 23, 59, 59, 999).getTime();

  if (mode === 'day') {
    return {
      mode: 'day',
      fromMs: startOfDay(y, m, day),
      toMs: endOfDay(y, m, day),
      key: `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-NZ', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    };
  }
  if (mode === 'week') {
    // Monday-start week
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
  // month (default)
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
    other: 0,
    unknown: 0,
  };
}

/**
 * Build one driver summary row from jobs + optional shift minutes + settlement.
 * settlement: { status:'paid'|'open', paidAt?, amountPaid?, locked? } | null
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
  } = opts;

  const pay = emptyPayTotals();
  const outcomes = emptyOutcomeTotals();
  const sources = emptySourceTotals();
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

    // Money only on completed (and similar closed) trips
    if (outcome !== 'completed') continue;

    for (const line of jobPaymentLines(job, cardSettings)) {
      const b = line.bucket;
      if (!pay[b]) pay[b] = { gross: 0, owed: 0, count: 0 };
      pay[b].gross += line.gross;
      pay[b].owed += line.owed;
      pay[b].count += 1;
      if (b === 'hoist' && line.uses) pay.hoist.uses = (pay.hoist.uses || 0) + line.uses;
    }
  }

  const owedTotal =
    pay.card.owed +
    pay.eftpos.owed +
    pay.tm.owed +
    pay.hoist.owed +
    pay.account.owed +
    pay.other.owed;

  const locked = !!(settlement && (settlement.locked || settlement.status === 'paid'));
  const status = locked ? 'paid' : 'open';

  return {
    driverId: String(driverId || ''),
    driverName: String(driverName || driverId || 'Driver'),
    workMinutes: Math.max(0, workMinutes | 0),
    breakMinutes: Math.max(0, breakMinutes | 0),
    workHours: Math.round((Math.max(0, workMinutes) / 60) * 10) / 10,
    outcomes,
    sources,
    vehicles: Object.keys(vehicles).sort(),
    pay,
    /** Cash held by driver (not owed by company). */
    cashHeld: pay.cash.gross,
    /** Amount company still owes driver for this period (0 if locked/paid). */
    owedTotal: locked ? 0 : Math.round(owedTotal * 100) / 100,
    owedBeforeLock: Math.round(owedTotal * 100) / 100,
    status,
    locked,
    settlement: settlement || null,
  };
}

export function settlementPath(companyId, periodKey, driverId) {
  return `driverSettlements/${companyId}/${periodKey}/${driverId}`;
}
