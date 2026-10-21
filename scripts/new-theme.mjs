import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const themeRoot = fileURLToPath(new URL('../src/themes/', import.meta.url));

/**
 * Copy the accessible default seed system; no registry or import edits follow.
 * @param {string} id
 * @param {string} [destination]
 * @returns {Promise<string>}
 */
export async function createTheme(id, destination = themeRoot) {
  if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id)) {
    throw new TypeError('Use a theme id such as harbor-watch: lowercase words separated by hyphens.');
  }
  const name = id.split('-').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
  const template = join(themeRoot, 'default');
  const manifest = (await readFile(join(template, 'theme.js'), 'utf8'))
    .replace("id: 'default'", `id: '${id}'`)
    .replace("name: 'Default'", `name: '${name}'`);
  const css = (await readFile(join(template, 'theme.css'), 'utf8'))
    .replaceAll("[data-theme='default']", `[data-theme='${id}']`);
  const brief = (await readFile(join(template, 'brief.md'), 'utf8'))
    .replace('# Default: mission control', `# ${name}: mission control starter`)
    .replace(/## Screenshot critique[\s\S]*$/, '## Starter review\n\nThis starts with the default theme\'s accessible palette and layout. Revise\nthis brief before changing CSS, then run the full theme contract in every\nsupported scheme. Keep all additions inside this folder.\n\n## Screenshot critique\n\nPending: review this theme in both schemes at all standard viewports after\nediting. Record the findings here before accepting screenshot baselines.\n');
  const directory = join(destination, id);
  // Exclusive creation protects an existing theme, including one with no files.
  await mkdir(directory);
  try {
    // The brief lands before the CSS, including in a generated starter.
    await writeFile(join(directory, 'brief.md'), brief);
    await writeFile(join(directory, 'theme.js'), manifest);
    await writeFile(join(directory, 'theme.css'), css);
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return directory;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  try {
    if (process.argv.length !== 3) throw new TypeError('Usage: npm run new-theme <id>');
    const id = process.argv[2];
    await createTheme(id);
    console.log(`Created src/themes/${id}/. Review brief.md before changing its tokens.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
