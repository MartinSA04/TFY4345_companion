/**
 * Den plane pendelen: kule i stiv stang om en tapp, tegnet med vinkelen θ fra
 * loddlinja. Glidebryteren setter farten i bunnpunktet, altså energien. Den
 * oransje linja ligger i høyden E/mg over bunnpunktet: så høyt har kula
 * energi til å nå. Der linja skjærer sirkelen, er vendepunktene; ligger linja
 * over toppen, går pendelen rundt.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, pin, rod, bob, rodLabel,
  angleFromDown, gravity, HINT, DERIVED,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.6; // simulerte sekunder per virkelig sekund
  const DT = 0.004;
  let v0 = 1.7;
  let y = [0, v0]; // [θ, θ̇]

  const f = (t, s) => [s[1], -Math.sin(s[0])];
  const reset = () => {
    y = [0, v0];
  };

  controls.append(
    slider({
      text: "Fart i bunnpunktet",
      aria: "Kulas fart i bunnpunktet",
      min: 0.2,
      max: 3,
      step: 0.1,
      value: v0,
      format: (v) => `${nb(v)} √(gl)`,
      signal,
      onInput: (v) => {
        v0 = v;
        reset();
      },
    }),
    button("Start på nytt", "Slipp pendelen på nytt fra bunnpunktet", reset, signal),
  );

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    if (y[0] > Math.PI) y[0] -= 2 * Math.PI;
    else if (y[0] < -Math.PI) y[0] += 2 * Math.PI;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th] = y;
    const L = Math.min(0.37 * h, 0.3 * w);
    const cx = w / 2;
    const cy = h / 2 + 6;
    const bx = cx + L * Math.sin(th);
    const by = cy + L * Math.cos(th);
    let g = "";

    // Sirkelen kula kan gå på, og loddlinja θ måles fra.
    g += circle(cx, cy, L, { stroke: HINT, width: 1, dash: "3 4" });
    g += line(cx, cy, cx, cy + L + 10, { color: HINT, width: 1, dash: "3 4" });

    // Høyden energien rekker til, målt fra bunnpunktet: E = ½mv₀² = mgh.
    const hE = 0.5 * v0 * v0; // i enheter av l
    const x0 = cx - L - 14;
    const x1 = cx + L + 14;
    if (hE < 2) {
      const yE = cy + L - hE * L;
      g += line(x0, yE, x1, yE, { color: DERIVED, width: 1.5, dash: "5 4" });
      const xt = L * Math.sqrt(Math.max(0, 1 - (1 - hE) ** 2));
      g += circle(cx - xt, yE, 4, { fill: DERIVED, stroke: DERIVED });
      g += circle(cx + xt, yE, 4, { fill: DERIVED, stroke: DERIVED });
      g += txt(x1, yE - 6, "E/mg", { fill: DERIVED, anchor: "end" });
      g += txt(cx + xt, yE + 17, "vendepunkt", { fill: DERIVED, anchor: "middle" });
    } else {
      const yE = cy - L - 16;
      g += line(x0, yE, x1, yE, { color: DERIVED, width: 1.5, dash: "5 4" });
      g += txt(x1, yE - 6, "E/mg over toppen: går rundt", { fill: DERIVED, anchor: "end" });
    }

    // Pendelen.
    g += rod(cx, cy, bx, by);
    g += rodLabel(cx, cy, bx, by, "l");
    g += pin(cx, cy);
    g += bob(bx, by, 9, undefined, "m");
    g += angleFromDown(cx, cy, 0.42 * L, th, "θ");
    g += gravity(cx - L - 30, cy - L + 4);

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
