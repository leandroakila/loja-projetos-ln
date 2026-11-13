// =====================================================================
// CONFIGURAÇÃO DO FIREBASE — SUBSTITUA OS PLACEHOLDERS
// =====================================================================
// Copie estes valores em: Console do Firebase > Configurações do projeto >
// Seus apps > App da Web > "Configuração do SDK" (opção "Config").
//
// Esses valores NÃO são segredos: o Firebase foi feito para que eles fiquem
// visíveis no navegador. A segurança real está nas regras do Firestore e do
// Storage (firestore.rules e storage.rules). NUNCA coloque aqui chaves de
// conta de serviço, senhas ou tokens privados.
// =====================================================================

export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};

// UID do administrador (Authentication > Users > coluna "User UID").
// Aqui ele só controla o que a interface mostra. Quem realmente bloqueia
// o acesso são as regras: o MESMO UID precisa estar em firestore.rules e
// storage.rules.
export const ADMIN_UID = "COLE_AQUI_O_UID_DO_ADMIN";

export function isConfigured() {
  return !Object.values(firebaseConfig).some((v) => /SUA_|SEU_/.test(String(v)));
}
