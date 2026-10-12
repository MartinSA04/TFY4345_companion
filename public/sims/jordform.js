/**
 * Jorda i snitt, med et lodd på breddegraden φ. Overflaten er en flate med
 * samme potensielle energi per masse, −GM/r − ½ω²d², så den står overalt
 * vinkelrett på g_eff. Loddet henger langs g_eff = g + ω²d, summen av tyngden
 * mot sentrum og sentrifugalakselerasjonen ut fra aksen. Rotasjonen kan
 * overdrives, for med jordas egen ω er avviket bare 0,1°.
 *
 * Enheter: GM = 1 og polradius 1, så g = 1 ved polen. Jordas ω²R/g = 0,00345.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { nb, slider, svg, txt, line, circle, arrow, arc, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

const EARTH = 0.00345; // jordas ω²R/g

export default function init({ stage, controls, getSize, onResize, signal }) {
  let k = 8; // ω i jordas ω
  let phi = (45 * Math.PI) / 180;

  controls.append(
    slider({
      text: "Rotasjon",
      aria: "Vinkelfarten i antall ganger jordas vinkelfart",
      min: 0,
      max: 8.5,
      step: 0.5,
      value: k,
      format: (v) => `${nb(v)} × jordas ω`,
      signal,
      onInput: (v) => {
        k = v;
        render();
      },
    }),
    slider({
      text: "Breddegrad φ",
      aria: "Breddegraden til loddet i grader",
      min: 0,
      max: 90,
      step: 5,
      value: 45,
      format: (v) => `${v.toFixed(0)}°`,
      signal,
      onInput: (v) => {
        phi = (v * Math.PI) / 180;
        render();
      },
    }),
  );

  // Overflaten: 1/r + ½ω²r²cos²φ = 1, løst med Newtons metode fra r = 1.
  function radius(om2, p) {
    const c2 = Math.cos(p) ** 2;
    let r = 1;
    for (let i = 0; i < 20; i++) {
      const f = 1 / r + 0.5 * om2 * r * r * c2 - 1;
      const df = -1 / (r * r) + om2 * r * c2;
      r -= f / df;
    }
    return r;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const om2 = k * k * EARTH;
    const R = Math.min(0.36 * h, 0.3 * w);
    const cx = w / 2;
    const cy = h / 2 + 8;
    const P = (x, y) => [cx + R * x, cy - R * y];
    let g = "";

    // Aksen og rotasjonsretningen.
    g += line(cx, cy - 1.35 * R, cx, cy + 1.25 * R, { color: HINT, dash: "4 4" });
    g += arc(cx, cy - 1.22 * R, 16, 0.15 * Math.PI, 0.85 * Math.PI, { color: LABEL, width: 1.5 });
    g += arrow(cx - 13, cy - 1.22 * R + 6, cx - 16, cy - 1.22 * R + 1, LABEL, 1.5);
    g += txt(cx + 20, cy - 1.22 * R - 6, "ω");

    // Jorda, og kula med polradien stiplet til sammenligning.
    let d = "";
    for (let i = 0; i <= 180; i++) {
      const a = (2 * Math.PI * i) / 180;
      const r = radius(om2, a);
      const [x, y] = P(r * Math.cos(a), r * Math.sin(a));
      d += `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)} `;
    }
    g += `<path d="${d}Z" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="2.5"/>`;
    g += circle(cx, cy, R, { stroke: HINT, dash: "3 4" });
    g += circle(cx, cy, 3, { fill: FIXED, stroke: FIXED });
    g += line(cx - 1.2 * R, cy, cx + 1.2 * R, cy, { color: HINT, dash: "2 5" });

    // Loddet på overflaten ved breddegraden φ.
    const r = radius(om2, phi);
    const x = r * Math.cos(phi);
    const y = r * Math.sin(phi);
    const gx = -x / r ** 3; // tyngden mot sentrum, GM/r²
    const gy = -y / r ** 3;
    const sx = om2 * x; // sentrifugalakselerasjonen ω²d ut fra aksen
    const ex = gx + sx;
    const ey = gy;
    const el = Math.hypot(ex, ey);
    const [px, py] = P(x, y);
    // Retningen mot sentrum, stiplet, så avviket til loddlinja synes.
    g += line(px, py, cx, cy, { color: LABEL, dash: "4 4" });
    // Snora står langs −g_eff, ut fra overflaten.
    const L = 0.38 * R;
    const ux = -ex / el;
    const uy = -ey / el;
    const [bx, by] = [px + 9 * ux, py - 9 * uy];
    g += line(bx, by, bx + L * ux, by - L * uy, { color: FIXED, width: 1.5 });
    g += line(bx + L * ux - 7 * uy, by - L * uy - 7 * ux, bx + L * ux + 7 * uy, by - L * uy + 7 * ux, {
      color: FIXED,
      width: 3,
    });

    // Akselerasjonene på loddet, i samme skala.
    const A = 0.75 * R;
    const tip = (ax, ay) => [bx + A * ax, by - A * ay];
    // Etiketten ved spissen, flyttet til siden (side = ±1) så de ikke dekker hverandre.
    const lab = (ax, ay, s, fill, side = 0) => {
      const [tx, ty] = tip(ax, ay);
      const n = Math.hypot(ax, ay) || 1;
      const ox = side * (-ay / n) * 14;
      const oy = side * (-ax / n) * 14;
      return txt(tx + ox, ty + oy + 4, s, { fill, anchor: side > 0 ? "start" : side < 0 ? "end" : "middle" });
    };
    g += arrow(bx, by, ...tip(gx, gy), DERIVED, 2) + lab(gx, gy, "g", DERIVED, -1);
    if (sx * A > 7) g += arrow(bx, by, ...tip(sx, 0), DERIVED, 2) + lab(sx, 0, "ω²d", DERIVED, 1);
    g += arrow(bx, by, ...tip(ex, ey), MOVING, 2.5) + lab(ex, ey, "g_eff", MOVING, 1);
    g += circle(bx, by, 6, { fill: MOVING, stroke: MOVING });

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
}
