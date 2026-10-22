/**
 * Kula i potensialet: en partikkel på en linje med potensialet V(x), tegnet som
 * en kule som ligger på kurven V(x), slik en kule ruller i en bakke med den
 * formen. Den oransje linja er energien E, heltrukket der V ≤ E og stiplet
 * utenfor, med vendepunktene der linja møter kurven. Den grå streken fra kula
 * opp til linja er den kinetiske energien E − V(x).
 *
 * Bevegelsen er den ekte endimensjonale: ẍ = −V′(x)/m, integrert med RK4. Kula
 * på tegningen står alltid i (x, V(x)), så den beveger seg ikke som en kule på
 * en virkelig bane ville gjort i tid, men vendepunktene og likevektene er de
 * samme.
 *
 * Fire potensialer: fjær ½kx², kvartisk ¼γx⁴, dobbeltbrønnen −½kx² + ¼ax⁴ og
 * brønnen mellom to topper ½kx² − ¼ax⁴ (øving 1, oppgave 3, med begge
 * fortegnsvalg). Enhetene er valgt så m = k = γ = a = 1. Fylte oransje prikker
 * er stabile likevekter, åpne ringer ustabile. Nær hvert minimum med V″ > 0
 * står parabelen ½V″(x₀)(x − x₀)² stiplet.
 *
 * Trykk på tegningen for å slippe kula fra ro der. «To kuler» slipper to kuler
 * samtidig, den andre halvveis inn mot bunnen, så du kan se om de bruker like
 * lang tid på en svingning.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { rk4, animate, svg, txt, line, circle, poly, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 2.2; // simulert tid per sekund; fjæra har perioden 2π
  const DT = 0.004;
  const POT = {
    fjaer: {
      name: "Fjær",
      V: (x) => 0.5 * x * x,
      dV: (x) => x,
      x: [-2.2, 2.2],
      v: [-0.35, 2.5],
      eq: [{ x: 0, stable: true }],
      start: 1.7,
    },
    kvartisk: {
      name: "Kvartisk",
      V: (x) => 0.25 * x ** 4,
      dV: (x) => x ** 3,
      x: [-2.2, 2.2],
      v: [-0.35, 2.5],
      eq: [{ x: 0, stable: true }],
      start: 1.7,
    },
    dobbel: {
      name: "Dobbeltbrønn",
      V: (x) => -0.5 * x * x + 0.25 * x ** 4,
      dV: (x) => -x + x ** 3,
      x: [-1.75, 1.75],
      v: [-0.35, 0.65],
      eq: [{ x: -1, stable: true, d2: 2 }, { x: 0, stable: false }, { x: 1, stable: true, d2: 2 }],
      start: 1.35,
    },
    topper: {
      name: "Brønn mellom topper",
      V: (x) => 0.5 * x * x - 0.25 * x ** 4,
      dV: (x) => x - x ** 3,
      x: [-2, 2],
      v: [-0.75, 0.45],
      eq: [{ x: -1, stable: false }, { x: 0, stable: true, d2: 1 }, { x: 1, stable: false }],
      start: 0.8,
    },
  };

  let key = "fjaer";
  let two = false;
  let balls = []; // {x, v, x0, gone}
  let tapped = false;
  let geom = null;
  let wait = 0; // pause før kula slippes på nytt etter at den har forsvunnet

  const P = () => POT[key];
  const f = (t, y) => [y[1], -P().dV(y[0])];

  function release(x0) {
    balls = [{ x: x0, v: 0, x0 }];
    if (two) balls.push({ x: x0 / 2, v: 0, x0: x0 / 2 });
    wait = 0;
    render();
  }

  // ── kontroller ────────────────────────────────────────────────────────────
  const potBtns = {};
  for (const k of Object.keys(POT)) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = POT[k].name;
    b.setAttribute("aria-label", `Potensialet ${POT[k].name.toLowerCase()}`);
    b.setAttribute("aria-pressed", String(k === key));
    b.addEventListener("click", () => setPot(k), { signal });
    potBtns[k] = b;
    controls.append(b);
  }
  const twoBtn = document.createElement("button");
  twoBtn.type = "button";
  twoBtn.className = "sim-btn";
  twoBtn.textContent = "To kuler";
  twoBtn.setAttribute("aria-label", "Slipp to kuler samtidig fra ulik høyde");
  twoBtn.setAttribute("aria-pressed", "false");
  twoBtn.addEventListener(
    "click",
    () => {
      two = !two;
      twoBtn.setAttribute("aria-pressed", String(two));
      release(balls[0]?.x0 ?? P().start);
    },
    { signal },
  );
  controls.append(twoBtn);

  function setPot(k) {
    key = k;
    for (const [kk, b] of Object.entries(potBtns)) b.setAttribute("aria-pressed", String(kk === k));
    release(P().start);
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const p = P();
    const pad = { l: 10, r: 10, t: 14, b: 22 };
    const pw = w - pad.l - pad.r;
    const ph = h - pad.t - pad.b;
    const sx = pw / (p.x[1] - p.x[0]);
    const sy = ph / (p.v[1] - p.v[0]);
    const X = (x) => pad.l + (x - p.x[0]) * sx;
    const Y = (v) => pad.t + (p.v[1] - v) * sy;
    geom = { w, h, pad, sx, sy, p };
    let g = "";

    // x-aksen ved V = 0.
    g += line(pad.l, Y(0), w - pad.r, Y(0), { color: HINT, width: 1 });
    g += txt(pad.l + 2, Y(0) + 15, "x");

    // Parabelen ½V″(x₀)(x − x₀)² + V(x₀) nær hvert minimum.
    for (const e of p.eq) {
      if (!e.stable || !e.d2) continue;
      const pts = [];
      const half = 0.75;
      for (let i = 0; i <= 40; i++) {
        const x = e.x - half + (2 * half * i) / 40;
        const v = p.V(e.x) + 0.5 * e.d2 * (x - e.x) ** 2;
        if (v <= p.v[1]) pts.push([X(x), Y(v)]);
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1.4" stroke-dasharray="4 3" opacity="0.8"`);
    }

    // Kurven V(x), klippet til tegningen.
    const N = 220;
    let seg = [];
    const segs = [];
    for (let i = 0; i <= N; i++) {
      const x = p.x[0] + ((p.x[1] - p.x[0]) * i) / N;
      const v = p.V(x);
      if (v > p.v[1] + 0.02 || v < p.v[0] - 0.02) {
        if (seg.length) segs.push(seg);
        seg = [];
        continue;
      }
      seg.push([X(x), Y(v)]);
    }
    if (seg.length) segs.push(seg);
    for (const s of segs) g += poly(s, `stroke="var(--muted)" stroke-width="2.5" stroke-linejoin="round"`);
    // Etiketten V(x) der kurven er inne i tegningen nær høyre kant.
    const lx = p.x[1] - 0.25;
    if (p.V(lx) < p.v[1] - 0.1 && p.V(lx) > p.v[0] + 0.1) g += txt(X(lx) - 4, Y(p.V(lx)) - 10, "V(x)", { anchor: "end" });

    // Likevektene.
    for (const e of p.eq) {
      const cx = X(e.x);
      const cy = Y(p.V(e.x));
      g += e.stable
        ? circle(cx, cy, 4, { fill: DERIVED, stroke: DERIVED })
        : circle(cx, cy, 4.5, { fill: "var(--bg-elevated)", stroke: DERIVED, width: 1.8 });
    }

    // Energilinja for hver kule: heltrukket der V ≤ E, stiplet ellers, og vendepunktene.
    balls.forEach((b, i) => {
      if (b.gone) return;
      const E = p.V(b.x0);
      if (E > p.v[1]) return;
      const op = i === 0 ? 1 : 0.6;
      g += line(pad.l, Y(E), w - pad.r, Y(E), { color: DERIVED, width: 1, dash: "3 4", opacity: 0.5 * op });
      // Startpunktet er det ene vendepunktet. Gå nedover bakken fra det til V
      // igjen når E: der er det andre. Når kurven aldri når E igjen innenfor
      // tegningen, slipper kula ut, og linja går helt ut til kanten.
      const down = -Math.sign(p.dV(b.x0));
      let xt = null;
      if (down !== 0) {
        xt = b.x0 + down * 0.01;
        while (xt > p.x[0] - 2 && xt < p.x[1] + 2 && p.V(xt) <= E) xt += down * 0.002;
        if (p.V(xt) <= E) xt = down > 0 ? p.x[1] : p.x[0];
      }
      const a = xt === null ? null : Math.min(b.x0, xt);
      const c = xt === null ? null : Math.max(b.x0, xt);
      if (a !== null) {
        g += line(X(a), Y(E), X(c), Y(E), { color: DERIVED, width: 2, opacity: op });
        for (const xe of [a, c]) if (Math.abs(p.V(xe) - E) < 0.05) g += line(X(xe), Y(E) - 5, X(xe), Y(E) + 5, { color: DERIVED, width: 2, opacity: op });
      }
      if (i === 0) g += txt(w - pad.r, Y(E) - 5, "E", { fill: DERIVED, anchor: "end" });
    });

    // Kulene, med den kinetiske energien som en grå strek opp til energilinja.
    balls.forEach((b, i) => {
      if (b.gone || b.x < p.x[0] - 0.05 || b.x > p.x[1] + 0.05) return;
      const E = p.V(b.x0);
      const cx = X(b.x);
      const cy = Y(p.V(b.x));
      if (E - p.V(b.x) > 0.01 && E <= p.v[1]) g += line(cx, cy, cx, Y(E), { color: LABEL, width: 2, opacity: i === 0 ? 0.8 : 0.5 });
      // Kula ligger oppå kurven: flytt sentrum en radius ut langs normalen.
      const slope = (-p.dV(b.x) * sy) / sx; // dY/dX på skjermen
      const nlen = Math.hypot(slope, 1);
      const r = 7;
      const nx = slope / nlen;
      const ny = -1 / nlen;
      g += circle(cx + r * nx, cy + r * ny, r, { fill: MOVING, stroke: MOVING, opacity: i === 0 ? 1 : 0.55 });
    });

    if (!tapped) g += txt(pad.l + 2, pad.t + 6, "trykk for å slippe kula et annet sted", { size: 12 });
    stage.innerHTML = svg(w, h, g);
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  function step(dt) {
    const p = P();
    let s = dt * TS;
    while (s > 0) {
      const hh = Math.min(DT, s);
      for (const b of balls) {
        if (b.gone) continue;
        [b.x, b.v] = rk4([b.x, b.v], f, 0, hh);
        if (b.x < p.x[0] - 0.3 || b.x > p.x[1] + 0.3) b.gone = true;
      }
      s -= hh;
    }
    // Er alle kulene borte, slippes de på nytt fra samme sted etter en kort pause.
    if (balls.length && balls.every((b) => b.gone)) {
      wait += dt;
      if (wait > 0.8) release(balls[0].x0);
    }
  }

  stage.style.cursor = "crosshair";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const rect = stage.getBoundingClientRect();
      const x = geom.p.x[0] + ((e.clientX - rect.left) * (geom.w / rect.width) - geom.pad.l) / geom.sx;
      if (x < geom.p.x[0] || x > geom.p.x[1] || geom.p.V(x) > geom.p.v[1]) return;
      tapped = true;
      release(x);
    },
    { signal },
  );

  onResize(render);
  release(P().start);
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
}
