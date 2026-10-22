<script lang="ts">
  import {
    degrees,
    rangeSpan,
    temperatureRole,
    type Bounds,
  } from '../../lib/weather';
  let {
    low,
    high,
    bounds,
    units = 'celsius',
    height = '0.5rem',
  }: {
    low: number;
    high: number;
    bounds: Bounds;
    units?: string;
    height?: string;
  } = $props();
  const span = $derived(rangeSpan(low, high, bounds));
</script>

<!-- Bootstrap's progress segments reset their own height token, so each one
     receives it. The leading segment is an empty offset on the shared track. -->
<div
  class="progress-stacked flex-fill"
  style:--progress-height={height}
  data-bs-component="progress"
>
  <div
    class="progress bg-transparent"
    style:--progress-height={height}
    style:width={`${span.offset}%`}
    aria-hidden="true"
  ></div>
  <div
    class="progress"
    role="progressbar"
    aria-label="Temperature range"
    aria-valuetext={`Low ${degrees(low)}, high ${degrees(high)}`}
    aria-valuenow={Math.round(high)}
    aria-valuemin={Math.round(bounds.min)}
    aria-valuemax={Math.round(bounds.max)}
    style:--progress-height={height}
    style:width={`${span.span}%`}
  >
    <div class={`progress-bar theme-${temperatureRole(high, units)}`}></div>
  </div>
</div>
