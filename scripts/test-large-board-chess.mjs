import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const source = await readFile(new URL('../src/large-board-chess.js', import.meta.url), 'utf8');
const context = { console, structuredClone };
runInNewContext(source, context);
const LargeBoardChess = context.OpenboardLargeChess;

for (const size of [10, 12, 14, 16, 18, 20]) {
  const game = new LargeBoardChess(size);
  const board = game.board();
  assert.equal(board.length, size);
  assert.ok(board.every((row) => row.length === size));
  assert.equal(board.flat().filter((piece) => piece?.type === 'p').length, size * 2);
  assert.equal(board.flat().filter((piece) => piece?.type === 'k').length, 2);
  assert.equal(board[0].filter(Boolean).length, size);
  assert.equal(board[size - 1].filter(Boolean).length, size);
  const lastFile = String.fromCharCode(96 + size);
  assert.equal(game.get(`${lastFile}${size}`)?.color, 'b');
  assert.equal(game.get(`${lastFile}1`)?.color, 'w');
}

const game = new LargeBoardChess(12);
assert.deepEqual(
  [...game.moves({ square: 'a2', verbose: true }).map((move) => move.to)].sort(),
  ['a3', 'a4'],
);
assert.ok(game.moves({ square: 'd1', verbose: true }).some((move) => move.to === 'c3'));

const before = game.fen();
const pawnMove = game.moves({ square: 'a2', verbose: true }).find((move) => move.to === 'a4');
game.move(pawnMove);
assert.equal(game.turn(), 'b');
assert.equal(game.get('a4')?.type, 'p');
game.undo();
assert.equal(game.fen(), before);

game.setCustomMovement('d1', {
  vectors: [{ dx: 3, dy: 2, mode: 'both' }],
  movementType: 'leap',
  captureMode: 'both',
  range: 1,
  mirror: false,
  jump: true,
});
assert.ok(game.moves({ square: 'd1', verbose: true }).some((move) => move.to === 'g3'));

const castleGame = new LargeBoardChess(10);
for (const row of castleGame.squares) row.fill(null);
castleGame.put({ type: 'k', color: 'w' }, 'f1');
castleGame.put({ type: 'r', color: 'w' }, 'i1');
castleGame.put({ type: 'k', color: 'b' }, 'f10');
const castle = castleGame.moves({ square: 'f1', verbose: true }).find((move) => move.flags.includes('k'));
assert.equal(castle?.to, 'h1');
castleGame.move(castle);
assert.equal(castleGame.get('h1')?.type, 'k');
assert.equal(castleGame.get('g1')?.type, 'r');
castleGame.undo();
assert.equal(castleGame.get('f1')?.type, 'k');
assert.equal(castleGame.get('i1')?.type, 'r');

const enPassantGame = new LargeBoardChess(10);
for (const [from, to] of [
  ['e2', 'e4'], ['a9', 'a8'],
  ['e4', 'e5'], ['a8', 'a7'],
  ['e5', 'e6'], ['b9', 'b8'],
  ['e6', 'e7'], ['d9', 'd7'],
]) {
  const move = enPassantGame.moves({ square: from, verbose: true }).find((candidate) => candidate.to === to);
  assert.ok(move, `${from}-${to} should be available`);
  enPassantGame.move(move);
}
const enPassant = enPassantGame.moves({ square: 'e7', verbose: true }).find((move) => move.to === 'd8');
assert.equal(enPassant?.flags, 'e');
enPassantGame.move(enPassant);
assert.equal(enPassantGame.get('d8')?.color, 'w');
assert.equal(enPassantGame.get('d7'), null);

for (const row of game.squares) row.fill(null);
game.put({ type: 'k', color: 'w' }, 'b1');
game.put({ type: 'k', color: 'b' }, 'b8');
game.put({ type: 'p', color: 'w' }, 'a11');
assert.deepEqual(
  [...game.moves({ square: 'a11', verbose: true }).map((move) => move.promotion)].sort(),
  ['b', 'n', 'q', 'r'],
);

assert.throws(() => new LargeBoardChess(8), /must be 10, 12, 14, 16, 18, or 20/);
console.log('Large-board chess tests passed: board sizes, starting positions, moves, undo, custom movement, and promotion.');
