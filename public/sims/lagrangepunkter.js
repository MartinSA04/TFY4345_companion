/**
 * Potensialet U(x, y) = −Gm₁/r₁ − Gm₂/r₂ − ½ω²(x² + y²) i systemet K′ som
 * roterer med m₁ og m₂, tegnet som nivåkurver, med de fem Lagrangepunktene i
 * oransje og kurvene gjennom L₁, L₂ og L₃ kraftigere. Det skraverte området er
 * der U > C, altså der et legeme med Jacobis konstant C aldri kan komme. Når C
 * øker, åpner området seg først ved L₁, så ved L₂ og L₃, og over U(L₄) er hele
 * planet tillatt. Glidebryteren for C har knekkpunkter i U(L₁) … U(L₄), så hvert
 * av de fire intervallene får like mye vandring.
 *
 * Enheter: GM = 1, d = 1, ω = 1. Kontrakt: default-eksportert init(api),
 * api = { stage, controls, getSize, onResize, signal }.
 */
import { nb, slider, svg, txt, arrow, DERIVED, LABEL, HINT } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const HALF_W = 1.45; // synlig område i enheter av d
  const HALF_H = 1.2;
  const CELL = 3; // rutenettet for nivåkurvene, i piksler
  const KNOTS = [0.2, 0.4, 0.6, 0.8]; // glidebryterens posisjon for U(L₁) … U(L₄)
  let alpha = 0.1; // m₂/M
  let pos = 0.3; // glidebryteren for C, mellom U(L₁) og U(L₂)
  let pts = lagrangePoints(alpha);
  let levels = [];
  let C = 0;

  let geom = null;
  let grid = null;
  let contourLayer = "";
  let fillLayer = "";

  function U(x, y) {
    const r1 = Math.hypot(x + alpha, y);
    const r2 = Math.hypot(x - 1 + alpha, y);
    return -(1 - alpha) / r1 - alpha / r2 - 0.5 * (x * x + y * y);
  }

  /** De fem stasjonære punktene til U for masseforholdet a. */
  function lagrangePoints(a) {
    const dU = (x) => {
      const h = 1e-7;
      const u = (z) => -(1 - a) / Math.abs(z + a) - a / Math.abs(z - 1 + a) - 0.5 * z * z;
      return (u(x + h) - u(x - h)) / (2 * h);
    };
    const root = (lo, hi) => {
      for (let i = 0; i < 80; i++) {
        const m = (lo + hi) / 2;
        if (dU(lo) * dU(m) <= 0) hi = m;
        else lo = m;
      }
      return (lo + hi) / 2;
    };
    const e = 1e-9;
    const y45 = Math.sqrt(3) / 2;
    return {
      L1: [root(-a + e, 1 - a - e), 0],
      L2: [root(1 - a + e, 3), 0],
      L3: [root(-3, -a - e), 0],
      L4: [0.5 - a, y45],
      L5: [0.5 - a, -y45],
    };
  }

  /** C fra glidebryterens posisjon, stykkevis lineært mellom knekkpunktene. */
  function cFromPos(p) {
    const [u1, u2, u3, u4] = levels;
    const below = u1 - 0.6 * (u4 - u1); // venstre ende
    const above = u4 + 0.15 * (u4 - u1); // høyre ende
    const xs = [0, ...KNOTS, 1];
    const ys = [below, u1, u2, u3, u4, above];
    for (let i = 0; i < 5; i++) {
      if (p <= xs[i + 1]) return ys[i] + ((p - xs[i]) / (xs[i + 1] - xs[i])) * (ys[i + 1] - ys[i]);
    }
    return above;
  }

  function update() {
    levels = ["L1", "L2", "L3", "L4"].map((k) => U(...pts[k]));
    C = cFromPos(pos);
    fillLayer = "";
  }
  update();

  const openLabel = (p) => {
    if (p < KNOTS[0]) return "under U(L₁)";
    if (p < KNOTS[1]) return "over U(L₁)";
    if (p < KNOTS[2]) return "over U(L₂)";
    if (p < KNOTS[3]) return "over U(L₃)";
    return "over U(L₄)";
  };

  controls.append(
    slider({
      text: "Jacobis konstant C",
      aria: "Jacobis konstant for det lette legemet; det skraverte området der U er større enn C er stengt",
      min: 0,
      max: 1,
      step: 0.01,
      value: pos,
      format: openLabel,
      signal,
      onInput: (v) => {
        pos = v;
        update();
      },
    }),
    slider({
      text: "Masseforhold m₂/M",
      aria: "Massen til det lettere av de to tunge legemene, som andel av totalmassen",
      min: 0.01,
      max: 0.5,
      step: 0.01,
      value: alpha,
      format: (v) => nb(v, 2),
      signal,
      onInput: (v) => {
        alpha = v;
        pts = lagrangePoints(v);
        grid = null;
        update();
      },
    }),
  );

  /** Verdiene av U i nodene til et rutenett over scenen. */
  function buildGrid(w, h, px, py, sc) {
    const nx = Math.ceil(w / CELL) + 1;
    const ny = Math.ceil(h / CELL) + 1;
    const v = new Float64Array(nx * ny);
    for (let j = 0; j < ny; j++) {
      const y = (py - j * CELL) / sc;
      for (let i = 0; i < nx; i++) {
        const x = (i * CELL - px) / sc;
        v[j * nx + i] = Math.max(-8, U(x, y));
      }
    }
    return { nx, ny, v };
  }

  /** Nivåkurven U = c som stidata, med marsjerende kvadrater. */
  function contour(c) {
    const { nx, ny, v } = grid;
    let d = "";
    const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = v[j * nx + i];
        const b = v[j * nx + i + 1];
        const e = v[(j + 1) * nx + i + 1];
        const g = v[(j + 1) * nx + i];
        const k = (a > c ? 8 : 0) | (b > c ? 4 : 0) | (e > c ? 2 : 0) | (g > c ? 1 : 0);
        if (k === 0 || k === 15) continue;
        const X = i * CELL;
        const Y = j * CELL;
        const top = () => P(X + (CELL * (c - a)) / (b - a), Y);
        const right = () => P(X + CELL, Y + (CELL * (c - b)) / (e - b));
        const bottom = () => P(X + (CELL * (c - g)) / (e - g), Y + CELL);
        const leftE = () => P(X, Y + (CELL * (c - a)) / (g - a));
        const seg = (p, q) => {
          d += `M${p}L${q}`;
        };
        switch (k) {
          case 1: case 14: seg(leftE(), bottom()); break;
          case 2: case 13: seg(bottom(), right()); break;
          case 3: case 12: seg(leftE(), right()); break;
          case 4: case 11: seg(top(), right()); break;
          case 6: case 9: seg(top(), bottom()); break;
          case 7: case 8: seg(leftE(), top()); break;
          case 5: case 10: {
            const mid = (a + b + e + g) / 4 > c;
            if ((k === 5) === mid) {
              seg(leftE(), top());
              seg(bottom(), right());
            } else {
              seg(top(), right());
              seg(leftE(), bottom());
            }
            break;
          }
        }
      }
    }
    return d;
  }

  function buildContours() {
    const [U1, U2, U3, U4] = levels;
    const thin = [U1 - 1, U1 - 0.45, U1 - 0.18, U3 + 0.5 * (U4 - U3), U4 - 0.12 * (U4 - U3)];
    let g = "";
    for (const c of thin) {
      g += `<path d="${contour(c)}" fill="none" stroke="${HINT}" stroke-width="1"/>`;
    }
    for (const c of [U1, U2, U3]) {
      g += `<path d="${contour(c)}" fill="none" stroke="${LABEL}" stroke-width="1.1" opacity="0.75"/>`;
    }
    contourLayer = g;
  }

  /** Området der U > C, som rader av celler, med kanten U = C over. */
  function buildFill() {
    const { nx, ny, v } = grid;
    let d = "";
    for (let j = 0; j < ny; j++) {
      let i = 0;
      while (i < nx) {
        if (v[j * nx + i] <= C) {
          i++;
          continue;
        }
        const i0 = i;
        while (i < nx && v[j * nx + i] > C) i++;
        // Kantene interpoleres langs raden, så skraveringen følger kurven U = C.
        const row = j * nx;
        const x0 = i0 === 0 ? 0 : (i0 - 1 + (C - v[row + i0 - 1]) / (v[row + i0] - v[row + i0 - 1])) * CELL;
        const x1 = i === nx ? (nx - 1) * CELL : (i - 1 + (C - v[row + i - 1]) / (v[row + i] - v[row + i - 1])) * CELL;
        const y0 = j * CELL - CELL / 2;
        d += `M${x0.toFixed(1)} ${y0.toFixed(1)}h${(x1 - x0).toFixed(1)}v${CELL}h${(x0 - x1).toFixed(1)}z`;
      }
    }
    fillLayer = d
      ? `<path d="${d}" style="fill:${LABEL}" opacity="0.28"/>` +
        `<path d="${contour(C)}" fill="none" stroke="${LABEL}" stroke-width="1"/>`
      : " ";
  }

  /** Symbol med senket indeks, i monospace. */
  function sub(x, y, base, idx, { fill = LABEL, anchor = "middle" } = {}) {
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}" style="fill:${fill};font-family:var(--font-mono);font-size:12px">${base}<tspan dy="3" style="font-size:9px">${idx}</tspan></text>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const pad = 12;
    const sc = Math.min((w - 2 * pad) / (2 * HALF_W), (h - 2 * pad) / (2 * HALF_H));
    const ox = w / 2 - 0.1 * sc; // massesenteret, litt til venstre så L₂ får plass
    const oy = h / 2;
    const X = (x) => ox + x * sc;
    const Y = (y) => oy - y * sc;

    if (!geom || geom.w !== w || geom.h !== h || !grid) {
      geom = { w, h };
      grid = buildGrid(w, h, ox, oy, sc);
      buildContours();
      fillLayer = "";
    }
    if (!fillLayer) buildFill();

    let g = fillLayer + contourLayer;

    // Rotasjonen: en bue med pil om massesenteret, mot klokka, oppe til venstre
    // utenfor Lagrangepunktene, så den ikke kolliderer med etikettene.
    const RR = 1.3;
    const a0 = 2.05;
    const a1 = 2.7;
    const at = (a, r = RR) => [X(r * Math.cos(a)), Y(r * Math.sin(a))];
    const [bx0, by0] = at(a0);
    const [bx1, by1] = at(a1);
    const rr = RR * sc;
    g += `<path d="M ${bx0.toFixed(1)} ${by0.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 0 ${bx1.toFixed(1)} ${by1.toFixed(1)}" fill="none" stroke="${LABEL}" stroke-width="1.1"/>`;
    const [hx, hy] = at(a1 - 0.07);
    g += arrow(hx, hy, bx1, by1, LABEL, 1.1);
    const [lx, ly] = at(2.35, RR + 0.1);
    g += txt(lx, ly, "ω", { anchor: "middle" });

    // m₁ og m₂, i ro i K′, med radius som tredjeroten av massen.
    const R1 = 10 * Math.cbrt(1 - alpha);
    const R2 = Math.max(3.5, 10 * Math.cbrt(alpha));
    g += `<circle cx="${X(-alpha).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="${R1.toFixed(1)}" style="fill:var(--fg)"/>`;
    g += `<circle cx="${X(1 - alpha).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="${R2.toFixed(1)}" style="fill:var(--fg)"/>`;
    g += sub(X(-alpha), Y(0) + R1 + 15, "m", "1");
    g += sub(X(1 - alpha), Y(0) + R2 + 13, "m", "2");

    // Lagrangepunktene.
    const lab = {
      L1: [-2, -9, "end"],
      L2: [3, -9, "start"],
      L3: [-3, -9, "end"],
      L4: [0, -10, "middle"],
      L5: [0, 20, "middle"],
    };
    for (const k of ["L1", "L2", "L3", "L4", "L5"]) {
      const [x, y] = pts[k];
      const px = X(x);
      const py = Y(y);
      g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3.5" style="fill:${DERIVED}"/>`;
      const [dx, dy, an] = lab[k];
      g += sub(px + dx, py + dy, "L", k[1], { fill: DERIVED, anchor: an });
    }

    stage.innerHTML = svg(w, h, g);
  }

  onResize(() => {
    grid = null;
    render();
  });
  render();
  // Glidebryterne endrer bare tilstanden; tegn på nytt når de flyttes.
  controls.addEventListener("input", render, { signal });
}
