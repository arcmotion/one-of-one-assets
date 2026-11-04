// Reusable delivery site. A project changes brand.json and its assets, never this file.
const q = (selector, root = document) => root.querySelector(selector);
const qa = (selector, root = document) => [...root.querySelectorAll(selector)];

const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
function merge(base, extra) {
  const out = { ...base };
  for (const [key, value] of Object.entries(extra ?? {})) out[key] = isObject(value) && isObject(base[key]) ? merge(base[key], value) : value;
  return out;
}
const safeUrl = url => (typeof url === 'string' && !/^\s*(javascript|data|vbscript):/i.test(url) ? url : null);
const getJson = async path => { const res = await fetch(path); if (!res.ok) throw new Error(path); return res.json(); };

let data;
const fill = text => String(text ?? '').replace(/\{(\w+)\}/g, (_, key) => data.brand[key] ?? '');
const copy = path => fill(path.split('.').reduce((node, key) => node?.[key], data.copy));

// A link with no address yet stays visible as a dashed, unclickable button.
function setLink(a, link, label) {
  const href = safeUrl(link?.href);
  const text = label ?? link?.label ?? '';
  if (!link?.size) a.textContent = text;
  else a.textContent = text.endsWith(')') ? `${text.slice(0, -1)}, ${link.size})` : `${text} (${link.size})`;
  a.classList.toggle('pending', !href);
  if (href) {
    a.href = href;
    a.removeAttribute('aria-disabled');
    a.removeAttribute('title');
    const external = /^https?:/i.test(href);
    if (external) { a.target = '_blank'; a.rel = 'noopener'; a.removeAttribute('download'); } else { a.setAttribute('download', link.name ?? ''); }
  } else {
    a.removeAttribute('href');
    a.setAttribute('aria-disabled', 'true');
    a.title = copy('pending');
  }
  return a;
}
function newLink(link, label, className = 'btn') { const a = document.createElement('a'); a.className = className; return setLink(a, link, label); }
function setImage(img, src, fallback) {
  img.onerror = () => { img.onerror = null; img.src = fallback; };
  img.src = safeUrl(src) ?? fallback;
}

function renderHero() {
  const box = q('[data-hero-media]');
  const video = safeUrl(data.hero.video);
  if (video) {
    const el = document.createElement('video');
    Object.assign(el, { src: video, muted: true, loop: true, playsInline: true, autoplay: !matchMedia('(prefers-reduced-motion: reduce)').matches });
    if (data.hero.poster) el.poster = data.hero.poster;
    el.setAttribute('aria-hidden', 'true');
    box.append(el);
  } else {
    const img = document.createElement('img');
    img.className = 'hero-media';
    img.alt = '';
    setImage(img, data.hero.image, 'assets/placeholders/hero.svg');
    box.append(img);
  }
  setLink(q('[data-hero-download]'), data.hero.download);
}

function radio(name, value, label, checked) {
  const el = document.createElement('label');
  el.className = 'pick';
  const input = Object.assign(document.createElement('input'), { type: 'radio', name, value, checked });
  const mark = Object.assign(document.createElement('span'), { className: 'mark' });
  el.append(input, mark, label);
  return el;
}

function renderLogo() {
  const { versions, colours, formats } = data.logo;
  if (!versions.length) { q('[data-section="logo"]').hidden = true; return; }
  const versionBox = q('[data-versions]');
  const colourBox = q('[data-colours]');
  const versionHint = q('[data-version-hint]');
  const colourHint = q('[data-colour-hint]');
  versions.forEach((v, i) => versionHint.before(radio('version', v.id, v.label, i === 0)));
  colours.forEach((c, i) => colourHint.before(radio('colour', c.id, c.label, i === 0)));
  versionBox.hidden = versions.length < 2;
  colourBox.hidden = colours.length < 2;

  const list = q('[data-formats]');
  const rows = formats.map(format => {
    const row = q('#format-row').content.firstElementChild.cloneNode(true);
    q('.fmt', row).textContent = format.label;
    q('[data-use]', row).textContent = format.use;
    if (format.recommended) q('a', row).classList.add('solid');
    list.append(row);
    return { format, row };
  });

  const stage = q('[data-stage]');
  function update() {
    const version = versions.find(v => v.id === q('input[name=version]:checked').value);
    const available = c => !version.previews || version.previews[c.id];
    qa('input[name=colour]').forEach(input => {
      input.disabled = !available(colours.find(c => c.id === input.value));
      input.closest('.pick').style.opacity = input.disabled ? 0.35 : 1;
    });
    let picked = q('input[name=colour]:checked');
    if (picked.disabled) { picked = qa('input[name=colour]').find(input => !input.disabled); picked.checked = true; }
    const colour = colours.find(c => c.id === picked.value);
    stage.style.background = colour.stage;
    stage.style.setProperty('--w', `${version.width ?? 60}%`);
    q('img', stage).alt = `${data.brand.name} ${version.label}, ${colour.label}`;
    setImage(q('img', stage), version.previews?.[colour.id], 'assets/placeholders/logo-horizontal-dark.svg');
    versionHint.textContent = version.hint ?? '';
    colourHint.textContent = colour.hint ?? '';
    rows.forEach(({ format, row }) => {
      const file = version.files?.[colour.id]?.[format.id];
      q('small', row).textContent = file?.name ? [file.name, file.size].filter(Boolean).join(', ') : copy('pending');
      row.hidden = data.brandReady && !file;
      setLink(q('a', row), { ...file, size: null }, fill(copy('download')).replace('{format}', '') + format.label);
    });
  }
  q('.logo-tool').addEventListener('change', update);
  update();

  q('[data-guides]').append(...data.logo.guides.map(guide => {
    const box = document.createElement('details');
    const title = Object.assign(document.createElement('summary'), { textContent: guide.title });
    const steps = document.createElement(guide.ordered ? 'ol' : 'ul');
    guide.items.forEach(item => steps.append(Object.assign(document.createElement('li'), { textContent: fill(item) })));
    box.append(title, steps);
    return box;
  }));
  setLink(q('[data-logo-download]'), data.logo.download);
}

function renderFavicon() {
  const { colours, sizes, downloads, homeScreen } = data.favicon;
  if (!sizes.length) { q('[data-section="favicon"]').hidden = true; return; }
  q('[data-tabs]').append(...colours.map(colour => {
    const tab = Object.assign(document.createElement('div'), { className: `tab${colour.dark ? ' dark' : ''}` });
    const inner = document.createElement('span');
    const icon = Object.assign(document.createElement('img'), { alt: '' });
    setImage(icon, colour.tabIcon, `assets/placeholders/favicon-${colour.dark ? 'light' : 'dark'}.svg`);
    inner.append(icon, data.brand.name);
    tab.append(inner);
    return tab;
  }));
  q('[data-favicon-downloads]').append(...downloads.map((link, i) => newLink(link, null, i === 0 ? 'btn solid' : 'btn')));
  const head = q('[data-favicon-head]');
  [copy('favicon.size'), ...colours.map(c => c.label)].forEach(label => head.append(Object.assign(document.createElement('th'), { scope: 'col', textContent: label })));
  q('[data-favicon-rows]').append(...sizes.map(size => {
    const row = document.createElement('tr');
    const th = Object.assign(document.createElement('th'), { scope: 'row', textContent: `${size.px} px` });
    th.append(Object.assign(document.createElement('span'), { className: 'sub', textContent: size.use ?? '' }));
    row.append(th);
    colours.forEach(colour => {
      const td = document.createElement('td');
      (size.files?.[colour.id] ?? [{ label: 'PNG' }]).forEach((file, i) => {
        if (i) td.append(' / ');
        td.append(newLink(file, file.label, 'cell-link'));
      });
      row.append(td);
    });
    return row;
  }));
  q('[data-home-screen]').hidden = !homeScreen.length;
  q('[data-home-icons]').append(...homeScreen.map(item => {
    const box = document.createElement('div');
    const img = Object.assign(document.createElement('img'), { alt: '', width: 120, height: 120 });
    setImage(img, item.preview, 'assets/placeholders/icon.svg');
    box.append(img, Object.assign(document.createElement('strong'), { textContent: item.label }), newLink(item, copy('downloadPng'), 'cell-link'));
    return box;
  }));
}

function renderBrandbook() {
  const { cover, download, online } = data.brandbook;
  setImage(q('[data-cover]'), cover, 'assets/placeholders/cover.svg');
  q('[data-cover]').alt = copy('brandbook.title');
  q('[data-brandbook-actions]').append(newLink(download, null, 'btn solid'), newLink(online, null));
}

function renderExternal() {
  const { items, folder } = data.external;
  if (!items.length) { q('[data-section="external"]').hidden = true; return; }
  q('[data-external]').append(...items.map(item => {
    const row = q('#external-row').content.firstElementChild.cloneNode(true);
    const figure = q('figure', row);
    if (item.video) {
      const video = Object.assign(document.createElement('video'), { src: item.video, muted: true, loop: true, playsInline: true, controls: true, preload: 'metadata' });
      if (item.poster) video.poster = item.poster;
      figure.append(video);
      figure.hidden = false;
    } else if (item.image !== undefined) {
      const img = Object.assign(document.createElement('img'), { alt: item.title });
      setImage(img, item.image, 'assets/placeholders/media.svg');
      figure.append(img);
      figure.hidden = false;
    } else row.classList.add('plain');
    q('h3', row).textContent = item.title;
    q('.note', row).textContent = item.note ?? '';
    setLink(q('a', row), item);
    return row;
  }));
  const link = q('[data-folder-link]');
  link.closest('.more').hidden = !safeUrl(folder?.href);
  if (safeUrl(folder?.href)) { link.href = folder.href; link.textContent = folder.label; }
}

function applySections() {
  for (const [name, on] of Object.entries(data.sections)) {
    q(`[data-section="${name}"]`).hidden = !on;
  }
  qa('[data-nav]').forEach(a => { a.hidden = q(`[data-section="${a.dataset.nav}"]`).hidden; });
}

async function start() {
  const fallback = await getJson('content/fallback.json');
  const requested = new URLSearchParams(location.search).get('brand');
  const path = /^examples\/[\w-]+\.json$/.test(requested ?? '') ? requested : 'brand.json';
  const brand = await getJson(path);
  data = merge(fallback, brand);
  data.brandReady = Boolean(brand.brand?.name);
  data.brand.name = data.brand.name || data.brand.placeholderName;
  document.documentElement.lang = data.brand.language;
  document.title = copy('pageTitle');
  qa('[data-copy]').forEach(el => { el.textContent = copy(el.dataset.copy); });
  q('[data-notice]').hidden = data.brandReady;
  document.body.classList.toggle('project', data.brandReady);
  q('[data-brand-link]').setAttribute('aria-label', copy('pageTitle'));
  const dark = data.logo.colours.find(c => c.onLight !== false) ?? data.logo.colours[0];
  setImage(q('[data-bar-logo]'), data.logo.versions[0]?.previews?.[dark?.id], 'assets/placeholders/logo-horizontal-dark.svg');
  q('[data-bar-logo]').alt = data.brand.name;
  renderHero();
  renderLogo();
  renderFavicon();
  renderBrandbook();
  renderExternal();
  applySections();
  q('[data-footer]').textContent = copy('footer') + (data.brand.updated ? ` ${fill(copy('updated'))}` : '');
}
start().catch(error => { document.body.prepend(`Could not load the site data: ${error.message}`); });
