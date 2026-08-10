/**
 * Company-timezone calendar day bounds.
 * Keep in sync with window._tzDayStart / _tzDayEnd in server.js commonScripts.
 */
'use strict';

function pad2(n) {
  return (n < 10 ? '0' : '') + n;
}

/** Next calendar YYYY-MM-DD after ymd (UTC-date arithmetic on Y/M/D parts). */
function nextYmd(ymd) {
  var p = String(ymd || '').split('-').map(Number);
  if (p.length !== 3 || !p[0]) return '';
  var dt = new Date(Date.UTC(p[0], p[1] - 1, p[2] + 1));
  return dt.getUTCFullYear() + '-' + pad2(dt.getUTCMonth() + 1) + '-' + pad2(dt.getUTCDate());
}

/**
 * Unix-ms for 00:00:00 on ymd in IANA timezone.
 * Mirrors owner-panel window._tzDayStart (offset sampled at UTC noon probe).
 */
function tzDayStart(ymd, timeZone) {
  var z = timeZone || 'Pacific/Auckland';
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(String(ymd))) return 0;
  var p = String(ymd).split('-').map(Number);
  var probe = new Date(Date.UTC(p[0], p[1] - 1, p[2], 12, 0, 0));
  var inTZ = new Date(probe.toLocaleString('en-CA', { timeZone: z, hour12: false }));
  var inUTC = new Date(probe.toLocaleString('en-CA', { timeZone: 'UTC', hour12: false }));
  var offsetMs = inTZ - inUTC;
  return Date.UTC(p[0], p[1] - 1, p[2]) - offsetMs;
}

/** Inclusive end-of-day ms for ymd in timezone (= next midnight - 1ms). */
function tzDayEnd(ymd, timeZone) {
  var start = tzDayStart(ymd, timeZone);
  if (!start) return 0;
  var next = nextYmd(ymd);
  var nextStart = tzDayStart(next, timeZone);
  return nextStart ? nextStart - 1 : start + 24 * 60 * 60 * 1000 - 1;
}

/** Activity timestamp for a shift session: end / loggedAt preferred over start. */
function sessionActivityTs(session) {
  if (!session || typeof session !== 'object') return 0;
  return (
    session.endTs ||
    session.loggedAt ||
    session.shiftEndAt ||
    session.endTime ||
    session.startTs ||
    session.shiftStartAt ||
    session.startTime ||
    0
  );
}

/**
 * Whether a shift session belongs in [rangeStart, rangeEnd].
 * Closed sessions: interval overlap. Open / single-point: activity in range.
 */
function sessionOverlapsRange(session, rangeStart, rangeEnd) {
  var s = session && (session.startTs || session._startTs) ? session.startTs || session._startTs : 0;
  var e = session && (session.endTs || session._endTs) ? session.endTs || session._endTs : 0;
  var act =
    (session && (session.activityTs || session._activityTs || session.loggedAt)) ||
    e ||
    s ||
    0;
  var from = rangeStart || 0;
  var to = rangeEnd || Number.MAX_SAFE_INTEGER;
  if (s && e) return s <= to && e >= from;
  if (!act) return false;
  return act >= from && act <= to;
}

module.exports = {
  pad2: pad2,
  nextYmd: nextYmd,
  tzDayStart: tzDayStart,
  tzDayEnd: tzDayEnd,
  sessionActivityTs: sessionActivityTs,
  sessionOverlapsRange: sessionOverlapsRange,
};
