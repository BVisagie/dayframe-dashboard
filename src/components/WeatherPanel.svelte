<script lang="ts">
  import type { Weather, SourceStatus, Settings } from '../lib/types';
  import {
    degrees,
    formatSunTime,
    isNight,
    todayKey,
    weatherIcon,
    weatherLabel,
    weekBounds,
  } from '../lib/weather';
  import { fitRows } from '../lib/fit';
  import Icon from './Icon.svelte';
  import DayTable from './weather/DayTable.svelte';
  let {
    weather,
    status,
    units = 'celsius',
    live = false,
    locale = 'en',
    full = false,
    previewDays = 3,
    dense = false,
    fit = false,
    hourCycle = 'locale',
  }: {
    weather: Weather;
    status: SourceStatus;
    units?: string;
    live?: boolean;
    locale?: string;
    full?: boolean;
    previewDays?: number;
    dense?: boolean;
    /** Show as many preview days as the panel fits. */
    fit?: boolean;
    hourCycle?: Settings['hourCycle'];
  } = $props();
  const today = $derived(todayKey(weather.hours));
  const day = $derived(
    weather.days.find((item) => item.date === today) ?? weather.days[0],
  );
  const bounds = $derived(weekBounds(weather.days));
  const icon = $derived(
    weatherIcon(weather.code, isNight(weather.hours[0]?.time, weather.days)),
  );
  const unit = $derived(units === 'fahrenheit' ? 'F' : 'C');
  const speed = $derived(units === 'fahrenheit' ? 'mph' : 'km/h');
  const days = $derived(weather.days.slice(0, full ? 7 : previewDays));
  // Summary copy differs from the full view's so each sentence appears once
  // on the page, even with every view mounted.
  const problem = $derived(
    status === 'offline'
      ? full
        ? `Weather is offline. Showing ${live ? 'the forecast saved in this browser' : 'a simulated forecast'} until the connection returns.`
        : `Offline. Showing ${live ? 'the saved' : 'a simulated'} forecast.`
      : status === 'fresh' || status === 'loading'
        ? ''
        : full
          ? `Weather could not refresh. Showing ${live ? 'the last forecast received' : 'a simulated forecast'}.`
          : `Not refreshed. Showing ${live ? 'the last' : 'a simulated'} forecast.`,
  );
</script>

{#if status === 'loading'}
  <div
    class={full ? 'grid' : 'vstack gap-3'}
    role="status"
    data-bs-component="placeholder"
  >
    <span class="visually-hidden"
      >{full ? 'Loading weather' : 'Loading the forecast'}</span
    >
    <div
      class={`placeholder-glow vstack gap-3 ${full ? 'g-col-12 md:g-col-5' : ''}`}
      aria-hidden="true"
    >
      <span class="placeholder w-25"></span>
      <span class="placeholder w-50 text-4xl"></span>
      <span class="placeholder w-75"></span>
    </div>
    {#if full || previewDays > 0}<div
        class={`placeholder-glow vstack gap-3 ${full ? 'g-col-12 md:g-col-7' : ''}`}
        aria-hidden="true"
      >
        {#each { length: full ? 7 : previewDays }, index (index)}<span
            class="placeholder w-100"
          ></span>{/each}
      </div>{/if}
  </div>
{:else if full}
  {#if problem}<div
      class="alert theme-warning"
      role="status"
      data-bs-component="alert"
    >
      <Icon name="wifi-off" />
      {problem}
    </div>{/if}
  <!-- Conditions and the week share the panel at equal weight; measures
       are label and value pairs rather than one joined sentence. -->
  <div class="grid align-items-center my-auto" style="--gap: var(--spacer-7)">
    <div class={`g-col-12 md:g-col-6 vstack ${dense ? 'gap-3' : 'gap-5'}`}>
      <p class="fs-lg fw-medium m-0">{weather.city}</p>
      <div class="d-flex align-items-center gap-4">
        <Icon
          name={icon}
          class={`${dense ? 'text-5xl' : 'text-6xl'} fg-primary`}
        />
        <div class="min-w-0">
          <p
            class={`weather-temperature ${dense ? 'text-5xl' : 'text-6xl'} fw-medium lh-1 m-0 text-nowrap`}
          >
            <span class="font-monospace tabular-nums"
              >{Math.round(weather.temperature)}</span
            ><span class="fs-2xl fg-2">°{unit}</span>
          </p>
          <p class="fs-lg m-0 mt-2">{weatherLabel(weather.code)}</p>
        </div>
      </div>
      <dl
        class="weather-measures grid m-0"
        style="--columns: 3; --gap: var(--spacer-4) var(--spacer-5)"
      >
        {#each [{ label: 'Feels like', value: degrees(weather.feelsLike) }, { label: 'Wind', value: `${Math.round(weather.wind)} ${speed}` }, { label: 'Humidity', value: `${weather.humidity}%` }, { label: 'Rain chance', value: `${day.precipitation}%` }] as measure (measure.label)}<div
          >
            <dt class="fw-normal fg-2">{measure.label}</dt>
            <dd
              class={`${dense ? 'fs-lg' : 'fs-xl'} font-monospace tabular-nums m-0`}
            >
              {measure.value}
            </dd>
          </div>{/each}
        <div>
          <dt class="fw-normal fg-2"><Icon name="sunrise" /> Sunrise</dt>
          <dd
            class={`${dense ? 'fs-lg' : 'fs-xl'} font-monospace tabular-nums m-0`}
          >
            <time datetime={day.sunrise}
              >{formatSunTime(day.sunrise, { locale, hourCycle })}</time
            >
          </dd>
        </div>
        <div>
          <dt class="fw-normal fg-2"><Icon name="sunset" /> Sunset</dt>
          <dd
            class={`${dense ? 'fs-lg' : 'fs-xl'} font-monospace tabular-nums m-0`}
          >
            <time datetime={day.sunset}
              >{formatSunTime(day.sunset, { locale, hourCycle })}</time
            >
          </dd>
        </div>
      </dl>
      <p class="small fg-2 m-0">
        {#if live}Weather by <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noreferrer">Open-Meteo</a
          >,
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer">CC BY 4.0</a
          >. Rounded for display.{:else}Simulated forecast, no live location
          selected{/if}
      </p>
    </div>
    <div class="g-col-12 md:g-col-6">
      <DayTable
        {days}
        {today}
        {bounds}
        {units}
        {locale}
        {dense}
        caption="Seven-day forecast"
      />
    </div>
  </div>
{:else}
  <div class={`vstack flex-grow-1 min-h-0 ${dense ? 'gap-2' : 'gap-3'}`}>
    <div class="d-flex align-items-center gap-3">
      <Icon
        name={icon}
        class={`${dense ? 'text-4xl' : 'text-5xl'} fg-primary`}
      />
      <p
        class={`${dense ? 'text-4xl' : 'text-5xl'} fw-medium lh-1 m-0 text-nowrap`}
      >
        <span class="font-monospace tabular-nums"
          >{Math.round(weather.temperature)}</span
        ><span class="fs-xl fg-2">°{unit}</span>
      </p>
      <div class="min-w-0">
        <p class="fw-medium m-0">{weatherLabel(weather.code)}</p>
        <p class="small fg-2 m-0">{weather.city}</p>
      </div>
    </div>
    <p class="fg-2 m-0 d-flex flex-wrap column-gap-4">
      <span
        >Feels like <span class="fg-1 font-monospace tabular-nums"
          >{degrees(weather.feelsLike)}</span
        ></span
      ><span
        >Wind <span class="fg-1 font-monospace tabular-nums"
          >{Math.round(weather.wind)}</span
        >
        {speed}</span
      >{#if !days.length}<span
          ><span class="fg-1 font-monospace tabular-nums"
            >{day.precipitation}%</span
          > chance of rain</span
        >{/if}
    </p>
    {#if days.length}<div
        class:fit-rows={fit}
        use:fitRows={{ enabled: fit, items: 'tbody > tr', onfit: () => {} }}
      >
        <DayTable
          {days}
          {today}
          {bounds}
          {units}
          {locale}
          dense
          caption="Forecast for the next days"
        />
      </div>{/if}
    {#if problem}<p class="small m-0 d-flex gap-2" role="status">
        <Icon name="wifi-off" class="fg-warning" />{problem}
      </p>{/if}
    {#if live}<p class="small fg-2 m-0">
        Data from <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noreferrer">Open-Meteo</a
        >,
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noreferrer">CC BY 4.0</a
        >
      </p>{:else if !problem}<p class="small fg-2 m-0">
        Simulated forecast
      </p>{/if}
  </div>
{/if}
