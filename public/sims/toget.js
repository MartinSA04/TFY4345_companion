/**
 * Ballen i toget: en vogn kjører forbi en perrong, og en ball slippes fra en
 * krok i taket. Du velger om du ser fra perrongen (K) eller fra vogna (K′), og
 * om vogna holder jevn fart eller bremser mens ballen faller.
 *
 * Prikkene er ballens posisjon med faste tidsmellomrom, lagret som hendelser i
 * perrongkoordinater sammen med vognas posisjon i samme øyeblikk. Visningen fra
 * vogna trekker fra vognas posisjon ved hendelsens eget tidspunkt, så et bytte
 * av visning stiller de samme prikkene opp på nytt, slik transformasjonen
 * x′ = x − x_vogn(t) gjør.
 *
 * Under fallet har ballen to piler: den grå er tyngden delt på massen, g, og
 * den oransje er akselerasjonen ballen har i systemet du ser fra. I K og i en
 * vogn med jevn fart faller de sammen. I en vogn som bremser, peker den
 * oransje pila framover, selv om ingen kraft virker framover.
 *
 * Krysset på gulvet står rett under kroken. Alt går i sakte film: g er 5 m/s²
 * og vogna 4 m/s.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, arrow, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const G = 5; // m/s², sakte film
  const V0 = 4; // vognas fart før bremsingen, m/s
  const BRAKE = 3.2; // retardasjonen, m/s²
  const LEN = 6; // vognas lengde, m
  const HGT = 2.9; // vognas høyde over skinnene, m
  const FLOOR = 0.55; // gulvet over skinnene, m
  const HOOK = 0.42; // kroken sitter så langt bak i vogna, som brøkdel av lengden
  const DROP = 1.55; // fallhøyden over gulvet, m
  const TR = 1.15; // ballen slippes, s
  const TB = TR - 0.2; // bremsingen starter, s
  const TF = Math.sqrt((2 * DROP) / G); // falltiden
  const TL = TR + TF; // ballen lander
  const TC = TL + 1.1; // syklusen starter på nytt
  const W = 11; // synlig bredde fra perrongen, m
  const X0 = 0.4 - V0 * TR; // vognas bakende ved t = 0, så den står ved 0,4 m når ballen slippes
  const DT = 0.09; // tid mellom prikkene, s
  const BALL = 0.2; // ballens radius, m

  let view = "K"; // "K" perrongen, "K'" vogna
  let braking = false;
  let t = 0;
  let trail = []; // {x, y, xc}: ballen og vognas bakende i K
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Vognas fart og posisjon (bakenden) i K.
  const vel = (s) => (!braking || s < TB ? V0 : Math.max(0, V0 - BRAKE * (s - TB)));
  const acc = (s) => (!braking || s < TB || vel(s) <= 0 ? 0 : -BRAKE);
  function pos(s) {
    if (!braking || s < TB) return X0 + V0 * s;
    const tb = s - TB;
    const tstop = V0 / BRAKE;
    const u = Math.min(tb, tstop);
    return X0 + V0 * TB + V0 * u - 0.5 * BRAKE * u * u;
  }
  // Ballen i K: i kroken før TR, i fritt fall til TL, så i ro på gulvet i vogna.
  const hookX = (s) => pos(s) + HOOK * LEN;
  const xr = hookX(TR); // der ballen slippes
  function ball(s) {
    const top = FLOOR + DROP;
    if (s < TR) return { x: hookX(s), y: top, flying: false };
    if (s < TL) {
      const u = s - TR;
      return { x: xr + vel(TR) * u, y: top - 0.5 * G * u * u, flying: true };
    }
    // Landet: ligger der den traff gulvet, og følger vogna videre.
    const land = xr + vel(TR) * TF;
    return { x: land + (pos(s) - pos(TL)), y: FLOOR, flying: false };
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
  const kBtn = toggle("Fra perrongen (K)", "Se fra perrongen, systemet K", true, () => setView("K"));
  const k2Btn = toggle("Fra toget (K′)", "Se fra toget, systemet K merket", false, () => setView("K'"));
  const steadyBtn = toggle("Jevn fart", "Toget holder jevn fart", true, () => setBraking(false));
  const brakeBtn = toggle("Bremser", "Toget bremser mens ballen faller", false, () => setBraking(true));
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";
  controls.append(kBtn, k2Btn, steadyBtn, brakeBtn, playBtn);

  function setView(v) {
    view = v;
    kBtn.setAttribute("aria-pressed", String(v === "K"));
    k2Btn.setAttribute("aria-pressed", String(v === "K'"));
    render();
  }
  function setBraking(b) {
    braking = b;
    steadyBtn.setAttribute("aria-pressed", String(!b));
    brakeBtn.setAttribute("aria-pressed", String(b));
    t = 0;
    trail = [];
    render();
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const s = Math.min(w / W, (h - 30) / (HGT + 1.2)); // px per meter
    const rail = h - 18;
    // I K′ står vogna fast midt i bildet; i K står perrongen fast.
    const camK = (W - (w / s)) / 2; // sentrerer K-utsnittet når scenen er bredere enn W
    const anchor = (w / s - LEN) / 2; // vognas bakende i K′-visningen
    const X = (x, s0) => (view === "K" ? (x - camK) * s : (x - pos(s0) + anchor) * s);
    const Y = (y) => rail - y * s;
    let g = "";

    // Skinnene og perrongens stolper, som står fast i K.
    g += line(0, rail, w, rail, { color: FIXED, width: 2 });
    const xl = view === "K" ? camK : pos(t) - anchor;
    for (let k = Math.floor(xl / 1.5) - 1; k * 1.5 <= xl + w / s + 1.5; k++) {
      const px = X(k * 1.5, t);
      g += line(px, rail + 1, px - 4, rail + 7, { color: HINT, width: 1 });
    }
    for (let k = Math.floor(xl / 4) - 1; k * 4 <= xl + w / s + 4; k++) {
      const px = X(k * 4 + 2, t);
      g += line(px, rail, px, Y(HGT + 0.9), { color: FIXED, width: 2.5 });
      g += line(px - 0.45 * s, Y(HGT + 0.9), px + 0.45 * s, Y(HGT + 0.9), { color: FIXED, width: 2.5 });
    }

    // Vogna: kasse med gulv, tak, endevegger og hjul; siden mot deg er tatt bort.
    const xa = X(pos(t), t);
    const xb = xa + LEN * s;
    const yf = Y(FLOOR);
    const yr = Y(HGT);
    g += `<rect x="${xa.toFixed(1)}" y="${yr.toFixed(1)}" width="${(LEN * s).toFixed(1)}" height="${(yf - yr).toFixed(1)}" rx="${(0.25 * s).toFixed(1)}" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="2"/>`;
    g += line(xa, yf, xb, yf, { color: FIXED, width: 2.5 });
    for (const fx of [0.2, 0.8]) {
      g += circle(xa + fx * LEN * s, Y(FLOOR / 2), (FLOOR / 2) * s, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2 });
    }
    // Kroken i taket, og krysset rett under den.
    const hx = xa + HOOK * LEN * s;
    const yh = Y(FLOOR + DROP + 2 * BALL);
    g += line(hx, yr, hx, yh, { color: FIXED, width: 2 });
    g += line(hx - 0.22 * s, yh, hx + 0.22 * s, yh, { color: FIXED, width: 2 });
    g += line(hx - 6, yf - 6, hx + 6, yf + 6, { color: DERIVED, width: 2 });
    g += line(hx - 6, yf + 6, hx + 6, yf - 6, { color: DERIVED, width: 2 });

    // Prikkene: de samme hendelsene, flyttet inn i systemet du ser fra.
    for (const p of trail) {
      g += circle(view === "K" ? (p.x - camK) * s : (p.x - p.xc + anchor) * s, Y(p.y), Math.max(2, 0.08 * s), {
        fill: MOVING,
        stroke: "none",
        opacity: 0.5,
      });
    }

    // Ballen, og under fallet tyngden per masse og akselerasjonen.
    const b = ball(t);
    const bx = X(b.x, t);
    const by = Y(b.y + BALL);
    if (b.flying) {
      const k = 5; // px per m/s²
      const ax = view === "K" ? 0 : -acc(t);
      g += arrow(bx, by, bx, by + G * k, LABEL, 1.6);
      g += arrow(bx, by, bx + ax * k, by + G * k, DERIVED, 2);
      g += txt(bx - 7, by + G * k - 2, "g", { anchor: "end" });
      g += txt(bx + ax * k + 7, by + G * k - 2, view === "K" ? "a" : "a′", { fill: DERIVED });
    }
    g += circle(bx, by, BALL * s, { fill: MOVING, stroke: MOVING });

    g += txt(8, 16, view === "K" ? "K" : "K′", { size: 13 });
    stage.innerHTML = svg(w, h, g);
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  function step(dt) {
    t += dt;
    if (t >= TC) {
      t = 0;
      trail = [];
    }
    const b = ball(t);
    if (t >= TR && t <= TL + 0.001 && (trail.length === 0 || t - trail[trail.length - 1].t >= DT)) {
      trail.push({ t, x: b.x, y: b.y + BALL, xc: pos(t) });
    }
  }

  onResize(render);
  render();
  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  playBtn.addEventListener(
    "click",
    () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Spill av";
      if (playing) loop.start();
    },
    { signal },
  );
}
