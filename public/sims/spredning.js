/**
 * Spredning: partikler kommer inn fra venstre, parallelt med aksen gjennom
 * målet, hver med sin støtparameter b. Målet er enten ei hard kule som
 * partiklene spretter speilende av, eller en ladning som frastøter dem med
 * Coulombkraften. Tynne linjer er banene til en jevn stråle. Den uthevede
 * banen har støtparameteren fra glidebryteren: b er merket med en klamme ved
 * aksen, spredningsvinkelen ϑ med en bue der den innkommende retningen og
 * den utgående møtes, og en prikk går langs banen. Det skraverte båndet er
 * partiklene mellom b og b + db, og det viser hvor bredt de sprer seg ut.
 * For kula er normalen i treffpunktet stiplet, med vinkelen χ på hver side.
 *
 * Tegningen er et snitt gjennom aksen. Lengdene er målt i kulas radius a, og
 * Coulombkraften er valgt slik at en partikkel som kommer rett mot ladningen,
 * snur i avstanden a: |k|/E = a. Da er b = a cos(ϑ/2) for kula og
 * b = (a/2) cot(ϑ/2) for Coulombkraften. Kontrakt: default-eksportert init(api), api = { stage, controls,
 * getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, poly, arc, arrow, DERIVED, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const XW = 3.3; // halve bredden av utsnittet, i lengdeenheter
  const DB = 0.07;
  const FAINT = [0.2, 0.5, 0.8, 1.1, 1.4, 1.7].flatMap((b) => [b, -b]);
  const RUN = 3.2; // sekunder for prikken gjennom utsnittet
  let target = "kule";
  let b = 0.5;
  let paths = null; // { faint: [[x,y]…][], main, edge, theta, hit }
  let t = 0;

  // Hard kule med radius 1: rett linje, speilende refleksjon, rett linje.
  function sphere(bb) {
    const pts = [];
    const x0 = -XW - 0.5;
    if (Math.abs(bb) >= 1) {
      for (let i = 0; i <= 2; i++) pts.push([x0 + i * (XW + 0.5), bb]);
      return { pts, theta: 0, hit: null };
    }
    const hx = -Math.sqrt(1 - bb * bb);
    const n = [hx, bb]; // normalen ut fra kula i treffpunktet
    const d = [1, 0];
    const dn = d[0] * n[0] + d[1] * n[1];
    const o = [d[0] - 2 * dn * n[0], d[1] - 2 * dn * n[1]];
    const len = (XW + 1) * 1.5;
    const steps = 60;
    for (let i = 0; i <= steps; i++) pts.push([x0 + ((hx - x0) * i) / steps, bb]);
    for (let i = 1; i <= steps; i++) pts.push([hx + (o[0] * len * i) / steps, bb + (o[1] * len * i) / steps]);
    const theta = Math.atan2(o[1], o[0]);
    return { pts, theta, hit: [hx, bb], out: o };
  }

  // Coulombfrastøting med |k|/E = 1: μ = v = 1, E = ½, |k| = ½.
  function coulomb(bb) {
    let s = [-40, bb, 1, 0];
    const f = (_, u) => {
      const r = Math.hypot(u[0], u[1]);
      const r3 = r * r * r;
      return [u[2], u[3], (0.5 * u[0]) / r3, (0.5 * u[1]) / r3];
    };
    const pts = [];
    let guard = 0;
    while (guard++ < 40000) {
      const r = Math.hypot(s[0], s[1]);
      if (Math.abs(s[0]) < XW + 1.5 && Math.abs(s[1]) < XW + 1.5) pts.push([s[0], s[1]]);
      if (r > 40 && s[0] * s[2] + s[1] * s[3] > 0) break;
      s = rk4(s, f, 0, Math.min(0.02, 0.01 * r));
    }
    const theta = Math.atan2(s[3], s[2]);
    return { pts, theta, hit: null, out: [Math.cos(theta), Math.sin(theta)] };
  }

  function build() {
    const run = target === "kule" ? sphere : coulomb;
    const main = run(b);
    const edge = run(Math.min(b + DB, target === "kule" && b < 1 ? 0.999 : b + DB));
    paths = { faint: FAINT.map((bb) => run(bb).pts), main, edge };
    t = 0;
  }
  build();

  function toggle(text, aria, pressed, onClick) {
    const bt = button(text, aria, onClick, signal);
    bt.setAttribute("aria-pressed", String(pressed));
    return bt;
  }
  const kBtn = toggle("Hard kule", "Spredning mot ei hard kule", true, () => setTarget("kule"));
  const cBtn = toggle("Coulombfrastøting", "Spredning mot en ladning som frastøter", false, () => setTarget("coulomb"));
  function setTarget(k) {
    target = k;
    kBtn.setAttribute("aria-pressed", String(k === "kule"));
    cBtn.setAttribute("aria-pressed", String(k === "coulomb"));
    build();
    render();
    loop.start();
  }
  controls.append(
    slider({
      text: "Støtparameter b",
      aria: "Støtparameteren til den uthevede banen",
      min: 0,
      max: 1.5,
      step: 0.05,
      value: b,
      format: (v) => `${nb(v, 2)} a`,
      signal,
      onInput: (v) => {
        b = v;
        build();
        render();
        loop.start();
      },
    }),
    kBtn,
    cBtn,
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const sc = Math.min((w - 8) / (2 * XW), (h - 16) / (2 * 2.55));
    const cx = w / 2;
    const cy = h / 2;
    const X = (x) => cx + x * sc;
    const Y = (y) => cy - y * sc;
    const P = (pts) => pts.map((p) => [X(p[0]), Y(p[1])]);
    let g = "";

    // Aksen gjennom målet.
    g += line(4, cy, w - 4, cy, { color: HINT, dash: "4 4", width: 1 });
    // Strålen.
    for (const p of paths.faint) g += poly(P(p), `stroke="${LABEL}" stroke-width="1" opacity="0.45"`);

    // Båndet mellom b og b + db.
    const { main, edge } = paths;
    if (main.pts.length > 1 && edge.pts.length > 1) {
      const band = [...P(main.pts), ...P(edge.pts).reverse()];
      g += `<path d="M ${band.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(" L ")} Z" style="fill:${MOVING}" opacity="0.16" stroke="none"/>`;
    }

    // Målet.
    if (target === "kule") {
      g += circle(cx, cy, sc, { fill: "var(--bg-elevated)", stroke: FIXED, width: 2 });
      g += line(cx, cy, cx + sc * 0.7071, cy + sc * 0.7071, { color: LABEL, width: 1 });
      g += txt(cx + sc * 0.42, cy + sc * 0.3 - 2, "a", { anchor: "middle" });
    } else {
      // Avstanden a der en partikkel som kommer rett mot ladningen, snur.
      g += circle(cx, cy, sc, { stroke: HINT, dash: "4 4", width: 1.2 });
      g += line(cx, cy, cx + sc * 0.7071, cy + sc * 0.7071, { color: LABEL, width: 1, opacity: 0.7 });
      g += txt(cx + sc * 0.42, cy + sc * 0.3 - 2, "a", { anchor: "middle" });
      g += circle(cx, cy, 6, { fill: DERIVED, stroke: "none" });
    }

    // Den uthevede banen.
    g += poly(P(main.pts), `stroke="${MOVING}" stroke-width="2.2" stroke-linejoin="round"`);

    // Normalen og χ i treffpunktet.
    if (main.hit) {
      const [hx, hy] = main.hit;
      g += line(cx, cy, X(hx * 1.75), Y(hy * 1.75), { color: LABEL, dash: "4 3", width: 1.1, opacity: 0.8 });
      const na = Math.atan2(-hy, hx); // normalens retning på skjermen
      const ia = Math.PI; // tilbake mot kilden
      const oa = Math.atan2(-main.out[1], main.out[0]);
      const R = 22;
      const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      if (Math.abs(wrap(ia - na)) > 0.12) {
        // To like vinkler mot normalen, inn og ut, hver med sin etikett.
        g += arc(X(hx), Y(hy), R, na, na + wrap(ia - na), { color: LABEL });
        g += arc(X(hx), Y(hy), R - 4, na, na + wrap(oa - na), { color: LABEL });
        for (const [d, rr] of [[wrap(ia - na), R], [wrap(oa - na), R - 4]]) {
          const m = na + d / 2;
          g += txt(X(hx) + (rr + 9) * Math.cos(m), Y(hy) + (rr + 9) * Math.sin(m) + 4, "χ", { anchor: "middle" });
        }
      }
    }

    // Spredningsvinkelen: buen fra den innkommende retningen til den utgående,
    // der de to rette linjene møtes.
    const th = main.theta;
    if (Math.abs(th) > 0.05) {
      let vx;
      let vy;
      if (main.hit) {
        [vx, vy] = [X(main.hit[0]), Y(main.hit[1])];
      } else {
        // Asymptotene: y = b inn, og ut langs retningen θ gjennom et punkt langt ute.
        const end = main.pts[main.pts.length - 1];
        const [ox, oy] = [Math.cos(th), Math.sin(th)];
        // Skjæring: end + s·o har y = b.
        const s = (b - end[1]) / oy;
        const ix = end[0] + s * ox;
        [vx, vy] = [X(ix), Y(b)];
        g += line(vx, vy, X(end[0]), Y(end[1]), { color: MOVING, dash: "3 4", width: 1, opacity: 0.6 });
      }
      g += line(vx, vy, vx + 46, vy, { color: LABEL, dash: "3 3", width: 1 });
      const R = 30;
      g += arc(vx, vy, R, 0, -th, { color: DERIVED, width: 1.6 });
      const m = -th / 2;
      g += txt(vx + (R + 11) * Math.cos(m), vy + (R + 11) * Math.sin(m) + 4, "ϑ", { anchor: "middle", fill: DERIVED });
    }

    // Klammen for b ved venstre kant.
    if (b >= 0.12) {
      const bx = X(-XW + 0.35);
      g += line(bx, cy, bx, Y(b), { color: LABEL, width: 1.2 });
      g += line(bx - 4, cy, bx + 4, cy, { color: LABEL, width: 1.2 });
      g += line(bx - 4, Y(b), bx + 4, Y(b), { color: LABEL, width: 1.2 });
      g += txt(bx - 7, (cy + Y(b)) / 2 + 4, "b", { anchor: "end" });
    }

    // Prikken langs den uthevede banen.
    const pts = main.pts;
    if (pts.length > 1) {
      const k = Math.min(pts.length - 1, Math.floor(((t % RUN) / RUN) * (pts.length - 1)));
      g += circle(X(pts[k][0]), Y(pts[k][1]), 5, { fill: MOVING, stroke: "none" });
    }
    stage.innerHTML = svg(w, h, g);
  }

  const loop = animate({
    stage,
    signal,
    onFrame: (dt) => {
      t += dt;
      render();
    },
  });
  onResize(render);
  render();
}
