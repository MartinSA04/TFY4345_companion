/**
 * Ei kule som glir uten friksjon i ei grunn skål, sett ovenfra. Skåla er så
 * grunn at kula beveger seg nesten bare vannrett, i potensialet
 * V = ½m(ω_x²x² + ω_y²y²). De tynne ellipsene er høydekoter. Glidebryteren
 * gjør skåla oval: forholdet lengde : bredde er ω_y/ω_x. Den oransje buen
 * rundt midten er dreieimpulsen p_φ = m(xẏ − yẋ) om midten: buen er lengre jo
 * større den er, og pila peker den veien kula går rundt. I den runde skåla er
 * p_φ bevart; i den ovale går banen over i en strek og snur.
 *
 * Enheter: skålas halve lengde er 1, ω_x = 2 rad/s, sanntid. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, poly, circle, DERIVED, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const WX = 2;
  const DT = 0.004;
  const TRAIL = 4.5; // sekunder med spor
  const S0 = [0.78, 0, 0, 0.62]; // [x, y, ẋ, ẏ]
  const P0 = S0[0] * S0[3] - S0[1] * S0[2]; // p_φ/m ved start
  let ratio = 1;
  let s = S0.slice();
  let trail = [];
  let t = 0;

  const f = (_, u) => {
    const wy = WX * ratio;
    return [u[2], u[3], -WX * WX * u[0], -wy * wy * u[1]];
  };
  const reset = () => {
    s = S0.slice();
    trail = [];
    t = 0;
  };

  controls.append(
    slider({
      text: "Lengde : bredde",
      aria: "Forholdet mellom skålas lengde og bredde",
      min: 1,
      max: 1.3,
      step: 0.01,
      value: ratio,
      format: (v) => `${nb(v, 2)} : 1`,
      signal,
      onInput: (v) => {
        ratio = v;
        reset();
      },
    }),
    button("Slipp på nytt", "Slipp kula på nytt fra startpunktet", reset, signal),
  );

  function step(dt) {
    let r = dt;
    while (r > 0) {
      const h = Math.min(DT, r);
      s = rk4(s, f, 0, h);
      r -= h;
    }
    t += dt;
    trail.push([t, s[0], s[1]]);
    while (trail.length && trail[0][0] < t - TRAIL) trail.shift();
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const R = Math.min(w / 2 - 14, (h - 20) / 2); // skålas halve lengde i piksler
    const cx = w / 2;
    const cy = h / 2;
    const X = (x) => cx + R * x;
    const Y = (y) => cy - R * y;
    let g = "";

    // Høydekotene: V = konstant, ellipser med halvakser (a, a/ratio). Den ytterste er kanten.
    for (const a of [0.25, 0.5, 0.75, 1]) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const u = (2 * Math.PI * i) / 96;
        pts.push([X(a * Math.cos(u)), Y((a / ratio) * Math.sin(u))]);
      }
      g += poly(pts, a === 1 ? `stroke="${FIXED}" stroke-width="2"` : `stroke="${HINT}" stroke-width="1"`);
    }

    // Sporet og kula.
    g += poly(trail.map((p) => [X(p[1]), Y(p[2])]), `stroke="${MOVING}" stroke-width="1.5" opacity="0.4"`);

    // Dreieimpulsen om midten som en bue med pil: lengden følger |p_φ|, retningen fortegnet.
    const pphi = s[0] * s[3] - s[1] * s[2];
    const frac = pphi / P0; // 1 ved start
    const rr = Math.max(14, 0.17 * R);
    const sweep = 1.5 * Math.PI * frac; // 270° ved start
    if (Math.abs(sweep) > 0.12) {
      const a0 = Math.PI / 2; // start rett over midten (matematisk vinkel)
      const n = Math.max(6, Math.ceil(Math.abs(sweep) * 12));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const u = a0 + (sweep * i) / n;
        pts.push([cx + rr * Math.cos(u), cy - rr * Math.sin(u)]);
      }
      g += poly(pts.slice(0, -1), `stroke="${DERIVED}" stroke-width="2.4"`);
      // Pilspiss langs tangenten i enden.
      const ue = a0 + sweep;
      const [ex, ey] = [cx + rr * Math.cos(ue), cy - rr * Math.sin(ue)];
      const sg = Math.sign(sweep);
      const tx = -Math.sin(ue) * sg;
      const ty = -Math.cos(ue) * sg;
      const bx = ex - tx * 8;
      const by = ey - ty * 8;
      g += `<path d="M ${ex.toFixed(1)} ${ey.toFixed(1)} L ${(bx - ty * 4.5).toFixed(1)} ${(by + tx * 4.5).toFixed(1)} L ${(bx + ty * 4.5).toFixed(1)} ${(by - tx * 4.5).toFixed(1)} Z" style="fill:${DERIVED}"/>`;
    }
    g += txt(cx + rr + 6, cy - rr - 2, "p<tspan baseline-shift=\"sub\" font-size=\"9\">φ</tspan>", { fill: DERIVED });
    g += circle(cx, cy, 2.5, { fill: FIXED, stroke: FIXED, width: 1 });

    g += circle(X(s[0]), Y(s[1]), 7, { fill: MOVING, stroke: MOVING, width: 1 });

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
