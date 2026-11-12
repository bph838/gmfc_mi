// View registry. Each view is { id, title, render(dataset) => HTMLElement }.
// To add a new report, write a view object and add it to the `views` array.

import { countBy, parseDate, membershipYear, formatDate } from './data.js';
import { columnChart } from './charts.js';

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

const joiners = {
  id: 'joiners',
  title: 'Joiners',
  render({ members }) {
    const today = new Date();
    const year = membershipYear(today);
    const undated = members.filter((m) => !parseDate(m['Member since'])).length;

    const joined = members
      .map((m) => ({ m, since: parseDate(m['Member since']) }))
      .filter(({ since }) => since && since >= year.start && since < year.end)
      .sort((a, b) => a.since - b.since);

    const monthName = (d, style = 'short') => d.toLocaleDateString('en-GB', { month: style });
    const data = year.months.map((monthStart) => {
      const n = joined.filter(({ since }) => since.getFullYear() === monthStart.getFullYear() && since.getMonth() === monthStart.getMonth()).length;
      const future = monthStart > today;
      const name = `${monthName(monthStart, 'long')} ${monthStart.getFullYear()}`;
      return {
        label: monthName(monthStart),
        value: n,
        muted: future,
        tooltip: future ? `${name}: still to come` : `${name}: ${n} joined`,
      };
    });

    const lastDay = new Date(year.end.getTime() - 86400000);
    const header = el(
      'div',
      { class: 'grid' },
      el(
        'section',
        { class: 'card stat' },
        el('div', { class: 'stat-value' }, joined.length),
        el('div', { class: 'stat-label' }, `Joined in ${year.label} (${formatDate(year.start)} – ${formatDate(lastDay)})`)
      ),
      el(
        'section',
        { class: 'card stat' },
        el('div', { class: 'stat-value' }, undated),
        el('div', { class: 'stat-label' }, 'Records with no "Member since" date (not counted)')
      )
    );

    const chart = el(
      'section',
      { class: 'card' },
      el('h3', {}, `New members by month, ${year.label}`),
      columnChart(data, { ariaLabel: `New members by month, ${year.label}` })
    );

    const cols = ['First name', 'Last name', 'Membership', 'Membership state'];
    const list = el(
      'section',
      { class: 'card' },
      el('h3', {}, 'Members joined this year'),
      joined.length
        ? el(
            'div',
            { class: 'table-wrap' },
            el(
              'table',
              {},
              el('thead', {}, el('tr', {}, el('th', {}, 'Member since'), cols.map((c) => el('th', {}, c)))),
              el('tbody', {}, joined.map(({ m, since }) => el('tr', {}, el('td', {}, formatDate(since)), cols.map((c) => el('td', {}, m[c] || '')))))
            )
          )
        : el('p', { class: 'muted' }, 'No members have joined yet this year.')
    );

    return el('div', { class: 'stack' }, header, chart, list);
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

export const views = [overview, joiners, memberList, columnsView];
