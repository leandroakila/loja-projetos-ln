// Área do cliente: lista as liberações (grants) do e-mail logado e baixa os arquivos autorizados.
import "./ui.js";
import {
  auth, db, isReady, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
  collection, doc, getDoc, getDocs, query, where
} from "./firebase.js";
import { escapeHtml, authErrorMessage, formatBytes, formatDate, whatsappLink, tsMillis } from "./utils.js";
import { downloadPrivateFile, downloadErrorMessage } from "./download.js";

const $ = (id) => document.getElementById(id);
const views = ["config-view", "login-view", "files-view"];
const show = (v) => views.forEach((id) => ($(id).hidden = id !== v));

function setStatus(message, kind = "info") {
  const el = $("files-status");
  el.hidden = !message;
  el.className = `notice notice-${kind}`;
  el.textContent = message || "";
}

if (!isReady) {
  show("config-view");
} else {
  $("google-login").addEventListener("click", async () => {
    $("login-error").textContent = "";
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err) {
      $("login-error").textContent = authErrorMessage(err);
    }
  });
  $("logout").addEventListener("click", () => signOut(auth));

  onAuthStateChanged(auth, (user) => {
    if (!user) return show("login-view");
    show("files-view");
    $("client-email").textContent = user.email || "(sem e-mail)";
    loadGrants(user);
  });
}

async function loadGrants(user) {
  const list = $("files-list");
  list.innerHTML = "";
  if (!user.email || !user.emailVerified) {
    return setStatus("Sua conta precisa ter um e-mail verificado. Use uma conta Google.", "warn");
  }
  setStatus("Carregando seus projetos…");
  try {
    const email = user.email.toLowerCase();
    const snap = await getDocs(query(collection(db, "grants"), where("email", "==", email)));
    const grants = snap.docs.map((d) => d.data()).sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    if (!grants.length) {
      const wa = whatsappLink(`Olá, Leandro! Fiz uma compra e ainda não vejo meu projeto na Área do cliente. Meu e-mail é ${user.email}.`);
      setStatus("");
      list.innerHTML = `<div class="empty"><p>Nenhum projeto liberado para <strong>${escapeHtml(user.email)}</strong> até o momento.</p>
        <p class="muted small">Se você já confirmou o pagamento, a liberação é manual e pode levar algum tempo.</p>
        <a class="btn btn-wa btn-sm" href="${wa}" target="_blank" rel="noopener">Falar no WhatsApp</a></div>`;
      return;
    }
    setStatus("");
    list.innerHTML = grants
      .map(
        (g) => `
        <article class="file-item">
          <div>
            <h3>${escapeHtml(g.projectTitle || "Projeto")}</h3>
            <p class="muted small">Liberado em ${formatDate(g.createdAt)}${g.note ? " · " + escapeHtml(g.note) : ""}</p>
          </div>
          <div class="file-actions">
            <a class="btn btn-outline btn-sm" href="projeto.html?id=${encodeURIComponent(g.projectId)}">Detalhes</a>
            <button class="btn btn-primary btn-sm" type="button" data-download="${escapeHtml(g.projectId)}">Baixar</button>
          </div>
        </article>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    setStatus("Não foi possível carregar seus projetos agora. Tente novamente.", "error");
  }
}

$("files-list")?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-download]");
  if (!btn) return;
  const projectId = btn.dataset.download;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Preparando…";
  try {
    const fileSnap = await getDoc(doc(db, "projectFiles", projectId));
    if (!fileSnap.exists()) throw Object.assign(new Error("sem arquivo"), { code: "storage/object-not-found" });
    const f = fileSnap.data();
    btn.textContent = `Baixando ${formatBytes(f.size)}…`;
    await downloadPrivateFile(f.storagePath, f.fileName);
    setStatus("Download iniciado.", "success");
  } catch (err) {
    console.error(err);
    setStatus(downloadErrorMessage(err), "error");
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});
