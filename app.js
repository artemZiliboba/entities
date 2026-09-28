const TYPES = {
  artifact:'Артефакт', character:'Персонаж', creature:'Существо', location:'Локация',
  substance:'Вещество', plant:'Растение', animal:'Животное', spell:'Заклинание', phenomenon:'Явление'
};
const GROUPS = [
  ['works','Произведения','book'], ['artifact','Артефакты','cup'], ['character','Персонажи','people'],
  ['creature','Существа','paw'], ['location','Локации','mountain'], ['spell','Заклинания','sparkles'],
  ['substance','Вещества','flask'], ['plant','Растения','leaf'], ['animal','Животные','paw'],
  ['phenomenon','Явления','target']
];
const app = document.getElementById('app');
const state = { works:[], query:'' };
const safe = value => value == null ? '' : String(value);
const escapeHtml = value => safe(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const humanize = value => safe(value).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const href = (...parts) => `#/${parts.map(encodeURIComponent).join('/')}`;

function icon(name) {
  const paths = {
    book:'<path d="M3 5.5c3-1 6-.4 9 1.5v13c-3-1.9-6-2.4-9-1.5zM21 5.5c-3-1-6-.4-9 1.5v13c3-1.9 6-2.4 9-1.5z"/>',
    cup:'<path d="M7 3h10v4c0 4-2 6-5 7-3-1-5-3-5-7zM12 14v5M8 21h8M17 5h3v2c0 2-1 3-3 3M7 5H4v2c0 2 1 3 3 3"/>',
    people:'<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2-6 6-6s6 2 6 6M14 15c4-1 7 1 7 5"/>',
    paw:'<ellipse cx="12" cy="16" rx="5" ry="4"/><circle cx="5" cy="11" r="2"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="6" r="2"/><circle cx="19" cy="11" r="2"/>',
    mountain:'<path d="m2 20 7-13 3 5 3-7 7 15zM7 11l2 2 2-2M13 9l2 2 2-2"/>',
    sparkles:'<path d="m12 2 1.5 5.5L19 9l-5.5 1.5L12 16l-1.5-5.5L5 9l5.5-1.5zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    flask:'<path d="M9 3h6M10 3v6l-5 9c-1 2 0 3 2 3h10c2 0 3-1 2-3l-5-9V3M8 15h8"/>',
    leaf:'<path d="M20 4C10 4 5 9 5 17c7 1 13-3 15-13ZM4 21c3-6 7-9 13-13"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'
  };
  return `<svg class="group-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sparkles}</svg>`;
}

function getEntities(type) {
  return state.works.flatMap(work => (work.entities || []).filter(entity => entity.type === type).map(entity => ({...entity, work})));
}

function groupCount(id) { return id === 'works' ? state.works.length : getEntities(id).length; }

function groupNavigation(active) {
  const visible = GROUPS.slice(0,5);
  const moreActive = !visible.some(([id]) => id === active);
  return `<nav class="group-nav" aria-label="Разделы энциклопедии">${visible.map(([id,label,glyph]) => `<a class="group-tab${active === id ? ' active' : ''}" href="${id === 'works' ? '#/' : href('group',id)}" ${active === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span>${label}</span></a>`).join('')}<button class="group-tab more-groups${moreActive ? ' active' : ''}" type="button" data-open-menu ${moreActive ? 'aria-current="page"' : ''}>${icon('sparkles')}<span>Ещё</span><b aria-hidden="true">⌄</b></button></nav>`;
}

async function loadData() {
  const indexResponse = await fetch('data/processed-works.yaml', { cache: 'no-store' });
  if (!indexResponse.ok) throw new Error('Не удалось загрузить список произведений');
  const index = jsyaml.load(await indexResponse.text());
  const works = await Promise.all(index.works.map(async item => {
    const response = await fetch(item.path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Не удалось загрузить ${item.path}`);
    return { ...jsyaml.load(await response.text()), path:item.path };
  }));
  state.works = works.sort((a,b) => safe(a.title).localeCompare(safe(b.title),'ru'));
}

function row({ name, meta, url }) {
  return `<li><a class="list-row" href="${url}"><span class="row-name">${escapeHtml(name)}</span><span class="row-meta">${escapeHtml(meta)}</span><span class="arrow" aria-hidden="true">→</span></a></li>`;
}

function homeView(active = 'works') {
  const query = state.query.trim().toLocaleLowerCase('ru');
  const works = state.works.filter(work => !query || [work.title, work.original_title, ...(work.entities || []).flatMap(entity => [entity.name, entity.description])].join(' ').toLocaleLowerCase('ru').includes(query));
  const group = GROUPS.find(([id]) => id === active) || GROUPS[0];
  const entities = active === 'works' ? [] : getEntities(active).filter(entity => !query || [entity.name, entity.description, entity.work.title].join(' ').toLocaleLowerCase('ru').includes(query)).sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  const count = active === 'works' ? works.length : entities.length;
  return `<section class="home-hero"><span class="eyebrow">Открытая энциклопедия</span><h1>Магические сущности<br>из сказок и мифов</h1>
    <p class="intro">Персонажи, существа, артефакты, локации и другие удивительные объекты из мировой мифологии и литературы.</p>
    <div class="home-stats"><span><b>${state.works.length}</b> произведений</span><span><b>${state.works.reduce((total, work) => total + (work.entities || []).length, 0)}</b> сущностей</span></div></section>
    ${groupNavigation(group[0])}
    <section class="catalog-section"><div class="catalog-heading"><h2>${query ? 'Результаты поиска' : group[1]}</h2><span>${count}</span></div>
    ${count ? `<ol class="work-list">${active === 'works' ? works.map(work => row({name:work.title || work.id, meta:`${(work.entities || []).length} сущностей`, url:href('work',work.id)})).join('') : entities.map(entity => row({name:entity.name || entity.id, meta:entity.work.title || entity.work.id, url:href('entity',entity.work.id,entity.id)})).join('')}</ol>` : '<p class="empty">Ничего не найдено.</p>'}</section>`;
}

function workView(id) {
  const work = state.works.find(item => item.id === id);
  if (!work) return notFound();
  const entities = [...(work.entities || [])].sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  return `<a class="back" href="#/">Все произведения</a><h1>${escapeHtml(work.title || work.id)}</h1><p class="subhead">${entities.length} сущностей</p>
    <ol class="entity-list">${entities.map(entity => row({name:entity.name || entity.id, meta:TYPES[entity.type] || humanize(entity.type), url:href('entity',work.id,entity.id)})).join('')}</ol>`;
}

function entityView(workId, entityId) {
  const work = state.works.find(item => item.id === workId);
  const entities = [...(work?.entities || [])].sort((a,b) => safe(a.name).localeCompare(safe(b.name),'ru'));
  const entity = entities.find(item => item.id === entityId);
  if (!work || !entity) return notFound();
  const index = entities.indexOf(entity);
  const related = entities.filter(item => item.id !== entity.id);
  const aliases = Array.isArray(entity.aliases) ? entity.aliases.join(', ') : '';
  const traditions = (Array.isArray(work.tradition) ? work.tradition : [work.tradition]).filter(Boolean).map(humanize).join(', ');
  const details = [
    ['Тип', TYPES[entity.type] || humanize(entity.type)], ['Произведение', work.title || work.id], ['Традиция', traditions],
    ...(aliases ? [['Также известен как', aliases]] : []), ...(work.author ? [['Автор', work.author]] : [])
  ];
  const prev = entities[index-1], next = entities[index+1];
  return `<article class="entity-page"><div class="entity-top"><a class="back" href="${href('work',work.id)}">К списку сущностей</a><div class="top-position"><a class="circle-button" href="${prev ? href('entity',work.id,prev.id) : '#'}" ${prev ? '' : 'aria-disabled="true"'}>←</a><b>${index+1} / ${entities.length}</b><a class="circle-button" href="${next ? href('entity',work.id,next.id) : '#'}" ${next ? '' : 'aria-disabled="true"'}>→</a></div></div><h1>${escapeHtml(entity.name || entity.id)}</h1>
    <dl class="details">${details.map(([label,value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`).join('')}</dl>
    <section class="description-section"><h2>Описание</h2><p class="description">${escapeHtml(entity.description || 'Описание пока не добавлено.')}</p></section>
    <nav class="entity-pager" aria-label="Соседние сущности">
      ${prev ? `<a class="pager-link" href="${href('entity',work.id,prev.id)}"><span class="circle-button">←</span><span><small>Предыдущая</small><strong>${escapeHtml(prev.name || prev.id)}</strong></span></a>` : '<span></span>'}
      <span class="pager-center"><b>${index+1} / ${entities.length}</b><small>${escapeHtml(work.title || work.id)}</small></span>
      ${next ? `<a class="pager-link pager-next" href="${href('entity',work.id,next.id)}"><span><small>Следующая</small><strong>${escapeHtml(next.name || next.id)}</strong></span><span class="circle-button">→</span></a>` : '<span></span>'}
    </nav>
    ${related.length ? `<section class="related-section"><div class="section-heading"><h2>Связанные сущности</h2><a href="${href('work',work.id)}">Смотреть все&nbsp; →</a></div><ol class="related-list">${related.map(item => row({name:item.name || item.id, meta:TYPES[item.type] || humanize(item.type), url:href('entity',work.id,item.id)})).join('')}</ol></section>` : ''}</article>`;
}

function aboutView() { return `<a class="back" href="#/">На главную</a><h1>О проекте</h1><div class="about"><p>«Энциклопедия сущностей» — открытый каталог магических персонажей, существ, предметов и мест из фольклора и литературы разных народов.</p><p>Все материалы хранятся в открытом репозитории. Вы можете предложить уточнение или добавить новое произведение через GitHub.</p></div>`; }
function notFound() { return '<h1>Страница не найдена</h1><p><a href="#/">Вернуться на главную</a></p>'; }

function render() {
  const parts = location.hash.replace(/^#\/?/,'').split('/').filter(Boolean).map(decodeURIComponent);
  app.innerHTML = !parts.length ? homeView() : parts[0] === 'group' && GROUPS.some(([id]) => id === parts[1]) ? homeView(parts[1]) : parts[0] === 'work' ? workView(parts[1]) : parts[0] === 'entity' ? entityView(parts[1],parts[2]) : parts[0] === 'about' ? aboutView() : notFound();
  document.title = `${app.querySelector('h1')?.textContent.trim() || 'Энциклопедия сущностей'} — Энциклопедия сущностей`;
  window.scrollTo(0,0);
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

loadData().then(() => { fillMenu(); render(); }).catch(error => { console.error(error); app.innerHTML = `<p class="empty">${escapeHtml(error.message)}. Попробуйте обновить страницу.</p>`; });
