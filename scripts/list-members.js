// Lists the CSV files in .members (newest first) and shows which one the app will load.
// Prints file names, dates and record counts only - no member details.

const fs = require('fs');
const path = require('path');

const MEMBERS_DIR = path.join(__dirname, '..', '.members');

if (!fs.existsSync(MEMBERS_DIR)) {
  console.log(`No .members directory found at ${MEMBERS_DIR}`);
  process.exit(1);
}

const files = fs
  .readdirSync(MEMBERS_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.csv'))
  .map((e) => {
    const full = path.join(MEMBERS_DIR, e.name);
    return { name: e.name, full, mtime: fs.statSync(full).mtime };
  })
  .sort((a, b) => b.mtime - a.mtime);

if (!files.length) {
  console.log('No CSV files in .members');
  process.exit(1);
}

// Count records, ignoring line breaks inside quoted fields.
function countRecords(text) {
  let inQuotes = false;
  let lines = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === '\n' && !inQuotes) lines++;
  }
  if (text.length && !text.endsWith('\n')) lines++;
  return Math.max(lines - 1, 0); // minus header row
}

files.forEach((f, i) => {
  const records = countRecords(fs.readFileSync(f.full, 'utf8'));
  const marker = i === 0 ? '* ' : '  ';
  console.log(`${marker}${f.mtime.toLocaleString('en-GB')}  ${String(records).padStart(5)} records  ${f.name}`);
});
console.log('\n* = file the app will load');
