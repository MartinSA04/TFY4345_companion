/**
 * Spredning i Coulombfeltet: partikler med samme energi kommer inn fra venstre
 * med jevnt fordelte støtparametere s og frastøtes av ladningen Q i sentrum.
 * Hver bane er en hyperbel, og partiklene strømmer langs dem som prikker med
 * fast tidsavstand, så de bremser opp nær Q. Den oransje stripen er partiklene
 * med støtparameter mellom s og s + ds: den viser vinkelen Θ de går ut i, og
 * hvor bredt den samme stripen spres. Θ er tegnet der de to asymptotene til
 * den nederste banen i stripen møtes, slik figuren i boka gjør det.
 *
 * Enheter: μ = 1 og |k| = 1, så en partikkel rett mot Q snur i avstanden 1/E.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  nb, rk4, slider, animate, svg, txt, line, arc, poly, bob,
  DERIVED, MOVING, LABEL, FIXED, HINT,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const X0 = -6.2; // der banene starter, utenfor venstre kant
  const R_OUT = 8.5; // der de er ferdige
  const S_FAN = []; // støtparameterne i viften
  for (let i = -8; i <= 8; i++) S_FAN.push(i * 0.3);
  const DS = 0.25; // stripens bredde
  const DOT_SPACING = 0.55; // simulert tid mellom prikkene på én bane
  const RATE = 1.5; // simulert tid per sekund
  let energy = 1;
  let sSel = 0.6;
  let dt = 0.008;
  let fan = []; // [{ s, pts: [[x, y], …] }]
  let band = []; // de to banene som avgrenser stripen
  let phase = 0;

  const f = (t, s) => {
    const r = Math.hypot(s[0], s[1]);
    const r3 = r * r * r;
    return [s[2], s[3], s[0] / r3, s[1] / r3];
  };

  /** Integrer én bane fra x = X0, y = s med fart v0 mot høyre. */
  function trajectory(s) {
    const v0 = Math.sqrt(2 * energy);
    let y = [X0, s, v0, 0];
    const pts = [[y[0], y[1]]];
    for (let i = 0; i < 6000; i++) {
      y = rk4(y, f, 0, dt);
      pts.push([y[0], y[1]]);
      const r = Math.hypot(y[0], y[1]);
      if (r > R_OUT && y[0] * y[2] + y[1] * y[3] > 0) break;
    }
    return { s, pts, vEnd: [y[2], y[3]] };
  }

  function rebuild() {
    dt = 0.008 / Math.sqrt(energy); // samme veilengde per steg uansett fart
    fan = S_FAN.map(trajectory);
    band = [trajectory(sSel), trajectory(sSel + DS)];
  }
  rebuild();

  controls.append(
    slider({
      text: "Støtparameter",
      aria: "Støtparameteren til den oransje stripen",
      min: 0.05,
      max: 2.2,
      step: 0.05,
      value: sSel,
      format: (v) => nb(v, 2),
      signal,
      onInput: (v) => {
        sSel = v;
        band = [trajectory(sSel), trajectory(sSel + DS)];
      },
    }),
    slider({
      text: "Energi",
      aria: "Partiklenes energi",
      min: 0.5,
      max: 3,
      step: 0.1,
      value: energy,
      format: (v) => nb(v, 1),
      signal,
      onInput: (v) => {
        energy = v;
        rebuild();
      },
    }),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const pad = 12;
    const sc = Math.min((w - 2 * pad) / 10.4, (h - 2 * pad) / 6.4); // piksler per lengdeenhet
    const ox = w / 2;
    const oy = h / 2;
    const px = (x) => ox + x * sc;
    const py = (y) => oy - y * sc;
    const P = (p) => [px(p[0]), py(p[1])];

    let g = "";
    // Innfallsretningen gjennom Q, stiplet.
    g += line(px(-5.2), oy, px(5.2), oy, { color: HINT, width: 1, dash: "4 4" });

    // Stripen mellom s og s + ds.
    const lo = band[0].pts;
    const hi = band[1].pts;
    if (lo.length > 1 && hi.length > 1) {
      let d = "";
      lo.forEach((p, i) => {
        const [X, Y] = P(p);
        d += `${i === 0 ? "M" : "L"} ${X.toFixed(1)} ${Y.toFixed(1)} `;
      });
      for (let i = hi.length - 1; i >= 0; i--) {
        const [X, Y] = P(hi[i]);
        d += `L ${X.toFixed(1)} ${Y.toFixed(1)} `;
      }
      g += `<path d="${d} Z" style="fill:${DERIVED};opacity:0.22"/>`;
      g += poly(lo.map(P), `stroke="${DERIVED}" stroke-width="1.4"`);
      g += poly(hi.map(P), `stroke="${DERIVED}" stroke-width="1.4"`);
    }

    // Viften av baner med prikkene som strømmer langs dem.
    const stride = Math.max(1, Math.round(DOT_SPACING / dt));
    const offset = ((Math.round(phase / dt) % stride) + stride) % stride;
    for (const tr of fan) {
      g += poly(tr.pts.map(P), `stroke="${FIXED}" stroke-width="1" opacity="0.7"`);
      for (let i = offset; i < tr.pts.length; i += stride) {
        const [X, Y] = P(tr.pts[i]);
        if (X < pad - 4 || X > w - pad + 4 || Y < -4 || Y > h + 4) continue;
        g += `<circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="2.6" style="fill:${MOVING}"/>`;
      }
    }

    // Støtparameteren: avstanden fra innfallslinja gjennom Q til stripens
    // nederste bane, målt der banen ennå er rett.
    const xs = Math.max(pad + 14, ox - 5.0 * sc);
    const ys = py(sSel);
    g += line(xs, oy, xs, ys, { color: LABEL, width: 1.2 });
    g += line(xs - 4, oy, xs + 4, oy, { color: LABEL, width: 1.2 });
    g += line(xs - 4, ys, xs + 4, ys, { color: LABEL, width: 1.2 });
    g += txt(xs + 7, (oy + ys) / 2 + 4, "s");

    // Spredningsvinkelen der de to asymptotene til den nederste banen møtes.
    const [vx, vy] = band[0].vEnd;
    const theta = Math.atan2(vy, vx);
    const last = lo[lo.length - 1];
    if (last && Math.abs(vy) > 1e-6) {
      // Skjæring mellom y = sSel og linja gjennom last med retning (vx, vy).
      const tHit = (sSel - last[1]) / vy;
      const xi = last[0] + tHit * vx;
      const [XI, YI] = P([xi, sSel]);
      if (XI > pad && XI < w - pad && YI > pad && YI < h - pad) {
        g += line(XI, YI, px(5.2), YI, { color: HINT, width: 1, dash: "4 4" });
        const ra = 26;
        g += arc(XI, YI, ra, 0, -theta, { color: DERIVED, width: 1.4 });
        const am = -theta / 2;
        g += txt(XI + (ra + 12) * Math.cos(am), YI + (ra + 12) * Math.sin(am) + 4, "Θ", { anchor: "middle", fill: DERIVED });
      } else {
        // Skjæringen er utenfor scenen: skriv vinkelen ved utgangen i stedet.
        const [XL, YL] = P(last);
        const cx = Math.min(w - pad - 30, Math.max(pad + 30, XL));
        const cy = Math.min(h - pad - 8, Math.max(pad + 14, YL));
        g += txt(cx, cy, "Θ", { anchor: "middle", fill: DERIVED });
      }
    }

    g += bob(ox, oy, 8, DERIVED);
    g += txt(ox + 12, oy + 16, "Q");

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dtReal) => {
      phase += dtReal * RATE;
      render();
    },
  });
}
