# Tideline: working chartroom

A crisp nautical dashboard for developers keeping several agent workflows on
course. Daylight is salt-white with deep teal ink; night becomes a deep-ocean
instrument panel. The urgent Summary item is the next course correction.

## Palette

| Name | Hex | Role |
| --- | --- | --- |
| Salt white | `#f0f8f8` | Daylight canvas |
| Deep ocean | `#092e3a` | Daylight ink and night surface |
| Channel teal | `#086a70` | Primary decisions |
| Signal coral | `#ad3d35` | Attention and accent |
| Sounding blue | `#365f7b` | Secondary readings |
| Sea glass | `#a9ded8` | Night information |

Night variants lift teal and coral enough for text and interface contrast.
The semantic state system stays consistent with the other themes.

## Type

`system-ui, sans-serif` carries the working interface. Headings use the same
face with a firm weight, compact line height and no ornamental maritime type.
`ui-monospace, monospace` serves only the clock and numerical readings. This
keeps the theme systematic rather than turning the dashboard into a poster.
Labels and prose are left aligned.

## Layout

Use the standard layout: a broad action panel alongside an agenda, followed by
compact capacity and forecast instruments. Keep the horizon calm with plain
surfaces and crisp borders. Ultrawide screens gain a third column.

```text
+--------------------------------------------------------------+
| Dayframe / views                              clock / settings |
+------------------------------------+-------------------------+
| Next course correction             | Next event              |
| Explanation + one clear action     | Agenda                  |
+------------------------------------+-------------------------+
| Agent capacity                     | Forecast instruments    |
+------------------------------------+-------------------------+
| Headlines / quiet working log                                |
+--------------------------------------------------------------+
```

## Principles

- Teal provides a stable working frame; coral signals a meaningful action.
- Convey the chartroom through ink, spacing and rules, without nautical icons.
- Use Bootstrap roles for every component and semantic state.
- Give the hero more space while keeping supporting instruments economical.
- Maintain clear focus and text cues in daylight, ocean and forced colours.

## Plan review

A themed illustration or wave texture would compete with an always-on
dashboard, so the nautical reference is entirely structural and chromatic.
Coral is deep enough for daylight contrast rather than a fashionable pastel.
This theme changes only its own folder: no view, registry or layout edits.

## Screenshot critique

Captured Summary in both schemes at all eight roadmap viewports with fixed
clock and seed; none had horizontal overflow. Teal retains the same systematic
hierarchy in daylight and ocean mode, with no decorative texture competing
with the urgent item. Ultrawide displays gain a useful third column. The
light and dark role contrast checks pass independently, including coral.
As with Default, the app should reduce agenda rows for desktop fitting and
stop overriding the theme's hero radius and padding tokens. No screenshot
baselines were created or accepted during this review.
