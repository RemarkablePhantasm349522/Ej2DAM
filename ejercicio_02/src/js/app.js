/**
 * CineScope - Lógica del Cliente de Escritorio (app.js)
 * 
 * Cumple con todos los requisitos del Ejercicio 02:
 * - Consume la API pública de OMDb API (https://www.omdbapi.com/)
 * - Retorna datos estructurados en JSON vía HTTP/REST
 * - Implementa buscador por título de película o producción
 * - Implementa múltiples filtros funcionales:
 *     1. Formato / Tipo (Películas [movie], Series [series], Episodios)
 *     2. Año de estreno (y)
 *     3. Género cinematográfico (Acción, Ciencia Ficción, Drama, Comedia, etc.)
 * - Presenta listado en cuadrícula con pósteres oficiales de alta resolución
 * - Navegación por paginación dinámica con control de límites
 * - Ficha técnica completa en modal (sinopsis, director, reparto, rating de IMDb)
 * - Conexión segura con Electron y script de preload
 */

const $ = (id) => document.getElementById(id);

// Clave API de OMDb educativa/pública por defecto
const DEFAULT_API_KEY = 'trilogy';

// Estado centralizado de la aplicación
const state = {
  page: 1,
  limit: 10, // OMDb retorna 10 resultados por página
  totalPages: 1,
  totalCount: 0,
  activeController: null,
  currentMovies: [],
  movieDetailsCache: new Map()
};

// Traducciones amigables para tipos
const TYPE_TRANSLATIONS = {
  movie: 'Película',
  series: 'Serie',
  episode: 'Episodio',
  game: 'Videojuego'
};

/**
 * Inicialización al cargar el DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  initElectronBridge();
  initEventListeners();
  loadMovies();
});

/**
 * Detecta y aprovecha el puente seguro expuesto por Electron (preload.js)
 */
function initElectronBridge() {
  if (window.electronAPI?.appInfo) {
    const { name, version, platform } = window.electronAPI.appInfo;
    const badge = $('appPlatformBadge');
    const versionBadge = $('appVersionBadge');
    if (badge) badge.textContent = `⚡ ESCRITORIO · ${platform.toUpperCase()}`;
    if (versionBadge) versionBadge.textContent = `v${version}`;
  }
}

/**
 * Asignación de manejadores de eventos interactivos
 */
function initEventListeners() {
  const form = $('searchForm');
  const resetBtn = $('resetBtn');
  const prevBtn = $('prevBtn');
  const nextBtn = $('nextBtn');
  const queryInput = $('queryInput');
  const clearSearchBtn = $('clearSearchBtn');
  const closeModalBtn = $('closeModalBtn');
  const movieModal = $('movieModal');

  // Envío del formulario
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.page = 1;
    loadMovies();
  });

  // Botón restablecer
  resetBtn.addEventListener('click', () => {
    form.reset();
    clearSearchBtn.style.display = 'none';
    state.page = 1;
    loadMovies();
  });

  // Botón para borrar texto del input
  queryInput.addEventListener('input', () => {
    clearSearchBtn.style.display = queryInput.value ? 'block' : 'none';
  });

  clearSearchBtn.addEventListener('click', () => {
    queryInput.value = '';
    clearSearchBtn.style.display = 'none';
    queryInput.focus();
  });

  // Paginación
  prevBtn.addEventListener('click', () => {
    if (state.page > 1) {
      state.page--;
      loadMovies();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (state.page < state.totalPages) {
      state.page++;
      loadMovies();
    }
  });

  // Modal
  closeModalBtn.addEventListener('click', closeModal);
  movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeModal();
  });

  // Atajo de teclado Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/**
 * Construye la URL para consultar OMDb API
 */
function buildApiUrl() {
  const url = new URL('https://www.omdbapi.com/');
  const rawQuery = $('queryInput').value.trim();

  // Búsqueda por defecto si el campo está vacío
  const searchTerm = rawQuery || 'inception';

  url.searchParams.set('s', searchTerm);
  url.searchParams.set('page', state.page);
  url.searchParams.set('apikey', DEFAULT_API_KEY);

  // Filtro 1: Tipo / Formato
  const type = $('typeSelect').value;
  if (type) {
    url.searchParams.set('type', type);
  }

  // Filtro 2: Año de estreno
  const year = $('yearInput').value.trim();
  if (year) {
    url.searchParams.set('y', year);
  }

  return url;
}

/**
 * Realiza la petición a la API y controla los estados visuales
 */
async function loadMovies() {
  if (state.activeController) {
    state.activeController.abort();
  }

  state.activeController = new AbortController();
  const currentSignal = state.activeController.signal;
  const timeoutId = setTimeout(() => state.activeController?.abort(), 18000);

  showLoadingState();

  try {
    const url = buildApiUrl();
    const response = await fetch(url, { signal: currentSignal });

    if (!response.ok) {
      throw new Error(`Error en el servidor de OMDb (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (currentSignal.aborted) return;

    if (data.Response === 'False') {
      handleEmptyResults(data.Error || 'No se encontraron títulos.');
      return;
    }

    const totalFound = parseInt(data.totalResults, 10) || 0;
    state.totalCount = totalFound;
    state.currentMovies = data.Search || [];
    state.totalPages = Math.max(1, Math.ceil(totalFound / state.limit));

    // Filtro 3: Filtrado opcional por género si está seleccionado
    const selectedGenre = $('genreSelect').value;
    if (selectedGenre) {
      await filterMoviesByGenre(selectedGenre, currentSignal);
    } else {
      renderMovies(state.currentMovies);
      updateStatsAndPagination();
      setStatusMessage(`${state.totalCount.toLocaleString()} producciones encontradas · Página ${state.page} de ${state.totalPages}`, false);
    }

  } catch (error) {
    if (currentSignal.aborted) return;

    const isTimeout = error.name === 'AbortError';
    const message = isTimeout
      ? 'Tiempo de espera agotado al consultar OMDb API. Comprueba tu conexión a Internet y reintenta.'
      : `No se pudo conectar con OMDb API (${error.message}). Verifica tu conexión.`;

    showErrorState(message);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Filtra los resultados de la página actual por género consultando detalles
 */
async function filterMoviesByGenre(genre, signal) {
  setStatusMessage(`Filtrando películas por género: ${genre}…`, false);

  const filtered = [];
  for (const movie of state.currentMovies) {
    if (signal.aborted) return;
    const details = await fetchMovieDetails(movie.imdbID);
    if (details && details.Genre && details.Genre.toLowerCase().includes(genre.toLowerCase())) {
      filtered.push(movie);
    }
  }

  if (signal.aborted) return;

  if (filtered.length === 0) {
    handleEmptyResults(`No se encontraron películas de género "${genre}" en esta página.`);
  } else {
    renderMovies(filtered);
    updateStatsAndPagination();
    setStatusMessage(`${filtered.length} películas del género "${genre}" en esta página · Total general: ${state.totalCount.toLocaleString()}`, false);
  }
}

/**
 * Consulta detalles de una película específica por su imdbID (con caché)
 */
async function fetchMovieDetails(imdbID) {
  if (state.movieDetailsCache.has(imdbID)) {
    return state.movieDetailsCache.get(imdbID);
  }

  try {
    const url = `https://www.omdbapi.com/?i=${imdbID}&plot=full&apikey=${DEFAULT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.Response === 'True') {
      state.movieDetailsCache.set(imdbID, data);
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Muestra skeletons animados durante la carga
 */
function showLoadingState() {
  const grid = $('moviesGrid');
  grid.replaceChildren();

  $('prevBtn').disabled = true;
  $('nextBtn').disabled = true;

  setStatusMessage('Sintonizando la cartelera cinematográfica…', false);

  for (let i = 0; i < 8; i++) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-card';
    grid.append(skeleton);
  }
}

/**
 * Renderiza el listado de películas en la cuadrícula
 */
function renderMovies(movies) {
  const grid = $('moviesGrid');
  grid.replaceChildren();

  movies.forEach((movie) => {
    const card = createMovieCard(movie);
    grid.append(card);
  });
}

/**
 * Crea la tarjeta visual para una película
 */
function createMovieCard(movie) {
  const article = document.createElement('article');
  article.className = 'movie-card';

  // 1. Contenedor del Póster
  const posterContainer = document.createElement('div');
  posterContainer.className = 'movie-poster-container';

  // Badges flotantes (Tipo y Año)
  const badgesRow = document.createElement('div');
  badgesRow.className = 'poster-badges';

  const typePill = document.createElement('span');
  typePill.className = 'type-pill';
  typePill.textContent = TYPE_TRANSLATIONS[movie.Type] || movie.Type;

  const yearPill = document.createElement('span');
  yearPill.className = 'year-pill';
  yearPill.textContent = movie.Year;

  badgesRow.append(typePill, yearPill);
  posterContainer.append(badgesRow);

  // Imagen del póster o fallback
  const hasValidPoster = movie.Poster && movie.Poster !== 'N/A' && movie.Poster.startsWith('http');
  if (hasValidPoster) {
    const img = document.createElement('img');
    img.className = 'movie-poster';
    img.src = movie.Poster;
    img.alt = `Póster de ${movie.Title}`;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      posterContainer.replaceChild(createPosterPlaceholder(movie.Title), img);
    });
    posterContainer.append(img);
  } else {
    posterContainer.append(createPosterPlaceholder(movie.Title));
  }

  // 2. Contenido de la Película
  const content = document.createElement('div');
  content.className = 'movie-content';

  // Título
  const titleH2 = document.createElement('h2');
  titleH2.className = 'movie-title';
  titleH2.textContent = movie.Title;

  // Fila de metadatos rápidos
  const metaRow = document.createElement('div');
  metaRow.className = 'movie-meta-row';

  const formatSpan = document.createElement('span');
  formatSpan.textContent = `🎬 ${TYPE_TRANSLATIONS[movie.Type] || movie.Type} · ${movie.Year}`;

  metaRow.append(formatSpan);

  // Botón para ver ficha completa
  const detailBtn = document.createElement('button');
  detailBtn.type = 'button';
  detailBtn.className = 'btn-detail';
  detailBtn.innerHTML = `
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>
    </svg>
    <span>Ver Ficha de Película</span>
  `;
  detailBtn.addEventListener('click', () => openModal(movie));

  content.append(titleH2, metaRow, detailBtn);
  article.append(posterContainer, content);

  return article;
}

/**
 * Placeholder elegante para películas sin póster en la API
 */
function createPosterPlaceholder(title) {
  const placeholder = document.createElement('div');
  placeholder.className = 'movie-poster-placeholder';

  placeholder.innerHTML = `
    <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.8">
      <rect width="18" height="18" x="3" y="3" rx="2"/>
      <path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4"/>
    </svg>
  `;

  const span = document.createElement('span');
  span.textContent = title ? title.slice(0, 32) + '…' : 'Sin Póster';
  placeholder.append(span);

  return placeholder;
}

/**
 * Crea un bloque clave-valor
 */
function createDataItem(label, value) {
  const item = document.createElement('div');
  item.style.display = 'flex';
  item.style.flexDirection = 'column';
  item.style.gap = '2px';

  const lbl = document.createElement('span');
  lbl.style.fontSize = '11px';
  lbl.style.fontWeight = '600';
  lbl.style.textTransform = 'uppercase';
  lbl.style.letterSpacing = '0.05em';
  lbl.style.color = '#94a3b8';
  lbl.textContent = label;

  const val = document.createElement('span');
  val.style.fontSize = '13.5px';
  val.style.color = '#f8fafc';
  val.style.overflowWrap = 'break-word';
  val.textContent = value || 'No disponible';

  item.append(lbl, val);
  return item;
}

/**
 * Actualiza los contadores de la interfaz y botones de navegación
 */
function updateStatsAndPagination() {
  $('totalMoviesCount').textContent = state.totalCount.toLocaleString();
  $('totalPagesCount').textContent = state.totalPages.toLocaleString();

  $('currentPageText').textContent = `Página ${state.page}`;
  $('totalPagesText').textContent = `${state.totalPages}`;

  $('prevBtn').disabled = state.page <= 1;
  $('nextBtn').disabled = state.page >= state.totalPages;
}

/**
 * Gestiona la respuesta vacía o con error de OMDb
 */
function handleEmptyResults(errorMessage) {
  state.totalPages = 1;
  state.totalCount = 0;
  state.currentMovies = [];

  const grid = $('moviesGrid');
  grid.replaceChildren();

  const emptyMsg = document.createElement('div');
  emptyMsg.className = 'status-bar';
  emptyMsg.style.gridColumn = '1 / -1';
  emptyMsg.style.padding = '30px';
  emptyMsg.style.textAlign = 'center';
  emptyMsg.textContent = errorMessage || 'No se encontraron películas con los criterios seleccionados. Prueba con otro título o año.';

  grid.append(emptyMsg);
  updateStatsAndPagination();
  setStatusMessage('Sin películas encontradas para los filtros aplicados.', false);
}

/**
 * Presenta estado de error amigable
 */
function showErrorState(message) {
  const grid = $('moviesGrid');
  grid.replaceChildren();

  const errorBox = document.createElement('div');
  errorBox.className = 'status-bar error';
  errorBox.style.gridColumn = '1 / -1';
  errorBox.style.padding = '24px';
  errorBox.textContent = message;

  grid.append(errorBox);
  setStatusMessage(message, true);

  $('prevBtn').disabled = true;
  $('nextBtn').disabled = true;
  $('currentPageText').textContent = 'Página —';
  $('totalPagesText').textContent = '—';
}

/**
 * Actualiza la barra de estado
 */
function setStatusMessage(msg, isError = false) {
  const statusBar = $('statusBar');
  const statusMsg = $('statusMessage');

  statusMsg.textContent = msg;
  if (isError) {
    statusBar.classList.add('error');
  } else {
    statusBar.classList.remove('error');
  }
}

/**
 * Abre la ficha técnica cinematográfica extendida en el modal
 */
async function openModal(movie) {
  const modal = $('movieModal');
  const body = $('modalBody');
  body.replaceChildren();

  // Loader en el modal mientras carga
  const loadingP = document.createElement('p');
  loadingP.style.color = '#94a3b8';
  loadingP.style.padding = '30px';
  loadingP.style.textAlign = 'center';
  loadingP.textContent = 'Cargando ficha cinematográfica de IMDb…';
  body.append(loadingP);

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');

  // Obtener ficha completa
  const details = await fetchMovieDetails(movie.imdbID) || movie;
  body.replaceChildren();

  // Hero del modal (Póster + Título + Badges)
  const hero = document.createElement('div');
  hero.className = 'modal-hero';

  // Póster
  if (details.Poster && details.Poster !== 'N/A') {
    const img = document.createElement('img');
    img.className = 'modal-poster';
    img.src = details.Poster;
    img.alt = details.Title;
    hero.append(img);
  }

  const heroInfo = document.createElement('div');
  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = details.Title;

  const badgesRow = document.createElement('div');
  badgesRow.className = 'modal-badges-row';

  // Puntuación IMDb
  if (details.imdbRating && details.imdbRating !== 'N/A') {
    const scoreBadge = document.createElement('span');
    scoreBadge.className = 'score-badge';
    scoreBadge.innerHTML = `★ ${details.imdbRating}/10 IMDb`;
    badgesRow.append(scoreBadge);
  }

  // Clasificación por edad (Rated)
  if (details.Rated && details.Rated !== 'N/A') {
    const ratedBadge = document.createElement('span');
    ratedBadge.className = 'rated-badge';
    ratedBadge.textContent = details.Rated;
    badgesRow.append(ratedBadge);
  }

  // Duración
  if (details.Runtime && details.Runtime !== 'N/A') {
    const runtimeBadge = document.createElement('span');
    runtimeBadge.className = 'runtime-badge';
    runtimeBadge.textContent = `⏱️ ${details.Runtime}`;
    badgesRow.append(runtimeBadge);
  }

  heroInfo.append(title, badgesRow);

  // Géneros (chips)
  if (details.Genre && details.Genre !== 'N/A') {
    const genresBox = document.createElement('div');
    genresBox.className = 'tags-container';
    details.Genre.split(',').forEach((g) => {
      const chip = document.createElement('span');
      chip.className = 'meta-chip';
      chip.textContent = g.trim();
      genresBox.append(chip);
    });
    heroInfo.append(genresBox);
  }

  hero.append(heroInfo);

  // Sinopsis (Plot)
  const plotBox = document.createElement('div');
  plotBox.className = 'modal-plot';
  plotBox.textContent = details.Plot && details.Plot !== 'N/A' ? details.Plot : 'Sinopsis no disponible en la base de datos.';

  // Cuadrícula de metadatos (Director, Actores, Estreno, Premios, Taquilla)
  const metaGrid = document.createElement('div');
  metaGrid.className = 'modal-meta-grid';

  metaGrid.append(
    createDataItem('Director', details.Director),
    createDataItem('Reparto Principal', details.Actors),
    createDataItem('Fecha de Estreno', details.Released || details.Year),
    createDataItem('Idioma Original', details.Language),
    createDataItem('Premios y Reconocimientos', details.Awards),
    createDataItem('Recaudación en Taquilla', details.BoxOffice)
  );

  body.append(hero, plotBox, metaGrid);
}

/**
 * Cierra el modal
 */
function closeModal() {
  const modal = $('movieModal');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
}
