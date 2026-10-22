<script lang="ts">
  import type { WeatherDay } from '../../lib/types';
  import {
    dayName,
    degrees,
    weatherIcon,
    weatherLabel,
    type Bounds,
  } from '../../lib/weather';
  import Icon from '../Icon.svelte';
  import RangeBar from './RangeBar.svelte';
  let {
    days,
    today,
    bounds,
    caption,
    units = 'celsius',
    locale = 'en',
    dense = false,
  }: {
    days: WeatherDay[];
    today: string;
    bounds: Bounds;
    caption: string;
    units?: string;
    locale?: string;
    dense?: boolean;
  } = $props();
  const headings = ['Day', 'Conditions', 'Rain chance', 'Low', 'Range', 'High'];
</script>

<!-- A table keeps each column aligned so the range bars read like one
     thermometer down the week; its headings stay available to screen readers. -->
<table
  class={`table table-borderless align-middle mb-0 ${dense ? 'table-sm' : ''}`}
  data-bs-component="table"
>
  <caption class="visually-hidden">{caption}</caption>
  <thead>
    <tr>
      {#each headings as heading (heading)}<th scope="col" class="p-0"
          ><span class="visually-hidden">{heading}</span></th
        >{/each}
    </tr>
  </thead>
  <tbody class="divide-y">
    {#each days as day (day.date)}<tr>
        <th scope="row" class="fw-normal text-nowrap ps-0"
          >{dayName(day.date, today, locale)}</th
        >
        <td class="fs-lg lh-1"
          ><Icon name={weatherIcon(day.code)} /><span class="visually-hidden"
            >{weatherLabel(day.code)}</span
          ></td
        >
        <td class="text-nowrap fg-2 font-monospace tabular-nums"
          ><Icon name="droplet" class="fg-info" />
          {day.precipitation}%</td
        >
        <td class="text-end fg-2 font-monospace tabular-nums"
          >{degrees(day.low)}</td
        >
        <td class="w-100"
          ><RangeBar
            low={day.low}
            high={day.high}
            {bounds}
            {units}
            height={dense ? '0.375rem' : '0.5rem'}
          /></td
        >
        <td class="fw-semibold font-monospace tabular-nums pe-0"
          >{degrees(day.high)}</td
        >
      </tr>{/each}
  </tbody>
</table>
