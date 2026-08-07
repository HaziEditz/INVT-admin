/**
 * Owner-panel trip visibility helpers (TM claims + Account billing/reports).
 * Pure Node module — mirrored into server.js client page scripts; keep in sync.
 */
'use strict';

function isOwnerTmCompletedJob(j) {
  if (!j || typeof j !== 'object') return false;
  if (j.isTotalMobility === true || j.tmUsed === true) return true;
  var pt = String(j.paymentType || j.payment_type || j.PaymentType || j.paymentMethod || '')
    .toLowerCase()
    .replace(/[_\s-]/g, '');
  if (pt === 'totalmobility' || pt === 'tm') return true;
  if (j.tmPaymentType === 'total_mobility' || j.paymentCategory === 'total_mobility') return true;
  if (j.tmCouncilPays != null || j.councilPays != null || j.tmSubsidyFare != null || j.tmSubsidy != null) {
    return true;
  }
  if (j.tmCardNumber || j.tmVoucherNo) return true;
  if (Array.isArray(j.tmHoists) && j.tmHoists.length > 0) return true;
  return false;
}

/** Prefer paymentMethod, fall back to paymentType (driver + dispatch shapes). */
function normalizePaymentMethod(j) {
  if (!j || typeof j !== 'object') return '';
  return String(
    j.paymentMethod ||
      j.PaymentMethod ||
      j.payment ||
      j.Payment ||
      j.payType ||
      j.paymentType ||
      j.PaymentType ||
      '',
  );
}

function isAccountJob(j) {
  var pm = normalizePaymentMethod(j)
    .toLowerCase()
    .replace(/[_\s-]/g, '');
  return pm === 'account' || pm.indexOf('account') !== -1;
}

/**
 * Match a completed job to businessAccounts/{cid}/{key}.
 * Driver app writes accountId / Account_id / jobAccountId (Firebase key or number).
 */
function resolveBusinessAccountKey(j, accts, keyByCode, keyByNum) {
  accts = accts || {};
  keyByCode = keyByCode || {};
  keyByNum = keyByNum || {};
  if (!j || typeof j !== 'object') return '__unmatched__';

  var idCandidates = [
    j.businessAccountId,
    j.accountId,
    j.Account_id,
    j.AccountId,
    j.jobAccountId,
  ];
  for (var i = 0; i < idCandidates.length; i++) {
    var id = idCandidates[i];
    if (id != null && id !== '' && accts[id]) return String(id);
  }

  if (j.accountCode && keyByCode[String(j.accountCode).toUpperCase()]) {
    return keyByCode[String(j.accountCode).toUpperCase()];
  }

  var numCandidates = [
    j.accountNumber,
    j.Account_Number,
    j.AccountNumber,
    j.accountId,
    j.Account_id,
    j.AccountId,
    j.jobAccountId,
  ];
  for (var n = 0; n < numCandidates.length; n++) {
    var num = numCandidates[n];
    if (num != null && num !== '' && keyByNum[String(num)]) return keyByNum[String(num)];
  }
  return '__unmatched__';
}

function jobRecordId(k, j) {
  return String((j && (j.bookingId || j.jobId || j.BookingId)) || k);
}

/** Merge completedJobs + closedJobs + tmTripStatus stubs (council/SA style). */
function mergeOwnerTmJobMap(completedJobs, closedJobs, statusData) {
  var map = {};

  function absorb(data, source) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (k) {
      var j = data[k];
      if (!j || typeof j !== 'object') return;
      // Skip nested non-job bags
      var vals = Object.values(j);
      var looksNested =
        vals.length > 0 && vals.every(function (v) {
          return v !== null && typeof v === 'object' && !Array.isArray(v);
        });
      if (looksNested && !(j.paymentType || j.paymentMethod || j.isTotalMobility || j.tmUsed || j.fare != null || j.totalFare != null)) {
        Object.keys(j).forEach(function (dk) {
          var inner = j[dk];
          if (!inner || typeof inner !== 'object') return;
          var id = jobRecordId(k, inner);
          if (!map[id]) map[id] = { _key: id };
          Object.assign(map[id], inner);
          map[id]._key = id;
        });
        return;
      }
      var id = jobRecordId(k, j);
      if (!map[id]) map[id] = { _key: id };
      Object.assign(map[id], j);
      map[id]._key = id;
    });
  }

  absorb(completedJobs, 'completedJobs');
  absorb(closedJobs, 'closedJobs');

  Object.keys(statusData || {}).forEach(function (k) {
    var st = statusData[k];
    if (!st || typeof st !== 'object') return;
    if (!map[k]) map[k] = { _key: k };
    if (st.status) map[k].tmStatus = st.status;
    if (st.councilId && !map[k].councilId) map[k].councilId = st.councilId;
    if (st.isTotalMobility) map[k].isTotalMobility = true;
    if (st.tmCouncilPays != null && map[k].tmCouncilPays == null) map[k].tmCouncilPays = st.tmCouncilPays;
    if (st.tmPassengerPays != null && map[k].tmPassengerPays == null) {
      map[k].tmPassengerPays = st.tmPassengerPays;
    }
    if (st.tmCardNumber && !map[k].tmCardNumber) map[k].tmCardNumber = st.tmCardNumber;
    if (st.submittedAt && map[k].completedAt == null) map[k].completedAt = st.submittedAt;
    map[k]._key = k;
  });

  return map;
}

function extractTmTripsFromMap(map) {
  var trips = [];
  Object.keys(map || {}).forEach(function (k) {
    var j = map[k];
    if (!isOwnerTmCompletedJob(j)) return;
    j._key = j._key || k;
    trips.push(j);
  });
  return trips;
}

function extractOwnerTmTrips(completedJobs, closedJobs, statusData) {
  return extractTmTripsFromMap(mergeOwnerTmJobMap(completedJobs, closedJobs, statusData));
}

/** NZ calendar month bounds as en-CA YYYY-MM-DD (for AccReport defaults). */
function currentMonthDateBounds(now, timeZone) {
  var tz = timeZone || 'Pacific/Auckland';
  var d = now instanceof Date ? now : new Date(now || Date.now());
  var ds = d.toLocaleDateString('en-CA', { timeZone: tz });
  var parts = ds.split('-');
  var y = parseInt(parts[0], 10);
  var m = parseInt(parts[1], 10);
  var mStr = String(m).padStart(2, '0');
  var last = new Date(y, m, 0).getDate();
  return {
    from: y + '-' + mStr + '-01',
    to: y + '-' + mStr + '-' + String(last).padStart(2, '0'),
  };
}

module.exports = {
  isOwnerTmCompletedJob,
  normalizePaymentMethod,
  isAccountJob,
  resolveBusinessAccountKey,
  mergeOwnerTmJobMap,
  extractTmTripsFromMap,
  extractOwnerTmTrips,
  currentMonthDateBounds,
  jobRecordId,
};
