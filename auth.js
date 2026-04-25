// auth.js — Autenticação Supabase

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Utilitários ----

function showMsg(el, text, type = 'error') {
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

function hideMsg(el) {
  el.style.display = 'none';
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.dataset.original = btn.dataset.original || btn.textContent;
  btn.textContent = loading ? 'Aguarde...' : btn.dataset.original;
}

// ---- Login Page ----

if (document.getElementById('auth-form')) {
  const form      = document.getElementById('auth-form');
  const emailEl   = document.getElementById('email');
  const passEl    = document.getElementById('password');
  const btnSubmit = document.getElementById('btn-submit');
  const msgEl     = document.getElementById('msg');
  const toggleLink= document.getElementById('toggle-mode');
  const titleEl   = document.getElementById('form-title');
  const forgotEl  = document.getElementById('forgot-link');
  const passWrap  = document.getElementById('pass-wrap');

  let isSignUp = false;

  // Redireciona se já logado
  sb.auth.getSession().then(({ data }) => {
    if (data.session) window.location.href = '/';
  });

  toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUp = !isSignUp;
    titleEl.textContent   = isSignUp ? 'Criar conta' : 'Entrar';
    btnSubmit.textContent = isSignUp ? 'Criar conta' : 'Entrar';
    btnSubmit.dataset.original = btnSubmit.textContent;
    toggleLink.textContent= isSignUp ? 'Já tenho conta' : 'Criar conta';
    forgotEl.style.display= isSignUp ? 'none' : 'block';
    hideMsg(msgEl);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailEl.value.trim();
    const pass  = passEl.value;

    if (!email || !pass) {
      showMsg(msgEl, 'Preencha email e senha.');
      return;
    }

    setLoading(btnSubmit, true);
    hideMsg(msgEl);

    if (isSignUp) {
      const { error } = await sb.auth.signUp({ email, password: pass });
      if (error) {
        showMsg(msgEl, error.message);
      } else {
        showMsg(msgEl, 'Conta criada! Verifique seu email para confirmar.', 'success');
        passEl.value = '';
      }
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) {
        showMsg(msgEl, 'Email ou senha incorretos.');
      } else {
        window.location.href = '/';
      }
    }

    setLoading(btnSubmit, false);
  });

  document.getElementById('forgot-link').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/reset';
  });
}

// ---- Reset Page ----

if (document.getElementById('reset-form')) {
  const form       = document.getElementById('reset-form');
  const emailEl    = document.getElementById('reset-email');
  const newPassEl  = document.getElementById('new-password');
  const btnSend    = document.getElementById('btn-send');
  const btnUpdate  = document.getElementById('btn-update');
  const msgEl      = document.getElementById('msg');
  const sendSection= document.getElementById('send-section');
  const updateSection = document.getElementById('update-section');

  // Verifica se veio de link de reset (hash #access_token ou type=recovery)
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      sendSection.style.display = 'none';
      updateSection.style.display = 'block';
    }
  });

  btnSend.addEventListener('click', async () => {
    const email = emailEl.value.trim();
    if (!email) { showMsg(msgEl, 'Informe seu email.'); return; }

    setLoading(btnSend, true);
    hideMsg(msgEl);

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset'
    });

    if (error) {
      showMsg(msgEl, error.message);
    } else {
      showMsg(msgEl, 'Link enviado! Verifique seu email.', 'success');
    }
    setLoading(btnSend, false);
  });

  btnUpdate.addEventListener('click', async () => {
    const newPass = newPassEl.value;
    if (!newPass || newPass.length < 6) {
      showMsg(msgEl, 'Senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(btnUpdate, true);
    hideMsg(msgEl);

    const { error } = await sb.auth.updateUser({ password: newPass });
    if (error) {
      showMsg(msgEl, error.message);
    } else {
      showMsg(msgEl, 'Senha atualizada! Redirecionando...', 'success');
      setTimeout(() => window.location.href = '/', 2000);
    }
    setLoading(btnUpdate, false);
  });
}
