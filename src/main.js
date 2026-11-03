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
const accountDialog = document.querySelector('#account-dialog');
const profilesPage = document.querySelector('#profiles-page');
const gamePage = document.querySelector('#game-page');
const socialPanel = document.querySelector('#social-panel');
const onlineLeaveDialog = document.querySelector('#online-leave-dialog');
const onlineOpponentLeftDialog = document.querySelector('#online-opponent-left-dialog');
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
let puzzleCurrentIndex = -1;
let tutorialLessonIndex = 0;
let tutorialProgress = 0;
let tutorialDemoGame = null;
let tutorialDemoHighlights = [];
let tutorialDemoStartFen = '';
let tutorialDemoMoves = [];
let tutorialDemoStepIndex = 0;
let tutorialPlaybackTimer = null;
const learningContent = window.openboardLearningContent;
const puzzlePositions = learningContent.puzzles;
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
let onlineCreatePending = false;
let onlineMode = false;
let onlineReady = false;
let onlineSpectating = false;
let onlineChatHistory = { players: [], spectators: [] };
let onlineIdentityVerified = false;
let onlineRoomCode = null;
let onlineLeaveTimeout = null;
let onlinePlayerName = '';
let onlinePlayerCountryCode = null;
let socialOverview = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  challengeNotifications: [],
  blockedUsers: [],
  blockedBy: [],
};
let activeSocialPanel = '';
let activeSocialTab = 'friends';
let activeSocialConversation = null;
let activeHistoryType = 'offline';
let historyReplayGame = null;
let historyReplayInitialFen = '';
let historyReplayMoves = [];
let historyReplayIndex = 0;
let historyReplayTimer = null;
let historyReplayFlipped = false;
let profileChallengeUsername = '';
let joiningGameChallengeId = '';
let currentViewedProfile = null;
let pendingAvatarData = null;
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
const onlineRoomStorageKey = 'openboard-last-online-room';
const offlineRatingStorageKey = 'openboard-offline-ratings';
const offlineGameHistoryStoragePrefix = 'openboard-game-history-offline';
const playableBoardSizes = [8, 10, 12, 14, 16, 18, 20];
let authSession = null;
let authUsername = '';
let sidebarProfileRequestFor = '';
let sidebarProfileRequestId = 0;
let sidebarProfileIdentity = null;
let authMode = 'signup';
let passwordRecoveryMode = false;
let passwordRecoveryCodeMode = false;
let offlineRatingRecorded = false;
let offlineRatings = {};
try {
  const savedOfflineRatings = JSON.parse(localStorage.getItem(offlineRatingStorageKey) || '{}');
  if (savedOfflineRatings && typeof savedOfflineRatings === 'object' && !Array.isArray(savedOfflineRatings)) {
    offlineRatings = savedOfflineRatings;
  }
} catch (error) {
  console.error('Could not load offline rating estimates:', error);
}
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

function offlineRatingKey() {
  return authUsername ? authUsername.toLowerCase() : 'guest';
}

function getOfflineRating() {
  const saved = offlineRatings[offlineRatingKey()];
  if (!saved || !Number.isInteger(saved.rating) || saved.rating < 100
    || !['games', 'wins', 'draws', 'losses'].every((field) => Number.isInteger(saved[field]) && saved[field] >= 0)) {
    return { rating: 1200, games: 0, wins: 0, draws: 0, losses: 0 };
  }
  return saved;
}

function recordOfflineRating(score) {
  if (offlineRatingRecorded || onlineMode || onlineSpectating || analysisMode || puzzleMode) return;
  const current = getOfflineRating();
  const opponentRating = bots[difficultySelect.value]?.elo ?? 1200;
  const expected = 1 / (1 + (10 ** ((opponentRating - current.rating) / 400)));
  const rating = Math.max(100, Math.round(current.rating + (32 * (score - expected))));
  const result = score === 1 ? 'wins' : score === 0.5 ? 'draws' : 'losses';
  offlineRatings[offlineRatingKey()] = {
    ...current,
    rating,
    games: current.games + 1,
    [result]: current[result] + 1,
  };
  offlineRatingRecorded = true;
  try {
    localStorage.setItem(offlineRatingStorageKey, JSON.stringify(offlineRatings));
  } catch (error) {
    console.error('Could not save your offline rating estimate:', error);
  }
}

function offlineGameHistoryStorageKey() {
  return `${offlineGameHistoryStoragePrefix}-${offlineRatingKey()}`;
}

function recordOfflineMatch(score, termination) {
  if (onlineMode || onlineSpectating || analysisMode || puzzleMode || !game.history().length) return;
  const result = score === 1 ? 'win' : score === 0 ? 'loss' : 'draw';
  const storageKey = offlineGameHistoryStorageKey();
  let matches = [];
  try {
    const savedMatches = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(savedMatches)) matches = savedMatches;
    matches.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: new Date().toISOString(),
      opponent: difficultySelect.selectedOptions[0]?.textContent || 'Computer',
      playerColor,
      result,
      termination,
      pgn: game.pgn(),
    });
    localStorage.setItem(storageKey, JSON.stringify(matches.slice(0, 100)));
  } catch (error) {
    console.error('Could not save your offline match history:', error);
  }
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

function squareAt(row, col, size = game.board().length) {
  return `${String.fromCharCode(97 + col)}${size - row}`;
}

function renderBoard() {
  const displayGame = tutorialDemoGame || game;
  const size = displayGame.board().length;
  const premoveWindow = !tutorialDemoGame && canQueuePremove();
  const rows = [...Array(size).keys()];
  const cols = [...Array(size).keys()];
  if (flipped) {
    rows.reverse();
    cols.reverse();
  }
  boardElement.style.setProperty('--board-size', size);
  boardElement.replaceChildren();
  const gameOver = tutorialDemoGame ? displayGame.game_over() : isGameOver();
  const currentCheck = tutorialDemoGame ? displayGame.in_check() : isCheck();
  const lastMove = displayGame.history({ verbose: true }).at(-1);
  const lastMoveTo = lastMove?.to;

  rows.forEach((rank, rowIndex) => {
    cols.forEach((file, colIndex) => {
      const square = squareAt(rank, file, size);
      const piece = displayGame.get(square);
      const customIdentity = piece && !tutorialDemoGame ? customPieceAt(square) : null;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      button.dataset.square = square;
      button.setAttribute('role', 'gridcell');
      button.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${customIdentity?.name ?? piece.type}` : ''}`);
      if (tutorialDemoHighlights.includes(square) || square === lastMove?.from || square === lastMove?.to) {
        button.classList.add('tutorial-highlight');
      }
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
      if (currentCheck && piece?.type === 'k' && piece.color === displayGame.turn()) button.classList.add('in-check');
      if (!tutorialDemoGame && legalTargets.includes(square)) {
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
      button.draggable = Boolean(!tutorialDemoGame && piece && piece.color === playerColor && !gameResult
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
      button.disabled = Boolean(tutorialDemoGame || (aiThinking && !premoveWindow)
        || gameOver || gameResult || (onlineMode && !onlineReady));
      if (!tutorialDemoGame) button.addEventListener('click', () => onSquareClick(square));
      boardElement.append(button);
    });
  });
  if (!tutorialDemoGame) {
    renderMoves();
    renderCapturedPieces();
  }
}

function renderCapturedPieces() {
  const history = game.history({ verbose: true });
  const trays = [
    { selector: '#human-captured-pieces', capturer: playerColor, label: 'you' },
    { selector: '#opponent-captured-pieces', capturer: playerColor === 'w' ? 'b' : 'w', label: 'your opponent' },
  ];
  for (const { selector, capturer, label } of trays) {
    const tray = document.querySelector(selector);
    const captured = history
      .filter((move) => move.color === capturer && move.captured)
      .map((move) => ({ type: move.captured, color: move.color === 'w' ? 'b' : 'w' }));
    tray.replaceChildren();
    tray.hidden = captured.length === 0;
    if (!captured.length) continue;
    tray.setAttribute('aria-label', `${captured.length} ${captured.length === 1 ? 'piece' : 'pieces'} captured by ${label}`);
    for (const piece of captured) {
      const icon = document.createElement('span');
      icon.className = `captured-piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
      icon.textContent = pieceTheme.symbols[piece.color][piece.type];
      icon.setAttribute('aria-hidden', 'true');
      tray.append(icon);
    }
  }
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
  const puzzle = puzzlePositions[puzzleCurrentIndex];
  if (puzzleMode && (!puzzle || from !== puzzle.from || to !== puzzle.to)) {
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
    gameMessage.textContent = `Puzzle solved! ${puzzleSolved} ${puzzleSolved === 1 ? 'puzzle' : 'puzzles'} solved.`;
    updatePuzzleProgress();
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
  updateOnlineSuggestionAvailability();
  if (gameResult) return;
  if (isCheckmate()) {
    gameMessage.textContent = onlineMode
      ? onlineSpectating
        ? `Checkmate. ${game.turn() === 'w' ? 'White' : 'Black'} is checkmated.`
        : game.turn() === playerColor ? 'Checkmate. Your opponent wins.' : 'Checkmate! You win!'
      : analysisMode
        ? `Checkmate. ${game.turn() === 'w' ? 'White' : 'Black'} is checkmated.`
        : game.turn() === 'w' ? 'Checkmate. The engine wins this game.' : 'Checkmate! You win!';
    const humanScore = onlineSpectating ? 0.5 : game.turn() === playerColor ? 0 : 1;
    markGameResult(onlineSpectating ? 'draw' : humanScore === 0 ? 'defeat' : 'victory', humanScore, 'checkmate');
  } else if (isStalemate()) {
    gameMessage.textContent = customRules.noDraws
      ? `${game.turn() === 'w' ? 'White' : 'Black'} has no legal moves. Stalemate counts as a loss in this ruleset.`
      : 'Draw by stalemate.';
    const humanScore = customRules.noDraws
      ? game.turn() === playerColor ? 0 : 1
      : 0.5;
    markGameResult(humanScore === 0 ? 'defeat' : humanScore === 1 ? 'victory' : 'draw', humanScore, 'draw');
  } else if (isThreefoldRepetition()) {
    gameMessage.textContent = 'Draw by threefold repetition.';
    markGameResult('draw', 0.5, 'draw');
  } else if (isInsufficientMaterial()) {
    gameMessage.textContent = 'Draw by insufficient material.';
    markGameResult('draw', 0.5, 'draw');
  } else if (isDraw()) {
    gameMessage.textContent = 'The game is a draw.';
    markGameResult('draw', 0.5, 'draw');
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
  updateOnlineSuggestionAvailability();
}

function updateOnlineSuggestionAvailability() {
  const suggestButton = document.querySelector('#suggest-move');
  if (!onlineMode) {
    suggestButton.disabled = false;
    return;
  }
  suggestButton.disabled = !onlineReady
    || onlineSpectating
    || gameResult
    || isGameOver()
    || onlineSocket?.readyState !== WebSocket.OPEN;
}

function updateOnlineStatus(message) {
  document.querySelector('#online-status').textContent = message;
}

function updateSpectatorCount(count) {
  const spectatorCount = Number.isInteger(count) && count >= 0 ? count : 0;
  document.querySelector('#board-spectator-count').hidden = !onlineMode;
  document.querySelector('#board-spectator-count-label').textContent =
    `${spectatorCount} ${spectatorCount === 1 ? 'spectator' : 'spectators'}`;
  document.querySelector('#online-spectator-count').textContent =
    `Spectators: ${spectatorCount}`;
  if (onlineMode && onlineRoomCode) {
    publicRooms = publicRooms.map((room) => (
      room.code === onlineRoomCode ? { ...room, spectators: spectatorCount } : room
    ));
    renderPublicRooms();
  }
}

function saveOnlineRoomCode(code) {
  try {
    localStorage.setItem(onlineRoomStorageKey, code);
    document.querySelector('#online-room-code').value = code;
  } catch (error) {
    console.error('Could not save the online invite code for reconnecting:', error);
  }
}

function saveAuthSession(session) {
  authSession = {
    ...session,
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
  if (typeof session.user?.user_metadata?.username === 'string') {
    authUsername = session.user.user_metadata.username;
  }
  try {
    localStorage.setItem(authSessionStorageKey, JSON.stringify(authSession));
  } catch (error) {
    console.error('Could not save your online sign-in:', error);
    document.querySelector('#online-auth-status').textContent = 'Signed in for this tab, but browser storage is unavailable.';
  }
  updateAccountUI();
  if (!socialPanel.hidden) {
    if (activeSocialPanel === 'settings') {
      document.querySelector('#social-account-settings').textContent =
        `Account · ${authUsername || authSession.user?.email || 'signed in'}`;
    } else {
      showSocialView(activeSocialPanel || 'friends');
      refreshSocialPanel();
    }
  }
}

function clearAuthSession() {
  authSession = null;
  authUsername = '';
  onlineIdentityVerified = false;
  socialOverview = {
    friends: [],
    incomingRequests: [],
    outgoingRequests: [],
    challengeNotifications: [],
    blockedUsers: [],
    blockedBy: [],
  };
  updateSocialBadges();
  localStorage.removeItem(authSessionStorageKey);
  updateAccountUI();
  if (!socialPanel.hidden) refreshSocialPanel();
}

function profileEndpoint(path) {
  if (!onlineServerUrl) throw new Error('Player profiles are unavailable because the online server is not configured.');
  const endpoint = new URL(onlineServerUrl);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  endpoint.pathname = path;
  endpoint.search = '';
  endpoint.hash = '';
  return endpoint;
}

async function requestPlayerProfile(username = '') {
  const ownProfile = !username;
  const endpoint = profileEndpoint(ownProfile ? '/profile/me' : `/profiles/${encodeURIComponent(username)}`);
  const headers = {};
  if (ownProfile) {
    const session = await getValidAuthSession();
    if (!session?.access_token) throw new Error('Sign in to view your player profile.');
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  const response = await fetch(endpoint, { headers });
  let profile;
  try {
    profile = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable player profile.');
  }
  if (!response.ok) throw new Error(profile.message || 'Could not load this player profile.');
  if (ownProfile && !profile.countryCode) {
    const metadataCountryCode = authSession?.user?.user_metadata?.country_code || '';
    profile.countryCode = /^[A-Za-z]{2}$/.test(metadataCountryCode)
      ? metadataCountryCode.toUpperCase()
      : null;
  }
  return profile;
}

function populateCountryOptions() {
  const countrySelect = document.querySelector('#profile-country-select');
  const settingsCountrySelect = document.querySelector('#dock-country-select');
  const regionNames = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' });
  const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
  const options = countryCodes
    .map((code) => ({ code, name: regionNames.of(code) || code }))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const { code, name } of options) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${countryFlagEmoji(code)} ${name}`;
    countrySelect.append(option);
    settingsCountrySelect.append(option.cloneNode(true));
  }
}

function renderPlayerProfile(profile, isOwnProfile = false) {
  const card = document.querySelector('#profile-card');
  currentViewedProfile = profile;
  document.querySelector('#profile-avatar-letter').textContent = [...profile.username][0].toUpperCase();
  const avatarImage = document.querySelector('#profile-avatar-image');
  avatarImage.hidden = !profile.avatarData;
  avatarImage.removeAttribute('src');
  if (profile.avatarData) avatarImage.src = profile.avatarData;
  document.querySelector('#profile-username').textContent = `${countryFlagEmoji(profile.countryCode)} @${profile.username}`.trim();
  document.querySelector('#profile-country').textContent = countryLabel(profile.countryCode) || 'Country not available';
  const bio = document.querySelector('#profile-bio');
  bio.textContent = profile.bio || '';
  bio.hidden = !profile.bio;
  const countryForm = document.querySelector('#profile-country-form');
  countryForm.hidden = !isOwnProfile;
  document.querySelector('#dock-country-select').value = profile.countryCode || '';
  if (isOwnProfile) {
    document.querySelector('#profile-country-select').value = profile.countryCode || '';
    document.querySelector('#profile-bio-input').value = profile.bio || '';
    pendingAvatarData = null;
  }
  renderProfileActions(profile, isOwnProfile);
  document.querySelector('#profile-online-elo').textContent = Number(profile.onlineElo).toLocaleString();
  const games = Number(profile.onlineGames) || 0;
  const ratingLabel = games < 10 ? `Provisional · ${games} rated ${games === 1 ? 'game' : 'games'}` : `${games} rated games`;
  document.querySelector('#profile-online-record').textContent =
    `${profile.onlineWins}-${profile.onlineDraws}-${profile.onlineLosses} · ${ratingLabel}`;
  const offlineCard = document.querySelector('#profile-offline-rating-card');
  const showOffline = isOwnProfile && Boolean(authUsername)
    && profile.username.toLowerCase() === authUsername.toLowerCase();
  offlineCard.hidden = !showOffline;
  if (showOffline) {
    const offline = getOfflineRating();
    document.querySelector('#profile-offline-elo').textContent = offline.rating.toLocaleString();
    const offlineRatingLabel = offline.games < 10
      ? `Provisional · ${offline.games} rated ${offline.games === 1 ? 'game' : 'games'}`
      : `${offline.games} rated games`;
    document.querySelector('#profile-offline-record').textContent =
      `${offline.wins}-${offline.draws}-${offline.losses} · ${offlineRatingLabel}`;
  }
  card.hidden = false;
}

function renderProfileActions(profile, isOwnProfile) {
  const actions = document.querySelector('#profile-actions');
  actions.hidden = isOwnProfile || !profile.username;
  if (actions.hidden) return;
  const friend = socialOverview.friends.some((entry) => (
    (profile.id && entry.id === profile.id)
    || entry.username.toLowerCase() === profile.username.toLowerCase()
  ));
  const outgoingRequest = socialOverview.outgoingRequests.some((entry) => (
    entry.username.toLowerCase() === profile.username.toLowerCase()
  ));
  const incomingRequest = socialOverview.incomingRequests.find((entry) => (
    entry.username.toLowerCase() === profile.username.toLowerCase()
  ));
  const blocked = socialOverview.blockedUsers.some((entry) => entry.id === profile.id);
  const blockedBy = socialOverview.blockedBy.includes(profile.id);
  const outgoingChallenge = socialOverview.challengeNotifications.some((challenge) => (
    !challenge.isIncoming
    && challenge.status === 'pending'
    && challenge.recipientUsername.toLowerCase() === profile.username.toLowerCase()
  ));
  const addButton = document.querySelector('#profile-add-friend');
  addButton.disabled = friend || outgoingRequest || blocked || blockedBy;
  addButton.textContent = friend ? 'Friends' : outgoingRequest ? 'Request sent' : blockedBy ? 'Unavailable' : 'Add friend';
  if (incomingRequest) {
    addButton.disabled = blocked || blockedBy;
    addButton.textContent = 'Accept request';
  }
  const challengeButton = document.querySelector('#profile-challenge');
  challengeButton.disabled = blocked || blockedBy || outgoingChallenge;
  challengeButton.textContent = outgoingChallenge ? 'Challenge pending' : 'Challenge';
  const blockButton = document.querySelector('#profile-block');
  blockButton.disabled = blockedBy;
  blockButton.textContent = blocked ? 'Unblock' : blockedBy ? 'Unavailable' : 'Block';
}

async function updateOwnProfile(fields) {
  const session = await getValidAuthSession();
  if (!session?.access_token) throw new Error('Sign in to update your player profile.');
  const response = await fetch(profileEndpoint('/profile/me'), {
    method: 'PATCH',
    headers: {
      Authorization: makeAuthorizationHeader(session.access_token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fields),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable profile response.');
  }
  if (!response.ok) throw new Error(result.message || 'Could not save your profile.');
  if (result.countryCode && authSession?.user) {
    authSession.user.user_metadata = {
      ...(authSession.user.user_metadata || {}),
      country_code: result.countryCode,
    };
    updateAccountUI();
  }
  return result;
}

async function compressProfileImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 8 * 1024 * 1024) throw new Error('Choose an image smaller than 8 MB.');
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 256 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();
  const imageData = canvas.toDataURL('image/webp', 0.78);
  if (!imageData.startsWith('data:image/webp;base64,') || imageData.length > 170000) {
    throw new Error('This browser could not create a small WebP profile picture. Try another image.');
  }
  return imageData;
}

async function challengeProfilePlayer() {
  if (!authSession?.access_token) {
    openAccountDialog('signin');
    return;
  }
  if (!currentViewedProfile?.username) return;
  profileChallengeUsername = currentViewedProfile.username;
  document.querySelector('#challenge-title').textContent = `Challenge @${profileChallengeUsername}`;
  document.querySelector('#challenge-description').textContent =
    'Play now to create a private room and send an inbox invite, or schedule a game for later.';
  document.querySelector('#challenge-status').textContent = '';
  document.querySelector('#challenge-schedule-form').hidden = true;
  document.querySelector('#challenge-scheduled-at').value = '';
  document.querySelector('#challenge-dialog').showModal();
}

async function sendProfileChallengeInvite(roomCode) {
  const username = profileChallengeUsername;
  profileChallengeUsername = '';
  if (!username) return;
  let copied = false;
  try {
    await navigator.clipboard.writeText(roomCode);
    copied = true;
  } catch (error) {
    console.warn('Could not copy the challenge invite code:', error);
  }
  try {
    const result = await requestSocialApi('/social/challenges', 'POST', {
      username,
      challengeType: 'now',
      roomCode,
    });
    await refreshSocialOverview();
    const copyMessage = copied ? 'The room code was also copied.' : `Room code: ${roomCode}.`;
    if (result.status === 'already_pending') {
      showMessage('Challenge already sent', `There is already a pending challenge to @${username}. ${copyMessage}`);
      return;
    }
    showMessage('Challenge sent', `A play-now challenge was sent to @${username}'s inbox. ${copyMessage}`);
  } catch (error) {
    console.error('Could not send the challenge notification:', error);
    showMessage('Challenge notification failed', `The private room ${roomCode} was created, but the inbox notification could not be sent: ${error.message || 'unknown error'}`);
  }
}

async function sendScheduledProfileChallenge(event) {
  event.preventDefault();
  const username = profileChallengeUsername;
  if (!username) return;
  const scheduledAt = new Date(document.querySelector('#challenge-scheduled-at').value);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() + 60_000) {
    document.querySelector('#challenge-status').textContent = 'Choose a time at least one minute in the future.';
    return;
  }
  const submit = document.querySelector('#challenge-schedule-submit');
  submit.disabled = true;
  document.querySelector('#challenge-status').textContent = 'Sending scheduled challenge…';
  try {
    const result = await requestSocialApi('/social/challenges', 'POST', {
      username,
      challengeType: 'scheduled',
      scheduledAt: scheduledAt.toISOString(),
    });
    await refreshSocialOverview();
    if (result.status === 'already_pending') {
      document.querySelector('#challenge-status').textContent =
        `You already have a pending challenge to @${username}.`;
      return;
    }
    profileChallengeUsername = '';
    document.querySelector('#challenge-dialog').close();
    if (currentViewedProfile) renderProfileActions(currentViewedProfile, false);
    showMessage('Scheduled challenge sent', `@${username} has a scheduled game notification in their inbox for ${scheduledAt.toLocaleString()}.`);
  } catch (error) {
    console.error('Could not send scheduled challenge:', error);
    document.querySelector('#challenge-status').textContent = error.message || 'Could not send the scheduled challenge.';
  } finally {
    submit.disabled = false;
  }
}

async function respondToGameChallenge(challengeId, accept) {
  try {
    await requestSocialApi('/social/challenges/respond', 'POST', { challengeId, accept });
    await refreshSocialOverview();
    document.querySelector('#social-panel-status').textContent =
      accept ? 'Scheduled challenge accepted.' : 'Challenge declined.';
  } catch (error) {
    console.error('Could not respond to challenge:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Could not respond to the challenge.';
  }
}

function joinGameChallenge(challenge) {
  if (onlineMode || onlineSocket?.readyState === WebSocket.CONNECTING) {
    showMessage('Online game in progress', 'Leave your current online room before joining this challenge.');
    return;
  }
  joiningGameChallengeId = challenge.id;
  document.querySelector('#online-room-code').value = challenge.roomCode;
  document.querySelector('#online-password-enabled').checked = false;
  document.querySelector('#online-lobby-password').value = '';
  openOnlineDialog('friends');
  connectToOnlineRoom('join', challenge.roomCode);
}

async function acknowledgeJoinedGameChallenge() {
  const challengeId = joiningGameChallengeId;
  if (!challengeId) return;
  joiningGameChallengeId = '';
  try {
    await requestSocialApi('/social/challenges/respond', 'POST', { challengeId, accept: true });
    await refreshSocialOverview();
  } catch (error) {
    console.error('Joined the challenge room, but could not update the challenge notification:', error);
    document.querySelector('#social-panel-status').textContent =
      error.message || 'The game started, but the challenge status could not be updated.';
  }
}

async function loadPlayerProfile(username = '') {
  const status = document.querySelector('#profile-status');
  const card = document.querySelector('#profile-card');
  card.hidden = true;
  status.textContent = 'Loading player profile…';
  try {
    const profile = await requestPlayerProfile(username);
    if (authSession?.access_token) {
      try {
        await refreshSocialOverview();
      } catch (error) {
        console.error('Could not load profile social actions:', error);
      }
    } else {
      socialOverview = {
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        challengeNotifications: [],
        blockedUsers: [],
        blockedBy: [],
      };
    }
    if (!username) authUsername = profile.username;
    renderPlayerProfile(profile, !username);
    status.textContent = username
      ? `Public profile for @${profile.username}.`
      : 'Your player profile.';
  } catch (error) {
    console.error('Could not load player profile:', error);
    status.textContent = error.message || 'Could not load this player profile.';
  }
}

function initializeAuthSession() {
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const accessToken = fragment.get('access_token');
  if (accessToken && fragment.get('refresh_token')) {
    passwordRecoveryMode = fragment.get('type') === 'recovery';
    passwordRecoveryCodeMode = false;
    authMode = 'signin';
    saveAuthSession({
      access_token: accessToken,
      refresh_token: fragment.get('refresh_token'),
      expires_in: fragment.get('expires_in') || '3600',
      token_type: fragment.get('token_type') || 'bearer',
    });
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    document.querySelector('#online-auth-status').textContent = passwordRecoveryMode
      ? 'Choose a new password for your account.'
      : 'Signed in. You can now join or create a lobby.';
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
  updateSidebarAccountControls(isSignedIn);
  const usernameField = document.querySelector('#online-username-field');
  const emailField = document.querySelector('#online-email-field');
  const identityField = document.querySelector('#online-email');
  identityField.type = authMode === 'signup' ? 'email' : 'text';
  identityField.autocomplete = authMode === 'signup' ? 'email' : 'username';
  identityField.placeholder = authMode === 'signup' ? '' : 'Email or username';
  document.querySelector('#online-email-label-text').textContent =
    authMode === 'signup' ? 'Email' : 'Email or username';
  document.querySelector('#online-password-label-text').textContent =
    passwordRecoveryMode ? 'New password' : 'Password';
  document.querySelector('#online-recovery-code-field').hidden = !passwordRecoveryCodeMode;
  document.querySelector('#online-recovery-code').disabled = !passwordRecoveryCodeMode;
  document.querySelector('#online-account-password').hidden = passwordRecoveryCodeMode;
  document.querySelector('#online-account-password').autocomplete =
    passwordRecoveryMode || authMode === 'signup' ? 'new-password' : 'current-password';
  usernameField.hidden = authMode !== 'signup' || isSignedIn || passwordRecoveryMode;
  emailField.hidden = isSignedIn || passwordRecoveryMode;
  document.querySelector('#online-account-state').textContent = isSignedIn
    ? `Signed in · ${authSession.user?.email || 'Openboard account'}`
    : 'Sign in or create an account';
  document.querySelector('#online-username').disabled = authMode !== 'signup' || isSignedIn;
  document.querySelector('#online-email').disabled = isSignedIn;
  document.querySelector('#online-account-password').disabled = isSignedIn && !passwordRecoveryMode;
  document.querySelector('#online-auth-submit').hidden = isSignedIn && !passwordRecoveryMode;
  document.querySelector('#online-auth-mode').hidden = isSignedIn || passwordRecoveryMode || passwordRecoveryCodeMode;
  document.querySelector('#online-auth-reset').hidden = isSignedIn || authMode !== 'signin' || passwordRecoveryMode || passwordRecoveryCodeMode;
  document.querySelector('#online-auth-signout').hidden = !isSignedIn || passwordRecoveryMode;
  document.querySelector('#online-auth-submit').textContent = passwordRecoveryMode
    ? 'Update password'
    : passwordRecoveryCodeMode ? 'Verify code'
    : authMode === 'signup' ? 'Create account' : 'Sign in';
  document.querySelector('#online-auth-mode').textContent = authMode === 'signup'
    ? 'Already registered? Sign in'
    : 'Need an account? Create one';
  document.querySelector('#online-continue').hidden = !isSignedIn || passwordRecoveryMode || passwordRecoveryCodeMode;
  document.querySelector('#online-signin-required').hidden = isSignedIn && !passwordRecoveryMode && !passwordRecoveryCodeMode;
  document.querySelector('#online-play-controls').hidden = !isSignedIn || passwordRecoveryMode || passwordRecoveryCodeMode;
  if (message) document.querySelector('#online-auth-status').textContent = message;
}

function updateSidebarAccountControls(isSignedIn) {
  const profileButton = document.querySelector('#sidebar-profile');
  const profileName = document.querySelector('.sidebar-profile-name');
  const profileFlag = document.querySelector('.sidebar-profile-flag');
  document.querySelector('.sidebar-signup').hidden = isSignedIn;
  document.querySelector('.sidebar-login').hidden = isSignedIn;
  profileButton.hidden = !isSignedIn;

  if (!isSignedIn) {
    sidebarProfileRequestId += 1;
    sidebarProfileRequestFor = '';
    sidebarProfileIdentity = null;
    return;
  }

  if (!authUsername && typeof authSession.user?.user_metadata?.username === 'string') {
    authUsername = authSession.user.user_metadata.username;
  }
  const userId = authSession.user?.id || authSession.access_token;
  profileName.textContent = authUsername ? `@${authUsername}` : 'Your profile';
  profileFlag.textContent = '';
  profileButton.setAttribute('aria-label', authUsername
    ? `Your profile, ${authUsername}`
    : 'Your profile');

  if (sidebarProfileIdentity?.userId === userId) {
    profileFlag.textContent = countryFlagEmoji(sidebarProfileIdentity.countryCode);
    return;
  }
  if (sidebarProfileRequestFor === userId) return;

  sidebarProfileRequestFor = userId;
  const requestId = ++sidebarProfileRequestId;
  requestPlayerProfile().then((profile) => {
    if (requestId !== sidebarProfileRequestId
      || !authSession?.access_token
      || (authSession.user?.id || authSession.access_token) !== userId) return;
    authUsername = profile.username;
    sidebarProfileIdentity = { userId, countryCode: profile.countryCode };
    profileName.textContent = `@${profile.username}`;
    profileFlag.textContent = countryFlagEmoji(profile.countryCode);
    profileButton.setAttribute('aria-label',
      `Your profile, ${profile.username}${profile.countryCode ? `, ${countryLabel(profile.countryCode)}` : ''}`);
  }).catch((error) => {
    if (requestId === sidebarProfileRequestId) {
      console.error('Could not load sidebar profile details:', error);
    }
  });
}

function makeAuthorizationHeader(accessToken) {
  const scheme = 'Bearer';
  return `${scheme} ${accessToken}`;
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
      ...(accessToken ? { Authorization: makeAuthorizationHeader(accessToken) } : {}),
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

async function requestServerSignup(username, email, password) {
  if (!onlineServerUrl) {
    throw new Error('Account signup is unavailable because the online server is not configured.');
  }
  const endpoint = new URL(onlineServerUrl);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  endpoint.pathname = '/auth/signup';
  endpoint.search = '';
  endpoint.hash = '';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
    signal: AbortSignal.timeout(10000),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable signup response.');
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

async function requestUsernameSignIn(username, password) {
  if (!onlineServerUrl) {
    throw new Error('Username sign-in is unavailable because the online server is not configured.');
  }
  const endpoint = new URL(onlineServerUrl);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  endpoint.pathname = '/auth/username';
  endpoint.search = '';
  endpoint.hash = '';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable sign-in response.');
  }
  if (!response.ok) {
    throw new Error(result.message || 'Username sign-in failed.');
  }
  return result;
}

async function requestPasswordReset() {
  const identity = document.querySelector('#online-email').value.trim();
  const status = document.querySelector('#online-auth-status');
  const isEmail = identity.includes('@');
  if ((!isEmail && !/^[A-Za-z0-9_]{3,20}$/.test(identity))
    || (isEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) || identity.length > 254))) {
    status.textContent = 'Enter the email address or username linked to your account.';
    document.querySelector('#online-email').focus();
    return;
  }
  if (!onlineServerUrl) {
    status.textContent = 'Password recovery is unavailable because the online server is not configured.';
    return;
  }
  const endpoint = new URL(onlineServerUrl);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  endpoint.pathname = '/auth/recover';
  endpoint.search = '';
  endpoint.hash = '';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity,
        redirectTo: `${location.origin}${location.pathname}`,
      }),
    });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('The online server returned an unreadable password-recovery response.');
    }
    if (!response.ok) throw new Error(result.message || 'Password recovery is unavailable.');
    passwordRecoveryCodeMode = true;
    document.querySelector('#online-recovery-code').value = '';
    updateAccountUI('If an account exists for that email or username, a six-digit recovery code has been sent to its linked email address.');
    document.querySelector('#online-recovery-code').focus();
  } catch (error) {
    console.error('Password reset request failed:', error);
    status.textContent = error.message || 'Could not request a password reset. Please try again.';
  }
}

async function verifyPasswordRecoveryCode() {
  const endpoint = new URL(onlineServerUrl);
  endpoint.protocol = endpoint.protocol === 'wss:' ? 'https:' : 'http:';
  endpoint.pathname = '/auth/verify-recovery';
  endpoint.search = '';
  endpoint.hash = '';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identity: document.querySelector('#online-email').value.trim(),
      token: document.querySelector('#online-recovery-code').value.trim(),
    }),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable recovery response.');
  }
  if (!response.ok) throw new Error(result.message || 'The recovery code is invalid or expired.');
  passwordRecoveryCodeMode = false;
  passwordRecoveryMode = true;
  saveAuthSession(result);
  updateAccountUI('Code verified. Choose a new password for your account.');
}

async function updateRecoveredPassword(password) {
  if (!authSession?.access_token) {
    throw new Error('Your password reset link has expired. Request a new reset email.');
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: makeAuthorizationHeader(authSession.access_token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });
  let user;
  try {
    user = await response.json();
  } catch {
    throw new Error(`Account service returned an unreadable response (${response.status}).`);
  }
  if (!response.ok) {
    const detail = user.msg || user.message || user.error_description || user.error;
    throw new Error(typeof detail === 'string' ? detail : 'Could not update your password.');
  }
  passwordRecoveryMode = false;
  passwordRecoveryCodeMode = false;
  saveAuthSession({ ...authSession, user });
  document.querySelector('#online-account-password').value = '';
  updateAccountUI('Password updated. Your account is ready to use.');
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
  if (passwordRecoveryCodeMode) {
    const code = document.querySelector('#online-recovery-code').value.trim();
    const status = document.querySelector('#online-auth-status');
    if (!/^\d{6}$/.test(code)) {
      status.textContent = 'Enter the six-digit code from your recovery email.';
      return;
    }
    const submit = document.querySelector('#online-auth-submit');
    submit.disabled = true;
    status.textContent = 'Verifying your recovery code…';
    try {
      await verifyPasswordRecoveryCode();
    } catch (error) {
      console.error('Password recovery code verification failed:', error);
      status.textContent = error.message || 'Could not verify the recovery code. Please try again.';
    } finally {
      submit.disabled = false;
    }
    return;
  }
  if (passwordRecoveryMode) {
    const newPassword = document.querySelector('#online-account-password').value;
    const status = document.querySelector('#online-auth-status');
    if (newPassword.length < 8 || newPassword.length > 72) {
      status.textContent = 'Passwords must be between 8 and 72 characters.';
      return;
    }
    const submit = document.querySelector('#online-auth-submit');
    submit.disabled = true;
    status.textContent = 'Updating your password…';
    try {
      await updateRecoveredPassword(newPassword);
    } catch (error) {
      console.error('Password update failed:', error);
      status.textContent = error.message || 'Could not update your password. Request a new reset link and try again.';
    } finally {
      submit.disabled = false;
    }
    return;
  }
  const identity = document.querySelector('#online-email').value.trim();
  const email = identity.toLowerCase();
  const emailInput = document.querySelector('#online-email');
  const password = document.querySelector('#online-account-password').value;
  const username = document.querySelector('#online-username').value.trim();
  const status = document.querySelector('#online-auth-status');
  const submit = document.querySelector('#online-auth-submit');
  if (!supabaseUrl || !supabaseAnonKey) {
    status.textContent = 'Online accounts are not configured yet. The owner needs to finish the free hosting setup.';
    return;
  }
  const usernameSignIn = authMode === 'signin' && !identity.includes('@');
  const validSignInEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity) && identity.length <= 254;
  const validIdentity = authMode === 'signup'
    ? emailInput.checkValidity()
    : usernameSignIn
      ? /^[A-Za-z0-9_]{3,20}$/.test(identity)
      : validSignInEmail;
  if (!validIdentity || !password) {
    status.textContent = authMode === 'signin'
      ? 'Enter a valid email address or username and password.'
      : 'Enter a valid email address and password.';
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
      const session = await requestServerSignup(username, email, password);
      if (!session.access_token || !session.refresh_token) {
        document.querySelector('#online-account-password').value = '';
        authMode = 'signin';
        updateAccountUI(`Confirmation email sent to ${email}. Open its link to verify your account, then sign in here. You do not need to create another account.`);
        return;
      }
      saveAuthSession(session);
      document.querySelector('#online-account-password').value = '';
      status.textContent = `Account created and signed in as @${username}.`;
      accountDialog.close();
      openOnlineDialog('friends');
    } else {
      const session = usernameSignIn
        ? await requestUsernameSignIn(identity, password)
        : await requestSupabaseAuth('token?grant_type=password', { email, password });
      if (!session.access_token || !session.refresh_token) {
        throw new Error('Sign-in did not return a session. Check the email and password, then try again.');
      }
      saveAuthSession(session);
      document.querySelector('#online-account-password').value = '';
      status.textContent = 'Signed in. You can now join or create a lobby.';
      accountDialog.close();
      openOnlineDialog('friends');
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
  const availableRooms = publicRooms;
  if (!availableRooms.length) {
    const empty = document.createElement('p');
    empty.className = 'public-room-empty';
    empty.textContent = 'No public games right now. Create one and invite someone to join.';
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
      ? `Live game · ${room.code}`
      : `Waiting for a player · ${room.code}`;
    const connectToRoom = (action) => {
      const password = room.locked ? window.prompt(`Password for “${room.name}”`) : '';
      if (room.locked && password === null) return;
      connectToOnlineRoom(action, room.code, password || '');
    };
    copy.append(name, details);
    if (room.host) {
      details.textContent = room.inProgress
        ? `${playerNameWithCountry(room.host, room.hostCountryCode)}${room.hostOnline ? '' : ' (reconnecting)'} vs ${room.opponent ? playerNameWithCountry(room.opponent, room.opponentCountryCode) : '…'}${room.opponentOnline ? '' : ' (reconnecting)'} · ${room.locked ? 'Password required · ' : ''}${room.code}`
        : `Hosted by ${playerNameWithCountry(room.host, room.hostCountryCode)}${room.hostOnline ? '' : ' (reconnecting)'} · ${room.locked ? 'Password required · ' : ''}${room.code}`;
    }
    const spectatorCount = document.createElement('span');
    spectatorCount.className = 'public-room-spectator-count';
    spectatorCount.textContent = `Spectators: ${room.spectators || 0}`;
    copy.append(spectatorCount);
    const canReconnect = (room.host === onlinePlayerName && !room.hostOnline)
      || (room.opponent === onlinePlayerName && !room.opponentOnline);
    const canJoin = canReconnect || room.canJoin === true
      || (!room.isYourGame && room.canJoin === undefined
        && (room.joinable || (!room.inProgress && room.joinable === undefined)));
    if (canJoin) {
      const join = document.createElement('button');
      join.className = 'primary-button';
      join.type = 'button';
      join.textContent = canReconnect ? 'Reconnect' : 'Join';
      join.addEventListener('click', () => connectToRoom('join-public'));
      card.append(copy, join);
    } else {
      card.append(copy);
    }
    if (room.canWatch !== false && !room.isYourGame) {
      const watch = document.createElement('button');
      watch.className = room.inProgress ? 'primary-button' : 'secondary-button';
      watch.type = 'button';
      watch.textContent = 'Watch';
      watch.addEventListener('click', () => connectToRoom('watch'));
      card.append(watch);
    }
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

function openOnlineDialog(tab = 'friends') {
  selectOnlineTab(tab);
  onlineDialog.showModal();
}

function openAccountDialog(mode = authMode) {
  if (!authSession?.access_token) authMode = mode;
  updateAccountUI();
  accountDialog.showModal();
}

const sidebarSections = {
  play: {
    title: 'Play',
    items: [
      { icon: '♟', label: 'Computer', action: 'computer' },
      { icon: '♟', label: 'Play Online', action: 'online' },
      { icon: '♟', label: 'Play Bots', action: 'bots' },
      { icon: '✦', label: 'Play Coach', action: 'coach' },
      { icon: '🏅', label: 'Tournaments', action: 'coming-soon' },
      { icon: '♞', label: 'Variants', action: 'variants' },
      { icon: '▤', label: 'Game History', action: 'history' },
    ],
  },
  puzzles: {
    title: 'Puzzles',
    items: [
      { icon: '🧩', label: 'Puzzle', action: 'puzzle' },
      { icon: '🟩', label: 'Daily Puzzle', action: 'daily-puzzle' },
      { icon: '⚡', label: 'Puzzle Rush', action: 'coming-soon' },
      { icon: '⚔', label: 'Puzzle Battle', action: 'coming-soon' },
      { icon: '▧', label: 'Custom Puzzles', action: 'coming-soon' },
    ],
  },
  learn: {
    title: 'Learn',
    items: [
      { icon: '🎓', label: 'Beginner Tutorial', action: 'tutorial' },
      { icon: '📘', label: 'Opening & Move Notes', action: 'opening-notes' },
      { icon: '♟', label: 'Chess Rules', action: 'rules' },
    ],
  },
  train: {
    title: 'Train',
    items: [
      { icon: '⌕', label: 'Analyze Position', action: 'analysis' },
      { icon: '✦', label: 'Suggest a Move', action: 'suggest' },
      { icon: '♟', label: 'Practice Against a Bot', action: 'bots' },
    ],
  },
  watch: {
    title: 'Watch',
    items: [
      { icon: '◉', label: 'Public Games', action: 'watch' },
      { icon: '⌕', label: 'Watch by Invite Code', action: 'watch-invite' },
    ],
  },
  community: {
    title: 'Community',
    items: [
      { icon: '♙', label: 'Player Profiles', action: 'profiles' },
    ],
  },
  other: {
    title: 'Other',
    items: [
      { icon: '♞', label: 'Custom Variants', action: 'variants' },
      { icon: '▤', label: 'Game History', action: 'history' },
      { icon: '♪', label: 'Sound Settings', action: 'settings' },
      { icon: '?', label: 'Help & Support', action: 'help' },
    ],
  },
};

function renderSidebarSubmenu(section) {
  const submenu = document.querySelector('#sidebar-submenu');
  const menu = sidebarSections[section];
  if (!menu) return;
  submenu.replaceChildren();
  const submenuHeader = document.createElement('div');
  submenuHeader.className = 'sidebar-submenu-header';
  const heading = document.createElement('h2');
  heading.textContent = menu.title;
  const closeButton = document.createElement('button');
  closeButton.className = 'sidebar-submenu-close';
  closeButton.type = 'button';
  closeButton.dataset.closeSubmenu = '';
  closeButton.setAttribute('aria-label', 'Close submenu');
  closeButton.textContent = '×';
  submenuHeader.append(heading, closeButton);
  submenu.append(submenuHeader);
  for (const item of menu.items) {
    const button = document.createElement('button');
    button.className = 'sidebar-submenu-item';
    button.type = 'button';
    button.dataset.menuAction = item.action;
    const icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = item.icon;
    const label = document.createElement('span');
    label.textContent = item.label;
    button.append(icon, label);
    submenu.append(button);
  }
  submenu.hidden = false;
}

function closeSidebar() {
  const sidebar = document.querySelector('#site-sidebar');
  if (!sidebar.classList.contains('open')) return;
  closeSocialPanel();
  sidebar.classList.remove('open');
  document.querySelector('#sidebar-submenu').hidden = true;
  document.querySelectorAll('.sidebar-section').forEach((button) => {
    button.classList.remove('active');
    button.setAttribute('aria-expanded', 'false');
  });
  sidebar.setAttribute('aria-hidden', 'true');
  sidebar.inert = true;
  document.querySelector('#sidebar-backdrop').hidden = true;
  const menuToggle = document.querySelector('#menu-toggle');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Open navigation menu');
  menuToggle.textContent = '☰';
  document.body.classList.remove('sidebar-open');
  menuToggle.focus();
}

function renderAppPage() {
  const params = new URLSearchParams(location.search);
  const isProfilesPage = params.get('page') === 'profiles';
  gamePage.hidden = isProfilesPage;
  profilesPage.hidden = !isProfilesPage;
  if (!isProfilesPage) return;
  const username = params.get('username');
  document.querySelector('#profile-search-input').value = username || '';
  if (username && /^[A-Za-z0-9_]{3,20}$/.test(username)) {
    loadPlayerProfile(username);
  } else if (authSession?.access_token) {
    loadPlayerProfile();
  } else {
    document.querySelector('#profile-card').hidden = true;
    document.querySelector('#profile-status').textContent =
      'Search public player profiles by username.';
  }
}

function navigateToAppPage(page = '', username = '', replace = false) {
  const url = new URL(location.href);
  if (page) url.searchParams.set('page', page);
  else url.searchParams.delete('page');
  if (username) url.searchParams.set('username', username);
  else url.searchParams.delete('username');
  history[replace ? 'replaceState' : 'pushState']({ page }, '', url);
  renderAppPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openProfilesPage() {
  navigateToAppPage('profiles');
  if (!authSession?.access_token) {
    document.querySelector('#profile-search-input').focus();
  }
}

function countryFlagEmoji(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode || '')) return '';
  return [...countryCode].map((letter) => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join('');
}

function playerNameWithCountry(username, countryCode) {
  const flag = countryFlagEmoji(countryCode);
  return flag ? `${flag} @${username}` : `@${username}`;
}

function countryLabel(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode || '')) return '';
  return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(countryCode);
}

async function requestSocialApi(path, method = 'GET', body) {
  const session = await getValidAuthSession();
  if (!session?.access_token) throw new Error('Sign in to use friends and messages.');
  const endpoint = profileEndpoint(path);
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: makeAuthorizationHeader(session.access_token),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('The online server returned an unreadable social response.');
  }
  if (!response.ok) throw new Error(result.message || 'The social service could not complete that request.');
  return result;
}

function showSocialView(viewName) {
  document.querySelectorAll('.social-panel-view').forEach((view) => {
    view.hidden = view.dataset.socialView !== viewName;
  });
  document.querySelector('#social-signed-out').hidden = true;
  activeSocialPanel = viewName;
  document.querySelector('#social-panel-title').textContent = ({
    friends: 'Friends',
    messages: 'Messages',
    notifications: 'Notifications',
    settings: 'Settings',
  })[viewName] || 'Social';
}

function updateSocialBadges() {
  const requests = socialOverview.incomingRequests.length;
  const unreadMessages = socialOverview.friends.reduce(
    (total, friend) => total + (Number(friend.unreadCount) || 0),
    0,
  );
  const badgeValues = {
    friends: requests,
    messages: unreadMessages,
    notifications: requests + unreadMessages + socialOverview.challengeNotifications
      .filter((challenge) => challenge.isIncoming && challenge.status === 'pending').length,
  };
  for (const [name, count] of Object.entries(badgeValues)) {
    const badge = document.querySelector(`[data-social-badge="${name}"]`);
    badge.hidden = count === 0;
    badge.textContent = count > 9 ? '9+' : String(count);
    badge.setAttribute('aria-label', `${count} ${name === 'friends' ? 'friend requests' : name === 'messages' ? 'unread messages' : 'notifications'}`);
  }
  const requestCount = document.querySelector('#friend-request-count');
  requestCount.hidden = requests === 0;
  requestCount.textContent = String(requests);
}

function appendSocialEmpty(list, message) {
  const empty = document.createElement('li');
  empty.className = 'social-empty';
  empty.textContent = message;
  list.append(empty);
}

function createSocialAvatar(username, avatarData = '') {
  const avatar = document.createElement('span');
  avatar.className = 'social-avatar';
  avatar.setAttribute('aria-hidden', 'true');
  if (avatarData?.startsWith('data:image/webp;base64,')) {
    const image = document.createElement('img');
    image.src = avatarData;
    image.alt = '';
    avatar.append(image);
  } else {
    avatar.textContent = [...username][0]?.toUpperCase() || '?';
  }
  return avatar;
}

function createSocialUserCopy(username, countryCode, detail = '') {
  const copy = document.createElement('span');
  copy.className = 'social-item-copy';
  const name = document.createElement('button');
  name.type = 'button';
  name.className = 'social-player-link';
  name.textContent = playerNameWithCountry(username, countryCode);
  name.addEventListener('click', () => {
    closeSocialPanel();
    navigateToAppPage('profiles', username);
  });
  copy.append(name);
  if (detail) {
    const secondary = document.createElement('small');
    secondary.textContent = detail;
    copy.append(secondary);
  }
  return copy;
}

function createSocialAction(label, action, primary = false) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (primary) button.className = 'social-accept';
  button.addEventListener('click', action);
  return button;
}

function renderSocialFriends() {
  const friendsList = document.querySelector('#social-friends-list');
  friendsList.replaceChildren();
  if (!socialOverview.friends.length) {
    appendSocialEmpty(friendsList, 'Your friend list is empty. Search for a player above to send a request.');
  }
  for (const friend of socialOverview.friends) {
    const row = document.createElement('li');
    row.className = 'social-list-item';
    const preview = friend.lastMessage
      ? `${friend.lastMessageFromMe ? 'You: ' : ''}${friend.lastMessage}`
      : 'You are friends';
    row.append(createSocialAvatar(friend.username, friend.avatarData), createSocialUserCopy(friend.username, friend.countryCode, preview));
    const actions = document.createElement('span');
    actions.className = 'social-item-actions';
    actions.append(createSocialAction('Message', () => openSocialConversation(friend.id)));
    row.append(actions);
    friendsList.append(row);
  }
}

function renderSocialRequests() {
  const list = document.querySelector('#social-requests-list');
  list.replaceChildren();
  if (!socialOverview.incomingRequests.length && !socialOverview.outgoingRequests.length) {
    appendSocialEmpty(list, 'No pending friend requests.');
  }
  for (const request of socialOverview.incomingRequests) {
    const row = document.createElement('li');
    row.className = 'social-list-item';
    row.append(createSocialAvatar(request.username, request.avatarData), createSocialUserCopy(request.username, request.countryCode, 'Wants to be your friend'));
    const actions = document.createElement('span');
    actions.className = 'social-item-actions';
    actions.append(
      createSocialAction('Accept', () => respondToFriendRequest(request.id, true), true),
      createSocialAction('Decline', () => respondToFriendRequest(request.id, false)),
    );
    row.append(actions);
    list.append(row);
  }
  for (const request of socialOverview.outgoingRequests) {
    const row = document.createElement('li');
    row.className = 'social-list-item';
    row.append(createSocialAvatar(request.username, request.avatarData), createSocialUserCopy(request.username, request.countryCode, 'Request sent'));
    list.append(row);
  }
}

function renderSocialConversations() {
  const list = document.querySelector('#social-conversation-list');
  list.replaceChildren();
  if (!socialOverview.friends.length) {
    const empty = document.createElement('p');
    empty.className = 'social-empty';
    empty.textContent = 'Add a friend to start a private conversation.';
    list.append(empty);
    return;
  }
  const conversationList = document.createElement('ul');
  conversationList.className = 'social-list';
  for (const friend of socialOverview.friends) {
    const row = document.createElement('li');
    row.className = 'social-list-item';
    const detail = friend.lastMessage
      ? `${friend.lastMessageFromMe ? 'You: ' : ''}${friend.lastMessage}`
      : 'Start a conversation';
    row.append(createSocialAvatar(friend.username, friend.avatarData), createSocialUserCopy(friend.username, friend.countryCode, detail));
    if (Number(friend.unreadCount) > 0) {
      const unread = document.createElement('span');
      unread.className = 'social-unread';
      unread.textContent = friend.unreadCount > 99 ? '99+' : String(friend.unreadCount);
      row.append(unread);
    }
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.setAttribute('aria-label', `Open messages with ${friend.username}`);
    row.addEventListener('click', () => openSocialConversation(friend.id));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openSocialConversation(friend.id);
      }
    });
    conversationList.append(row);
  }
  list.append(conversationList);
}

function renderSocialNotifications() {
  const list = document.querySelector('#social-notifications-list');
  list.replaceChildren();
  const notifications = [
    ...socialOverview.incomingRequests.map((request) => ({ type: 'request', item: request })),
    ...socialOverview.friends
      .filter((friend) => Number(friend.unreadCount) > 0)
      .map((friend) => ({ type: 'message', item: friend })),
    ...socialOverview.challengeNotifications.map((challenge) => ({ type: 'challenge', item: challenge })),
  ];
  if (!notifications.length) {
    appendSocialEmpty(list, 'You are all caught up. Friend requests, messages, and game challenges will appear here.');
    return;
  }
  for (const notification of notifications) {
    const { item } = notification;
    const row = document.createElement('li');
    row.className = 'social-list-item';
    const request = notification.type === 'request';
    const challenge = notification.type === 'challenge';
    const username = challenge
      ? item.isIncoming ? item.senderUsername : item.recipientUsername
      : item.username;
    const countryCode = challenge
      ? item.isIncoming ? item.senderCountryCode : item.recipientCountryCode
      : item.countryCode;
    const avatarData = challenge
      ? item.isIncoming ? item.senderAvatarData : item.recipientAvatarData
      : item.avatarData;
    let description = request
      ? 'Sent you a friend request'
      : `${item.unreadCount} unread ${Number(item.unreadCount) === 1 ? 'message' : 'messages'}`;
    if (challenge) {
      if (item.status === 'pending' && item.challengeType === 'scheduled') {
        const scheduledDate = new Date(item.scheduledAt);
        const formattedDate = Number.isNaN(scheduledDate.getTime())
          ? 'scheduled time unavailable'
          : scheduledDate.toLocaleString();
        description = item.isIncoming
          ? `Scheduled a game with you for ${formattedDate}`
          : `Scheduled challenge to @${username} · ${formattedDate}`;
      } else if (item.status === 'pending') {
        description = item.isIncoming
          ? 'Challenged you to play now'
          : `Play-now challenge sent to @${username}`;
      } else {
        description = `Challenge ${item.status}`;
      }
    }
    row.append(createSocialAvatar(username, avatarData), createSocialUserCopy(username, countryCode, description));
    const actions = document.createElement('span');
    actions.className = 'social-item-actions';
    if (challenge && item.status === 'pending' && item.isIncoming) {
      if (item.challengeType === 'now') {
        actions.append(createSocialAction('Join game', () => joinGameChallenge(item), true));
      } else {
        actions.append(createSocialAction('Accept', () => respondToGameChallenge(item.id, true), true));
      }
      actions.append(createSocialAction('Decline', () => respondToGameChallenge(item.id, false)));
    } else if (request) {
      actions.append(createSocialAction('Accept', () => respondToFriendRequest(item.id, true), true));
    } else if (notification.type === 'message') {
      actions.append(createSocialAction('Reply', () => openSocialConversation(item.id), true));
    }
    row.append(actions);
    list.append(row);
  }
}

async function refreshSocialOverview() {
  if (!authSession?.access_token) return;
  const overview = await requestSocialApi('/social/overview');
  socialOverview = {
    friends: Array.isArray(overview.friends) ? overview.friends : [],
    incomingRequests: Array.isArray(overview.incomingRequests) ? overview.incomingRequests : [],
    outgoingRequests: Array.isArray(overview.outgoingRequests) ? overview.outgoingRequests : [],
    challengeNotifications: Array.isArray(overview.challengeNotifications) ? overview.challengeNotifications : [],
    blockedUsers: Array.isArray(overview.blockedUsers) ? overview.blockedUsers : [],
    blockedBy: Array.isArray(overview.blockedBy) ? overview.blockedBy : [],
  };
  updateSocialBadges();
  renderSocialFriends();
  renderSocialRequests();
  renderSocialConversations();
  renderSocialNotifications();
}

function renderGameHistory(matches, type) {
  const list = document.querySelector('#history-list');
  list.replaceChildren();
  closeHistoryReplay();
  if (!matches.length) {
    const empty = document.createElement('li');
    empty.className = 'history-empty';
    empty.textContent = type === 'offline'
      ? 'No offline matches have been saved on this browser yet.'
      : 'No online matches have been saved to your account yet.';
    list.append(empty);
    return;
  }
  for (const match of matches) {
    const item = document.createElement('li');
    item.className = 'history-match';
    const header = document.createElement('div');
    header.className = 'history-match-heading';
    const title = document.createElement('strong');
    const result = type === 'offline'
      ? match.result
      : match.result === '1/2-1/2'
        ? 'draw'
        : (match.result === '1-0') === (match.playerColor === 'w') ? 'win' : 'loss';
    title.textContent = `${result[0].toUpperCase()}${result.slice(1)} · ${type === 'offline'
      ? match.opponent || 'Computer'
      : `@${match.opponentUsername}`}`;
    const timestamp = new Date(match.createdAt);
    const date = document.createElement('span');
    date.textContent = Number.isNaN(timestamp.getTime()) ? 'Date unavailable' : timestamp.toLocaleString();
    header.append(title, date);
    const meta = document.createElement('p');
    meta.className = 'history-match-meta';
    const resultText = type === 'offline' ? result : match.result;
    const termination = match.termination === 'checkmate'
      ? 'Checkmate'
      : match.termination === 'resignation'
        ? 'Resignation'
        : match.termination === 'time'
          ? 'Time'
          : 'Draw';
    meta.textContent = `${type === 'offline' ? 'Offline' : 'Online'} · ${termination} · ${resultText}`;
    item.append(header, meta);
    if (typeof match.pgn === 'string' && match.pgn.trim()) {
      const review = document.createElement('button');
      review.className = 'primary-button history-review-button';
      review.type = 'button';
      review.textContent = 'Review game on board';
      review.addEventListener('click', () => openHistoryReplay(match, title.textContent));
      item.append(review);
      const details = document.createElement('details');
      const summary = document.createElement('summary');
      summary.textContent = 'View moves (PGN)';
      const pgn = document.createElement('pre');
      pgn.textContent = match.pgn;
      details.append(summary, pgn);
      item.append(details);
    }
    list.append(item);
  }
}

function stopHistoryReplay() {
  if (historyReplayTimer !== null) {
    clearInterval(historyReplayTimer);
    historyReplayTimer = null;
  }
}

function closeHistoryReplay() {
  stopHistoryReplay();
  const replay = document.querySelector('#history-replay');
  if (replay) replay.hidden = true;
  const list = document.querySelector('#history-list');
  if (list) list.hidden = false;
  historyReplayGame = null;
  historyReplayInitialFen = '';
  historyReplayMoves = [];
  historyReplayIndex = 0;
  historyReplayFlipped = false;
}

function renderHistoryReplayBoard() {
  const board = document.querySelector('#history-replay-board');
  const size = historyReplayGame.board().length;
  const rows = [...Array(size).keys()];
  const cols = [...Array(size).keys()];
  if (historyReplayFlipped) {
    rows.reverse();
    cols.reverse();
  }
  board.style.setProperty('--board-size', size);
  board.replaceChildren();
  const lastMove = historyReplayIndex > 0 ? historyReplayMoves[historyReplayIndex - 1] : null;
  rows.forEach((rank, rowIndex) => {
    cols.forEach((file, colIndex) => {
      const square = `${String.fromCharCode(97 + file)}${size - rank}`;
      const piece = historyReplayGame.get(square);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      cell.dataset.square = square;
      cell.disabled = true;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}`);
      if (lastMove?.from === square || lastMove?.to === square) cell.classList.add('last-move');
      if (colIndex === 0) {
        const rankLabel = document.createElement('span');
        rankLabel.className = `coordinate rank-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        rankLabel.textContent = String(size - rank);
        cell.append(rankLabel);
      }
      if (rowIndex === size - 1) {
        const fileLabel = document.createElement('span');
        fileLabel.className = `coordinate file-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        fileLabel.textContent = String.fromCharCode(97 + file);
        cell.append(fileLabel);
      }
      if (piece) {
        const pieceElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        pieceElement.setAttribute('class', `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`);
        pieceElement.setAttribute('viewBox', '0 0 100 100');
        pieceElement.setAttribute('focusable', 'false');
        pieceElement.setAttribute('aria-hidden', 'true');
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '50');
        symbol.setAttribute('y', '82');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('font-family', pieceTheme.fontFamily);
        symbol.textContent = pieceTheme.symbols[piece.color][piece.type];
        pieceElement.append(symbol);
        cell.append(pieceElement);
      }
      board.append(cell);
    });
  });
}

function renderHistoryReplayMoves() {
  const moves = document.querySelector('#history-replay-moves');
  moves.replaceChildren();
  for (let index = 0; index < historyReplayMoves.length; index += 2) {
    const row = document.createElement('div');
    row.className = 'history-replay-move-row';
    const number = document.createElement('span');
    number.className = 'history-replay-move-number';
    number.textContent = `${Math.floor(index / 2) + 1}.`;
    row.append(number);
    for (let offset = 0; offset < 2 && index + offset < historyReplayMoves.length; offset += 1) {
      const ply = index + offset + 1;
      const move = historyReplayMoves[index + offset];
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = move.san;
      button.className = 'history-replay-move';
      button.setAttribute('aria-label', `${ply % 2 ? 'White' : 'Black'} move ${Math.ceil(ply / 2)}: ${move.san}`);
      if (historyReplayIndex === ply) button.classList.add('active');
      button.addEventListener('click', () => setHistoryReplayPosition(ply));
      row.append(button);
    }
    moves.append(row);
  }
}

function renderHistoryReplay() {
  renderHistoryReplayBoard();
  const position = document.querySelector('#history-replay-position');
  if (historyReplayIndex === 0) {
    position.textContent = 'Starting position';
  } else {
    const move = historyReplayMoves[historyReplayIndex - 1];
    position.textContent = `Move ${Math.ceil(historyReplayIndex / 2)} · ${move.color === 'w' ? 'White' : 'Black'} played ${move.san}`;
  }
  const seek = document.querySelector('#history-replay-seek');
  seek.max = String(historyReplayMoves.length);
  seek.value = String(historyReplayIndex);
  document.querySelector('#history-replay-first').disabled = historyReplayIndex === 0;
  document.querySelector('#history-replay-previous').disabled = historyReplayIndex === 0;
  document.querySelector('#history-replay-next').disabled = historyReplayIndex === historyReplayMoves.length;
  document.querySelector('#history-replay-last').disabled = historyReplayIndex === historyReplayMoves.length;
  const play = document.querySelector('#history-replay-play');
  play.textContent = historyReplayTimer === null ? '▶' : 'Ⅱ';
  play.setAttribute('aria-label', historyReplayTimer === null ? 'Play replay' : 'Pause replay');
  play.title = historyReplayTimer === null ? 'Play replay' : 'Pause replay';
  play.disabled = historyReplayMoves.length === 0 || historyReplayIndex === historyReplayMoves.length;
  renderHistoryReplayMoves();
}

function setHistoryReplayPosition(index) {
  stopHistoryReplay();
  historyReplayIndex = Math.max(0, Math.min(historyReplayMoves.length, index));
  document.querySelector('#history-replay-error').textContent = '';
  const fullGame = new Chess(historyReplayInitialFen);
  for (let moveIndex = 0; moveIndex < historyReplayIndex; moveIndex += 1) {
    const move = historyReplayMoves[moveIndex];
    if (!fullGame.move({ from: move.from, to: move.to, promotion: move.promotion })) {
      throw new Error(`Could not replay move ${moveIndex + 1} (${move.san}).`);
    }
  }
  historyReplayGame = fullGame;
  renderHistoryReplay();
}

function openHistoryReplay(match, label) {
  stopHistoryReplay();
  historyReplayMoves = [];
  historyReplayGame = null;
  historyReplayInitialFen = '';
  historyReplayIndex = 0;
  document.querySelector('#history-replay-title').textContent = label;
  document.querySelector('#history-replay-error').textContent = '';
  const replayGame = new Chess();
  if (!replayGame.load_pgn(match.pgn)) {
    const error = document.querySelector('#history-replay-error');
    error.textContent = 'This saved game contains moves that could not be replayed.';
    document.querySelector('#history-replay').hidden = false;
    document.querySelector('#history-list').hidden = true;
    return;
  }
  historyReplayMoves = replayGame.history({ verbose: true });
  while (replayGame.history().length) replayGame.undo();
  historyReplayGame = replayGame;
  historyReplayInitialFen = replayGame.fen();
  historyReplayIndex = 0;
  historyReplayFlipped = false;
  document.querySelector('#history-replay-title').textContent = label;
  document.querySelector('#history-replay-error').textContent = '';
  document.querySelector('#history-replay').hidden = false;
  document.querySelector('#history-list').hidden = true;
  renderHistoryReplay();
}

function playHistoryReplay() {
  if (historyReplayTimer !== null) {
    stopHistoryReplay();
    renderHistoryReplay();
    return;
  }
  if (historyReplayIndex >= historyReplayMoves.length) setHistoryReplayPosition(0);
  const interval = Number(document.querySelector('#history-replay-speed').value);
  historyReplayTimer = setInterval(() => {
    if (historyReplayIndex >= historyReplayMoves.length) {
      stopHistoryReplay();
      renderHistoryReplay();
      return;
    }
    const move = historyReplayMoves[historyReplayIndex];
    if (!historyReplayGame.move({ from: move.from, to: move.to, promotion: move.promotion })) {
      stopHistoryReplay();
      document.querySelector('#history-replay-error').textContent =
        `Could not replay move ${historyReplayIndex + 1} (${move.san}).`;
      renderHistoryReplay();
      return;
    }
    historyReplayIndex += 1;
    if (historyReplayIndex === historyReplayMoves.length) stopHistoryReplay();
    renderHistoryReplay();
  }, interval);
  renderHistoryReplay();
}

async function loadGameHistory(type = activeHistoryType) {
  closeHistoryReplay();
  activeHistoryType = type;
  document.querySelectorAll('[data-history-kind]').forEach((button) => {
    const active = button.dataset.historyKind === type;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  const status = document.querySelector('#history-status');
  const signInButton = document.querySelector('#history-signin');
  signInButton.hidden = true;
  if (type === 'offline') {
    try {
      const saved = JSON.parse(localStorage.getItem(offlineGameHistoryStorageKey()) || '[]');
      if (!Array.isArray(saved)) throw new Error('Saved offline match history has an invalid format.');
      renderGameHistory(saved.filter((match) => match && typeof match.pgn === 'string'), type);
      status.textContent = 'Offline matches are stored in this browser and are separate from online matches.';
    } catch (error) {
      console.error('Could not load offline match history:', error);
      status.textContent = error.message || 'Could not load offline match history.';
      document.querySelector('#history-list').replaceChildren();
    }
    return;
  }
  if (!authSession?.access_token) {
    status.textContent = 'Sign in to load online matches saved to your account.';
    document.querySelector('#history-list').replaceChildren();
    signInButton.hidden = false;
    return;
  }
  status.textContent = 'Loading online matches…';
  try {
    const matches = await requestSocialApi('/social/history/online');
    renderGameHistory(Array.isArray(matches) ? matches : [], type);
    status.textContent = 'Online matches are saved to your account and are separate from offline matches.';
  } catch (error) {
    console.error('Could not load online match history:', error);
    status.textContent = error.message || 'Could not load online match history.';
    document.querySelector('#history-list').replaceChildren();
  }
}

function openGameHistory() {
  if (!document.querySelector('#history-dialog').open) {
    activeHistoryType = 'offline';
    document.querySelector('#history-dialog').showModal();
  }
  void loadGameHistory(activeHistoryType);
}

async function refreshSocialPanel() {
  if (!authSession?.access_token) {
    document.querySelectorAll('.social-panel-view').forEach((view) => { view.hidden = true; });
    document.querySelector('#social-signed-out').hidden = false;
    document.querySelector('#social-panel-status').textContent = '';
    document.querySelector('#social-panel-title').textContent = 'Sign in required';
    return;
  }
  document.querySelector('#social-panel-status').textContent = 'Refreshing…';
  try {
    await refreshSocialOverview();
    document.querySelector('#social-panel-status').textContent = '';
    if (activeSocialPanel === 'messages') renderSocialConversations();
  } catch (error) {
    console.error('Could not refresh social features:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Social features are temporarily unavailable.';
  }
}

function openSocialPanel(panelName) {
  if (activeSocialPanel === panelName && !socialPanel.hidden) {
    closeSocialPanel();
    return;
  }
  showSocialView(panelName);
  socialPanel.hidden = false;
  document.querySelectorAll('[data-social-panel]').forEach((button) => {
    const active = button.dataset.socialPanel === panelName;
    button.setAttribute('aria-expanded', String(active));
  });
  if (panelName === 'settings') {
    document.querySelector('#dock-board-theme').value = boardThemeSelect.value;
    document.querySelector('#dock-interface-theme').value = interfaceThemeSelect.value;
    document.querySelector('#dock-sound-toggle').checked = soundToggle.checked;
    document.querySelector('#dock-country-save').disabled = !authSession?.access_token;
    document.querySelector('#social-account-settings').textContent = authSession?.access_token
      ? `Account · ${authUsername || authSession.user?.email || 'signed in'}`
      : 'Sign in or create an account';
    document.querySelector('#dock-country-status').textContent = authSession?.access_token
      ? 'Choose the country flag shown beside your username.'
      : 'Sign in to set your profile country.';
    if (authSession?.access_token) {
      requestPlayerProfile().then((profile) => {
        document.querySelector('#dock-country-select').value = profile.countryCode || '';
      }).catch((error) => {
        console.error('Could not load profile country for settings:', error);
        document.querySelector('#dock-country-status').textContent = error.message || 'Could not load your profile country.';
      });
    } else {
      document.querySelector('#dock-country-select').value = '';
    }
  } else {
    refreshSocialPanel();
  }
}

function closeSocialPanel() {
  socialPanel.hidden = true;
  activeSocialPanel = '';
  document.querySelectorAll('[data-social-panel]').forEach((button) => {
    button.setAttribute('aria-expanded', 'false');
  });
}

async function respondToFriendRequest(requestId, accept) {
  document.querySelector('#social-panel-status').textContent = accept ? 'Adding friend…' : 'Declining request…';
  try {
    await requestSocialApi('/social/friends/respond', 'POST', { requestId, accept });
    await refreshSocialOverview();
    document.querySelector('#social-panel-status').textContent = accept ? 'Friend added.' : 'Request declined.';
    if (activeSocialTab === 'requests' && accept) selectSocialFriendsTab('friends');
  } catch (error) {
    console.error('Could not update friend request:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Could not update friend request.';
  }
}

function selectSocialFriendsTab(tab) {
  activeSocialTab = tab;
  const friendsSelected = tab === 'friends';
  document.querySelectorAll('[data-friends-tab]').forEach((button) => {
    const active = button.dataset.friendsTab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  document.querySelector('#friend-request-form').hidden = !friendsSelected;
  document.querySelector('#social-friends-list').hidden = !friendsSelected;
  document.querySelector('#social-requests-list').hidden = friendsSelected;
}

async function sendFriendRequest(username) {
  document.querySelector('#social-panel-status').textContent = 'Searching for player…';
  try {
    const result = await requestSocialApi('/social/friends/request', 'POST', { username });
    await refreshSocialOverview();
    if (result.status === 'incoming') {
      selectSocialFriendsTab('requests');
      document.querySelector('#social-panel-status').textContent = 'This player already sent you a request. Review it in Requests.';
    } else if (result.status === 'already_friends') {
      document.querySelector('#social-panel-status').textContent = `You are already friends with @${username}.`;
    } else {
      document.querySelector('#social-panel-status').textContent = 'Friend request sent.';
    }
  } catch (error) {
    console.error('Could not send friend request:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Could not send friend request.';
  }
}

async function openSocialConversation(friendId) {
  const friend = socialOverview.friends.find((entry) => entry.id === friendId);
  if (!friend) return;
  activeSocialConversation = friend;
  document.querySelector('#social-conversation-name').textContent =
    playerNameWithCountry(friend.username, friend.countryCode);
  document.querySelector('#social-conversation-list').hidden = true;
  const conversation = document.querySelector('#social-conversation');
  conversation.hidden = false;
  document.querySelector('#social-message-input').focus();
  await loadSocialMessages(friend);
}

async function loadSocialMessages(friend) {
  const list = document.querySelector('#social-message-list');
  list.replaceChildren();
  try {
    const messages = await requestSocialApi(`/social/messages/${encodeURIComponent(friend.id)}`);
    for (const message of messages) {
      const item = document.createElement('li');
      item.className = `social-message${message.senderId === authSession?.user?.id ? ' mine' : ''}`;
      const content = document.createElement('span');
      content.textContent = message.body;
      const timestamp = document.createElement('time');
      timestamp.dateTime = message.createdAt;
      const date = new Date(message.createdAt);
      timestamp.textContent = Number.isNaN(date.getTime())
        ? ''
        : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      item.append(content, timestamp);
      list.append(item);
    }
    if (!messages.length) appendSocialEmpty(list, 'Say hello to start the conversation.');
    list.scrollTop = list.scrollHeight;
    await refreshSocialOverview();
  } catch (error) {
    console.error('Could not load direct messages:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Could not load this conversation.';
  }
}

function runSidebarAction(action) {
  closeSidebar();
  if (action === 'computer') {
    navigateToAppPage();
    document.querySelector('#game').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else if (action === 'online') openOnlineDialog('friends');
  else if (action === 'watch') openOnlineDialog('public');
  else if (action === 'watch-invite') openOnlineDialog('friends');
  else if (action === 'bots') botDirectory.showModal();
  else if (action === 'signup') openAccountDialog('signup');
  else if (action === 'login') openAccountDialog('signin');
  else if (action === 'profile') openProfilesPage();
  else if (action === 'profiles') openProfilesPage();
  else if (action === 'puzzle') startPuzzle();
  else if (action === 'daily-puzzle') startDailyPuzzle();
  else if (action === 'tutorial') openBeginnerTutorial();
  else if (action === 'rules') openChessRules();
  else if (action === 'analysis') document.querySelector('#analysis-open').click();
  else if (action === 'suggest') document.querySelector('#suggest-move').click();
  else if (action === 'variants') customRulesDialog.showModal();
  else if (action === 'history') openGameHistory();
  else if (action === 'opening-notes') document.querySelector('.game-insights').scrollIntoView({ behavior: 'smooth', block: 'center' });
  else if (action === 'settings') {
    renderSoundSettings();
    soundSettingsDialog.showModal();
  } else if (action === 'coach') {
    document.querySelector('.game-insights').scrollIntoView({ behavior: 'smooth', block: 'center' });
    showMessage('Coach notes', 'Move insights appear beside your move history after you play. Try Suggest a Move for a local position hint.');
  } else if (action === 'help') {
    showMessage('Openboard help', 'Choose a menu section to find bots, online games, puzzles, move analysis, variants, and player profiles.');
  } else if (action === 'coming-soon') {
    showMessage('Not available yet', 'This feature is not part of Openboard yet.');
  }
}

document.querySelector('#menu-toggle').addEventListener('click', () => {
  const sidebar = document.querySelector('#site-sidebar');
  if (sidebar.classList.contains('open')) {
    closeSidebar();
    return;
  }
  document.querySelector('#sidebar-submenu').hidden = true;
  sidebar.classList.add('open');
  sidebar.setAttribute('aria-hidden', 'false');
  sidebar.inert = false;
  document.querySelector('#sidebar-backdrop').hidden = false;
  const menuToggle = document.querySelector('#menu-toggle');
  menuToggle.setAttribute('aria-expanded', 'true');
  menuToggle.setAttribute('aria-label', 'Close navigation menu');
  menuToggle.textContent = '×';
  document.body.classList.add('sidebar-open');
  document.querySelector('#sidebar-close').focus();
});
document.querySelector('#sidebar-close').addEventListener('click', closeSidebar);
document.querySelector('#sidebar-backdrop').addEventListener('click', closeSidebar);
document.querySelector('#site-sidebar').addEventListener('click', (event) => {
  if (event.target.closest('[data-close-submenu]')) {
    document.querySelector('#sidebar-submenu').hidden = true;
    document.querySelectorAll('.sidebar-section').forEach((button) => {
      button.classList.remove('active');
      button.setAttribute('aria-expanded', 'false');
    });
    return;
  }
  const sectionButton = event.target.closest('[data-menu-section]');
  if (sectionButton) {
    const section = sectionButton.dataset.menuSection;
    const submenu = document.querySelector('#sidebar-submenu');
    const isCurrentSection = sectionButton.classList.contains('active');
    document.querySelectorAll('.sidebar-section').forEach((button) => {
      const active = button === sectionButton && !(isCurrentSection && !submenu.hidden);
      button.classList.toggle('active', active);
      button.setAttribute('aria-expanded', String(active));
    });
    if (isCurrentSection && !submenu.hidden) {
      submenu.hidden = true;
    } else {
      renderSidebarSubmenu(section);
    }
    return;
  }
  const actionButton = event.target.closest('[data-menu-action]');
  if (actionButton && !actionButton.disabled) runSidebarAction(actionButton.dataset.menuAction);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSidebar();
});

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
  updateOnlineSuggestionAvailability();
  document.querySelector('#opponent-card').hidden = active;
  document.querySelector('#opponent-name').textContent = active
    ? spectating ? 'Spectating' : 'Friend'
    : bots[difficultySelect.value].name;
  document.querySelector('.panel-header .live-indicator').lastChild.textContent = active ? ' ONLINE' : ' LOCAL';
}

function setOnlineCreatePending(pending) {
  onlineCreatePending = pending;
  const disabled = pending || (onlineMode && Boolean(onlineRoomCode));
  document.querySelector('#online-host').disabled = disabled;
  document.querySelector('#online-create-public').disabled = disabled;
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
    name.textContent = playerNameWithCountry(message.name, message.countryCode);
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
  document.querySelector('#online-game-actions').hidden = !active;
  updateSpectatorCount(0);
  setOnlineCreatePending(onlineCreatePending);
  if (active) suggestedMove = null;
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
    if (onlineCreatePending) setOnlineCreatePending(false);
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
    onlinePlayerCountryCode = message.countryCode || null;
    authUsername = message.username;
    document.querySelector('#online-account-state').textContent =
      `Signed in as ${playerNameWithCountry(onlinePlayerName, message.countryCode)}`;
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
    setOnlineCreatePending(false);
    onlineRoomCode = message.code;
    saveOnlineRoomCode(onlineRoomCode);
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
        ...(onlinePlayerCountryCode ? { hostCountryCode: onlinePlayerCountryCode } : {}),
        locked: Boolean(message.locked),
        inProgress: false,
        isYourGame: true,
        canJoin: false,
        canWatch: false,
        spectators: 0,
      }, ...publicRooms.filter((room) => room.code !== onlineRoomCode)];
    }
    startNewGame();
    updateOnlineStatus(message.isPublic
      ? 'Public lobby created. It is listed for signed-in players.'
      : 'Private lobby created. Share the invite code with your friend.');
    renderPublicRooms();
    renderBoard();
    void sendProfileChallengeInvite(onlineRoomCode);
    onlineDialog.close();
    return;
  }
  if (message.type === 'left-room') {
    finishDisconnectOnlineGame(socket);
    return;
  }
  if (message.type === 'game-start') {
    onlineRoomCode = message.code;
    updateSpectatorCount(message.spectators);
    saveOnlineRoomCode(onlineRoomCode);
    if (onlineOpponentLeftDialog.open) onlineOpponentLeftDialog.close();
    document.querySelector('#online-wait-reconnect').hidden = false;
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
      const otherColor = playerColor === 'w' ? 'b' : 'w';
      const otherName = playerNameWithCountry(message.players[otherColor], message.playerCountries?.[otherColor]);
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
    void acknowledgeJoinedGameChallenge();
    onlineDialog.close();
    return;
  }
  if (message.type === 'spectator-start') {
    onlineRoomCode = message.code;
    updateSpectatorCount(message.spectators);
    onlineReady = true;
    playerColor = 'w';
    playColorSelect.value = playerColor;
    flipped = false;
    if (message.players) {
      document.querySelector('#opponent-name').textContent = 'Spectating';
      document.querySelector('#bot-profile-name').textContent =
        `${message.players.w ? playerNameWithCountry(message.players.w, message.playerCountries?.w) : 'White'} vs ${message.players.b ? playerNameWithCountry(message.players.b, message.playerCountries?.b) : 'Black'}`;
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
    updateSpectatorCount(message.count);
    updateOnlineStatus(onlineSpectating
      ? `Spectating · ${watching}.`
      : `Online game · ${watching}.`);
    return;
  }
  if (message.type === 'rating-updated') {
    updateOnlineStatus('Game result saved. Your online Elo estimate and profile record are updated.');
    if (!profilesPage.hidden) loadPlayerProfile();
    return;
  }
  if (message.type === 'rating-update-failed') {
    updateOnlineStatus('The game ended, but the online rating could not be saved. Check that the server rating schema is installed.');
    return;
  }
  if (message.type === 'rating-not-counted') {
    updateOnlineStatus('Game ended before the first move, so it was not rated.');
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
    const departureMessage = onlineSpectating
      ? 'A player disconnected. They can reconnect, or another player can take their seat and start a new game.'
      : 'Your opponent disconnected. They can reconnect, or another player can take their seat and start a new game.';
    document.querySelector('#online-opponent-left-message').textContent =
      `${departureMessage} A replacement starts from the initial board. Choose Keep waiting to stay in the room.`;
    if (!onlineOpponentLeftDialog.open) onlineOpponentLeftDialog.showModal();
    if (onlineSpectating) {
      updateOnlineStatus(departureMessage);
      gameMessage.textContent = 'A player disconnected.';
      renderBoard();
      return;
    }
    onlineReady = false;
    updateOnlineSuggestionAvailability();
    pendingPremove = null;
    updateOnlineStatus(departureMessage);
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
    updateOnlineSuggestionAvailability();
    updateOnlineChatAvailability();
    updateOnlineStatus('The game ended because both players disconnected.');
    gameMessage.textContent = 'The game is no longer active.';
    document.querySelector('#online-opponent-left-message').textContent =
      'The room expired and can no longer be rejoined. Return to the main screen.';
    document.querySelector('#online-wait-reconnect').hidden = true;
    if (!onlineOpponentLeftDialog.open) onlineOpponentLeftDialog.showModal();
    renderBoard();
  }
}

async function connectToOnlineRoom(action, roomCode = null, roomPassword = '') {
  const isCreateAction = action === 'create' || action === 'create-public';
  if (onlineCreatePending) {
    updateOnlineStatus('Lobby creation is already in progress. Please wait for it to finish.');
    return;
  }
  if (isCreateAction && onlineMode && onlineRoomCode) {
    updateOnlineStatus(`You already have room ${onlineRoomCode} open. Disconnect from it before creating another lobby.`);
    return;
  }
  if (activeBoardSize !== 8 && action !== 'browse') {
    updateOnlineStatus('Online rooms currently use the standard 8×8 board. Select 8×8 in Custom rules before creating or joining a room.');
    return;
  }
  if (action === 'browse' && onlineSocket?.readyState === WebSocket.OPEN) {
    requestPublicRooms();
    return;
  }
  if (isCreateAction) setOnlineCreatePending(true);
  if (onlineSocket) {
    onlineSocket.close();
    onlineSocket = null;
  }
  let endpoint;
  try {
    const session = await getValidAuthSession();
    if (!session?.access_token) {
      if (isCreateAction) setOnlineCreatePending(false);
      updateOnlineStatus('Create an account and sign in before using online play.');
      document.querySelector('#online-email').focus();
      return;
    }
    if (!onlineServerUrl) throw new Error('The owner has not connected the online server yet.');
    endpoint = new URL(onlineServerUrl);
    if (!['ws:', 'wss:'].includes(endpoint.protocol)) throw new Error('Use a ws:// or wss:// server URL.');
    if (!endpoint.pathname || endpoint.pathname === '/') endpoint.pathname = '/ws';
  } catch (error) {
    if (isCreateAction) setOnlineCreatePending(false);
    updateOnlineStatus(error.message || 'Enter a valid online room server URL.');
    return;
  }
  let pendingRequest;
  if (isCreateAction) {
    const lobbyName = document.querySelector('#online-lobby-name').value.trim();
    if (!lobbyName) {
      setOnlineCreatePending(false);
      updateOnlineStatus('Enter a lobby name before creating it.');
      document.querySelector('#online-lobby-name').focus();
      return;
    }
    if (document.querySelector('#online-password-enabled').checked
      && !document.querySelector('#online-lobby-password').value) {
      setOnlineCreatePending(false);
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
  if (action !== 'browse' && !setOnlineGameState(true, action === 'watch')) {
    if (isCreateAction) setOnlineCreatePending(false);
    return;
  }
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
    if (isCreateAction) setOnlineCreatePending(false);
    updateOnlineStatus('Could not reach the online room server. It may be waking from its free hosting sleep period; try again in a minute.');
  });
  socket.addEventListener('close', () => {
    if (isCreateAction) setOnlineCreatePending(false);
    if (socket !== onlineSocket) return;
    onlineReady = false;
    updateOnlineSuggestionAvailability();
    updateOnlineChatAvailability();
    pendingPremove = null;
    selectedSquare = null;
    legalTargets = [];
    if (!connectionFailed) updateOnlineStatus('The room server closed the connection. Check that the server is running and that the URL is correct.');
    renderBoard();
  });
}

function disconnectOnlineGame() {
  const socket = onlineSocket;
  if (socket?.readyState === WebSocket.OPEN && onlineRoomCode) {
    document.querySelector('#online-leave-confirm').disabled = true;
    socket.send(JSON.stringify({ type: 'leave-room' }));
    onlineLeaveTimeout = window.setTimeout(() => finishDisconnectOnlineGame(socket), 3000);
    return;
  }
  finishDisconnectOnlineGame(socket);
}

function finishDisconnectOnlineGame(socket = onlineSocket) {
  if (socket !== onlineSocket) return;
  if (onlineLeaveTimeout !== null) {
    window.clearTimeout(onlineLeaveTimeout);
    onlineLeaveTimeout = null;
  }
  if (onlineDialog.open) onlineDialog.close();
  if (onlineLeaveDialog.open) onlineLeaveDialog.close();
  if (onlineOpponentLeftDialog.open) onlineOpponentLeftDialog.close();
  document.querySelector('#online-wait-reconnect').hidden = false;
  document.querySelector('#online-leave-confirm').disabled = false;
  onlineSocket = null;
  onlineRoomCode = null;
  onlineReady = false;
  onlineIdentityVerified = false;
  onlinePendingRequest = null;
  pendingPremove = null;
  localStorage.removeItem(onlineRoomStorageKey);
  setOnlineCreatePending(false);
  if (socket?.readyState === WebSocket.OPEN) socket.close(1000, 'Left the online lobby.');
  setOnlineGameState(false);
  document.querySelector('#online-invite').hidden = true;
  updateOnlineStatus('Disconnected. You are back on the main chess screen.');
  startNewGame();
}

function markGameResult(soundEvent = 'draw', humanScore = null, termination = 'draw') {
  if (gameResult) return;
  gameResult = true;
  const score = humanScore ?? (soundEvent === 'victory' ? 1 : soundEvent === 'defeat' ? 0 : 0.5);
  if (!onlineMode && !onlineSpectating) {
    recordOfflineRating(score);
    recordOfflineMatch(score, termination);
  }
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
    offlineRatingRecorded = false;
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
  offlineRatingRecorded = false;
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
      markGameResult(activeColor === playerColor ? 'defeat' : 'victory', activeColor === playerColor ? 0 : 1, 'time');
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
window.addEventListener('beforeunload', (event) => {
  if (!onlineMode || !onlineRoomCode) return;
  event.preventDefault();
  event.returnValue = '';
});

function showMessage(title, text) {
  document.querySelector('#message-title').textContent = title;
  document.querySelector('#message-text').textContent = text;
  messageDialog.showModal();
}

document.querySelector('#online-open').addEventListener('click', () => {
  openOnlineDialog('friends');
});
document.querySelector('#online-close').addEventListener('click', () => onlineDialog.close());
document.querySelector('#account-close').addEventListener('click', () => accountDialog.close());
document.querySelector('#online-continue').addEventListener('click', () => {
  accountDialog.close();
  openOnlineDialog('friends');
});
document.querySelector('#online-go-account').addEventListener('click', () => {
  onlineDialog.close();
  openAccountDialog('signin');
});
document.querySelector('#profiles-back').addEventListener('click', () => navigateToAppPage());
document.querySelector('#profile-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#profile-search-input').value.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    document.querySelector('#profile-card').hidden = true;
    document.querySelector('#profile-status').textContent = 'Usernames must be 3–20 letters, numbers, or underscores.';
    return;
  }
  const url = new URL(location.href);
  url.searchParams.set('page', 'profiles');
  url.searchParams.set('username', username);
  history.replaceState({ page: 'profiles' }, '', url);
  loadPlayerProfile(username);
});
populateCountryOptions();
document.querySelector('#profile-country-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = document.querySelector('#profile-status');
  const countryCode = document.querySelector('#profile-country-select').value;
  if (!countryCode) {
    status.textContent = 'Choose a country or region first.';
    return;
  }
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  status.textContent = 'Saving your profile…';
  try {
    await updateOwnProfile({
      countryCode,
      bio: document.querySelector('#profile-bio-input').value.trim(),
      ...(pendingAvatarData !== null ? { avatarData: pendingAvatarData } : {}),
    });
    pendingAvatarData = null;
    await loadPlayerProfile();
  } catch (error) {
    console.error('Could not update profile:', error);
    status.textContent = error.message || 'Could not save your profile.';
  } finally {
    button.disabled = false;
  }
});
document.querySelector('#profile-avatar-file').addEventListener('change', async (event) => {
  const [file] = event.currentTarget.files || [];
  if (!file) return;
  const note = document.querySelector('#profile-avatar-note');
  note.textContent = 'Preparing image…';
  try {
    pendingAvatarData = await compressProfileImage(file);
    const image = document.querySelector('#profile-avatar-image');
    image.src = pendingAvatarData;
    image.hidden = false;
    note.textContent = 'Image ready. Save profile to publish it.';
  } catch (error) {
    console.error('Could not prepare profile image:', error);
    note.textContent = error.message || 'Could not prepare this image.';
    event.currentTarget.value = '';
  }
});
document.querySelector('#profile-avatar-remove').addEventListener('click', () => {
  pendingAvatarData = '';
  const image = document.querySelector('#profile-avatar-image');
  image.removeAttribute('src');
  image.hidden = true;
  document.querySelector('#profile-avatar-note').textContent = 'Profile picture will be removed when you save.';
});
document.querySelector('#profile-add-friend').addEventListener('click', async () => {
  if (!currentViewedProfile?.username) return;
  if (!authSession?.access_token) {
    openAccountDialog('signin');
    return;
  }
  const status = document.querySelector('#profile-status');
  const incoming = socialOverview.incomingRequests.find((request) => (
    request.username.toLowerCase() === currentViewedProfile.username.toLowerCase()
  ));
  const alreadyFriend = socialOverview.friends.some((friend) => (
    (currentViewedProfile.id && friend.id === currentViewedProfile.id)
    || friend.username.toLowerCase() === currentViewedProfile.username.toLowerCase()
  ));
  if (!incoming && alreadyFriend) {
    renderProfileActions(currentViewedProfile, false);
    status.textContent = `You are already friends with @${currentViewedProfile.username}.`;
    return;
  }
  status.textContent = incoming ? 'Accepting friend request…' : 'Sending friend request…';
  try {
    let result = { status: 'accepted' };
    if (incoming) {
      await requestSocialApi('/social/friends/respond', 'POST', { requestId: incoming.id, accept: true });
    } else {
      result = await requestSocialApi('/social/friends/request', 'POST', { username: currentViewedProfile.username });
    }
    await refreshSocialOverview();
    renderProfileActions(currentViewedProfile, false);
    status.textContent = incoming || result.status === 'accepted'
      ? `You are now friends with @${currentViewedProfile.username}.`
      : result.status === 'already_friends'
        ? `You are already friends with @${currentViewedProfile.username}.`
        : result.status === 'incoming'
          ? `@${currentViewedProfile.username} already sent you a request. Open Friends → Requests to accept it.`
          : result.status === 'pending'
            ? `A friend request to @${currentViewedProfile.username} is already pending.`
            : `Friend request sent to @${currentViewedProfile.username}.`;
  } catch (error) {
    console.error('Could not update profile friendship:', error);
    status.textContent = error.message || 'Could not update friend request.';
  }
});
document.querySelector('#profile-block').addEventListener('click', async () => {
  if (!currentViewedProfile?.username) return;
  if (!authSession?.access_token) {
    openAccountDialog('signin');
    return;
  }
  const blocked = socialOverview.blockedUsers.some((entry) => entry.id === currentViewedProfile.id);
  const action = blocked ? 'unblock' : 'block';
  if (!window.confirm(`${blocked ? 'Unblock' : 'Block'} @${currentViewedProfile.username}?`)) return;
  const status = document.querySelector('#profile-status');
  status.textContent = `${blocked ? 'Unblocking' : 'Blocking'} player…`;
  try {
    await requestSocialApi('/social/blocks', 'POST', {
      username: currentViewedProfile.username,
      block: !blocked,
    });
    await refreshSocialOverview();
    renderProfileActions(currentViewedProfile, false);
    status.textContent = blocked
      ? `@${currentViewedProfile.username} was unblocked.`
      : `@${currentViewedProfile.username} was blocked and removed from your friends.`;
  } catch (error) {
    console.error('Could not update blocked players:', error);
    status.textContent = error.message || 'Could not update the block.';
  }
});
document.querySelector('#profile-challenge').addEventListener('click', challengeProfilePlayer);
document.querySelector('#challenge-close').addEventListener('click', () => {
  profileChallengeUsername = '';
  document.querySelector('#challenge-dialog').close();
});
document.querySelector('#challenge-play-now').addEventListener('click', () => {
  if (!profileChallengeUsername) return;
  const username = profileChallengeUsername;
  document.querySelector('#challenge-dialog').close();
  document.querySelector('#online-status').textContent =
    `Create a private lobby to challenge @${username}. Their inbox will receive the join invitation.`;
  openOnlineDialog('friends');
});
document.querySelector('#challenge-schedule-toggle').addEventListener('click', () => {
  const form = document.querySelector('#challenge-schedule-form');
  form.hidden = false;
  const dateInput = document.querySelector('#challenge-scheduled-at');
  const minDate = new Date(Date.now() + 60_000 - new Date().getTimezoneOffset() * 60_000);
  dateInput.min = minDate.toISOString().slice(0, 16);
  dateInput.focus();
});
document.querySelector('#challenge-schedule-form').addEventListener('submit', sendScheduledProfileChallenge);
document.querySelector('#history-close').addEventListener('click', () => document.querySelector('#history-dialog').close());
document.querySelector('#history-dialog').addEventListener('close', closeHistoryReplay);
document.querySelector('#history-replay-close').addEventListener('click', closeHistoryReplay);
document.querySelector('#history-replay-first').addEventListener('click', () => setHistoryReplayPosition(0));
document.querySelector('#history-replay-previous').addEventListener('click', () => setHistoryReplayPosition(historyReplayIndex - 1));
document.querySelector('#history-replay-next').addEventListener('click', () => setHistoryReplayPosition(historyReplayIndex + 1));
document.querySelector('#history-replay-last').addEventListener('click', () => setHistoryReplayPosition(historyReplayMoves.length));
document.querySelector('#history-replay-play').addEventListener('click', playHistoryReplay);
document.querySelector('#history-replay-seek').addEventListener('input', (event) => {
  setHistoryReplayPosition(Number(event.currentTarget.value));
});
document.querySelector('#history-replay-speed').addEventListener('change', () => {
  if (historyReplayTimer === null) return;
  stopHistoryReplay();
  playHistoryReplay();
});
document.querySelector('#history-replay-flip').addEventListener('click', () => {
  historyReplayFlipped = !historyReplayFlipped;
  renderHistoryReplayBoard();
});
document.querySelectorAll('[data-history-kind]').forEach((button) => {
  button.addEventListener('click', () => void loadGameHistory(button.dataset.historyKind));
});
document.querySelector('#history-signin').addEventListener('click', () => openAccountDialog('signin'));
document.querySelector('#dock-country-save').addEventListener('click', async () => {
  const countryCode = document.querySelector('#dock-country-select').value;
  const status = document.querySelector('#dock-country-status');
  if (!countryCode) {
    status.textContent = 'Choose a country or region first.';
    return;
  }
  const button = document.querySelector('#dock-country-save');
  button.disabled = true;
  status.textContent = 'Saving country and flag…';
  try {
    await updateOwnProfile({ countryCode });
    status.textContent = 'Country flag saved to your public profile.';
    if (new URLSearchParams(location.search).get('page') === 'profiles'
      && !new URLSearchParams(location.search).has('username')) {
      await loadPlayerProfile();
    }
  } catch (error) {
    console.error('Could not save profile country:', error);
    status.textContent = error.message || 'Could not save your country.';
  } finally {
    button.disabled = false;
  }
});
document.querySelectorAll('[data-social-panel]').forEach((button) => {
  button.addEventListener('click', () => openSocialPanel(button.dataset.socialPanel));
});
document.querySelector('#social-panel-close').addEventListener('click', closeSocialPanel);
document.querySelector('#social-refresh').addEventListener('click', refreshSocialPanel);
document.querySelector('#social-signin').addEventListener('click', () => openAccountDialog('signin'));
document.querySelector('#friend-request-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = document.querySelector('#friend-request-username');
  const username = input.value.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    document.querySelector('#social-panel-status').textContent =
      'Usernames must be 3–20 letters, numbers, or underscores.';
    return;
  }
  sendFriendRequest(username).then(() => { input.value = ''; });
});
document.querySelectorAll('[data-friends-tab]').forEach((button) => {
  button.addEventListener('click', () => selectSocialFriendsTab(button.dataset.friendsTab));
});
document.querySelector('#social-conversation-back').addEventListener('click', () => {
  activeSocialConversation = null;
  document.querySelector('#social-conversation').hidden = true;
  document.querySelector('#social-conversation-list').hidden = false;
});
document.querySelector('#social-compose-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!activeSocialConversation) return;
  const input = document.querySelector('#social-message-input');
  const text = input.value.trim();
  if (!text || text.length > 1000) return;
  const sendButton = event.currentTarget.querySelector('button');
  sendButton.disabled = true;
  try {
    await requestSocialApi('/social/messages', 'POST', {
      username: activeSocialConversation.username,
      text,
    });
    input.value = '';
    await loadSocialMessages(activeSocialConversation);
  } catch (error) {
    console.error('Could not send direct message:', error);
    document.querySelector('#social-panel-status').textContent = error.message || 'Could not send your message.';
  } finally {
    sendButton.disabled = false;
    input.focus();
  }
});
document.querySelector('#dock-board-theme').addEventListener('change', (event) => {
  boardThemeSelect.value = event.target.value;
  boardThemeSelect.dispatchEvent(new Event('change', { bubbles: true }));
});
document.querySelector('#dock-interface-theme').addEventListener('change', (event) => {
  interfaceThemeSelect.value = event.target.value;
  interfaceThemeSelect.dispatchEvent(new Event('change', { bubbles: true }));
});
document.querySelector('#dock-sound-toggle').addEventListener('change', (event) => {
  soundToggle.checked = event.target.checked;
  soundToggle.dispatchEvent(new Event('change', { bubbles: true }));
});
document.querySelector('#social-sound-settings').addEventListener('click', () => {
  renderSoundSettings();
  soundSettingsDialog.showModal();
});
document.querySelector('#social-account-settings').addEventListener('click', () => {
  openAccountDialog('signin');
});
setInterval(() => {
  if (!socialPanel.hidden && activeSocialPanel !== 'settings' && authSession?.access_token) {
    refreshSocialPanel();
  }
}, 30_000);
window.addEventListener('popstate', renderAppPage);
document.querySelector('#online-leave-game').addEventListener('click', () => onlineLeaveDialog.showModal());
document.querySelector('#online-leave-cancel').addEventListener('click', () => onlineLeaveDialog.close());
document.querySelector('#online-leave-confirm').addEventListener('click', disconnectOnlineGame);
document.querySelector('#online-return-main').addEventListener('click', disconnectOnlineGame);
document.querySelector('#online-wait-reconnect').addEventListener('click', () => onlineOpponentLeftDialog.close());
document.querySelector('#online-friends-tab').addEventListener('click', () => selectOnlineTab('friends'));
document.querySelector('#online-public-tab').addEventListener('click', () => selectOnlineTab('public'));
document.querySelector('#online-host').addEventListener('click', () => connectToOnlineRoom('create'));
document.querySelector('#online-create-public').addEventListener('click', () => connectToOnlineRoom('create-public'));
document.querySelector('#online-refresh-rooms').addEventListener('click', requestPublicRooms);
document.querySelector('#online-join').addEventListener('click', () => connectToOnlineRoom('join'));
document.querySelector('#online-watch').addEventListener('click', () => connectToOnlineRoom('watch'));
document.querySelector('#online-disconnect').addEventListener('click', () => {
  if (onlineMode) onlineLeaveDialog.showModal();
  else onlineDialog.close();
});
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
document.querySelector('#online-auth-reset').addEventListener('click', requestPasswordReset);
document.querySelector('#online-auth-mode').addEventListener('click', () => {
  authMode = authMode === 'signup' ? 'signin' : 'signup';
  document.querySelector('#online-account-password').setAttribute(
    'autocomplete',
    authMode === 'signup' ? 'new-password' : 'current-password',
  );
  updateAccountUI(authMode === 'signup'
    ? 'Create an account. Email confirmation is disabled for this free setup.'
    : 'Sign in with your email or username and password.');
});
document.querySelector('#online-auth-signout').addEventListener('click', signOutOnlineAccount);
for (const field of ['#online-username', '#online-email', '#online-account-password', '#online-recovery-code']) {
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
renderAppPage();
try {
  const savedRoomCode = localStorage.getItem(onlineRoomStorageKey);
  if (savedRoomCode && /^[A-Z0-9]{6}$/.test(savedRoomCode)) {
    document.querySelector('#online-room-code').value = savedRoomCode;
  }
} catch (error) {
  console.error('Could not restore the saved online invite code:', error);
}
document.querySelector('#resign').addEventListener('click', () => {
  if (onlineSpectating) return;
  if (!game.history().length || isGameOver() || gameResult) return;
  if (onlineMode && onlineSocket?.readyState === WebSocket.OPEN) {
    onlineSocket.send(JSON.stringify({ type: 'resign' }));
  }
  markGameResult('defeat', 0, 'resignation');
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
    markGameResult('draw', 0.5, 'draw');
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
    const savedPuzzleSolved = Number(localStorage.getItem('openboard-puzzles-solved') || 0);
    puzzleSolved = Number.isInteger(savedPuzzleSolved) ? Math.max(0, savedPuzzleSolved) : 0;
  } catch (error) {
    console.error('Could not load puzzle progress:', error);
  }
  try {
    const savedTutorialProgress = Number(localStorage.getItem('openboard-tutorial-progress') || 0);
    tutorialProgress = Number.isInteger(savedTutorialProgress)
      ? Math.min(learningContent.lessons.length, Math.max(0, savedTutorialProgress))
      : 0;
  } catch (error) {
    console.error('Could not load tutorial progress:', error);
  }
  updatePuzzleProgress();
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

function updatePuzzleProgress() {
  document.querySelector('#puzzle-progress').textContent =
    `${puzzleSolved} ${puzzleSolved === 1 ? 'puzzle' : 'puzzles'} solved · ${puzzlePositions.length} mate-in-one puzzles`;
}

function startPuzzle(requestedIndex) {
  if (onlineMode || onlineSpectating) {
    showMessage('Puzzle unavailable during online play', 'Finish or leave the online game before starting a puzzle.');
    return;
  }
  if (activeBoardSize !== 8) {
    showMessage('Puzzle board size', 'The built-in mate-in-one puzzle uses the standard 8×8 board. Select 8×8 in Custom rules to play it.');
    return;
  }
  let index = requestedIndex;
  if (!Number.isInteger(index) || index < 0 || index >= puzzlePositions.length) {
    const candidates = puzzlePositions.map((_, candidateIndex) => candidateIndex)
      .filter((candidateIndex) => candidateIndex !== puzzleCurrentIndex);
    index = candidates[Math.floor(Math.random() * candidates.length)];
  }
  const puzzle = puzzlePositions[index];
  gameToken += 1;
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
  if (!game.load(puzzle.fen)) {
    throw new Error(`The puzzle position could not be loaded: ${puzzle.fen}`);
  }
  puzzleCurrentIndex = index;
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
  gameMessage.textContent = `Puzzle ${index + 1} of ${puzzlePositions.length}. White to move — find checkmate in one.`;
  updatePuzzleProgress();
  renderBoard();
}

function startDailyPuzzle() {
  const now = new Date();
  const dayNumber = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  startPuzzle(dayNumber % puzzlePositions.length);
}

function renderBeginnerLesson() {
  stopTutorialPlayback();
  const lesson = learningContent.lessons[tutorialLessonIndex];
  tutorialDemoStartFen = lesson.fen;
  tutorialDemoMoves = lesson.moves;
  tutorialDemoStepIndex = 0;
  tutorialDemoGame = new Chess();
  if (!tutorialDemoStartFen || !tutorialDemoMoves?.length || !tutorialDemoGame.load(tutorialDemoStartFen)) {
    tutorialDemoGame = null;
    throw new Error(`The chess demonstration for "${lesson.title}" is missing a valid starting position or moves.`);
  }
  tutorialDemoHighlights = lesson.highlightSquares || [];
  renderBoard();
  updateTutorialPlaybackControls();
  document.querySelector('#tutorial-progress').max = learningContent.lessons.length;
  document.querySelector('#tutorial-progress').value = tutorialProgress;
  document.querySelector('#tutorial-step-label').textContent =
    `LESSON ${tutorialLessonIndex + 1} OF ${learningContent.lessons.length}`;
  document.querySelector('#tutorial-lesson-title').textContent = lesson.title;
  document.querySelector('#tutorial-lesson-text').textContent = lesson.text;
  document.querySelector('#tutorial-question').textContent = lesson.question;
  document.querySelector('#tutorial-demo-note').textContent =
    `Follow the highlighted moves on the chessboard. ${lesson.demoNote}`;
  document.querySelector('#tutorial-feedback').textContent = tutorialLessonIndex < tutorialProgress
    ? 'You completed this lesson before. Review it or move on.'
    : '';
  document.querySelector('#tutorial-question-feedback').textContent = '';
  document.querySelector('#tutorial-question-back').textContent = 'Back to demonstration';
  const choices = document.querySelector('#tutorial-choices');
  choices.replaceChildren();
  lesson.choices.forEach((choice, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = choice;
    button.addEventListener('click', () => {
      const questionFeedback = document.querySelector('#tutorial-question-feedback');
      if (index === lesson.answer) {
        tutorialProgress = Math.max(tutorialProgress, tutorialLessonIndex + 1);
        try {
          localStorage.setItem('openboard-tutorial-progress', String(tutorialProgress));
        } catch (error) {
          console.error('Could not save tutorial progress:', error);
        }
        document.querySelector('#tutorial-progress').value = tutorialProgress;
        document.querySelector('#tutorial-feedback').textContent =
          `Correct! ${tutorialProgress} of ${learningContent.lessons.length} lessons complete.`;
        questionFeedback.textContent = 'Correct! Return to the board demonstration when you are ready.';
        choices.querySelectorAll('button').forEach((choiceButton) => { choiceButton.disabled = true; });
        document.querySelector('#tutorial-question-back').textContent = 'Continue lesson';
        document.querySelector('#tutorial-next').disabled = false;
        document.querySelector('#tutorial-next').textContent =
          tutorialLessonIndex === learningContent.lessons.length - 1 ? 'Finish tutorial' : 'Next lesson';
      } else {
        questionFeedback.textContent = 'Not quite. Look at the highlighted squares on the board and try again.';
      }
    });
    choices.append(button);
  });
  document.querySelector('#tutorial-previous').disabled = tutorialLessonIndex === 0;
  const alreadyCompleted = tutorialLessonIndex < tutorialProgress;
  const next = document.querySelector('#tutorial-next');
  next.disabled = !alreadyCompleted;
  next.textContent = tutorialLessonIndex === learningContent.lessons.length - 1
    ? 'Finish tutorial'
    : 'Next lesson';
}

function updateTutorialPlaybackControls() {
  const back = document.querySelector('#tutorial-step-back');
  const forward = document.querySelector('#tutorial-step-forward');
  const play = document.querySelector('#tutorial-play');
  const playing = Boolean(tutorialPlaybackTimer);
  back.disabled = tutorialDemoStepIndex === 0;
  forward.disabled = tutorialDemoStepIndex >= tutorialDemoMoves.length;
  play.disabled = tutorialDemoMoves.length === 0;
  play.textContent = playing ? 'Pause' : tutorialDemoStepIndex >= tutorialDemoMoves.length ? 'Replay' : 'Play';
  play.setAttribute('aria-label', playing ? 'Pause demonstration' : 'Play demonstration');
  play.setAttribute('aria-pressed', String(playing));
  const lastMove = tutorialDemoGame?.history({ verbose: true }).at(-1);
  const position = tutorialDemoStepIndex === 0
    ? 'Starting position'
    : `Move ${tutorialDemoStepIndex} of ${tutorialDemoMoves.length} · ${lastMove?.san || ''}`;
  document.querySelector('#tutorial-position').textContent = position;
}

function stopTutorialPlayback() {
  if (tutorialPlaybackTimer) clearInterval(tutorialPlaybackTimer);
  tutorialPlaybackTimer = null;
  const play = document.querySelector('#tutorial-play');
  if (play) {
    play.textContent = tutorialDemoStepIndex >= tutorialDemoMoves.length ? 'Replay' : 'Play';
    play.setAttribute('aria-label', tutorialDemoStepIndex >= tutorialDemoMoves.length ? 'Replay demonstration' : 'Play demonstration');
    play.setAttribute('aria-pressed', 'false');
  }
}

function setTutorialDemoStep(stepIndex, keepPlaying = false) {
  if (!keepPlaying) stopTutorialPlayback();
  tutorialDemoGame = new Chess();
  if (!tutorialDemoGame.load(tutorialDemoStartFen)) {
    throw new Error(`The starting position for "${learningContent.lessons[tutorialLessonIndex].title}" could not be loaded.`);
  }
  tutorialDemoStepIndex = Math.max(0, Math.min(tutorialDemoMoves.length, stepIndex));
  for (let index = 0; index < tutorialDemoStepIndex; index += 1) {
    const move = tutorialDemoGame.move(tutorialDemoMoves[index]);
    if (!move) {
      throw new Error(`Invalid tutorial move "${tutorialDemoMoves[index]}" in "${learningContent.lessons[tutorialLessonIndex].title}".`);
    }
  }
  renderBoard();
  updateTutorialPlaybackControls();
}

function startTutorialPlayback() {
  if (tutorialPlaybackTimer) return;
  if (tutorialDemoStepIndex >= tutorialDemoMoves.length) setTutorialDemoStep(0);
  if (!tutorialDemoMoves.length) return;
  const speed = Number(document.querySelector('#tutorial-speed').value);
  tutorialPlaybackTimer = setInterval(() => {
    const nextStep = tutorialDemoStepIndex + 1;
    setTutorialDemoStep(nextStep, true);
    if (tutorialDemoStepIndex >= tutorialDemoMoves.length) stopTutorialPlayback();
    updateTutorialPlaybackControls();
  }, 1000 / speed);
  updateTutorialPlaybackControls();
}

function restoreTutorialBoard() {
  if (!tutorialDemoGame) return;
  stopTutorialPlayback();
  tutorialDemoGame = null;
  tutorialDemoHighlights = [];
  tutorialDemoStartFen = '';
  tutorialDemoMoves = [];
  tutorialDemoStepIndex = 0;
  renderBoard();
}

function closeBeginnerTutorial() {
  const dialog = document.querySelector('#tutorial-dialog');
  if (dialog.open) dialog.close();
  restoreTutorialBoard();
}

function openBeginnerTutorial() {
  tutorialLessonIndex = tutorialProgress >= learningContent.lessons.length ? 0 : tutorialProgress;
  renderBeginnerLesson();
  document.querySelector('#tutorial-dialog').showModal();
  boardElement.scrollIntoView({
    block: window.matchMedia('(max-width: 850px)').matches ? 'start' : 'center',
  });
}

function openChessRules() {
  const content = document.querySelector('#rules-guide-content');
  if (!content.childElementCount) {
    for (const [heading, text] of learningContent.rules) {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      const description = document.createElement('p');
      title.textContent = heading;
      description.textContent = text;
      section.append(title, description);
      content.append(section);
    }
  }
  document.querySelector('#rules-dialog').showModal();
}

document.querySelector('#puzzle-start').addEventListener('click', () => startPuzzle());
document.querySelector('#puzzle-next').addEventListener('click', () => startPuzzle());
document.querySelector('#puzzle-hint').addEventListener('click', () => {
  if (!puzzleMode) {
    showMessage('Puzzle hint', 'Start the mate-in-one puzzle first.');
    return;
  }
  showMessage('Puzzle hint', puzzlePositions[puzzleCurrentIndex].hint);
});
document.querySelector('#tutorial-close').addEventListener('click', closeBeginnerTutorial);
document.querySelector('#tutorial-dialog').addEventListener('close', restoreTutorialBoard);
document.querySelector('#tutorial-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeBeginnerTutorial();
});
document.querySelector('#tutorial-ask-question').addEventListener('click', () => {
  stopTutorialPlayback();
  const choices = document.querySelector('#tutorial-choices');
  choices.querySelectorAll('button').forEach((button) => { button.disabled = false; });
  document.querySelector('#tutorial-question-feedback').textContent = '';
  document.querySelector('#tutorial-question-back').textContent = 'Back to demonstration';
  document.querySelector('#tutorial-question-dialog').showModal();
});
document.querySelector('#tutorial-question-close').addEventListener('click', () => {
  document.querySelector('#tutorial-question-dialog').close();
});
document.querySelector('#tutorial-question-back').addEventListener('click', () => {
  document.querySelector('#tutorial-question-dialog').close();
});
document.querySelector('#tutorial-step-back').addEventListener('click', () => {
  setTutorialDemoStep(tutorialDemoStepIndex - 1);
});
document.querySelector('#tutorial-step-forward').addEventListener('click', () => {
  setTutorialDemoStep(tutorialDemoStepIndex + 1);
});
document.querySelector('#tutorial-play').addEventListener('click', () => {
  if (tutorialPlaybackTimer) {
    stopTutorialPlayback();
    updateTutorialPlaybackControls();
  } else {
    startTutorialPlayback();
  }
});
document.querySelector('#tutorial-speed').addEventListener('input', (event) => {
  const speed = Number(event.currentTarget.value);
  document.querySelector('#tutorial-speed-value').textContent = `${speed}×`;
  if (tutorialPlaybackTimer) {
    stopTutorialPlayback();
    startTutorialPlayback();
  }
});
document.querySelector('#tutorial-previous').addEventListener('click', () => {
  if (tutorialLessonIndex === 0) return;
  tutorialLessonIndex -= 1;
  renderBeginnerLesson();
});
document.querySelector('#tutorial-next').addEventListener('click', () => {
  if (tutorialLessonIndex < tutorialProgress) {
    if (tutorialLessonIndex < learningContent.lessons.length - 1) {
      tutorialLessonIndex += 1;
      renderBeginnerLesson();
      return;
    }
  }
  if (tutorialLessonIndex === learningContent.lessons.length - 1
    && tutorialProgress === learningContent.lessons.length) {
    closeBeginnerTutorial();
    showMessage('Tutorial complete', 'You finished the beginner chess course. Revisit the tutorial or open Chess Rules any time.');
  }
});
document.querySelector('#rules-close').addEventListener('click', () => document.querySelector('#rules-dialog').close());

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
  if (onlineMode && (!onlineReady || onlineSpectating || onlineSocket?.readyState !== WebSocket.OPEN)) return;
  if (aiThinking || gameResult || isGameOver()) return;
  if (!onlineMode && !analysisMode && !puzzleMode && game.turn() !== playerColor) {
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
  const suggestedSide = onlineMode ? `${game.turn() === 'w' ? 'White' : 'Black'}: ` : '';
  gameMessage.textContent = `Suggested move: ${suggestedSide}${suggestion.san} · ${suggestion.from} to ${suggestion.to}.`;
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
