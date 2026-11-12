// View registry. Each view is { id, title, render(dataset) => HTMLElement }.
// To add a new report, write a view object and add it to the `views` array.

import { countBy } from './data.js';

const el = (tag, attrs = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const child of children.flat()) {
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
};

function breakdownTable(title, rows, column) {
  return el(
    'section',
    { class: 'card' },
    el('h3', {}, title),
    el(
      'table',
      { class: 'compact' },
      el('tbody', {}, countBy(rows, column).map(([k, n]) => el('tr', {}, el('td', {}, k), el('td', { class: 'num' }, n))))
    )
  );
}

const overview = {
  id: 'overview',
  title: 'Overview',
  render({ members }) {
    return el(
      'div',
      { class: 'grid' },
      el('section', { class: 'card stat' }, el('div', { class: 'stat-value' }, members.length), el('div', { class: 'stat-label' }, 'Records in file')),
      breakdownTable('Membership state', members, 'Membership state'),
      breakdownTable('Membership type', members, 'Membership')
    );
  },
};

const memberList = {
  id: 'members',
  title: 'Members',
  render({ members }) {
    const columns = ['First name', 'Last name', 'Membership', 'Membership state', 'Member since', 'Expires on'];
    const search = el('input', { type: 'search', placeholder: 'Search members…', class: 'search' });
    const tbody = el('tbody');
    const count = el('span', { class: 'muted' });

    const draw = () => {
      const q = search.value.trim().toLowerCase();
      const filtered = q
        ? members.filter((m) => columns.some((c) => (m[c] || '').toLowerCase().includes(q)))
        : members;
      tbody.replaceChildren(...filtered.map((m) => el('tr', {}, columns.map((c) => el('td', {}, m[c] || '')))));
      count.textContent = `${filtered.length} of ${members.length}`;
    };
    search.addEventListener('input', draw);
    draw();

    return el(
      'section',
      { class: 'card' },
      el('div', { class: 'toolbar' }, search, count),
      el('div', { class: 'table-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, columns.map((c) => el('th', {}, c)))), tbody))
    );
  },
};

const columnsView = {
  id: 'columns',
  title: 'Data fields',
  render({ headers, members }) {
    return el(
      'section',
      { class: 'card' },
      el('p', { class: 'muted' }, 'Fields found in the CSV and how many records have a value for each.'),
      el(
        'table',
        { class: 'compact' },
        el('thead', {}, el('tr', {}, el('th', {}, 'Field'), el('th', { class: 'num' }, 'Populated'))),
        el('tbody', {}, headers.map((h) => el('tr', {}, el('td', {}, h), el('td', { class: 'num' }, members.filter((m) => m[h]).length))))
      )
    );
  },
};

export const views = [overview, memberList, columnsView];
