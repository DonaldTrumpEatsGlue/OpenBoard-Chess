(() => {
  const pieceSymbols = {
    w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
    b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
  };
  const types = ['k', 'q', 'r', 'b', 'n', 'p'];

  function decodeFen(fen) {
    const fields = typeof fen === 'string' ? fen.trim().split(/\s+/) : [];
    if (fields.length !== 6) throw new Error('FEN must contain six fields.');
    const ranks = fields[0].split('/');
    if (ranks.length !== 8 || !['w', 'b'].includes(fields[1])
      || (fields[2] !== '-' && (!/^[KQkq]+$/.test(fields[2]) || new Set(fields[2]).size !== fields[2].length))
      || (fields[3] !== '-' && !/^[a-h][36]$/.test(fields[3]))
      || !/^\d+$/.test(fields[4]) || !/^[1-9]\d*$/.test(fields[5])) {
      throw new Error('FEN fields are malformed. Check the side to move, castling, en passant, and move counters.');
    }
    const board = ranks.map((rank) => {
      const row = [];
      for (const token of rank) {
        if (/^[1-8]$/.test(token)) row.push(...Array(Number(token)).fill(null));
        else if (/^[pnbrqkPNBRQK]$/.test(token)) {
          row.push({ type: token.toLowerCase(), color: token === token.toUpperCase() ? 'w' : 'b' });
        } else throw new Error('FEN piece placement contains an unknown symbol.');
      }
      if (row.length !== 8) throw new Error('Each FEN rank must describe exactly eight squares.');
      return row;
    });
    return {
      board,
      turn: fields[1],
      castling: fields[2] === '-' ? '' : fields[2],
      enPassant: fields[3] === '-' ? '' : fields[3],
      halfmove: Number(fields[4]),
      fullmove: Number(fields[5]),
    };
  }

  function parseFen(Chess, fen) {
    try {
      return new Chess(fen);
    } catch (error) {
      throw new Error(`Invalid FEN: ${error.message}`);
    }
  }

  function validateFen(Chess, fen) {
    let position;
    try {
      position = parseFen(Chess, fen);
    } catch (error) {
      return [error.message];
    }
    const board = position.board();
    const kings = { w: [], b: [] };
    const errors = [];
    board.forEach((row, rowIndex) => row.forEach((piece, fileIndex) => {
      if (!piece) return;
      const square = `${String.fromCharCode(97 + fileIndex)}${8 - rowIndex}`;
      if (piece.type === 'k') kings[piece.color].push(square);
      if (piece.type === 'p' && (rowIndex === 0 || rowIndex === 7)) {
        errors.push(`Move the ${piece.color === 'w' ? 'White' : 'Black'} pawn on ${square}; pawns cannot start on the first or eighth rank.`);
      }
    }));
    for (const color of ['w', 'b']) {
      if (kings[color].length === 0) {
        errors.push(`Add at least one ${color === 'w' ? 'White' : 'Black'} king.`);
      }
    }
    if (kings.w.length && kings.b.length) {
      for (const whiteKing of kings.w) {
        for (const blackKing of kings.b) {
          const fileDistance = Math.abs(whiteKing.charCodeAt(0) - blackKing.charCodeAt(0));
          const rankDistance = Math.abs(Number(whiteKing.slice(1)) - Number(blackKing.slice(1)));
          if (Math.max(fileDistance, rankDistance) <= 1) {
            errors.push(`The kings on ${whiteKing} and ${blackKing} cannot be adjacent.`);
          }
        }
      }
      const sideToMove = position.turn();
      const previousSideKings = sideToMove === 'w' ? kings.b : kings.w;
      if (typeof position.is_attacked === 'function'
        && previousSideKings.some((king) => position.is_attacked(king, sideToMove))) {
        errors.push('The side that just moved cannot leave any of its kings in check. Adjust the pieces or change whose turn it is.');
      }
    }
    const [, turn, castling, enPassant] = position.fen().split(' ');
    for (const [right, square, type, color] of [
      ['K', 'e1', 'k', 'w'], ['Q', 'e1', 'k', 'w'], ['K', 'h1', 'r', 'w'], ['Q', 'a1', 'r', 'w'],
      ['k', 'e8', 'k', 'b'], ['q', 'e8', 'k', 'b'], ['k', 'h8', 'r', 'b'], ['q', 'a8', 'r', 'b'],
    ]) {
      if (castling.includes(right) && position.get(square)?.type !== type) {
        errors.push(`Remove the ${right} castling right or restore the ${color === 'w' ? 'White' : 'Black'} ${type === 'k' ? 'king' : 'rook'} on ${square}.`);
      } else if (castling.includes(right) && position.get(square)?.color !== color) {
        errors.push(`The ${right} castling right requires a ${color === 'w' ? 'White' : 'Black'} piece on ${square}.`);
      }
    }
    if (enPassant !== '-') {
      const expectedRank = turn === 'w' ? '6' : '3';
      const file = enPassant.match(/^[a-h]/)?.[0];
      const capturedSquare = `${file}${turn === 'w' ? '5' : '4'}`;
      const capturedPawn = position.get(capturedSquare);
      if (!file || enPassant[1] !== expectedRank || position.get(enPassant)
        || capturedPawn?.type !== 'p' || capturedPawn.color !== (turn === 'w' ? 'b' : 'w')) {
        errors.push('The en passant target must match the last two-square pawn move and the side to move.');
      }
    }
    return [...new Set(errors)];
  }

  function createFen(board, turn, castling, enPassant, halfmove, fullmove) {
    const rows = board.map((row) => {
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
      if (empty) encoded += empty;
      return encoded;
    });
    const castlingRights = ['K', 'Q', 'k', 'q'].filter((right) => castling.includes(right)).join('') || '-';
    const ep = enPassant || '-';
    return `${rows.join('/')} ${turn} ${castlingRights} ${ep} ${halfmove} ${fullmove}`;
  }

  function standardBoard() {
    return decodeFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1').board;
  }

  function symbols() {
    return structuredClone(pieceSymbols);
  }

  window.OpenboardPositionSetup = { createFen, decodeFen, parseFen, standardBoard, symbols, types, validateFen };
})();
