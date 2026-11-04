import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { patchChessSource } from '../src/custom-chess-patch.js';

const chessSource = await readFile(new URL('../node_modules/chess.js/chess.js', import.meta.url), 'utf8');
const setupSource = await readFile(new URL('../src/position-setup.js', import.meta.url), 'utf8');
const temporaryModule = join(tmpdir(), `openboard-position-${randomUUID()}.cjs`);
await writeFile(temporaryModule, patchChessSource(chessSource));

try {
  const require = createRequire(import.meta.url);
  const { Chess } = require(temporaryModule);
  const window = {};
  vm.runInNewContext(setupSource, { window, structuredClone });
  const setup = window.OpenboardPositionSetup;
  const standardFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  assert.equal(setup.createFen(setup.standardBoard(), 'w', 'KQkq', '', 0, 1), standardFen);
  assert.equal(setup.validateFen(Chess, standardFen).length, 0);
  assert.equal(setup.validateFen(Chess, '4k3/8/8/8/8/8/8/4K3 b - - 0 1').length, 0);
  assert(setup.validateFen(Chess, '4k3/8/8/8/8/8/8/8 w - - 0 1')
    .some((error) => error.includes('White king')));
  const multipleKingsFen = '4k3/8/8/8/8/8/8/K6K w - - 0 1';
  assert.equal(setup.validateFen(Chess, multipleKingsFen).length, 0);
  const multipleKings = new Chess(multipleKingsFen);
  assert.deepEqual(multipleKings.get('a1'), { type: 'k', color: 'w' });
  assert.deepEqual(multipleKings.get('h1'), { type: 'k', color: 'w' });
  assert(multipleKings.moves({ square: 'h1' }).length > 0);
  const multiKingCastling = new Chess('4k3/8/8/8/8/8/8/K3K2R w K - 0 1');
  assert(multiKingCastling.moves({ square: 'e1' }).includes('O-O'));

  const piecesBoard = Array.from({ length: 8 }, () => Array(8).fill(null));
  const types = setup.types;
  types.forEach((type, index) => {
    piecesBoard[0][index] = { type, color: 'b' };
    piecesBoard[7][index] = { type, color: 'w' };
  });
  const encoded = setup.createFen(piecesBoard, 'b', '', '', 7, 42);
  const decoded = setup.decodeFen(encoded);
  assert.equal(JSON.stringify(decoded.board), JSON.stringify(piecesBoard));
  assert.equal(decoded.turn, 'b');
  assert.equal(decoded.halfmove, 7);
  assert.equal(decoded.fullmove, 42);

  const invalidCases = [
    ['4k3/8/8/8/8/8/8/8 w - - 0 1', /at least one White king/i],
    ['4k3/8/8/8/8/8/8/6Kk w - - 0 1', /kings on .* cannot be adjacent/i],
    ['8/8/8/8/8/8/4k3/4K3 w - - 0 1', /cannot be adjacent/i],
    ['P3k3/8/8/8/8/8/8/4K3 w - - 0 1', /pawns cannot start/i],
    ['4k3/8/8/8/8/8/8/4K3 w K - 0 1', /castling right/i],
    ['4k3/8/8/8/8/8/8/4K3 w - e6 0 1', /en passant target/i],
    ['4k3/8/8/8/8/8/8/4RK2 w - - 0 1', /side that just moved/i],
    ['k3k3/8/8/8/8/8/8/K3R3 w - - 0 1', /cannot leave any of its kings in check/i],
  ];
  for (const [fen, expected] of invalidCases) {
    assert.match(setup.validateFen(Chess, fen).join(' '), expected);
  }
  assert.equal(setup.validateFen(Chess, '4k3/8/8/4pP2/8/8/8/4K3 w - e6 0 1').length, 0);
  assert.throws(() => setup.decodeFen('8/8/8/8/8/8/8/8 w - - 0'));

  console.log('Position setup tests passed: FEN round-trips, presets, piece colors, and position validation.');
} finally {
  await rm(temporaryModule, { force: true });
}
