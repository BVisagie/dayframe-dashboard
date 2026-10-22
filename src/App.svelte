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
  import { limitingAllowance, primaryAllowance } from './lib/agents';
  import { parseReplayClock } from './lib/clock';
  import { eventsForDate } from './lib/calendar';
  import {
    defaultSettings,
    loadSettings,
    saveSettings,
    applyUrlSettings,
  } from './lib/settings';
  import {
    formatTime,
    formatDate,
    formatRelative,
    formatCountdown,
  } from './lib/format';
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
    tab,
    showTab,
    toast,
  } from './lib/bootstrap';
  import appCss from './styles/app.scss?raw';
  import Brand from './components/Brand.svelte';
  import Panel from './components/Panel.svelte';
  import Icon from './components/Icon.svelte';
  import AgentCard from './components/AgentCard.svelte';
  import AgentsView from './components/AgentsView.svelte';
  import WeatherPanel from './components/WeatherPanel.svelte';
  import WeatherView from './components/WeatherView.svelte';
  import Agenda from './components/Agenda.svelte';
  import Settings from './components/Settings.svelte';
  import About from './components/About.svelte';
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
  const schemes: { id: SettingsType['scheme']; label: string }[] = [
    { id: 'system', label: 'Follow system' },
    { id: 'auto', label: 'Sunrise and sunset' },
    { id: 'light', label: 'Light' },
    { id: 'dark', label: 'Dark' },
  ];
  const scenarioIcons: Record<SettingsType['scenario'], string> = {
    steady: 'check-circle',
    'running-low': 'battery-half',
    reconnect: 'plug',
    'reminder-due': 'bell',
    stale: 'hourglass-split',
    offline: 'wifi-off',
  };
  const params = new URLSearchParams(location.search);
  const requestedClock = params.get('clock');
  const parsedClock = parseReplayClock(requestedClock);
  const frozen = parsedClock !== null;
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
  // Bootstrap's Tab plugin owns the active classes after first render, so the
  // initial state is a one-time snapshot rather than a binding.
  const startView = untrack(() => view);
  const triggers: Partial<Record<View, HTMLButtonElement>> = {};
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
  const simulation = $derived(
    simulate(
      now,
      seed,
      settings.scenario,
      frozen ? 0 : now.getTimezoneOffset(),
    ),
  );
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
  const stories = $derived(
    replay || !sourceStories
      ? simulation.stories
      : [
          ...sourceStories,
          ...simulation.stories.filter(
            (story) => story.category !== 'bootstrap',
          ),
        ].sort(
          (a, b) =>
            Number(Boolean(b.live)) - Number(Boolean(a.live)) ||
            Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
        ),
  );
  const nextEvents = $derived(
    simulation.events
      .filter((event) => Date.parse(event.end) > now.getTime())
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
  );
  const nextEvent = $derived(nextEvents.find((event) => !event.allDay));
  const todaysEvents = $derived(
    eventsForDate(
      simulation.events,
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
    ).filter((event) => event.allDay || Date.parse(event.end) > now.getTime()),
  );
  const attentionAgent = $derived(
    simulation.agents.find((agent) => agent.status === 'reconnect') ??
      [...simulation.agents]
        .filter((agent) => agent.status === 'fresh')
        .sort(
          (a, b) =>
            limitingAllowance(a).remainingPercent -
            limitingAllowance(b).remainingPercent,
        )
        .find((agent) => limitingAllowance(agent).remainingPercent <= 25),
  );
  const attentionAllowance = $derived(
    attentionAgent ? limitingAllowance(attentionAgent) : null,
  );
  const attentionPrimary = $derived(
    attentionAgent ? primaryAllowance(attentionAgent) : null,
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
  const feedState = $derived(
    settings.scenario === 'offline'
      ? 'offline'
      : settings.scenario === 'stale'
        ? 'stale'
        : replay
          ? 'fresh'
          : feedStatus,
  );
  const heading = $derived(
    view === 'summary'
      ? 'Your day, in focus'
      : (views.find((item) => item.id === view)?.name ?? ''),
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
    const trigger = triggers[next];
    if (trigger && !trigger.classList.contains('active')) void showTab(trigger);
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
    // Arrow keys inside the tablist switch tabs through Bootstrap; follow them.
    const shown = (event: Event) => {
      const target =
        event.target instanceof HTMLElement ? event.target.dataset.view : '';
      const next = views.find((item) => item.id === target)?.id;
      if (next && next !== view) navigate(next);
    };
    node.addEventListener('click', click);
    node.addEventListener('shown.bs.tab', shown);
    return {
      destroy() {
        node.removeEventListener('click', click);
        node.removeEventListener('shown.bs.tab', shown);
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
      event.shiftKey ||
      document.querySelector('dialog[open]') ||
      (target instanceof HTMLElement &&
        (target.matches('input, select, textarea, [contenteditable="true"]') ||
          target.closest('[role="listbox"], .menu, .popover, .vc, dialog')))
    )
      return;
    let next: View | undefined;
    if (!settings.keyboardShortcuts && event.key.length === 1) return;
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
    // Browser chrome follows the resolved canvas colour of the active theme and scheme.
    const themeColor = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (themeColor)
      themeColor.content = getComputedStyle(document.body).backgroundColor;
  });
  const weatherUnits = $derived(settings.units);
  const weatherLocationKey = $derived(JSON.stringify(settings.location));
  $effect(() => {
    if (replay) return;
    const units = weatherUnits;
    const selectedLocation: SettingsType['location'] =
      JSON.parse(weatherLocationKey);
    // A previous location or unit system must not be labelled as the new one
    // while its replacement source is resolving.
    sourceWeather = null;
    weatherLive = false;
    weatherStatus = 'loading';
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
  <header class="navbar gap-3 mb-4" data-bs-component="navbar">
    <a
      href="?view=summary"
      onclick={(e) => {
        e.preventDefault();
        navigate('summary');
      }}
      class="navbar-brand d-flex align-items-center gap-2 m-0"
      ><Brand class="w-2 h-2" />Dayframe</a
    >
    <!-- Below md the views take their own row; from md the wrapper dissolves
         and the overflow nav fills the space between brand and controls. -->
    <div class="w-100 order-last md:d-contents">
      <nav
        aria-label="Dashboard views"
        use:navOverflow
        use:viewNavigation
        data-bs-component="nav-overflow"
      >
        <ul class="nav nav-pills gap-1">
          {#each views as item, i}<li class="nav-item">
              <button
                class="nav-link"
                class:active={startView === item.id}
                id={`tab-${item.id}`}
                data-bs-target={`#view-${item.id}`}
                aria-controls={`view-${item.id}`}
                aria-current={view === item.id ? 'page' : undefined}
                data-view={item.id}
                aria-keyshortcuts={settings.keyboardShortcuts
                  ? `${i + 1} ${item.key}`
                  : undefined}
                use:tab
                bind:this={triggers[item.id]}
                ><Icon name={item.icon} /><span>{item.name}</span></button
              >
            </li>{/each}
        </ul>
      </nav>
    </div>
    <div class="d-flex align-items-center gap-3 ms-auto">
      <div class="text-end">
        <div
          class="dashboard-clock font-monospace fs-xl fw-semibold lh-1 tabular-nums"
          aria-label="Current time"
        >
          {formatTime(now, settings)}
        </div>
        <div class="small fg-2 mt-1">
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
            class="btn btn-outline theme-secondary"
            use:menu
            data-bs-toggle="menu"
            data-bs-placement="bottom-end"
            aria-label="Choose theme"
            ><Icon name="palette" /><span class="d-none sm:d-inline">Theme</span
            ></button
          >
          <div class="menu" data-bs-component="menu">
            <h6 class="menu-header">Theme</h6>
            {#each themes as theme (theme.id)}<button
                class="menu-item"
                class:selected={settings.theme === theme.id}
                aria-current={settings.theme === theme.id ? 'true' : undefined}
                onclick={() => changeSettings({ theme: theme.id })}
                ><svg
                  class="menu-item-icon"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  ><circle
                    cx="8"
                    cy="8"
                    r="7"
                    fill={theme.preview.canvas}
                    stroke={theme.preview.ink}
                    stroke-opacity="0.4"
                  /><path
                    d="M8 1a7 7 0 0 1 0 14z"
                    fill={theme.preview.accent}
                  /></svg
                ><span class="menu-item-content"
                  >{theme.name}<small
                    class="menu-item-description"
                    aria-hidden="true">{theme.description}</small
                  ></span
                ><Icon name="check-lg" class="menu-item-check" /></button
              >{/each}
            <hr class="menu-divider" />
            <h6 class="menu-header">Colour scheme</h6>
            {#each schemes as scheme (scheme.id)}<button
                class="menu-item"
                class:selected={settings.scheme === scheme.id}
                aria-pressed={settings.scheme === scheme.id}
                onclick={() => changeSettings({ scheme: scheme.id })}
                >{scheme.label}<Icon
                  name="check-lg"
                  class="menu-item-check"
                /></button
              >{/each}
          </div>
        </div>
        <button
          class="btn btn-outline theme-secondary"
          use:tooltip={{
            title: settings.keyboardShortcuts ? 'Settings (,)' : 'Settings',
          }}
          onclick={openSettings}
          bind:this={settingsTrigger}
          aria-label="Open settings"><Icon name="sliders" /></button
        >
      </div>
    </div>
  </header>
  <main id="main" class="flex-grow-1" tabindex="-1">
    <div
      class="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-3"
    >
      <h1 class="text-2xl fw-semibold m-0">{heading}</h1>
      {#if settings.scenario !== 'steady'}<span
          class="badge badge-subtle theme-warning"
          data-bs-component="badge"
          ><Icon name={scenarioIcons[settings.scenario]} />
          {settings.scenario.replaceAll('-', ' ')} scenario</span
        >{/if}
    </div>
    {#if notice}<div
        class="alert theme-info d-flex gap-3 align-items-center"
        role="status"
      >
        {notice}<button
          class="btn btn-text theme-secondary ms-auto"
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
    <div class="tab-content" data-bs-component="tab">
      <section
        class="tab-pane"
        class:active={startView === 'summary'}
        class:show={startView === 'summary'}
        id="view-summary"
        aria-labelledby="tab-summary"
      >
        <div class="grid dashboard-grid">
          <Panel
            title={reminder
              ? 'Starting soon'
              : attentionAgent
                ? 'Needs attention'
                : heroEvent && Date.parse(heroEvent.start) <= now.getTime()
                  ? 'Happening now'
                  : 'Next on your calendar'}
            kind="hero"
            class="hero-panel summary-hero"
          >
            {#if attentionAgent && !reminder}<p class="small mb-3">
                <Icon name="exclamation-circle" />
                {attentionAgent.status === 'reconnect'
                  ? 'Connection needs attention'
                  : 'Agent capacity'}
              </p>
              <h2 class="hero-title text-4xl fw-semibold mb-3">
                {attentionAgent.status === 'reconnect'
                  ? `${attentionAgent.name} needs reconnecting`
                  : attentionAllowance?.remainingPercent === 0
                    ? `${attentionAgent.name}'s ${attentionAllowance.label.toLowerCase()} allowance is used up`
                    : `${attentionAgent.name} is running low`}
              </h2>
              <p class="hero-context mb-4">
                {#if attentionAgent.status === 'reconnect'}
                  This simulated account has lost its connection. Other agents
                  remain available.
                {:else if attentionAllowance}
                  {attentionAllowance.remainingPercent === 0
                    ? `It resets in ${formatCountdown(attentionAllowance.resetsAt, now, settings.locale)}.`
                    : `${attentionAllowance.remainingPercent}% of the ${attentionAllowance.label.toLowerCase()} allowance remains, and it resets in ${formatCountdown(attentionAllowance.resetsAt, now, settings.locale)}.`}
                  {#if attentionPrimary && attentionPrimary.id !== attentionAllowance.id}
                    The {attentionPrimary.label.toLowerCase()} allowance still has
                    {attentionPrimary.remainingPercent}% left.
                  {/if}
                {/if}
              </p>
              <button
                class="btn btn-solid theme-primary"
                onclick={() => navigate('agents')}>Review agent capacity</button
              >
            {:else if heroEvent}<p class="small mb-3">
                <Icon name="calendar-event" />
                {formatRelative(heroEvent.start, now, settings.locale)}
              </p>
              <h2 class="hero-title text-4xl fw-semibold mb-3">
                {heroEvent.title}
              </h2>
              <p class="hero-context mb-4">
                {formatTime(heroEvent.start, settings)}–{formatTime(
                  heroEvent.end,
                  settings,
                )} · {heroEvent.location}<br />{heroEvent.description}
              </p>
              <button
                class="btn btn-solid theme-primary"
                onclick={() => navigate('calendar')}>View your calendar</button
              >
            {:else}<h2 class="hero-title text-4xl fw-semibold mb-3">
                A clear stretch ahead
              </h2>
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
                class="btn btn-text theme-secondary btn-sm"
                onclick={() => navigate('weather')}
                aria-label="View full weather"
                ><Icon name="arrow-up-right" /></button
              >{/snippet}</Panel
          >
          <Panel title="Agent capacity" class="summary-agents"
            ><div class="grid" style="--gap: 0 1.5rem">
              {#each simulation.agents.slice(0, summaryAgentCount) as agent (agent.id)}<div
                  class={summaryAgentCount === 1
                    ? 'g-col-12'
                    : viewportWidth >= 1100
                      ? 'g-col-6'
                      : 'g-col-12 sm:g-col-6'}
                >
                  <AgentCard {agent} {now} compact locale={settings.locale} />
                </div>{/each}
            </div>
            {#if summaryAgentCount < simulation.agents.length}<button
                class="btn btn-link p-0 mt-2"
                onclick={() => navigate('agents')}
                >+{simulation.agents.length - summaryAgentCount} more agents</button
              >{/if}
            {#snippet action()}<button
                class="btn btn-text theme-secondary btn-sm"
                onclick={() => navigate('agents')}>View all</button
              >{/snippet}</Panel
          >
          <Panel title="Coming up" kind="quiet" class="summary-calendar"
            >{#if todaysEvents.length}<Agenda
                events={todaysEvents}
                locale={settings.locale}
                hourCycle={settings.hourCycle}
                max={compactDesktop ? 1 : 2}
                compact
                onmore={() => navigate('calendar')}
              />{:else}<p class="fg-2 mb-0">
                No more events today.
              </p>{/if}</Panel
          >
          <Panel title="Across your feeds" kind="quiet" class="summary-feeds"
            ><ul
              class="list-group list-group-flush"
              data-bs-component="list-group"
            >
              {#each stories
                .filter((story) => settings.categories.includes(story.category))
                .slice(0, compactDesktop ? 1 : 3) as story (story.id)}<li
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
                class="btn btn-text theme-secondary btn-sm"
                onclick={() => navigate('feeds')}>All stories</button
              >{/snippet}</Panel
          >
        </div>
      </section>
      <section
        class="tab-pane"
        class:active={startView === 'agents'}
        class:show={startView === 'agents'}
        id="view-agents"
        aria-labelledby="tab-agents"
      >
        <AgentsView
          agents={simulation.agents}
          {now}
          dense={compactDesktop}
          locale={settings.locale}
        />
      </section>
      <section
        class="tab-pane"
        class:active={startView === 'calendar'}
        class:show={startView === 'calendar'}
        id="view-calendar"
        aria-labelledby="tab-calendar"
      >
        <Calendar
          events={simulation.events}
          {now}
          {settings}
          compact={compactDesktop}
        />
      </section>
      <section
        class="tab-pane"
        class:active={startView === 'weather'}
        class:show={startView === 'weather'}
        id="view-weather"
        aria-labelledby="tab-weather"
      >
        <WeatherView
          {weather}
          status={sourceState}
          {settings}
          live={!replay && weatherLive}
          compact={compactDesktop}
          onsettings={openSettings}
        />
      </section>
      <section
        class="tab-pane"
        class:active={startView === 'feeds'}
        class:show={startView === 'feeds'}
        id="view-feeds"
        aria-labelledby="tab-feeds"
      >
        <Feeds
          {stories}
          {settings}
          {now}
          compact={compactDesktop}
          status={feedState}
          onchange={changeSettings}
        />
      </section>
    </div>
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
        class="btn btn-text theme-secondary btn-sm"
        onclick={refresh}
        disabled={refreshing}
        aria-label="Refresh live sources"
        >{#if refreshing}<span
            class="spinner-border spinner-sm"
            aria-hidden="true"
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
{#if aboutOpen}<About
    {stories}
    {stack}
    appCssBytes={new TextEncoder().encode(appCss).length}
    theme={settings.theme}
    locale={settings.locale}
    lens={settings.lens}
    onclose={() => (aboutOpen = false)}
    onlens={() => changeSettings({ lens: !settings.lens })}
  />{/if}
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
          class="btn btn-text theme-secondary btn-sm"
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
