import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { Chess } from 'chess.js';

const academyWindow = {};
const academySource = readFileSync(new URL('../src/academy-content.js', import.meta.url), 'utf8');
runInNewContext(academySource, { window: academyWindow });
const academy = academyWindow.openboardAcademyContent;

test('academy includes the requested opening library and curriculum paths', () => {
  assert.equal(academy.openings.length, 14);
  assert.ok(academy.tactics.length >= 15);
  assert.ok(academy.strategy.length >= 18);
  assert.ok(academy.endgames.length >= 12);
  for (const opening of academy.openings) {
    assert.ok(opening.id && opening.name && opening.moves.length >= 4);
    assert.ok(opening.ideas && opening.plans && opening.advantages && opening.disadvantages);
    assert.ok(opening.squares && opening.mistakes && opening.tactics && opening.unexpected);
  }
});

test('all academy opening main lines and alternatives contain legal moves', () => {
  for (const opening of academy.openings) {
    const mainLine = new Chess();
    for (const [san, explanation] of opening.moves) {
      assert.ok(explanation.length > 10, `Missing move explanation for ${opening.name} ${san}`);
      assert.ok(mainLine.move(san), `Illegal main-line move ${san} in ${opening.name}`);
    }
    for (const variation of opening.alternatives) {
      const variationGame = new Chess();
      for (const san of variation.moves) {
        assert.ok(variationGame.move(san), `Illegal move ${san} in ${opening.name}: ${variation.name}`);
      }
    }
  }
});

test('every curated academy exercise position loads legally and tactic solutions demonstrate their stated idea', () => {
  for (const [name, exercise] of Object.entries(academy.tacticalExercises)) {
    const game = new Chess();
    assert.equal(game.load(exercise.fen), true, `Invalid FEN for ${name}`);
    assert.equal(game.in_check(), false, `${name} starts with the moving side in check`);
    const otherTurn = new Chess(exercise.fen.replace(' w ', ' b '));
    assert.equal(otherTurn.in_check(), false, `${name} starts with the other king in check`);
    if (exercise.kind === 'move') {
      const move = game.move({ from: exercise.from, to: exercise.to, promotion: 'q' });
      assert.ok(move, `Illegal solution for ${name}`);
      assert.equal(move.san, exercise.san, `Unexpected SAN for ${name}`);
      if (name === 'Forks' || name === 'Discovered checks' || name === 'Double checks') {
        assert.ok(move.san.includes('+'), `${name} solution must give check`);
      }
      if (name === 'Double checks') {
        const fen = game.fen().split(' ')[0];
        assert.match(fen, /[A-Z]/);
        assert.equal(move.san, 'Nb6+');
      }
      if (name === 'Discovered attacks') {
        assert.equal(game.get('a8').type, 'q');
        assert.equal(game.get('a1').type, 'r');
        assert.equal(game.get('a4'), null);
      }
      if (name === 'Skewers') {
        assert.equal(game.get('e6').type, 'k');
        assert.equal(game.get('e8').type, 'q');
      }
    } else if (exercise.kind === 'identify') {
      assert.ok(game.get(exercise.square), `Missing identified piece for ${name}`);
      assert.ok(exercise.prompt && exercise.explanation && exercise.hint, `Incomplete identification exercise for ${name}`);
      if (exercise.followUp) {
        const move = game.move({ from: exercise.followUp.from, to: exercise.followUp.to, promotion: 'q' });
        assert.ok(move, `Illegal follow-up demonstration for ${name}`);
        assert.equal(move.san, exercise.followUp.san, `Unexpected follow-up SAN for ${name}`);
      }
    } else {
      assert.fail(`Unknown exercise kind for ${name}: ${exercise.kind}`);
    }
  }
  for (const [path, positions] of Object.entries(academy.studyPositions)) {
    for (const fen of positions) {
      const game = new Chess();
      assert.equal(game.load(fen), true, `Invalid ${path} study position: ${fen}`);
      assert.equal(game.in_check(), false, `Side to move is already in check in ${fen}`);
      const otherTurn = new Chess(fen.replace(' w ', ' b '));
      assert.equal(otherTurn.in_check(), false, `Opposite king is already in check in ${fen}`);
    }
  }
  assert.equal(academy.studyPositions.strategy.length, academy.strategy.length);
  assert.equal(academy.studyPositions.endgames.length, academy.endgames.length);
});
