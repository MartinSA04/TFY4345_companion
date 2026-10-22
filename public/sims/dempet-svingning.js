/**
 * Dempet svingning: en kloss på en fjær som glir gjennom olje, og under den
 * tilstanden (x, p) som et punkt i faserommet. Klossen og punktet står på samme
 * x, så den stiplede loddlinja binder de to bildene sammen. Oljen bremser med en
 * kraft proporsjonal med farten, og den tegnes tydeligere jo større γ er.
 *
 * Bevegelsesligningen er mẍ = −kx − γẋ, integrert med RK4. Enhetene er valgt så
 * m = k = 1, altså ω₀ = 1, og glidebryteren styrer α/ω₀ med α = γ/2m. De
 * stiplede ellipsene har konstant energi p²/2m + ½kx². Kurven er veien punktet
 * har gått siden klossen ble sluppet, og den oransje prikken er likevekten.
 *
 * «Slipp på nytt» slipper klossen fra ro i x = 1. Trykk i faserommet for å
 * starte fra et hvilket som helst punkt (x, p). Når klossen har stått stille en
 * stund, slippes den på nytt.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { rk4, slider, button, animate, svg, txt, line, circle, poly, nb, FIXED, MOVING, DERIVED, HINT } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 2.4; // simulert tid per sekund; uten demping er perioden 2π
  const DT = 0.004;
  const XM = 1.25; // x-aksen går fra −XM til XM
  const PM = 1.25; // p-aksen likeså
  const LEVELS = [0.25, 0.5, 0.75]; // ½A² for de stiplede ellipsene, A = amplituden
  let ratio = 0.15; // α/ω₀
  let y = [1, 0];
  let trail = [[1, 0]];
  let still = 0; // hvor lenge klossen har stått stille
  let tapped = false;
  let geom = null;

  const f = (t, s) => [s[1], -s[0] - 2 * ratio * s[1]];

  function start(s) {
    y = s.slice();
    trail = [s.slice()];
    still = 0;
    render();
  }

  controls.append(
    slider({
      text: "Demping α/ω₀",
      aria: "Dempingen alfa delt på omega null",
      min: 0,
      max: 2.5,
      step: 0.05,
      value: ratio,
      format: (v) => (Math.abs(v - 1) < 1e-9 ? "1,00 (kritisk)" : nb(v, 2)),
      signal,
      onInput: (v) => {
        ratio = v;
        start([1, 0]);
      },
    }),
    button("Slipp på nytt", "Slipp klossen fra ro i x lik 1", () => start([1, 0]), signal),
  );

  function spring(x1, x2, yy, turns = 7, amp = 6) {
    const pts = [[x1, yy], [x1 + 6, yy]];
    const a = x1 + 6;
    const b = x2 - 6;
    for (let i = 0; i < 2 * turns; i++) pts.push([a + ((b - a) * (i + 0.5)) / (2 * turns), yy + (i % 2 ? amp : -amp)]);
    pts.push([b, yy], [x2, yy]);
    return poly(pts, `stroke="${FIXED}" stroke-width="1.6" stroke-linejoin="round"`);
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const wallX = 10;
    const left = 64;
    const right = 18;
    const stripH = 84;
    const top = stripH + 16;
    const bottom = 22;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const sx = pw / (2 * XM);
    const sy = ph / (2 * PM);
    const X = (x) => left + (x + XM) * sx;
    const Y = (p) => top + (PM - p) * sy;
    geom = { w, h, left, top, sx, sy };
    let g = "";

    // ── klossen på fjæra ──
    const floor = stripH - 8;
    g += line(wallX, 6, wallX, floor, { color: FIXED, width: 2.5 });
    for (let yy = 12; yy < floor; yy += 9) g += line(wallX, yy, wallX - 6, yy + 6, { color: FIXED, width: 1 });
    const tankX = w - 2; // karets høyre vegg, utenfor klossen også ved største utslag
    g += line(wallX, floor, tankX, floor, { color: FIXED, width: 2 });
    const bw = 30;
    const bh = 44;
    const bx = X(y[0]);
    const by = floor - bh;
    // Karet med olje går fra veggen til høyre kant, så klossen kan stå på samme x
    // som punktet i faserommet. Oljen tegnes tydeligere jo sterkere dempingen er,
    // og uten demping er karet tomt.
    const oil = by + 22; // oljeoverflaten
    g += line(tankX, by + 10, tankX, floor, { color: FIXED, width: 2 });
    if (ratio > 0) {
      const op = 0.12 + (0.5 * Math.min(ratio, 2.5)) / 2.5;
      g += `<rect x="${wallX}" y="${oil}" width="${(tankX - wallX).toFixed(1)}" height="${(floor - oil).toFixed(1)}" style="fill:${HINT}" opacity="${op.toFixed(2)}"/>`;
      g += line(wallX, oil, tankX, oil, { color: HINT, width: 1 });
      g += txt(tankX - 6, floor - 5, "olje", { anchor: "end", size: 11 });
    }
    // Fjæra går over oljen, fra veggen til klossen.
    g += spring(wallX, bx - bw / 2, by + 11);
    g += `<rect x="${(bx - bw / 2).toFixed(1)}" y="${by.toFixed(1)}" width="${bw}" height="${bh}" rx="4" style="fill:${MOVING}"/>`;
    // Likevekten, og linja fra klossen ned til punktet i faserommet.
    g += line(X(0), floor + 2, X(0), floor + 8, { color: DERIVED, width: 2 });
    g += line(bx, floor + 4, bx, Y(Math.max(-PM, Math.min(PM, y[1]))), { color: HINT, width: 1, dash: "2 4" });

    // ── faserommet ──
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top, X(0), top + ph, { color: HINT, width: 1 });
    g += txt(left + pw, Y(0) + 15, "x", { anchor: "end" });
    g += txt(X(0) + 7, top + 11, "p");
    for (const E of LEVELS) {
      const pts = [];
      const A = Math.sqrt(2 * E);
      for (let i = 0; i <= 120; i++) {
        const a = (2 * Math.PI * i) / 120;
        pts.push([X(A * Math.cos(a)), Y(A * Math.sin(a))]);
      }
      g += poly(pts, `stroke="${HINT}" stroke-width="1.1" stroke-dasharray="4 4"`);
    }
    // Veien punktet har gått, klippet til tegningen.
    const clip = (s) => [X(Math.max(-XM, Math.min(XM, s[0]))), Y(Math.max(-PM, Math.min(PM, s[1])))];
    g += poly(trail.map(clip), `stroke="${MOVING}" stroke-width="1.8" opacity="0.55" stroke-linejoin="round"`);
    g += circle(X(0), Y(0), 4, { fill: DERIVED, stroke: DERIVED });
    const [cx, cy] = clip(y);
    g += circle(cx, cy, 5.5, { fill: MOVING, stroke: MOVING });
    if (!tapped) g += txt(left, top + ph + 16, "trykk for å starte et annet sted", { size: 12 });

    stage.innerHTML = svg(w, h, g);
  }

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const hh = Math.min(DT, s);
      y = rk4(y, f, 0, hh);
      s -= hh;
    }
    const last = trail[trail.length - 1];
    if (Math.hypot(y[0] - last[0], y[1] - last[1]) > 0.01) trail.push(y.slice());
    if (trail.length > 3000) trail.splice(0, trail.length - 3000);
    // Har klossen stått stille en stund, slippes den på nytt.
    if (Math.hypot(y[0], y[1]) < 0.01) {
      still += dt;
      if (still > 1.6) start([1, 0]);
    }
  }

  stage.style.cursor = "crosshair";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const rect = stage.getBoundingClientRect();
      const x = ((e.clientX - rect.left) * (geom.w / rect.width) - geom.left) / geom.sx - XM;
      const p = PM - ((e.clientY - rect.top) * (geom.h / rect.height) - geom.top) / geom.sy;
      if (Math.abs(x) > XM || Math.abs(p) > PM) return;
      tapped = true;
      // Med m = k = 1 er banen uten demping en sirkel med radius √(x² + p²). Et trykk
      // i et hjørne flyttes inn til sirkelen med radius XM, så både banen og klossen
      // holder seg i tegningen.
      const amp = Math.hypot(x, p);
      const c = amp > XM ? XM / amp : 1;
      start([x * c, p * c]);
    },
    { signal },
  );

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
