const TYPES = {
  artifact:'Артефакт', character:'Персонаж', creature:'Существо', location:'Локация',
  substance:'Вещество', plant:'Растение', animal:'Животное', spell:'Заклинание', phenomenon:'Явление'
};
const app = document.getElementById('app');
const state = { works:[], query:'' };
const safe = value => value == null ? '' : String(value);
const escapeHtml = value => safe(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const humanize = value => safe(value).split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
const href = (...parts) => `#/${parts.map(encodeURIComponent).join('/')}`;

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

function homeView() {
  const query = state.query.trim().toLocaleLowerCase('ru');
  const works = state.works.filter(work => !query || [work.title, work.original_title, ...(work.entities || []).flatMap(entity => [entity.name, entity.description])].join(' ').toLocaleLowerCase('ru').includes(query));
  return `<h1>Магические сущности<br>из сказок и мифов</h1>
    <p class="intro">Персонажи, существа, артефакты, локации и другие удивительные объекты из мировой мифологии и литературы.</p>
    ${works.length ? `<ol class="work-list">${works.map(work => row({name:work.title || work.id, meta:`${(work.entities || []).length} сущностей`, url:href('work',work.id)})).join('')}</ol>` : '<p class="empty">Ничего не найдено.</p>'}`;
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
  app.innerHTML = !parts.length ? homeView() : parts[0] === 'work' ? workView(parts[1]) : parts[0] === 'entity' ? entityView(parts[1],parts[2]) : parts[0] === 'about' ? aboutView() : notFound();
  document.title = `${app.querySelector('h1')?.textContent.trim() || 'Энциклопедия сущностей'} — Энциклопедия сущностей`;
  window.scrollTo(0,0);
}

const searchPanel = document.getElementById('searchPanel');
const searchInput = document.getElementById('searchInput');
document.getElementById('searchToggle').addEventListener('click', () => { searchPanel.hidden = false; searchInput.focus(); });
document.getElementById('searchClose').addEventListener('click', () => { searchPanel.hidden = true; });
searchInput.addEventListener('input', event => { state.query = event.target.value; if (location.hash !== '#/' && location.hash !== '') location.hash = '#/'; else render(); });
window.addEventListener('hashchange', render);

loadData().then(render).catch(error => { console.error(error); app.innerHTML = `<p class="empty">${escapeHtml(error.message)}. Попробуйте обновить страницу.</p>`; });
