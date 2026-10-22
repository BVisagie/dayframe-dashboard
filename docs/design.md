# Dashboard composition

The Summary view answers one question: what needs attention next? Its main
panel changes from the next event to constrained agent capacity when needed.
The shell stays quiet so urgency comes from meaningful status and copy.

The Default palette uses porcelain `#f3f6fa`, midnight `#13243b`, cobalt
`#224cbb`, ocean `#176776` and steel `#52647c`. Geist carries text and
headings and Geist Mono the clock and readings; a deliberate size and weight
hierarchy distinguishes the main item, supporting panels and compact lists. Tabular numerals keep changing
quotas aligned. The console theme uses the same information hierarchy through
its own black, green and olive brief.

```text
[D] Dayframe   Summary  Agents  Calendar  Weather  Feeds     clock   theme / settings
+------------------------------------------+-----------------------+
| Attention: next event or quota | aside   | Outside now           |
| Message + one action           | what to | Reading, measures and |
|                                | use or  | the next days         |
|                                | who     |                       |
+----------------------+-------------------+-----------------------+
| Agent capacity       | Coming up         | Across your feeds     |
| Compact readings     | Today's agenda    | Quiet headline list   |
+----------------------+-------------------+-----------------------+
Demo disclosure                                   source attribution
```

The header is one Bootstrap navbar row, and each view is a tab pane shown by
the Tab plugin. Panels come in three grades, all Bootstrap cards: the hero
keeps its title inside a generously padded body on the primary-subtle
surface; instrument panels (weather, capacity) have a card header; quiet
panels (agenda, headlines) are outlined on the canvas. The hero's aside
answers the question the message raises: the limiting allowance's progress
and the agents that are ready, or the attendees, calendar and location of the
next event. Everything aligns left. Narrow screens follow the same reading
order in one scrolling column. On ultrawide desktops, the standard layout
keeps three shell columns, moves the agenda beside the hero and spans capacity
across two shell columns, with three columns of readings. The console layout
adds a fourth shell column.

Review against the brief rejected decorative gradients, identical card grids,
all-cap labels and animation on every panel. The console finish is deliberate
and optional. Motion only explains interactions; reduced motion and forced
colours disable decorative finishes.
