/**
 * Banen og det effektive potensialet: et legeme med redusert masse μ i
 * V = −k/r om kraftsentrum O. Til venstre for O går legemet i banen sin, til
 * høyre for O er V_eff(r) = J²/2μr² − k/r tegnet langs den samme r-aksen, med
 * energien E som vannrett linje. Den oransje prikken er legemets avstand r,
 * flyttet ned på E-linja: den snur nøyaktig der linja treffer kurven, og de
 * stiplede sirklene om O har radiene r_min og r_max. Glidebryteren setter
 * farten i startpunktet i forhold til farten som gir sirkelbane.
 *
 * Enheter: μ = k = 1, startavstand 1. Skalaen er valgt for standardbanen, så
 * de største banene går utenfor scenen. Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, arc, poly, bob, rodLabel,
  DERIVED, MOVING, LABEL, FIXED, HINT,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const DT = 0.002;
  const ORBIT_SECONDS = 8; // ett omløp i en bundet bane
  const FREE_RATE = 1.4; // simulerte tidsenheter per sekund i en ubundet bane
  const R_LEAVE = 9; // en ubundet bane starter på nytt utenfor denne avstanden
  let v0 = 1.15;
  let y = [1, 0, 0, v0]; // [x, y, ẋ, ẏ]
  let J = v0;
  let E = v0 * v0 / 2 - 1;
  let bound = true;
  let T = 1;
  let rMin = 1;
  let rMax = 1;
  let trail = [];

  function reset() {
    y = [1, 0, 0, v0];
    J = v0;
    E = v0 * v0 / 2 - 1;
    bound = E < 0;
    // Startpunktet r = 1 er en apside; den andre løser E = V_eff(r).
    const other = v0 * v0 / (2 - v0 * v0);
    rMin = bound ? Math.min(1, other) : Math.min(1, v0 * v0 / 2);
    rMax = bound ? Math.max(1, other) : Infinity;
    T = bound ? 2 * Math.PI * Math.pow((rMin + rMax) / 2, 1.5) : Infinity;
    trail = [[1, 0]];
  }
  reset();

  const f = (t, s) => {
    const r = Math.hypot(s[0], s[1]);
    const r3 = r * r * r;
    return [s[2], s[3], -s[0] / r3, -s[1] / r3];
  };
  const veff = (r) => (J * J) / (2 * r * r) - 1 / r;

  controls.append(
    slider({
      text: "Startfart (sirkelbane = 1)",
      aria: "Farten i startpunktet i forhold til sirkelbanens fart",
      min: 0.5,
      max: 1.5,
      step: 0.05,
      value: v0,
      format: (v) => nb(v, 2),
      signal,
      onInput: (v) => {
        v0 = v;
        reset();
      },
    }),
    button("Start på nytt", "Start banen på nytt fra startpunktet", reset, signal),
  );

  function step(dt) {
    let s = bound ? (dt * T) / ORBIT_SECONDS : dt * FREE_RATE;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    const r = Math.hypot(y[0], y[1]);
    if (!bound && r > R_LEAVE && y[0] * y[2] + y[1] * y[3] > 0) {
      reset();
      return;
    }
    trail.push([y[0], y[1]]);
    const keep = bound ? 900 : 1600;
    if (trail.length > keep) trail.splice(0, trail.length - keep);
  }

  /** r som tekst med senket indeks. */
  function sub(x, yy, base, idx, anchor = "middle") {
    return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" style="fill:${LABEL};font-family:var(--font-mono);font-size:12px">${base}<tspan dy="3" style="font-size:9px">${idx}</tspan></text>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const pad = 14;
    // Fast skala valgt for standardbanen: 4,8 enheter i bredden, 3 i høyden.
    const sc = Math.min((w - 2 * pad) / 4.8, (h - 2 * pad) / 3);
    const ox = (w - 4.8 * sc) / 2 + 2.2 * sc; // O, tegningen sentrert
    const oy = 0.45 * h; // r-aksen, E = 0
    const sy = 0.6 * h; // piksler per energienhet
    const px = (x) => ox + x * sc;
    const py = (yy) => oy - yy * sc;
    const pe = (e) => oy - e * sy;
    const rAxisEnd = Math.min(2.9, (w - pad - ox) / sc);

    let g = "";
    // r-aksen fra O mot høyre, og tegnet for E = 0.
    g += line(ox, oy, px(rAxisEnd), oy, { color: LABEL, width: 1 });
    g += txt(px(rAxisEnd) - 2, oy - 6, "r", { anchor: "end" });

    // Vendepunktsirklene om O, stiplet.
    const circles = [rMin];
    if (bound && rMax > rMin + 1e-6) circles.push(rMax);
    for (const rc of circles) {
      g += circle(ox, oy, rc * sc, { stroke: HINT, width: 1.2, dash: "4 4" });
    }

    // V_eff(r) langs aksen. Kurven klippes av scenen der den skyter i været.
    const pts = [];
    const eTop = oy / sy; // energien ved scenens overkant
    const rTop = (J * J) / (1 + Math.sqrt(1 + 2 * eTop * J * J)); // der V_eff når overkanten
    const r0 = Math.max(0.04, rTop * 0.9);
    const n = 140;
    for (let i = 0; i <= n; i++) {
      const r = r0 + ((rAxisEnd - r0) * i) / n;
      const Y = pe(veff(r));
      if (Y < -20) continue;
      pts.push([px(r), Y]);
    }
    g += poly(pts, `stroke="${FIXED}" stroke-width="1.6"`);
    if (pts.length) {
      const last = pts[pts.length - 1];
      g += sub(last[0] - 2, last[1] - 8, "V", "eff", "end");
    }

    // Energilinja mellom vendepunktene, og prikken som er legemets avstand.
    const eY = pe(E);
    const xl = px(rMin);
    const xr = px(bound ? Math.min(rMax, rAxisEnd) : rAxisEnd);
    if (xr - xl > 4) {
      g += line(xl, eY, xr, eY, { color: DERIVED, width: 1.6 });
    }
    g += txt(xl + 0.25 * Math.max(0, xr - xl) + 6, eY - 7, "E", { fill: DERIVED });
    const r = Math.hypot(y[0], y[1]);
    if (r < rAxisEnd) {
      g += `<circle cx="${px(r).toFixed(1)}" cy="${eY.toFixed(1)}" r="5" style="fill:${DERIVED}"/>`;
    }

    // Merker for r_min og r_max på aksen.
    g += line(xl, oy - 4, xl, oy + 4, { color: LABEL, width: 1 });
    if (xl - ox > 30) g += sub(xl, oy + 16, "r", "min");
    if (bound && rMax > rMin + 0.08 && rMax < rAxisEnd) {
      const xm = px(rMax);
      g += line(xm, oy - 4, xm, oy + 4, { color: LABEL, width: 1 });
      g += sub(xm, oy + 16, "r", "max");
    }

    // Banen: sporet bak legemet, radiusvektoren og legemet.
    g += poly(trail.map((p) => [px(p[0]), py(p[1])]), `stroke="${MOVING}" stroke-width="1.4" opacity="0.55"`);
    const bx = px(y[0]);
    const by = py(y[1]);
    // Buen fra legemet inn på aksen viser at prikken står i avstanden r.
    const phi = Math.atan2(y[1], y[0]);
    if (Math.abs(phi) > 0.05 && r < rAxisEnd) {
      g += arc(ox, oy, r * sc, -phi, 0, { color: HINT, width: 1, dash: "2 5" });
    }
    g += line(ox, oy, bx, by, { color: LABEL, width: 1.2 });
    if (r * sc > 40) g += rodLabel(ox, oy, bx, by, "r");
    g += bob(ox, oy, 8, DERIVED);
    g += txt(ox - 9, oy + 16, "O", { anchor: "end" });
    g += bob(bx, by, 6, MOVING, "μ");

    stage.innerHTML = svg(w, h, g);
  }

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
