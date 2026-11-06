/**
 * Mange pendler i faserommet. 24 like pendler henger i det samme opphenget
 * øverst og slippes fra litt ulike tilstander. Under er faserommet med samme
 * akser som i «Pendelen i faserommet»: hver pendel er en prikk, og den fylte
 * flekken er alle tilstandene i en liten skive rundt startpunktet. Flekken
 * følger Hamiltons ligninger θ̇ = p, ṗ = −sin θ: den dras ut til en tynn
 * spiral fordi store utslag tar lengre tid, men arealet er det samme hele
 * tida. Det fylte rektangelet øverst til høyre har til enhver tid samme areal
 * som flekken, det stiplede arealet ved start. Med friksjon er ṗ = −sin θ − 0,1 p (og den loddrette aksen
 * ml²θ̇): flekken og rektangelet krymper, og alle pendlene ender i ro.
 *
 * Randa av flekken er en lukket polygon. Punktene på den integreres hver for
 * seg, og når to naboer kommer mer enn noen piksler fra hverandre, settes et
 * nytt punkt inn midt mellom dem, så spiralen holder seg glatt.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, circle, poly, pin,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 2.2; // simulerte tidsenheter per sekund
  const DT = 0.01;
  const PM = 2.5; // p-aksen går fra −PM til PM
  const C0 = [1.1, 0]; // midten av startskiva
  const R0 = 0.42; // radien til startskiva
  const NB = 360; // punkter på randa ved start
  const MAXPTS = 9000;
  const TMAX = 75; // simulert tid før den stopper
  const GAMMA = 0.1; // friksjonsleddet −GAMMA·p
  let friction = false;
  let t = 0;
  let edge = [];
  let samples = [];
  let A0 = 1;
  let geom = { sx: 50, sy: 50 };

  const f = (tt, s) => [s[1], -Math.sin(s[0]) - (friction ? GAMMA * s[1] : 0)];

  function reset() {
    t = 0;
    edge = [];
    for (let i = 0; i < NB; i++) {
      const a = (2 * Math.PI * i) / NB;
      edge.push([C0[0] + R0 * Math.cos(a), C0[1] + R0 * Math.sin(a)]);
    }
    samples = [C0.slice()];
    for (const [r, n] of [[0.2, 8], [0.36, 15]]) {
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * (i + 0.5)) / n;
        samples.push([C0[0] + r * Math.cos(a), C0[1] + r * Math.sin(a)]);
      }
    }
    A0 = area();
  }

  function area() {
    let s = 0;
    for (let i = 0, n = edge.length; i < n; i++) {
      const a = edge[i];
      const b = edge[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }

  function step(dt) {
    let s = dt * TS;
    while (s > 0 && t < TMAX) {
      const h = Math.min(DT, s);
      for (let i = 0; i < edge.length; i++) edge[i] = rk4(edge[i], f, t, h);
      for (let i = 0; i < samples.length; i++) samples[i] = rk4(samples[i], f, t, h);
      t += h;
      s -= h;
    }
    refine();
  }

  /** Sett inn et punkt midt mellom naboer som ligger mer enn 3 px fra hverandre. */
  function refine() {
    if (edge.length >= MAXPTS) return;
    const { sx, sy } = geom;
    const out = [];
    for (let i = 0, n = edge.length; i < n; i++) {
      const a = edge[i];
      const b = edge[(i + 1) % n];
      out.push(a);
      const d = Math.hypot((b[0] - a[0]) * sx, (b[1] - a[1]) * sy);
      if (d > 3 && out.length + (n - i) < MAXPTS) out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    edge = out;
  }

  const restartBtn = button("Slipp på nytt", "Slipp pendlene på nytt fra startskiva", () => {
    reset();
    loop.start();
    render();
  }, signal);
  const frictionBtn = button("Friksjon: av", "Slå friksjon av eller på, og slipp pendlene på nytt", () => {
    friction = !friction;
    frictionBtn.textContent = friction ? "Friksjon: på" : "Friksjon: av";
    frictionBtn.setAttribute("aria-pressed", String(friction));
    reset();
    loop.start();
    render();
  }, signal);
  frictionBtn.setAttribute("aria-pressed", "false");
  controls.append(restartBtn, frictionBtn);

  /** Nivåkurven H = E inni separatrisen (E < 1) som en lukket ring i dataenheter. */
  function ring(E) {
    const N = 140;
    const t0 = Math.acos(Math.max(-1, Math.min(1, -E)));
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const th = -t0 + (2 * t0 * i) / N;
      pts.push([th, Math.sqrt(Math.max(0, 2 * (E + Math.cos(th))))]);
    }
    for (let i = N; i >= 0; i--) {
      const th = -t0 + (2 * t0 * i) / N;
      pts.push([th, -Math.sqrt(Math.max(0, 2 * (E + Math.cos(th))))]);
    }
    return pts;
  }

  /** Tekst med senket indeks, i monospace. */
  function sub(x, yy, base, idx, { fill = LABEL, anchor = "middle" } = {}) {
    return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" style="fill:${fill};font-family:var(--font-mono);font-size:12px">${base}<tspan baseline-shift="sub" style="font-size:9px">${idx}</tspan></text>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const left = 26;
    const right = 12;
    const hP = Math.max(90, Math.min(130, 0.3 * h)); // pendlene
    const top = 8 + hP + 12; // faserommet
    const bottom = 34;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const sx = pw / (2 * Math.PI);
    const sy = ph / (2 * PM);
    geom = { sx, sy };
    const X = (th) => left + (th + Math.PI) * sx;
    const Y = (p) => top + (PM - p) * sy;
    const toPts = (c) => c.map(([th, p]) => [X(th), Y(p)]);
    let g = "";

    // ── Pendlene ──
    const L = hP - 14;
    const gx = left + pw / 2;
    const gy = 10;
    for (const [th] of samples) {
      g += line(gx, gy, gx + L * Math.sin(th), gy + L * Math.cos(th), { color: FIXED, width: 1, opacity: 0.45 });
    }
    for (const [th] of samples) {
      g += circle(gx + L * Math.sin(th), gy + L * Math.cos(th), 3.2, { fill: MOVING, stroke: "none", width: 0 });
    }
    g += pin(gx, gy);

    // ── Faserommet ──
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top, X(0), top + ph, { color: HINT, width: 1 });
    g += txt(X(-Math.PI), h - 20, "−π", { anchor: "start" });
    g += txt(X(0), h - 20, "0", { anchor: "middle" });
    g += txt(X(Math.PI), h - 20, "π", { anchor: "end" });
    g += txt(X(0), h - 4, "θ", { anchor: "middle" });
    g += friction
      ? txt(X(0) + 6, top + 12, "ml²θ", { anchor: "start" }) + circle(X(0) + 6 + 3.5 * 7.2, top + 1, 1.2, { fill: LABEL, stroke: "none", width: 0 })
      : sub(X(0) + 6, top + 12, "p", "θ", { anchor: "start" });

    for (const E of [-0.55, 0.3]) g += poly(toPts(ring(E)), `stroke="${HINT}" stroke-width="1.1" stroke-dasharray="4 4"`);
    for (const sg of [1, -1]) {
      const br = [];
      for (let i = 0; i <= 160; i++) {
        const th = -Math.PI + (2 * Math.PI * i) / 160;
        br.push([X(th), Y(sg * 2 * Math.cos(th / 2))]);
      }
      g += poly(br, `stroke="${DERIVED}" stroke-width="1.6"`);
    }
    g += txt(X(Math.PI) - 6, Y(-1.75), "separatrise", { fill: DERIVED, anchor: "end", size: 10 });
    g += circle(X(0), Y(0), 3.5, { fill: DERIVED, stroke: DERIVED });

    // Startskiva, stiplet.
    const disk = [];
    for (let i = 0; i <= 64; i++) {
      const a = (2 * Math.PI * i) / 64;
      disk.push([X(C0[0] + R0 * Math.cos(a)), Y(C0[1] + R0 * Math.sin(a))]);
    }
    g += poly(disk, `stroke="${LABEL}" stroke-width="1" stroke-dasharray="3 3"`);

    // Flekken: randa som én lukket sti, uten punkter som ligger under en piksel fra forrige.
    let d = "";
    let lx = -1e9;
    let ly = -1e9;
    for (let i = 0; i < edge.length; i++) {
      const x = X(edge[i][0]);
      const yy = Y(edge[i][1]);
      if (i > 0 && Math.abs(x - lx) < 0.8 && Math.abs(yy - ly) < 0.8) continue;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`;
      lx = x;
      ly = yy;
    }
    g += `<path d="${d}Z" style="fill:${MOVING};fill-opacity:0.25" stroke="${MOVING}" stroke-width="1" stroke-linejoin="round"/>`;
    for (const [th, p] of samples) g += circle(X(th), Y(p), 2.6, { fill: MOVING, stroke: "none", width: 0 });

    // Rektangelet med samme areal som flekken, i dataenheter √A × √A.
    const side = Math.sqrt(area());
    const rx1 = X(Math.PI) - 4;
    const ry0 = Y(PM) + 6;
    const rw = side * sx;
    const rh = side * sy;
    g += `<rect x="${(rx1 - rw).toFixed(1)}" y="${ry0.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}" style="fill:${MOVING};fill-opacity:0.25" stroke="${MOVING}" stroke-width="1"/>`;
    const s0 = Math.sqrt(A0);
    g += `<rect x="${(rx1 - s0 * sx).toFixed(1)}" y="${ry0.toFixed(1)}" width="${(s0 * sx).toFixed(1)}" height="${(s0 * sy).toFixed(1)}" style="fill:none" stroke="${LABEL}" stroke-width="1" stroke-dasharray="3 3"/>`;
    g += txt(rx1 - s0 * sx - 6, ry0 + 12, "flekkens", { anchor: "end", size: 10 });
    g += txt(rx1 - s0 * sx - 6, ry0 + 24, "areal", { anchor: "end", size: 10 });

    stage.innerHTML = svg(w, h, g);
  }

  reset();
  onResize(render);
  const loop = animate({
    stage,
    signal,
    running: () => t < TMAX,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  render();
}
