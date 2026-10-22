<script lang="ts">
  import type { Settings, WeatherDay, WeatherHour } from '../../lib/types';
  import {
    degrees,
    formatHour,
    isNight,
    weatherIcon,
    weatherLabel,
  } from '../../lib/weather';
  import Icon from '../Icon.svelte';
  let {
    hours,
    days,
    settings,
    dense = false,
  }: {
    hours: WeatherHour[];
    days: WeatherDay[];
    settings: Pick<Settings, 'locale' | 'hourCycle'>;
    dense?: boolean;
  } = $props();
</script>

<!-- Each hour is a table row, laid out as a horizontal list group once the
     panel is wide enough. Changing a table's display drops its semantics in
     some browsers, so every part restates its implicit role. -->
<div class="contains-inline">
  <!-- svelte-ignore a11y_no_redundant_roles -->
  <table
    class="d-block"
    role="table"
    aria-label="Hourly temperatures and precipitation"
    data-bs-component="table"
  >
    <thead class="visually-hidden">
      <!-- svelte-ignore a11y_no_redundant_roles -->
      <tr role="row">
        {#each ['Time', 'Conditions', 'Temperature', 'Rain chance'] as heading (heading)}
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <th scope="col" role="columnheader">{heading}</th>
        {/each}
      </tr>
    </thead>
    <!-- svelte-ignore a11y_no_redundant_roles -->
    <tbody
      class="list-group md:list-group-horizontal"
      role="rowgroup"
      data-bs-component="list-group"
    >
      {#each hours as hour (hour.time)}
        <!-- svelte-ignore a11y_no_redundant_roles -->
        <tr
          class={`list-group-item hstack md:vstack align-items-center text-center px-3 ${dense ? 'gap-1 py-2' : 'gap-2 py-3'}`}
          role="row"
        >
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <th
            scope="row"
            role="rowheader"
            class="fw-normal fg-2 font-monospace tabular-nums text-nowrap"
            >{formatHour(hour.time, settings)}</th
          >
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <td role="cell" class={`lh-1 ${dense ? 'fs-lg' : 'fs-xl'}`}
            ><Icon
              name={weatherIcon(hour.code, isNight(hour.time, days))}
            /><span class="visually-hidden">{weatherLabel(hour.code)}</span></td
          >
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <td
            role="cell"
            class={`w-3 fw-semibold font-monospace tabular-nums ${dense ? '' : 'fs-lg'}`}
            >{degrees(hour.temperature)}</td
          >
          <!-- svelte-ignore a11y_no_redundant_roles -->
          <td role="cell" class="d-flex align-items-center gap-2 w-100">
            <div
              class="progress flex-fill"
              role="progressbar"
              aria-label="Rain chance"
              aria-valuenow={hour.precipitation}
              aria-valuemin="0"
              aria-valuemax="100"
              style:--progress-height="0.375rem"
              data-bs-component="progress"
            >
              <div
                class="progress-bar theme-info"
                style:width={`${hour.precipitation}%`}
              ></div>
            </div>
            <span class="w-3 text-end small fg-2 font-monospace tabular-nums"
              >{hour.precipitation}%</span
            >
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
