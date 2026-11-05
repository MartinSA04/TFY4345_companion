/**
 * Banen og det effektive potensialet: en planet sluppet 1 AU fra sola med en
 * fart på tvers av linja til sola. Øverst går planeten i baneplanet om sola i
 * O, med sporet sitt og stiplede sirkler ved vendepunktene r_min og r_max.
 * Under er V_eff(r) = J²/2μr² + V(r) tegnet langs en r-akse som starter rett
 * under O og har samme skala som banen, med energien E som vannrett linje og
 * en prikk på linja i planetens avstand r. Stiplede loddrette linjer binder
 * sirklene i banen til vendepunktene på kurven. Oransje prikker merker hvert
 * perihel.
 *
 * «Ekstra tiltrekning» legger til leddet −λJ²/μ²r³ i potensialet, samme form
 * som korreksjonen fra den generelle relativitetsteorien, men forstørret om
 * lag to millioner ganger: perihelet dreier seg rundt 40° per runde i
 * standardbanen, og med liten fart faller planeten inn i sola.
 *
 * Enheter: AU og år, GM = 4π² AU³/år², så 1 AU/år = 4,74 km/s og
 * sirkelfarten i 1 AU er 29,8 km/s. Hver bundet runde tar omtrent fire
 * sekunder uansett hvor lang omløpstida er. Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, rk4, slider, button, animate, svg, txt, line, circle, poly, arrow, DERIVED, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const GM = 4 * Math.PI * Math.PI;
  const KMS = 4.7405; // km/s per AU/år
  const LAMBDA = 0.02; // AU, den forstørrede GM/c²
  const ORBIT_SECONDS = 4;
  const FREE_RATE = 0.35; // år per sekund i en ubundet bane
  const R_SUN = 0.035; // AU, sola slik den er tegnet
  const R_LEAVE = 4; // AU, en ubundet bane starter på nytt utenfor denne
  const MAX_TRAIL = 2200;

  let vKms = 25;
  let extra = false;
  let s; // [x, y, ẋ, ẏ] i AU og AU/år
  let l; // dreieimpuls per masse, r v_φ
  let E; // energi per masse
  let turn; // { rMin, rMax } eller null-felter
  let rate; // år per sekund
  let trail;
  let peri;
  let lastRdot;
  let fallen = 0; // sekunder siden planeten traff sola, 0 = ikke falt

  const lam = () => (extra ? LAMBDA : 0);
  const veff = (r) => (l * l) / (2 * r * r) - GM / r - (lam() * l * l) / (r * r * r);

  // Vendepunktene: r = 1 er et vendepunkt fordi farten står på tvers. Det andre
  // ligger på den siden der E − V_eff er positiv like ved r = 1.
  function turningPoints() {
    const g = (r) => E - veff(r);
    const inward = g(0.999) > 0;
    let rMin = 1;
    let rMax = 1;
    if (Math.abs(g(0.999)) < 1e-9 && Math.abs(g(1.001)) < 1e-9) return { rMin: 1, rMax: 1, circle: true };
    if (inward) {
      // Let innover etter neste nullpunkt.
      let a = 0.999;
      let b = a;
      while (b > 0.004 && g(b) > 0) b *= 0.97;
      if (g(b) > 0) return { rMin: null, rMax: 1 };
      a = b / 0.97;
      for (let i = 0; i < 60; i++) {
        const m = (a + b) / 2;
        if (g(m) > 0) a = m;
        else b = m;
      }
      rMin = (a + b) / 2;
    } else {
      let a = 1.001;
      let b = a;
      while (b < 400 && g(b) > 0) b *= 1.04;
      if (g(b) > 0) return { rMin: 1, rMax: null };
      a = b / 1.04;
      for (let i = 0; i < 60; i++) {
        const m = (a + b) / 2;
        if (g(m) > 0) a = m;
        else b = m;
      }
      rMax = (a + b) / 2;
    }
    return { rMin, rMax };
  }

  function reset() {
    const v = vKms / KMS;
    s = [1, 0, 0, v];
    l = v;
    E = veff(1);
    turn = turningPoints();
    if (turn.rMin !== null && turn.rMax !== null) {
      const a = (turn.rMin + turn.rMax) / 2;
      rate = Math.pow(a, 1.5) / ORBIT_SECONDS;
    } else {
      rate = FREE_RATE;
    }
    trail = [[1, 0]];
    peri = [];
    // Starter planeten i perihel, merkes startpunktet med en gang.
    if (turn.rMin === 1 && !turn.circle) peri.push([1, 0]);
    lastRdot = 0;
    fallen = 0;
  }
  reset();

  const f = (_, u) => {
    const r = Math.hypot(u[0], u[1]);
    const r3 = r * r * r;
    // −dV/dr per masse: −GM/r² − 3λl²/r⁴, rettet mot sola.
    const a = GM / r3 + (3 * lam() * l * l) / (r3 * r * r);
    return [u[2], u[3], -a * u[0], -a * u[1]];
  };

  function toggle(text, aria, pressed, onClick) {
    const b = button(text, aria, onClick, signal);
    b.setAttribute("aria-pressed", String(pressed));
    return b;
  }
  const newtonBtn = toggle("Bare Newton", "Bare Newtons tyngdekraft, V = −k/r", true, () => setExtra(false));
  const extraBtn = toggle("Ekstra tiltrekning", "Legg til en ekstra tiltrekning nær sola", false, () => setExtra(true));
  function setExtra(on) {
    extra = on;
    newtonBtn.setAttribute("aria-pressed", String(!on));
    extraBtn.setAttribute("aria-pressed", String(on));
    reset();
    render();
    loop.start();
  }
  controls.append(
    slider({
      text: "Sidefart",
      aria: "Farten på tvers av linja til sola i startpunktet, i kilometer per sekund",
      min: 10,
      max: 45,
      step: 0.1,
      value: vKms,
      format: (v) => `${nb(v, 1)} km/s`,
      signal,
      onInput: (v) => {
        vKms = v;
        reset();
        render();
        loop.start();
      },
    }),
    newtonBtn,
    extraBtn,
    button("Start på nytt", "Start planeten på nytt fra startpunktet", () => {
      reset();
      render();
      loop.start();
    }, signal),
  );

  function step(dt) {
    if (fallen > 0) {
      fallen += dt;
      if (fallen > 1.4) reset();
      return;
    }
    let left = dt * rate;
    while (left > 0) {
      const r = Math.hypot(s[0], s[1]);
      const h = Math.min(left, 0.0015 * Math.pow(r, 1.5));
      s = rk4(s, f, 0, h);
      left -= h;
      const rn = Math.hypot(s[0], s[1]);
      const rdot = (s[0] * s[2] + s[1] * s[3]) / rn;
      if (lastRdot < 0 && rdot >= 0) {
        peri.push([s[0], s[1]]);
        if (peri.length > 14) peri.shift();
      }
      lastRdot = rdot;
      if (rn < R_SUN) {
        fallen = 1e-6;
        return;
      }
      if (turn.rMax === null && rn > R_LEAVE && rdot > 0) {
        reset();
        return;
      }
      const last = trail[trail.length - 1];
      if (Math.hypot(s[0] - last[0], s[1] - last[1]) > 0.006) {
        trail.push([s[0], s[1]]);
        if (trail.length > MAX_TRAIL) trail.shift();
      }
    }
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    // Banen får plass til en sirkel med radius 1 AU om sola, så hele rosetten
    // med ekstra tiltrekning synes; til høyre er det plass til etiketten r_max.
    const panelH = Math.min(150, h * 0.32);
    const orbitH = h - panelH;
    const sc = Math.min((w - 34) / 2, (orbitH - 14) / 2);
    const ox = Math.min(w / 2 - 8, sc + 8);
    const oy = orbitH / 2 + 2;
    const X = (x) => ox + x * sc;
    const Y = (y) => oy - y * sc;
    let g = "";

    // Vendepunktene som stiplede sirkler om sola.
    const rings = [];
    if (turn.rMin !== null) rings.push(turn.rMin);
    if (turn.rMax !== null && !turn.circle) rings.push(turn.rMax);
    for (const r of rings) g += circle(ox, oy, r * sc, { stroke: HINT, dash: "4 4", width: 1.2 });

    // Perihelene: tynne linjer fra sola og en prikk i hvert.
    for (const p of peri) {
      g += line(ox, oy, X(p[0]), Y(p[1]), { color: DERIVED, width: 1, opacity: 0.45 });
    }
    // Sporet.
    if (trail.length > 1) {
      const pts = trail.map((p) => [X(p[0]), Y(p[1])]);
      pts.push([X(s[0]), Y(s[1])]);
      g += poly(pts, `stroke="${MOVING}" stroke-width="1.4" opacity="0.55" stroke-linejoin="round"`);
    }
    for (const p of peri) g += circle(X(p[0]), Y(p[1]), 3.2, { fill: DERIVED, stroke: "none" });

    // Sola og planeten, med r fra sola til planeten.
    g += circle(ox, oy, Math.max(5, R_SUN * sc), { fill: DERIVED, stroke: "none" });
    g += txt(ox, oy + 20, "sola", { anchor: "middle" });
    const px = X(s[0]);
    const py = Y(s[1]);
    if (fallen === 0) {
      g += line(ox, oy, px, py, { color: LABEL, width: 1, opacity: 0.8 });
      const rn = Math.hypot(px - ox, py - oy);
      if (rn > 40) {
        const ux = (px - ox) / rn;
        const uy = (py - oy) / rn;
        g += txt(ox + 0.55 * (px - ox) - 9 * uy, oy + 0.55 * (py - oy) + 9 * ux + 4, "r", { anchor: "middle" });
      }
      g += circle(px, py, 6, { fill: MOVING, stroke: "none" });
    }

    // ── V_eff under banen, langs den samme r-aksen ──
    const top = orbitH + 6;
    const bot = h - 18;
    // Energiskala: bunnen av brønnen for denne J nederst, og over null nok
    // plass til en positiv E.
    const ell = (l * l) / GM;
    const depth = Math.max(GM / (2 * ell), Math.abs(E) * 1.15);
    const lo = -1.08 * depth;
    const hi = Math.max(0.55 * depth, E > 0 ? 1.4 * E : 0);
    const VY = (v) => top + ((hi - v) / (hi - lo)) * (bot - top);
    const axisY = VY(0);
    const rEnd = (w - ox - 6) / sc;
    g += line(ox, axisY, w - 4, axisY, { color: FIXED, width: 1.2 });
    // Aksenavnet r står ved enden, men bare når ingen etikett for et vendepunkt er nær.
    const nearEnd = [turn.rMin, turn.rMax].some((r) => r !== null && Math.abs(X(r) - (w - 12)) < 26);
    if (!nearEnd) g += txt(w - 8, axisY - 6, "r", { anchor: "end" });
    // Kurven, delt opp der den går ut av panelet. Med ekstra tiltrekning går
    // den ned igjen innerst, så den kan ha to deler.
    const parts = [[]];
    for (let i = 0; i <= 400; i++) {
      const r = 0.004 * Math.pow(rEnd / 0.004, i / 400);
      const y = VY(veff(r));
      if (y < top - 2 || y > bot + 10) {
        if (parts[parts.length - 1].length) parts.push([]);
        continue;
      }
      parts[parts.length - 1].push([X(r), y]);
    }
    for (const p of parts) g += poly(p, `stroke="${FIXED}" stroke-width="1.8"`);
    // Etiketten V_eff der kurven kommer inn ovenfra, til høyre for den.
    const outer = parts.filter((p) => p.length > 1).pop() ?? [];
    if (outer.length) {
      const [lx, ly] = outer[0];
      const right = lx < w - 70;
      const vy = Math.max(top + 12, Math.min(bot - 4, ly + 12));
      g += txt(right ? lx + 8 : lx - 8, vy, "V<tspan baseline-shift=\"sub\" font-size=\"9\">eff</tspan>", { anchor: right ? "start" : "end" });
    }
    // Energilinja mellom vendepunktene, og prikken i planetens r.
    const eY = VY(E);
    if (eY > top && eY < bot + 6) {
      const r0 = turn.rMin !== null ? turn.rMin : 0.006;
      const r1 = turn.rMax !== null ? Math.min(turn.rMax, rEnd) : rEnd;
      g += line(X(r0), eY, X(r1), eY, { color: DERIVED, width: 2 });
      // Over linja når den er lang nok; ellers til venstre og under, der kurven ikke går.
      const long = X(r1) - X(r0) > 40;
      const below = !long || (eY > axisY && eY - axisY < 30);
      g += txt(long ? X(r0) + 12 : X(r0) - 10, below ? eY + 16 : eY - 7, "E", { anchor: "middle", fill: DERIVED });
      if (fallen === 0) {
        const r = Math.hypot(s[0], s[1]);
        if (r <= rEnd) g += circle(X(r), eY, 5, { fill: DERIVED, stroke: "none" });
      }
    }
    // Vendepunktene på aksen, bundet til sirklene i banen.
    // Etikettene står under aksen, eller over den når E-linja ligger like under.
    const tickUp = eY > axisY && eY - axisY < 30;
    // Ligger vendepunktene tett, står r_min til venstre for sin strek og r_max til høyre.
    const close = turn.rMin !== null && turn.rMax !== null && (turn.rMax - turn.rMin) * sc < 40;
    const tick = (r, label, side) => {
      const x = X(r);
      if (x > w - 6) return "";
      const anchor = close ? (side < 0 ? "end" : "start") : "middle";
      return (
        line(x, oy, x, axisY + 5, { color: HINT, dash: "3 4", width: 1 }) +
        line(x, axisY - 4, x, axisY + 4, { color: FIXED, width: 1.2 }) +
        txt(close ? x + 3 * side : x, tickUp ? axisY - 9 : axisY + 17, label, { anchor })
      );
    };
    if (turn.circle) g += tick(1, "r₀", 0);
    else {
      if (turn.rMin !== null) g += tick(turn.rMin, "r<tspan baseline-shift=\"sub\" font-size=\"9\">min</tspan>", -1);
      if (turn.rMax !== null && (turn.rMax - (turn.rMin ?? -1)) * sc > 8)
        g += tick(turn.rMax, "r<tspan baseline-shift=\"sub\" font-size=\"9\">max</tspan>", 1);
    }
    stage.innerHTML = svg(w, h, g);
  }

  const loop = animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  onResize(render);
  render();
}
