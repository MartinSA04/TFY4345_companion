/**
 * Dobbeltpendelen: to stenger etter hverandre fra en tapp, med vinklene θ₁
 * og θ₂ fra loddlinja tegnet på. En tvilling i oransje slippes samtidig med
 * en halv grads forskjell i den nederste vinkelen. Ved små utslag følger de
 * hverandre lenge; ved store skiller de lag etter få svingninger. Energien er
 * den eneste bevarte størrelsen, og den holder ikke banene på plass.
 *
 * Enheter: m₁ = m₂ = l₁ = l₂ = 1, g = 9,81, virkelig tid. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize,
 * signal }.
 */
import {
  rk4, slider, button, animate, svg, txt, line, poly, pin, rod, bob, angleFromDown, gravity,
  HINT, DERIVED, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const g = 9.81;
  const m1 = 1;
  const m2 = 1;
  const l1 = 1;
  const l2 = 1;
  const DT = 0.002;
  const TRAIL = 160;
  const DIFF = (0.5 * Math.PI) / 180;
  let deg = 120;
  let A = [];
  let Bs = [];
  let trailA = [];
  let trailB = [];

  function reset() {
    const t0 = (deg * Math.PI) / 180;
    A = [t0, 0, t0, 0]; // [θ₁, θ̇₁, θ₂, θ̇₂]
    Bs = [t0, 0, t0 + DIFF, 0];
    trailA = [];
    trailB = [];
  }
  reset();

  const f = (t, s) => {
    const [t1, w1, t2, w2] = s;
    const d = t1 - t2;
    const c = Math.cos(d);
    const sn = Math.sin(d);
    const a11 = (m1 + m2) * l1 * l1;
    const a12 = m2 * l1 * l2 * c;
    const a22 = m2 * l2 * l2;
    const r1 = -m2 * l1 * l2 * w2 * w2 * sn - (m1 + m2) * g * l1 * Math.sin(t1);
    const r2 = m2 * l1 * l2 * w1 * w1 * sn - m2 * g * l2 * Math.sin(t2);
    const det = a11 * a22 - a12 * a12;
    return [w1, (a22 * r1 - a12 * r2) / det, w2, (a11 * r2 - a12 * r1) / det];
  };

  controls.append(
    slider({
      text: "Utslag ved start",
      aria: "Startvinkelen for begge stengene",
      min: 10,
      max: 170,
      step: 5,
      value: deg,
      format: (v) => `${v}°`,
      signal,
      onInput: (v) => {
        deg = v;
        reset();
      },
    }),
    button("Start på nytt", "Slipp begge pendlene på nytt", reset, signal),
  );

  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      A = rk4(A, f, 0, h);
      Bs = rk4(Bs, f, 0, h);
      s -= h;
    }
    const tip = (st) => [l1 * Math.sin(st[0]) + l2 * Math.sin(st[2]), -(l1 * Math.cos(st[0]) + l2 * Math.cos(st[2]))];
    trailA.push(tip(A));
    trailB.push(tip(Bs));
    if (trailA.length > TRAIL) trailA.shift();
    if (trailB.length > TRAIL) trailB.shift();
  }

  const wrap = (t) => Math.atan2(Math.sin(t), Math.cos(t));

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const lp = Math.min(0.24 * w, 0.27 * h);
    const cx = w / 2;
    const cy = 0.44 * h;
    const px = (q) => cx + q[0] * lp;
    const py = (q) => cy - q[1] * lp;
    let s = "";

    const joints = (st) => {
      const x1 = cx + lp * Math.sin(st[0]);
      const y1 = cy + lp * Math.cos(st[0]);
      return [x1, y1, x1 + lp * Math.sin(st[2]), y1 + lp * Math.cos(st[2])];
    };

    // Tvillingen, uten etiketter.
    const [bx1, by1, bx2, by2] = joints(Bs);
    s += poly(trailB.map((q) => [px(q), py(q)]), `stroke="${DERIVED}" stroke-width="1.5" opacity="0.4"`);
    s += `<g opacity="0.8">`;
    s += rod(cx, cy, bx1, by1, DERIVED);
    s += rod(bx1, by1, bx2, by2, DERIVED);
    s += bob(bx1, by1, 6, DERIVED);
    s += bob(bx2, by2, 7, DERIVED);
    s += `</g>`;

    // Hovedpendelen med koordinatene.
    const [x1, y1, x2, y2] = joints(A);
    s += poly(trailA.map((q) => [px(q), py(q)]), `stroke="${MOVING}" stroke-width="1.5" opacity="0.45"`);
    s += line(cx, cy, cx, cy + 0.75 * lp, { color: HINT, width: 1, dash: "3 4" });
    s += line(x1, y1, x1, y1 + 0.75 * lp, { color: HINT, width: 1, dash: "3 4" });
    s += rod(cx, cy, x1, y1);
    s += rod(x1, y1, x2, y2);
    s += angleFromDown(cx, cy, 0.5 * lp, wrap(A[0]), "θ₁");
    s += angleFromDown(x1, y1, 0.5 * lp, wrap(A[2]), "θ₂");
    s += pin(cx, cy);
    s += bob(x1, y1, 7, MOVING, "m₁");
    s += bob(x2, y2, 8, MOVING, "m₂");
    s += gravity(22, 18);
    s += txt(w - 10, 16, "tvilling: 0,5° annen start", { fill: DERIVED, anchor: "end" });

    stage.innerHTML = svg(w, h, s);
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
