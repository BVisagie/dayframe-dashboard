<script lang="ts">
  import type { Weather, SourceStatus, Settings } from '../lib/types';
  import { formatTime } from '../lib/format';
  import Panel from './Panel.svelte';
  import WeatherPanel from './WeatherPanel.svelte';
  import Icon from './Icon.svelte';
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
  const hourRows = $derived(compact ? 6 : 12);
  const hourPages = $derived(
    Math.max(1, Math.ceil(weather.hours.length / hourRows)),
  );
  $effect(() => {
    if (hourPage >= hourPages) hourPage = hourPages - 1;
  });
</script>

<div class="grid">
  <Panel
    title="Seven-day forecast"
    class={`g-col-12 lg:g-col-7 ${compact ? 'compact-weather' : ''}`}
    ><WeatherPanel
      {weather}
      {status}
      units={settings.units}
      locale={settings.locale}
      {live}
      dense={compact}
      full
    />{#snippet action()}<button
        class="btn btn-text theme-secondary btn-sm"
        onclick={onsettings}><Icon name="geo-alt" /> Location and units</button
      >{/snippet}</Panel
  ><Panel title="Hourly outlook" class="g-col-12 lg:g-col-5"
    ><div class="table-responsive">
      <table class="table table-sm align-middle" data-bs-component="table">
        <caption class="visually-hidden"
          >Hourly temperatures and precipitation</caption
        ><thead
          ><tr
            ><th scope="col">Time</th><th scope="col">Temperature</th><th
              scope="col">Rain</th
            ></tr
          ></thead
        ><tbody
          >{#each weather.hours.slice(hourPage * hourRows, (hourPage + 1) * hourRows) as hour}<tr
              ><th scope="row">{formatTime(hour.time, settings)}</th><td
                >{Math.round(hour.temperature)}°</td
              ><td>{hour.precipitation}%</td></tr
            >{/each}</tbody
        >
      </table>
    </div>
    <nav aria-label="Hourly forecast pages">
      <ul class="pagination pagination-sm mb-0">
        <li class="page-item">
          <button
            class="page-link"
            disabled={hourPage === 0}
            onclick={() => hourPage--}>Previous hours</button
          >
        </li>
        <li class="page-item">
          <span class="page-link">{hourPage + 1} / {hourPages}</span>
        </li>
        <li class="page-item">
          <button
            class="page-link"
            disabled={hourPage + 1 >= hourPages}
            onclick={() => hourPage++}>Next hours</button
          >
        </li>
      </ul>
    </nav>
  </Panel>
</div>
