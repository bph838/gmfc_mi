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

/** Count rows by the value of a column, sorted descending. */
export function countBy(rows, column) {
  const counts = new Map();
  for (const row of rows) {
    const key = row[column] || '(blank)';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}
