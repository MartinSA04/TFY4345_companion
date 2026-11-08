/**
 * Pionet henfaller: π⁺ → μ⁺ + ν, sett på to måter.
 *
 * Øverst går partiklene langs en linje i laboratoriet. Pionet kommer inn fra
 * venstre med farten du velger (eller ligger i ro), henfaller midt på, og myonet
 * og nøytrinoet går hver sin vei. Bare de ladde partiklene etterlater spor.
 *
 * Nederst er firerimpulsene til de tre partiklene i et diagram med pc mot høyre
 * og E opp, begge i MeV og i samme skala, så masseløse partikler ligger på
 * linjene E = |p|c (grå stiplet). Pionets og myonets firerimpuls ligger på hver
 * sin hyperbel E² − p²c² = m²c⁴. Bevaringen P_π = P_μ + P_ν er en vektorsum:
 * nøytrinoets pil går fra spissen av myonets pil til spissen av pionets.
 *
 * I pionets eget system er E_μ* = (m_π² + m_μ²)c²/2m_π og p* = (m_π² − m_μ²)c/2m_π.
 * I laboratoriet er alt boostet med pionets fart β (c = 1, MeV):
 *   E = γ(E* + β p*), p = γ(p* + β E*).
 * «Framover» sender myonet ut i pionets fartsretning, målt i pionets system.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, arrow, poly, nb, slider, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const MPI = 139.57; // MeV/c²
  const MMU = 105.66;
  const ES = (MPI * MPI + MMU * MMU) / (2 * MPI); // myonets energi i pionets system
  const PS = (MPI * MPI - MMU * MMU) / (2 * MPI); // impulsen til myonet og nøytrinoet der
  const BMAX = 0.8;
  const PI = "var(--fg)"; // pionet tegnes som legemet i ro i de andre simuleringene
  const MU = MOVING;
  const NU = DERIVED; // masseløst, som lyset i simuleringene om romtid

  let beta = 0;
  let fwd = 1; // +1: myonet framover i pionets system, −1: bakover
  const IN = 1.4; // sekunder før henfallet
  const OUT = 2.2; // sekunder etter
  const HOLD = 0.9;
  let clock = IN + OUT; // starter ferdig, så hele bildet står
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (playing) clock = 0;

  // ── kontroller ────────────────────────────────────────────────────────────
  const speed = slider({
    text: "Pionets fart",
    aria: "Pionets fart i laboratoriet, i enheter av lysfarten",
    min: 0,
    max: BMAX,
    step: 0.01,
    value: 0,
    format: (b) => `${nb(b, 2)}c`,
    signal,
    onInput: (b) => {
      beta = b;
      render();
    },
  });
  const mkBtn = (label, aria, dir) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sim-btn";
    b.textContent = label;
    b.setAttribute("aria-label", aria);
    b.setAttribute("aria-pressed", String(fwd === dir));
    b.addEventListener(
      "click",
      () => {
        fwd = dir;
        fBtn.setAttribute("aria-pressed", String(fwd === 1));
        bBtn.setAttribute("aria-pressed", String(fwd === -1));
        // Uten animasjon viser stripa hele henfallet med en gang.
        clock = playing ? 0 : IN + OUT;
        loop.start();
        render();
      },
      { signal },
    );
    return b;
  };
  const fBtn = mkBtn("Myonet framover", "Myonet sendes ut i pionets fartsretning, målt fra pionet", 1);
  const bBtn = mkBtn("Myonet bakover", "Myonet sendes ut mot pionets fartsretning, målt fra pionet", -1);
  controls.append(speed, fBtn, bBtn);

  // ── fysikk ────────────────────────────────────────────────────────────────
  function state() {
    const g = 1 / Math.sqrt(1 - beta * beta);
    const boost = (E, p) => ({ E: g * (E + beta * p), p: g * (p + beta * E) });
    const pi = boost(MPI, 0);
    const mu = boost(ES, fwd * PS);
    const nu = boost(PS, -fwd * PS);
    return { pi, mu, nu, uPi: beta, uMu: mu.p / mu.E, uNu: Math.sign(nu.p) || -fwd };
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w: W, h: H } = getSize();
    if (W < 60 || H < 60) return; // før scenen har fått mål
    const st = state();
    let g = "";

    // ── laboratoriet: sporene langs en linje ────────────────────────────────
    const STRIP = 54;
    const ty = 30; // høyden til linja partiklene går langs
    const mid = W / 2;
    const vpx = (W / 2 - 14) / OUT; // px per sekund for lysfarten
    g += line(8, ty + 14, W - 8, ty + 14, { color: HINT, width: 1 });
    const t = playing || clock < IN + OUT ? Math.min(clock, IN + OUT) - IN : OUT; // tid siden henfallet
    // Pionet: kommer inn med farten β og stopper i henfallet.
    const tp = Math.min(t, 0);
    const xStart = mid - st.uPi * vpx * IN;
    const xPi = mid + st.uPi * vpx * tp;
    if (st.uPi > 0.005) g += line(Math.max(8, xStart), ty, xPi, ty, { color: PI, width: 2.5 });
    if (t < 0) {
      g += circle(xPi, ty, 5.5, { fill: PI, stroke: "none" });
      g += txt(xPi, ty - 11, "π", { anchor: "middle", size: 13, fill: PI });
    } else {
      // Myonet setter spor, nøytrinoet ikke.
      const xMu = mid + st.uMu * vpx * t;
      const xNu = mid + st.uNu * vpx * t;
      g += line(mid, ty, xMu, ty, { color: MU, width: 2.5 });
      g += circle(mid, ty, 2.5, { fill: PI, stroke: "none" });
      g += circle(xMu, ty, 5, { fill: MU, stroke: "none" });
      g += circle(xNu, ty, 4, { fill: NU, stroke: "none" });
      const lm = Math.abs(xMu - xNu) < 22;
      g += txt(xMu, ty - 10, "μ", { anchor: "middle", size: 13, fill: MU });
      g += txt(xNu, lm ? ty + 30 : ty - 10, "ν", { anchor: "middle", size: 13, fill: NU });
    }

    // ── firerimpulsene ──────────────────────────────────────────────────────
    const P0 = -50; // minste pc på aksen, MeV (plass til navnet på pionets pil i ro)
    const P1 = 208;
    const E1 = 246;
    const top = STRIP + 14;
    const avail = H - 22 - top;
    const s = Math.min((W - 30) / (P1 - P0), avail / E1); // px per MeV, likt begge veier
    const bot = top + (avail + E1 * s) / 2; // diagrammet midt i plassen som er igjen
    const ox = (W - s * (P1 - P0)) / 2 - s * P0 + 4;
    const X = (p) => ox + p * s;
    const Y = (E) => bot - E * s;

    // Akser med merker ved 100 og 200 MeV.
    g += line(X(P0), Y(0), X(P1), Y(0), { color: FIXED, width: 1.2 });
    g += line(X(0), Y(0), X(0), Y(E1), { color: FIXED, width: 1.2 });
    // En pilspiss nær et tall på E-aksen skjuler tallet, så det tallet faller bort.
    const tips = [st.pi, st.mu].map((q) => [X(q.p), Y(q.E)]);
    for (const v of [100, 200]) {
      g += line(X(v), Y(0), X(v), Y(0) + 5, { color: FIXED, width: 1.2 });
      g += txt(X(v), Y(0) + 17, String(v), { anchor: "middle", size: 11 });
      g += line(X(0) - 5, Y(v), X(0), Y(v), { color: FIXED, width: 1.2 });
      const near = tips.some(([tx, ty]) => Math.abs(ty - Y(v)) < 15 && tx < X(0) + 4 && tx > X(0) - 40);
      if (!near) g += txt(X(0) - 8, Y(v) + 4, String(v), { anchor: "end", size: 11 });
    }
    g += txt(X(P1), Y(0) - 7, "pc", { anchor: "end" });
    g += txt(X(0) + 7, Y(E1) + 10, "E (MeV)", { anchor: "start" });
    // Masseløse partikler: E = |p|c.
    g += line(X(0), Y(0), X(Math.min(P1, E1)), Y(Math.min(P1, E1)), { color: HINT, width: 1, dash: "4 4" });
    g += line(X(0), Y(0), X(P0), Y(-P0), { color: HINT, width: 1, dash: "4 4" });
    // Hyperblene.
    const hyp = (m) => {
      const pts = [];
      for (let i = 0; i <= 90; i++) {
        const p = P0 + ((P1 - P0) * i) / 90;
        const E = Math.sqrt(p * p + m * m);
        if (E <= E1) pts.push([X(p), Y(E)]);
      }
      return pts;
    };
    g += poly(hyp(MPI), `stroke="${PI}" stroke-width="1" opacity="0.45"`);
    g += poly(hyp(MMU), `stroke="${MU}" stroke-width="1" opacity="0.6"`);

    // Pilene: π og μ fra origo, ν fra spissen av μ til spissen av π.
    const tip = (q) => [X(q.p), Y(q.E)];
    const [xp, yp] = tip(st.pi);
    const [xm, ym] = tip(st.mu);
    g += arrow(X(0), Y(0), xp, yp, PI, 2.2);
    g += arrow(X(0), Y(0), xm, ym, MU, 2.2);
    g += arrow(xm, ym, xp, yp, NU, 2.2);

    // Navn og energi ved hver pil. Hvert navn prøver flere plasser langs pila,
    // først på utsiden av trekanten, og tar den første som ikke treffer en pil,
    // en hyperbel, et tall på aksene eller et navn som allerede står.
    const O = [X(0), Y(0)];
    const segs = [[O, [xp, yp]], [O, [xm, ym]], [[xm, ym], [xp, yp]]];
    const pts = [...hyp(MPI), ...hyp(MMU)];
    const boxes = [];
    // Tallene på E-aksen og navnene på hyperblene står fast.
    for (const v of [100, 200]) boxes.push({ x0: X(0) - 34, x1: X(0) - 6, y0: Y(v) - 7, y1: Y(v) + 6 });
    const hitsSeg = (r, [[x1, y1], [x2, y2]]) => {
      const n = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 3) + 1;
      for (let i = 0; i <= n; i++) {
        const x = x1 + ((x2 - x1) * i) / n;
        const y = y1 + ((y2 - y1) * i) / n;
        if (x > r.x0 - 2 && x < r.x1 + 2 && y > r.y0 - 2 && y < r.y1 + 2) return true;
      }
      return false;
    };
    const clash = (r) =>
      r.x0 < 2 || r.x1 > W - 2 || r.y0 < top || r.y1 > Y(0) - 2 ||
      segs.some((sg) => hitsSeg(r, sg)) ||
      pts.some(([x, y]) => x > r.x0 - 1 && x < r.x1 + 1 && y > r.y0 - 1 && y < r.y1 + 1) ||
      boxes.some((q) => r.x0 < q.x1 + 3 && r.x1 > q.x0 - 3 && r.y0 < q.y1 + 2 && r.y1 > q.y0 - 2);
    const place = (s0, color, [ax, ay], [bx, by], side) => {
      const w = 7.2 * s0.length;
      const cands = [];
      for (const t of [0.5, 0.35, 0.65, 0.2, 0.8]) {
        const x = ax + t * (bx - ax);
        const y = ay + t * (by - ay);
        // Pilene heller oppover, så et navn til høyre flyttes litt ned og et til venstre litt opp, bort fra pila.
        for (const sd of [side, -side]) cands.push(sd > 0 ? { x: x + 10, y: y + 14, a: "start" } : { x: x - 10, y: y - 4, a: "end" });
      }
      cands.push({ x: bx, y: by - 12, a: "middle" }, { x: bx + 10, y: by + 4, a: "start" }, { x: bx - 10, y: by + 4, a: "end" });
      const rect = (c) => {
        const x0 = c.a === "start" ? c.x : c.a === "end" ? c.x - w : c.x - w / 2;
        return { x0, x1: x0 + w, y0: c.y - 10, y1: c.y + 3 };
      };
      const c = cands.find((k) => !clash(rect(k))) ?? cands[0];
      boxes.push(rect(c));
      return txt(c.x, c.y, s0, { fill: color, anchor: c.a });
    };
    // Myonets pil heller mer enn pionets når myonet går fortere mot høyre; utsiden er da til høyre for myonet.
    const muOut = st.mu.p / st.mu.E >= st.pi.p / st.pi.E ? 1 : -1;
    g += place(`ν ${nb(st.nu.E, 1)}`, NU, [xm, ym], [xp, yp], st.nu.p > 0 ? -1 : 1);
    g += place(`μ ${nb(st.mu.E, 1)}`, MU, O, [xm, ym], muOut);
    g += place(`π ${nb(st.pi.E, 1)}`, PI, O, [xp, yp], -muOut);
    // Hyperblene får navn der det er god plass: helst ved høyre ende, ellers ved venstre,
    // og aldri tett inntil et navn på en pil, så navnene ikke stables oppå hverandre.
    const curveLabel = (m, s0, color) => {
      const spots = [];
      for (const p of [P1 - 14, 150, P0 + 6, 70]) {
        const E = Math.sqrt(p * p + m * m);
        if (E > E1) continue;
        spots.push({ x: X(p) - 8, y: Y(E) - 6, a: "end" }, { x: X(p) + 6, y: Y(E) + 15, a: "start" });
      }
      const rect = (c) => (c.a === "end" ? { x0: c.x - 9, x1: c.x, y0: c.y - 11, y1: c.y + 3 } : { x0: c.x, x1: c.x + 9, y0: c.y - 11, y1: c.y + 3 });
      const roomy = (r) => !clash(r) && !boxes.some((q) => r.x0 < q.x1 + 14 && r.x1 > q.x0 - 14 && r.y0 < q.y1 + 12 && r.y1 > q.y0 - 12);
      const c = spots.find((k) => roomy(rect(k))) ?? spots.find((k) => !clash(rect(k))) ?? spots[0];
      boxes.push(rect(c));
      return txt(c.x, c.y, s0, { fill: color, size: 13, anchor: c.a });
    };
    g += curveLabel(MPI, "π", PI);
    g += curveLabel(MMU, "μ", MU);

    stage.innerHTML = svg(W, H, g);
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  onResize(render);
  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      clock += dt;
      if (clock > IN + OUT + HOLD) clock = 0;
      render();
    },
  });
  render();
}
