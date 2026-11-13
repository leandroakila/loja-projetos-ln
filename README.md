# LN Sistemas — site-catálogo de projetos digitais

Site estático (HTML, CSS e JavaScript puro) da **LN Sistemas**, de Leandro Akila Nunes, para apresentar e vender planilhas, sistemas e automações. Feito para o **GitHub Pages**, com **Firebase** (Authentication, Cloud Firestore e Cloud Storage).

> **Como funciona a venda:** o site **não tem checkout nem pagamento automático**. O cliente fala pelo WhatsApp (+55 62 99252-6144), vocês combinam pagamento e, depois de confirmar, o administrador **libera manualmente** o acesso ao arquivo para o e-mail Google do cliente.

---

## 1. O que vem no pacote

```
ln-sistemas/
├── index.html              Página inicial + catálogo público (busca e filtros)
├── projeto.html            Detalhes do projeto (?id=...) + botão do WhatsApp
├── cliente.html            Área do cliente (login Google + download do que foi liberado)
├── admin.html              Painel do administrador (login + CRUD + liberações)
├── 404.html                Página de erro do GitHub Pages
├── .nojekyll               Faz o GitHub Pages servir os arquivos sem Jekyll
├── assets/
│   ├── css/style.css
│   ├── img/favicon.svg, placeholder.svg
│   └── js/
│       ├── firebase-config.js   ← ÚNICO arquivo de configuração (placeholders)
│       ├── firebase.js          Inicializa o SDK (CDN gstatic, v10.12.2)
│       ├── utils.js, ui.js, download.js
│       ├── catalog.js, project.js, client.js, admin.js
├── firestore.rules         Regras do Firestore (UID do admin configurável)
├── storage.rules           Regras do Storage (UID do admin configurável)
├── firestore.indexes.json  Índice composto do catálogo
├── firebase.json           Para publicar regras/índices pela Firebase CLI (opcional)
└── cors.json               CORS do bucket (necessário para os downloads privados)
```

Não há etapa de build, nem `npm install`. Os arquivos vão para o GitHub exatamente como estão.

---

## 2. Modelo de dados e de segurança

| Onde | Conteúdo | Quem lê | Quem escreve |
|---|---|---|---|
| Firestore `projects/{id}` | Dados públicos do projeto (título, resumo, preço, imagem, `published`…) | Qualquer pessoa, **somente se `published == true`**; admin lê tudo | Só o admin |
| Firestore `projectFiles/{id}` | Caminho e nome do **arquivo privado** | Admin; cliente **com liberação** para aquele projeto | Só o admin |
| Firestore `grants/{email__projectId}` | Liberação manual (e-mail do cliente + projeto) | Admin; o próprio cliente (e-mail verificado) | Só o admin |
| Storage `public/projects/{id}/…` | Imagem de capa (até 5 MB, PNG/JPG/WEBP/GIF) | Qualquer pessoa (sem listagem) | Só o admin |
| Storage `private/projects/{id}/…` | Arquivo pago (até 100 MB) | Admin; cliente **com liberação** | Só o admin |

Pontos importantes:

- O documento público `projects` tem uma **lista fechada de campos** nas regras (`hasOnly`). Não é possível gravar nele um link ou caminho do arquivo privado, nem por engano.
- O caminho do arquivo privado fica em `projectFiles`, coleção **sem leitura pública**.
- O `ADMIN_UID` em `firebase-config.js` serve **só para a interface**. Quem bloqueia de verdade são as regras: o mesmo UID precisa estar em `firestore.rules` e `storage.rules`.
- A configuração do app Web do Firebase (`apiKey`, etc.) **não é segredo**; ela fica visível no navegador em qualquer site Firebase. O código não contém nenhuma credencial secreta (conta de serviço, senha, token).

---

## 3. Configuração passo a passo

### 3.1 Criar o projeto Firebase e o app Web

1. Acesse <https://console.firebase.google.com> e crie um projeto (ou use o existente).
2. Em **Configurações do projeto → Geral → Seus apps**, clique no ícone **Web (`</>`)**, dê um apelido (ex.: `ln-sistemas-site`) e registre. **Não** é preciso ativar o Firebase Hosting.
3. Copie o objeto `firebaseConfig` mostrado e cole os valores em `assets/js/firebase-config.js`, substituindo `SUA_API_KEY`, `SEU_PROJETO`, `SEU_SENDER_ID` e `SEU_APP_ID`.
   - Confira o `storageBucket`: projetos novos usam `SEU_PROJETO.firebasestorage.app`; projetos antigos podem usar `SEU_PROJETO.appspot.com`. Use exatamente o valor que o console mostrar.

Enquanto houver placeholders, o site abre normalmente, mas mostra "em configuração" no catálogo e no painel.

### 3.2 Plano Blaze (obrigatório para o Storage)

Desde 30/10/2024, criar o bucket padrão do **Cloud Storage for Firebase exige o plano Blaze** (pagamento por uso), e desde 03/02/2026 projetos fora do Blaze perdem acesso a buckets `*.appspot.com`. O Blaze mantém uma cota sem custo, mas exige cartão/conta de faturamento vinculada.

- Em **Uso e faturamento**, faça o upgrade para Blaze.
- **Recomendado:** em Google Cloud Console → Faturamento → **Orçamentos e alertas**, crie um orçamento baixo (ex.: R$ 20) com alertas por e-mail. Alertas avisam, mas **não bloqueiam** gastos automaticamente.
- A cota "Always Free" do Cloud Storage vale para buckets em `US-CENTRAL1`, `US-EAST1` ou `US-WEST1`. Ao criar o bucket, escolher outra região (ex.: São Paulo) pode gerar cobrança desde o primeiro byte. Confira a página de preços antes de escolher.

### 3.3 Authentication

1. **Build → Authentication → Começar**.
2. Aba **Método de login**:
   - Ative **Google** (obrigatório: é como os clientes entram na Área do cliente; o admin também pode usar).
   - Opcional: ative **E-mail/senha** se o admin preferir entrar assim. Depois, em **Users → Adicionar usuário**, crie a conta do admin.
3. Aba **Configurações → Domínios autorizados**: adicione `SEU_USUARIO.github.io` (e o domínio próprio, se usar). `localhost` já vem autorizado.

> Qualquer pessoa pode criar uma conta Google/e-mail no seu projeto. Isso **não dá acesso a nada**: as regras só permitem escrita ao UID do admin e downloads a e-mails com liberação.

### 3.4 Cloud Firestore

1. **Build → Firestore Database → Criar banco de dados**.
2. Escolha **modo de produção** e a região (ex.: `southamerica-east1`, São Paulo). A região não pode ser alterada depois.
3. Não crie coleções manualmente: o painel cria `projects`, `projectFiles` e `grants` quando você salva.

### 3.5 Cloud Storage

1. **Build → Storage → Começar** (pede o Blaze, se ainda não estiver nele).
2. Escolha **modo de produção** e a região do bucket (veja a observação de preço em 3.2).

### 3.6 Descobrir o UID do administrador

1. Rode o site localmente (seção 4) ou já publicado e abra `admin.html`.
2. Entre com a conta que será a administradora (Google ou e-mail/senha).
3. Como o UID ainda não está configurado, a página mostra **"Acesso não autorizado"** e exibe o **UID** da conta, com botão **Copiar UID**.
   - Alternativa: Console → Authentication → Users → coluna **UID do usuário**.

### 3.7 Colocar o UID nos 3 lugares

Substitua `COLE_AQUI_O_UID_DO_ADMIN` pelo UID copiado em:

1. `assets/js/firebase-config.js` → `ADMIN_UID`
2. `firestore.rules` → função `isAdmin()`
3. `storage.rules` → função `isAdmin()`

### 3.8 Publicar as regras

**Pelo console (mais simples):**

1. **Firestore Database → Regras**: apague tudo, cole o conteúdo de `firestore.rules` e clique em **Publicar**.
2. **Storage → Regras**: apague tudo, cole o conteúdo de `storage.rules` e clique em **Publicar**.
   - As regras do Storage consultam o Firestore (`firestore.exists`) para checar liberações. Na primeira publicação o console pede permissão para isso: **aceite**. Sem ela, os downloads dos clientes serão negados (o admin continua funcionando).

**Ou pela Firebase CLI (opcional):**

```bash
npm install -g firebase-tools
firebase login
firebase use --add            # selecione o projeto
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 3.9 Índice composto do Firestore

O catálogo consulta `where("published", "==", true)` + `orderBy("updatedAt", "desc")`, que exige um índice composto:

- **Coleção:** `projects`
- **Campos:** `published` (Crescente) e `updatedAt` (Decrescente)
- **Escopo:** Coleção

Crie de uma destas formas:

- **Console:** Firestore → **Índices** → **Composto** → **Criar índice** com os campos acima; ou
- **CLI:** `firebase deploy --only firestore:indexes` (usa `firestore.indexes.json`); ou
- **Link automático:** abra o site, pressione F12 → Console; o aviso do Firestore traz um link que cria o índice.

A criação leva alguns minutos. Enquanto o índice não existe, o catálogo **continua funcionando**: o código detecta o erro e ordena no navegador.

As consultas de `grants` (por `email` ou `projectId`) usam índices simples, criados automaticamente.

### 3.10 CORS do bucket (necessário para baixar arquivos privados)

Os downloads usam `getBlob()`, que **checa as regras a cada download**. Para isso funcionar no navegador, o bucket precisa permitir o domínio do site via CORS. Sem esse passo, uploads e o catálogo funcionam, mas o botão **Baixar** falha.

1. Edite `cors.json` e troque `https://SEU_USUARIO.github.io` pela origem real (só protocolo + domínio, **sem** `/nome-do-repo` e sem barra final). Mantenha `http://localhost:8080` se for testar localmente.
2. No Google Cloud Shell (ícone `>_` em <https://console.cloud.google.com>, com o projeto selecionado), envie o arquivo e rode:

```bash
gcloud storage buckets update gs://SEU_PROJETO.firebasestorage.app --cors-file=cors.json
# conferir:
gcloud storage buckets describe gs://SEU_PROJETO.firebasestorage.app --format="default(cors_config)"
```

(Comando antigo equivalente: `gsutil cors set cors.json gs://SEU_BUCKET`.) Use o nome do bucket exatamente como aparece no `storageBucket`.

---

## 4. Testar localmente

Os scripts são módulos ES. Por isso a página **não funciona abrindo o arquivo direto** (`file://`). Sirva a pasta por HTTP:

```bash
cd ln-sistemas
python3 -m http.server 8080
# abra http://localhost:8080
```

---

## 5. Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `ln-sistemas`). Ele precisa ser **público** no plano gratuito do GitHub (Pages em repositório privado exige plano pago).
2. Envie **o conteúdo** da pasta `ln-sistemas/` para a raiz do repositório (o `index.html` precisa ficar na raiz), incluindo o `.nojekyll`:

```bash
cd ln-sistemas
git init
git add .
git commit -m "Site LN Sistemas"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/ln-sistemas.git
git push -u origin main
```

   Ou use **Add file → Upload files** na interface do GitHub. Arquivos começando com ponto podem não aparecer no seletor; se o `.nojekyll` ficar de fora, crie-o pelo GitHub (**Add file → Create new file** com o nome `.nojekyll` vazio).

3. No repositório: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, Branch **`main`**, pasta **`/ (root)`**, **Save**.
4. Em 1–2 minutos o site estará em `https://SEU_USUARIO.github.io/ln-sistemas/`.
   - Todos os links são relativos, então funcionam tanto em `usuario.github.io/` quanto em `usuario.github.io/repo/`.
5. Confirme que `SEU_USUARIO.github.io` está em **Domínios autorizados** (3.3) e em `cors.json` (3.10).

**Domínio próprio (opcional):** Settings → Pages → Custom domain, configure o DNS conforme a documentação do GitHub e marque **Enforce HTTPS**. Depois adicione o domínio também em *Domínios autorizados* e em `cors.json`.

> Ao atualizar arquivos, o GitHub Pages pode levar alguns minutos para refletir. O navegador também pode estar usando cache; force a atualização com Ctrl+F5.

---

## 6. Uso no dia a dia

### Cadastrar um projeto (admin)
1. Abra `admin.html` e entre.
2. **+ Novo projeto**: preencha título, tipo, resumo e o restante. Preço vazio aparece como "Sob consulta" (ou o texto do campo *Rótulo do preço*).
3. Envie a **imagem pública** (opcional) e o **arquivo privado** (planilha, .zip etc.).
4. Marque **Publicado** para aparecer no catálogo. Sem a marcação, o projeto fica como rascunho, invisível ao público.

### Vender e entregar
1. O cliente clica em **WhatsApp** no projeto. A mensagem já vem com o nome e o link do projeto.
2. Vocês combinam valor e pagamento **fora do site**.
3. **Após confirmar o pagamento**, vá em **Liberações de acesso**, informe o **e-mail Google** do cliente e o projeto, e clique em **Liberar acesso**.
4. Clique em **Copiar mensagem** e cole no WhatsApp do cliente. A mensagem tem o link da Área do cliente.
5. O cliente abre `cliente.html`, entra com aquele e-mail Google e clica em **Baixar**.

### Revogar
Em **Liberações de acesso**, clique em **Revogar**. Novos downloads passam a ser negados (veja as limitações abaixo).

---

## 7. Checklist de verificação de segurança

Depois de configurar, teste em uma **janela anônima** (sem login):

- [ ] O catálogo mostra **apenas** projetos marcados como Publicado.
- [ ] `projeto.html?id=ID_DE_UM_RASCUNHO` mostra "Projeto não encontrado".
- [ ] No Console → Storage, copie o caminho de um arquivo em `private/...`. Abrir a URL `https://firebasestorage.googleapis.com/v0/b/SEU_BUCKET/o/private%2Fprojects%2F...?alt=media` (sem token) deve dar **403**.
- [ ] Entrar em `cliente.html` com uma conta Google **sem liberação** mostra "Nenhum projeto liberado".
- [ ] Entrar em `admin.html` com uma conta que não é a do admin mostra "Acesso não autorizado".
- [ ] Na **Firestore → Regras → Playground**, uma leitura não autenticada de `projectFiles/QUALQUER_ID` é **negada**.

---

## 8. Limitações reais (leia antes de vender)

1. **Sem pagamento automático.** Não há checkout, Pix/cartão integrado, emissão de nota fiscal nem confirmação automática. Toda liberação é **manual**.
2. **Depois de baixar, o arquivo é do cliente.** Nenhum site impede que um arquivo baixado seja copiado ou repassado. A proteção vale até o download.
3. **Revogar não apaga cópias nem links com token.** O código usa `getBlob()` e nunca mostra links permanentes. Mesmo assim, um cliente **liberado** com conhecimento técnico pode chamar `getDownloadURL()` pelo SDK e obter uma URL com *token* que **ignora as regras** e continua válida depois da revogação. Para invalidá-la: Console → Storage → arquivo → **Revogar token de acesso** (ou envie o arquivo de novo pelo painel, o que cria um novo objeto e apaga o antigo).
4. **O cliente precisa de conta Google** com o mesmo e-mail informado na liberação. Contas de e-mail/senha não verificadas são recusadas pelas regras.
5. **Login por pop-up.** O login usa `signInWithPopup`. Bloqueadores de pop-up ou alguns navegadores embutidos (ex.: navegador interno do Instagram/WhatsApp) podem impedir o login; o usuário deve abrir o link no Chrome/Safari. O login por redirecionamento não foi usado porque é pouco confiável em domínios diferentes do `authDomain` (como o GitHub Pages).
6. **Downloads exigem CORS** (3.10) e carregam o arquivo na memória do navegador antes de salvar. Para arquivos muito grandes (perto de 100 MB) em celulares simples, isso pode falhar.
7. **Busca e filtros rodam no navegador.** Todos os projetos publicados são baixados de uma vez. Funciona bem até algumas centenas de projetos. O Firestore não tem busca textual nativa; acima disso seria preciso paginação ou um serviço de busca (ex.: Algolia).
8. **SEO limitado.** As páginas de projeto são montadas por JavaScript. O Google costuma indexá-las, mas títulos e prévias em redes sociais/WhatsApp mostram os dados genéricos do HTML, não os de cada projeto.
9. **Um único administrador.** O UID está fixo nas regras. Para mais administradores, troque a comparação por uma lista (`request.auth.uid in ['UID1', 'UID2']`) nos dois arquivos de regras.
10. **Custos.** O Storage exige o plano Blaze. Downloads de arquivos grandes consomem banda faturável depois da cota gratuita. Configure alertas de orçamento.
11. **Sem proteção anti-abuso extra.** Leituras públicas do catálogo não têm limite de taxa. Para reduzir abuso, ative o **Firebase App Check** com reCAPTCHA Enterprise (exige adicionar a inicialização do App Check no `firebase.js` e criar a chave no console).
12. **LGPD.** O sistema guarda o e-mail dos clientes em `grants`. Informe isso aos clientes (ex.: política de privacidade) e revogue/apague liberações quando não forem mais necessárias.
13. **Exclusão de projeto** apaga o documento, a imagem, o arquivo privado e as liberações associadas. Não há lixeira nem backup automático. Use o export gerenciado do Firestore se precisar de backup.
14. **Versão do SDK** fixada em `10.12.2` (CDN gstatic) em `assets/js/firebase.js`. Para atualizar, troque o número nas 7 URLs desse arquivo e teste.

---

## 9. Personalização rápida

- **WhatsApp:** `WHATSAPP_NUMBER` em `assets/js/utils.js` e os textos em `index.html`.
- **Cores:** variáveis no topo de `assets/css/style.css` (`--navy`, `--green`…).
- **Tipos de projeto:** `TYPES` em `utils.js` **e** a lista `d.type in [...]` em `firestore.rules` (precisam bater).
- **Limites de upload:** `IMAGE_MAX`/`FILE_MAX` em `admin.js` **e** os tamanhos em `storage.rules`.
