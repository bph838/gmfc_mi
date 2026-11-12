// Data access layer: fetches the latest members CSV from the local server
// and turns it into a dataset the views can use.

import { parseCsv } from './csv.js';

export async function loadLatestMembers() {
  const res = await fetch('/api/members/latest');
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);

  const { headers, rows } = parseCsv(body.csv);
  return {
    file: body.file,
    modified: new Date(body.modified),
    headers,
    members: rows,
  };
}

/** The club's membership year starts on this month (0-based: 4 = May). */
export const YEAR_START_MONTH = 4;

/** Parse an ISO date string (YYYY-MM-DD) as a local date. Returns null if blank/invalid. */
export function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d) ? null : d;
}

/**
 * The membership year containing `date`: 1 May to 30 April.
 * Returns { start, end (exclusive), label, months: [Date x12] }.
 */
export function membershipYear(date = new Date()) {
  const startYear = date.getMonth() >= YEAR_START_MONTH ? date.getFullYear() : date.getFullYear() - 1;
  const start = new Date(startYear, YEAR_START_MONTH, 1);
  const end = new Date(startYear + 1, YEAR_START_MONTH, 1);
  const months = Array.from({ length: 12 }, (_, i) => new Date(startYear, YEAR_START_MONTH + i, 1));
  return { start, end, label: `${startYear}/${String(startYear + 1).slice(-2)}`, months };
}

/** Age in whole years on a given date. */
export function ageOn(dob, date = new Date()) {
  let age = date.getFullYear() - dob.getFullYear();
  const birthdayThisYear = new Date(date.getFullYear(), dob.getMonth(), dob.getDate());
  if (date < birthdayThisYear) age--;
  return age;
}

export const formatDate = (d) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Count rows by the value of a column, sorted descending. */
export function countBy(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const key = row[column] || '(blank)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
