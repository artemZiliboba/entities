const REPO = 'artemZiliboba/entities';
const BRANCH = 'master';
const API_TREE = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

const TYPE_LABELS = {
  artifact: 'Артефакт',
  character: 'Персонаж',
  creature: 'Существо',
  location: 'Локация',
  substance: 'Вещество',
  plant: 'Растение',
  animal: 'Животное',
  spell: 'Заклинание',
  phenomenon: 'Явление'
};

const state = {
  entities: [],
  search: '',
  type: '',
  tradition: '',
  work: '',
  groupBy: 'none',
  sortBy: 'name'
};

const el = id => document.getElementById(id);

function uniq(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ru'));
}

function option(value, label) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function safeText(value) {
  return value == null ? '' : String(value);
}

function humanize(value) {
  if (!value) return '—';
  return value
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

async function loadYamlWorks() {
  const treeResponse = await fetch(API_TREE, { headers: { Accept: 'application/vnd.github+json' } });
  if (!treeResponse.ok) throw new Error(`GitHub API: ${treeResponse.status}`);

  const tree = await treeResponse.json();
  const yamlFiles = tree.tree
    .filter(item => item.type === 'blob')
    .map(item => item.path)
    .filter(path => path.startsWith('data/works/') && /\.ya?ml$/i.test(path));

  const works = await Promise.all(yamlFiles.map(async path => {
    const rawUrl = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${path}`;
    const response = await fetch(rawUrl);
    if (!response.ok) throw new Error(`Не удалось загрузить ${path}`);
    const text = await response.text();
    return { path, data: jsyaml.load(text) };
  }));

  return works;
}

function flattenWorks(works) {
  return works.flatMap(({ path, data }) => {
    const traditions = Array.isArray(data.tradition) ? data.tradition : [data.tradition].filter(Boolean);
    const entities = Array.isArray(data.entities) ? data.entities : [];

    return entities.map(entity => ({
      ...entity,
      workId: safeText(data.id),
      workTitle: safeText(data.title) || safeText(data.original_title) || data.id,
      originalTitle: safeText(data.original_title),
      kind: safeText(data.kind),
      traditions,
      source: data.source || null,
      path
    }));
  });
}

function populateFilters() {
  const types = uniq(state.entities.map(entity => entity.type));
  const traditions = uniq(state.entities.flatMap(entity => entity.traditions));
  const works = uniq(state.entities.map(entity => entity.workTitle));

  types.forEach(type => el('typeFilter').append(option(type, TYPE_LABELS[type] || humanize(type))));
  traditions.forEach(tradition => el('traditionFilter').append(option(tradition, humanize(tradition))));
  works.forEach(work => el('workFilter').append(option(work, work)));
}

function renderStats() {
  const works = uniq(state.entities.map(entity => entity.workTitle)).length;
  const traditions = uniq(state.entities.flatMap(entity => entity.traditions)).length;
  const types = uniq(state.entities.map(entity => entity.type)).length;

  const stats = [
    [state.entities.length, 'сущностей'],
    [works, 'произведений'],
    [traditions, 'традиций'],
    [types, 'типов']
  ];

  el('stats').innerHTML = stats.map(([value, label]) => `
    <div class="stat"><strong>${value}</strong><span>${label}</span></div>
  `).join('');
}

function filteredEntities() {
  const query = state.search.trim().toLocaleLowerCase('ru');

  return state.entities.filter(entity => {
    if (state.type && entity.type !== state.type) return false;
    if (state.tradition && !entity.traditions.includes(state.tradition)) return false;
    if (state.work && entity.workTitle !== state.work) return false;

    if (query) {
      const haystack = [
        entity.name,
        entity.description,
        entity.workTitle,
        entity.originalTitle,
        entity.type,
        ...(entity.traditions || []),
        ...(entity.tags || []),
        ...(entity.aliases || [])
      ].join(' ').toLocaleLowerCase('ru');
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

function sortEntities(items) {
  const key = state.sortBy;
  const getter = {
    name: entity => entity.name || '',
    work: entity => entity.workTitle || '',
    type: entity => TYPE_LABELS[entity.type] || entity.type || ''
  }[key];

  return [...items].sort((a, b) => getter(a).localeCompare(getter(b), 'ru'));
}

function groupValue(entity) {
  if (state.groupBy === 'work') return entity.workTitle;
  if (state.groupBy === 'type') return TYPE_LABELS[entity.type] || humanize(entity.type);
  if (state.groupBy === 'tradition') return humanize(entity.traditions[0] || 'Без традиции');
  return 'Все сущности';
}

function entityCard(entity) {
  const tags = Array.isArray(entity.tags) ? entity.tags : [];
  const traditions = (entity.traditions || []).map(humanize).join(', ');

  return `
    <article class="card">
      <div class="card-top">
        <div>
          <h3>${escapeHtml(entity.name || entity.id)}</h3>
        </div>
        <span class="badge">${escapeHtml(TYPE_LABELS[entity.type] || humanize(entity.type))}</span>
      </div>
      <p class="description">${escapeHtml(entity.description || 'Описание отсутствует.')}</p>
      <div class="meta">
        <span><strong>Произведение:</strong> ${escapeHtml(entity.workTitle)}</span>
        <span><strong>Традиция:</strong> ${escapeHtml(traditions || '—')}</span>
      </div>
      ${tags.length ? `<div class="tags">${tags.map(tag => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}</div>` : ''}
    </article>
  `;
}

function escapeHtml(value) {
  return safeText(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

function render() {
  const visible = sortEntities(filteredEntities());
  const catalog = el('catalog');
  el('resultTitle').textContent = `${visible.length} из ${state.entities.length}`;

  if (!visible.length) {
    catalog.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте изменить фильтры.</div>';
    return;
  }

  if (state.groupBy === 'none') {
    catalog.innerHTML = `<div class="grid">${visible.map(entityCard).join('')}</div>`;
    return;
  }

  const groups = new Map();
  visible.forEach(entity => {
    const key = groupValue(entity);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entity);
  });

  catalog.innerHTML = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, 'ru'))
    .map(([name, items]) => `
      <section class="group">
        <div class="group-title"><h3>${escapeHtml(name)}</h3><small>${items.length}</small></div>
        <div class="grid">${items.map(entityCard).join('')}</div>
      </section>
    `).join('');
}

function bindControls() {
  const bindings = [
    ['search', 'search', 'input'],
    ['typeFilter', 'type', 'change'],
    ['traditionFilter', 'tradition', 'change'],
    ['workFilter', 'work', 'change'],
    ['groupBy', 'groupBy', 'change'],
    ['sortBy', 'sortBy', 'change']
  ];

  bindings.forEach(([id, key, event]) => {
    el(id).addEventListener(event, e => {
      state[key] = e.target.value;
      render();
    });
  });

  el('resetFilters').addEventListener('click', () => {
    state.search = '';
    state.type = '';
    state.tradition = '';
    state.work = '';
    state.groupBy = 'none';
    state.sortBy = 'name';

    el('search').value = '';
    el('typeFilter').value = '';
    el('traditionFilter').value = '';
    el('workFilter').value = '';
    el('groupBy').value = 'none';
    el('sortBy').value = 'name';
    render();
  });
}

async function start() {
  try {
    const works = await loadYamlWorks();
    state.entities = flattenWorks(works);
    populateFilters();
    renderStats();
    bindControls();
    el('status').remove();
    render();
  } catch (error) {
    console.error(error);
    el('status').classList.add('error');
    el('status').textContent = `Не удалось загрузить данные: ${error.message}`;
  }
}

start();
