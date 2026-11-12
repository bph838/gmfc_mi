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
