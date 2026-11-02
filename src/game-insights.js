(function attachGameInsights(root) {
  const openings = [
    { name: 'Sicilian Defense', identifyAt: 2, moves: ['e4', 'c5'], theme: "Black challenges White's center immediately and looks for active counterplay." },
    { name: 'Open Sicilian · Najdorf', identifyAt: 8, moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], theme: "Black's Najdorf setup prepares queenside counterplay while keeping several central options." },
    { name: 'Open Sicilian · Dragon', identifyAt: 8, moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'g6'], theme: "Black fianchettoes the bishop and often counterattacks on the queenside." },
    { name: 'French Defense', identifyAt: 2, moves: ['e4', 'e6'], theme: "Black builds a solid center and prepares to challenge it with ...c5." },
    { name: 'Caro-Kann Defense', identifyAt: 2, moves: ['e4', 'c6'], theme: "Black supports ...d5 with a solid pawn structure and clear central counterplay." },
    { name: 'Scandinavian Defense', identifyAt: 2, moves: ['e4', 'd5'], theme: "Black challenges the e-pawn at once and opens the center early." },
    { name: 'Alekhine Defense', identifyAt: 2, moves: ['e4', 'Nf6'], theme: "Black invites the e-pawn forward, then aims to undermine the extended center." },
    { name: 'Pirc Defense', identifyAt: 6, moves: ['e4', 'd6', 'd4', 'Nf6', 'Nc3', 'g6'], theme: "Black develops flexibly and prepares a kingside fianchetto against White's center." },
    { name: 'Modern Defense', identifyAt: 5, moves: ['e4', 'g6', 'd4', 'Bg7', 'Nc3'], theme: "Black fianchettoes first and waits to challenge White's central pawns." },
    { name: "King's Gambit", identifyAt: 3, moves: ['e4', 'e5', 'f4'], theme: "White offers the f-pawn for rapid development and a kingside attack." },
    { name: 'Ruy Lopez · Spanish Opening', identifyAt: 5, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], theme: "White pressures the c6-knight and the e5-pawn; Black can defend or counter in the center." },
    { name: 'Ruy Lopez · Morphy Defense', identifyAt: 6, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6'], theme: "Black asks the bishop to decide while preparing queenside expansion." },
    { name: 'Ruy Lopez · Closed Defense', identifyAt: 10, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O', 'Be7'], theme: "Both sides complete development before the strategic fight over the center and kingside." },
    { name: 'Italian Game', identifyAt: 5, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], theme: "White develops the bishop toward f7 and prepares central or kingside pressure." },
    { name: 'Giuoco Piano', identifyAt: 6, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'], theme: "Both sides develop bishops actively; White can build a slow center or attack the kingside." },
    { name: 'Italian · Two Knights Defense', identifyAt: 6, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6'], theme: "Black develops with tempo and challenges White's bishop; White can target f7 with Ng5." },
    { name: 'Italian · Fried Liver Attack', identifyAt: 7, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5'], theme: "White targets f7 with an early attack; Black must respond accurately to the pressure." },
    { name: 'Italian · Polerio Defense', identifyAt: 8, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5'], theme: "Black strikes back in the center instead of defending passively; White must handle the counterattack precisely." },
    { name: 'Italian · Fried Liver Attack', identifyAt: 9, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Nf6', 'Ng5', 'd5', 'exd5'], theme: "White accepts the central challenge and keeps pressure on f7; Black needs accurate counterplay." },
    { name: 'Ruy Lopez · Berlin Defense', identifyAt: 6, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'Nf6'], theme: "Black develops and attacks e4 at once, offering the Berlin endgame route if White castles." },
    { name: 'Scotch Game', identifyAt: 5, moves: ['e4', 'e5', 'Nf3', 'Nc6', 'd4'], theme: "White opens the center early and fights for space and active piece play." },
    { name: 'Vienna Game', identifyAt: 3, moves: ['e4', 'e5', 'Nc3'], theme: "White supports a flexible central advance and can build a kingside attack." },
    { name: 'Philidor Defense', identifyAt: 4, moves: ['e4', 'e5', 'Nf3', 'd6'], theme: "Black reinforces e5 with a compact setup and looks for a later central break." },
    { name: 'Open Game', identifyAt: 2, moves: ['e4', 'e5'], theme: "Both sides occupy the center; development and central control shape the opening." },
    { name: "Queen's Gambit", identifyAt: 3, moves: ['d4', 'd5', 'c4'], theme: "White pressures Black's d5-pawn and seeks central control; the c-pawn offer is not a forced sacrifice." },
    { name: 'Slav Defense', identifyAt: 4, moves: ['d4', 'd5', 'c4', 'c6'], theme: "Black supports d5 with c6 while keeping the c8-bishop's diagonal open." },
    { name: 'King’s Indian Defense', identifyAt: 7, moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'], theme: "Black allows White space, then often counterattacks on the kingside; White can expand on the queenside." },
    { name: 'Grünfeld Defense', identifyAt: 6, moves: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'd5'], theme: "Black challenges White's center directly and uses active piece pressure against it." },
    { name: 'Nimzo-Indian Defense', identifyAt: 5, moves: ['d4', 'Nf6', 'c4', 'e6', 'Nc3', 'Bb4'], theme: "Black pins the c3-knight and pressures White's central control." },
    { name: 'Queen’s Indian Defense', identifyAt: 6, moves: ['d4', 'Nf6', 'c4', 'e6', 'Nf3', 'b6'], theme: "Black fianchettoes the queen's bishop to contest the center from a distance." },
    { name: 'Dutch Defense', identifyAt: 2, moves: ['d4', 'f5'], theme: "Black takes kingside space and signals an unbalanced, often attacking game." },
    { name: 'London System', identifyAt: 3, moves: ['d4', 'd5', 'Bf4'], theme: "White develops the dark-squared bishop outside the pawn chain for a solid setup." },
    { name: 'Catalan Opening', identifyAt: 5, moves: ['d4', 'Nf6', 'c4', 'e6', 'g3'], theme: "White fianchettoes the bishop to pressure the center and queenside." },
    { name: 'St. George Defense', identifyAt: 2, moves: ['e4', 'a6'], book: false, theme: "Black's ...a6 is the St. George Defense, preparing possible queenside expansion with ...b5; White can claim the center." },
    { name: 'St. George Defense · ...c5 setup', identifyAt: 4, moves: ['e4', 'a6', 'Bb5', 'c5'], book: false, theme: "White develops the bishop with Bb5; Black's ...c5 challenges the center. This is an offbeat St. George setup, not a standard named main line." },
    { name: 'English Opening', identifyAt: 1, moves: ['c4'], book: false, theme: "White controls the center from the flank and keeps the pawn structure flexible." },
    { name: 'Réti Opening · ...a5', identifyAt: 2, moves: ['Nf3', 'a5'], book: false, theme: "White's Nf3 keeps the center flexible; Black's ...a5 takes queenside space but does not establish a named defense." },
    { name: 'Réti Opening', identifyAt: 1, moves: ['Nf3'], book: false, theme: "White develops the knight flexibly, controls central squares, and can choose a later d4 or c4 setup." },
    { name: 'Réti Opening', identifyAt: 3, moves: ['Nf3', 'd5', 'c4'], theme: "White pressures the center from the flank rather than occupying it immediately." },
    { name: 'Queen’s Pawn Game', identifyAt: 1, moves: ['d4'], book: false, theme: "White claims central space and prepares a flexible development." },
  ];

  const grades = {
    best: { label: 'Best', icon: '⭐', description: 'The strongest move in this quick local position estimate.' },
    excellent: { label: 'Excellent', icon: '👍', description: 'Very close to the top-scoring move in this quick local position estimate.' },
    good: { label: 'Good', icon: '✅', description: 'A sound move; the local position estimate found a stronger option.' },
    inaccuracy: { label: 'Inaccuracy', icon: '?!', description: 'This gives up a noticeable amount compared with the top estimated move.' },
    mistake: { label: 'Mistake', icon: '⚠️', description: 'A serious opportunity was missed in the quick local position estimate.' },
    blunder: { label: 'Blunder', icon: '❌', description: 'A major opportunity was missed in the quick local position estimate.' },
    great: { label: 'Great', icon: '!', description: 'The top move stood out as a critical continuation in this quick local position estimate.' },
    brilliant: { label: 'Brilliant', icon: '‼️', description: 'A sound, attacked-piece sacrifice was among the top moves in this quick local search.' },
  };

  function normalizeSan(san) {
    return String(san).replace(/[+#?!]+$/g, '');
  }

  function matchesPrefix(history, line, end = history.length) {
    const length = Math.min(end, line.moves.length);
    for (let index = 0; index < length; index += 1) {
      if (normalizeSan(history[index]) !== normalizeSan(line.moves[index])) return false;
    }
    return true;
  }

  function openingForHistory(history) {
    if (!history.length) return null;
    let best = null;
    for (const opening of openings) {
      if (history.length < opening.identifyAt || !matchesPrefix(history, opening)) continue;
      const matchedPlies = Math.min(history.length, opening.moves.length);
      if (!best || matchedPlies > best.matchedPlies
        || (matchedPlies === best.matchedPlies && opening.identifyAt > best.identifyAt)) {
        best = { name: opening.name, theme: opening.theme, matchedPlies };
      }
    }
    return best ?? generalOpeningForHistory(history);
  }

  function generalOpeningForHistory(history) {
    const firstMove = normalizeSan(history[0]);
    const roots = {
      e4: ['King’s Pawn Opening', "White occupies the center with the king's pawn; the resulting opening depends on Black's reply."],
      d4: ['Queen’s Pawn Opening', "White claims central space with the queen's pawn; the resulting opening depends on Black's reply."],
      c4: ['English Opening', 'White controls central squares from the flank and keeps the pawn structure flexible.'],
      Nf3: ['Réti Opening', 'White develops flexibly and can challenge the center later with d4 or c4.'],
      f4: ['Bird Opening', 'White takes kingside space and prepares an unbalanced, often attacking game.'],
      b3: ['Nimzo-Larsen Attack', 'White prepares a long-diagonal fianchetto to pressure the center from the flank.'],
      g3: ['King’s Fianchetto Opening', 'White prepares to fianchetto the bishop and influence the center from a distance.'],
      Nc3: ['Van Geet Opening', 'White develops a knight early; the position can transpose into several central openings.'],
      b4: ['Sokolsky Opening', 'White expands on the queenside and may fianchetto the bishop on b2.'],
      g4: ['Grob Opening', 'White makes an early kingside flank-pawn advance; this is a sharp, offbeat opening.'],
      f3: ['Barnes Opening', 'White makes an unusual kingside pawn advance; the position is outside common opening theory.'],
      a3: ['Anderssen Opening', 'White makes a flexible flank-pawn move; the position can transpose into other openings.'],
      h3: ['Clemenz Opening', 'White makes a flexible flank-pawn move; the position is outside common opening theory.'],
      Na3: ['Sodium Attack', 'White develops the knight to the edge; this is an uncommon opening setup.'],
      Nh3: ['Amar Opening', 'White develops the knight to the edge; this is an uncommon opening setup.'],
    };
    const root = roots[firstMove] ?? [
      `Uncommon Opening · ${firstMove}`,
      `White's first move ${firstMove} is outside the opening guide's named systems; the position is still legal and can transpose into a known opening later.`,
    ];
    const reply = history[1] ? normalizeSan(history[1]) : null;
    const defenseName = firstMove === 'e4'
      ? ({ a6: 'St. George Defense', b6: 'Owen Defense', Nc6: 'Nimzowitsch Defense' })[reply]
      : firstMove === 'd4'
        ? ({ f5: 'Dutch Defense', c5: 'Old Benoni Defense', Nf6: 'Indian Defense' })[reply]
        : firstMove === 'c4'
          ? ({ e5: 'Reversed Sicilian', c5: 'Symmetrical English', Nf6: 'English · Indian setup' })[reply]
          : null;
    const name = defenseName
      ? `${root[0]} · ${defenseName}`
      : reply ? `${root[0]} · offbeat line` : root[0];
    const theme = defenseName
      ? `${root[1]} ${firstMove === 'e4' ? `Black's ${reply} is the ${defenseName};` : `Black's ${reply} creates the ${defenseName};`} the position may transpose as play continues.`
      : reply
        ? `${root[1]} Black replied ${reply}; this move order does not match a named line in the opening guide.`
        : root[1];
    return { name, theme, matchedPlies: history.length };
  }

  function bookOpeningForMove(history, ply) {
    let best = null;
    for (const opening of openings) {
      if (opening.book === false || ply >= opening.moves.length || ply + 1 < opening.identifyAt
        || !matchesPrefix(history, opening, ply + 1)) continue;
      if (!best || opening.moves.length > best.moves.length
        || (opening.moves.length === best.moves.length && opening.identifyAt > best.identifyAt)) {
        best = opening;
      }
    }
    return best;
  }

  function classifyMove({ loss = 0, bestGap = 0, soundSacrifice = false } = {}) {
    const cpLoss = Math.max(0, Number(loss) || 0);
    const cpGap = Math.max(0, Number(bestGap) || 0);
    if (soundSacrifice && cpLoss <= 25) return grades.brilliant;
    if (cpGap >= 180 && cpLoss <= 20) return grades.great;
    if (cpLoss <= 10) return grades.best;
    if (cpLoss <= 35) return grades.excellent;
    if (cpLoss <= 90) return grades.good;
    if (cpLoss <= 180) return grades.inaccuracy;
    if (cpLoss <= 350) return grades.mistake;
    return grades.blunder;
  }

  function moveTheme(move) {
    if (move.san?.includes('#')) return 'Checkmate';
    if (move.san?.includes('+')) return 'Gives check';
    if (move.flags?.includes('k') || move.flags?.includes('q')) return 'King safety · castling';
    if (move.captured) return 'Capture';
    if (move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) return 'Central pawn advance';
    if (move.piece === 'p' && ['a', 'h'].includes(move.to[0])) {
      return `${move.to[0] === 'a' ? 'Queenside' : 'Kingside'} flank pawn advance`;
    }
    if (['n', 'b'].includes(move.piece) && (move.from.endsWith('1') || move.from.endsWith('8'))) return 'Piece development';
    return 'Positioning';
  }

  function getMoveContext(history, ply, move) {
    const line = bookOpeningForMove(history, ply);
    const currentOpening = openingForHistory(history);
    return {
      opening: currentOpening,
      book: Boolean(line),
      bookName: line?.name ?? null,
      bookTheme: line?.theme ?? null,
      theme: line?.theme ?? (currentOpening?.matchedPlies === history.length
        ? currentOpening.theme
        : moveTheme(move)),
    };
  }

  root.OpenboardGameInsights = Object.freeze({
    classifyMove,
    getMoveContext,
    openingForHistory,
    bookOpeningForMove,
  });
})(globalThis);
