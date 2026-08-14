/**
 * Browser/Node-safe TM usage aggregators (mirror of tmUnifiedTrips Insights buckets).
 * Used by owner TM Usage tab and SA TM-Reports so formulas stay aligned with council.
 *
 * Keep in sync with INVT-superadmin/src/lib/tmUnifiedTrips.ts aggregateTripUsage /
 * aggregateUsageByDay / aggregateUsageByMonth / formatPayByType.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.TmUsageAggregate = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function subsidyOf(t) {
    var hoist = hoistPaysOf(t);
    if (t && t.tmSubsidyFare != null && t.tmSubsidyFare !== '') {
      return parseFloat(String(t.tmSubsidyFare)) || 0;
    }
    var combined =
      parseFloat(String(t && t.tmSubsidy != null ? t.tmSubsidy : (t && t.tmCouncilPays) || 0)) || 0;
    return Math.max(0, +(combined - hoist).toFixed(2));
  }

  function hoistPaysOf(t) {
    return parseFloat(String((t && (t.tmSubsidyHoist != null ? t.tmSubsidyHoist : t.hoistTotal != null ? t.hoistTotal : t.hoistCost)) || 0)) || 0;
  }

  function hoistUsesOf(t) {
    if (Array.isArray(t && t.tmHoists) && t.tmHoists.length) return t.tmHoists.length;
    var counted = parseInt(String((t && (t.tmHoistCount != null ? t.tmHoistCount : t.hoistCount != null ? t.hoistCount : t.hoistUsed)) || ''), 10);
    if (Number.isFinite(counted) && counted > 0) return counted;
    return hoistPaysOf(t) > 0 ? 1 : 0;
  }

  function meterFareOf(t) {
    return parseFloat(String((t && (t.tmMeterFare != null ? t.tmMeterFare : t.fare != null ? t.fare : t.Fare != null ? t.Fare : t.meterFare)) || 0)) || 0;
  }

  function passengerPaysOf(t) {
    var council = subsidyOf(t);
    var explicit = parseFloat(String((t && (t.tmPassengerPays != null ? t.tmPassengerPays : t.passengerPays != null ? t.passengerPays : t.patientPays)) || ''));
    if (Number.isFinite(explicit) && explicit > 0) return explicit;
    return Math.max(0, +(meterFareOf(t) - council).toFixed(2));
  }

  function normalizeTripPayMethod(t) {
    var raw = String(
      (t &&
        (t.paymentType ||
          t.PaymentType ||
          t.paymentMethod ||
          t.PaymentMethod ||
          t.payMethod ||
          t.tmPaymentType ||
          t.tmPassengerPaymentType)) ||
        '',
    ).trim();
    if (!raw || raw === '—') return 'Unknown';
    var lower = raw.toLowerCase();
    if (lower === 'tm' || lower === 'total_mobility' || lower === 'total mobility') return 'TM';
    if (lower === 'eftpos') return 'EFTPOS';
    if (lower === 'card' || lower === 'credit' || lower === 'debit') return 'Card';
    if (lower === 'cash') return 'Cash';
    if (lower === 'account' || lower === 'charge') return 'Account';
    if (lower === 'acc') return 'ACC';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function formatPayByType(payByType) {
    var entries = Object.keys(payByType || {})
      .map(function (k) {
        return [k, payByType[k]];
      })
      .filter(function (e) {
        return e[1] && e[1].trips > 0;
      });
    if (!entries.length) return '—';
    entries.sort(function (a, b) {
      return b[1].trips - a[1].trips || a[0].localeCompare(b[0]);
    });
    return entries
      .map(function (e) {
        return e[0] + ':' + e[1].trips + ' $' + (+e[1].passengerPays).toFixed(2);
      })
      .join(' · ');
  }

  function bumpPayType(payByType, method, passengerPays) {
    var m = String(method || 'Unknown').trim() || 'Unknown';
    if (!payByType[m]) payByType[m] = { trips: 0, passengerPays: 0 };
    payByType[m].trips++;
    payByType[m].passengerPays += passengerPays;
  }

  function roundPayByType(payByType) {
    var out = {};
    Object.keys(payByType || {}).forEach(function (k) {
      out[k] = { trips: payByType[k].trips, passengerPays: +payByType[k].passengerPays.toFixed(2) };
    });
    return out;
  }

  function tripCardKey(t) {
    var vals = [t && t.tmCardNumber, t && t.tmVoucherNo, t && t.cardNumber];
    for (var i = 0; i < vals.length; i++) {
      var s = String(vals[i] || '').trim();
      if (s && s !== '—') return s;
    }
    return '—';
  }

  function tripPassengerLabel(t) {
    return String((t && (t.tmPassengerName || t.passengerName || t.tmCardName || t.cardholderName)) || '').trim() || '—';
  }

  function tripDriverKey(t) {
    return String((t && (t.driverName || t.driverFullName || t.DriverName || t.driverId || t.DriverId)) || '').trim() || '—';
  }

  function tripVehicleKey(t) {
    return String((t && (t.vehicleNo || t.VehicleNo || t.vehicleId || t.callSign || t.CallSign)) || '').trim() || '—';
  }

  function tripActivityMs(t) {
    var raw =
      (t && (t.startedAt_ISO || t.startedAt || t.completedAt_ISO || t.completedAt || t.JobCompleteTime || t.createdAt)) || 0;
    if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;
    var p = Date.parse(String(raw));
    return Number.isFinite(p) ? p : 0;
  }

  function tripDayKey(t) {
    var ms = tripActivityMs(t);
    if (!ms) return '';
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Pacific/Auckland',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(ms));
    } catch (e) {
      return new Date(ms).toISOString().slice(0, 10);
    }
  }

  function tripMonthKeyNz(t) {
    var day = tripDayKey(t);
    return day ? day.slice(0, 7) : '';
  }

  function emptyBucket(key, label) {
    return {
      key: key,
      label: label || key,
      trips: 0,
      meterFare: 0,
      councilPays: 0,
      passengerPays: 0,
      hoistPays: 0,
      payByType: {},
    };
  }

  function bumpUsage(map, key, label, amounts) {
    var k = String(key || '').trim() || '—';
    var row = map[k];
    if (!row) {
      row = emptyBucket(k, label);
      map[k] = row;
    }
    row.trips++;
    row.meterFare += amounts.meterFare;
    row.councilPays += amounts.councilPays;
    row.passengerPays += amounts.passengerPays;
    row.hoistPays += amounts.hoistPays;
    bumpPayType(row.payByType, amounts.payMethod, amounts.passengerPays);
    if (label) row.label = label;
  }

  function sortBuckets(map, limit) {
    var rows = Object.keys(map).map(function (k) {
      var r = map[k];
      return {
        key: r.key,
        label: r.label,
        trips: r.trips,
        meterFare: +r.meterFare.toFixed(2),
        councilPays: +r.councilPays.toFixed(2),
        passengerPays: +r.passengerPays.toFixed(2),
        hoistPays: +r.hoistPays.toFixed(2),
        payByType: roundPayByType(r.payByType),
      };
    });
    rows.sort(function (a, b) {
      return b.trips - a.trips || b.councilPays - a.councilPays;
    });
    if (Number.isFinite(limit) && limit >= 0) rows = rows.slice(0, limit);
    return rows;
  }

  function aggregateTripUsage(trips, limit) {
    var lim = limit == null ? Number.POSITIVE_INFINITY : limit;
    var cards = {};
    var drivers = {};
    var vehicles = {};
    var passengers = {};
    (trips || []).forEach(function (t) {
      var amounts = {
        councilPays: subsidyOf(t),
        hoistPays: hoistPaysOf(t),
        meterFare: meterFareOf(t),
        passengerPays: passengerPaysOf(t),
        payMethod: normalizeTripPayMethod(t),
      };
      var card = tripCardKey(t);
      var paxLabel = tripPassengerLabel(t);
      var cardLabel =
        card !== '—' && paxLabel !== '—' && paxLabel !== card ? paxLabel + ' (' + card + ')' : card === '—' ? paxLabel : paxLabel + ' (' + card + ')';
      bumpUsage(cards, card, cardLabel, amounts);
      bumpUsage(drivers, tripDriverKey(t), tripDriverKey(t), amounts);
      bumpUsage(vehicles, tripVehicleKey(t), tripVehicleKey(t), amounts);
      bumpUsage(passengers, paxLabel + '|' + card, paxLabel === '—' ? card : paxLabel, amounts);
    });
    return {
      byCard: sortBuckets(cards, lim),
      byDriver: sortBuckets(drivers, lim),
      byVehicle: sortBuckets(vehicles, lim),
      byPassenger: sortBuckets(passengers, lim),
    };
  }

  function aggregateByPeriod(trips, keyFn) {
    var map = {};
    (trips || []).forEach(function (t) {
      var key = keyFn(t) || 'unknown';
      if (!map[key]) {
        map[key] = {
          key: key,
          trips: 0,
          meterFare: 0,
          councilPays: 0,
          passengerPays: 0,
          hoistPays: 0,
          hoistUses: 0,
          payByType: {},
        };
      }
      var row = map[key];
      var meter = meterFareOf(t);
      var council = subsidyOf(t);
      var pax = passengerPaysOf(t);
      var hoist = hoistPaysOf(t);
      row.trips++;
      row.meterFare += meter;
      row.councilPays += council;
      row.passengerPays += pax;
      row.hoistPays += hoist;
      row.hoistUses += hoistUsesOf(t);
      bumpPayType(row.payByType, normalizeTripPayMethod(t), pax);
    });
    return Object.keys(map)
      .sort()
      .map(function (k) {
        var r = map[k];
        return {
          key: r.key,
          trips: r.trips,
          meterFare: +r.meterFare.toFixed(2),
          councilPays: +r.councilPays.toFixed(2),
          passengerPays: +r.passengerPays.toFixed(2),
          hoistPays: +r.hoistPays.toFixed(2),
          hoistUses: r.hoistUses,
          payByType: roundPayByType(r.payByType),
        };
      });
  }

  function filterByDateRange(trips, fromYmd, toYmd) {
    var from = String(fromYmd || '').trim();
    var to = String(toYmd || '').trim();
    if (!from && !to) return trips || [];
    return (trips || []).filter(function (t) {
      var day = tripDayKey(t);
      if (!day) return false;
      if (from && day < from) return false;
      if (to && day > to) return false;
      return true;
    });
  }

  return {
    subsidyOf: subsidyOf,
    hoistPaysOf: hoistPaysOf,
    hoistUsesOf: hoistUsesOf,
    meterFareOf: meterFareOf,
    passengerPaysOf: passengerPaysOf,
    normalizeTripPayMethod: normalizeTripPayMethod,
    formatPayByType: formatPayByType,
    tripDayKey: tripDayKey,
    tripMonthKeyNz: tripMonthKeyNz,
    aggregateTripUsage: aggregateTripUsage,
    aggregateUsageByDay: function (trips) {
      return aggregateByPeriod(trips, tripDayKey);
    },
    aggregateUsageByMonth: function (trips) {
      return aggregateByPeriod(trips, tripMonthKeyNz);
    },
    filterByDateRange: filterByDateRange,
  };
});
