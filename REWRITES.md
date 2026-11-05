# Module rewrites

Every module in this guide is to be rewritten from a blank page, the way TFE4146 module 01
«Energibånd og ladningsbærere» was rewritten in October 2026. The old modules read like
encyclopedia articles: they went straight through the topic and stated things instead of
explaining them. Editing them sentence by sentence did not fix that. This file tracks which
modules have been rewritten and which remain.

## How a rewrite is done

Follow `WRITING.md` §9 in the framework repo (with §2, how a module teaches): start from a blank
page, build intuition before the math with sims and figures designed alongside the text, have an
independent agent review the draft, and show the maintainer the new module side by side with the
current one. Nothing is committed until the maintainer approves it.

Statuses: **to rewrite**, **in review** (a draft exists outside this repo and is with the
maintainer), **rewritten** (approved and committed).

## Status

| Module | Status | Notes |
|---|---|---|
| 01 Newtonsk mekanikk og krefter | rewritten | Approved after round 2 (2026-10-22). Scope widened to central forces, the gravitational field and the damped oscillator; terminal velocity left out as first-year material, and fixed-point classification left out because this year's lectures do not teach it. |
| 02 Greens funksjon | rewritten | Approved after round 1 (2026-10-22). Split from the old «Greens funksjon og partikkelsystemer». Takes sheet 2's driven damped oscillator, since G(Ω) is its response to a harmonic force. No exam task fits. |
| 03 Partikkelsystemer og støt | rewritten | Approved after round 1 (2026-10-22). The other half of the split, Tong 4.1–4.2 including the blocks-and-wall count; the reduced-mass and Noether duplicates were cut. No exam task fits (every collision task in the archive is relativistic). |
| 04 Virkningsprinsippet og Lagranges ligninger | rewritten | Approved after round 1 (2026-10-23). Takes the Lagrange multipliers from 06 with sheet 4's sign, L − λf, so λ is the string's pull. The charged particle uses Tong's L = ½mṙ² + qṙ·A − qφ, since the lecturer's note has the sign slipped. Four exam tasks (2011 1, 2023 1.7, 2018-aug 2, the 2025 ladder). |
| 05 Roterende referansesystemer | rewritten | Approved after round 2 (2026-10-24). Tong ch. 6 and JOA's notes, the Newtonian route; the Lagrangian derivation of the same forces (Tong 7.3.1) stays in 06. The Roche limit and the Earth's shape are left out as outside the assigned reading. Three exam tasks (2023 1.16, 2018-des 1, 2022-aug 1 A–B); the 2022 key's 11,5 m is an arithmetic slip for 11,2 m, and its part-A argument is corrected. |
| 06 Symmetrier og bevaringslover | rewritten | Approved after round 1 (2026-11-03). Tong 7.4.4, 7.3.1 and 7.5 with the lecturer's HEAP2 §1.3: cyclic coordinates, the energy function and where it differs from the energy (the bead on a turning rod), the spherical pendulum's turning points, the rotating-frame Lagrangian read as the charged particle's form, and Noether in the 2025 exam's notation. The spherical-pendulum sim is shared with «Kjente systemer», whose caption changed with it. Three exam tasks (2023 1.5, 2017-des 2, 2025 4 a–c); the 2017 key's «θ cyclic, mr²ω conserved» is corrected. |
| 07 Tolegemeproblemet og sentrale krefter | rewritten | Approved after round 1 (2026-11-05). Tong 5.3, 5.4, 5.6 and 7.6.1 with Brevik 4.4 and sheets 5–7. The module opens on 51 Pegasi and covers the reduced mass, V_eff, stable and closed orbits, the Kepler orbits and laws, Runge–Lenz with Mercury's 43″, scattering and the virial theorem in Brevik's form (V = arⁿ⁺¹). The impact parameter and scattering angle are b and ϑ, as on the lecturer's sheet 7, in the formula sheet, symbols and glossary too. «Det begrensede trelegemeproblemet» and «Lagrangepunktene» moved, unchanged, to 09 «Det begrensede trelegemeproblemet». Three exam tasks (2022-des 2 a–c, 2023 1.13, 2014-jun 2b); the 2022 key's missing factor n + 1 is noted. |
| 08 Små svingninger og normalmoder | rewritten | Approved after round 1 (2026-11-05). Tong ch. 8 and Brauner 4.3 with the lecturer's 5 October lecture and sheets 7.2 and 8.2. The module opens on two pendulums with a spring between the bobs and covers T and V near an equilibrium, the secular equation, the three-atom molecule found by symmetry, beads on a ring with the dispersion relation and the speed of sound, and the anharmonic oscillator's secular term with Δω = 3λA²/8ω₀. Modes are μ_a and the x³ strength is λ with ε = λA²/ω₀², as the lecturer writes them, in the formula sheet, symbols and glossary too. The double pendulum's modes stay on «Kjente systemer». The three-body sections moved, unchanged, to 09. Three exam tasks (2023-nov 2 a–c, 2022-des 1 vi, 2019-des 3, a paper added to the exam list). |
| 09 Det begrensede trelegemeproblemet | to rewrite | Split out of 08 on 2026-11-05, the approved restructure: holds the old 07's «Det begrensede trelegemeproblemet» and «Lagrangepunktene» and the old 08's «Stabiliteten til Lagrangepunktene», unchanged, with its own learning goals and takeaways. Tag «Uke 40». |
| 10 Stive legemer og treghetstensoren | to rewrite |  |
| 11 Eulers ligninger og snurrebassen | to rewrite |  |
| 12 Hamiltons ligninger og Poissonklammer | to rewrite | Liouville goes in here when it is written. |
| 99 Kjente systemer i Lagrangeformalismen | to rewrite | Side page that applies the modules; rewrite after the modules it draws on. |

When they are written: canonical transformations and Hamilton–Jacobi get one module each, and special relativity is split at the seams of Tong ch. 11.
