const documents = {
  terminos: {
    file: 'terminos-y-condiciones.md',
    label: 'Términos y condiciones'
  },
  privacidad: {
    file: 'politica-de-privacidad.md',
    label: 'Política de privacidad'
  }
};

const content = document.querySelector('#document-content');
const documentType = document.querySelector('#document-type');
const search = document.querySelector('#search');
const themeToggle = document.querySelector('#theme-toggle');
let rawMarkdown = '';
let activeDocument = 'terminos';

function setTheme(theme) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
  themeToggle.querySelector('.theme-icon').textContent = isDark ? '☀' : '☾';
  themeToggle.querySelector('.theme-label').textContent = isDark ? 'Modo claro' : 'Modo oscuro';
  localStorage.setItem('vibraapp-theme', isDark ? 'dark' : 'light');
}

function renderDocument(markdown) {
  content.innerHTML = marked.parse(markdown, { headerIds: true, mangle: false });
  applySearch(search.value);
}

async function loadDocument(key, updateUrl = true) {
  const documentInfo = documents[key];
  if (!documentInfo) return;

  activeDocument = key;
  rawMarkdown = '';
  content.innerHTML = '<div class="loading-state">Cargando documento...</div>';
  documentType.textContent = documentInfo.label;
  document.querySelectorAll('.document-link').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.document === key);
  });

  try {
    const response = await fetch(documentInfo.file);
    if (!response.ok) throw new Error('No se pudo cargar el documento');
    rawMarkdown = await response.text();
    renderDocument(rawMarkdown);
    if (updateUrl) history.replaceState(null, '', `#${key}`);
  } catch (error) {
    content.innerHTML = '<div class="loading-state">No se pudo cargar este documento. Abre la página desde un servidor local.</div>';
  }
}

function applySearch(term) {
  if (!rawMarkdown) return;
  renderDocumentWithoutSearch();
  const query = term.trim();
  if (!query) return;

  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  const normalizedQuery = query.toLocaleLowerCase('es');
  textNodes.forEach((node) => {
    if (!node.parentElement || ['SCRIPT', 'STYLE'].includes(node.parentElement.tagName)) return;
    const text = node.nodeValue;
    const lowerText = text.toLocaleLowerCase('es');
    if (!lowerText.includes(normalizedQuery)) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let matchIndex = lowerText.indexOf(normalizedQuery);
    while (matchIndex !== -1) {
      fragment.append(text.slice(cursor, matchIndex));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(matchIndex, matchIndex + query.length);
      fragment.append(mark);
      cursor = matchIndex + query.length;
      matchIndex = lowerText.indexOf(normalizedQuery, cursor);
    }
    fragment.append(text.slice(cursor));
    node.parentNode.replaceChild(fragment, node);
  });
}

function renderDocumentWithoutSearch() {
  content.innerHTML = marked.parse(rawMarkdown, { headerIds: true, mangle: false });
}

document.querySelectorAll('.document-link').forEach((button) => {
  button.addEventListener('click', () => loadDocument(button.dataset.document));
});
search.addEventListener('input', () => applySearch(search.value));
themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
window.addEventListener('hashchange', () => loadDocument(location.hash.slice(1), false));

setTheme(localStorage.getItem('vibraapp-theme') || 'light');
loadDocument(documents[location.hash.slice(1)] ? location.hash.slice(1) : activeDocument, false);
