# Header controls and reminders

The October 2026 follow-up makes the header controls easier to distinguish
and lets a reminder clear itself after it has been read.

## Design plan

Keep each theme's palette and typography. Default retains cool porcelain
`#f3f6fa`, midnight navy `#13243b`, cobalt `#224cbb`, ocean `#176776` and steel
`#52647c`; Geist carries controls and prose, and Geist Mono carries the clock.
The other themes keep their own briefs and token values.

Align the header controls vertically with the clock. Separate Theme and
Settings with Bootstrap's `gap-3` so each button has its own complete outline.
Keep the phone's icon-only controls and existing navigation wrap.

```text
Desktop:  Dayframe  [view navigation]       clock | [Theme]  [Settings icon]
Phone:    Dayframe                         clock   [palette]  [sliders]
          [view navigation / More]
Reminder:                                   [Coming up                 ×]
                                            [Event and location         ]
                                            fades after 12 seconds
```

Use Bootstrap Toast's timer, fade, hover/focus pause and dismiss trigger.
Remember dismissed event IDs only during the current visit, so reloading can
show an eligible reminder again. Preserve the Summary's event priority and
calendar content when a popup disappears. Key the popup by event ID so a new
event gets its own timer.

## Plan review

Separate controls express two independent actions. More decoration, a timer
bar or another setting would compete with the urgent Summary item. Existing
theme roles and Bootstrap utilities cover the change without custom styling.
Automatic dismissal leaves the event accessible through Summary and Calendar;
hover and keyboard focus give readers extra time.

## Screenshot critique

Reviewed Default in light and dark at 1280×720, 1920×1080 and 390×844,
including the reminder-due scenario. The separated outlines distinguish the
controls without competing with the clock; both icon buttons still fit on
the phone's first header row. The reminder remains readable in both schemes
and clears the content it temporarily covers. No new ornament or motion is
needed. The nine README captures were refreshed for the header change.

Fifteen routine baselines come from the pinned-container actuals in
[CI run 39938907092](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39938907092)
at `73e896c`. Review covered all five Default light views and Summary in
Nebuchadnezzar dark and Tideline light/dark at 1280×720 and 390×844. Every
image keeps its original dimensions. The phone captures received an
independent review: all pixels outside the affected header area are unchanged.
Desktop changes are also confined to header layout, with minor raster noise
on unchanged curved edges. The desktop Calendar baseline instead uses the
reviewed actual from [run 39939477246](https://github.com/BVisagie/dayframe-dashboard/actions/runs/39939477246):
this restores an unchanged datepicker corner pixel to its pre-change value.
That run passed the other 33 required cases. The exact reviewed PNGs were
copied and their hashes verified; assertions,
tags and comparison settings were not changed. Other optional baselines keep
their historical captures, as described in `docs/ci.md`.
