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
  assert.ok(lessons.length >= 15);
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
    const moves = lesson.moves || [];
    assert.equal(lesson.moveNotes?.length || 0, moves.length, `Every move needs a plain-language explanation for ${lesson.title}`);
    for (let index = 0; index < moves.length; index += 1) {
      assert.ok(game.move(moves[index]), `Illegal tutorial move "${moves[index]}" for ${lesson.title}`);
      for (const square of lesson.moveHighlights?.[index] || []) {
        assert.match(square, /^[a-h][1-8]$/, `Invalid move highlight for ${lesson.title}: ${square}`);
      }
    }
  }
});

test('tutorial teaches every piece with a move-by-move board example', () => {
  for (const title of ['The pawn', 'The knight', 'The bishop', 'The rook', 'The queen', 'The king']) {
    const lesson = lessons.find((entry) => entry.title === title);
    assert.ok(lesson, `Missing piece lesson: ${title}`);
    assert.ok(lesson.moves.length > 0, `Missing board demonstration moves for ${title}`);
    assert.ok(lesson.moveNotes.every((note) => note.length > 20), `A move needs a clear explanation for ${title}`);
    assert.ok(lesson.focusSquare, `Missing taught piece square for ${title}`);
    const game = new Chess(lesson.fen);
    const piece = game.get(lesson.focusSquare);
    assert.ok(piece, `No piece at the highlighted square for ${title}`);
    const focusColor = lesson.focusColor || piece.color;
    if (game.turn() !== focusColor) {
      const fen = game.fen().split(' ');
      fen[1] = focusColor;
      fen[3] = '-';
      assert.equal(game.load(fen.join(' ')), true, `Could not prepare legal move destinations for ${title}`);
    }
    const legalMoves = game.moves({ square: lesson.focusSquare, verbose: true });
    assert.ok(legalMoves.length, `No legal destinations for ${title}`);
    assert.ok(legalMoves.every((move) => game.get(move.to)?.type !== 'k'), `The highlighted piece must not be able to capture a king in ${title}`);
  }

  const goal = lessons.find(({ title }) => title === 'The goal of chess');
  const winningGame = new Chess(goal.fen);
  goal.moves.forEach((move) => winningGame.move(move));
  assert.equal(winningGame.in_checkmate(), true, 'The goal lesson should end in checkmate');

  const stalemate = lessons.find(({ title }) => title === 'Stalemate and draws');
  assert.equal(new Chess(stalemate.fen).in_stalemate(), true, 'The draw lesson should demonstrate stalemate');
});

test('board setup lesson teaches the starting layout and first move on the board', () => {
  const lesson = lessons.find(({ title }) => title === 'The board and setup');
  assert.ok(lesson);
  assert.doesNotMatch(lesson.text, /^(place|set|put|arrange)\b/i);
  const game = new Chess(lesson.fen);
  assert.equal(game.fen().split(' ')[0], 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR');
  assert.equal(Array.from(lesson.highlightSquares).join(','), [
    'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1',
    'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
  ].join(','));
  assert.match(lesson.text, /White moves first/);
  assert.match(lesson.text, /players alternate one legal move at a time/);
  assert.match(lesson.text, /d1, a light square/);
  assert.match(lesson.text, /d8, a dark square/);
  assert.match(lesson.text, /64 squares in an 8-by-8 grid/);
  assert.match(lesson.text, /e2 to e4/);
  assert.equal(Array.from(lesson.moveHighlights[0]).join(','), 'e2,e4');
  assert.equal(lesson.choices[lesson.answer], 'Black');
});

test('en passant is included as a legal capture destination in its demonstration', () => {
  const lesson = lessons.find(({ title }) => title === 'En passant');
  const game = new Chess(lesson.fen);
  assert.ok(game.move(lesson.moves[0]));
  const enPassant = game.moves({ square: lesson.focusSquare, verbose: true })
    .find((move) => move.to === 'd6');
  assert.ok(enPassant);
  assert.equal(enPassant.captured, 'p');
});

test('the rule guide covers all special moves and common game endings', () => {
  const headings = rules.map(([heading]) => heading.toLowerCase());
  for (const requiredTopic of ['castling', 'en passant', 'promotion', 'checkmate', 'stalemate', 'other draws']) {
    assert.ok(headings.includes(requiredTopic), `Missing rules topic: ${requiredTopic}`);
  }
  assert.ok(rules.length >= 14);
});
