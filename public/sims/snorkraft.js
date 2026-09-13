/**
 * Snorkraften i pendelen: kule i ei snor med lengde l, tegnet med vinkelen θ
 * fra loddlinja. Glidebryteren setter farten i bunnpunktet. Den oransje pila
 * er snorkraften S = mlθ̇² + mg cos θ, den grå er tyngden mg, i samme
 * målestokk. Blir S negativ, kan snora ikke holde igjen: den blir slakk, og
 * kula går i en kastebane til snora strammes igjen. Da forsvinner den
 * radielle delen av farten, slik en snor som ikke tøyer seg gjør det.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, arrow, poly, support, bob,
  angleFromDown, gravity, FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.6; // simulerte sekunder per virkelig sekund
  const DT = 0.004;
  let v0 = 1.7;
  let taut = true;
  let y = [0, v0]; // stram snor: [θ, θ̇]
  let z = [0, -1, 0, 0]; // slakk snor: [x, y, ẋ, ẏ], y oppover fra opphenget
  let trail = []; // kastebanen mens snora er slakk

  const fTaut = (t, s) => [s[1], -Math.sin(s[0])];
  const fFree = (t, s) => [s[2], s[3], 0, -1];
  const tension = (th, om) => om * om + Math.cos(th);

  const reset = () => {
    taut = true;
    y = [0, v0];
    trail = [];
  };

  controls.append(
    slider({
      text: "Fart i bunnpunktet",
      aria: "Kulas fart i bunnpunktet",
      min: 0.2,
      max: 2.4,
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
      if (taut) {
        y = rk4(y, fTaut, 0, h);
        if (y[0] > Math.PI) y[0] -= 2 * Math.PI;
        else if (y[0] < -Math.PI) y[0] += 2 * Math.PI;
        if (tension(y[0], y[1]) < 0) {
          // Snora slipper: fri kastebane fra samme sted med samme fart.
          const [th, om] = y;
          z = [Math.sin(th), -Math.cos(th), om * Math.cos(th), om * Math.sin(th)];
          trail = [[z[0], z[1]]];
          taut = false;
        }
      } else {
        z = rk4(z, fFree, 0, h);
        const r = Math.hypot(z[0], z[1]);
        if (r > 1e-6) {
          const vr = (z[0] * z[2] + z[1] * z[3]) / r;
          if (r >= 1 && vr > 0) {
            // Snora strammes: den radielle farten forsvinner.
            const ux = z[0] / r;
            const uy = z[1] / r;
            const vx = z[2] - vr * ux;
            const vy = z[3] - vr * uy;
            const th = Math.atan2(ux, -uy);
            y = [th, vx * Math.cos(th) + vy * Math.sin(th)];
            taut = true;
            trail = [];
          }
        }
      }
      s -= h;
    }
    if (!taut) {
      trail.push([z[0], z[1]]);
      if (trail.length > 600) trail.shift();
    }
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const L = Math.min(0.36 * h, 0.3 * w);
    const cx = w / 2;
    const cy = h / 2;
    let th = 0;
    let S = 0;
    let bx;
    let by;
    if (taut) {
      th = y[0];
      S = tension(th, y[1]);
      bx = cx + L * Math.sin(th);
      by = cy + L * Math.cos(th);
    } else {
      bx = cx + L * z[0];
      by = cy - L * z[1];
    }
    // Pillengde for mg: så stor som mulig uten at S-pila rekker forbi opphenget.
    const F = Math.min(0.3, 0.95 / (v0 * v0 + 1)) * L;
    let g = "";

    // Sirkelen kula kan gå på, og loddlinja θ måles fra.
    g += circle(cx, cy, L, { stroke: HINT, width: 1, dash: "3 4" });
    g += line(cx, cy, cx, cy + L + 10, { color: HINT, width: 1, dash: "3 4" });

    // Der snorkraften blir null: cos θ* = (2 − v₀²/gl)/3.
    const k = v0 * v0;
    if (k > 2 && k < 5) {
      const ts = Math.acos((2 - k) / 3);
      for (const sgn of [1, -1]) {
        g += circle(cx + sgn * L * Math.sin(ts), cy + L * Math.cos(ts), 4, { fill: DERIVED, stroke: DERIVED });
      }
      if (Math.sin(ts) > 0.2) {
        g += txt(cx + L * Math.sin(ts) + 6, cy + L * Math.cos(ts) - 9, "S = 0", { fill: DERIVED });
      } else {
        g += txt(cx, cy - L - 18, "S = 0", { fill: DERIVED, anchor: "middle" });
      }
    } else if (k >= 5) {
      g += txt(cx, cy - L - 18, "S ≥ 0 hele veien rundt", { fill: DERIVED, anchor: "middle" });
    }

    // Kastebanen mens snora er slakk.
    if (!taut && trail.length > 1) {
      g += poly(
        trail.map(([px, py]) => [cx + L * px, cy - L * py]),
        `stroke="${DERIVED}" stroke-width="1.2" stroke-dasharray="2 3"`,
      );
    }

    // Snora: stram som en rett linje, slakk som en bue som henger.
    if (taut) {
      g += line(cx, cy, bx, by, { color: FIXED, width: 2 });
      const fx = cx + 0.3 * (bx - cx);
      const fy = cy + 0.3 * (by - cy);
      g += txt(fx + (11 * (by - cy)) / L, fy - (11 * (bx - cx)) / L + 4, "l", { anchor: "middle" });
    } else {
      const d = Math.hypot(bx - cx, by - cy);
      const mx = (cx + bx) / 2;
      const my = (cy + by) / 2 + 0.6 * (L - d);
      g += `<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${FIXED}" stroke-width="2" stroke-dasharray="4 3"/>`;
    }
    g += support(cx, cy);

    // Kreftene på kula, i samme målestokk: tyngden ned, snorkraften langs snora.
    g += arrow(bx, by, bx, by + F, LABEL, 1.5);
    g += txt(bx + 7, by + F + 4, "mg");
    if (taut && S > 0) {
      const len = F * S;
      const ux = (cx - bx) / L;
      const uy = (cy - by) / L;
      g += arrow(bx, by, bx + ux * len, by + uy * len, DERIVED, 2.5);
      // Etiketten på den sida av pila som vender opp, vekk fra mg-pila under kula.
      let px = -uy;
      let py = ux;
      if (py > 0) {
        px = -px;
        py = -py;
      }
      const lx = bx + ux * len * 0.55 + 12 * px;
      const ly = by + uy * len * 0.55 + 12 * py;
      g += txt(lx, ly + 4, "S", { fill: DERIVED, anchor: "middle" });
    }

    g += bob(bx, by, 9, MOVING, "m");
    if (taut) g += angleFromDown(cx, cy, 0.42 * L, th, "θ");
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
