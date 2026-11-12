// App bootstrap: load data, build navigation, render the selected view.

import { loadLatestMembers } from './data.js';
import { views } from './views.js';

const nav = document.getElementById('nav');
const main = document.getElementById('main');
const sourceInfo = document.getElementById('source-info');
const reloadBtn = document.getElementById('reload');

let dataset = null;
let currentView = (location.hash.slice(1) || views[0].id);

function renderNav() {
  nav.replaceChildren(
    ...views.map((v) => {
      const a = document.createElement('a');
      a.href = `#${v.id}`;
      a.textContent = v.title;
      if (v.id === currentView) a.classList.add('active');
      return a;
    })
  );
}

function renderView() {
  renderNav();
  if (!dataset) return;
  const view = views.find((v) => v.id === currentView) || views[0];
  const heading = document.createElement('h2');
  heading.textContent = view.title;
  main.replaceChildren(heading, view.render(dataset));
}

async function load() {
  main.innerHTML = '<p class="muted">Loading members…</p>';
  sourceInfo.textContent = '';
  try {
    dataset = await loadLatestMembers();
    sourceInfo.textContent = `${dataset.file} · updated ${dataset.modified.toLocaleString('en-GB')}`;
    renderView();
  } catch (err) {
    dataset = null;
    main.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `Could not load members: ${err.message}`;
    main.append(p);
  }
}

window.addEventListener('hashchange', () => {
  currentView = location.hash.slice(1) || views[0].id;
  renderView();
});
reloadBtn.addEventListener('click', load);

renderNav();
load();
