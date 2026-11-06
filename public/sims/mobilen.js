/**
 * Mobilen i lufta. En mobil (15 × 7 × 0,8 cm, regnet som en jevn plate)
 * roterer fritt, sett fra et system som faller med den. Akse 1 går langs
 * lengden, akse 2 på tvers og akse 3 gjennom skjermen, så I₁ < I₂ < I₃.
 * Knappene starter rotasjon om én hovedakse med et lite avvik i de to andre
 * komponentene av ω.
 *
 * ω regnes i legemets akser fra Eulers ligninger uten dreiemoment, og aksene
 * ê_a′ (som vektorer i rommet) fra ė_a′ = ω × ê_a′, begge med Runge-Kutta.
 * Aksene ortonormeres etter hvert bilde.
 *
 * To visninger av samme bevegelse. «Fra rommet»: L står fast og peker mot
 * høyre, mobilen tumler, og den grå stanga er aksen rotasjonen startet om,
 * med banen til enden stiplet. «Fra mobilen»: kameraet følger mobilen, som
 * da ligger stille, og L vandrer. Spissen av L ligger på kula |L| = konstant,
 * og de stiplede kurvene på kula er der T også har fast verdi; banen til
 * spissen følger en av dem.
 *
 * Mobilen er massiv og skyggelagt fra ett lys (_solid.js), og linjene deles
 * og sorteres mot den (_painter.js).
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, circle,
  DERIVED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";
import { face, lightFor, shade, tone, viewFor } from "./_solid.js";
import { boxHit, painter } from "./_painter.js";

const LIGHT = lightFor();
const SCREEN = `color-mix(in oklab, var(--solid-shade) 62%, ${MOVING})`;

export default function init({ stage, controls, getSize, onResize, signal }) {
  const HALF = [1, 7 / 15, 0.8 / 15]; // halve sider langs aksene 1, 2, 3
  const I = [
    HALF[1] ** 2 + HALF[2] ** 2,
    HALF[0] ** 2 + HALF[2] ** 2,
    HALF[0] ** 2 + HALF[1] ** 2,
  ];
  const W0 = (2 * Math.PI) / 2; // én omdreining på 2 s
  // Avviket i de to andre komponentene av ω ved start, valgt så L ligger 8–10° fra
  // akse 1 og akse 3 (rundt akse 2 velter mobilen uansett).
  const EPS = [0.025, 0.04, 0.2];
  const DT = 0.002;
  const ALPHA = 0.5; // kameraets hevning over vannrett
  const VIEW = viewFor(ALPHA);
  const RS = 1.2; // radien til kula L-spissen går på
  const TRAIL = 900;
  const NAMES = ["Om lengdeaksen", "Om tverraksen", "Gjennom skjermen"];

  let k = 1; // aksen rotasjonen startet om
  let fromBody = false;
  let y = []; // [ω₁, ω₂, ω₃, ê₁′ (3), ê₂′ (3), ê₃′ (3)]
  let trailSpace = []; // enden av stanga, i rommet
  let trailBody = []; // retningen til L i legemets akser

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (a) => {
    const l = Math.hypot(...a) || 1;
    return a.map((c) => c / l);
  };
  const axes = (s) => [s.slice(3, 6), s.slice(6, 9), s.slice(9, 12)];
  const Lbody = () => norm([0, 1, 2].map((a) => I[a] * y[a]));

  // Kurvene på kula der T har fast verdi, i legemets akser (|n| = 1). Med
  // c_a = 1/I_a er kurven Σ c_a n_a² = konstant. Rundt akse 1 og 3 er de ringer;
  // gjennom akse 2 går to storsirkler (skillekurvene).
  const C = I.map((x) => 1 / x);
  const ringPts = (q, a, b, cc, sg) => {
    // ringen om aksen cc: x_a² |c_cc − c_a| + x_b² |c_cc − c_b| = q, på siden sg av kula
    const A = Math.sqrt(q / Math.abs(C[cc] - C[a]));
    const B = Math.sqrt(q / Math.abs(C[cc] - C[b]));
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const t = (2 * Math.PI * i) / 120;
      const p = [0, 0, 0];
      p[a] = A * Math.cos(t);
      p[b] = B * Math.sin(t);
      p[cc] = sg * Math.sqrt(Math.max(0, 1 - p[a] ** 2 - p[b] ** 2));
      pts.push(p);
    }
    return pts;
  };
  // Kurven gjennom retningen n: en ring om akse 1 eller akse 3, på den siden n ligger.
  function levelCurve(n) {
    const val = n.reduce((acc, x, a) => acc + C[a] * x * x, 0);
    if (val >= C[1]) return ringPts(C[0] - val, 1, 2, 0, Math.sign(n[0]) || 1);
    return ringPts(val - C[2], 0, 1, 2, Math.sign(n[2]) || 1);
  }
  const context = (() => {
    const out = [];
    for (const sg of [1, -1]) {
      out.push(ringPts(0.5 * (C[0] - C[1]), 1, 2, 0, sg));
      out.push(ringPts(0.5 * (C[1] - C[2]), 0, 1, 2, sg));
    }
    const kap = Math.sqrt((C[0] - C[1]) / (C[1] - C[2]));
    for (const sg of [1, -1]) {
      const d = norm([1, 0, sg * kap]);
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const t = (2 * Math.PI * i) / 160;
        pts.push(d.map((x) => x * Math.cos(t)).map((x, j) => x + (j === 1 ? Math.sin(t) : 0)));
      }
      out.push(pts);
    }
    return out;
  })();
  let current = [];

  // Mobilen sett fra seg selv: liggende med skjermen opp, dreid litt om loddlinja.
  const BB = 0.45;
  const EB = [
    [Math.cos(BB), Math.sin(BB), 0],
    [-Math.sin(BB), Math.cos(BB), 0],
    [0, 0, 1],
  ];

  function reset() {
    const w = [EPS[k], EPS[k], EPS[k]];
    w[k] = 1;
    const wb = w.map((c) => c * W0);
    // n er retningen til L i legemets akser. Med radene (n, u, v) avbildet på
    // (x, y, z) peker L mot høyre i rommet.
    const n = norm(wb.map((c, a) => I[a] * c));
    const ref = [0, 0, 0];
    ref[(k + 1) % 3] = 1;
    const u = norm(ref.map((c, a) => c - dot(ref, n) * n[a]));
    const v = cross(n, u);
    // Drei alt om L-aksen så mobilen ikke står kant i kant med kameraet.
    const g = 0.6;
    const e = [0, 1, 2].map((a) => [n[a], u[a] * Math.cos(g) - v[a] * Math.sin(g), u[a] * Math.sin(g) + v[a] * Math.cos(g)]);
    y = [...wb, ...e[0], ...e[1], ...e[2]];
    trailSpace = [];
    trailBody = [];
    current = levelCurve(Lbody());
    spinBtns.forEach((bt, i) => bt.setAttribute("aria-pressed", String(i === k)));
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

  const ROD = 0.32;
  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    const [a, b] = axes(y);
    const e1 = norm(a);
    const e2 = norm(b.map((c, i) => c - dot(b, e1) * e1[i]));
    const e3 = cross(e1, e2);
    y = [y[0], y[1], y[2], ...e1, ...e2, ...e3];
    trailSpace.push(axes(y)[k].map((c) => (HALF[k] + ROD) * c));
    if (trailSpace.length > TRAIL) trailSpace.shift();
    trailBody.push(Lbody());
    if (trailBody.length > TRAIL) trailBody.shift();
  }

  const spinBtns = NAMES.map((name, a) =>
    button(
      name,
      `Start rotasjon om hovedakse ${a + 1}`,
      () => {
        k = a;
        reset();
        anim?.start();
      },
      signal,
    ),
  );
  const viewBtns = ["Fra rommet", "Fra mobilen"].map((name, i) =>
    button(
      name,
      i ? "Vis bevegelsen sett fra mobilen" : "Vis bevegelsen sett fra rommet",
      () => {
        fromBody = i === 1;
        viewBtns.forEach((bt, j) => bt.setAttribute("aria-pressed", String(j === i)));
        render();
      },
      signal,
    ),
  );
  viewBtns[0].setAttribute("aria-pressed", "true");
  controls.append(...spinBtns, ...viewBtns);
  reset();

  function phoneSvg(e, P) {
    const order = [];
    for (let a = 0; a < 3; a++) {
      for (const sg of [1, -1]) {
        const nrm = e[a].map((c) => sg * c);
        if (dot(nrm, VIEW) >= 0) continue;
        order.push({ a, sg, nrm });
      }
    }
    const corner = (a, sg, pb, pc, scl = [1, 1, 1]) => {
      const b = (a + 1) % 3;
      const c = (a + 2) % 3;
      const v = [0, 0, 0];
      v[a] = sg * HALF[a];
      v[b] = pb * HALF[b] * scl[b];
      v[c] = pc * HALF[c] * scl[c];
      return P([0, 1, 2].map((i) => v[0] * e[0][i] + v[1] * e[1][i] + v[2] * e[2][i]));
    };
    let s = "";
    for (const { a, sg, nrm } of order) {
      const t = tone(nrm, LIGHT);
      s += face([corner(a, sg, 1, 1), corner(a, sg, -1, 1), corner(a, sg, -1, -1), corner(a, sg, 1, -1)], shade(MOVING, t), shade(MOVING, 3), 0.7);
      if (a === 2 && sg > 0) {
        // Skjermen: et mørkt glassfelt med en smal kant rundt.
        const sc = [0.93, 0.86, 1];
        s += face([corner(a, sg, 1, 1, sc), corner(a, sg, -1, 1, sc), corner(a, sg, -1, -1, sc), corner(a, sg, 1, -1, sc)], shade(SCREEN, t), shade(SCREEN, 3), 0.6);
      } else if (a === 2 && sg < 0) {
        // Baksida: kameraet i et hjørne.
        const cam = (du, dv) => {
          const v = [0.78 + du, 0.55 + dv, -1].map((x, i) => x * HALF[i]);
          return P([0, 1, 2].map((i) => v[0] * e[0][i] + v[1] * e[1][i] + v[2] * e[2][i]));
        };
        s += face([cam(0.12, 0.25), cam(-0.12, 0.25), cam(-0.12, -0.25), cam(0.12, -0.25)], shade(SCREEN, t), shade(SCREEN, 3), 0.6);
      }
    }
    return s;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    // Kula og etikettene når 1,45 ut fra sentrum.
    const s = Math.min((w - 12) / 2.8, (h - 16) / 2.8);
    const cx = w / 2;
    const cy = h / 2;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const P = ([x, yy, z]) => [cx + s * x, cy - s * (z * ca + yy * sa)];
    const e = fromBody ? EB : axes(y);
    const pen = painter({ P, view: VIEW, hit: boxHit(e, HALF) });
    const toSpace = (b) => [0, 1, 2].map((i) => b[0] * e[0][i] + b[1] * e[1][i] + b[2] * e[2][i]);
    let back = "";
    let curveSvg = "";
    let labels = "";

    if (fromBody) {
      back += circle(cx, cy, RS * s, { stroke: HINT, width: 1 });
      // Kurvene er hjelpelinjer på kula: biter som mobilen skjuler, tegnes ikke,
      // resten tegnes over mobilen, svakere på baksida av kula.
      const hide = boxHit(e, HALF);
      const toViewer = VIEW.map((x) => -x);
      const list = [...context.map((pts) => ({ pts, now: false })), { pts: current, now: true }];
      for (const cv of list) {
        let run = [];
        let cat = null;
        const flush = () => {
          if (run.length > 1 && cat !== "hidden") {
            let d = "";
            run.forEach((q, i) => {
              const [X, Y] = P(q);
              d += `${i ? "L" : "M"} ${X.toFixed(1)} ${Y.toFixed(1)} `;
            });
            curveSvg += `<path d="${d}" fill="none" stroke="${cv.now ? LABEL : HINT}" stroke-width="${cv.now ? 1.5 : 1}" stroke-dasharray="4 4" opacity="${cat === "far" ? 0.45 : 1}"/>`;
          }
        };
        for (const p of cv.pts) {
          const q = toSpace(p).map((x) => x * RS);
          const c = hide(q, toViewer) ? "hidden" : dot(q, VIEW) > 0 ? "far" : "near";
          if (c !== cat && run.length) {
            flush();
            run = [run[run.length - 1]];
          }
          cat = c;
          run.push(q);
        }
        flush();
      }
      for (let a = 0; a < 3; a++) {
        for (const sg of [1, -1]) pen.dotAt(toSpace([0, 1, 2].map((i) => (i === a ? sg * RS : 0))), 3, LABEL);
        const [lx, ly] = P(toSpace([0, 1, 2].map((i) => (i === a ? 1.13 * RS : 0))));
        labels += txt(lx, ly + 4, String(a + 1), { anchor: "middle" });
      }
      pen.polyline(trailBody.map((p) => toSpace(p).map((x) => x * RS)), { color: DERIVED, width: 1.8, opacity: 0.8 });
      const Lt = toSpace(Lbody()).map((x) => x * RS);
      pen.arrow([0, 0, 0], Lt, DERIVED, 2.6);
      const [tx, ty] = P(Lt);
      labels += txt(tx + 9, ty - 4, "L", { fill: DERIVED });
    } else {
      const rodEnd = HALF[k] + ROD;
      pen.polyline(trailSpace, { color: LABEL, width: 1.2, dash: "3 4", opacity: 0.7 });
      pen.polyline([e[k].map((c) => -rodEnd * c), e[k].map((c) => rodEnd * c)], { color: LABEL, width: 3 });
      pen.dotAt(e[k].map((c) => rodEnd * c), 5, LABEL);
      const Lt = [1.4, 0, 0];
      pen.arrow([0, 0, 0], Lt, DERIVED, 2.8);
      const [tx, ty] = P(Lt);
      labels += txt(tx - 4, ty - 10, "L", { fill: DERIVED, anchor: "middle" });
      // Bare aksen rotasjonen startet om, får nummer.
      const [lx, ly] = P(e[k].map((c) => (HALF[k] + ROD + 0.16) * c));
      labels += txt(lx, ly + 4, String(k + 1), { anchor: "middle" });
    }

    stage.innerHTML = svg(w, h, back + pen.svg(phoneSvg(e, P) + curveSvg) + labels);
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
