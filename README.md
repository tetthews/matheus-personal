# Matheus Personal

App de tracking de rotina pessoal — alimentação, treino, sono, água e peso com gamificação (XP e níveis).

## Stack

- HTML + CSS + JavaScript vanilla
- Supabase (auth + banco de dados)
- Vercel (deploy estático)

---

## Passo 1 — Supabase

1. Acesse [supabase.com](https://supabase.com) → entre no seu projeto (ou crie um novo)
2. Vá em **SQL Editor** → cole o conteúdo do arquivo `schema.sql` → clique em **Run**
3. Vá em **Settings → API**
   - Copie o **Project URL**
   - Copie a **anon public** key
4. Abra o arquivo `config.js` e substitua os placeholders:
   ```js
   const SUPABASE_URL = 'https://xxxx.supabase.co';
   const SUPABASE_ANON_KEY = 'eyJhbGci...';
   ```

---

## Passo 2 — GitHub

1. Acesse [github.com/tetthews](https://github.com/tetthews) e crie o repositório `matheus-personal` (público)
2. Na pasta do projeto, rode:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/tetthews/matheus-personal.git
   git push -u origin main
   ```

---

## Passo 3 — Vercel

1. Acesse [vercel.com](https://vercel.com) → **Continue with GitHub**
2. Clique em **Add New Project** → importe o repositório `matheus-personal`
3. Em **Environment Variables** (opcional — o config.js já funciona direto):
   - `SUPABASE_URL` = sua URL
   - `SUPABASE_ANON_KEY` = sua anon key
4. Clique em **Deploy**

---

## Passo 4 — Domínio

1. No Vercel: **Settings → Domains → Add** → `personal.matheusdonascimento.com.br`
2. O Vercel vai mostrar um registro CNAME
3. No painel do seu provedor de domínio (onde comprou `matheusdonascimento.com.br`):
   - Adicione registro **CNAME**: `personal` → `cname.vercel-dns.com`
4. Aguarde até 24h para propagar (geralmente 5–10 min)

---

## Passo 5 — Criar sua conta no app

1. Acesse `personal.matheusdonascimento.com.br/login`
2. Clique em **Criar conta**
3. Use `matheus.dnascimento@gmail.com` + senha de sua escolha
4. Confirme o email que chegará na caixa de entrada
5. Faça login e comece a usar!

---

## Estrutura de arquivos

```
matheus-personal/
├── index.html      # App principal (protegido por auth)
├── login.html      # Login e cadastro
├── reset.html      # Redefinição de senha
├── config.js       # URL e chave do Supabase
├── app.js          # Lógica principal
├── auth.js         # Lógica de autenticação
├── style.css       # Estilos (tema escuro)
├── schema.sql      # SQL para rodar no Supabase
├── vercel.json     # Rotas do Vercel
└── README.md
```

## XP e Níveis

| XP | Nível |
|----|-------|
| 0–99 | Iniciante |
| 100–199 | Comprometido |
| 200–399 | Consistente |
| 400–699 | Guerreiro |
| 700+ | Máquina |
