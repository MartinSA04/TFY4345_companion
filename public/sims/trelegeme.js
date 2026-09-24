/**
 * Det begrensede trelegemeproblemet i det roterende systemet K′: m₁ og m₂
 * står i ro på x-aksen, og potensialet U(x, y) = −Gm₁/r₁ − Gm₂/r₂ − ½ω²(x² + y²)
 * er tegnet som nivåkurver, med kurvene gjennom L₁, L₂ og L₃ kraftigere. De
 * fem Lagrangepunktene er oransje. Et lett legeme slippes i ro, enten ved L₄
 * eller der leseren trykker, og følger bevegelsesligningene med Coriolisleddet.
 * Det skraverte området er der U er større enn Jacobis konstant C, altså der
 * legemet aldri kan komme; legemet starter på kanten av det.
 *
 * Enheter: GM = 1, d = 1, ω = 1, så ett omløp for m₁ og m₂ er 2π. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, poly, arrow,
  DERIVED, MOVING, LABEL, HINT,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const RATE = 2.4; // simulerte tidsenheter per sekund; ett omløp ≈ 2,6 s
  const START_TURN = 0.35; // startpunktet er L₄ dreid så mye (rad) framover om massesenteret
  const HALF_W = 1.45; // synlig område i enheter av d
  const HALF_H = 1.2;
  const CELL = 3; // rutenettet for nivåkurvene, i piksler
  let alpha = 0.01; // m₂/M
  let pts = lagrangePoints(alpha);
  let s = [0, 0, 0, 0]; // [x, y, ẋ, ẏ]
  let C = 0;
  let trail = [];
  let pause = 0; // sekunder legemet står stille etter en kollisjon før det slippes på nytt
  let release = [0, 0];

  // Bufret bakgrunn: nivåkurver og skravering avhenger bare av α, C og størrelsen.
  let geom = null;
  let grid = null;
  let contourLayer = "";
  let fillLayer = "";

  function U(x, y) {
    const r1 = Math.hypot(x + alpha, y);
    const r2 = Math.hypot(x - 1 + alpha, y);
    return -(1 - alpha) / r1 - alpha / r2 - 0.5 * (x * x + y * y);
  }

  function f(t, q) {
    const [x, y, vx, vy] = q;
    const r1 = Math.hypot(x + alpha, y);
    const r2 = Math.hypot(x - 1 + alpha, y);
    const q1 = (1 - alpha) / (r1 * r1 * r1);
    const q2 = alpha / (r2 * r2 * r2);
    return [
      vx,
      vy,
      2 * vy + x - q1 * (x + alpha) - q2 * (x - 1 + alpha),
      -2 * vx + y - q1 * y - q2 * y,
    ];
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

  function releaseAt(x, y) {
    s = [x, y, 0, 0];
    release = [x, y];
    C = U(x, y);
    trail = [[x, y]];
    pause = 0;
    fillLayer = "";
  }

  function releaseNearL4() {
    const [x0, y0] = pts.L4;
    const c = Math.cos(START_TURN);
    const sn = Math.sin(START_TURN);
    releaseAt(x0 * c - y0 * sn, x0 * sn + y0 * c);
  }
  releaseNearL4();

  function setAlpha(a) {
    alpha = a;
    pts = lagrangePoints(a);
    grid = null;
    releaseNearL4();
  }

  controls.append(
    slider({
      text: "Masseforhold m₂/M",
      aria: "Massen til det lettere av de to tunge legemene, som andel av totalmassen",
      min: 0.002,
      max: 0.08,
      step: 0.002,
      value: alpha,
      format: (v) => nb(v, 3),
      signal,
      onInput: setAlpha,
    }),
    button("Slipp ved L₄", "Slipp legemet i ro like foran L₄", releaseNearL4, signal),
  );

  function step(dt) {
    if (pause > 0) {
      pause -= dt;
      if (pause <= 0) releaseAt(release[0], release[1]);
      return;
    }
    let left = dt * RATE;
    while (left > 0) {
      const r1 = Math.hypot(s[0] + alpha, s[1]);
      const r2 = Math.hypot(s[0] - 1 + alpha, s[1]);
      const rm = Math.min(r1, r2);
      // Kortere steg nær massene, der akselerasjonen er stor.
      const h = Math.min(left, 0.004, 0.03 * Math.pow(rm, 1.5));
      s = rk4(s, f, 0, h);
      left -= h;
      if (r1 < 0.05 || r2 < 0.02) {
        pause = 1.2;
        return;
      }
    }
    if (Math.hypot(s[0], s[1]) > 2.4) {
      pause = 0.6;
      return;
    }
    trail.push([s[0], s[1]]);
    if (trail.length > 1100) trail.splice(0, trail.length - 1100);
  }

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
    const U1 = U(...pts.L1);
    const U2 = U(...pts.L2);
    const U3 = U(...pts.L3);
    const U4 = U(...pts.L4);
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
    fillLayer =
      `<path d="${d}" style="fill:${LABEL}" opacity="0.28"/>` +
      `<path d="${contour(C)}" fill="none" stroke="${LABEL}" stroke-width="1"/>`;
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
      geom = { w, h, ox, oy, sc };
      grid = buildGrid(w, h, ox, oy, sc);
      buildContours();
      fillLayer = "";
    }
    if (!fillLayer) buildFill();

    let g = fillLayer + contourLayer;

    // Rotasjonen: en bue med pil om massesenteret, mot klokka.
    const rr = 0.3 * sc;
    const a0 = 1.75;
    const a1 = 2.95;
    const at = (a) => [X(0.3 * Math.cos(a)), Y(0.3 * Math.sin(a))];
    const [bx0, by0] = at(a0);
    const [bx1, by1] = at(a1);
    g += `<path d="M ${bx0.toFixed(1)} ${by0.toFixed(1)} A ${rr.toFixed(1)} ${rr.toFixed(1)} 0 0 0 ${bx1.toFixed(1)} ${by1.toFixed(1)}" fill="none" stroke="${LABEL}" stroke-width="1.1"/>`;
    const [hx, hy] = at(a1 - 0.2);
    g += arrow(hx, hy, bx1, by1, LABEL, 1.1);
    const [lx, ly] = at(2.35);
    g += txt(lx - 8, ly - 6, "ω", { anchor: "end" });

    // Sporet og legemet.
    g += poly(trail.map((p) => [X(p[0]), Y(p[1])]), `stroke="${MOVING}" stroke-width="1.4" opacity="0.6"`);

    // m₁ og m₂, i ro i K′.
    const R1 = 9;
    const R2 = Math.max(3.5, R1 * Math.cbrt(alpha / (1 - alpha)) * 1.6);
    g += `<circle cx="${X(-alpha).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="${R1}" style="fill:var(--fg)"/>`;
    g += `<circle cx="${X(1 - alpha).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="${R2.toFixed(1)}" style="fill:var(--fg)"/>`;
    g += sub(X(-alpha), Y(0) + R1 + 15, "m", "1");
    g += sub(X(1 - alpha), Y(0) + 18, "m", "2");

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

    g += `<circle cx="${X(s[0]).toFixed(1)}" cy="${Y(s[1]).toFixed(1)}" r="5" style="fill:${MOVING}"/>`;

    stage.innerHTML = svg(w, h, g);
  }

  stage.style.cursor = "crosshair";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const rect = stage.getBoundingClientRect();
      // Scenen kan være skalert i forhold til viewBox; regn om via bredden.
      const kx = geom.w / rect.width;
      const ky = geom.h / rect.height;
      const x = ((e.clientX - rect.left) * kx - geom.ox) / geom.sc;
      const y = (geom.oy - (e.clientY - rect.top) * ky) / geom.sc;
      if (Math.hypot(x + alpha, y) < 0.08 || Math.hypot(x - 1 + alpha, y) < 0.04) return;
      releaseAt(x, y);
    },
    { signal },
  );

  onResize(() => {
    grid = null;
    render();
  });
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
