<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import type {
    Settings as SettingsType,
    View,
    Weather,
    Story,
    SourceStatus,
  } from './lib/types';
  import { simulate } from './lib/data';
  import {
    defaultSettings,
    loadSettings,
    saveSettings,
    applyUrlSettings,
  } from './lib/settings';
  import { formatTime, formatDate, formatRelative } from './lib/format';
  import {
    createWeatherSource,
    createBootstrapSource,
    resolveDefaultLocation,
  } from './lib/sources';
  import type { Source } from './lib/sources';
  import { themes, applyTheme, getTheme } from './themes/registry';
  import {
    menu,
    navOverflow,
    tooltip,
    lens,
    settingsDialog,
    toast,
  } from './lib/bootstrap';
  import appCss from './styles/app.scss?raw';
  import brand from './assets/dayframe.svg';
  import Panel from './components/Panel.svelte';
  import Icon from './components/Icon.svelte';
  import AgentCard from './components/AgentCard.svelte';
  import WeatherPanel from './components/WeatherPanel.svelte';
  import Agenda from './components/Agenda.svelte';
  import Settings from './components/Settings.svelte';
  import Calendar from './components/Calendar.svelte';
  import Feeds from './components/Feeds.svelte';

  const stack = __STACK_VERSIONS__;
  const views: { id: View; name: string; icon: string; key: string }[] = [
    { id: 'summary', name: 'Summary', icon: 'grid-1x2', key: 's' },
    { id: 'agents', name: 'Agents', icon: 'cpu', key: 'a' },
    { id: 'calendar', name: 'Calendar', icon: 'calendar3', key: 'c' },
    { id: 'weather', name: 'Weather', icon: 'cloud-sun', key: 'w' },
    { id: 'feeds', name: 'Feeds', icon: 'rss', key: 'f' },
  ];
  const params = new URLSearchParams(location.search);
  const requestedClock = params.get('clock');
  const parsedClock = requestedClock ? new Date(requestedClock) : null;
  const frozen = parsedClock !== null && Number.isFinite(parsedClock.getTime());
  const seed = params.get('seed') ?? '';
  let now = $state(frozen ? parsedClock! : new Date());
  let storage: Storage | null = null;
  try {
    storage = localStorage;
  } catch {
    /* Private browsing can disable persistence. */
  }
  let persisted = loadSettings(storage, navigator.language);
  const initialSettings = applyUrlSettings(persisted, params);
  if (!themes.some((theme) => theme.id === initialSettings.theme))
    initialSettings.theme = 'default';
  let settings = $state(initialSettings);
  let view = $state<View>(
    views.find((item) => item.id === params.get('view'))?.id ??
      untrack(() => settings.startupView),
  );
  let viewportWidth = $state(window.innerWidth);
  let viewportHeight = $state(window.innerHeight);
  const compactDesktop = $derived(
    viewportWidth >= 1100 &&
      viewportHeight /
        Math.max(
          14,
          (Math.min(viewportHeight / 1080, viewportWidth / 1920) *
            16 *
            settings.scale) /
            100,
        ) <
        60,
  );
  const summaryAgentCount = $derived(
    compactDesktop
      ? getTheme(settings.theme).layout === 'console'
        ? 1
        : 2
      : getTheme(settings.theme).layout === 'console'
        ? 3
        : 6,
  );
  let settingsOpen = $state(false);
  let aboutOpen = $state(false);
  let notice = $state('');
  let refreshing = $state(false);
  let hourPage = $state(0);
  const hourRows = $derived(compactDesktop ? 6 : 12);
  let dismissedReminder = $state('');
  let lastInteraction = Date.now();
  let settingsTrigger: HTMLButtonElement;
  let weatherSource: Source<Weather> | undefined;
  let bootstrapSource: Source<Story[]> | undefined;
  let sourceWeather = $state<Weather | null>(null);
  let sourceStories = $state<Story[] | null>(null);
  let weatherStatus = $state<SourceStatus>('fresh');
  let feedStatus = $state<SourceStatus>('fresh');
  let weatherLive = $state(false);
  const simulation = $derived(simulate(now, seed, settings.scenario));
  const replay = $derived(frozen || settings.scenario !== 'steady');
  const convertedWeather = $derived.by(() => {
    const weather = simulation.weather;
    if (settings.units !== 'fahrenheit') return weather;
    const temperature = (value: number) => (value * 9) / 5 + 32;
    return {
      ...weather,
      temperature: temperature(weather.temperature),
      feelsLike: temperature(weather.feelsLike),
      wind: weather.wind / 1.609344,
      days: weather.days.map((day) => ({
        ...day,
        low: temperature(day.low),
        high: temperature(day.high),
      })),
      hours: weather.hours.map((hour) => ({
        ...hour,
        temperature: temperature(hour.temperature),
      })),
    };
  });
  const weather = $derived(
    replay ? convertedWeather : (sourceWeather ?? convertedWeather),
  );
  const hourPages = $derived(
    Math.max(1, Math.ceil(weather.hours.length / hourRows)),
  );
  $effect(() => {
    if (hourPage >= hourPages) hourPage = hourPages - 1;
  });
  const stories = $derived(
    replay || !sourceStories
      ? simulation.stories
      : [
          ...sourceStories,
          ...simulation.stories.filter(
            (story) => story.category !== 'bootstrap',
          ),
        ].sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)),
  );
  const nextEvents = $derived(
    simulation.events
      .filter((event) => Date.parse(event.end) > now.getTime())
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
  );
  const nextEvent = $derived(nextEvents.find((event) => !event.allDay));
  const attentionAgent = $derived(
    simulation.agents.find((agent) => agent.status === 'reconnect') ??
      [...simulation.agents]
        .sort((a, b) => b.used / b.limit - a.used / a.limit)
        .find((agent) => agent.used / agent.limit >= 0.75),
  );
  const reminder = $derived(
    settings.reminders
      ? nextEvents.find(
          (event) =>
            !event.allDay &&
            Date.parse(event.start) >= now.getTime() &&
            Date.parse(event.start) - now.getTime() <=
              settings.reminderMinutes * 60000 &&
            event.id !== dismissedReminder,
        )
      : undefined,
  );
  const heroEvent = $derived(reminder ?? nextEvent);
  const sourceState = $derived(
    settings.scenario === 'offline'
      ? 'offline'
      : settings.scenario === 'stale'
        ? 'stale'
        : replay
          ? 'fresh'
          : weatherStatus,
  );

  function changeSettings(patch: Partial<SettingsType>) {
    settings = { ...settings, ...patch };
    // Only deliberate edits persist. URL overrides never copy themselves into saved settings.
    persisted = { ...persisted, ...patch };
    if (!saveSettings(storage, persisted))
      notice =
        'Settings could not be saved. Your changes still apply to this visit.';
    lastInteraction = Date.now();
  }
  function navigate(next: View) {
    view = next;
    lastInteraction = Date.now();
    const url = new URL(location.href);
    url.searchParams.set('view', next);
    history.replaceState(null, '', url);
  }
  function viewNavigation(node: HTMLElement) {
    // NavOverflow clones its menu items. Delegate application state changes
    // from their common ancestor so both originals and clones remain usable.
    const click = (event: MouseEvent) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-view]')
          : null;
      const next = views.find((item) => item.id === target?.dataset.view)?.id;
      if (next) navigate(next);
    };
    node.addEventListener('click', click);
    return {
      destroy() {
        node.removeEventListener('click', click);
      },
    };
  }
  function openSettings() {
    settingsOpen = true;
    lastInteraction = Date.now();
  }
  async function closeSettings() {
    settingsOpen = false;
    await tick();
    settingsTrigger?.focus();
  }
  function reset() {
    persisted = defaultSettings(navigator.language);
    settings = structuredClone(persisted);
    saveSettings(storage, persisted);
    const url = new URL(location.href);
    ['theme', 'scheme', 'scale', 'scenario', 'lens'].forEach((key) =>
      url.searchParams.delete(key),
    );
    history.replaceState(null, '', url);
    dismissedReminder = '';
    notice = 'Settings restored to this browser’s defaults.';
  }
  async function refresh() {
    refreshing = true;
    if (replay)
      notice =
        'This replay uses deterministic demo data. Remove the clock override and choose the steady scenario for live sources.';
    else
      await Promise.allSettled([
        weatherSource?.refresh(true),
        bootstrapSource?.refresh(true),
      ]);
    refreshing = false;
  }
  function shortcut(event: KeyboardEvent) {
    lastInteraction = Date.now();
    const target = event.target;
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      document.querySelector('dialog[open]') ||
      (target instanceof HTMLElement &&
        (target.matches('input, select, textarea, [contenteditable="true"]') ||
          target.closest('[role="listbox"], .menu, .popover, .vc, dialog')))
    )
      return;
    let next: View | undefined;
    if (event.key === ',') {
      event.preventDefault();
      openSettings();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      next =
        views[
          (views.findIndex((item) => item.id === view) +
            (event.key === 'ArrowRight' ? 1 : 4)) %
            5
        ].id;
    } else
      next = views.find(
        (item, i) =>
          item.key === event.key.toLowerCase() || String(i + 1) === event.key,
      )?.id;
    if (next) {
      event.preventDefault();
      navigate(next);
    }
  }
  onMount(() => {
    const timer = setInterval(() => {
      if (!frozen) now = new Date();
      const interacting =
        document.activeElement?.matches(
          'input, select, textarea, [contenteditable="true"]',
        ) || document.querySelector('.menu.show, .popover, dialog[open]');
      if (
        settings.rotation &&
        !document.hidden &&
        !settingsOpen &&
        !aboutOpen &&
        !interacting &&
        Date.now() - lastInteraction >= settings.rotationSeconds * 1000
      )
        navigate(
          views[
            (views.findIndex((item) => item.id === view) + 1) % views.length
          ].id,
        );
    }, 1000);
    const media = matchMedia('(prefers-color-scheme: dark)');
    const updateScheme = () =>
      applyTheme(
        settings.theme,
        settings.scheme,
        settings.themeOptions[settings.theme],
        weather.days[0],
        now,
      );
    media.addEventListener('change', updateScheme);
    return () => {
      clearInterval(timer);
      media.removeEventListener('change', updateScheme);
    };
  });
  $effect(() => {
    applyTheme(
      settings.theme,
      settings.scheme,
      settings.themeOptions[settings.theme],
      weather.days[0],
      now,
    );
    document.documentElement.style.setProperty(
      '--display-scale',
      String(settings.scale / 100),
    );
    document.documentElement.lang = settings.locale;
  });
  $effect(() => {
    if (replay) return;
    const units = settings.units;
    const selectedLocation = settings.location;
    // A previous location or unit system must not be labelled as the new one
    // while its replacement source is resolving.
    sourceWeather = null;
    weatherLive = false;
    weatherStatus = 'fresh';
    const lifetime = new AbortController();
    let cancelled = false;
    let current: Source<Weather> | undefined;
    let unsubscribe: (() => void) | undefined;
    const fallback = untrack(() => convertedWeather);
    void (async () => {
      try {
        const location =
          selectedLocation ??
          (await resolveDefaultLocation(
            Intl.DateTimeFormat().resolvedOptions().timeZone,
            undefined,
            { signal: lifetime.signal },
          ));
        if (cancelled) return;
        current = createWeatherSource({ location, units, fallback, storage });
        weatherSource = current;
        unsubscribe = current.subscribe((snapshot) => {
          sourceWeather = snapshot.data;
          weatherStatus = snapshot.status;
          weatherLive = snapshot.updatedAt !== null;
        });
        await current.refresh();
      } catch {
        if (!cancelled) {
          weatherStatus = navigator.onLine ? 'stale' : 'offline';
          sourceWeather = fallback;
          weatherLive = false;
        }
      }
    })();
    const timer = setInterval(() => {
      if (!document.hidden) void current?.refresh();
    }, 60000);
    return () => {
      cancelled = true;
      lifetime.abort();
      clearInterval(timer);
      unsubscribe?.();
      current?.destroy();
      if (weatherSource === current) weatherSource = undefined;
    };
  });
  $effect(() => {
    if (replay) return;
    const current = createBootstrapSource({
      fallback: untrack(() =>
        simulation.stories.filter((story) => story.category === 'bootstrap'),
      ),
      storage,
    });
    bootstrapSource = current;
    const unsubscribe = current.subscribe((snapshot) => {
      sourceStories = snapshot.data;
      feedStatus = snapshot.status;
    });
    void current.refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void current.refresh();
    }, 60000);
    return () => {
      clearInterval(timer);
      unsubscribe();
      current.destroy();
      if (bootstrapSource === current) bootstrapSource = undefined;
    };
  });
</script>

<svelte:window
  bind:innerWidth={viewportWidth}
  bind:innerHeight={viewportHeight}
  onkeydown={shortcut}
  onpointerdown={() => (lastInteraction = Date.now())}
  onpointermove={() => (lastInteraction = Date.now())}
  ononline={() => void refresh()}
/>
<svelte:head
  ><title>{views.find((item) => item.id === view)?.name} · Dayframe</title
  ></svelte:head
>

<div class="dashboard-shell d-flex flex-column" use:lens={settings.lens}>
  <a href="#main" class="visually-hidden-focusable">Skip to dashboard</a>
  <header
    class="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4"
  >
    <a
      href="?view=summary"
      onclick={(e) => {
        e.preventDefault();
        navigate('summary');
      }}
      class="brand d-flex align-items-center gap-2"
      ><img src={brand} class="brand-symbol" alt="" />Dayframe</a
    >
    <div class="d-flex align-items-center gap-3 ms-auto">
      <div class="text-end">
        <div class="clock dashboard-clock" aria-label="Current time">
          {formatTime(now, settings)}
        </div>
        <div class="small fg-2">
          {formatDate(
            now,
            settings.locale,
            {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            },
            settings.dateFormat,
          )}{frozen ? ' · replay' : ''}
        </div>
      </div>
      <div class="vr d-none sm:d-block"></div>
      <div
        class="btn-group"
        data-bs-component="button-group"
        aria-label="Dashboard controls"
      >
        <div class="position-relative">
          <button
            class="btn btn-outline"
            use:menu
            data-bs-toggle="menu"
            aria-label="Choose theme"
            ><Icon name="palette" /><span class="d-none sm:d-inline">Theme</span
            ></button
          >
          <div class="menu" data-bs-component="menu">
            {#each themes as theme}<button
                class="menu-item"
                aria-current={settings.theme === theme.id ? 'true' : undefined}
                onclick={() => changeSettings({ theme: theme.id })}
                >{theme.name}</button
              >{/each}
          </div>
        </div>
        <button
          class="btn btn-outline"
          use:tooltip={{ title: 'Settings (,)' }}
          onclick={openSettings}
          bind:this={settingsTrigger}
          aria-label="Open settings"><Icon name="sliders" /></button
        >
      </div>
    </div>
  </header>
  <nav
    aria-label="Dashboard views"
    class="mb-4"
    use:navOverflow
    use:viewNavigation
    data-bs-component="nav-overflow"
  >
    <ul class="nav nav-pills gap-1">
      {#each views as item, i}<li class="nav-item">
          <button
            class={`nav-link ${view === item.id ? 'active' : ''}`}
            aria-current={view === item.id ? 'page' : undefined}
            data-view={item.id}
            aria-keyshortcuts={`${i + 1} ${item.key}`}
            ><Icon name={item.icon} /><span>{item.name}</span></button
          >
        </li>{/each}
    </ul>
  </nav>
  <main id="main" class="flex-grow-1" tabindex="-1">
    <div
      class="d-flex align-items-end justify-content-between flex-wrap gap-3 mb-4"
    >
      <div>
        <h1 class="view-heading">
          {view === 'summary'
            ? 'Your day, in focus'
            : views.find((item) => item.id === view)?.name}
        </h1>
        <p class="fg-2 mt-1 mb-0">
          {view === 'summary'
            ? 'Capacity, commitments and the world outside.'
            : view === 'agents'
              ? 'Six agents. One clear view of your capacity.'
              : view === 'calendar'
                ? 'A little room for what comes next.'
                : view === 'weather'
                  ? 'The outlook for the day and the week ahead.'
                  : 'What is moving across your interests.'}
        </p>
      </div>
      <span class="badge badge-subtle theme-secondary" data-bs-component="badge"
        >{settings.scenario === 'steady'
          ? 'Demo workspace'
          : settings.scenario.replaceAll('-', ' ')}</span
      >
    </div>
    {#if notice}<div
        class="alert theme-info d-flex gap-3 align-items-center"
        role="status"
      >
        {notice}<button
          class="btn btn-ghost ms-auto"
          aria-label="Dismiss notice"
          onclick={() => (notice = '')}><Icon name="x-lg" /></button
        >
      </div>{/if}
    {#if settings.scenario === 'offline' || settings.scenario === 'stale'}<div
        class="alert theme-warning"
        role="status"
        data-bs-component="alert"
      >
        <Icon name="wifi-off" />
        {settings.scenario === 'offline'
          ? 'Offline scenario: showing saved or simulated data. Your settings are available in this browser.'
          : 'Stale scenario: sources need a refresh. The dashboard keeps the last available data visible.'}
      </div>{/if}
    {#if view === 'summary'}
      <div class="grid dashboard-grid">
        <Panel
          title={reminder
            ? 'Starting soon'
            : attentionAgent
              ? 'Needs attention'
              : heroEvent && Date.parse(heroEvent.start) <= now.getTime()
                ? 'Happening now'
                : 'Next on your calendar'}
          class="hero-panel summary-hero"
        >
          {#if attentionAgent && !reminder}<p class="small mb-3">
              <Icon name="exclamation-circle" />
              {attentionAgent.status === 'reconnect'
                ? 'Connection needs attention'
                : 'Agent capacity'}
            </p>
            <h2 class="hero-title mb-3">
              {attentionAgent.status === 'reconnect'
                ? `${attentionAgent.name} needs reconnecting`
                : `${attentionAgent.name} is running low`}
            </h2>
            <p class="hero-context mb-4">
              {attentionAgent.status === 'reconnect'
                ? 'This simulated account has lost its connection. Other agents remain available.'
                : `${Math.round((1 - attentionAgent.used / attentionAgent.limit) * 100)}% remains in the current ${attentionAgent.window.toLowerCase()}. Plan the next task around available capacity.`}
            </p>
            <button
              class="btn btn-solid theme-primary"
              onclick={() => navigate('agents')}
              >Review agent capacity <Icon name="arrow-right" /></button
            >
          {:else if heroEvent}<p class="small mb-3">
              <Icon name="calendar-event" />
              {formatRelative(heroEvent.start, now, settings.locale)}
            </p>
            <h2 class="hero-title mb-3">{heroEvent.title}</h2>
            <p class="hero-context mb-4">
              {formatTime(heroEvent.start, settings)}–{formatTime(
                heroEvent.end,
                settings,
              )} · {heroEvent.location}<br />{heroEvent.description}
            </p>
            <button
              class="btn btn-solid theme-primary"
              onclick={() => navigate('calendar')}
              >View your calendar <Icon name="arrow-right" /></button
            >
          {:else}<h2 class="hero-title mb-3">A clear stretch ahead</h2>
            <p class="hero-context">
              No upcoming timed events. Your agent capacity is ready for the
              next task.
            </p>
            <button
              class="btn btn-solid theme-primary"
              onclick={() => navigate('agents')}>View agent capacity</button
            >{/if}
        </Panel>
        <Panel title="Outside now" class="summary-weather"
          ><WeatherPanel
            {weather}
            status={sourceState}
            units={settings.units}
            locale={settings.locale}
            live={!replay && weatherLive}
            dense={compactDesktop}
            previewDays={compactDesktop ? 0 : 2}
          />{#snippet action()}<button
              class="btn btn-ghost btn-sm"
              onclick={() => navigate('weather')}
              aria-label="View full weather"
              ><Icon name="arrow-up-right" /></button
            >{/snippet}</Panel
        >
        <Panel title="Agent capacity" class="summary-agents"
          ><div class="grid" style="--gap: 0 1.5rem">
            {#each simulation.agents.slice(0, summaryAgentCount) as agent}<div
                class={summaryAgentCount === 1
                  ? 'g-col-12'
                  : viewportWidth >= 1100
                    ? 'g-col-6'
                    : 'g-col-12 sm:g-col-6'}
              >
                <AgentCard {agent} compact locale={settings.locale} />
              </div>{/each}
          </div>
          {#if summaryAgentCount < simulation.agents.length}<button
              class="btn btn-link p-0 mt-2"
              onclick={() => navigate('agents')}
              >+{simulation.agents.length - summaryAgentCount} more agents</button
            >{/if}
          {#snippet action()}<button
              class="btn btn-ghost btn-sm"
              onclick={() => navigate('agents')}>View all</button
            >{/snippet}</Panel
        >
        <Panel title="Coming up" class="summary-calendar"
          ><Agenda
            events={nextEvents}
            locale={settings.locale}
            hourCycle={settings.hourCycle}
            max={compactDesktop ? 1 : 2}
            compact
            onmore={() => navigate('calendar')}
          /></Panel
        >
        <Panel title="Across your feeds" class="summary-feeds"
          ><ul
            class="list-group list-group-flush"
            data-bs-component="list-group"
          >
            {#each stories
              .filter((story) => settings.categories.includes(story.category))
              .slice(0, compactDesktop ? 1 : 3) as story}<li
                class="list-group-item px-0"
              >
                <div class="small fg-2 mb-1">
                  {story.publication} · {story.live ? 'Live' : 'Demo'}
                </div>
                <h3 class="agent-name mb-0">
                  {#if story.live && story.url}<a
                      href={story.url}
                      target="_blank"
                      rel="noreferrer">{story.title}</a
                    >{:else}{story.title}{/if}
                </h3>
              </li>{:else}<li class="list-group-item px-0">
                No categories selected. Enable feeds in Settings.
              </li>{/each}
          </ul>
          {#snippet action()}<button
              class="btn btn-ghost btn-sm"
              onclick={() => navigate('feeds')}>All stories</button
            >{/snippet}</Panel
        >
      </div>
    {:else if view === 'agents'}<div class="grid agents-grid">
        {#each simulation.agents as agent}<AgentCard
            {agent}
            locale={settings.locale}
          />{/each}
      </div>
      <div class="alert theme-info mt-4" data-bs-component="alert">
        <Icon name="info-circle" /> Invented usage follows typical session, weekly,
        monthly and model allowance shapes. It is never connected to a real account.
      </div>
    {:else if view === 'calendar'}<Calendar
        events={simulation.events}
        {now}
        {settings}
        compact={compactDesktop}
      />
    {:else if view === 'weather'}<div class="grid">
        <Panel
          title="Seven-day forecast"
          class={`g-col-12 lg:g-col-7 ${compactDesktop ? 'compact-weather' : ''}`}
          ><WeatherPanel
            {weather}
            status={sourceState}
            units={settings.units}
            locale={settings.locale}
            live={!replay && weatherLive}
            dense={compactDesktop}
            full
          />{#snippet action()}<button
              class="btn btn-ghost btn-sm"
              onclick={openSettings}
              ><Icon name="geo-alt" /> Location and units</button
            >{/snippet}</Panel
        ><Panel title="Hourly outlook" class="g-col-12 lg:g-col-5"
          ><div class="table-responsive">
            <table
              class="table table-sm align-middle"
              data-bs-component="table"
            >
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
    {:else}<Feeds
        {stories}
        {settings}
        {now}
        compact={compactDesktop}
        status={settings.scenario === 'offline'
          ? 'offline'
          : settings.scenario === 'stale'
            ? 'stale'
            : replay
              ? 'fresh'
              : feedStatus}
        onchange={changeSettings}
      />{/if}
  </main>
  <footer
    class="dashboard-footer border-top mt-2 pt-2 d-flex flex-wrap align-items-start justify-content-between gap-3"
  >
    <div class="vstack gap-1" style="max-width: 79ch">
      <p class="m-0">
        <strong>Demo data.</strong> Agent usage, accounts, calendars and non-Bootstrap
        feeds are simulated. Product names belong to their owners. Dayframe is unaffiliated.
      </p>
      <p class="m-0">
        Built with Bootstrap {stack.bootstrap}, Svelte {stack.svelte} and Vite {stack.vite}.
      </p>
    </div>
    <div class="d-flex align-items-center gap-3">
      <button class="btn btn-link btn-sm p-0" onclick={() => (aboutOpen = true)}
        >About Bootstrap</button
      ><button
        class="btn btn-ghost btn-sm"
        onclick={refresh}
        disabled={refreshing}
        aria-label="Refresh live sources"
        >{#if refreshing}<span class="spinner spinner-sm" aria-hidden="true"
          ></span>{:else}<Icon name="arrow-clockwise" />{/if}</button
      >
    </div>
  </footer>
</div>
{#if settingsOpen}<Settings
    {settings}
    onchange={changeSettings}
    onclose={() => void closeSettings()}
    onreset={reset}
    onrefresh={() => void refresh()}
  />{/if}
{#if aboutOpen}<dialog
    use:settingsDialog
    onclose={() => (aboutOpen = false)}
    aria-labelledby="about-title"
    style="--dialog-width: 46rem"
  >
    <div class="dialog-header">
      <h2 class="h4 m-0" id="about-title">Bootstrap, at work</h2>
      <button
        class="btn btn-ghost"
        onclick={() => (aboutOpen = false)}
        aria-label="Close about"><Icon name="x-lg" /></button
      >
    </div>
    <div class="dialog-body prose">
      <p class="fs-5">
        Built with Bootstrap <strong>{stack.bootstrap}</strong>, Svelte {stack.svelte}
        and Vite {stack.vite}.
      </p>
      <p>
        Cards, nav overflow, progress, badges, avatars, lists, tables, menus,
        datepicker, popovers, tooltips, dialogs, drawers, tabs, combobox, range
        and toasts all use Bootstrap’s components and JavaScript.
      </p>
      <p>
        Themes recolour Bootstrap’s tokens and roles. Custom app CSS covers
        dashboard composition, calendar geometry, small charts and the
        inspection lens.
      </p>
      <p>
        <strong>Custom app CSS:</strong>
        {new TextEncoder()
          .encode(appCss)
          .length.toLocaleString(settings.locale)} bytes before compression. Every
        build records the raw and gzip footprint.
      </p>
      <p>
        <strong>Current theme:</strong>
        {getTheme(settings.theme).name}. {themes.length} themes discovered automatically.
      </p>
      <button
        class="btn btn-outline mb-3"
        onclick={() => {
          changeSettings({ lens: !settings.lens });
          aboutOpen = false;
        }}>{settings.lens ? 'Turn off' : 'Turn on'} Bootstrap lens</button
      >
      <h3 class="h5">Recent Bootstrap headlines</h3>
      <ul>
        {#each stories
          .filter((story) => story.category === 'bootstrap')
          .slice(0, 4) as story}<li>
            {#if story.live && story.url}<a
                href={story.url}
                target="_blank"
                rel="noreferrer">{story.title}</a
              >{:else}{story.title} <span class="small">(demo)</span>{/if}
          </li>{/each}
      </ul>
      <p class="small">
        <a
          href="https://getbootstrap.com/docs/6.0/"
          target="_blank"
          rel="noreferrer">Bootstrap documentation</a
        >
        ·
        <a
          href={`${import.meta.env.BASE_URL}third-party-notices.txt`}
          target="_blank"
          rel="noreferrer">Third-party notices</a
        >
      </p>
    </div>
  </dialog>{/if}
{#if reminder}<div class="toast-container" aria-live="polite">
    <div class="toast" use:toast data-bs-component="toast" role="status">
      <div class="toast-header">
        <Icon name="calendar-event" /><strong class="me-auto ms-2"
          >Coming up {formatRelative(
            reminder.start,
            now,
            settings.locale,
          )}</strong
        ><button
          class="btn btn-ghost btn-sm"
          aria-label="Dismiss reminder"
          onclick={() => (dismissedReminder = reminder.id)}
          ><Icon name="x-lg" /></button
        >
      </div>
      <div class="toast-body">
        <strong>{reminder.title}</strong>
        <p class="mb-0">{reminder.location} · Simulated calendar</p>
      </div>
    </div>
  </div>{/if}
