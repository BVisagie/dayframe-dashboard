<script lang="ts">
  import type { Weather, SourceStatus, Settings } from '../lib/types';
  import { formatHour, usesTwelveHours } from '../lib/weather';
  import Panel from './Panel.svelte';
  import WeatherPanel from './WeatherPanel.svelte';
  import Icon from './Icon.svelte';
  import HourlyStrip from './weather/HourlyStrip.svelte';
  let {
    weather,
    status,
    settings,
    live = false,
    compact = false,
    onsettings,
  }: {
    weather: Weather;
    status: SourceStatus;
    settings: Settings;
    live?: boolean;
    compact?: boolean;
    onsettings: () => void;
  } = $props();
  let hourPage = $state(0);
  let stripWidth = $state(0);
  // The strip turns horizontal at the md container width. Each cell then needs
  // its time label plus padding, and twelve-hour labels are wider, so the page
  // holds as many hours as the measured width fits instead of a fixed twelve.
  const hourRows = $derived.by(() => {
    if (compact) return 6;
    if (stripWidth < 768) return 12;
    const rem =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const cell = (usesTwelveHours(settings) ? 7.5 : 5.5) * rem;
    return Math.max(6, Math.min(12, Math.floor(stripWidth / cell)));
  });
  const hourPages = $derived(
    Math.max(1, Math.ceil(weather.hours.length / hourRows)),
  );
  $effect(() => {
    if (hourPage >= hourPages) hourPage = hourPages - 1;
  });
</script>

<div class="grid">
  <Panel title="Seven-day forecast" class="g-col-12"
    ><WeatherPanel
      {weather}
      {status}
      units={settings.units}
      locale={settings.locale}
      hourCycle={settings.hourCycle}
      {live}
      dense={compact}
      full
    />{#snippet action()}<button
        class="btn btn-text theme-secondary btn-sm"
        onclick={onsettings}><Icon name="geo-alt" /> Location and units</button
      >{/snippet}</Panel
  ><Panel title="Hourly outlook" class="g-col-12"
    >{#if status === 'loading'}<div
        class="placeholder-glow hstack gap-3"
        aria-hidden="true"
      >
        {#each { length: hourRows }, index (index)}<span
            class="placeholder placeholder-lg flex-fill"
          ></span>{/each}
      </div>{:else}<div bind:clientWidth={stripWidth}>
        <HourlyStrip
          hours={weather.hours.slice(
            hourPage * hourRows,
            (hourPage + 1) * hourRows,
          )}
          days={weather.days}
          {settings}
          dense={compact}
        />
      </div>{/if}
    {#snippet action()}{#if status !== 'loading'}<nav
          aria-label="Hourly forecast pages"
        >
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" class:disabled={hourPage === 0}>
              <button
                class="page-link"
                aria-label="Previous hours"
                disabled={hourPage === 0}
                onclick={() => hourPage--}><Icon name="chevron-left" /></button
              >
            </li>
            {#each { length: hourPages }, page (page)}
              {@const start = formatHour(
                weather.hours[page * hourRows]?.time ?? '',
                settings,
              )}
              <li class="page-item" class:active={page === hourPage}>
                <button
                  class="page-link font-monospace tabular-nums"
                  aria-label={`Hours from ${start}`}
                  aria-current={page === hourPage ? 'true' : undefined}
                  onclick={() => (hourPage = page)}>{start}</button
                >
              </li>{/each}
            <li class="page-item" class:disabled={hourPage + 1 >= hourPages}>
              <button
                class="page-link"
                aria-label="Next hours"
                disabled={hourPage + 1 >= hourPages}
                onclick={() => hourPage++}><Icon name="chevron-right" /></button
              >
            </li>
          </ul>
        </nav>{/if}{/snippet}
  </Panel>
</div>
