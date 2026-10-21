# Default: mission control

An always-on dashboard for developers working with coding agents. The first
thing to read is the Summary item's immediate action, followed by capacity,
the next event and weather. Calm instrumentation makes that action clear.

## Palette

| Name | Hex | Role |
| --- | --- | --- |
| Cool porcelain | `#f3f6fa` | Light canvas |
| Midnight navy | `#13243b` | Light ink and dark surfaces |
| Cobalt | `#224cbb` | Navigation and primary action |
| Ocean | `#176776` | Accent and calm information |
| Steel | `#52647c` | Secondary information |

Dark mode uses deeper navy surfaces, porcelain ink and lighter accessible
variants of the same role colours. Semantic state colours are derived for
legibility rather than copied from an agent's brand.

## Type

`system-ui, sans-serif` carries prose and controls: familiar, clear shapes keep
the dashboard readable at distance. `ui-rounded, system-ui, sans-serif` gives
headings a slightly wider, confident silhouette without an asset download.
`ui-monospace, monospace` is reserved for the clock and measured quantities,
with tabular figures; labels stay in the body face. Body copy is left aligned.

## Layout

A two-column instrument desk gives the urgent item room to explain the next
action. Adjacent modules have different densities; the news strip is a quiet
list rather than another equally weighted card. Ultrawide screens gain a
third working column. Narrow screens preserve reading order and scroll.

```text
+--------------------------------------------------------------+
| Dayframe / view navigation                    clock / settings |
+------------------------------------+-------------------------+
| Urgent Summary item                | Next event              |
| Action + useful explanation        | Time + brief agenda     |
+------------------------------------+-------------------------+
| Agent capacity: compact readings   | Weather now + outlook   |
+------------------------------------+-------------------------+
| Latest headlines: quiet list                                 |
+--------------------------------------------------------------+
```

## Principles

- Spend the strongest colour and largest type on the next action.
- Let Bootstrap cards, lists, alerts and progress bars express their purpose.
- Use a generous hero radius, quieter supporting panels and compact readings.
- Keep borders functional, avoid ornamental gradients and repeated shadows.
- Preserve text cues alongside every state colour, keyboard focus and contrast.

## Plan review

Equal rounded cards would obscure urgency, so the plan uses an asymmetric
hero, a narrow agenda and an unboxed feed strip. A decorative monospace label
system would resemble a generic developer template; only numeric instruments
use that face. Porcelain and navy belong to this mission-control brief, and
cobalt is reserved for decisions rather than every heading.

## Screenshot critique

Captured Summary in both schemes at all eight roadmap viewports with fixed
clock and seed; none had horizontal overflow. The urgent action reads first,
and the numeric instruments remain quiet and legible on the phone. The long
agenda currently sets the first desktop row's height, leaving space below
the hero and pushing the feed below the fold. App-level fitting should limit
the agenda rows with its existing more-events control. The app also currently
overrides the hero's theme-defined radius and padding; remove that duplication
so Bootstrap's card tokens can carry the intended hierarchy. No screenshot
baselines were created or accepted during this review.
