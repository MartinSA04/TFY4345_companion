/**
 * Dytt oscillatoren: en kloss i en fjær fra et fast oppheng, med en penn som
 * skriver klossens utslag x på et papir som trekkes forbi mot venstre. Det
 * nyeste står ved pennen, det eldste lengst til venstre, og de tynne
 * loddrette linjene på papiret står én periode fra hverandre.
 *
 * Hvert dytt er et kort kraftstøt oppover med samme styrke. Det tegnes som en
 * oransje pil under klossen idet det skjer og som en oransje prikk på
 * likevektslinja på papiret. Den stiplede oransje kurven fra prikken er
 * responsen dette dyttet ville gitt alene, G_R(t − t′), og den heltrukne kurven
 * er det klossen faktisk gjør, summen av alle dyttenes responser.
 *
 * Bevegelsen regnes ut eksakt som en sum av responser (ingen integrator):
 * x(t) = Σ A·(ω₀/ω₁)·e^{−α(t − t_k)} sin(ω₁(t − t_k)) for t > t_k, med
 * ω₁ = √(ω₀² − α²). Én periode er 1,6 s.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import { animate, slider, button, nb, svg, txt, line, circle, arrow, poly, FIXED, MOVING, DERIVED, HINT, LABEL } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const T0 = 1.6; // periode uten friksjon, s
  const W0 = (2 * Math.PI) / T0;
  const SPAN = 4 * T0; // så mye tid papiret viser
  const KICK_SHOW = 0.35; // så lenge pila under klossen vises, s

  let alpha = 0; // α/ω₀
  let t = 2.4;
  let kicks = [{ t: 0.9 }]; // et dytt som allerede har skjedd, så bildet ikke er tomt
  let pending = []; // planlagte dytt i en serie

  const w1 = () => W0 * Math.sqrt(Math.max(0, 1 - alpha * alpha));
  // Responsen på ett dytt, i enheter av utslaget A ett dytt gir uten friksjon.
  function G(tau) {
    if (tau <= 0) return 0;
    const a = alpha * W0;
    const om = w1();
    return (W0 / om) * Math.exp(-a * tau) * Math.sin(om * tau);
  }
  const x = (s) => kicks.reduce((sum, k) => sum + G(s - k.t), 0);
  // Utslaget svingningen har nå (omhyllingen), i enheter av A: lengden av summen av dyttenes viserne.
  function envelope() {
    const a = alpha * W0;
    const om = w1();
    let re = 0;
    let im = 0;
    for (const k of kicks) {
      const tau = t - k.t;
      if (tau <= 0) continue;
      const d = Math.exp(-a * tau);
      re += d * Math.cos(om * tau);
      im += d * Math.sin(om * tau);
    }
    return (W0 / om) * Math.hypot(re, im);
  }
  // Tegningen har plass til tre dytts utslag. Er svingningen større enn to, kunne ett dytt til
  // sendt klossen ut av bildet, så «Dytt» er av til svingningen er mindre eller nullstilt.
  const MAX_ENV = 2.05;

  // ── kontroller ────────────────────────────────────────────────────────────
  const kickNow = () => {
    kicks.push({ t });
    prune();
    anim.start();
  };
  // En serie starter fra ro, så papiret viser bare de tre dyttene.
  const series = (gap) => {
    kicks = [];
    pending = [0, 1, 2].map((k) => t + 0.4 + k * gap * T0);
    anim.start();
  };
  const bKick = button("Dytt", "Gi klossen ett dytt oppover nå", kickNow, signal);
  const bOne = button("Tre dytt, én periode imellom", "Fra ro: tre dytt med én periode mellom hvert", () => series(1), signal);
  const bHalf = button("Tre dytt, 1,5 periode imellom", "Fra ro: tre dytt med halvannen periode mellom hvert", () => series(1.5), signal);
  const bReset = button(
    "Nullstill",
    "Klossen i ro og papiret blankt",
    () => {
      kicks = [];
      pending = [];
      syncKick();
      render();
    },
    signal,
  );
  const fr = slider({
    text: "Demping α/ω₀",
    aria: "Dempingen, alfa delt på omega null",
    min: 0,
    max: 0.1,
    step: 0.01,
    value: alpha,
    format: (v) => nb(v, 2),
    signal,
    onInput: (v) => {
      alpha = v;
      render();
    },
  });
  controls.append(bKick, bOne, bHalf, bReset, fr);
  const syncKick = () => {
    const off = envelope() > MAX_ENV;
    if (bKick.disabled !== off) bKick.disabled = off;
  };

  function prune() {
    // Dytt som er så gamle at de har falt av papiret, men fortsatt bidrar uten friksjon,
    // må beholdes; bare dytt som har dødd helt ut, kan fjernes.
    const a = alpha * W0;
    if (a > 0) kicks = kicks.filter((k) => Math.exp(-a * (t - k.t)) > 1e-4);
    if (kicks.length > 60) kicks = kicks.slice(-60);
  }

  // ── tegning ───────────────────────────────────────────────────────────────
  function spring(xc, y1, y2, coils = 9, half = 8) {
    const pts = [[xc, y1]];
    const lead = 6;
    const a = y1 + lead;
    const b = y2 - lead;
    const n = coils * 2;
    for (let i = 1; i < n; i++) pts.push([xc + (i % 2 ? half : -half), a + ((b - a) * i) / n]);
    pts.push([xc, b], [xc, y2]);
    return poly(pts, `stroke="${FIXED}" stroke-width="1.6" stroke-linejoin="round"`);
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const y0 = h / 2 + 8; // likevekten midt på klossen
    const A = Math.min(40, (h / 2 - 50) / 3); // utslaget ett dytt gir, px
    const xs = w - 26; // fjæra og klossen
    const bw = 28;
    const bh = 24;
    const xp = xs - bw / 2 - 12; // papirets høyre kant, der pennen skriver
    const xl = 6;
    const pxs = (xp - xl) / SPAN; // px per sekund
    const top = 8;
    const yb = y0 - x(t) * A; // klossens midte
    const Y = (s) => y0 - x(s) * A;
    let g = "";

    // Papiret med periodestreker og likevektslinja.
    g += `<rect x="${xl}" y="${top + 12}" width="${(xp - xl).toFixed(1)}" height="${(h - top - 16).toFixed(1)}" style="fill:var(--bg-elevated)" stroke="${HINT}" stroke-width="1"/>`;
    g += `<clipPath id="dytt-papir"><rect x="${xl}" y="${top + 12}" width="${(xp - xl).toFixed(1)}" height="${(h - top - 16).toFixed(1)}"/></clipPath>`;
    for (let k = Math.ceil((t - SPAN) / T0); k * T0 <= t; k++) {
      const px = xp - (t - k * T0) * pxs;
      g += line(px, top + 12, px, h - 4, { color: HINT, width: 1, opacity: 0.6 });
    }
    g += line(xl, y0, xp, y0, { color: HINT, width: 1, dash: "4 4" });

    let clip = "";
    // Hvert dytts egen respons, stiplet oransje, og prikken der dyttet kom.
    const n = 140;
    for (const k of kicks) {
      if (k.t < t - SPAN - 0.01 && alpha > 0 && Math.exp(-alpha * W0 * (t - k.t)) < 0.01) continue;
      const s0 = Math.max(k.t, t - SPAN);
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const s = s0 + ((t - s0) * i) / n;
        pts.push([xp - (t - s) * pxs, y0 - G(s - k.t) * A]);
      }
      if (kicks.length > 1) clip += poly(pts, `stroke="${DERIVED}" stroke-width="1.3" stroke-dasharray="4 3" opacity="0.9"`);
      if (k.t >= t - SPAN) clip += circle(xp - (t - k.t) * pxs, y0, 3.2, { fill: DERIVED, stroke: DERIVED, width: 1 });
    }
    // Det klossen faktisk gjør.
    const pts = [];
    for (let i = 0; i <= 2 * n; i++) {
      const s = t - SPAN + (SPAN * i) / (2 * n);
      pts.push([xp - (t - s) * pxs, Y(s)]);
    }
    clip += poly(pts, `stroke="${MOVING}" stroke-width="2.4" stroke-linejoin="round"`);
    g += `<g clip-path="url(#dytt-papir)">${clip}</g>`;

    // Opphenget, fjæra, klossen og pennen.
    g += line(xs - 18, top, xs + 18, top, { width: 2 });
    for (let u = -14; u <= 18; u += 7) g += line(xs + u, top, xs + u - 5, top - 6, { width: 1 });
    g += spring(xs, top, yb - bh / 2);
    g += `<rect x="${(xs - bw / 2).toFixed(1)}" y="${(yb - bh / 2).toFixed(1)}" width="${bw}" height="${bh}" rx="3" style="fill:${MOVING}"/>`;
    g += line(xs - bw / 2, yb, xp, yb, { color: MOVING, width: 2 });
    g += circle(xp, yb, 2.6, { fill: MOVING, stroke: MOVING, width: 1 });

    // Pila for et dytt som skjer nå.
    const last = kicks.length ? kicks[kicks.length - 1] : null;
    if (last && t - last.t < KICK_SHOW) {
      const yB = yb + bh / 2;
      g += arrow(xs, yB + 34, xs, yB + 4, DERIVED, 2.6);
    }
    g += txt(xp - 4, h - 8, "nå", { anchor: "end" });
    g += arrow(xl + 6, h - 12, xl + 40, h - 12, LABEL, 1.2);
    g += txt(xl + 46, h - 8, "t");

    stage.innerHTML = svg(w, h, g);
  }

  const anim = animate({
    stage,
    signal,
    onFrame: (dt) => {
      t += dt;
      while (pending.length && pending[0] <= t) {
        kicks.push({ t: pending.shift() });
      }
      prune();
      syncKick();
      render();
    },
  });
  onResize(render);
  render();
}
