/**
 * Ei bok med halve sider 1 : 0,6 : 0,15 roterer fritt. Akse 1 går langs den
 * lengste sida, akse 3 står vinkelrett på den store flaten, så I₁ < I₂ < I₃.
 * Hver knapp starter rotasjon om én hovedakse med et lite avvik i de to
 * andre komponentene av ω.
 *
 * ω regnes i legemets akser fra Eulers ligninger uten dreiemoment, og aksene
 * ê_a′ (som vektorer i rommet) fra ė_a′ = ω × ê_a′, begge med Runge-Kutta.
 * Aksene ortonormeres etter hvert bilde. L = Σ I_a ω_a ê_a′ står fast og peker
 * loddrett opp, og den grå stanga er aksen rotasjonen startet om, med en prikk
 * i den ene enden så det synes når den snur.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, poly, arrow,
  DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const HALF = [1, 0.6, 0.15]; // halve sider langs aksene 1, 2, 3
  const I = [
    HALF[1] ** 2 + HALF[2] ** 2,
    HALF[0] ** 2 + HALF[2] ** 2,
    HALF[0] ** 2 + HALF[1] ** 2,
  ];
  const W0 = (2 * Math.PI) / 1.7; // én omdreining på 1,7 s
  const EPS = 0.04;
  const DT = 0.002;
  const ALPHA = 0.5; // kameraets hevning over vannrett
  const TRAIL = 200;

  let k = 1; // aksen rotasjonen startet om
  let y = []; // [ω₁, ω₂, ω₃, ê₁′ (3), ê₂′ (3), ê₃′ (3)]
  let Lsp = [0, 0, 1];
  let trail = [];

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => {
    const l = Math.hypot(...a) || 1;
    return a.map((c) => c / l);
  };
  const axes = (s) => [s.slice(3, 6), s.slice(6, 9), s.slice(9, 12)];

  function reset() {
    const w = [EPS, EPS, EPS];
    w[k] = 1;
    const wb = w.map((c) => c * W0);
    // Legg legemet slik at L peker loddrett opp: n er retningen til L i
    // legemets akser, og (u, v, n) avbildes på (x, y, z).
    const n = norm(wb.map((c, a) => I[a] * c));
    const ref = [0, 0, 0];
    ref[(k + 1) % 3] = 1;
    const u = norm(ref.map((c, a) => c - dot(ref, n) * n[a]));
    const v = cross(n, u);
    // Drei hele legemet om loddlinja så det ser bedre ut fra kameraet.
    const b = 0.5;
    const turn = ([x, yy, z]) => [x * Math.cos(b) - yy * Math.sin(b), x * Math.sin(b) + yy * Math.cos(b), z];
    const e = [0, 1, 2].map((a) => turn([u[a], v[a], n[a]]));
    y = [...wb, ...e[0], ...e[1], ...e[2]];
    const L = [0, 0, 0];
    e.forEach((ea, a) => ea.forEach((c, i) => (L[i] += I[a] * wb[a] * c)));
    Lsp = norm(L);
    trail = [];
    buttons.forEach((bt, i) => bt.setAttribute("aria-pressed", String(i === k)));
  }

  const f = (t, s) => {
    const [w1, w2, w3] = s;
    const e = axes(s);
    const ws = [0, 1, 2].map((i) => w1 * e[0][i] + w2 * e[1][i] + w3 * e[2][i]);
    return [
      ((I[1] - I[2]) * w2 * w3) / I[0],
      ((I[2] - I[0]) * w3 * w1) / I[1],
      ((I[0] - I[1]) * w1 * w2) / I[2],
      ...cross(ws, e[0]),
      ...cross(ws, e[1]),
      ...cross(ws, e[2]),
    ];
  };

  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    // Gram-Schmidt holder aksene ortonormerte.
    const [a, b] = axes(y);
    const e1 = norm(a);
    const e2 = norm(b.map((c, i) => c - dot(b, e1) * e1[i]));
    const e3 = cross(e1, e2);
    y = [y[0], y[1], y[2], ...e1, ...e2, ...e3];
    const ek = axes(y)[k];
    trail.push(ek.map((c) => (HALF[k] + 0.32) * c));
    if (trail.length > TRAIL) trail.shift();
  }

  const buttons = [0, 1, 2].map((a) =>
    button(
      `Om akse ${a + 1}`,
      `Start rotasjon om hovedakse ${a + 1}`,
      () => {
        k = a;
        reset();
        anim?.start();
      },
      signal,
    ),
  );
  controls.append(...buttons);
  reset();

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    // Boka og stanga når 1,32 ut fra sentrum i alle retninger, L-pila 1,35 opp.
    const s = Math.min((w - 16) / 2.7, (h - 16) / 2.75);
    const cx = w / 2;
    const cy = h / 2 + 0.06 * s;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const P = ([x, yy, z]) => [cx + s * x, cy - s * (z * ca + yy * sa)];
    const depth = ([, yy, z]) => yy * ca - z * sa; // større er lenger inne
    const view = [0, ca, -sa];
    const e = axes(y);
    const at = (c) => [0, 1, 2].map((i) => c[0] * e[0][i] + c[1] * e[1][i] + c[2] * e[2][i]);
    let g = "";

    // Stanga langs aksen k, bak boka.
    const rodEnd = HALF[k] + 0.32;
    const pPlus = P(e[k].map((c) => rodEnd * c));
    const pMinus = P(e[k].map((c) => -rodEnd * c));
    const plusFront = depth(e[k]) < 0;
    g += poly(trail.map(P), `stroke="${LABEL}" stroke-width="1.2" stroke-dasharray="3 4" opacity="0.7"`);
    g += line(pMinus[0], pMinus[1], pPlus[0], pPlus[1], { color: LABEL, width: 3 });

    // Flatene som vender mot kameraet.
    const faces = [];
    for (let a = 0; a < 3; a++) {
      for (const sg of [1, -1]) {
        const nrm = e[a].map((c) => sg * c);
        if (dot(nrm, view) >= 0) continue;
        const b = (a + 1) % 3;
        const c = (a + 2) % 3;
        const corner = (pb, pc) => {
          const v = [0, 0, 0];
          v[a] = sg * HALF[a];
          v[b] = pb * HALF[b];
          v[c] = pc * HALF[c];
          return P(at(v));
        };
        const pts = [corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)];
        const op = a === 2 ? (sg > 0 ? 0.5 : 0.1) : 0.24;
        faces.push({ pts, op });
      }
    }
    for (const { pts, op } of faces) {
      let d = "";
      pts.forEach(([x, yy], i) => {
        d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${yy.toFixed(1)} `;
      });
      g += `<path d="${d}Z" style="fill:${MOVING}" fill-opacity="${op}" stroke="${MOVING}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }

    // Stanga foran boka der den stikker ut mot kameraet, og prikken i plussenden.
    const out = (sg) => P(e[k].map((c) => sg * (HALF[k] + 0.02) * c));
    const front = plusFront ? [out(1), pPlus] : [out(-1), pMinus];
    g += line(front[0][0], front[0][1], front[1][0], front[1][1], { color: LABEL, width: 3 });
    g += `<circle cx="${pPlus[0].toFixed(1)}" cy="${pPlus[1].toFixed(1)}" r="5" style="fill:${LABEL}"/>`;

    // Akseetiketter like utenfor boka, svakere når aksen peker mot kameraet.
    for (let a = 0; a < 3; a++) {
      const tip = e[a].map((c) => (HALF[a] + (a === k ? 0.5 : 0.16)) * c);
      const [lx, ly] = P(tip);
      const side = Math.hypot(e[a][0], e[a][2] * ca + e[a][1] * sa);
      g += txt(lx, ly + 4, String(a + 1), { anchor: "middle", opacity: Math.min(1, Math.max(0.15, (side - 0.2) / 0.4)) });
    }

    // L står fast.
    const [l0x, l0y] = P([0, 0, 0]);
    const [l1x, l1y] = P(Lsp.map((c) => 1.35 * c));
    g += arrow(l0x, l0y, l1x, l1y, DERIVED, 2.8);
    g += txt(l1x + 9, l1y + 8, "L", { fill: DERIVED });

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  const anim = animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
