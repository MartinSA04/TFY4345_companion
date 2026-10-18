/**
 * Faserommet til den plane pendelen: θ vannrett fra −π til π, p_θ loddrett.
 * De stiplede kurvene har konstant H = p²/2 − cos θ, den oransje er
 * separatrisen H = 1 gjennom toppunktet. Ett punkt følger Hamiltons ligninger
 * θ̇ = p, ṗ = −sin θ, med pila (θ̇, ṗ) på seg og kurven det går langs tegnet
 * svakt. Den lille pendelen øverst til venstre står i vinkelen θ til punktet.
 * Kantene θ = ±π er samme stilling, så et punkt som går ut til høyre, kommer
 * inn igjen til venstre.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, circle, arrow, poly, pin, rod, bob,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.8; // simulerte tidsenheter per sekund; små svingninger har perioden 2π
  const DT = 0.005;
  const PM = 3.3; // p-aksen går fra −PM til PM
  const BACKGROUND = [-0.5, 0.3, 2.8]; // H for de stiplede kurvene
  const PRESETS = {
    svingning: [0, 1.2],
    separatrise: [0, 1.97],
    rotasjon: [0, 2.4],
  };
  let y = PRESETS.separatrise.slice(); // [θ, p]
  let geom = null;
  let tapped = false; // hintet om å trykke vises til første trykk

  const f = (t, s) => [s[1], -Math.sin(s[0])];
  const energy = (s) => 0.5 * s[1] * s[1] - Math.cos(s[0]);
  const wrap = (th) => {
    if (th > Math.PI) return th - 2 * Math.PI;
    if (th < -Math.PI) return th + 2 * Math.PI;
    return th;
  };
  const set = (s) => {
    y = s.slice();
    render();
  };

  controls.append(
    button("Svingning", "Start punktet innenfor separatrisen, så pendelen svinger", () => set(PRESETS.svingning), signal),
    button("Nær separatrisen", "Start punktet like innenfor separatrisen", () => set(PRESETS.separatrise), signal),
    button("Rotasjon", "Start punktet utenfor separatrisen, så pendelen går rundt", () => set(PRESETS.rotasjon), signal),
  );

  function step(dt) {
    let s = dt * TS;
    while (s > 0) {
      const h = Math.min(DT, s);
      y = rk4(y, f, 0, h);
      s -= h;
    }
    y[0] = wrap(y[0]);
  }

  /**
   * Grenene av kurven H = E som polylinjer i dataenheter. For E < 1 er kurven
   * en lukket ring om bunnpunktet, for E > 1 to grener (p > 0 og p < 0) over
   * hele θ-intervallet. `sign` velger én gren (+1, −1), 0 gir begge.
   */
  function levelCurve(E, sign = 0) {
    const N = 160;
    const out = [];
    const signs = sign === 0 ? [1, -1] : [sign];
    if (E < 1) {
      if (E <= -1) return out;
      const t0 = Math.acos(Math.max(-1, Math.min(1, -E))); // vendepunktene ±t0
      const ring = [];
      for (let i = 0; i <= N; i++) {
        const th = -t0 + (2 * t0 * i) / N;
        ring.push([th, Math.sqrt(Math.max(0, 2 * (E + Math.cos(th))))]);
      }
      for (let i = N; i >= 0; i--) {
        const th = -t0 + (2 * t0 * i) / N;
        ring.push([th, -Math.sqrt(Math.max(0, 2 * (E + Math.cos(th))))]);
      }
      out.push(ring);
      return out;
    }
    for (const sg of signs) {
      const br = [];
      for (let i = 0; i <= N; i++) {
        const th = -Math.PI + (2 * Math.PI * i) / N;
        br.push([th, sg * Math.sqrt(Math.max(0, 2 * (E + Math.cos(th))))]);
      }
      out.push(br);
    }
    return out;
  }

  /** Tekst med senket indeks, i monospace. */
  function sub(x, yy, base, idx, { fill = LABEL, anchor = "middle" } = {}) {
    return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" style="fill:${fill};font-family:var(--font-mono);font-size:12px">${base}<tspan baseline-shift="sub" style="font-size:9px">${idx}</tspan></text>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const left = 26;
    const right = 10;
    const top = 8;
    const bottom = 34;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const sx = pw / (2 * Math.PI);
    const sy = ph / (2 * PM);
    const X = (th) => left + (th + Math.PI) * sx;
    const Y = (p) => top + (PM - p) * sy;
    geom = { w, h, left, top, sx, sy };
    const toPts = (c) => c.map(([th, p]) => [X(th), Y(p)]);
    let g = "";

    // Aksene, og kantene θ = ±π, som er samme stilling.
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top, X(0), top + ph, { color: HINT, width: 1 });
    g += line(X(-Math.PI), top, X(-Math.PI), top + ph, { color: HINT, width: 1, dash: "2 4" });
    g += line(X(Math.PI), top, X(Math.PI), top + ph, { color: HINT, width: 1, dash: "2 4" });
    g += txt(X(-Math.PI), h - 20, "−π", { anchor: "start" });
    g += txt(X(0), h - 20, "0", { anchor: "middle" });
    g += txt(X(Math.PI), h - 20, "π", { anchor: "end" });
    g += txt(X(0), h - 4, "θ", { anchor: "middle" });
    g += sub(X(0) + 6, top + 12, "p", "θ", { anchor: "start" });

    // Kurver med konstant H, og separatrisen H = mgl.
    for (const E of BACKGROUND) {
      for (const c of levelCurve(E)) {
        g += poly(toPts(c), `stroke="${HINT}" stroke-width="1.1" stroke-dasharray="4 4"`);
      }
    }
    for (const c of levelCurve(1)) {
      g += poly(toPts(c), `stroke="${DERIVED}" stroke-width="1.8"`);
    }
    g += txt(X(Math.PI) - 6, Y(-1.7), "separatrise", { fill: DERIVED, anchor: "end", size: 10 });
    g += txt(X(Math.PI) - 4, Y(PM) + 16, "rotasjon", { anchor: "end", size: 11 });
    g += txt(X(0), Y(0.36), "svingning", { anchor: "middle", size: 11 });
    if (!tapped) g += txt(X(-Math.PI) + 6, Y(-3.05), "trykk for nytt startpunkt", { anchor: "start", size: 10 });

    // Likevektene: stabil i bunnpunktet, ustabil i toppunktet.
    g += circle(X(0), Y(0), 3.5, { fill: DERIVED, stroke: DERIVED });
    g += circle(X(-Math.PI), Y(0), 4, { fill: "var(--bg-elevated)", stroke: DERIVED, width: 1.8 });
    g += circle(X(Math.PI), Y(0), 4, { fill: "var(--bg-elevated)", stroke: DERIVED, width: 1.8 });

    // Kurven punktet går langs.
    const E = energy(y);
    const branch = E < 1 ? 0 : Math.sign(y[1]) || 1;
    for (const c of levelCurve(E, branch)) {
      g += poly(toPts(c), `stroke="${MOVING}" stroke-width="1.6" opacity="0.45"`);
    }

    // Punktet med farten fra Hamiltons ligninger.
    const [th, p] = y;
    const vx = p * sx;
    const vy = Math.sin(th) * sy; // −ṗ i skjermkoordinater, ṗ = −sin θ
    const vlen = Math.hypot(vx, vy);
    const px0 = X(th);
    const py0 = Y(p);
    // Pila er proporsjonal med farten, men stopper ved kanten av figuren.
    let alen = Math.min(46, 0.42 * vlen);
    if (vlen > 0) {
      const ux = vx / vlen;
      const uy = vy / vlen;
      const room = (lo, hi, x0, u) => (u > 0 ? (hi - x0) / u : u < 0 ? (lo - x0) / u : Infinity);
      alen = Math.min(alen, room(left, left + pw, px0, ux) - 2, room(top, top + ph, py0, uy) - 2);
    }
    if (alen > 7) {
      g += arrow(px0, py0, px0 + (vx / vlen) * alen, py0 + (vy / vlen) * alen, MOVING, 1.8);
    }
    g += circle(px0, py0, 5.5, { fill: MOVING, stroke: MOVING });

    // Pendelen i vinkelen til punktet.
    const R = 19;
    const gx = left + 32;
    const gy = top + 28;
    g += circle(gx, gy, R, { stroke: HINT, width: 1, dash: "2 3" });
    g += line(gx, gy, gx, gy + R + 5, { color: HINT, width: 1, dash: "2 3" });
    g += rod(gx, gy, gx + R * Math.sin(th), gy + R * Math.cos(th), FIXED);
    g += pin(gx, gy);
    g += bob(gx + R * Math.sin(th), gy + R * Math.cos(th), 5);

    stage.innerHTML = svg(w, h, g);
  }

  stage.style.cursor = "crosshair";
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const rect = stage.getBoundingClientRect();
      const kx = geom.w / rect.width;
      const ky = geom.h / rect.height;
      const th = ((e.clientX - rect.left) * kx - geom.left) / geom.sx - Math.PI;
      const p = PM - ((e.clientY - rect.top) * ky - geom.top) / geom.sy;
      if (Math.abs(th) > Math.PI || Math.abs(p) > PM) return;
      tapped = true;
      set([th, p]);
    },
    { signal },
  );

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
