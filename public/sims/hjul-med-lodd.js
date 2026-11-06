/**
 * Et hjul med to lodd, som i en avbalanseringsmaskin: hjulet spinner med fast
 * vinkelhastighet ω om en vannrett aksel som holdes av to lagre. To like lodd
 * sitter rett overfor hverandre på felgen, enten begge på utsiden eller ett på
 * hver side. Glidebryteren «Helning» vipper hjulet på akselen, i planet gjennom
 * loddene, om massesenteret, så massesenteret alltid ligger på akselen.
 *
 * Treghetstensoren regnes om massesenteret i hjulets akser (b₁ mot lodd A,
 * b₃ langs hjulets egen akse): hjulet er en massiv sylinder med masse 1,
 * radius 1 og halv tykkelse 0,3, loddene er punktmasser på 0,5 i radius 0,72
 * på sideflatene. L = Iω tegnes som oransje pil med fast lengde, og spissen
 * går rundt sirkelen den stiplede linja viser. Lagrene gir dreiemomentet
 * N = ω × L som to like store, motsatt rettede krefter på akselen,
 * F = ±ωL⊥/2H, der L⊥ er delen av L vinkelrett på akselen og 2H avstanden
 * mellom lagrene. Kreftene snur seg med hjulet.
 *
 * Hjulet er massivt og skyggelagt fra ett lys (_solid.js). Akselen, loddene,
 * L og linja gjennom loddene sorteres mot det (_painter.js), så det som er
 * bak eller inni hjulet, vises svakt.
 *
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  slider, button, animate, svg, txt,
  FIXED, HINT, DERIVED, LABEL, MOVING,
} from "./_mekanikk.js";
import { PAPER, add, disc, face, lightFor, shade, tone, viewFor } from "./_solid.js";
import { discHit, painter } from "./_painter.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const ALPHA = 0.3; // kameraets hevning over vannrett
  const BETA = -0.9; // dreining av rommet om loddlinja, så utsiden vender mot kameraet
  const VIEW = viewFor(ALPHA, BETA);
  const LIGHT = lightFor(BETA);
  const W0 = (2 * Math.PI) / 3; // én omdreining på 3 s
  const HT = 0.3; // halv tykkelse
  const RHO = 0.72; // loddenes avstand fra hjulets akse
  const MW = 0.5; // massen til hvert lodd, hjulet har masse 1
  const H = 1.8; // lagrene sitter i ±H langs akselen
  const LLEN = 1.3; // lengden av L-pila
  const FS = 1.5; // lengden av kraftpilene per enhet av L⊥ (kraften er ωL⊥/2H)
  const deg = Math.PI / 180;
  // Dekket er mørkere enn felgen i begge temaene og skiller seg fra bakgrunnen også i mørkt tema.
  const TYRE = `color-mix(in oklab, var(--muted) 45%, var(--solid-shade))`;
  const TREAD = `color-mix(in oklab, var(--muted) 33%, var(--solid-shade))`;

  const A = [1, 0, 0]; // akselen, utsiden i +x
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const comb = (...terms) => [0, 1, 2].map((i) => terms.reduce((s, [k, v]) => s + k * v[i], 0));

  let both = false; // begge loddene på utsiden?
  let tilt = 0;
  let phi = 0.35; // hvor langt hjulet har dreid

  // Treghetstensoren om massesenteret i hjulets akser, og massesenteret målt fra hjulets sentrum.
  function body() {
    const zB = both ? HT : -HT;
    const pts = [[RHO, 0, HT], [-RHO, 0, zB]];
    const Mt = 1 + 2 * MW;
    const cm = [0, 0, (MW * (HT + zB)) / Mt];
    const Id = 0.25 + (2 * HT) ** 2 / 12;
    const I = [[Id, 0, 0], [0, Id, 0], [0, 0, 0.5]];
    const add2 = (m, p) => {
      const p2 = dot(p, p);
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) I[a][b] += m * ((a === b ? p2 : 0) - p[a] * p[b]);
    };
    add2(1, cm.map((x) => -x));
    for (const p of pts) add2(MW, p.map((x, k) => x - cm[k]));
    return { I, cm, pts };
  }
  let B = body();

  const buttons = [
    ["Ett på hver side", "Ett lodd på innsiden og ett på utsiden", false],
    ["Begge på utsiden", "Begge loddene på utsiden", true],
  ].map(([text, aria, val]) =>
    button(text, aria, () => {
      both = val;
      B = body();
      sync();
      render();
    }, signal),
  );
  const sync = () => buttons.forEach((b, i) => b.setAttribute("aria-pressed", String((i === 1) === both)));
  sync();
  controls.append(
    ...buttons,
    slider({
      text: "Helning",
      aria: "Vinkelen hjulet er vippet på akselen",
      min: -90,
      max: 90,
      step: 1,
      value: 0,
      format: (v) => `${v < 0 ? "\u2212" : ""}${Math.abs(v)}°`,
      signal,
      onInput: (v) => {
        tilt = v * deg;
        render();
      },
    }),
  );

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    // Scenen spenner fra −1,5 til 1,9 i bredden (akselen og hjulet), og fra
    // hjulets topp (1 over sentrum) til foten under lageret på utsiden (1,7 under).
    const s = Math.min((w - 20) / 3.45, (h - 34) / 2.72);
    const cx = w / 2 - 0.2 * s;
    const cy = (h - 2.72 * s - 22) / 2 + 1.02 * s;
    const ca = Math.cos(ALPHA);
    const sa = Math.sin(ALPHA);
    const cb = Math.cos(BETA);
    const sb = Math.sin(BETA);
    const P = ([x, y, z]) => {
      const xr = x * cb - y * sb;
      const yr = x * sb + y * cb;
      return [cx + s * xr, cy - s * (z * ca + yr * sa)];
    };

    // Hjulets akser: u og v dreier med hjulet om akselen, b₃ er vippet fra
    // akselen mot u, og b₁ (mot lodd A) ligger i samme plan.
    const u = [0, -Math.sin(phi), Math.cos(phi)];
    const v = cross(A, u);
    const b3 = comb([Math.cos(tilt), A], [Math.sin(tilt), u]);
    const b1 = comb([-Math.sin(tilt), A], [Math.cos(tilt), u]);
    const b2 = v;
    const world = (p) => comb([p[0], b1], [p[1], b2], [p[2], b3]);
    const centre = world(B.cm.map((x) => -x));

    // L = Iω i hjulets akser, ω = A.
    const wb = [dot(A, b1), dot(A, b2), dot(A, b3)];
    const Lb = B.I.map((row) => row[0] * wb[0] + row[1] * wb[1] + row[2] * wb[2]);
    const L = world(Lb);
    const Lpar = dot(L, A);
    const Lperp = comb([1, L], [-Lpar, A]);
    const Lhat = L.map((c) => c / Math.hypot(...L));

    const wheel = disc({
      c: centre, n: b3, eu: b1, ev: b2, r: 1, ht: HT, view: VIEW, light: LIGHT, P,
      base: TYRE, stripe: (i) => (i % 4 === 0 ? TREAD : TYRE), seg: 64,
    });
    // Felgen og boltene på den synlige sideflata.
    const nv = wheel.capNormal;
    const capT = tone(nv, LIGHT);
    const onCap = (r, ang, lift = 0.003) => add(add(wheel.capCentre, comb([Math.cos(ang), b1], [Math.sin(ang), b2]), r), nv, lift);
    const ring = (r, n = 48) => Array.from({ length: n }, (_, i) => P(onCap(r, (2 * Math.PI * i) / n)));
    let deco = face(ring(0.66), shade(PAPER, capT), shade(PAPER, Math.min(3, capT + 1)), 1);
    deco += face(ring(0.17, 24), shade(PAPER, Math.min(3, capT + 0.8)), shade(PAPER, 3), 0.8);
    for (let k = 0; k < 5; k++) {
      const c0 = onCap(0.34, (2 * Math.PI * k) / 5 + 0.3);
      const bolt = Array.from({ length: 12 }, (_, i) => {
        const a = (2 * Math.PI * i) / 12;
        return P(add(c0, comb([Math.cos(a), b1], [Math.sin(a), b2]), 0.055));
      });
      deco += face(bolt, shade(PAPER, 3), shade(PAPER, 3), 0.6);
    }

    const pen = painter({ P, view: VIEW, hit: discHit(centre, b3, 1, HT) });
    const at = (k, vec) => vec.map((c) => k * c);
    // Flyttet litt mot kameraet langs synslinja: samme sted på skjermen, men
    // sortert foran det som ligger like dypt (akselen under L, linja under loddene).
    const near = (p) => add(p, VIEW, -0.06);

    // Stativet: to stolper ned til gulvet.
    const foot = -1.3;
    let ground = "";
    for (const x of [-H, H]) {
      pen.polyline([[x, 0, 0], [x, 0, foot]], { color: FIXED, width: 2.2 });
      const [fx, fy] = P([x, 0, foot]);
      ground += `<line x1="${(fx - 16).toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(fx + 16).toFixed(1)}" y2="${fy.toFixed(1)}" stroke="${FIXED}" stroke-width="2"/>`;
      for (let k = -12; k <= 16; k += 7) ground += `<line x1="${(fx + k).toFixed(1)}" y1="${fy.toFixed(1)}" x2="${(fx + k - 5).toFixed(1)}" y2="${(fy + 6).toFixed(1)}" stroke="${FIXED}" stroke-width="1"/>`;
    }
    // Akselen og ω.
    pen.polyline([at(-H - 0.3, A), at(H + 0.3, A)], { color: FIXED, width: 3.2 });
    pen.arrow(at(H + 0.34, A), at(H + 0.82, A), LABEL, 2);
    for (const x of [-H, H]) {
      const [bx, by] = P(at(x, A));
      pen.put(at(x, A), `<circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="7" style="fill:var(--bg-elevated)" stroke="${FIXED}" stroke-width="2.2"/><circle cx="${bx.toFixed(1)}" cy="${by.toFixed(1)}" r="2.4" style="fill:${FIXED}"/>`);
    }

    // Loddene og linja gjennom dem.
    const lift = HT + 0.05;
    const wA = add(centre, world([B.pts[0][0], 0, lift]));
    const wB = add(centre, world([B.pts[1][0], 0, B.pts[1][2] > 0 ? lift : -lift]));
    const d = comb([1, wA], [-1, wB]);
    const dl = Math.hypot(...d);
    pen.polyline([add(wB, d, -0.32 / dl), add(wA, d, 0.32 / dl)], { color: HINT, width: 1.4, dash: "5 4", step: 0.04 });
    pen.dotAt(near(wA), 6.5, MOVING);
    pen.dotAt(near(wB), 6.5, MOVING);

    // L og sirkelen spissen går rundt.
    const tip = at(LLEN, Lhat);
    const rc = LLEN * Math.hypot(...Lperp) / Math.hypot(...L);
    if (rc > 0.02) {
      const ax = LLEN * Lpar / Math.hypot(...L);
      const circ = [];
      for (let i = 0; i <= 72; i++) {
        const a = (2 * Math.PI * i) / 72;
        circ.push(comb([ax, A], [rc * Math.cos(a), [0, 1, 0]], [rc * Math.sin(a), [0, 0, 1]]));
      }
      pen.polyline(circ, { color: DERIVED, width: 1.2, dash: "4 4", opacity: 0.6 });
    }
    pen.arrow(near([0, 0, 0]), near(tip), DERIVED, 2.8);

    // Kreftene fra lagrene på akselen: F = ±ωL⊥/2H.
    const F = at(FS, Lperp);
    const fl = Math.hypot(...F);
    if (fl > 0.04) {
      // En kant i bakgrunnsfargen under pila, så den synes over dekket.
      for (const [col, wd] of [["var(--canvas-bg)", 5.5], [LABEL, 2.2]]) {
        pen.arrow(at(H, A), add(at(H, A), F), col, wd);
        pen.arrow(at(-H, A), add(at(-H, A), F, -1), col, wd);
      }
    }

    // Etiketter øverst.
    let labels = "";
    const [ox, oy] = P(at(H + 0.82, A));
    labels += txt(ox + 4, oy + 16, "ω", { anchor: "middle" });
    const [lx, ly] = P(at(LLEN + 0.17, Lhat));
    labels += txt(lx, ly + 4, "L", { anchor: "middle", fill: DERIVED });
    for (const [x, word] of [[-H, "innside"], [H, "utside"]]) {
      const [fx, fy] = P([x, 0, foot]);
      labels += txt(fx, fy + 20, word, { anchor: "middle" });
    }

    stage.innerHTML = svg(w, h, ground + pen.svg(wheel.rim + wheel.cap + deco) + labels);
  }

  onResize(render);
  render();
  animate({
    stage,
    signal,
    onFrame: (dt) => {
      phi += W0 * dt;
      render();
    },
  });
}
