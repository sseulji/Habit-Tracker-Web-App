// Wall-clock helpers for a user's IANA time zone, without a date library.
// A "local date" is 'YYYY-MM-DD'; a "local time" is minutes since local midnight.

const formatters = new Map();

function formatter(tz) {
  if (!formatters.has(tz)) {
    formatters.set(tz, new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }));
  }
  return formatters.get(tz);
}

export function isValidTimeZone(tz) {
  try {
    formatter(tz);
    return true;
  } catch {
    return false;
  }
}

// { date: 'YYYY-MM-DD', minutes } for an instant, in the given zone.
export function zonedParts(instant, tz) {
  const parts = Object.fromEntries(formatter(tz).formatToParts(instant).map(p => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function offsetMs(ts, tz) {
  const { date, minutes } = zonedParts(new Date(ts), tz);
  const [y, m, d] = date.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d, 0, minutes);
  return asUtc - Math.floor(ts / 60000) * 60000;
}

// The UTC instant (ms) of a local date + local minutes in the given zone.
export function zonedToUtc(date, minutes, tz) {
  const [y, m, d] = date.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  const first = guess - offsetMs(guess, tz);
  const second = guess - offsetMs(first, tz); // settles DST edges
  return second;
}

export function addDays(date, n) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// 0 = Sunday … 6 = Saturday
export function weekdayOf(date) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Monday of the week containing `date`.
export function weekStart(date) {
  return addDays(date, -((weekdayOf(date) + 6) % 7));
}

export function formatMinutes(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
