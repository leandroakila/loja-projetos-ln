// Catálogo público: lista apenas projetos publicados, com busca e filtros no navegador.
import "./ui.js";
import { db, isReady, collection, query, where, orderBy, getDocs } from "./firebase.js";
import { escapeHtml, formatPrice, normalize, whatsappLink, safeImageUrl, TYPES, typeLabel, tsMillis } from "./utils.js";

const els = {
  search: document.getElementById("f-search"),
  chips: document.getElementById("f-types"),
  category: document.getElementById("f-category"),
  price: document.getElementById("f-price"),
  sort: document.getElementById("f-sort"),
  clear: document.getElementById("f-clear"),
  grid: document.getElementById("catalog-grid"),
  count: document.getElementById("catalog-count"),
  status: document.getElementById("catalog-status"),
  empty: document.getElementById("catalog-empty")
};

const state = { q: "", type: "", category: "", price: "", sort: "featured" };
let all = [];

function showStatus(message, kind = "info") {
  els.status.hidden = false;
  els.status.className = `notice notice-${kind}`;
  els.status.textContent = message;
}

async function fetchPublished() {
  const base = collection(db, "projects");
  try {
    return await getDocs(query(base, where("published", "==", true), orderBy("updatedAt", "desc")));
  } catch (err) {
    // Sem o índice composto o Firestore devolve failed-precondition; seguimos sem ordenação no servidor.
    if (err.code === "failed-precondition") {
      console.warn("[LN] Índice composto ausente — crie-o (veja README). Ordenando no navegador.", err.message);
      return await getDocs(query(base, where("published", "==", true)));
    }
    throw err;
  }
}

async function load() {
  renderChips();
  if (!isReady) {
    showStatus("Catálogo em configuração. Enquanto isso, fale com a gente pelo WhatsApp.", "warn");
    els.count.textContent = "";
    return;
  }
  showStatus("Carregando projetos…");
  try {
    const snap = await fetchPublished();
    all = snap.docs.map((d) => {
      const p = { id: d.id, ...d.data() };
      p._search = normalize([p.title, p.summary, p.description, p.category, typeLabel(p.type), ...(p.tags || [])].join(" "));
      return p;
    });
    els.status.hidden = true;
    populateCategories();
    readUrl();
    render();
  } catch (err) {
    console.error(err);
    showStatus("Não foi possível carregar o catálogo agora. Tente recarregar a página ou fale pelo WhatsApp.", "error");
  }
}

function renderChips() {
  const opts = [{ value: "", label: "Todos" }, ...TYPES];
  els.chips.innerHTML = opts
    .map((t) => `<button type="button" class="chip" data-type="${t.value}" aria-pressed="${state.type === t.value}">${escapeHtml(t.label)}</button>`)
    .join("");
}

function populateCategories() {
  const cats = [...new Set(all.map((p) => (p.category || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  els.category.innerHTML =
    `<option value="">Todas as categorias</option>` +
    cats.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  state.q = p.get("q") || "";
  state.type = TYPES.some((t) => t.value === p.get("tipo")) ? p.get("tipo") : "";
  state.category = p.get("categoria") || "";
  els.search.value = state.q;
  if ([...els.category.options].some((o) => o.value === state.category)) els.category.value = state.category;
  else state.category = "";
  renderChips();
}

function writeUrl() {
  const p = new URLSearchParams();
  if (state.q) p.set("q", state.q);
  if (state.type) p.set("tipo", state.type);
  if (state.category) p.set("categoria", state.category);
  const qs = p.toString();
  history.replaceState(null, "", `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`);
}

function matchesPrice(p) {
  const v = typeof p.price === "number" ? p.price : null;
  switch (state.price) {
    case "ate100": return v !== null && v <= 100;
    case "100a500": return v !== null && v > 100 && v <= 500;
    case "acima500": return v !== null && v > 500;
    case "consulta": return v === null;
    default: return true;
  }
}

function sortList(list) {
  const byPrice = (dir) => (a, b) => {
    const pa = typeof a.price === "number" ? a.price : null;
    const pb = typeof b.price === "number" ? b.price : null;
    if (pa === null && pb === null) return 0;
    if (pa === null) return 1;
    if (pb === null) return -1;
    return dir * (pa - pb);
  };
  const recent = (a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt);
  switch (state.sort) {
    case "recent": return list.sort(recent);
    case "price-asc": return list.sort(byPrice(1));
    case "price-desc": return list.sort(byPrice(-1));
    case "az": return list.sort((a, b) => (a.title || "").localeCompare(b.title || "", "pt-BR"));
    default: return list.sort((a, b) => Number(!!b.featured) - Number(!!a.featured) || recent(a, b));
  }
}

function card(p) {
  const url = `projeto.html?id=${encodeURIComponent(p.id)}`;
  const wa = whatsappLink(`Olá, Leandro! Tenho interesse no projeto "${p.title}" que vi no site da LN Sistemas. Pode me passar mais informações?`);
  return `
    <article class="card">
      <a class="card-media" href="${url}" aria-label="Ver detalhes de ${escapeHtml(p.title)}">
        <img src="${safeImageUrl(p.imageUrl)}" alt="" loading="lazy" width="640" height="400">
        ${p.featured ? '<span class="badge badge-featured">Destaque</span>' : ""}
      </a>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge">${escapeHtml(typeLabel(p.type))}</span>
          ${p.category ? `<span class="muted small">${escapeHtml(p.category)}</span>` : ""}
        </div>
        <h3 class="card-title"><a href="${url}">${escapeHtml(p.title)}</a></h3>
        <p class="card-summary">${escapeHtml(p.summary)}</p>
        <p class="card-price">${escapeHtml(formatPrice(p))}</p>
        <div class="card-actions">
          <a class="btn btn-outline btn-sm" href="${url}">Ver detalhes</a>
          <a class="btn btn-wa btn-sm" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>
        </div>
      </div>
    </article>`;
}

function render() {
  const q = normalize(state.q);
  const terms = q.split(/\s+/).filter(Boolean);
  const list = sortList(
    all.filter(
      (p) =>
        (!state.type || p.type === state.type) &&
        (!state.category || p.category === state.category) &&
        matchesPrice(p) &&
        terms.every((t) => p._search.includes(t))
    )
  );
  els.grid.innerHTML = list.map(card).join("");
  els.empty.hidden = list.length > 0 || all.length === 0;
  els.count.textContent = all.length === 0
    ? "Nenhum projeto publicado ainda."
    : `${list.length} de ${all.length} projeto${all.length > 1 ? "s" : ""}`;
  writeUrl();
}

let t;
els.search.addEventListener("input", () => {
  clearTimeout(t);
  t = setTimeout(() => { state.q = els.search.value.trim(); render(); }, 180);
});
els.chips.addEventListener("click", (e) => {
  const btn = e.target.closest(".chip");
  if (!btn) return;
  state.type = btn.dataset.type;
  renderChips();
  render();
});
els.category.addEventListener("change", () => { state.category = els.category.value; render(); });
els.price.addEventListener("change", () => { state.price = els.price.value; render(); });
els.sort.addEventListener("change", () => { state.sort = els.sort.value; render(); });
els.clear.addEventListener("click", () => {
  Object.assign(state, { q: "", type: "", category: "", price: "", sort: "featured" });
  els.search.value = ""; els.category.value = ""; els.price.value = ""; els.sort.value = "featured";
  renderChips();
  render();
});

load();
