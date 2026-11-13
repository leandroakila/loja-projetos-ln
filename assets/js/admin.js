// Painel administrativo: CRUD de projetos, uploads no Storage e liberações de acesso.
// Toda escrita é validada de novo pelas regras do Firestore/Storage (o UID abaixo só controla a interface).
import "./ui.js";
import { ADMIN_UID } from "./firebase-config.js";
import {
  isReady, auth, db, storage,
  onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, signOut,
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where, serverTimestamp,
  ref, uploadBytesResumable, getDownloadURL, deleteObject
} from "./firebase.js";
import {
  escapeHtml, formatPrice, slugify, normalize, safeImageUrl, TYPES, typeLabel, safeFileName,
  formatBytes, formatDate, authErrorMessage, toast, tsMillis
} from "./utils.js";
import { downloadPrivateFile, downloadErrorMessage } from "./download.js";

const $ = (id) => document.getElementById(id);
const IMAGE_MAX = 5 * 1024 * 1024;       // manter igual a storage.rules
const FILE_MAX = 100 * 1024 * 1024;      // manter igual a storage.rules
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const EMAIL_RE = /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/;

let projects = [];
let files = new Map();   // projectId -> dados de projectFiles
let grants = [];
let editing = null;      // projeto em edição (ou null para novo)
let busy = false;

const views = ["config-view", "login-view", "denied-view", "admin-view"];
function show(view) {
  views.forEach((id) => ($(id).hidden = id !== view));
  $("admin-user").hidden = view !== "admin-view";
}

// ---------------------------------------------------------------- Autenticação
if (!isReady) {
  show("config-view");
} else {
  $("login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget.elements;
    $("login-error").textContent = "";
    try {
      await signInWithEmailAndPassword(auth, f.email.value.trim(), f.password.value);
    } catch (err) {
      $("login-error").textContent = authErrorMessage(err);
    }
  });
  $("google-login").addEventListener("click", async () => {
    $("login-error").textContent = "";
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      $("login-error").textContent = authErrorMessage(err);
    }
  });
  [$("logout"), $("denied-logout")].forEach((b) => b.addEventListener("click", () => signOut(auth)));
  $("copy-uid").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("denied-uid").textContent); toast("UID copiado.", "success"); }
    catch { toast("Selecione e copie o UID manualmente.", "warn"); }
  });

  onAuthStateChanged(auth, (user) => {
    if (!user) return show("login-view");
    if (user.uid !== ADMIN_UID) {
      $("denied-uid").textContent = user.uid;
      return show("denied-view");
    }
    $("admin-email").textContent = user.email || user.uid;
    show("admin-view");
    loadAll();
  });
}

// ---------------------------------------------------------------- Abas
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((t) => {
      const active = t === tab;
      t.setAttribute("aria-selected", String(active));
      $(t.dataset.tab).hidden = !active;
    });
  })
);

// ---------------------------------------------------------------- Carregamento
async function loadAll() {
  try {
    const [pSnap, fSnap, gSnap] = await Promise.all([
      getDocs(collection(db, "projects")),
      getDocs(collection(db, "projectFiles")),
      getDocs(collection(db, "grants"))
    ]);
    projects = pSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => tsMillis(b.updatedAt) - tsMillis(a.updatedAt));
    files = new Map(fSnap.docs.map((d) => [d.id, d.data()]));
    grants = gSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    renderProjects();
    renderGrantProjectOptions();
    renderGrants();
    renderCategoryList();
  } catch (err) {
    console.error(err);
    toast(err.code === "permission-denied"
      ? "Permissão negada. Confira se o UID está nas regras publicadas do Firestore."
      : "Erro ao carregar dados.", "error");
  }
}

// ---------------------------------------------------------------- Lista de projetos
function renderProjects() {
  const q = normalize($("p-search").value);
  const st = $("p-filter").value;
  const list = projects.filter((p) =>
    (!q || normalize(`${p.title} ${p.category} ${(p.tags || []).join(" ")}`).includes(q)) &&
    (!st || (st === "pub" ? p.published : !p.published))
  );
  $("p-count").textContent = `${list.length} de ${projects.length} projeto(s) · ${projects.filter((p) => p.published).length} publicado(s)`;
  $("p-rows").innerHTML = list.length
    ? list.map((p) => {
        const f = files.get(p.id);
        return `<tr>
          <td><div class="cell-project"><img src="${safeImageUrl(p.imageUrl)}" alt="" width="56" height="36">
            <div><strong>${escapeHtml(p.title)}</strong><br><span class="muted small">${escapeHtml(p.category || "—")}</span></div></div></td>
          <td>${escapeHtml(typeLabel(p.type))}</td>
          <td>${escapeHtml(formatPrice(p))}</td>
          <td>${p.published ? '<span class="badge badge-ok">Publicado</span>' : '<span class="badge badge-muted">Rascunho</span>'}${p.featured ? ' <span class="badge badge-featured">Destaque</span>' : ""}</td>
          <td>${f ? `<span class="small">🔒 ${escapeHtml(f.fileName)} (${formatBytes(f.size)})</span>` : '<span class="muted small">—</span>'}</td>
          <td class="right actions">
            <button class="btn btn-outline btn-xs" data-act="edit" data-id="${p.id}" type="button">Editar</button>
            <button class="btn btn-outline btn-xs" data-act="toggle" data-id="${p.id}" type="button">${p.published ? "Despublicar" : "Publicar"}</button>
            ${p.published ? `<a class="btn btn-outline btn-xs" href="projeto.html?id=${encodeURIComponent(p.id)}" target="_blank">Ver</a>` : ""}
            ${f ? `<button class="btn btn-outline btn-xs" data-act="download" data-id="${p.id}" type="button">Baixar</button>` : ""}
            <button class="btn btn-danger btn-xs" data-act="delete" data-id="${p.id}" type="button">Excluir</button>
          </td></tr>`;
      }).join("")
    : `<tr><td colspan="6" class="muted center">Nenhum projeto. Clique em “+ Novo projeto”.</td></tr>`;
}

$("p-search").addEventListener("input", renderProjects);
$("p-filter").addEventListener("change", renderProjects);
$("new-project").addEventListener("click", () => openEditor(null));

$("p-rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const p = projects.find((x) => x.id === btn.dataset.id);
  if (!p) return;
  if (btn.dataset.act === "edit") openEditor(p);
  if (btn.dataset.act === "toggle") togglePublish(p, btn);
  if (btn.dataset.act === "delete") removeProject(p, btn);
  if (btn.dataset.act === "download") {
    const f = files.get(p.id);
    btn.disabled = true;
    try { await downloadPrivateFile(f.storagePath, f.fileName); }
    catch (err) { console.error(err); toast(downloadErrorMessage(err), "error"); }
    finally { btn.disabled = false; }
  }
});

async function togglePublish(p, btn) {
  btn.disabled = true;
  try {
    await updateDoc(doc(db, "projects", p.id), { published: !p.published, updatedAt: serverTimestamp() });
    toast(p.published ? "Projeto despublicado." : "Projeto publicado.", "success");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("Não foi possível alterar o status.", "error");
    btn.disabled = false;
  }
}

async function removeProject(p, btn) {
  const count = grants.filter((g) => g.projectId === p.id).length;
  const msg = `Excluir "${p.title}" definitivamente?\n\nSerão removidos: o projeto, a imagem, o arquivo privado` +
    (count ? ` e ${count} liberação(ões) de clientes.` : ".");
  if (!confirm(msg)) return;
  btn.disabled = true;
  try {
    const gs = await getDocs(query(collection(db, "grants"), where("projectId", "==", p.id)));
    await Promise.all(gs.docs.map((g) => deleteDoc(g.ref)));
    const f = files.get(p.id);
    if (f) {
      await deleteDoc(doc(db, "projectFiles", p.id));
      await safeDeleteObject(f.storagePath);
    }
    await deleteDoc(doc(db, "projects", p.id));
    if (p.imagePath) await safeDeleteObject(p.imagePath);
    toast("Projeto excluído.", "success");
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("Erro ao excluir. Verifique o console.", "error");
    btn.disabled = false;
  }
}

async function safeDeleteObject(path) {
  if (!path) return;
  try { await deleteObject(ref(storage, path)); }
  catch (err) { if (err.code !== "storage/object-not-found") console.warn("Falha ao remover", path, err); }
}

// ---------------------------------------------------------------- Editor
const dialog = $("editor");
const form = $("project-form");
form.elements.type.innerHTML = TYPES.map((t) => `<option value="${t.value}">${escapeHtml(t.label)}</option>`).join("");

function renderCategoryList() {
  const cats = [...new Set(projects.map((p) => p.category).filter(Boolean))].sort();
  $("category-list").innerHTML = cats.map((c) => `<option value="${escapeHtml(c)}">`).join("");
}

function openEditor(p) {
  editing = p;
  form.reset();
  $("form-error").textContent = "";
  $("upload-progress").hidden = true;
  $("editor-title").textContent = p ? "Editar projeto" : "Novo projeto";
  const f = form.elements;
  if (p) {
    f.title.value = p.title || "";
    f.slug.value = p.slug || "";
    f.type.value = p.type || "outro";
    f.category.value = p.category || "";
    f.tags.value = (p.tags || []).join(", ");
    f.price.value = typeof p.price === "number" ? p.price : "";
    f.priceLabel.value = p.priceLabel || "";
    f.summary.value = p.summary || "";
    f.description.value = p.description || "";
    f.features.value = (p.features || []).join("\n");
    f.published.checked = !!p.published;
    f.featured.checked = !!p.featured;
  }
  $("image-preview").src = safeImageUrl(p?.imageUrl);
  const pf = p && files.get(p.id);
  $("private-current").innerHTML = pf
    ? `Atual: 🔒 <strong>${escapeHtml(pf.fileName)}</strong> (${formatBytes(pf.size)}). Enviar outro arquivo substitui o atual.`
    : "Nenhum arquivo privado enviado.";
  f.removePrivate.closest("label").hidden = !pf;
  f.removeImage.closest("label").hidden = !p?.imagePath;
  dialog.showModal();
  f.title.focus();
}

dialog.querySelectorAll("[data-close]").forEach((b) =>
  b.addEventListener("click", () => { if (!busy) dialog.close(); })
);
dialog.addEventListener("cancel", (e) => { if (busy) e.preventDefault(); });

form.elements.image.addEventListener("change", () => {
  const file = form.elements.image.files[0];
  if (file && IMAGE_TYPES.includes(file.type)) $("image-preview").src = URL.createObjectURL(file);
});

function readForm() {
  const f = form.elements;
  const title = f.title.value.trim();
  const summary = f.summary.value.trim();
  if (!title) throw new Error("Informe o título.");
  if (!summary) throw new Error("Informe o resumo.");
  const priceRaw = f.price.value.trim();
  let price = null;
  if (priceRaw !== "") {
    price = Math.round(Number(priceRaw) * 100) / 100;
    if (!Number.isFinite(price) || price < 0 || price > 1_000_000) throw new Error("Preço inválido.");
  }
  const tags = [...new Set(f.tags.value.split(",").map((t) => t.trim().slice(0, 30)).filter(Boolean))];
  if (tags.length > 20) throw new Error("Use no máximo 20 tags.");
  const features = f.features.value.split("\n").map((x) => x.trim().slice(0, 200)).filter(Boolean);
  if (features.length > 30) throw new Error("Use no máximo 30 itens incluídos.");
  return {
    title: title.slice(0, 120),
    slug: slugify(f.slug.value.trim() || title),
    type: TYPES.some((t) => t.value === f.type.value) ? f.type.value : "outro",
    category: f.category.value.trim().slice(0, 60),
    tags,
    price,
    priceLabel: f.priceLabel.value.trim().slice(0, 60),
    summary: summary.slice(0, 300),
    description: f.description.value.trim().slice(0, 10000),
    features,
    published: f.published.checked,
    featured: f.featured.checked
  };
}

function upload(path, file, label) {
  return new Promise((resolve, reject) => {
    $("upload-progress").hidden = false;
    $("upload-label").textContent = `${label}: enviando ${file.name}…`;
    $("upload-bar").value = 0;
    const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type || "application/octet-stream" });
    task.on("state_changed",
      (s) => ($("upload-bar").value = s.totalBytes ? (s.bytesTransferred / s.totalBytes) * 100 : 0),
      reject,
      () => resolve(task.snapshot)
    );
  });
}

function setBusy(on) {
  busy = on;
  $("save-btn").disabled = on;
  $("save-btn").textContent = on ? "Salvando…" : "Salvar";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (busy) return;
  $("form-error").textContent = "";
  const f = form.elements;
  let data;
  try {
    data = readForm();
    const img = f.image.files[0];
    if (img && (!IMAGE_TYPES.includes(img.type) || img.size > IMAGE_MAX)) throw new Error("Imagem deve ser PNG, JPG, WEBP ou GIF com até 5 MB.");
    const priv = f.privateFile.files[0];
    if (priv && priv.size > FILE_MAX) throw new Error("O arquivo privado deve ter até 100 MB.");
  } catch (err) {
    $("form-error").textContent = err.message;
    return;
  }

  setBusy(true);
  const id = editing?.id || doc(collection(db, "projects")).id;
  try {
    // 1) Imagem pública
    let imageUrl = editing?.imageUrl || "";
    let imagePath = editing?.imagePath || "";
    const oldImagePath = imagePath;
    const img = f.image.files[0];
    if (img) {
      imagePath = `public/projects/${id}/${Date.now()}-${safeFileName(img.name)}`;
      await upload(imagePath, img, "Imagem");
      imageUrl = await getDownloadURL(ref(storage, imagePath));
    } else if (f.removeImage.checked) {
      imageUrl = "";
      imagePath = "";
    }

    // 2) Documento público (nunca contém caminho/URL do arquivo privado)
    await setDoc(doc(db, "projects", id), {
      ...data,
      imageUrl,
      imagePath,
      createdAt: editing?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    if (oldImagePath && oldImagePath !== imagePath) await safeDeleteObject(oldImagePath);

    // 3) Arquivo privado (metadados em projectFiles, coleção sem leitura pública)
    const oldFile = files.get(id);
    const priv = f.privateFile.files[0];
    if (priv) {
      const storagePath = `private/projects/${id}/${Date.now()}-${safeFileName(priv.name)}`;
      await upload(storagePath, priv, "Arquivo privado");
      await setDoc(doc(db, "projectFiles", id), {
        storagePath,
        fileName: priv.name.slice(0, 200),
        contentType: (priv.type || "application/octet-stream").slice(0, 200),
        size: priv.size,
        updatedAt: serverTimestamp()
      });
      if (oldFile) await safeDeleteObject(oldFile.storagePath);
    } else if (f.removePrivate.checked && oldFile) {
      await deleteDoc(doc(db, "projectFiles", id));
      await safeDeleteObject(oldFile.storagePath);
    }

    toast("Projeto salvo.", "success");
    setBusy(false);
    dialog.close();
    await loadAll();
  } catch (err) {
    console.error(err);
    $("form-error").textContent = err.code === "permission-denied" || err.code === "storage/unauthorized"
      ? "Permissão negada pelas regras. Confira o UID do admin nas regras e os limites de tamanho/tipo."
      : "Erro ao salvar. Veja detalhes no console do navegador.";
    setBusy(false);
  }
});

// ---------------------------------------------------------------- Liberações (grants)
const grantForm = $("grant-form");

function renderGrantProjectOptions() {
  grantForm.elements.projectId.innerHTML =
    `<option value="">Selecione…</option>` +
    projects.map((p) =>
      `<option value="${p.id}">${escapeHtml(p.title)}${p.published ? "" : " (rascunho)"}${files.has(p.id) ? "" : " — sem arquivo"}</option>`
    ).join("");
}

function renderGrants() {
  const q = normalize($("g-search").value);
  const list = grants.filter((g) => !q || normalize(`${g.email} ${g.projectTitle}`).includes(q));
  $("g-rows").innerHTML = list.length
    ? list.map((g) => `<tr>
        <td>${escapeHtml(g.email)}</td>
        <td>${escapeHtml(g.projectTitle)}</td>
        <td>${formatDate(g.createdAt)}</td>
        <td class="small">${escapeHtml(g.note || "—")}</td>
        <td class="right actions">
          <button class="btn btn-outline btn-xs" data-copy="${escapeHtml(g.id)}" type="button">Copiar mensagem</button>
          <button class="btn btn-danger btn-xs" data-revoke="${escapeHtml(g.id)}" type="button">Revogar</button>
        </td></tr>`).join("")
    : `<tr><td colspan="5" class="muted center">Nenhuma liberação.</td></tr>`;
}

$("g-search").addEventListener("input", renderGrants);

grantForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = grantForm.elements;
  const email = f.email.value.trim().toLowerCase();
  const projectId = f.projectId.value;
  const project = projects.find((p) => p.id === projectId);
  if (!EMAIL_RE.test(email) || email.length > 254) return toast("Informe um e-mail válido.", "warn");
  if (!project) return toast("Selecione um projeto.", "warn");
  if (!files.has(projectId) && !confirm("Este projeto ainda não tem arquivo privado. Liberar mesmo assim?")) return;
  const btn = grantForm.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await setDoc(doc(db, "grants", `${email}__${projectId}`), {
      email,
      projectId,
      projectTitle: project.title.slice(0, 120),
      note: f.note.value.trim().slice(0, 500),
      createdAt: serverTimestamp()
    });
    toast(`Acesso liberado para ${email}.`, "success");
    grantForm.reset();
    await loadAll();
  } catch (err) {
    console.error(err);
    toast("Não foi possível liberar o acesso (verifique as regras).", "error");
  } finally {
    btn.disabled = false;
  }
});

$("g-rows").addEventListener("click", async (e) => {
  const copy = e.target.closest("[data-copy]");
  const revoke = e.target.closest("[data-revoke]");
  if (copy) {
    const g = grants.find((x) => x.id === copy.dataset.copy);
    const url = new URL("cliente.html", location.href).href;
    const text = `Olá! Seu acesso ao projeto "${g.projectTitle}" da LN Sistemas foi liberado. ` +
      `Entre em ${url} com a conta Google ${g.email} e clique em "Baixar".`;
    try { await navigator.clipboard.writeText(text); toast("Mensagem copiada. Cole no WhatsApp do cliente.", "success"); }
    catch { prompt("Copie a mensagem:", text); }
  }
  if (revoke) {
    const g = grants.find((x) => x.id === revoke.dataset.revoke);
    if (!confirm(`Revogar o acesso de ${g.email} a "${g.projectTitle}"?`)) return;
    try {
      await deleteDoc(doc(db, "grants", g.id));
      toast("Acesso revogado.", "success");
      await loadAll();
    } catch (err) {
      console.error(err);
      toast("Não foi possível revogar.", "error");
    }
  }
});
