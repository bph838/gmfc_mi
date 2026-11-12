// View registry. Each view is { id, title, render(dataset) => HTMLElement }.
// To add a new report, write a view object and add it to the `views` array.

import { countBy, parseDate, membershipYear, formatDate, ageOn } from './data.js';
import { columnChart, pieChart } from './charts.js';

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

// Age bands for the Ages view. Colours are a validated single-hue ordinal ramp (see styles.css).
const AGE_BANDS = [
  { label: 'Under 18', min: 0, max: 17 },
  { label: '18–39', min: 18, max: 39 },
  { label: '40–59', min: 40, max: 59 },
  { label: '60–74', min: 60, max: 74 },
  { label: '75+', min: 75, max: Infinity },
];
const MAX_PLAUSIBLE_AGE = 100;

const stat = (value, label) =>
  el('section', { class: 'card stat' }, el('div', { class: 'stat-value' }, value), el('div', { class: 'stat-label' }, label));

const ages = {
  id: 'ages',
  title: 'Ages',
  render({ members }) {
    const today = new Date();
    const withAge = members.map((m) => {
      const dob = parseDate(m['Date of birth']);
      return { m, dob, age: dob ? ageOn(dob, today) : null };
    });
    const valid = withAge.filter((x) => x.age !== null && x.age >= 0 && x.age <= MAX_PLAUSIBLE_AGE);
    const suspect = withAge.filter((x) => !valid.includes(x));
    const list = valid.map((x) => x.age).sort((a, b) => a - b);

    const n = list.length;
    const pct = (k) => (n ? `${Math.round((k / n) * 100)}%` : '–');
    const mean = n ? list.reduce((s, a) => s + a, 0) / n : 0;
    const median = n ? (n % 2 ? list[(n - 1) / 2] : (list[n / 2 - 1] + list[n / 2]) / 2) : 0;
    const juniors = list.filter((a) => a < 18).length;
    const over65 = list.filter((a) => a >= 65).length;

    const bands = AGE_BANDS.map((b, i) => {
      const count = list.filter((a) => a >= b.min && a <= b.max).length;
      return {
        ...b,
        value: count,
        color: `var(--age-${i + 1})`,
        tooltip: `${b.label}: ${count} member${count === 1 ? '' : 's'} (${pct(count)})`,
      };
    });

    // Selectable groups: each age band, plus the two KPI groups.
    const groups = new Map([
      ...bands.map((b) => [b.label, { title: b.min === 0 ? b.label : `Aged ${b.label}`, test: (a) => a >= b.min && a <= b.max }]),
      ['under18', { title: 'Under 18', test: (a) => a < 18 }],
      ['65plus', { title: '65 and over', test: (a) => a >= 65 }],
    ]);
    let selected = null;
    const detail = el('div');

    const clickable = (node, key) => {
      node.classList.add('clickable');
      node.dataset.key = key;
      node.tabIndex = 0;
      node.setAttribute('role', 'button');
      node.addEventListener('click', () => select(key));
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(key);
        }
      });
      return node;
    };

    const kpis = el(
      'div',
      { class: 'kpis' },
      stat(n ? mean.toFixed(1) : '–', 'Average age'),
      stat(n ? median : '–', 'Median age'),
      stat(n ? list[0] : '–', 'Youngest'),
      stat(n ? list[n - 1] : '–', 'Oldest'),
      clickable(stat(`${juniors}`, `Under 18 (${pct(juniors)})`), 'under18'),
      clickable(stat(`${over65}`, `65 and over (${pct(over65)})`), '65plus')
    );

    const legend = el(
      'table',
      { class: 'compact legend' },
      el('thead', {}, el('tr', {}, el('th', {}, 'Age band'), el('th', { class: 'num' }, 'Members'), el('th', { class: 'num' }, 'Share'))),
      el(
        'tbody',
        {},
        bands.map((b) =>
          clickable(
            el(
              'tr',
              {},
              el('td', {}, el('span', { class: 'swatch', style: `background:${b.color}` }), b.label),
              el('td', { class: 'num' }, b.value),
              el('td', { class: 'num' }, pct(b.value))
            ),
            b.label
          )
        )
      ),
      el('tfoot', {}, el('tr', {}, el('td', {}, 'Total'), el('td', { class: 'num' }, n), el('td', { class: 'num' }, n ? '100%' : '–')))
    );

    const chartCard = el(
      'section',
      { class: 'card' },
      el('h3', {}, `Members by age band (age today, ${formatDate(today)})`),
      el('p', { class: 'muted' }, 'Click a slice, an age band or the Under 18 / 65 and over tiles to see who is in it.'),
      el(
        'div',
        { class: 'pie-layout' },
        pieChart(bands.map((b) => ({ ...b, key: b.label })), { ariaLabel: 'Members by age band', onSelect: (key) => select(key) }),
        legend
      )
    );

    function select(key) {
      selected = selected === key ? null : key;
      root.querySelectorAll('[data-key]').forEach((node) => {
        const on = node.dataset.key === selected;
        node.classList.toggle('selected', on);
        if (on && node.classList.contains('slice')) node.parentNode.append(node); // draw outline on top
      });

      if (!selected) return detail.replaceChildren();
      const group = groups.get(selected);
      const people = valid.filter((x) => group.test(x.age)).sort((a, b) => a.age - b.age || a.dob - b.dob);
      const close = el('button', { type: 'button', class: 'secondary' }, 'Close');
      close.addEventListener('click', () => select(selected));

      detail.replaceChildren(
        el(
          'section',
          { class: 'card' },
          el('div', { class: 'card-head' }, el('h3', {}, `${group.title}: ${people.length} member${people.length === 1 ? '' : 's'}`), close),
          el(
            'div',
            { class: 'table-wrap' },
            el(
              'table',
              {},
              el('thead', {}, el('tr', {}, ['Name', 'Email', 'Date of birth', 'Age', 'Membership'].map((h) => el('th', { class: h === 'Age' ? 'num' : '' }, h)))),
              el(
                'tbody',
                {},
                people.map(({ m, dob, age }) =>
                  el(
                    'tr',
                    {},
                    el('td', {}, `${m['First name']} ${m['Last name']}`),
                    el('td', {}, m['Email'] ? el('a', { href: `mailto:${m['Email']}` }, m['Email']) : ''),
                    el('td', {}, formatDate(dob)),
                    el('td', { class: 'num' }, age),
                    el('td', {}, m['Membership'] || '')
                  )
                )
              )
            )
          )
        )
      );
      detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    const parts = [kpis, chartCard, detail];
    if (suspect.length) {
      parts.push(
        el(
          'section',
          { class: 'card' },
          el('h3', {}, `Check date of birth (${suspect.length})`),
          el('p', { class: 'muted' }, `Missing, or giving an age over ${MAX_PLAUSIBLE_AGE}. These are left out of the figures above.`),
          el(
            'table',
            { class: 'compact' },
            el('thead', {}, el('tr', {}, el('th', {}, 'Name'), el('th', {}, 'Date of birth'), el('th', {}, 'Membership'))),
            el(
              'tbody',
              {},
              suspect.map(({ m }) =>
                el('tr', {}, el('td', {}, `${m['First name']} ${m['Last name']}`), el('td', {}, m['Date of birth'] || '(blank)'), el('td', {}, m['Membership']))
              )
            )
          )
        )
      );
    }
    const root = el('div', { class: 'stack' }, ...parts);
    return root;
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

export const views = [overview, joiners, ages, memberList, columnsView];
