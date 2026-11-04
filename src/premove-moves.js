(() => {
  window.OpenboardPremoveMoves = function generatePremoveMoves({
    Chess,
    game,
    square,
    color,
    movementPatterns,
    customMovement,
  }) {
    const piece = game.get(square);
    if (!piece || piece.color !== color) return [];

    const fen = game.fen().split(' ');
    fen[1] = color;
    fen[3] = '-';
    const premoveGame = new Chess(fen.join(' '));
    const moves = [];

    if (customMovement) {
      premoveGame.setCustomMovement(square, customMovement);
      moves.push(...premoveGame.moves({ square, verbose: true, legal: false }));
    } else {
      for (const pattern of movementPatterns) {
        if (pattern !== piece.type) {
          premoveGame.remove(square);
          premoveGame.put({ type: pattern, color: piece.color }, square);
        }
        moves.push(...premoveGame.moves({ square, verbose: true, legal: false }));
      }
    }

    if (!customMovement && movementPatterns.includes('p')) {
      const file = square.charCodeAt(0) - 97;
      const rank = Number(square.slice(square.match(/[0-9]/).index));
      const direction = piece.color === 'w' ? 1 : -1;
      for (const targetFile of [file - 1, file + 1]) {
        if (targetFile < 0 || targetFile > 7) continue;
        const target = `${String.fromCharCode(97 + targetFile)}${rank + direction}`;
        if (game.get(target)?.color === color) continue;
        moves.push({ from: square, to: target, piece: 'p' });
      }
    }

    const uniqueMoves = new Map();
    for (const move of moves) uniqueMoves.set(`${move.to}:${move.promotion || ''}`, move);
    return [...uniqueMoves.values()];
  };
})();
