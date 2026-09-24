(() => {
  'use strict';

  const socket = io({ transports: ['websocket', 'polling'] });
  const params = new URLSearchParams(location.search);
  const CHARACTER_COUNT = 12;
  const CHARACTER_EMOJIS = ['🎅', '🪶', '⭐', '🪨', '🍙', '🚀', '🐻', '🐱', '🐹', '🍙', '🔶', '🔺'];
  const CHARACTER_COLORS = [
    '#d98b58', '#9aa6b2', '#efb8c6', '#9b6b4a', '#cf9d47', '#8d7b71',
    '#b67a4c', '#78a9d1', '#d7b66b', '#d87551', '#ddd8cb', '#ef766f'
  ];

  // v3: QRコード（?room=）から来た人には「親機になる」を見せず、参加フォームだけにする
  if (params.get('room') && params.get('host') !== '1') document.body.classList.add('joining');

  // v3: あそびかた（チュートリアル）
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-tutorial]');
    if (!button) return;
    event.preventDefault();
    globalThis.NutsTutorial?.open();
  });
  if (globalThis.NutsTutorial && !globalThis.NutsTutorial.seen()) {
    setTimeout(() => globalThis.NutsTutorial.open(), 300);
  }

  const state = {
    screen: 'home',
    roomCode: (params.get('room') || '').toUpperCase(),
    sessionToken: loadOrCreateToken(),
    playerId: null,
    playerName: localStorageSafeGet('nuts-player-name') || '',
    selectedCharacter: Number(localStorageSafeGet('nuts-character')) || 1,
    isHost: params.get('host') === '1',
    ownsRoom: params.get('host') === '1' && Boolean(params.get('room')),
    lobby: null,
    joinUrls: [],
    selectedJoinUrl: '',
    selectedJoinPhoneReady: false,
    world: { width: 1920, height: 1080 },
    areas: {
      bedroom: { id: 'bedroom', label: 'ふかふか寝床', image: './assets/maps/bedroom.webp' },
      dining: { id: 'dining', label: '丸太食堂', image: './assets/maps/dining.webp' },
      cloud: { id: 'cloud', label: '天空の雲庭', image: './assets/maps/cloud-garden.webp' }
    },
    vents: [],
    areaId: 'bedroom',
    players: new Map(),
    displayPlayers: new Map(),
    testMode: false,
    culpritCount: 0,
    systems: {
      foodSpot: { id: 'bedroom-meal-1', areaId: 'bedroom', x: 390, y: 245, label: '寝床の朝ご飯' },
      foodSpots: [
        { id: 'bedroom-meal-1', areaId: 'bedroom', x: 390, y: 245, label: '寝床の朝ご飯' },
        { id: 'meal-1', areaId: 'dining', x: 752, y: 588, label: '左上の定食' },
        { id: 'cloud-meal-1', areaId: 'cloud', x: 960, y: 230, label: '雲庭の朝ご飯' }
      ],
      log: { id: 'gnaw-log', areaId: 'dining', x: 620, y: 350, label: 'かじれる丸太' },
      wheel: { id: 'power-wheel', areaId: 'dining', x: 1720, y: 830, label: '回し車', charge: 100, emptyAfterMs: 60000 }
    },
    privateState: {
      role: null,
      specialRole: null,
      investigateUsed: false,
      investigationResult: null,
      disguiseUsed: false,
      disguiseUntil: 0,
      disguiseTargetName: '',
      chefMealUsed: false,
      hasNut: true,
      ghost: false,
      expelled: false,
      hunger: 0,
      digestionReady: false,
      cooldowns: {
        stealReadyAt: 0, ventReadyAt: 0, blackoutReadyAt: 0,
        eatReadyAt: 0, gnawReadyAt: 0, wheelReadyAt: 0
      }
    },
    blackout: { active: false, endsAt: 0, reason: null, temporaryAutoRestore: false },
    meeting: null,
    meetingReadyAt: 0,
    hasVoted: false,
    voteTargetId: '',
    gameResult: null,
    paused: false,
    joystickVector: { x: 0, y: 0 },
    characterDragVector: { x: 0, y: 0 },
    lastSentInput: { x: 0, y: 0, at: 0 }
  };

  const elements = {
    homeScreen: document.querySelector('#homeScreen'),
    lobbyScreen: document.querySelector('#lobbyScreen'),
    gameScreen: document.querySelector('#gameScreen'),
    connectionChip: document.querySelector('#connectionChip'),
    createRoomButton: document.querySelector('#createRoomButton'),
    hostShare: document.querySelector('#hostShare'),
    hostRoomCode: document.querySelector('#hostRoomCode'),
    qrImage: document.querySelector('#qrImage'),
    qrStatus: document.querySelector('#qrStatus'),
    urlChoices: document.querySelector('#urlChoices'),
    copyUrlButton: document.querySelector('#copyUrlButton'),
    joinForm: document.querySelector('#joinForm'),
    roomCodeInput: document.querySelector('#roomCodeInput'),
    nameInput: document.querySelector('#nameInput'),
    homeCharacterGrid: document.querySelector('#homeCharacterGrid'),
    lobbyCharacterGrid: document.querySelector('#lobbyCharacterGrid'),
    lobbyRoomCode: document.querySelector('#lobbyRoomCode'),
    toggleQrButton: document.querySelector('#toggleQrButton'),
    lobbyQr: document.querySelector('#lobbyQr'),
    lobbyQrImage: document.querySelector('#lobbyQrImage'),
    lobbyJoinUrl: document.querySelector('#lobbyJoinUrl'),
    lobbyQrStatus: document.querySelector('#lobbyQrStatus'),
    playerList: document.querySelector('#playerList'),
    npcControls: document.querySelector('#npcControls'),
    addNpcButton: document.querySelector('#addNpcButton'),
    npcHint: document.querySelector('#npcHint'),
    readyButton: document.querySelector('#readyButton'),
    hostStartControls: document.querySelector('#hostStartControls'),
    testStartButton: document.querySelector('#testStartButton'),
    normalStartButton: document.querySelector('#normalStartButton'),
    startHint: document.querySelector('#startHint'),
    gameRoomCode: document.querySelector('#gameRoomCode'),
    gamePlayerCount: document.querySelector('#gamePlayerCount'),
    areaName: document.querySelector('#areaName'),
    returnLobbyButton: document.querySelector('#returnLobbyButton'),
    testModeBanner: document.querySelector('#testModeBanner'),
    gameCanvas: document.querySelector('#gameCanvas'),
    pausedOverlay: document.querySelector('#pausedOverlay'),
    pausedText: document.querySelector('#pausedText'),
    roleBadge: document.querySelector('#roleBadge'),
    nutBadge: document.querySelector('#nutBadge'),
    ghostBadge: document.querySelector('#ghostBadge'),
    expelledBadge: document.querySelector('#expelledBadge'),
    blackoutBadge: document.querySelector('#blackoutBadge'),
    hungerBadge: document.querySelector('#hungerBadge'),
    digestionBadge: document.querySelector('#digestionBadge'),
    wheelBadge: document.querySelector('#wheelBadge'),
    commonActions: document.querySelector('#commonActions'),
    eatButton: document.querySelector('#eatButton'),
    gnawButton: document.querySelector('#gnawButton'),
    wheelButton: document.querySelector('#wheelButton'),
    meetingButton: document.querySelector('#meetingButton'),
    eatHint: document.querySelector('#eatHint'),
    gnawHint: document.querySelector('#gnawHint'),
    wheelHint: document.querySelector('#wheelHint'),
    meetingHint: document.querySelector('#meetingHint'),
    culpritActions: document.querySelector('#culpritActions'),
    stealButton: document.querySelector('#stealButton'),
    ventButton: document.querySelector('#ventButton'),
    blackoutButton: document.querySelector('#blackoutButton'),
    stealCooldown: document.querySelector('#stealCooldown'),
    ventCooldown: document.querySelector('#ventCooldown'),
    blackoutCooldown: document.querySelector('#blackoutCooldown'),
    specialRoleActions: document.querySelector('#specialRoleActions'),
    investigateButton: document.querySelector('#investigateButton'),
    investigateHint: document.querySelector('#investigateHint'),
    disguiseButton: document.querySelector('#disguiseButton'),
    disguiseHint: document.querySelector('#disguiseHint'),
    chefButton: document.querySelector('#chefButton'),
    chefHint: document.querySelector('#chefHint'),
    investigationResult: document.querySelector('#investigationResult'),
    investigationResultText: document.querySelector('#investigationResultText'),
    roleOverlay: document.querySelector('#roleOverlay'),
    roleCard: document.querySelector('#roleCard'),
    roleIcon: document.querySelector('#roleIcon'),
    roleTitle: document.querySelector('#roleTitle'),
    roleDescription: document.querySelector('#roleDescription'),
    culpritCountText: document.querySelector('#culpritCountText'),
    closeRoleButton: document.querySelector('#closeRoleButton'),
    meetingOverlay: document.querySelector('#meetingOverlay'),
    meetingTimer: document.querySelector('#meetingTimer'),
    meetingCaller: document.querySelector('#meetingCaller'),
    meetingCannotVote: document.querySelector('#meetingCannotVote'),
    testimonyControls: document.querySelector('#testimonyControls'),
    testimonyArea: document.querySelector('#testimonyArea'),
    testimonyZone: document.querySelector('#testimonyZone'),
    shareTestimonyButton: document.querySelector('#shareTestimonyButton'),
    testimonyHint: document.querySelector('#testimonyHint'),
    testimonyList: document.querySelector('#testimonyList'),
    voteGrid: document.querySelector('#voteGrid'),
    voteCandidateHint: document.querySelector('#voteCandidateHint'),
    skipVoteButton: document.querySelector('#skipVoteButton'),
    meetingStatus: document.querySelector('#meetingStatus'),
    expulsionOverlay: document.querySelector('#expulsionOverlay'),
    expelledCharacterImage: document.querySelector('#expelledCharacterImage'),
    expulsionTitle: document.querySelector('#expulsionTitle'),
    expulsionRole: document.querySelector('#expulsionRole'),
    gameOverOverlay: document.querySelector('#gameOverOverlay'),
    gameOverCard: document.querySelector('#gameOverCard'),
    gameOverIcon: document.querySelector('#gameOverIcon'),
    gameOverTitle: document.querySelector('#gameOverTitle'),
    gameOverMessage: document.querySelector('#gameOverMessage'),
    culpritReveal: document.querySelector('#culpritReveal'),
    resultReturnLobbyButton: document.querySelector('#resultReturnLobbyButton'),
    resultWaitText: document.querySelector('#resultWaitText'),
    joystick: document.querySelector('#joystick'),
    joystickKnob: document.querySelector('#joystickKnob'),
    ventChoiceOverlay: document.querySelector('#ventChoiceOverlay'),
    ventChoiceGrid: document.querySelector('#ventChoiceGrid'),
    closeVentChoiceButton: document.querySelector('#closeVentChoiceButton'),
    toast: document.querySelector('#toast')
  };

  const ctx = elements.gameCanvas.getContext('2d', { alpha: false });
  // v2: 画面の向きに合わせてカメラの表示範囲を変える（横: 960x540 / 縦: 約600x1000）
  const view = { w: 960, h: 540 };
  const gameViewportElement = document.getElementById('gameViewport');
  // v2: 自分のキャラクターは入力をすぐ画面に反映し（予測移動）、親機の位置で少しずつ補正する
  const predicted = { active: false, x: 0, y: 0, vx: 0, vy: 0, areaId: '' };
  let lastFrameAt = performance.now();
  let dragClientPoint = null;

  // 動作確認用（遊ぶうえでの影響はありません）
  globalThis.__nutsDebug = () => {
    const local = state.displayPlayers.get(state.playerId);
    const v = state.characterDragVector;
    return local ? { x: local.x, y: local.y, drag: Math.hypot(v.x, v.y), view: { ...view } } : null;
  };

  function updateViewSize() {
    const rect = (gameViewportElement || elements.gameCanvas).getBoundingClientRect();
    let w = 960;
    let h = 540;
    if (rect.width > 0 && rect.height > rect.width * 1.05) {
      const ratio = rect.height / rect.width;
      w = 600;
      h = Math.round(600 * ratio);
      if (h > 1080) {
        h = 1080;
        w = Math.round(1080 / ratio);
      }
    }
    if (w !== view.w || h !== view.h) {
      view.w = w;
      view.h = h;
      elements.gameCanvas.width = w;
      elements.gameCanvas.height = h;
    }
  }

  function cameraFor(point) {
    const x = Number.isFinite(point?.x) ? point.x : state.world.width / 2;
    const y = Number.isFinite(point?.y) ? point.y : state.world.height / 2;
    return {
      x: Math.round(Math.max(0, Math.min(x - view.w / 2, state.world.width - view.w))),
      y: Math.round(Math.max(0, Math.min(y - view.h / 2, state.world.height - view.h)))
    };
  }

  function canMoveLocally() {
    return state.screen === 'game' && state.playerId && !state.paused && !state.meeting?.active
      && !state.meeting?.resolving && !state.gameResult && !state.privateState.expelled
      && elements.roleOverlay.classList.contains('hidden')
      && elements.ventChoiceOverlay.classList.contains('hidden');
  }

  function updatePrediction(dt) {
    const target = state.players.get(state.playerId);
    const core = globalThis.NutsGameCore;
    if (!target || !core?.movePlayer) { predicted.active = false; return null; }
    const error = Math.hypot(target.x - predicted.x, target.y - predicted.y);
    if (!predicted.active || predicted.areaId !== target.areaId || error > 180) {
      Object.assign(predicted, { active: true, x: target.x, y: target.y, vx: 0, vy: 0, areaId: target.areaId });
      return predicted;
    }
    const input = canMoveLocally() && socket.connected ? currentInputVector() : { x: 0, y: 0 };
    const body = {
      x: predicted.x, y: predicted.y, vx: predicted.vx, vy: predicted.vy, areaId: predicted.areaId,
      input, hunger: state.privateState.hunger, ghost: true
    };
    core.movePlayer(body, dt);
    if (body.areaId === predicted.areaId) {
      predicted.x = body.x;
      predicted.y = body.y;
      predicted.vx = body.vx;
      predicted.vy = body.vy;
    } else {
      predicted.vx = 0;
      predicted.vy = 0;
    }
    // 親機の位置へ補正（動いている間は通信の遅れ分を許容し、止まったらしっかり合わせる）
    const moving = Math.hypot(input.x, input.y) > 0.05;
    const dx = target.x - predicted.x;
    const dy = target.y - predicted.y;
    const distance = Math.hypot(dx, dy);
    const pull = moving ? (distance > 70 ? 0.06 : 0) : 0.12;
    predicted.x += dx * pull;
    predicted.y += dy * pull;
    return predicted;
  }
  const keys = new Set();
  const characterImages = new Map();
  const mapImages = new Map();
  let toastTimer = null;
  let roomInspectTimer = null;
  let joystickPointerId = null;
  let characterPointerId = null;
  let autoCreateStarted = false;
  let expulsionTimer = null;
  let testimonySubmitting = false;

  function loadAreaImages(areas = state.areas) {
    for (const area of Object.values(areas || {})) {
      if (!area?.id || !area.image || mapImages.has(area.id)) continue;
      const image = new Image();
      image.src = area.image;
      mapImages.set(area.id, image);
    }
  }

  loadAreaImages();

  for (let id = 1; id <= CHARACTER_COUNT; id += 1) {
    const image = new Image();
    image.onload = () => characterImages.set(id, image);
    image.onerror = () => characterImages.delete(id);
    image.src = `./assets/characters/character-${String(id).padStart(2, '0')}.png`;
  }

  function localStorageSafeGet(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function localStorageSafeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // 保存できないブラウザでも、そのページを開いている間は遊べます。
    }
  }

  function loadOrCreateToken() {
    const saved = localStorageSafeGet('nuts-session-token');
    if (saved) return saved;
    let token = '';
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(18);
      globalThis.crypto.getRandomValues(bytes);
      token = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    } else {
      token = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
    localStorageSafeSet('nuts-session-token', token);
    return token;
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add('show');
    toastTimer = setTimeout(() => elements.toast.classList.remove('show'), 3400);
  }

  function setScreen(name) {
    state.screen = name;
    for (const screen of ['home', 'lobby', 'game']) {
      elements[`${screen}Screen`].classList.toggle('active', screen === name);
    }
    if (name !== 'game') {
      state.joystickVector = { x: 0, y: 0 };
      resetJoystickKnob();
    }
  }

  function characterLabel(id) {
    return `キャラ${id}`;
  }

  function makeCharacterButton(id, locationName) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'character-choice';
    button.dataset.characterId = String(id);
    button.setAttribute('aria-label', characterLabel(id));

    const fallback = document.createElement('span');
    fallback.className = 'fallback-avatar';
    fallback.style.setProperty('--avatar-color', CHARACTER_COLORS[id - 1]);
    fallback.textContent = CHARACTER_EMOJIS[id - 1];

    const image = document.createElement('img');
    image.alt = '';
    image.src = `./assets/characters/character-${String(id).padStart(2, '0')}.png`;
    image.classList.add('hidden');
    image.addEventListener('load', () => {
      image.classList.remove('hidden');
      fallback.classList.add('hidden');
    });
    image.addEventListener('error', () => image.remove());

    const number = document.createElement('span');
    number.className = 'character-number';
    number.textContent = String(id);

    button.append(fallback, image, number);
    button.addEventListener('click', () => chooseCharacter(id, locationName));
    return button;
  }

  function buildCharacterGrids() {
    for (let id = 1; id <= CHARACTER_COUNT; id += 1) {
      elements.homeCharacterGrid.append(makeCharacterButton(id, 'home'));
      elements.lobbyCharacterGrid.append(makeCharacterButton(id, 'lobby'));
    }
    updateCharacterGrids();
  }

  function updateCharacterGrids() {
    const taken = new Set(state.lobby?.takenCharacters || []);
    const own = state.lobby?.players?.find((player) => player.id === state.playerId);
    if (own) state.selectedCharacter = own.characterId;

    document.querySelectorAll('.character-choice').forEach((button) => {
      const id = Number(button.dataset.characterId);
      const selected = id === state.selectedCharacter;
      const isTakenByOther = taken.has(id) && (!own || own.characterId !== id);
      button.classList.toggle('selected', selected);
      button.classList.toggle('taken', isTakenByOther);
      button.disabled = isTakenByOther;
      button.setAttribute('aria-pressed', String(selected));
    });
  }

  function chooseCharacter(id, locationName) {
    if (locationName === 'home' || !state.playerId) {
      state.selectedCharacter = id;
      localStorageSafeSet('nuts-character', String(id));
      updateCharacterGrids();
      return;
    }
    socket.emit('changeCharacter', { characterId: id }, (result) => {
      if (!result?.ok) {
        showToast(result?.error || 'キャラクターを変更できませんでした。');
        return;
      }
      state.selectedCharacter = id;
      localStorageSafeSet('nuts-character', String(id));
    });
  }

  function loadQrImage(image, status, url, phoneReady) {
    status.classList.remove('error');
    status.textContent = 'QRコードを作っています…';
    if (!globalThis.QRCode?.toDataURL) {
      status.textContent = 'QRコード用のファイルが見つかりません。ZIPを展開し直してください。';
      status.classList.add('error');
      return;
    }
    globalThis.QRCode.toDataURL(url, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#17120f', light: '#fffaf0' }
    }).then((dataUrl) => {
      image.src = dataUrl;
      status.textContent = phoneReady
        ? '表示できました。スマホで読み取ってください。'
        : '表示できましたが、このURLはスマホでは使えません。';
      status.classList.toggle('error', !phoneReady);
    }).catch(() => {
      status.textContent = 'QRコードを表示できませんでした。もう一度「部屋を作る」を押してください。';
      status.classList.add('error');
    });
  }

  function setSelectedJoinUrl(url, phoneReady = true) {
    state.selectedJoinUrl = url;
    state.selectedJoinPhoneReady = Boolean(phoneReady);
    loadQrImage(elements.qrImage, elements.qrStatus, url, state.selectedJoinPhoneReady);
    loadQrImage(elements.lobbyQrImage, elements.lobbyQrStatus, url, state.selectedJoinPhoneReady);
    elements.lobbyJoinUrl.textContent = url;
  }

  function renderHostShare() {
    if (!state.isHost || !state.roomCode) return;
    elements.hostShare.classList.remove('hidden');
    elements.hostRoomCode.textContent = state.roomCode;
    elements.urlChoices.replaceChildren();

    if (state.joinUrls.length === 0) state.joinUrls = [{
      name: 'インターネット経由',
      url: `${location.origin}${location.pathname}?room=${state.roomCode}`,
      phoneReady: !['localhost', '127.0.0.1'].includes(location.hostname)
    }];

    state.joinUrls.forEach((entry, index) => {
      const label = document.createElement('label');
      label.className = 'url-choice';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'joinUrl';
      radio.value = entry.url;
      radio.checked = index === 0;
      radio.addEventListener('change', () => setSelectedJoinUrl(entry.url, entry.phoneReady !== false));
      const text = document.createElement('span');
      text.textContent = `${entry.phoneReady === false ? '⚠ ' : ''}${entry.name}: ${entry.url}`;
      label.append(radio, text);
      elements.urlChoices.append(label);
    });
    setSelectedJoinUrl(state.joinUrls[0].url, state.joinUrls[0].phoneReady !== false);
  }

  function createRoom() {
    if (!socket.isHostPage) {
      // PeerJS版: 親機になるページ（?host=1）へ移動して部屋を作る
      location.href = `${location.pathname}?host=1`;
      return;
    }
    elements.createRoomButton.disabled = true;
    socket.emit('createRoom', { sessionToken: state.sessionToken }, (result) => {
      elements.createRoomButton.disabled = false;
      if (!result?.ok) {
        autoCreateStarted = false;
        showToast(result?.error || '部屋を作れませんでした。');
        return;
      }
      state.isHost = true;
      state.ownsRoom = true;
      state.roomCode = result.code;
      state.sessionToken = result.sessionToken || state.sessionToken;
      state.joinUrls = result.joinUrls || [];
      elements.roomCodeInput.value = state.roomCode;
      history.replaceState({}, '', `${location.pathname}?host=1&room=${state.roomCode}`);
      renderHostShare();
      inspectRoom();
      showToast('部屋を作り、参加用QRコードを表示しました。');
    });
  }

  function inspectRoom() {
    const code = String(elements.roomCodeInput.value || state.roomCode).toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    if (code.length !== 6 || state.playerId) return;
    socket.emit('inspectRoom', { code }, (result) => {
      if (!result?.ok) return;
      state.lobby = result.lobby;
      updateCharacterGrids();
    });
  }

  function joinRoom(event) {
    event.preventDefault();
    const code = elements.roomCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    const name = elements.nameInput.value.trim();
    if (code.length !== 6) return showToast('6文字の部屋番号を入力してください。');
    if (!name) return showToast('名前を入力してください。');

    const joinButton = elements.joinForm.querySelector('button[type="submit"]');
    joinButton.disabled = true;
    socket.emit('joinRoom', {
      code,
      name,
      characterId: state.selectedCharacter,
      sessionToken: state.sessionToken
    }, (result) => {
      joinButton.disabled = false;
      if (!result?.ok) {
        showToast(result?.error || '参加できませんでした。');
        inspectRoom();
        return;
      }
      state.roomCode = code;
      state.playerId = result.playerId;
      state.sessionToken = result.sessionToken;
      state.isHost = Boolean(result.isHost);
      state.world = result.world || state.world;
      state.areas = result.areas || state.areas;
      state.vents = result.vents || state.vents;
      loadAreaImages(state.areas);
      state.playerName = name;
      localStorageSafeSet('nuts-session-token', state.sessionToken);
      localStorageSafeSet('nuts-player-name', name);
      localStorageSafeSet('nuts-character', String(state.selectedCharacter));
      elements.lobbyRoomCode.textContent = code;
      elements.gameRoomCode.textContent = code;
      if (result.phase !== 'lobby') {
        showGame(result.game || result);
        if (result.privateState) applyPrivateState(result.privateState, true);
      } else {
        setScreen('lobby');
      }
      elements.toggleQrButton.classList.toggle('hidden', !state.isHost);
      elements.hostStartControls.classList.toggle('hidden', !state.isHost);
      elements.returnLobbyButton.classList.toggle('hidden', !state.isHost);
      if (state.isHost) {
        elements.lobbyQr.classList.remove('hidden');
        elements.toggleQrButton.textContent = 'QRを隠す';
        if (state.selectedJoinUrl) setSelectedJoinUrl(state.selectedJoinUrl, state.selectedJoinPhoneReady);
      }
    });
  }

  function renderLobby(lobby) {
    state.lobby = lobby;
    state.roomCode = lobby.code;
    elements.lobbyRoomCode.textContent = lobby.code;
    elements.gameRoomCode.textContent = lobby.code;
    elements.gamePlayerCount.textContent = `${lobby.playerCount} / ${lobby.maxPlayers}`;
    elements.playerList.replaceChildren();

    for (const player of lobby.players) {
      const row = document.createElement('div');
      row.className = `player-row${player.isNpc && state.isHost && lobby.phase === 'lobby' ? ' npc-row' : ''}`;
      const icon = document.createElement('img');
      icon.className = 'mini-avatar';
      icon.src = `./assets/characters/character-${String(player.characterId).padStart(2, '0')}.png`;
      icon.alt = '';
      const info = document.createElement('div');
      const name = document.createElement('div');
      name.className = 'player-name';
      name.textContent = player.name + (player.id === state.playerId ? '（自分）' : '');
      const meta = document.createElement('div');
      meta.className = 'player-meta';
      meta.textContent = `キャラ${player.characterId}${player.isHost ? '・親機' : ''}${player.isNpc ? '・NPC' : ''}`;
      info.append(name, meta);
      const status = document.createElement('span');
      if (!player.connected) {
        status.className = 'offline-mark';
        status.textContent = state.screen === 'game' ? '通信切れ' : '再接続待ち';
      } else if (player.ready) {
        status.className = 'ready-mark';
        status.textContent = '準備OK';
      } else {
        status.className = 'not-ready-mark';
        status.textContent = '準備中';
      }
      row.append(icon, info, status);
      if (player.isNpc && state.isHost && lobby.phase === 'lobby') {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'secondary npc-remove';
        remove.textContent = '削除';
        remove.setAttribute('aria-label', `${player.name}を削除`);
        remove.addEventListener('click', () => {
          remove.disabled = true;
          socket.emit('removeNpc', { playerId: player.id }, (result) => {
            if (!result?.ok) {
              remove.disabled = false;
              showToast(result?.error || 'NPCを削除できませんでした。');
            }
          });
        });
        row.append(remove);
      }
      elements.playerList.append(row);
    }

    const own = lobby.players.find((player) => player.id === state.playerId);
    if (own) {
      state.selectedCharacter = own.characterId;
      elements.readyButton.textContent = own.ready ? '準備を取り消す' : '準備OKにする';
      elements.readyButton.dataset.ready = String(own.ready);
    }

    elements.normalStartButton.disabled = !lobby.normalStartAvailable;
    elements.npcControls.classList.toggle('hidden', !state.isHost || lobby.phase !== 'lobby');
    elements.addNpcButton.disabled = lobby.playerCount >= lobby.maxPlayers;
    elements.npcHint.textContent = lobby.playerCount >= lobby.maxPlayers
      ? '11人までです。参加者とNPCは同じ枠を使います。'
      : `NPCも参加人数に含まれます（${lobby.playerCount} / ${lobby.maxPlayers}人）。`;
    elements.normalStartButton.textContent = 'ゲームを開始';
    elements.startHint.textContent = lobby.normalStartAvailable
      ? '全員の準備ができました。1〜11人で開始できます。'
      : '全員が準備OKになるまで待ってください。';
    updateCharacterGrids();

    if (lobby.phase === 'lobby' && state.screen === 'game') setScreen('lobby');
  }

  function setReady() {
    const nextReady = elements.readyButton.dataset.ready !== 'true';
    socket.emit('setReady', { ready: nextReady }, (result) => {
      if (!result?.ok) showToast(result?.error || '準備状態を変更できませんでした。');
    });
  }

  function startGame(testMode) {
    socket.emit('startGame', { testMode }, (result) => {
      if (!result?.ok) showToast(result?.error || '開始できませんでした。');
    });
  }

  function showGame(payload = {}) {
    state.world = payload.world || state.world;
    state.areas = payload.areas || state.areas;
    state.vents = payload.vents || state.vents;
    state.systems = payload.systems || state.systems;
    state.culpritCount = Number(payload.culpritCount) || 0;
    state.blackout = payload.blackout || { active: false, endsAt: 0, reason: null, temporaryAutoRestore: false };
    state.areaId = 'bedroom';
    state.testMode = Boolean(payload.testMode);
    state.meeting = null;
    state.meetingReadyAt = Number(payload.meetingReadyAt) || 0;
    state.hasVoted = false;
    state.voteTargetId = '';
    state.gameResult = payload.gameResult || null;
    state.privateState = {
      role: null,
      specialRole: null,
      investigateUsed: false,
      investigationResult: null,
      disguiseUsed: false,
      disguiseUntil: 0,
      disguiseTargetName: '',
      chefMealUsed: false,
      hasNut: true,
      ghost: false,
      expelled: false,
      hunger: 0,
      digestionReady: false,
      cooldowns: {
        stealReadyAt: 0, ventReadyAt: 0, blackoutReadyAt: 0,
        eatReadyAt: 0, gnawReadyAt: 0, wheelReadyAt: 0
      }
    };
    state.players.clear();
    state.displayPlayers.clear();
    loadAreaImages(state.areas);
    elements.testModeBanner.classList.toggle('hidden', !state.testMode);
    elements.returnLobbyButton.classList.toggle('hidden', !state.isHost);
    elements.roleOverlay.classList.add('hidden');
    elements.ventChoiceOverlay.classList.add('hidden');
    elements.meetingOverlay.classList.add('hidden');
    elements.expulsionOverlay.classList.add('hidden');
    elements.gameOverOverlay.classList.add('hidden');
    elements.investigationResult.classList.add('hidden');
    clearTimeout(expulsionTimer);
    resetCharacterDrag();
    updatePrivateUi();
    setScreen('game');
    setPause(state.gameResult ? { paused: false } : (payload.connectionPause || { paused: false }));
    if (payload.meeting) showMeeting(payload.meeting);
    else if (payload.meetingResolution) showMeetingResolution(payload.meetingResolution);
    if (state.gameResult) showGameOver(state.gameResult);
  }

  function showRoleCard() {
    const role = state.privateState.role;
    if (!role) return;
    closeVentChooser();
    keys.clear();
    resetJoystickKnob();
    resetCharacterDrag();
    const culprit = role === 'culprit';
    const specialRole = state.privateState.specialRole;
    elements.roleCard.classList.toggle('culprit', culprit);
    elements.roleCard.classList.toggle('character', !culprit);
    if (specialRole === 'detective') {
      elements.roleIcon.textContent = '🔎';
      elements.roleTitle.textContent = '探偵';
      elements.roleDescription.textContent = 'キャラクター側です。近くの相手を1試合に1回だけ調査し、犯人の可能性を「高・中・低」で確認できます。';
    } else if (specialRole === 'jester') {
      elements.roleIcon.textContent = '🎭';
      elements.roleTitle.textContent = '道化師';
      elements.roleDescription.textContent = 'ナッツ強盗側です。犯人の行動に加え、近くの1人と同じ名前・姿に20秒間変身できます。変身は1試合に1回です。';
    } else if (specialRole === 'chef') {
      elements.roleIcon.textContent = '🍳';
      elements.roleTitle.textContent = '料理人';
      elements.roleDescription.textContent = 'キャラクター側です。好きな場所で1試合に1回、ご飯を置けます。置いたご飯は誰かが食べるまで残ります。';
    } else {
      elements.roleIcon.textContent = culprit ? '🥜' : '🐾';
      elements.roleTitle.textContent = culprit ? 'ナッツ強盗' : 'キャラクター';
      elements.roleDescription.textContent = culprit
        ? '正体を隠してナッツを奪えます。ご飯・丸太・回し車も使い、行動をまぎれこませられます。'
        : 'ご飯・丸太・回し車を使いながら、誰がナッツ強盗なのか観察してください。';
    }
    elements.culpritCountText.textContent = `この試合の犯人は${state.culpritCount}人です。この役職は自分の画面だけに表示されています。`;
    elements.roleOverlay.classList.remove('hidden');
  }

  function closeRoleCard() {
    if (elements.roleOverlay.classList.contains('hidden')) return;
    elements.roleOverlay.classList.add('hidden');
    elements.closeRoleButton.blur();
  }

  function applyPrivateState(payload = {}, reveal = false) {
    const previousRole = state.privateState.role;
    state.privateState = {
      role: payload.role ?? previousRole,
      specialRole: payload.specialRole === undefined ? state.privateState.specialRole : payload.specialRole,
      investigateUsed: payload.investigateUsed == null ? state.privateState.investigateUsed : Boolean(payload.investigateUsed),
      investigationResult: payload.investigationResult === undefined
        ? state.privateState.investigationResult : payload.investigationResult,
      disguiseUsed: payload.disguiseUsed == null ? state.privateState.disguiseUsed : Boolean(payload.disguiseUsed),
      disguiseUntil: payload.disguiseUntil == null ? state.privateState.disguiseUntil : Number(payload.disguiseUntil) || 0,
      disguiseTargetName: payload.disguiseTargetName === undefined
        ? state.privateState.disguiseTargetName : String(payload.disguiseTargetName || ''),
      chefMealUsed: payload.chefMealUsed == null ? state.privateState.chefMealUsed : Boolean(payload.chefMealUsed),
      hasNut: payload.hasNut == null ? state.privateState.hasNut : Boolean(payload.hasNut),
      ghost: payload.ghost == null ? state.privateState.ghost : Boolean(payload.ghost),
      expelled: payload.expelled == null ? state.privateState.expelled : Boolean(payload.expelled),
      hunger: Number.isFinite(Number(payload.hunger)) ? Number(payload.hunger) : state.privateState.hunger,
      digestionReady: payload.digestionReady == null ? state.privateState.digestionReady : Boolean(payload.digestionReady),
      cooldowns: {
        ...state.privateState.cooldowns,
        ...(payload.cooldowns || {})
      }
    };
    updatePrivateUi();
    if (state.meeting?.active) updateTestimonyControls();
    if (state.privateState.role && (reveal || !previousRole)) showRoleCard();
  }

  function canVoteInMeeting() {
    return Boolean(state.meeting?.active
      && !state.meeting.paused
      && !state.paused
      && state.meeting.participants?.some((player) => player.id === state.playerId)
      && state.privateState.hasNut
      && !state.privateState.ghost
      && !state.privateState.expelled);
  }

  const testimonyZones = {
    'upper-left': '左上', 'upper-right': '右上', center: '中央付近',
    'lower-left': '左下', 'lower-right': '右下'
  };

  function renderTestimonies() {
    const claims = new Map((state.meeting?.testimonies || []).map((claim) => [claim.playerId, claim]));
    elements.testimonyList.replaceChildren();
    for (const participant of state.meeting?.participants || []) {
      const claim = claims.get(participant.id);
      const row = document.createElement('div');
      row.className = `testimony-entry${claim ? '' : ' pending'}`;
      const name = document.createElement('strong');
      name.textContent = participant.name + (participant.id === state.playerId ? '（自分）' : '');
      const place = document.createElement('span');
      place.textContent = claim
        ? `${state.areas[claim.areaId]?.label || '不明'}・${testimonyZones[claim.zoneId] || '不明'}`
        : 'まだ証言なし';
      row.append(name, place);
      elements.testimonyList.append(row);
    }
    updateTestimonyControls();
  }

  function updateTestimonyControls() {
    const ownClaim = (state.meeting?.testimonies || []).find((claim) => claim.playerId === state.playerId);
    const allowed = canVoteInMeeting() && !ownClaim;
    elements.testimonyControls.classList.toggle('hidden', !allowed);
    elements.shareTestimonyButton.disabled = !allowed || testimonySubmitting;
    elements.testimonyHint.textContent = ownClaim ? '証言を全員に共有しました。'
      : !canVoteInMeeting() ? '会議に参加できないため、証言は見られますが投稿できません。'
        : '投票が終わる前に1回だけ証言できます。';
  }

  function shareTestimony() {
    if (elements.shareTestimonyButton.disabled) return;
    const areaId = elements.testimonyArea.value;
    const zoneId = elements.testimonyZone.value;
    if (!areaId || !zoneId) return showToast('ステージと場所を選んでください。');
    testimonySubmitting = true;
    updateTestimonyControls();
    socket.emit('shareTestimony', { areaId, zoneId }, (result) => {
      testimonySubmitting = false;
      if (!result?.ok) {
        showToast(result?.error || '証言できませんでした。');
      } else {
        if (state.meeting?.active && !(state.meeting.testimonies || []).some((claim) => claim.playerId === state.playerId)) {
          state.meeting.testimonies = [...(state.meeting.testimonies || []), { playerId: state.playerId, areaId, zoneId }];
        }
        renderTestimonies();
        showToast('証言を全員に共有しました。');
      }
      updateTestimonyControls();
    });
  }

  function updateVoteControls() {
    const canVote = canVoteInMeeting();
    const disabled = !canVote || state.hasVoted;
    elements.meetingCannotVote.classList.toggle('hidden', canVote);
    elements.skipVoteButton.classList.toggle('hidden', !canVote);
    elements.skipVoteButton.disabled = disabled;
    elements.voteGrid.querySelectorAll('.vote-option').forEach((button) => {
      button.disabled = disabled;
      button.classList.toggle('voted', button.dataset.playerId === state.voteTargetId);
    });
    if (!canVote) {
      elements.meetingStatus.textContent = 'ほかの参加者の投票を待っています。';
    } else if (state.hasVoted) {
      elements.meetingStatus.textContent = `投票済みです。${state.meeting?.voteCount || 0} / ${state.meeting?.totalVoters || 0}人が投票しました。`;
    } else {
      elements.meetingStatus.textContent = `上の一覧から通報する人を選んでください。${state.meeting?.voteCount || 0} / ${state.meeting?.totalVoters || 0}人が投票済みです。`;
    }
  }

  function buildVoteGrid() {
    elements.voteGrid.replaceChildren();
    const candidates = state.meeting?.participants || [];
    elements.voteCandidateHint.textContent = `会議に参加できる${candidates.length}人から選べます。${candidates.length > 3 ? '一覧の中を上下にスクロールすると全員見られます。' : ''}別のステージにいる人やNPCも含まれます。`;
    for (const player of candidates) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vote-option';
      button.dataset.playerId = player.id;
      button.setAttribute('aria-label', `${player.name}に投票`);
      const image = document.createElement('img');
      image.src = `./assets/characters/character-${String(player.characterId).padStart(2, '0')}.png`;
      image.alt = '';
      const label = document.createElement('span');
      label.textContent = player.name + (player.id === state.playerId ? '（自分）' : '');
      button.append(image, label);
      button.addEventListener('click', () => castVote(player.id));
      elements.voteGrid.append(button);
    }
    updateVoteControls();
  }

  function showMeeting(payload = {}) {
    closeVentChooser();
    state.meeting = { ...payload, active: true };
    testimonySubmitting = false;
    elements.testimonyArea.value = '';
    elements.testimonyZone.value = '';
    state.hasVoted = (payload.votedPlayerIds || []).includes(state.playerId);
    state.voteTargetId = '';
    state.joystickVector = { x: 0, y: 0 };
    keys.clear();
    resetJoystickKnob();
    resetCharacterDrag();
    elements.roleOverlay.classList.add('hidden');
    elements.expulsionOverlay.classList.add('hidden');
    elements.meetingCaller.textContent = `${payload.callerName || '参加者'}が会議を開きました。`; 
    elements.meetingTimer.textContent = String(meetingSecondsRemaining(state.meeting));
    elements.skipVoteButton.textContent = '今回は誰も追放しない';
    elements.meetingOverlay.classList.remove('hidden');
    buildVoteGrid();
    renderTestimonies();
    updatePrivateUi();
  }

  function updateMeetingState(payload = {}) {
    if (!state.meeting?.active) return showMeeting(payload);
    state.meeting = { ...state.meeting, ...payload, active: true };
    state.hasVoted = state.hasVoted || (payload.votedPlayerIds || []).includes(state.playerId);
    elements.meetingTimer.textContent = String(meetingSecondsRemaining(state.meeting));
    const listed = [...elements.voteGrid.children].map((button) => button.dataset.playerId).join('|');
    const candidates = (state.meeting.participants || []).map((player) => player.id).join('|');
    if (listed !== candidates) buildVoteGrid();
    else updateVoteControls();
    renderTestimonies();
  }

  function callMeeting() {
    if (elements.meetingButton.disabled) return;
    elements.meetingButton.disabled = true;
    socket.emit('callMeeting', {}, (result) => {
      if (!result?.ok) {
        showToast(result?.error || '会議を開けませんでした。');
        if (result?.readyAt) state.meetingReadyAt = Number(result.readyAt) || 0;
      }
      updatePrivateUi();
    });
  }

  function castVote(targetId) {
    if (!canVoteInMeeting() || state.hasVoted) return;
    state.voteTargetId = targetId;
    elements.meetingStatus.textContent = '投票を送っています…';
    elements.skipVoteButton.disabled = true;
    elements.voteGrid.querySelectorAll('.vote-option').forEach((button) => { button.disabled = true; });
    socket.emit('castVote', { targetId }, (result) => {
      if (!result?.ok) {
        state.voteTargetId = '';
        showToast(result?.error || '投票できませんでした。');
      } else {
        state.hasVoted = true;
      }
      updateVoteControls();
    });
  }

  function restartExpulsionAnimation() {
    const animated = [elements.expulsionOverlay.querySelector('.human-hand'), elements.expelledCharacterImage];
    for (const item of animated) {
      if (!item) continue;
      item.style.animation = 'none';
      void item.offsetWidth;
      item.style.animation = '';
    }
  }

  function showMeetingResolution(payload = {}) {
    closeVentChooser();
    state.meeting = {
      ...(state.meeting || {}),
      participants: payload.participants || state.meeting?.participants || [],
      testimonies: payload.testimonies || state.meeting?.testimonies || [],
      active: false,
      resolving: true
    };
    testimonySubmitting = false;
    renderTestimonies();
    state.joystickVector = { x: 0, y: 0 };
    resetJoystickKnob();
    if (payload.expelled) {
      elements.meetingOverlay.classList.add('hidden');
      elements.expelledCharacterImage.src = `./assets/characters/character-${String(payload.expelled.characterId).padStart(2, '0')}.png`;
      elements.expulsionTitle.textContent = `${payload.expelled.name}がつまみ出されます`;
      elements.expulsionRole.textContent = payload.expelled.wasCulprit
        ? 'ナッツ強盗でした。'
        : 'ナッツ強盗ではありませんでした。';
      elements.expulsionOverlay.classList.remove('hidden');
      restartExpulsionAnimation();
      clearTimeout(expulsionTimer);
      expulsionTimer = setTimeout(() => elements.expulsionOverlay.classList.add('hidden'), 4400);
    } else {
      elements.voteGrid.replaceChildren();
      elements.skipVoteButton.classList.add('hidden');
      elements.meetingCannotVote.classList.add('hidden');
      elements.meetingCaller.textContent = '投票結果';
      elements.meetingStatus.textContent = payload.message || '今回は誰も追放されません。';
      elements.meetingTimer.textContent = '—';
      elements.meetingOverlay.classList.remove('hidden');
    }
    updatePrivateUi();
  }

  function endMeeting(payload = {}) {
    state.meeting = null;
    testimonySubmitting = false;
    state.meetingReadyAt = Number(payload.meetingReadyAt) || state.meetingReadyAt;
    state.hasVoted = false;
    state.voteTargetId = '';
    clearTimeout(expulsionTimer);
    elements.meetingOverlay.classList.add('hidden');
    elements.expulsionOverlay.classList.add('hidden');
    updatePrivateUi();
  }

  function showGameOver(payload = {}) {
    closeVentChooser();
    state.gameResult = payload;
    state.meeting = null;
    state.joystickVector = { x: 0, y: 0 };
    keys.clear();
    resetJoystickKnob();
    resetCharacterDrag();
    clearTimeout(expulsionTimer);
    elements.roleOverlay.classList.add('hidden');
    elements.meetingOverlay.classList.add('hidden');
    elements.expulsionOverlay.classList.add('hidden');
    const culpritsWon = payload.winner === 'culprits';
    elements.gameOverCard.classList.toggle('culprits', culpritsWon);
    elements.gameOverCard.classList.toggle('characters', !culpritsWon);
    elements.gameOverIcon.textContent = culpritsWon ? '🥜' : '🏆';
    elements.gameOverTitle.textContent = payload.title || (culpritsWon ? 'ナッツ強盗の勝利！' : 'キャラクターチームの勝利！');
    elements.gameOverMessage.textContent = payload.message || 'ゲームが終了しました。';
    const names = Array.isArray(payload.culpritNames) ? payload.culpritNames.join('、') : '';
    elements.culpritReveal.textContent = names ? `ナッツ強盗：${names}` : 'ナッツ強盗を確認できませんでした。';
    elements.resultReturnLobbyButton.classList.toggle('hidden', !state.isHost);
    elements.resultWaitText.classList.toggle('hidden', state.isHost);
    elements.gameOverOverlay.classList.remove('hidden');
    updatePrivateUi();
  }

  function secondsUntil(timestamp) {
    return Math.max(0, Math.ceil((Number(timestamp || 0) - Date.now()) / 1000));
  }

  function meetingSecondsRemaining(meeting = state.meeting) {
    if (!meeting) return 0;
    if (meeting.paused) return Math.max(0, Math.ceil((Number(meeting.remainingMs) || 0) / 1000));
    return secondsUntil(meeting.endsAt);
  }

  function nearestVentEntry() {
    const local = state.players.get(state.playerId) || state.displayPlayers.get(state.playerId);
    if (!local) return null;
    return state.vents
      .filter((vent) => vent.areaId === state.areaId)
      .map((vent) => ({ vent, distance: Math.hypot(vent.x - local.x, vent.y - local.y) }))
      .sort((left, right) => left.distance - right.distance)[0] || null;
  }

  function nearestVentDistance() {
    return nearestVentEntry()?.distance ?? Infinity;
  }

  function distanceToSystem(target) {
    const local = state.players.get(state.playerId) || state.displayPlayers.get(state.playerId);
    if (!local || !target || target.areaId !== state.areaId) return Infinity;
    return Math.hypot(target.x - local.x, target.y - local.y);
  }

  function activeFoodSpots() {
    const listed = Array.isArray(state.systems.foodSpots) ? state.systems.foodSpots : [];
    if (listed.length) return listed.filter(Boolean);
    return state.systems.foodSpot ? [state.systems.foodSpot] : [];
  }

  function nearestFoodDistance() {
    return Math.min(Infinity, ...activeFoodSpots().map((spot) => distanceToSystem(spot)));
  }

  function nearestOtherPlayerDistance() {
    const local = state.players.get(state.playerId) || state.displayPlayers.get(state.playerId);
    if (!local) return Infinity;
    return Math.min(Infinity, ...Array.from(state.players.values())
      .filter((player) => player.id !== state.playerId && player.areaId === state.areaId)
      .map((player) => Math.hypot(player.x - local.x, player.y - local.y)));
  }

  function updateInvestigationResult() {
    const result = state.privateState.investigationResult;
    const visible = Boolean(result && result.targetName && result.label);
    elements.investigationResult.classList.toggle('hidden', !visible);
    elements.investigationResult.classList.toggle('result-high', visible && result.level === 'high');
    elements.investigationResult.classList.toggle('result-medium', visible && result.level === 'medium');
    elements.investigationResult.classList.toggle('result-low', visible && result.level === 'low');
    elements.investigationResultText.textContent = visible
      ? `${result.targetName}：犯人の可能性 ${result.label}（${result.score ?? ({ low: 1, medium: 2, high: 3 }[result.level])}）` : '';
  }

  function updatePrivateUi() {
    const privateState = state.privateState;
    const culprit = privateState.role === 'culprit';
    const detective = privateState.specialRole === 'detective';
    const jester = privateState.specialRole === 'jester';
    const chef = privateState.specialRole === 'chef';
    const expelled = Boolean(privateState.expelled);
    const cooldowns = privateState.cooldowns || {};
    const stealSeconds = secondsUntil(cooldowns.stealReadyAt);
    const stealStartSeconds = secondsUntil(cooldowns.stealStartReadyAt);
    const ventSeconds = secondsUntil(cooldowns.ventReadyAt);
    const blackoutSeconds = secondsUntil(cooldowns.blackoutReadyAt);
    const eatSeconds = secondsUntil(cooldowns.eatReadyAt);
    const gnawSeconds = secondsUntil(cooldowns.gnawReadyAt);
    const wheelSeconds = secondsUntil(cooldowns.wheelReadyAt);
    const meetingSeconds = secondsUntil(state.meetingReadyAt);
    const meetingActive = Boolean(state.meeting?.active || state.meeting?.resolving);
    const gameEnded = Boolean(state.gameResult);
    const actionBlocked = state.paused || meetingActive || gameEnded || expelled;
    const nearVent = nearestVentDistance() <= 120;
    const nearFood = nearestFoodDistance() <= 150;
    const nearLog = distanceToSystem(state.systems.log) <= 150;
    const nearWheel = distanceToSystem(state.systems.wheel) <= 150;
    const nearPlayer = nearestOtherPlayerDistance() <= 175;
    const disguiseSeconds = secondsUntil(privateState.disguiseUntil);
    const hunger = Math.max(0, Math.min(100, Math.round(Number(privateState.hunger) || 0)));
    const wheelCharge = Math.max(0, Math.min(100, Math.round(Number(state.systems.wheel?.charge) || 0)));

    elements.roleBadge.textContent = detective ? '役職：探偵'
      : jester ? '役職：道化師'
        : chef ? '役職：料理人'
          : culprit ? '役職：ナッツ強盗'
            : privateState.role === 'character' ? '役職：キャラクター' : '役職：確認中';
    elements.roleBadge.classList.toggle('role-culprit', culprit);
    elements.roleBadge.classList.toggle('role-character', privateState.role === 'character');
    elements.roleBadge.classList.toggle('role-detective', detective);
    elements.roleBadge.classList.toggle('role-jester', jester);
    elements.roleBadge.classList.toggle('role-chef', chef);
    elements.nutBadge.textContent = privateState.hasNut ? '🥜 ナッツあり' : 'ナッツなし';
    elements.nutBadge.classList.toggle('hidden', !privateState.role);
    elements.ghostBadge.classList.toggle('hidden', !privateState.ghost || expelled);
    elements.expelledBadge.classList.toggle('hidden', !expelled);
    elements.culpritActions.classList.toggle('hidden', !culprit || privateState.ghost || expelled);
    elements.specialRoleActions.classList.toggle('hidden', (!detective && !jester && !chef) || privateState.ghost || expelled);
    elements.specialRoleActions.classList.toggle('detective', detective);
    elements.specialRoleActions.classList.toggle('jester', jester);
    elements.specialRoleActions.classList.toggle('chef', chef);
    elements.investigateButton.classList.toggle('hidden', !detective);
    elements.disguiseButton.classList.toggle('hidden', !jester);
    elements.chefButton.classList.toggle('hidden', !chef);
    elements.blackoutBadge.classList.toggle('hidden', !state.blackout.active);
    elements.blackoutBadge.textContent = state.blackout.active
      ? `停電中：回し車で復旧${state.blackout.reason === 'wheel' ? '（電力切れ）' : ''}`
      : '停電中';
    elements.hungerBadge.textContent = `空腹度 ${hunger} / 100${hunger >= 100 ? '・移動低下' : ''}`;
    elements.hungerBadge.classList.toggle('full', hunger >= 100);
    elements.digestionBadge.textContent = privateState.digestionReady ? '吸収効率：最大' : '吸収効率：半分';
    elements.digestionBadge.classList.toggle('ready', privateState.digestionReady);
    elements.digestionBadge.classList.toggle('hidden', privateState.ghost || expelled);
    elements.wheelBadge.textContent = `回し車 ${wheelCharge}%`;
    elements.wheelBadge.classList.toggle('low', wheelCharge <= 25);

    elements.stealCooldown.textContent = stealStartSeconds ? `開始後あと${stealStartSeconds}秒`
      : stealSeconds ? `あと${stealSeconds}秒` : '近くの相手';
    elements.ventCooldown.textContent = ventSeconds ? `あと${ventSeconds}秒` : nearVent ? '使用可能' : '柄マットへ';
    elements.blackoutCooldown.textContent = blackoutSeconds ? `あと${blackoutSeconds}秒` : state.blackout.active ? '停電中' : '使用可能';
    elements.stealButton.disabled = !culprit || privateState.ghost || actionBlocked || stealSeconds > 0;
    elements.ventButton.disabled = !culprit || privateState.ghost || actionBlocked || ventSeconds > 0 || !nearVent;
    elements.blackoutButton.disabled = !culprit || privateState.ghost || actionBlocked || blackoutSeconds > 0 || state.blackout.active;
    elements.ventButton.classList.toggle('nearby', culprit && !privateState.ghost && !actionBlocked && nearVent && ventSeconds === 0);

    elements.investigateHint.textContent = privateState.investigateUsed ? '調査済み'
      : nearPlayer ? '調査できる' : '相手へ近づく';
    elements.investigateButton.disabled = !detective || actionBlocked || privateState.ghost
      || privateState.investigateUsed || !nearPlayer;
    elements.investigateButton.classList.toggle('nearby', detective && !elements.investigateButton.disabled && nearPlayer);
    elements.disguiseHint.textContent = disguiseSeconds ? `変身中 あと${disguiseSeconds}秒`
      : privateState.disguiseUsed ? '使用済み'
        : nearPlayer ? '変身できる' : '相手へ近づく';
    elements.disguiseButton.disabled = !jester || actionBlocked || privateState.ghost
      || privateState.disguiseUsed || !nearPlayer;
    elements.disguiseButton.classList.toggle('nearby', jester && !elements.disguiseButton.disabled && nearPlayer);

    elements.chefHint.textContent = privateState.chefMealUsed ? '使用済み' : '現在地に置く';
    elements.chefButton.disabled = !chef || actionBlocked || privateState.ghost || privateState.chefMealUsed;
    elements.chefButton.classList.toggle('nearby', chef && !elements.chefButton.disabled);

    elements.eatHint.textContent = privateState.ghost ? '使用できません'
      : eatSeconds ? `あと${eatSeconds}秒` : nearFood ? (hunger > 0 ? '食べられる' : '空腹度0') : '光る食事へ';
    elements.gnawHint.textContent = privateState.ghost ? '使用できません'
      : privateState.digestionReady ? '準備できた' : gnawSeconds ? `あと${gnawSeconds}秒` : nearLog ? 'かじれる' : '大きな丸太へ';
    elements.wheelHint.textContent = wheelSeconds ? `あと${wheelSeconds}秒`
      : nearWheel ? (state.blackout.active ? '停電を直す' : '満タンにする') : '回し車へ';
    elements.eatButton.disabled = actionBlocked || privateState.ghost || eatSeconds > 0 || !nearFood || hunger <= 0;
    elements.gnawButton.disabled = actionBlocked || privateState.ghost || privateState.digestionReady || gnawSeconds > 0 || !nearLog;
    elements.wheelButton.disabled = actionBlocked || wheelSeconds > 0 || !nearWheel;
    elements.eatButton.classList.toggle('nearby', !elements.eatButton.disabled && nearFood);
    elements.gnawButton.classList.toggle('nearby', !elements.gnawButton.disabled && nearLog);
    elements.wheelButton.classList.toggle('nearby', !elements.wheelButton.disabled && nearWheel);

    const meetingAvailable = Boolean(privateState.role && privateState.hasNut && !privateState.ghost
      && !expelled && !state.paused && !meetingActive && !gameEnded && meetingSeconds === 0);
    elements.meetingButton.disabled = !meetingAvailable;
    elements.meetingButton.classList.toggle('available', meetingAvailable);
    elements.meetingHint.textContent = gameEnded ? 'ゲーム終了'
      : meetingActive ? '会議中'
        : (!privateState.hasNut || privateState.ghost || expelled) ? '参加できません'
          : meetingSeconds ? `あと${meetingSeconds}秒` : '開く';
    updateInvestigationResult();
    if (state.meeting?.active) elements.meetingTimer.textContent = String(meetingSecondsRemaining(state.meeting));
  }

  function investigatePlayer() {
    if (elements.investigateButton.disabled) return;
    elements.investigateButton.disabled = true;
    socket.emit('investigatePlayer', {}, (result) => {
      if (!result?.ok) {
        showToast(result?.error || '調査できませんでした。');
      } else {
        state.privateState.investigateUsed = true;
        state.privateState.investigationResult = {
          targetName: result.targetName,
          level: result.level,
          label: result.label,
          score: result.score
        };
        showToast(`${result.targetName}の犯人の可能性は「${result.label}（${result.score}）」です。`);
      }
      updatePrivateUi();
    });
  }

  function disguiseAsPlayer() {
    if (elements.disguiseButton.disabled) return;
    elements.disguiseButton.disabled = true;
    socket.emit('disguiseAsPlayer', {}, (result) => {
      if (!result?.ok) {
        showToast(result?.error || '変身できませんでした。');
      } else {
        state.privateState.disguiseUsed = true;
        state.privateState.disguiseUntil = Number(result.disguiseUntil) || 0;
        state.privateState.disguiseTargetName = result.targetName || '';
        showToast(`${result.targetName}に20秒間変身しました。`);
      }
      updatePrivateUi();
    });
  }

  function placeChefMeal() {
    if (elements.chefButton.disabled) return;
    elements.chefButton.disabled = true;
    socket.emit('placeChefMeal', {}, (result) => {
      if (!result?.ok) {
        showToast(result?.error || 'ご飯を置けませんでした。');
      } else {
        state.privateState.chefMealUsed = true;
        if (result.systems) state.systems = result.systems;
        showToast('現在地にご飯を置きました。');
      }
      updatePrivateUi();
    });
  }

  function ventPositionLabel(vent) {
    if (vent.id.endsWith('-top')) return '上側';
    if (vent.id.endsWith('-bottom')) return '下側';
    if (vent.id.endsWith('-left')) return '左側';
    if (vent.id.endsWith('-right')) return '右側';
    return vent.label || '通気口';
  }

  function ventDestinationLabel(vent) {
    return `${state.areas[vent.areaId]?.label || vent.areaId}・${ventPositionLabel(vent)}`;
  }

  function closeVentChooser() {
    if (!elements.ventChoiceOverlay) return;
    elements.ventChoiceOverlay.classList.add('hidden');
    elements.ventChoiceGrid.replaceChildren();
  }

  function travelByVent(destinationId) {
    elements.ventChoiceGrid.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    socket.emit('useVent', { destinationId }, (result) => {
      if (!result?.ok) {
        showToast(result?.error || '通気口を使えませんでした。');
        if (result?.readyAt) state.privateState.cooldowns.ventReadyAt = result.readyAt;
        closeVentChooser();
      } else {
        state.privateState.cooldowns.ventReadyAt = result.readyAt;
        const destination = state.vents.find((vent) => vent.id === result.destinationId);
        closeVentChooser();
        showToast(`${destination ? ventDestinationLabel(destination) : '選んだ場所'}へ移動しました。`);
      }
      updatePrivateUi();
    });
  }

  function openVentChooser() {
    if (elements.ventButton.disabled) return;
    const source = nearestVentEntry();
    if (!source || source.distance > 120) return showToast('花柄・葉っぱ柄のマットに近づいてください。');
    keys.clear();
    resetJoystickKnob();
    resetCharacterDrag();
    socket.emit('playerInput', { x: 0, y: 0 });
    elements.ventChoiceGrid.replaceChildren();
    for (const vent of state.vents.filter((item) => item.id !== source.vent.id)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'vent-choice-button';
      button.innerHTML = `<span>❧</span><strong>${ventDestinationLabel(vent)}</strong>`;
      button.addEventListener('click', () => travelByVent(vent.id));
      elements.ventChoiceGrid.append(button);
    }
    elements.ventChoiceOverlay.classList.remove('hidden');
  }

  function useCulpritAction(eventName, button, successMessage) {
    if (button.disabled) return;
    button.disabled = true;
    socket.emit(eventName, {}, (result) => {
      if (!result?.ok) {
        showToast(result?.error || '行動できませんでした。');
        if (result?.readyAt) {
          const field = eventName === 'stealNut' ? 'stealReadyAt'
            : eventName === 'useVent' ? 'ventReadyAt' : 'blackoutReadyAt';
          state.privateState.cooldowns[field] = result.readyAt;
        }
      } else {
        showToast(typeof successMessage === 'function' ? successMessage(result) : successMessage);
        if (eventName === 'stealNut') state.privateState.cooldowns.stealReadyAt = result.readyAt;
        if (eventName === 'useVent') state.privateState.cooldowns.ventReadyAt = result.readyAt;
        if (eventName === 'triggerBlackout') state.privateState.cooldowns.blackoutReadyAt = result.readyAt;
      }
      updatePrivateUi();
    });
  }

  function useCommonAction(eventName, button, successMessage) {
    if (button.disabled) return;
    button.disabled = true;
    socket.emit(eventName, {}, (result) => {
      const cooldownField = eventName === 'eatFood' ? 'eatReadyAt'
        : eventName === 'gnawLog' ? 'gnawReadyAt' : 'wheelReadyAt';
      if (!result?.ok) {
        showToast(result?.error || '今は行動できません。');
        if (result?.readyAt) state.privateState.cooldowns[cooldownField] = result.readyAt;
      } else {
        if (Number.isFinite(Number(result.hunger))) state.privateState.hunger = Number(result.hunger);
        if (result.digestionReady != null) state.privateState.digestionReady = Boolean(result.digestionReady);
        if (eventName === 'eatFood') state.privateState.digestionReady = false;
        if (result.readyAt) state.privateState.cooldowns[cooldownField] = result.readyAt;
        if (result.systems) state.systems = result.systems;
        showToast(typeof successMessage === 'function' ? successMessage(result) : successMessage);
      }
      updatePrivateUi();
    });
  }

  function updateSnapshot(snapshot) {
    const previousArea = state.areaId;
    state.areaId = snapshot.areaId || state.areaId;
    if (state.areaId !== previousArea) {
      state.players.clear();
      state.displayPlayers.clear();
      const label = state.areas[state.areaId]?.label || '別の部屋';
      showToast(`${label}へ移動しました。`);
    }
    const currentIds = new Set();
    for (const player of snapshot.players || []) {
      currentIds.add(player.id);
      state.players.set(player.id, player);
      if (!state.displayPlayers.has(player.id)) {
        state.displayPlayers.set(player.id, { ...player });
      }
    }
    for (const id of state.players.keys()) {
      if (!currentIds.has(id)) state.players.delete(id);
    }
    for (const id of state.displayPlayers.keys()) {
      if (!currentIds.has(id)) state.displayPlayers.delete(id);
    }
    if (snapshot.systems) state.systems = snapshot.systems;
    if (snapshot.blackout) state.blackout = snapshot.blackout;
    if (snapshot.selfState) {
      if (Number.isFinite(Number(snapshot.selfState.hunger))) state.privateState.hunger = Number(snapshot.selfState.hunger);
      state.privateState.digestionReady = Boolean(snapshot.selfState.digestionReady);
    }
    elements.gamePlayerCount.textContent = `${snapshot.connectedPlayerCount ?? state.lobby?.playerCount ?? 0} / 11`;
    elements.areaName.textContent = state.areas[state.areaId]?.label || state.areaId;
    updatePrivateUi();
  }

  function setPause(payload) {
    state.paused = Boolean(payload?.paused);
    if (state.paused) {
      resetCharacterDrag();
      closeVentChooser();
    }
    elements.pausedOverlay.classList.toggle('hidden', !state.paused);
    if (state.paused) {
      elements.pausedText.textContent = `${payload.playerName || '参加者'}の再接続を${payload.seconds || 30}秒待ちます。`;
    }
    updatePrivateUi();
    if (state.meeting?.active) {
      updateVoteControls();
      updateTestimonyControls();
    }
  }

  function returnToLobby() {
    socket.emit('returnToLobby', {}, (result) => {
      if (!result?.ok) showToast(result?.error || 'ロビーへ戻せませんでした。');
    });
  }

  function drawRoundedRect(context, x, y, width, height, radius, fill, stroke = null) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.roundRect(x, y, width, height, r);
    if (fill) {
      context.fillStyle = fill;
      context.fill();
    }
    if (stroke) {
      context.strokeStyle = stroke;
      context.stroke();
    }
  }

  function drawFallbackMap() {
    ctx.fillStyle = '#b68e68';
    ctx.fillRect(0, 0, state.world.width, state.world.height);

    ctx.fillStyle = '#cba47d';
    ctx.fillRect(20, 20, 920, 500);
    ctx.fillStyle = '#ae875f';
    ctx.fillRect(980, 20, 920, 500);
    ctx.fillStyle = '#9cbd87';
    ctx.fillRect(20, 560, 920, 500);
    ctx.fillStyle = '#c59a70';
    ctx.fillRect(980, 560, 920, 500);

    ctx.save();
    ctx.strokeStyle = 'rgba(78, 47, 30, 0.24)';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 16]);
    ctx.strokeRect(12, 12, 1896, 1056);
    ctx.beginPath();
    ctx.moveTo(960, 0);
    ctx.lineTo(960, 1080);
    ctx.moveTo(0, 540);
    ctx.lineTo(1920, 540);
    ctx.stroke();
    ctx.restore();

    // 枕の山
    const pillowColors = ['#f7ddc5', '#c7dbe7', '#f0c2c9', '#d9d2ed'];
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const x = 245 + column * 73 + (row % 2) * 24;
        const y = 178 + row * 58;
        drawRoundedRect(ctx, x, y, 88, 54, 17, pillowColors[(row + column) % pillowColors.length], '#9c7a69');
      }
    }

    // テーブル
    drawRoundedRect(ctx, 1120, 155, 425, 250, 25, '#754a2e', '#4b2b1c');
    drawRoundedRect(ctx, 1145, 178, 375, 202, 18, '#9a6540', '#c48a5a');
    ctx.fillStyle = '#f2e3c5';
    ctx.beginPath();
    ctx.arc(1250, 267, 42, 0, Math.PI * 2);
    ctx.arc(1414, 287, 45, 0, Math.PI * 2);
    ctx.fill();

    // 丸太
    drawRoundedRect(ctx, 410, 725, 455, 145, 65, '#79502d', '#4e321e');
    ctx.fillStyle = '#b57b45';
    ctx.beginPath();
    ctx.ellipse(835, 797, 36, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#73461f';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(835, 797, 18, 35, 0, 0, Math.PI * 2);
    ctx.stroke();

    // カウンター
    drawRoundedRect(ctx, 1050, 690, 560, 155, 20, '#5e3927', '#3d251a');
    ctx.fillStyle = '#e4c18a';
    ctx.fillRect(1063, 701, 534, 30);
    for (let x = 1080; x < 1580; x += 90) {
      ctx.fillStyle = '#ead8bd';
      ctx.beginPath();
      ctx.arc(x, 770, 23, 0, Math.PI * 2);
      ctx.fill();
    }

    drawVentMat(120, 575, '#f4a9bf', '✿');
    drawVentMat(1740, 90, '#f4a9bf', '✿');
    drawVentMat(810, 925, '#7fc77c', '❧');
    drawVentMat(1690, 905, '#7fc77c', '❧');

    ctx.fillStyle = 'rgba(62, 36, 24, 0.58)';
    ctx.font = '900 28px sans-serif';
    ctx.fillText('ふかふか寝床', 52, 74);
    ctx.fillText('食堂', 1018, 74);
    ctx.fillText('回し車と丸太の部屋', 52, 618);
    ctx.fillText('みんなの広場', 1018, 618);
  }

  function drawVentMat(x, y, color, pattern) {
    drawRoundedRect(ctx, x, y, 120, 82, 15, color, 'rgba(75,43,29,0.48)');
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = '42px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pattern, x + 60, y + 42);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  function drawPlayer(player, isLocal) {
    const image = characterImages.get(player.characterId);
    ctx.save();
    ctx.translate(player.x, player.y);
    if (isLocal && state.privateState.ghost) ctx.globalAlpha = 0.68;

    if (isLocal) {
      ctx.strokeStyle = '#ffe074';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(0, 18, 44, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(30,18,12,0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 40, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (image) {
      const maxWidth = 94;
      const maxHeight = 104;
      const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      const width = image.naturalWidth * ratio;
      const height = image.naturalHeight * ratio;
      ctx.drawImage(image, -width / 2, 30 - height, width, height);
    } else {
      const color = CHARACTER_COLORS[player.characterId - 1] || '#c98b55';
      ctx.fillStyle = color;
      ctx.strokeStyle = 'rgba(71,41,25,0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-24, -24, 17, 0, Math.PI * 2);
      ctx.arc(24, -24, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 43, 39, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#25150e';
      ctx.beginPath();
      ctx.arc(-14, -5, 4.5, 0, Math.PI * 2);
      ctx.arc(14, -5, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#efb2a7';
      ctx.beginPath();
      ctx.arc(0, 8, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff7de';
      ctx.font = '900 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(String(player.characterId), 0, 28);
    }

    ctx.font = '800 17px sans-serif';
    ctx.textAlign = 'center';
    const label = player.connected === false ? `📴 ${player.name}` : player.name;
    const width = Math.max(60, ctx.measureText(label).width + 18);
    drawRoundedRect(ctx, -width / 2, -69, width, 25, 10, 'rgba(37,22,15,0.78)');
    ctx.fillStyle = '#fff8e9';
    ctx.fillText(label, 0, -51);
    ctx.restore();
  }

  function drawSystemMarker(target, icon, label, color) {
    if (!target || target.areaId !== state.areaId) return;
    const pulse = 45 + Math.sin(performance.now() / 250) * 5;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(28, 18, 13, 0.72)';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(target.x, target.y, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '34px "Yu Gothic UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(icon, target.x, target.y + 1);
    ctx.font = '900 17px "Yu Gothic UI", sans-serif';
    const width = Math.max(78, ctx.measureText(label).width + 20);
    drawRoundedRect(ctx, target.x - width / 2, target.y + 49, width, 27, 10, 'rgba(30,18,12,0.82)');
    ctx.fillStyle = '#fff8e9';
    ctx.fillText(label, target.x, target.y + 63);
    ctx.restore();
  }

  function drawSystemMarkers() {
    for (const food of activeFoodSpots()) {
      drawSystemMarker(food, food.chefMade ? '🍳' : '🍱', food.chefMade ? '料理人のご飯' : '食べる', 'rgba(255, 221, 102, 0.9)');
    }
    drawSystemMarker(state.systems.log, '🪵', '丸太をかじる', 'rgba(242, 167, 87, 0.9)');
    const charge = Math.max(0, Math.min(100, Math.round(Number(state.systems.wheel?.charge) || 0)));
    drawSystemMarker(state.systems.wheel, '☸', `回し車 ${charge}%`, charge <= 25 ? 'rgba(255, 105, 94, 0.95)' : 'rgba(105, 232, 220, 0.9)');
  }

  function drawVentHints() {
    if (state.privateState.role !== 'culprit' || state.privateState.ghost) return;
    const pulse = 52 + Math.sin(performance.now() / 230) * 7;
    ctx.save();
    ctx.strokeStyle = 'rgba(147, 255, 137, 0.72)';
    ctx.lineWidth = 6;
    ctx.setLineDash([15, 9]);
    for (const vent of state.vents.filter((item) => item.areaId === state.areaId)) {
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBlackout(cameraX, cameraY, local) {
    if (!state.blackout.active || !local) return;
    const localX = local.x - cameraX;
    const localY = local.y - cameraY;
    ctx.save();
    ctx.fillStyle = 'rgba(2, 3, 7, 0.96)';
    ctx.beginPath();
    ctx.rect(0, 0, view.w, view.h);
    ctx.moveTo(localX + 150, localY);
    ctx.arc(localX, localY, 150, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(184, 208, 230, 0.22)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(localX, localY, 150, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function renderFrame() {
    requestAnimationFrame(renderFrame);
    const frameNow = performance.now();
    const dt = Math.min(0.05, Math.max(0, (frameNow - lastFrameAt) / 1000));
    lastFrameAt = frameNow;
    if (state.screen !== 'game') return;
    updateViewSize();
    refreshDragVector();
    const localPrediction = updatePrediction(dt);

    for (const [id, target] of state.players) {
      const display = state.displayPlayers.get(id) || { ...target };
      if (id === state.playerId && localPrediction) {
        display.x = localPrediction.x;
        display.y = localPrediction.y;
      } else {
        display.x += (target.x - display.x) * 0.32;
        display.y += (target.y - display.y) * 0.32;
      }
      display.name = target.name;
      display.characterId = target.characterId;
      display.connected = target.connected;
      display.areaId = target.areaId;
      state.displayPlayers.set(id, display);
    }

    const local = state.displayPlayers.get(state.playerId);
    const camera = cameraFor(local);
    const cameraX = camera.x;
    const cameraY = camera.y;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.save();
    ctx.translate(-cameraX, -cameraY);
    const mapImage = mapImages.get(state.areaId);
    if (mapImage?.complete && mapImage.naturalWidth) {
      ctx.drawImage(mapImage, 0, 0, state.world.width, state.world.height);
    } else {
      drawFallbackMap();
    }

    drawSystemMarkers();
    drawVentHints();

    [...state.displayPlayers.values()]
      .filter((player) => player.areaId === state.areaId)
      .sort((a, b) => a.y - b.y)
      .forEach((player) => drawPlayer(player, player.id === state.playerId));
    ctx.restore();
    drawBlackout(cameraX, cameraY, local);
    updatePrivateUi();
  }

  function keyboardVector() {
    let x = 0;
    let y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function gamepadVector() {
    const gamepads = navigator.getGamepads?.() || [];
    const pad = [...gamepads].find(Boolean);
    if (!pad) return { x: 0, y: 0 };
    const deadZone = 0.18;
    const x = Math.abs(pad.axes[0] || 0) > deadZone ? pad.axes[0] : 0;
    const y = Math.abs(pad.axes[1] || 0) > deadZone ? pad.axes[1] : 0;
    const length = Math.hypot(x, y);
    return length > 1 ? { x: x / length, y: y / length } : { x, y };
  }

  function currentInputVector() {
    const candidates = [keyboardVector(), gamepadVector(), state.joystickVector, state.characterDragVector];
    return candidates.reduce((best, value) => Math.hypot(value.x, value.y) > Math.hypot(best.x, best.y) ? value : best, { x: 0, y: 0 });
  }

  function sendInput() {
    if (state.screen !== 'game' || !state.playerId || state.paused || state.meeting?.active
      || state.meeting?.resolving || state.gameResult || state.privateState.expelled
      || !elements.roleOverlay.classList.contains('hidden')
      || !elements.ventChoiceOverlay.classList.contains('hidden') || !socket.connected) return;
    const value = currentInputVector();
    const now = performance.now();
    const changed = Math.abs(value.x - state.lastSentInput.x) > 0.02 || Math.abs(value.y - state.lastSentInput.y) > 0.02;
    if ((changed && now - state.lastSentInput.at >= 30) || now - state.lastSentInput.at > 240) {
      socket.emit('playerInput', { x: value.x, y: value.y });
      state.lastSentInput = { x: value.x, y: value.y, at: now };
    }
  }

  function updateJoystick(event) {
    const bounds = elements.joystick.getBoundingClientRect();
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const limit = bounds.width * 0.34;
    let dx = event.clientX - centerX;
    let dy = event.clientY - centerY;
    const distance = Math.hypot(dx, dy);
    if (distance > limit) {
      dx = (dx / distance) * limit;
      dy = (dy / distance) * limit;
    }
    state.joystickVector = { x: dx / limit, y: dy / limit };
    elements.joystickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  function resetJoystickKnob() {
    state.joystickVector = { x: 0, y: 0 };
    elements.joystickKnob.style.transform = 'translate(-50%, -50%)';
    joystickPointerId = null;
  }

  function canvasPoint(event) {
    const bounds = elements.gameCanvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    return {
      x: (event.clientX - bounds.left) * elements.gameCanvas.width / bounds.width,
      y: (event.clientY - bounds.top) * elements.gameCanvas.height / bounds.height
    };
  }

  function localPlayerScreenPosition() {
    const local = state.displayPlayers.get(state.playerId) || state.players.get(state.playerId);
    if (!local || local.areaId !== state.areaId) return null;
    const camera = cameraFor(local);
    return { x: local.x - camera.x, y: local.y - camera.y };
  }

  function refreshDragVector() {
    if (characterPointerId == null || !dragClientPoint) return;
    const point = canvasPoint(dragClientPoint);
    const local = localPlayerScreenPosition();
    if (!point || !local) return;
    const dx = point.x - local.x;
    const dy = point.y - local.y;
    const distance = Math.hypot(dx, dy);
    // 指の真下（12px以内）で止まり、48px離れたら全速力
    const strength = Math.max(0, Math.min(1, (distance - 12) / 36));
    state.characterDragVector = distance > 0
      ? { x: dx / distance * strength, y: dy / distance * strength }
      : { x: 0, y: 0 };
  }

  function updateCharacterDrag(event) {
    if (event.pointerId !== characterPointerId) return;
    dragClientPoint = { clientX: event.clientX, clientY: event.clientY };
    refreshDragVector();
    sendInput();
  }

  function resetCharacterDrag(event) {
    if (event?.pointerId != null && event.pointerId !== characterPointerId) return;
    state.characterDragVector = { x: 0, y: 0 };
    characterPointerId = null;
    dragClientPoint = null;
    sendInput();
    elements.gameCanvas.classList.remove('dragging-character');
  }

  function startCharacterDrag(event) {
    if (state.screen !== 'game' || state.paused || state.meeting?.active || state.meeting?.resolving
      || state.gameResult || state.privateState.expelled || !elements.roleOverlay.classList.contains('hidden')
      || !elements.ventChoiceOverlay.classList.contains('hidden')) return;
    const point = canvasPoint(event);
    const local = localPlayerScreenPosition();
    if (!point || !local) return; // v2: 画面のどこを押しても、その方向へ動ける
    characterPointerId = event.pointerId;
    elements.gameCanvas.setPointerCapture(event.pointerId);
    elements.gameCanvas.classList.add('dragging-character');
    updateCharacterDrag(event);
    event.preventDefault();
  }

  socket.on('connect', () => {
    elements.connectionChip.textContent = '接続済み';
    elements.connectionChip.classList.remove('offline');
    if (state.ownsRoom && state.roomCode) {
      socket.emit('resumeHost', { code: state.roomCode, sessionToken: state.sessionToken }, (result) => {
        if (!result?.ok) {
          state.ownsRoom = false;
          state.roomCode = '';
          state.playerId = null;
          elements.roomCodeInput.value = '';
          history.replaceState({}, '', `${location.pathname}?host=1`);
          createRoom();
          return;
        }
        state.isHost = true;
        state.joinUrls = result.joinUrls || state.joinUrls;
        renderHostShare();
        elements.toggleQrButton.classList.remove('hidden');
        elements.lobbyQr.classList.remove('hidden');
        elements.toggleQrButton.textContent = 'QRを隠す';
        if (result.playerId) state.playerId = result.playerId;
        state.lobby = result.lobby;
        renderLobby(result.lobby);
        if (result.lobby.phase !== 'lobby') {
          showGame(result.game || {});
          if (result.privateState) applyPrivateState(result.privateState, true);
        }
      });
    } else if (state.playerId && state.roomCode && state.playerName) {
      socket.emit('joinRoom', {
        code: state.roomCode,
        name: state.playerName,
        characterId: state.selectedCharacter,
        sessionToken: state.sessionToken
      }, (result) => {
        if (!result?.ok) {
          if (/部屋は見つかりません/.test(result?.error || '')) {
            state.playerId = null;
            state.meeting = null;
            state.gameResult = null;
            setPause({ paused: false });
            setScreen('home');
            showToast('親機が再起動しました。親機に表示された新しいQRコードを読み取ってください。');
            return;
          }
          showToast(result?.error || '再接続できませんでした。');
          return;
        }
        state.playerId = result.playerId;
        state.isHost = Boolean(result.isHost);
        state.world = result.world || state.world;
        state.areas = result.areas || state.areas;
        state.vents = result.vents || state.vents;
        loadAreaImages(state.areas);
        if (result.phase !== 'lobby') {
          showGame(result.game || result);
          if (result.privateState) applyPrivateState(result.privateState, true);
        } else {
          setScreen('lobby');
        }
      });
    }
    if (state.isHost && !state.roomCode && !autoCreateStarted) {
      autoCreateStarted = true;
      createRoom();
    }
    inspectRoom();
  });

  socket.on('disconnect', () => {
    elements.connectionChip.textContent = '再接続中';
    elements.connectionChip.classList.add('offline');
    if (state.screen === 'game') setPause({ paused: true, playerName: 'サーバー', seconds: 30 });
  });

  socket.on('connect_error', (error) => {
    const waitingForHost = /親機/.test(String(error?.message || ''));
    elements.connectionChip.textContent = waitingForHost ? '親機を待っています' : '接続できません';
    elements.connectionChip.classList.add('offline');
  });

  socket.on('lobbyState', renderLobby);
  socket.on('gameStarted', showGame);
  socket.on('privateState', (payload) => applyPrivateState(payload));
  socket.on('snapshot', updateSnapshot);
  socket.on('blackoutState', (payload = {}) => {
    state.blackout = payload;
    updatePrivateUi();
    showToast(payload.active ? '停電しました。見える範囲は直径300pxです。' : '明かりが戻りました。');
  });
  socket.on('systemState', (payload = {}) => {
    state.systems = payload;
    updatePrivateUi();
  });
  socket.on('nutStolen', (payload = {}) => {
    showToast(payload.message || 'ナッツを奪われました。');
  });
  socket.on('meetingStarted', showMeeting);
  socket.on('meetingState', updateMeetingState);
  socket.on('meetingResolved', showMeetingResolution);
  socket.on('meetingEnded', endMeeting);
  socket.on('gameOver', showGameOver);
  socket.on('connectionPause', setPause);
  socket.on('playerConnection', (payload = {}) => {
    if (!payload.online) showToast(`${payload.playerName || '参加者'}の通信が切れました。キャラクターはその場に残り、ゲームは続きます。`);
  });
  socket.on('matchAborted', (payload) => {
    setPause({ paused: false });
    state.players.clear();
    state.displayPlayers.clear();
    state.meeting = null;
    state.meetingReadyAt = 0;
    state.hasVoted = false;
    state.voteTargetId = '';
    state.gameResult = null;
    state.privateState.investigationResult = null;
    state.blackout = { active: false, endsAt: 0, reason: null, temporaryAutoRestore: false };
    clearTimeout(expulsionTimer);
    elements.roleOverlay.classList.add('hidden');
    closeVentChooser();
    elements.meetingOverlay.classList.add('hidden');
    elements.expulsionOverlay.classList.add('hidden');
    elements.gameOverOverlay.classList.add('hidden');
    elements.investigationResult.classList.add('hidden');
    setScreen('lobby');
    showToast(payload?.message || '試合を終了しました。');
  });

  elements.createRoomButton.addEventListener('click', createRoom);
  elements.joinForm.addEventListener('submit', joinRoom);
  elements.readyButton.addEventListener('click', setReady);
  elements.addNpcButton.addEventListener('click', () => {
    elements.addNpcButton.disabled = true;
    socket.emit('addNpc', {}, (result) => {
      if (!result?.ok) {
        elements.addNpcButton.disabled = false;
        showToast(result?.error || 'NPCを追加できませんでした。');
      }
    });
  });
  elements.testStartButton.addEventListener('click', () => startGame(true));
  elements.normalStartButton.addEventListener('click', () => startGame(false));
  elements.returnLobbyButton.addEventListener('click', returnToLobby);
  elements.resultReturnLobbyButton.addEventListener('click', returnToLobby);
  elements.closeRoleButton.addEventListener('click', closeRoleCard);
  elements.roleOverlay.addEventListener('pointerup', closeRoleCard);
  elements.meetingButton.addEventListener('click', callMeeting);
  elements.shareTestimonyButton.addEventListener('click', shareTestimony);
  elements.investigateButton.addEventListener('click', investigatePlayer);
  elements.disguiseButton.addEventListener('click', disguiseAsPlayer);
  elements.chefButton.addEventListener('click', placeChefMeal);
  elements.closeVentChoiceButton.addEventListener('click', closeVentChooser);
  elements.skipVoteButton.addEventListener('click', () => castVote('skip'));
  elements.stealButton.addEventListener('click', () => useCulpritAction(
    'stealNut', elements.stealButton, (result) => `${result.targetName}のナッツを奪いました。`
  ));
  elements.ventButton.addEventListener('click', openVentChooser);
  elements.blackoutButton.addEventListener('click', () => useCulpritAction(
    'triggerBlackout', elements.blackoutButton, '停電させました。'
  ));
  elements.eatButton.addEventListener('click', () => useCommonAction(
    'eatFood', elements.eatButton,
    (result) => result.fullAbsorption ? 'ご飯を食べ、空腹度が0になりました。' : `丸太をかじっていないため、空腹度は${result.hunger}です。`
  ));
  elements.gnawButton.addEventListener('click', () => useCommonAction(
    'gnawLog', elements.gnawButton, '丸太をかじりました。次のご飯をしっかり吸収できます。'
  ));
  elements.wheelButton.addEventListener('click', () => useCommonAction(
    'spinWheel', elements.wheelButton,
    (result) => result.restored ? '回し車を回して、停電を直しました。' : '回し車を回して、電力を満タンにしました。'
  ));
  elements.roomCodeInput.addEventListener('input', () => {
    elements.roomCodeInput.value = elements.roomCodeInput.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
    inspectRoom();
  });
  elements.copyUrlButton.addEventListener('click', async () => {
    if (!state.selectedJoinUrl) return showToast('コピーできるURLがありません。');
    try {
      await navigator.clipboard.writeText(state.selectedJoinUrl);
      showToast('参加URLをコピーしました。');
    } catch {
      showToast('URLを長押し、または選択してコピーしてください。');
    }
  });
  elements.toggleQrButton.addEventListener('click', () => {
    elements.lobbyQr.classList.toggle('hidden');
    elements.toggleQrButton.textContent = elements.lobbyQr.classList.contains('hidden') ? 'QRを表示' : 'QRを隠す';
  });

  window.addEventListener('keydown', (event) => {
    if (!elements.ventChoiceOverlay.classList.contains('hidden')) {
      if (event.code === 'Escape') {
        event.preventDefault();
        closeVentChooser();
      }
      return;
    }
    if (!elements.roleOverlay.classList.contains('hidden')
      && ['Escape', 'Enter', 'Space'].includes(event.code)) {
      event.preventDefault();
      closeRoleCard();
      return;
    }
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
      if (state.screen === 'game') event.preventDefault();
      keys.add(event.code);
    }
    if (state.screen === 'game' && !event.repeat) {
      if (event.code === 'KeyE') useCulpritAction('stealNut', elements.stealButton, (result) => `${result.targetName}のナッツを奪いました。`);
      if (event.code === 'KeyQ') openVentChooser();
      if (event.code === 'KeyF') useCulpritAction('triggerBlackout', elements.blackoutButton, '停電させました。');
      if (event.code === 'KeyZ') useCommonAction('eatFood', elements.eatButton, (result) => result.fullAbsorption ? '空腹度が0になりました。' : `空腹度は${result.hunger}になりました。`);
      if (event.code === 'KeyX') useCommonAction('gnawLog', elements.gnawButton, '丸太をかじりました。');
      if (event.code === 'KeyC') useCommonAction('spinWheel', elements.wheelButton, (result) => result.restored ? '停電を直しました。' : '電力を満タンにしました。');
      if (event.code === 'KeyM') callMeeting();
      if (event.code === 'KeyR') investigatePlayer();
      if (event.code === 'KeyT') disguiseAsPlayer();
      if (event.code === 'KeyG') placeChefMeal();
    }
  }, { passive: false });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    resetCharacterDrag();
  });

  elements.gameCanvas.addEventListener('pointerdown', startCharacterDrag);
  elements.gameCanvas.addEventListener('pointermove', updateCharacterDrag);
  elements.gameCanvas.addEventListener('pointerup', resetCharacterDrag);
  elements.gameCanvas.addEventListener('pointercancel', resetCharacterDrag);
  elements.gameCanvas.addEventListener('lostpointercapture', resetCharacterDrag);

  elements.joystick.addEventListener('pointerdown', (event) => {
    joystickPointerId = event.pointerId;
    elements.joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
    event.preventDefault();
  });
  elements.joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointerId) return;
    updateJoystick(event);
    sendInput();
    event.preventDefault();
  });
  elements.joystick.addEventListener('pointerup', (event) => {
    if (event.pointerId === joystickPointerId) resetJoystickKnob();
  });
  elements.joystick.addEventListener('pointercancel', resetJoystickKnob);

  elements.roomCodeInput.value = state.roomCode;
  elements.nameInput.value = state.playerName;
  if (state.roomCode) roomInspectTimer = setInterval(inspectRoom, 1800);
  if (state.isHost && !state.roomCode) {
    elements.createRoomButton.scrollIntoView({ block: 'nearest' });
  }

  buildCharacterGrids();
  setInterval(sendInput, 50);
  renderFrame();

  window.addEventListener('beforeunload', () => {
    if (roomInspectTimer) clearInterval(roomInspectTimer);
  });
})();
