'use strict';
// La landing de Chonita: mascotas vivas, el menú con forma de notch, descargas al día y la demo.
(function () {
  const REPO = 'anndreloopez012/chonita-descargas';
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esperar = (ms) => new Promise((ok) => setTimeout(ok, reducido ? Math.min(ms, 30) : ms));

  // ---------------- mascotas ----------------
  const M = window.Mascota;
  const portada = M.crear($('#mascota-portada'), { tamano: 'grande', interactiva: true });
  const nav = M.crear($('#mascota-nav'), { tamano: 'mini' });
  const pie = M.crear($('#mascota-pie'), { tamano: 'media', interactiva: true });
  const confirma = M.crear($('#mascota-confirma'), { tamano: 'media' });
  pie.estado('dormida');
  confirma.estado('escuchando');
  setTimeout(() => portada.gesto('saludar'), 1300);

  // La mirada sigue al mouse (o al dedo) desde donde está cada una.
  const miradas = [portada, nav, pie, confirma];
  function mirarHacia(x, y) {
    for (const m of miradas) {
      const c = m.contenedor.getBoundingClientRect();
      if (!c.width) continue;
      const dx = (x - (c.left + c.width / 2)) / (innerWidth * 0.4);
      const dy = (y - (c.top + c.height / 2)) / (innerHeight * 0.4);
      m.mirar(dx, dy);
    }
  }
  addEventListener('pointermove', (e) => mirarHacia(e.clientX, e.clientY), { passive: true });

  // El pie se despierta cuando llegas.
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) setTimeout(() => { pie.estado('reposo'); pie.gesto('saludar'); }, 700);
    else pie.estado('dormida');
  }, { threshold: 0.6 }).observe($('#mascota-pie'));

  // ---------------- la isla (menú) ----------------
  const isla = $('#isla-nav');
  const botonIsla = $('.isla-boton', isla);
  const tocable = matchMedia('(hover: none)').matches;
  let cierre = 0;
  function abrirIsla(si) {
    isla.classList.toggle('abierta', si);
    botonIsla.setAttribute('aria-expanded', String(si));
    if (si) nav.gesto('rebote');
  }
  let porMouse = false;
  if (!tocable) {
    isla.addEventListener('mouseenter', () => { clearTimeout(cierre); porMouse = true; abrirIsla(true); });
    isla.addEventListener('mouseleave', () => { porMouse = false; cierre = setTimeout(() => abrirIsla(false), 220); });
  }
  // Con el mouse encima ya está abierta: el clic no la cierra. Con el dedo o el teclado, alterna.
  botonIsla.addEventListener('click', () => {
    if (porMouse && isla.classList.contains('abierta')) return;
    abrirIsla(!isla.classList.contains('abierta'));
  });
  isla.addEventListener('focusout', (e) => { if (!porMouse && !isla.contains(e.relatedTarget)) abrirIsla(false); });
  document.addEventListener('click', (e) => { if (!isla.contains(e.target)) abrirIsla(false); });
  $$('.isla-menu a').forEach((a) => a.addEventListener('click', () => abrirIsla(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') abrirIsla(false); });

  // ---------------- aparecer al bajar ----------------
  const vigia = new IntersectionObserver((entradas) => {
    for (const e of entradas) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('visto');
      vigia.unobserve(e.target);
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  // Los hermanos aparecen en cascada.
  for (const grupo of $$('.tres, .bento, .lista-poderes, .garantias, .plataformas, .instalar, .acordeon')) {
    $$(':scope > .revelar', grupo).forEach((n, i) => n.style.setProperty('--retraso', `${Math.min(i, 8) * 70}ms`));
  }
  $$('.revelar').forEach((n) => vigia.observe(n));

  // ---------------- qué equipo tienes ----------------
  function detectar() {
    const ua = navigator.userAgent || '';
    const plataforma = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    if (/Win/i.test(plataforma) || /Windows/i.test(ua)) return 'win';
    if (/Mac/i.test(plataforma) || /Macintosh/i.test(ua)) {
      // El navegador no dice el chip; la tarjeta gráfica a veces sí («Intel», «AMD»).
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        const tarjeta = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
        if (/Intel|AMD|Radeon/i.test(tarjeta)) return 'mac-x64';
      } catch { /* sin WebGL: se queda en chip de Apple */ }
      return 'mac-arm64';
    }
    return '';
  }

  const NOMBRES = {
    'mac-arm64': { titulo: 'Descargar para Mac', detalle: 'chip de Apple' },
    'mac-x64': { titulo: 'Descargar para Mac', detalle: 'con Intel' },
    win: { titulo: 'Descargar para Windows', detalle: '10 y 11' },
  };
  const equipo = detectar();
  if (equipo) $(`.plataforma[data-plataforma="${equipo}"]`).classList.add('sugerida');
  else $('.plataforma[data-plataforma="mac-arm64"]').classList.add('sugerida');

  // Botones de la portada: el de tu equipo primero, el otro sistema al lado.
  function pintarPortada() {
    const principal = equipo || 'mac-arm64';
    const otra = principal === 'win' ? 'mac-arm64' : 'win';
    const p = $('#descarga-principal');
    const s = $('#descarga-secundaria');
    p.dataset.descarga = principal;
    s.dataset.descarga = otra;
    $('#principal-titulo').textContent = NOMBRES[principal].titulo;
    $('#principal-detalle').innerHTML = `${NOMBRES[principal].detalle} · <span data-tam="${principal}"></span>`;
    $('#secundaria-titulo').textContent = otra === 'win' ? 'Para Windows' : 'Para Mac';
    $('#secundaria-detalle').innerHTML = `${NOMBRES[otra].detalle} · <span data-tam="${otra}"></span>`;
    const iconoMac = $('.plataforma[data-plataforma="mac-arm64"] .ico-plat');
    if (principal === 'win') {
      // Intercambia los íconos de los botones.
      const ip = $('.ico', p).outerHTML;
      $('.ico', p).outerHTML = $('.ico', s).outerHTML;
      $('.ico', s).outerHTML = ip;
    }
    return iconoMac;
  }
  pintarPortada();

  // ---------------- descargas al día ----------------
  const tam = (b) => `${Math.round(b / 1048576)} MB`;
  const FALLA = `https://github.com/${REPO}/releases/latest`;
  function aplicar(archivos, version, fecha) {
    for (const a of $$('[data-descarga]')) {
      const x = archivos[a.dataset.descarga];
      a.href = x ? x.url : FALLA;
    }
    for (const n of $$('[data-tam]')) {
      const x = archivos[n.dataset.tam];
      n.textContent = x ? tam(x.tam) : '';
    }
    if (version) $$('[data-version]').forEach((n) => { n.textContent = version; });
    if (fecha) $$('[data-fecha]').forEach((n) => { n.textContent = ` · ${fecha}`; });
  }
  // Tamaños de la versión que trae la página, mientras llega la última.
  aplicar({
    'mac-arm64': { url: $('.plataforma[data-plataforma="mac-arm64"] a').href, tam: 124 * 1048576 },
    'mac-x64': { url: $('.plataforma[data-plataforma="mac-x64"] a').href, tam: 131 * 1048576 },
    win: { url: $('.plataforma[data-plataforma="win"] a').href, tam: 114 * 1048576 },
  });

  function novedades(texto) {
    const lineas = String(texto || '').split('\n').map((l) => l.trim()).filter((l) => /^[-*] /.test(l));
    if (!lineas.length) return;
    const lista = $('#novedades-lista');
    lista.textContent = '';
    for (const l of lineas.slice(0, 6)) {
      const li = document.createElement('li');
      // Solo **negritas**; el resto va como texto.
      const partes = l.slice(2).split(/\*\*(.+?)\*\*/);
      partes.forEach((p, i) => {
        if (i % 2) { const b = document.createElement('b'); b.textContent = p; li.append(b); }
        else li.append(document.createTextNode(p.replace(/https?:\/\/\S+/g, (u) => u.replace(/^https?:\/\//, ''))));
      });
      lista.append(li);
    }
    $('#novedades').hidden = false;
  }

  fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((rel) => {
      const archivos = {};
      for (const a of rel.assets || []) {
        const fila = { url: a.browser_download_url, tam: a.size };
        if (/arm64\.dmg$/i.test(a.name)) archivos['mac-arm64'] = fila;
        else if (/x64\.dmg$/i.test(a.name)) archivos['mac-x64'] = fila;
        else if (/\.exe$/i.test(a.name)) archivos.win = fila;
      }
      const fecha = rel.published_at ? new Date(rel.published_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
      aplicar(archivos, String(rel.tag_name || '').replace(/^v/, ''), fecha);
      novedades(rel.body);
    })
    .catch(() => { /* se quedan los enlaces de la versión que trae la página */ });

  // ---------------- la demo ----------------
  const islaDemo = $('#demo-isla');
  const mini = M.crear($('#demo-mini'), { tamano: 'mini' });
  const grande = M.crear($('#demo-grande'), { tamano: 'media' });
  const chat = $('#demo-chat');
  const escribe = $('#demo-escribe');
  const estado = $('#demo-estado');
  const titulo = $('#demo-titulo');
  const sub = $('#demo-sub');
  const pasos = $$('.demo-pasos button');

  const IA = {
    instante: { nombre: 'al instante · sin gastar plan', c: 'var(--verde)' },
    claude: { nombre: 'Claude', c: 'var(--claude)' },
  };
  const ESCENAS = [
    {
      pide: '¿Qué tengo hoy?',
      ia: IA.instante,
      trabajo: 'Revisando tu calendario',
      responde: 'Tres cosas: la clase de las 9, la reunión con el equipo a las 11:30 y pagar la luz antes de las 6.',
    },
    {
      pide: 'Resume mis correos sin leer',
      ia: IA.claude,
      trabajo: 'Leyendo 12 correos',
      responde: 'Son 12. Dos importan: Luis espera tu firma en el contrato y Ana pregunta por la reunión del jueves. ¿Le respondo a Ana?',
      botones: ['Ahora no', 'Responder'],
    },
    {
      pide: 'Pon un temporizador de 25 minutos',
      ia: IA.instante,
      trabajo: 'Poniendo el temporizador',
      responde: 'Listo, 25 minutos. Te aviso al terminar.',
      reloj: true,
    },
    {
      pide: 'Pregunta a las tres cómo explicar qué es un agente',
      ia: null,
      trabajo: 'Preguntando a las tres',
      tres: [
        ['Claude', 'var(--claude)', 'Un asistente que no solo responde: hace los pasos por ti.'],
        ['ChatGPT', 'var(--codex)', 'Una IA con manos: entiende, decide y actúa.'],
        ['Google', 'var(--agy)', 'Como un practicante que usa tus herramientas.'],
      ],
    },
  ];

  let turno = 0;
  let actual = 0;
  let enPantalla = false;
  let pausada = false;
  const vigente = (t) => t === turno;

  function ponerEstado(texto, clase = '') {
    estado.textContent = texto;
    estado.className = `di-estado ${clase}`.trim();
  }
  function mensaje(clase, html) {
    const n = document.createElement('div');
    n.className = `msj ${clase}`;
    n.innerHTML = html;
    chat.append(n);
    while (chat.children.length > 4) chat.firstElementChild.remove();
    return n;
  }
  async function teclear(texto, t) {
    escribe.textContent = '';
    for (const ch of texto) {
      if (!vigente(t)) return false;
      escribe.textContent += ch;
      await esperar(38 + Math.random() * 40);
    }
    return true;
  }

  async function reproducir(i) {
    const t = ++turno;
    actual = i;
    const e = ESCENAS[i];
    pasos.forEach((b, k) => {
      b.setAttribute('aria-selected', String(k === i));
      // reinicia la barra de progreso
      const barra = $('i', b);
      barra.style.animation = 'none';
      void barra.offsetWidth;
      barra.style.animation = '';
    });
    // cerrada, como al principio
    islaDemo.classList.remove('abierta');
    chat.textContent = '';
    escribe.textContent = '';
    mini.estado('reposo');
    grande.estado('reposo');
    ponerEstado('Lista');
    titulo.textContent = '¿En qué te ayudo?';
    sub.textContent = 'Claude, ChatGPT y Google conectados';
    await esperar(900);
    if (!vigente(t)) return;
    // pasas el mouse por el notch
    islaDemo.classList.add('abierta');
    grande.gesto('rebote');
    await esperar(800);
    if (!vigente(t) || !(await teclear(e.pide, t))) return;
    await esperar(350);
    if (!vigente(t)) return;
    escribe.textContent = '';
    mensaje('tu', esc(e.pide));
    grande.estado('pensando');
    titulo.textContent = 'Pensando…';
    sub.textContent = !e.ia ? 'con Claude, ChatGPT y Google' : e.ia === IA.instante ? 'al instante · sin gastar plan' : `con ${e.ia.nombre}`;
    await esperar(1100);
    if (!vigente(t)) return;
    grande.estado('trabajando');
    titulo.textContent = e.trabajo;
    await esperar(1300);
    if (!vigente(t)) return;
    grande.estado('hablando');
    titulo.textContent = 'Listo';
    if (e.tres) {
      const n = document.createElement('div');
      n.className = 'tres-mini';
      n.innerHTML = e.tres.map(([nombre, c, texto]) => `<div style="--c:${c}"><b>${nombre}</b>${esc(texto)}</div>`).join('');
      chat.append(n);
    } else {
      const m = mensaje('ella', `<span class="por" style="--c:${e.ia.c}">${e.ia.nombre}</span><span class="txt"></span>`);
      const txt = $('.txt', m);
      for (const palabra of e.responde.split(' ')) {
        if (!vigente(t)) return;
        txt.textContent += (txt.textContent ? ' ' : '') + palabra;
        await esperar(55);
      }
      if (e.botones) {
        const b = document.createElement('div');
        b.className = 'msj-botones';
        b.innerHTML = `<span>${e.botones[0]}</span><span class="si">${e.botones[1]}</span>`;
        m.append(b);
      }
    }
    await esperar(500);
    if (!vigente(t)) return;
    grande.estado('listo');
    await esperar(e.reloj ? 1600 : 2600);
    if (!vigente(t)) return;
    // se cierra sola; con temporizador, la cuenta regresiva queda en el notch
    islaDemo.classList.remove('abierta');
    mini.estado(e.reloj ? 'trabajando' : 'listo');
    if (e.reloj) {
      let s = 25 * 60;
      ponerEstado('25:00', 'reloj');
      for (let k = 0; k < 4; k++) {
        await esperar(1000);
        if (!vigente(t)) return;
        s -= 1;
        ponerEstado(`${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`, 'reloj');
      }
    } else {
      ponerEstado('Hecho');
      await esperar(1800);
    }
    if (!vigente(t)) return;
    siguiente(t);
  }
  function siguiente(t) {
    if (!vigente(t)) return;
    if (!enPantalla || pausada) { pendiente = true; return; }
    reproducir((actual + 1) % ESCENAS.length);
  }
  let pendiente = false;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  pasos.forEach((b, i) => b.addEventListener('click', () => reproducir(i)));
  // La duración de la barra se aproxima a la de cada escena.
  pasos.forEach((b, i) => b.style.setProperty('--duracion', ['10s', '12s', '13s', '9s'][i]));

  new IntersectionObserver(([e]) => {
    enPantalla = e.isIntersecting;
    if (enPantalla && turno === 0) reproducir(0);
    else if (enPantalla && pendiente) { pendiente = false; reproducir((actual + 1) % ESCENAS.length); }
  }, { threshold: 0.35 }).observe($('#pantalla'));
  document.addEventListener('visibilitychange', () => {
    pausada = document.hidden;
    if (!pausada && pendiente && enPantalla) { pendiente = false; reproducir((actual + 1) % ESCENAS.length); }
  });

  // La hora de la barra del Mac de la demo.
  const hora = () => { $('#demo-hora').textContent = new Date().toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' }); };
  hora();
  setInterval(hora, 30000);
})();
