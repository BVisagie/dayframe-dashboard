import type { Action } from 'svelte/action';

export interface FitOptions {
  /** Off below the desktop threshold, where views scroll and show every row. */
  enabled: boolean;
  /** Receives how many items are visible, so the caller can label "+N more". */
  onfit: (visible: number) => void;
  /** Items to fit, relative to the node. Defaults to its direct children. */
  items?: string;
  /**
   * Pages: size every page by the tallest item, so page boundaries stay fixed
   * however tall the rows on a given page are. Reports the page capacity.
   */
  uniform?: boolean;
  /** With `uniform`, items before this index belong to earlier pages. */
  offset?: number;
}

/*
 * Bootstrap has no way to show "as many rows as fit". The node takes its
 * height from the layout (`.fit-rows` applies `contain: size`, so its content
 * never sizes it); every item is shown, measured and then the ones that would
 * cross the node's bottom edge get the `hidden` attribute. Hidden items leave
 * the accessibility tree and the tab order, and the caller's "+N more" control
 * reaches them. All of it happens before paint, so nothing flickers.
 */
export const fitRows: Action<HTMLElement, FitOptions> = (node, initial) => {
  let options = initial;
  let reported = -1;
  let frame = 0;

  const items = () =>
    Array.from(
      node.querySelectorAll<HTMLElement>(options.items ?? ':scope > *'),
    );

  function measure() {
    const list = items();
    for (const item of list) item.hidden = false;
    let visible = list.length;
    if (options.enabled && options.uniform) {
      const tallest = Math.max(
        0,
        ...list.map((item) => item.getBoundingClientRect().height),
      );
      const height = node.getBoundingClientRect().height + 0.5;
      // A page always holds at least one row, so paging can reach every item.
      visible = tallest ? Math.max(1, Math.floor(height / tallest)) : 1;
      const offset = options.offset ?? 0;
      list.forEach(
        (item, index) =>
          (item.hidden = index < offset || index >= offset + visible),
      );
    } else if (options.enabled) {
      // Half a pixel absorbs sub-pixel rounding at fractional root sizes.
      const limit = node.getBoundingClientRect().bottom + 0.5;
      visible = list.findIndex(
        (item) => item.getBoundingClientRect().bottom > limit,
      );
      if (visible === -1) visible = list.length;
      for (const item of list.slice(visible)) item.hidden = true;
    }
    for (const item of list) resize.observe(item);
    if (visible !== reported) {
      reported = visible;
      options.onfit(visible);
    }
  }

  function schedule() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(measure);
  }

  // The node's own size changes with the viewport and with siblings such as
  // the "+N more" control; item sizes change when fonts load or text wraps.
  const resize = new ResizeObserver(schedule);
  resize.observe(node);
  // Data ticks replace items; only additions and removals need a refit.
  const mutations = new MutationObserver(schedule);
  mutations.observe(node, { childList: true, subtree: true });
  measure();

  return {
    update(next) {
      options = next;
      reported = -1;
      measure();
    },
    destroy() {
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
    },
  };
};
