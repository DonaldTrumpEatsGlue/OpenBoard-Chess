import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import { Chess } from 'chess.js';

const contentWindow = {};
const contentSource = readFileSync(new URL('../src/learning-content.js', import.meta.url), 'utf8');
runInNewContext(contentSource, { window: contentWindow });
const { puzzles, lessons, rules } = contentWindow.openboardLearningContent;

test('every training puzzle has a legal position and a valid checkmate solution', () => {
  assert.ok(puzzles.length >= 12);
  for (const puzzle of puzzles) {
    const game = new Chess();
    assert.equal(game.load(puzzle.fen), true, `Invalid FEN: ${puzzle.fen}`);
    assert.equal(game.in_check(), false, `White is already in check: ${puzzle.fen}`);
    const blackToMove = new Chess(puzzle.fen.replace(' w ', ' b '));
    assert.equal(blackToMove.in_check(), false, `Black is already in check: ${puzzle.fen}`);
    assert.ok(game.move({ from: puzzle.from, to: puzzle.to }), `Illegal solution: ${puzzle.from}-${puzzle.to}`);
    assert.equal(game.in_checkmate(), true, `Solution is not checkmate: ${puzzle.from}-${puzzle.to}`);
    assert.ok(puzzle.hint.length > 10);
  }
});

test('beginner lessons have usable multiple-choice checks', () => {
  assert.ok(lessons.length >= 10);
  for (const lesson of lessons) {
    assert.ok(lesson.title && lesson.text && lesson.question);
    assert.ok(lesson.choices.length >= 2);
    assert.ok(lesson.answer >= 0 && lesson.answer < lesson.choices.length);
    assert.ok(lesson.demoNote, `Missing board explanation for ${lesson.title}`);
    assert.ok(lesson.highlightSquares?.length, `Missing board highlights for ${lesson.title}`);
    const game = new Chess();
    assert.equal(game.load(lesson.fen), true, `Invalid demonstration position for ${lesson.title}`);
    for (const square of lesson.highlightSquares) {
      assert.match(square, /^[a-h][1-8]$/, `Invalid highlighted square for ${lesson.title}: ${square}`);
    }
  }
});

test('the rule guide covers all special moves and common game endings', () => {
  const headings = rules.map(([heading]) => heading.toLowerCase());
  for (const requiredTopic of ['castling', 'en passant', 'promotion', 'checkmate', 'stalemate', 'other draws']) {
    assert.ok(headings.includes(requiredTopic), `Missing rules topic: ${requiredTopic}`);
  }
  assert.ok(rules.length >= 14);
});
