# Tideline: working chartroom

A crisp nautical dashboard for developers keeping several agent workflows on
course. Daylight is salt-white with deep teal ink; night becomes a deep-ocean
instrument panel. The urgent Summary item is the next course correction.

## Palette

| Name          | Hex       | Role                           |
| ------------- | --------- | ------------------------------ |
| Salt white    | `#f0f8f8` | Daylight canvas                |
| Deep ocean    | `#092e3a` | Daylight ink and night surface |
| Channel teal  | `#086a70` | Primary decisions              |
| Signal coral  | `#ad3d35` | Attention and accent           |
| Sounding blue | `#365f7b` | Secondary readings             |
| Sea glass     | `#a9ded8` | Night information              |

Night variants lift teal and coral enough for text and interface contrast.
The semantic state system stays consistent with the other themes.

## Type

`system-ui, sans-serif` carries the working interface. Headings use the same
face with a firm weight, compact line height and no ornamental maritime type.
`ui-monospace, monospace` serves only the clock and numerical readings. This
keeps the theme systematic rather than turning the dashboard into a poster.
Labels and prose are left aligned.

## Layout

Use the standard three-column layout: a two-column action panel beside weather,
with capacity, agenda and headlines below. Keep the horizon calm with plain
surfaces and crisp borders. Ultrawide screens move the agenda beside the hero
and give capacity two columns below. Narrow screens preserve reading order
and scroll.

```text
+--------------------------------------------------------------+
| Dayframe / views                              clock / settings |
+----------------------------------------+---------------------+
| Next course correction                 | Weather now         |
| Explanation + one clear action         | Forecast instruments|
+---------------------+------------------+---------------------+
| Agent capacity      | Next event       | Headlines           |
| Compact readings    | Brief agenda     | Quiet working log   |
+--------------------------------------------------------------+
```

Compact desktop height limits previews to two agents, one agenda entry and
one headline, with controls to reach the rest. Taller viewports show six
agents, two agenda entries and three headlines. Row limits and paging keep
the root floor at `0.875rem` (14 CSS pixels at the default browser size).

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

Reviewed fixed-clock, fixed-seed Summary captures at 1280×720 and 1920×1080
in light and dark, verifying Tideline's active tokens. Salt-white and teal in
daylight become deep-ocean surfaces and sea-glass accents at night. The broad
action panel stays distinct through its theme-defined radius and spacing;
the app no longer overrides those tokens. Compact agenda and capacity previews
keep all three lower panels above the footer at 1280×720. The taller capture
uses the additional readings without adding decorative texture.

Local fitting checks cover all five views at both desktop sizes in this theme
at the default display scale. These captures support the palette and hierarchy
critique; they do not certify
contrast or the full browser matrix. Supported-scheme contract checks, hosted
browser CI and the complete viewport/DPR baseline review remain required.
No screenshot baselines were created, updated or accepted during this review.
