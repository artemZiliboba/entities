const REPO = 'artemZiliboba/entities';
const BRANCH = 'master';
const API_TREE = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

const TYPES = {
  artifact: { label: 'Артефакты', singular: 'Артефакт', icon: '✦' },
  character: { label: 'Персонажи', singular: 'Персонаж', icon: '♙' },
  creature: { label: 'Существа', singular: 'Существо', icon: '☾' },
  location: { label: 'Локации', singular: 'Локация', icon: '△' },
  substance: { label: 'Вещества', singular: 'Вещество', icon: '◒' },
  plant: { label: 'Растения', singular: 'Растение', icon: '♧' },
  animal: { label: 'Животные', singular: 'Животное', icon: '♞' },
  spell: { label: 'Заклинания', singular: 'Заклинание', icon: '✧' },
  phenomenon: { label: 'Явления', singular: 'Явление', icon: '◎' }
};

const state = { entities: [], search: '', type: '', tradition: '', work: '', groupBy: 'none', sortBy: 'name' };
const el = id => document.getElementById(id);
const safeText = value => value == null ? '' : String(value);
const escapeHtml = value => safeText(value).replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const uniq = values => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));

function humanize(value) {
  if (!value) return '—';
  return value.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function option(value, label) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

async function loadYamlWorks() {
  const treeResponse = await fetch(API_TREE, { headers: { Accept: 'application/vnd.github+json' } });
  if (!treeResponse.ok) throw new Error(`GitHub API: ${treeResponse.status}`);
  const tree = await treeResponse.json();
  const yamlFiles = tree.tree.filter(item => item.type === 'blob').map(item => item.path).filter(path => path.startsWith('data/works/') && /\.ya?ml$/i.test(path));
  return Promise.all(yamlFiles.map(async path => {
    const response = await fetch(`https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`);
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}`);
    return { path, data: jsyaml.load(await response.text()) };
  }));
}

function flattenWorks(works) {
  return works.flatMap(({ path, data }) => {
    const traditions = Array.isArray(data.tradition) ? data.tradition : [data.tradition].filter(Boolean);
    return (Array.isArray(data.entities) ? data.entities : []).map(entity => ({
      ...entity,
      workId: safeText(data.id),
      workTitle: safeText(data.title) || safeText(data.original_title) || data.id,
      originalTitle: safeText(data.original_title),
      kind: safeText(data.kind),
      author: safeText(data.author),
      collection: safeText(data.collection),
      traditions,
      source: data.source || null,
      path
    }));
  });
}

function typeInfo(type) { return TYPES[type] || { label: humanize(type), singular: humanize(type), icon: '✦' }; }
function typeCounts() { return Object.fromEntries(Object.keys(TYPES).map(type => [type, state.entities.filter(e => e.type === type).length])); }

function populateFilters() {
  uniq(state.entities.flatMap(e => e.traditions)).forEach(v => el('traditionFilter').append(option(v, humanize(v))));
  uniq(state.entities.map(e => e.workTitle)).forEach(v => el('workFilter').append(option(v, v)));
}

function renderNavigation() {
  const counts = typeCounts();
  el('typeNav').innerHTML = Object.entries(TYPES).map(([type, info]) => `<button class="nav-item" type="button" data-type="${type}"><span>${info.icon}</span>${info.label}</button>`).join('');
  el('typeGrid').innerHTML = Object.entries(TYPES).map(([type, info]) => `<button class="type-card${state.type === type ? ' active' : ''}" type="button" data-type="${type}"><span class="type-icon">${info.icon}</span><strong>${info.label}</strong><small>${counts[type] || 0}</small></button>`).join('');
  el('quickFilters').innerHTML = `<button class="quick-filter${!state.type ? ' active' : ''}" data-type="" type="button">Все · ${state.entities.length}</button>` + Object.entries(TYPES).map(([type, info]) => `<button class="quick-filter${state.type === type ? ' active' : ''}" data-type="${type}" type="button">${info.label} · ${counts[type] || 0}</button>`).join('');
}

function renderStats() {
  const works = uniq(state.entities.map(e => e.workTitle)).length;
  const traditions = uniq(state.entities.flatMap(e => e.traditions)).length;
  const stats = [[state.entities.length, 'сущностей'], [works, 'произведений'], [traditions, 'традиций'], [uniq(state.entities.map(e => e.type)).length, 'типов']];
  el('stats').innerHTML = stats.map(([value, label]) => `<div class="stat"><strong>${value}</strong><span>${label}</span></div>`).join('');
}

function filteredEntities() {
  const query = state.search.trim().toLocaleLowerCase('ru');
  return state.entities.filter(entity => {
    if (state.type && entity.type !== state.type) return false;
    if (state.tradition && !entity.traditions.includes(state.tradition)) return false;
    if (state.work && entity.workTitle !== state.work) return false;
    if (!query) return true;
    const haystack = [entity.name, entity.description, entity.workTitle, entity.originalTitle, entity.type, ...(entity.traditions || []), ...(entity.tags || []), ...(entity.aliases || [])].join(' ').toLocaleLowerCase('ru');
    return haystack.includes(query);
  });
}

function sortEntities(items) {
  const getter = { name: e => e.name || '', work: e => e.workTitle || '', type: e => typeInfo(e.type).singular }[state.sortBy];
  return [...items].sort((a, b) => getter(a).localeCompare(getter(b), 'ru'));
}

function groupValue(entity) {
  if (state.groupBy === 'work') return entity.workTitle;
  if (state.groupBy === 'type') return typeInfo(entity.type).label;
  if (state.groupBy === 'tradition') return humanize(entity.traditions[0] || 'Без традиции');
  return 'Все сущности';
}

function placeholderSvg(entity, idSuffix = '') {
  const seed = [...safeText(entity.id || entity.name)].reduce((sum, c) => sum + c.charCodeAt(0), 0);
  const moonX = 65 + (seed % 65);
  const peak = 45 + (seed % 35);
  const uid = safeText(entity.id || 'entity').replace(/[^a-z0-9]/gi, '') + idSuffix;
  return `<svg viewBox="0 0 320 130" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g${uid}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#263b4c"/><stop offset="1" stop-color="#101923"/></linearGradient><linearGradient id="m${uid}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d3ad6e"/><stop offset="1" stop-color="#4e3f2b"/></linearGradient></defs><rect width="320" height="130" fill="url(#g${uid})"/><circle cx="${moonX}" cy="30" r="18" fill="#e4c98f" opacity=".68"/><path d="M0 104 52 ${peak}l43 48 39-58 52 63 43-42 42 49 49-36v52H0Z" fill="#101820"/><path d="M138 101V69h12V53h10v16h12V43h11v26h12v32Z" fill="url(#m${uid})" opacity=".82"/><path d="M0 112c50-11 92-9 135 0s80 8 113-1 54-8 72-3v22H0Z" fill="#091017"/></svg>`;
}

function entityCard(entity) {
  const tags = Array.isArray(entity.tags) ? entity.tags : [];
  const traditions = (entity.traditions || []).map(humanize).join(', ');
  return `<article class="card" tabindex="0" role="button" data-entity-id="${escapeHtml(entity.id)}" data-work-id="${escapeHtml(entity.workId)}">
    <div class="card-visual">${placeholderSvg(entity, 'card')}<span class="card-type">${escapeHtml(typeInfo(entity.type).singular)}</span></div>
    <div class="card-body"><h3>${escapeHtml(entity.name || entity.id)}</h3><p class="card-subtitle">${escapeHtml(traditions || 'Без традиции')}</p><p class="description">${escapeHtml(entity.description || 'Описание отсутствует.')}</p><div class="meta"><strong>${escapeHtml(entity.workTitle)}</strong>${entity.kind ? ` · ${escapeHtml(humanize(entity.kind))}` : ''}</div>${tags.length ? `<div class="tags">${tags.slice(0, 4).map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}</div>
  </article>`;
}

function render() {
  const visible = sortEntities(filteredEntities());
  el('resultTitle').textContent = `Найдено ${visible.length} из ${state.entities.length}`;
  el('catalogTitle').textContent = state.type ? typeInfo(state.type).label : 'Все сущности';
  renderNavigation();
  updateFilterCount();
  if (!visible.length) { el('catalog').innerHTML = '<div class="empty">Ничего не найдено. Попробуйте изменить поиск или фильтры.</div>'; return; }
  if (state.groupBy === 'none') { el('catalog').innerHTML = `<div class="grid">${visible.map(entityCard).join('')}</div>`; return; }
  const groups = new Map();
  visible.forEach(entity => { const key = groupValue(entity); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(entity); });
  el('catalog').innerHTML = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b, 'ru')).map(([name, items]) => `<section class="group"><div class="group-title"><h3>${escapeHtml(name)}</h3><small>${items.length}</small></div><div class="grid">${items.map(entityCard).join('')}</div></section>`).join('');
}

function updateFilterCount() {
  const count = [state.type, state.tradition, state.work, state.groupBy !== 'none' ? state.groupBy : ''].filter(Boolean).length;
  el('activeFilterCount').textContent = count ? `(${count})` : '';
}

function setType(type) {
  state.type = type || '';
  render();
  el('catalogSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.body.classList.remove('menu-open');
}

function resetFilters() {
  Object.assign(state, { search: '', type: '', tradition: '', work: '', groupBy: 'none', sortBy: 'name' });
  el('search').value = '';
  ['traditionFilter', 'workFilter'].forEach(id => el(id).value = '');
  el('groupBy').value = 'none'; el('sortBy').value = 'name';
  render();
}

function openEntity(entity) {
  const traditions = (entity.traditions || []).map(humanize).join(', ');
  const aliases = Array.isArray(entity.aliases) ? entity.aliases.join(', ') : '';
  const tags = Array.isArray(entity.tags) ? entity.tags : [];
  const source = entity.source || {};
  el('dialogContent').innerHTML = `<div class="dialog-hero">${placeholderSvg(entity, 'dialog')}</div><div class="dialog-body"><p class="dialog-kicker">${escapeHtml(typeInfo(entity.type).singular)} · ${escapeHtml(traditions || 'Без традиции')}</p><h2>${escapeHtml(entity.name || entity.id)}</h2><p class="dialog-description">${escapeHtml(entity.description || 'Описание отсутствует.')}</p>${tags.length ? `<div class="tags">${tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}<div class="dialog-details"><div class="detail"><span>Произведение</span>${escapeHtml(entity.workTitle)}</div><div class="detail"><span>Тип произведения</span>${escapeHtml(humanize(entity.kind))}</div><div class="detail"><span>Традиция</span>${escapeHtml(traditions || '—')}</div><div class="detail"><span>Также известно как</span>${escapeHtml(aliases || '—')}</div>${entity.author ? `<div class="detail"><span>Автор</span>${escapeHtml(entity.author)}</div>` : ''}${source.title || source.url ? `<div class="detail"><span>Источник</span>${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title || 'Открыть источник')} ↗</a>` : escapeHtml(source.title)}</div>` : ''}</div></div>`;
  el('entityDialog').showModal();
}

function bindControls() {
  el('search').addEventListener('input', e => { state.search = e.target.value; render(); });
  [['traditionFilter', 'tradition'], ['workFilter', 'work'], ['groupBy', 'groupBy'], ['sortBy', 'sortBy']].forEach(([id, key]) => el(id).addEventListener('change', e => { state[key] = e.target.value; render(); }));
  el('resetFilters').addEventListener('click', resetFilters);
  el('showAllTypes').addEventListener('click', () => setType(''));
  el('filterToggle').addEventListener('click', () => { const panel = el('filtersPanel'); const open = panel.classList.toggle('open'); el('filterToggle').setAttribute('aria-expanded', String(open)); });
  el('menuToggle').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  el('sidebarBackdrop').addEventListener('click', () => document.body.classList.remove('menu-open'));
  document.addEventListener('click', e => {
    const typeButton = e.target.closest('[data-type]');
    if (typeButton && !typeButton.closest('.card')) { setType(typeButton.dataset.type); return; }
    const sectionButton = e.target.closest('[data-section]');
    if (sectionButton) { (sectionButton.dataset.section === 'overview' ? el('overview') : el('catalogSection')).scrollIntoView({ behavior: 'smooth' }); document.body.classList.remove('menu-open'); }
    const focusButton = e.target.closest('[data-focus]');
    if (focusButton) { el('filtersPanel').classList.add('open'); el('filterToggle').setAttribute('aria-expanded', 'true'); el(focusButton.dataset.focus === 'tradition' ? 'traditionFilter' : 'workFilter').focus(); el('catalogSection').scrollIntoView({ behavior: 'smooth' }); document.body.classList.remove('menu-open'); }
    const card = e.target.closest('.card');
    if (card) { const entity = state.entities.find(item => item.id === card.dataset.entityId && item.workId === card.dataset.workId); if (entity) openEntity(entity); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && document.activeElement !== el('search')) { e.preventDefault(); el('search').focus(); }
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList.contains('card')) { e.preventDefault(); document.activeElement.click(); }
  });
  el('dialogClose').addEventListener('click', () => el('entityDialog').close());
  el('entityDialog').addEventListener('click', e => { if (e.target === el('entityDialog')) el('entityDialog').close(); });
}

async function start() {
  try {
    const works = await loadYamlWorks();
    state.entities = flattenWorks(works);
    populateFilters(); renderStats(); renderNavigation(); bindControls(); el('status').remove(); render();
  } catch (error) {
    console.error(error); el('status').classList.add('error'); el('status').textContent = `Не удалось загрузить данные: ${error.message}`;
  }
}

start();
