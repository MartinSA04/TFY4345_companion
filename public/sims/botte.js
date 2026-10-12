/**
 * Ei bøtte med vann som roterer om sin egen akse, sett fra siden i bøttas
 * system. Der ligger vannet i ro, og flaten står vinkelrett på summen av
 * tyngden og sentrifugalkraften: z = z₀ + ω²d²/(2g). Vannmengden er fast, så
 * z₀ synker når kantene stiger.
 *
 * Enheter: bøttas radius 10 cm, g = 9,81 m/s². Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import { nb, slider, svg, txt, line, circle, arrow, arc, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

const A = 0.1; // bøttas radius, m
const H0 = 0.055; // vanndybden i ro, m
const WALL = 0.13; // bøttas høyde, m
const G = 9.81;

export default function init({ stage, controls, getSize, onResize, signal }) {
  let om = 9; // bøttas vinkelfart, rad/s

  controls.append(
    slider({
      text: "Vinkelfart ω",
      aria: "Bøttas vinkelfart i radianer per sekund",
      min: 0,
      max: 13,
      step: 0.5,
      value: om,
      format: (v) => `${nb(v)} rad/s`,
      signal,
      onInput: (v) => {
        om = v;
        render();
      },
    }),
  );

  const surf = (d) => H0 - (om * om * A * A) / (4 * G) + (om * om * d * d) / (2 * G);

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const S = Math.min((0.62 * w) / (2 * A), (0.78 * h) / WALL); // piksler per meter
    const cx = w / 2;
    const by = h - 0.1 * h; // bunnen
    const P = (x, z) => [cx + S * x, by - S * z];
    let g = "";

    // Vannet: flaten som kurve, fylt ned til bunnen.
    let d = "";
    for (let i = 0; i <= 60; i++) {
      const x = -A + (2 * A * i) / 60;
      const [sx, sy] = P(x, surf(Math.abs(x)));
      d += `${i ? "L" : "M"} ${sx.toFixed(1)} ${sy.toFixed(1)} `;
    }
    const [rx, ry] = P(A, 0);
    const [lx] = P(-A, 0);
    g += `<path d="${d}L ${rx.toFixed(1)} ${ry.toFixed(1)} L ${lx.toFixed(1)} ${ry.toFixed(1)} Z" style="fill:var(--accent-soft)"/>`;
    g += `<path d="${d}" fill="none" stroke="${MOVING}" stroke-width="2"/>`;


    // Bøtta og aksen.
    const [tl, tt] = P(-A, WALL);
    const [tr] = P(A, WALL);
    g += line(tl, tt, lx, ry, { color: FIXED, width: 3 });
    g += line(tr, tt, rx, ry, { color: FIXED, width: 3 });
    g += line(lx - 1.5, ry, rx + 1.5, ry, { color: FIXED, width: 3 });
    g += line(cx, tt - 22, cx, ry + 10, { color: HINT, dash: "4 4" });
    g += arc(cx, tt - 12, 14, 0.15 * Math.PI, 0.85 * Math.PI, { color: LABEL, width: 1.5 });
    g += arrow(cx - 11, tt - 7, cx - 14, tt - 11, LABEL, 1.5);
    g += txt(cx + 18, tt - 14, "ω");

    // Kreftene per masse på et vannelement i flaten, i bøttas system.
    const dp = 0.6 * A;
    const [qx, qy] = P(dp, surf(dp));
    const K = 34 / G; // piksler per m/s²
    const c = om * om * dp;
    g += arrow(qx, qy, qx, qy + K * G, DERIVED, 2) + txt(qx - 6, qy + K * G + 2, "g", { fill: DERIVED, anchor: "end" });
    if (c * K > 7) {
      g += arrow(qx, qy, qx + K * c, qy, DERIVED, 2) + txt(qx + K * c + 6, qy + 4, "ω²d", { fill: DERIVED });
    }
    // Summen står vinkelrett på flaten.
    const n = Math.hypot(c, G);
    if (c * K > 7) {
      g += arrow(qx, qy, qx + K * c, qy + K * G, MOVING, 2.5);
      g += txt(qx + K * c + 6, qy + K * G + 2, "sum", { fill: MOVING });
      const tx = (G / n) * 12;
      const ty = (c / n) * 12;
      g += line(qx - tx, qy + ty, qx + tx, qy - ty, { color: LABEL, width: 1 });
    }
    g += circle(qx, qy, 4, { fill: MOVING, stroke: MOVING });

    g += txt(10, 18, "sett fra bøtta (K′)");

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
}
