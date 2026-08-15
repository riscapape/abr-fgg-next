(() => {
  console.log('[ABR-FGG] content.js carregado em:', window.location.href);

  // ---------- Utilitários ----------

  function normalizeText(text) {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function textToInt(el) {
    if (!el) return null;

    const txt = (el.textContent || '').replace(/[^\d-]/g, '');
    const n = parseInt(txt, 10);

    return Number.isNaN(n) ? null : n;
  }

  // Valor pelo texto do <th> vizinho (Reputação, Peso, Idade, Total)
  function findValueByLabel(labelContains) {
    const ths = document.querySelectorAll('th');

    for (const th of ths) {
      const txt = (th.textContent || '').trim();

      if (txt.includes(labelContains)) {
        const tr = th.closest('tr');

        if (tr) {
          const tds = tr.querySelectorAll('td');

          for (let i = tds.length - 1; i >= 0; i--) {
            const v = textToInt(tds[i]);
            if (v !== null) return v;
          }
        }
      }
    }

    return null;
  }

  // Procura uma linha pelo título do <th> e retorna os valores dos <td>
  function findRowTdValuesByHeader(headerText) {
    const target = normalizeText(headerText);
    const rows = document.querySelectorAll('tr');

    for (const tr of rows) {
      const ths = tr.querySelectorAll('th');

      const found = Array.from(ths).some((th) =>
        normalizeText(th.textContent).includes(target)
      );

      if (!found) continue;

      const tds = tr.querySelectorAll('td');
      const values = Array.from(tds).map((td) => textToInt(td));

      if (values.length > 0) return values;
    }

    return [];
  }

  // ---------- Detectores de página ----------

  const isDriverPage = () =>
    window.location.href.toLowerCase().includes('driverprofile');

  const isCarPage = () =>
    window.location.href.toLowerCase().includes('updatecar');

  const isRacePage = () => {
    const u = window.location.href.toLowerCase();
    return u.includes('qualify') || u.includes('racesetup');
  };

  const isTestPage = () => {
  return window.location.pathname.toLowerCase().endsWith('/testing.asp');
};
  // ---------- PHA dos testes ----------
  // Coleta a linha: "Pontos de característica"
  // Ordem: Potência | Dirigibilidade | Aceleração

  function extractPha() {
    if (!isCarPage()) return null;

    const values = findRowTdValuesByHeader('Pontos de característica');

    if (!Array.isArray(values) || values.length < 3) return null;

    return {
      p: values[0] ?? 0,
      h: values[1] ?? 0,
      a: values[2] ?? 0
    };
  }

  // ---------- Extrator de Piloto ----------

  function extractDriver() {
    if (!isDriverPage()) return null;

    const data = {};

    const ids = {
      concentration: 'Conc',
      talent: 'Talent',
      aggression: 'Aggr',
      experience: 'Experience',
      technical_knowledge: 'TechI',
      endurance: 'Stamina',
      charisma: 'Charisma',
      motivation: 'Motivation'
    };

    for (const [field, id] of Object.entries(ids)) {
      const el = document.getElementById(id);

      if (el) {
        const v = textToInt(el);
        if (v !== null) data[field] = v;
      }
    }

    const camposTexto = {
      'Reputação': 'reputation',
      'Peso': 'weight_kg',
      'Idade': 'age'
    };

    for (const [label, field] of Object.entries(camposTexto)) {
      const v = findValueByLabel(label);
      if (v !== null) data[field] = v;
    }

    console.log('[ABR-FGG] Piloto extraído:', data);

    return Object.keys(data).length > 0 ? data : null;
  }

  // ---------- Extrator de Carro ----------

  function extractCar() {
    if (!isCarPage()) return null;

    const data = {};

    const selects = {
      chassis: 'BuyChassis',
      engine: 'BuyEngine',
      front_wing: 'BuyFWing',
      rear_wing: 'BuyRWing',
      underbody: 'BuyUnderbody',
      sidepods: 'BuySidepods',
      radiator: 'BuyCooling',
      gearbox: 'BuyGear',
      brakes: 'BuyBrakes',
      suspension: 'BuySusp',
      electronics: 'BuyElectronics'
    };

    for (const [field, selectId] of Object.entries(selects)) {
      const select = document.getElementById(selectId);
      if (!select) continue;

      const tr = select.closest('tr');
      if (!tr) continue;

      const tds = tr.querySelectorAll('td');

      if (tds[1]) {
        const lvl = textToInt(tds[1]);
        if (lvl !== null) data[`${field}_lvl`] = lvl;
      }

      if (tds[3]) {
        const wear = parseInt((tds[3].textContent || '').replace('%', ''), 10);
        if (!Number.isNaN(wear)) data[`${field}_wear`] = wear;
      }
    }

    console.log('[ABR-FGG] Carro extraído:', data);

    return Object.keys(data).length > 0 ? data : null;
  }

  // ---------- Temperaturas dos 4 quadrantes (min e max) ----------

  function getRaceForecastTemps() {
    const h2 = Array.from(document.querySelectorAll('h2')).find((h) =>
      (h.textContent || '').includes('Previsão da corrida')
    );

    if (!h2) return [];

    let table = h2.nextElementSibling;

    while (table && table.tagName !== 'TABLE') {
      table = table.nextElementSibling;
    }

    if (!table) return [];

    // ordem dos <td>: 00-30, 30-60, 60-90, 90-120
    return Array.from(table.querySelectorAll('td')).map((td) => {
      const m = (td.textContent || '').match(/Temp:\s*(-?\d+)\s*°?\s*-\s*(-?\d+)/);

      return m
        ? { min: parseFloat(m[1]), max: parseFloat(m[2]) }
        : { min: null, max: null };
    });
  }

  // ---------- Extrator de Corrida ----------

  function extractRace() {
    if (!isRacePage()) return null;

    const data = {};

    // Nome da pista ("Estoril GP (Portugal)" -> "Estoril")
    const trackLink = document.querySelector('h2 a[href*="TrackDetails"]');

    if (trackLink) {
      data.track_name = (trackLink.textContent || '').split(' GP')[0].trim();
    }

    // Temperaturas Q1/Q2 (valor único)
    const cells = Array.from(document.querySelectorAll('td.center'))
      .map((td) => td.textContent || '')
      .filter((t) => t.includes('Temp:'));

    const grab = (t) => {
      const m = t.match(/Temp:\s*(-?\d+)/);
      return m ? parseFloat(m[1]) : null;
    };

    if (cells[0]) data.air_temp = grab(cells[0]); // Q1
    if (cells[1]) data.q2_temp = grab(cells[1]); // Q2

    // Clima pelas imagens de previsão
    const isRain = (img) => img && /chuva|rain/i.test(img.alt || '');

    const wQ = document.querySelector('img[name="WeatherQ"]');
    const wR = document.querySelector('img[name="WeatherR"]');

    if (wQ) data.q1_weather = isRain(wQ) ? 'chuva' : 'seco';
    if (wR) data.q2_weather = isRain(wR) ? 'chuva' : 'seco';

    // Previsão da corrida: 4 quadrantes min/max
    const forecast = getRaceForecastTemps();

    if (forecast.length >= 4) {
      data.race_temps = forecast.slice(0, 4);

      if (forecast[0].min != null && forecast[0].max != null) {
        data.race_temp = (forecast[0].min + forecast[0].max) / 2;
      }
    }

    console.log('[ABR-FGG] Corrida extraída:', data);

    return Object.keys(data).length > 0 ? data : null;
  }

  // ---------- Extrator de Testes ----------
// Coleta temperatura e clima da página Testing.asp
// Regra: se for chuva, salva "chuva"; caso contrário salva "seco".

function extractTestWeather() {
  if (!isTestPage()) return null;

  const normalize = (text) => {
    return (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  };

  const h2 = Array.from(document.querySelectorAll('h2')).find((h) => {
    const t = normalize(h.textContent);
    return t.includes('clima atual') || t.includes('current weather');
  });

  if (!h2) return null;

  let table = h2.nextElementSibling;

  while (table && table.tagName !== 'TABLE') {
    table = table.nextElementSibling;
  }

  if (!table) return null;

  const cell = table.querySelector('td');

  if (!cell) return null;

  const tempMatch = (cell.textContent || '').match(/Temp:\s*(-?\d+)/);
  const temp = tempMatch ? parseInt(tempMatch[1], 10) : null;

  const img = cell.querySelector('img');

  const rainSource = [
    img?.title,
    img?.alt,
    img?.src,
    cell.textContent
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const weather = /chuva|rain/.test(rainSource) ? 'chuva' : 'seco';

  return {
    temp,
    weather
  };
}
  // ---------- API exposta ----------

  window.ABR_FGG_COLLECTOR = {
    collect() {
      let pageType = 'unknown';

      if (isDriverPage()) pageType = 'driver';
      else if (isCarPage()) pageType = 'car';
      else if (isRacePage()) pageType = 'race';
      else if (isTestPage()) pageType = 'test';

      console.log('[ABR-FGG] collect() chamado. pageType:', pageType);

      const result = {
        url: window.location.href,
        pageType,
        collectedAt: new Date().toISOString(),
        driver: null,
        car: null,
        race: null,
        pha: null,
        test: null
      };

      try {
        result.driver = extractDriver();
      } catch (e) {
        console.error('Erro piloto:', e);
      }

      try {
        result.car = extractCar();
      } catch (e) {
        console.error('Erro carro:', e);
      }

      try {
        result.race = extractRace();
      } catch (e) {
        console.error('Erro corrida:', e);
      }

      try {
        result.pha = extractPha();
      } catch (e) {
        console.error('Erro PHA:', e);
      }
      try {
       result.test = extractTestWeather();
      } catch (e) {
        console.error('Erro testes:', e);
      } 

      if (pageType === 'driver' && !result.driver) {
        result.error = 'Página do piloto detectada, mas nenhum dado lido.';
      }

      if (pageType === 'car' && !result.car && !result.pha) {
        result.error = 'Página do carro detectada, mas nenhum dado lido.';
      }

      if (pageType === 'race' && !result.race) {
        result.error = 'Página de corrida detectada, mas nenhum dado lido.';
      }

      if (pageType === 'test' && !result.test) {
        result.error = 'Página de testes detectada, mas nenhum dado de clima lido.';
      }

      console.log('[ABR-FGG] Resultado final:', result);

      return result;
    }
  };

  console.log('[ABR-FGG] API pronta. Teste: window.ABR_FGG_COLLECTOR.collect()');

  // ---------- Listener para o popup ----------

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'COLLECT') {
        const result = window.ABR_FGG_COLLECTOR.collect();
        sendResponse(result);
      }

      return true;
    });

    try {
      chrome.runtime.sendMessage({
        type: 'CONTENT_READY',
        url: window.location.href
      });
    } catch (e) {
      console.warn('[ABR-FGG] Contexto da extensão inválido (recarregue a página).');
    }
  }
})();