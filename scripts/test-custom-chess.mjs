import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { patchChessSource } from '../src/custom-chess-patch.js';

const source = await readFile(new URL('../node_modules/chess.js/chess.js', import.meta.url), 'utf8');
const temporaryModule = join(tmpdir(), `openboard-chess-${randomUUID()}.cjs`);
await writeFile(temporaryModule, patchChessSource(source));

try {
  const require = createRequire(import.meta.url);
  const { Chess } = require(temporaryModule);
  const custom = (vectors, options = {}) => ({
    vectors,
    movementType: options.movementType ?? 'step',
    captureMode: options.captureMode ?? 'both',
    range: options.range ?? 1,
    mirror: options.mirror === true,
    jump: options.jump === true,
    promotion: options.promotion === true,
  });

  const leapGame = new Chess();
  assert.equal(leapGame.load('7k/8/8/8/8/8/8/R6K w - - 0 1'), true);
  leapGame.setCustomMovement('a1', custom([{ dx: 2, dy: 3 }]));
  assert(leapGame.moves({ square: 'a1' }).includes('Rc4'));
  assert(!leapGame.moves({ square: 'a1' }).includes('Ra2'));
  assert(leapGame.move({ from: 'a1', to: 'c4' }));
  assert.equal(leapGame.get('c4').type, 'r');
  leapGame.undo();
  assert(leapGame.moves({ square: 'a1' }).includes('Rc4'), 'undo should restore the custom movement rule');

  const slideGame = new Chess();
  assert.equal(slideGame.load('7k/8/8/8/8/8/8/R1N4K w - - 0 1'), true);
  slideGame.setCustomMovement('a1', custom([{ dx: 1, dy: 0 }], { movementType: 'slide', range: 8 }));
  assert(slideGame.moves({ square: 'a1' }).includes('Rb1'));
  assert(!slideGame.moves({ square: 'a1' }).includes('Rc1'));
  assert(!slideGame.moves({ square: 'a1' }).includes('Rd1'));
  slideGame.setCustomMovement('a1', custom([{ dx: 1, dy: 0 }], { movementType: 'slide', range: 8, jump: true }));
  assert(slideGame.moves({ square: 'a1' }).includes('Rd1'), 'jumping sliders should pass through blockers');

  const captureGame = new Chess();
  assert.equal(captureGame.load('7k/8/8/8/8/8/1n6/R6K w - - 0 1'), true);
  captureGame.setCustomMovement('a1', custom([{ dx: 1, dy: 1, mode: 'capture' }]));
  assert(captureGame.moves({ square: 'a1' }).includes('Rxb2'));
  assert(!captureGame.moves({ square: 'a1' }).includes('Ra2'), 'capture-only vectors must not move to empty squares');

  const attackGame = new Chess();
  assert.equal(attackGame.load('8/6k1/5R2/8/8/8/8/7K b - - 0 1'), true);
  attackGame.setCustomMovement('f6', custom([{ dx: 1, dy: 1 }]));
  assert.equal(attackGame.is_attacked('g7', 'w'), true);
  assert.equal(attackGame.in_check(), true, 'custom movement must participate in check detection');

  const attackOnlyGame = new Chess();
  assert.equal(attackOnlyGame.load('8/6k1/5R2/8/8/8/8/7K w - - 0 1'), true);
  attackOnlyGame.setCustomMovement('f6', custom([{ dx: 1, dy: 1, mode: 'attack' }]));
  assert.equal(attackOnlyGame.is_attacked('g7', 'w'), true);
  assert.equal(attackOnlyGame.moves({ square: 'f6' }).length, 0, 'attack-only vectors must not create moves');

  const kingSafetyGame = new Chess();
  assert.equal(kingSafetyGame.load('7k/8/8/8/8/6r1/8/R3K3 w - - 0 1'), true);
  kingSafetyGame.setCustomMovement('g3', custom([{ dx: -2, dy: -2 }]));
  assert.equal(kingSafetyGame.in_check(), true);
  assert(!kingSafetyGame.moves({ square: 'a1' }).includes('Ra2'), 'custom attacks must constrain legal king safety');

  const mirroredGame = new Chess();
  assert.equal(mirroredGame.load('r6k/8/8/8/8/8/8/7K b - - 0 1'), true);
  mirroredGame.setCustomMovement('a8', custom([{ dx: 0, dy: 1 }], { mirror: true }));
  assert(mirroredGame.moves({ square: 'a8' }).includes('Ra7'), 'mirrored movement must reverse for Black');

  const promotionGame = new Chess();
  assert.equal(promotionGame.load('7k/P7/8/8/8/8/8/7K w - - 0 1'), true);
  promotionGame.setCustomMovement('a7', custom([{ dx: 0, dy: 1 }], { promotion: true }));
  const promotions = promotionGame.moves({ square: 'a7', verbose: true });
  assert.deepEqual(promotions.map((move) => move.promotion).sort(), ['b', 'n', 'q', 'r']);
  assert(promotionGame.move({ from: 'a7', to: 'a8', promotion: 'n' }));
  assert.equal(promotionGame.get('a8').type, 'n');

  console.log('Custom chess movement tests passed: leaps, slides, captures, attacks, mirroring, undo, and promotion.');
} finally {
  await rm(temporaryModule, { force: true });
}
