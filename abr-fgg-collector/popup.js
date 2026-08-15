// ============================================================
// ELEMENTOS
// ============================================================

const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');

const authStatus = document.getElementById('auth-status');
const loginEmail = document.getElementById('login-email');
const loginPass = document.getElementById('login-pass');
const btnConnect = document.getElementById('btn-connect');

const userEmail = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');

const statusEl = document.getElementById('status');
const urlDisplay = document.getElementById('url-display');
const previewEl = document.getElementById('preview');
const previewContent = document.getElementById('preview-content');

const btnCollect = document.getElementById('btn-collect');
const btnSave = document.getElementById('btn-save');

let currentData = null;

// ============================================================
// HELPERS
// ============================================================

function sendMessageAsync(message) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ error: chrome.runtime.lastError.message });
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      resolve({ error: err.message });
    }
  });
}

function setAuthStatus(text, type = '') {
  authStatus.textContent = text;
  authStatus.className = `status ${type}`.trim();
}

function setAppStatus(text, type = '') {
  statusEl.textContent = text;
  statusEl.className = `status ${type}`.trim();
}

// ============================================================
// SESSÃO / UI
// ============================================================

async function initAuth() {
  const response = await sendMessageAsync({ type: 'GET_SESSION' });
  const session = response?.session;

  if (session?.email && session?.access_token) {
    loginSection.hidden = true;
    appSection.hidden = false;
    userEmail.textContent = session.email;

    setAppStatus('Clique em "Coletar" para iniciar.');
  } else {
    loginSection.hidden = false;
    appSection.hidden = true;

    userEmail.textContent = '';
    loginPass.value = '';

    setAuthStatus('Faça login para usar a extensão.');
  }
}

// ============================================================
// LOGIN / LOGOUT
// ============================================================

btnConnect.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPass.value;

  if (!email || !password) {
    setAuthStatus('Informe email e senha.', 'status-error');
    return;
  }

  btnConnect.disabled = true;
  setAuthStatus('Conectando...');

  const response = await sendMessageAsync({
    type: 'AUTH_LOGIN',
    email,
    password
  });

  btnConnect.disabled = false;

  if (!response || response.error) {
    setAuthStatus(
      `❌ ${response?.error || 'Erro ao conectar.'}`,
      'status-error'
    );
    return;
  }

  loginPass.value = '';
  setAuthStatus('✓ Login realizado.', 'status-success');

  await initAuth();
});

loginPass.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnConnect.click();
  }
});

btnLogout.addEventListener('click', async () => {
  currentData = null;

  btnSave.disabled = true;
  previewEl.hidden = true;
  previewContent.innerHTML = '';
  urlDisplay.textContent = '';

  await sendMessageAsync({ type: 'LOGOUT' });
  await initAuth();
});

// ============================================================
// COLETA
// ============================================================

btnCollect.addEventListener('click', async () => {
  setAppStatus('Coletando...');
  urlDisplay.textContent = '';

  const response = await sendMessageAsync({ type: 'COLLECT_DATA' });

  if (!response || response.error) {
    setAppStatus(
      `❌ ${response?.error || 'Não foi possível coletar os dados.'}`,
      'status-error'
    );

    currentData = null;
    btnSave.disabled = true;
    previewEl.hidden = true;
    previewContent.innerHTML = '';

    return;
  }

  currentData = response;

  urlDisplay.textContent = response.url || '';

  renderPreview(response);

  const hasData = Boolean(
    response.driver ||
    response.car ||
    response.race ||
    response.pha ||
    response.test
  );

  btnSave.disabled = !hasData;

  if (hasData) {
    setAppStatus('✓ Dados coletados. Revise e salve.', 'status-success');
  } else {
    setAppStatus(
      `⚠️ ${response.error || 'Nada encontrado nesta página.'}`,
      'status-warning'
    );
  }
});

// ============================================================
// PREVIEW
// ============================================================

function createPreviewBlock(title, obj) {
  const section = document.createElement('div');
  section.className = 'section';

  const h3 = document.createElement('h3');
  h3.textContent = title;

  const pre = document.createElement('pre');
  pre.textContent = JSON.stringify(obj, null, 2);

  section.appendChild(h3);
  section.appendChild(pre);

  return section;
}

function renderPreview(data) {
  previewEl.hidden = false;
  previewContent.innerHTML = '';

  const blocks = [];

  if (data.driver && Object.keys(data.driver).length > 0) {
    blocks.push(
      createPreviewBlock(
        `👤 Piloto (${Object.keys(data.driver).length} atributos)`,
        data.driver
      )
    );
  }

  if (data.car && Object.keys(data.car).length > 0) {
    blocks.push(
      createPreviewBlock(
        `🏎️ Carro (${Object.keys(data.car).length} campos) -> cars`,
        data.car
      )
    );
  }

  if (data.race && Object.keys(data.race).length > 0) {
    blocks.push(createPreviewBlock('🏁 Corrida -> race_data', data.race));
  }

  if (data.pha) {
    blocks.push(
      createPreviewBlock('🧪 PHA (Pontos de característica) -> race_data', data.pha)
    );
  }

  if (data.test) {
  blocks.push(
    createPreviewBlock('🌦️ Teste (clima atual) -> race_data', data.test)
  );
}

  if (blocks.length > 0) {
    blocks.forEach((block) => previewContent.appendChild(block));
  } else {
    const p = document.createElement('p');
    p.textContent =
      'Nenhum dado encontrado. Verifique se você está na página correta.';
    previewContent.appendChild(p);
  }
}

// ============================================================
// SALVAR
// ============================================================

btnSave.addEventListener('click', async () => {
  if (!currentData) return;

  btnSave.disabled = true;
  setAppStatus('Salvando...');

  const response = await sendMessageAsync({
    type: 'SAVE_COLLECTION',
    data: currentData
  });

  if (!response || response.error) {
    const errorMsg = response?.error || 'Erro ao salvar.';

    setAppStatus(`❌ ${errorMsg}`, 'status-error');
    btnSave.disabled = false;

    if (/sessão expirada/i.test(errorMsg)) {
      await initAuth();
    }

    return;
  }

  const saved = response.saved || [];

  if (saved.length > 0) {
    setAppStatus(`✓ Salvo: ${saved.join(', ')}`, 'status-success');
  } else {
    setAppStatus('⚠️ Nenhum dado foi salvo.', 'status-warning');
  }

  btnSave.disabled = false;
});

// ============================================================
// INIT
// ============================================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth);
} else {
  initAuth();
}