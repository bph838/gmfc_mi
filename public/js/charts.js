// Small dependency-free SVG chart helpers.

const SVG_NS = 'http://www.w3.org/2000/svg';

const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

/** Path for a column with a 4px rounded top and a square base. */
function columnPath(x, y, w, h, r = 4) {
  r = Math.min(r, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * Pie chart.
 * data: [{ label, value, color (CSS colour or var()), tooltip }]
 * Slices are separated by a 2px surface-coloured gap. Returns a wrapper with a hover tooltip.
 */
export function pieChart(data, { size = 260, ariaLabel = 'Pie chart' } = {}) {
  const r = size / 2;
  const total = data.reduce((s, d) => s + d.value, 0);
  const root = svg('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': ariaLabel, class: 'chart pie' });

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap pie-wrap';
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;

  const point = (angle, radius = r) => [r + radius * Math.sin(angle), r - radius * Math.cos(angle)];
  let angle = 0;

  data.filter((d) => d.value > 0).forEach((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    let shape;
    if (sweep >= Math.PI * 2 - 1e-9) {
      shape = svg('circle', { cx: r, cy: r, r: r - 1 });
    } else {
      const [x1, y1] = point(start, r - 1);
      const [x2, y2] = point(end, r - 1);
      const large = sweep > Math.PI ? 1 : 0;
      shape = svg('path', { d: `M${r},${r} L${x1},${y1} A${r - 1},${r - 1} 0 ${large} 1 ${x2},${y2} Z` });
    }
    shape.setAttribute('class', 'slice');
    shape.style.fill = d.color;
    shape.setAttribute('tabindex', 0);
    shape.setAttribute('aria-label', d.tooltip);

    const [tx, ty] = point(start + sweep / 2, r * 0.6);
    const show = () => {
      tip.textContent = d.tooltip;
      tip.hidden = false;
      tip.style.left = `${(tx / size) * 100}%`;
      tip.style.top = `${(ty / size) * 100}%`;
      shape.classList.add('hover');
    };
    const hide = () => {
      tip.hidden = true;
      shape.classList.remove('hover');
    };
    shape.addEventListener('mouseenter', show);
    shape.addEventListener('focus', show);
    shape.addEventListener('mouseleave', hide);
    shape.addEventListener('blur', hide);
    root.append(shape);
  });

  wrap.append(root, tip);
  return wrap;
}

/**
 * Column chart.
 * data: [{ label, value, tooltip, muted }]  (muted = e.g. a month still to come)
 * Returns a wrapper element containing the SVG and a hover tooltip.
 */
export function columnChart(data, { height = 240, ariaLabel = 'Column chart' } = {}) {
  const width = 720;
  const pad = { top: 24, right: 8, bottom: 28, left: 32 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 0);

  // Clean integer ticks.
  const step = max <= 5 ? 1 : max <= 10 ? 2 : max <= 25 ? 5 : Math.ceil(max / 50) * 10;
  const yMax = Math.max(step, Math.ceil(max / step) * step);
  const y = (v) => pad.top + plotH - (v / yMax) * plotH;

  const root = svg('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': ariaLabel, class: 'chart' });

  for (let t = 0; t <= yMax; t += step) {
    root.append(svg('line', { x1: pad.left, x2: width - pad.right, y1: y(t), y2: y(t), class: t === 0 ? 'axis' : 'grid' }));
    const label = svg('text', { x: pad.left - 8, y: y(t), class: 'tick', 'text-anchor': 'end', 'dominant-baseline': 'middle' });
    label.textContent = t;
    root.append(label);
  }

  const band = plotW / data.length;
  const colW = Math.min(24, band * 0.6);

  const wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  const tip = document.createElement('div');
  tip.className = 'chart-tip';
  tip.hidden = true;

  data.forEach((d, i) => {
    const cx = pad.left + band * i + band / 2;
    const g = svg('g', { class: `col${d.muted ? ' muted' : ''}`, tabindex: 0, 'aria-label': d.tooltip });

    // Hit target: the full band, so hovering is easy even for short/zero columns.
    g.append(svg('rect', { x: cx - band / 2, y: pad.top, width: band, height: plotH, class: 'hit' }));
    if (d.value > 0) {
      g.append(svg('path', { d: columnPath(cx - colW / 2, y(d.value), colW, y(0) - y(d.value)), class: 'bar' }));
      const val = svg('text', { x: cx, y: y(d.value) - 6, class: 'value', 'text-anchor': 'middle' });
      val.textContent = d.value;
      g.append(val);
    }
    const lbl = svg('text', { x: cx, y: height - 8, class: 'tick', 'text-anchor': 'middle' });
    lbl.textContent = d.label;
    g.append(lbl);

    const show = () => {
      tip.textContent = d.tooltip;
      tip.hidden = false;
      tip.style.left = `${(cx / width) * 100}%`;
      tip.style.top = `${(y(d.value) / height) * 100}%`;
      g.classList.add('hover');
    };
    const hide = () => {
      tip.hidden = true;
      g.classList.remove('hover');
    };
    g.addEventListener('mouseenter', show);
    g.addEventListener('focus', show);
    g.addEventListener('mouseleave', hide);
    g.addEventListener('blur', hide);
    root.append(g);
  });

  wrap.append(root, tip);
  return wrap;
}
