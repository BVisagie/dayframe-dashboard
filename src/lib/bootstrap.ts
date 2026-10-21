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
  // Refresh clones when Svelte changes the active original, without observing
  // Bootstrap's own overflow mutations and feeding them back into the plugin.
  const observer = new MutationObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => plugin.update());
  });
  node.querySelectorAll('.nav-link[data-view]').forEach((link) =>
    observer.observe(link, {
      attributes: true,
      attributeFilter: ['class', 'aria-current'],
    }),
  );
  return {
    destroy() {
      observer.disconnect();
      cancelAnimationFrame(frame);
      plugin.dispose();
    },
  };
};
export const tooltip = attach(Tooltip as Factory);
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
export const range = attach(Range as Factory);
export const chips = attach(Chips as Factory);
export const tab = attach(Tab as Factory);
export const toast: Action<HTMLElement> = (node) => {
  const plugin = new Toast(node, { autohide: false });
  void plugin.show();
  return {
    destroy() {
      plugin.dispose();
    },
  };
};

export const settingsDialog: Action<HTMLDialogElement> = (node) => {
  const small = matchMedia('(max-width: 43rem)').matches;
  const instant = matchMedia('(prefers-reduced-motion: reduce)').matches;
  node.className = small
    ? `drawer drawer-end ${instant ? 'drawer-instant' : ''}`
    : `dialog dialog-lg ${instant ? 'dialog-instant' : ''}`;
  const plugin = small ? new Drawer(node) : new Dialog(node);
  void plugin.show();
  return {
    destroy() {
      plugin.dispose();
    },
  };
};

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
        if (labels.has(target)) return;
        const label = document.createElement('a');
        const name = target.dataset.bsComponent!;
        label.className = 'lens-label';
        label.textContent = name;
        label.href = `https://getbootstrap.com/docs/6.0/${['grid', 'containers'].includes(name) ? 'layout' : 'components'}/${name}/`;
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
