# Default: mission control

An always-on dashboard for developers working with coding agents. The first
thing to read is the Summary item's immediate action, followed by capacity,
the next event and weather. Calm instrumentation makes that action clear.

## Palette

| Name           | Hex       | Role                          |
| -------------- | --------- | ----------------------------- |
| Cool porcelain | `#f3f6fa` | Light canvas                  |
| Midnight navy  | `#13243b` | Light ink and dark surfaces   |
| Cobalt         | `#224cbb` | Navigation and primary action |
| Ocean          | `#176776` | Accent and calm information   |
| Steel          | `#52647c` | Secondary information         |

Dark mode uses deeper navy surfaces, porcelain ink and lighter accessible
variants of the same role colours. Semantic state colours are derived for
legibility rather than copied from an agent's brand.

## Type

Geist carries prose, controls and headings: one family, with weight doing the
work, whose large sizes stay crisp at a distance. Geist Mono is reserved for
the clock and measured quantities, with tabular figures; labels stay in the
body face. Both ship with the site under the SIL Open Font License and
download only while this theme is active. Body copy is left aligned.

## Layout

A three-column instrument desk gives the urgent item two columns beside
weather. Capacity, a brief agenda and a quiet headline list sit below, with
different densities and card tokens to show hierarchy. Ultrawide screens move
the agenda beside the hero and give capacity two columns below. Narrow screens
preserve reading order and scroll.

```text
+--------------------------------------------------------------+
| Dayframe / view navigation                    clock / settings |
+----------------------------------------+---------------------+
| Urgent Summary item                    | Weather now         |
| Action + useful explanation            | Outlook when roomy  |
+---------------------+------------------+---------------------+
| Agent capacity      | Coming up        | Latest headlines    |
| Compact readings    | Brief agenda     | Quiet list          |
+--------------------------------------------------------------+
```

Short desktop viewports show two agents, one agenda entry and one headline,
with controls for the remaining content. Taller viewports show six agents,
two agenda entries and three headlines. The root floor stays at `0.875rem`
(14 CSS pixels at the default browser size); density changes through row
limits rather than smaller root text.

## Principles

- Spend the strongest colour and largest type on the next action.
- Let Bootstrap cards, lists, alerts and progress bars express their purpose.
- Use a generous hero radius, quieter supporting panels and compact readings.
- Keep borders functional, avoid ornamental gradients and repeated shadows.
- Preserve text cues alongside every state colour, keyboard focus and contrast.

## Plan review

Equal rounded cards would obscure urgency, so the plan uses an asymmetric
hero, compact capacity readings and a quiet feed list. A decorative monospace label
system would resemble a generic developer template; only numeric instruments
use that face. System fonts in every theme were themselves a default, so the
2026 once-over gave this theme a bundled face while the other briefs kept
theirs. Porcelain and navy belong to this mission-control brief, and
cobalt is reserved for decisions rather than every heading.

## Screenshot critique

Reviewed fixed-clock, fixed-seed Summary captures at 1280×720 and 1920×1080
in light and dark. The broad hero reads first beside weather; capacity,
agenda and feeds stay above the footer. At 1280×720 the one-entry agenda and
more-events control keep the lower row compact. At 1920×1080 the additional
readings use the available space without competing with the action. Theme
card tokens now control the hero radius and padding, preserving its distinction
from the supporting panels.

The initial 160 pinned-container baselines for this theme were reviewed across
all five views, eight viewports and both device pixel ratios. No substantive
clipping, overlap, unintended desktop overflow or disclosure issue was found.
Phone and tablet scrolling preserves the intended reading order. These are
initial images rather than replacements. Independent token, contrast and
functional browser checks remain required for each candidate.

The October 2026 once-over was reviewed at 1920×1080 and 1280×720 in light
and dark. The single navbar row and the Geist face give the page one voice;
the hero's aside fills the space that used to sit empty, and its progress bar
and ready-to-use list read before the body copy. Weather's range bars line up
down the week like one thermometer, and the hourly strip's per-hour icons and
rain bars replace twelve table rows. On Feeds the live rail carries the only
primary tint and the series rules stay thin beside readable publication
names; four stories per page leave space below the list at 1080p. Settings'
theme cards and vertical pills sit on a white dialog surface now that the
surface tokens are re-pointed. Agents are graded by status so the two low cards stand out from the four plain ones, and the month grid's series badges make the week readable from a distance.
