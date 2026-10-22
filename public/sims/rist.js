/**
 * Rist i fjæra: en kloss henger i en fjær fra et håndtak som beveges opp og ned
 * med vinkelfrekvensen Ω. En penn på klossen skriver utslaget x på papiret som
 * trekkes forbi mot venstre, og håndtakets utslag tegnes tynt på den samme
 * linja, så du ser om klossen følger hånda, ligger en kvart periode etter eller
 * går motsatt vei.
 *
 * Modellen: ẍ = −ω₀²(x − x_h) − 2αẋ med x_h = a sin φ, dφ/dt = Ω, løst med
 * RK4 fra ro. Fjærkraften fra hånda, k·x_h, er den ytre kraften J(t). Å endre
 * en glidebryter beholder tilstanden, så du ser en ny innsvingning. Én periode
 * uten friksjon er 1,6 s.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, slider, button, nb, rk4, svg, txt, line, circle, poly, FIXED, MOVING, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const T0 = 1.6;
  const W0 = (2 * Math.PI) / T0;
  const SPAN = 4 * T0;
  const AH = 14; // håndas utslag, px

  let ratio = 0.4; // Ω/ω₀
  let alpha = 0.1; // α/ω₀
  let t = 0;
  let phi = 0;
  let y = [0, 0]; // x, ẋ i enheter av håndas utslag
  let hist = []; // {t, xh, x}

  const xh = () => Math.sin(phi);
  // Inne i et RK4-steg følger håndas fase tida fra stegets start t.
  const f = (tt, s) => [s[1], -W0 * W0 * (s[0] - Math.sin(phi + ratio * W0 * (tt - t))) - 2 * alpha * W0 * s[1]];

  function restart() {
    t = 0;
    phi = 0;
    y = [0, 0];
    hist = [{ t: 0, xh: 0, x: 0 }];
    render();
    anim.start();
  }

  const sOmega = slider({
    text: "Takt Ω/ω₀",
    aria: "Håndas vinkelfrekvens, omega stor delt på omega null",
    min: 0.2,
    max: 2.5,
    step: 0.05,
    value: ratio,
    format: (v) => nb(v, 2),
    signal,
    onInput: (v) => {
      ratio = v;
      anim.start();
    },
  });
  const sAlpha = slider({
    text: "Demping α/ω₀",
    aria: "Dempingen, alfa delt på omega null",
    min: 0.1,
    max: 0.3,
    step: 0.01,
    value: alpha,
    format: (v) => nb(v, 2),
    signal,
    onInput: (v) => {
      alpha = v;
      anim.start();
    },
  });
  controls.append(sOmega, sAlpha, button("Start på nytt", "Klossen i ro og hånda i midtstilling", restart, signal));

  function spring(xc, y1, y2, coils = 9, half = 8) {
    const pts = [[xc, y1]];
    const a = y1 + 6;
    const b = y2 - 6;
    const n = coils * 2;
    for (let i = 1; i < n; i++) pts.push([xc + (i % 2 ? half : -half), a + ((b - a) * i) / n]);
    pts.push([xc, b], [xc, y2]);
    return poly(pts, `stroke="${FIXED}" stroke-width="1.6" stroke-linejoin="round"`);
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const yHand = 26; // håndtakets midtstilling
    const y0 = yHand + 150; // klossens likevekt
    const xs = w - 26;
    const bw = 28;
    const bh = 24;
    const xp = xs - bw / 2 - 12;
    const xl = 6;
    const pxs = (xp - xl) / SPAN;
    const top = 8;
    let g = "";

    g += `<rect x="${xl}" y="${top + 12}" width="${(xp - xl).toFixed(1)}" height="${(h - top - 16).toFixed(1)}" style="fill:var(--bg-elevated)" stroke="${HINT}" stroke-width="1"/>`;
    g += `<clipPath id="rist-papir"><rect x="${xl}" y="${top + 12}" width="${(xp - xl).toFixed(1)}" height="${(h - top - 16).toFixed(1)}"/></clipPath>`;
    g += line(xl, y0, xp, y0, { color: HINT, width: 1, dash: "4 4" });

    const X = (s) => xp - (t - s) * pxs;
    const handPts = hist.map((p) => [X(p.t), y0 - p.xh * AH]);
    const bodyPts = hist.map((p) => [X(p.t), y0 - p.x * AH]);
    let clip = poly(handPts, `stroke="${LABEL}" stroke-width="1.4"`);
    clip += poly(bodyPts, `stroke="${MOVING}" stroke-width="2.4" stroke-linejoin="round"`);
    g += `<g clip-path="url(#rist-papir)">${clip}</g>`;

    // Forklaring øverst på papiret.
    g += line(xl + 8, top + 26, xl + 28, top + 26, { color: LABEL, width: 1.4 });
    g += txt(xl + 33, top + 30, "hånda");
    g += line(xl + 88, top + 26, xl + 108, top + 26, { color: MOVING, width: 2.4 });
    g += txt(xl + 113, top + 30, "klossen");

    // Håndtaket, fjæra, klossen og pennen.
    const yh = yHand - xh() * AH;
    const yb = y0 - y[0] * AH;
    g += `<rect x="${(xs - 16).toFixed(1)}" y="${(yh - 7).toFixed(1)}" width="32" height="14" rx="7" style="fill:${LABEL}"/>`;
    g += spring(xs, yh + 7, yb - bh / 2);
    g += `<rect x="${(xs - bw / 2).toFixed(1)}" y="${(yb - bh / 2).toFixed(1)}" width="${bw}" height="${bh}" rx="3" style="fill:${MOVING}"/>`;
    g += line(xs - bw / 2, yb, xp, yb, { color: MOVING, width: 2 });
    g += circle(xp, yb, 2.6, { fill: MOVING, stroke: MOVING, width: 1 });
    g += txt(xp - 4, h - 8, "nå", { anchor: "end" });

    stage.innerHTML = svg(w, h, g);
  }

  const anim = animate({
    stage,
    signal,
    onFrame: (dt) => {
      const n = Math.max(1, Math.ceil(dt / (1 / 240)));
      const hdt = dt / n;
      for (let i = 0; i < n; i++) {
        y = rk4(y, f, t, hdt);
        phi += ratio * W0 * hdt;
        t += hdt;
      }
      hist.push({ t, xh: xh(), x: y[0] });
      while (hist.length > 2 && hist[1].t < t - SPAN) hist.shift();
      render();
    },
  });
  onResize(render);
  restart();
}
