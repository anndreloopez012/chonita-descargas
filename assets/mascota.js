'use strict';
// Chonita viva. Un SVG con partes que se mueven solas: sigue el mouse con la mirada, parpadea a
// su ritmo, respira, mueve el moño, saluda con la mano, reacciona a tu voz y tiene gestos.
// Estados: reposo · escuchando · pensando · trabajando · hablando · listo · error · privado · dormida
(function () {
  const ESTADOS = ['reposo', 'escuchando', 'pensando', 'trabajando', 'hablando', 'listo', 'error', 'privado', 'dormida'];
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let serie = 0;
  const vivas = new Set();

  // La silueta con cachetes: k = 0 es la cara redonda de siempre; hasta 1, se inflan los cachetes
  // (la parte de abajo se ensancha a los lados, como mofletes).
  let mofletes = 0;
  function cuerpo(k) {
    // Un bulto redondo a cada lado, a la altura de las chapitas; arriba y abajo la cara sigue redonda.
    const b = Math.max(0, Math.min(1, Number(k) || 0)) * 6.5;
    const f = (n) => n.toFixed(2);
    const R = (x) => f(x);
    const L = (x) => f(100 - x);
    return `M50 22C70 22 84 36 84 55`
      + `C84 58 ${R(84 + b)} 58 ${R(84 + b)} ${f(64 + b * 0.15)}`
      + `C${R(84 + b)} ${f(70 + b * 0.2)} ${R(83 + b * 0.3)} ${f(72 + b * 0.2)} ${R(81)} 75`
      + `C76 82 64 85 50 85C36 85 24 82 ${L(81)} 75`
      + `C${L(83 + b * 0.3)} ${f(72 + b * 0.2)} ${L(84 + b)} ${f(70 + b * 0.2)} ${L(84 + b)} ${f(64 + b * 0.15)}`
      + `C${L(84 + b)} 58 16 58 16 55C16 36 30 22 50 22Z`;
  }
  function ponerMofletes(k) {
    mofletes = Math.max(0, Math.min(1, Number(k) || 0));
    const d = cuerpo(mofletes);
    for (const n of document.querySelectorAll('.mascota .cuerpo')) n.setAttribute('d', d);
    // Las chapitas se van con el cachete (un poco hacia afuera y abajo) y los brazos se asoman.
    const b = mofletes * 7;
    for (const n of document.querySelectorAll('.mascota .brazo ellipse')) {
      const izq = n.closest('.brazo').classList.contains('izq');
      n.setAttribute('cx', (izq ? 17 - b * 0.75 : 83 + b * 0.75).toFixed(2));
    }
    for (const n of document.querySelectorAll('.mascota .mejilla')) {
      const izq = n.classList.contains('izq');
      n.setAttribute('cx', (izq ? 28 - b * 0.45 : 72 + b * 0.45).toFixed(2));
      n.setAttribute('cy', (62 + b * 0.25).toFixed(2));
    }
  }

  // ---------- cabello: peinados que se eligen en Ajustes; todos llevan un mechón blanco al frente ----------
  // «atras» va detrás de la cara (melena, colitas, chongo); «frente» encima de la frente (copete y fleco).
  const FLECO = 'M14 55C11 31 29 16 50 16C71 16 89 31 86 55C83 47 80 41 74 38C69 42 63 36 58 40C54 35 47 35 43 40C38 36 32 42 26 38C20 41 17 47 14 55Z';
  const LISO = 'M15 52C12 30 29 16 50 16C71 16 88 30 85 52C82 41 74 31 62 28C56 31 44 31 38 28C26 31 18 41 15 52Z';
  const MECHON = 'M31 21.6C27.5 27.5 25.5 33 26.5 39.5C29 38 31.5 37.5 34 39.8C33.6 32.5 35.4 26 38.8 20C36 20.4 33.4 20.9 31 21.6Z';
  const MECHON_LISO = 'M31 21.6C28 24.5 26.5 28 26.8 31.5C29.5 30.4 32.5 29.6 35.5 29C35.5 25.5 36.8 22.5 38.8 20C36 20.4 33.4 20.9 31 21.6Z';
  const PEINADOS = {
    ninguno: { atras: '', frente: '', mechon: '' },
    flequillo: { atras: '', frente: FLECO, mechon: MECHON },
    colitas: {
      atras: '<path d="M18 30C6 24 2 36 5 46C8 54 15 52 17 44C18 39 17 34 18 30Z"/><path d="M82 30C94 24 98 36 95 46C92 54 85 52 83 44C82 39 83 34 82 30Z"/>',
      frente: FLECO, mechon: MECHON, ligas: true,
    },
    chongo: { atras: '<circle cx="50" cy="13" r="10"/>', frente: LISO, mechon: MECHON_LISO },
    melena: {
      atras: '<path d="M15 46C7 60 7 78 15 88C20 91 27 90 31 86C24 77 21 64 22 50Z"/><path d="M85 46C93 60 93 78 85 88C80 91 73 90 69 86C76 77 79 64 78 50Z"/>',
      frente: FLECO, mechon: MECHON,
    },
    rizos: {
      atras: '',
      frente: [[18, 46, 7], [21, 34, 8], [31, 24.5, 8.5], [43, 19, 8.5], [57, 19, 8.5], [69, 24.5, 8.5], [79, 34, 8], [82, 46, 7]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join(''),
      mechon: 'M13 34a8 8 0 1 0 16 0a8 8 0 1 0 -16 0Z',
      rizado: true,
    },
  };
  let peinado = 'flequillo';
  function capasPelo() {
    const p = PEINADOS[peinado] || PEINADOS.ninguno;
    const frente = p.rizado ? p.frente : p.frente ? `<path d="${p.frente}"/>` : '';
    const brillo = p.frente && !p.rizado ? '<path class="luz-pelo" d="M30 24Q40 19 52 19.5"/>' : '';
    const ligas = p.ligas ? '<circle class="liga" cx="17.5" cy="31" r="2.6"/><circle class="liga" cx="82.5" cy="31" r="2.6"/>' : '';
    return { atras: p.atras, frente: frente + brillo + (p.mechon ? `<path class="mechon" d="${p.mechon}"/>` : '') + ligas };
  }
  function ponerPeinado(nombre) {
    peinado = PEINADOS[nombre] ? nombre : 'flequillo';
    const c = capasPelo();
    for (const n of document.querySelectorAll('.mascota .pelo-atras')) n.innerHTML = c.atras;
    for (const n of document.querySelectorAll('.mascota .pelo-frente')) n.innerHTML = c.frente;
  }

  function svg(id) {
    const pelo = capasPelo();
    return `
<svg class="chonita" viewBox="0 0 100 100" aria-hidden="true">
  <defs>
    <radialGradient id="piel-${id}" cx="38%" cy="30%" r="75%">
      <stop offset="0" stop-color="var(--cuerpo-luz)"/>
      <stop offset=".55" stop-color="var(--cuerpo)"/>
      <stop offset="1" stop-color="var(--cuerpo-sombra)"/>
    </radialGradient>
    <linearGradient id="mono-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="var(--mono-luz)"/><stop offset="1" stop-color="var(--mono)"/>
    </linearGradient>
  </defs>
  <ellipse class="sombra" cx="50" cy="92" rx="24" ry="3.6"/>
  <g class="todo">
    <g class="brazo izq"><ellipse cx="${(17 - mofletes * 5.25).toFixed(2)}" cy="64" rx="6" ry="8.5"/></g>
    <g class="brazo der"><ellipse cx="${(83 + mofletes * 5.25).toFixed(2)}" cy="64" rx="6" ry="8.5"/></g>
    <g class="pelo-atras">${pelo.atras}</g>
    <path class="cuerpo" fill="url(#piel-${id})" d="${cuerpo(mofletes)}"/>
    <ellipse class="brillo" cx="35" cy="35" rx="8" ry="4.6" transform="rotate(-28 35 35)"/>
    <g class="pelo-frente">${pelo.frente}</g>
    <g class="mono">
      <path fill="url(#mono-${id})" d="M50 21c-6-9-19-11-21-3-2 7 10 9 21 5z"/>
      <path fill="url(#mono-${id})" d="M50 21c6-9 19-11 21-3 2 7-10 9-21 5z"/>
      <circle class="nudo" cx="50" cy="22" r="4.2"/>
    </g>
    <g class="cara">
      <g class="cejas"><path class="ceja izq" d="M31 40q5-3 10-1"/><path class="ceja der" d="M59 39q5-2 10 1"/></g>
      <g class="ojo izq"><ellipse class="iris" cx="37" cy="51" rx="5.2" ry="6.6"/><circle class="luz" cx="38.8" cy="48.6" r="1.8"/><circle class="luz2" cx="35.6" cy="53.4" r=".8"/></g>
      <g class="ojo der"><ellipse class="iris" cx="63" cy="51" rx="5.2" ry="6.6"/><circle class="luz" cx="64.8" cy="48.6" r="1.8"/><circle class="luz2" cx="61.6" cy="53.4" r=".8"/></g>
      <g class="ojos-felices"><path d="M31.5 52q5.5-6.5 11 0"/><path d="M57.5 52q5.5-6.5 11 0"/></g>
      <g class="ojos-dormidos"><path d="M31.5 51q5.5 4.5 11 0"/><path d="M57.5 51q5.5 4.5 11 0"/></g>
      <ellipse class="mejilla izq" cx="${(28 - mofletes * 3.15).toFixed(2)}" cy="${(62 + mofletes * 1.75).toFixed(2)}" rx="5.4" ry="3.3"/>
      <ellipse class="mejilla der" cx="${(72 + mofletes * 3.15).toFixed(2)}" cy="${(62 + mofletes * 1.75).toFixed(2)}" rx="5.4" ry="3.3"/>
      <path class="boca sonrisa" d="M44 63q6 5 12 0"/>
      <path class="boca triste" d="M44.5 66q5.5-4 11 0"/>
      <ellipse class="boca abierta" cx="50" cy="65" rx="4.2" ry="3.2"/>
      <path class="gota" d="M76 36q3 5 0 7q-3-2 0-7z"/>
    </g>
  </g>
  <g class="extras">
    <g class="ondas"><path d="M90 48q4 6 0 12"/><path d="M95 43q7 11 0 22"/><path d="M10 48q-4 6 0 12"/><path d="M5 43q-7 11 0 22"/></g>
    <g class="puntos"><circle cx="78" cy="18" r="2.8"/><circle cx="86" cy="12" r="2.8"/><circle cx="94" cy="6" r="2.8"/></g>
    <g class="chispas"><path d="M84 22l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/><path d="M14 26l1.4 3.4 3.4 1.4-3.4 1.4-1.4 3.4-1.4-3.4-3.4-1.4 3.4-1.4z"/><path d="M90 70l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/></g>
    <g class="zetas"><text x="74" y="22">z</text><text x="82" y="13" font-size="12">z</text><text x="91" y="5" font-size="14">Z</text></g>
  </g>
</svg>`;
  }

  function crear(contenedor, { tamano = 'media', interactiva = false } = {}) {
    const id = `m${++serie}`;
    contenedor.classList.add('mascota', `tam-${tamano}`, 'reposo');
    contenedor.innerHTML = svg(id);
    const ojos = [...contenedor.querySelectorAll('.ojo')];
    const boca = contenedor.querySelector('.boca.abierta');
    const ondas = contenedor.querySelector('.ondas');
    const todo = contenedor.querySelector('.todo');
    const v = {
      contenedor,
      estado: 'reposo',
      mirada: { x: 0, y: 0 },
      objetivo: { x: 0, y: 0 },
      proximoParpadeo: performance.now() + 1500 + Math.random() * 2000,
      cerrandoHasta: 0,
      doble: false,
      nivel: 0,
      proximoGesto: performance.now() + 9000 + Math.random() * 8000,
      vistaLibre: 0,
    };

    function pintar(ahora) {
      // Mirada con suavidad.
      v.mirada.x += (v.objetivo.x - v.mirada.x) * 0.28;
      v.mirada.y += (v.objetivo.y - v.mirada.y) * 0.28;
      // Parpadeo propio: a veces doble, nunca al mismo tiempo que las demás.
      if (ahora > v.proximoParpadeo && v.estado !== 'dormida' && v.estado !== 'privado') {
        v.cerrandoHasta = ahora + 160;
        v.doble = !v.doble && Math.random() < 0.2;
        v.proximoParpadeo = ahora + (v.doble ? 260 : 2400 + Math.random() * 3800);
      }
      const resta = v.cerrandoHasta - ahora;
      let alto = resta > 0 ? Math.max(0.08, Math.abs(resta - 80) / 80) : 1;
      if (v.estado === 'escuchando') alto *= 1.1 + v.nivel * 0.3;
      if (v.estado === 'error') alto *= 0.85;
      const dx = v.mirada.x * 3.4;
      const dy = v.mirada.y * 2.8;
      for (const o of ojos) {
        const cx = o.classList.contains('izq') ? 37 : 63;
        const t = `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) translate(${cx} 51) scale(1 ${alto.toFixed(2)}) translate(${-cx} -51)`;
        // Solo se toca el SVG si algo cambió: si no, la ventana no se redibuja.
        if (o._t !== t) {
          o._t = t;
          o.setAttribute('transform', t);
        }
      }
      if (v.estado === 'hablando') {
        const s = 0.35 + Math.abs(Math.sin(ahora / 95)) * 0.75 + Math.sin(ahora / 37) * 0.12;
        boca.setAttribute('transform', `translate(50 65) scale(1 ${s.toFixed(2)}) translate(-50 -65)`);
      }
      if (v.estado === 'escuchando') {
        const n = Math.min(1, v.nivel * 3);
        ondas.style.opacity = String(0.3 + n * 0.7);
        ondas.style.transform = `scale(${(1 + n * 0.2).toFixed(3)})`;
        todo.style.transform = `scale(${(1 + n * 0.05).toFixed(3)}, ${(1 - n * 0.04).toFixed(3)})`;
      } else if (todo.style.transform) {
        todo.style.transform = '';
        ondas.style.opacity = '';
        ondas.style.transform = '';
      }
      if (v.estado === 'reposo' && ahora > v.proximoGesto && !reducido) {
        v.proximoGesto = ahora + 10000 + Math.random() * 14000;
        const r = Math.random();
        gesto(r < 0.4 ? 'mirarAlrededor' : r < 0.65 ? 'moverMono' : r < 0.85 ? 'rebote' : 'saludar');
      }
      if (v.vistaLibre && ahora > v.vistaLibre) {
        v.vistaLibre = 0;
        v.objetivo = { x: 0, y: 0 };
      }
    }

    function estado(nuevo) {
      if (!ESTADOS.includes(nuevo)) nuevo = 'reposo';
      const antes = v.estado;
      if (antes === nuevo) return;
      v.estado = nuevo;
      for (const e of ESTADOS) contenedor.classList.toggle(e, e === nuevo);
      boca.removeAttribute('transform');
      if (nuevo === 'pensando') v.objetivo = { x: 0.6, y: -0.9 };
      else if (antes === 'pensando') v.objetivo = { x: 0, y: 0 };
      if (nuevo === 'listo') gesto('festejar');
      if (nuevo === 'error') gesto('temblar');
      if (nuevo === 'escuchando') gesto('sorpresa');
      if (antes === 'dormida' && nuevo === 'reposo') gesto('estirarse');
    }

    function gesto(nombre) {
      if (reducido) return;
      const clase = `g-${nombre}`;
      contenedor.classList.remove(clase);
      void contenedor.offsetWidth;
      contenedor.classList.add(clase);
      const dur = { saludar: 1500, festejar: 1300, temblar: 700, rebote: 700, mirarAlrededor: 2200, moverMono: 900, estirarse: 1400, risa: 1200, sorpresa: 600 }[nombre] || 1000;
      if (nombre === 'mirarAlrededor') {
        v.objetivo = { x: -0.9, y: 0.1 };
        setTimeout(() => { v.objetivo = { x: 0.9, y: -0.2 }; }, 700);
        v.vistaLibre = performance.now() + 1700;
      }
      if (nombre === 'festejar' && !contenedor.classList.contains('tam-mini')) particulas(contenedor, 'confeti', 14);
      if (nombre === 'risa') particulas(contenedor, 'corazon', 7);
      setTimeout(() => contenedor.classList.remove(clase), dur);
    }

    function mirar(x, y) {
      if (v.vistaLibre || v.estado === 'pensando') return;
      v.objetivo = { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) };
    }

    if (interactiva) {
      contenedor.addEventListener('click', () => gesto('risa'));
      contenedor.addEventListener('mouseenter', () => v.estado === 'reposo' && gesto('rebote'));
    }

    const api = {
      estado,
      gesto,
      mirar,
      nivel: (n) => { v.nivel = v.nivel * 0.55 + Math.max(0, Math.min(1, n)) * 0.45; },
      actual: () => v.estado,
      contenedor,
      _v: v,
      _pintar: pintar,
    };
    vivas.add(api);
    return api;
  }

  // Partículas que salen de la mascota (confeti, corazones).
  function particulas(contenedor, tipo, cantidad = 10) {
    if (reducido) return;
    const caja = contenedor.getBoundingClientRect();
    if (!caja.width) return;
    const colores = ['var(--acento)', 'var(--ok)', 'var(--info)', 'var(--aviso)', 'var(--mono)'];
    for (let i = 0; i < cantidad; i++) {
      const p = document.createElement('span');
      p.className = `particula ${tipo}`;
      p.style.left = `${caja.left + caja.width / 2}px`;
      p.style.top = `${caja.top + caja.height * 0.4}px`;
      p.style.setProperty('--color', colores[i % colores.length]);
      if (tipo === 'corazon') p.textContent = '♥';
      document.body.append(p);
      const ang = (Math.PI * 2 * i) / cantidad + Math.random() * 0.6;
      const dist = Math.max(40, caja.width) * (0.55 + Math.random() * 0.6);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist * 0.6 - caja.height * (tipo === 'corazon' ? 0.8 : 0.35);
      p.animate([
        { transform: 'translate(-50%,-50%) scale(.3) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 28}px)) scale(.8) rotate(${Math.random() * 540}deg)`, opacity: 0 },
      ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => p.remove();
    }
  }

  // Un solo bucle para todas las Chonitas visibles.
  // Un temporizador (no requestAnimationFrame) a ~30 por segundo: así la ventana solo dibuja
  // cuando Chonita de verdad cambia algo, y en reposo casi no gasta.
  function bucle() {
    const ahora = performance.now();
    for (const m of vivas) {
      if (!m.contenedor.isConnected) vivas.delete(m);
      else if (m.contenedor.offsetParent !== null) m._pintar(ahora);
    }
  }
  setInterval(bucle, 33);

  // Carita quieta para los mensajes del chat.
  function cara(estado = 'reposo') {
    const span = document.createElement('span');
    span.className = `mascota tam-avatar ${estado}`;
    span.innerHTML = svg(`a${++serie}`);
    return span;
  }

  window.Mascota = { crear, cara, particulas, ESTADOS, todas: () => [...vivas], ponerMofletes, cuerpo, ponerPeinado, PEINADOS: Object.keys(PEINADOS) };
})();
