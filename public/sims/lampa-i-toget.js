/**
 * Lampa i toget: ei togvogn kjører med 0,6c forbi en perrong, og lampa midt i
 * taket blinker. Lyset går like fort begge veier og treffer bakveggen og
 * framveggen. Du velger hvor fort du selv beveger deg langs perrongen, og
 * alt tegnes i ditt eget system.
 *
 * Øverst er romtidsdiagrammet i systemet ditt, med ct opp og x mot høyre i
 * samme skala, så lyset går på skrå 45°. De to heltrukne linjene er
 * verdenslinjene til veggene, den stiplede midt mellom er lampa, og de
 * oransje linjene er lyset fra blinket fram til treffene. Gjennom hvert
 * treff går en stiplet vannrett linje, så du ser hvilket som kommer først.
 * Den tynne linja som går oppover, er «nå»; under diagrammet står vogna og
 * perrongen slik de er nå, med samme x-akse, så vogna er et vannrett snitt
 * gjennom diagrammet.
 *
 * Alle hendelser er regnet med Lorentz-transformasjonen fra vognas eget
 * system, der vogna har lengden L₀ og blinket skjer i origo. I systemet ditt
 * har vogna farten w = (v − u)/(1 − uv/c²), og perrongen farten −u.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, svg, txt, line, circle, nb, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const V = 0.6; // vognas fart langs perrongen, i enheter av c
  const T0 = -0.3; // «nå» starter her (ct, i enheter av L₀) …
  const T1 = 1.25; // … og går hit
  const RUN = 4.5; // sekunder fra T0 til T1
  const HOLD = 1.4; // sekunder i ro før «nå» starter på nytt
  const XR = 1.32; // halv bredde på diagrammet, i L₀
  const POST = 0.55; // avstanden mellom stolpene på perrongen, i perrongens eget system, i L₀

  let u = 0; // din fart, i enheter av c
  let clock = RUN; // sekunder inn i syklusen; starter ferdig, så hele bildet står
  let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (playing) clock = 0;

  // ── kontroller ────────────────────────────────────────────────────────────
  const label = document.createElement("label");
  label.append("Din fart ");
  const out = document.createElement("output");
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = "0.9";
  input.step = "0.01";
  input.value = "0";
  input.setAttribute("aria-label", "Din fart langs perrongen, i enheter av lysfarten");
  label.append(out, input);
  const show = () => {
    const s = `${nb(u, 2)}c`;
    out.textContent = Math.abs(u) < 0.005 ? `${s}, som perrongen` : Math.abs(u - V) < 0.005 ? `${s}, som toget` : s;
  };
  input.addEventListener(
    "input",
    () => {
      u = Number(input.value);
      show();
      render();
    },
    { signal },
  );
  show();
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "sim-btn";
  playBtn.textContent = playing ? "Pause" : "Spill av";
  controls.append(label, playBtn);

  // ── fysikk ────────────────────────────────────────────────────────────────
  // Vognas fart w i systemet ditt, og hendelsene der (c = 1, lengder i L₀).
  function scene() {
    const w = (V - u) / (1 - u * V);
    const g = 1 / Math.sqrt(1 - w * w);
    const half = 0.5 / g; // halve vognlengden i systemet ditt
    const tb = half / (1 + w); // lyset møter bakveggen: −t = −half + w t
    const tf = half / (1 - w); // lyset møter framveggen: t = half + w t
    return { w, g, half, back: { t: tb, x: -tb }, front: { t: tf, x: tf } };
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w: W, h: H } = getSize();
    if (W < 60 || H < 60) return; // før scenen har fått mål
    const sc = scene();
    const STRIP = 66; // høyden til vogna og perrongen under diagrammet
    const top = 18;
    const bottom = H - STRIP - 14; // diagrammets nederste kant
    const s = Math.min((W - 24) / (2 * XR), (bottom - top) / (T1 - T0)); // px per L₀, likt i begge retninger
    const cx = W / 2;
    const X = (x) => cx + x * s;
    const Y = (t) => bottom - (t - T0) * s;
    const xl = X(-XR);
    const xr = X(XR);
    const yTop = Y(T1);
    const now = playing || clock < RUN ? T0 + (Math.min(clock, RUN) / RUN) * (T1 - T0) : T1;
    let g = "";

    // Akser i systemet ditt, og lyskjeglen til blinket stiplet.
    g += line(xl, Y(0), xr, Y(0), { color: HINT, width: 1 });
    g += line(cx, Y(T0), cx, yTop, { color: HINT, width: 1 });
    g += txt(xr - 2, Y(0) - 6, "x", { anchor: "end" });
    g += txt(cx - 6, yTop + 10, "ct", { anchor: "end" });
    const cone = Math.min(T1, XR);
    g += line(cx, Y(0), X(cone), Y(cone), { color: HINT, width: 1, dash: "3 4" });
    g += line(cx, Y(0), X(-cone), Y(cone), { color: HINT, width: 1, dash: "3 4" });

    // Verdenslinjene: veggene heltrukne, lampa stiplet midt mellom.
    const wl = (x0, t) => x0 + sc.w * t;
    const wall = (x0) => line(X(wl(x0, T0)), Y(T0), X(wl(x0, T1)), Y(T1), { color: FIXED, width: 2 });
    g += wall(-sc.half) + wall(sc.half);
    g += line(X(wl(0, T0)), Y(T0), X(wl(0, T1)), Y(T1), { color: HINT, width: 1.2, dash: "5 4" });

    // Lyset fra blinket til treffene, og en vannrett linje gjennom hvert treff.
    for (const e of [sc.back, sc.front]) {
      g += line(xl, Y(e.t), xr, Y(e.t), { color: DERIVED, width: 1, dash: "2 4", opacity: 0.8 });
    }
    g += line(cx, Y(0), X(sc.back.x), Y(sc.back.t), { color: DERIVED, width: 2.2 });
    g += line(cx, Y(0), X(sc.front.x), Y(sc.front.t), { color: DERIVED, width: 2.2 });
    g += circle(cx, Y(0), 4.5, { fill: DERIVED, stroke: "none" });
    for (const e of [sc.back, sc.front]) g += circle(X(e.x), Y(e.t), 5, { fill: DERIVED, stroke: "none" });
    g += txt(cx + 8, Y(0) + 14, "blink", { fill: DERIVED });
    // Treffene får navn på utsiden av prikken, eller over den når det ikke er plass.
    const tag = (e, s0, side) => {
      const px = X(e.x);
      const py = Y(e.t);
      const wtxt = 7.3 * s0.length;
      const fits = side < 0 ? px - 9 - wtxt > 2 : px + 9 + wtxt < W - 2;
      // Over den prikkede linja gjennom treffet, så linja ikke går gjennom navnet.
      if (fits) return txt(px + side * 8, py - 7, s0, { fill: DERIVED, anchor: side < 0 ? "end" : "start" });
      return txt(px - side * 4, py - 9, s0, { fill: DERIVED, anchor: side < 0 ? "start" : "end" });
    };
    g += tag(sc.back, "bak", -1) + tag(sc.front, "foran", 1);

    // «Nå» i systemet ditt.
    g += line(xl, Y(now), xr, Y(now), { color: MOVING, width: 1.2, opacity: 0.85 });
    for (const x0 of [-sc.half, sc.half]) g += circle(X(wl(x0, now)), Y(now), 3, { fill: MOVING, stroke: "none" });

    // ── vogna og perrongen nå, med samme x-akse ─────────────────────────────
    const rail = H - 8;
    g += line(0, rail, W, rail, { color: FIXED, width: 2 });
    // Stolpene står i ro på perrongen: farten −u og avstanden forkortet med γ_u.
    const gu = 1 / Math.sqrt(1 - u * u);
    const sp = POST / gu;
    const off = (((-u * now) % sp) + sp) % sp;
    for (let x = -XR - sp + off; x <= XR + sp; x += sp) {
      const px = X(x);
      if (px < -4 || px > W + 4) continue;
      g += line(px, rail, px, rail - STRIP + 14, { color: HINT, width: 2 });
    }
    // Vogna: kasse med gulv og hjul, lampa i taket midt på.
    const xa = X(wl(-sc.half, now));
    const xb = X(wl(sc.half, now));
    const yRoof = rail - STRIP + 22;
    const yFloor = rail - 9;
    g += `<rect x="${xa.toFixed(1)}" y="${yRoof.toFixed(1)}" width="${(xb - xa).toFixed(1)}" height="${(yFloor - yRoof).toFixed(1)}" rx="4" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="2"/>`;
    for (const f of [0.18, 0.82]) {
      g += circle(xa + f * (xb - xa), rail - 4.5, 4.5, { fill: "var(--bg-elevated)", stroke: FIXED, width: 1.5 });
    }
    const xm = (xa + xb) / 2;
    const yLamp = yRoof + 6;
    const flashed = now >= 0;
    g += circle(xm, yLamp, 4, { fill: flashed ? DERIVED : "var(--bg-elevated)", stroke: FIXED, width: 1.5 });
    // Lyset på vei, og veggene lyser når lyset har kommet fram.
    if (flashed) {
      if (now < sc.back.t) g += circle(X(-now), yLamp + 10, 3.5, { fill: DERIVED, stroke: "none" });
      if (now < sc.front.t) g += circle(X(now), yLamp + 10, 3.5, { fill: DERIVED, stroke: "none" });
    }
    if (now >= sc.back.t) g += line(xa, yRoof + 2, xa, yFloor - 2, { color: DERIVED, width: 4 });
    if (now >= sc.front.t) g += line(xb, yRoof + 2, xb, yFloor - 2, { color: DERIVED, width: 4 });

    stage.innerHTML = svg(W, H, g);
  }

  // ── animasjon ─────────────────────────────────────────────────────────────
  onResize(render);
  render();
  const loop = animate({
    stage,
    signal,
    running: () => playing,
    onFrame: (dt) => {
      clock += dt;
      if (clock > RUN + HOLD) clock = 0;
      render();
    },
  });
  playBtn.addEventListener(
    "click",
    () => {
      playing = !playing;
      playBtn.textContent = playing ? "Pause" : "Spill av";
      if (playing) loop.start();
    },
    { signal },
  );
}
