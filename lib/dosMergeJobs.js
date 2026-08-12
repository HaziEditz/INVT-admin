/**
 * DOS / reports job-source merge — always key by bookingId (+ driver), never by
 * closedJobs Firebase push keys (those triple-count the same trip).
 */

/** Prefer job.bookingId over RTDB node key (push ids like -Ozq…). */
export function dosJobBookingId(job, fallbackKey) {
  const id = String(
    (job &&
      (job.bookingId ||
        job.BookingId ||
        job.jobId ||
        job.JobId ||
        job.BookingID ||
        job.id)) ||
      '',
  ).trim();
  if (id && id !== String(fallbackKey || '').trim()) return id;
  if (id) return id;
  return String(fallbackKey || '').trim();
}

/**
 * Merge joback (nested) + flat feeds (completed/closed/allbookings) into
 * { [bookingId]: { [driverId]: job } }, collapsing push-key duplicates.
 *
 * @param {unknown[]} results [joback, completedJobs, closedJobs, allbookings?]
 */
export function dosMergeJobSources(results) {
  const merged = {};

  function ensure(bid, did) {
    if (!merged[bid]) merged[bid] = {};
    if (!merged[bid][did]) merged[bid][did] = {};
    return merged[bid][did];
  }

  function addNested(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach((key) => {
      const drivers = data[key];
      if (!drivers || typeof drivers !== 'object') return;
      Object.keys(drivers).forEach((did) => {
        const job = drivers[did];
        if (!job || typeof job !== 'object') return;
        const bid = dosJobBookingId(job, key);
        if (!bid) return;
        const d = String(job.driverId || job.DriverId || job.driverid || did || '').trim();
        if (!d) return;
        Object.assign(ensure(bid, d), job);
        if (!ensure(bid, d).bookingId && !ensure(bid, d).BookingId) {
          ensure(bid, d).bookingId = bid;
        }
      });
    });
  }

  function addFlat(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach((key) => {
      const job = data[key];
      if (!job || typeof job !== 'object') return;
      const vals = Object.values(job);
      const isFlat =
        vals.length > 0 && vals.every((v) => v === null || typeof v !== 'object');
      // Nested under booking key (rare for flat feeds)
      if (
        !isFlat &&
        !(
          job.totalFare != null ||
          job.TotalFare != null ||
          job.fare != null ||
          job.driverId ||
          job.DriverId ||
          job.paymentType ||
          job.PaymentType ||
          job.isTotalMobility ||
          job.completedAt != null
        )
      ) {
        Object.keys(job).forEach((did) => {
          const inner = job[did];
          if (!inner || typeof inner !== 'object') return;
          const bid = dosJobBookingId(inner, key);
          const d = String(inner.driverId || inner.DriverId || did || '').trim();
          if (!bid || !d) return;
          Object.assign(ensure(bid, d), inner);
          if (!ensure(bid, d).bookingId) ensure(bid, d).bookingId = bid;
        });
        return;
      }
      const bid = dosJobBookingId(job, key);
      const did = String(job.driverId || job.DriverId || job.driverid || '').trim();
      if (!bid || !did) return;
      Object.assign(ensure(bid, did), job);
      if (!ensure(bid, did).bookingId && !ensure(bid, did).BookingId) {
        ensure(bid, did).bookingId = bid;
      }
    });
  }

  const list = Array.isArray(results) ? results : [];
  addNested(list[0]);
  addFlat(list[1]);
  addFlat(list[2]);
  if (list[3]) addFlat(list[3]);
  return merged;
}

/** Flatten merged map to job array (one per bookingId+driver). */
export function dosFlattenMergedJobs(merged) {
  const out = [];
  if (!merged || typeof merged !== 'object') return out;
  Object.keys(merged).forEach((bid) => {
    Object.keys(merged[bid] || {}).forEach((did) => {
      const j = merged[bid][did];
      if (!j || typeof j !== 'object') return;
      const copy = { ...j };
      copy.bookingId = copy.bookingId || copy.BookingId || bid;
      copy.driverId = copy.driverId || copy.DriverId || did;
      out.push(copy);
    });
  });
  return out;
}
