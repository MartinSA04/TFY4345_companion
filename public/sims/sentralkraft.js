/**
 * Sentralkraft: et legeme med redusert masse μ i potensialet V = −k/r om et
 * fast kraftsentrum O. Polarkoordinatene r og φ er tegnet på. Sektorene
 * fylles i like lange tidsrom og er like store (Keplers andre lov), fordi
 * dreieimpulsen p_φ = μr²φ̇ er bevart. Glidebryteren setter farten i
 * startpunktet i forhold til farten som gir sirkelbane.
 *
 * Enheter: μ = k = 1, r₀ = 1. Én omløpstid vises på omtrent åtte sekunder.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { nb, rk4, slider, button, animate, svg, txt, line, arc, bob, rodLabel, DERIVED, MOVING, LABEL, FIXED } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const DT = 0.001;
  const SECTORS = 12; // per omløp
  const KEEP = 2; // ferdige sektorer som vises bak legemet
  const ORBIT_SECONDS = 8;
  let v0 = 1.15;
  let y = []; // [x, y, ẋ, ẏ]
  let t = 0;
  let a = 1; // store halvakse
  let e = 0; // eksentrisitet
  let T = 1; // omløpstid
  let sectors = []; // ferdige sektorer, hver en liste av punkter
  let current = []; // sektoren som fylles nå
  let k = 0; // antall sektorer startet

  function reset() {
    y = [1, 0, 0, v0];
    t = 0;
    a = 1 / (2 - v0 * v0);
    e = Math.abs(v0 * v0 - 1);
    T = 2 * Math.PI * Math.pow(a, 1.5);
    sectors = [];
    current = [[1, 0]];
    k = 0;
  }
  reset();

  const f = (tt, s) => {
    const r = Math.hypot(s[0], s[1]);
    const r3 = r * r * r;
    return [s[2], s[3], -s[0] / r3, -s[1] / r3];
  };

  controls.append(
    slider({
      text: "Startfart (sirkelbane = 1)",
      aria: "Farten i startpunktet i forhold til sirkelbanens fart",
      min: 0.5,
      max: 1.3,
      step: 0.05,
      value: v0,
      format: (v) => nb(v, 2),
      signal,
      onInput: (v) => {
        v0 = v;
        reset();
      },
    }),
    button("Start på nytt", "Start banen på nytt fra startpunktet", reset, signal),
  );

  function step(dt) {
    let s = (dt * T) / ORBIT_SECONDS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      t += h;
      s -= h;
      const boundary = ((k + 1) * T) / SECTORS;
      if (t >= boundary) {
        current.push([y[0], y[1]]);
        sectors.push(current);
        if (sectors.length > KEEP) sectors.shift();
        current = [[y[0], y[1]]];
        k += 1;
      }
    }
    current.push([y[0], y[1]]);
    if (current.length > 400) {
      // tynn ut, sektoren trenger ikke hvert eneste punkt
      current = current.filter((_, i) => i % 2 === 0 || i === current.length - 1);
    }
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    // Ellipsen: brennpunkt i origo, startpunktet i (1, 0), den andre apsiden i
    // x = −(2a − 1), halv lilleakse b.
    const b = a * Math.sqrt(Math.max(0, 1 - e * e));
    const xmin = -(2 * a - 1);
    const pad = 18;
    const span = 1 - xmin + 0.35; // plass til referanseretningen til høyre
    const sc = Math.min((w - 2 * pad) / span, (h - 2 * pad) / (2 * b + 0.2));
    const cx = pad + (0 - xmin) * sc + (w - 2 * pad - span * sc) / 2;
    const cy = h / 2;
    const px = (p) => cx + p[0] * sc;
    const py = (p) => cy - p[1] * sc;

    let g = "";
    // Hele banen, stiplet.
    const cxe = (xmin + 1) / 2;
    g += `<ellipse cx="${(cx + cxe * sc).toFixed(1)}" cy="${cy.toFixed(1)}" rx="${(a * sc).toFixed(1)}" ry="${(b * sc).toFixed(1)}" fill="none" stroke="${FIXED}" stroke-width="1" stroke-dasharray="4 4"/>`;
    // Sektorene.
    const drawSector = (pts, idx) => {
      if (pts.length < 2) return;
      let d = `M ${cx.toFixed(1)} ${cy.toFixed(1)} `;
      for (const p of pts) d += `L ${px(p).toFixed(1)} ${py(p).toFixed(1)} `;
      const col = idx % 2 === 0 ? MOVING : DERIVED;
      g += `<path d="${d} Z" style="fill:${col};opacity:0.16" stroke="${col}" stroke-width="0.8"/>`;
    };
    const base = k - sectors.length;
    sectors.forEach((s, i) => drawSector(s, base + i));
    drawSector(current, k);

    // Referanseretningen φ måles fra, radiusvektoren og vinkelen.
    const bx = px(y);
    const by = py(y);
    g += line(cx, cy, cx + 1.3 * sc, cy, { color: LABEL, width: 1 });
    const phi = Math.atan2(y[1], y[0]);
    const phm = phi < 0 ? phi + 2 * Math.PI : phi;
    if (phm > 0.2 && phm < 2 * Math.PI - 0.2) {
      const ra = 0.22 * sc;
      g += arc(cx, cy, ra, 0, -phm);
      const am = -phm / 2;
      g += txt(cx + (ra + 11) * Math.cos(am), cy + (ra + 11) * Math.sin(am) + 4, "φ", { anchor: "middle" });
    }
    g += line(cx, cy, bx, by, { color: LABEL, width: 1.2 });
    g += rodLabel(cx, cy, bx, by, "r");

    // Kraftsentrum og legemet.
    g += bob(cx, cy, 8, DERIVED);
    g += txt(cx - 9, cy + 14, "O", { anchor: "end" });
    g += bob(bx, by, 6, MOVING, "μ");
    g += txt(10, 16, "like tidsrom, like arealer");

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
