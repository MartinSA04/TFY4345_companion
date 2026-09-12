/**
 * Ladd partikkel i et homogent magnetfelt ut av skjermen (prikkene i ring).
 * Partikkelen har fartspil v og kraftpil qv×B inn mot sentrum, og
 * koordinatene x, y er de kartesiske aksene nede til venstre. Den mekaniske
 * impulsen snurrer rundt; de bevarte størrelsene forskyvningssymmetrien gir,
 * er sentrum (X, Y) i sirkelbanen. «Dytt» endrer farten: sentrum hopper til
 * et nytt punkt og står så stille igjen.
 *
 * Enheter: m = q = 1, ω = B. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import { nb, slider, button, animate, svg, txt, arrow, poly, circle, cross, bob, HINT, DERIVED, LABEL, MOVING } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TRAIL = 220;
  const VMAX = 1.45;
  const BMIN = 0.8;
  let B = 1.2;
  let p = [1 / B, 0]; // posisjon (fysiske koordinater, y opp)
  let v = [0, -1]; // fart, sirkelen går med klokka for q > 0
  let trail = [];

  const centre = () => [p[0] + v[1] / B, p[1] - v[0] / B];

  function rot(u, ang) {
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    return [u[0] * c - u[1] * s, u[0] * s + u[1] * c];
  }

  function step(dt) {
    const C = centre();
    const rel = rot([p[0] - C[0], p[1] - C[1]], -B * dt);
    p = [C[0] + rel[0], C[1] + rel[1]];
    v = rot(v, -B * dt);
    trail.push(p);
    if (trail.length > TRAIL) trail.shift();
  }

  // Skalaen er fast, så den største mulige sirkelen får plass.
  function scale(w, h) {
    return (Math.min(w, h) / 2 - 18) / (VMAX / BMIN);
  }

  function kick() {
    const { w, h } = getSize();
    const sc = scale(w, h);
    const R = VMAX / B;
    const bx = Math.max(0, w / (2 * sc) - R - 0.1);
    const by = Math.max(0, h / (2 * sc) - R - 0.1);
    const target = [(Math.random() * 2 - 1) * bx, (Math.random() * 2 - 1) * by];
    const C = centre();
    const d = [target[0] - C[0], target[1] - C[1]];
    const len = Math.hypot(d[0], d[1]) || 1;
    const dv = 0.45;
    // Sentrum flytter seg vinkelrett på dyttet, så dyttet legges vinkelrett på
    // retningen mot målet.
    v = [v[0] - (dv * d[1]) / len, v[1] + (dv * d[0]) / len];
    const sp = Math.hypot(v[0], v[1]);
    if (sp > VMAX) {
      v = [(v[0] * VMAX) / sp, (v[1] * VMAX) / sp];
    }
    trail = [];
  }

  controls.append(
    slider({
      text: "Feltstyrke B",
      aria: "Magnetfeltets styrke",
      min: BMIN,
      max: 2,
      step: 0.1,
      value: B,
      format: (b) => nb(b),
      signal,
      onInput: (b) => {
        B = b;
        trail = [];
      },
    }),
    button("Dytt", "Gi partikkelen et dytt", kick, signal),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const sc = scale(w, h);
    const px = (q) => w / 2 + q[0] * sc;
    const py = (q) => h / 2 - q[1] * sc;
    let g = "";

    // Feltet ut av skjermen: prikk i ring, glissent nok til at banen leses.
    for (let x = 24; x < w; x += 46) {
      for (let yy = 24; yy < h; yy += 46) {
        if (yy < 34 && x < 160) continue; // plass til etiketten
        if (yy > h - 46 && x < 70) continue; // plass til aksene
        g += circle(x, yy, 3.5, { stroke: HINT, width: 1 }) + `<circle cx="${x}" cy="${yy}" r="1" style="fill:${HINT}"/>`;
      }
    }
    g += txt(10, 16, "B ut av skjermen");

    // Koordinataksene.
    const ax = 18;
    const ay = h - 16;
    g += arrow(ax, ay, ax + 30, ay, LABEL, 1.2) + txt(ax + 34, ay + 4, "x");
    g += arrow(ax, ay, ax, ay - 30, LABEL, 1.2) + txt(ax - 4, ay - 34, "y", { anchor: "end" });

    g += poly(
      trail.map((q) => [px(q), py(q)]),
      `stroke="${MOVING}" stroke-width="1.5" opacity="0.4"`,
    );
    const C = centre();
    const cx = px(C);
    const cy = py(C);
    g += cross(cx, cy);
    g += txt(cx + 10, cy - 6, "(X, Y)", { fill: DERIVED });

    const bx = px(p);
    const by = py(p);
    const sp = Math.hypot(v[0], v[1]) || 1;
    const ux = v[0] / sp;
    const uy = -v[1] / sp; // skjermens y peker ned
    // Kraften qv×B peker inn mot sentrum.
    const dx = cx - bx;
    const dy = cy - by;
    const dl = Math.hypot(dx, dy) || 1;
    g += arrow(bx, by, bx + (dx / dl) * 30, by + (dy / dl) * 30, LABEL, 1.5);
    g += txt(bx + (dx / dl) * 36 + (dy / dl) * 8, by + (dy / dl) * 36 - (dx / dl) * 8 + 4, "qv×B", { anchor: "middle" });
    g += arrow(bx, by, bx + ux * 36, by + uy * 36, "var(--accent-ink)", 2);
    g += txt(bx + ux * 44, by + uy * 44 + 4, "v", { fill: "var(--accent-ink)", anchor: "middle" });
    g += bob(bx, by, 6, MOVING, "q");

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
