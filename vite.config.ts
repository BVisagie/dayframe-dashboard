import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { compileString } from 'sass';
import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const stackVersions = Object.fromEntries(
  ['bootstrap', 'svelte', 'vite'].map((name) => [
    name,
    JSON.parse(
      readFileSync(resolve('node_modules', name, 'package.json'), 'utf8'),
    ).version,
  ]),
);

const order =
  'bootstrap, theme-base, theme, app, layout, theme-effects, bootstrap-utilities';
const roles = [
  'codex',
  'claude',
  'cursor',
  'grok',
  'opencode',
  'antigravity',
  ...Array.from({ length: 6 }, (_, i) => `series-${i + 1}`),
];
const keys = [
  'base',
  'fg',
  'fg-emphasis',
  'bg',
  'bg-subtle',
  'bg-muted',
  'border',
  'focus-ring',
  'contrast',
];
const roleMap = roles
  .map(
    (role) =>
      `"${role}": (${keys.map((key) => `"${key}": var(--${role}-${key})`).join(',')})`,
  )
  .join(',');

export default defineConfig(({ command }) => ({
  base: '/dayframe-dashboard/',
  define: {
    __STACK_VERSIONS__: JSON.stringify(stackVersions),
  },
  plugins: [
    svelte(),
    {
      name: 'dayframe-bootstrap-layers',
      resolveId(id) {
        if (id === 'virtual:bootstrap.css') return '\0virtual:bootstrap.css';
      },
      load(id) {
        if (id !== '\0virtual:bootstrap.css') return;
        const css = compileString(
          // Dayframe paints its canvas with --bg-body and raised panels with --bg-1,
          // the reverse of Bootstrap's light-mode order. Components that assume the
          // body is the raised surface are re-pointed here, in Bootstrap's own
          // token maps, so themes and the app layer never compensate for it.
          `@use "bootstrap/scss/bootstrap" with (
            $theme-colors: (${roleMap}),
            $card-tokens: (--card-bg: var(--bg-1), --card-spacer-x: 1.25rem, --card-spacer-y: 1.25rem),
            $list-group-tokens: (--list-group-bg: transparent, --list-group-action-hover-bg: var(--bg-2), --list-group-action-active-bg: var(--bg-3)),
            $table-tokens: (--table-bg: transparent),
            $nav-tokens: (--nav-link-hover-bg: var(--bg-2), --nav-link-active-bg: var(--bg-3)),
            $nav-pills-tokens: (--nav-pills-bg: transparent, --nav-pills-padding: 0),
            $navbar-tokens: (--navbar-padding-y: 0, --navbar-brand-font-size: var(--font-size-xl), --navbar-brand-font-weight: var(--font-weight-bold)),
            $dialog-tokens: (--dialog-bg: var(--bg-1)),
            $menu-tokens: (--menu-bg: var(--bg-1), --menu-item-hover-bg: var(--bg-2)),
            $popover-tokens: (--popover-bg: var(--bg-1), --popover-header-bg: var(--bg-2)),
            $toast-tokens: (--toast-bg: var(--bg-1), --toast-header-bg: var(--bg-2)),
            $datepicker-tokens: (--datepicker-bg: var(--bg-1), --datepicker-day-hover-bg: var(--bg-2))
          );`,
          { loadPaths: ['node_modules'], style: 'expanded' },
        ).css;
        const parsed = postcss.parse(css);
        const result = postcss.root();
        result.append(postcss.atRule({ name: 'layer', params: order }));
        const foundation = postcss.atRule({
          name: 'layer',
          params: 'bootstrap',
        });
        result.append(foundation);
        for (const node of [...parsed.nodes]) {
          if (node.type === 'atrule' && node.name === 'property')
            result.append(node);
          else if (
            node.type === 'atrule' &&
            node.name === 'layer' &&
            node.params === 'utilities' &&
            node.nodes
          ) {
            node.params = 'bootstrap-utilities';
            result.append(node);
          } else foundation.append(node);
        }
        return result.toString();
      },
    },
    {
      name: 'dayframe-prepaint',
      async transformIndexHtml(html) {
        const folders = await readdir(resolve('src/themes'), {
          withFileTypes: true,
        });
        const manifests = [];
        for (const folder of folders.filter((folder) => folder.isDirectory())) {
          try {
            const source = await readFile(
              resolve('src/themes', folder.name, 'theme.js'),
              'utf8',
            );
            // Manifests are authored in this repository, never remote input.
            const match = source.match(/schemes:\s*\[([^\]]+)\]/);
            const layout =
              source.match(/layout:\s*['"]([^'"]+)/)?.[1] ?? 'standard';
            manifests.push({
              id: folder.name,
              schemes: match?.[1].match(/(?:light|dark)/g) ?? ['light', 'dark'],
              layout,
            });
          } catch {
            /* Non-theme supporting folders have no manifest. */
          }
        }
        const script = `(function(){try{const themes=${JSON.stringify(manifests)};let s=JSON.parse(localStorage.getItem('dayframe.settings.v1')||'{}');s=s.settings||s;const p=new URLSearchParams(location.search);const t=themes.find(t=>t.id===(p.get('theme')||s.theme))||themes.find(t=>t.id==='default');if(!t)return;let mode=p.get('scheme')||s.scheme||'system';if(mode==='system')mode=matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';if(mode==='auto'){const h=new Date().getHours();mode=h>=7&&h<19?'light':'dark'}if(!t.schemes.includes(mode))mode=t.schemes[0];const r=document.documentElement;r.dataset.theme=t.id;r.dataset.bsTheme=mode;r.dataset.layout=t.layout;const scale=Number(p.get('scale')||s.scale||100);r.style.setProperty('--display-scale',String(Math.max(70,Math.min(150,scale))/100));}catch{}})();`;
        return html
          .replace('<!--prepaint-->', `<script>${script}</script>`)
          .replace(
            '%ROBOTS%',
            process.env.DAYFRAME_PUBLIC_LAUNCH === 'true'
              ? 'index, follow'
              : 'noindex, nofollow',
          );
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source:
            process.env.DAYFRAME_PUBLIC_LAUNCH === 'true'
              ? 'User-agent: *\nAllow: /\n'
              : 'User-agent: *\nDisallow: /\n',
        });
      },
    },
  ],
  build: {
    cssTarget: ['chrome130', 'edge130', 'firefox132', 'safari18', 'ios18'],
    cssMinify: 'lightningcss',
    sourcemap: false,
  },
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
}));
