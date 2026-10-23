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
| 05 Roterende referansesystemer | to rewrite |  |
| 06 Symmetrier og bevaringslover | to rewrite | The Lagrange multipliers moved to 04 (2026-10-23) and the module was retitled; the slug foringskrefter-og-symmetrier is kept. |
| 07 Tolegemeproblemet og sentrale krefter | to rewrite | Approved restructure, on hold until the writing review is finished: «Det begrensede trelegemeproblemet» and «Lagrangepunktene» move to a new module after 08. |
| 08 Små svingninger og normalmoder | to rewrite | Approved restructure, on hold until the writing review is finished: «Stabiliteten til Lagrangepunktene» moves to the new three-body module; tag «Uke 40–41». |
| 09 Stive legemer og treghetstensoren | to rewrite |  |
| 10 Eulers ligninger og snurrebassen | to rewrite |  |
| 11 Hamiltons ligninger og Poissonklammer | to rewrite | Liouville goes in here when it is written. |
| 99 Kjente systemer i Lagrangeformalismen | to rewrite | Side page that applies the modules; rewrite after the modules it draws on. |

When they are written: canonical transformations and Hamilton–Jacobi get one module each, and special relativity is split at the seams of Tong ch. 11.
