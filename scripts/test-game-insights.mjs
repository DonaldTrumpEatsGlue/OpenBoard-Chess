import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../src/game-insights.js', import.meta.url), 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const insights = context.OpenboardGameInsights;

test('recognizes common openings and the plans they create', () => {
  const sicilian = insights.openingForHistory(['e4', 'c5']);
  assert.equal(sicilian.name, 'Sicilian Defense');
  assert.match(sicilian.theme, /counterplay/i);

  const kingsIndian = insights.openingForHistory(['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4']);
  assert.equal(kingsIndian.name, 'King’s Indian Defense');
  assert.match(kingsIndian.theme, /kingside/i);

  const ruyLopez = insights.openingForHistory(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
  assert.equal(ruyLopez.name, 'Ruy Lopez · Spanish Opening');

  const twoKnights = insights.openingForHistory(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6']);
  assert.equal(twoKnights.name, 'Italian · Two Knights Defense');

  const polerio = insights.openingForHistory(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5']);
  assert.equal(polerio.name, 'Italian · Polerio Defense');
});

test('uses broad opening-family names before enough moves exist for a specific line', () => {
  assert.equal(insights.openingForHistory([]), null);
  assert.equal(insights.openingForHistory(['e4']).name, 'King’s Pawn Opening');
  assert.equal(insights.openingForHistory(['e4', 'e5']).name, 'Open Game');
  assert.equal(insights.openingForHistory(['e4', 'e5', 'Nf3', 'Nc6']).name, 'Open Game');
});

test('recognizes flexible openings and labels uncommon replies without calling them book moves', () => {
  assert.equal(insights.openingForHistory(['Nf3']).name, 'Réti Opening');
  assert.equal(insights.openingForHistory(['e3']).name, 'Uncommon Opening · e3');
  assert.equal(insights.openingForHistory(['e4']).name, 'King’s Pawn Opening');
  assert.equal(insights.openingForHistory(['e4', 'a6', 'Bb5', 'c5']).name, 'St. George Defense · ...c5 setup');
  const retiA5 = insights.getMoveContext(['Nf3', 'a5'], 1, {
    piece: 'p',
    to: 'a5',
  });
  assert.equal(retiA5.opening.name, 'Réti Opening · ...a5');
  assert.equal(retiA5.book, false);
  assert.match(retiA5.theme, /queenside space/i);

  const flankAdvance = insights.getMoveContext(['d4', 'd5', 'c4', 'a5'], 3, {
    piece: 'p',
    to: 'a5',
  });
  assert.match(flankAdvance.theme, /queenside flank pawn advance/i);
});

test('marks only moves that continue a recognized book line', () => {
  const line = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'];
  assert.equal(insights.getMoveContext(line, 4, {}).book, true);
  const defense = insights.getMoveContext(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], 5, {});
  assert.equal(defense.bookName, 'Italian · Two Knights Defense');
  assert.match(defense.bookTheme, /develops with tempo/i);
  assert.equal(insights.getMoveContext(['e4', 'e5', 'Nf3', 'd6'], 3, {}).book, true);
  assert.equal(insights.getMoveContext(['e4', 'c5', 'Nf3', 'd6', 'd4', 'd5'], 5, {}).book, false);
  assert.equal(insights.getMoveContext(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'd6'], 5, {}).book, false);
});

test('classifies move quality conservatively from centipawn loss', () => {
  assert.equal(insights.classifyMove({ loss: 0 }).label, 'Best');
  assert.equal(insights.classifyMove({ loss: 25 }).label, 'Excellent');
  assert.equal(insights.classifyMove({ loss: 70 }).label, 'Good');
  assert.equal(insights.classifyMove({ loss: 250 }).label, 'Mistake');
  assert.equal(insights.classifyMove({ loss: 400 }).label, 'Blunder');
  assert.equal(insights.classifyMove({ loss: 10, bestGap: 220 }).label, 'Great');
  assert.equal(insights.classifyMove({ loss: 10, soundSacrifice: true }).label, 'Brilliant');
});
