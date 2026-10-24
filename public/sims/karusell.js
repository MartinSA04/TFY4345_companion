/**
 * Karusellen: en karusell på en lekeplass, sett ovenfra, dreier mot klokka.
 * Barnet A sitter på kanten og kaster en ball mot barnet B rett over, sikta
 * langs diameteren slik det ser ut fra karusellen. Du velger om du ser fra
 * bakken (K) eller fra karusellen (K′).
 *
 * Ballen er fri (vi ser bort fra tyngden, som virker loddrett), så i K går den
 * i en rett linje med farten den fikk: kastet pluss farten til kanten der A
 * sitter. Prikkene er ballens posisjon med faste tidsmellomrom, lagret i
 * K-koordinater sammen med karusellens vinkel i samme øyeblikk. Visningen fra
 * karusellen dreier hver prikk tilbake med vinkelen ved prikkens eget
 * tidspunkt, så et bytte av visning stiller de samme prikkene opp på nytt.
 *
 * «Vis kreftene» tegner Corioliskraften og sentrifugalkraften per masse på
 * ballen i K′, i samme målestokk. I K er det ingen kraft på ballen å tegne.
 * Trærne rundt karusellen står fast i K.
 *
 * Karusellen har radius 2 m, ballen kastes med 4 m/s.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, slider, svg, txt, line, circle, arrow, arc, nb, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const RD = 2; // karusellens radius, m
  const RA = RD - 0.25; // barna sitter så langt fra aksen, m
  const V = 4; // kastefarten sett fra karusellen, m/s
  const RT = 3.25; // trærne står så langt fra aksen, m
  const OUT = 3.4; // ballen tas bort når den er så langt fra aksen, m
  const DT = 0.06; // tid mellom prikkene, s
  const CATCH = 0.24; // B tar ballen når den kommer så nær, m
  const PAUSE = 1.3; // tid før neste kast, s
  const TAU = 0.25; // kraftpilene: lengde i meter = akselerasjon (m/s²) × TAU

  let omega = 1.0; // rad/s, mot klokka sett ovenfra
  let view = "K"; // "K" bakken, "K'" karusellen
  let showForces = false;
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let th = 0; // karusellens vinkel i K
  let flight = null; // { t, x0, y0, vx, vy, done, caught }
  let wait = 0.4; // tid til neste kast
  let trail = []; // { x, y, th }
  let sinceDot = 0;

  // Rotasjon av (x, y) med vinkelen a.
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  function throwBall() {
    // A sitter på vinkelen π i K′. Farten i K er kastet dreid inn i K pluss ω × r.
    const [x0, y0] = rot(-RA, 0, th);
    const [ux, uy] = rot(V, 0, th);
    flight = { t: 0, x0, y0, vx: ux - omega * y0, vy: uy + omega * x0, done: false, caught: false };
    trail = [{ x: x0, y: y0, th }];
    sinceDot = 0;
  }

  // Ballens posisjon i K.
  function ballK() {
    if (!flight) return null;
    if (flight.caught) return rot(RA, 0, th); // B holder ballen
    return [flight.x0 + flight.vx * flight.t, flight.y0 + flight.vy * flight.t];
  }

  function step(dt) {
    th += omega * dt;
    if (!flight || flight.done) {
      wait -= dt;
      if (wait <= 0) throwBall();
      return;
    }
    flight.t += dt;
    sinceDot += dt;
    const [x, y] = ballK();
    if (sinceDot >= DT) {
      sinceDot -= DT;
      trail.push({ x, y, th });
    }
    const [bx, by] = rot(RA, 0, th);
    if (Math.hypot(x - bx, y - by) < CATCH) {
      flight.caught = true;
      flight.done = true;
      trail.push({ x, y, th });
      wait = PAUSE;
    } else if (Math.hypot(x, y) > OUT) {
      flight.done = true;
      wait = PAUSE;
    }
  }

  // ── kontroller ────────────────────────────────────────────────────────────
  function toggle(text, aria, pressed, onClick) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = text;
    b.setAttribute("aria-label", aria);
    b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", onClick, { signal });
    return b;
  }
  const kBtn = toggle("Fra bakken (K)", "Se fra bakken, systemet K", true, () => setView("K"));
  const k2Btn = toggle("Fra karusellen (K′)", "Se fra karusellen, systemet K merket", false, () => setView("K'"));
  const fBtn = toggle("Vis kreftene", "Vis de fiktive kreftene på ballen sett fra karusellen", false, () => {
    showForces = !showForces;
    fBtn.setAttribute("aria-pressed", String(showForces));
    render();
  });
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";
  playBtn.addEventListener(
    "click",
    () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Spill av";
      if (playing) loop.start();
    },
    { signal },
  );
  const omegaSlider = slider({
    text: "Vinkelfart ω",
    aria: "Karusellens vinkelfart i radianer per sekund",
    min: 0,
    max: 1.5,
    step: 0.1,
    value: omega,
    format: (v) => `${nb(v, 1)} rad/s`,
    signal,
    onInput: (v) => {
      omega = v;
      flight = null;
      trail = [];
      wait = 0.2;
      render();
    },
  });
  controls.append(kBtn, k2Btn, fBtn, playBtn, omegaSlider);

  function setView(v) {
    view = v;
    kBtn.setAttribute("aria-pressed", String(v === "K"));
    k2Btn.setAttribute("aria-pressed", String(v === "K'"));
    render();
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const s = Math.min(w, h) / 2 / 3.75; // px per meter
    const cx = w / 2;
    const cy = h / 2;
    // Fra K vises alt som det er; fra K′ dreies alt tilbake med karusellens vinkel.
    const toView = (x, y, a) => (view === "K" ? [x, y] : rot(x, y, -a));
    const P = (x, y) => [cx + s * x, cy - s * y];
    const disc = view === "K" ? th : 0; // karusellens vinkel på skjermen
    let g = "";

    // Trærne står fast i K.
    for (let k = 0; k < 8; k++) {
      const a = (k * 2 * Math.PI) / 8 + 0.3;
      const [tx, ty] = toView(RT * Math.cos(a), RT * Math.sin(a), th);
      const [X, Y] = P(tx, ty);
      g += circle(X, Y, 0.27 * s, { fill: HINT, stroke: LABEL, width: 1.2 });
    }

    // Karusellen: skive, nav, eiker, barna A og B, og siktelinja mellom dem.
    g += circle(cx, cy, RD * s, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2.5 });
    for (let k = 0; k < 6; k++) {
      const a = disc + (k * Math.PI) / 3 + Math.PI / 6;
      const [x1, y1] = P(0.3 * Math.cos(a), 0.3 * Math.sin(a));
      const [x2, y2] = P(RD * Math.cos(a), RD * Math.sin(a));
      g += line(x1, y1, x2, y2, { color: HINT, width: 1.5 });
    }
    g += circle(cx, cy, 0.3 * s, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2 });
    const [ax, ay] = P(...rot(-RA, 0, disc));
    const [bx, by] = P(...rot(RA, 0, disc));
    g += line(ax, ay, bx, by, { color: HINT, width: 1.2, dash: "5 5" });
    for (const [px, py, name] of [
      [ax, ay, "A"],
      [bx, by, "B"],
    ]) {
      g += circle(px, py, 0.15 * s, { fill: "var(--fg)", stroke: "none", width: 0 });
      const [lx, ly] = [cx + (px - cx) * 0.8, cy + (py - cy) * 0.8];
      g += txt(lx, ly + 4, name, { anchor: "middle", size: 13 });
    }
    // Pil for dreieretningen, bare når karusellen dreier på skjermen.
    if (view === "K" && omega > 0) {
      const r = RD * s + 9;
      const a0 = -Math.PI * 0.2;
      const a1 = -Math.PI * 0.45;
      g += arc(cx, cy, r, a0, a1, { color: LABEL, width: 1.5 });
      const ex = cx + r * Math.cos(a1);
      const ey = cy + r * Math.sin(a1);
      g += arrow(ex + 7 * Math.sin(a1) * -1, ey + 7 * Math.cos(a1), ex, ey, LABEL, 1.5);
      g += txt(cx + (r + 12) * Math.cos(-Math.PI * 0.3), cy + (r + 12) * Math.sin(-Math.PI * 0.3) + 4, "ω", { size: 14 });
    }

    // Ballens spor og ballen.
    for (const p of trail) {
      const [X, Y] = P(...toView(p.x, p.y, p.th));
      g += circle(X, Y, 2.4, { fill: MOVING, stroke: "none", width: 0, opacity: 0.55 });
    }
    const b = flight && (!flight.done || flight.caught) ? ballK() : null;
    if (b) {
      const [qx, qy] = toView(b[0], b[1], th); // ballens posisjon i visningen
      const [X, Y] = P(qx, qy);

      // Kreftene per masse i K′: −2ω × v′ og ω²r′.
      if (showForces && view === "K'" && !flight.caught) {
        const [x1, y1] = rot(flight.vx, flight.vy, -th);
        const vpx = x1 + omega * qy; // v′ = R⁻¹(v − ω × r), skrevet i K′
        const vpy = y1 - omega * qx;
        const cor = [2 * omega * vpy, -2 * omega * vpx];
        const cen = [omega * omega * qx, omega * omega * qy];
        // Begge pilene i samme målestokk; blir den lengste for lang, krympes begge like mye.
        const longest = Math.max(Math.hypot(cor[0], cor[1]), Math.hypot(cen[0], cen[1])) * TAU * s;
        const k = longest > 3.2 * s ? (3.2 * s) / longest : 1;
        const nearA = Math.hypot(qx + RA, qy) < 0.9; // etiketten ville kollidert med «A»
        for (const [a, lab, isCen] of [
          [cor, "F<tspan baseline-shift=\"sub\" font-size=\"10\">C</tspan>", false],
          [cen, "F<tspan baseline-shift=\"sub\" font-size=\"10\">s</tspan>", true],
        ]) {
          const L = Math.hypot(a[0], a[1]) * TAU * s;
          if (L * k < 8) continue;
          const ex = X + a[0] * TAU * s * k;
          const ey = Y - a[1] * TAU * s * k;
          g += arrow(X, Y, ex, ey, DERIVED, 2.2);
          if (L * k < 14 || (isCen && nearA)) continue; // for kort pil, eller for nær A
          const ux = (ex - X) / (L * k);
          const uy = (ey - Y) / (L * k);
          g += txt(ex + ux * 10 - uy * 10, ey + uy * 10 + ux * 10 + 4, lab, { anchor: "middle", size: 14, fill: DERIVED });
        }
      }
      g += circle(X, Y, 0.13 * s + 1, { fill: MOVING, stroke: "none", width: 0 });
    }

    stage.innerHTML = svg(w, h, g);
  }

  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  // Uten animasjon vises ett ferdig kast.
  if (!playing) for (let i = 0; i < 120; i++) step(0.02);
  onResize(render);
  render();
}
