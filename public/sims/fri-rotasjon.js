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
 * Boka er massiv (permer, rygg og sideblokk) og skyggelagt fra ett lys
 * (_solid.js). Stanga, banen og L deles og sorteres mot boka (_painter.js),
 * så det som er inni eller bak boka, vises som svake stiplede linjer.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line,
  DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";
import { PAPER, face, lightFor, shade, tone } from "./_solid.js";
import { boxHit, painter } from "./_painter.js";

const LIGHT = lightFor();

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
    const view = [0, ca, -sa];
    const e = axes(y);
    const at = (c) => [0, 1, 2].map((i) => c[0] * e[0][i] + c[1] * e[1][i] + c[2] * e[2][i]);
    // Boka er bygd av fire deler, alle med de samme ytre målene HALF som
    // treghetsmomentene regnes fra: to permer som stikker litt utenfor
    // sideblokka, ryggen langs −2 og sideblokka i papir imellom.
    const CT = 0.03; // permtykkelse
    const OV = 0.04; // så mye permene stikker ut
    const parts = [
      { c: [0, 0, -(HALF[2] - CT / 2)], h: [HALF[0], HALF[1], CT / 2], mat: MOVING, kind: "back" },
      { c: [0, 0, HALF[2] - CT / 2], h: [HALF[0], HALF[1], CT / 2], mat: MOVING, kind: "front" },
      { c: [0, -(HALF[1] - CT / 2), 0], h: [HALF[0], CT / 2, HALF[2] - CT], mat: MOVING, kind: "spine" },
      { c: [0, (CT - OV) / 2, 0], h: [HALF[0] - OV, HALF[1] - (CT + OV) / 2, HALF[2] - CT], mat: PAPER, kind: "block" },
    ];
    const hits = parts.map((pt) => boxHit(e, pt.h, at(pt.c)));
    const pen = painter({ P, view, hit: (p, u) => hits.some((f) => f(p, u)) });

    // Rekkefølgen er fast gitt av planene som skiller delene: permen lengst
    // inne først, så ryggen og sideblokka (den nærmeste sist), så den nærmeste permen.
    const frontNear = dot(e[2], view) < 0;
    const spineNear = dot(e[1], view) > 0;
    const [back, front, spine, block] = parts;
    const order = [frontNear ? back : front, ...(spineNear ? [block, spine] : [spine, block]), frontNear ? front : back];

    // Punkt i boka: v i bokas akser, relativt til delens senter.
    const pt3 = (part, v) => at([part.c[0] + v[0], part.c[1] + v[1], part.c[2] + v[2]]);
    const segOn = (part, a, sg, run, fixed, val, from, to, color, width) => {
      const p0 = [0, 0, 0];
      const p1 = [0, 0, 0];
      p0[a] = p1[a] = sg * part.h[a];
      p0[fixed] = p1[fixed] = val;
      p0[run] = from;
      p1[run] = to;
      const [x0, y0] = P(pt3(part, p0));
      const [x1, y1] = P(pt3(part, p1));
      return line(x0, y0, x1, y1, { color, width });
    };
    const rect = (part, a, sg, ua, va, [u0, u1], [v0, v1]) =>
      [[u1, v1], [u0, v1], [u0, v0], [u1, v0]].map(([u, v]) => {
        const p = [0, 0, 0];
        p[a] = sg * part.h[a];
        p[ua] = u;
        p[va] = v;
        return P(pt3(part, p));
      });

    let book = "";
    for (const part of order) {
      for (let a = 0; a < 3; a++) {
        for (const sg of [1, -1]) {
          const nrm = e[a].map((c) => sg * c);
          if (dot(nrm, view) >= 0) continue;
          const b = (a + 1) % 3;
          const c = (a + 2) % 3;
          const corner = (pb, pc) => {
            const v = [0, 0, 0];
            v[a] = sg * part.h[a];
            v[b] = pb * part.h[b];
            v[c] = pc * part.h[c];
            return P(pt3(part, v));
          };
          const t = tone(nrm, LIGHT);
          book += face([corner(1, 1), corner(-1, 1), corner(-1, -1), corner(1, -1)], shade(part.mat, t), shade(part.mat, 3), 0.7);
          const ink = shade(PAPER, Math.min(3, t + 1.5));
          if (part.kind === "block" && a !== 2) {
            // Sidekantene: tette linjer parallelt med permene.
            const run = a === 0 ? 1 : 0;
            for (let i = 1; i < 8; i++) {
              const z = -part.h[2] + (2 * part.h[2] * i) / 8;
              book += segOn(part, a, sg, run, 2, z, -part.h[run], part.h[run], ink, 0.5);
            }
          } else if (part.kind === "spine" && a === 1 && sg < 0) {
            // Ryggen: to par opphøyde bånd og et lyst ryggskilt.
            for (const x of [-0.84, -0.8, 0.8, 0.84]) {
              book += segOn(part, a, sg, 2, 0, x * HALF[0], -part.h[2], part.h[2], shade(MOVING, 3), 1);
            }
            book += face(rect(part, a, sg, 0, 2, [-0.3, 0.3], [-0.6 * part.h[2], 0.6 * part.h[2]]), shade(PAPER, t), shade(PAPER, 3), 0.6);
          } else if (part.kind === "front" && a === 2 && sg > 0) {
            // Forsida: tittelskilt med en tynn ramme rundt.
            book += face(rect(part, a, sg, 0, 1, [-0.6, 0.6], [0.1, 0.42]), shade(PAPER, t), shade(PAPER, 3), 0.6);
            const frame = rect(part, a, sg, 0, 1, [-0.9, 0.9], [-0.85 * HALF[1], 0.9 * HALF[1]]);
            book += face(frame, "none", shade(MOVING, Math.min(3, t + 1)), 0.8);
          }
        }
      }
    }

    // Stanga gjennom boka, banen til plussenden og L. Alt sorteres mot boka.
    const rodEnd = HALF[k] + 0.32;
    pen.polyline(trail, { color: LABEL, width: 1.2, dash: "3 4", opacity: 0.7 });
    pen.polyline([e[k].map((c) => -rodEnd * c), e[k].map((c) => rodEnd * c)], { color: LABEL, width: 3 });
    pen.dotAt(e[k].map((c) => rodEnd * c), 5, LABEL);
    const Ltip = Lsp.map((c) => 1.35 * c);
    pen.arrow([0, 0, 0], Ltip, DERIVED, 2.8);

    // Etiketter ligger alltid øverst.
    let labels = "";
    for (let a = 0; a < 3; a++) {
      const tip = e[a].map((c) => (HALF[a] + (a === k ? 0.5 : 0.16)) * c);
      const [lx, ly] = P(tip);
      const side = Math.hypot(e[a][0], e[a][2] * ca + e[a][1] * sa);
      labels += txt(lx, ly + 4, String(a + 1), { anchor: "middle", opacity: Math.min(1, Math.max(0.15, (side - 0.2) / 0.4)) });
    }
    const [l1x, l1y] = P(Ltip);
    labels += txt(l1x + 9, l1y + 8, "L", { fill: DERIVED });

    stage.innerHTML = svg(w, h, pen.svg(book) + labels);
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
