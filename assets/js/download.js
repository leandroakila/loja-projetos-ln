// Download de arquivo privado respeitando as regras do Storage a cada pedido.
// Usa getBlob (exige CORS configurado no bucket — veja cors.json e o README).
import { storage, ref, getBlob } from "./firebase.js";

export async function downloadPrivateFile(storagePath, fileName) {
  const blob = await getBlob(ref(storage, storagePath));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName || "arquivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function downloadErrorMessage(err) {
  const code = err?.code || "";
  if (code === "storage/unauthorized" || code === "permission-denied") {
    return "Acesso a este arquivo ainda não foi liberado para sua conta.";
  }
  if (code === "storage/object-not-found") return "Arquivo não encontrado. Fale com a LN Sistemas.";
  if (code === "storage/retry-limit-exceeded" || code === "storage/unknown") {
    return "Não foi possível baixar (rede ou configuração de CORS do bucket). Tente de novo ou fale com a LN Sistemas.";
  }
  return "Não foi possível baixar o arquivo agora. Fale com a LN Sistemas.";
}
