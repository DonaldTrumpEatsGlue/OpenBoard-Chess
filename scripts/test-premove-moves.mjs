import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { patchChessSource } from '../src/custom-chess-patch.js';

const chessSource = await readFile(new URL('../node_modules/chess.js/chess.js', import.meta.url), 'utf8');
const premoveSource = await readFile(new URL('../src/premove-moves.js', import.meta.url), 'utf8');
const temporaryModule = join(tmpdir(), `openboard-premove-${randomUUID()}.cjs`);
await writeFile(temporaryModule, patchChessSource(chessSource));

try {
  const require = createRequire(import.meta.url);
  const { Chess } = require(temporaryModule);
  const window = {};
  vm.runInNewContext(premoveSource, { window });

  function getTargets(game, square, movementPatterns, customMovement = null) {
    return window.OpenboardPremoveMoves({
      Chess,
      game,
      square,
      color: 'w',
      movementPatterns,
      customMovement,
    }).map((move) => move.to);
  }

  const replacementGame = new Chess();
  assert.equal(replacementGame.load('7k/8/8/8/3R4/8/8/7K b - - 0 1'), true);
  const knightTargets = getTargets(replacementGame, 'd4', ['n']);
  assert(knightTargets.includes('e6'), 'replacement piece should use its configured knight movement');
  assert(!knightTargets.includes('d5'), 'replacement piece must not retain its original rook movement');

  const combinedGame = new Chess();
  assert.equal(combinedGame.load('7k/8/8/8/3R4/8/8/7K b - - 0 1'), true);
  const combinedTargets = getTargets(combinedGame, 'd4', ['n', 'b']);
  assert(combinedTargets.includes('e6'), 'premoves should include the configured knight moves');
  assert(combinedTargets.includes('a1'), 'premoves should include every configured movement pattern');
  assert(!combinedTargets.includes('d5'), 'premoves should not substitute the original rook moves');

  const studioGame = new Chess();
  assert.equal(studioGame.load('7k/8/8/8/3R4/8/8/7K b - - 0 1'), true);
  const studioMovement = {
    vectors: [{ dx: 2, dy: 1 }],
    movementType: 'step',
    captureMode: 'both',
    range: 1,
    mirror: false,
    jump: false,
    promotion: false,
  };
  const studioTargets = getTargets(studioGame, 'd4', ['r'], studioMovement);
  assert(studioTargets.includes('f5'), 'studio replacement premoves should use custom vectors');
  assert(!studioTargets.includes('d5'), 'studio replacement premoves must not use the replaced rook movement');

  console.log('Custom-piece premove tests passed: replacement sets, combined movement, and studio vectors.');
} finally {
  await rm(temporaryModule, { force: true });
}
