/**
 * Perle på en ring som roterer om den loddrette diameteren, i
 * skråprojeksjon så rotasjonen synes. θ er perlas vinkel fra ringens
 * bunnpunkt, a ringens radius og ω den påtvungne vinkelfarten. Over
 * ω = √(g/a) blir bunnpunktet ustabilt, og perla svinger om det nye
 * likevektspunktet θ₀ (oransje merke) i stedet.
 *
 * Enheter: m = a = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, poly, arrow, bob, gravity, projector,
  FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.5;
  const DT = 0.005;
  const ALPHA = 0.3; // kameraets hevning over vannrett
  let om = 1.4;
  let y = [0.35, 0]; // [θ, θ̇]
  let psi = 0.6; // ringens dreievinkel om aksen

  const f = (t, s) => [s[1], Math.sin(s[0]) * (om * om * Math.cos(s[0]) - 1)];
  const reset = () => {
    y = [0.35, 0];
  };

  controls.append(
    slider({
      text: "Vinkelfart ω",
      aria: "Ringens vinkelfart",
      min: 0,
      max: 2.2,
      step: 0.1,
      value: om,
      format: (v) => `${nb(v)} √(g/a)`,
      signal,
      onInput: (v) => {
        om = v;
      },
    }),
    button("Nullstill", "Slipp perla på nytt nær bunnpunktet", reset, signal),
  );

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    psi = (psi + om * dt * TS) % (2 * Math.PI);
    if (y[0] > Math.PI) y[0] -= 2 * Math.PI;
    else if (y[0] < -Math.PI) y[0] += 2 * Math.PI;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const [th] = y;
    const a = Math.min(0.36 * h, 0.3 * w);
    const cx = w / 2;
    const cy = h / 2 + 12;
    const P = projector(cx, cy, a, ALPHA);
    const cs = Math.cos(psi);
    const sn = Math.sin(psi);
    // Punkt på ringen ved vinkelen s fra bunnpunktet, skalert med r.
    const onRing = (s, r = 1) => P(r * Math.sin(s) * cs, r * Math.sin(s) * sn, -r * Math.cos(s));
    let g = "";

    // Aksen ringen roterer om, og rotasjonspila øverst.
    const [, ytop] = P(0, 0, 1.3);
    const [, ybot] = P(0, 0, -1.25);
    g += line(cx, ytop, cx, ybot, { color: FIXED, width: 1, dash: "3 4" });
    const rot = [];
    for (let i = 0; i <= 20; i++) {
      const u = 0.15 * Math.PI + (1.2 * Math.PI * i) / 20;
      rot.push(P(0.3 * Math.cos(u), 0.3 * Math.sin(u), 1.16));
    }
    g += poly(rot, `stroke="${LABEL}" stroke-width="1.5"`);
    const [ex, ey] = rot[rot.length - 1];
    const [fx, fy] = rot[rot.length - 2];
    g += arrow(fx, fy, ex + (ex - fx) * 2, ey + (ey - fy) * 2, LABEL, 1.5);
    g += txt(cx + 0.36 * a, ey + 2, "ω");

    // Sirkelen perla sveiper når ringen roterer.
    const rs = Math.abs(Math.sin(th));
    if (rs > 0.03) {
      const sw = [];
      for (let i = 0; i <= 60; i++) {
        const u = (2 * Math.PI * i) / 60;
        sw.push(P(rs * Math.cos(u), rs * Math.sin(u), -Math.cos(th)));
      }
      g += poly(sw, `stroke="${MOVING}" stroke-width="1" stroke-dasharray="4 3" opacity="0.5"`);
    }

    // Ringen.
    const ring = [];
    for (let i = 0; i <= 90; i++) ring.push(onRing((2 * Math.PI * i) / 90));
    g += poly(ring, `stroke="${FIXED}" stroke-width="2.5"`);
    g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="2.5" style="fill:${FIXED}"/>`;

    // Radien a og vinkelen θ fra bunnpunktet.
    const [bx, by] = onRing(th);
    g += line(cx, cy, bx, by, { color: HINT, width: 1, dash: "3 4" });
    const [ax, ay] = onRing(th, 0.5);
    g += txt(ax + 10 * cs, ay + 4, "a", { anchor: "middle" });
    if (Math.abs(th) > 0.1) {
      const pts = [];
      const n = Math.max(4, Math.ceil(Math.abs(th) * 10));
      for (let i = 0; i <= n; i++) pts.push(onRing((th * i) / n, 0.3));
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.2"`);
      const [lx, ly] = onRing(th / 2, 0.42);
      g += txt(lx, ly + 4, "θ", { anchor: "middle" });
    }

    // Likevektspunktene θ₀ når ω² > g/a.
    if (om * om > 1) {
      const t0 = Math.acos(1 / (om * om));
      for (const sgn of [1, -1]) {
        const [qx, qy] = onRing(sgn * t0);
        g += `<circle cx="${qx.toFixed(1)}" cy="${qy.toFixed(1)}" r="4" style="fill:${DERIVED}"/>`;
      }
      const [qx, qy] = onRing(t0, 1.12);
      g += txt(qx + 6 * cs, qy + 4, "θ₀", { fill: DERIVED, anchor: cs >= 0 ? "start" : "end" });
    }

    g += bob(bx, by, 8, MOVING, "m");
    g += gravity(22, 18);

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
