/**
 * Owner-panel manual TM trip entry — build completedJobs + tmTripStatus payloads.
 * Mirrors driver-complete shape with source: 'manual_owner' / manuallyAddedByCompany: true.
 */

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(v, fallback = '') {
  if (v == null) return fallback;
  return String(v).trim() || fallback;
}

/** Meter subsidy: percent then optional cap (cap ≤ 0 = uncapped %). */
export function calcManualTmSubsidy(meterFare, config = {}) {
  const fare = Math.max(0, num(meterFare));
  const pct = Math.max(0, num(config.councilSubsidyPercent ?? config.councilPercent ?? config.subsidyPercent));
  const capRaw = num(config.councilCapAmount ?? config.capAmount ?? config.subsidyCap);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : 0;
  const pctAmount = (fare * pct) / 100;
  const subsidy = +(cap > 0 ? Math.min(pctAmount, cap) : pctAmount).toFixed(2);
  return {
    subsidy,
    passengerPays: +Math.max(0, fare - subsidy).toFixed(2),
    uncapped: cap <= 0,
  };
}

export function buildManualBookingId(nowMs = Date.now()) {
  return 'M' + String(nowMs);
}

/**
 * @param {object} input form fields
 * @param {object} opts { companyId, councilId, tmConfig, addedBy }
 */
export function buildManualTmCompletedJob(input, opts = {}) {
  const companyId = str(opts.companyId);
  const councilId = str(opts.councilId || input.councilId);
  const cfg = opts.tmConfig || {};
  const now = Number(opts.nowMs) || Date.now();
  const bookingId = str(input.bookingId) || buildManualBookingId(now);

  const date = str(input.date); // YYYY-MM-DD
  const time = str(input.time) || '12:00'; // HH:mm
  let completedAt = now;
  if (date) {
    const isoLocal = `${date}T${time.length === 5 ? time : time.slice(0, 5)}:00`;
    // Interpret as Pacific/Auckland wall time → approx via Date parse of NZ offset is unreliable;
    // store ISO with explicit Z only when caller passes completedAtMs.
    const parsed = Date.parse(isoLocal);
    if (Number.isFinite(parsed)) completedAt = parsed;
  }
  if (input.completedAtMs != null && Number.isFinite(Number(input.completedAtMs))) {
    completedAt = Number(input.completedAtMs);
  }

  const meterFare = +num(input.fare || input.meterFare).toFixed(2);
  const hoistUses = Math.max(0, Math.floor(num(input.hoistUses || input.hoistCount)));
  const hoistRate = Math.max(
    0,
    num(cfg.hoistCostPerUnit ?? cfg.hoistUnitCost ?? cfg.hoistRatePerUse ?? input.hoistRate),
  );
  const hoistTotal = +(hoistUses * hoistRate).toFixed(2);
  const split = calcManualTmSubsidy(meterFare, cfg);
  const passengerPays = split.passengerPays;
  const meterClaim = split.subsidy;
  const distanceKm = input.distanceKm != null && input.distanceKm !== '' ? +num(input.distanceKm).toFixed(2) : null;
  const card = str(input.tmCardNumber || input.cardNumber);
  const cardName = str(input.tmCardName || input.passengerName || input.cardholderName);
  const cardExpiry = str(input.tmCardExpiry || input.cardExpiry);
  const paymentType = str(input.paymentType || input.remainderPaymentType || 'Cash') || 'Cash';
  const driverName = str(input.driverName || input.driver);
  const driverId = str(input.driverId);
  const vehicleId = str(input.vehicleId || input.vehicle);
  const pickup = str(input.pickupAddress || input.pickup);
  const dropoff = str(input.dropAddress || input.dropoffAddress || input.dropoff);
  const addedBy = str(opts.addedBy || input.addedBy || 'owner');

  const tmHoists =
    hoistUses > 0 && card
      ? Array.from({ length: hoistUses }, () => ({
          cardNumber: card,
          cardExpiry: cardExpiry || undefined,
          cardName: cardName || undefined,
          amount: +hoistRate.toFixed(2),
        }))
      : undefined;

  const job = {
    bookingId,
    jobId: bookingId,
    id: bookingId,
    companyId,
    isTotalMobility: true,
    tmUsed: true,
    source: 'manual_owner',
    manuallyAddedByCompany: true,
    manuallyAddedAt: now,
    manuallyAddedBy: addedBy,
    tmTripCategory: 'Manually added by company',
    status: 'completed',
    jobstatus: 'completed',
    completedAt,
    completedAt_ISO: new Date(completedAt).toISOString(),
    startedAt: completedAt,
    startedAt_ISO: new Date(completedAt).toISOString(),
    pickupAddress: pickup,
    dropAddress: dropoff,
    pickup,
    dropoff,
    distanceKm: distanceKm != null ? distanceKm : undefined,
    distance: distanceKm != null ? distanceKm : undefined,
    driverName,
    driverId: driverId || undefined,
    vehicleId,
    vehicle: vehicleId,
    fare: meterFare,
    totalFare: meterFare,
    tmMeterFare: meterFare,
    tmTotalFare: +(meterFare + hoistTotal).toFixed(2),
    tmPaymentType: 'total_mobility',
    paymentCategory: 'total_mobility',
    paymentType,
    paymentMethod: paymentType,
    tmRemainderPaymentType: paymentType,
    tmCouncilPays: meterClaim,
    tmPassengerPays: passengerPays,
    tmSubsidy: meterClaim,
    councilPays: meterClaim,
    passengerPays,
    tmSubsidyFare: meterClaim,
    tmSubsidyHoist: hoistTotal,
    hoistTotal,
    hoistCount: hoistUses,
    tmHoistCount: hoistUses,
    tmHoists,
    tmCardNumber: card || undefined,
    tmCardName: cardName || undefined,
    tmCardExpiry: cardExpiry || undefined,
    tmVoucherNo: card || undefined,
    passengerName: cardName || undefined,
    councilId: councilId || undefined,
    tmCouncilId: councilId || undefined,
    tmSubsidyPercent:
      num(cfg.councilSubsidyPercent ?? cfg.councilPercent ?? cfg.subsidyPercent) || undefined,
  };

  // Drop undefined keys for clean Firebase write
  const out = {};
  for (const [k, v] of Object.entries(job)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function buildManualTmTripStatus(job, opts = {}) {
  const now = Number(opts.nowMs) || Date.now();
  const companyId = str(opts.companyId || job.companyId);
  const councilId = str(opts.councilId || job.councilId || job.tmCouncilId);
  const addedBy = str(opts.addedBy || job.manuallyAddedBy || 'owner');
  const eventKey = '-e' + now + '_manual';
  return {
    status: 'pending',
    councilId,
    companyId,
    submittedAt: now,
    source: 'manual_owner',
    manuallyAddedByCompany: true,
    manuallyAddedAt: now,
    manuallyAddedBy: addedBy,
    isTotalMobility: true,
    tmCardNumber: job.tmCardNumber,
    tmCouncilPays: job.tmCouncilPays,
    tmPassengerPays: job.tmPassengerPays,
    events: {
      [eventKey]: {
        at: now,
        type: 'manual_owner_created',
        by: addedBy,
        note: 'Manually added by company',
        toStatus: 'pending',
      },
    },
  };
}
