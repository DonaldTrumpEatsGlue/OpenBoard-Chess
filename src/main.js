let game = typeof Chess === 'undefined' ? null : new Chess();
let activeBoardSize = 8;
const boardElement = document.querySelector('#board');
const moveListElement = document.querySelector('#move-list');
const gameMessage = document.querySelector('#game-message');
const difficultySelect = document.querySelector('#difficulty');
const promotionDialog = document.querySelector('#promotion-dialog');
const playColorSelect = document.querySelector('#play-color');
const timeControlSelect = document.querySelector('#time-control');
const boardThemeSelect = document.querySelector('#board-theme');
const interfaceThemeSelect = document.querySelector('#interface-theme');
const soundToggle = document.querySelector('#sound-toggle');
const messageDialog = document.querySelector('#message-dialog');
const botDirectory = document.querySelector('#bot-directory');
const botDirectoryGrid = document.querySelector('#bot-directory-grid');
const customRulesDialog = document.querySelector('#custom-rules-dialog');
const soundSettingsDialog = document.querySelector('#sound-settings-dialog');
const onlineDialog = document.querySelector('#online-dialog');
const pieceTheme = window.OpenboardPieceThemes.classic;
const soundManifest = window.OpenboardSoundManifest;
const defaultAudioSettings = {
  muted: false,
  masterVolume: 0.7,
  effectsVolume: 0.8,
  events: Object.fromEntries(Object.entries(soundManifest).map(([id, sound]) => [id, sound.available])),
};
const bots = {
  pip: { name: 'Pip', elo: 250, depth: 0, variety: 12, difficulty: 'BEGINNER', style: 'casual', description: 'A cheerful beginner who makes frequent mistakes and enjoys surprising moves.' },
  juniper: { name: 'Juniper', elo: 400, depth: 1, variety: 8, difficulty: 'BEGINNER', style: 'casual', description: 'A relaxed learner who likes getting pieces into the game.' },
  scout: { name: 'Scout', elo: 600, depth: 1, variety: 7, difficulty: 'CASUAL', style: 'casual', description: 'A curious explorer who spots simple captures but misses deeper tactics.' },
  moss: { name: 'Moss', elo: 800, depth: 1, variety: 4, difficulty: 'CASUAL', style: 'defensive', description: 'A patient defender who keeps the position calm and protects material.' },
  sage: { name: 'Sage', elo: 1000, depth: 2, variety: 4, difficulty: 'INTERMEDIATE', style: 'positional', description: 'A measured player who develops carefully and prefers sound trades.' },
  ember: { name: 'Ember', elo: 1200, depth: 2, variety: 3, difficulty: 'INTERMEDIATE', style: 'attacking', description: 'An energetic attacker who looks for open lines and tactical chances.' },
  rook: { name: 'Rook', elo: 1400, depth: 3, variety: 4, difficulty: 'ADVANCED', style: 'defensive', description: 'A sturdy opponent who values safety, structure, and connected rooks.' },
  lyra: { name: 'Lyra', elo: 1600, depth: 3, variety: 3, difficulty: 'ADVANCED', style: 'positional', description: 'A strategic thinker who aims for active pieces and lasting advantages.' },
  vale: { name: 'Vale', elo: 1800, depth: 3, variety: 2, difficulty: 'EXPERT', style: 'tactical', description: 'A sharp tactician who calculates forcing moves and punishes loose pieces.' },
  atlas: { name: 'Atlas', elo: 2000, depth: 4, variety: 3, thinkMs: 650, difficulty: 'EXPERT', style: 'positional', description: 'A resilient all-rounder who combines patient planning with accurate tactics.' },
  nyx: { name: 'Nyx', elo: 2200, depth: 5, variety: 2, thinkMs: 850, difficulty: 'MASTER', style: 'attacking', description: 'A dangerous attacker who presses for initiative at every opportunity.' },
  sol: { name: 'Sol', elo: 2400, depth: 5, variety: 1, thinkMs: 1000, difficulty: 'MASTER', style: 'tactical', description: 'A demanding opponent who searches for precise combinations and endgames.' },
  quartz: { name: 'Quartz', elo: 2600, depth: 6, variety: 1, thinkMs: 1200, difficulty: 'ELITE', style: 'positional', description: 'The strongest regular profile: disciplined, calculating, and hard to dislodge.' },
  max: {
    name: 'MAX ENGINE',
    depth: 20,
    thinkMs: 30000,
    difficulty: 'UNRESTRICTED',
    unrestricted: true,
    description: 'Full Stockfish 19 strength with no skill or Elo restriction. Search depth and time depend on your device.',
  },
};
const advancedBotNames = [
  'Aster', 'Bramble', 'Cinder', 'Dahlia', 'Echo', 'Fable', 'Gale', 'Harbor', 'Indigo', 'Jasper',
  'Kestrel', 'Lumen', 'Marble', 'Nimbus', 'Onyx', 'Peregrine', 'Quill', 'Riven', 'Sable', 'Thistle',
  'Umber', 'Vesper', 'Warden', 'Xanthe', 'Yarrow', 'Zephyr', 'Axiom', 'Borealis', 'Cipher', 'Drift',
  'Everest', 'Frost', 'Gambit', 'Helix', 'Isotope', 'Javelin', 'Keystone', 'Labyrinth', 'Monarch', 'Nightfall',
  'Obsidian', 'Parallax', 'Quasar', 'Rookery', 'Solstice', 'Tempest', 'Umbra', 'Vanguard', 'Wildcard', 'Zenith',
];
const advancedStyles = ['positional', 'tactical', 'attacking', 'defensive'];
advancedBotNames.forEach((name, index) => {
  const elo = Math.round(2700 + (index * 17300) / (advancedBotNames.length - 1));
  const difficulty = elo >= 12000 ? 'MYTHIC' : elo >= 6000 ? 'LEGEND' : 'GRANDMASTER';
  const style = advancedStyles[index % advancedStyles.length];
  const id = `challenge-${index + 1}`;
  bots[id] = {
    name,
    elo,
    depth: Math.min(7, 5 + Math.floor(index / 15)),
    thinkMs: Math.min(2200, 850 + index * 24),
    variety: index > 35 ? 1 : index > 18 ? 2 : 3,
    difficulty,
    style,
    description: `${difficulty[0]}${difficulty.slice(1).toLowerCase()} challenge profile with a ${style} label. Its strength is not an Elo rating.`,
  };
});
for (const [id, bot] of Object.entries(bots)) {
  if ([...difficultySelect.options].some((option) => option.value === id)) continue;
  const option = document.createElement('option');
  option.value = id;
  option.textContent = `${bot.name} · ${bot.difficulty}`;
  difficultySelect.append(option);
}
const stockfishSkillByDifficulty = {
  BEGINNER: 0,
  CASUAL: 3,
  INTERMEDIATE: 6,
  ADVANCED: 9,
  EXPERT: 12,
  MASTER: 16,
  ELITE: 19,
  GRANDMASTER: 20,
  LEGEND: 20,
  MYTHIC: 20,
};
function stockfishSkillLevel(bot) {
  return stockfishSkillByDifficulty[bot.difficulty] ?? 10;
}
function botStrengthLabel(bot) {
  return bot.unrestricted
    ? 'Unrestricted Stockfish 19 · not Elo'
    : `Stockfish skill ${stockfishSkillLevel(bot)}/20 · uncalibrated`;
}
for (const level of ['GRANDMASTER', 'LEGEND', 'MYTHIC', 'UNRESTRICTED']) {
  const option = document.createElement('option');
  option.value = level;
  option.textContent = level[0] + level.slice(1).toLowerCase();
  document.querySelector('#bot-category').append(option);
}
const pieceValues = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
const botAvatarColors = ['#d3a771', '#9dbea4', '#91a5d5', '#81ad91', '#d2bd75', '#d68168', '#829a7b', '#a88dcc', '#789b91', '#d08e6c', '#9d86b5', '#dbb474', '#7dabc1'];

let selectedSquare = null;
let legalTargets = [];
let pendingPremove = null;
let suggestedMove = null;
let moveInsights = [];
let flipped = false;
let aiThinking = false;
let gameToken = 0;
let activeWorker = null;
let playerColor = 'w';
let gameResult = false;
let analysisMode = false;
let puzzleMode = false;
let puzzleSolved = 0;
const puzzleSolution = { from: 'g6', to: 'g7' };
let clock = { w: 0, b: 0 };
let clockInterval = null;
let lastClockTick = Date.now();
let clockWarningPlayed = { w: false, b: false };
let redoMoves = [];
let audioSettings = JSON.parse(JSON.stringify(defaultAudioSettings));
let audioUnlocked = false;
let activeSound = null;
let onlineSocket = null;
let onlinePendingRequest = null;
let onlineMode = false;
let onlineReady = false;
let onlineSpectating = false;
let onlineChatHistory = { players: [], spectators: [] };
let onlineIdentityVerified = false;
let onlineRoomCode = null;
let onlinePlayerName = '';
let onlinePreviousClock = null;
let onlinePreviousColor = null;
let publicRooms = [];
let publicRoomsTimer = null;
const configuredOnlineServerUrl = document.querySelector('meta[name="openboard-server-url"]')?.content.trim() || '';
const onlineServerUrl = configuredOnlineServerUrl
  || (['localhost', '127.0.0.1', '::1'].includes(location.hostname)
    ? `ws://${location.hostname || 'localhost'}:3001/ws`
    : '');
const supabaseUrl = document.querySelector('meta[name="openboard-supabase-url"]')?.content.trim().replace(/\/+$/, '') || '';
const supabaseAnonKey = document.querySelector('meta[name="openboard-supabase-anon-key"]')?.content.trim() || '';
const authSessionStorageKey = 'openboard-auth-session';
const playableBoardSizes = [8, 10, 12, 14, 16, 18, 20];
let authSession = null;
let authUsername = '';
let authMode = 'signup';
const defaultCustomRules = {
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
let customRules = JSON.parse(JSON.stringify(defaultCustomRules));
let editingPieceMovements = JSON.parse(JSON.stringify(defaultCustomRules.pieceMovements));
let customMovementBySquare = new Map();
let customPieceBySquare = new Map();
let customIdentityHistory = [];
let editingCustomPieces = [];

function isGameOver() {
  return isCheckmate() || isStalemate() || isDraw();
}
function isCheck() { return variantIsInCheck(game.turn()); }
function isCheckmate() { return isCheck() && getLegalMoves().length === 0; }
function isStalemate() { return !isCheck() && getLegalMoves().length === 0; }
function isThreefoldRepetition() { return !customRules.noDraws && game.in_threefold_repetition(); }
function isInsufficientMaterial() { return !customRules.noDraws && game.insufficient_material(); }
function isDraw() {
  return !customRules.noDraws && (Number(game.fen().split(' ')[4]) >= 100
    || isInsufficientMaterial()
    || (game.history().length >= 8 && isThreefoldRepetition()));
}

function snapshotCustomIdentity() {
  customIdentityHistory.push({
    movements: [...customMovementBySquare],
    pieces: [...customPieceBySquare],
  });
}

function restoreCustomIdentity() {
  while (customIdentityHistory.length > game.history().length + 1) customIdentityHistory.pop();
  const snapshot = customIdentityHistory.at(-1);
  customMovementBySquare = new Map(snapshot?.movements ?? []);
  customPieceBySquare = new Map(snapshot?.pieces ?? []);
}

function moveIdentity(map, from, to) {
  const identity = map.get(from);
  map.delete(from);
  map.delete(to);
  if (identity) map.set(to, identity);
}

function castlingRookSquares(color, flags) {
  const rank = color === 'w' ? '1' : String(game.board().length);
  const offset = (game.board().length - 8) / 2;
  const kingSide = flags.includes('k');
  const rookFrom = offset + (kingSide ? 7 : 0);
  const rookTo = offset + (kingSide ? 5 : 3);
  return {
    from: `${String.fromCharCode(97 + rookFrom)}${rank}`,
    to: `${String.fromCharCode(97 + rookTo)}${rank}`,
    path: kingSide
      ? [offset + 5, offset + 6]
      : [offset + 3, offset + 2],
  };
}

function enPassantCapturedSquare(move) {
  const file = move.to.match(/^[a-z]+/)[0];
  const rank = move.from.slice(move.from.match(/[0-9]/).index);
  return `${file}${rank}`;
}

function makeGameMove(move, prevalidated = false) {
  const movingIdentity = customMovementBySquare.get(move.from);
  const movingCustomPiece = customRules.customPieces.find((piece) => piece.id === customPieceBySquare.get(move.from));
  const legalMove = prevalidated
    ? move
    : getLegalMoves({ square: move.from })
      .find((candidate) => candidate.to === move.to
        && (!candidate.promotion || candidate.promotion === (move.promotion ?? 'q')));
  if (!legalMove) throw new Error('The rules engine rejected the move.');
  const movingPiece = game.get(legalMove.from);
  if (movingPiece.type !== legalMove.piece) {
    game.remove(legalMove.from);
    game.put({ type: legalMove.piece, color: movingPiece.color }, legalMove.from);
  }
  let result;
  try {
    result = game.move(legalMove);
  } catch (error) {
    if (movingPiece.type !== legalMove.piece) {
      game.remove(legalMove.from);
      game.put(movingPiece, legalMove.from);
    }
    throw error;
  }
  if (!result) {
    if (movingPiece.type !== legalMove.piece) {
      game.remove(legalMove.from);
      game.put(movingPiece, legalMove.from);
    }
    throw new Error('The rules engine rejected the move.');
  }
  const capturedSquare = result.flags.includes('e') ? enPassantCapturedSquare(result) : result.to;
  customMovementBySquare.delete(capturedSquare);
  customPieceBySquare.delete(capturedSquare);
  moveIdentity(customMovementBySquare, result.from, result.to);
  moveIdentity(customPieceBySquare, result.from, result.to);
  if ((movingIdentity?.original === 'p' || (!movingCustomPiece?.studio && movingCustomPiece?.replaces === 'p'))
    && isPromotionSquare(result.to, result.color)) {
    const promotedType = move.promotion || 'q';
    game.remove(result.to);
    game.put({ type: promotedType, color: result.color }, result.to);
    customMovementBySquare.delete(result.to);
    customPieceBySquare.delete(result.to);
    result.customPromotion = true;
  } else if (result.promotion) {
    customMovementBySquare.delete(result.to);
    customPieceBySquare.delete(result.to);
  }
  if (result.flags.includes('k') || result.flags.includes('q')) {
    const { from: rookFrom, to: rookTo } = castlingRookSquares(result.color, result.flags);
    moveIdentity(customMovementBySquare, rookFrom, rookTo);
    moveIdentity(customPieceBySquare, rookFrom, rookTo);
  }
  snapshotCustomIdentity();
  return result;
}

function undoGameMove() {
  const result = game.undo();
  if (result) customIdentityHistory.pop();
  restoreCustomIdentity();
  return result;
}

function configureStartingPosition() {
  customMovementBySquare = new Map();
  customPieceBySquare = new Map();
  game.clearCustomMovements();
  const size = game.board().length;
  for (let rank = 1; rank <= size; rank += 1) {
    for (let file = 0; file < size; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${rank}`;
      const piece = game.get(square);
      if (!piece || piece.type === 'k') continue;
      const customDefinition = customRules.customPieces.find((candidate) => candidate.replaces === piece.type
        && (!candidate.color || candidate.color === 'both' || candidate.color === piece.color));
      if (customDefinition?.studio) {
        customPieceBySquare.set(square, customDefinition.id);
        game.setCustomMovement(square, customDefinition.studio);
        continue;
      }
      const movements = customDefinition?.movements ?? movementsForPiece(piece.type, piece.color);
      const customMovement = movements[0] ?? piece.type;
      if (customDefinition) customPieceBySquare.set(square, customDefinition.id);
      else if (movements.length !== 1 || customMovement !== piece.type) {
        customMovementBySquare.set(square, { original: piece.type, movements });
      }
      if (customMovement !== piece.type) {
        game.remove(square);
        game.put({ type: customMovement, color: piece.color }, square);
      }
    }
  }
  customIdentityHistory = [];
  snapshotCustomIdentity();
}

function customPieceAt(square) {
  const customId = customPieceBySquare.get(square);
  if (customId) {
    const definition = customRules.customPieces.find((candidate) => candidate.id === customId);
    if (definition) return { name: definition.name, symbol: definition.symbol };
  }
  const movement = customMovementBySquare.get(square);
  if (movement) {
    const piece = game.get(square);
    return {
      name: `${movement.movements.map(pieceMovementName).join(' + ')}-moving ${pieceMovementName(movement.original).toLowerCase()}`,
      symbol: pieceTheme.symbols[piece.color][movement.original],
    };
  }
  return null;
}

function pieceMovementName(type) {
  return ({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight', p: 'Pawn' })[type];
}

function movementPatternsFor(square, piece = game.get(square)) {
  if (!piece) return [];
  const customId = customPieceBySquare.get(square);
  if (customId) {
    const definition = customRules.customPieces.find((candidate) => candidate.id === customId);
    if (definition?.studio) return [piece.type];
    return definition?.movements ?? [piece.type];
  }
  return customMovementBySquare.get(square)?.movements ?? movementsForPiece(piece.type, piece.color);
}

function movementsForPiece(type, color) {
  const configured = customRules.pieceMovements[type];
  if (Array.isArray(configured)) return configured;
  return configured?.[color] ?? [type];
}

function isPawnIdentity(square) {
  const piece = game.get(square);
  const customDefinition = customRules.customPieces.find((candidate) => candidate.id === customPieceBySquare.get(square));
  return piece?.type === 'p' || customMovementBySquare.get(square)?.original === 'p'
    || (customDefinition?.studio ? customDefinition.studio.promotion : customDefinition?.replaces === 'p');
}

function variantIsInCheck(color) {
  const board = game.board();
  let kingSquare = null;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      if (board[row][col]?.type === 'k' && board[row][col].color === color) kingSquare = squareAt(row, col);
    }
  }
  if (!kingSquare) return true;
  return variantSquareAttacked(kingSquare, color === 'w' ? 'b' : 'w');
}

function variantSquareAttacked(square, attackerColor) {
  const board = game.board();
  if (game.is_attacked(square, attackerColor)) return true;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece || piece.color !== attackerColor) continue;
      const from = squareAt(row, col);
      if (movementPatternsFor(from, piece).some((pattern) => attacksSquare(from, square, piece.color, pattern))) return true;
    }
  }
  return false;
}

function attacksSquare(from, to, color, pattern) {
  const fileNumber = (square) => {
    let file = 0;
    for (const character of square.match(/^[a-z]+/)[0]) file = file * 26 + character.charCodeAt(0) - 96;
    return file - 1;
  };
  const dx = fileNumber(to) - fileNumber(from);
  const fromRank = Number(from.slice(from.match(/[0-9]/).index));
  const toRank = Number(to.slice(to.match(/[0-9]/).index));
  const dy = toRank - fromRank;
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
  while (file !== fileNumber(to) || rank !== toRank) {
    if (game.get(`${String.fromCharCode(97 + file)}${rank}`)) return false;
    file += stepX;
    rank += stepY;
  }
  return true;
}

function getLegalMoves(options = {}) {
  const squares = options.square
    ? [options.square]
    : game.board().flatMap((rank, row) => rank.map((piece, col) => piece?.color === game.turn() ? squareAt(row, col) : null).filter(Boolean));
  const legal = [];
  const seen = new Set();
  for (const square of squares) {
    const piece = game.get(square);
    if (!piece || piece.color !== game.turn()) continue;
    for (const pattern of movementPatternsFor(square, piece)) {
      const before = piece;
      if (before.type !== pattern) {
        game.remove(square);
        game.put({ type: pattern, color: before.color }, square);
      }
      const candidates = game.moves({ square, verbose: true });
      for (const candidate of candidates) {
        if (candidate.flags.includes('k') || candidate.flags.includes('q')) {
          if (variantIsInCheck(candidate.color)) continue;
          const rank = candidate.color === 'w' ? '1' : String(game.board().length);
          const { path } = castlingRookSquares(candidate.color, candidate.flags);
          const pathSquares = path.map((file) => `${String.fromCharCode(97 + file)}${rank}`);
          if (pathSquares.some((pathSquare) => variantSquareAttacked(pathSquare, candidate.color === 'w' ? 'b' : 'w'))) continue;
        }
        const key = `${candidate.from}${candidate.to}${candidate.promotion ?? ''}`;
        if (seen.has(key)) continue;
        const movementSnapshot = new Map(customMovementBySquare);
        const pieceSnapshot = new Map(customPieceBySquare);
        const played = game.move(candidate);
        if (!played) {
          customMovementBySquare = movementSnapshot;
          customPieceBySquare = pieceSnapshot;
          continue;
        }
        const capturedSquare = played.flags.includes('e') ? enPassantCapturedSquare(played) : played.to;
        customMovementBySquare.delete(capturedSquare);
        customPieceBySquare.delete(capturedSquare);
        moveIdentity(customMovementBySquare, played.from, played.to);
        moveIdentity(customPieceBySquare, played.from, played.to);
        if (played.promotion) {
          customMovementBySquare.delete(played.to);
          customPieceBySquare.delete(played.to);
        } else if ((customMovementBySquare.get(played.to)?.original === 'p'
          || customRules.customPieces.find((definition) => definition.id === customPieceBySquare.get(played.to))?.replaces === 'p')
          && isPromotionSquare(played.to, played.color)) {
          game.remove(played.to);
          game.put({ type: 'q', color: played.color }, played.to);
          customMovementBySquare.delete(played.to);
          customPieceBySquare.delete(played.to);
        }
        if (played.flags.includes('k') || played.flags.includes('q')) {
          const { from: rookFrom, to: rookTo } = castlingRookSquares(played.color, played.flags);
          moveIdentity(customMovementBySquare, rookFrom, rookTo);
          moveIdentity(customPieceBySquare, rookFrom, rookTo);
        }
        const safe = !variantIsInCheck(piece.color);
        game.undo();
        customMovementBySquare = movementSnapshot;
        customPieceBySquare = pieceSnapshot;
        if (safe) {
          legal.push(candidate);
          seen.add(key);
        }
      }
      if (before.type !== pattern) {
        game.remove(square);
        game.put(before, square);
      }
    }
  }
  return legal;
}

function updateCustomRulesSummary() {
  const pieces = [];
  const changedPieces = Object.entries(customRules.pieceMovements)
    .filter(([piece, sides]) => ['w', 'b'].some((color) => {
      const movements = Array.isArray(sides) ? sides : sides?.[color] ?? [piece];
      return movements.length !== 1 || movements[0] !== piece;
    }));
  if (changedPieces.length) pieces.push(`${changedPieces.length} piece movement${changedPieces.length > 1 ? 's' : ''} changed`);
  if (customRules.customPieces.length) pieces.push(`${customRules.customPieces.length} custom piece${customRules.customPieces.length > 1 ? 's' : ''}`);
  if (customRules.boardSize !== 8) pieces.push(`${customRules.boardSize}×${customRules.boardSize}`);
  if (!pieces.length) pieces.push('Standard chess');
  pieces.push(customRules.noDraws ? 'no draws' : 'draws allowed');
  document.querySelector('#custom-rules-summary').textContent = `${pieces.join(' · ')} ↗`;
  document.body.dataset.noDraws = String(customRules.noDraws);
  document.querySelector('#offer-draw').disabled = customRules.noDraws;
}

function populateCustomRulesForm() {
  document.querySelector('#board-size').value = String(customRules.boardSize);
  document.querySelector('#no-draws').checked = customRules.noDraws;
  refreshStudioGamePieceChoices();
  editingPieceMovements = JSON.parse(JSON.stringify(customRules.pieceMovements));
  document.querySelectorAll('.movement-preset-group[data-piece-movement]').forEach((group) => {
    const piece = group.dataset.pieceMovement;
    const sides = editingPieceMovements[piece];
    const white = Array.isArray(sides) ? sides : sides.w;
    const black = Array.isArray(sides) ? sides : sides.b;
    let sideSelect = group.querySelector('[data-piece-side]');
    if (!sideSelect) {
      const sideLabel = document.createElement('label');
      sideLabel.className = 'movement-side-control';
      sideLabel.append('Applies to');
      sideSelect = document.createElement('select');
      sideSelect.dataset.pieceSide = '';
      sideSelect.setAttribute('aria-label', `${pieceMovementName(piece)} movement applies to`);
      for (const [value, text] of [['both', 'Both sides'], ['w', 'White'], ['b', 'Black']]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        sideSelect.append(option);
      }
      sideLabel.append(sideSelect);
      group.append(sideLabel);
    }
    sideSelect.value = JSON.stringify(white) === JSON.stringify(black) ? 'both' : 'w';
    sideSelect.dataset.activeSide = sideSelect.value;
    renderMovementChoices(group, sideSelect.value === 'b' ? black : white, 'piece-movement');
    sideSelect.onchange = () => {
      saveMovementSelection(group, sideSelect.dataset.activeSide, selectedMovementChoices(group));
      sideSelect.dataset.activeSide = sideSelect.value;
      const current = editingPieceMovements[piece];
      const selectedForSide = sideSelect.value === 'both'
        ? current.w
        : current[sideSelect.value];
      renderMovementChoices(group, selectedForSide, 'piece-movement');
    };
    group.onchange = (event) => {
      if (event.target !== sideSelect) {
        saveMovementSelection(group, sideSelect.value, selectedMovementChoices(group));
      }
    };
  });
  editingCustomPieces = JSON.parse(JSON.stringify(customRules.customPieces));
  renderCustomPieceEditor();
}

function selectedMovementChoices(group) {
  return [...group.querySelectorAll('[data-piece-movement]:checked')].map((input) => input.value);
}

function saveMovementSelection(group, side, movements) {
  const piece = group.dataset.pieceMovement;
  const configured = editingPieceMovements[piece];
  if (side === 'both') {
    configured.w = [...movements];
    configured.b = [...movements];
  } else {
    configured[side] = [...movements];
  }
}

function renderMovementChoices(container, selected, datasetName) {
  container.querySelectorAll('label.movement-choice').forEach((label) => label.remove());
  const patterns = [['q', 'Queen'], ['r', 'Rook'], ['b', 'Bishop'], ['n', 'Knight'], ['p', 'Pawn']];
  for (const [value, name] of patterns) {
    const label = document.createElement('label');
    label.className = 'movement-choice';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = value;
    input.checked = selected.includes(value);
    input.setAttribute(datasetName === 'piece-movement' ? 'data-piece-movement' : 'data-custom-movement', '');
    const text = document.createElement('span');
    text.textContent = name;
    label.append(input, text);
    container.append(label);
  }
}

function renderCustomPieceEditor() {
  const list = document.querySelector('#custom-piece-list');
  list.replaceChildren();
  editingCustomPieces.forEach((piece) => {
    const row = document.createElement('div');
    row.className = 'custom-piece-row';
    row.dataset.pieceId = piece.id;
    row.dataset.customName = piece.name;
    row.dataset.customSymbol = piece.symbol;
    row.dataset.customMovements = JSON.stringify(piece.movements);
    row.dataset.customStudio = piece.studio ? JSON.stringify(piece.studio) : '';
    const identity = document.createElement('div');
    identity.className = 'custom-piece-identity';
    const symbol = document.createElement('span');
    symbol.className = 'custom-piece-symbol';
    symbol.textContent = piece.symbol;
    const name = document.createElement('strong');
    name.textContent = piece.name;
    const source = document.createElement('small');
    source.textContent = 'Designed in Custom Piece Studio';
    identity.append(symbol, name, source);
    row.append(identity);
    const selects = [
      { title: 'Replaces', key: 'replaces', value: piece.replaces, options: [['p', 'Pawns'], ['n', 'Knights'], ['b', 'Bishops'], ['r', 'Rooks'], ['q', 'Queens']] },
      { title: 'Applies to', key: 'color', value: piece.color ?? 'both', options: [['both', 'Both sides'], ['w', 'White'], ['b', 'Black']] },
    ];
    for (const field of selects) {
      const label = document.createElement('label');
      label.className = 'rule-field';
      const title = document.createElement('span');
      title.textContent = field.title;
      const select = document.createElement('select');
      select.dataset[`custom${field.key[0].toUpperCase()}${field.key.slice(1)}`] = '';
      field.options.forEach(([value, text]) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.append(option);
      });
      select.value = field.value;
      label.append(title, select);
      row.append(label);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-button remove-piece-button';
    remove.textContent = 'Remove from variant';
    remove.addEventListener('click', () => {
      editingCustomPieces = editingCustomPieces.filter((candidate) => candidate.id !== piece.id);
      renderCustomPieceEditor();
    });
    row.append(remove);
    list.append(row);
  });
}

function getSavedStudioPieces() {
  try {
    const saved = JSON.parse(localStorage.getItem('openboard-piece-studio-v1') || '[]');
    return Array.isArray(saved)
      ? saved.filter((piece) => piece && typeof piece.id === 'string' && typeof piece.name === 'string'
        && typeof piece.symbol === 'string' && Array.isArray(piece.vectors))
      : [];
  } catch (error) {
    console.error('Could not read the Custom Piece Studio library:', error);
    return [];
  }
}

function studioMovementPatterns(piece) {
  if (!piece || piece.royal === true || !Array.isArray(piece.vectors)
    || !['step', 'slide', 'leap'].includes(piece.movementType)
    || !Number.isInteger(piece.range) || piece.range < 1 || piece.range > 8
    || !['both', 'move', 'capture', 'attack'].includes(piece.captureMode ?? 'both')
    || !piece.vectors.every((vector) => vector && Number.isInteger(vector.dx) && Number.isInteger(vector.dy)
      && Math.abs(vector.dx) <= 8 && Math.abs(vector.dy) <= 8
      && (vector.dx !== 0 || vector.dy !== 0)
      && ['both', 'move', 'capture', 'attack'].includes(vector.mode ?? piece.captureMode ?? 'both'))) return null;
  const vectorKeys = piece.vectors.map((vector) => `${vector.dx},${vector.dy}`);
  if (new Set(vectorKeys).size !== vectorKeys.length) return null;
  return {
    vectors: piece.vectors.map((vector) => ({
      dx: vector.dx,
      dy: vector.dy,
      mode: vector.mode ?? piece.captureMode ?? 'both',
    })),
    movementType: piece.movementType,
    captureMode: piece.captureMode ?? 'both',
    range: piece.range,
    mirror: piece.mirror === true,
    jump: piece.jump === true,
    promotion: piece.promotion === true,
  };
}

function refreshStudioGamePieceChoices() {
  const select = document.querySelector('#studio-game-piece');
  select.replaceChildren(new Option('Choose a saved piece', ''));
  for (const piece of getSavedStudioPieces()) {
    select.add(new Option(piece.name, piece.id));
  }
}

function nextCustomPieceReplacement(existing, preferred = null) {
  const allReplacements = ['n', 'b', 'r', 'q', 'p'];
  const replacementOrder = preferred
    ? [preferred, ...allReplacements.filter((type) => type !== preferred)]
    : allReplacements;
  return replacementOrder
    .flatMap((replaces) => ['both', 'w', 'b'].map((color) => ({ replaces, color })))
    .find(({ replaces, color }) => !existing.some((piece) => piece.replaces === replaces
      && (piece.color === 'both' || color === 'both' || piece.color === color)));
}

function readCustomPieceRows() {
  return [...document.querySelectorAll('.custom-piece-row')].map((row, index) => ({
    id: row.dataset.pieceId || `custom-piece-${index}`,
    name: row.dataset.customName,
    symbol: row.dataset.customSymbol,
    movements: JSON.parse(row.dataset.customMovements),
    replaces: row.querySelector('[data-custom-replaces]').value,
    color: row.querySelector('[data-custom-color]').value,
    ...(row.dataset.customStudio ? { studio: JSON.parse(row.dataset.customStudio) } : {}),
  }));
}

function readCustomRulesForm() {
  const customPieces = readCustomPieceRows();
  const replacementKeys = customPieces.flatMap((piece) => piece.color === 'both'
    ? [`${piece.replaces}:w`, `${piece.replaces}:b`]
    : [`${piece.replaces}:${piece.color}`]);
  if (new Set(replacementKeys).size !== replacementKeys.length) {
    showMessage('Choose unique replacements', 'A piece type can only have one custom replacement per side.');
    return null;
  }
  document.querySelectorAll('.movement-preset-group[data-piece-movement]').forEach((group) => {
    saveMovementSelection(group, group.querySelector('[data-piece-side]').value, selectedMovementChoices(group));
  });
  const pieceMovements = JSON.parse(JSON.stringify(editingPieceMovements));
  if (Object.values(pieceMovements).some((sides) => !sides.w.length || !sides.b.length)) {
    showMessage('Choose movement patterns', 'Each side needs at least one movement pattern for every piece.');
    return null;
  }
  return {
    boardSize: playableBoardSizes.includes(Number(document.querySelector('#board-size').value))
      ? Number(document.querySelector('#board-size').value)
      : 8,
    noDraws: document.querySelector('#no-draws').checked,
    pieceMovements,
    customPieces,
  };
}

function squareAt(row, col) {
  return `${String.fromCharCode(97 + col)}${game.board().length - row}`;
}

function renderBoard() {
  const size = game.board().length;
  const premoveWindow = canQueuePremove();
  const rows = [...Array(size).keys()];
  const cols = [...Array(size).keys()];
  if (flipped) {
    rows.reverse();
    cols.reverse();
  }
  boardElement.style.setProperty('--board-size', size);
  boardElement.replaceChildren();
  const gameOver = isGameOver();
  const currentCheck = isCheck();
  const lastMoveTo = game.history({ verbose: true }).at(-1)?.to;

  rows.forEach((rank, rowIndex) => {
    cols.forEach((file, colIndex) => {
      const square = squareAt(rank, file);
      const piece = game.get(square);
      const customIdentity = piece ? customPieceAt(square) : null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      button.dataset.square = square;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${customIdentity?.name ?? piece.type}` : ''}`);
      if (suggestedMove?.from === square) button.classList.add('suggested-from');
      if (suggestedMove?.to === square) button.classList.add('suggested-to');

      if (colIndex === 0) {
        const rankLabel = document.createElement('span');
        rankLabel.className = `coordinate rank-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        rankLabel.textContent = String(size - rank);
        button.append(rankLabel);
      }
      if (rowIndex === size - 1) {
        const fileLabel = document.createElement('span');
        fileLabel.className = `coordinate file-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        fileLabel.textContent = String.fromCharCode(97 + file);
        button.append(fileLabel);
      }
      if (lastMoveTo === square) button.classList.add('last-move');
      if (selectedSquare === square) button.classList.add('selected');
      if (pendingPremove?.from === square) button.classList.add('premove-from');
      if (pendingPremove?.to === square) button.classList.add('premove-to');
      if (currentCheck && piece?.type === 'k' && piece.color === game.turn()) button.classList.add('in-check');
      if (legalTargets.includes(square)) {
        const target = document.createElement('span');
        target.className = piece ? 'move-target capture-target' : 'move-target';
        button.append(target);
      }
      if (piece) {
        const pieceElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pieceElement.setAttribute('class', `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`);
        pieceElement.setAttribute('viewBox', '0 0 100 100');
        pieceElement.setAttribute('focusable', 'false');
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '50');
        symbol.setAttribute('y', '82');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('font-family', pieceTheme.fontFamily);
        symbol.textContent = customIdentity?.symbol ?? pieceTheme.symbols[piece.color][piece.type];
        pieceElement.append(symbol);
        pieceElement.setAttribute('aria-hidden', 'true');
        button.append(pieceElement);
      }
      button.draggable = Boolean(piece && piece.color === playerColor && !gameResult
        && (!aiThinking || premoveWindow));
      button.addEventListener('dragstart', (event) => {
        if (!button.draggable) return;
        selectedSquare = square;
        event.dataTransfer.setData('text/plain', square);
        event.dataTransfer.effectAllowed = 'move';
      });
      button.addEventListener('dragover', (event) => {
        if (selectedSquare) event.preventDefault();
      });
      button.addEventListener('drop', (event) => {
        event.preventDefault();
        const from = event.dataTransfer.getData('text/plain') || selectedSquare;
        const premoving = onlineMode && game.turn() !== playerColor;
        const candidate = (premoving ? getPremoveMoves(from) : getLegalMoves({ square: from }))
          .find((move) => move.to === square);
        if (!candidate) return;
        if (isPawnIdentity(from) && isPromotionSquare(square, game.get(from)?.color)) askPromotion(from, square);
        else if (premoving) queuePremove(from, square);
        else playMove(from, square);
      });
      button.disabled = (aiThinking && !premoveWindow) || gameOver || gameResult || (onlineMode && !onlineReady);
      button.addEventListener('click', () => onSquareClick(square));
      boardElement.append(button);
    });
  });
  renderMoves();
}

function isPromotionSquare(square, color) {
  const rank = Number(square.slice(square.match(/[0-9]/).index));
  return rank === (color === 'w' ? game.board().length : 1);
}

function renderMoves() {
  const history = game.history();
  const verboseHistory = game.history({ verbose: true });
  document.querySelector('#move-count').textContent = `${history.length} ${history.length === 1 ? 'move' : 'moves'}`;
  updateGameInsights(history);
  if (!history.length) {
    moveListElement.innerHTML = '<div class="empty-moves">Moves will appear here as you play.</div>';
    return;
  }
  moveListElement.replaceChildren();
  for (let index = 0; index < history.length; index += 2) {
    const row = document.createElement('div');
    row.className = 'move-row';
    const number = document.createElement('span');
    number.className = 'move-number';
    number.textContent = `${Math.floor(index / 2) + 1}.`;
    const white = renderMoveCell(history, verboseHistory, index);
    const black = renderMoveCell(history, verboseHistory, index + 1);
    if (index === history.length - 1) white.classList.add('latest-move');
    if (index + 1 === history.length - 1) black.classList.add('latest-move');
    row.append(number, white, black);
    moveListElement.append(row);
  }
  moveListElement.scrollTop = moveListElement.scrollHeight;
}

function renderMoveCell(history, verboseHistory, ply) {
  const cell = document.createElement('span');
  if (!history[ply]) return cell;
  const san = document.createElement('span');
  san.textContent = history[ply];
  cell.append(san);
  const context = window.OpenboardGameInsights.getMoveContext(history, ply, verboseHistory[ply]);
  const annotation = moveInsights[ply];
  const grade = context.book
    ? { label: 'Book', icon: '📖', description: context.bookTheme ?? 'A recognized move in a standard opening line.' }
    : annotation?.grade;
  if (!grade) return cell;
  const badge = document.createElement('span');
  badge.className = `move-grade move-grade-${grade.label.toLowerCase().replaceAll(' ', '-')}`;
  badge.textContent = `${grade.icon} ${grade.label}`;
  badge.title = annotation?.detail ?? grade.description;
  cell.append(badge);
  return cell;
}

function updateGameInsights(history = game.history()) {
  const opening = window.OpenboardGameInsights.openingForHistory(history);
  document.querySelector('#opening-name').textContent = opening?.name ?? 'Opening not identified';
  document.querySelector('#opening-theme').textContent = opening?.theme
    ?? 'Play a few moves to identify the opening and explain each side’s plan.';
  const latest = moveInsights[history.length - 1];
  const latestElement = document.querySelector('#latest-move-insight');
  if (!latest) {
    latestElement.textContent = history.length
      ? 'This position came from a loaded game; make a move to see quick feedback.'
      : 'Move feedback appears here after each move.';
    return;
  }
  latestElement.textContent = `${latest.color === 'w' ? 'White' : 'Black'} · ${latest.san}: ${latest.grade?.icon ?? ''} ${latest.grade?.label ?? 'Move'}${latest.detail ? ` — ${latest.detail}` : ''}`;
}

function analyzeMoveQuality(move) {
  if (isCustomVariantActive()) return null;
  const mover = game.turn();
  const candidates = getLegalMoves();
  const scores = candidates.map((candidate) => ({
    candidate,
    score: estimateMoveImpact(candidate, game.history().length + 1),
  }));
  if (!scores.length) return null;
  scores.sort((left, right) => right.score - left.score);
  const chosen = scores.find(({ candidate }) => candidate.from === move.from
    && candidate.to === move.to
    && (candidate.promotion ?? 'q') === (move.promotion ?? 'q'));
  if (!chosen) return null;
  const bestScore = scores[0]?.score ?? chosen.score;
  const nextBestScore = scores[1]?.score ?? bestScore;
  const loss = Math.max(0, bestScore - chosen.score);
  return {
    grade: window.OpenboardGameInsights.classifyMove({
      loss,
      bestGap: bestScore - nextBestScore,
      soundSacrifice: false,
    }),
    loss,
  };
}

function estimateMoveImpact(move, plyCount) {
  const piece = game.get(move.from);
  const promotion = move.promotion ? { type: move.promotion, color: piece.color } : piece;
  const capturedSquare = move.flags.includes('e') ? enPassantCapturedSquare(move) : move.to;
  const capturedPiece = game.get(capturedSquare);
  const moverSign = piece.color === 'w' ? 1 : -1;
  const materialAndPositionChange = piecePositionValue(promotion, move.to, plyCount)
    - piecePositionValue(piece, move.from, plyCount - 1)
    + (capturedPiece ? pieceValues[capturedPiece.type] : 0);
  const checkBonus = move.san?.includes('+') || move.san?.includes('#') ? 40 : 0;
  return moverSign * materialAndPositionChange + checkBonus;
}

function recordMoveInsight(move, quality) {
  const history = game.history();
  const ply = history.length - 1;
  const context = window.OpenboardGameInsights.getMoveContext(history, ply, move);
  const grade = context.book
    ? { label: 'Book', icon: '📖', description: context.bookTheme ?? 'A recognized move in a standard opening line.' }
    : quality?.grade ?? null;
  const detail = context.book
    ? `${context.bookName}: ${context.bookTheme}`
    : `${context.theme.replace(/[.!?]+$/, '')}. ${grade?.description ?? 'Move grades are unavailable for custom movement variants.'}`;
  moveInsights[ply] = { color: move.color, san: move.san, grade, detail };
}

function onSquareClick(square) {
  if (onlineSpectating) return;
  const premoving = canQueuePremove();
  if ((aiThinking && !premoving) || gameResult || isGameOver()
    || (onlineMode && (!onlineReady || onlineSocket?.readyState !== WebSocket.OPEN))
    || (!analysisMode && !puzzleMode && game.turn() !== playerColor && !premoving)) return;
  const clickedPiece = game.get(square);
  if (premoving) {
    if (pendingPremove && (square === pendingPremove.from || square === pendingPremove.to)) {
      pendingPremove = null;
      selectedSquare = null;
      legalTargets = [];
      gameMessage.textContent = 'Premove canceled.';
      renderBoard();
      return;
    }
    if (selectedSquare && legalTargets.includes(square)) {
      if (isPawnIdentity(selectedSquare) && isPromotionSquare(square, game.get(selectedSquare)?.color)) {
        askPromotion(selectedSquare, square);
        return;
      }
      queuePremove(selectedSquare, square);
      return;
    }
    if (clickedPiece?.color === playerColor) {
      pendingPremove = null;
      selectedSquare = square;
      legalTargets = [...new Set(getPremoveMoves(square).map((move) => move.to))];
      playSound('selection');
    } else {
      selectedSquare = null;
      legalTargets = [];
    }
    renderBoard();
    return;
  }
  if (selectedSquare && legalTargets.includes(square)) {
    if (isPawnIdentity(selectedSquare) && isPromotionSquare(square, game.get(selectedSquare)?.color)) {
      askPromotion(selectedSquare, square);
      return;
    }
    playMove(selectedSquare, square);
    return;
  }
  if (clickedPiece?.color === (analysisMode ? game.turn() : playerColor)) {
    selectedSquare = square;
    legalTargets = getLegalMoves({ square }).map((move) => move.to);
    playSound('selection');
  } else {
    selectedSquare = null;
    legalTargets = [];
  }
  renderBoard();
}

function getPremoveMoves(square) {
  const piece = game.get(square);
  if (!piece || piece.color !== playerColor || !canQueuePremove()) return [];
  try {
    const fen = game.fen().split(' ');
    fen[1] = playerColor;
    fen[3] = '-';
    const premoveGame = new Chess(fen.join(' '));
    const moves = premoveGame.moves({ square, verbose: true, legal: false });
    if (piece.type === 'p') {
      const file = square.charCodeAt(0) - 97;
      const rank = Number(square.slice(square.match(/[0-9]/).index));
      const direction = piece.color === 'w' ? 1 : -1;
      for (const targetFile of [file - 1, file + 1]) {
        if (targetFile < 0 || targetFile > 7) continue;
        const target = `${String.fromCharCode(97 + targetFile)}${rank + direction}`;
        if (game.get(target)?.color === playerColor) continue;
        moves.push({ from: square, to: target, piece: 'p' });
      }
    }
    return moves;
  } catch (error) {
    console.error('Could not generate premove targets:', error);
    gameMessage.textContent = 'Could not prepare premove targets for this position.';
    return [];
  }
}

function canQueuePremove() {
  if (onlineMode) return !onlineSpectating && onlineReady && game.turn() !== playerColor;
  return aiThinking && !analysisMode && !puzzleMode && game.turn() !== playerColor;
}

function queuePremove(from, to, promotion = 'q') {
  pendingPremove = { from, to, promotion };
  selectedSquare = null;
  legalTargets = [];
  gameMessage.textContent = 'Premove queued. Click its source or destination to cancel.';
  renderBoard();
}

function askPromotion(from, to) {
  promotionDialog.showModal();
  promotionDialog.querySelectorAll('button').forEach((button) => {
    button.onclick = (event) => {
      event.preventDefault();
      const promotion = button.value;
      promotionDialog.close();
      if (onlineMode && game.turn() !== playerColor) queuePremove(from, to, promotion);
      else playMove(from, to, promotion);
    };
  });
}

function playMove(from, to, promotion = 'q') {
  if (onlineSpectating) return;
  if (onlineMode && (!onlineReady || onlineSocket?.readyState !== WebSocket.OPEN || game.turn() !== playerColor)) return;
  const quality = analyzeMoveQuality({ from, to, promotion });
  let appliedMove;
  try {
    appliedMove = makeGameMove({ from, to, promotion });
  } catch (error) {
    console.error('Could not make chess move:', error);
    gameMessage.textContent = 'That move could not be made. Please choose another square.';
    return;
  }
  suggestedMove = null;
  if (puzzleMode && (from !== puzzleSolution.from || to !== puzzleSolution.to)) {
    undoGameMove();
    gameMessage.textContent = 'Not quite. Look for a checking move near the black king.';
    playSound('puzzle-failure');
    renderBoard();
    return;
  }
  if (puzzleMode) {
    puzzleMode = false;
    gameResult = true;
    puzzleSolved += 1;
    try {
      localStorage.setItem('openboard-puzzles-solved', String(puzzleSolved));
    } catch (error) {
      console.error('Could not save puzzle progress:', error);
    }
    gameMessage.textContent = 'Puzzle solved — checkmate in one!';
    playSound('puzzle-success');
    renderBoard();
    return;
  }
  recordMoveInsight(appliedMove, quality);
  registerClockMove();
  redoMoves = [];
  if (onlineMode) {
    onlineSocket.send(JSON.stringify({ type: 'move', from, to, promotion }));
  }
  pendingPremove = null;
  selectedSquare = null;
  legalTargets = [];
  playMoveSound(appliedMove, 'self');
  updateGameState();
  if (!isGameOver() && !gameResult && !analysisMode && !onlineMode) {
    aiThinking = true;
    gameMessage.textContent = 'The engine is thinking…';
    renderBoard();
    const token = gameToken;
    window.setTimeout(() => {
      if (token !== gameToken || isGameOver() || gameResult) return;
      requestBotMove(bots[difficultySelect.value], token);
    }, 250 + Math.random() * 450);
  } else {
    renderBoard();
  }
  return appliedMove;
}

function evaluateMaterialPosition() {
  let score = 0;
  const board = game.board();
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      const piece = board[row][col];
      if (!piece) continue;
      const square = squareAt(row, col);
      score += (piece.color === 'w' ? 1 : -1) * piecePositionValue(piece, square, game.history().length);
    }
  }
  return score;
}

function piecePositionValue(piece, square, plyCount) {
  const boardSize = game.board().length;
  const row = boardSize - Number(square.slice(square.match(/[0-9]/).index));
  const col = square.charCodeAt(0) - 97;
  const movementIdentity = customMovementBySquare.get(square);
  const customDefinition = customRules.customPieces.find((definition) => definition.id === customPieceBySquare.get(square));
  const originalType = customDefinition?.replaces ?? movementIdentity?.original ?? piece.type;
  const advancement = piece.color === 'w' ? boardSize - 2 - row : row - 1;
  const center = (boardSize - 1) / 2;
  const centerDistance = Math.abs(center - col) + Math.abs(center - row);
  let positional = 0;
  if (originalType === 'p') positional = advancement * 7;
  if (originalType === 'n' || originalType === 'b') positional = (7 - centerDistance) * 4;
  if (originalType === 'k' && plyCount > 20) positional = (7 - centerDistance) * 2;
  return pieceValues[originalType] + positional;
}

function search(depth, alpha, beta) {
  const moves = getLegalMoves();
  if (!moves.length) {
    if (isCheck() || customRules.noDraws) return game.turn() === 'w' ? -100000 : 100000;
    return 0;
  }
  if (!customRules.noDraws && (Number(game.fen().split(' ')[4]) >= 100 || game.insufficient_material())) return 0;
  if (depth === 0) return evaluateMaterialPosition();
  moves.sort((a, b) => moveOrderScore(b) - moveOrderScore(a));
  const maximizing = game.turn() === 'w';
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    makeGameMove(move, true);
    const score = search(depth - 1, alpha, beta);
    undoGameMove();
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function moveOrderScore(move) {
  if (!move.captured) return 0;
  return 10 * pieceValues[move.captured] - pieceValues[move.piece];
}

function findBestMove(bot) {
  const moves = getLegalMoves();
  const scoredMoves = [];
  for (const move of moves) {
    makeGameMove(move, true);
    const score = search(bot.depth - 1, -Infinity, Infinity);
    undoGameMove();
    scoredMoves.push({ move, score });
  }
  const sign = game.turn() === 'w' ? 1 : -1;
  scoredMoves.sort((a, b) => sign * (b.score - a.score));
  return scoredMoves[0]?.move ?? moves[0];
}

function reportStockfishFailure(error, bot, token) {
  console.error('Stockfish could not complete its move:', error);
  if (token !== gameToken || gameResult || isGameOver()) return;
  const fallbackDepth = Math.max(1, Math.min(bot.depth || 2, 2));
  let move;
  try {
    move = findBestMove({ depth: fallbackDepth, variety: 1 });
  } catch (fallbackError) {
    console.error('The local fallback could not find a move:', fallbackError);
    aiThinking = false;
    gameMessage.textContent = 'Stockfish and the local fallback both failed. Reload the page and start a new game.';
    renderBoard();
    return;
  }
  if (!move) {
    aiThinking = false;
    gameMessage.textContent = 'Stockfish failed and no legal fallback move is available. Start a new game.';
    renderBoard();
    return;
  }
  try {
    const quality = analyzeMoveQuality(move);
    const appliedMove = makeGameMove(move);
    recordMoveInsight(appliedMove, quality);
    playMoveSound(appliedMove, 'opponent');
    registerClockMove();
    finishBotTurn();
    const fallbackNote = `Stockfish couldn't load; the local fallback played ${appliedMove.san}.`;
    gameMessage.textContent = gameResult
      ? `${gameMessage.textContent} ${fallbackNote}`
      : fallbackNote;
  } catch (fallbackError) {
    console.error('The local fallback move could not be applied:', fallbackError);
    aiThinking = false;
    gameMessage.textContent = 'Stockfish and the local fallback both failed. Reload the page and start a new game.';
    renderBoard();
  }
}

function requestBotMove(bot, token) {
  const needsVariantSearch = activeBoardSize > 8 || customRules.customPieces.length > 0
    || Object.entries(customRules.pieceMovements).some(([piece, sides]) => ['w', 'b'].some((color) => {
      const movements = Array.isArray(sides) ? sides : sides?.[color] ?? [piece];
      return movements.length !== 1 || movements[0] !== piece;
    }));
  if (needsVariantSearch) {
    applyFallbackMove(bot, token);
    return;
  }
  try {
    const worker = new Worker(new URL('./stockfish/stockfish-19-single.js', document.baseURI));
    activeWorker = worker;
    let configured = false;
    let searchStarted = false;
    const finishSearch = (uciMove) => {
      if (activeWorker === worker) {
        worker.terminate();
        activeWorker = null;
      }
      if (token !== gameToken || isGameOver() || gameResult) {
        return;
      }
      if (!uciMove || uciMove === '(none)' || uciMove === '0000') {
        if (!isGameOver()) {
          reportStockfishFailure(new Error('The engine returned no move for a non-terminal position.'), bot, token);
        }
        return;
      }
      const move = { from: uciMove.slice(0, 2), to: uciMove.slice(2, 4) };
      if (uciMove.length > 4) move.promotion = uciMove[4];
      try {
        const quality = analyzeMoveQuality(move);
        const appliedMove = makeGameMove(move);
        recordMoveInsight(appliedMove, quality);
        playMoveSound(appliedMove, 'opponent');
      } catch (error) {
        reportStockfishFailure(new Error(`The engine returned an illegal move: ${error.message}`), bot, token);
        return;
      }
      registerClockMove();
      finishBotTurn();
    };
    worker.onmessage = ({ data }) => {
      if (token !== gameToken || isGameOver() || gameResult) {
        if (activeWorker === worker) {
          worker.terminate();
          activeWorker = null;
        }
        return;
      }
      const line = String(data).trim();
      if (line === 'uciok' && !configured) {
        configured = true;
        worker.postMessage('setoption name Threads value 1');
        worker.postMessage(`setoption name Hash value ${bot.unrestricted ? 256 : 32}`);
        if (!bot.unrestricted) worker.postMessage(`setoption name Skill Level value ${stockfishSkillLevel(bot)}`);
        worker.postMessage('isready');
        return;
      }
      if (line === 'readyok' && !searchStarted) {
        searchStarted = true;
        worker.postMessage(`position fen ${game.fen()}`);
        worker.postMessage(bot.unrestricted
          ? 'go depth 99 movetime 30000'
          : `go movetime ${Math.max(300, bot.thinkMs || 450)}`);
        return;
      }
      if (line.startsWith('info ')) {
        const depth = line.match(/\bdepth (\d+)\b/)?.[1];
        const nodes = line.match(/\bnodes (\d+)\b/)?.[1];
        const nps = line.match(/\bnps (\d+)\b/)?.[1];
        if (depth) {
          gameMessage.textContent = `Stockfish search · depth ${depth}${nodes ? ` · ${Number(nodes).toLocaleString()} nodes` : ''}${nps ? ` · ${Number(nps).toLocaleString()} n/s` : ''}`;
        }
        return;
      }
      const bestMove = line.match(/^bestmove (\S+)/);
      if (bestMove) finishSearch(bestMove[1]);
    };
    worker.onerror = (error) => {
      if (activeWorker === worker) {
        worker.terminate();
        activeWorker = null;
      }
      if (token !== gameToken || isGameOver() || gameResult) return;
      reportStockfishFailure(error, bot, token);
    };
    worker.postMessage('uci');
  } catch (error) {
    reportStockfishFailure(error, bot, token);
  }
}

function applyFallbackMove(bot, token) {
  if (token !== gameToken || isGameOver() || gameResult) return;
  const maxDepth = activeBoardSize >= 16 ? 1 : activeBoardSize >= 12 ? 2 : 3;
  const fallbackDepth = Math.max(1, Math.min(bot.depth, maxDepth));
  const move = findBestMove({ ...bot, depth: fallbackDepth });
  if (move) {
    const quality = analyzeMoveQuality(move);
    const appliedMove = makeGameMove(move);
    recordMoveInsight(appliedMove, quality);
    playMoveSound(appliedMove, 'opponent');
  }
  registerClockMove();
  finishBotTurn();
}

function finishBotTurn() {
  aiThinking = false;
  updateGameState();
  renderBoard();
  playPendingPremove();
}

function playPendingPremove() {
  if (!pendingPremove) return;
  if (game.turn() !== playerColor || isGameOver() || gameResult) {
    pendingPremove = null;
    renderBoard();
    return;
  }
  const premove = pendingPremove;
  const legalMove = getLegalMoves({ square: premove.from }).find((move) => move.to === premove.to
    && (!move.promotion || move.promotion === premove.promotion));
  pendingPremove = null;
  if (!legalMove) {
    gameMessage.textContent = 'Your premove was no longer legal and was cleared.';
    renderBoard();
    if (onlineMode) updateOnlineStatus('Premove cleared because it was no longer legal after your opponent’s move.');
    return;
  }
  const playedMove = playMove(legalMove.from, legalMove.to, premove.promotion);
  if (playedMove) {
    if (onlineMode) updateOnlineStatus(`Premove played: ${playedMove.san}.`);
    else gameMessage.textContent = `Premove played: ${playedMove.san}.`;
  }
}

function updateGameState() {
  updateClockDisplay();
  updateColorLabels();
  if (gameResult) return;
  if (isCheckmate()) {
    gameMessage.textContent = onlineMode
      ? onlineSpectating
        ? `Checkmate. ${game.turn() === 'w' ? 'White' : 'Black'} is checkmated.`
        : game.turn() === playerColor ? 'Checkmate. Your opponent wins.' : 'Checkmate! You win!'
      : analysisMode
        ? `Checkmate. ${game.turn() === 'w' ? 'White' : 'Black'} is checkmated.`
        : game.turn() === 'w' ? 'Checkmate. The engine wins this game.' : 'Checkmate! You win!';
    markGameResult(onlineSpectating ? 'draw' : game.turn() === playerColor ? 'defeat' : 'victory');
  } else if (isStalemate()) {
    gameMessage.textContent = customRules.noDraws
      ? `${game.turn() === 'w' ? 'White' : 'Black'} has no legal moves. Stalemate counts as a loss in this ruleset.`
      : 'Draw by stalemate.';
    markGameResult(customRules.noDraws ? (game.turn() === playerColor ? 'defeat' : 'victory') : 'draw');
  } else if (isThreefoldRepetition()) {
    gameMessage.textContent = 'Draw by threefold repetition.';
    markGameResult('draw');
  } else if (isInsufficientMaterial()) {
    gameMessage.textContent = 'Draw by insufficient material.';
    markGameResult('draw');
  } else if (isDraw()) {
    gameMessage.textContent = 'The game is a draw.';
    markGameResult('draw');
  } else if (aiThinking) {
    gameMessage.textContent = 'The engine is thinking…';
  } else if (isCheck()) {
    gameMessage.textContent = onlineMode
      ? onlineSpectating
        ? `${game.turn() === 'w' ? 'White' : 'Black'} is in check.`
        : game.turn() === playerColor ? 'Check! Find a safe move.' : 'Your opponent is in check.'
      : game.turn() === 'w' ? 'Check! Find a safe move.' : 'The engine is in check.';
  } else if (onlineMode) {
    gameMessage.textContent = onlineSpectating
      ? `Spectating · ${game.turn() === 'w' ? 'White' : 'Black'} to move.`
      : !onlineReady && onlineSocket?.readyState === WebSocket.OPEN
      ? 'Waiting for another player to join.'
      : game.turn() === playerColor ? 'Your move.' : 'Your opponent is thinking.';
  } else {
    gameMessage.textContent = game.turn() === 'w' ? 'Your move.' : 'The engine is ready.';
  }
}

function updateOnlineStatus(message) {
  document.querySelector('#online-status').textContent = message;
}

function saveAuthSession(session) {
  authSession = {
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
  try {
    localStorage.setItem(authSessionStorageKey, JSON.stringify(authSession));
  } catch (error) {
    console.error('Could not save your online sign-in:', error);
    document.querySelector('#online-auth-status').textContent = 'Signed in for this tab, but browser storage is unavailable.';
  }
  updateAccountUI();
}

function clearAuthSession() {
  authSession = null;
  authUsername = '';
  onlineIdentityVerified = false;
  localStorage.removeItem(authSessionStorageKey);
  updateAccountUI();
}

function initializeAuthSession() {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');
  if (accessToken && fragment.get('refresh_token')) {
    saveAuthSession({
      access_token: accessToken,
      refresh_token: fragment.get('refresh_token'),
      expires_in: fragment.get('expires_in') || '3600',
      token_type: fragment.get('token_type') || 'bearer',
    });
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    document.querySelector('#online-auth-status').textContent = 'Signed in. You can now join or create a lobby.';
    return;
  }

  if (fragment.has('error_description')) {
    document.querySelector('#online-auth-status').textContent = fragment.get('error_description').replace(/\+/g, ' ');
    history.replaceState(null, '', `${location.pathname}${location.search}`);
  }
  try {
    const savedSession = JSON.parse(localStorage.getItem(authSessionStorageKey) || 'null');
    if (savedSession?.access_token && savedSession?.refresh_token) authSession = savedSession;
  } catch (error) {
    console.error('Could not read the saved online sign-in:', error);
    localStorage.removeItem(authSessionStorageKey);
  }
  updateAccountUI();
}

function updateAccountUI(message = '') {
  const isSignedIn = Boolean(authSession?.access_token);
  const usernameField = document.querySelector('#online-username-field');
  document.querySelector('#online-account-state').textContent = isSignedIn
    ? `Signed in · ${authSession.user?.email || 'Openboard account'}`
    : 'Sign in or create an account';
  document.querySelector('#online-username').disabled = authMode !== 'signup' || isSignedIn;
  usernameField.hidden = authMode !== 'signup' || isSignedIn;
  document.querySelector('#online-email').disabled = isSignedIn;
  document.querySelector('#online-account-password').disabled = isSignedIn;
  document.querySelector('#online-auth-submit').hidden = isSignedIn;
  document.querySelector('#online-auth-mode').hidden = isSignedIn;
  document.querySelector('#online-auth-signout').hidden = !isSignedIn;
  document.querySelector('#online-auth-submit').textContent = authMode === 'signup' ? 'Create account' : 'Sign in';
  document.querySelector('#online-auth-mode').textContent = authMode === 'signup'
    ? 'Already registered? Sign in'
    : 'Need an account? Create one';
  document.querySelector('#online-continue').hidden = !isSignedIn;
  document.querySelector('#online-signin-required').hidden = isSignedIn;
  document.querySelector('#online-play-controls').hidden = !isSignedIn;
  if (message) document.querySelector('#online-auth-status').textContent = message;
}

async function requestSupabaseAuth(path, body, accessToken = '') {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Online accounts are not configured yet. The site owner must finish the free account-service setup.');
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(body),
  });
  let result;
  try {
    result = await response.json();
  } catch (error) {
    throw new Error(`Account service returned an unreadable response (${response.status}).`);
  }
  if (!response.ok) {
    const detail = result.msg || result.message || result.error_description || result.error;
    if (typeof detail === 'string' && /username_taken|duplicate key/i.test(detail)) {
      throw new Error('That username is already taken. Choose a different one.');
    }
    if (typeof detail === 'string' && /email not confirmed/i.test(detail)) {
      throw new Error('Confirm your email from the message we sent, then sign in.');
    }
    throw new Error(typeof detail === 'string' ? detail : 'The account service rejected that request.');
  }
  return result;
}

async function checkUsernameAvailable(username) {
  const profileUrl = new URL(`${supabaseUrl}/rest/v1/profiles`);
  profileUrl.searchParams.set('username_key', `eq.${username.toLowerCase()}`);
  profileUrl.searchParams.set('select', 'id');
  const response = await fetch(profileUrl, {
    headers: { apikey: supabaseAnonKey },
  });
  if (!response.ok) throw new Error('Could not check username availability. Try again.');
  const profiles = await response.json();
  return Array.isArray(profiles) && profiles.length === 0;
}

async function getValidAuthSession() {
  if (!authSession?.refresh_token) return null;
  if (Number(authSession.expires_at) > Math.floor(Date.now() / 1000) + 60) return authSession;
  try {
    const refreshed = await requestSupabaseAuth('token?grant_type=refresh_token', {
      refresh_token: authSession.refresh_token,
    });
    saveAuthSession(refreshed);
    return authSession;
  } catch (error) {
    clearAuthSession();
    document.querySelector('#online-auth-status').textContent = 'Your sign-in expired. Sign in again to continue.';
    throw error;
  }
}

async function submitOnlineAuth() {
  const email = document.querySelector('#online-email').value.trim().toLowerCase();
  const emailInput = document.querySelector('#online-email');
  const password = document.querySelector('#online-account-password').value;
  const username = document.querySelector('#online-username').value.trim();
  const status = document.querySelector('#online-auth-status');
  const submit = document.querySelector('#online-auth-submit');
  if (!supabaseUrl || !supabaseAnonKey) {
    status.textContent = 'Online accounts are not configured yet. The owner needs to finish the free hosting setup.';
    return;
  }
  if (!emailInput.checkValidity() || !password) {
    status.textContent = 'Enter a valid email address and password.';
    return;
  }
  if (authMode === 'signup' && !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    status.textContent = 'Usernames must be 3–20 letters, numbers, or underscores.';
    return;
  }
  if (password.length < 8 || password.length > 72) {
    status.textContent = 'Passwords must be between 8 and 72 characters.';
    return;
  }

  submit.disabled = true;
  status.textContent = authMode === 'signup' ? 'Creating your account…' : 'Signing in…';
  try {
    if (authMode === 'signup') {
      if (!await checkUsernameAvailable(username)) {
        throw new Error('That username is already taken. Choose a different one.');
      }
      const session = await requestSupabaseAuth('signup', {
        email,
        password,
        data: { username },
      });
      if (!session.access_token || !session.refresh_token) {
        document.querySelector('#online-account-password').value = '';
        authMode = 'signin';
        updateAccountUI(`Confirmation email sent to ${email}. Open its link to verify your account, then sign in here. You do not need to create another account.`);
        return;
      }
      saveAuthSession(session);
      document.querySelector('#online-account-password').value = '';
      status.textContent = `Account created and signed in as @${username}.`;
      selectOnlineSection('play');
    } else {
      const session = await requestSupabaseAuth('token?grant_type=password', { email, password });
      if (!session.access_token || !session.refresh_token) {
        throw new Error('Sign-in did not return a session. Check the email and password, then try again.');
      }
      saveAuthSession(session);
      document.querySelector('#online-account-password').value = '';
      status.textContent = 'Signed in. You can now join or create a lobby.';
      selectOnlineSection('play');
    }
  } catch (error) {
    console.error('Online account request failed:', error);
    status.textContent = error.message || 'The account request failed. Please try again.';
  } finally {
    submit.disabled = false;
  }
}

async function signOutOnlineAccount() {
  try {
    const session = await getValidAuthSession();
    if (session?.access_token) await requestSupabaseAuth('logout', {}, session.access_token);
    clearAuthSession();
    document.querySelector('#online-auth-status').textContent = 'You have signed out.';
  } catch (error) {
    console.error('Could not sign out from the account service:', error);
    clearAuthSession();
    document.querySelector('#online-auth-status').textContent = 'Signed out on this device. The account service could not revoke the remote session.';
  }
}

function renderPublicRooms() {
  const list = document.querySelector('#public-room-list');
  list.replaceChildren();
  const availableRooms = publicRooms.filter((room) => room.code !== onlineRoomCode);
  if (!availableRooms.length) {
    const empty = document.createElement('p');
    empty.className = 'public-room-empty';
    empty.textContent = publicRooms.some((room) => room.code === onlineRoomCode)
      ? 'Your public game is listed for other players to join or spectate.'
      : 'No open games right now. Create one and invite someone to join.';
    list.append(empty);
    return;
  }

  for (const room of availableRooms) {
    const card = document.createElement('div');
    card.className = 'public-room-card';
    card.setAttribute('role', 'listitem');
    const copy = document.createElement('div');
    copy.className = 'public-room-copy';
    const name = document.createElement('strong');
    name.textContent = room.name;
    const details = document.createElement('span');
    details.textContent = room.inProgress
      ? `Live game · ${room.spectators || 0} watching · ${room.code}`
      : `Waiting for a player · ${room.spectators || 0} watching · ${room.code}`;
    const connectToRoom = (action) => {
      const password = room.locked ? window.prompt(`Password for “${room.name}”`) : '';
      if (room.locked && password === null) return;
      connectToOnlineRoom(action, room.code, password || '');
    };
    copy.append(name, details);
    if (room.host) {
      details.textContent = room.inProgress
        ? `@${room.host} vs @${room.opponent || '…'} · ${room.spectators || 0} watching · ${room.locked ? 'Password required · ' : ''}${room.code}`
        : `Hosted by @${room.host} · ${room.spectators || 0} watching · ${room.locked ? 'Password required · ' : ''}${room.code}`;
    }
    if (!room.inProgress) {
      const join = document.createElement('button');
      join.className = 'primary-button';
      join.type = 'button';
      join.textContent = 'Join';
      join.addEventListener('click', () => connectToRoom('join-public'));
      card.append(copy, join);
    } else {
      card.append(copy);
    }
    const watch = document.createElement('button');
    watch.className = room.inProgress ? 'primary-button' : 'secondary-button';
    watch.type = 'button';
    watch.textContent = 'Watch';
    watch.addEventListener('click', () => connectToRoom('watch'));
    card.append(watch);
    list.append(card);
  }
}

function requestPublicRooms() {
  if (!authSession?.access_token) {
    document.querySelector('#public-room-list').replaceChildren();
    const empty = document.createElement('p');
    empty.className = 'public-room-empty';
    empty.textContent = 'Create an account and sign in to browse public lobbies.';
    document.querySelector('#public-room-list').append(empty);
    updateOnlineStatus('Sign in to your Openboard account to browse public lobbies.');
    return;
  }
  if (onlineSocket?.readyState === WebSocket.OPEN) {
    updateOnlineStatus('Refreshing public games…');
    onlineSocket.send(JSON.stringify({ type: 'list-public-rooms' }));
    return;
  }
  if (onlineSocket?.readyState === WebSocket.CONNECTING) return;
  publicRooms = [];
  renderPublicRooms();
  document.querySelector('#public-room-list .public-room-empty').textContent = 'Connecting to the room server…';
  connectToOnlineRoom('browse');
}

function selectOnlineTab(tab) {
  const friendsSelected = tab === 'friends';
  document.querySelector('#online-friends-tab').setAttribute('aria-selected', String(friendsSelected));
  document.querySelector('#online-public-tab').setAttribute('aria-selected', String(!friendsSelected));
  document.querySelector('#online-friends-tab').classList.toggle('active', friendsSelected);
  document.querySelector('#online-public-tab').classList.toggle('active', !friendsSelected);
  document.querySelector('#online-friends-panel').hidden = !friendsSelected;
  document.querySelector('#online-public-panel').hidden = friendsSelected;
  if (!friendsSelected) requestPublicRooms();
}

function selectOnlineSection(section) {
  const accountSelected = section === 'account';
  document.querySelector('#online-account-tab').setAttribute('aria-selected', String(accountSelected));
  document.querySelector('#online-play-tab').setAttribute('aria-selected', String(!accountSelected));
  document.querySelector('#online-account-tab').classList.toggle('active', accountSelected);
  document.querySelector('#online-play-tab').classList.toggle('active', !accountSelected);
  document.querySelector('#online-account-panel').hidden = !accountSelected;
  document.querySelector('#online-play-panel').hidden = accountSelected;
  if (!accountSelected && authSession?.access_token) requestPublicRoomsIfSelected();
}

function requestPublicRoomsIfSelected() {
  if (!document.querySelector('#online-public-panel').hidden) requestPublicRooms();
}

function isCustomVariantActive() {
  return customRules.boardSize !== 8 || customRules.noDraws || customRules.customPieces.length > 0
    || Object.entries(customRules.pieceMovements).some(([piece, sides]) => ['w', 'b'].some((color) => {
      const movements = Array.isArray(sides) ? sides : sides?.[color] ?? [piece];
      return movements.length !== 1 || movements[0] !== piece;
    }));
}

function configureOnlineControls(active, spectating = false) {
  document.querySelector('#play-color').disabled = active;
  document.querySelector('#time-control').disabled = active;
  document.querySelector('#difficulty').disabled = active;
  document.querySelector('#new-game').disabled = active;
  document.querySelector('#offer-draw').disabled = active || customRules.noDraws;
  document.querySelector('#resign').disabled = active && spectating;
  document.querySelector('#flip').disabled = active;
  document.querySelector('#undo').disabled = active;
  document.querySelector('#redo').disabled = active;
  document.querySelector('#custom-rules-open').disabled = active;
  document.querySelector('#opponent-card').hidden = active;
  document.querySelector('#opponent-name').textContent = active
    ? spectating ? 'Spectating' : 'Friend'
    : bots[difficultySelect.value].name;
  document.querySelector('.panel-header .live-indicator').lastChild.textContent = active ? ' ONLINE' : ' LOCAL';
}

function renderOnlineChat(channel) {
  const list = document.querySelector(`#online-${channel === 'players' ? 'player' : 'spectator'}-chat-messages`);
  const messages = onlineChatHistory[channel];
  list.replaceChildren();
  if (!messages.length) {
    const empty = document.createElement('li');
    empty.className = 'online-chat-empty';
    empty.textContent = 'No messages yet.';
    list.append(empty);
    return;
  }
  for (const message of messages) {
    const item = document.createElement('li');
    item.className = 'online-chat-message';
    const name = document.createElement('strong');
    name.textContent = `@${message.name}`;
    const text = document.createElement('span');
    text.textContent = message.text;
    item.append(name, text);
    list.append(item);
  }
  list.scrollTop = list.scrollHeight;
}

function setOnlineChatHistory(histories) {
  onlineChatHistory = {
    players: Array.isArray(histories?.players)
      ? histories.players.filter((message) => typeof message?.name === 'string' && typeof message?.text === 'string').slice(-100)
      : [],
    spectators: Array.isArray(histories?.spectators)
      ? histories.spectators.filter((message) => typeof message?.name === 'string' && typeof message?.text === 'string').slice(-100)
      : [],
  };
  renderOnlineChat('players');
  renderOnlineChat('spectators');
}

function configureOnlineChat(active, spectating = false) {
  document.querySelector('#online-chats').hidden = !active;
  document.querySelector('#online-player-chat-form').hidden = spectating;
  document.querySelector('#online-spectator-chat-form').hidden = !spectating;
  if (!active) setOnlineChatHistory(null);
  updateOnlineChatAvailability();
}

function updateOnlineChatAvailability() {
  const enabled = onlineMode && Boolean(onlineRoomCode)
    && onlineSocket?.readyState === WebSocket.OPEN;
  for (const selector of ['#online-player-chat-input', '#online-spectator-chat-input']) {
    document.querySelector(selector).disabled = !enabled;
  }
  for (const selector of ['#online-player-chat-send', '#online-spectator-chat-send']) {
    document.querySelector(selector).disabled = !enabled;
  }
}

function setOnlineGameState(active, spectating = false) {
  if (active && isCustomVariantActive()) {
    showMessage('Online games use standard chess', 'Reset your custom rules before joining a friend online. This room server currently handles orthodox chess only.');
    return false;
  }
  if (active && onlinePreviousClock === null) {
    onlinePreviousClock = timeControlSelect.value;
    onlinePreviousColor = playerColor;
  }
  onlineMode = active;
  onlineSpectating = active && spectating;
  configureOnlineChat(active, onlineSpectating);
  pendingPremove = null;
  selectedSquare = null;
  legalTargets = [];
  onlineReady = false;
  onlineIdentityVerified = false;
  onlinePendingRequest = null;
  if (active) {
    timeControlSelect.value = '0';
    configureOnlineControls(true, onlineSpectating);
  } else {
    if (onlinePreviousClock !== null) timeControlSelect.value = onlinePreviousClock;
    if (onlinePreviousColor !== null) {
      playerColor = onlinePreviousColor;
      playColorSelect.value = playerColor;
      flipped = playerColor === 'b';
    }
    onlinePreviousClock = null;
    onlinePreviousColor = null;
    configureOnlineControls(false);
    difficultySelect.dispatchEvent(new Event('change'));
  }
  updateGameState();
  renderBoard();
  return true;
}

function applyOnlineMove(message) {
  if (!onlineReady || (!onlineSpectating && message.color === playerColor)) return;
  if (message.color !== game.turn()) {
    updateOnlineStatus('The server sent a move out of turn. Rejoin this room to resynchronize.');
    return;
  }
  const quality = analyzeMoveQuality({ from: message.from, to: message.to, promotion: message.promotion ?? 'q' });
  let appliedMove;
  try {
    appliedMove = makeGameMove({
      from: message.from,
      to: message.to,
      promotion: message.promotion ?? 'q',
    });
  } catch (error) {
    console.error('Could not apply your opponent’s move:', error);
    updateOnlineStatus('The received move did not match this board. Disconnect and create a new room.');
    return;
  }
  if (message.fen && game.fen() !== message.fen) {
    console.error('Online board state did not match the server position.');
    updateOnlineStatus('Board state mismatch. Disconnect and create a new room.');
    return;
  }
  recordMoveInsight(appliedMove, quality);
  registerClockMove();
  playMoveSound(appliedMove, 'opponent');
  selectedSquare = null;
  legalTargets = [];
  updateGameState();
  renderBoard();
  updateOnlineStatus(onlineSpectating
    ? `${message.san} played by ${message.color === 'w' ? 'White' : 'Black'}.`
    : `${message.san} played by your opponent.`);
  if (!onlineSpectating) playPendingPremove();
}

function restoreOnlinePosition(message) {
  startNewGame();
  try {
    if (typeof message.pgn === 'string' && message.pgn.trim()) {
      if (!game.load_pgn(message.pgn)) throw new Error('The saved online game could not be loaded.');
    } else if (typeof message.fen === 'string' && !game.load(message.fen)) {
      throw new Error('The saved online position could not be loaded.');
    }
    configureStartingPosition();
    updateGameState();
    renderBoard();
    return true;
  } catch (error) {
    console.error('Could not restore the online game position:', error);
    onlineReady = false;
    updateOnlineStatus('Could not restore this room position. Start a new room.');
    renderBoard();
    return false;
  }
}

function handleOnlineMessage(socket, message) {
  if (socket !== onlineSocket || !message || typeof message.type !== 'string') return;
  if (message.type === 'error') {
    if (onlineMode) gameMessage.textContent = message.message || 'The room server rejected that action.';
    if (!onlineIdentityVerified) {
      onlinePendingRequest = null;
      updateOnlineStatus(message.message || 'Sign in to your Openboard account before using online play.');
      onlineSocket = null;
      socket.close();
      return;
    }
    if (/sign-in expired/i.test(message.message || '')) clearAuthSession();
    updateOnlineStatus(message.message || 'The room server rejected that action.');
    return;
  }
  if (message.type === 'authenticated') {
    onlineIdentityVerified = true;
    onlinePlayerName = message.username;
    document.querySelector('#online-account-state').textContent = `Signed in as @${onlinePlayerName}`;
    document.querySelector('#online-auth-status').textContent = 'Account ready for online play.';
    if (onlinePendingRequest) {
      socket.send(JSON.stringify(onlinePendingRequest));
      onlinePendingRequest = null;
    }
    return;
  }
  if (message.type === 'public-rooms') {
    publicRooms = Array.isArray(message.rooms)
      ? message.rooms.filter((room) => typeof room?.code === 'string' && typeof room?.name === 'string')
        .map((room) => ({ ...room, locked: Boolean(room.locked), inProgress: Boolean(room.inProgress) }))
      : [];
    renderPublicRooms();
    const count = publicRooms.filter((room) => room.code !== onlineRoomCode).length;
    updateOnlineStatus(`Found ${count} other open ${count === 1 ? 'game' : 'games'}.`);
    return;
  }
  if (message.type === 'room-created') {
    onlineRoomCode = message.code;
    playerColor = message.color;
    playColorSelect.value = playerColor;
    flipped = false;
    document.querySelector('#online-invite-code').textContent = onlineRoomCode;
    document.querySelector('#online-invite').hidden = false;
    setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
    updateOnlineChatAvailability();
    if (message.isPublic) {
      publicRooms = [{
        code: onlineRoomCode,
        name: message.lobbyName,
        host: onlinePlayerName,
        locked: Boolean(message.locked),
        inProgress: false,
        spectators: 0,
      }, ...publicRooms.filter((room) => room.code !== onlineRoomCode)];
    }
    startNewGame();
    updateOnlineStatus(message.isPublic
      ? 'Public lobby created. It is listed for signed-in players.'
      : 'Private lobby created. Share the invite code with your friend.');
    renderPublicRooms();
    renderBoard();
    return;
  }
  if (message.type === 'game-start') {
    onlineRoomCode = message.code;
    onlineReady = true;
    playerColor = message.color === 'w' ? 'w' : 'b';
    if (onlineSpectating) {
      setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
      restoreOnlinePosition(message);
      updateOnlineStatus(`Spectating ${message.players?.w || 'White'} vs ${message.players?.b || 'Black'}.`);
      renderBoard();
      onlineDialog.close();
      return;
    }
    if (message.players) {
      const otherName = message.players[playerColor === 'w' ? 'b' : 'w'];
      document.querySelector('#opponent-name').textContent = otherName;
      document.querySelector('#bot-profile-name').textContent = otherName;
    }
    setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
    updateOnlineChatAvailability();
    playColorSelect.value = playerColor;
    flipped = playerColor === 'b';
    if (!restoreOnlinePosition(message)) return;
    updateOnlineStatus(`Connected to room ${onlineRoomCode}. You are ${playerColor === 'w' ? 'White' : 'Black'}.`);
    renderBoard();
    onlineDialog.close();
    return;
  }
  if (message.type === 'spectator-start') {
    onlineRoomCode = message.code;
    onlineReady = true;
    playerColor = 'w';
    playColorSelect.value = playerColor;
    flipped = false;
    if (message.players) {
      document.querySelector('#opponent-name').textContent = 'Spectating';
      document.querySelector('#bot-profile-name').textContent = `${message.players.w || 'White'} vs ${message.players.b || 'Black'}`;
    }
    setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
    updateOnlineChatAvailability();
    if (!restoreOnlinePosition(message)) return;
    const watching = `${message.spectators || 1} ${message.spectators === 1 ? 'spectator' : 'spectators'}`;
    updateOnlineStatus(message.waiting
      ? `Watching room ${onlineRoomCode}. Waiting for the game to start · ${watching}.`
      : `Spectating ${message.players?.w || 'White'} vs ${message.players?.b || 'Black'} · ${watching}.`);
    renderBoard();
    onlineDialog.close();
    return;
  }
  if (message.type === 'spectator-count') {
    const watching = `${message.count} ${message.count === 1 ? 'spectator' : 'spectators'}`;
    updateOnlineStatus(onlineSpectating
      ? `Spectating · ${watching}.`
      : `Online game · ${watching}.`);
    return;
  }
  if (message.type === 'chat-message') {
    if (message.channel !== 'players' && message.channel !== 'spectators') return;
    onlineChatHistory[message.channel].push(message);
    onlineChatHistory[message.channel] = onlineChatHistory[message.channel].slice(-100);
    renderOnlineChat(message.channel);
    return;
  }
  if (message.type === 'move') {
    applyOnlineMove(message);
    return;
  }
  if (message.type === 'opponent-left') {
    if (onlineSpectating) {
      updateOnlineStatus('A player disconnected. The room remains open for a reconnect.');
      gameMessage.textContent = 'A player disconnected.';
      renderBoard();
      return;
    }
    onlineReady = false;
    pendingPremove = null;
    updateOnlineStatus('Your opponent disconnected. The room remains open for a reconnect.');
    gameMessage.textContent = 'Your opponent disconnected.';
    renderBoard();
    return;
  }
  if (message.type === 'resigned') {
    if (onlineSpectating) {
      gameResult = true;
      gameMessage.textContent = `${message.color === 'w' ? 'White' : 'Black'} resigned.`;
      updateOnlineStatus(`${message.color === 'w' ? 'White' : 'Black'} resigned.`);
      renderBoard();
      return;
    }
    if (message.color !== playerColor) {
      pendingPremove = null;
      markGameResult('victory');
      gameMessage.textContent = 'Your opponent resigned. You win!';
      updateOnlineStatus('Your opponent resigned.');
      renderBoard();
    }
    return;
  }
  if (message.type === 'room-ended') {
    onlineReady = false;
    updateOnlineChatAvailability();
    updateOnlineStatus('The game ended because both players disconnected.');
    gameMessage.textContent = 'The game is no longer active.';
    renderBoard();
  }
}

async function connectToOnlineRoom(action, roomCode = null, roomPassword = '') {
  if (activeBoardSize !== 8 && action !== 'browse') {
    updateOnlineStatus('Online rooms currently use the standard 8×8 board. Select 8×8 in Custom rules before creating or joining a room.');
    return;
  }
  if (action === 'browse' && onlineSocket?.readyState === WebSocket.OPEN) {
    requestPublicRooms();
    return;
  }
  if (onlineSocket) {
    onlineSocket.close();
    onlineSocket = null;
  }
  let endpoint;
  try {
    const session = await getValidAuthSession();
    if (!session?.access_token) {
      updateOnlineStatus('Create an account and sign in before using online play.');
      document.querySelector('#online-email').focus();
      return;
    }
    if (!onlineServerUrl) throw new Error('The owner has not connected the online server yet.');
    endpoint = new URL(onlineServerUrl);
    if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new Error('Use a ws:// or wss:// server URL.');
    if (!endpoint.pathname || endpoint.pathname === '/') endpoint.pathname = '/ws';
  } catch (error) {
    updateOnlineStatus(error.message || 'Enter a valid online room server URL.');
    return;
  }
  let pendingRequest;
  if (action === 'create' || action === 'create-public') {
    const lobbyName = document.querySelector('#online-lobby-name').value.trim();
    if (!lobbyName) {
      updateOnlineStatus('Enter a lobby name before creating it.');
      document.querySelector('#online-lobby-name').focus();
      return;
    }
    if (document.querySelector('#online-password-enabled').checked
      && !document.querySelector('#online-lobby-password').value) {
      updateOnlineStatus('Enter a lobby password or turn off password protection.');
      document.querySelector('#online-lobby-password').focus();
      return;
    }
    pendingRequest = {
      type: action === 'create-public' ? 'create-public-room' : 'create-room',
      lobbyName,
      password: document.querySelector('#online-password-enabled').checked
        ? document.querySelector('#online-lobby-password').value
        : '',
    };
  } else if (action === 'join' || action === 'join-public' || action === 'watch') {
    pendingRequest = {
      type: action === 'join-public' ? 'join-public-room' : action === 'watch' ? 'spectate-room' : 'join-room',
      code: roomCode ?? document.querySelector('#online-room-code').value.trim(),
      password: roomPassword || (
        document.querySelector('#online-password-enabled').checked
          ? document.querySelector('#online-lobby-password').value
          : ''
      ),
    };
  } else {
    pendingRequest = { type: 'list-public-rooms' };
  }
  if (action !== 'browse' && !setOnlineGameState(true, action === 'watch')) return;
  onlinePendingRequest = pendingRequest;
  updateOnlineStatus(action === 'browse' ? 'Connecting to the room server…' : 'Connecting to room server…');
  const socket = new WebSocket(endpoint);
  onlineSocket = socket;
  onlineIdentityVerified = false;
  let connectionFailed = false;
  socket.addEventListener('open', () => {
    if (socket !== onlineSocket) return;
    socket.send(JSON.stringify({ type: 'authenticate', accessToken: authSession.access_token }));
  });
  socket.addEventListener('message', (event) => {
    try {
      handleOnlineMessage(socket, JSON.parse(event.data));
    } catch (error) {
      console.error('Could not process online room message:', error);
      updateOnlineStatus('The room server sent an unreadable response.');
    }
  });
  socket.addEventListener('error', () => {
    connectionFailed = true;
    updateOnlineStatus('Could not reach the online room server. It may be waking from its free hosting sleep period; try again in a minute.');
  });
  socket.addEventListener('close', () => {
    if (socket !== onlineSocket) return;
    onlineReady = false;
    updateOnlineChatAvailability();
    pendingPremove = null;
    selectedSquare = null;
    legalTargets = [];
    if (!connectionFailed) updateOnlineStatus('The room server closed the connection. Check that the server is running and that the URL is correct.');
    renderBoard();
  });
}

function disconnectOnlineGame() {
  if (onlineDialog.open) onlineDialog.close();
  const socket = onlineSocket;
  onlineSocket = null;
  onlineRoomCode = null;
  onlineReady = false;
  onlineIdentityVerified = false;
  onlinePendingRequest = null;
  pendingPremove = null;
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  setOnlineGameState(false);
  document.querySelector('#online-invite').hidden = true;
  updateOnlineStatus('Playing offline. No online room connected.');
  startNewGame();
}

function markGameResult(soundEvent = 'draw') {
  if (gameResult) return;
  gameResult = true;
  stopActiveSound();
  playSound(soundEvent);
}

function startNewGame() {
  const requestedSize = Number(customRules.boardSize) || 8;
  if (requestedSize !== activeBoardSize) {
    game = requestedSize === 8 ? new Chess() : new window.OpenboardLargeChess(requestedSize);
    activeBoardSize = requestedSize;
  }
  if (onlineMode && !onlineReady && onlineSocket) {
    game.reset();
    configureStartingPosition();
    gameResult = false;
    moveInsights = [];
    suggestedMove = null;
    pendingPremove = null;
    selectedSquare = null;
    legalTargets = [];
    aiThinking = false;
    redoMoves = [];
    updateGameState();
    renderBoard();
    return;
  }
  stopActiveSound();
  gameToken += 1;
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  game.reset();
  configureStartingPosition();
  gameResult = false;
  analysisMode = false;
  puzzleMode = false;
  moveInsights = [];
  suggestedMove = null;
  pendingPremove = null;
  selectedSquare = null;
  legalTargets = [];
  aiThinking = false;
  redoMoves = [];
  const startingMs = Number(timeControlSelect.value) * 1000;
  clock = { w: startingMs, b: startingMs };
  clockWarningPlayed = { w: false, b: false };
  lastClockTick = Date.now();
  updateGameState();
  renderBoard();
  if (clockInterval) window.clearInterval(clockInterval);
  clockInterval = window.setInterval(tickClock, 250);
  playSound('game-start');
  if (playerColor === 'b' && !onlineMode) beginBotTurn();
}

function updateColorLabels() {
  document.querySelector('#human-color-tag').textContent = playerColor === 'w' ? 'WHITE' : 'BLACK';
  document.querySelector('#opponent-color-tag').textContent = playerColor === 'w' ? 'BLACK' : 'WHITE';
  document.querySelector('#human-color-label').textContent = `${playerColor === 'w' ? 'White' : 'Black'} · ${game.turn() === playerColor ? 'Your move' : aiThinking ? 'Opponent thinking' : 'Game in progress'}`;
}

function updateClockDisplay() {
  const enabled = Number(timeControlSelect.value) > 0;
  const showClock = (selector, color) => {
    const element = document.querySelector(selector);
    element.hidden = !enabled;
    const remaining = Math.max(0, clock[color]);
    element.textContent = `${Math.floor(remaining / 60000).toString().padStart(2, '0')}:${Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0')}`;
    element.classList.toggle('clock-low', enabled && remaining <= 10000);
  };
  showClock('#human-clock', playerColor);
  showClock('#opponent-clock', playerColor === 'w' ? 'b' : 'w');
}

function tickClock() {
  if (!Number(timeControlSelect.value) || !game.history().length || isGameOver() || gameResult || analysisMode || puzzleMode) {
    lastClockTick = Date.now();
    return;
  }
  const now = Date.now();
  const activeColor = game.turn();
  clock[activeColor] = Math.max(0, clock[activeColor] - (now - lastClockTick));
  lastClockTick = now;
  updateClockDisplay();
  if (clock[activeColor] <= 10000 && !clockWarningPlayed[activeColor]) {
    clockWarningPlayed[activeColor] = true;
    playSound('clock-warning');
  }
  if (clock[activeColor] === 0) {
      markGameResult(activeColor === playerColor ? 'defeat' : 'victory');
    gameMessage.textContent = activeColor === playerColor ? 'Time expired. You lose on time.' : 'The opponent ran out of time. You win!';
    renderBoard();
  }
}

function registerClockMove() {
  lastClockTick = Date.now();
}

function playSound(id, preview = false) {
  const sound = soundManifest[id];
  if (!soundToggle.checked || audioSettings.muted || (!preview && !audioSettings.events[id])
    || !sound?.available || !sound.source || !audioUnlocked) return;
  try {
    stopActiveSound();
    const audio = new Audio(sound.source);
    audio.preload = 'auto';
    audio.volume = audioSettings.masterVolume * audioSettings.effectsVolume;
    activeSound = audio;
    audio.addEventListener('ended', () => {
      if (activeSound === audio) activeSound = null;
    }, { once: true });
    audio.addEventListener('error', () => {
      if (activeSound === audio) activeSound = null;
      console.error(`The browser could not decode ${sound.source}.`);
    }, { once: true });
    const playback = audio.play();
    if (playback?.catch) playback.catch((error) => {
      if (error.name === 'NotAllowedError') {
        audioUnlocked = false;
        document.querySelector('#sound-status').textContent = 'Interact with the page to enable audio playback.';
      } else {
        console.error(`Could not play ${id} sound:`, error);
      }
    });
  } catch (error) {
    console.error(`Could not play ${id} sound:`, error);
  }
}

function stopActiveSound() {
  if (!activeSound) return;
  activeSound.pause();
  activeSound.currentTime = 0;
  activeSound = null;
}

function playMoveSound(move, side) {
  const sound = isCheckmate() ? 'checkmate'
    : isDraw() ? 'draw'
      : isCheck() ? 'check'
        : move.flags.includes('p') || move.customPromotion ? 'promotion'
          : move.flags.includes('k') || move.flags.includes('q') ? 'castle'
            : move.captured ? 'capture'
              : side === 'opponent' ? 'move-opponent' : 'move-self';
  playSound(sound);
}

function beginBotTurn() {
  if (isGameOver() || gameResult) return;
  aiThinking = true;
  updateGameState();
  renderBoard();
  const token = gameToken;
  window.setTimeout(() => {
    if (token === gameToken) requestBotMove(bots[difficultySelect.value], token);
  }, 300);
}

function renderBotDirectory() {
  const search = document.querySelector('#bot-search').value.trim().toLowerCase();
  const category = document.querySelector('#bot-category').value;
  botDirectoryGrid.replaceChildren();
  Object.entries(bots)
    .filter(([, bot]) => (category === 'all' || bot.difficulty === category)
      && `${bot.name} ${bot.description} ${bot.difficulty}`.toLowerCase().includes(search))
    .forEach(([id, bot]) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `directory-bot${id === difficultySelect.value ? ' active' : ''}`;
      const identity = document.createElement('span');
      identity.className = 'directory-bot-avatar';
      identity.style.setProperty('--bot-color', botAvatarColors[Object.keys(bots).indexOf(id) % botAvatarColors.length]);
      identity.textContent = bot.name[0];
      const copy = document.createElement('span');
      copy.className = 'directory-bot-copy';
      const name = document.createElement('strong');
      name.textContent = bot.name;
      const tagline = document.createElement('small');
      tagline.textContent = `${bot.difficulty} · ${botStrengthLabel(bot)}`;
      const description = document.createElement('span');
      description.className = 'directory-bot-description';
      description.textContent = bot.description;
      copy.append(name, tagline, description);
      card.append(identity, copy);
      card.addEventListener('click', () => {
        difficultySelect.value = id;
        difficultySelect.dispatchEvent(new Event('change'));
        botDirectory.close();
      });
      botDirectoryGrid.append(card);
    });
  if (!botDirectoryGrid.childElementCount) {
    const empty = document.createElement('p');
    empty.className = 'directory-empty';
    empty.textContent = 'No opponents match that search.';
    botDirectoryGrid.append(empty);
  }
}

document.querySelector('#browse-bots').addEventListener('click', () => {
  renderBotDirectory();
  botDirectory.showModal();
});
document.querySelector('#close-bot-directory').addEventListener('click', () => botDirectory.close());
document.querySelector('#bot-search').addEventListener('input', renderBotDirectory);
document.querySelector('#bot-category').addEventListener('change', renderBotDirectory);
document.querySelector('#studio-game-import').addEventListener('click', () => {
  const pieceId = document.querySelector('#studio-game-piece').value;
  const piece = getSavedStudioPieces().find((candidate) => candidate.id === pieceId);
  if (!piece) {
    showMessage('Choose a saved piece', 'Save a piece in the Custom Piece Studio and select it here first.');
    return;
  }
  const studio = studioMovementPatterns(piece);
  if (!studio) {
    showMessage('This piece cannot be used in a game', 'Royal pieces and invalid movement definitions cannot replace a non-king piece. Edit the definition in Custom Piece Studio and save it again.');
    return;
  }
  editingCustomPieces = readCustomPieceRows();
  const choice = nextCustomPieceReplacement(editingCustomPieces, studio.promotion ? 'p' : null);
  if (!choice) {
    showMessage('Custom piece limit', 'You can create one custom replacement for each non-king piece type per side.');
    return;
  }
  editingCustomPieces.push({
    id: `studio-piece-${piece.id}-${Date.now()}`,
    name: piece.name.trim().slice(0, 18) || 'Custom piece',
    symbol: [...piece.symbol.trim()][0] || '✦',
    movements: [choice.replaces],
    replaces: choice.replaces,
    color: choice.color,
    studio,
  });
  renderCustomPieceEditor();
});
document.querySelector('#custom-rules-open-studio').addEventListener('click', () => {
  customRulesDialog.close();
  document.querySelector('#piece-studio-open').click();
});

document.querySelector('#new-game').addEventListener('click', startNewGame);
document.querySelector('#undo').addEventListener('click', () => {
  if (aiThinking || !game.history().length) return;
  const botMove = undoGameMove();
  if (botMove) redoMoves.push(botMove);
  const humanMove = undoGameMove();
  if (humanMove) redoMoves.push(humanMove);
  moveInsights.length = game.history().length;
  gameResult = false;
  suggestedMove = null;
  selectedSquare = null;
  legalTargets = [];
  updateGameState();
  renderBoard();
});
document.querySelector('#redo').addEventListener('click', () => {
  if (aiThinking || gameResult || redoMoves.length === 0) return;
  const humanMove = redoMoves.pop();
  if (humanMove) {
    const quality = analyzeMoveQuality(humanMove);
    const appliedMove = makeGameMove({ from: humanMove.from, to: humanMove.to, promotion: humanMove.promotion });
    recordMoveInsight(appliedMove, quality);
  }
  const botMove = redoMoves.pop();
  if (botMove) {
    const quality = analyzeMoveQuality(botMove);
    const appliedMove = makeGameMove({ from: botMove.from, to: botMove.to, promotion: botMove.promotion });
    recordMoveInsight(appliedMove, quality);
  }
  suggestedMove = null;
  updateGameState();
  renderBoard();
});
document.querySelector('#flip').addEventListener('click', () => {
  flipped = !flipped;
  renderBoard();
});
difficultySelect.addEventListener('change', () => {
  const bot = bots[difficultySelect.value];
  document.querySelector('#opponent-name').textContent = bot.name;
  document.querySelector('#opponent-description').textContent = bot.description;
  document.querySelector('#opponent-strength').textContent = botStrengthLabel(bot);
  document.querySelector('#bot-profile-name').textContent = bot.name;
  document.querySelector('#bot-profile-description').textContent = bot.description;
  document.querySelector('#bot-profile-rating').textContent = botStrengthLabel(bot);
  document.querySelector('#bot-difficulty').textContent = bot.difficulty;
  const avatar = document.querySelector('#bot-avatar');
  avatar.textContent = bot.name.slice(0, 1);
  avatar.style.setProperty('--bot-color', botAvatarColors[Object.keys(bots).indexOf(difficultySelect.value) % botAvatarColors.length]);
  if (botDirectory.open) renderBotDirectory();
});

function savePreferences() {
  try {
    localStorage.setItem('openboard-preferences', JSON.stringify({
      bot: difficultySelect.value,
      color: playerColor,
      clock: timeControlSelect.value,
      theme: boardThemeSelect.value,
      interfaceTheme: interfaceThemeSelect.value,
      sound: soundToggle.checked,
      audioSettings,
      customRules,
    }));
  } catch (error) {
    console.error('Could not save preferences:', error);
  }
}

function renderSoundSettings() {
  const eventList = document.querySelector('#sound-event-list');
  eventList.replaceChildren();
  for (const [id, sound] of Object.entries(soundManifest)) {
    const row = document.createElement('div');
    row.className = `sound-event-row${sound.available ? '' : ' unavailable'}`;
    const label = document.createElement('label');
    label.className = 'sound-event-label';
    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.checked = sound.available && audioSettings.events[id] !== false;
    toggle.disabled = !sound.available;
    toggle.dataset.soundEvent = id;
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = sound.label;
    const note = document.createElement('small');
    note.textContent = sound.available ? sound.source.split('/').at(-1) : sound.note;
    copy.append(title, note);
    label.append(toggle, copy);
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'secondary-button sound-preview-button';
    preview.textContent = 'Preview';
    preview.disabled = !sound.available;
    preview.dataset.soundPreview = id;
    preview.setAttribute('aria-label', `Preview ${sound.label} sound`);
    row.append(label, preview);
    eventList.append(row);
  }
  document.querySelector('#sound-mute').checked = audioSettings.muted;
  document.querySelector('#master-volume').value = String(Math.round(audioSettings.masterVolume * 100));
  document.querySelector('#effects-volume').value = String(Math.round(audioSettings.effectsVolume * 100));
  document.querySelector('#master-volume-output').value = `${Math.round(audioSettings.masterVolume * 100)}%`;
  document.querySelector('#effects-volume-output').value = `${Math.round(audioSettings.effectsVolume * 100)}%`;
}

difficultySelect.addEventListener('change', savePreferences);
playColorSelect.addEventListener('change', () => {
  playerColor = playColorSelect.value;
  flipped = playerColor === 'b';
  savePreferences();
  startNewGame();
});
timeControlSelect.addEventListener('change', () => {
  savePreferences();
  startNewGame();
});
boardThemeSelect.addEventListener('change', () => {
  document.body.dataset.boardTheme = boardThemeSelect.value;
  savePreferences();
});
interfaceThemeSelect.addEventListener('change', () => {
  document.body.dataset.interfaceTheme = interfaceThemeSelect.value;
  savePreferences();
});
soundToggle.addEventListener('change', () => {
  if (!soundToggle.checked) stopActiveSound();
  savePreferences();
});
document.querySelector('#sound-settings-open').addEventListener('click', () => {
  renderSoundSettings();
  soundSettingsDialog.showModal();
});
document.querySelector('#close-sound-settings').addEventListener('click', () => soundSettingsDialog.close());
document.querySelector('#sound-settings-done').addEventListener('click', () => soundSettingsDialog.close());
document.querySelector('#sound-mute').addEventListener('change', (event) => {
  audioSettings.muted = event.target.checked;
  if (audioSettings.muted) stopActiveSound();
  savePreferences();
});
document.querySelector('#master-volume').addEventListener('input', (event) => {
  audioSettings.masterVolume = Number(event.target.value) / 100;
  document.querySelector('#master-volume-output').value = `${event.target.value}%`;
  savePreferences();
});
document.querySelector('#effects-volume').addEventListener('input', (event) => {
  audioSettings.effectsVolume = Number(event.target.value) / 100;
  document.querySelector('#effects-volume-output').value = `${event.target.value}%`;
  savePreferences();
});
document.querySelector('#sound-event-list').addEventListener('change', (event) => {
  const id = event.target.dataset.soundEvent;
  if (!id) return;
  audioSettings.events[id] = event.target.checked;
  savePreferences();
});
document.querySelector('#sound-event-list').addEventListener('click', (event) => {
  const preview = event.target.closest('[data-sound-preview]');
  if (!preview) return;
  playSound(preview.dataset.soundPreview, true);
});

function unlockAudio() {
  audioUnlocked = true;
  document.querySelector('#sound-status').textContent = 'Audio enabled. Preview an available sound or continue your game.';
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopActiveSound();
});
window.addEventListener('pagehide', stopActiveSound);

function showMessage(title, text) {
  document.querySelector('#message-title').textContent = title;
  document.querySelector('#message-text').textContent = text;
  messageDialog.showModal();
}

document.querySelector('#online-open').addEventListener('click', () => {
  selectOnlineSection(authSession?.access_token ? 'play' : 'account');
  selectOnlineTab('friends');
  onlineDialog.showModal();
});
document.querySelector('#online-tab').addEventListener('click', () => {
  selectOnlineSection(authSession?.access_token ? 'play' : 'account');
  selectOnlineTab('public');
  onlineDialog.showModal();
});
document.querySelector('#online-close').addEventListener('click', () => onlineDialog.close());
document.querySelector('#online-account-tab').addEventListener('click', () => selectOnlineSection('account'));
document.querySelector('#online-play-tab').addEventListener('click', () => selectOnlineSection('play'));
document.querySelector('#online-continue').addEventListener('click', () => selectOnlineSection('play'));
document.querySelector('#online-go-account').addEventListener('click', () => selectOnlineSection('account'));
document.querySelector('#online-friends-tab').addEventListener('click', () => selectOnlineTab('friends'));
document.querySelector('#online-public-tab').addEventListener('click', () => selectOnlineTab('public'));
document.querySelector('#online-host').addEventListener('click', () => connectToOnlineRoom('create'));
document.querySelector('#online-create-public').addEventListener('click', () => connectToOnlineRoom('create-public'));
document.querySelector('#online-refresh-rooms').addEventListener('click', requestPublicRooms);
document.querySelector('#online-join').addEventListener('click', () => connectToOnlineRoom('join'));
document.querySelector('#online-watch').addEventListener('click', () => connectToOnlineRoom('watch'));
document.querySelector('#online-disconnect').addEventListener('click', disconnectOnlineGame);
for (const channel of ['player', 'spectator']) {
  document.querySelector(`#online-${channel}-chat-form`).addEventListener('submit', (event) => {
    event.preventDefault();
    const input = document.querySelector(`#online-${channel}-chat-input`);
    const text = input.value.trim();
    if (!text) return;
    if (!onlineMode || !onlineRoomCode || onlineSocket?.readyState !== WebSocket.OPEN) {
      updateOnlineStatus('Connect to a room before sending a chat message.');
      return;
    }
    onlineSocket.send(JSON.stringify({ type: 'chat-send', text }));
    input.value = '';
  });
}
document.querySelector('#online-auth-submit').addEventListener('click', submitOnlineAuth);
document.querySelector('#online-auth-mode').addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'signin' : 'signup';
  document.querySelector('#online-account-password').setAttribute(
    'autocomplete',
    authMode === 'signup' ? 'new-password' : 'current-password',
  );
  updateAccountUI(authMode === 'signup'
    ? 'Create an account. Email confirmation is disabled for this free setup.'
    : 'Sign in with your email and password.');
});
document.querySelector('#online-auth-signout').addEventListener('click', signOutOnlineAccount);
for (const field of ['#online-username', '#online-email', '#online-account-password']) {
  document.querySelector(field).addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !document.querySelector('#online-auth-submit').hidden) submitOnlineAuth();
  });
}
document.querySelector('#online-password-enabled').addEventListener('change', (event) => {
  const passwordField = document.querySelector('#online-lobby-password-field');
  passwordField.hidden = !event.currentTarget.checked;
  document.querySelector('#online-lobby-password').required = event.currentTarget.checked;
});
onlineDialog.addEventListener('close', () => {
  if (publicRoomsTimer) clearInterval(publicRoomsTimer);
  publicRoomsTimer = null;
});
onlineDialog.addEventListener('toggle', () => {
  if (!onlineDialog.open || publicRoomsTimer) return;
  publicRoomsTimer = setInterval(() => {
    if (!document.querySelector('#online-public-panel').hidden) requestPublicRooms();
  }, 15_000);
});
document.querySelector('#online-copy-code').addEventListener('click', async () => {
  if (!onlineRoomCode) return;
  try {
    await navigator.clipboard.writeText(onlineRoomCode);
    updateOnlineStatus('Invite code copied. Send it to your opponent.');
  } catch (error) {
    console.error('Could not copy the online invite code:', error);
    updateOnlineStatus(`Invite code: ${onlineRoomCode}. Select and copy it manually.`);
  }
});
if (!onlineServerUrl && !['localhost', '127.0.0.1', '::1'].includes(location.hostname)) {
  updateOnlineStatus('The owner has not connected the online server yet.');
}
initializeAuthSession();
window.addEventListener('beforeunload', () => onlineSocket?.close());

document.querySelector('#resign').addEventListener('click', () => {
  if (onlineSpectating) return;
  if (!game.history().length || isGameOver() || gameResult) return;
  if (onlineMode && onlineSocket?.readyState === WebSocket.OPEN) {
    onlineSocket.send(JSON.stringify({ type: 'resign' }));
  }
  markGameResult('defeat');
  gameMessage.textContent = onlineMode ? 'You resigned. Your opponent wins.' : 'You resigned. The opponent wins.';
  renderBoard();
});

document.querySelector('#offer-draw').addEventListener('click', () => {
  if (customRules.noDraws || !game.history().length || isGameOver() || gameResult) return;
  const materialBalance = game.board().flat().filter(Boolean).reduce((score, piece) => {
    const pieceScore = pieceValues[piece.type] * (piece.color === playerColor ? 1 : -1);
    return score + pieceScore;
  }, 0);
  const accepted = !onlineMode && Math.abs(materialBalance) < 150;
  showMessage('Draw offer', accepted ? 'The bot accepts your draw offer.' : 'The bot declines. The game continues.');
  if (accepted) {
    markGameResult('draw');
    gameMessage.textContent = 'Draw by agreement.';
    renderBoard();
  }
});

document.querySelector('#export-pgn').addEventListener('click', async () => {
  const pgn = game.pgn() || 'No moves have been played yet.';
  const exportField = document.querySelector('#game-export');
  exportField.value = pgn;
  exportField.hidden = false;
  showMessage('Game PGN', pgn);
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(pgn);
  } catch (error) {
    console.error('Could not copy PGN to clipboard:', error);
  }
});

function loadPreferences() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('openboard-preferences') || '{}');
  } catch (error) {
    console.error('Could not load saved preferences:', error);
  }
  if (bots[saved.bot]) difficultySelect.value = saved.bot;
  if (saved.color === 'b' || saved.color === 'w') playerColor = saved.color;
  if (['0', '60', '180', '300', '600'].includes(String(saved.clock))) timeControlSelect.value = String(saved.clock);
  if (['classic', 'blue', 'walnut'].includes(saved.theme)) boardThemeSelect.value = saved.theme;
  if (['dark', 'light'].includes(saved.interfaceTheme)) interfaceThemeSelect.value = saved.interfaceTheme;
  if (typeof saved.sound === 'boolean') soundToggle.checked = saved.sound;
  const savedAudio = saved.audioSettings ?? {};
  const savedEventSettings = savedAudio.events ?? {};
  audioSettings = {
    muted: savedAudio.muted === true,
    masterVolume: Number.isFinite(savedAudio.masterVolume) ? Math.min(1, Math.max(0, savedAudio.masterVolume)) : defaultAudioSettings.masterVolume,
    effectsVolume: Number.isFinite(savedAudio.effectsVolume) ? Math.min(1, Math.max(0, savedAudio.effectsVolume)) : defaultAudioSettings.effectsVolume,
    events: { ...defaultAudioSettings.events },
  };
  for (const [id, sound] of Object.entries(soundManifest)) {
    if (sound.available && typeof savedEventSettings[id] === 'boolean') audioSettings.events[id] = savedEventSettings[id];
  }
  if (saved.customRules && typeof saved.customRules === 'object') {
    const validMovement = (type) => ['p', 'n', 'b', 'r', 'q'].includes(type);
    const normalizeMovements = (movements, fallback) => {
      const values = Array.isArray(movements) ? movements : [movements];
      const normalized = [...new Set(values.filter(validMovement))];
      return normalized.length ? normalized : fallback;
    };
    const pieceMovements = {};
    const savedMovements = saved.customRules.pieceMovements ?? {};
    for (const type of Object.keys(defaultCustomRules.pieceMovements)) {
      const savedSideRules = savedMovements[type];
      if (Array.isArray(savedSideRules)) {
        pieceMovements[type] = { w: normalizeMovements(savedSideRules, [type]), b: normalizeMovements(savedSideRules, [type]) };
      } else {
        pieceMovements[type] = {
          w: normalizeMovements(savedSideRules?.w ?? savedSideRules?.both, [type]),
          b: normalizeMovements(savedSideRules?.b ?? savedSideRules?.both, [type]),
        };
      }
    }
    if (!saved.customRules.pieceMovements && saved.customRules.pawnMovement) {
      const legacyPawnMovement = normalizeMovements(saved.customRules.pawnMovement, ['p']);
      pieceMovements.p = { w: legacyPawnMovement, b: [...legacyPawnMovement] };
    }
    const legacyPiece = saved.customRules.customPiece;
    const savedPieces = Array.isArray(saved.customRules.customPieces)
      ? saved.customRules.customPieces
      : legacyPiece?.enabled ? [{ ...legacyPiece, id: 'legacy-custom-piece', color: 'both' }] : [];
    const customPieces = savedPieces
      .filter((piece) => piece && ['p', 'n', 'b', 'r', 'q'].includes(piece.replaces))
      .map((piece, index) => {
        const replaces = piece.replaces;
        const movements = normalizeMovements(piece.movements ?? piece.movement, replaces === 'p' ? ['p'] : ['q']);
        const studio = piece.studio ? studioMovementPatterns(piece.studio) : null;
        return {
          id: typeof piece.id === 'string' ? piece.id : `saved-piece-${index}`,
          name: typeof piece.name === 'string' && piece.name.trim() ? piece.name.trim().slice(0, 18) : 'Custom piece',
          symbol: typeof piece.symbol === 'string' && piece.symbol.trim() ? [...piece.symbol.trim()][0] : '✦',
          movements,
          replaces,
          color: ['w', 'b', 'both'].includes(piece.color) ? piece.color : 'both',
          ...(studio ? { studio } : {}),
        };
      })
      .filter((piece, index, pieces) => !pieces.slice(0, index).some((other) =>
        other.replaces === piece.replaces && (other.color === 'both' || piece.color === 'both' || other.color === piece.color)));
    customRules = {
      boardSize: playableBoardSizes.includes(Number(saved.customRules.boardSize))
        ? Number(saved.customRules.boardSize)
        : 8,
      noDraws: saved.customRules.noDraws === true,
      pieceMovements,
      customPieces,
    };
  }
  try {
    puzzleSolved = Number(localStorage.getItem('openboard-puzzles-solved') || 0);
  } catch (error) {
    console.error('Could not load puzzle progress:', error);
  }
  playColorSelect.value = playerColor;
  flipped = playerColor === 'b';
  document.body.dataset.boardTheme = boardThemeSelect.value;
  document.body.dataset.interfaceTheme = interfaceThemeSelect.value;
  populateCustomRulesForm();
  updateCustomRulesSummary();
  renderSoundSettings();
}

document.querySelector('#custom-rules-open').addEventListener('click', () => {
  populateCustomRulesForm();
  customRulesDialog.showModal();
});
document.querySelector('#close-custom-rules').addEventListener('click', () => customRulesDialog.close());
document.querySelector('#reset-custom-rules').addEventListener('click', () => {
  customRules = JSON.parse(JSON.stringify(defaultCustomRules));
  populateCustomRulesForm();
  updateCustomRulesSummary();
  savePreferences();
  customRulesDialog.close();
  startNewGame();
});
document.querySelector('#apply-custom-rules').addEventListener('click', () => {
  const updatedRules = readCustomRulesForm();
  if (!updatedRules) return;
  if (onlineMode && updatedRules.boardSize !== 8) {
    showMessage('Online games use standard chess', 'Finish or disconnect from the online room before switching to a larger board.');
    return;
  }
  customRules = updatedRules;
  updateCustomRulesSummary();
  savePreferences();
  customRulesDialog.close();
  startNewGame();
});

loadPreferences();
document.querySelector('#difficulty').dispatchEvent(new Event('change'));

document.querySelector('#puzzle-start').addEventListener('click', () => {
  if (activeBoardSize !== 8) {
    showMessage('Puzzle board size', 'The built-in mate-in-one puzzle uses the standard 8×8 board. Select 8×8 in Custom rules to play it.');
    return;
  }
  gameToken += 1;
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  game.load('7k/8/5KQ1/8/8/8/8/8 w - - 0 1');
  game.clearCustomMovements();
  moveInsights = [];
  customMovementBySquare = new Map();
  customPieceBySquare = new Map();
  customIdentityHistory = [];
  snapshotCustomIdentity();
  playerColor = 'w';
  playColorSelect.value = 'w';
  flipped = false;
  analysisMode = false;
  puzzleMode = true;
  suggestedMove = null;
  gameResult = false;
  aiThinking = false;
  gameMessage.textContent = 'White to move. Find checkmate in one.';
  renderBoard();
});

document.querySelector('#puzzle-hint').addEventListener('click', () => {
  if (!puzzleMode) {
    showMessage('Puzzle hint', 'Start the mate-in-one puzzle first.');
    return;
  }
  showMessage('Puzzle hint', 'Look for a queen move that checks the king while covering its escape squares.');
});

document.querySelector('#analysis-open').addEventListener('click', () => {
  gameToken += 1;
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  aiThinking = false;
  gameResult = false;
  puzzleMode = false;
  analysisMode = true;
  document.querySelector('#analysis-input').value = game.fen();
  renderBoard();
  document.querySelector('#analysis-dialog').showModal();
});

document.querySelector('#load-position').addEventListener('click', () => {
  const input = document.querySelector('#analysis-input').value.trim();
  if (!input) {
    showMessage('Position not loaded', 'Paste a FEN position or PGN game first.');
    return;
  }
  let loaded = false;
  try {
    if (input.split(/\s+/).length === 6 && input.includes('/')) loaded = game.load(input);
    else loaded = game.load_pgn(input);
  } catch (error) {
    console.error('Could not load chess position:', error);
  }
  if (!loaded) {
    showMessage('Position not loaded', 'That FEN or PGN could not be parsed.');
    return;
  }
  configureStartingPosition();
  analysisMode = true;
  gameResult = false;
  moveInsights = [];
  suggestedMove = null;
  selectedSquare = null;
  legalTargets = [];
  renderBoard();
  document.querySelector('#analysis-dialog').close();
  if (isGameOver()) updateGameState();
  else gameMessage.textContent = 'Analysis mode · play either side or request a suggestion.';
});

document.querySelector('#copy-fen').addEventListener('click', async () => {
  const fen = game.fen();
  document.querySelector('#analysis-input').value = fen;
  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) await navigator.clipboard.writeText(fen);
  } catch (error) {
    console.error('Could not copy FEN to clipboard:', error);
  }
});

document.querySelector('#suggest-move').addEventListener('click', () => {
  if (aiThinking || gameResult || isGameOver() || (onlineMode && (!onlineReady || game.turn() !== playerColor))) return;
  if (!analysisMode && !puzzleMode && !onlineMode && game.turn() !== playerColor) {
    gameMessage.textContent = 'Wait for your turn before requesting a suggestion.';
    return;
  }
  const suggestion = findBestMove({ depth: 2, variety: 1 });
  if (!suggestion) {
    suggestedMove = null;
    gameMessage.textContent = 'No legal move is available in this position.';
    renderBoard();
    return;
  }
  suggestedMove = { from: suggestion.from, to: suggestion.to };
  gameMessage.textContent = `Suggested move: ${suggestion.san} · ${suggestion.from} to ${suggestion.to}.`;
  renderBoard();
});

if (!game) {
  gameMessage.textContent = 'Could not load the chess rules engine. Check your internet connection and reload.';
  document.querySelector('#new-game').disabled = true;
  document.querySelector('#undo').disabled = true;
  document.querySelector('#redo').disabled = true;
  document.querySelector('#flip').disabled = true;
  difficultySelect.disabled = true;
} else {
  updateGameState();
  renderBoard();
  startNewGame();
}
