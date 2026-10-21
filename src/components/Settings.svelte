<script lang="ts">
  import { onMount } from 'svelte';
  import type { Settings, Location } from '../lib/types';
  import { themes, getTheme } from '../themes/registry';
  import { settingsDialog, tab, range, combobox } from '../lib/bootstrap';
  import { searchCities } from '../lib/sources';
  import Icon from './Icon.svelte';
  let {
    settings,
    onchange,
    onclose,
    onreset,
    onrefresh,
  }: {
    settings: Settings;
    onchange: (patch: Partial<Settings>) => void;
    onclose: () => void;
    onreset: () => void;
    onrefresh: () => void;
  } = $props();
  const sections = [
    'Appearance',
    'Display',
    'Weather',
    'Calendar',
    'Feeds',
    'Demo',
  ];
  const categories = ['bootstrap', 'technology', 'design', 'science'];
  const small = matchMedia('(max-width: 43rem)').matches;
  function cityLabel(city: Location) {
    return [
      ...new Set([city.name, city.admin1, city.country].filter(Boolean)),
    ].join(', ');
  }
  let cityQuery = $state('');
  let cityResults = $state<Location[]>([]);
  let cityMessage = $state('');
  let searching = $state(false);
  let locationPending = $state(false);
  let searchVersion = 0;
  let disposed = false;
  onMount(() => () => {
    disposed = true;
    searchVersion++;
  });
  async function search() {
    const version = ++searchVersion;
    if (cityQuery.trim().length < 2) {
      cityMessage = 'Enter at least two letters of a city name.';
      return;
    }
    searching = true;
    cityMessage = '';
    cityResults = [];
    try {
      const results = await searchCities(cityQuery.trim());
      if (disposed || version !== searchVersion) return;
      cityResults = results;
      cityMessage = results.length
        ? `${results.length} ${results.length === 1 ? 'city' : 'cities'} found. Open the results menu to choose one.`
        : 'No cities matched. Try a longer name or another spelling.';
    } catch {
      if (!disposed && version === searchVersion)
        cityMessage =
          'City search could not connect to Open-Meteo. Check your connection and try again.';
    } finally {
      if (!disposed && version === searchVersion) searching = false;
    }
  }
  function location() {
    if (!navigator.geolocation) {
      cityMessage =
        'This browser does not support location sharing. Search for a city instead.';
      return;
    }
    locationPending = true;
    cityMessage = '';
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (disposed) return;
        onchange({
          location: {
            name: 'Your selected location',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
        locationPending = false;
        cityMessage =
          'Location saved in this browser and sent only to Open-Meteo.';
      },
      () => {
        if (!disposed) {
          locationPending = false;
          cityMessage =
            'Location was not available or permission was declined. Search for a city instead.';
        }
      },
      { timeout: 10000, maximumAge: 600000 },
    );
  }
  function selectedCity(node: HTMLElement) {
    const handler = (event: Event) => {
      const index = Number((event as Event & { value?: string }).value);
      const selected = cityResults[index];
      if (selected) onchange({ location: selected });
    };
    node.addEventListener('change.bs.combobox', handler);
    return {
      destroy() {
        node.removeEventListener('change.bs.combobox', handler);
      },
    };
  }
  function toggleCategory(category: string, checked: boolean) {
    onchange({
      categories: checked
        ? [...new Set([...settings.categories, category])]
        : settings.categories.filter((item) => item !== category),
    });
  }
</script>

<dialog
  use:settingsDialog
  {onclose}
  aria-labelledby="settings-title"
  data-bs-component={small ? 'drawer' : 'dialog'}
  style="--dialog-width: 58rem; --drawer-width: 100%"
>
  <div class={small ? 'drawer-header' : 'dialog-header'}>
    <h2 id="settings-title" class="h4 m-0">Settings</h2>
    <button
      class="btn btn-text theme-secondary"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}
      aria-label="Close settings"><Icon name="x-lg" /></button
    >
  </div>
  <div class={small ? 'drawer-body' : 'dialog-body'}>
    <div class="settings-content">
      <div
        class="nav nav-pills flex-row flex-wrap md:flex-column settings-nav"
        role="tablist"
        aria-label="Settings sections"
        data-bs-component="nav"
      >
        {#each sections as section, i}<button
            use:tab
            class={`nav-link text-start ${i === 0 ? 'active' : ''}`}
            id={`settings-tab-${i}`}
            data-bs-toggle="tab"
            data-bs-target={`#settings-panel-${i}`}
            type="button"
            role="tab"
            aria-selected={i === 0}
            aria-controls={`settings-panel-${i}`}>{section}</button
          >{/each}
      </div>
      <div class="tab-content">
        <div
          class="tab-pane show active"
          id="settings-panel-0"
          role="tabpanel"
          aria-labelledby="settings-tab-0"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Appearance</h3>
          <div class="vstack gap-2 mb-4">
            {#each themes as theme}<button
                class="btn btn-outline theme-secondary theme-choice"
                aria-pressed={settings.theme === theme.id}
                onclick={() => onchange({ theme: theme.id })}
                ><span class="d-flex align-items-center gap-2"
                  ><span
                    class="theme-swatch"
                    style:background={theme.preview.canvas}
                  ></span><span
                    class="theme-swatch"
                    style:background={theme.preview.accent}
                  ></span><strong>{theme.name}</strong>
                  {#if settings.theme === theme.id}<Icon
                      name="check-lg"
                    />{/if}</span
                ><span class="small d-block mt-1">{theme.description}</span
                ></button
              >{/each}
          </div>
          <div class="form-field mb-3" data-bs-component="form-field">
            <label for="scheme">Colour scheme</label><select
              id="scheme"
              class="form-control"
              value={settings.scheme}
              onchange={(e) =>
                onchange({
                  scheme: e.currentTarget.value as Settings['scheme'],
                })}
              ><option value="system">Follow system</option><option value="auto"
                >Sunrise and sunset</option
              ><option value="light">Light</option><option value="dark"
                >Dark</option
              ></select
            >
            <p class="small fg-2">
              Themes use only their supported schemes. Sunrise and sunset use
              the forecast when available, otherwise 07:00–19:00.
            </p>
          </div>
          {#each Object.entries(getTheme(settings.theme).options ?? {}) as [key, option]}<div
              class="form-field mb-3"
            >
              <span class="switch"
                ><input
                  id={`option-${key}`}
                  type="checkbox"
                  role="switch"
                  checked={settings.themeOptions[settings.theme]?.[key] ??
                    option.default}
                  onchange={(e) =>
                    onchange({
                      themeOptions: {
                        ...settings.themeOptions,
                        [settings.theme]: {
                          ...settings.themeOptions[settings.theme],
                          [key]: e.currentTarget.checked,
                        },
                      },
                    })}
                /></span
              ><label for={`option-${key}`}>{option.label}</label>
            </div>{/each}
        </div>
        <div
          class="tab-pane"
          id="settings-panel-1"
          role="tabpanel"
          aria-labelledby="settings-tab-1"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Display</h3>
          <label for="scale">Display scale: {settings.scale}%</label>
          <div class="form-range mb-3" use:range data-bs-component="range">
            <input
              id="scale"
              class="form-range-input"
              type="range"
              min="70"
              max="150"
              step="5"
              value={settings.scale}
              oninput={(e) =>
                onchange({ scale: Number(e.currentTarget.value) })}
            />
          </div>
          <div class="form-field mb-3">
            <span class="switch"
              ><input
                id="keyboard-shortcuts"
                type="checkbox"
                role="switch"
                checked={settings.keyboardShortcuts}
                onchange={(e) =>
                  onchange({ keyboardShortcuts: e.currentTarget.checked })}
              /></span
            ><label for="keyboard-shortcuts">Keyboard shortcuts</label>
          </div>
          <div class="form-field mb-3">
            <label for="startup">Startup view</label><select
              id="startup"
              class="form-control"
              value={settings.startupView}
              onchange={(e) =>
                onchange({
                  startupView: e.currentTarget.value as Settings['startupView'],
                })}
              >{#each ['summary', 'agents', 'calendar', 'weather', 'feeds'] as item}<option
                  value={item}
                  >{item.charAt(0).toUpperCase() + item.slice(1)}</option
                >{/each}</select
            >
          </div>
          <div class="form-field mb-3">
            <span class="switch"
              ><input
                id="rotation"
                type="checkbox"
                role="switch"
                checked={settings.rotation}
                onchange={(e) =>
                  onchange({ rotation: e.currentTarget.checked })}
              /></span
            ><label for="rotation">Rotate views</label>
          </div>
          <div class="form-field mb-3">
            <label for="rotation-seconds">Seconds per view</label><input
              id="rotation-seconds"
              class="form-control"
              type="number"
              min="10"
              max="300"
              value={settings.rotationSeconds}
              onchange={(e) =>
                onchange({
                  rotationSeconds: Math.max(
                    10,
                    Math.min(300, Number(e.currentTarget.value) || 30),
                  ),
                })}
            />
            <p class="small fg-2">
              Rotation pauses while you interact, while Settings is open, and
              when the page is hidden.
            </p>
          </div>
          <div class="form-field mb-3">
            <label for="locale">Date and number locale</label><select
              id="locale"
              class="form-control"
              value={settings.locale}
              onchange={(e) => onchange({ locale: e.currentTarget.value })}
              >{#each [...new Set( [settings.locale, 'en-GB', 'en-US', 'de-DE', 'fr-FR', 'ja-JP'] )] as locale}<option
                  value={locale}>{locale}</option
                >{/each}</select
            >
          </div>
          <div class="form-field mb-3">
            <label for="date-format">Date format</label><select
              id="date-format"
              class="form-control"
              value={settings.dateFormat}
              onchange={(e) =>
                onchange({
                  dateFormat: e.currentTarget.value as Settings['dateFormat'],
                })}
              ><option value="locale">Follow locale</option><option
                value="day-month">Day/month/year (23/11/2026)</option
              ><option value="month-day">Month/day/year (11/23/2026)</option
              ><option value="iso">Year-month-day (2026-11-23)</option></select
            >
          </div>
          <div class="form-field">
            <label for="time-format">Time format</label><select
              id="time-format"
              class="form-control"
              value={settings.hourCycle}
              onchange={(e) =>
                onchange({
                  hourCycle: e.currentTarget.value as Settings['hourCycle'],
                })}
              ><option value="locale">Follow locale</option><option value="h12"
                >12-hour</option
              ><option value="h23">24-hour</option></select
            >
          </div>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-2"
          role="tabpanel"
          aria-labelledby="settings-tab-2"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Weather</h3>
          <p class="small fg-2">
            Forecasts connect directly to Open-Meteo. Coordinates stay in this
            browser and are sent only to that service.
          </p>
          <p>
            <strong>Location:</strong>
            {settings.location?.name ??
              'City inferred from your browser time zone'}
          </p>
          <form
            onsubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <div class="form-field mb-2">
              <label for="city-search">Search for a city</label><input
                id="city-search"
                class="form-control"
                bind:value={cityQuery}
                minlength="2"
                maxlength="100"
                autocomplete="off"
              />
            </div>
            <button class="btn btn-solid theme-primary" disabled={searching}
              >{searching ? 'Searching…' : 'Search cities'}</button
            >
          </form>
          {#if cityResults.length}<div class="mt-3">
              <button
                class="btn btn-outline theme-secondary"
                type="button"
                data-bs-toggle="combobox"
                use:combobox
                use:selectedCity
                aria-label="Choose a city"
                ><span class="combobox-value">Choose a city</span><Icon
                  name="chevron-down"
                /></button
              >
              <div class="menu" role="listbox" aria-label="City results">
                {#each cityResults as city, index}<button
                    class="menu-item"
                    role="option"
                    aria-selected="false"
                    data-bs-value={String(index)}>{cityLabel(city)}</button
                  >{/each}
              </div>
            </div>{/if}
          <p class="small mt-2" role="status">{cityMessage}</p>
          <div class="d-flex flex-wrap gap-2 mb-4">
            <button
              class="btn btn-outline theme-secondary"
              onclick={location}
              disabled={locationPending}
              ><Icon name="geo-alt" />
              {locationPending
                ? 'Finding location…'
                : 'Use my location'}</button
            ><button
              class="btn btn-text theme-secondary"
              onclick={() => onchange({ location: null })}
              >Use time-zone city</button
            >
          </div>
          <div class="form-field">
            <label for="units">Units</label><select
              id="units"
              class="form-control"
              value={settings.units}
              onchange={(e) =>
                onchange({ units: e.currentTarget.value as Settings['units'] })}
              ><option value="celsius">Celsius and km/h</option><option
                value="fahrenheit">Fahrenheit and mph</option
              ></select
            >
          </div>
          <p class="small mt-3">
            City search data by <a
              href="https://www.geonames.org/"
              target="_blank"
              rel="noreferrer">GeoNames</a
            > via Open-Meteo.
          </p>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-3"
          role="tabpanel"
          aria-labelledby="settings-tab-3"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Calendar</h3>
          <div class="form-field mb-3">
            <label for="first-day">First day of the week</label><select
              id="first-day"
              class="form-control"
              value={settings.firstDay}
              onchange={(e) =>
                onchange({ firstDay: Number(e.currentTarget.value) as 0 | 1 })}
              ><option value="0">Sunday</option><option value="1">Monday</option
              ></select
            >
          </div>
          <div class="form-field mb-3">
            <span class="switch"
              ><input
                id="reminders"
                type="checkbox"
                role="switch"
                checked={settings.reminders}
                onchange={(e) =>
                  onchange({ reminders: e.currentTarget.checked })}
              /></span
            ><label for="reminders">Show event reminders</label>
          </div>
          <div class="form-field">
            <label for="reminder-minutes">Minutes before an event</label><input
              id="reminder-minutes"
              type="number"
              class="form-control"
              min="1"
              max="60"
              value={settings.reminderMinutes}
              onchange={(e) =>
                onchange({
                  reminderMinutes: Math.max(
                    1,
                    Math.min(60, Number(e.currentTarget.value) || 5),
                  ),
                })}
            />
          </div>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-4"
          role="tabpanel"
          aria-labelledby="settings-tab-4"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Feed categories</h3>
          <p>
            Bootstrap news is live. Other publications and stories are invented
            for this demo.
          </p>
          {#each categories as category}<div class="form-field mb-2">
              <input
                class="check"
                id={`feed-${category}`}
                type="checkbox"
                checked={settings.categories.includes(category)}
                onchange={(e) =>
                  toggleCategory(category, e.currentTarget.checked)}
              /><label for={`feed-${category}`}
                >{category.charAt(0).toUpperCase() + category.slice(1)}</label
              >
            </div>{/each}
        </div>
        <div
          class="tab-pane"
          id="settings-panel-5"
          role="tabpanel"
          aria-labelledby="settings-tab-5"
          tabindex="0"
        >
          <h3 class="h5 mb-3">Demo</h3>
          <div class="form-field mb-3">
            <label for="scenario">Scenario</label><select
              id="scenario"
              class="form-control"
              value={settings.scenario}
              onchange={(e) =>
                onchange({
                  scenario: e.currentTarget.value as Settings['scenario'],
                })}
              >{#each ['steady', 'running-low', 'reconnect', 'reminder-due', 'stale', 'offline'] as scenario}<option
                  value={scenario}>{scenario.replaceAll('-', ' ')}</option
                >{/each}</select
            >
          </div>
          <div class="form-field mb-3">
            <span class="switch"
              ><input
                id="lens"
                type="checkbox"
                role="switch"
                checked={settings.lens}
                onchange={(e) => onchange({ lens: e.currentTarget.checked })}
              /></span
            ><label for="lens">Bootstrap lens</label>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button class="btn btn-outline theme-secondary" onclick={onrefresh}
              >Refresh live sources</button
            ><button class="btn btn-outline theme-danger" onclick={onreset}
              >Reset settings</button
            >
          </div>
          <p class="small fg-2 mt-3">
            Agent usage and calendars are always simulated. URL overrides apply
            only to this visit. Reset restores this browser’s defaults.
          </p>
        </div>
      </div>
    </div>
  </div>
  <div class={small ? 'drawer-footer' : 'dialog-footer'}>
    <p class="small fg-2 me-auto m-0">Changes save in this browser.</p>
    <button
      class="btn btn-solid theme-primary"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}>Done</button
    >
  </div>
</dialog>
