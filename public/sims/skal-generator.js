/**
 * Det en størrelse genererer. Ei kule som glir uten friksjon i ei grunn skål,
 * sett ovenfra, med V = ½(ω_x²x² + ω_y²y²) og m = 1. De tynne ellipsene er
 * høydekoter. Den svake kula med pil er tilstanden (x, y, p_x, p_y) før
 * flyttingen, den tydelige er tilstanden etter at transformasjonen som p_x,
 * L_z eller H genererer, har virket med parameteren α. Den oransje stiplede
 * kurven er veien kula flyttes langs når α vokser fra 0. Søyla til høyre er H
 * for den flyttede tilstanden, og streken på søyla er H før flyttingen.
 *
 * p_x flytter kula stykket α langs x, L_z dreier både posisjonen og impulsen
 * vinkelen α om midten, og H lar bevegelsen gå tida α. Alle tre regnes eksakt.
 *
 * Enheter: m = 1, ω_x = 1; i den ovale skåla er ω_y = 1,25. Kontrakt:
 * default-eksportert init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  nb, slider, button, svg, txt, line, circle, arrow, poly, FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const S0 = [0.42, 0.22, -0.18, 0.5]; // [x, y, p_x, p_y] før flyttingen
  const GENS = [
    { key: "px", text: "Impulsen langs x", aria: "Flytt tilstanden med transformasjonen som impulsen langs x genererer", max: 0.5, fmt: (a) => nb(a, 2) },
    { key: "lz", text: "Dreieimpulsen", aria: "Flytt tilstanden med transformasjonen som dreieimpulsen om midten genererer", max: 2 * Math.PI, fmt: (a) => `${Math.round((a * 180) / Math.PI)}°` },
    { key: "h", text: "Hamiltonfunksjonen", aria: "Flytt tilstanden med transformasjonen som Hamiltonfunksjonen genererer", max: 2 * Math.PI, fmt: (a) => nb(a, 2) },
  ];
  const BOWLS = [
    { key: "rund", text: "Skål: rund", wy: 1 },
    { key: "oval", text: "Skål: oval", wy: 1.25 },
  ];
  let gen = GENS[1];
  let bowl = BOWLS[0];
  let u = 0.25; // α = u · gen.max
  const genButtons = [];

  const energy = (s) => 0.5 * (s[2] * s[2] + s[3] * s[3]) + 0.5 * (s[0] * s[0] + bowl.wy * bowl.wy * s[1] * s[1]);

  /** Tilstanden etter at transformasjonen fra `g` har virket med parameteren a. */
  function moved(g, a) {
    const [x, y, px, py] = S0;
    if (g.key === "px") return [x + a, y, px, py];
    if (g.key === "lz") {
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [c * x - s * y, s * x + c * y, c * px - s * py, s * px + c * py];
    }
    const wy = bowl.wy;
    return [
      x * Math.cos(a) + px * Math.sin(a),
      y * Math.cos(wy * a) + (py / wy) * Math.sin(wy * a),
      px * Math.cos(a) - x * Math.sin(a),
      py * Math.cos(wy * a) - y * wy * Math.sin(wy * a),
    ];
  }

  const sync = () => {
    genButtons.forEach((b, i) => b.setAttribute("aria-pressed", String(GENS[i] === gen)));
  };
  let alphaSlider;
  const refreshOutput = () => {
    const out = alphaSlider.querySelector("output");
    if (out) out.textContent = gen.fmt(u * gen.max);
  };

  for (const g of GENS) {
    const b = button(g.text, g.aria, () => {
      gen = g;
      sync();
      refreshOutput();
      render();
    }, signal);
    genButtons.push(b);
    controls.append(b);
  }
  alphaSlider = slider({
    text: "α",
    aria: "Parameteren α, hvor langt transformasjonen flytter tilstanden",
    min: 0,
    max: 1,
    step: 0.005,
    value: u,
    format: (v) => gen.fmt(v * gen.max),
    signal,
    onInput: (v) => {
      u = v;
      render();
    },
  });
  const bowlButton = button(bowl.text, "Bytt mellom rund og oval skål", () => {
    bowl = bowl === BOWLS[0] ? BOWLS[1] : BOWLS[0];
    bowlButton.textContent = bowl.text;
    render();
  }, signal);
  controls.append(bowlButton, alphaSlider);
  sync();

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const meterW = 44;
    const R = Math.min((w - meterW - 24) / 2, (h - 16) / 2); // skålas halve lengde i piksler
    const cx = 10 + (w - meterW - 20) / 2;
    const cy = h / 2;
    const X = (x) => cx + R * x;
    const Y = (y) => cy - R * y;
    const PS = 0.55 * R; // piksler per impulsenhet for pila
    const ratio = bowl.wy;
    let g = "";

    // Høydekotene V = ½a², ellipser med halvaksene a og a/ratio. Den ytterste er kanten.
    for (const a of [0.25, 0.5, 0.75, 1]) {
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const t = (2 * Math.PI * i) / 96;
        pts.push([X(a * Math.cos(t)), Y((a / ratio) * Math.sin(t))]);
      }
      g += poly(pts, a === 1 ? `stroke="${FIXED}" stroke-width="2"` : `stroke="${HINT}" stroke-width="1"`);
    }
    g += circle(cx, cy, 2.5, { fill: FIXED, stroke: FIXED, width: 1 });

    const a = u * gen.max;
    const s1 = moved(gen, a);

    // Tilstanden før flyttingen, svakt.
    g += `<g opacity="0.35">`;
    g += arrow(X(S0[0]), Y(S0[1]), X(S0[0]) + PS * S0[2], Y(S0[1]) - PS * S0[3], MOVING, 1.8);
    g += circle(X(S0[0]), Y(S0[1]), 6.5, { fill: MOVING, stroke: MOVING, width: 1 });
    g += `</g>`;

    // Veien kula flyttes langs.
    const path = [];
    const n = Math.max(2, Math.ceil(80 * u));
    for (let i = 0; i <= n; i++) {
      const si = moved(gen, (a * i) / n);
      path.push([X(si[0]), Y(si[1])]);
    }
    if (a > 1e-6) g += poly(path, `stroke="${DERIVED}" stroke-width="1.6" stroke-dasharray="4 3"`);

    // Tilstanden etter flyttingen.
    g += arrow(X(s1[0]), Y(s1[1]), X(s1[0]) + PS * s1[2], Y(s1[1]) - PS * s1[3], MOVING, 2);
    g += txt(X(s1[0]) + PS * s1[2] * 1.12 + 4, Y(s1[1]) - PS * s1[3] * 1.12 + 4, "p", { fill: MOVING, anchor: "middle" });
    g += circle(X(s1[0]), Y(s1[1]), 7, { fill: MOVING, stroke: MOVING, width: 1 });

    // Søyla med H.
    const E0 = energy(S0);
    const E1 = energy(s1);
    const Emax = 2.4 * E0;
    const bx = w - meterW + 8;
    const bw = 18;
    const bt = 26;
    const bb = h - 12;
    const yE = (E) => bb - ((bb - bt) * Math.min(E, Emax)) / Emax;
    g += `<rect x="${bx}" y="${bt}" width="${bw}" height="${bb - bt}" style="fill:none" stroke="${HINT}" stroke-width="1"/>`;
    g += `<rect x="${bx}" y="${yE(E1).toFixed(1)}" width="${bw}" height="${(bb - yE(E1)).toFixed(1)}" style="fill:${DERIVED}" opacity="0.75"/>`;
    g += line(bx - 5, yE(E0), bx + bw + 5, yE(E0), { color: LABEL, width: 2 });
    g += txt(bx + bw / 2, bt - 9, "H", { anchor: "middle" });

    stage.innerHTML = svg(w, h, g);
  }

  onResize(render);
  render();
}
