/**
 * Pendelen i faserommet. Øverst energidiagrammet V(θ) = −mgl cos θ med
 * energilinja E og en liten pendel i hjørnet; under faserommet med θ vannrett
 * og p_θ loddrett, med samme θ-akse som energidiagrammet. De stiplede kurvene
 * har konstant H = p²/2 − cos θ, den oransje er separatrisen H = 1. Punktet
 * følger Hamiltons ligninger θ̇ = p, ṗ = −sin θ, med pila (θ̇, ṗ) på seg og
 * kurven det går langs tegnet tydeligere. I energidiagrammet står prikken på
 * energilinja over θ, og den loddrette streken ned til kurven er den kinetiske
 * energien. Vendepunktene er koblet til faserommet med stiplede loddlinjer, så
 * det synes at kurven krysser p_θ = 0 rett under dem. Kantene θ = ±π er samme
 * stilling.
 *
 * Enheter: m = l = g = 1. Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, circle, arrow, poly, pin, rod, bob, angleFromDown,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.8; // simulerte tidsenheter per sekund; små svingninger har perioden 2π
  const DT = 0.005;
  const PM = 3.0; // p-aksen går fra −PM til PM
  const VLO = -1.25; // energidiagrammets loddrette akse
  const VHI = 2.35;
  const BACKGROUND = [-0.6, 0.25, 2.2]; // H for de stiplede kurvene
  const PRESETS = {
    svingning: [0, 1.2],
    separatrise: [0, 1.97],
    rotasjon: [0, 2.4],
  };
  let y = PRESETS.svingning.slice(); // [θ, p]
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
    const right = 12;
    const R = Math.max(22, Math.min(34, 0.075 * h)); // pendelen
    const gx = left + (w - left - right) / 2;
    const gy = 6 + R;
    const topV = gy + R + 12;
    const hV = Math.max(90, Math.min(140, 0.26 * h)); // energidiagrammet
    const top = topV + hV + 14; // faserommet
    const bottom = 34;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const sx = pw / (2 * Math.PI);
    const sy = ph / (2 * PM);
    const X = (th) => left + (th + Math.PI) * sx;
    const Y = (p) => top + (PM - p) * sy;
    const VY = (v) => topV + ((VHI - v) / (VHI - VLO)) * hV;
    geom = { w, h, left, top, sx, sy, ph };
    const toPts = (c) => c.map(([th, p]) => [X(th), Y(p)]);
    const [th, p] = y;
    const E = energy(y);
    let g = "";

    // ── Energidiagrammet ──
    const vcurve = [];
    for (let i = 0; i <= 120; i++) {
      const t = -Math.PI + (2 * Math.PI * i) / 120;
      vcurve.push([X(t), VY(-Math.cos(t))]);
    }
    g += poly(vcurve, `stroke="${FIXED}" stroke-width="2"`);
    g += txt(X(-Math.PI) + 2, topV + 12, "V(θ)", { anchor: "start" });
    // Energilinja mellom vendepunktene, eller over hele bredden ved rotasjon.
    const Ec = Math.min(E, VHI - 0.04);
    let tlo = -Math.PI;
    let thi = Math.PI;
    if (E < 1) {
      const t0 = Math.acos(Math.max(-1, Math.min(1, -E)));
      tlo = -t0;
      thi = t0;
    }
    g += line(X(tlo), VY(Ec), X(thi), VY(Ec), { color: MOVING, width: 2, dash: E > VHI - 0.04 ? "5 4" : "" });
    g += txt(X(thi) + (E < 1 ? 6 : -4), VY(Ec) - 4, E > VHI - 0.04 ? "E høyere" : "E", { fill: MOVING, anchor: E < 1 ? "start" : "end" });
    if (E < 1) {
      // Vendepunktene, koblet ned til p_θ = 0 i faserommet.
      for (const t of [tlo, thi]) {
        g += line(X(t), VY(Ec), X(t), Y(0), { color: HINT, width: 1, dash: "3 4" });
        g += circle(X(t), VY(Ec), 2.6, { fill: MOVING, stroke: MOVING });
      }
    }
    // Den kinetiske energien som avstanden fra energilinja ned til kurven.
    const xe = X(th);
    const yE = VY(Ec);
    const yV = VY(-Math.cos(th));
    if (yV - yE > 4) g += line(xe, yE, xe, yV, { color: MOVING, width: 2 });
    if (yV - yE > 22) g += txt(xe + 6, (yE + yV) / 2 + 4, "T", { fill: MOVING });
    g += circle(xe, yE, 5, { fill: MOVING, stroke: MOVING });

    // ── Pendelen øverst, med opphenget over θ = 0 ──
    g += circle(gx, gy, R, { stroke: HINT, width: 1, dash: "2 3" });
    g += line(gx, gy, gx, gy + R + 4, { color: HINT, width: 1, dash: "2 3" });
    g += angleFromDown(gx, gy, 0.45 * R, th, "θ");
    g += rod(gx, gy, gx + R * Math.sin(th), gy + R * Math.cos(th), FIXED);
    g += pin(gx, gy);
    g += bob(gx + R * Math.sin(th), gy + R * Math.cos(th), 6);

    // ── Faserommet ──
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top, X(0), top + ph, { color: HINT, width: 1 });
    g += line(X(-Math.PI), top, X(-Math.PI), top + ph, { color: HINT, width: 1, dash: "2 4" });
    g += line(X(Math.PI), top, X(Math.PI), top + ph, { color: HINT, width: 1, dash: "2 4" });
    g += txt(X(-Math.PI), h - 20, "−π", { anchor: "start" });
    g += txt(X(0), h - 20, "0", { anchor: "middle" });
    g += txt(X(Math.PI), h - 20, "π", { anchor: "end" });
    g += txt(X(0), h - 4, "θ", { anchor: "middle" });
    g += sub(X(0) + 6, top + 12, "p", "θ", { anchor: "start" });

    for (const Eb of BACKGROUND) {
      for (const c of levelCurve(Eb)) {
        g += poly(toPts(c), `stroke="${HINT}" stroke-width="1.1" stroke-dasharray="4 4"`);
      }
    }
    for (const c of levelCurve(1)) {
      g += poly(toPts(c), `stroke="${DERIVED}" stroke-width="1.8"`);
    }
    g += txt(X(Math.PI) - 6, Y(-1.75), "separatrise", { fill: DERIVED, anchor: "end", size: 10 });
    g += txt(X(Math.PI) - 4, top + 14, "rotasjon", { anchor: "end", size: 11 });
    g += txt(X(0), Y(0) + 17, "svingning", { anchor: "middle", size: 10 });
    if (!tapped) g += txt(X(-Math.PI) + 6, top + ph - 6, "trykk for ny tilstand", { anchor: "start", size: 10 });

    // Likevektene: stabil i bunnpunktet, ustabil i toppunktet.
    g += circle(X(0), Y(0), 3.5, { fill: DERIVED, stroke: DERIVED });
    g += circle(X(-Math.PI), Y(0), 4, { fill: "var(--bg-elevated)", stroke: DERIVED, width: 1.8 });
    g += circle(X(Math.PI), Y(0), 4, { fill: "var(--bg-elevated)", stroke: DERIVED, width: 1.8 });

    // Kurven punktet går langs.
    const branch = E < 1 ? 0 : Math.sign(p) || 1;
    for (const c of levelCurve(E, branch)) {
      g += poly(toPts(c), `stroke="${MOVING}" stroke-width="1.8" opacity="0.5"`);
    }

    // Punktet med farten fra Hamiltons ligninger.
    const vx = p * sx;
    const vy = Math.sin(th) * sy; // −ṗ i skjermkoordinater, ṗ = −sin θ
    const vlen = Math.hypot(vx, vy);
    const px0 = X(th);
    const py0 = Y(p);
    // Pila er proporsjonal med farten, men stopper ved kanten av faserommet.
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
