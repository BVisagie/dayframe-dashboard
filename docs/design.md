# Dashboard composition

The Summary view answers one question: what needs attention next? Its main
panel changes from the next event to constrained agent capacity when needed,
and takes the colour of that situation: Bootstrap's `card-subtle` in the
warning, danger, primary or success role. Status reads before any word does.
The shell stays quiet so urgency comes from that one panel.

The Default palette uses porcelain `#f3f6fa`, midnight `#13243b`, cobalt
`#224cbb`, ocean `#176776`, steel `#52647c` and an amber warning `#8a5a00`.
Geist carries text and headings and Geist Mono the clock and readings; size
and colour carry the hierarchy, with medium weight for titles and semibold
kept for readings and the hero. Tabular numerals keep changing quotas
aligned. Tideline sets Atkinson Hyperlegible, and the console theme Martian
Mono, through their own briefs.

```text
[D] Dayframe  Summary 1  Agents 2  Calendar 3  Weather 4  Feeds 5   9:30 Tue 3 Nov [Replay] | Theme ⚙
+--------------------------------------------------------+-------------------------+
| (role-tinted hero)                                     | Outside now             |
| [Running low]                          Resets in       | 7°C  Partly cloudy      |
| OpenCode is running low                30m             | Feels like 6°  Wind 22  |
| 14% of the session allowance is left.  ▮▮░░░░░ 14%     | Today ▮▮▮▮▮▮ (accent)   |
| [Review agent capacity]                Use instead …   | Wed–Mon (neutral)       |
+------------------------+-------------------------------+-------------------------+
| Agent capacity  View all | Coming up       Calendar    | Across your feeds  All  |
| six readings, neutral    | today's agenda, fitted      | stories, fitted         |
| bars, badge only when low| +N more only when hidden    |                         |
+--------------------------+-----------------------------+-------------------------+
Demo data. …   Product names belong to their owners. …   Built with …   About Bootstrap ↻
```

The header is one Bootstrap navbar row, and each view is a tab pane shown by
the Tab plugin. The view heading is visually hidden: the selected pill and
the panel titles already name what is on screen. Rows share the viewport
through the `.grid` `--rows` token, so no desktop view ends in an empty band,
and lists show as many rows as fit. Panels come in three grades, all
Bootstrap cards: the hero, instrument panels with a card header, and quiet
panels outlined on the canvas with a transparent header of the same geometry,
so titles in a row line up. Healthy readings stay neutral; colour marks the
exceptions and, on Weather, today's range. Everything aligns left. Narrow
screens follow the same reading order in one scrolling column. On ultrawide
desktops the standard layout moves the agenda beside the hero and spans
capacity across two columns; the console layout adds a fourth column.

The view pills show their number shortcut as a keycap on wide screens, the
one detail only a keyboard-driven dashboard would have. Review against the
brief rejected decorative gradients, identical card grids, all-cap labels,
dotted meta strings and animation on every panel. The console finish is
deliberate and optional. Motion only explains interactions; reduced motion
and forced colours disable decorative finishes.
