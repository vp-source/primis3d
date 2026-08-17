# Primis website asset provenance register

Last reviewed: 18 August 2026

This is an internal launch-control record. It does not itself grant usage rights.
An asset is only `Cleared` after Primis retains the applicable source file and
written licence, assignment, generation record, or photographer/model release.

## Cleared third-party software and fonts

The deployed DM Sans and Source Serif 4 font files are distributed under the
SIL Open Font License 1.1. The complete notices are deployed in
`public/THIRD_PARTY_NOTICES.txt`. React, React DOM, and Scheduler notices are
included there as well.

## Brand and media register

| Asset | SHA-256 | Recorded origin | Current evidence status | Required close-out |
| --- | --- | --- | --- | --- |
| `public/primis-mark.svg` | `ba519d2830007f2eb2b5946fc2586bbcdb0f212c49a5a6931dafd8c045eca5a5` | Primis vector implementation based on a user-supplied visual reference | **Pending** | Retain written rights to the reference or replace it with a demonstrably original mark; complete similarity/trademark review. |
| `public/assets/atlas-spatial-field.png` | `480786003e3321b3ce5de27bbb73987dd6e5e04209201a45cdc2712c2ade4e5d` | User-supplied hero image (`content.png`) | **Pending** | Record creator/source and commercial web-use licence. |
| `public/assets/cap-reconstruct.mp4` | `0dda0fac705584eba7b7f05787fa8c09900abf418eedb0d1183c087b5d4e3452` | Primis development/demo media | **Pending confirmation** | Confirm all visible UI, models, and source imagery are owned or licensed by Primis. |
| `public/assets/cap-simulate.jpg` | `403d16e5aa7f57403483196507545295423a7ddd946f9b3a35b9c282994125e2` | Primis development/demo media | **Pending confirmation** | Retain source-project record and confirm rights to visible content. |
| `public/assets/cap-simulate.mp4` | `fe6ba531d7152d5049f5af754e63eca03d59f88e7e823dfc25975ffd05080acd` | Primis development/demo media | **Pending confirmation** | Retain source-project record and confirm rights to visible content. |
| `public/assets/cap-synthetic.jpg` | `4fd874dc7cbe07c9152cbce4d6c78f6de4361500a0bcbfe9b71546e1e167c989` | Primis development/demo media | **Pending confirmation** | Retain source-project record and confirm rights to visible content. |
| `public/assets/cap-synthetic.mp4` | `d56ec3395e633bb98d42f7154ea3071104f69fea5e376a76b8637f95272eaa4d` | Primis development/demo media | **Pending confirmation** | Retain source-project record and confirm rights to visible content. |
| `public/assets/founder.jpg` | `ec8510dfca9d78e1cd3be269cb49a50f09831e3248aec0d7071a9e4552f1e128` | Founder photograph | **Pending** | Retain photographer licence/assignment and documented consent from the depicted person. |
| `public/assets/games-desert.jpg` | `6c1e5cb910be6d5d98595ea03335f5cdb480e66b96c57fde101b39b25a4473f6` | Legacy Primis repository | **Pending** | Record creator/tool/source and commercial-use rights. |
| `public/assets/primis-demo-trimmed.webm` | `2ef4054cee7fb65eb3185a24d773d0b7fe249dfe074039a300bc819438d1f4f2` | Edited Primis Studio development capture | **Pending confirmation** | Retain the original capture and confirm rights to every visible input/model/interface element. |
| `public/assets/primis-footer-world-v3.jpg` | `778f505e35132c21f07bdd11890b27475df53ec3c7d8d187d7707e6596f1b96c` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/primis-foundation.jpg` | `1ec755497c4a89deb59858c5aa40499d63696cf69518f358f73d58faa1635ad9` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/primis-world-model-v4.png` | `fd73e9966d516e4f90e5a5ed72c12b6f2e64aef88e1284da390123a9d11cd350` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/research-locomotion.jpg` | `ad5c1a9e292bf48411144c11013be4f71c0d2345236ea1e04cbf306ddd4adfb5` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/research-manipulation.jpg` | `184731bd920de85f7c5390bfb51f66cc1db28f7b4a4d30c019e62fb2e0ad0a79` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/research-spatial-data.jpg` | `abb43689709f9bb4af3a6473b55b2ac58a869fe27493729168891372cb559b98` | Created during the Primis design process | **Pending evidence** | Retain generation/source record and applicable commercial-use terms. |
| `public/assets/robotics-g1b.jpg` | `d2fd25dc4078d4770808f39f3d55ab2c186b7d0b4035ac2cf8ef6170ffa41b27` | Legacy Primis/design asset | **Pending** | Record creator/tool/source and commercial-use rights. |

## Operational rules

1. Keep licences, releases, invoices, source exports, and generation records in
   a private company-controlled folder; do not commit personal records here.
2. Update this register whenever an asset changes. A changed hash is a new
   asset and requires a new evidence entry.
3. Do not use customer uploads, private interiors, people, third-party logos,
   or confidential interfaces in public demos without explicit written rights.
4. Complete DPMA, EUIPO, and WIPO similarity searches for `Primis`, `Atlas`,
   and the Primis mark before treating the brand as cleared.

## Repository custody record

The current media set was imported into this repository in commit
`f81df3545e078ae76b38d7c7a95ce1c593713663` and carried into the public
`primis3d` history in commit
`923e6b832ea8382755ed8c492440bb35626dc1a5`. The shared legacy files
(`cap-*`, `founder.jpg`, `games-desert.jpg`, `primis-demo.mp4`, and
`robotics-g1b.jpg`) first appear in the legacy repository in commit
`f0c144eb398c7a62417eedbe2223ed7dd7079c3f`.

These commits establish repository custody only. They do not prove authorship,
licensing, model consent, or trademark clearance; the evidence fields above
must still be completed from the original source records.
