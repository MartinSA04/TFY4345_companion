/**
 * Kapitzas pendel: opphenget sitter i en loddrett føring og drives opp og
 * ned, y_p = A cos Ωt, av en motor. θ er vinkelen fra loddlinja nedover, så
 * θ = π er opp ned. Pendelen slippes nesten opp ned; over Ω = √(2gl)/A blir
 * den stående der og vippe. Litt demping er lagt til så bevegelsen faller
 * til ro.
 *
 * Enheter: m = l = 1, g = 9,81, A = 0,08, virkelig tid. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize,
 * signal }.
 */
import {
  rk4, slider, button, animate, svg, txt, line, circle, arrow, rod, bob, rodLabel, angleFromDown, gravity,
  FIXED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const g = 9.81;
  const l = 1;
  const A = 0.08;
  const GAMMA = 0.35;
  const DT = 1 / 4000;
  let Om = 70;
  let y = [Math.PI - 0.2, 0]; // [θ, θ̇]
  let t = 0;

  const yp = (tt) => A * Math.cos(Om * tt);
  const ypdd = (tt) => -A * Om * Om * Math.cos(Om * tt);
  const f = (tt, s) => [s[1], (-(g + ypdd(tt)) / l) * Math.sin(s[0]) - GAMMA * s[1]];

  function reset() {
    y = [Math.PI - 0.2, 0];
    t = 0;
  }

  controls.append(
    slider({
      text: "Opphengets frekvens Ω",
      aria: "Frekvensen opphenget svinger med",
      min: 0,
      max: 90,
      step: 2,
      value: Om,
      format: (v) => `${v} rad/s`,
      signal,
      onInput: (v) => {
        Om = v;
      },
    }),
    button("Slipp fra toppen", "Slipp pendelen på nytt nesten opp ned", reset, signal),
  );

  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, t, h);
      t += h;
      s -= h;
    }
    y[0] = ((y[0] % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  }

  const wrap = (q) => Math.atan2(Math.sin(q), Math.cos(q));

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th] = y;
    const lp = Math.min(0.36 * h, 0.3 * w);
    const cx = w / 2;
    const cy = h / 2 + 4;
    const pivY = cy - yp(t) * lp;
    const bx = cx + lp * Math.sin(th);
    const by = pivY + lp * Math.cos(th);
    let s = "";

    // Sirkelen kula kan gå på (om det midlere opphenget) og loddlinja.
    s += circle(cx, cy, lp, { stroke: HINT, width: 1, dash: "3 4" });
    s += line(cx, pivY, cx, pivY + 0.6 * lp, { color: HINT, width: 1, dash: "3 4" });

    // Føringa opphenget går i, med slaget 2A markert.
    s += line(cx, cy - 0.3 * lp, cx, cy + 0.3 * lp, { color: FIXED, width: 4 });
    const xa = cx - 0.16 * lp;
    s += arrow(xa, cy, xa, cy - A * lp - 3, LABEL, 1.2);
    s += arrow(xa, cy, xa, cy + A * lp + 3, LABEL, 1.2);
    s += txt(xa - 6, cy + 4, "2A", { anchor: "end" });
    s += txt(cx + 0.1 * lp, cy + 0.3 * lp + 16, "y_p = A cos Ωt");

    // Pendelen fra det svingende opphenget.
    s += rod(cx, pivY, bx, by);
    s += rodLabel(cx, pivY, bx, by, "l");
    s += `<rect x="${(cx - 6).toFixed(1)}" y="${(pivY - 6).toFixed(1)}" width="12" height="12" rx="2" style="fill:${FIXED}"/>`;
    s += angleFromDown(cx, pivY, 0.32 * lp, wrap(th), "θ");
    s += bob(bx, by, 9, undefined, "m");
    s += gravity(22, 18);

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
