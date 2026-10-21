<script lang="ts">
  import type { Weather, SourceStatus } from '../lib/types';
  import { weatherLabel, weatherIcon } from '../lib/weather';
  import Icon from './Icon.svelte';
  let {
    weather,
    status,
    units = 'celsius',
    live = false,
    locale = 'en',
    full = false,
    previewDays = 3,
    dense = false,
  }: {
    weather: Weather;
    status: SourceStatus;
    units?: string;
    live?: boolean;
    locale?: string;
    full?: boolean;
    previewDays?: number;
    dense?: boolean;
  } = $props();
</script>

<div class="d-flex align-items-center justify-content-between gap-3">
  <div>
    <p class="mb-1 fg-2">{weather.city}</p>
    <div class={dense ? 'd-flex align-items-center flex-wrap gap-2' : ''}>
      <div class="weather-temperature">
        {Math.round(weather.temperature)}<span class="fs-4"
          >°{units === 'fahrenheit' ? 'F' : 'C'}</span
        >
      </div>
      <p class="mb-1">{weatherLabel(weather.code)}</p>
    </div>
  </div>
  <Icon name={weatherIcon(weather.code)} class="weather-symbol" />
</div>
<p class="small fg-2 mb-3">
  Feels like {Math.round(weather.feelsLike)}° · Wind {Math.round(weather.wind)}
  {units === 'fahrenheit' ? 'mph' : 'km/h'} · {weather.humidity}% humidity
</p>
{#if status !== 'fresh'}<div class="alert theme-warning small" role="status">
    {status === 'offline'
      ? 'Weather is offline. Showing the saved or simulated forecast.'
      : 'Weather could not refresh. Showing the last available forecast.'}
  </div>{/if}
{#if full || previewDays > 0}<div
    class="table-responsive"
    data-bs-component="table"
  >
    <table class="table table-sm align-middle forecast-table">
      <caption class="visually-hidden"
        >{full ? 'Seven-day forecast' : 'Upcoming forecast'}</caption
      ><thead
        ><tr
          ><th scope="col">Day</th><th scope="col">Conditions</th><th
            scope="col">Low</th
          ><th scope="col">High</th><th scope="col">Rain</th></tr
        ></thead
      ><tbody>
        {#each weather.days.slice(0, full ? 7 : previewDays) as day}<tr
            ><th scope="row"
              >{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
                new Date(day.date + 'T12:00:00'),
              )}</th
            ><td
              ><Icon name={weatherIcon(day.code)} /><span
                class="visually-hidden">{weatherLabel(day.code)}</span
              ></td
            ><td>{Math.round(day.low)}°</td><td class="fw-semibold"
              >{Math.round(day.high)}°</td
            ><td>{day.precipitation}%</td></tr
          >{/each}
      </tbody>
    </table>
  </div>{/if}
<p class="source-credit small m-0">
  {#if live}Weather by <a
      href="https://open-meteo.com/"
      target="_blank"
      rel="noreferrer">Open-Meteo</a
    >
    ·
    <a
      href="https://creativecommons.org/licenses/by/4.0/"
      target="_blank"
      rel="noreferrer">CC BY 4.0</a
    >. Rounded for display.{:else}Simulated forecast · no live location
    selected.{/if}
</p>
