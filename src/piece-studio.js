(() => {
  const storageKey = 'openboard-piece-studio-v1';
  const builtInPieces = [
    { id: 'standard-pawn', name: 'Pawn', symbol: '♙', description: 'Forward step; add diagonal capture vectors.', vectors: [{ dx: 0, dy: 1, mode: 'move' }, { dx: -1, dy: 1, mode: 'capture' }, { dx: 1, dy: 1, mode: 'capture' }], movementType: 'step', captureMode: 'both', range: 1, mirror: true, jump: false, royal: false, promotion: true },
    { id: 'standard-rook', name: 'Rook', symbol: '♖', description: 'Slides along ranks and files.', vectors: [{ dx: 1, dy: 0, mode: 'both' }, { dx: -1, dy: 0, mode: 'both' }, { dx: 0, dy: 1, mode: 'both' }, { dx: 0, dy: -1, mode: 'both' }], movementType: 'slide', captureMode: 'both', range: 8, mirror: false, jump: false, royal: false, promotion: false },
    { id: 'standard-knight', name: 'Knight', symbol: '♘', description: 'Leaps in an L shape.', vectors: [{ dx: 1, dy: 2, mode: 'both' }, { dx: 2, dy: 1, mode: 'both' }, { dx: -1, dy: 2, mode: 'both' }, { dx: -2, dy: 1, mode: 'both' }, { dx: 1, dy: -2, mode: 'both' }, { dx: 2, dy: -1, mode: 'both' }, { dx: -1, dy: -2, mode: 'both' }, { dx: -2, dy: -1, mode: 'both' }], movementType: 'leap', captureMode: 'both', range: 1, mirror: false, jump: true, royal: false, promotion: false },
    { id: 'standard-bishop', name: 'Bishop', symbol: '♗', description: 'Slides along diagonals.', vectors: [{ dx: 1, dy: 1, mode: 'both' }, { dx: -1, dy: 1, mode: 'both' }, { dx: 1, dy: -1, mode: 'both' }, { dx: -1, dy: -1, mode: 'both' }], movementType: 'slide', captureMode: 'both', range: 8, mirror: false, jump: false, royal: false, promotion: false },
    { id: 'standard-queen', name: 'Queen', symbol: '♕', description: 'Slides along ranks, files, and diagonals.', vectors: [{ dx: 1, dy: 0, mode: 'both' }, { dx: -1, dy: 0, mode: 'both' }, { dx: 0, dy: 1, mode: 'both' }, { dx: 0, dy: -1, mode: 'both' }, { dx: 1, dy: 1, mode: 'both' }, { dx: -1, dy: 1, mode: 'both' }, { dx: 1, dy: -1, mode: 'both' }, { dx: -1, dy: -1, mode: 'both' }], movementType: 'slide', captureMode: 'both', range: 8, mirror: false, jump: false, royal: false, promotion: false },
    { id: 'standard-king', name: 'King', symbol: '♔', description: 'Moves one square in any direction.', vectors: [{ dx: 1, dy: 0, mode: 'both' }, { dx: -1, dy: 0, mode: 'both' }, { dx: 0, dy: 1, mode: 'both' }, { dx: 0, dy: -1, mode: 'both' }, { dx: 1, dy: 1, mode: 'both' }, { dx: -1, dy: 1, mode: 'both' }, { dx: 1, dy: -1, mode: 'both' }, { dx: -1, dy: -1, mode: 'both' }], movementType: 'step', captureMode: 'both', range: 1, mirror: false, jump: false, royal: true, promotion: false },
  ];
  const dialog = document.querySelector('#piece-studio-dialog');
  if (!dialog) return;

  const board = document.querySelector('#studio-board');
  const pieceList = document.querySelector('#studio-piece-list');
  const nameInput = document.querySelector('#studio-name');
  const symbolInput = document.querySelector('#studio-symbol');
  const descriptionInput = document.querySelector('#studio-description');
  const typeInput = document.querySelector('#studio-movement-type');
  const captureInput = document.querySelector('#studio-capture-mode');
  const sideInput = document.querySelector('#studio-side');
  const rangeInput = document.querySelector('#studio-range');
  const rangeOutput = document.querySelector('#studio-range-output');
  const mirrorInput = document.querySelector('#studio-mirror');
  const jumpInput = document.querySelector('#studio-jump');
  const royalInput = document.querySelector('#studio-royal');
  const promotionInput = document.querySelector('#studio-promotion');
  const jsonInput = document.querySelector('#studio-json');
  const status = document.querySelector('#studio-status');
  const history = [];
  const future = [];
  let savedPieces = loadPieces();
  let definition = structuredClone(builtInPieces[0]);
  let selectedId = null;
  let testMode = false;
  let testTool = 'move';
  let previewSide = 'w';
  let piecePosition = { x: 0, y: 0 };
  let blockers = new Map();
  let boardRadius = 4;

  function loadPieces() {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(saved) ? saved.filter(isValidDefinition) : [];
    } catch (error) {
      console.error('Could not load custom piece studio library:', error);
      return [];
    }
  }

  function isValidDefinition(piece) {
    return Boolean(piece && (piece.id === undefined || typeof piece.id === 'string')
      && typeof piece.name === 'string' && piece.name.trim().length > 0
      && (piece.symbol === undefined || typeof piece.symbol === 'string')
      && (piece.description === undefined || typeof piece.description === 'string')
      && (piece.captureMode === undefined || ['both', 'move', 'capture', 'attack'].includes(piece.captureMode))
      && ['mirror', 'jump', 'royal', 'promotion'].every((property) => piece[property] === undefined || typeof piece[property] === 'boolean')
      && Array.isArray(piece.vectors) && piece.vectors.length <= 288
      && piece.vectors.every((vector) => vector && Number.isInteger(vector.dx) && Number.isInteger(vector.dy)
        && Math.abs(vector.dx) <= 8 && Math.abs(vector.dy) <= 8
        && (vector.dx !== 0 || vector.dy !== 0)
        && (vector.mode === undefined || ['both', 'move', 'capture', 'attack'].includes(vector.mode)))
      && ['step', 'slide', 'leap'].includes(piece.movementType)
      && Number.isInteger(piece.range) && piece.range >= 1 && piece.range <= 8);
  }

  function cloneDefinition() {
    return structuredClone(definition);
  }

  function saveState() {
    history.push({
      vectors: cloneDefinition().vectors,
      piecePosition: { ...piecePosition },
      blockers: [...blockers],
      testMode,
    });
    if (history.length > 100) history.shift();
    future.length = 0;
  }

  function restoreState(state) {
    definition.vectors = structuredClone(state.vectors);
    piecePosition = { ...state.piecePosition };
    blockers = new Map(state.blockers);
    testMode = state.testMode;
    render();
  }

  function resetTestPosition() {
    piecePosition = { x: 0, y: 0 };
    blockers = new Map();
  }

  function loadDefinition(piece, id = null) {
    definition = structuredClone(piece);
    selectedId = id;
    definition.id = id ?? definition.id;
    history.length = 0;
    future.length = 0;
    testMode = false;
    resetTestPosition();
    syncControls();
    render();
  }

  function syncControls() {
    nameInput.value = definition.name;
    symbolInput.value = definition.symbol ?? '✦';
    descriptionInput.value = definition.description ?? '';
    typeInput.value = definition.movementType;
    captureInput.value = definition.captureMode ?? 'both';
    rangeInput.value = String(definition.range);
    rangeOutput.value = String(definition.range);
    mirrorInput.checked = definition.mirror === true;
    jumpInput.checked = definition.jump === true;
    royalInput.checked = definition.royal === true;
    promotionInput.checked = definition.promotion === true;
  }

  function getVectors() {
    return definition.vectors.map((vector) => ({
      ...vector,
      dy: definition.mirror && previewSide === 'b' ? -vector.dy : vector.dy,
      mode: vector.mode ?? definition.captureMode ?? 'both',
    }));
  }

  function moveDestinations() {
    const destinations = new Map();
    const vectors = getVectors();
    for (const vector of vectors) {
      if (vector.mode === 'attack') continue;
      const dx = vector.dx;
      const dy = vector.dy;
      let stepX = dx;
      let stepY = dy;
      if (definition.movementType === 'slide') {
        const divisor = greatestCommonDivisor(Math.abs(dx), Math.abs(dy)) || 1;
        stepX = dx / divisor;
        stepY = dy / divisor;
      }
      const limit = definition.movementType === 'slide' ? definition.range : 1;
      for (let distance = 1; distance <= limit; distance += 1) {
        const x = piecePosition.x + stepX * distance;
        const y = piecePosition.y + stepY * distance;
        if (!insideBoard(x, y)) break;
        const key = `${x},${y}`;
        const blocker = blockers.get(key);
        if (!blocker) {
          if (vector.mode === 'both' || vector.mode === 'move') destinations.set(key, 'move');
        } else {
          if (blocker === 'enemy' && (vector.mode === 'both' || vector.mode === 'capture')) destinations.set(key, 'capture');
          if (definition.movementType !== 'leap' && !definition.jump) break;
        }
        if (definition.movementType !== 'slide') break;
      }
    }
    return destinations;
  }

  function attackDestinations() {
    const destinations = new Set();
    for (const vector of getVectors()) {
      if (vector.mode !== 'attack' && vector.mode !== 'both' && vector.mode !== 'capture') continue;
      const divisor = definition.movementType === 'slide'
        ? greatestCommonDivisor(Math.abs(vector.dx), Math.abs(vector.dy)) || 1
        : 1;
      const stepX = vector.dx / divisor;
      const stepY = vector.dy / divisor;
      const limit = definition.movementType === 'slide' ? definition.range : 1;
      for (let distance = 1; distance <= limit; distance += 1) {
        const x = piecePosition.x + stepX * distance;
        const y = piecePosition.y + stepY * distance;
        if (!insideBoard(x, y)) break;
        destinations.add(`${x},${y}`);
        if (blockers.has(`${x},${y}`) && !definition.jump && definition.movementType !== 'leap') break;
      }
    }
    return destinations;
  }

  function greatestCommonDivisor(a, b) {
    while (b) [a, b] = [b, a % b];
    return a;
  }

  function insideBoard(x, y) {
    return x >= -boardRadius && x <= boardRadius && y >= -boardRadius && y <= boardRadius;
  }

  function renderBoard() {
    boardRadius = Math.max(4, Number(definition.range) || 1);
    const destinations = moveDestinations();
    const attacks = attackDestinations();
    board.style.setProperty('--studio-board-size', boardRadius * 2 + 1);
    board.replaceChildren();
    for (let y = boardRadius; y >= -boardRadius; y -= 1) {
      for (let x = -boardRadius; x <= boardRadius; x += 1) {
        const square = document.createElement('button');
        square.type = 'button';
        square.className = `studio-square ${(x + y) % 2 === 0 ? 'studio-square-light' : 'studio-square-dark'}`;
        square.dataset.x = String(x);
        square.dataset.y = String(y);
        square.setAttribute('role', 'gridcell');
        square.setAttribute('aria-label', `relative file ${x}, rank ${y}`);
        const key = `${x},${y}`;
        if (x === piecePosition.x && y === piecePosition.y) {
          square.classList.add('studio-piece-square');
          square.textContent = definition.symbol || '✦';
          square.setAttribute('aria-label', `${definition.name} at relative ${x}, ${y}`);
        } else if (blockers.has(key)) {
          square.textContent = blockers.get(key) === 'enemy' ? '●' : '○';
          square.classList.add(blockers.get(key) === 'enemy' ? 'studio-enemy-blocker' : 'studio-friendly-blocker');
        } else if (destinations.has(key)) {
          square.classList.add(destinations.get(key) === 'capture' ? 'studio-capture-target' : 'studio-move-target');
          square.textContent = destinations.get(key) === 'capture' ? '×' : '·';
        } else if (attacks.has(key)) {
          square.classList.add('studio-attack-target');
          square.textContent = '×';
        }
        square.addEventListener('click', () => onSquareClick(x, y));
        board.append(square);
      }
    }
    document.querySelector('#studio-preview-title').textContent = `${definition.name || 'Custom piece'} · ${testMode ? 'test board' : 'movement preview'}`;
    document.querySelector('#studio-mode-pill').textContent = testMode ? 'TEST' : 'EDIT';
    document.querySelector('#studio-board-help').textContent = testMode
      ? 'Click a highlighted square to move. Click another square to toggle a friendly/enemy blocker.'
      : 'Click surrounding squares to add or remove a movement vector. The center is the piece.';
    document.querySelector('#studio-undo').disabled = history.length === 0;
    document.querySelector('#studio-redo').disabled = future.length === 0;
    document.querySelector('#studio-test-toggle').textContent = testMode ? 'Edit pattern' : 'Test mode';
    const testToolButton = document.querySelector('#studio-test-tool');
    testToolButton.hidden = !testMode;
    testToolButton.textContent = testTool === 'move' ? 'Place blockers' : 'Move piece';
    renderLibrary();
  }

  function onSquareClick(x, y) {
    const dx = x - piecePosition.x;
    const dy = y - piecePosition.y;
    if (dx === 0 && dy === 0) return;
    const key = `${x},${y}`;
    if (testMode) {
      const available = moveDestinations().get(key);
      if (available && testTool === 'move') {
        saveState();
        piecePosition = { x, y };
        blockers.delete(key);
        status.textContent = available === 'capture' ? 'Capture simulated. The piece moved onto the enemy blocker.' : 'Move simulated on the test board.';
        render();
        return;
      }
      saveState();
      const current = blockers.get(key);
      if (!current) blockers.set(key, 'friendly');
      else if (current === 'friendly') blockers.set(key, 'enemy');
      else blockers.delete(key);
      status.textContent = 'Blocker updated. Test how the selected movement handles occupied squares.';
      render();
      return;
    }
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) return;
    saveState();
    const vectorKey = `${dx},${dy}`;
    const index = definition.vectors.findIndex((vector) => `${vector.dx},${vector.dy}` === vectorKey);
    if (index >= 0) {
      definition.vectors.splice(index, 1);
      status.textContent = `Removed movement vector (${dx}, ${dy}).`;
    } else {
      definition.vectors.push({ dx, dy, mode: captureInput.value });
      status.textContent = `Added ${captureInput.options[captureInput.selectedIndex].text.toLowerCase()} vector (${dx}, ${dy}).`;
    }
    renderBoard();
  }

  function renderLibrary() {
    pieceList.replaceChildren();
    const addRow = (piece, isSaved, id) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `studio-piece-entry${selectedId === id ? ' active' : ''}`;
      const symbol = document.createElement('span');
      symbol.className = 'studio-library-symbol';
      symbol.textContent = piece.symbol || '✦';
      const title = document.createElement('span');
      title.className = 'studio-library-copy';
      const name = document.createElement('strong');
      name.textContent = piece.name;
      const kind = document.createElement('small');
      kind.textContent = isSaved ? 'Saved piece' : 'Standard template';
      title.append(name, kind);
      button.append(symbol, title);
      button.addEventListener('click', () => loadDefinition(piece, isSaved ? id : null));
      pieceList.append(button);
    };
    const heading = document.createElement('p');
    heading.className = 'studio-library-heading';
    heading.textContent = 'Standard templates';
    pieceList.append(heading);
    for (const piece of builtInPieces) addRow(piece, false, null);
    if (savedPieces.length) {
      const savedHeading = document.createElement('p');
      savedHeading.className = 'studio-library-heading';
      savedHeading.textContent = 'Your pieces';
      pieceList.append(savedHeading);
      for (const piece of savedPieces) addRow(piece, true, piece.id);
    }
  }

  function render() {
    syncControls();
    renderBoard();
    jsonInput.value = JSON.stringify(exportableDefinition(), null, 2);
  }

  function exportableDefinition() {
    const exported = cloneDefinition();
    delete exported.id;
    return exported;
  }

  function persistLibrary() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedPieces));
    } catch (error) {
      console.error('Could not save custom piece studio library:', error);
      status.textContent = 'Could not save the piece library. Check browser storage availability.';
    }
  }

  function readControls() {
    definition.name = nameInput.value.trim().slice(0, 24) || 'Custom piece';
    definition.symbol = [...symbolInput.value.trim()].slice(0, 4).join('') || '✦';
    definition.description = descriptionInput.value.trim().slice(0, 160);
    definition.movementType = typeInput.value;
    definition.captureMode = captureInput.value;
    definition.range = Number(rangeInput.value);
    definition.mirror = mirrorInput.checked;
    definition.jump = jumpInput.checked;
    definition.royal = royalInput.checked;
    definition.promotion = promotionInput.checked;
  }

  document.querySelector('#studio-create').addEventListener('click', () => {
    loadDefinition({
      id: `piece-${crypto.randomUUID()}`,
      name: 'New piece',
      symbol: '✦',
      description: '',
      vectors: [{ dx: 0, dy: 1, mode: 'both' }],
      movementType: 'step',
      captureMode: 'both',
      range: 1,
      mirror: true,
      jump: false,
      royal: false,
      promotion: false,
    });
    status.textContent = 'Click squares around the piece to define its moves, then save.';
  });
  document.querySelector('#studio-save').addEventListener('click', () => {
    readControls();
    const existing = selectedId ? savedPieces.findIndex((piece) => piece.id === selectedId) : -1;
    definition.id = existing >= 0 ? selectedId : `piece-${crypto.randomUUID()}`;
    if (existing >= 0) savedPieces[existing] = cloneDefinition();
    else savedPieces.push(cloneDefinition());
    selectedId = definition.id;
    persistLibrary();
    status.textContent = `${definition.name} saved on this device.`;
    render();
  });
  document.querySelector('#studio-duplicate').addEventListener('click', () => {
    readControls();
    definition.id = `piece-${crypto.randomUUID()}`;
    definition.name = `${definition.name} copy`.slice(0, 24);
    selectedId = null;
    nameInput.value = definition.name;
    status.textContent = 'Duplicate created. Save it to add it to your library.';
    renderBoard();
  });
  document.querySelector('#studio-delete').addEventListener('click', () => {
    if (!selectedId) {
      status.textContent = 'Select one of your saved pieces before deleting.';
      return;
    }
    savedPieces = savedPieces.filter((piece) => piece.id !== selectedId);
    persistLibrary();
    selectedId = null;
    status.textContent = 'Saved piece deleted.';
    render();
  });
  document.querySelector('#studio-export').addEventListener('click', () => {
    readControls();
    jsonInput.value = JSON.stringify(exportableDefinition(), null, 2);
    const file = new Blob([jsonInput.value], { type: 'application/json' });
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom-piece'}.json`;
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Piece definition exported as JSON.';
  });
  document.querySelector('#studio-import').addEventListener('change', async (event) => {
    const [file] = event.target.files;
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const candidates = Array.isArray(imported) ? imported : [imported];
      if (!candidates.length || !candidates.every(isValidDefinition)) throw new Error('The JSON does not contain a valid piece definition.');
      for (const candidate of candidates) {
        candidate.id = `piece-${crypto.randomUUID()}`;
        savedPieces.push(candidate);
      }
      persistLibrary();
      loadDefinition(candidates[0], candidates[0].id);
      status.textContent = `Imported ${candidates.length} piece definition${candidates.length === 1 ? '' : 's'}.`;
    } catch (error) {
      console.error('Could not import custom piece definitions:', error);
      status.textContent = `Import failed: ${error.message}`;
    } finally {
      event.target.value = '';
    }
  });
  document.querySelector('#studio-test-toggle').addEventListener('click', () => {
    readControls();
    saveState();
    testMode = !testMode;
    testTool = 'move';
    resetTestPosition();
    status.textContent = testMode
      ? 'Test mode: click a highlighted move or an empty square to place a blocker.'
      : 'Edit mode: click relative squares to change the pattern.';
    render();
  });
  document.querySelector('#studio-reset-test').addEventListener('click', () => {
    saveState();
    resetTestPosition();
    status.textContent = 'Test board reset. Your saved movement pattern was kept.';
    render();
  });
  document.querySelector('#studio-undo').addEventListener('click', () => {
    if (!history.length) return;
    future.push({
      vectors: cloneDefinition().vectors,
      piecePosition: { ...piecePosition },
      blockers: [...blockers],
      testMode,
    });
    restoreState(history.pop());
  });
  document.querySelector('#studio-redo').addEventListener('click', () => {
    if (!future.length) return;
    history.push({
      vectors: cloneDefinition().vectors,
      piecePosition: { ...piecePosition },
      blockers: [...blockers],
      testMode,
    });
    restoreState(future.pop());
  });
  document.querySelectorAll('[data-studio-rotate]').forEach((button) => {
    button.addEventListener('click', () => {
      const turns = Number(button.dataset.studioRotate);
      saveState();
      const rotated = definition.vectors.map((vector) => {
        let { dx, dy } = vector;
        for (let turn = 0; turn < turns; turn += 1) [dx, dy] = [dy, -dx];
        return { ...vector, dx, dy };
      });
      definition.vectors = [...new Map(rotated.map((vector) => [`${vector.dx},${vector.dy}`, vector])).values()];
      status.textContent = `Movement pattern rotated ${turns * 90} degrees.`;
      renderBoard();
    });
  });
  document.querySelector('#studio-test-tool').addEventListener('click', () => {
    testTool = testTool === 'move' ? 'blocker' : 'move';
    status.textContent = testTool === 'move'
      ? 'Move tool: click a highlighted destination to move the piece.'
      : 'Blocker tool: click any square to cycle empty, friendly blocker, enemy blocker.';
    renderBoard();
  });
  sideInput.addEventListener('change', () => {
    previewSide = sideInput.value;
    renderBoard();
  });
  [nameInput, symbolInput, descriptionInput, typeInput, captureInput, rangeInput, mirrorInput, jumpInput, royalInput, promotionInput]
    .forEach((input) => input.addEventListener(input.type === 'text' || input.tagName === 'TEXTAREA' ? 'input' : 'change', () => {
      readControls();
      rangeOutput.value = String(definition.range);
      renderBoard();
    }));

  document.querySelector('#piece-studio-open').addEventListener('click', () => {
    render();
    dialog.showModal();
  });
  document.querySelector('#piece-studio-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    testMode = false;
    resetTestPosition();
    renderBoard();
  });

  syncControls();
  render();
})();
