const TYPES = {
  artifact:'Артефакт', character:'Персонаж', creature:'Существо', location:'Локация',
  substance:'Вещество', plant:'Растение', animal:'Животное', spell:'Заклинание', phenomenon:'Явление'
};
const GROUPS = [
  ['works','Произведения','01-works.png'], ['artifact','Артефакты','02-artifacts.png'],
  ['character','Персонажи','03-characters.png'], ['creature','Существа','04-creatures.png'],
  ['location','Локации','05-locations.png'], ['spell','Заклинания','06-spells.png'],
  ['substance','Вещества','07-substances.png'], ['plant','Растения','08-plants.png'],
  ['animal','Животные','09-animals.png'], ['phenomenon','Явления','10-phenomena.png']
];
const ALPHABET = 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'.split('');
const app = document.getElementById('app');
const state = { works:[], query:'', ready:false };
const MIN_PRELOADER_DURATION = 2000;
const DATA_LOAD_TIMEOUT = 30000;
const PRELOADER_FADE_DURATION = 400;
const safe = value => value == null ? '' : String(value);
const escapeHtml = value => safe(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const humanize = value => safe(value).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const href = (...parts) => `#/${parts.map(encodeURIComponent).join('/')}`;

function icon(filename) {
  // Category labels remain text; the PNG icons are decorative.
  return `<img class="group-icon" src="assets/icons/${filename}" width="32" height="32" alt="" aria-hidden="true" decoding="async">`;
}

function moreIcon() {
  // 'Ещё' is a navigation action rather than one of the ten categories.
  return '<svg class="group-more-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';
}

function getEntities(type) {
  return state.works.flatMap(work => (work.entities || []).filter(entity => entity.type === type).map(entity => ({...entity, work})));
}

function groupCount(id) { return id === 'works' ? state.works.length : getEntities(id).length; }

function groupNavigation(active) {
  const visible = GROUPS.slice(0,5);
  const moreActive = !visible.some(([id]) => id === active);
  return `<nav class="group-nav" aria-label="Разделы энциклопедии">${visible.map(([id,label,glyph]) => `<a class="group-tab${active === id ? ' active' : ''}" href="${id === 'works' ? '#/' : href('group',id)}" ${active === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`).join('')}<button class="group-tab more-groups${moreActive ? ' active' : ''}" type="button" data-open-menu ${moreActive ? 'aria-current="page"' : ''}>${moreIcon()}<span>Ещё</span><b aria-hidden="true">⌄</b></button></nav>`;
}

async function loadData(signal, onProgress) {
  const indexResponse = await fetch('data/processed-works.yaml', { cache: 'no-store', signal });
  if (!indexResponse.ok) throw new Error('Не удалось загрузить список произведений');
  if (typeof jsyaml === 'undefined') throw new Error('YAML-парсер не загрузился');
  const index = jsyaml.load(await indexResponse.text());
  if (!Array.isArray(index?.works)) throw new Error('Некорректный реестр произведений');
  let loadedWorks = 0;
  let loadedEntities = 0;
  const works = await Promise.all(index.works.map(async item => {
    const response = await fetch(item.path, { cache: 'no-store', signal });
    if (!response.ok) throw new Error(`Не удалось загрузить ${item.path}`);
    const work = { ...jsyaml.load(await response.text()), path:item.path };
    // A failed attempt may still have parsing callbacks queued after abort.
    if (!signal.aborted) {
      loadedWorks += 1;
      loadedEntities += (work.entities || []).length;
      onProgress(loadedWorks, loadedEntities);
    }
    return work;
  }));
  state.works = works.sort((a,b) => safe(a.title).localeCompare(safe(b.title),'ru'));
}

function row({ name, meta, url }) {
  return `<li><a class="list-row" href="${url}"><span class="row-name">${escapeHtml(name)}</span><span class="row-meta">${escapeHtml(meta)}</span><span class="arrow" aria-hidden="true">→</span></a></li>`;
}

function firstLetter(value) {
  return safe(value).trim().charAt(0).toLocaleUpperCase('ru');
}

function alphabetList(items, renderRow, listClass) {
  const firstIndexes = new Map();
  items.forEach((item, index) => {
    const letter = firstLetter(item.name);
    if (ALPHABET.includes(letter) && !firstIndexes.has(letter)) firstIndexes.set(letter, index);
  });
  const available = [...firstIndexes.keys()];
  const nav = ALPHABET.map(letter => firstIndexes.has(letter)
    ? `<a href="#letter-${letter}" data-letter="${letter}" ${letter === available[0] ? 'aria-current="true"' : ''}>${letter}</a>`
    : `<span aria-disabled="true">${letter}</span>`).join('');
  const rows = items.map((item, index) => {
    const letter = firstLetter(item.name);
    const anchor = firstIndexes.get(letter) === index ? ` id="letter-${letter}" data-letter-section="${letter}"` : '';
    return `<li${anchor}>${renderRow(item)}</li>`;
  }).join('');
  return `<div class="alphabet-layout"><nav class="alphabet-nav" aria-label="Навигация по алфавиту">${nav}</nav><ol class="${listClass}">${rows}</ol></div>`;
}

function rowContent({ name, meta, url, metaUrl }) {
  return `<div class="list-row"><a class="row-name" href="${url}">${escapeHtml(name)}</a>${metaUrl ? `<a class="row-meta row-meta-link" href="${metaUrl}">${escapeHtml(meta)}</a>` : `<span class="row-meta">${escapeHtml(meta)}</span>`}<span class="arrow" aria-hidden="true">→</span></div>`;
}

function homeView(active = 'works') {
  const query = state.query.trim().toLocaleLowerCase('ru');
  const works = state.works.filter(work => !query || [work.title, work.original_title, ...(work.entities || []).flatMap(entity => [entity.name, entity.description])].join(' ').toLocaleLowerCase('ru').includes(query));
  const group = GROUPS.find(([id]) => id === active) || GROUPS[0];
  const entities = active === 'works' ? [] : getEntities(active).filter(entity => !query || [entity.name, entity.description, entity.work.title].join(' ').toLocaleLowerCase('ru').includes(query)).sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  const count = active === 'works' ? works.length : entities.length;
  return `<section class="home-hero"><img class="home-hero-art" src="assets/head/top.png" alt="" aria-hidden="true" width="1440" height="1024" decoding="async" fetchpriority="high"><span class="eyebrow">Открытая энциклопедия</span><h1>Магические сущности<br>из сказок и мифов</h1>
    <p class="intro">Магические персонажи, предметы и явления из сказок, мифов и литературы.</p>
    <div class="home-stats"><span><b>${state.works.length}</b> произведений</span><span><b>${state.works.reduce((total, work) => total + (work.entities || []).length, 0)}</b> сущностей</span></div></section>
    ${groupNavigation(group[0])}
    <section class="catalog-section"><div class="catalog-heading"><h2>${query ? 'Результаты поиска' : group[1]}</h2><span>${count}</span></div>
    ${count ? alphabetList(active === 'works'
      ? works.map(work => ({name:work.title || work.id, meta:`${(work.entities || []).length} сущностей`, url:href('work',work.id)}))
      : entities.map(entity => ({name:entity.name || entity.id, meta:entity.work.title || entity.work.id, metaUrl:href('work',entity.work.id), url:href('entity',entity.work.id,entity.id)})), rowContent, active === 'works' ? 'work-list' : 'work-list entity-catalog-list') : '<p class="empty">Ничего не найдено.</p>'}</section>`;
}

function workView(id) {
  const work = state.works.find(item => item.id === id);
  if (!work) return notFound();
  const entities = [...(work.entities || [])].sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  const rows = entities.map(entity => ({name:entity.name || entity.id, meta:TYPES[entity.type] || humanize(entity.type), url:href('entity',work.id,entity.id)}));
  return `<section class="work-page"><div class="work-intro"><a class="back" href="#/">Все произведения</a><span class="eyebrow">Произведение · Каталог сущностей</span><h1>${escapeHtml(work.title || work.id)}</h1><p class="subhead">${entities.length} сущностей</p></div>
    ${entities.length ? alphabetList(rows, rowContent, 'entity-list') : '<p class="empty">Сущности пока не добавлены.</p>'}</section>`;
}

function entityView(workId, entityId) {
  const work = state.works.find(item => item.id === workId);
  const entities = [...(work?.entities || [])].sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  const entity = entities.find(item => item.id === entityId);
  if (!work || !entity) return '';
  const index = entities.indexOf(entity);
  const prev = entities[index - 1], next = entities[index + 1];
  const aliases = Array.isArray(entity.aliases) ? entity.aliases.join(', ') : '';
  const traditions = (Array.isArray(work.tradition) ? work.tradition : [work.tradition]).filter(Boolean).map(humanize).join(', ');
  const details = [['Тип', TYPES[entity.type] || humanize(entity.type)], ['Произведение', work.title || work.id], ['Традиция', traditions],
    ...(aliases ? [['Также известен как', aliases]] : []), ...(work.author ? [['Автор', work.author]] : [])];
  // Resolve the type image from the same fixed category-to-PNG mapping used by the catalog.
  // Only known filenames from GROUPS are emitted; never interpolate raw entity data in a URL.
  const typeIconFile = GROUPS.find(([id]) => id === entity.type)?.[2];
  const typeIconMarkup = typeIconFile
    ? `<img class="reader-type-png" src="assets/icons/${typeIconFile}" width="22" height="22" alt="" aria-hidden="true" decoding="async">`
    : '';
  // Semantic icons distinguish the three primary chips without relying on color alone.
  const detailIcons = [
    typeIconMarkup,
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1ZM12 6v14"/></svg>',
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 4c-9 0-15 4-15 11a5 5 0 0 0 5 5c7 0 11-6 10-16Z"/><path d="M4 21c3-5 7-8 13-11"/></svg>'
  ];
  const arrow = (target, label, symbol) => target
    ? `<a class="reader-arrow" href="${href('entity',work.id,target.id)}" aria-label="${escapeHtml(label + ': ' + (target.name || target.id))}">${symbol}</a>`
    : `<span class="reader-arrow is-disabled" aria-disabled="true">${symbol}</span>`;
  return `<div class="reader-overlay" id="readerOverlay">
    <div class="reader-shade" data-reader-close></div>
    <section class="reader-dialog" role="dialog" aria-modal="true" aria-labelledby="readerTitle" aria-describedby="readerDescription">
      <header class="reader-head"><span class="reader-brand">Энциклопедия сущностей</span>
        <button type="button" class="reader-close" data-reader-close aria-label="Закрыть карточку">×</button></header>
      <div class="reader-titlebar"><h1 id="readerTitle">${escapeHtml(entity.name || entity.id)}</h1>
        <nav class="reader-nav" aria-label="Переключение сущностей">
          ${arrow(prev,'Предыдущая сущность','←')}<span class="reader-counter">${index + 1} / ${entities.length}</span>${arrow(next,'Следующая сущность','→')}
        </nav></div>
      <details class="reader-metadata" ${window.matchMedia('(min-width:801px)').matches ? 'open' : ''}>
        <summary>Дополнительные сведения</summary>
        <dl class="reader-details">${details.map(([label,value], i) => `<div class="reader-detail ${i < 3 ? ['reader-detail--type', 'reader-detail--work', 'reader-detail--tradition'][i] : 'reader-detail--extra'}"><dt>${escapeHtml(label)}</dt><dd>${i < 3 ? `<span class="reader-detail-icon" aria-hidden="true">${detailIcons[i]}</span>` : ''}<span class="reader-detail-value">${escapeHtml(value || '—')}</span></dd></div>`).join('')}</dl>
      </details>
      <div class="reader-scroll" tabindex="0" aria-label="Прокручиваемое описание сущности">
        <p id="readerDescription">${escapeHtml(entity.description || 'Описание пока не добавлено.')}</p>
      </div>
      <footer class="reader-foot"><span class="reader-shortcuts"><kbd>←</kbd><kbd>→</kbd> Переключить <kbd>Esc</kbd> Закрыть</span>
        <a class="reader-work-link" href="${href('work',work.id)}">Открыть произведение <span aria-hidden="true">↗</span></a>
        <nav class="reader-mobile-nav" aria-label="Переключение сущностей">
          ${arrow(prev,'Предыдущая сущность','←')}<span class="reader-counter" aria-label="Сущность ${index + 1} из ${entities.length}">${index + 1} / ${entities.length}</span>${arrow(next,'Следующая сущность','→')}
        </nav></footer>
    </section></div>`;
}

let readerReturnHash = '#/';
let readerReturnScroll = 0;
let readerTrigger = null;
let readerOpen = false;
function routeParts() {
  return location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
}
function closeReader() {
  location.hash = readerReturnHash;
}
function syncReader(parts) {
  const entityRoute = parts[0] === 'entity';
  const old = document.getElementById('readerOverlay');
  if (!entityRoute) {
    if (old) old.remove();
    document.body.classList.remove('reader-open');
    if (readerOpen) {
      wasReaderClosed = true;
      readerOpen = false;
      requestAnimationFrame(() => {
        window.scrollTo(0, readerReturnScroll);
        if (readerTrigger?.isConnected) readerTrigger.focus({preventScroll:true});
      });
    }
    return false;
  }
  if (!readerOpen && !app.innerHTML.trim()) {
    app.innerHTML = workView(parts[1]);
    lastContentHash = href('work',parts[1]);
    initAlphabetNavigation();
  }
  if (!readerOpen) {
    readerReturnHash = lastContentHash || '#/';
    readerReturnScroll = window.scrollY;
    readerOpen = true;
  }
  const content = entityView(parts[1],parts[2]);
  if (!content) { location.hash = readerReturnHash; return true; }
  old?.remove();
  document.getElementById('siteContent').insertAdjacentHTML('beforeend',content);
  const incomingDialog = document.querySelector('.reader-dialog');
  if (readerSwipeDirection) {
    incomingDialog?.classList.add(readerSwipeDirection === 'next' ? 'reader-enter-from-right' : 'reader-enter-from-left');
    readerSwipeDirection = null;
  }
  document.body.classList.add('reader-open');
  document.querySelector('.reader-close')?.focus({preventScroll:true});
  document.title = `${document.getElementById('readerTitle')?.textContent || 'Сущность'} — Энциклопедия сущностей`;
  return true;
}
// Horizontal swipes track the finger, then slide the current card away
// before routing to the adjacent entity. Vertical scrolling stays native.
let readerSwipeStart = null;
let readerSwipeDirection = null;
let readerSwipeTracking = false;
let readerSwipePending = false;
function resetReaderSwipe(animate = true) {
  const dialog = document.querySelector('.reader-dialog');
  if (dialog) {
    dialog.style.transition = animate ? 'transform 180ms ease-out, opacity 180ms ease-out' : 'none';
    dialog.style.transform = '';
    dialog.style.opacity = '';
    dialog.classList.remove('is-swiping');
  }
  readerSwipeTracking = false;
  readerSwipeStart = null;
}
document.addEventListener('touchstart', event => {
  readerSwipeStart = null;
  readerSwipeTracking = false;
  if (!readerOpen || readerSwipePending || !window.matchMedia('(max-width:800px)').matches || event.touches.length !== 1) return;
  const area = event.target.closest('.reader-scroll');
  if (!area || event.target.closest('a,button,input,textarea,select,[contenteditable="true"]')) return;
  const touch = event.touches[0];
  readerSwipeStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
}, {passive:true});
document.addEventListener('touchmove', event => {
  if (!readerSwipeStart || !readerOpen || event.touches.length !== 1) return;
  const touch = event.touches[0];
  const dx = touch.clientX - readerSwipeStart.x, dy = touch.clientY - readerSwipeStart.y;
  if (!readerSwipeTracking) {
    if (Math.abs(dx) < 9 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    readerSwipeTracking = true;
  }
  const dialog = document.querySelector('.reader-dialog');
  if (!dialog) return;
  dialog.classList.add('is-swiping');
  dialog.style.transition = 'none';
  dialog.style.transform = `translate3d(${dx * 0.72}px,0,0)`;
  dialog.style.opacity = String(1 - Math.min(Math.abs(dx) / 900, 0.16));
}, {passive:true});
document.addEventListener('touchcancel', () => resetReaderSwipe(true), {passive:true});
document.addEventListener('touchend', event => {
  const start = readerSwipeStart;
  if (!start || !readerOpen || event.changedTouches.length !== 1) { resetReaderSwipe(true); return; }
  const touch = event.changedTouches[0];
  const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
  const horizontal = Math.abs(dx) >= 65 && Math.abs(dx) > Math.abs(dy) * 1.5 && performance.now() - start.time <= 900;
  if (!horizontal || window.getSelection()?.toString()) { resetReaderSwipe(true); return; }
  const direction = dx < 0 ? 'next' : 'prev';
  const selector = direction === 'next' ? '.reader-mobile-nav .reader-arrow:last-child' : '.reader-mobile-nav .reader-arrow:first-child';
  const link = document.querySelector(selector);
  if (!link || link.tagName !== 'A') { resetReaderSwipe(true); return; }
  const dialog = document.querySelector('.reader-dialog');
  if (!dialog) { resetReaderSwipe(false); return; }
  readerSwipePending = true;
  dialog.classList.remove('is-swiping');
  dialog.style.transition = 'transform 190ms cubic-bezier(.2,.75,.25,1), opacity 190ms ease-out';
  dialog.style.transform = `translate3d(${direction === 'next' ? '-105vw' : '105vw'},0,0)`;
  dialog.style.opacity = '.82';
  const target = link.getAttribute('href');
  setTimeout(() => {
    readerSwipePending = false;
    readerSwipeDirection = direction;
    readerSwipeStart = null;
    location.hash = target;
  }, 195);
}, {passive:true});

let lastContentHash = '#/';
document.addEventListener('click', event => {
  const trigger = event.target.closest('a[href^="#/entity/"]');
  if (trigger && !readerOpen) readerTrigger = trigger;
  if (event.target.closest('[data-reader-close]')) closeReader();
});
document.addEventListener('keydown', event => {
  if (!readerOpen) return;
  if (event.key === 'Escape') { event.preventDefault(); closeReader(); return; }
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    if (event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const all = [...document.querySelectorAll('.reader-nav > *')];
    const chosen = event.key === 'ArrowLeft' ? all[0] : all[all.length-1];
    if (chosen?.tagName === 'A') { event.preventDefault(); location.hash = chosen.getAttribute('href'); }
    return;
  }
  if (event.key === 'Tab') {
    const dialog = document.querySelector('.reader-dialog');
    const focusable = [...dialog.querySelectorAll('a[href],button:not([disabled]),[tabindex="0"]')];
    const first = focusable[0], last = focusable[focusable.length-1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

function aboutView() { return `<a class="back" href="#/">На главную</a><h1>О проекте</h1><div class="about"><p>«Энциклопедия сущностей» — открытый каталог магических персонажей, существ, предметов и мест из фольклора и литературы разных народов.</p><p>Все материалы хранятся в открытом репозитории. Вы можете предложить уточнение или добавить новое произведение через GitHub.</p></div>`; }
function notFound() { return '<h1>Страница не найдена</h1><p><a href="#/">Вернуться на главную</a></p>'; }

let alphabetScrollCleanup = null;
function render() {
  if (!state.ready) return;
  const parts = routeParts();
  if (syncReader(parts)) return;
  alphabetScrollCleanup?.();
  alphabetScrollCleanup = null;
  lastContentHash = location.hash || '#/';
  app.innerHTML = !parts.length ? homeView() : parts[0] === 'group' && GROUPS.some(([id]) => id === parts[1]) ? homeView(parts[1]) : parts[0] === 'work' ? workView(parts[1]) : parts[0] === 'about' ? aboutView() : notFound();
  document.title = `${app.querySelector('h1')?.textContent.trim() || 'Энциклопедия сущностей'} — Энциклопедия сущностей`;
  if (!wasReaderClosed) window.scrollTo(0,0);
  wasReaderClosed = false;
  initAlphabetNavigation();
}
let wasReaderClosed = false;

function initAlphabetNavigation() {
  const nav = app.querySelector('.alphabet-nav');
  if (!nav) return;
  nav.addEventListener('click', event => {
    const link = event.target.closest('a[data-letter]');
    if (!link) return;
    event.preventDefault();
    document.getElementById(`letter-${link.dataset.letter}`)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
    nav.querySelector('[aria-current]')?.removeAttribute('aria-current');
    link.setAttribute('aria-current','true');
  });
  const sections = [...app.querySelectorAll('li[data-letter-section]')];
  const links = [...nav.querySelectorAll('a[data-letter]')];
  let queued = false;
  let frame = null;
  const syncLetter = () => {
    if (!nav.isConnected) {
      window.removeEventListener('scroll', onScroll);
      return;
    }
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 150) active = section;
      else break;
    }
    const letter = active?.dataset.letterSection;
    const link = links.find(item => item.dataset.letter === letter);
    if (link && !link.hasAttribute('aria-current')) {
      nav.querySelector('[aria-current]')?.removeAttribute('aria-current');
      link.setAttribute('aria-current', 'true');
      if (nav.scrollWidth > nav.clientWidth) {
        const left = link.offsetLeft - nav.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2;
        nav.scrollTo({left: Math.max(0, left), behavior:'auto'});
      }
    }
    queued = false;
  };
  const onScroll = () => {
    if (!queued) {
      queued = true;
      frame = requestAnimationFrame(syncLetter);
    }
  };
  window.addEventListener('scroll', onScroll, {passive:true});
  alphabetScrollCleanup = () => {
    window.removeEventListener('scroll', onScroll);
    if (frame !== null) cancelAnimationFrame(frame);
  };
  syncLetter();
}

const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
document.getElementById('searchToggle').addEventListener('click', () => { searchPanel.hidden = false; searchInput.focus(); });
document.getElementById('searchClose').addEventListener('click', () => { searchPanel.hidden = true; });
searchInput.addEventListener('input', event => { state.query = event.target.value; if (!location.hash.match(/^#\/(group\/[^/]+)?$/)) location.hash = '#/'; else render(); });
window.addEventListener('hashchange', render);

const sectionMenu = document.getElementById('sectionMenu');
const menuBackdrop = document.getElementById('menuBackdrop');
const menuToggle = document.getElementById('menuToggle');
function closeMenu() { sectionMenu.classList.remove('open'); sectionMenu.setAttribute('aria-hidden','true'); menuBackdrop.hidden = true; menuToggle.setAttribute('aria-expanded','false'); }
function openMenu() { sectionMenu.classList.add('open'); sectionMenu.setAttribute('aria-hidden','false'); menuBackdrop.hidden = false; menuToggle.setAttribute('aria-expanded','true'); document.getElementById('menuClose').focus(); }
function fillMenu() { document.getElementById('sectionMenuLinks').innerHTML = GROUPS.map(([id,label,glyph]) => `<a href="${id === 'works' ? '#/' : href('group',id)}">${icon(glyph)}<span>${label}</span><b>${groupCount(id)}</b></a>`).join(''); }
document.addEventListener('click', event => { if (event.target.closest('[data-open-menu]')) openMenu(); });
menuToggle.addEventListener('click', openMenu);
document.getElementById('menuClose').addEventListener('click', closeMenu);
menuBackdrop.addEventListener('click', closeMenu);
document.getElementById('sectionMenuLinks').addEventListener('click', closeMenu);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });


const backToTop = document.getElementById('backToTop');
if (backToTop) {
  let scrollTicking = false;
  const syncBackToTop = () => {
    backToTop.hidden = window.scrollY < 420;
    scrollTicking = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(syncBackToTop);
    }
  }, { passive: true });
  window.addEventListener('hashchange', () => requestAnimationFrame(syncBackToTop));
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  });
  syncBackToTop();
}

const preloader = document.getElementById('preloader');
const siteContent = document.getElementById('siteContent');
const preloaderError = document.getElementById('preloaderError');
const preloaderLabel = document.getElementById('preloaderLabel');
const preloaderRetry = document.getElementById('preloaderRetry');
let initializing = false;

function createPreloaderCounters() {
  const elements = [document.getElementById('preloaderWorks'), document.getElementById('preloaderEntities')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let current = [0, 0];
  let from = current;
  let target = current;
  let startedAt = 0;
  let frame = null;
  let complete;
  const draw = () => elements.forEach((element, index) => {
    element.textContent = Math.floor(current[index]).toLocaleString('ru');
  });
  const tick = now => {
    // The frame timestamp can precede an update received within the same frame.
    const progress = Math.max(0, Math.min(1, (now - startedAt) / 650));
    const eased = 1 - Math.pow(1 - progress, 3);
    current = progress === 1 ? target : target.map((value, index) => from[index] + (value - from[index]) * eased);
    draw();
    if (progress < 1) frame = requestAnimationFrame(tick);
    else {
      frame = null;
      complete?.();
    }
  };
  draw();
  return {
    update(works, entities) {
      if (frame !== null) cancelAnimationFrame(frame);
      target = [works, entities];
      if (reducedMotion) {
        current = target;
        frame = null;
        draw();
        return;
      }
      from = current;
      startedAt = performance.now();
      frame = requestAnimationFrame(tick);
    },
    finish() {
      return frame === null ? Promise.resolve() : new Promise(resolve => { complete = resolve; });
    },
    cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      complete?.();
    }
  };
}

function dismissPreloader() {
  // Render underneath the fixed overlay; keep controls inert until it is gone.
  preloader.classList.add('is-leaving');
  document.documentElement.classList.remove('preloading');
  let removed = false;
  const finish = () => {
    if (removed) return;
    removed = true;
    preloader.remove();
    siteContent.inert = false;
  };
  preloader.addEventListener('transitionend', event => {
    if (event.target === preloader && event.propertyName === 'opacity') finish();
  });
  // Also clean up if a transition is disabled or its event is not delivered.
  setTimeout(finish, PRELOADER_FADE_DURATION + 50);
}

async function initializeWithPreloader(startTime = performance.now()) {
  if (initializing || state.ready) return;
  initializing = true;
  siteContent.inert = true;
  preloader.classList.remove('has-error');
  preloaderError.hidden = true;
  preloaderLabel.textContent = 'Загружаем энциклопедию…';
  preloader.setAttribute('aria-busy', 'true');
  const counters = createPreloaderCounters();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DATA_LOAD_TIMEOUT);
  try {
    // allSettled also holds early failures until the minimum display time.
    const [result] = await Promise.allSettled([
      loadData(controller.signal, counters.update).finally(() => clearTimeout(timeout)),
      new Promise(resolve => setTimeout(resolve,
        Math.max(0, MIN_PRELOADER_DURATION - (performance.now() - startTime))))
    ]);
    if (result.status === 'rejected') throw result.reason;
    // A throttled animation frame must never block the site indefinitely.
    await Promise.race([counters.finish(), new Promise(resolve => setTimeout(resolve, 1200))]);
    counters.cancel();
    state.ready = true;
    fillMenu();
    render();
    preloaderLabel.textContent = `Загружено произведений: ${state.works.length}, сущностей: ${state.works.reduce((total, work) => total + (work.entities || []).length, 0)}.`;
    preloader.setAttribute('aria-busy', 'false');
    dismissPreloader();
  } catch (error) {
    controller.abort();
    counters.cancel();
    state.ready = false;
    console.error(error);
    preloader.classList.add('has-error');
    preloaderError.hidden = false;
    preloaderLabel.textContent = `Ошибка загрузки: ${error?.message || 'неизвестная ошибка'}.`;
    preloader.setAttribute('aria-busy', 'false');
    preloaderRetry.focus();
  } finally {
    clearTimeout(timeout);
    initializing = false;
  }
}

preloaderRetry.addEventListener('click', () => {
  // Reload also retries the existing CDN script if the YAML parser failed to load.
  if (typeof jsyaml === 'undefined') location.reload();
  else initializeWithPreloader();
});
initializeWithPreloader(window.appInitializationStartedAt);
