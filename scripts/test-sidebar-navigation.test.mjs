import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const main = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('sidebar actions have a single destination', () => {
  const sectionMatch = main.match(/const sidebarSections = \{([\s\S]*?)\r?\n\};\r?\n\r?\nfunction renderSidebarSubmenu/);
  assert.ok(sectionMatch, 'sidebar section definitions should be present');

  const actions = [...sectionMatch[1].matchAll(/action:\s*'([^']+)'/g)]
    .map((match) => match[1])
    .filter((action) => action !== 'coming-soon');
  assert.equal(new Set(actions).size, actions.length, 'each working sidebar action should appear once');
});

test('puzzle and analysis controls are accessed from the sidebar, not duplicated in the game panel', () => {
  for (const id of ['puzzle-start', 'puzzle-next', 'puzzle-hint', 'analysis-open']) {
    assert.doesNotMatch(html, new RegExp(`id="${id}"`));
  }

  for (const action of ['puzzle', 'puzzle-next', 'puzzle-hint', 'analysis']) {
    assert.match(main, new RegExp(`action: '${action}'`));
  }
});
