function replaceOnce(source, before, after, label) {
  const firstIndex = source.indexOf(before);
  if (firstIndex < 0 || source.indexOf(before, firstIndex + before.length) >= 0) {
    throw new Error(`Could not patch chess.js ${label}: expected exactly one matching source block.`);
  }
  return `${source.slice(0, firstIndex)}${after}${source.slice(firstIndex + before.length)}`;
}

export function patchChessSource(source) {
  let patched = replaceOnce(
    source,
    '  var board = new Array(128)\n',
    '  var board = new Array(128)\n  var custom_movements = {}\n',
    'custom movement state',
  );
  patched = replaceOnce(
    patched,
    `    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE
    }

`,
    `    if (tokens[2].indexOf('q') > -1) {
      castling.b |= BITS.QSIDE_CASTLE
    }
    if (castling.w && board[SQUARES.e1] && board[SQUARES.e1].type === KING
      && board[SQUARES.e1].color === WHITE) kings.w = SQUARES.e1
    if (castling.b && board[SQUARES.e8] && board[SQUARES.e8].type === KING
      && board[SQUARES.e8].color === BLACK) kings.b = SQUARES.e8

`,
    'castling king selection with multiple kings',
  );
  patched = replaceOnce(
    patched,
    `    /* don't let the user place more than one king */
    if (
      piece.type == KING &&
      !(kings[piece.color] == EMPTY || kings[piece.color] == sq)
    ) {
      return false
    }

`,
    `    /* Track one king for the base rules engine; the app validates every king. */
`,
    'multiple royal kings',
  );
  patched = replaceOnce(
    patched,
    `    if (piece && piece.type === KING) {
      kings[piece.color] = EMPTY
    }
`,
    `    if (piece && piece.type === KING && kings[piece.color] === SQUARES[square]) {
      kings[piece.color] = EMPTY
      for (var king_square = SQUARES.a8; king_square <= SQUARES.h1; king_square++) {
        if (king_square & 0x88) {
          king_square += 7
          continue
        }
        if (board[king_square] && board[king_square].type === KING
          && board[king_square].color === piece.color) {
          kings[piece.color] = king_square
          break
        }
      }
    }
`,
    'multiple royal king removal',
  );
  patched = replaceOnce(
    patched,
    '  function generate_moves(options) {\n',
    `  function custom_vector_mode(definition, vector) {
    return vector.mode || definition.captureMode || 'both'
  }

  function custom_vector_offset(vector, color, definition, distance) {
    var dx = vector.dx
    var dy = vector.dy * (definition.mirror && color === BLACK ? -1 : 1)
    if (definition.movementType === 'slide') {
      var a = Math.abs(dx)
      var b = Math.abs(dy)
      while (b) {
        var remainder = a % b
        a = b
        b = remainder
      }
      var divisor = a || 1
      dx /= divisor
      dy /= divisor
    }
    return (dx - 16 * dy) * distance
  }

  function custom_attacks_square(from, to, definition) {
    for (var i = 0; i < definition.vectors.length; i++) {
      var vector = definition.vectors[i]
      var mode = custom_vector_mode(definition, vector)
      if (mode !== 'attack' && mode !== 'both' && mode !== 'capture') continue
      var limit = definition.movementType === 'slide' ? definition.range : 1
      for (var distance = 1; distance <= limit; distance++) {
        var target = from + custom_vector_offset(vector, board[from].color, definition, distance)
        if (target & 0x88) break
        if (target === to) return true
        if (board[target] != null && !definition.jump && definition.movementType !== 'leap') break
      }
    }
    return false
  }

  function generate_moves(options) {
`,
    'custom movement helpers',
  );
  patched = replaceOnce(
    patched,
    '      if (piece.type === PAWN) {\n        /* single square, non-capturing */\n',
    `      if (custom_movements[i]) {
        var definition = custom_movements[i]
        var destinations = {}
        for (var vectorIndex = 0; vectorIndex < definition.vectors.length; vectorIndex++) {
          var vector = definition.vectors[vectorIndex]
          var mode = custom_vector_mode(definition, vector)
          if (mode === 'attack') continue
          var limit = definition.movementType === 'slide' ? definition.range : 1
          for (var distance = 1; distance <= limit; distance++) {
            var target = i + custom_vector_offset(vector, us, definition, distance)
            if (target & 0x88) break
            var occupant = board[target]
            if (occupant == null) {
              if (mode === 'both' || mode === 'move') {
                if (!destinations[target]) {
                  add_move(board, moves, i, target, BITS.NORMAL)
                  destinations[target] = true
                }
              }
            } else {
              if (occupant.color === them && (mode === 'both' || mode === 'capture')
                && !destinations[target]) {
                add_move(board, moves, i, target, BITS.CAPTURE)
                destinations[target] = true
              }
              if (!definition.jump && definition.movementType !== 'leap') break
            }
            if (definition.movementType !== 'slide') break
          }
        }
      } else if (piece.type === PAWN) {
        /* single square, non-capturing */
`,
    'custom move generation',
  );
  patched = replaceOnce(
    patched,
    '        board[from].type === PAWN &&\n',
    '        (board[from].type === PAWN || (custom_movements[from] && custom_movements[from].promotion)) &&\n',
    'custom promotion',
  );
  patched = replaceOnce(
    patched,
    '  function attacked(color, square) {\n',
    `  function attacked(color, square) {
    for (var custom_from = SQUARES.a8; custom_from <= SQUARES.h1; custom_from++) {
      if (custom_from & 0x88) {
        custom_from += 7
        continue
      }
      if (custom_movements[custom_from] && board[custom_from] != null
        && board[custom_from].color === color
        && custom_attacks_square(custom_from, square, custom_movements[custom_from])) return true
    }
`,
    'custom attack detection',
  );
  patched = replaceOnce(
    patched,
    '      if (board[i] == null || board[i].color !== color) continue\n',
    '      if (board[i] == null || board[i].color !== color || custom_movements[i]) continue\n',
    'custom attacks replace native attacks',
  );
  patched = replaceOnce(
    patched,
    '      move: move,\n',
    '      move: move,\n      custom_movements: Object.assign({}, custom_movements),\n',
    'custom move history snapshot',
  );
  patched = replaceOnce(
    patched,
    '    push(move)\n\n    board[move.to] = board[move.from]\n',
    `    push(move)
    var custom_movement = custom_movements[move.from]
    delete custom_movements[move.from]
    delete custom_movements[move.to]
    if (custom_movement && !(move.flags & BITS.PROMOTION)) {
      custom_movements[move.to] = custom_movement
    }

    board[move.to] = board[move.from]
`,
    'custom move identity',
  );
  patched = replaceOnce(
    patched,
    '        board[castling_from] = null\n      } else if (move.flags & BITS.QSIDE_CASTLE)',
    `        board[castling_from] = null
        if (custom_movements[castling_from]) {
          custom_movements[castling_to] = custom_movements[castling_from]
          delete custom_movements[castling_from]
        }
      } else if (move.flags & BITS.QSIDE_CASTLE)`,
    'custom king-side castling identity',
  );
  patched = replaceOnce(
    patched,
    '        board[castling_from] = null\n      }\n\n      /* turn off castling */',
    `        board[castling_from] = null
        if (custom_movements[castling_from]) {
          custom_movements[castling_to] = custom_movements[castling_from]
          delete custom_movements[castling_from]
        }
      }

      /* turn off castling */`,
    'custom queen-side castling identity',
  );
  patched = replaceOnce(
    patched,
    '    var move = old.move\n',
    '    var move = old.move\n    custom_movements = old.custom_movements\n',
    'custom move undo',
  );
  patched = replaceOnce(
    patched,
    '    load: function(fen) {\n      return load(fen)\n    },\n',
    `    load: function(fen) {
      custom_movements = {}
      return load(fen)
    },

    setCustomMovement: function(square, definition) {
      if (!(square in SQUARES)) throw new Error('Invalid square for a custom movement rule.')
      if (definition == null) {
        delete custom_movements[SQUARES[square]]
        return
      }
      if (!Array.isArray(definition.vectors) || !['step', 'slide', 'leap'].includes(definition.movementType)
        || !Number.isInteger(definition.range) || definition.range < 1 || definition.range > 8
        || !definition.vectors.every(function(vector) {
          return vector && Number.isInteger(vector.dx) && Number.isInteger(vector.dy)
            && Math.abs(vector.dx) <= 8 && Math.abs(vector.dy) <= 8
            && (vector.dx !== 0 || vector.dy !== 0)
            && ['both', 'move', 'capture', 'attack'].indexOf(vector.mode || definition.captureMode || 'both') >= 0
        })) {
        throw new Error('Invalid custom movement definition.')
      }
      custom_movements[SQUARES[square]] = definition
    },

    clearCustomMovements: function() {
      custom_movements = {}
    },

    is_attacked: function(square, color) {
      if (!(square in SQUARES) || (color !== WHITE && color !== BLACK)) {
        throw new Error('Invalid square or color for attack detection.')
      }
      return attacked(color, SQUARES[square])
    },
`,
    'custom movement API',
  );
  patched = replaceOnce(
    patched,
    '    reset: function() {\n      return reset()\n    },\n',
    '    reset: function() {\n      custom_movements = {}\n      return reset()\n    },\n',
    'custom movement reset',
  );
  patched = replaceOnce(
    patched,
    '    load_pgn: function(pgn, options) {\n',
    '    load_pgn: function(pgn, options) {\n      custom_movements = {}\n',
    'custom movement PGN reset',
  );
  patched = replaceOnce(
    patched,
    '    clear: function() {\n      return clear()\n    },\n',
    '    clear: function() {\n      custom_movements = {}\n      return clear()\n    },\n',
    'custom movement clear',
  );
  return patched;
}
