/**
 * Kule på roterende skive, sett fra to systemer. Kula sklir friksjonsfritt
 * fra sentrum og rett utover; sett fra bakken (K) går den rett fram, sett fra
 * skiva (K′) krummer banen fordi Corioliskraften og sentrifugalkraften
 * kommer til. Prikkene er de samme hendelsene i begge visningene: de lagres
 * med skivas dreievinkel i øyeblikket og dreies inn i det valgte systemet,
 * så et bytte midt i turen stiller de samme prikkene opp som den andre banen.
 *
 * Enheter: skivas radius 1, kulas fart 0,45 radier per sekund. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize,
 * signal }.
 */
import {
  nb, slider, button, animate, svg, txt, line, circle, arrow, arc, poly,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const V = 0.45; // kulas fart i K, radier per sekund
  const TF = 1 / V; // tida til kanten
  const HOLD = 0.9; // pause ved kanten før ny tur
  const DOT = 0.12; // tid mellom prikkene
  let om = 1.0; // skivas vinkelfart, rad/s
  let t = 0;
  let psi = 0; // skivas dreievinkel
  let view = "ground"; // "ground" = K, "cart" = K′
  let trail = []; // {x, y, psi} i K-koordinater

  const reset = () => {
    t = 0;
    psi = 0;
    trail = [];
  };

  // ── kontroller ────────────────────────────────────────────────────────────
  function viewBtn(text, value) {
    const b = button(text, `Vis bevegelsen ${text.toLowerCase()}`, () => setView(value), signal);
    b.setAttribute("aria-pressed", String(view === value));
    return b;
  }
  const groundBtn = viewBtn("Fra bakken (K)", "ground");
  const diskBtn = viewBtn("Fra skiva (K′)", "cart");
  function setView(value) {
    view = value;
    groundBtn.setAttribute("aria-pressed", String(value === "ground"));
    diskBtn.setAttribute("aria-pressed", String(value === "cart"));
    render();
  }
  controls.append(
    groundBtn,
    diskBtn,
    slider({
      text: "Skivas vinkelfart ω",
      aria: "Skivas vinkelfart i radianer per sekund",
      min: 0,
      max: 2.5,
      step: 0.1,
      value: om,
      format: (v) => `${nb(v)} rad/s`,
      signal,
      onInput: (v) => {
        om = v;
        reset();
      },
    }),
    button("Start på nytt", "Send kula ut fra sentrum på nytt", reset, signal),
  );

  // ── fysikk ────────────────────────────────────────────────────────────────
  const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

  function step(dt) {
    t += dt;
    if (t > TF + HOLD) {
      reset();
      return;
    }
    if (t <= TF) {
      psi += om * dt;
      if (trail.length === 0 || t - trail[trail.length - 1].t >= DOT) {
        trail.push({ t, x: V * t, y: 0, psi });
      }
    }
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const R = Math.min(0.4 * h, 0.36 * w);
    const cx = w / 2;
    const cy = h / 2 + 6;
    const inDisk = view === "cart";
    // Skjermkoordinater for et punkt gitt i K, dreid inn i det valgte systemet.
    const toScreen = (x, y, a) => {
      const [u, v] = rot(x, y, inDisk ? -a : 0);
      return [cx + R * u, cy - R * v];
    };
    const tk = Math.min(t, TF);
    let g = "";

    // Bakken: en krans av merker utenfor skiva, i ro i K og dreid i K′.
    const ground = inDisk ? -psi : 0;
    for (let k = 0; k < 16; k++) {
      const a = ground + (2 * Math.PI * k) / 16;
      const r0 = R + 8;
      const r1 = R + (k === 0 ? 20 : 13);
      g += line(cx + r0 * Math.cos(a), cy - r0 * Math.sin(a), cx + r1 * Math.cos(a), cy - r1 * Math.sin(a), {
        color: FIXED,
        width: k === 0 ? 2.5 : 1.2,
      });
    }

    // Skiva med fire eiker, i ro i K′ og dreid i K.
    const disk = inDisk ? 0 : psi;
    g += circle(cx, cy, R, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2.5 });
    for (let k = 0; k < 4; k++) {
      const a = disk + (Math.PI * k) / 4;
      g += line(cx - R * Math.cos(a), cy + R * Math.sin(a), cx + R * Math.cos(a), cy - R * Math.sin(a), {
        color: HINT,
        width: 1,
        dash: "3 4",
      });
    }
    g += circle(cx, cy, 3, { fill: FIXED, stroke: FIXED });

    // Rotasjonsretningen: en bue med pil nær kanten, oppe til venstre.
    if (om > 0) {
      const ra = R - 22;
      const a0 = -0.62 * Math.PI;
      const a1 = -0.86 * Math.PI;
      g += arc(cx, cy, ra, a0, a1, { color: LABEL, width: 1.5 });
      const ex = cx + ra * Math.cos(a1);
      const ey = cy + ra * Math.sin(a1);
      const tx = -Math.sin(a1);
      const ty = Math.cos(a1);
      g += arrow(ex + tx * 6, ey + ty * 6, ex - tx * 6, ey - ty * 6, LABEL, 1.5);
      const am = (a0 + a1) / 2;
      g += txt(cx + (ra - 14) * Math.cos(am), cy + (ra - 14) * Math.sin(am) + 4, "ω", { anchor: "middle" });
    }

    // Prikkene: samme hendelser, dreid inn i det valgte systemet.
    for (const p of trail) {
      const [px, py] = toScreen(p.x, p.y, p.psi);
      g += `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="3" style="fill:${MOVING}" opacity="0.5"/>`;
    }

    // Kula, og i K′ de to fiktive kreftene på den.
    const [bx, by] = toScreen(V * tk, 0, psi);
    if (inDisk && t <= TF && tk > 0.05) {
      // Posisjon og hastighet i K′: r′ = R(−ψ) r, v′ = R(−ψ)(v − ω × r).
      const [rx, ry] = rot(V * tk, 0, -psi);
      const [vx, vy] = rot(V, -om * V * tk, -psi);
      const cor = [2 * om * vy, -2 * om * vx]; // −2ω × v′
      const cen = [om * om * rx, om * om * ry]; // ω² r′
      const k = 26; // piksler per enhet akselerasjon
      const draw = (ax, ay, label) => {
        const len = Math.hypot(ax, ay) * k;
        if (len < 6) return;
        const s = Math.min(len, 0.55 * R) / len;
        const ex = bx + ax * k * s;
        const ey = by - ay * k * s;
        g += arrow(bx, by, ex, ey, DERIVED, 2);
        const ux = (ex - bx) / (len * s || 1);
        const uy = (ey - by) / (len * s || 1);
        const anchor = ux > 0.3 ? "start" : ux < -0.3 ? "end" : "middle";
        // Hold etiketten innenfor scenen når kula er nær kanten.
        const lx = Math.min(Math.max(ex + ux * 10, 8), w - 8);
        const ly = Math.min(Math.max(ey + uy * 10 + 4, 30), h - 6);
        g += txt(lx, ly, label, { fill: DERIVED, anchor });
      };
      draw(cen[0], cen[1], "sentrifugal");
      draw(cor[0], cor[1], "Coriolis");
      const vs = poly(
        [
          [bx, by],
          [bx + vx * 40, by - vy * 40],
        ],
        `stroke="${MOVING}" stroke-width="1.5" stroke-dasharray="4 3"`,
      );
      g += vs + txt(bx + vx * 40 + 6, by - vy * 40 + 4, "v′", { fill: MOVING });
    }
    g += `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="7" style="fill:${MOVING}"/>`;

    g += txt(10, 18, inDisk ? "sett fra skiva (K′)" : "sett fra bakken (K)");

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
