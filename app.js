/* ===========================================================
   Atlas · Country Explorer — app logic
   Data (static, CORS-enabled, no API key required):
     • Countries : mledoze/countries via jsDelivr
     • Population : samayo/country-json via jsDelivr
     • Flags     : flagcdn.com (free flag CDN)
   The two datasets are merged and normalised into one shape,
   so the app runs fully client-side — even opened as a file.
   =========================================================== */

const SRC = {
  countries: "https://cdn.jsdelivr.net/gh/mledoze/countries@master/countries.json",
  population: "https://cdn.jsdelivr.net/gh/samayo/country-json@master/src/country-by-population.json",
};

// Name mismatches between the two datasets (mledoze name -> population name)
const POP_ALIASES = {
  "dr congo": "the democratic republic of congo",
  "republic of the congo": "congo",
  "czechia": "czech republic",
  "cape verde": "cabo verde",
  "timor-leste": "east timor",
  "fiji": "fiji islands",
  "micronesia": "micronesia, federated states of",
  "vatican city": "holy see (vatican city state)",
  "myanmar": "myanmar",
  "são tomé and príncipe": "sao tome and principe",
  "côte d'ivoire": "ivory coast",
  "british virgin islands": "virgin islands, british",
  "united states virgin islands": "virgin islands, u.s.",
};

// ---------- State ----------
const state = {
  all: [],
  byCode: {},
  favorites: loadFavorites(),
  search: "",
  region: "",
  sort: "name-asc",
  showFavoritesOnly: false,
};

// ---------- Elements ----------
const el = {
  grid: document.getElementById("grid"),
  meta: document.getElementById("resultsMeta"),
  empty: document.getElementById("emptyState"),
  error: document.getElementById("errorState"),
  search: document.getElementById("searchInput"),
  region: document.getElementById("regionFilter"),
  sort: document.getElementById("sortBy"),
  favToggle: document.getElementById("favToggle"),
  themeToggle: document.getElementById("themeToggle"),
  retry: document.getElementById("retryBtn"),
  modal: document.getElementById("modal"),
  modalBody: document.getElementById("modalBody"),
};

// ---------- Init ----------
initTheme();
attachEvents();
loadCountries();

// ---------- Data loading ----------
async function loadCountries() {
  showSkeletons();
  el.error.hidden = true;
  try {
    const [countries, population] = await Promise.all([
      fetchJSON(SRC.countries),
      fetchJSON(SRC.population).catch(() => []), // population is optional
    ]);

    const popIndex = buildPopIndex(population);
    state.all = countries.map((c) => normalize(c, popIndex));
    state.byCode = {};
    state.all.forEach((c) => (state.byCode[c.cca3] = c));
    render();
  } catch (err) {
    console.error("Failed to load countries:", err);
    el.grid.innerHTML = "";
    el.empty.hidden = true;
    el.error.hidden = false;
    el.meta.textContent = "";
  }
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function buildPopIndex(list) {
  const idx = {};
  (list || []).forEach((row) => {
    if (row && row.country) idx[normKey(row.country)] = row.population;
  });
  return idx;
}

// Convert a raw mledoze record into the shape the UI consumes.
function normalize(c, popIndex) {
  const cca2 = (c.cca2 || "").toLowerCase();
  const common = c.name?.common || "Unknown";

  // population lookup: direct name, then alias table
  let population = popIndex[normKey(common)];
  if (population == null && POP_ALIASES[common.toLowerCase()]) {
    population = popIndex[normKey(POP_ALIASES[common.toLowerCase()])];
  }

  return {
    cca3: c.cca3,
    cca2: c.cca2,
    name: { common, official: c.name?.official || common },
    capital: c.capital || [],
    population: population != null ? population : null,
    region: c.region || "",
    subregion: c.subregion || "",
    area: c.area ?? null,
    languages: c.languages || {},
    currencies: c.currencies || {},
    borders: c.borders || [],
    tld: c.tld || [],
    independent: c.independent,
    unMember: c.unMember,
    latlng: c.latlng || [],
    flags: cca2
      ? {
          svg: `https://flagcdn.com/${cca2}.svg`,
          png: `https://flagcdn.com/w320/${cca2}.png`,
          alt: `Flag of ${common}`,
        }
      : { svg: "", png: "", alt: `Flag of ${common}` },
    maps: {
      googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(common)}`,
    },
  };
}

// ---------- Filtering + sorting ----------
function getVisible() {
  let list = state.all.slice();

  if (state.showFavoritesOnly) {
    list = list.filter((c) => state.favorites.includes(c.cca3));
  }
  if (state.region) {
    list = list.filter((c) => c.region === state.region);
  }
  if (state.search.trim()) {
    const q = state.search.trim().toLowerCase();
    list = list.filter((c) => {
      const common = c.name.common.toLowerCase();
      const official = c.name.official.toLowerCase();
      const capital = (c.capital[0] || "").toLowerCase();
      return common.includes(q) || official.includes(q) || capital.includes(q);
    });
  }

  const [key, dir] = state.sort.split("-");
  list.sort((a, b) => {
    let cmp;
    if (key === "pop") cmp = (a.population || 0) - (b.population || 0);
    else cmp = a.name.common.localeCompare(b.name.common);
    return dir === "desc" ? -cmp : cmp;
  });

  return list;
}

// ---------- Rendering ----------
function render() {
  const list = getVisible();

  if (list.length === 0) {
    el.grid.innerHTML = "";
    el.empty.hidden = false;
    el.meta.textContent = state.showFavoritesOnly
      ? "You haven't added any favorites yet."
      : "";
    return;
  }

  el.empty.hidden = true;
  el.meta.textContent =
    `Showing ${list.length} ${list.length === 1 ? "country" : "countries"}` +
    (state.showFavoritesOnly ? " · favorites" : "");

  el.grid.innerHTML = list.map(cardHTML).join("");
}

function cardHTML(c) {
  const isFav = state.favorites.includes(c.cca3);
  return `
    <article class="card" data-code="${c.cca3}" tabindex="0" role="button" aria-label="View details for ${escapeHTML(c.name.common)}">
      <button class="card-fav ${isFav ? "is-fav" : ""}" data-fav="${c.cca3}"
        aria-label="${isFav ? "Remove from" : "Add to"} favorites" title="Favorite">
        ${isFav ? "★" : "☆"}
      </button>
      <img class="card-flag" src="${c.flags.svg}" alt="${escapeHTML(c.flags.alt)}" loading="lazy"
        onerror="this.onerror=null;this.src='${c.flags.png}'" />
      <div class="card-body">
        <h3 class="card-name">${escapeHTML(c.name.common)}</h3>
        <ul class="card-stats">
          <li><b>Capital:</b> ${escapeHTML(c.capital[0] || "—")}</li>
          <li><b>Population:</b> ${fmtNum(c.population)}</li>
          <li><b>Region:</b> ${escapeHTML(c.region || "—")}</li>
        </ul>
      </div>
    </article>`;
}

function showSkeletons() {
  el.empty.hidden = true;
  el.meta.textContent = "Loading countries…";
  const one = `
    <div class="card skeleton">
      <div class="card-flag"></div>
      <div class="card-body">
        <div class="sk-line w-70"></div>
        <div class="sk-line w-50"></div>
        <div class="sk-line w-40"></div>
      </div>
    </div>`;
  el.grid.innerHTML = one.repeat(8);
}

// ---------- Detail modal ----------
function openModal(code) {
  const c = state.byCode[code];
  if (!c) return;
  el.modalBody.innerHTML = detailHTML(c);
  el.modal.hidden = false;
  document.body.style.overflow = "hidden";
  const closeBtn = el.modal.querySelector(".modal-close");
  if (closeBtn) closeBtn.focus();
}

function closeModal() {
  el.modal.hidden = true;
  document.body.style.overflow = "";
}

function detailHTML(c) {
  const isFav = state.favorites.includes(c.cca3);
  const languages = Object.values(c.languages);
  const currencies = Object.values(c.currencies).map(
    (x) => `${x.name}${x.symbol ? ` (${x.symbol})` : ""}`
  );
  const borders = c.borders
    .map((b) => state.byCode[b]?.name.common)
    .filter(Boolean);

  return `
    <img class="modal-flag" src="${c.flags.svg}" alt="${escapeHTML(c.flags.alt)}"
      onerror="this.onerror=null;this.src='${c.flags.png}'" />
    <div class="modal-content">
      <div class="modal-title-row">
        <h2 id="modalTitle">${escapeHTML(c.name.common)}</h2>
        <button class="modal-fav-btn ${isFav ? "is-fav" : ""}" data-fav="${c.cca3}">
          ${isFav ? "★ Favorited" : "☆ Add favorite"}
        </button>
      </div>
      <p class="modal-official">${escapeHTML(c.name.official)}</p>

      <div class="detail-grid">
        <div class="detail-item"><div class="label">Capital</div><div class="value">${escapeHTML(c.capital[0] || "—")}</div></div>
        <div class="detail-item"><div class="label">Population</div><div class="value">${fmtNum(c.population)}</div></div>
        <div class="detail-item"><div class="label">Region</div><div class="value">${escapeHTML(c.region || "—")}</div></div>
        <div class="detail-item"><div class="label">Subregion</div><div class="value">${escapeHTML(c.subregion || "—")}</div></div>
        <div class="detail-item"><div class="label">Area</div><div class="value">${c.area != null ? fmtNum(c.area) + " km²" : "—"}</div></div>
        <div class="detail-item"><div class="label">Density</div><div class="value">${density(c)}</div></div>
        <div class="detail-item"><div class="label">Top-level domain</div><div class="value">${escapeHTML(c.tld.join(", ") || "—")}</div></div>
        <div class="detail-item"><div class="label">Status</div><div class="value">${c.independent ? "Independent" : "Territory"}${c.unMember ? " · UN member" : ""}</div></div>
      </div>

      <div class="detail-item" style="margin-bottom:16px">
        <div class="label">Languages</div>
        <div class="chips">${languages.length ? languages.map((l) => `<span class="chip">${escapeHTML(l)}</span>`).join("") : "—"}</div>
      </div>
      <div class="detail-item" style="margin-bottom:16px">
        <div class="label">Currencies</div>
        <div class="chips">${currencies.length ? currencies.map((x) => `<span class="chip">${escapeHTML(x)}</span>`).join("") : "—"}</div>
      </div>
      ${borders.length ? `
      <div class="detail-item" style="margin-bottom:22px">
        <div class="label">Borders</div>
        <div class="chips">${borders.map((b) => `<span class="chip">${escapeHTML(b)}</span>`).join("")}</div>
      </div>` : ""}

      <div class="modal-links">
        <a href="${c.maps.googleMaps}" target="_blank" rel="noopener">📍 View on map</a>
      </div>
    </div>`;
}

function density(c) {
  if (!c.area || !c.population) return "—";
  return `${(c.population / c.area).toFixed(1)} /km²`;
}

// ---------- Favorites ----------
function toggleFavorite(code) {
  const i = state.favorites.indexOf(code);
  if (i === -1) state.favorites.push(code);
  else state.favorites.splice(i, 1);
  saveFavorites();
}
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("atlas.favorites") || "[]");
  } catch {
    return [];
  }
}
function saveFavorites() {
  try {
    localStorage.setItem("atlas.favorites", JSON.stringify(state.favorites));
  } catch {}
}

// ---------- Theme ----------
function initTheme() {
  const saved = localStorage.getItem("atlas.theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-theme", saved || (prefersDark ? "dark" : "light"));
}
function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme");
  const next = cur === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  try { localStorage.setItem("atlas.theme", next); } catch {}
}

// ---------- Events ----------
function attachEvents() {
  el.search.addEventListener("input", debounce((e) => {
    state.search = e.target.value;
    render();
  }, 200));

  el.region.addEventListener("change", (e) => { state.region = e.target.value; render(); });
  el.sort.addEventListener("change", (e) => { state.sort = e.target.value; render(); });

  el.favToggle.addEventListener("click", () => {
    state.showFavoritesOnly = !state.showFavoritesOnly;
    el.favToggle.setAttribute("aria-pressed", String(state.showFavoritesOnly));
    render();
  });

  el.themeToggle.addEventListener("click", toggleTheme);
  if (el.retry) el.retry.addEventListener("click", loadCountries);

  el.grid.addEventListener("click", (e) => {
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      e.stopPropagation();
      toggleFavorite(favBtn.dataset.fav);
      render();
      return;
    }
    const card = e.target.closest(".card");
    if (card) openModal(card.dataset.code);
  });
  el.grid.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && e.target.classList.contains("card")) {
      e.preventDefault();
      openModal(e.target.dataset.code);
    }
  });

  el.modal.addEventListener("click", (e) => {
    if (e.target.hasAttribute("data-close")) { closeModal(); return; }
    const favBtn = e.target.closest("[data-fav]");
    if (favBtn) {
      toggleFavorite(favBtn.dataset.fav);
      el.modalBody.innerHTML = detailHTML(state.byCode[favBtn.dataset.fav]);
      render();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !el.modal.hidden) closeModal();
  });
}

// ---------- Helpers ----------
function normKey(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents for reliable matching
}
function fmtNum(n) {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US");
}
function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
