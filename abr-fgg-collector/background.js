// ============================================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================================
// IMPORTANTE:
// Use somente a ANON KEY.
// Nunca use a service_role key aqui.
// ============================================================

const SUPABASE_URL = 'https://ykomikdtjefifewjjqel.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cIOJxKNmVZ-yiLQIuaiESg_vOmif4tZ';

function supaUrl(path) {
  return `${SUPABASE_URL.replace(/\/+$/, '')}${path}`;
}

function assertSupabaseConfig() {
  if (
    !SUPABASE_URL ||
    SUPABASE_URL.includes('SEU-PROJETO') ||
    !SUPABASE_URL.includes('supabase.co')
  ) {
    throw new Error('Edite background.js e informe SUPABASE_URL.');
  }

  if (
    !SUPABASE_ANON_KEY ||
    SUPABASE_ANON_KEY.includes('COLE-SUA-ANON-KEY')
  ) {
    throw new Error('Edite background.js e informe SUPABASE_ANON_KEY.');
  }
}

// ============================================================
// AUTH / SESSÃO
// ============================================================

async function login(email, password) {
  assertSupabaseConfig();

  if (!email || !password) {
    throw new Error('Informe email e senha.');
  }

  const res = await fetch(supaUrl('/auth/v1/token?grant_type=password'), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data.error_description ||
      data.msg ||
      data.error ||
      'Login falhou.'
    );
  }

  const session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user.id,
    email: data.user.email
  };

  await chrome.storage.local.set({ session });

  return session.email;
}

async function getToken() {
  assertSupabaseConfig();

  const { session } = await chrome.storage.local.get('session');

  if (!session?.refresh_token) {
    throw new Error('Conecte sua conta primeiro.');
  }

  const res = await fetch(supaUrl('/auth/v1/token?grant_type=refresh_token'), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });

  if (res.ok) {
    const data = await res.json();

    const newSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      user_id: data.user.id,
      email: data.user.email
    };

    await chrome.storage.local.set({ session: newSession });

    return {
      token: newSession.access_token,
      userId: newSession.user_id
    };
  }

  await chrome.storage.local.remove('session');
  throw new Error('Sessão expirada. Faça login novamente.');
}

// ============================================================
// BANCO / SUPABASE REST
// ============================================================

async function upsert(table, payload, token) {
  assertSupabaseConfig();

  const res = await fetch(supaUrl(`/rest/v1/${table}?on_conflict=user_id`), {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${table}: ${res.status} ${text}`);
  }
}

async function lookupTrack(name, token) {
  assertSupabaseConfig();

  const res = await fetch(
    supaUrl(`/rest/v1/tracks?name=ilike.${encodeURIComponent(name)}&select=id`),
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (!res.ok) return null;

  const rows = await res.json();
  return rows[0]?.id ?? null;
}

// ============================================================
// SALVAR COLEÇÃO
// ============================================================

async function saveCollection(data) {
  assertSupabaseConfig();

  if (!data) {
    throw new Error('Nenhum dado para salvar.');
  }

  const { token, userId } = await getToken();
  const saved = [];

  // Piloto
  if (data.driver && Object.keys(data.driver).length > 0) {
    await upsert(
      'drivers',
      {
        user_id: userId,
        ...data.driver
      },
      token
    );

    saved.push('piloto');
  }

  // Carro
  if (data.car && Object.keys(data.car).length > 0) {
    await upsert(
      'cars',
      {
        user_id: userId,
        ...data.car
      },
      token
    );

    saved.push('carro');
  }

  // Corrida + PHA
  const racePayload = {
    user_id: userId
  };

  let shouldSaveRace = false;

  if (data.race && Object.keys(data.race).length > 0) {
    const r = data.race;

    if (r.air_temp != null) racePayload.q1_temp = r.air_temp;
    if (r.q2_temp != null) racePayload.q2_temp = r.q2_temp;
    if (r.race_temp != null) racePayload.race_temp = r.race_temp;

    if (r.q1_weather) racePayload.q1_weather = r.q1_weather;
    if (r.q2_weather) racePayload.q2_weather = r.q2_weather;

    if (Array.isArray(r.race_temps) && r.race_temps.length === 4) {
      const slots = ['00_30', '30_60', '60_90', '90_120'];

      r.race_temps.forEach((t, i) => {
        if (t && t.min != null) racePayload[`race_temp_${slots[i]}_min`] = t.min;
        if (t && t.max != null) racePayload[`race_temp_${slots[i]}_max`] = t.max;
      });
    }

    shouldSaveRace = true;
  }

  if (data.pha) {
  if (data.pha.p != null) racePayload.pha_p = data.pha.p;
  if (data.pha.h != null) racePayload.pha_h = data.pha.h;
  if (data.pha.a != null) racePayload.pha_a = data.pha.a;

  shouldSaveRace = true;
}

  // Teste coletado na página Testing.asp
  if (data.test && (data.test.temp != null || data.test.weather)) {
    if (data.test.temp != null) {
      racePayload.test_temp = data.test.temp;
    }

    if (data.test.weather) {
      racePayload.test_weather = /chuva/i.test(String(data.test.weather))
        ? 'chuva'
        : 'seco';
    }

    shouldSaveRace = true;
  }

  if (shouldSaveRace) {
  if (data.race?.track_name) {
    const trackId = await lookupTrack(data.race.track_name, token);
    if (trackId) racePayload.track_id = trackId;
  }

  await upsert('race_data', racePayload, token);

  const raceParts = [];

  if (data.race && Object.keys(data.race).length > 0) {
    raceParts.push('corrida');
  }

  if (data.pha) {
    raceParts.push('PHA');
  }

  if (data.test && (data.test.temp != null || data.test.weather)) {
    raceParts.push('teste');
  }

  saved.push(raceParts.length ? raceParts.join('+') : 'race_data');
}

  return { saved };
}

// ============================================================
// MENSAGENS
// ============================================================

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  // Retorna sessão atual
  if (msg.type === 'GET_SESSION') {
    chrome.storage.local
      .get('session')
      .then(({ session }) => {
        sendResponse({ session: session || null });
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });

    return true;
  }

  // Login
  if (msg.type === 'AUTH_LOGIN') {
    login(msg.email, msg.password)
      .then((email) => {
        sendResponse({ email });
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });

    return true;
  }

  // Logout
  if (msg.type === 'LOGOUT') {
    chrome.storage.local
      .remove('session')
      .then(() => {
        sendResponse({ ok: true });
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });

    return true;
  }

  // Coleta dados da aba ativa
  if (msg.type === 'COLLECT_DATA') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs?.[0];

      if (!tab) {
        sendResponse({ error: 'Nenhuma aba ativa.' });
        return;
      }

      chrome.tabs.sendMessage(tab.id, { type: 'COLLECT' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            error: 'Recarregue o gpro.net para ativar a extensão.'
          });
          return;
        }

        sendResponse(response);
      });
    });

    return true;
  }

  // Salva no Supabase
  if (msg.type === 'SAVE_COLLECTION') {
    saveCollection(msg.data)
      .then((result) => {
        sendResponse(result);
      })
      .catch((err) => {
        sendResponse({ error: err.message });
      });

    return true;
  }

  // Content script pronto
  if (msg.type === 'CONTENT_READY') {
    try {
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });

      setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
      }, 3000);
    } catch (e) {
      // Ignora erro de badge
    }

    return false;
  }

  return false;
});