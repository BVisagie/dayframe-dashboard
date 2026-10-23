import {
  Dialog,
  Drawer,
  Menu,
  NavOverflow,
  Tooltip,
  Popover,
  Datepicker,
  Combobox,
  Range,
  Chips,
  Tab,
  Toast,
} from 'bootstrap';
import type { Action } from 'svelte/action';
import { tick } from 'svelte';

type Plugin = { dispose(): void };
type Factory = new (node: HTMLElement, config?: never) => Plugin;
function attach(
  PluginClass: Factory,
): Action<HTMLElement, Record<string, unknown> | undefined> {
  return (node, config) => {
    const plugin = new PluginClass(node, config as never);
    return {
      destroy() {
        plugin.dispose();
      },
    };
  };
}
export const menu = attach(Menu as Factory);
export const navOverflow: Action<HTMLElement> = (node) => {
  const plugin = new NavOverflow(node);
  let frame = 0;
  // Refresh clones when Svelte changes original state or shortcuts, without observing
  // Bootstrap's own overflow mutations and feeding them back into the plugin.
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => plugin.update());
  });
  node.querySelectorAll('.nav-link[data-view]').forEach((link) =>
    observer.observe(link, {
      attributes: true,
      attributeFilter: ['class', 'aria-current', 'aria-keyshortcuts'],
    }),
  );
  // The originals are Tab triggers. Their clones live in a menu, so the tab
  // semantics and the roving tabindex must not come along.
  const sanitize = () => {
    for (const clone of node.querySelectorAll<HTMLElement>(
      '.nav-overflow-menu .menu-item[data-view]',
    )) {
      for (const name of [
        'role',
        'aria-selected',
        'aria-controls',
        'tabindex',
        'data-bs-target',
      ])
        clone.removeAttribute(name);
    }
  };
  const clones = new MutationObserver(sanitize);
  clones.observe(node, { childList: true, subtree: true });
  sanitize();
  return {
    destroy() {
      observer.disconnect();
      clones.disconnect();
      cancelAnimationFrame(frame);
      plugin.dispose();
    },
  };
};
export const tooltip: Action<HTMLElement, { title: string }> = (
  node,
  options,
) => {
  const plugin = new Tooltip(node, options);
  let title = options.title;
  return {
    update(next) {
      if (next.title === title) return;
      title = next.title;
      plugin.setContent({ '.tooltip-inner': title });
    },
    destroy() {
      plugin.dispose();
    },
  };
};
export const popover = attach(Popover as Factory);
type DatepickerOptions = NonNullable<
  ConstructorParameters<typeof Datepicker>[1]
>;
export const datepicker: Action<HTMLElement, DatepickerOptions> = (
  node,
  initial,
) => {
  let options = initial;
  let plugin = new Datepicker(node, options);
  const structure = (value: DatepickerOptions) =>
    JSON.stringify({ ...value, selectedDates: undefined });
  return {
    update(next) {
      if (
        structure(next) !== structure(options) ||
        next.dateFormat !== options.dateFormat
      ) {
        const parent = node.parentNode;
        const nextSibling = node.nextSibling;
        plugin.dispose();
        // The calendar peer restores a clone on disposal. Keep the node that
        // Svelte owns, including its actions and listeners, when rebuilding.
        if (parent && !node.isConnected) {
          const replacement = nextSibling
            ? nextSibling.previousSibling
            : parent.lastChild;
          if (replacement) parent.replaceChild(node, replacement);
          else parent.appendChild(node);
        }
        plugin = new Datepicker(node, next);
      }
      if (
        JSON.stringify(next.selectedDates ?? []) !==
        JSON.stringify(plugin.getSelectedDates())
      ) {
        plugin.setSelectedDates(next.selectedDates ?? []);
      }
      options = next;
    },
    destroy() {
      plugin.dispose();
    },
  };
};
export const combobox = attach(Combobox as Factory);
export const range: Action<HTMLElement, number> = (node) => {
  const plugin = new Range(node);
  let disposed = false;
  return {
    update() {
      // The parent action updates before Svelte writes the child input's value.
      void tick().then(() => {
        if (!disposed) plugin.update();
      });
    },
    destroy() {
      disposed = true;
      plugin.dispose();
    },
  };
};
export const chips = attach(Chips as Factory);
export const tab = attach(Tab as Factory);
/** Bootstrap owns view switching; application state asks the plugin to show a tab. */
export function showTab(node: HTMLElement): Promise<void> {
  return Tab.getOrCreateInstance(node).show();
}
type ToastOptions = NonNullable<ConstructorParameters<typeof Toast>[1]> & {
  onhide?: (event: Event) => void;
  onhidden: () => void;
};
export const toast: Action<HTMLElement, ToastOptions> = (
  node,
  { onhide, onhidden, ...config },
) => {
  const plugin = new Toast(node, config);
  if (onhide) node.addEventListener('hide.bs.toast', onhide);
  node.addEventListener('hidden.bs.toast', onhidden);
  void plugin.show();
  return {
    destroy() {
      if (onhide) node.removeEventListener('hide.bs.toast', onhide);
      node.removeEventListener('hidden.bs.toast', onhidden);
      plugin.dispose();
    },
  };
};

export const settingsDialog: Action<HTMLDialogElement> = (node) => {
  const small = matchMedia('(max-width: 43rem)').matches;
  const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
  node.className = small
    ? `drawer drawer-end ${instant ? 'drawer-instant' : ''}`
    : `dialog dialog-lg dialog-scrollable ${instant ? 'dialog-instant' : ''}`;
  const plugin = small ? new Drawer(node) : new Dialog(node);
  void plugin.show();
  return {
    destroy() {
      plugin.dispose();
    },
  };
};

// Bootstrap's documentation files most components under components/, but form
// controls, tables and layout live in their own sections.
const docsSections: Record<string, string> = {
  grid: 'layout/grid',
  containers: 'layout/containers',
  table: 'content/tables',
  toast: 'components/toasts',
  check: 'forms/checkbox',
  chip: 'forms/chips',
  combobox: 'forms/combobox',
  datepicker: 'forms/datepicker',
  'form-field': 'forms/field',
  'input-group': 'forms/input-group',
  radio: 'forms/radio',
  range: 'forms/range',
  switch: 'forms/switch',
};
/** Documentation page for a `data-bs-component` name. */
export function bootstrapDocs(name: string): string {
  return `https://getbootstrap.com/docs/6.0/${docsSections[name] ?? `components/${name}`}/`;
}

// Bootstrap has no component-inspection overlay; labels link each marked component to its documentation.
export const lens: Action<HTMLElement, boolean> = (node, enabled) => {
  const labels = new Map<HTMLElement, HTMLAnchorElement>();
  let active = enabled;
  function sync() {
    for (const [target, label] of labels) {
      if (!active || !node.contains(target)) {
        label.remove();
        target.classList.remove('lens-target');
        labels.delete(target);
      }
    }
    if (!active) return;
    node
      .querySelectorAll<HTMLElement>('[data-bs-component]')
      .forEach((target) => {
        // Dialogs need Bootstrap's fixed positioning in the browser's top layer.
        if (target instanceof HTMLDialogElement) return;
        if (labels.has(target)) return;
        const label = document.createElement('a');
        const name = target.dataset.bsComponent!;
        // Labels are Bootstrap badges. Over a compact button group the label
        // sits above it, so the controls stay available to the pointer.
        label.className = `lens-label badge badge-subtle theme-info text-lowercase position-absolute end-0 z-2 ${target.classList.contains('btn-group') ? 'bottom-100' : 'top-0'}`;
        label.textContent = name;
        label.href = bootstrapDocs(name);
        label.target = '_blank';
        label.rel = 'noopener noreferrer';
        label.ariaLabel = `Bootstrap ${name} documentation`;
        target.classList.add('lens-target');
        target.append(label);
        labels.set(target, label);
      });
  }
  const observer = new MutationObserver(sync);
  observer.observe(node, { childList: true, subtree: true });
  sync();
  return {
    update(value) {
      active = value;
      sync();
    },
    destroy() {
      active = false;
      observer.disconnect();
      sync();
    },
  };
};
