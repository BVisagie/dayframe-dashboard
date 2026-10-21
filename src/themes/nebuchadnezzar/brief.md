# Nebuchadnezzar: ship console

A dark-only ship console for an always-on coding-agent dashboard. Its black,
phosphor green and olive-glass treatment is deliberate. The urgent Summary
item is the command to act on; subordinate information reads as instrumentation.

## Palette

| Name           | Hex       | Role                               |
| -------------- | --------- | ---------------------------------- |
| Void black     | `#010301` | Canvas                             |
| Olive glass    | `#141b0c` | Panel surface                      |
| Pale phosphor  | `#d6edc9` | Primary text                       |
| Phosphor green | `#3cbf5c` | Primary action and instrumentation |
| Quiet olive    | `#a8c39a` | Secondary text                     |
| Warning amber  | `#e1bd68` | Attention                          |

State and chart variants remain visibly distinct and carry text or icons.
The single supported scheme is dark, even when the visitor requests light.

## Type

`ui-monospace, monospace` carries the console, from headings to controls. A
moderate line height and normal sentence case protect long-session readability.
Headings use weight and scale rather than tracked capitals. Tabular numbers
keep quota readings and the clock steady. All information is left aligned.

## Layout

The shared console layout gives the urgent command two broad columns beside
weather, with capacity, agenda and a feed log in the lower instrument bank.
Ultrawide screens place agenda and weather beside the two-column command and
give capacity and feeds two columns each below. It uses the same semantic DOM
and keyboard order as the standard dashboard.

```text
+--------------------------------------------------------------+
| Dayframe / views                              clock / settings |
+----------------------------------------+---------------------+
| Urgent command                         | Weather             |
| Explanation / action                   | Outlook when roomy  |
+---------------------+------------------+---------------------+
| Agent readings      | Next event       | Feed log            |
| Instrument bank     | Brief agenda     | Quiet headlines     |
+--------------------------------------------------------------+
```

At compact desktop height, show one agent plus a more-agents control, one
agenda entry and one headline. Taller viewports show three agents plus a
more-agents control, two agenda entries and three headlines. Keep the
`0.875rem` root floor (14 CSS pixels at the default browser size); the mono
face needs fewer visible rows rather than smaller root text.

## Principles

- Black and olive are functional surfaces; phosphor marks live information.
- Keep the urgent command distinct through area, weight and border treatment.
- Use Bootstrap shape and border tokens to make the console precise.
- Offer a static CRT finish, with no flicker, moving scanlines or cursor blink.
- Disable every effect under reduced motion or forced colours.

## Plan review

The black-and-green direction is the theme's subject, not an interchangeable
developer aesthetic. A moving CRT would reduce glanceability, so the optional
finish is a restrained static scanline and glow. Identical bordered cells
would flatten urgency; the console gives the command two columns and keeps
weather adjacent. The lower bank uses row limits to protect readable mono
text while making the remaining agents and events reachable.

## Screenshot critique

Reviewed fixed-clock, fixed-seed Summary captures at 1280×720 and 1920×1080
in the supported dark scheme. The two-column command remains dominant beside
weather; capacity, agenda and feeds form a compact lower bank. At 1280×720 a
single agent and the more-agents control preserve the mono face's breathing
room. At 1920×1080 three agent readings fit alongside the expanded agenda and
feed log. Black stays black, and amber warnings keep explicit text cues.

The initial 80 pinned-container baselines for this theme were reviewed across
all five views, eight viewports and both device pixel ratios. No substantive
clipping, overlap, unintended desktop overflow or disclosure issue was found.
Phone and tablet scrolling preserves the intended reading order. These are
initial images rather than replacements. Independent token, contrast and
functional browser checks remain required for each candidate.

A separate normal-motion on/off review confirmed that the static CRT lines
and clock glow preserve readability. The baseline matrix uses reduced motion,
so its captures deliberately omit that decorative finish.
