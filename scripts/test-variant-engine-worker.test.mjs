import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import vm from 'node:vm';
import { patchChessSource } from '../src/custom-chess-patch.js';

const chessSource = await readFile(new URL('../node_modules/chess.js/chess.js', import.meta.url), 'utf8');
const workerSource = await readFile(new URL('../src/variant-engine-worker.js', import.meta.url), 'utf8');
const temporaryModule = join(tmpdir(), `openboard-variant-worker-${randomUUID()}.cjs`);
await writeFile(temporaryModule, patchChessSource(chessSource));

try {
  const require = createRequire(import.meta.url);
  const { Chess } = require(temporaryModule);
  const customRules = {
    boardSize: 8,
    noDraws: false,
    pieceMovements: {
      p: { w: ['p'], b: ['p'] },
      n: { w: ['n'], b: ['n'] },
      b: { w: ['b'], b: ['b'] },
      r: { w: ['r'], b: ['r'] },
      q: { w: ['q'], b: ['q'] },
    },
    customPieces: [],
  };

  function runWorker(data, ChessImplementation = Chess) {
    const messages = [];
    const self = { postMessage: (message) => messages.push(message) };
    const context = {
      Chess: ChessImplementation,
      performance,
      self,
      importScripts: () => {},
    };
    vm.runInNewContext(workerSource, context, { timeout: 10000 });
    self.onmessage({ data });
    return messages;
  }

  test('searches and returns a legal move from a standard chess position', () => {
    const messages = runWorker({
      command: 'search',
      id: 'standard-position-test',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      customRules,
      customMovementBySquare: [],
      customPieceBySquare: [],
      bot: { depth: 2, thinkMs: 500, maxNodes: 5000 },
    });

    const result = messages.find((message) => message.type === 'bestmove');
    assert(result, `Worker returned no best move: ${JSON.stringify(messages)}`);
    const game = new Chess();
    assert.ok(game.move({
      from: result.move.slice(0, 2),
      to: result.move.slice(2, 4),
      ...(result.move.length > 4 ? { promotion: result.move[4] } : {}),
    }), `${result.move} should be legal in the standard starting position`);
  });

  test('searches and returns a legal move for a studio custom piece', () => {
    const studioMovement = {
      movementType: 'step',
      captureMode: 'both',
      range: 1,
      mirror: false,
      jump: false,
      promotion: false,
      vectors: [{ dx: 1, dy: 2 }],
    };
    const definition = { id: 'studio-leaper', replaces: 'n', color: 'w', studio: studioMovement };
    const messages = runWorker({
      command: 'search',
      id: 'studio-test',
      fen: '7k/8/8/8/8/8/8/R6K w - - 0 1',
      customRules: { ...customRules, customPieces: [definition] },
      customMovementBySquare: [],
      customPieceBySquare: [['a1', definition.id]],
      bot: { depth: 2, thinkMs: 500, maxNodes: 5000 },
    });

    const result = messages.find((message) => message.type === 'bestmove');
    assert(result, `Worker returned no best move: ${JSON.stringify(messages)}`);
    assert.match(result.move, /^a1(?:b3|c2)$/);

    const game = new Chess();
    assert.equal(game.load('7k/8/8/8/8/8/8/R6K w - - 0 1'), true);
    game.setCustomMovement('a1', studioMovement);
    const legalMoves = game.moves({ square: 'a1', verbose: true }).map((move) => `${move.from}${move.to}`);
    assert(legalMoves.includes(result.move), `${result.move} should be legal for the custom piece`);
  });

  test('does not apply standard insufficient-material checks to a live Studio piece', () => {
    class ChessWithoutStandardMaterialCheck extends Chess {
      insufficient_material() {
        throw new Error('Standard insufficient-material check should be skipped for custom pieces.');
      }
    }
    const studioMovement = {
      movementType: 'leap',
      captureMode: 'both',
      range: 1,
      mirror: false,
      jump: true,
      promotion: false,
      vectors: [{ dx: 1, dy: 2 }],
    };
    const definition = { id: 'studio-star', replaces: 'b', color: 'w', studio: studioMovement };
    const messages = runWorker({
      command: 'search',
      id: 'studio-insufficient-material-test',
      fen: '8/7k/8/8/3B4/8/8/K7 w - - 0 1',
      customRules: { ...customRules, customPieces: [definition] },
      customMovementBySquare: [],
      customPieceBySquare: [['d4', definition.id]],
      bot: { depth: 1, thinkMs: 500, maxNodes: 5000 },
    }, ChessWithoutStandardMaterialCheck);

    const result = messages.find((message) => message.type === 'bestmove');
    assert(result, `Worker returned no best move: ${JSON.stringify(messages)}`);
  });

  test('reports an actionable error for an invalid position', () => {
    const messages = runWorker({
      command: 'search',
      id: 'invalid-test',
      fen: 'not a fen',
      customRules,
      customMovementBySquare: [],
      customPieceBySquare: [],
      bot: { depth: 1 },
    });

    assert.equal(messages[0]?.type, 'error');
    assert.match(messages[0]?.error ?? '', /invalid position/i);
  });
} finally {
  await rm(temporaryModule, { force: true });
}
