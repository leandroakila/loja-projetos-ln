// Página de detalhes. Só exibe projetos publicados (as regras negam rascunhos ao público).
import "./ui.js";
import { db, isReady, doc, getDoc } from "./firebase.js";
import { escapeHtml, formatPrice, whatsappLink, safeImageUrl, typeLabel } from "./utils.js";

const status = document.getElementById("project-status");
const box = document.getElementById("project");

function fail(message, kind = "warn") {
  status.hidden = false;
  status.className = `notice notice-${kind}`;
  status.innerHTML = `${escapeHtml(message)} <a href="index.html#catalogo">Ver catálogo</a>`;
}

async function load() {
  const id = new URLSearchParams(location.search).get("id") || "";
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) return fail("Projeto não encontrado.");
  if (!isReady) return fail("O site ainda está em configuração.");

  try {
    const snap = await getDoc(doc(db, "projects", id));
    if (!snap.exists() || snap.data().published !== true) return fail("Projeto não encontrado ou indisponível.");
    render({ id: snap.id, ...snap.data() });
  } catch (err) {
    if (err.code === "permission-denied") return fail("Projeto não encontrado ou indisponível.");
    console.error(err);
    fail("Não foi possível carregar o projeto agora. Tente novamente.", "error");
  }
}

function render(p) {
  document.title = `${p.title} — LN Sistemas`;
  document.querySelector('meta[name="description"]')?.setAttribute("content", p.summary || p.title);

  const pageUrl = `${location.origin}${location.pathname}?id=${encodeURIComponent(p.id)}`;
  const wa = whatsappLink(
    `Olá, Leandro! Tenho interesse no projeto "${p.title}" (${pageUrl}). Pode me passar informações sobre valores, forma de pagamento e entrega?`
  );
  const features = (p.features || []).filter(Boolean);
  const tags = (p.tags || []).filter(Boolean);

  box.innerHTML = `
    <div class="project-media">
      <img src="${safeImageUrl(p.imageUrl)}" alt="Imagem ilustrativa de ${escapeHtml(p.title)}" width="960" height="600">
    </div>
    <div class="project-info">
      <div class="card-meta">
        <span class="badge">${escapeHtml(typeLabel(p.type))}</span>
        ${p.category ? `<span class="muted small">${escapeHtml(p.category)}</span>` : ""}
      </div>
      <h1>${escapeHtml(p.title)}</h1>
      <p class="lead-dark">${escapeHtml(p.summary)}</p>
      <p class="project-price">${escapeHtml(formatPrice(p))}</p>
      <a class="btn btn-wa btn-block" href="${wa}" target="_blank" rel="noopener">Quero este projeto — falar no WhatsApp</a>
      <div class="notice notice-info small">
        A compra é combinada diretamente pelo WhatsApp. Não há pagamento automático no site:
        após a confirmação, o acesso ao arquivo é liberado manualmente para o seu e-mail Google
        na <a href="cliente.html">Área do cliente</a>.
      </div>
      ${tags.length ? `<p class="tags">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}</p>` : ""}
    </div>
    <div class="project-body">
      ${p.description ? `<h2>Descrição</h2><div class="prewrap">${escapeHtml(p.description)}</div>` : ""}
      ${features.length ? `<h2>O que está incluído</h2><ul class="features-list">${features.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` : ""}
    </div>`;
  status.hidden = true;
  box.hidden = false;
}

load();
