/**
 * Store utslag: to pendler med samme lengde, 1,0 m, henger fra samme tapp og
 * slippes samtidig fra ro i samme vinkel θ₀. Den heltrukne følger den eksakte
 * ligningen θ̈ = −(g/l) sin θ. Den stiplede følger den lineariserte,
 * θ = θ₀ cos ω₀t med ω₀ = √(g/l), altså perioden for små utslag. De stiplede
 * strålene merker ±θ₀, der begge snur. Tallet øverst er hvor mange hele
 * svingninger den stiplede har gjort.
 *
 * Tida går i virkelig tempo. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, slider, button, animate, svg, txt, line, circle, pin, angleFromDown, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const G = 9.81;
  const L = 1.0;
  const W0 = Math.sqrt(G / L);
  const DT = 0.002;
  let deg = 90;
  let y; // [θ, θ̇] for den eksakte
  let t;
  let acc = 0;

  function reset() {
    y = [(deg * Math.PI) / 180, 0];
    t = 0;
    acc = 0;
  }
  reset();

  const f = (_, u) => [u[1], -W0 * W0 * Math.sin(u[0])];

  function step(dt) {
    acc += dt;
    while (acc >= DT) {
      y = rk4(y, f, t, DT);
      t += DT;
      acc -= DT;
    }
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const th0 = (deg * Math.PI) / 180;
    // Plass til pendelen i alle vinkler: over tappen når θ₀ er over 90°.
    const up = th0 > Math.PI / 2 ? -Math.cos(th0) : 0;
    const len = Math.min((w / 2 - 22) / Math.max(Math.sin(Math.min(th0, Math.PI / 2)), 0.5), (h - 56) / (1 + up));
    const cx = w / 2;
    // Det pendelen kan nå, fra cy − up·len til cy + len, midt i scenen, under telleren.
    const cy = 28 + (h - 28 - (1 + up) * len) / 2 + up * len;
    const P = (th) => [cx + len * Math.sin(th), cy + len * Math.cos(th)];
    let g = "";

    // Vendepunktene ±θ₀.
    for (const s of [-1, 1]) {
      const [x, yy] = P(s * th0);
      g += line(cx, cy, x, yy, { color: HINT, dash: "3 5", width: 1 });
    }
    g += line(cx, cy, cx, cy + len + 12, { color: HINT, width: 1 });
    // Den lineariserte, stiplet.
    const thl = th0 * Math.cos(W0 * t);
    const [lx, ly] = P(thl);
    g += line(cx, cy, lx, ly, { color: FIXED, dash: "5 4", width: 1.4 });
    g += circle(lx, ly, 9, { fill: "none", stroke: FIXED, width: 1.4, dash: "3 3" });
    // Den eksakte.
    const [ex, ey] = P(y[0]);
    g += line(cx, cy, ex, ey, { color: LABEL, width: 2.5 });
    g += circle(ex, ey, 9, { fill: MOVING, stroke: "none" });
    g += pin(cx, cy);
    g += angleFromDown(cx, cy, 34, th0 > 0.15 ? th0 : 0, "θ₀");

    const n = Math.floor((W0 * t) / (2 * Math.PI));
    g += txt(10, 18, `${n} ${n === 1 ? "svingning" : "svingninger"}`, { size: 12 });
    stage.innerHTML = svg(w, h, g);
  }

  controls.append(
    slider({
      text: "Utslag θ₀",
      aria: "Vinkelen pendlene slippes fra, i grader",
      min: 5,
      max: 170,
      step: 5,
      value: deg,
      format: (v) => `${v}°`,
      signal,
      onInput: (v) => {
        deg = v;
        reset();
        render();
      },
    }),
    button("Slipp på nytt", "Slipp begge pendlene på nytt fra utslaget", () => {
      reset();
      render();
    }, signal),
  );

  animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  onResize(render);
  render();
}
