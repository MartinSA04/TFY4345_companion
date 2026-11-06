/**
 * Tvillingene: Ida blir på jorda, og Jon reiser til et punkt P og tilbake. Alt
 * er tegnet i Idas system, med tid i år og avstand i lysår, så lyset går på
 * skrå 45° (c = 1 lysår per år).
 *
 * Avreisen er i origo og møtet ti år senere på jorda. Jon kan bare snu i
 * en hendelse han kan nå fra avreisen og komme tilbake fra til møtet uten å gå fortere
 * enn lyset, altså inne i ruta mellom lyskjeglene til avreisen og møtet (stiplet). Dra
 * P, eller trykk et sted i ruta.
 *
 * Prikkene på verdenslinjene er klokkeslag: én prikk for hvert år klokka
 * til tvillingen viser. Langs et rett stykke med farten u viser klokka
 * Δτ = √(Δt² − Δx²/c²), intervallet delt på c.
 *
 * «Jons nå» tegner linjene som er samtidige med snuingen i de to systemene
 * Jon er i: utreisens og hjemreisens. Der linjene treffer Idas verdenslinje,
 * står hva Idas klokke viser «samtidig» med snuingen, sett fra Jon før og
 * etter.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { svg, txt, line, circle, nb, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const T = 10; // år mellom avreise og møte, i Idas system
  const P0 = { t: 5, x: 4 }; // standardturen: 4 lysår ut med 0,8c
  const XR = 5.5; // halv bredde, lysår
  const TMIN = -0.5;
  const TMAX = 10.9;
  const MAXB = 0.97; // høyeste fart en etappe kan få

  let P = { ...P0 };
  let showNow = false;
  let dragged = false; // skjul «dra»-hintet etter første flytt
  let geo = null; // siste skala, for pekeren
  const IDA = "var(--fg)"; // Ida står i ro og tegnes som de faste legemene i de andre simuleringene

  // ── kontroller ────────────────────────────────────────────────────────────
  const nowBtn = document.createElement("button");
  nowBtn.type = "button";
  nowBtn.className = "sim-btn";
  nowBtn.textContent = "Jons nå";
  nowBtn.setAttribute("aria-label", "Vis linjene Jon regner som samtidige med snuingen");
  nowBtn.setAttribute("aria-pressed", "false");
  nowBtn.addEventListener(
    "click",
    () => {
      showNow = !showNow;
      nowBtn.setAttribute("aria-pressed", String(showNow));
      render();
    },
    { signal },
  );
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "sim-btn";
  resetBtn.textContent = "4 lysår med 0,8c";
  resetBtn.setAttribute("aria-label", "Sett snuingen tilbake til 4 lysår unna etter 5 år");
  resetBtn.addEventListener(
    "click",
    () => {
      P = { ...P0 };
      render();
    },
    { signal },
  );
  controls.append(nowBtn, resetBtn);

  // Hold P inne i ruta, så ingen etappe går fortere enn MAXB.
  function clampP(t, x) {
    const tc = Math.min(T - 0.05, Math.max(0.05, t));
    const lim = MAXB * Math.min(tc, T - tc);
    return { t: tc, x: Math.max(-lim, Math.min(lim, x)) };
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function render() {
    const { w: W, h: H } = getSize();
    if (W < 60 || H < 60) return; // før scenen har fått mål
    const s = Math.min((W - 16) / (2 * XR), (H - 20) / (TMAX - TMIN)); // px per lysår = px per år
    const cx = W / 2;
    const y0 = H - 10;
    const X = (x) => cx + x * s;
    const Y = (t) => y0 - (t - TMIN) * s;
    geo = { s, cx, y0, X, Y };
    let g = "";

    // Lyskjeglene til avreisen og møtet: ruta der Jon kan snu.
    const dia = `M ${X(0)} ${Y(0)} L ${X(T / 2)} ${Y(T / 2)} L ${X(0)} ${Y(T)} L ${X(-T / 2)} ${Y(T / 2)} Z`;
    g += `<path d="${dia}" style="fill:var(--border);fill-opacity:0.18" stroke="${HINT}" stroke-width="1.2" stroke-dasharray="3 4"/>`;
    const side = P.x >= 0 ? 1 : -1; // Jon snur på denne siden; Idas etiketter står på den andre

    // Ida: rett opp langs jorda.
    g += line(X(0), Y(0), X(0), Y(T), { color: IDA, width: 2 });
    for (let k = 1; k < T; k++) g += circle(X(0), Y(k), 2.8, { fill: IDA, stroke: "none" });

    // Jon: A → P → B, med et klokkeslag for hvert år egentid.
    const legs = [
      [{ t: 0, x: 0 }, P],
      [P, { t: T, x: 0 }],
    ];
    const tau = legs.map(([a, b]) => Math.sqrt((b.t - a.t) ** 2 - (b.x - a.x) ** 2));
    const total = tau[0] + tau[1];
    for (const [a, b] of legs) g += line(X(a.x), Y(a.t), X(b.x), Y(b.t), { color: MOVING, width: 2.5 });
    for (let k = 1; k < total - 1e-9; k++) {
      const [a, b] = k <= tau[0] ? legs[0] : legs[1];
      const f = k <= tau[0] ? k / tau[0] : (k - tau[0]) / tau[1];
      g += circle(X(a.x + f * (b.x - a.x)), Y(a.t + f * (b.t - a.t)), 3, { fill: MOVING, stroke: "none" });
    }
    // Farten på hver etappe, skrevet midt på etappen på utsiden.
    legs.forEach(([a, b], i) => {
      const u = Math.abs((b.x - a.x) / (b.t - a.t));
      if (Math.abs(P.x) < 0.6) return;
      const mx = X((a.x + b.x) / 2) + side * 8;
      const my = Y((a.t + b.t) / 2) + (i === 0 ? 10 : -2);
      g += txt(mx, my, `${nb(u, 2)}c`, { anchor: side > 0 ? "start" : "end", size: 11 });
    });

    // Jons nå ved snuingen: samtidighetslinjene i utreisens og hjemreisens system.
    if (showNow && Math.abs(P.x) > 0.05) {
      const u1 = P.x / P.t;
      const u2 = -P.x / (T - P.t);
      const hit = [P.t - u1 * P.x, P.t - u2 * P.x]; // der linjene treffer x = 0
      for (const th of hit) {
        g += line(X(P.x), Y(P.t), X(0), Y(th), { color: DERIVED, width: 1.5, dash: "5 4" });
        g += circle(X(0), Y(th), 4, { fill: DERIVED, stroke: "none" });
      }
      // Tidene på Idas klokke; ligger de for tett, står de på én linje.
      const lab = (th, dy) => txt(X(0) - side * 8, Y(th) + dy, `${nb(th, 1)} år`, { fill: DERIVED, anchor: side > 0 ? "end" : "start" });
      if ((hit[1] - hit[0]) * s >= 16) g += lab(hit[0], 4) + lab(hit[1], 4);
      else g += txt(X(0) - side * 8, Y((hit[0] + hit[1]) / 2) + 4, `${nb(hit[0], 1)} og ${nb(hit[1], 1)} år`, { fill: DERIVED, anchor: side > 0 ? "end" : "start" });
    }

    // Det klokkene viser ved møtet, på hver sin side av møtepunktet.
    g += txt(X(0) - side * 8, Y(T) - 3, `Ida ${nb(T, 1)} år`, { fill: IDA, anchor: side > 0 ? "end" : "start" });
    // Rett ved Idas linje er Jons tid så vidt under 10 år; to desimaler viser at den er mindre.
    const jonTxt = total < T - 1e-9 && total > T - 0.05 ? nb(total, 2) : nb(total, 1);
    g += txt(X(0) + side * 8, Y(T) - 3, `Jon ${jonTxt} år`, { fill: MOVING, anchor: side > 0 ? "start" : "end" });

    // Snuingen P, med et usynlig håndtak som ikke ruller sida når du drar.
    g += circle(X(P.x), Y(P.t), 6.5, { fill: "var(--bg-elevated)", stroke: MOVING, width: 2.5 });
    g += txt(X(P.x) + side * 14, Y(P.t) + 12, "P", { anchor: side > 0 ? "start" : "end" });
    if (!dragged) g += txt(X(P.x) - side * 12, Y(P.t) + 4, "dra", { anchor: side > 0 ? "end" : "start", size: 11 });
    g += `<circle cx="${X(P.x).toFixed(1)}" cy="${Y(P.t).toFixed(1)}" r="24" style="fill:transparent;touch-action:none;cursor:grab"/>`;

    stage.innerHTML = svg(W, H, g);
  }

  // ── peker ─────────────────────────────────────────────────────────────────
  let dragging = false;
  function toModel(ev) {
    const r = stage.getBoundingClientRect();
    const px = ev.clientX - r.left;
    const py = ev.clientY - r.top;
    return { t: (geo.y0 - py) / geo.s + TMIN, x: (px - geo.cx) / geo.s };
  }
  function moveTo(ev) {
    const m = toModel(ev);
    P = clampP(m.t, m.x);
    dragged = true;
    render();
  }
  stage.addEventListener(
    "pointerdown",
    (ev) => {
      if (!geo) return;
      const r = stage.getBoundingClientRect();
      const d = Math.hypot(ev.clientX - r.left - geo.X(P.x), ev.clientY - r.top - geo.Y(P.t));
      if (d <= 26) {
        dragging = true;
        stage.setPointerCapture(ev.pointerId);
        ev.preventDefault();
      }
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (ev) => {
      if (dragging) moveTo(ev);
    },
    { signal },
  );
  const stop = () => {
    dragging = false;
  };
  stage.addEventListener("pointerup", stop, { signal });
  stage.addEventListener("pointercancel", stop, { signal });
  stage.addEventListener(
    "click",
    (ev) => {
      if (!geo) return;
      const m = toModel(ev);
      // Bare trykk inne i ruta flytter P.
      if (m.t > 0 && m.t < T && Math.abs(m.x) < Math.min(m.t, T - m.t)) moveTo(ev);
    },
    { signal },
  );

  onResize(render);
  render();
}
