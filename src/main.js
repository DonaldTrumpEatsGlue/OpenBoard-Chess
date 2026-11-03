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
const practiceSetupDialog = document.querySelector('#practice-setup-dialog');
const practiceCoachElement = document.querySelector('#practice-coach');
const practiceCoachHome = practiceCoachElement.parentElement;
const profilesPage = document.querySelector('#profiles-page');
const playerProfilePage = document.querySelector('#player-profile-page');
const gamePage = document.querySelector('#game-page');
const socialPanel = document.querySelector('#social-panel');
const onlineLeaveDialog = document.querySelector('#online-leave-dialog');
const onlineOpponentLeftDialog = document.querySelector('#online-opponent-left-dialog');
const onlineDrawOfferDialog = document.querySelector('#online-draw-offer-dialog');
const resignConfirmDialog = document.querySelector('#resign-confirm-dialog');
const gameOverDialog = document.querySelector('#game-over-dialog');
const rematchOfferDialog = document.querySelector('#rematch-offer-dialog');
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
const practiceBotOptions = [
  { id: 'pip', label: 'Gentle · Pip (very forgiving)' },
  { id: 'juniper', label: 'Easy · Juniper' },
  { id: 'scout', label: 'Casual · Scout' },
  { id: 'sage', label: 'Intermediate · Sage' },
  { id: 'rook', label: 'Advanced · Rook' },
  { id: 'vale', label: 'Expert · Vale' },
  { id: 'quartz', label: 'Elite · Quartz' },
  { id: 'max', label: 'Maximum · MAX ENGINE (very difficult)' },
];
const practiceBotSelect = document.querySelector('#practice-bot');
for (const option of practiceBotOptions) {
  const element = document.createElement('option');
  element.value = option.id;
  element.textContent = option.label;
  practiceBotSelect.append(element);
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
let practiceMode = false;
let practiceGame = false;
let practiceLastHumanMove = null;
let practiceLastBotMove = null;
let practiceLastMessage = '';
let practiceObjective = 'beginner';
let practiceCoachAuto = true;
let practiceCoachFrequency = 'every';
let practiceHintsEnabled = true;
let practiceHintStep = 0;
let practiceHintMove = null;
let activePracticeOpening = null;
let practiceOpeningOnBook = false;
let pendingPracticeOpening = null;
let academyPlaybackTimer = null;
let puzzleSolved = 0;
let puzzleCurrentIndex = -1;
let tutorialLessonIndex = 0;
let tutorialProgress = 0;
let tutorialDemoGame = null;
let tutorialDemoHighlights = [];
let tutorialDemoLegalTargets = [];
let tutorialDemoCaptureTargets = [];
let tutorialDemoStartFen = '';
let tutorialDemoMoves = [];
let tutorialDemoMoveNotes = [];
let tutorialDemoMoveHighlights = [];
let tutorialDemoFocusSquare = '';
let tutorialDemoFocusColor = '';
let tutorialDemoStepIndex = 0;
let tutorialPlaybackTimer = null;
const learningContent = window.openboardLearningContent;
const academyContent = window.openboardAcademyContent;
const puzzlePositions = learningContent.puzzles;
const academyDialog = document.querySelector('#academy-dialog');
let academyPath = 'fundamentals';
let academySelection = '';
let academyStudyIndex = 0;
let academyStudyGame = null;
let academyVariationIndex = -1;
let academyStudyTestMode = false;
let academyStudyTestColor = 'w';
let academyStudySelectedSquare = '';
let academyStudyHintStep = 0;
let academyStudyNoteOverride = '';
let academyProgress = new Set();
let academyPuzzleGame = null;
let academyPuzzleData = null;
let academyPuzzleSelected = '';
let academyPuzzleHintStep = 0;
let academyPuzzleMode = 'mate';
let academyPuzzleInitialFen = '';
let academyPuzzleMoveCount = 0;
let academyPerformance = {};
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
let communityMembersRequestId = 0;
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
let onlinePreviousRules = null;
let currentOnlineGameId = null;
let pendingRematchRequestId = null;
let rematchRequestPending = false;
let incomingRematchOffer = false;
let rematchRequestTimeout = null;
let joiningGameChallengeType = '';
let resignationPending = false;
let customRulesDialogContext = 'game';
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

function recordAcademyExerciseAttempt(correct) {
  const stats = academyPerformance[academySelection] ?? { attempts: 0, correct: 0 };
  stats.attempts += 1;
  if (correct) stats.correct += 1;
  academyPerformance[academySelection] = stats;
  try {
    localStorage.setItem('openboard-academy-performance-v1', JSON.stringify(academyPerformance));
  } catch (error) {
    console.error('Could not save academy exercise history:', error);
    showMessage('Exercise history not saved', 'Your browser could not save exercise results on this device.');
  }
  updateAcademyProgressDisplay();
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
  if (offlineRatingRecorded || onlineMode || onlineSpectating || analysisMode || puzzleMode || practiceGame) return;
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
  if (onlineMode || onlineSpectating || analysisMode || puzzleMode || practiceGame
    || (!game.history().length && termination !== 'resignation')) return;
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
      variant: structuredClone(customRules),
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
  const summary = `${pieces.join(' · ')} ↗`;
  document.querySelector('#custom-rules-summary').textContent = summary;
  document.querySelector('#online-custom-rules-summary').textContent = summary;
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
  const lastMoveTo = displayGame.history({ verbose: true }).at(-1)?.to;
  const selectedMoves = selectedSquare && !tutorialDemoGame
    ? (premoveWindow ? getPremoveMoves(selectedSquare) : getLegalMoves({ square: selectedSquare }))
    : [];
  const captureTargets = new Set(selectedMoves.filter((move) => move.captured).map((move) => move.to));

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
      const isTutorialDestination = tutorialDemoLegalTargets.includes(square);
      const isLegalDestination = !tutorialDemoGame && legalTargets.includes(square);
      const isCaptureDestination = captureTargets.has(square);
      const pieceDescription = piece ? `${piece.color === 'w' ? 'white' : 'black'} ${customIdentity?.name ?? piece.type}` : '';
      const destinationDescription = isTutorialDestination
        ? 'legal move destination'
        : isLegalDestination
          ? `legal ${isCaptureDestination ? 'capture' : 'move'} destination`
          : '';
      button.setAttribute('aria-label', [square, pieceDescription, destinationDescription].filter(Boolean).join(', '));
      if (tutorialDemoHighlights.includes(square)) button.classList.add('tutorial-highlight');
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
      if (isLegalDestination) {
        const target = document.createElement('span');
        target.className = piece || isCaptureDestination ? 'move-target capture-target' : 'move-target';
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
      if (isTutorialDestination) {
        const destination = document.createElement('span');
        destination.className = `tutorial-legal-destination${tutorialDemoCaptureTargets.includes(square) ? ' tutorial-capture-destination' : ''}`;
        destination.setAttribute('aria-hidden', 'true');
        button.append(destination);
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
    {
      selector: '#human-captured-pieces',
      capturer: playerColor,
      label: onlineSpectating ? (playerColor === 'w' ? 'White' : 'Black') : 'you',
    },
    {
      selector: '#opponent-captured-pieces',
      capturer: playerColor === 'w' ? 'b' : 'w',
      label: onlineSpectating ? (playerColor === 'w' ? 'Black' : 'White') : 'your opponent',
    },
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
  const openingName = opening?.name ?? 'Opening not identified';
  const openingTheme = opening?.theme
    ?? 'Play a few moves to identify the opening and explain each side’s plan.';
  document.querySelector('#opening-name').textContent = openingName;
  document.querySelector('#opening-theme').textContent = openingTheme;
  const latest = moveInsights[history.length - 1];
  const latestElement = document.querySelector('#latest-move-insight');
  if (!latest) {
    latestElement.textContent = history.length
      ? 'This position came from a loaded game; make a move to see quick feedback.'
      : 'Move feedback appears here after each move.';
  } else {
    latestElement.textContent = `${latest.color === 'w' ? 'White' : 'Black'} · ${latest.san}: ${latest.grade?.icon ?? ''} ${latest.grade?.label ?? 'Move'}${latest.detail ? ` — ${latest.detail}` : ''}`;
  }
  document.querySelector('#opening-notes-name').textContent = openingName;
  document.querySelector('#opening-notes-theme').textContent = openingTheme;
  document.querySelector('#opening-notes-latest').textContent = latestElement.textContent;
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
  if (practiceGame && activePracticeOpening && practiceOpeningOnBook
    && appliedMove.color === playerColor) {
    const expectedSan = activePracticeOpening.moves[game.history().length - 1]?.[0];
    if (expectedSan !== appliedMove.san) {
      practiceOpeningOnBook = false;
      practiceLastMessage = `You chose ${appliedMove.san} rather than the ${activePracticeOpening.name} study move. It is still your legal choice; the bot will respond to the live position.`;
    }
  }
  suggestedMove = null;
  practiceHintMove = null;
  practiceHintStep = 0;
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
  if (practiceMode && appliedMove.color === playerColor) {
    practiceLastHumanMove = appliedMove;
    practiceLastBotMove = null;
  }
  playMoveSound(appliedMove, 'self');
  updateGameState();
  if (practiceMode && practiceCoachAuto && practiceMoveNeedsExplanation(appliedMove)) updatePracticeCoach('human');
  else if (practiceMode && practiceCoachAuto && practiceCoachFrequency === 'every') updatePracticeCoach('human');
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
  if (practiceGame && activePracticeOpening && practiceOpeningOnBook && game.turn() !== playerColor) {
    const expectedSan = activePracticeOpening.moves[game.history().length]?.[0];
    if (expectedSan) {
      const expectedMove = game.moves({ verbose: true }).find((move) => move.san === expectedSan);
      if (expectedMove) {
        try {
          const quality = analyzeMoveQuality(expectedMove);
          const appliedMove = makeGameMove(expectedMove);
          recordMoveInsight(appliedMove, quality);
          playMoveSound(appliedMove, 'opponent');
          registerClockMove();
          gameMessage.textContent = `${activePracticeOpening.name} study reply: ${appliedMove.san}.`;
          finishBotTurn();
          return;
        } catch (error) {
          console.error(`Could not apply the ${activePracticeOpening.name} study move ${expectedSan}:`, error);
          practiceOpeningOnBook = false;
        }
      } else {
        console.error(`The ${activePracticeOpening.name} study move ${expectedSan} is illegal in the current position.`);
        practiceOpeningOnBook = false;
      }
    } else {
      practiceOpeningOnBook = false;
    }
  }
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
  practiceHintMove = null;
  practiceHintStep = 0;
  if (practiceMode) {
    const latestMove = game.history({ verbose: true }).at(-1);
    if (latestMove?.color !== playerColor) practiceLastBotMove = latestMove;
  }
  updateGameState();
  renderBoard();
  if (practiceMode && practiceCoachAuto && practiceMoveNeedsExplanation(game.history({ verbose: true }).at(-1))) {
    updatePracticeCoach('bot');
  }
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
    markGameResult(humanScore === 0 ? 'defeat' : humanScore === 1 ? 'victory' : 'draw', humanScore, 'stalemate');
  } else if (isThreefoldRepetition()) {
    gameMessage.textContent = 'Draw by threefold repetition.';
    markGameResult('draw', 0.5, 'threefold');
  } else if (isInsufficientMaterial()) {
    gameMessage.textContent = 'Draw by insufficient material.';
    markGameResult('draw', 0.5, 'insufficient');
  } else if (!customRules.noDraws && Number(game.fen().split(' ')[4]) >= 100) {
    gameMessage.textContent = 'Draw by the 50-move rule.';
    markGameResult('draw', 0.5, 'fiftyMove');
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
  suggestButton.hidden = onlineMode;
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
  let session = null;
  if (authSession?.access_token) {
    try {
      session = await getValidAuthSession();
    } catch (error) {
      if (ownProfile) throw error;
      console.error('Could not refresh sign-in for public profile owner verification; loading the profile anonymously.', error);
    }
  }
  if (ownProfile) {
    if (!session?.access_token) throw new Error('Sign in to view your player profile.');
    headers.Authorization = `Bearer ${session.access_token}`;
  }
  if (!ownProfile && session?.access_token) headers.Authorization = makeAuthorizationHeader(session.access_token);
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
  const membersCountrySelect = document.querySelector('#community-member-country');
  const regionNames = new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' });
  const countryCodes = 'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW'.split(' ');
  const options = countryCodes
    .map((code) => ({ code, name: regionNames.of(code) || code }))
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const { code, name } of options) {
    const option = document.createElement('option');
    option.value = code;
    option.textContent = `${name} (${code})`;
    countrySelect.append(option);
    settingsCountrySelect.append(option.cloneNode(true));
    membersCountrySelect.append(option.cloneNode(true));
  }
}

function renderPlayerProfile(profile, isOwnProfile = false) {
  const card = document.querySelector('#profile-card');
  currentViewedProfile = profile;
  isOwnProfile = isOwnProfile || isCurrentUserProfile(profile);
  document.querySelector('#profile-avatar-letter').textContent = [...profile.username][0].toUpperCase();
  const avatarImage = document.querySelector('#profile-avatar-image');
  avatarImage.hidden = !profile.avatarData;
  avatarImage.removeAttribute('src');
  if (profile.avatarData) avatarImage.src = profile.avatarData;
  document.querySelector('#profile-username').replaceChildren(createCountryPlayerName(profile.username, profile.countryCode));
  document.querySelector('#player-profile-page-title').textContent = `@${profile.username}`;
  document.querySelector('#player-profile-page-description').textContent =
    isOwnProfile ? 'Your public Openboard player profile.' : `Public chess profile for @${profile.username}.`;
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
  const games = Number(profile.onlineGames) || 0;
  document.querySelector('#profile-online-elo').textContent = games
    ? Number(profile.onlineElo).toLocaleString()
    : 'Unrated';
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
  actions.hidden = isOwnProfile || isCurrentUserProfile(profile) || !profile.username;
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
  if (isCurrentUserProfile(currentViewedProfile)) {
    document.querySelector('#profile-status').textContent = 'You cannot challenge yourself.';
    renderProfileActions(currentViewedProfile, true);
    return;
  }
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
  if (isCurrentUserUsername(username)) {
    document.querySelector('#online-status').textContent = 'You cannot challenge yourself.';
    return;
  }
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
  if (isCurrentUserUsername(username)) {
    document.querySelector('#challenge-status').textContent = 'You cannot challenge yourself.';
    return;
  }
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
  joiningGameChallengeType = challenge.challengeType;
  document.querySelector('#online-room-code').value = challenge.roomCode;
  document.querySelector('#online-password-enabled').checked = false;
  document.querySelector('#online-lobby-password').value = '';
  openOnlineDialog('friends');
  connectToOnlineRoom('join', challenge.roomCode);
}

async function acknowledgeJoinedGameChallenge() {
  const challengeId = joiningGameChallengeId;
  const challengeType = joiningGameChallengeType;
  if (!challengeId) return;
  joiningGameChallengeId = '';
  joiningGameChallengeType = '';
  if (challengeType === 'rematch') return;
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
    renderPlayerProfile(profile, !username || profile.isOwnProfile === true);
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
    updateAccountUI(passwordRecoveryMode
      ? 'Choose a new password for your account.'
      : fragment.get('type') === 'signup'
        ? 'Email confirmed successfully. Your account is verified and signed in.'
        : 'Signed in. You can now join or create a lobby.');
    accountDialog.showModal();
    return;
  }

  const query = new URLSearchParams(location.search);
  const callbackError = fragment.get('error_description')
    || fragment.get('error')
    || query.get('error_description')
    || query.get('error');
  if (callbackError) {
    authMode = 'signin';
    query.delete('error');
    query.delete('error_description');
    query.delete('error_code');
    const remainingQuery = query.toString();
    history.replaceState(null, '', `${location.pathname}${remainingQuery ? `?${remainingQuery}` : ''}`);
    updateAccountUI(callbackError);
    accountDialog.showModal();
    return;
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
  const accountState = document.querySelector('#online-account-state');
  if (isSignedIn && onlineIdentityVerified && onlinePlayerName) {
    accountState.replaceChildren(
      document.createTextNode('Signed in as '),
      createCountryPlayerName(onlinePlayerName, onlinePlayerCountryCode),
    );
  } else {
    accountState.textContent = isSignedIn
      ? `Signed in · ${authSession.user?.email || 'Openboard account'}`
      : 'Sign in or create an account';
  }
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
  profileFlag.replaceChildren();
  profileButton.setAttribute('aria-label', authUsername
    ? `Your profile, ${authUsername}`
    : 'Your profile');

  if (sidebarProfileIdentity?.userId === userId) {
    const flag = createCountryFlag(sidebarProfileIdentity.countryCode);
    if (flag) profileFlag.append(flag);
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
    profileFlag.replaceChildren();
    const flag = createCountryFlag(profile.countryCode);
    if (flag) profileFlag.append(flag);
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

function getEmailConfirmationRedirectUrl() {
  const redirectUrl = new URL('./', location.href);
  redirectUrl.search = '';
  redirectUrl.hash = '';
  return redirectUrl.toString();
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
    body: JSON.stringify({
      username,
      email,
      password,
      redirectTo: getEmailConfirmationRedirectUrl(),
    }),
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
    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('Retry-After'));
      const retryMinutes = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Math.ceil(retryAfterSeconds / 60)
        : null;
      throw new Error(retryMinutes
        ? `Too many signup attempts from this network. Please try again in about ${retryMinutes} minute${retryMinutes === 1 ? '' : 's'}.`
        : 'Too many signup attempts from this network. Please try again later.');
    }
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
    const variantLabel = document.createElement('span');
    variantLabel.className = 'public-room-variant';
    variantLabel.textContent = room.variantLabel || 'Standard chess';
    const connectToRoom = (action) => {
      const password = room.locked ? window.prompt(`Password for “${room.name}”`) : '';
      if (room.locked && password === null) return;
      connectToOnlineRoom(action, room.code, password || '');
    };
    copy.append(name, details);
    if (room.host) {
      details.replaceChildren();
      if (room.inProgress) {
        details.append(createCountryPlayerName(room.host, room.hostCountryCode));
        if (!room.hostOnline) details.append(document.createTextNode(' (reconnecting)'));
        details.append(document.createTextNode(' vs '));
        if (room.opponent) {
          details.append(createCountryPlayerName(room.opponent, room.opponentCountryCode));
          if (!room.opponentOnline) details.append(document.createTextNode(' (reconnecting)'));
        } else {
          details.append(document.createTextNode('…'));
        }
        details.append(document.createTextNode(` · ${room.locked ? 'Password required · ' : ''}${room.code}`));
      } else {
        details.append(document.createTextNode('Hosted by '));
        details.append(createCountryPlayerName(room.host, room.hostCountryCode));
        if (!room.hostOnline) details.append(document.createTextNode(' (reconnecting)'));
        details.append(document.createTextNode(` · ${room.locked ? 'Password required · ' : ''}${room.code}`));
      }
    }
    copy.append(variantLabel);
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
      { icon: '↻', label: 'Next Puzzle', action: 'puzzle-next' },
      { icon: '?', label: 'Puzzle Hint', action: 'puzzle-hint' },
      { icon: '⚡', label: 'Puzzle Rush', action: 'coming-soon' },
      { icon: '⚔', label: 'Puzzle Battle', action: 'coming-soon' },
      { icon: '▧', label: 'Custom Puzzles', action: 'coming-soon' },
    ],
  },
  learn: {
    title: 'Learn',
    items: [
      { icon: '♟', label: 'Openboard Chess Academy', action: 'academy' },
      { icon: '🎓', label: 'Beginner Tutorial', action: 'tutorial' },
      { icon: '♟', label: 'Guided Practice vs Bot', action: 'practice' },
      { icon: '📘', label: 'Opening & Move Notes', action: 'opening-notes' },
      { icon: '♟', label: 'Chess Rules', action: 'rules' },
    ],
  },
  train: {
    title: 'Train',
    items: [
      { icon: '⌕', label: 'Analyze Position', action: 'analysis' },
      { icon: '✦', label: 'Suggest a Move', action: 'suggest' },
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
      { icon: '◎', label: 'Members & Profiles', action: 'members' },
    ],
  },
  other: {
    title: 'Other',
    items: [
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
  const items = menu.items.filter((item) =>
    puzzleMode || !['puzzle-next', 'puzzle-hint'].includes(item.action));
  for (const item of items) {
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
  const isPlayerProfilePage = params.get('page') === 'profile';
  gamePage.hidden = isProfilesPage || isPlayerProfilePage;
  profilesPage.hidden = !isProfilesPage;
  playerProfilePage.hidden = !isPlayerProfilePage;
  if (!isProfilesPage && !isPlayerProfilePage) return;
  if (isProfilesPage) loadCommunityMembers();
  const username = params.get('username');
  if (isProfilesPage) {
    document.querySelector('#profile-search-input').value = '';
    document.querySelector('#profile-card').hidden = true;
    document.querySelector('#profile-status').textContent = '';
    return;
  }
  if (username && /^[A-Za-z0-9_]{3,20}$/.test(username)) {
    loadPlayerProfile(username);
  } else if (authSession?.access_token) {
    loadPlayerProfile();
  } else {
    document.querySelector('#profile-card').hidden = true;
    document.querySelector('#profile-status').textContent =
      'Sign in to view your player profile, or visit a profile from the Members directory.';
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
  if (authUsername) {
    navigateToAppPage('profile', authUsername);
  } else {
    navigateToAppPage('profiles');
    document.querySelector('#profile-search-input').focus();
  }
}

function openPlayerProfile(username) {
  navigateToAppPage('profile', username);
}

function openCommunityMembers() {
  navigateToAppPage('profiles');
  document.querySelector('#community-member-query').focus();
}

async function loadCommunityMembers() {
  const requestId = ++communityMembersRequestId;
  const status = document.querySelector('#community-members-status');
  const list = document.querySelector('#community-member-list');
  status.textContent = 'Loading community members…';
  list.replaceChildren();
  const query = document.querySelector('#community-member-query').value.trim();
  const country = document.querySelector('#community-member-country').value;
  const rated = document.querySelector('#community-member-rated').checked;
  const sort = document.querySelector('#community-member-sort').value;
  if (query && !/^[A-Za-z0-9_]{1,20}$/.test(query)) {
    status.textContent = 'Search usernames using letters, numbers, and underscores.';
    return;
  }
  try {
    const endpoint = profileEndpoint('/community/members');
    if (query) endpoint.searchParams.set('search', query);
    if (country) endpoint.searchParams.set('country', country);
    if (rated) endpoint.searchParams.set('rated', 'true');
    if (sort !== 'name') endpoint.searchParams.set('sort', sort);
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error('The members directory returned an unreadable response.');
    }
    if (!response.ok) throw new Error(result.message || 'Could not load community members.');
    if (requestId !== communityMembersRequestId) return;
    if (result.message) {
      status.textContent = result.message;
      return;
    }
    for (const member of result.members || []) {
      const item = document.createElement('li');
      item.className = 'community-member';
      const avatar = createSocialAvatar(member.username, member.avatarData);
      avatar.classList.add('community-member-avatar');
      const identity = document.createElement('div');
      identity.className = 'community-member-identity';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'community-member-profile';
      link.append(createCountryPlayerName(member.username, member.countryCode));
      link.addEventListener('click', () => openPlayerProfile(member.username));
      const rating = document.createElement('small');
      rating.textContent = member.onlineElo == null
        ? 'Unrated'
        : `${Number(member.onlineElo).toLocaleString()} online · ${member.onlineGames} games`;
      identity.append(link, rating);
      const actions = document.createElement('div');
      actions.className = 'community-member-actions';
      const viewButton = document.createElement('button');
      viewButton.type = 'button';
      viewButton.className = 'secondary-button';
      viewButton.textContent = 'View profile';
      viewButton.addEventListener('click', () => openPlayerProfile(member.username));
      const friendButton = document.createElement('button');
      friendButton.type = 'button';
      friendButton.className = 'secondary-button';
      const isYou = authSession?.user?.id === member.id
        || [authUsername, authSession?.user?.user_metadata?.username]
          .filter(Boolean)
          .some((username) => username.toLowerCase() === member.username.toLowerCase());
      const isFriend = socialOverview.friends.some((friend) => friend.id === member.id);
      const outgoingRequest = socialOverview.outgoingRequests.some((entry) => entry.username.toLowerCase() === member.username.toLowerCase());
      const incomingRequest = socialOverview.incomingRequests.find((entry) => entry.username.toLowerCase() === member.username.toLowerCase());
      const blocked = socialOverview.blockedUsers.some((entry) => entry.id === member.id);
      const blockedBy = socialOverview.blockedBy.includes(member.id);
      friendButton.textContent = isYou ? 'You'
        : isFriend ? 'Friends'
        : incomingRequest ? 'Accept request'
          : outgoingRequest ? 'Request sent'
            : blocked || blockedBy ? 'Unavailable'
              : 'Add friend';
      friendButton.disabled = isYou || isFriend || outgoingRequest || blocked || blockedBy;
      friendButton.addEventListener('click', async () => {
        if (!authSession?.access_token) {
          openAccountDialog('signin');
          return;
        }
        friendButton.disabled = true;
        try {
          if (incomingRequest) {
            await requestSocialApi('/social/friends/respond', 'POST', {
              requestId: incomingRequest.id,
              accept: true,
            });
          } else {
            await requestSocialApi('/social/friends/request', 'POST', { username: member.username });
          }
          await refreshSocialOverview();
          await loadCommunityMembers();
        } catch (error) {
          document.querySelector('#community-members-status').textContent =
            error.message || 'Could not send the friend request.';
          friendButton.disabled = false;
        }
      });
      actions.append(viewButton, friendButton);
      item.append(avatar, identity, actions);
      list.append(item);
    }
    const count = (result.members || []).length;
    status.textContent = count
      ? `${count} member${count === 1 ? '' : 's'} shown${count === 50 ? ' · refine your search for more' : ''}.`
      : 'No members match these filters.';
  } catch (error) {
    console.error('Could not load community members:', error);
    if (requestId === communityMembersRequestId) {
      status.textContent = error.message || 'Could not load community members.';
    }
  }
}

function createCountryFlag(countryCode) {
  const code = typeof countryCode === 'string' ? countryCode.toLowerCase() : '';
  if (!/^[a-z]{2}$/.test(code)) return null;
  const flag = document.createElement('span');
  flag.className = 'country-flag-wrap';
  flag.setAttribute('role', 'img');
  flag.setAttribute('aria-label', `${countryLabel(code.toUpperCase()) || code.toUpperCase()} flag`);
  const image = document.createElement('img');
  image.className = 'country-flag';
  image.src = new URL(`flags/4x3/${code}.svg`, document.baseURI).href;
  image.alt = '';
  image.width = 20;
  image.height = 15;
  image.decoding = 'async';
  const fallback = document.createElement('span');
  fallback.className = 'country-flag-fallback';
  fallback.textContent = code.toUpperCase();
  fallback.hidden = true;
  image.addEventListener('error', () => {
    image.hidden = true;
    fallback.hidden = false;
  }, { once: true });
  flag.append(image, fallback);
  return flag;
}

function createCountryPlayerName(username, countryCode) {
  const label = document.createElement('span');
  label.className = 'country-player-name';
  const flag = createCountryFlag(countryCode);
  if (flag) label.append(flag);
  const name = document.createElement('span');
  name.textContent = `@${username}`;
  label.append(name);
  return label;
}

function setCountryPlayerName(element, username, countryCode) {
  element.replaceChildren(createCountryPlayerName(username, countryCode));
}

function countryLabel(countryCode) {
  if (!/^[A-Z]{2}$/.test(countryCode || '')) return '';
  return new Intl.DisplayNames([navigator.language || 'en'], { type: 'region' }).of(countryCode);
}

function isCurrentUserProfile(profile) {
  if (!authSession?.access_token || !profile) return false;
  return window.openboardProfileUtils.isOwnProfile(profile, {
    userId: authSession.user?.id,
    usernames: [authUsername, authSession.user?.user_metadata?.username],
  });
}

function isCurrentUserUsername(username) {
  return Boolean(username && [authUsername, authSession?.user?.user_metadata?.username]
    .filter(Boolean)
    .some((currentUsername) => username.toLowerCase() === currentUsername.toLowerCase()));
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
  name.append(createCountryPlayerName(username, countryCode));
  name.addEventListener('click', () => {
    closeSocialPanel();
    openPlayerProfile(username);
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
      } else if (item.status === 'pending' && item.challengeType === 'rematch') {
        description = item.isIncoming
          ? 'Wants a rematch from your recent game'
          : `Rematch request sent to @${username}`;
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
      if (item.challengeType === 'now' || item.challengeType === 'rematch') {
        actions.append(createSocialAction(
          item.challengeType === 'rematch' ? 'Open rematch' : 'Join game',
          () => joinGameChallenge(item),
          true,
        ));
        if (item.challengeType !== 'rematch') {
          actions.append(createSocialAction('Decline', () => respondToGameChallenge(item.id, false)));
        }
      } else {
        actions.append(createSocialAction('Accept', () => respondToGameChallenge(item.id, true), true));
        actions.append(createSocialAction('Decline', () => respondToGameChallenge(item.id, false)));
      }
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
    const variant = match.variant || variantFromHistoryPgn(match.pgn);
    if (variant && !isStandardHistoryVariant(variant)) {
      const variantLabel = document.createElement('span');
      variantLabel.className = 'history-variant-label';
      variantLabel.textContent = describeHistoryVariant(variant);
      item.append(variantLabel);
      const customPieces = Array.isArray(variant.customPieces) ? variant.customPieces : [];
      if (customPieces.length) {
        const pieceDetails = document.createElement('p');
        pieceDetails.className = 'history-match-meta';
        pieceDetails.textContent = `Custom pieces used: ${customPieces.map((piece) => (
          `${piece.name} (${piece.symbol})`
        )).join(', ')}`;
        item.append(pieceDetails);
      }
    }
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

function variantFromHistoryPgn(pgn) {
  if (typeof pgn !== 'string') return null;
  const encoded = pgn.match(/^\[OpenboardVariant "([^"]+)"\]$/m)?.[1];
  if (!encoded) return null;
  try {
    const variant = JSON.parse(decodeURIComponent(encoded));
    if (variant?.boardSize !== 8 || typeof variant.noDraws !== 'boolean'
      || !variant.pieceMovements || !Array.isArray(variant.customPieces)) return null;
    return variant;
  } catch (error) {
    console.error('Could not read the saved custom variant from game history:', error);
    return null;
  }
}

function isStandardHistoryVariant(variant) {
  return variant.boardSize === 8
    && variant.noDraws === false
    && variant.customPieces.length === 0
    && Object.entries(defaultCustomRules.pieceMovements).every(([piece, standardSides]) => (
      ['w', 'b'].every((color) => (
        JSON.stringify(variant.pieceMovements?.[piece]?.[color]) === JSON.stringify(standardSides[color])
      ))
    ));
}

function describeHistoryVariant(variant) {
  const names = [...new Set((variant.customPieces || [])
    .map((piece) => typeof piece.name === 'string' ? piece.name.trim() : '')
    .filter(Boolean))];
  const changedMovements = Object.entries(defaultCustomRules.pieceMovements).filter(([piece, standardSides]) => (
    ['w', 'b'].some((color) => (
      JSON.stringify(variant.pieceMovements?.[piece]?.[color]) !== JSON.stringify(standardSides[color])
    ))
  )).length;
  const parts = [];
  if (names.length) parts.push(`${names.join(', ')} variant`);
  else parts.push('Custom rules');
  if (variant.noDraws) parts.push('no draws');
  if (changedMovements) parts.push(`${changedMovements} movement rule${changedMovements === 1 ? '' : 's'} changed`);
  return parts.join(' · ');
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
  setCountryPlayerName(
    document.querySelector('#social-conversation-name'),
    friend.username,
    friend.countryCode,
  );
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
  else if (action === 'members') openCommunityMembers();
  else if (action === 'puzzle') startPuzzle();
  else if (action === 'daily-puzzle') startDailyPuzzle();
  else if (action === 'puzzle-next') startPuzzle();
  else if (action === 'puzzle-hint') showPuzzleHint();
  else if (action === 'tutorial') openBeginnerTutorial();
  else if (action === 'academy') openChessAcademy();
  else if (action === 'practice') openPracticeSetup();
  else if (action === 'rules') openChessRules();
  else if (action === 'analysis') openPositionAnalysis();
  else if (action === 'suggest') document.querySelector('#suggest-move').click();
  else if (action === 'variants') {
    if (onlineMode) showMessage('Custom rules are locked during a match', 'Set custom rules when creating a lobby. Current online-room rules cannot be changed mid-game.');
    else {
      customRulesDialogContext = 'game';
      populateCustomRulesForm();
      customRulesDialog.showModal();
    }
  }
  else if (action === 'history') openGameHistory();
  else if (action === 'opening-notes') {
    updateGameInsights();
    document.querySelector('#opening-notes-dialog').showModal();
  }
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

document.querySelector('#opening-notes-close').addEventListener('click', () => {
  document.querySelector('#opening-notes-dialog').close();
});
document.querySelector('#opening-notes-show-board').addEventListener('click', () => {
  document.querySelector('#opening-notes-dialog').close();
  document.querySelector('.game-insights').scrollIntoView({ behavior: 'smooth', block: 'center' });
});

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
  const localOnlySelectors = [
    '.game-heading',
    '.match-settings',
    '#browse-bots',
    '#online-open',
    '#piece-studio-open',
    '#custom-rules-open',
    '.game-panel > .panel-header',
    '.game-panel > .action-row',
    '.game-panel > .puzzle-progress',
    '.game-panel > .opponent-card',
    '.game-insights',
    '#practice-coach',
    '#suggest-move',
  ];
  for (const selector of localOnlySelectors) {
    const element = document.querySelector(selector);
    if (element) element.hidden = active;
  }
  document.querySelector('#offer-draw').hidden = active && (spectating || customRules.noDraws);
  document.querySelector('#play-color').disabled = active;
  document.querySelector('#time-control').disabled = active;
  document.querySelector('#difficulty').disabled = active;
  document.querySelector('#new-game').disabled = active;
  document.querySelector('#offer-draw').disabled = customRules.noDraws || (active && spectating);
  document.querySelector('#resign').disabled = active && spectating;
  document.querySelector('#flip').disabled = active;
  document.querySelector('#undo').disabled = active;
  document.querySelector('#redo').disabled = active;
  document.querySelector('#custom-rules-open').disabled = active;
  document.querySelector('#suggest-move').hidden = active && spectating;
  updateOnlineSuggestionAvailability();
  document.querySelector('#opponent-card').hidden = active;
  document.querySelector('#opponent-name').textContent = active
    ? spectating ? 'Spectating' : 'Waiting for opponent'
    : bots[difficultySelect.value].name;
  document.querySelector('#opponent-description').hidden = active;
  document.querySelector('#opponent-strength').hidden = active;
  document.querySelector('#opponent-strength').textContent = 'Unrated';
  document.querySelector('.opponent-row').dataset.playerId = '';
  document.querySelector('.opponent-row .avatar').textContent = active ? '?' : '✦';
  document.querySelector('.human-row').dataset.playerId = '';
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
    name.append(createCountryPlayerName(message.name, message.countryCode));
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

function setOnlineGameState(active, spectating = false, preserveVariant = false) {
  if (active && !onlinePreviousRules) onlinePreviousRules = JSON.parse(JSON.stringify(customRules));
  if (active && onlinePreviousClock === null) {
    onlinePreviousClock = timeControlSelect.value;
    onlinePreviousColor = playerColor;
  }
  onlineMode = active;
  onlineSpectating = active && spectating;
  gamePage.classList.toggle('is-online-game', onlineMode);
  gamePage.classList.toggle('is-spectating', onlineSpectating);
  document.querySelector('.game-panel').setAttribute(
    'aria-label',
    onlineSpectating ? 'Spectated game moves and chat' : 'Game controls and move history',
  );
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
    if (onlinePreviousRules) {
      if (!preserveVariant) customRules = onlinePreviousRules;
      onlinePreviousRules = null;
      populateCustomRulesForm();
      updateCustomRulesSummary();
    }
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
  if (onlineDrawOfferDialog.open) onlineDrawOfferDialog.close();
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

function normalizeOnlineVariant(value) {
  if (!value || typeof value !== 'object' || value.boardSize !== 8 || typeof value.noDraws !== 'boolean'
    || !value.pieceMovements || typeof value.pieceMovements !== 'object'
    || !Array.isArray(value.customPieces) || value.customPieces.length > 10) return null;
  const pieceMovements = {};
  const allowedTypes = ['p', 'n', 'b', 'r', 'q'];
  for (const type of allowedTypes) {
    const sides = value.pieceMovements[type];
    if (!sides || typeof sides !== 'object') return null;
    pieceMovements[type] = {};
    for (const color of ['w', 'b']) {
      const movements = sides[color];
      if (!Array.isArray(movements) || movements.length < 1 || movements.length > allowedTypes.length
        || movements.some((movement) => !allowedTypes.includes(movement))
        || new Set(movements).size !== movements.length) return null;
      pieceMovements[type][color] = [...movements];
    }
  }
  const customPieces = [];
  const ids = new Set();
  const replacementKeys = new Set();
  for (const piece of value.customPieces) {
    if (!piece || typeof piece.id !== 'string' || !piece.id || piece.id.length > 80 || ids.has(piece.id)
      || typeof piece.name !== 'string' || !piece.name || piece.name.length > 18
      || typeof piece.symbol !== 'string' || [...piece.symbol].length < 1 || [...piece.symbol].length > 4
      || !allowedTypes.includes(piece.replaces) || !['both', 'w', 'b'].includes(piece.color)) return null;
    ids.add(piece.id);
    for (const color of piece.color === 'both' ? ['w', 'b'] : [piece.color]) {
      const key = `${piece.replaces}:${color}`;
      if (replacementKeys.has(key)) return null;
      replacementKeys.add(key);
    }
    if (piece.studio !== undefined) {
      const studio = studioMovementPatterns(piece.studio);
      if (!studio) return null;
      customPieces.push({
        id: piece.id,
        name: piece.name,
        symbol: piece.symbol,
        replaces: piece.replaces,
        color: piece.color,
        movements: [piece.replaces],
        studio,
      });
      continue;
    }
    if (!Array.isArray(piece.movements) || piece.movements.length < 1 || piece.movements.length > allowedTypes.length
      || piece.movements.some((movement) => !allowedTypes.includes(movement))
      || new Set(piece.movements).size !== piece.movements.length) return null;
    customPieces.push({
      id: piece.id,
      name: piece.name,
      symbol: piece.symbol,
      replaces: piece.replaces,
      color: piece.color,
      movements: [...piece.movements],
    });
  }
  return { boardSize: 8, noDraws: value.noDraws, pieceMovements, customPieces };
}

function applyOnlineVariant(value) {
  const variant = normalizeOnlineVariant(value);
  if (!variant) throw new Error('This room has custom rules the current app cannot load. Update the app and rejoin.');
  customRules = variant;
  populateCustomRulesForm();
  updateCustomRulesSummary();
  if (onlineMode) configureOnlineControls(true, onlineSpectating);
}

function restoreOnlinePosition(message) {
  try {
    applyOnlineVariant(message.variant);
    startNewGame();
    if (Array.isArray(message.moves)) {
      for (const move of message.moves) {
        makeGameMove({
          from: move.from,
          to: move.to,
          promotion: move.promotion ?? 'q',
        });
      }
    } else if (typeof message.pgn === 'string' && message.pgn.trim() && !isCustomVariantActive()) {
      if (!game.load_pgn(message.pgn)) throw new Error('The saved online game could not be loaded.');
    } else if (typeof message.fen === 'string' && !game.load(message.fen)) {
      throw new Error('The saved online position could not be loaded.');
    }
    if (!Array.isArray(message.moves)) configureStartingPosition();
    if (message.fen && game.fen() !== message.fen) {
      throw new Error('The restored game does not match the room server position.');
    }
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
    if (resignationPending) resignationPending = false;
    if (rematchRequestPending) {
      rematchRequestPending = false;
      if (rematchRequestTimeout !== null) {
        window.clearTimeout(rematchRequestTimeout);
        rematchRequestTimeout = null;
      }
      document.querySelector('#game-over-rematch').disabled = false;
      document.querySelector('#game-over-rematch').textContent = 'Rematch';
      setGameOverStatus(message.message || 'The rematch request could not be sent.');
    }
    if (pendingRematchRequestId && gameOverDialog.open) {
      document.querySelector('#game-over-rematch').disabled = false;
      setGameOverStatus(message.message || 'The rematch action could not be completed.');
    }
    if (pendingRematchRequestId && rematchOfferDialog.open) {
      document.querySelector('#rematch-accept').disabled = false;
      document.querySelector('#rematch-decline').disabled = false;
      setGameOverStatus(message.message || 'The rematch request could not be completed.');
    }
    if (pendingRematchRequestId && !gameOverDialog.open && !rematchOfferDialog.open) {
      setGameOverStatus(message.message || 'The rematch action could not be completed.');
    }
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
    document.querySelector('#online-account-state').replaceChildren(
      document.createTextNode('Signed in as '),
      createCountryPlayerName(onlinePlayerName, message.countryCode),
    );
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
    try {
      applyOnlineVariant(message.variant);
    } catch (error) {
      console.error('Could not apply the new room rules:', error);
      updateOnlineStatus(error.message);
      socket.send(JSON.stringify({ type: 'leave-room' }));
      return;
    }
    onlineRoomCode = message.code;
    currentOnlineGameId = message.gameId || null;
    if (message.playerProfiles?.w?.id) {
      document.querySelector('.human-row').dataset.playerId = message.playerProfiles.w.id;
    }
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
    currentOnlineGameId = message.gameId || null;
    if (message.rematch) {
      if (gameOverDialog.open) gameOverDialog.close();
      if (rematchOfferDialog.open) rematchOfferDialog.close();
      pendingRematchRequestId = null;
      rematchRequestPending = false;
      incomingRematchOffer = false;
      document.querySelector('#game-over-dock').hidden = true;
      updateOnlineStatus('Rematch accepted. Starting a new game with colors switched.');
    }
    updateSpectatorCount(message.spectators);
    saveOnlineRoomCode(onlineRoomCode);
    if (onlineOpponentLeftDialog.open) onlineOpponentLeftDialog.close();
    document.querySelector('#online-wait-reconnect').hidden = false;
    onlineReady = true;
    playerColor = message.color === 'w' ? 'w' : 'b';
    if (onlineSpectating) {
      setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
      restoreOnlinePosition(message);
      renderSpectatorPlayers(message.players, message.playerCountries, message.playerProfiles);
      if (message.gameOver) finishOnlineGameFromServer(message);
      updateOnlineStatus(`Spectating ${message.players?.w || 'White'} vs ${message.players?.b || 'Black'}.`);
      renderBoard();
      onlineDialog.close();
      return;
    }
    const otherColor = playerColor === 'w' ? 'b' : 'w';
    setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
    updateOnlineChatAvailability();
    playColorSelect.value = playerColor;
    flipped = playerColor === 'b';
    if (!restoreOnlinePosition(message)) return;
    const localProfile = message.playerProfiles?.[playerColor];
    if (localProfile?.id) document.querySelector('.human-row').dataset.playerId = localProfile.id;
    const opponentProfile = message.playerProfiles?.[otherColor] || (
      typeof message.players?.[otherColor] === 'string'
        ? {
          username: message.players[otherColor],
          countryCode: message.playerCountries?.[otherColor],
          onlineElo: null,
        }
        : null
    );
    renderOnlineOpponentProfile(opponentProfile, otherColor);
    if (message.gameOver) finishOnlineGameFromServer(message);
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
    setOnlineChatHistory({ players: message.playerChat, spectators: message.spectatorChat });
    updateOnlineChatAvailability();
    if (!restoreOnlinePosition(message)) return;
    renderSpectatorPlayers(message.players, message.playerCountries, message.playerProfiles);
    if (message.gameOver) finishOnlineGameFromServer(message);
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
    if (onlineMode && !onlineSpectating && message.playerProfiles) {
      const opponentColor = playerColor === 'w' ? 'b' : 'w';
      renderOnlineOpponentProfile(message.playerProfiles[opponentColor], opponentColor);
    }
    updateOnlineStatus('Game result saved. Your online Elo estimate and profile record are updated.');
    if (!playerProfilePage.hidden) loadPlayerProfile(
      new URLSearchParams(location.search).get('username') || '',
    );
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
  if (message.type === 'game-ended') {
    if (message.gameId !== currentOnlineGameId) return;
    finishOnlineGameFromServer(message);
    return;
  }
  if (message.type === 'rematch-waiting') {
    pendingRematchRequestId = message.requestId;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    document.querySelector('#game-over-rematch').disabled = false;
    document.querySelector('#game-over-rematch').textContent = 'Cancel Request';
    setGameOverStatus('Rematch requested. Waiting for your opponent...');
    return;
  }
  if (message.type === 'rematch-offered') {
    document.querySelector('#rematch-accept').disabled = false;
    document.querySelector('#rematch-decline').disabled = false;
    pendingRematchRequestId = message.requestId;
    incomingRematchOffer = true;
    document.querySelector('#game-over-rematch').textContent = 'Respond to Rematch';
    document.querySelector('#rematch-offer-bubble').hidden = false;
    document.querySelector('#rematch-offer-message').textContent =
      `${message.name || 'Your opponent'} wants a rematch. Accept to start a new game with colors switched.`;
    if (gameOverDialog.open) {
      document.querySelector('#rematch-offer-bubble').hidden = true;
      if (!rematchOfferDialog.open) rematchOfferDialog.showModal();
    }
    setGameOverStatus('Your opponent requested a rematch.');
    return;
  }
  if (message.type === 'rematch-request-cancelled') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    setRematchOfferBubble(false);
    const rematchButton = document.querySelector('#game-over-rematch');
    rematchButton.disabled = false;
    rematchButton.textContent = 'Rematch';
    setGameOverStatus('Rematch request cancelled.');
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'rematch-declined') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    setRematchOfferBubble(false);
    document.querySelector('#game-over-rematch').textContent = 'Rematch';
    setGameOverStatus('Your opponent declined the rematch.');
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'rematch-declined-confirmed') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    setRematchOfferBubble(false);
    document.querySelector('#rematch-accept').disabled = false;
    document.querySelector('#rematch-decline').disabled = false;
    document.querySelector('#game-over-rematch').textContent = 'Rematch';
    if (rematchOfferDialog.open) rematchOfferDialog.close();
    setGameOverStatus('You declined the rematch.');
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'rematch-expired') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    setRematchOfferBubble(false);
    document.querySelector('#game-over-rematch').disabled = false;
    document.querySelector('#game-over-rematch').textContent = 'Rematch';
    document.querySelector('#rematch-accept').disabled = false;
    document.querySelector('#rematch-decline').disabled = false;
    document.querySelector('#game-over-rematch').textContent = 'Rematch';
    if (rematchOfferDialog.open) rematchOfferDialog.close();
    setGameOverStatus('The rematch request expired without a response.');
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'rematch-cancelled' || message.type === 'rematch-opponent-left'
    || message.type === 'rematch-opponent-disconnected' || message.type === 'opponent-returned-to-menu'
    || message.type === 'opponent-disconnected') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    setRematchOfferBubble(false);
    document.querySelector('#game-over-rematch').textContent = 'Rematch';
    if (rematchOfferDialog.open) rematchOfferDialog.close();
    setGameOverStatus(message.message || (message.type === 'opponent-returned-to-menu'
      ? 'Your opponent returned to the menu.'
      : 'Your opponent disconnected.'));
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'rematch-accepted') {
    pendingRematchRequestId = null;
    rematchRequestPending = false;
    incomingRematchOffer = false;
    if (rematchRequestTimeout !== null) {
      window.clearTimeout(rematchRequestTimeout);
      rematchRequestTimeout = null;
    }
    setRematchOfferBubble(false);
    if (rematchOfferDialog.open) rematchOfferDialog.close();
    setGameOverStatus('Your opponent accepted. Starting the rematch...');
    refreshRematchNotifications();
    return;
  }
  if (message.type === 'draw-offer-sent') {
    updateOnlineStatus('Draw offer sent. Waiting for your opponent.');
    return;
  }
  if (message.type === 'draw-offered') {
    if (onlineSpectating || customRules.noDraws) return;
    document.querySelector('#online-draw-offer-message').textContent =
      `${message.name || 'Your opponent'} offers a draw.`;
    if (!onlineDrawOfferDialog.open) onlineDrawOfferDialog.showModal();
    return;
  }
  if (message.type === 'draw-offer-declined') {
    if (onlineDrawOfferDialog.open) onlineDrawOfferDialog.close();
    updateOnlineStatus(message.reason === 'move'
      ? 'Your opponent declined the draw offer by continuing play.'
      : 'Your opponent declined the draw offer.');
    return;
  }
  if (message.type === 'draw-agreed') {
    if (onlineDrawOfferDialog.open) onlineDrawOfferDialog.close();
    markGameResult('draw', 0.5, 'draw');
    gameMessage.textContent = 'Draw by agreement.';
    updateOnlineStatus('Draw agreed. The game is over.');
    renderBoard();
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
    pendingPremove = null;
    const youResigned = message.color === playerColor;
    markGameResult(youResigned ? 'defeat' : 'victory', youResigned ? 0 : 1, 'resignation');
    gameMessage.textContent = youResigned
      ? 'You resigned. Your opponent wins.'
      : 'Your opponent resigned. You win!';
    updateOnlineStatus(gameMessage.textContent);
    renderBoard();
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
  if (isCreateAction && customRules.boardSize !== 8) {
    updateOnlineStatus('Online rooms currently use the standard 8×8 board. Select 8×8 in Custom rules before creating a lobby.');
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
      variant: customRules,
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
    if (rematchRequestPending) {
      rematchRequestPending = false;
      if (rematchRequestTimeout !== null) {
        window.clearTimeout(rematchRequestTimeout);
        rematchRequestTimeout = null;
      }
      const rematchButton = document.querySelector('#game-over-rematch');
      rematchButton.disabled = false;
      rematchButton.textContent = 'Rematch';
      setGameOverStatus('Disconnected before the server confirmed the rematch request. Reconnect and try again.');
    }
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

function finishDisconnectOnlineGame(socket = onlineSocket, preserveCompletedGame = false) {
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
  currentOnlineGameId = null;
  onlineReady = false;
  onlineIdentityVerified = false;
  onlinePendingRequest = null;
  pendingPremove = null;
  localStorage.removeItem(onlineRoomStorageKey);
  setOnlineCreatePending(false);
  if (socket?.readyState === WebSocket.OPEN) socket.close(1000, 'Left the online lobby.');
  setOnlineGameState(false, false, preserveCompletedGame);
  document.querySelector('#online-invite').hidden = true;
  updateOnlineStatus('Disconnected. You are back on the main chess screen.');
  if (!preserveCompletedGame) startNewGame();
  else document.querySelector('#menu-toggle').click();
}

function gameOverDetails(score, termination) {
  const outcomes = {
    checkmate: [
      ['Victory', 'Checkmate!', 'Congratulations! You successfully checkmated your opponent.'],
      ['Defeat', 'Checkmate', 'Your king was checkmated. Review the game and try again.'],
    ],
    resignation: [
      ['Victory', 'Opponent Resigned', 'Your opponent resigned the game. You win!'],
      ['Defeat', 'You Resigned', 'You resigned the game. Better luck next time!'],
    ],
    stalemate: [
      ['Draw', 'Stalemate', 'Neither player is in check, but the player to move has no legal moves.'],
      ['Defeat', 'Stalemate', 'Your custom rules count stalemate as a loss.'],
    ],
    threefold: [
      ['Draw', 'Threefold Repetition', 'The same position occurred three times, so the game is drawn.'],
      ['Draw', 'Threefold Repetition', 'The same position occurred three times, so the game is drawn.'],
    ],
    fiftyMove: [
      ['Draw', '50-Move Rule', 'Fifty moves passed without a pawn move or capture.'],
      ['Draw', '50-Move Rule', 'Fifty moves passed without a pawn move or capture.'],
    ],
    insufficient: [
      ['Draw', 'Insufficient Material', 'Neither side has enough material to force checkmate.'],
      ['Draw', 'Insufficient Material', 'Neither side has enough material to force checkmate.'],
    ],
    draw: [
      ['Draw', 'Draw by Agreement', 'Both players agreed to end the game in a draw.'],
      ['Draw', 'Draw by Agreement', 'Both players agreed to end the game in a draw.'],
    ],
    time: [
      ['Victory', 'Won on Time', 'Your opponent ran out of time. You win!'],
      ['Defeat', 'Time Expired', 'Your clock ran out. Better luck next time!'],
    ],
  };
  const isDraw = score === 0.5;
  if (termination === 'stalemate' && !isDraw) {
    return score === 1
      ? { result: 'victory', label: 'Victory', title: 'Won by Stalemate', description: 'Your opponent has no legal moves. Your custom rules count stalemate as a loss.' }
      : { result: 'defeat', label: 'Defeat', title: 'Stalemate', description: 'You have no legal moves. Your custom rules count stalemate as a loss.' };
  }
  const pair = outcomes[termination] ?? outcomes.draw;
  const details = pair[isDraw ? 0 : score === 1 ? 0 : 1];
  return { result: details[0].toLowerCase(), label: details[0], title: details[1], description: details[2] };
}

function showGameOver(score, termination) {
  const details = gameOverDetails(score, termination);
  gameOverDialog.dataset.result = details.result;
  document.querySelector('#game-over-result').textContent = details.label;
  document.querySelector('#game-over-title').textContent = details.title;
  document.querySelector('#game-over-description').textContent = details.description;
  document.querySelector('#game-over-icon').textContent = details.result === 'victory' ? '♛'
    : details.result === 'defeat' ? '♟' : '½';
  document.querySelector('#game-over-status').hidden = true;
  document.querySelector('#game-over-status').textContent = '';
  document.querySelector('#game-over-rematch').hidden = onlineSpectating;
  document.querySelector('#game-over-rematch').disabled = false;
  document.querySelector('#game-over-dock-rematch').hidden = onlineSpectating;
  document.querySelector('#game-over-dock').hidden = false;
  if (!gameOverDialog.open) gameOverDialog.showModal();
}

function setGameOverStatus(message) {
  const status = document.querySelector('#game-over-status');
  status.textContent = message;
  status.hidden = !message;
}

function setRematchOfferBubble(visible) {
  document.querySelector('#rematch-offer-bubble').hidden = !visible;
}

function refreshRematchNotifications() {
  if (!authSession?.access_token) return;
  void refreshSocialOverview().catch((error) => {
    console.error('Could not refresh rematch notifications:', error);
  });
}

function resetRematchUi() {
  pendingRematchRequestId = null;
  rematchRequestPending = false;
  incomingRematchOffer = false;
  if (rematchRequestTimeout !== null) {
    window.clearTimeout(rematchRequestTimeout);
    rematchRequestTimeout = null;
  }
  const rematchButton = document.querySelector('#game-over-rematch');
  rematchButton.textContent = 'Rematch';
  rematchButton.disabled = false;
  document.querySelector('#rematch-accept').disabled = false;
  document.querySelector('#rematch-decline').disabled = false;
  setRematchOfferBubble(false);
  setGameOverStatus('');
}

function finishOnlineGameFromServer(message) {
  if (!onlineMode || message.gameId !== currentOnlineGameId || !message.termination) return;
  const score = onlineSpectating ? 0.5
    : playerColor === 'w' ? message.whiteScore : 1 - message.whiteScore;
  gameMessage.textContent = message.termination === 'resignation'
    ? score === 1 ? 'Your opponent resigned. You win!' : 'You resigned. Your opponent wins.'
    : message.termination === 'checkmate'
      ? score === 1 ? 'Checkmate! You win!' : 'Checkmate. Your opponent wins.'
      : `Game ended: ${gameOverDetails(score, message.termination).title}.`;
  if (!onlineSpectating) {
    markGameResult(score === 1 ? 'victory' : score === 0 ? 'defeat' : 'draw', score, message.termination);
  } else {
    gameResult = true;
  }
  renderBoard();
}

function markGameResult(soundEvent = 'draw', humanScore = null, termination = 'draw') {
  if (gameResult) return;
  gameResult = true;
  const score = humanScore ?? (soundEvent === 'victory' ? 1 : soundEvent === 'defeat' ? 0 : 0.5);
  if (!onlineMode && !onlineSpectating) {
    recordOfflineRating(score);
    recordOfflineMatch(score, termination);
  }
  if (practiceMode) updatePracticeCoach('result');
  stopActiveSound();
  playSound(soundEvent);
  if (!onlineSpectating) showGameOver(score, termination);
}

function startNewGame() {
  if (gameOverDialog.open) gameOverDialog.close();
  document.querySelector('#game-over-dock').hidden = true;
  if (resignConfirmDialog.open) resignConfirmDialog.close();
  if (rematchOfferDialog.open) rematchOfferDialog.close();
  resetRematchUi();
  resignationPending = false;
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
  if (onlineSpectating) {
    document.querySelector('#human-color-tag').textContent = 'WHITE';
    document.querySelector('#opponent-color-tag').textContent = 'BLACK';
    document.querySelector('#human-color-label').textContent = 'White';
    document.querySelector('#human-captured-pieces').setAttribute('aria-label', 'Pieces captured by White');
    document.querySelector('#opponent-captured-pieces').setAttribute('aria-label', 'Pieces captured by Black');
    document.querySelector('#opponent-description').hidden = true;
    document.querySelector('#opponent-strength').hidden = true;
    return;
  }
  document.querySelector('#human-color-label').textContent = `${playerColor === 'w' ? 'White' : 'Black'} · ${game.turn() === playerColor ? 'Your move' : aiThinking ? 'Opponent thinking' : 'Game in progress'}`;
  document.querySelector('#human-captured-pieces').setAttribute('aria-label', 'Pieces captured by you');
  document.querySelector('#opponent-captured-pieces').setAttribute('aria-label', 'Pieces captured by your opponent');
  document.querySelector('#human-color-tag').textContent = playerColor === 'w' ? 'WHITE' : 'BLACK';
  document.querySelector('#opponent-color-tag').textContent = playerColor === 'w' ? 'BLACK' : 'WHITE';
  document.querySelector('.human-row .player-details strong').textContent = 'You';
  document.querySelector('.human-row .avatar').textContent = 'Y';
  const isHumanOpponent = onlineMode;
  document.querySelector('#opponent-description').hidden = isHumanOpponent;
  document.querySelector('#opponent-strength').hidden = false;
}

function createOnlinePlayerName(profile) {
  const label = document.createElement('span');
  label.className = 'country-player-name';
  const flag = createCountryFlag(profile.countryCode);
  if (flag) {
    label.append(flag);
  } else {
    const globe = document.createElement('span');
    globe.className = 'country-player-globe';
    globe.setAttribute('role', 'img');
    globe.setAttribute('aria-label', 'Country not set');
    globe.textContent = '🌐';
    label.append(globe);
  }
  const name = document.createElement('span');
  name.textContent = `@${profile.username}`;
  label.append(name);
  return label;
}

function renderOnlineOpponentProfile(profile, color) {
  const nameElement = document.querySelector('#opponent-name');
  const description = document.querySelector('#opponent-description');
  const strength = document.querySelector('#opponent-strength');
  description.hidden = true;
  strength.hidden = false;
  if (!profile || typeof profile.username !== 'string' || !profile.username
    || (profile.id && profile.id === authSession?.user?.id)) {
    nameElement.textContent = 'Opponent profile unavailable';
    strength.textContent = 'Unrated';
    document.querySelector('.opponent-row .avatar').textContent = '?';
    document.querySelector('.opponent-row').dataset.playerId = '';
    return;
  }
  nameElement.replaceChildren(createOnlinePlayerName(profile));
  document.querySelector('.opponent-row .avatar').textContent = [...profile.username][0].toUpperCase();
  document.querySelector('.opponent-row').dataset.playerId = profile.id || '';
  strength.textContent = Number.isInteger(profile.onlineElo)
    ? `ELO: ${profile.onlineElo.toLocaleString()}`
    : 'Unrated';
  document.querySelector('#opponent-color-tag').textContent = color === 'w' ? 'WHITE' : 'BLACK';
}

function renderSpectatorPlayers(players, playerCountries = {}, playerProfiles = {}) {
  playerCountries = playerCountries || {};
  playerProfiles = playerProfiles || {};
  const rows = [
    { row: document.querySelector('.opponent-row'), profile: playerProfiles.b, name: players?.b, countryCode: playerCountries.b, color: 'Black' },
    { row: document.querySelector('.human-row'), profile: playerProfiles.w, name: players?.w, countryCode: playerCountries.w, color: 'White' },
  ];
  for (const { row, profile, name, countryCode, color } of rows) {
    const playerName = row.querySelector('.player-details strong');
    const playerProfile = profile || (name ? {
      username: name,
      countryCode,
    } : null);
    playerName.replaceChildren(playerProfile
      ? createOnlinePlayerName(playerProfile)
      : document.createTextNode(color));
    row.dataset.playerId = playerProfile?.id || '';
    const avatar = row.querySelector('.avatar');
    avatar.textContent = name ? [...name][0].toUpperCase() : color[0];
    avatar.setAttribute('aria-label', `${color} player`);
  }
  document.querySelector('#opponent-description').hidden = true;
  document.querySelector('#opponent-strength').hidden = false;
  document.querySelector('#human-color-label').textContent = 'White';
  document.querySelector('#opponent-color-tag').textContent = 'BLACK';
  document.querySelector('#human-color-tag').textContent = 'WHITE';
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

document.querySelector('#new-game').addEventListener('click', () => {
  if (!practiceMode) {
    practiceGame = false;
    activePracticeOpening = null;
    practiceOpeningOnBook = false;
    practiceCoachHome.append(practiceCoachElement);
    practiceCoachElement.hidden = true;
    document.querySelector('#custom-rules-open').disabled = onlineMode;
    startNewGame();
    return;
  }
  practiceLastHumanMove = null;
  practiceLastBotMove = null;
  suggestedMove = null;
  startNewGame();
  updatePracticeCoach('start');
});
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
  if (!practiceMode) practiceGame = false;
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
  practiceGame = false;
  playerColor = playColorSelect.value;
  flipped = playerColor === 'b';
  savePreferences();
  startNewGame();
});
timeControlSelect.addEventListener('change', () => {
  practiceGame = false;
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
document.querySelector('#profile-back-to-community').addEventListener('click', () => navigateToAppPage('profiles'));
document.querySelector('#community-member-search').addEventListener('submit', (event) => {
  event.preventDefault();
  loadCommunityMembers();
});
document.querySelector('#community-members-refresh').addEventListener('click', loadCommunityMembers);
document.querySelector('#profile-search-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const username = document.querySelector('#profile-search-input').value.trim();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) {
    document.querySelector('#profile-card').hidden = true;
    document.querySelector('#profile-status').textContent = 'Usernames must be 3–20 letters, numbers, or underscores.';
    return;
  }
  openPlayerProfile(username);
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
  if (isCurrentUserProfile(currentViewedProfile)) {
    status.textContent = 'You cannot add yourself as a friend.';
    renderProfileActions(currentViewedProfile, true);
    return;
  }
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
  if (isCurrentUserProfile(currentViewedProfile)) {
    document.querySelector('#profile-status').textContent = 'You cannot block yourself.';
    renderProfileActions(currentViewedProfile, true);
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
    ? 'Create an account. We will email you a confirmation link to verify your address.'
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
  if (onlineSpectating || gameResult || isGameOver() || resignationPending) return;
  resignConfirmDialog.showModal();
});

document.querySelector('#resign-cancel').addEventListener('click', () => resignConfirmDialog.close());
document.querySelector('#resign-confirm').addEventListener('click', () => {
  if (resignationPending || gameResult || isGameOver()) {
    resignConfirmDialog.close();
    return;
  }
  resignationPending = true;
  resignConfirmDialog.close();
  if (onlineMode) {
    if (!onlineReady || onlineSocket?.readyState !== WebSocket.OPEN) {
      resignationPending = false;
      updateOnlineStatus('The room is not connected. Reconnect before resigning.');
      return;
    }
    onlineSocket.send(JSON.stringify({ type: 'resign' }));
    updateOnlineStatus('Resigning… waiting for the room server.');
    return;
  }
  resignationPending = false;
  markGameResult('defeat', 0, 'resignation');
  gameMessage.textContent = 'You resigned. The opponent wins.';
  renderBoard();
});

document.querySelector('#game-over-rematch').addEventListener('click', () => {
  const button = document.querySelector('#game-over-rematch');
  if (incomingRematchOffer) {
    if (!rematchOfferDialog.open) rematchOfferDialog.showModal();
    return;
  }
  if (!onlineMode) {
    gameOverDialog.close();
    startNewGame();
    return;
  }
  if (!onlineReady || onlineSocket?.readyState !== WebSocket.OPEN || !currentOnlineGameId) {
    setGameOverStatus('The room is disconnected. Reconnect before requesting a rematch.');
    return;
  }
  if (pendingRematchRequestId) {
    onlineSocket.send(JSON.stringify({
      type: 'rematch-cancel',
      gameId: currentOnlineGameId,
      requestId: pendingRematchRequestId,
    }));
    button.disabled = true;
    return;
  }
  if (rematchRequestPending) return;
  rematchRequestPending = true;
  button.disabled = true;
  button.textContent = 'Sending…';
  setGameOverStatus('Sending rematch request...');
  rematchRequestTimeout = window.setTimeout(() => {
    if (!rematchRequestPending) return;
    rematchRequestPending = false;
    rematchRequestTimeout = null;
    button.disabled = false;
    button.textContent = 'Rematch';
    setGameOverStatus('The server did not confirm the rematch request. Check your connection and try again.');
  }, 12_000);
  onlineSocket.send(JSON.stringify({ type: 'rematch-request', gameId: currentOnlineGameId }));
});

document.querySelector('#game-over-menu').addEventListener('click', () => {
  gameOverDialog.close();
  document.querySelector('#game-over-dock').hidden = true;
  if (onlineMode) {
    if (onlineSocket?.readyState === WebSocket.OPEN) {
      onlineSocket.send(JSON.stringify({ type: 'leave-room' }));
    }
    finishDisconnectOnlineGame(onlineSocket, true);
  } else {
    document.querySelector('#menu-toggle').click();
  }
});

document.querySelector('#game-over-close').addEventListener('click', () => {
  gameOverDialog.close();
});

document.querySelector('#game-over-dock-results').addEventListener('click', () => {
  if (!gameResult) return;
  if (!gameOverDialog.open) gameOverDialog.showModal();
});

document.querySelector('#game-over-dock-rematch').addEventListener('click', () => {
  if (!gameResult) return;
  if (incomingRematchOffer) {
    setRematchOfferBubble(false);
    if (!rematchOfferDialog.open) rematchOfferDialog.showModal();
    return;
  }
  if (!onlineMode) {
    startNewGame();
    return;
  }
  if (!gameOverDialog.open) gameOverDialog.showModal();
  document.querySelector('#game-over-rematch').click();
});

document.querySelector('#game-over-dock-menu').addEventListener('click', () => {
  document.querySelector('#game-over-menu').click();
});

document.querySelector('#rematch-offer-bubble').addEventListener('click', () => {
  if (!pendingRematchRequestId || onlineSocket?.readyState !== WebSocket.OPEN) return;
  setRematchOfferBubble(false);
  if (!rematchOfferDialog.open) rematchOfferDialog.showModal();
});

document.querySelector('#rematch-offer-later').addEventListener('click', () => {
  if (rematchOfferDialog.open) rematchOfferDialog.close();
  setRematchOfferBubble(Boolean(pendingRematchRequestId));
});

document.querySelector('#rematch-accept').addEventListener('click', () => {
  if (!pendingRematchRequestId || !currentOnlineGameId
    || onlineSocket?.readyState !== WebSocket.OPEN) return;
  document.querySelector('#rematch-accept').disabled = true;
  document.querySelector('#rematch-decline').disabled = true;
  onlineSocket.send(JSON.stringify({
    type: 'rematch-response',
    requestId: pendingRematchRequestId,
    gameId: currentOnlineGameId,
    accept: true,
  }));
  setGameOverStatus('Accepting rematch...');
});

document.querySelector('#rematch-decline').addEventListener('click', () => {
  if (!pendingRematchRequestId || !currentOnlineGameId
    || onlineSocket?.readyState !== WebSocket.OPEN) {
    rematchOfferDialog.close();
    return;
  }
  onlineSocket.send(JSON.stringify({
    type: 'rematch-response',
    requestId: pendingRematchRequestId,
    gameId: currentOnlineGameId,
    accept: false,
  }));
});

rematchOfferDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  rematchOfferDialog.close();
  setRematchOfferBubble(Boolean(pendingRematchRequestId));
});

document.querySelector('#offer-draw').addEventListener('click', () => {
  if (customRules.noDraws || !game.history().length || isGameOver() || gameResult) return;
  if (onlineMode) {
    if (onlineSpectating) return;
    if (onlineSocket?.readyState !== WebSocket.OPEN) {
      updateOnlineStatus('The room server is disconnected. Reconnect before offering a draw.');
      return;
    }
    onlineSocket.send(JSON.stringify({ type: 'offer-draw' }));
    return;
  }
  const materialBalance = game.board().flat().filter(Boolean).reduce((score, piece) => {
    const pieceScore = pieceValues[piece.type] * (piece.color === playerColor ? 1 : -1);
    return score + pieceScore;
  }, 0);
  const accepted = Math.abs(materialBalance) < 150;
  showMessage('Draw offer', accepted ? 'The bot accepts your draw offer.' : 'The bot declines. The game continues.');
  if (accepted) {
    markGameResult('draw', 0.5, 'draw');
    gameMessage.textContent = 'Draw by agreement.';
    renderBoard();
  }
});

function respondToOnlineDrawOffer(accept) {
  if (onlineSocket?.readyState === WebSocket.OPEN) {
    onlineSocket.send(JSON.stringify({ type: 'draw-response', accept }));
  }
  onlineDrawOfferDialog.close();
}

document.querySelector('#online-draw-offer-accept').addEventListener('click', () => {
  respondToOnlineDrawOffer(true);
});
document.querySelector('#online-draw-offer-decline').addEventListener('click', () => {
  respondToOnlineDrawOffer(false);
});
onlineDrawOfferDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  respondToOnlineDrawOffer(false);
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
    const savedTutorialProgress = Number(localStorage.getItem('openboard-tutorial-progress-v2') || 0);
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
  customRulesDialogContext = 'game';
  populateCustomRulesForm();
  customRulesDialog.showModal();
});
document.querySelector('#online-custom-rules-open').addEventListener('click', () => {
  customRulesDialogContext = 'online';
  populateCustomRulesForm();
  customRulesDialog.showModal();
});
document.querySelector('#close-custom-rules').addEventListener('click', () => customRulesDialog.close());
document.querySelector('#reset-custom-rules').addEventListener('click', () => {
  practiceGame = false;
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
  if (customRulesDialogContext === 'online' && updatedRules.boardSize !== 8) {
    showMessage('Online games use an 8×8 board', 'Custom movement rules and draw settings work online, but larger boards are currently available only for offline games.');
    return;
  }
  if (onlineMode && updatedRules.boardSize !== 8) {
    showMessage('Online games use standard chess', 'Finish or disconnect from the online room before switching to a larger board.');
    return;
  }
  practiceGame = false;
  customRules = updatedRules;
  updateCustomRulesSummary();
  savePreferences();
  customRulesDialog.close();
  if (customRulesDialogContext !== 'online') startNewGame();
  customRulesDialogContext = 'game';
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
  tutorialDemoMoves = lesson.moves || [];
  tutorialDemoMoveNotes = lesson.moveNotes || [];
  tutorialDemoMoveHighlights = lesson.moveHighlights || [];
  tutorialDemoStepIndex = 0;
  tutorialDemoGame = new Chess();
  if (!tutorialDemoStartFen || !tutorialDemoGame.load(tutorialDemoStartFen)) {
    tutorialDemoGame = null;
    throw new Error(`The chess demonstration for "${lesson.title}" has an invalid position.`);
  }
  tutorialDemoHighlights = lesson.highlightSquares || [];
  tutorialDemoFocusSquare = lesson.focusSquare || '';
  tutorialDemoFocusColor = lesson.focusColor || tutorialDemoGame.get(tutorialDemoFocusSquare)?.color || '';
  const legalTargets = getTutorialLegalTargets();
  tutorialDemoLegalTargets = legalTargets.destinations;
  tutorialDemoCaptureTargets = legalTargets.captures;
  renderBoard();
  updateTutorialPlaybackControls();
  document.querySelector('#tutorial-progress').max = learningContent.lessons.length;
  document.querySelector('#tutorial-progress').value = tutorialProgress;
  document.querySelector('#tutorial-step-label').textContent =
    `LESSON ${tutorialLessonIndex + 1} OF ${learningContent.lessons.length}`;
  document.querySelector('#tutorial-lesson-title').textContent = lesson.title;
  document.querySelector('#tutorial-lesson-text').textContent = lesson.text;
  document.querySelector('#tutorial-question').textContent = lesson.question;
  document.querySelector('#tutorial-demo-note').textContent = lesson.demoNote;
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
          localStorage.setItem('openboard-tutorial-progress-v2', String(tutorialProgress));
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
  const playing = tutorialPlaybackTimer !== null;
  const replaying = tutorialDemoMoves.length > 0 && tutorialDemoStepIndex >= tutorialDemoMoves.length;
  back.disabled = tutorialDemoStepIndex === 0;
  forward.disabled = tutorialDemoStepIndex >= tutorialDemoMoves.length;
  play.disabled = tutorialDemoMoves.length === 0;
  play.textContent = playing ? 'Pause' : replaying ? 'Replay' : 'Play';
  play.setAttribute('aria-label', playing ? 'Pause demonstration' : replaying ? 'Replay demonstration' : 'Play demonstration');
  play.setAttribute('aria-pressed', String(playing));

  const lastMove = tutorialDemoGame?.history({ verbose: true }).at(-1);
  const position = tutorialDemoStepIndex === 0
    ? 'Starting position'
    : `Step ${tutorialDemoStepIndex} of ${tutorialDemoMoves.length} · ${lastMove?.san || ''}`;
  document.querySelector('#tutorial-position').textContent = position;
  const lesson = learningContent.lessons[tutorialLessonIndex];
  const note = tutorialDemoStepIndex === 0
    ? lesson.demoNote
    : tutorialDemoMoveNotes[tutorialDemoStepIndex - 1] || `The highlighted squares show ${lastMove?.san || 'the latest move'}.`;
  const focusPiece = tutorialDemoGame?.get(tutorialDemoFocusSquare);
  const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const focusHint = tutorialDemoFocusSquare
    ? ` Dots show legal destinations for the highlighted ${pieceNames[focusPiece?.type] ?? 'piece'}; outlined squares show captures.`
    : '';
  document.querySelector('#tutorial-demo-note').textContent = `${note}${focusHint}`;
}

function stopTutorialPlayback() {
  if (tutorialPlaybackTimer !== null) clearInterval(tutorialPlaybackTimer);
  tutorialPlaybackTimer = null;
  const play = document.querySelector('#tutorial-play');
  if (play) {
    play.textContent = tutorialDemoStepIndex >= tutorialDemoMoves.length ? 'Replay' : 'Play';
    play.setAttribute('aria-label', tutorialDemoStepIndex >= tutorialDemoMoves.length ? 'Replay demonstration' : 'Play demonstration');
    play.setAttribute('aria-pressed', 'false');
  }
}

function tutorialMovePath(move) {
  const fromFile = move.from.charCodeAt(0) - 97;
  const fromRank = Number(move.from[1]);
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = Number(move.to[1]);
  const fileDistance = toFile - fromFile;
  const rankDistance = toRank - fromRank;
  const isStraightOrDiagonal = fileDistance === 0 || rankDistance === 0
    || Math.abs(fileDistance) === Math.abs(rankDistance);
  if (!isStraightOrDiagonal) return [move.from, move.to];

  const steps = Math.max(Math.abs(fileDistance), Math.abs(rankDistance));
  const squares = [];
  for (let step = 0; step <= steps; step += 1) {
    squares.push(`${String.fromCharCode(97 + fromFile + Math.sign(fileDistance) * step)}${fromRank + Math.sign(rankDistance) * step}`);
  }
  return squares;
}

function setTutorialDemoStep(stepIndex, keepPlaying = false) {
  if (!keepPlaying) stopTutorialPlayback();
  tutorialDemoGame = new Chess();
  if (!tutorialDemoGame.load(tutorialDemoStartFen)) {
    throw new Error(`The starting position for "${learningContent.lessons[tutorialLessonIndex].title}" could not be loaded.`);
  }
  const lesson = learningContent.lessons[tutorialLessonIndex];
  tutorialDemoFocusSquare = lesson.focusSquare || '';
  tutorialDemoFocusColor = lesson.focusColor
    || tutorialDemoGame.get(tutorialDemoFocusSquare)?.color
    || '';
  tutorialDemoStepIndex = Math.max(0, Math.min(tutorialDemoMoves.length, stepIndex));
  for (let index = 0; index < tutorialDemoStepIndex; index += 1) {
    const move = tutorialDemoGame.move(tutorialDemoMoves[index]);
    if (!move) {
      throw new Error(`Invalid tutorial move "${tutorialDemoMoves[index]}" in "${learningContent.lessons[tutorialLessonIndex].title}".`);
    }
    if (move.from === tutorialDemoFocusSquare && move.color === tutorialDemoFocusColor) {
      tutorialDemoFocusSquare = move.to;
    }
  }
  const legalTargets = getTutorialLegalTargets();
  tutorialDemoLegalTargets = legalTargets.destinations;
  tutorialDemoCaptureTargets = legalTargets.captures;
  if (tutorialDemoStepIndex === 0) {
    tutorialDemoHighlights = learningContent.lessons[tutorialLessonIndex].highlightSquares || [];
  } else {
    const move = tutorialDemoGame.history({ verbose: true }).at(-1);
    tutorialDemoHighlights = tutorialDemoMoveHighlights[tutorialDemoStepIndex - 1] || tutorialMovePath(move);
  }
  renderBoard();
  updateTutorialPlaybackControls();
}

function getTutorialLegalTargets() {
  if (!tutorialDemoGame || !tutorialDemoFocusSquare || !tutorialDemoFocusColor) {
    return { destinations: [], captures: [] };
  }
  const focusedPiece = tutorialDemoGame.get(tutorialDemoFocusSquare);
  if (!focusedPiece || focusedPiece.color !== tutorialDemoFocusColor) {
    return { destinations: [], captures: [] };
  }
  let legalMoveGame = tutorialDemoGame;
  if (tutorialDemoGame.turn() !== tutorialDemoFocusColor) {
    const fen = tutorialDemoGame.fen().split(' ');
    fen[1] = tutorialDemoFocusColor;
    fen[3] = '-';
    legalMoveGame = new Chess();
    if (!legalMoveGame.load(fen.join(' '))) {
      throw new Error(`Legal tutorial moves could not be calculated from ${tutorialDemoGame.fen()}.`);
    }
  }
  const moves = legalMoveGame.moves({ square: tutorialDemoFocusSquare, verbose: true });
  return {
    destinations: [...new Set(moves.map((move) => move.to))],
    captures: [...new Set(moves.filter((move) => move.captured).map((move) => move.to))],
  };
}

function startTutorialPlayback() {
  if (tutorialPlaybackTimer !== null) return;
  if (tutorialDemoStepIndex >= tutorialDemoMoves.length) setTutorialDemoStep(0);
  if (!tutorialDemoMoves.length) return;
  const speed = Number(document.querySelector('#tutorial-speed').value);
  tutorialPlaybackTimer = setInterval(() => {
    setTutorialDemoStep(tutorialDemoStepIndex + 1, true);
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
  tutorialDemoLegalTargets = [];
  tutorialDemoCaptureTargets = [];
  tutorialDemoStartFen = '';
  tutorialDemoMoves = [];
  tutorialDemoMoveNotes = [];
  tutorialDemoMoveHighlights = [];
  tutorialDemoFocusSquare = '';
  tutorialDemoFocusColor = '';
  tutorialDemoStepIndex = 0;
  renderBoard();
}

function closeBeginnerTutorial() {
  const dialog = document.querySelector('#tutorial-dialog');
  if (dialog.open) dialog.close();
  restoreTutorialBoard();
}

const academyPaths = [
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'openings', label: 'Opening library' },
  { id: 'tactics', label: 'Tactics' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'endgames', label: 'Endgames' },
];

function academyItemsForPath(path = academyPath) {
  if (path === 'fundamentals') return learningContent.lessons;
  return academyContent[path] ?? [];
}

function academyItemId(item, index) {
  return item.id ?? `${academyPath}-${index}`;
}

function saveAcademyProgress() {
  try {
    localStorage.setItem('openboard-academy-progress-v1', JSON.stringify([...academyProgress]));
  } catch (error) {
    console.error('Could not save chess academy progress:', error);
    showMessage('Progress not saved', 'Your browser could not save academy progress on this device.');
  }
}

function updateAcademyProgressDisplay() {
  const items = academyItemsForPath();
  const completed = items.filter((item, index) => academyProgress.has(academyItemId(item, index))).length;
  const next = items.find((item, index) => !academyProgress.has(academyItemId(item, index)));
  const allItems = [
    ...learningContent.lessons.map((item, index) => ({ id: `fundamentals-${index}`, path: 'fundamentals', title: item.title })),
    ...academyContent.openings.map((item) => ({ id: item.id, path: 'openings', title: item.name })),
    ...academyContent.tactics.map((item, index) => ({ id: `tactics-${index}`, path: 'tactics', title: item.name })),
    ...academyContent.strategy.map((item, index) => ({ id: `strategy-${index}`, path: 'strategy', title: item.name })),
    ...academyContent.endgames.map((item, index) => ({ id: `endgames-${index}`, path: 'endgames', title: item.name })),
  ];
  const totalCompleted = allItems.filter((item) => academyProgress.has(item.id)).length;
  document.querySelector('#academy-progress-label').textContent = next
    ? `${completed} of ${items.length} in this path · ${totalCompleted} of ${allItems.length} total`
    : `${completed} of ${items.length} in this path · ${totalCompleted} of ${allItems.length} total`;
  const progress = document.querySelector('#academy-progress');
  progress.max = Math.max(1, items.length);
  progress.value = completed;
  const weakArea = allItems
    .filter((item) => academyPerformance[item.id]?.attempts > 0)
    .sort((a, b) => {
      const scoreA = academyPerformance[a.id];
      const scoreB = academyPerformance[b.id];
      return (scoreA.correct / scoreA.attempts) - (scoreB.correct / scoreB.attempts);
    })[0];
  const recommendation = document.querySelector('#academy-recommendation');
  if (weakArea) {
    const stats = academyPerformance[weakArea.id];
    recommendation.textContent = `Review suggestion: ${weakArea.title} — ${stats.correct} correct of ${stats.attempts} exercise attempts. Progress is practice history, not a rating.`;
  } else if (next) {
    recommendation.textContent = `Suggested next: ${next.title ?? next.name}. Lessons marked “studied” are self-reported, not a mastery score.`;
  } else {
    recommendation.textContent = `This path is complete. Revisit any topic or choose another learning path.`;
  }
}

function renderAcademyNavigation() {
  const paths = document.querySelector('#academy-paths');
  paths.replaceChildren();
  for (const path of academyPaths) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'academy-path-button';
    button.textContent = path.label;
    button.setAttribute('aria-pressed', String(path.id === academyPath));
    button.addEventListener('click', () => {
      academyPath = path.id;
      academySelection = '';
      renderAcademy();
    });
    paths.append(button);
  }
  const lessonList = document.querySelector('#academy-lesson-list');
  lessonList.replaceChildren();
  for (const [index, item] of academyItemsForPath().entries()) {
    const id = academyItemId(item, index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'academy-lesson-button';
    button.setAttribute('aria-current', String(id === academySelection));
    const number = document.createElement('span');
    number.textContent = String(index + 1).padStart(2, '0');
    const title = document.createElement('span');
    title.textContent = item.title ?? item.name;
    const completion = document.createElement('small');
    completion.textContent = academyProgress.has(id) ? 'Studied' : '';
    button.append(number, title, completion);
    button.addEventListener('click', () => {
      academySelection = id;
      academyStudyIndex = 0;
      academyVariationIndex = -1;
      renderAcademy();
    });
    lessonList.append(button);
  }
  updateAcademyProgressDisplay();
}

function addAcademyInfoCard(container, heading, body) {
  const card = document.createElement('article');
  card.className = 'academy-info-card';
  const title = document.createElement('strong');
  title.textContent = heading;
  const text = document.createElement('p');
  text.textContent = body;
  card.append(title, text);
  container.append(card);
}

function renderAcademyStudyBoard(study, lastMove) {
  const board = document.querySelector('#academy-study-board');
  board.replaceChildren();
  const position = study.board();
  const interactive = academyStudyTestMode && study.turn() === academyStudyTestColor;
  const legalTargets = academyStudySelectedSquare
    ? new Set(study.moves({ square: academyStudySelectedSquare, verbose: true }).map((move) => move.to))
    : new Set();
  const focusedSquares = new Set((academyCurrentOpening()?.squares.match(/\b[a-h][1-8]\b/g) ?? []));
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${8 - rank}`;
      const piece = position[rank][file];
      const cell = document.createElement(interactive ? 'button' : 'div');
      if (interactive) cell.type = 'button';
      cell.className = `academy-study-square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      cell.dataset.square = square;
      if (lastMove?.from === square) cell.classList.add('last-from');
      if (lastMove?.to === square) cell.classList.add('last-to');
      if (focusedSquares.has(square)) cell.classList.add('study-focus');
      if (academyStudySelectedSquare === square) cell.classList.add('selected');
      if (legalTargets.has(square)) {
        const target = document.createElement('span');
        target.className = piece ? 'move-target capture-target' : 'move-target';
        cell.append(target);
      }
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${legalTargets.has(square) ? ', legal move destination' : ''}`);
      if (interactive) {
        cell.addEventListener('click', () => {
          const currentPiece = study.get(square);
          if (academyStudySelectedSquare && legalTargets.has(square)) {
            const line = academyCurrentOpening();
            if (!line) throw new Error('The active opening line is unavailable.');
            const moves = academyVariationIndex >= 0
              ? line.alternatives[academyVariationIndex].moves
              : line.moves.map(([san]) => san);
            const expectedSan = moves[study.history().length];
            const candidate = study.moves({ square: academyStudySelectedSquare, verbose: true })
              .find((move) => move.to === square);
            if (!candidate) return;
            if (candidate.san !== expectedSan) {
              academyStudyNoteOverride = `${candidate.san} is legal, but this line expects ${expectedSan ?? 'no further book move'}. Try again, ask for a hint, or reveal the line move.`;
              renderAcademyStudyBoard(study, study.history({ verbose: true }).at(-1));
              document.querySelector('#academy-study-note').textContent = academyStudyNoteOverride;
              return;
            }
            const played = study.move({ from: academyStudySelectedSquare, to: square, promotion: 'q' });
            if (!played) throw new Error(`Could not apply legal opening test move ${candidate.san}.`);
            academyStudySelectedSquare = '';
            academyStudyHintStep = 0;
            academyStudyNoteOverride = academyVariationIndex < 0
              ? line.moves[study.history().length - 1]?.[1] ?? `${played.san} is legal. Compare the resulting position with the opening’s plan.`
              : `${played.san} is legal. Compare the resulting position with the ${line.name} variation.`;
            while (study.turn() !== academyStudyTestColor && study.history().length < moves.length) {
              const reply = study.move(moves[study.history().length]);
              if (!reply) throw new Error(`Illegal test-mode reply in ${line.name}: ${moves[study.history().length]}.`);
            }
            academyStudyIndex = study.history().length;
            if (academyStudyIndex >= moves.length) {
              academyProgress.add(line.id);
              saveAcademyProgress();
              renderAcademyNavigation();
              academyStudyNoteOverride += ' You completed the full line.';
            } else if (study.turn() !== academyStudyTestColor) {
              academyStudyNoteOverride += ' It is the opponent’s turn; use Next move to continue the line.';
            }
            renderAcademyOpeningStudy(line);
            return;
          }
          if (currentPiece?.color === academyStudyTestColor) {
            academyStudySelectedSquare = square;
            academyStudyNoteOverride = 'The highlighted dots show legal moves. Try the expected opening move without a hint.';
          } else {
            academyStudySelectedSquare = '';
          }
          renderAcademyStudyBoard(study, study.history({ verbose: true }).at(-1));
          if (academyStudyNoteOverride) document.querySelector('#academy-study-note').textContent = academyStudyNoteOverride;
        });
      }
      if (file === 0) {
        const coordinate = document.createElement('span');
        coordinate.className = `coordinate rank-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        coordinate.textContent = String(8 - rank);
        cell.append(coordinate);
      }
      if (rank === 7) {
        const coordinate = document.createElement('span');
        coordinate.className = `coordinate file-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        coordinate.textContent = String.fromCharCode(97 + file);
        cell.append(coordinate);
      }
      if (piece) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`);
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '50');
        symbol.setAttribute('y', '82');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('font-family', pieceTheme.fontFamily);
        symbol.textContent = pieceTheme.symbols[piece.color][piece.type];
        svg.append(symbol);
        cell.append(svg);
      }
      board.append(cell);
    }
  }
  if (lastMove) {
    const fromFile = lastMove.from.charCodeAt(0) - 97;
    const fromRank = 8 - Number(lastMove.from[1]);
    const toFile = lastMove.to.charCodeAt(0) - 97;
    const toRank = 8 - Number(lastMove.to[1]);
    const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arrow.setAttribute('class', 'academy-board-arrow');
    arrow.setAttribute('viewBox', '0 0 800 800');
    arrow.setAttribute('aria-hidden', 'true');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'academy-arrowhead');
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '8');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '4');
    marker.setAttribute('orient', 'auto');
    const head = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    head.setAttribute('d', 'M0,0 L8,4 L0,8 Z');
    head.setAttribute('fill', '#d2ee72');
    marker.append(head);
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.append(marker);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String((fromFile + 0.5) * 100));
    line.setAttribute('y1', String((fromRank + 0.5) * 100));
    line.setAttribute('x2', String((toFile + 0.5) * 100));
    line.setAttribute('y2', String((toRank + 0.5) * 100));
    line.setAttribute('marker-end', 'url(#academy-arrowhead)');
    arrow.append(defs, line);
    board.append(arrow);
  }
}

function academyCurrentOpening() {
  return academyContent.openings.find((opening) => opening.id === academySelection);
}

function resetAcademyOpeningTest(opening, moveList) {
  academyStudyGame = new Chess();
  academyStudyIndex = 0;
  while (academyStudyGame.turn() !== academyStudyTestColor && academyStudyIndex < moveList.length) {
    const response = academyStudyGame.move(moveList[academyStudyIndex]);
    if (!response) throw new Error(`Illegal opening move at test setup in ${opening.name}.`);
    academyStudyIndex += 1;
  }
  academyStudySelectedSquare = '';
  academyStudyHintStep = 0;
  academyStudyNoteOverride = `Test mode · play as ${academyStudyTestColor === 'w' ? 'White' : 'Black'}. Your opening moves are checked against this legal line; a different legal move is not illegal chess.`;
}

function renderAcademyOpeningStudy(opening) {
  const detail = document.querySelector('#academy-lesson-detail');
  detail.replaceChildren();
  const heading = document.createElement('p');
  heading.className = 'eyebrow';
  heading.textContent = `${opening.side} repertoire · ${opening.level}`;
  const title = document.createElement('h3');
  title.textContent = opening.name;
  const style = document.createElement('p');
  style.textContent = `Style: ${opening.style}`;
  const infoGrid = document.createElement('div');
  infoGrid.className = 'academy-info-grid';
  addAcademyInfoCard(infoGrid, 'Main ideas', opening.ideas);
  addAcademyInfoCard(infoGrid, 'Plans for both sides', opening.plans);
  addAcademyInfoCard(infoGrid, 'Advantages', opening.advantages);
  addAcademyInfoCard(infoGrid, 'Trade-offs', opening.disadvantages);
  addAcademyInfoCard(infoGrid, 'Important squares', opening.squares);
  addAcademyInfoCard(infoGrid, 'Common mistakes', opening.mistakes);
  addAcademyInfoCard(infoGrid, 'Tactical opportunities', opening.tactics);
  addAcademyInfoCard(infoGrid, 'If they deviate', opening.unexpected);
  const studyLayout = document.createElement('div');
  studyLayout.className = 'academy-study-layout';
  const boardAndControls = document.createElement('div');
  boardAndControls.className = 'academy-board-and-controls';
  const board = document.createElement('div');
  board.className = 'academy-study-board';
  board.id = 'academy-study-board';
  board.setAttribute('role', 'grid');
  const controls = document.createElement('div');
  controls.className = 'academy-study-controls';
  const linePanel = document.createElement('div');
  linePanel.className = 'academy-study-line';
  const lineTitle = document.createElement('strong');
  lineTitle.id = 'academy-study-position';
  const note = document.createElement('p');
  note.id = 'academy-study-note';
  note.className = 'academy-move-note';
  const variations = document.createElement('div');
  variations.className = 'academy-variation-list';
  for (const [index, variation] of opening.alternatives.entries()) {
    const variationButton = document.createElement('button');
    variationButton.type = 'button';
    variationButton.className = 'academy-variation';
    variationButton.textContent = variation.name;
    variationButton.setAttribute('aria-pressed', String(academyVariationIndex === index));
    variationButton.addEventListener('click', () => {
      academyStudyTestMode = false;
      academyStudyNoteOverride = '';
      academyVariationIndex = index;
      academyStudyIndex = 0;
      renderAcademy();
    });
    variations.append(variationButton);
  }
  const mainLineButton = document.createElement('button');
  mainLineButton.type = 'button';
  mainLineButton.className = 'academy-variation';
  mainLineButton.textContent = 'Main line';
  mainLineButton.setAttribute('aria-pressed', String(academyVariationIndex === -1));
  mainLineButton.addEventListener('click', () => {
    academyStudyTestMode = false;
    academyStudyNoteOverride = '';
    academyVariationIndex = -1;
    academyStudyIndex = 0;
    renderAcademy();
  });
  variations.prepend(mainLineButton);
  const moveList = academyVariationIndex >= 0
    ? opening.alternatives[academyVariationIndex].moves
    : opening.moves.map(([san]) => san);
  const actions = document.createElement('div');
  for (const [label, action, disabled] of [
    ['Restart', 'restart', false],
    ['← Back', 'back', academyStudyIndex === 0 || (academyStudyTestMode && academyStudyTestColor === 'b' && academyStudyIndex === 1)],
    ['Next move →', 'next', academyStudyIndex >= moveList.length],
    ['Play line', 'play', false],
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', () => {
      if (action === 'play') {
        if (academyStudyTestMode) return;
        if (academyPlaybackTimer) {
          window.clearInterval(academyPlaybackTimer);
          academyPlaybackTimer = null;
          button.textContent = 'Play line';
          return;
        }
        button.textContent = 'Pause';
        academyPlaybackTimer = window.setInterval(() => {
          if (academyStudyIndex >= moveList.length || !academyDialog.open) {
            window.clearInterval(academyPlaybackTimer);
            academyPlaybackTimer = null;
            renderAcademy();
            return;
          }
          academyStudyIndex += 1;
          renderAcademy();
        }, 1300);
        return;
      }
      if (academyPlaybackTimer) {
        window.clearInterval(academyPlaybackTimer);
        academyPlaybackTimer = null;
      }
      academyStudyNoteOverride = '';
      if (academyStudyTestMode && action === 'restart') {
        resetAcademyOpeningTest(opening, moveList);
        renderAcademyOpeningStudy(opening);
        return;
      }
      if (academyStudyTestMode && action === 'back') {
        const previousIndex = Math.max(0, academyStudyIndex - 1);
        academyStudyGame = new Chess();
        for (let index = 0; index < previousIndex; index += 1) {
          if (!academyStudyGame.move(moveList[index])) throw new Error(`Could not rewind opening line ${opening.name}.`);
        }
        while (academyStudyGame.history().length > 0 && academyStudyGame.turn() !== academyStudyTestColor) {
          academyStudyGame.undo();
        }
        academyStudyIndex = academyStudyGame.history().length;
        academyStudySelectedSquare = '';
        renderAcademyOpeningStudy(opening);
        return;
      }
      academyStudyIndex = action === 'restart' ? 0
        : Math.max(0, Math.min(moveList.length, academyStudyIndex + (action === 'next' ? 1 : -1)));
      renderAcademy();
    });
    controls.append(button);
  }
  const testControls = document.createElement('div');
  testControls.className = 'academy-test-controls';
  const testButton = document.createElement('button');
  testButton.type = 'button';
  testButton.className = 'academy-action';
  testButton.textContent = academyStudyTestMode ? 'Exit line test' : 'Test yourself';
  testButton.addEventListener('click', () => {
    academyStudyTestMode = !academyStudyTestMode;
    academyStudySelectedSquare = '';
    academyStudyHintStep = 0;
    academyStudyNoteOverride = '';
    if (academyStudyTestMode) {
      academyStudyTestColor = sideSelect.value;
      resetAcademyOpeningTest(opening, moveList);
      renderAcademyOpeningStudy(opening);
      return;
    }
    renderAcademy();
  });
  const sideSelect = document.createElement('select');
  sideSelect.className = 'academy-test-side';
  sideSelect.setAttribute('aria-label', 'Choose side for opening test');
  sideSelect.innerHTML = '<option value="w">Test as White</option><option value="b">Test as Black</option>';
  sideSelect.value = academyStudyTestColor;
  sideSelect.hidden = !academyStudyTestMode;
  sideSelect.addEventListener('change', () => {
    if (!academyStudyTestMode) return;
    academyStudyTestColor = sideSelect.value;
    resetAcademyOpeningTest(opening, moveList);
    renderAcademyOpeningStudy(opening);
  });
  const hintButton = document.createElement('button');
  hintButton.type = 'button';
  hintButton.className = 'academy-action';
  hintButton.textContent = 'Test hint';
  hintButton.hidden = !academyStudyTestMode;
  hintButton.addEventListener('click', () => {
    const expectedSan = moveList[academyStudyGame.history().length];
    if (!expectedSan) return;
    academyStudyHintStep = Math.min(2, academyStudyHintStep + 1);
    if (academyStudyHintStep === 1) academyStudyNoteOverride = `Hint 1 · ${opening.ideas}`;
    else {
      const expectedMove = academyStudyGame.moves({ verbose: true }).find((move) => move.san === expectedSan);
      academyStudyNoteOverride = expectedMove
        ? `Hint 2 · The line moves a ${expectedMove.piece} from ${expectedMove.from}. Try to choose the destination yourself.`
        : `Hint 2 · Consider the main idea: ${opening.ideas}`;
    }
    renderAcademyOpeningStudy(opening);
  });
  const revealButton = document.createElement('button');
  revealButton.type = 'button';
  revealButton.className = 'academy-action';
  revealButton.textContent = 'Show line move';
  revealButton.hidden = !academyStudyTestMode;
  revealButton.addEventListener('click', () => {
    const ply = academyStudyGame.history().length;
    const expectedSan = moveList[ply];
    if (!expectedSan) return;
    const expectedMove = academyStudyGame.moves({ verbose: true }).find((move) => move.san === expectedSan);
    academyStudyNoteOverride = `Line answer: ${expectedSan}. ${academyVariationIndex < 0 ? opening.moves[ply]?.[1] ?? opening.unexpected : opening.unexpected}`;
    if (expectedMove) {
      suggestedMove = { from: expectedMove.from, to: expectedMove.to };
      renderBoard();
    }
    renderAcademyOpeningStudy(opening);
  });
  testControls.append(testButton, sideSelect, hintButton, revealButton);
  actions.append(testControls);
  boardAndControls.append(board, controls);
  linePanel.append(lineTitle, variations, note);
  studyLayout.append(boardAndControls, linePanel);
  const practiceButton = document.createElement('button');
  practiceButton.type = 'button';
  practiceButton.className = 'academy-action primary';
  practiceButton.textContent = 'Practice this opening against a bot';
  practiceButton.addEventListener('click', () => {
    pendingPracticeOpening = opening;
    academyDialog.close();
    openPracticeSetup();
  });
  const markButton = document.createElement('button');
  markButton.type = 'button';
  markButton.className = 'academy-action';
  markButton.textContent = academyProgress.has(opening.id) ? 'Studied ✓' : 'Mark opening studied';
  markButton.addEventListener('click', () => {
    academyProgress.add(opening.id);
    saveAcademyProgress();
    renderAcademy();
  });
  actions.append(practiceButton, markButton);
  detail.append(heading, title, style, infoGrid, studyLayout, actions);
  if (!academyStudyTestMode) academyStudyGame = new Chess();
  let latest = null;
  if (!academyStudyTestMode) {
    for (let index = 0; index < academyStudyIndex; index += 1) {
      const san = moveList[index];
      latest = academyStudyGame.move(san);
      if (!latest) throw new Error(`Invalid opening move "${san}" in ${opening.name}.`);
    }
  } else {
    latest = academyStudyGame.history({ verbose: true }).at(-1);
  }
  renderAcademyStudyBoard(academyStudyGame, latest);
  lineTitle.textContent = academyStudyIndex === 0
    ? 'Starting position'
    : `Move ${Math.ceil(academyStudyIndex / 2)} · ${latest?.san ?? ''} · ${academyStudyIndex} of ${moveList.length}`;
  if (academyStudyNoteOverride) {
    note.textContent = academyStudyNoteOverride;
  } else if (academyVariationIndex >= 0) {
    note.textContent = 'This is a legal alternative line. Move-by-move notes are provided for the main line; compare this branch to see how the position changes.';
  } else {
    note.textContent = academyStudyIndex === 0
      ? 'White moves first. Select “Next move” to see the first move and why it is played.'
      : opening.moves[academyStudyIndex - 1][1];
  }
  const nextButton = controls.querySelector('button:nth-child(3)');
  if (nextButton) nextButton.disabled = academyStudyTestMode || academyStudyIndex >= moveList.length;
  controls.querySelector('button:nth-child(4)').disabled = academyStudyTestMode;
  testButton.textContent = academyStudyTestMode ? 'Exit line test' : 'Test yourself';
  sideSelect.hidden = !academyStudyTestMode;
  hintButton.hidden = !academyStudyTestMode;
  revealButton.hidden = !academyStudyTestMode;
}

function renderAcademyPuzzleBoard(boardElement) {
  boardElement.replaceChildren();
  const position = academyPuzzleGame.board();
  const legalTargets = academyPuzzleSelected
    ? new Set(academyPuzzleGame.moves({ square: academyPuzzleSelected, verbose: true }).map((move) => move.to))
    : new Set();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${8 - rank}`;
      const piece = position[rank][file];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `academy-study-square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      cell.dataset.square = square;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${legalTargets.has(square) ? ', legal move destination' : ''}`);
      if (academyPuzzleSelected === square) cell.classList.add('selected');
      if (legalTargets.has(square)) {
        const target = document.createElement('span');
        target.className = piece ? 'move-target capture-target' : 'move-target';
        cell.append(target);
      }
      if (piece) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`);
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '50');
        symbol.setAttribute('y', '82');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('font-family', pieceTheme.fontFamily);
        symbol.textContent = pieceTheme.symbols[piece.color][piece.type];
        svg.append(symbol);
        cell.append(svg);
      }
      cell.addEventListener('click', () => {
        const puzzleStatus = document.querySelector('#academy-puzzle-status');
        if (academyPuzzleSelected && legalTargets.has(square)) {
          const isSolution = academyPuzzleSelected === academyPuzzleData.from && square === academyPuzzleData.to;
          if (isSolution) {
            const move = academyPuzzleGame.move({ from: academyPuzzleSelected, to: square, promotion: 'q' });
            if (!move || !academyPuzzleGame.in_checkmate()) {
              throw new Error(`The academy puzzle solution ${academyPuzzleData.from}-${academyPuzzleData.to} is not checkmate.`);
            }
            academyPuzzleSelected = '';
            puzzleStatus.textContent = `Correct: ${move.san} is checkmate. ${academyPuzzleData.hint}`;
            recordAcademyExerciseAttempt(true);
            academyProgress.add(academySelection);
            saveAcademyProgress();
            renderAcademyNavigation();
            renderAcademyPuzzleBoard(boardElement);
            return;
          }
          recordAcademyExerciseAttempt(false);
          puzzleStatus.textContent = 'That is legal, but it does not solve this mate-in-one. Try another move or use a hint.';
          academyPuzzleSelected = '';
        } else if (piece?.color === 'w') {
          academyPuzzleSelected = square;
          puzzleStatus.textContent = 'The highlighted squares are legal destinations. Find the move that checkmates.';
        } else {
          academyPuzzleSelected = '';
        }
        renderAcademyPuzzleBoard(boardElement);
      });
      boardElement.append(cell);
    }
  }
}

function renderAcademyExerciseBoard(boardElement, game, selectedSquare, onSquare, focusSquares = []) {
  boardElement.replaceChildren();
  const position = game.board();
  const legalTargets = selectedSquare
    ? new Set(game.moves({ square: selectedSquare, verbose: true }).map((move) => move.to))
    : new Set();
  for (let rank = 0; rank < 8; rank += 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = `${String.fromCharCode(97 + file)}${8 - rank}`;
      const piece = position[rank][file];
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `academy-study-square ${(rank + file) % 2 === 0 ? 'light' : 'dark'}`;
      if (focusSquares.includes(square)) cell.classList.add('study-focus');
      if (selectedSquare === square) cell.classList.add('selected');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', `${square}${piece ? `, ${piece.color === 'w' ? 'white' : 'black'} ${piece.type}` : ''}${legalTargets.has(square) ? ', legal move destination' : ''}`);
      if (legalTargets.has(square)) {
        const target = document.createElement('span');
        target.className = piece ? 'move-target capture-target' : 'move-target';
        cell.append(target);
      }
      if (file === 0) {
        const coordinate = document.createElement('span');
        coordinate.className = `coordinate rank-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        coordinate.textContent = String(8 - rank);
        cell.append(coordinate);
      }
      if (rank === 7) {
        const coordinate = document.createElement('span');
        coordinate.className = `coordinate file-coordinate ${(rank + file) % 2 === 0 ? 'on-light' : 'on-dark'}`;
        coordinate.textContent = String.fromCharCode(97 + file);
        cell.append(coordinate);
      }
      if (piece) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`);
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('aria-hidden', 'true');
        const symbol = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        symbol.setAttribute('x', '50');
        symbol.setAttribute('y', '82');
        symbol.setAttribute('text-anchor', 'middle');
        symbol.setAttribute('font-family', pieceTheme.fontFamily);
        symbol.textContent = pieceTheme.symbols[piece.color][piece.type];
        svg.append(symbol);
        cell.append(svg);
      }
      cell.addEventListener('click', () => onSquare(square, game.get(square), legalTargets.has(square)));
      boardElement.append(cell);
    }
  }
}

function addAcademyTacticalExercise(detail, exercise) {
  const section = document.createElement('section');
  section.className = 'academy-puzzle-exercise';
  const heading = document.createElement('h4');
  heading.textContent = exercise.kind === 'move' ? 'Find the tactical move' : 'Spot the tactical feature';
  const intro = document.createElement('p');
  intro.textContent = exercise.prompt
    ?? 'Find the legal move that demonstrates this motif. This is a curated motif exercise, not an engine claim that this is the only good move in chess.';
  const board = document.createElement('div');
  board.className = 'academy-study-board academy-puzzle-board';
  board.setAttribute('role', 'grid');
  const controls = document.createElement('div');
  controls.className = 'academy-study-controls';
  const hintButton = document.createElement('button');
  hintButton.type = 'button';
  hintButton.textContent = 'Hint';
  const revealButton = document.createElement('button');
  revealButton.type = 'button';
  revealButton.textContent = 'Reveal answer';
  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.textContent = 'Restart';
  const status = document.createElement('p');
  status.className = 'academy-move-note';
  let game = new Chess(exercise.fen);
  let selected = '';
  let hintStep = 0;
  let complete = false;
  const render = (focus = []) => renderAcademyExerciseBoard(board, game, selected, (square, piece, isLegalTarget) => {
    if (complete) return;
    if (exercise.kind === 'identify') {
      selected = piece ? square : '';
      if (square === exercise.square) {
        complete = true;
        selected = '';
        status.textContent = `Correct. ${exercise.explanation}`;
        recordAcademyExerciseAttempt(true);
        academyProgress.add(academySelection);
        saveAcademyProgress();
        renderAcademyNavigation();
      } else {
        if (piece) recordAcademyExerciseAttempt(false);
        status.textContent = piece ? `You selected the ${piece.color === 'w' ? 'white' : 'black'} ${piece.type} on ${square}. Trace the relevant line or protection relationship.` : 'Select a piece to inspect it.';
      }
      render(hintStep >= 3 && !complete ? [exercise.square] : []);
      return;
    }
    if (selected && isLegalTarget) {
      if (selected !== exercise.from || square !== exercise.to) {
        recordAcademyExerciseAttempt(false);
        status.textContent = 'That move is legal, but it does not demonstrate the target motif in this exercise. Try another move; legal chess alternatives are not necessarily mistakes.';
        selected = '';
        render(hintStep >= 3 ? [exercise.from, exercise.to] : []);
        return;
      }
      const move = game.move({ from: selected, to: square, promotion: 'q' });
      if (!move || move.san !== exercise.san) throw new Error(`Tactical exercise solution is inconsistent for ${academySelection}.`);
      complete = true;
      selected = '';
      status.textContent = `Correct: ${move.san}. ${exercise.explanation}`;
      recordAcademyExerciseAttempt(true);
      academyProgress.add(academySelection);
      saveAcademyProgress();
      renderAcademyNavigation();
      render([exercise.from, exercise.to]);
      return;
    }
    selected = piece?.color === game.turn() ? square : '';
    status.textContent = selected
      ? 'The dots show legal destinations. Look for the move that matches the motif.'
      : 'Select a piece whose turn it is to move.';
    render(hintStep >= 3 ? [exercise.from, exercise.to].filter(Boolean) : []);
  });
  hintButton.addEventListener('click', () => {
    hintStep = Math.min(3, hintStep + 1);
    status.textContent = hintStep === 1
      ? `Hint 1: Look for the relationship described by this motif. ${exercise.hint}`
      : hintStep === 2
        ? `Hint 2: ${exercise.hint}`
        : exercise.kind === 'move'
          ? `Hint 3: Consider the move ${exercise.from} to ${exercise.to}, then verify it is legal.`
          : `Hint 3: Inspect ${exercise.square}.`;
    render(hintStep >= 3 && !complete ? [exercise.from, exercise.to, exercise.square].filter(Boolean) : []);
  });
  revealButton.addEventListener('click', () => {
    if (exercise.kind === 'move') {
      status.textContent = `Answer: ${exercise.san}. ${exercise.explanation}`;
      selected = exercise.from;
      render([exercise.from, exercise.to]);
    } else {
      status.textContent = `Answer: ${exercise.square}. ${exercise.explanation}`;
      render([exercise.square]);
    }
  });
  restartButton.addEventListener('click', () => {
    game = new Chess(exercise.fen);
    selected = '';
    hintStep = 0;
    complete = false;
    status.textContent = 'Try the position again. Read the prompt and inspect the board before asking for a hint.';
    render();
  });
  controls.append(hintButton, revealButton, restartButton);
  status.textContent = 'Select a piece to see its legal moves, or select the piece that matches the prompt.';
  section.append(heading, intro, board, controls, status);
  detail.append(section);
  render();
}

function addAcademyPositionLab(detail, fen, title) {
  const section = document.createElement('section');
  section.className = 'academy-puzzle-exercise';
  const heading = document.createElement('h4');
  heading.textContent = 'Explore this position';
  const intro = document.createElement('p');
  intro.textContent = `Move pieces on the board to explore “${title}.” All moves are validated by the chess rules. This is a study sandbox, not an engine evaluation or a claim that one move is best.`;
  const board = document.createElement('div');
  board.className = 'academy-study-board academy-puzzle-board';
  board.setAttribute('role', 'grid');
  const controls = document.createElement('div');
  controls.className = 'academy-study-controls';
  const undoButton = document.createElement('button');
  undoButton.type = 'button';
  undoButton.textContent = 'Undo';
  const restartButton = document.createElement('button');
  restartButton.type = 'button';
  restartButton.textContent = 'Restart position';
  const hintButton = document.createElement('button');
  hintButton.type = 'button';
  hintButton.textContent = 'What should I inspect?';
  const status = document.createElement('p');
  status.className = 'academy-move-note';
  const history = document.createElement('p');
  history.className = 'academy-move-note';
  history.setAttribute('aria-label', 'Exploration move history');
  let game = new Chess(fen);
  let selected = '';
  const updateHistory = () => {
    const sans = game.history();
    history.textContent = sans.length
      ? `Exploration: ${sans.map((san, index) => `${index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ` : ''}${san}`).join(' ')}`
      : 'Exploration move history appears here.';
    undoButton.disabled = sans.length === 0;
  };
  const render = () => renderAcademyExerciseBoard(board, game, selected, (square, piece, isLegalTarget) => {
    if (selected && isLegalTarget) {
      const move = game.move({ from: selected, to: square, promotion: 'q' });
      if (!move) throw new Error(`Could not apply legal study move from ${selected} to ${square}.`);
      selected = '';
      status.textContent = move.san.includes('#')
        ? `${move.san} is checkmate in this position.`
        : move.san.includes('+')
          ? `${move.san} gives check. Check the opponent’s legal replies before planning further.`
          : move.captured
            ? `${move.san} captures a ${move.captured}. Recount the material and inspect the new lines.`
            : `${move.san} is legal. Inspect what it attacks, what it leaves undefended, and how the pawn structure changes.`;
      render();
      updateHistory();
      return;
    }
    selected = piece?.color === game.turn() ? square : '';
    status.textContent = selected
      ? `Selected ${piece.type} on ${square}. The dots show its legal moves.`
      : `It is ${game.turn() === 'w' ? 'White' : 'Black'} to move. Select a piece to inspect legal moves.`;
    render();
  });
  undoButton.addEventListener('click', () => {
    game.undo();
    selected = '';
    status.textContent = 'Last move undone. Compare the position before and after that decision.';
    render();
    updateHistory();
  });
  restartButton.addEventListener('click', () => {
    game = new Chess(fen);
    selected = '';
    status.textContent = 'Position restored. Try a different legal plan.';
    render();
    updateHistory();
  });
  hintButton.addEventListener('click', () => {
    const moves = game.moves({ verbose: true });
    const checks = moves.filter((move) => move.san.includes('+') || move.san.includes('#')).map((move) => move.san);
    const captures = moves.filter((move) => move.captured).map((move) => move.san);
    const details = [
      checks.length ? `Legal checks: ${checks.slice(0, 5).join(', ')}.` : 'There is no immediate legal check.',
      captures.length ? `Legal captures: ${captures.slice(0, 5).join(', ')}.` : 'There is no immediate legal capture.',
      `There are ${moves.length} legal moves. Compare king safety, piece activity, and pawn routes without assuming an engine-backed best move.`,
    ];
    status.textContent = details.join(' ');
  });
  controls.append(undoButton, restartButton, hintButton);
  section.append(heading, intro, board, controls, status, history);
  detail.append(section);
  render();
  updateHistory();
}

function addAcademyPuzzleExercise(detail) {
  const section = document.createElement('section');
  section.className = 'academy-puzzle-exercise';
  const heading = document.createElement('h4');
  heading.textContent = 'General forcing-move warm-up';
  const intro = document.createElement('p');
  intro.textContent = 'Try a verified mate-in-one position. This practices checking forcing moves and calculating the result; it is not labeled as a specific tactic motif.';
  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'academy-action primary';
  startButton.textContent = 'Load a mate-in-one exercise';
  const content = document.createElement('div');
  content.className = 'academy-puzzle-content';
  content.hidden = true;
  const board = document.createElement('div');
  board.className = 'academy-study-board academy-puzzle-board';
  board.setAttribute('role', 'grid');
  const controls = document.createElement('div');
  controls.className = 'academy-study-controls';
  const hintButton = document.createElement('button');
  hintButton.type = 'button';
  hintButton.textContent = 'Hint';
  const revealButton = document.createElement('button');
  revealButton.type = 'button';
  revealButton.textContent = 'Reveal move';
  const status = document.createElement('p');
  status.className = 'academy-move-note';
  status.id = 'academy-puzzle-status';
  hintButton.addEventListener('click', () => {
    academyPuzzleHintStep = Math.min(2, academyPuzzleHintStep + 1);
    status.textContent = academyPuzzleHintStep === 1
      ? `Hint: ${academyPuzzleData.hint}`
      : `Hint 2: the mate is delivered by moving from ${academyPuzzleData.from}.`;
  });
  revealButton.addEventListener('click', () => {
    status.textContent = `The solution is ${academyPuzzleData.from} to ${academyPuzzleData.to}. Check that the move is legal, then play it on the board.`;
    academyPuzzleSelected = academyPuzzleData.from;
    renderAcademyPuzzleBoard(board);
  });
  controls.append(hintButton, revealButton);
  content.append(board, controls, status);
  startButton.addEventListener('click', () => {
    const choices = puzzlePositions.filter((puzzle) => puzzle.fen.includes(' w '));
    academyPuzzleData = choices[Math.floor(Math.random() * choices.length)];
    academyPuzzleGame = new Chess(academyPuzzleData.fen);
    academyPuzzleSelected = '';
    academyPuzzleHintStep = 0;
    content.hidden = false;
    status.textContent = 'Find the checkmate in one. Select one of White’s pieces to see its legal destinations.';
    renderAcademyPuzzleBoard(board);
  });
  section.append(heading, intro, startButton, content);
  detail.append(section);
}

function renderAcademyLessonDetail(item, index) {
  const detail = document.querySelector('#academy-lesson-detail');
  detail.replaceChildren();
  const id = academyItemId(item, index);
  const title = document.createElement('h3');
  title.textContent = item.title ?? item.name;
  const eyebrow = document.createElement('p');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = academyPath === 'fundamentals' ? `FUNDAMENTALS · LESSON ${index + 1}` : `${academyPath.toUpperCase()} · STUDY NOTE`;
  const explanation = document.createElement('p');
  explanation.textContent = item.text ?? item.idea;
  detail.append(eyebrow, title, explanation);
  if (academyPath === 'fundamentals') {
    const demo = document.createElement('p');
    demo.textContent = `${item.demoNote} Use the existing interactive beginner lesson for its board demonstration and knowledge check.`;
    detail.append(demo);
    const lessonButton = document.createElement('button');
    lessonButton.type = 'button';
    lessonButton.className = 'academy-action primary';
    lessonButton.textContent = 'Open interactive board lesson';
    lessonButton.addEventListener('click', () => {
      tutorialLessonIndex = index;
      renderBeginnerLesson();
      academyDialog.close();
      document.querySelector('#tutorial-dialog').showModal();
    });
    detail.append(lessonButton);
  } else {
    const note = document.createElement('p');
    note.textContent = academyPath === 'tactics'
      ? 'Look for forcing moves, targets, and defensive resources. The board exercise checks the stated motif or asks you to identify a real feature; it does not pretend to provide engine analysis.'
      : academyPath === 'endgames'
        ? 'Explore legal king, rook, and pawn moves. Count the moves accurately, check the promotion race, and compare the position after each decision.'
        : 'Inspect legal moves, piece activity, king safety, and pawn structure. Use the board to compare plans rather than guessing at an engine evaluation.';
    detail.append(note);
    if (academyPath === 'tactics') {
      const exercise = academyContent.tacticalExercises[item.name];
      if (exercise) addAcademyTacticalExercise(detail, exercise);
      else addAcademyPuzzleExercise(detail);
    } else {
      const positions = academyContent.studyPositions[academyPath];
      if (!positions?.[index]) throw new Error(`Missing verified study position for ${academyPath} lesson ${index + 1}.`);
      addAcademyPositionLab(detail, positions[index], item.name);
    }
  }
  const markButton = document.createElement('button');
  markButton.type = 'button';
  markButton.className = 'academy-action';
  markButton.textContent = academyProgress.has(id) ? 'Studied ✓' : 'Mark lesson studied';
  markButton.addEventListener('click', () => {
    academyProgress.add(id);
    saveAcademyProgress();
    renderAcademy();
  });
  detail.append(markButton);
}

function renderAcademy() {
  renderAcademyNavigation();
  const index = academyItemsForPath().findIndex((item, itemIndex) => academyItemId(item, itemIndex) === academySelection);
  if (index < 0) {
    document.querySelector('#academy-lesson-detail').innerHTML =
      '<p class="eyebrow">CHOOSE A LESSON</p><h3>Build your chess understanding</h3><p>Start with the fundamentals, play through a legal opening line on the board, or study tactics, strategy, and endgames.</p>';
    return;
  }
  const item = academyItemsForPath()[index];
  if (academyPath === 'openings') renderAcademyOpeningStudy(item);
  else renderAcademyLessonDetail(item, index);
}

function openChessAcademy() {
  try {
    const storedProgress = JSON.parse(localStorage.getItem('openboard-academy-progress-v1') || '[]');
    academyProgress = new Set(Array.isArray(storedProgress) ? storedProgress.filter((id) => typeof id === 'string') : []);
    const storedPerformance = JSON.parse(localStorage.getItem('openboard-academy-performance-v1') || '{}');
    academyPerformance = storedPerformance && typeof storedPerformance === 'object' && !Array.isArray(storedPerformance)
      ? storedPerformance
      : {};
  } catch (error) {
    console.error('Could not load chess academy progress:', error);
    academyProgress = new Set();
    academyPerformance = {};
    showMessage('Progress unavailable', 'Saved academy progress could not be read; the current session can still be used.');
  }
  academyPath = 'fundamentals';
  academySelection = academyItemId(learningContent.lessons[0], 0);
  renderAcademy();
  academyDialog.showModal();
}

function openBeginnerTutorial() {
  tutorialLessonIndex = tutorialProgress >= learningContent.lessons.length ? 0 : tutorialProgress;
  renderBeginnerLesson();
  document.querySelector('#tutorial-dialog').showModal();
  boardElement.scrollIntoView({
    block: window.matchMedia('(max-width: 850px)').matches ? 'start' : 'center',
  });
}

function practiceRulesAreStandard() {
  return activeBoardSize === 8
    && !customRules.noDraws
    && customRules.customPieces.length === 0
    && Object.entries(defaultCustomRules.pieceMovements).every(([piece, sides]) =>
      JSON.stringify(customRules.pieceMovements[piece]) === JSON.stringify(sides));
}

function openPracticeSetup() {
  if (onlineMode || onlineSpectating) {
    showMessage('Guided practice unavailable', 'Leave your online game before starting a guided bot practice.');
    return;
  }
  if (!practiceRulesAreStandard()) {
    showMessage('Guided practice uses standard chess', 'Choose standard 8×8 chess in Custom Rules before starting a guided practice game.');
    return;
  }
  document.querySelector('#practice-objective').value = pendingPracticeOpening ? 'opening' : 'beginner';
  document.querySelector('#practice-objective').dispatchEvent(new Event('change'));
  practiceSetupDialog.showModal();
}

function startGuidedPractice() {
  if (onlineMode || onlineSpectating || !practiceRulesAreStandard()) {
    practiceSetupDialog.close();
    openPracticeSetup();
    return;
  }
  const botId = practiceBotSelect.value;
  const bot = bots[botId];
  if (!bot) throw new Error(`Unknown guided-practice opponent: ${botId}`);
  practiceObjective = document.querySelector('#practice-objective').value;
  practiceMode = practiceObjective !== 'free';
  practiceGame = true;
  practiceLastHumanMove = null;
  practiceLastBotMove = null;
  practiceLastMessage = '';
  practiceCoachAuto = document.querySelector('#practice-auto-coach').checked;
  practiceCoachFrequency = document.querySelector('#practice-coach-frequency').value;
  practiceHintsEnabled = document.querySelector('#practice-hints-enabled').checked;
  practiceHintStep = 0;
  practiceHintMove = null;
  activePracticeOpening = pendingPracticeOpening;
  practiceOpeningOnBook = Boolean(activePracticeOpening);
  pendingPracticeOpening = null;
  difficultySelect.value = botId;
  playerColor = document.querySelector('#practice-color').value;
  flipped = playerColor === 'b';
  playColorSelect.value = playerColor;
  timeControlSelect.value = '0';
  practiceSetupDialog.close();
  difficultySelect.dispatchEvent(new Event('change'));
  playColorSelect.disabled = true;
  timeControlSelect.disabled = true;
  difficultySelect.disabled = true;
  document.querySelector('#custom-rules-open').disabled = true;
  practiceCoachHome.append(practiceCoachElement);
  practiceCoachElement.hidden = !practiceMode;
  if (practiceMode) document.querySelector('.moves-section').before(practiceCoachElement);
  document.querySelector('#practice-hint').disabled = !practiceHintsEnabled;
  document.querySelector('#practice-reveal').disabled = !practiceHintsEnabled;
  startNewGame();
  if (practiceMode) updatePracticeCoach('start');
  document.querySelector('#game').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function practiceMoveDescription(move, side) {
  if (!move) return 'No move has been played yet.';
  const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  const pieceName = pieceNames[move.piece] ?? 'piece';
  let explanation = ({
    p: 'Pawns move forward and capture diagonally.',
    n: 'Knights move in an L shape and can jump over other pieces.',
    b: 'Bishops move diagonally along clear squares.',
    r: 'Rooks move straight along clear rows or columns.',
    q: 'Queens move straight or diagonally along clear squares.',
    k: 'Kings move one square at a time and must stay safe.',
  })[move.piece];
  if (move.flags?.includes('k') || move.flags?.includes('q')) {
    explanation = 'Castling moves the king two squares and brings a rook closer to safety.';
  } else if (move.promotion) {
    explanation = `The pawn reached the far side and promoted to a ${pieceNames[move.promotion]}.`;
  } else if (move.captured) {
    explanation = `The ${pieceName} captured a ${pieceNames[move.captured]} on ${move.to}.`;
  }
  const checkText = move.san?.includes('#')
    ? ' That is checkmate.'
    : move.san?.includes('+') ? ' That gives check.' : '';
  return `${side} moved the ${pieceName} from ${move.from} to ${move.to}. ${explanation}${checkText}`;
}

function practiceAttackedPieces() {
  const pieces = [];
  for (const rank of '12345678') {
    for (const file of 'abcdefgh') {
      const square = `${file}${rank}`;
      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) continue;
      const targetFile = file.charCodeAt(0) - 97;
      const targetRank = Number(rank);
      let isAttacked = false;
      for (const enemyRank of '12345678') {
        for (const enemyFile of 'abcdefgh') {
          const attacker = game.get(`${enemyFile}${enemyRank}`);
          if (!attacker || attacker.color === piece.color) continue;
          const fromFile = enemyFile.charCodeAt(0) - 97;
          const fromRank = Number(enemyRank);
          const fileDelta = targetFile - fromFile;
          const rankDelta = targetRank - fromRank;
          const absFile = Math.abs(fileDelta);
          const absRank = Math.abs(rankDelta);
          const attacks = attacker.type === 'p'
            ? absFile === 1 && rankDelta === (attacker.color === 'w' ? 1 : -1)
            : attacker.type === 'n'
              ? (absFile === 1 && absRank === 2) || (absFile === 2 && absRank === 1)
              : attacker.type === 'k'
                ? Math.max(absFile, absRank) === 1
                : attacker.type === 'r'
                  ? fileDelta === 0 || rankDelta === 0
                  : attacker.type === 'b'
                    ? absFile === absRank
                    : attacker.type === 'q'
                      ? fileDelta === 0 || rankDelta === 0 || absFile === absRank
                      : false;
          if (!attacks) continue;
          if (['r', 'b', 'q'].includes(attacker.type)) {
            const stepFile = Math.sign(fileDelta);
            const stepRank = Math.sign(rankDelta);
            let pathFile = fromFile + stepFile;
            let pathRank = fromRank + stepRank;
            let blocked = false;
            while (pathFile !== targetFile || pathRank !== targetRank) {
              if (game.get(`${String.fromCharCode(97 + pathFile)}${pathRank}`)) {
                blocked = true;
                break;
              }
              pathFile += stepFile;
              pathRank += stepRank;
            }
            if (blocked) continue;
          }
          isAttacked = true;
          break;
        }
        if (isAttacked) break;
      }
      if (isAttacked) pieces.push(square);
    }
  }
  return pieces;
}

function practiceMoveNeedsExplanation(move) {
  return practiceCoachFrequency === 'every'
    || move.captured
    || move.san?.includes('+')
    || move.san?.includes('#')
    || move.promotion
    || move.flags?.includes('k')
    || move.flags?.includes('q');
}

function updatePracticeCoach(stage = 'turn') {
  if (!practiceMode) return;
  const message = document.querySelector('#practice-coach-message');
  const latest = game.history({ verbose: true }).at(-1);
  const threatened = practiceAttackedPieces();
  const attackedText = threatened.length
    ? `Opponent pieces geometrically attack your ${threatened.map((square) => `${game.get(square).type} on ${square}`).join(', ')}. Check whether each target is defended; a pinned attacker may not be able to move legally.`
    : 'No piece of yours is geometrically attacked by the opponent in this position.';
  let guidance;
  if (gameResult || isGameOver()) {
    guidance = isCheckmate()
      ? game.turn() === playerColor
        ? 'The game is over: your king was checkmated. That happens when your king is attacked and has no safe escape. Review the moves, then try another difficulty.'
        : 'You won by checkmate! The opposing king had no safe way out. Great work—try a tougher opponent when you’re ready.'
      : 'The game ended in a draw. A draw is a normal result in chess; review the final position and try again.';
  } else if (stage === 'hint' || stage === 'explain') {
    guidance = practiceLastMessage;
  } else if (stage === 'start' || !practiceLastHumanMove) {
    const side = playerColor === 'w' ? 'White' : 'Black';
    const startText = playerColor === 'w'
      ? 'White moves first. Click a piece and choose one of its highlighted legal squares. A pawn move such as e2–e4 or d2–d4 is one way to contest the center.'
      : 'You are Black, so the bot makes White’s first move. Then click one of your pieces and choose a highlighted legal square.';
    const objectiveText = {
      beginner: 'Focus first on legal moves, king safety, and noticing when a piece is attacked.',
      opening: 'Focus on central control, developing minor pieces, king safety, and making each move useful.',
      tactics: 'Before each turn, scan checks, captures, and threats; verify the opponent’s reply before committing.',
      strategy: 'Look for the least active piece and a useful square, while keeping your king safe.',
      endgame: 'Keep your king active and calculate pawn advances and promotion races carefully.',
      general: 'Take a moment to inspect forcing moves, attacked pieces, and your least active piece.',
    }[practiceObjective];
    guidance = `${startText} ${objectiveText} Hints are available when enabled.`;
    if (activePracticeOpening) guidance += ` This practice follows the ${activePracticeOpening.name} main line while both sides play its moves.`;
  } else if (stage === 'human') {
    guidance = `${practiceMoveDescription(practiceLastHumanMove, 'You')} The bot is thinking. After its reply, inspect the actual position for attacks and safe responses.`;
  } else {
    const botExplanation = practiceMoveDescription(practiceLastBotMove ?? latest, bots[difficultySelect.value]?.name ?? 'Your opponent');
    const turnText = game.in_check()
      ? 'Your king is in check; your next move must remove the check.'
      : `It is your turn, with ${game.moves().length} legal moves available.`;
    const openingNote = activePracticeOpening && !practiceOpeningOnBook
      ? ` The game has left the ${activePracticeOpening.name} study line; your move is still legal, and the bot now responds from the live position.`
      : '';
    guidance = `${botExplanation} ${turnText} ${attackedText} Look for checks, captures, and threats before choosing a plan.${openingNote}`;
  }
  practiceLastMessage = guidance;
  message.textContent = guidance;
}

function endGuidedPractice() {
  if (!practiceGame) return;
  practiceMode = false;
  practiceGame = false;
  practiceLastHumanMove = null;
  practiceLastBotMove = null;
  activePracticeOpening = null;
  practiceOpeningOnBook = false;
  practiceCoachHome.append(practiceCoachElement);
  practiceCoachElement.hidden = true;
  playColorSelect.disabled = onlineMode;
  timeControlSelect.disabled = onlineMode;
  difficultySelect.disabled = onlineMode;
  document.querySelector('#custom-rules-open').disabled = onlineMode;
  gameMessage.textContent = 'Guided practice ended. Your current game stays available; start a new game to use the normal settings.';
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

function showPuzzleHint() {
  if (!puzzleMode) {
    showMessage('Puzzle hint', 'Start the mate-in-one puzzle first.');
    return;
  }
  showMessage('Puzzle hint', puzzlePositions[puzzleCurrentIndex].hint);
}
document.querySelector('#tutorial-close').addEventListener('click', closeBeginnerTutorial);
document.querySelector('#tutorial-dialog').addEventListener('close', restoreTutorialBoard);
document.querySelector('#tutorial-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeBeginnerTutorial();
});
document.querySelector('#tutorial-ask-question').addEventListener('click', () => {
  stopTutorialPlayback();
  updateTutorialPlaybackControls();
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
  if (tutorialPlaybackTimer !== null) {
    stopTutorialPlayback();
    updateTutorialPlaybackControls();
  } else {
    startTutorialPlayback();
  }
});
document.querySelector('#tutorial-speed').addEventListener('input', (event) => {
  const speed = Number(event.currentTarget.value);
  document.querySelector('#tutorial-speed-value').textContent = `${speed}×`;
  if (tutorialPlaybackTimer !== null) {
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
document.querySelector('#practice-setup-close').addEventListener('click', () => {
  pendingPracticeOpening = null;
  practiceSetupDialog.close();
});
practiceSetupDialog.addEventListener('click', (event) => {
  if (event.target === practiceSetupDialog) {
    pendingPracticeOpening = null;
    practiceSetupDialog.close();
  }
});
practiceSetupDialog.addEventListener('close', () => {
  if (pendingPracticeOpening) pendingPracticeOpening = null;
});
document.querySelector('#practice-start').addEventListener('click', startGuidedPractice);
document.querySelector('#practice-end').addEventListener('click', endGuidedPractice);
document.querySelector('#practice-objective').addEventListener('change', (event) => {
  const guided = event.target.value !== 'free';
  document.querySelector('#practice-auto-coach').disabled = !guided;
  document.querySelector('#practice-hints-enabled').disabled = !guided;
});
document.querySelector('#practice-hint').addEventListener('click', () => {
  if (!practiceMode || !practiceHintsEnabled || aiThinking || gameResult || isGameOver()) return;
  if (game.turn() !== playerColor) {
    document.querySelector('#practice-coach-message').textContent = 'Wait for the bot to finish its turn, then ask for a hint.';
    return;
  }
  if (!practiceHintMove) {
    practiceHintMove = findBestMove({ depth: 2, variety: 1 });
    practiceHintStep = 0;
  }
  if (!practiceHintMove) {
    document.querySelector('#practice-coach-message').textContent = 'There are no legal moves in this position. The game may be over.';
    return;
  }
  practiceHintStep = Math.min(3, practiceHintStep + 1);
  const suggestion = practiceHintMove;
  const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
  practiceLastMessage = practiceHintStep === 1
    ? 'Hint 1 · Scan forcing moves first: checks, captures, and direct threats. Then check whether your king or an attacked piece needs attention. This position has ' + game.moves().length + ' legal moves.'
    : practiceHintStep === 2
      ? `Hint 2 · A quick local search found ${suggestion.san} as one candidate. Look at your ${pieceNames[suggestion.piece] ?? 'piece'} on ${suggestion.from} and consider what it could accomplish.`
      : `Hint 3 · The candidate is ${suggestion.san}: move from ${suggestion.from} to ${suggestion.to}.${suggestion.captured ? ' It captures an opponent’s piece.' : ''}${suggestion.san.includes('+') ? ' It gives check.' : ''} This is a local-search suggestion, not a verified engine-best claim.`;
  if (practiceHintStep === 3) suggestedMove = { from: suggestion.from, to: suggestion.to };
  updatePracticeCoach('hint');
  renderBoard();
});
document.querySelector('#practice-reveal').addEventListener('click', () => {
  if (!practiceMode || !practiceHintsEnabled || aiThinking || gameResult || isGameOver() || game.turn() !== playerColor) return;
  practiceHintMove = findBestMove({ depth: 2, variety: 1 });
  if (!practiceHintMove) {
    document.querySelector('#practice-coach-message').textContent = 'There are no legal moves in this position. The game may be over.';
    return;
  }
  practiceHintStep = 3;
  suggestedMove = { from: practiceHintMove.from, to: practiceHintMove.to };
  practiceLastMessage = `Candidate revealed · ${practiceHintMove.san}, from ${practiceHintMove.from} to ${practiceHintMove.to}.${practiceHintMove.captured ? ' It captures an opponent’s piece.' : ''}${practiceHintMove.san.includes('+') ? ' It gives check.' : ''} This is a quick local-search candidate, not an engine-certified best move.`;
  updatePracticeCoach('hint');
  renderBoard();
});
document.querySelector('#practice-explain').addEventListener('click', () => {
  if (!practiceMode) return;
  const latest = game.history({ verbose: true }).at(-1);
  if (!latest) {
    document.querySelector('#practice-coach-message').textContent = 'No moves yet. You are White and move first; click one of your pieces, then one of its highlighted legal squares.';
    return;
  }
  const side = latest.color === playerColor ? 'You' : bots[difficultySelect.value]?.name ?? 'Your opponent';
  practiceLastMessage = `Last move: ${practiceMoveDescription(latest, side)}`;
  updatePracticeCoach('explain');
});

document.querySelector('#academy-close').addEventListener('click', () => academyDialog.close());
academyDialog.addEventListener('click', (event) => {
  if (event.target === academyDialog) academyDialog.close();
});
academyDialog.addEventListener('close', () => {
  if (academyPlaybackTimer) {
    window.clearInterval(academyPlaybackTimer);
    academyPlaybackTimer = null;
  }
});

function openPositionAnalysis() {
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
}

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
  if (onlineMode || onlineSpectating) return;
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
