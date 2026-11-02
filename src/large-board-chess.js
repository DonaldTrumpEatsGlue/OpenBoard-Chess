(() => {
  const allowedSizes = new Set([10, 12, 14, 16, 18, 20]);
  const backRank = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
  const expansionPieces = ['n', 'b', 'r', 'q', 'n', 'b'];

  function fileName(file) {
    let value = file + 1;
    let name = '';
    while (value > 0) {
      value -= 1;
      name = String.fromCharCode(97 + (value % 26)) + name;
      value = Math.floor(value / 26);
    }
    return name;
  }

  function fileIndex(name) {
    let value = 0;
    for (const character of name) value = value * 26 + character.charCodeAt(0) - 96;
    return value - 1;
  }

  class LargeBoardChess {
    constructor(size) {
      if (!allowedSizes.has(size)) throw new Error('Large chess boards must be 10, 12, 14, 16, 18, or 20 squares wide.');
      this.size = size;
      this.coreOffset = (size - backRank.length) / 2;
      this.customMovements = new Map();
      this.reset();
    }

    reset() {
      this.squares = Array.from({ length: this.size }, () => Array(this.size).fill(null));
      this.turnColor = 'w';
      this.halfmoveClock = 0;
      this.fullmoveNumber = 1;
      this.movesHistory = [];
      this.customMovements.clear();
      this.castlingRights = { w: { k: true, q: true }, b: { k: true, q: true } };
      this.enPassantSquare = null;

      const extraCount = this.coreOffset;
      const outer = expansionPieces.slice(0, extraCount).reverse();
      const row = [...outer, ...backRank, ...outer.slice().reverse()];
      row.forEach((type, col) => {
        this.squares[0][col] = { type, color: 'b' };
        this.squares[1][col] = { type: 'p', color: 'b' };
        this.squares[this.size - 2][col] = { type: 'p', color: 'w' };
        this.squares[this.size - 1][col] = { type, color: 'w' };
      });
    }

    squareToPosition(square) {
      if (typeof square !== 'string') return null;
      const match = /^([a-z]+)(\d+)$/.exec(square);
      if (!match) return null;
      const col = fileIndex(match[1]);
      const rank = Number(match[2]);
      const row = this.size - rank;
      return col >= 0 && col < this.size && row >= 0 && row < this.size ? { row, col } : null;
    }

    positionToSquare(row, col) {
      return `${fileName(col)}${this.size - row}`;
    }

    get(square) {
      const position = this.squareToPosition(square);
      return position ? this.squares[position.row][position.col] : undefined;
    }

    put(piece, square) {
      const position = this.squareToPosition(square);
      if (!position || !piece || !'pnbrqk'.includes(piece.type) || !['w', 'b'].includes(piece.color)) return false;
      this.squares[position.row][position.col] = { type: piece.type, color: piece.color };
      return true;
    }

    remove(square) {
      const position = this.squareToPosition(square);
      if (!position) return null;
      const piece = this.squares[position.row][position.col];
      this.squares[position.row][position.col] = null;
      return piece;
    }

    board() {
      return this.squares.map((row) => row.map((piece) => piece && { ...piece }));
    }

    turn() {
      return this.turnColor;
    }

    clearCustomMovements() {
      this.customMovements.clear();
    }

    setCustomMovement(square, definition) {
      const position = this.squareToPosition(square);
      if (!position) throw new Error('Invalid square for a custom movement rule.');
      if (definition == null) {
        this.customMovements.delete(square);
        return;
      }
      this.customMovements.set(square, definition);
    }

    moves(options = {}) {
      const sources = options.square
        ? [options.square]
        : this.squares.flatMap((row, rowIndex) => row.map((piece, colIndex) =>
          piece?.color === this.turnColor ? this.positionToSquare(rowIndex, colIndex) : null).filter(Boolean));
      return sources.flatMap((from) => {
        const piece = this.get(from);
        if (!piece || piece.color !== this.turnColor) return [];
        return this.pseudoMoves(from, piece).map((move) => options.verbose ? move : move.san);
      });
    }

    pseudoMoves(from, piece, attacksOnly = false) {
      const position = this.squareToPosition(from);
      if (!position) return [];
      const custom = this.customMovements.get(from);
      if (custom) return this.customMoves(from, piece, position, custom, attacksOnly);
      const directions = {
        n: [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]],
        k: [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]],
        b: [[1, 1], [1, -1], [-1, 1], [-1, -1]],
        r: [[1, 0], [-1, 0], [0, 1], [0, -1]],
        q: [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]],
      };
      if (piece.type === 'p') return this.pawnMoves(from, piece, position, attacksOnly);
      const vectors = directions[piece.type] ?? [];
      const range = ['b', 'r', 'q'].includes(piece.type) ? this.size : 1;
      const moves = vectors.flatMap(([dx, dy]) => {
        const targets = [];
        for (let distance = 1; distance <= range; distance += 1) {
          const row = position.row - dy * distance;
          const col = position.col + dx * distance;
          if (!this.isInside(row, col)) break;
          const target = this.squares[row][col];
          if (target?.color === piece.color) break;
          if (attacksOnly || !target || target.color !== piece.color) {
            targets.push(this.makeMove(from, row, col, piece, target));
          }
          if (target) break;
        }
        return targets;
      });
      return piece.type === 'k' && !attacksOnly
        ? [...moves, ...this.castlingMoves(from, piece, position)]
        : moves;
    }

    pawnMoves(from, piece, position, attacksOnly) {
      const direction = piece.color === 'w' ? -1 : 1;
      if (attacksOnly) {
        return [-1, 1].flatMap((dx) => {
          const row = position.row + direction;
          const col = position.col + dx;
          return this.isInside(row, col) ? [this.makeMove(from, row, col, piece, null)] : [];
        });
      }
      const moves = [];
      const nextRow = position.row + direction;
      if (this.isInside(nextRow, position.col) && !this.squares[nextRow][position.col]) {
        moves.push(this.makeMove(from, nextRow, position.col, piece, null));
        const startRow = piece.color === 'w' ? this.size - 2 : 1;
        const doubleRow = nextRow + direction;
        if (position.row === startRow && !this.squares[doubleRow][position.col]) {
          moves.push(this.makeMove(from, doubleRow, position.col, piece, null));
        }
      }
      for (const dx of [-1, 1]) {
        const row = position.row + direction;
        const col = position.col + dx;
        if (!this.isInside(row, col)) continue;
        const target = this.squares[row][col];
        const to = this.positionToSquare(row, col);
        if (target && target.color !== piece.color) moves.push(this.makeMove(from, row, col, piece, target));
        else if (!target && to === this.enPassantSquare) moves.push(this.makeMove(from, row, col, piece, this.squares[position.row][col], 'e'));
      }
      return moves.flatMap((move) => move.promotion
        ? ['q', 'r', 'b', 'n'].map((promotion) => ({ ...move, promotion }))
        : [move]);
    }

    castlingMoves(from, piece, position) {
      const rank = piece.color === 'w' ? '1' : String(this.size);
      if (from !== this.positionToSquare(piece.color === 'w' ? this.size - 1 : 0, this.coreOffset + 4)
        || !this.castlingRights[piece.color].k && !this.castlingRights[piece.color].q) return [];
      return ['k', 'q'].flatMap((side) => {
        if (!this.castlingRights[piece.color][side]) return [];
        const rookCol = this.coreOffset + (side === 'k' ? 7 : 0);
        const kingTargetCol = this.coreOffset + (side === 'k' ? 6 : 2);
        const rookSquare = this.positionToSquare(position.row, rookCol);
        if (this.get(rookSquare)?.type !== 'r' || this.get(rookSquare)?.color !== piece.color) return [];
        const direction = side === 'k' ? 1 : -1;
        for (let col = position.col + direction; col !== kingTargetCol + direction; col += direction) {
          if (col !== position.col && this.squares[position.row][col]) return [];
        }
        return [this.makeMove(from, position.row, kingTargetCol, piece, null, side)];
      });
    }

    customMoves(from, piece, position, definition, attacksOnly) {
      const destinations = new Map();
      for (const vector of definition.vectors) {
        const mode = vector.mode ?? definition.captureMode ?? 'both';
        const isAttack = mode === 'attack' || mode === 'both' || mode === 'capture';
        const isMove = mode === 'both' || mode === 'move';
        if (attacksOnly && !isAttack) continue;
        if (!attacksOnly && !isMove && !isAttack) continue;
        let dx = vector.dx;
        let dy = vector.dy * (definition.mirror && piece.color === 'b' ? -1 : 1);
        if (definition.movementType === 'slide') {
          const divisor = this.gcd(Math.abs(dx), Math.abs(dy)) || 1;
          dx /= divisor;
          dy /= divisor;
        }
        const maxDistance = definition.movementType === 'slide' ? definition.range : 1;
        for (let distance = 1; distance <= maxDistance; distance += 1) {
          const row = position.row - dy * distance;
          const col = position.col + dx * distance;
          if (!this.isInside(row, col)) break;
          const target = this.squares[row][col];
          if (attacksOnly || (!target && isMove)) {
            if (attacksOnly) destinations.set(`${row},${col}`, this.makeMove(from, row, col, piece, target));
            else if (!target && isMove) destinations.set(`${row},${col}`, this.makeMove(from, row, col, piece, null));
          } else if (!attacksOnly && target.color !== piece.color && (mode === 'both' || mode === 'capture')) {
            destinations.set(`${row},${col}`, this.makeMove(from, row, col, piece, target));
          }
          if (target && !definition.jump && definition.movementType !== 'leap') break;
          if (definition.movementType !== 'slide') break;
        }
      }
      return [...destinations.values()];
    }

    makeMove(from, row, col, piece, captured, specialFlag = '') {
      const to = this.positionToSquare(row, col);
      const promotion = piece.type === 'p' && (row === 0 || row === this.size - 1) ? 'q' : undefined;
      return {
        color: piece.color,
        from,
        to,
        piece: piece.type,
        captured: captured?.type,
        promotion,
        flags: specialFlag || (captured ? 'c' : 'n'),
        san: `${piece.type === 'p' ? '' : piece.type.toUpperCase()}${captured ? 'x' : ''}${to}`,
      };
    }

    move(move) {
      const fromPosition = this.squareToPosition(move.from);
      const toPosition = this.squareToPosition(move.to);
      if (!fromPosition || !toPosition) throw new Error('Invalid move coordinates.');
      const piece = this.squares[fromPosition.row][fromPosition.col];
      if (!piece) throw new Error('There is no piece on the source square.');
      const captured = this.squares[toPosition.row][toPosition.col];
      const snapshot = {
        squares: this.board(),
        turnColor: this.turnColor,
        halfmoveClock: this.halfmoveClock,
        fullmoveNumber: this.fullmoveNumber,
        customMovements: new Map(this.customMovements),
        castlingRights: structuredClone(this.castlingRights),
        enPassantSquare: this.enPassantSquare,
      };
      const flags = move.flags ?? (captured ? 'c' : 'n');
      const applied = {
        ...move,
        color: piece.color,
        piece: move.piece ?? piece.type,
        captured: (flags.includes('e') ? this.squares[fromPosition.row][toPosition.col] : captured)?.type,
        flags,
        san: move.san ?? `${piece.type === 'p' ? '' : piece.type.toUpperCase()}${captured || flags.includes('e') ? 'x' : ''}${move.to}`,
      };
      this.movesHistory.push({ move: applied, snapshot });
      if (flags.includes('e')) {
        const capturedSquare = this.positionToSquare(fromPosition.row, toPosition.col);
        this.squares[fromPosition.row][toPosition.col] = null;
        this.customMovements.delete(capturedSquare);
      }
      if (flags.includes('k') || flags.includes('q')) {
        const rookFromCol = this.coreOffset + (flags.includes('k') ? 7 : 0);
        const rookToCol = this.coreOffset + (flags.includes('k') ? 5 : 3);
        this.squares[fromPosition.row][rookToCol] = this.squares[fromPosition.row][rookFromCol];
        this.squares[fromPosition.row][rookFromCol] = null;
        const rookFrom = this.positionToSquare(fromPosition.row, rookFromCol);
        const rookTo = this.positionToSquare(fromPosition.row, rookToCol);
        const rookMovement = this.customMovements.get(rookFrom);
        this.customMovements.delete(rookFrom);
        if (rookMovement) this.customMovements.set(rookTo, rookMovement);
      }
      this.squares[toPosition.row][toPosition.col] = move.promotion
        ? { type: move.promotion, color: piece.color }
        : piece;
      this.squares[fromPosition.row][fromPosition.col] = null;
      const custom = this.customMovements.get(move.from);
      this.customMovements.delete(move.from);
      this.customMovements.delete(move.to);
      if (custom && !move.promotion) this.customMovements.set(move.to, custom);
      const homeRankRow = piece.color === 'w' ? this.size - 1 : 0;
      const leftRook = this.positionToSquare(homeRankRow, this.coreOffset);
      const rightRook = this.positionToSquare(homeRankRow, this.coreOffset + 7);
      if (piece.type === 'k') this.castlingRights[piece.color] = { k: false, q: false };
      if (move.from === leftRook) this.castlingRights[piece.color].q = false;
      if (move.from === rightRook) this.castlingRights[piece.color].k = false;
      if (move.to === leftRook) this.castlingRights[piece.color === 'w' ? 'b' : 'w'].q = false;
      if (move.to === rightRook) this.castlingRights[piece.color === 'w' ? 'b' : 'w'].k = false;
      this.enPassantSquare = piece.type === 'p' && Math.abs(fromPosition.row - toPosition.row) === 2
        ? this.positionToSquare((fromPosition.row + toPosition.row) / 2, fromPosition.col)
        : null;
      this.halfmoveClock = piece.type === 'p' || captured ? 0 : this.halfmoveClock + 1;
      if (piece.color === 'b') this.fullmoveNumber += 1;
      this.turnColor = piece.color === 'w' ? 'b' : 'w';
      return applied;
    }

    undo() {
      const entry = this.movesHistory.pop();
      if (!entry) return null;
      this.squares = entry.snapshot.squares.map((row) => row.map((piece) => piece && { ...piece }));
      this.turnColor = entry.snapshot.turnColor;
      this.halfmoveClock = entry.snapshot.halfmoveClock;
      this.fullmoveNumber = entry.snapshot.fullmoveNumber;
      this.customMovements = new Map(entry.snapshot.customMovements);
      this.castlingRights = structuredClone(entry.snapshot.castlingRights);
      this.enPassantSquare = entry.snapshot.enPassantSquare;
      return entry.move;
    }

    history(options = {}) {
      const moves = this.movesHistory.map(({ move }) => options.verbose ? { ...move } : move.san);
      return moves;
    }

    is_attacked(square, color) {
      return this.squares.some((row, rowIndex) => row.some((piece, colIndex) => {
        if (!piece || piece.color !== color) return false;
        const from = this.positionToSquare(rowIndex, colIndex);
        return this.pseudoMoves(from, piece, true).some((move) => move.to === square);
      }));
    }

    fen() {
      const rows = this.squares.map((row) => {
        let encoded = '';
        let empty = 0;
        for (const piece of row) {
          if (!piece) {
            empty += 1;
            continue;
          }
          if (empty) encoded += empty;
          empty = 0;
          encoded += piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
        }
        return encoded + (empty || '');
      });
      return `${rows.join('/')} ${this.turnColor} - - ${this.halfmoveClock} ${this.fullmoveNumber}`;
    }

    pgn() {
      const moves = this.history();
      const turns = [];
      for (let index = 0; index < moves.length; index += 2) {
        turns.push(`${Math.floor(index / 2) + 1}. ${moves[index]}${moves[index + 1] ? ` ${moves[index + 1]}` : ''}`);
      }
      return `[Variant "Openboard ${this.size}x${this.size}"]\n\n${turns.join(' ')}`;
    }

    load(fen) {
      const [position, turn = 'w', , , halfmove = '0', fullmove = '1'] = String(fen).trim().split(/\s+/);
      const rows = position.split('/');
      if (rows.length !== this.size || !['w', 'b'].includes(turn)) return false;
      const parsed = rows.map((row) => {
        const cells = [];
        for (const character of row) {
          if (/\d/.test(character)) {
            const count = Number(character);
            for (let index = 0; index < count; index += 1) cells.push(null);
          } else if (/^[pnbrqkPNBRQK]$/.test(character)) {
            cells.push({ type: character.toLowerCase(), color: character === character.toUpperCase() ? 'w' : 'b' });
          } else return null;
        }
        return cells.length === this.size ? cells : null;
      });
      if (parsed.some((row) => !row)) return false;
      this.squares = parsed;
      this.turnColor = turn;
      this.halfmoveClock = Number(halfmove) || 0;
      this.fullmoveNumber = Number(fullmove) || 1;
      this.movesHistory = [];
      this.castlingRights = { w: { k: false, q: false }, b: { k: false, q: false } };
      this.enPassantSquare = null;
      this.clearCustomMovements();
      return true;
    }

    load_pgn() {
      return false;
    }

    in_threefold_repetition() {
      return false;
    }

    insufficient_material() {
      return false;
    }

    isInside(row, col) {
      return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }

    gcd(a, b) {
      while (b) [a, b] = [b, a % b];
      return a;
    }
  }

  globalThis.OpenboardLargeChess = LargeBoardChess;
})();
