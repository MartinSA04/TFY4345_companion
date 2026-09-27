/**
 * Det lineære treatomige molekylet m–M–m med to like fjærer, bare bevegelse
 * langs aksen. Øverst molekylet selv, under det de tre normalmodene bevegelsen
 * er summen av: translasjonen (ω = 0), den symmetriske (A = (1, 0, −1),
 * ω² = k/m) og den antisymmetriske (A = (1, −2m/M, 1), ω² = (k/m)(1 + 2m/M)).
 * Radene har samme skala, så hvert atom øverst står rett over summen av
 * utslagene til det samme atomet i radene under. De stiplede loddlinjene er
 * likevektsposisjonene. Molekylet slippes fra ro, så translasjonen står stille,
 * og massesenteret (oransje) med den.
 *
 * Enheter: utslag i andeler av likevektsavstanden, √(k/m) valgt så den
 * symmetriske perioden er 1,6 s. Kontrakt: default-eksportert init(api),
 * api = { stage, controls, getSize, onResize, signal }.
 */
import { nb, slider, button, animate, svg, txt, line, cross, MOVING, HINT, LABEL, FIXED } from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const W0 = (2 * Math.PI) / 1.6; // √(k/m)
  const MAXD = 0.3; // største utslag et atom kan dras, i andeler av avstanden
  const AMP = 0.25; // utslaget knappene starter med
  let ratio = 0.75; // M/m, CO₂ har 12/16
  let kind = "ett"; // "sym", "anti", "ett" eller "fri"
  let eta0 = [AMP, 0, 0]; // startutslag, fra ro
  let shift = 0; // translasjonsdelen, massesenterets forskyvning
  let amp = [0, 0]; // ξ(0) for den symmetriske og den antisymmetriske moden
  let t = 0;
  let drag = -1; // atomet som dras, eller −1
  let geom = null;

  const masses = () => [1, ratio, 1];
  const modes = () => [
    [1, 0, -1],
    [1, -2 / ratio, 1],
  ];
  const omegas = () => [W0, W0 * Math.sqrt(1 + 2 / ratio)];

  /** Del startutslaget i normalmoder: ξₙ(0) = Aₙ·Tη(0) / Aₙ·TAₙ. */
  function project() {
    const m = masses();
    shift = (m[0] * eta0[0] + m[1] * eta0[1] + m[2] * eta0[2]) / (m[0] + m[1] + m[2]);
    amp = modes().map((A) => {
      let num = 0;
      let den = 0;
      for (let i = 0; i < 3; i++) {
        num += A[i] * m[i] * eta0[i];
        den += A[i] * m[i] * A[i];
      }
      return num / den;
    });
    t = 0;
  }

  function start(k) {
    kind = k;
    if (k === "sym") eta0 = [AMP, 0, -AMP];
    else if (k === "anti") {
      const A = modes()[1];
      const s = AMP / Math.max(1, Math.abs(A[1]));
      eta0 = A.map((a) => a * s);
    } else if (k === "ett") eta0 = [AMP, 0, 0];
    project();
  }
  start("ett");

  controls.append(
    slider({
      text: "Masseforhold M/m",
      aria: "Massen til midtatomet i forhold til massen til hvert av de ytre atomene",
      min: 0.25,
      max: 3,
      step: 0.05,
      value: ratio,
      format: (v) => nb(v, 2),
      signal,
      onInput: (v) => {
        ratio = v;
        if (kind === "fri") project();
        else start(kind);
      },
    }),
    button("Symmetrisk", "Start molekylet i den symmetriske normalmoden", () => start("sym"), signal),
    button("Antisymmetrisk", "Start molekylet i den antisymmetriske normalmoden", () => start("anti"), signal),
    button("Ett atom", "Dra det venstre atomet ut og slipp det", () => start("ett"), signal),
  );

  /** Fjær som sikksakk fra x1 til x2 i høyden y. */
  function spring(x1, x2, y, amp, width, opacity) {
    const len = x2 - x1;
    if (len < 8) return line(x1, y, x2, y, { color: FIXED, width, opacity });
    const lead = Math.min(6, len * 0.15);
    const n = 8;
    const step = (len - 2 * lead) / n;
    let d = `M ${x1.toFixed(1)} ${y.toFixed(1)} L ${(x1 + lead).toFixed(1)} ${y.toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      const xm = x1 + lead + (i + 0.5) * step;
      d += ` L ${xm.toFixed(1)} ${(y + (i % 2 ? amp : -amp)).toFixed(1)}`;
    }
    d += ` L ${(x2 - lead).toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y.toFixed(1)}`;
    return `<path d="${d}" fill="none" stroke="${FIXED}" stroke-width="${width}" stroke-linejoin="round" opacity="${opacity}"/>`;
  }

  /** Ett molekyl: atomene i xs, radiene rs, i høyden y. */
  function molecule(xs, rs, y, { zig, width, opacity }) {
    let s = spring(xs[0] + rs[0], xs[1] - rs[1], y, zig, width, opacity);
    s += spring(xs[1] + rs[1], xs[2] - rs[2], y, zig, width, opacity);
    for (let i = 0; i < 3; i++) {
      s += `<circle cx="${xs[i].toFixed(1)}" cy="${y.toFixed(1)}" r="${rs[i].toFixed(1)}" style="fill:${MOVING}" opacity="${opacity}"/>`;
    }
    return s;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const S = Math.min(0.3 * w, 150); // likevektsavstanden i piksler
    const cx = w / 2;
    const X = [cx - S, cx, cx + S];
    const rm = Math.min(14, 0.12 * S);
    const rMid = rm * Math.min(1.5, Math.max(0.65, Math.cbrt(ratio)));
    const yTop = 0.2 * h;
    const rows = [
      { y: 0.47 * h, label: "translasjon" },
      { y: 0.69 * h, label: "symmetrisk" },
      { y: 0.9 * h, label: "antisymmetrisk" },
    ];
    geom = { w, h, S, X, yTop, rm };

    const A = modes();
    const om = omegas();
    const parts = [
      [shift, shift, shift],
      A[0].map((a) => amp[0] * a * Math.cos(om[0] * t)),
      A[1].map((a) => amp[1] * a * Math.cos(om[1] * t)),
    ];
    const total = [0, 1, 2].map((i) => parts[0][i] + parts[1][i] + parts[2][i]);

    let g = "";
    // Likevektsposisjonene som stiplede loddlinjer gjennom alle radene.
    for (const x of X) {
      g += line(x, yTop - rm - 22, x, rows[2].y + 12, { color: HINT, width: 1, dash: "3 4" });
    }

    // Molekylet.
    const xs = total.map((d, i) => X[i] + d * S);
    const rs = [rm, rMid, rm];
    g += molecule(xs, rs, yTop, { zig: 6, width: 1.6, opacity: 1 });
    const names = ["m", "M", "m"];
    for (let i = 0; i < 3; i++) g += txt(xs[i], yTop - rs[i] - 7, names[i], { anchor: "middle" });
    // Massesenteret, som står i ro.
    g += cross(cx + shift * S, yTop + rm + 12, undefined, 5);

    // Normalmodene.
    const k = 0.62;
    for (let r = 0; r < 3; r++) {
      const { y, label } = rows[r];
      g += txt(8, y - rm * k - 9, label);
      const xr = parts[r].map((d, i) => X[i] + d * S);
      g += molecule(xr, rs.map((q) => q * k), y, { zig: 4, width: 1.2, opacity: 0.55 });
    }

    stage.innerHTML = svg(w, h, g);
  }

  // Dra et atom i molekylet øverst; radene under viser delingen mens du drar.
  stage.style.touchAction = "pan-y";
  const toLocal = (e) => {
    const rect = stage.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) * geom.w) / rect.width,
      ((e.clientY - rect.top) * geom.h) / rect.height,
    ];
  };
  stage.addEventListener(
    "pointerdown",
    (e) => {
      if (!geom) return;
      const [px, py] = toLocal(e);
      if (Math.abs(py - geom.yTop) > geom.rm + 18) return;
      let best = -1;
      let bd = 0.45 * geom.S;
      for (let i = 0; i < 3; i++) {
        const d = Math.abs(px - (geom.X[i] + eta0Now(i) * geom.S));
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      if (best < 0) return;
      drag = best;
      stage.setPointerCapture(e.pointerId);
      moveTo(px);
    },
    { signal },
  );
  stage.addEventListener(
    "pointermove",
    (e) => {
      if (drag < 0) return;
      moveTo(toLocal(e)[0]);
    },
    { signal },
  );
  const end = () => {
    if (drag < 0) return;
    drag = -1;
    t = 0;
  };
  stage.addEventListener("pointerup", end, { signal });
  stage.addEventListener("pointercancel", end, { signal });

  /** Utslaget atom i har akkurat nå, summen av modene. */
  function eta0Now(i) {
    const A = modes();
    const om = omegas();
    return shift + amp[0] * A[0][i] * Math.cos(om[0] * t) + amp[1] * A[1][i] * Math.cos(om[1] * t);
  }

  function moveTo(px) {
    const d = Math.max(-MAXD, Math.min(MAXD, (px - geom.X[drag]) / geom.S));
    kind = "fri";
    eta0 = [0, 0, 0];
    eta0[drag] = d;
    project();
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      if (drag < 0) t += dt;
      render();
    },
  });
}
