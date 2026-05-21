// codigo con comentarios d bri y lu
// + integración de audio (micrófono) para lluvia reactiva

// ====================================================
// CONFIGURACIÓN DE AUDIO
// ====================================================
let AMP_MIN = 0.030;  // umbral mínimo: por debajo de esto la voz se considera "lejana"
let AMP_MAX = 0.2;    // amplitud máxima esperada
let AMORTIGUACION = 0.85; // factor de suavizado del GestorSenial (más cerca de 1 = más suave/lento)

//----MICROFONO----
let mic;

//-----AMPLITUD-----
let amp = 0;          // amplitud filtrada actual

// Estados de sonido (mismo patrón que sketch.js pero invertido para lluvia)
let vozLejana = false;        // true cuando la voz está lejana / silencio
let antesVozLejana = false;   // memoria del estado anterior (para detectar el EVENTO de cambio)

//----GESTOR----
let gestorAmp;


// ====================================================
// VARIABLES ORIGINALES
// ====================================================
let manchas = [];
let puntosDibujados = [];
let totalManchas = 13;

let fondoGuardado = null;
let capaManchitas = null;
let capaPintura = null;

let lloviendo = false;
let velocidadLluvia = 15;

let teclaA = false;
let teclaS = false;

let iniciaPintura;
let cantElipses = 0;
let elipsesMax = 40;
let sentido = 1;
let posA = 0;
let direccionA = 1;
let posS = 0;
let direccionS = -1;


// ====================================================
// PRELOAD
// ====================================================
function preload() {
  for (let i = 0; i < totalManchas; i++) {
    manchas.push(loadImage(`Assets/mancha${i}.png`));
  }
}


// ====================================================
// SETUP
// ====================================================
function setup() {
  createCanvas(700, 900);

  // SIN noLoop(): necesitamos que draw() corra siempre para leer el micrófono.
  // El estado de cada cosa controla qué se dibuja en cada frame.
  noStroke();

  capaManchitas = createGraphics(700, 900);
  capaManchitas.noStroke();

  capaPintura = createGraphics(700, 900);
  capaPintura.noStroke();

  iniciaPintura = height * 0.40;
  posA          = height * 0.40;
  posS          = height * 0.70;

  fondo();
  capaBordo();
  capaRosa();
  capaCrema();
  textura();

  fondoGuardado = get();
  dibujarManchas();

  // ----MICROFONO----
  mic = new p5.AudioIn();
  mic.start();

  // ----GESTOR----
  // Le pasamos AMP_MIN y AMP_MAX como rango: la señal se mapea entre esos valores
  gestorAmp = new GestorSenial(AMP_MIN, AMP_MAX);
  gestorAmp.f = AMORTIGUACION;

  // Necesario en algunos navegadores para iniciar el motor de audio
  userStartAudio();
}


// ====================================================
// DRAW
// ====================================================
function draw() {

  // ---- Lectura y filtrado de audio (corre SIEMPRE) ----
  gestorAmp.actualizar(mic.getLevel());
  amp = gestorAmp.filtrada;

  // Estado: voz lejana = la amplitud filtrada NO supera el umbral mínimo
  vozLejana = amp < AMP_MIN;

  // EVENTO: recién se fue la voz (transición cercana → lejana)
  let seAlejoLaVoz  = !vozLejana && antesVozLejana;

  // EVENTO: recién apareció la voz (transición lejana → cercana)
  let seAcercoLaVoz = vozLejana && !antesVozLejana;

  // Al alejarse la voz: arrancar lluvia (si no hay teclas activas que tengan el control)
  if (seAlejoLaVoz && !teclaA && !teclaS) {
    lloviendo = true;
  }

  // Al acercarse la voz: frenar la lluvia exactamente donde está
  if (seAcercoLaVoz && lloviendo) {
    lloviendo = false;
  }

  // Guardamos el estado para el próximo frame (igual que sketch.js)
  antesVozLejana = vozLejana;


  // ---- Lluvia ----
  if (lloviendo) {
    image(fondoGuardado, 0, 0);
    image(capaPintura, 0, 0);

    for (let p of puntosDibujados) {
      p.y += velocidadLluvia;
      if (p.y > height) p.y = -p.h;

      tint(255, p.alfa);
      push();
      translate(p.x, p.y);
      image(p.img, 0, 0, p.w, p.h);
      pop();
    }
    noTint();
    return; // no ejecutar nada más este frame
  }

  // ---- Pintura con tecla A ----
  if (teclaA) {
    for (let i = 0; i < 10; i++) {
      let x = random(-100, width + 100);
      let y = random(iniciaPintura, iniciaPintura + 40);
      let alpha = random(2, 10);
      capaPintura.fill(random(92, 128), random(10, 30), random(18, 48), alpha);
      capaPintura.ellipse(x, y, random(40, 180), random(20, 80));
    }
    actualizarPintura();
    redibujarManchitas();
  }

  // ---- Pintura con tecla S ----
  if (teclaS) {
    for (let i = 0; i < 10; i++) {
      let x = random(-100, width + 100);
      let y = random(iniciaPintura, iniciaPintura + 10);
      capaPintura.fill(250, 237, 235, random(4, 10));
      capaPintura.ellipse(x, y, random(40, 180), random(20, 80));
    }
    for (let i = 0; i < 20; i++) {
      let x = random(-100, width + 100);
      let y = random(iniciaPintura, iniciaPintura + 10);
      capaPintura.fill(238, 225, 210, random(2, 10));
      capaPintura.ellipse(x, y, random(40, 180), random(20, 80));
    }
    actualizarPintura();
    redibujarManchitas();
  }
}


// ====================================================
// MANCHAS
// ====================================================
function dibujarManchas() {
  puntosDibujados = [];

  let intentosTotales = 300000;

  for (let i = 0; i < intentosTotales; i++) {
    let x = random(width);
    let y = random(height);

    let tamBase = 14;
    let tamW = tamBase + random(-1, 1);
    let tamH = tamW * 1.8;

    let radioSeguridadW = (tamW / 2) + 0.1;
    let radioSeguridadH = (tamH / 2) + 0.1;

    if (esPosicionValida(x, y, radioSeguridadW, radioSeguridadH)) {
      let alfa = random(40, 130);
      let img = random(manchas);

      puntosDibujados.push({
        x: x,
        y: y,
        rw: radioSeguridadW,
        rh: radioSeguridadH,
        w: tamW,
        h: tamH,
        alfa: alfa,
        img: img
      });
    }
  }
  redibujarManchitas();
}

function redibujarManchitas() {
  capaManchitas.clear();
  for (let p of puntosDibujados) {
    capaManchitas.tint(255, p.alfa);
    capaManchitas.push();
    capaManchitas.translate(p.x, p.y);
    capaManchitas.image(p.img, 0, 0, p.w, p.h);
    capaManchitas.pop();
  }
  capaManchitas.noTint();

  image(fondoGuardado, 0, 0);
  image(capaPintura, 0, 0);
  image(capaManchitas, 0, 0);
}

function esPosicionValida(nx, ny, nrw, nrh) {
  for (let p of puntosDibujados) {
    if (abs(nx - p.x) < (nrw + p.rw) && abs(ny - p.y) < (nrh + p.rh)) {
      return false;
    }
  }
  return true;
}

function actualizarPintura() {
  cantElipses += 20;
  if (cantElipses >= elipsesMax) {
    cantElipses = 0;
    iniciaPintura += 10 * sentido;
    if (iniciaPintura >= height) { sentido = -1; }
    if (iniciaPintura <= 0)      { sentido =  1; }
  }
}


// ====================================================
// CAPAS DE FONDO
// ====================================================
function fondo() {
  background(238, 225, 210);
}

function capaBordo() {
  for (let i = 0; i < 6000; i++) {
    let x = random(width);
    let y = random(-30, height * 0.60);
    let alpha = map(y, -30, height * 0.60, 62, 8);
    fill(random(92, 128), random(10, 30), random(18, 48), alpha);
    ellipse(x, y, random(20, 90), random(12, 45));
  }
  for (let i = 0; i < 4000; i++) {
    let x = random(width);
    let y = random(0, height * 0.42);
    let alpha = map(y, 0, height * 0.42, 38, 2);
    fill(random(105, 150), random(18, 45), random(30, 68), alpha);
    ellipse(x, y, random(35, 160), random(18, 70));
  }
  for (let i = 0; i < 1800; i++) {
    let x = random(width);
    let y = random(height * 0.38, height * 0.82);
    let alpha = map(y, height * 0.38, height * 0.82, 9, 1);
    fill(random(130, 155), random(30, 55), random(45, 75), alpha);
    ellipse(x, y, random(45, 190), random(22, 85));
  }
}

function capaRosa() {
  for (let i = 0; i < 1200; i++) {
    let x = random(width);
    let y = random(height * 0.52, height * 0.92);
    let alpha = map(y, height * 0.52, height * 0.92, 16, 3);
    fill(183, 96, 90, alpha);
    ellipse(x, y, random(55, 220), random(28, 100));
  }
}

function capaCrema() {
  for (let i = 0; i < 2000; i++) {
    let x = random(width);
    let y = random(height * 0.62, height);
    let alpha = map(y, height * 0.62, height, 3, 18);
    fill(random(235, 248), random(220, 235), random(208, 225), alpha);
    ellipse(x, y, random(70, 270), random(35, 125));
  }
  for (let i = 0; i < 500; i++) {
    let x = random(width);
    let y = random(height * 0.60, height);
    let alpha = map(y, height * 0.60, height, 12, 2);
    fill(205, 148, 158, alpha);
    ellipse(x, y, random(50, 190), random(6, 20));
  }
}

function textura() {
  noStroke();
  for (let i = 0; i < 20000; i++) {
    fill(255, random(2, 8));
    rect(random(width), random(height), 1, 1);
    fill(0, random(1, 4));
    rect(random(width), random(height), 1, 1);
  }
}


// ====================================================
// INTERACCIONES
// ====================================================
function mousePressed() {
  dibujarManchas();
}

function keyPressed() {

  // R: reset completo (también limpia estado de audio)
  if (key === 'r' || key === 'R') {
    iniciaPintura = height * 0.40;
    posA          = height * 0.40;
    posS          = height * 0.70;
    cantElipses = 0;
    sentido = 1;
    lloviendo = false;
    capaPintura.clear();
    fondo();
    capaBordo();
    capaRosa();
    capaCrema();
    textura();
    fondoGuardado = get();
    dibujarManchas();
  }

  // G: override manual de lluvia (por si querés usarla sin micrófono)
  else if (key === 'g' || key === 'G') {
    lloviendo = !lloviendo;
  }

  else if (key === 't' || key === 'T') {
    for (let p of puntosDibujados) {
      p.alfa = random(25, 130);
    }
    redibujarManchitas();
  }

  else if (key === 'a' || key === 'A') {
    iniciaPintura = posA;
    sentido = direccionA;
    teclaA = true;
    lloviendo = false; // la tecla pausa la lluvia mientras pinta
  }

  else if (key === 's' || key === 'S') {
    iniciaPintura = posS;
    sentido = direccionS;
    teclaS = true;
    lloviendo = false; // ídem
  }
}

function keyReleased() {
  if (key === 'a' || key === 'A') {
    posA = iniciaPintura;
    direccionA = sentido;
    teclaA = false;
    // Al soltar, si la voz sigue lejana, retoma la lluvia
    if (vozLejana && !teclaS) {
      lloviendo = true;
    }
  }
  if (key === 's' || key === 'S') {
    posS = iniciaPintura;
    direccionS = sentido;
    teclaS = false;
    // Ídem
    if (vozLejana && !teclaA) {
      lloviendo = true;
    }
  }
}
