<script lang="ts">
  import { onMount } from 'svelte';
  import type { Settings, Location } from '../lib/types';
  import { themes, getTheme, themeSchema } from '../themes/registry';
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
    { name: 'Appearance', icon: 'palette' },
    { name: 'Display', icon: 'display' },
    { name: 'Weather', icon: 'cloud-sun' },
    { name: 'Calendar', icon: 'calendar3' },
    { name: 'Feeds', icon: 'rss' },
    { name: 'Demo', icon: 'easel' },
  ];
  const categories = ['bootstrap', 'technology', 'design', 'science'];
  const small = matchMedia('(max-width: 43rem)').matches;
  const current = $derived(getTheme(settings.theme));
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
      class="btn btn-text theme-secondary ms-auto"
      data-bs-dismiss={small ? 'drawer' : 'dialog'}
      aria-label="Close settings"><Icon name="x-lg" /></button
    >
  </div>
  <div class={small ? 'drawer-body' : 'dialog-body'}>
    <div class={small ? 'vstack gap-6' : 'd-flex align-items-start gap-8'}>
      <!-- A vertical rail beside the pane on dialogs; the drawer is too
           narrow, so its sections wrap above the pane instead. -->
      <div
        class={small
          ? 'nav nav-pills'
          : 'nav nav-pills nav-pills-vertical flex-shrink-0 position-sticky top-0'}
        role="tablist"
        aria-label="Settings sections"
        aria-orientation={small ? undefined : 'vertical'}
        data-bs-component="nav"
      >
        {#each sections as section, i}<button
            use:tab
            class={`nav-link justify-content-start ${i === 0 ? 'active' : ''}`}
            id={`settings-tab-${i}`}
            data-bs-toggle="tab"
            data-bs-target={`#settings-panel-${i}`}
            type="button"
            role="tab"
            aria-selected={i === 0}
            aria-controls={`settings-panel-${i}`}
            >{#if !small}<Icon name={section.icon} />{/if}{section.name}</button
          >{/each}
      </div>
      <div class="tab-content flex-grow-1 min-w-0">
        <div
          class="tab-pane show active"
          id="settings-panel-0"
          role="tabpanel"
          aria-labelledby="settings-tab-0"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-6">Appearance</h3>
          <div class="vstack gap-7">
            <div class="form-group" role="group" aria-labelledby="theme-label">
              <span id="theme-label" class="form-label">Theme</span>
              <div class="grid gap-4">
                {#each themes as theme (theme.id)}<button
                    type="button"
                    class={`card card-subtle theme-choice g-col-12 sm:g-col-4 p-0 text-start focus-ring ${settings.theme === theme.id ? 'theme-primary theme-subtle' : ''}`}
                    aria-pressed={settings.theme === theme.id}
                    onclick={() => onchange({ theme: theme.id })}
                    ><span
                      class="card-img-top d-flex overflow-hidden"
                      aria-hidden="true"
                      >{#each themeSchema.previewKeys as key}<span
                          class="flex-fill py-5"
                          style:background={theme.preview[key]}
                        ></span>{/each}</span
                    ><span class="card-body"
                      ><span class="d-flex align-items-center gap-2 fw-semibold"
                        >{theme.name}
                        {#if settings.theme === theme.id}<Icon
                            name="check-lg"
                            class="ms-auto"
                          />{/if}</span
                      >
                      <span class="small fg-2">{theme.description}</span></span
                    ></button
                  >{/each}
              </div>
            </div>
            <div class="grid gap-6">
              <div
                class="form-field g-col-12 sm:g-col-6"
                data-bs-component="form-field"
              >
                <label for="scheme" class="form-label">Colour scheme</label
                ><select
                  id="scheme"
                  class="form-control"
                  aria-describedby="scheme-help"
                  value={settings.scheme}
                  onchange={(e) =>
                    onchange({
                      scheme: e.currentTarget.value as Settings['scheme'],
                    })}
                  ><option value="system">Follow system</option><option
                    value="auto">Sunrise and sunset</option
                  ><option value="light">Light</option><option value="dark"
                    >Dark</option
                  ></select
                >
                <small id="scheme-help" class="form-text"
                  >{current.schemes.length === 1
                    ? `${current.name} is ${current.schemes[0]} only; this choice applies to other themes. `
                    : ''}Sunrise and sunset use the forecast when available,
                  otherwise 07:00–19:00.</small
                >
              </div>
            </div>
            {#each Object.entries(current.options ?? {}) as [key, option]}<div
                class="form-field"
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
        </div>
        <div
          class="tab-pane"
          id="settings-panel-1"
          role="tabpanel"
          aria-labelledby="settings-tab-1"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-6">Display</h3>
          <div class="vstack gap-7">
            <div class="vstack gap-6">
              <div class="form-field">
                <label for="scale" class="form-label"
                  >Display scale: {settings.scale}%</label
                >
                <div
                  class="form-range"
                  use:range={settings.scale}
                  data-bs-component="range"
                >
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
              </div>
              <div class="form-field">
                <span class="switch"
                  ><input
                    id="keyboard-shortcuts"
                    type="checkbox"
                    role="switch"
                    aria-describedby="keyboard-shortcuts-help"
                    checked={settings.keyboardShortcuts}
                    onchange={(e) =>
                      onchange({ keyboardShortcuts: e.currentTarget.checked })}
                  /></span
                >
                <div class="form-field-content">
                  <label for="keyboard-shortcuts">Keyboard shortcuts</label>
                  <small id="keyboard-shortcuts-help" class="form-text"
                    >Press 1–5 or a view’s first letter to switch views, and a
                    comma to open Settings.</small
                  >
                </div>
              </div>
            </div>
            <fieldset class="form-group gap-6 border-top pt-7">
              <legend class="fs-md fw-semibold">Views</legend>
              <div class="form-field">
                <span class="switch"
                  ><input
                    id="rotation"
                    type="checkbox"
                    role="switch"
                    aria-describedby="rotation-help"
                    checked={settings.rotation}
                    onchange={(e) =>
                      onchange({ rotation: e.currentTarget.checked })}
                  /></span
                >
                <div class="form-field-content">
                  <label for="rotation">Rotate views</label>
                  <small id="rotation-help" class="form-text"
                    >Rotation pauses while you interact, while Settings is open,
                    and when the page is hidden.</small
                  >
                </div>
              </div>
              <div class="grid gap-6">
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="startup" class="form-label">Startup view</label
                  ><select
                    id="startup"
                    class="form-control"
                    value={settings.startupView}
                    onchange={(e) =>
                      onchange({
                        startupView: e.currentTarget
                          .value as Settings['startupView'],
                      })}
                    >{#each ['summary', 'agents', 'calendar', 'weather', 'feeds'] as item}<option
                        value={item}
                        >{item.charAt(0).toUpperCase() + item.slice(1)}</option
                      >{/each}</select
                  >
                </div>
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="rotation-seconds" class="form-label"
                    >Seconds per view</label
                  ><input
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
                </div>
              </div>
            </fieldset>
            <fieldset class="form-group gap-6 border-top pt-7">
              <legend class="fs-md fw-semibold">Dates and times</legend>
              <div class="grid gap-6">
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="locale" class="form-label"
                    >Date and number locale</label
                  ><select
                    id="locale"
                    class="form-control"
                    value={settings.locale}
                    onchange={(e) =>
                      onchange({ locale: e.currentTarget.value })}
                    >{#each [...new Set( [settings.locale, 'en-GB', 'en-US', 'de-DE', 'fr-FR', 'ja-JP'] )] as locale}<option
                        value={locale}>{locale}</option
                      >{/each}</select
                  >
                </div>
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="date-format" class="form-label">Date format</label
                  ><select
                    id="date-format"
                    class="form-control"
                    value={settings.dateFormat}
                    onchange={(e) =>
                      onchange({
                        dateFormat: e.currentTarget
                          .value as Settings['dateFormat'],
                      })}
                    ><option value="locale">Follow locale</option><option
                      value="day-month">Day/month/year (23/11/2026)</option
                    ><option value="month-day"
                      >Month/day/year (11/23/2026)</option
                    ><option value="iso">Year-month-day (2026-11-23)</option
                    ></select
                  >
                </div>
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="time-format" class="form-label">Time format</label
                  ><select
                    id="time-format"
                    class="form-control"
                    value={settings.hourCycle}
                    onchange={(e) =>
                      onchange({
                        hourCycle: e.currentTarget
                          .value as Settings['hourCycle'],
                      })}
                    ><option value="locale">Follow locale</option><option
                      value="h12">12-hour</option
                    ><option value="h23">24-hour</option></select
                  >
                </div>
              </div>
            </fieldset>
          </div>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-2"
          role="tabpanel"
          aria-labelledby="settings-tab-2"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-3">Weather</h3>
          <p class="fg-2 mb-6">
            Forecasts connect directly to Open-Meteo. Coordinates stay in this
            browser and are sent only to that service.
          </p>
          <div class="vstack gap-7">
            <div class="vstack gap-4">
              <p class="m-0">
                <strong>Location:</strong>
                {settings.location
                  ? cityLabel(settings.location)
                  : 'City inferred from your browser time zone'}
              </p>
              <form
                class="form-field"
                onsubmit={(e) => {
                  e.preventDefault();
                  void search();
                }}
              >
                <label for="city-search" class="form-label"
                  >Search for a city</label
                >
                <div class="input-group">
                  <input
                    id="city-search"
                    class="form-control"
                    bind:value={cityQuery}
                    minlength="2"
                    maxlength="100"
                    autocomplete="off"
                  /><button
                    class="btn btn-solid theme-primary"
                    disabled={searching}
                    >{searching ? 'Searching…' : 'Search cities'}</button
                  >
                </div>
              </form>
              {#if cityResults.length}<div>
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
              <p class="form-text m-0" role="status">{cityMessage}</p>
              <div class="d-flex flex-wrap gap-3">
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
            </div>
            <div class="grid gap-6 border-top pt-7">
              <div class="form-field g-col-12 sm:g-col-6">
                <label for="units" class="form-label">Units</label><select
                  id="units"
                  class="form-control"
                  value={settings.units}
                  onchange={(e) =>
                    onchange({
                      units: e.currentTarget.value as Settings['units'],
                    })}
                  ><option value="celsius">Celsius and km/h</option><option
                    value="fahrenheit">Fahrenheit and mph</option
                  ></select
                >
              </div>
            </div>
            <p class="small fg-2 m-0">
              City search data by <a
                href="https://www.geonames.org/"
                target="_blank"
                rel="noreferrer">GeoNames</a
              > via Open-Meteo.
            </p>
          </div>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-3"
          role="tabpanel"
          aria-labelledby="settings-tab-3"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-6">Calendar</h3>
          <div class="vstack gap-7">
            <div class="grid gap-6">
              <div class="form-field g-col-12 sm:g-col-6">
                <label for="first-day" class="form-label"
                  >First day of the week</label
                ><select
                  id="first-day"
                  class="form-control"
                  value={String(settings.firstDay)}
                  onchange={(e) =>
                    onchange({
                      firstDay: Number(e.currentTarget.value) as 0 | 1,
                    })}
                  ><option value="0">Sunday</option><option value="1"
                    >Monday</option
                  ></select
                >
              </div>
            </div>
            <fieldset class="form-group gap-6 border-top pt-7">
              <legend class="fs-md fw-semibold">Reminders</legend>
              <div class="form-field">
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
              <div class="grid gap-6">
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="reminder-minutes" class="form-label"
                    >Minutes before an event</label
                  ><input
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
            </fieldset>
          </div>
        </div>
        <div
          class="tab-pane"
          id="settings-panel-4"
          role="tabpanel"
          aria-labelledby="settings-tab-4"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-3" id="feeds-title">
            Feed categories
          </h3>
          <p class="fg-2 mb-6">
            Bootstrap news is live. Other publications and stories are invented
            for this demo.
          </p>
          <div class="vstack gap-4" role="group" aria-labelledby="feeds-title">
            {#each categories as category}<div class="form-field">
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
        </div>
        <div
          class="tab-pane"
          id="settings-panel-5"
          role="tabpanel"
          aria-labelledby="settings-tab-5"
          tabindex="0"
        >
          <h3 class="fs-lg fw-semibold mb-6">Demo</h3>
          <div class="vstack gap-7">
            <div class="vstack gap-6">
              <div class="grid gap-6">
                <div class="form-field g-col-12 sm:g-col-6">
                  <label for="scenario" class="form-label">Scenario</label
                  ><select
                    id="scenario"
                    class="form-control"
                    value={settings.scenario}
                    onchange={(e) =>
                      onchange({
                        scenario: e.currentTarget.value as Settings['scenario'],
                      })}
                    >{#each ['steady', 'running-low', 'reconnect', 'reminder-due', 'stale', 'offline'] as scenario}<option
                        value={scenario}
                        >{scenario.charAt(0).toUpperCase() +
                          scenario.slice(1).replaceAll('-', ' ')}</option
                      >{/each}</select
                  >
                </div>
              </div>
              <div class="form-field">
                <span class="switch"
                  ><input
                    id="lens"
                    type="checkbox"
                    role="switch"
                    aria-describedby="lens-help"
                    checked={settings.lens}
                    onchange={(e) =>
                      onchange({ lens: e.currentTarget.checked })}
                  /></span
                >
                <div class="form-field-content">
                  <label for="lens">Bootstrap lens</label>
                  <small id="lens-help" class="form-text"
                    >Outlines each Bootstrap component on the dashboard and
                    links it to its documentation.</small
                  >
                </div>
              </div>
            </div>
            <div class="vstack gap-4 border-top pt-7">
              <div class="d-flex flex-wrap gap-3">
                <button
                  class="btn btn-outline theme-secondary"
                  onclick={onrefresh}>Refresh live sources</button
                ><button class="btn btn-outline theme-danger" onclick={onreset}
                  >Reset settings</button
                >
              </div>
              <p class="small fg-2 m-0">
                Agent usage and calendars are always simulated. URL overrides
                apply only to this visit. Reset restores this browser’s
                defaults.
              </p>
            </div>
          </div>
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
