# Nebuchadnezzar: ship console

A dark-only ship console for an always-on coding-agent dashboard. Its black,
phosphor green and olive-glass treatment is deliberate. The urgent Summary
item is the command to act on; subordinate information reads as instrumentation.

## Palette

| Name | Hex | Role |
| --- | --- | --- |
| Void black | `#010301` | Canvas |
| Olive glass | `#141b0c` | Panel surface |
| Pale phosphor | `#d6edc9` | Primary text |
| Phosphor green | `#3cbf5c` | Primary action and instrumentation |
| Quiet olive | `#a8c39a` | Secondary text |
| Warning amber | `#e1bd68` | Attention |

State and chart variants remain visibly distinct and carry text or icons.
The single supported scheme is dark, even when the visitor requests light.

## Type

`ui-monospace, monospace` carries the console, from headings to controls. A
moderate line height and normal sentence case protect long-session readability.
Headings use weight and scale rather than tracked capitals. Tabular numbers
keep quota readings and the clock steady. All information is left aligned.

## Layout

The shared console layout gives the urgent command a broad first row and puts
readings into a denser instrument bank beneath it. It uses the same semantic
DOM and keyboard order as the standard dashboard.

```text
+--------------------------------------------------------------+
| Dayframe / views                              clock / settings |
+--------------------------------------------------------------+
| Urgent command / explanation / action                         |
+---------------------------+-------------------+--------------+
| Agent readings            | Next event        | Weather      |
| Dense instrument bank     | Agenda            | Outlook      |
+---------------------------+-------------------+--------------+
| Feed log                                                     |
+--------------------------------------------------------------+
```

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
would flatten urgency; the console instead gives the command a full row and
uses lower density for the next event.

## Screenshot critique

Captured Summary in dark mode at all eight roadmap viewports with fixed clock
and seed; none had horizontal overflow. The full-row command is distinct from
the compact bank below; black remains black and the amber warnings retain
explicit text cues. Phone text wraps cleanly in the mono face. The captured
review disables CRT through reduced motion; separately check CRT on and off
under normal motion before accepting baselines. The live clock needs the
`.dashboard-clock` class to receive the optional glow. No screenshot baselines
were created or accepted during this review.
