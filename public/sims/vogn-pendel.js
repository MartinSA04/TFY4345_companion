/**
 * Pendel under ei vogn som ruller fritt langs en vannrett skinne. x er
 * vognas posisjon målt fra merket på skinna, θ pendelens vinkel fra loddlinja.
 * Ingen ytre kraft virker vannrett, så den totale vannrette impulsen er
 * bevart: slippes systemet fra ro, står massesenteret (oransje) stille mens
 * vogna og kula bytter side. «Dytt» gir vogna fart; da glir massesenteret
 * jevnt mens vogna går rykkvis.
 *
 * Enheter: m = l = 1, g = 9,81, virkelig tid. Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, arrow, rod, bob, rodLabel, angleFromDown,
  gravity, FIXED, HINT, DERIVED, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const g = 9.81;
  const l = 1;
  const m = 1;
  const DT = 0.004;
  const TH0 = Math.PI / 3;
  let M = 2;
  let y = []; // [x, ẋ, θ, θ̇]

  function reset() {
    // Startpunktet velges så massesenteret ligger i x = 0.
    y = [(-m * l * Math.sin(TH0)) / (M + m), 0, TH0, 0];
  }
  reset();

  const f = (t, s) => {
    const [, vx, th, om] = s;
    const sn = Math.sin(th);
    const cs = Math.cos(th);
    const den = M + m * sn * sn;
    const ax = (m * sn * (l * om * om + g * cs)) / den;
    const al = (-sn * ((M + m) * g + m * l * om * om * cs)) / (l * den);
    return [vx, ax, om, al];
  };

  controls.append(
    slider({
      text: "Vognas masse M/m",
      aria: "Vognas masse i forhold til kulas",
      min: 0.5,
      max: 8,
      step: 0.5,
      value: M,
      format: (v) => nb(v),
      signal,
      onInput: (v) => {
        M = v;
        reset();
      },
    }),
    button(
      "Dytt",
      "Gi vogna et dytt så systemet får vannrett impuls",
      () => {
        y[1] += 0.8;
      },
      signal,
    ),
    button("Nullstill", "Slipp systemet på nytt fra ro", reset, signal),
  );

  function step(dt) {
    let s = dt;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [x, , th] = y;
    const lp = Math.min(0.5 * h, 0.36 * w); // l i px
    const xcm = (M * x + m * (x + l * Math.sin(th))) / (M + m);
    // Hele scenen flyttes ei skjermbredde når massesenteret går ut av bildet,
    // så skinna og merket følger med.
    const W = w / lp;
    const off = ((((xcm + W / 2) % W) + W) % W) - W / 2 - xcm;
    const px = (u) => w / 2 + (u + off) * lp;
    const yr = 0.2 * h; // skinna
    const cw = 0.5 * lp * Math.cbrt(M);
    const ch = 0.22 * lp;
    const xc = px(x);
    const ypiv = yr + 10 + ch;
    const xb = xc + lp * Math.sin(th);
    const yb = ypiv + lp * Math.cos(th);
    let s = "";

    // Skinna med merker for hver l, og nullpunktet x måles fra.
    s += line(0, yr, w, yr, { width: 2 });
    for (let k = Math.ceil(-off - W / 2); k <= -off + W / 2; k++) {
      const xk = px(k);
      s += line(xk, yr, xk, yr - (k === 0 ? 9 : 4), { width: k === 0 ? 2 : 1 });
    }
    const x0 = px(0);
    if (x0 > 8 && x0 < w - 8) {
      s += txt(x0 + 7, yr - 8, "0");
      if (Math.abs(xc - x0) > 26) {
        const ym = yr - 30;
        s += line(x0, ym, xc, ym, { color: LABEL, width: 1 });
        s += arrow(xc - Math.sign(xc - x0) * 10, ym, xc, ym, LABEL, 1);
        s += txt((x0 + xc) / 2, ym - 5, "x", { anchor: "middle" });
      }
    }

    // Massesenteret.
    const xm = px(xcm);
    s += line(xm, yr + 4, xm, h - 22, { color: DERIVED, width: 1.2, dash: "4 4" });
    s += `<path d="M ${xm.toFixed(1)} ${(yr + 3).toFixed(1)} l -6 -9 h 12 Z" style="fill:${DERIVED}"/>`;
    const lx = Math.max(6, Math.min(w - 6, xm));
    s += txt(lx, h - 8, "massesenter", { fill: DERIVED, anchor: lx < 50 ? "start" : lx > w - 50 ? "end" : "middle" });

    // Vogna: hjul på skinna, kasse under, pendelen hengt i kassa.
    s += circle(xc - cw / 2 + 7, yr + 5, 5, { fill: FIXED, stroke: FIXED });
    s += circle(xc + cw / 2 - 7, yr + 5, 5, { fill: FIXED, stroke: FIXED });
    s += `<rect x="${(xc - cw / 2).toFixed(1)}" y="${(yr + 10).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" rx="3" style="fill:${FIXED}"/>`;
    s += txt(xc, yr + 10 + ch / 2 + 4, "M", { fill: "var(--bg-elevated)", anchor: "middle" });

    s += line(xc, ypiv, xc, ypiv + 1.15 * lp, { color: HINT, width: 1, dash: "3 4" });
    s += rod(xc, ypiv, xb, yb);
    s += rodLabel(xc, ypiv, xb, yb, "l");
    s += `<circle cx="${xc.toFixed(1)}" cy="${ypiv.toFixed(1)}" r="3" style="fill:${FIXED}"/>`;
    s += bob(xb, yb, 9, undefined, "m");
    s += angleFromDown(xc, ypiv, 0.45 * lp, th, "θ");
    s += gravity(w - 26, yr + 22);

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
