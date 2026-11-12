// Sortable table component.
//
// const t = sortableTable({
//   columns: [
//     { label: 'Name', value: (row) => row.name },                 // sort key (string/number/Date)
//     { label: 'Age', value: (row) => row.age, num: true },        // num: right-aligned
//     { label: 'Email', value: (row) => row.email, render: (row) => el('a', ...) }, // custom cell
//   ],
//   rows,
//   sort: { column: 1, dir: 'asc' },   // optional initial sort
// });
// container.append(t.element);  t.setRows(newRows);  // e.g. after filtering

import { el } from './dom.js';

const collator = new Intl.Collator('en-GB', { numeric: true, sensitivity: 'base' });

function compare(a, b) {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1; // blanks always last
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collator.compare(String(a), String(b));
}

export function sortableTable({ columns, rows = [], sort = null, className = '' }) {
  let data = rows;
  let state = sort ? { ...sort } : null;

  const headers = columns.map((col, i) => {
    const btn = el('button', { type: 'button', class: 'sort-btn' }, col.label, el('span', { class: 'sort-ind', 'aria-hidden': 'true' }));
    btn.addEventListener('click', () => {
      state = state && state.column === i ? { column: i, dir: state.dir === 'asc' ? 'desc' : 'asc' } : { column: i, dir: 'asc' };
      draw();
    });
    return el('th', { class: col.num ? 'num' : '' }, btn);
  });

  const tbody = el('tbody');
  const table = el('table', { class: `sortable ${className}`.trim() }, el('thead', {}, el('tr', {}, headers)), tbody);
  const element = el('div', { class: 'table-wrap' }, table);

  function draw() {
    headers.forEach((th, i) => {
      const active = state && state.column === i;
      th.setAttribute('aria-sort', active ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none');
      th.querySelector('.sort-ind').textContent = active ? (state.dir === 'asc' ? '▲' : '▼') : '';
    });

    let sorted = data;
    if (state) {
      const col = columns[state.column];
      const sign = state.dir === 'asc' ? 1 : -1;
      sorted = data
        .map((row, idx) => ({ row, idx, key: col.value(row) }))
        .sort((a, b) => {
          const blankA = a.key === null || a.key === undefined || a.key === '';
          const blankB = b.key === null || b.key === undefined || b.key === '';
          if (blankA !== blankB) return blankA ? 1 : -1; // blanks last in either direction
          return sign * compare(a.key, b.key) || a.idx - b.idx; // stable
        })
        .map((x) => x.row);
    }

    tbody.replaceChildren(
      ...sorted.map((row) =>
        el(
          'tr',
          {},
          columns.map((col) => {
            const content = col.render ? col.render(row) : col.value(row);
            return el('td', { class: col.num ? 'num' : '' }, content instanceof Date ? content.toLocaleDateString('en-GB') : content ?? '');
          })
        )
      )
    );
  }

  draw();
  return {
    element,
    setRows(newRows) {
      data = newRows;
      draw();
    },
  };
}
