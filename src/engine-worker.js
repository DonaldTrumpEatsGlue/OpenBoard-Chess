importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

const values = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const transpositions = new Map();
let deadline = Infinity;
let timedOut = false;
let noDraws = false;
let nodes = 0;
let maxNodes = Infinity;

function evaluate(game) {
  if (game.in_checkmate()) return game.turn() === 'w' ? -100000 : 100000;
  if (game.in_stalemate()) return noDraws ? (game.turn() === 'w' ? -100000 : 100000) : 0;
  if (!noDraws && game.in_draw()) return 0;

  let score = 0;
  const board = game.board();
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const sign = piece.color === 'w' ? 1 : -1;
      const advancement = piece.color === 'w' ? 6 - row : row - 1;
      const center = 7 - Math.abs(3.5 - row) - Math.abs(3.5 - col);
      let positional = 0;
      if (piece.type === 'p') positional = advancement * 7;
      if (piece.type === 'n' || piece.type === 'b') positional = center * 4;
      if (piece.type === 'k' && game.history().length > 24) positional = center * 2;
      score += sign * (values[piece.type] + positional);
    }
  }
  return game.turn() === 'w' ? score : -score;
}

function isTerminal(game) {
  return game.in_checkmate() || game.in_stalemate() || (!noDraws && game.in_draw());
}

function positionKey(game) {
  return game.fen();
}

function orderMoves(game, moves, preferredMove) {
  return moves.sort((a, b) => moveOrderScore(b, preferredMove) - moveOrderScore(a, preferredMove));
}

function moveOrderScore(move, preferredMove) {
  const uci = move.from + move.to + (move.promotion || '');
  if (uci === preferredMove) return 100000;
  let score = 0;
  if (move.captured) score += 10000 + (values[move.captured] || 0) * 10 - (values[move.piece] || 0);
  if (move.promotion) score += 8000 + (values[move.promotion] || 0);
  if (/[+#]/.test(move.san)) score += 500;
  return score;
}

function visitNode() {
  nodes += 1;
  if (nodes >= maxNodes || (nodes & 1023) === 0 && performance.now() >= deadline) {
    timedOut = true;
    return false;
  }
  return true;
}

function quiescence(game, alpha, beta, ply) {
  if (!visitNode()) return evaluate(game);
  if (isTerminal(game)) return evaluate(game);
  if (ply >= 12) return evaluate(game);

  const inCheck = game.in_check();
  const standPat = evaluate(game);
  if (!inCheck) {
    if (standPat >= beta) return beta;
    alpha = Math.max(alpha, standPat);
  }

  const allMoves = game.moves({ verbose: true });
  const moves = orderMoves(game, inCheck ? allMoves : allMoves.filter((move) => move.captured || move.promotion));
  for (const move of moves) {
    if (timedOut) break;
    game.move(move);
    const score = -quiescence(game, -beta, -alpha, ply + 1);
    game.undo();
    if (score >= beta) return beta;
    alpha = Math.max(alpha, score);
  }
  return alpha;
}

function search(game, depth, alpha, beta, ply) {
  if (!visitNode()) return evaluate(game);
  if (isTerminal(game)) return evaluate(game);
  if (depth <= 0) return quiescence(game, alpha, beta, 0);

  const key = positionKey(game);
  const originalAlpha = alpha;
  const cached = transpositions.get(key);
  if (cached && cached.depth >= depth) {
    if (cached.bound === 'exact') return cached.score;
    if (cached.bound === 'lower') alpha = Math.max(alpha, cached.score);
    else beta = Math.min(beta, cached.score);
    if (alpha >= beta) return cached.score;
  }

  const moves = game.moves({ verbose: true });
  orderMoves(game, moves, cached?.move);
  let best = -Infinity;
  let bestMove = null;
  for (const move of moves) {
    if (timedOut) break;
    game.move(move);
    const score = -search(game, depth - 1, -beta, -alpha, ply + 1);
    game.undo();
    if (score > best) {
      best = score;
      bestMove = move.from + move.to + (move.promotion || '');
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) break;
  }
  if (!timedOut && bestMove) {
    const bound = best <= originalAlpha ? 'upper' : best >= beta ? 'lower' : 'exact';
    if (transpositions.size > 200000) transpositions.clear();
    transpositions.set(key, { depth, score: best, move: bestMove, bound });
  }
  return best;
}

function applyStyle(game, moves, bot) {
  if (!['attacking', 'defensive', 'positional', 'tactical'].includes(bot.style)) return moves;
  const mover = game.turn();
  const scored = [];
  for (const move of moves) {
    game.move(move);
    const baseScore = -evaluate(game);
    let styleBonus = 0;
    if (bot.style === 'attacking') {
      styleBonus += move.captured ? 20 : 0;
      styleBonus += /[+#]/.test(move.san) ? 18 : 0;
    } else if (bot.style === 'tactical') {
      styleBonus += move.captured ? 35 : 0;
      styleBonus += /[+#]/.test(move.san) ? 28 : 0;
    } else if (bot.style === 'positional') {
      const file = move.to.charCodeAt(0) - 97;
      const rank = Number(move.to[1]) - 1;
      styleBonus += Math.round((7 - Math.abs(3.5 - file) - Math.abs(3.5 - rank)) * 2);
      if ((move.piece === 'n' || move.piece === 'b') && move.from.endsWith(mover === 'w' ? '1' : '8')) styleBonus += 8;
    } else if (bot.style === 'defensive') {
      const opponentCaptures = game.moves({ verbose: true }).filter((candidate) => candidate.captured);
      const exposedValue = opponentCaptures.reduce((sum, candidate) => sum + (values[candidate.captured] || 0), 0);
      styleBonus -= Math.min(exposedValue, 180) * 0.25;
    }
    game.undo();
    scored.push({ move, score: baseScore + styleBonus });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.move);
}

self.onmessage = ({ data }) => {
  if (data.command === 'stop') {
    timedOut = true;
    return;
  }
  noDraws = data.noDraws === true;
  const game = new Chess();
  if (!game.load(data.fen)) {
    self.postMessage({ id: data.id, error: 'The engine received an invalid position.' });
    return;
  }
  const moves = game.moves({ verbose: true });
  if (!moves.length) {
    self.postMessage({ id: data.id, error: 'No legal moves are available.' });
    return;
  }

  const bot = data.bot;
  deadline = performance.now() + Math.max(350, bot.thinkMs || 450);
  maxNodes = Number.isFinite(bot.maxNodes) ? bot.maxNodes : Infinity;
  timedOut = false;
  nodes = 0;
  transpositions.clear();
  let bestMove = moves[0];
  const maximumDepth = Math.max(1, Math.min(20, bot.depth || 1));

  for (let depth = 1; depth <= maximumDepth; depth += 1) {
    const depthStartNodes = nodes;
    timedOut = false;
    const rootMoves = orderMoves(game, game.moves({ verbose: true }), transpositions.get(positionKey(game))?.move);
    const scoredMoves = [];
    let alpha = -Infinity;
    for (const move of rootMoves) {
      if (performance.now() >= deadline || nodes >= maxNodes) {
        timedOut = true;
        break;
      }
      game.move(move);
      const value = -search(game, depth - 1, -Infinity, -alpha, 1);
      game.undo();
      if (timedOut) break;
      scoredMoves.push({ move, value });
      alpha = Math.max(alpha, value);
    }
    if (timedOut && !scoredMoves.length) break;
    let score = scoredMoves[0]?.value ?? evaluate(game);
    if (scoredMoves.length) {
      scoredMoves.sort((a, b) => b.value - a.value);
      score = scoredMoves[0].value;
      const ordered = applyStyle(game, scoredMoves.map((entry) => entry.move), bot);
      const selected = ordered[0];
      if (selected) bestMove = selected;
    }
    self.postMessage({
      id: data.id,
      type: 'info',
      depth,
      score: Math.round(score),
      nodes: nodes - depthStartNodes,
      totalNodes: nodes,
      best: bestMove.from + bestMove.to + (bestMove.promotion || ''),
    });
    if (timedOut) break;
  }

  self.postMessage({ id: data.id, type: 'bestmove', move: bestMove.from + bestMove.to + (bestMove.promotion || '') });
};
