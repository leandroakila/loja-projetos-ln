// Utilitários compartilhados (sem dependência do Firebase).

export const WHATSAPP_NUMBER = "5562992526144";
export const WHATSAPP_DISPLAY = "+55 62 99252-6144";

export const TYPES = [
  { value: "planilha", label: "Planilha" },
  { value: "sistema", label: "Sistema" },
  { value: "automacao", label: "Automação" },
  { value: "outro", label: "Outro" }
];

export function typeLabel(value) {
  return TYPES.find((t) => t.value === value)?.label || "Projeto";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatPrice(project) {
  const label = (project?.priceLabel || "").trim();
  if (typeof project?.price === "number") {
    return label ? `${label} ${brl.format(project.price)}` : brl.format(project.price);
  }
  return label || "Sob consulta";
}

export function whatsappLink(message, number = WHATSAPP_NUMBER) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function normalize(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function slugify(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 140);
}

export function safeFileName(name) {
  const clean = String(name || "arquivo").normalize("NFD").replace(/[̀-ͯ]/g, "");
  return clean.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "arquivo";
}

// Só aceita imagens servidas pelo Firebase Storage; caso contrário usa placeholder.
export function safeImageUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && u.hostname === "firebasestorage.googleapis.com") return u.href;
  } catch (_) { /* URL inválida */ }
  return "assets/img/placeholder.svg";
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(i ? 1 : 0).replace(".", ",")} ${units[i]}`;
}

export function formatDate(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  return d ? d.toLocaleDateString("pt-BR") : "—";
}

export function tsMillis(ts) {
  return ts?.toMillis ? ts.toMillis() : 0;
}

export function authErrorMessage(err) {
  const map = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-not-found": "Usuário não encontrado.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    "auth/popup-blocked": "O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.",
    "auth/popup-closed-by-user": "A janela de login foi fechada antes de concluir.",
    "auth/cancelled-popup-request": "Login cancelado.",
    "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase Authentication (veja o README).",
    "auth/operation-not-allowed": "Este método de login não está ativado no Firebase.",
    "auth/network-request-failed": "Falha de rede. Verifique sua conexão."
  };
  return map[err?.code] || "Não foi possível entrar. Tente novamente.";
}

export function toast(message, kind = "info") {
  let box = document.getElementById("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.className = "toasts";
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const el = document.createElement("div");
  el.className = `toast toast-${kind}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.remove(), 5000);
}
