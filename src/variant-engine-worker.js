importScripts('../vendor/chess.js');

const pieceValues = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
let game;
let customRules;
let customMovementBySquare;
let customPieceBySquare;
let customDefinitions;
let deadline;
let maxNodes;
let nodes;
let timedOut;

function squareAt(row, col) {
  return `${String.fromCharCode(97 + col)}${8 - row}`;
}

function moveIdentity(map, from, to) {
  const identity = map.get(from);
  map.delete(from);
  map.delete(to);
  if (identity) map.set(to, identity);
}

function customDefinitionAt(square) {
  return customDefinitions.get(customPieceBySquare.get(square));
}

function movementPatternsFor(square, piece = game.get(square)) {
  if (!piece) return [];
  const customDefinition = customDefinitionAt(square);
  if (customDefinition) return customDefinition.studio ? [piece.type] : customDefinition.movements ?? [piece.type];
  const movement = customMovementBySquare.get(square);
  if (movement) return movement.movements;
  const configured = customRules.pieceMovements[piece.type];
  if (Array.isArray(configured)) return configured;
  return configured?.[piece.color] ?? [piece.type];
}

function fileNumber(square) {
  return square.charCodeAt(0) - 97;
}

function attacksSquare(from, to, color, pattern) {
  const dx = fileNumber(to) - fileNumber(from);
  const fromRank = Number(from[1]);
  const dy = Number(to[1]) - fromRank;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (pattern === 'p') return absX === 1 && dy === (color === 'w' ? 1 : -1);
  if (pattern === 'n') return (absX === 1 && absY === 2) || (absX === 2 && absY === 1);
  if (pattern === 'k') return Math.max(absX, absY) === 1;
  const diagonal = absX === absY && absX > 0;
  const straight = (dx === 0) !== (dy === 0);
  if (pattern === 'b' && !diagonal) return false;
  if (pattern === 'r' && !straight) return false;
  if (pattern === 'q' && !diagonal && !straight) return false;
  if (!['q', 'r', 'b'].includes(pattern)) return false;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  let file = fileNumber(from) + stepX;
  let rank = fromRank + stepY;
  while (file !== fileNumber(to) || rank !== Number(to[1])) {
    if (game.get(`${String.fromCharCode(97 + file)}${rank}`)) return false;
    file += stepX;
    rank += stepY;
  }
  return true;
}

function variantSquareAttacked(square, attackerColor) {
  if (game.is_attacked(square, attackerColor)) return true;
  const board = game.board();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== attackerColor) continue;
      const from = squareAt(row, col);
      if (customDefinitionAt(from)?.studio) continue;
      if (movementPatternsFor(from, piece).some((pattern) => attacksSquare(from, square, piece.color, pattern))) return true;
    }
  }
  return false;
}

function variantIsInCheck(color) {
  const board = game.board();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (piece?.type === 'k' && piece.color === color) {
        return variantSquareAttacked(squareAt(row, col), color === 'w' ? 'b' : 'w');
      }
    }
  }
  return true;
}

function isPromotionSquare(square, color) {
  return Number(square[1]) === (color === 'w' ? 8 : 1);
}

function enPassantCapturedSquare(move) {
  return `${move.to[0]}${move.from[1]}`;
}

function applySearchMove(move) {
  const movementSnapshot = new Map(customMovementBySquare);
  const pieceSnapshot = new Map(customPieceBySquare);
  const movingIdentity = customMovementBySquare.get(move.from);
  const movingCustomPiece = customDefinitionAt(move.from);
  const played = game.move(move);
  if (!played) throw new Error('The variant engine could not apply a legal move.');

  const capturedSquare = played.flags.includes('e') ? enPassantCapturedSquare(played) : played.to;
  customMovementBySquare.delete(capturedSquare);
  customPieceBySquare.delete(capturedSquare);
  moveIdentity(customMovementBySquare, played.from, played.to);
  moveIdentity(customPieceBySquare, played.from, played.to);

  if (played.promotion) {
    customMovementBySquare.delete(played.to);
    customPieceBySquare.delete(played.to);
  } else if ((movingIdentity?.original === 'p' || movingCustomPiece?.replaces === 'p')
    && isPromotionSquare(played.to, played.color)) {
    game.remove(played.to);
    game.put({ type: 'q', color: played.color }, played.to);
    customMovementBySquare.delete(played.to);
    customPieceBySquare.delete(played.to);
  }

  if (played.flags.includes('k') || played.flags.includes('q')) {
    const rank = played.color === 'w' ? '1' : '8';
    const kingSide = played.flags.includes('k');
    const rookFrom = `${kingSide ? 'h' : 'a'}${rank}`;
    const rookTo = `${kingSide ? 'f' : 'd'}${rank}`;
    moveIdentity(customMovementBySquare, rookFrom, rookTo);
    moveIdentity(customPieceBySquare, rookFrom, rookTo);
  }
  return { movementSnapshot, pieceSnapshot };
}

function undoSearchMove(snapshot) {
  game.undo();
  customMovementBySquare = snapshot.movementSnapshot;
  customPieceBySquare = snapshot.pieceSnapshot;
}

function getLegalMoves() {
  const squares = game.board().flatMap((rank, row) => rank
    .map((piece, col) => piece?.color === game.turn() ? squareAt(row, col) : null)
    .filter(Boolean));
  const legal = [];
  const seen = new Set();
  for (const square of squares) {
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) continue;
    for (const pattern of movementPatternsFor(square, piece)) {
      if (piece.type !== pattern) {
        game.remove(square);
        game.put({ type: pattern, color: piece.color }, square);
      }
      const candidates = game.moves({ square, verbose: true });
      for (const candidate of candidates) {
        if (candidate.flags.includes('k') || candidate.flags.includes('q')) {
          if (variantIsInCheck(candidate.color)) continue;
          const rank = candidate.color === 'w' ? '1' : '8';
          const files = candidate.flags.includes('k') ? ['f', 'g'] : ['d', 'c'];
          if (files.some((file) => variantSquareAttacked(`${file}${rank}`, candidate.color === 'w' ? 'b' : 'w'))) continue;
        }
        const key = `${candidate.from}${candidate.to}${candidate.promotion ?? ''}`;
        if (seen.has(key)) continue;
        const snapshot = applySearchMove(candidate);
        const safe = !variantIsInCheck(piece.color);
        undoSearchMove(snapshot);
        if (safe) {
          legal.push(candidate);
          seen.add(key);
        }
      }
      if (piece.type !== pattern) {
        game.remove(square);
        game.put(piece, square);
      }
    }
  }
  return legal;
}

function evaluate(ply) {
  const board = game.board();
  let score = 0;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const square = squareAt(row, col);
      const sign = piece.color === 'w' ? 1 : -1;
      const movement = customMovementBySquare.get(square);
      const customDefinition = customDefinitionAt(square);
      const originalType = customDefinition?.replaces ?? movement?.original ?? piece.type;
      const advancement = piece.color === 'w' ? 6 - row : row - 1;
      const center = 7 - Math.abs(3.5 - row) - Math.abs(3.5 - col);
      let positional = 0;
      if (originalType === 'p') positional = advancement * 7;
      if (originalType === 'n' || originalType === 'b') positional = center * 4;
      if (originalType === 'k' && ply > 24) positional = center * 2;
      score += sign * ((pieceValues[originalType] ?? pieceValues[piece.type] ?? 0) + positional);
    }
  }
  return score;
}

function moveOrderScore(move) {
  let score = move.captured ? 10000 + (pieceValues[move.captured] || 0) * 10 - (pieceValues[move.piece] || 0) : 0;
  if (move.promotion) score += 8000 + (pieceValues[move.promotion] || 0);
  if (/[+#]/.test(move.san)) score += 500;
  return score;
}

function visitNode() {
  nodes += 1;
  if (nodes >= maxNodes || (nodes & 255) === 0 && performance.now() >= deadline) {
    timedOut = true;
    return false;
  }
  return true;
}

function search(depth, alpha, beta, ply) {
  if (!visitNode()) return evaluate(ply);
  const moves = getLegalMoves();
  const turn = game.turn();
  if (!moves.length) {
    if (variantIsInCheck(turn) || customRules.noDraws) return turn === 'w' ? -100000 + ply : 100000 - ply;
    return 0;
  }
  if (!customRules.noDraws
    && (Number(game.fen().split(' ')[4]) >= 100
      || (customMovementBySquare.size === 0 && customPieceBySquare.size === 0
        && game.insufficient_material()))) return 0;
  if (depth <= 0) return evaluate(ply);

  moves.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
  const maximizing = turn === 'w';
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const snapshot = applySearchMove(move);
    const score = search(depth - 1, alpha, beta, ply + 1);
    undoSearchMove(snapshot);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (timedOut || beta <= alpha) break;
  }
  return best;
}

function uci(move) {
  return `${move.from}${move.to}${move.promotion || ''}`;
}

function searchPosition(data) {
  customRules = data.customRules;
  customMovementBySquare = new Map(data.customMovementBySquare);
  customPieceBySquare = new Map(data.customPieceBySquare);
  customDefinitions = new Map(customRules.customPieces.map((piece) => [piece.id, piece]));
  game = new Chess();
  if (!game.load(data.fen)) throw new Error('The variant engine received an invalid position.');
  game.clearCustomMovements();
  for (const [square, id] of customPieceBySquare) {
    const definition = customDefinitions.get(id);
    if (definition?.studio) game.setCustomMovement(square, definition.studio);
  }

  const rootMoves = getLegalMoves();
  if (!rootMoves.length) throw new Error('No legal moves are available for the bot.');
  let bestMove = rootMoves[0];
  const bot = data.bot;
  deadline = performance.now() + Math.max(350, Math.min(2500, bot.thinkMs || 450));
  maxNodes = Math.max(1000, Math.min(60000, bot.maxNodes || 30000));
  nodes = 0;
  timedOut = false;
  const maximumDepth = Math.max(1, Math.min(3, bot.depth || 1));
  for (let depth = 1; depth <= maximumDepth; depth += 1) {
    const depthStartNodes = nodes;
    timedOut = false;
    const orderedMoves = [...rootMoves].sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
    const scoredMoves = [];
    const maximizing = game.turn() === 'w';
    for (const move of orderedMoves) {
      if (performance.now() >= deadline || nodes >= maxNodes) {
        timedOut = true;
        break;
      }
      const snapshot = applySearchMove(move);
      const score = search(depth - 1, -Infinity, Infinity, 1);
      undoSearchMove(snapshot);
      if (timedOut) break;
      scoredMoves.push({ move, score });
    }
    if (timedOut) break;
    if (scoredMoves.length) {
      scoredMoves.sort((a, b) => maximizing ? b.score - a.score : a.score - b.score);
      bestMove = scoredMoves[0].move;
    }
    self.postMessage({
      id: data.id,
      type: 'info',
      depth,
      nodes: nodes - depthStartNodes,
      totalNodes: nodes,
      best: uci(bestMove),
    });
  }
  self.postMessage({ id: data.id, type: 'bestmove', move: uci(bestMove) });
}

self.onmessage = ({ data }) => {
  if (data?.command !== 'search') return;
  try {
    searchPosition(data);
  } catch (error) {
    self.postMessage({ id: data.id, type: 'error', error: error.message });
  }
};
