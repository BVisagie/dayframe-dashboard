# Dashboard composition

The Summary view answers one question: what needs attention next? Its main
panel changes from the next event to constrained agent capacity when needed.
The shell stays quiet so urgency comes from meaningful status and copy.

The Default palette uses porcelain `#f3f6fa`, midnight `#13243b`, cobalt
`#224cbb`, ocean `#176776` and steel `#52647c`. System sans-serif text keeps
controls familiar; a deliberate size and weight hierarchy distinguishes the
main item, supporting panels and compact lists. Tabular numerals keep changing
quotas aligned. The console theme uses the same information hierarchy through
its own black, green and olive brief.

```text
Dayframe                  date + clock        theme / settings
Summary    Agents    Calendar    Weather    Feeds
+-------------------------------+--------------------+
| Attention: next event or quota | Weather now        |
| Primary action                | Seven-day preview  |
+-------------------------------+--------------------+
| Agent capacity                | Coming up          |
| Compact six-agent overview    | Agenda list        |
+-------------------------------+--------------------+
| Headlines                                          |
+----------------------------------------------------+
Demo disclosure                         source attribution
```

Panels use Bootstrap cards where their grouping is useful. The urgent panel
has a stronger theme role, the capacity panel has denser rows, and headlines
use a simple list. Everything aligns left. Narrow screens follow the same
reading order in one scrolling column. Ultrawide layouts add a column.

Review against the brief rejected decorative gradients, identical card grids,
all-cap labels and animation on every panel. The console finish is deliberate
and optional. Motion only explains interactions; reduced motion and forced
colours disable decorative finishes.
