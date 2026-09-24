(function (global) {
  'use strict';

  const WORLD = Object.freeze({ width: 1920, height: 1080 });
  const PLAYER_RADIUS = 29;
  const PLAYER_SPEED = 245;
  const MAX_PLAYERS = 11;
  const CHARACTER_COUNT = 12;
  const MIN_PLAYERS = 1;
  const RECONNECT_MS = 30000;
  const STEAL_DISTANCE = 118;
  const INITIAL_STEAL_LOCK_MS = 30000;
  const STEAL_COOLDOWN_MS = 12000;
  const VENT_DISTANCE = 120;
  const VENT_COOLDOWN_MS = 2500;
  const BLACKOUT_COOLDOWN_MS = 40000;
  const HUNGER_STEP_DISTANCE = 90;
  const HUNGER_PER_STEP = 2;
  const HUNGRY_SPEED_MULTIPLIER = 0.55;
  const INTERACTION_DISTANCE = 150;
  const SPECIAL_ROLE_MIN_PLAYERS = 4;
  const CHEF_ROLE_MIN_PLAYERS = 5;
  const SPECIAL_ACTION_DISTANCE = 175;
  const DISGUISE_DURATION_MS = 20000;
  const FOOD_COOLDOWN_MS = 3000;
  const GNAW_COOLDOWN_MS = 2000;
  const WHEEL_COOLDOWN_MS = 1000;
  const WHEEL_EMPTY_MS = 60000;
  const TEST_WHEEL_EMPTY_MS = 20000;
  const MEETING_DURATION_MS = 30000;
  const TEST_MEETING_DURATION_MS = 12000;
  const MEETING_COOLDOWN_MS = 20000;
  const TESTIMONY_ZONES = Object.freeze(['upper-left', 'upper-right', 'center', 'lower-left', 'lower-right']);
  const EXPULSION_DURATION_MS = 4300;
  const DOOR_MIN_X = 835;
  const DOOR_MAX_X = 1085;
  const NPC_SIGHT_DISTANCE = 245;
  const NPC_GRID_STEP = 80;

  const FOOD_SPOTS = Object.freeze([
    Object.freeze({ id: 'bedroom-meal-1', areaId: 'bedroom', x: 390, y: 245, label: '寝床の朝ご飯' }),
    Object.freeze({ id: 'bedroom-meal-2', areaId: 'bedroom', x: 1530, y: 245, label: '寝床のお弁当' }),
    Object.freeze({ id: 'bedroom-meal-3', areaId: 'bedroom', x: 390, y: 865, label: '寝床のおにぎり' }),
    Object.freeze({ id: 'bedroom-meal-4', areaId: 'bedroom', x: 1530, y: 865, label: '寝床の定食' }),
    Object.freeze({ id: 'meal-1', areaId: 'dining', x: 752, y: 588, label: '左上の定食' }),
    Object.freeze({ id: 'meal-2', areaId: 'dining', x: 1352, y: 590, label: '右上の定食' }),
    Object.freeze({ id: 'meal-3', areaId: 'dining', x: 685, y: 805, label: '左下の定食' }),
    Object.freeze({ id: 'meal-4', areaId: 'dining', x: 1397, y: 805, label: '右下の定食' }),
    Object.freeze({ id: 'cloud-meal-1', areaId: 'cloud', x: 960, y: 230, label: '雲庭の朝ご飯' }),
    Object.freeze({ id: 'cloud-meal-2', areaId: 'cloud', x: 520, y: 520, label: '雲庭のお弁当' }),
    Object.freeze({ id: 'cloud-meal-3', areaId: 'cloud', x: 1400, y: 520, label: '雲庭のおにぎり' }),
    Object.freeze({ id: 'cloud-meal-4', areaId: 'cloud', x: 960, y: 820, label: '雲庭の定食' })
  ]);
  const LOG_STATION = Object.freeze({ id: 'gnaw-log', areaId: 'dining', x: 620, y: 350, label: 'かじれる丸太' });
  const WHEEL_STATION = Object.freeze({ id: 'power-wheel', areaId: 'dining', x: 1720, y: 830, label: '回し車' });

  const AREA_CONFIGS = Object.freeze({
    bedroom: Object.freeze({
      id: 'bedroom', label: 'ふかふか寝床', image: './assets/maps/bedroom.webp',
      obstacles: Object.freeze([
        { id: 'pillow-pile', label: '枕の山', type: 'rect', x: 675, y: 285, width: 590, height: 505 }
      ])
    }),
    dining: Object.freeze({
      id: 'dining', label: '丸太食堂', image: './assets/maps/dining.webp',
      obstacles: Object.freeze([
        { id: 'log', label: '丸太', type: 'capsule', ax: 250, ay: 690, bx: 695, by: 190, radius: 112 },
        { id: 'counter', label: 'カウンター', type: 'rect', x: 1030, y: 170, width: 685, height: 275 },
        { id: 'table-1', label: 'テーブル', type: 'rect', x: 650, y: 515, width: 205, height: 145 },
        { id: 'table-2', label: 'テーブル', type: 'rect', x: 1250, y: 520, width: 205, height: 140 },
        { id: 'table-3', label: 'テーブル', type: 'rect', x: 575, y: 730, width: 220, height: 145 },
        { id: 'table-4', label: 'テーブル', type: 'rect', x: 1290, y: 735, width: 215, height: 145 }
      ])
    }),
    cloud: Object.freeze({
      id: 'cloud', label: '天空の雲庭', image: './assets/maps/cloud-garden.webp',
      obstacles: Object.freeze([
        { id: 'cloud-center', label: '中央の雲山', type: 'capsule', ax: 800, ay: 520, bx: 1120, by: 520, radius: 180 },
        { id: 'cloud-upper-left', label: '雲の花壇', type: 'circle', x: 305, y: 285, radius: 100 },
        { id: 'cloud-upper-mid-left', label: '雲の花壇', type: 'circle', x: 615, y: 165, radius: 95 },
        { id: 'cloud-upper-mid-right', label: '雲の花壇', type: 'circle', x: 1305, y: 165, radius: 95 },
        { id: 'cloud-upper-right', label: '雲の花壇', type: 'circle', x: 1615, y: 285, radius: 100 },
        { id: 'cloud-middle-left', label: '雲の花壇', type: 'circle', x: 335, y: 550, radius: 85 },
        { id: 'cloud-middle-right', label: '雲の花壇', type: 'circle', x: 1585, y: 550, radius: 85 },
        { id: 'cloud-lower-left', label: '雲の花壇', type: 'circle', x: 320, y: 805, radius: 100 },
        { id: 'cloud-lower-mid-left', label: '雲の花壇', type: 'circle', x: 615, y: 875, radius: 90 },
        { id: 'cloud-lower-mid-right', label: '雲の花壇', type: 'circle', x: 1305, y: 875, radius: 90 },
        { id: 'cloud-lower-right', label: '雲の花壇', type: 'circle', x: 1600, y: 805, radius: 100 },
        { id: 'cloud-sky-top-left', label: '空', type: 'circle', x: 0, y: 0, radius: 170 },
        { id: 'cloud-sky-top-right', label: '空', type: 'circle', x: 1920, y: 0, radius: 170 },
        { id: 'cloud-sky-bottom-left', label: '空', type: 'circle', x: 0, y: 1080, radius: 170 },
        { id: 'cloud-sky-bottom-right', label: '空', type: 'circle', x: 1920, y: 1080, radius: 170 }
      ])
    })
  });

  const AREA_TRANSITIONS = Object.freeze({
    bedroom: Object.freeze({ top: 'cloud', bottom: 'dining' }),
    dining: Object.freeze({ top: 'bedroom', bottom: 'cloud' }),
    cloud: Object.freeze({ top: 'dining', bottom: 'bedroom' })
  });

  const VENTS = Object.freeze([
    { id: 'bedroom-top', areaId: 'bedroom', x: 960, y: 84, pairId: 'bedroom-bottom', label: '花柄マット' },
    { id: 'bedroom-bottom', areaId: 'bedroom', x: 960, y: 995, pairId: 'bedroom-top', label: '花柄マット' },
    { id: 'dining-top', areaId: 'dining', x: 960, y: 120, pairId: 'dining-bottom', label: '葉っぱ柄マット' },
    { id: 'dining-bottom', areaId: 'dining', x: 960, y: 955, pairId: 'dining-top', label: '葉っぱ柄マット' },
    { id: 'dining-left', areaId: 'dining', x: 125, y: 540, pairId: 'dining-right', label: '葉っぱ柄マット' },
    { id: 'dining-right', areaId: 'dining', x: 1795, y: 540, pairId: 'dining-left', label: '葉っぱ柄マット' }
  ]);

  function randomInt(max) {
    const limit = Math.max(1, Math.floor(max));
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      const values = new Uint32Array(1);
      global.crypto.getRandomValues(values);
      return values[0] % limit;
    }
    return Math.floor(Math.random() * limit);
  }

  function makeToken(bytes = 18) {
    const values = new Uint8Array(bytes);
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') global.crypto.getRandomValues(values);
    else for (let index = 0; index < values.length; index += 1) values[index] = randomInt(256);
    return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
  }

  function cleanRoomCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  }

  function cleanName(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 12);
  }

  function publicPlayer(player) {
    return {
      id: player.id, name: player.name, characterId: player.characterId,
      ready: player.ready, connected: player.connected, isHost: player.isHost,
      isNpc: Boolean(player.isNpc)
    };
  }

  function publicLobby(room) {
    const players = Array.from(room.players.values()).map(publicPlayer);
    return {
      code: room.code, phase: room.phase, players,
      playerCount: players.length, maxPlayers: MAX_PLAYERS,
      characterCount: CHARACTER_COUNT, minPlayers: MIN_PLAYERS,
      takenCharacters: players.map((player) => player.characterId),
      normalStartAvailable: room.phase === 'lobby' && players.length >= MIN_PLAYERS
        && players.some((player) => !player.isNpc)
        && players.every((player) => player.ready && player.connected)
    };
  }

  function eligibleMeetingPlayers(room) {
    return Array.from(room.players.values()).filter((player) => (
      player.hasNut && !player.ghost && !player.expelled
    ));
  }

  function publicMeeting(room) {
    const meeting = room.meeting;
    if (!meeting || !meeting.active) return null;
    const participants = meeting.eligibleIds
      .map((id) => room.players.get(id))
      .filter(Boolean)
      .map((player) => ({
        id: player.id,
        name: player.name,
        characterId: player.characterId,
        connected: player.connected
      }));
    const caller = room.players.get(meeting.callerId);
    return {
      active: true,
      callerId: meeting.callerId,
      callerName: caller ? caller.name : '参加者',
      endsAt: meeting.endsAt,
      participants,
      testimonies: participants.map((participant) => {
        const claim = meeting.testimonies.get(participant.id);
        return claim ? { playerId: participant.id, ...claim } : null;
      }).filter(Boolean),
      votedPlayerIds: Array.from(meeting.votes.keys()),
      voteCount: meeting.votes.size,
      totalVoters: meeting.eligibleIds.filter((id) => { const p = room.players.get(id); return p && p.connected; }).length,
      paused: Boolean(meeting.paused),
      remainingMs: Math.max(0, Number(meeting.remainingMs) || (meeting.endsAt - Date.now()))
    };
  }

  function publicAreas() {
    return Object.fromEntries(Object.values(AREA_CONFIGS).map((area) => [area.id, {
      id: area.id, label: area.label, image: area.image, obstacles: area.obstacles
    }]));
  }

  function chooseFoodSpot(areaId, previousId = '') {
    const choices = FOOD_SPOTS.filter((spot) => spot.areaId === areaId && spot.id !== previousId);
    return choices[randomInt(choices.length)];
  }

  function chooseFoodSpots(previousSpots = []) {
    return Object.keys(AREA_CONFIGS).map((areaId) => {
      const previous = previousSpots.find((spot) => spot.areaId === areaId);
      return chooseFoodSpot(areaId, previous?.id || '');
    });
  }

  function publicSystems(room) {
    const regularFoodSpots = Object.keys(AREA_CONFIGS).map((areaId) => (
      room.foodSpots?.find((spot) => spot.areaId === areaId)
      || FOOD_SPOTS.find((spot) => spot.areaId === areaId)
    ));
    const foodSpots = [...regularFoodSpots, room.chefMeal].filter(Boolean);
    return {
      foodSpot: regularFoodSpots[0],
      foodSpots,
      log: LOG_STATION,
      wheel: {
        ...WHEEL_STATION,
        charge: Math.max(0, Math.min(100, Math.round((room.wheelCharge || 0) * 10) / 10)),
        emptyAfterMs: room.wheelEmptyMs || (room.testMode ? TEST_WHEEL_EMPTY_MS : WHEEL_EMPTY_MS)
      }
    };
  }

  function publicGameConfig(room) {
    return {
      testMode: Boolean(room.testMode), world: WORLD, areas: publicAreas(), vents: VENTS,
      culpritCount: room.culpritCount || 0, systems: publicSystems(room),
      meeting: room.meeting && room.meeting.active ? publicMeeting(room) : null,
      meetingResolution: room.meetingResolution || null,
      meetingReadyAt: room.meetingReadyAt || 0,
      gameResult: room.gameResult || null,
      connectionPause: {
        paused: room.phase === 'playing' && Boolean(room.paused),
        playerName: room.pausePlayerName || '',
        seconds: (room.reconnectMs || RECONNECT_MS) / 1000
      },
      blackout: {
        active: Boolean(room.blackoutActive), endsAt: 0,
        reason: room.blackoutReason || null, temporaryAutoRestore: false
      }
    };
  }

  function privatePlayerState(player) {
    return {
      role: player.role || null, hasNut: player.hasNut !== false, ghost: Boolean(player.ghost),
      expelled: Boolean(player.expelled),
      specialRole: player.specialRole || null,
      investigateUsed: Boolean(player.investigateUsed),
      investigationResult: player.investigationResult || null,
      disguiseUsed: Boolean(player.disguiseUsed),
      disguiseUntil: player.disguiseUntil || 0,
      disguiseTargetName: player.disguiseTargetName || '',
      chefMealUsed: Boolean(player.chefMealUsed),
      hunger: Math.max(0, Math.min(100, Number(player.hunger) || 0)),
      digestionReady: Boolean(player.digestionReady),
      cooldowns: {
        stealReadyAt: player.stealReadyAt || 0, stealStartReadyAt: player.stealStartReadyAt || 0,
        ventReadyAt: player.ventReadyAt || 0,
        blackoutReadyAt: player.blackoutReadyAt || 0, eatReadyAt: player.eatReadyAt || 0,
        gnawReadyAt: player.gnawReadyAt || 0, wheelReadyAt: player.wheelReadyAt || 0
      }
    };
  }

  function circleHitsRect(x, y, radius, rect) {
    const nearestX = Math.max(rect.x, Math.min(x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(y, rect.y + rect.height));
    const dx = x - nearestX;
    const dy = y - nearestY;
    return dx * dx + dy * dy < radius * radius;
  }

  function pointToSegmentDistanceSquared(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSquared = abx * abx + aby * aby;
    if (lengthSquared === 0) return (px - ax) ** 2 + (py - ay) ** 2;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
    const nearestX = ax + abx * t;
    const nearestY = ay + aby * t;
    return (px - nearestX) ** 2 + (py - nearestY) ** 2;
  }

  function collides(x, y, areaId = 'bedroom') {
    if (x - PLAYER_RADIUS < 0 || y - PLAYER_RADIUS < 0 || x + PLAYER_RADIUS > WORLD.width || y + PLAYER_RADIUS > WORLD.height) return true;
    const area = AREA_CONFIGS[areaId] || AREA_CONFIGS.bedroom;
    return area.obstacles.some((obstacle) => {
      if (obstacle.type === 'rect') return circleHitsRect(x, y, PLAYER_RADIUS, obstacle);
      if (obstacle.type === 'circle') {
        return Math.hypot(x - obstacle.x, y - obstacle.y) < PLAYER_RADIUS + obstacle.radius;
      }
      const combined = PLAYER_RADIUS + obstacle.radius;
      return pointToSegmentDistanceSquared(x, y, obstacle.ax, obstacle.ay, obstacle.bx, obstacle.by) < combined ** 2;
    });
  }

  function tryAreaTransition(player, nextY) {
    if (player.x < DOOR_MIN_X || player.x > DOOR_MAX_X) return false;
    const transitions = AREA_TRANSITIONS[player.areaId] || AREA_TRANSITIONS.bedroom;
    if (nextY - PLAYER_RADIUS < 0) {
      player.areaId = transitions.top;
      player.y = WORLD.height - PLAYER_RADIUS - 12;
      return true;
    }
    if (nextY + PLAYER_RADIUS > WORLD.height) {
      player.areaId = transitions.bottom;
      player.y = PLAYER_RADIUS + 12;
      return true;
    }
    return false;
  }

  function movePlayer(player, dt) {
    const input = player.input || { x: 0, y: 0 };
    const magnitude = Math.hypot(input.x, input.y);
    const normalized = magnitude > 1 ? { x: input.x / magnitude, y: input.y / magnitude } : input;
    const smoothing = Math.min(1, dt * 11);
    const previousX = player.x;
    const previousY = player.y;
    const previousArea = player.areaId;
    const speed = PLAYER_SPEED * ((Number(player.hunger) || 0) >= 100 ? HUNGRY_SPEED_MULTIPLIER : 1);
    player.vx += (normalized.x * speed - player.vx) * smoothing;
    player.vy += (normalized.y * speed - player.vy) * smoothing;
    const nextX = player.x + player.vx * dt;
    if (!collides(nextX, player.y, player.areaId)) player.x = nextX;
    else player.vx = 0;
    const nextY = player.y + player.vy * dt;
    const transitioned = tryAreaTransition(player, nextY);
    if (!transitioned) {
      if (!collides(player.x, nextY, player.areaId)) player.y = nextY;
      else player.vy = 0;
    }
    if (!player.ghost && player.areaId === previousArea) {
      player.hungerDistance = (Number(player.hungerDistance) || 0) + Math.hypot(player.x - previousX, player.y - previousY);
      const steps = Math.floor(player.hungerDistance / HUNGER_STEP_DISTANCE);
      if (steps > 0) {
        player.hungerDistance -= steps * HUNGER_STEP_DISTANCE;
        player.hunger = Math.min(100, (Number(player.hunger) || 0) + steps * HUNGER_PER_STEP);
      }
    }
  }

  function isNearInteraction(player, target, distance = INTERACTION_DISTANCE) {
    return Boolean(player && target && player.areaId === target.areaId
      && Math.hypot(player.x - target.x, player.y - target.y) <= distance);
  }

  function testimonyZone(x, y) {
    if (x >= 670 && x <= 1250 && y >= 300 && y <= 780) return 'center';
    return `${y < WORLD.height / 2 ? 'upper' : 'lower'}-${x < WORLD.width / 2 ? 'left' : 'right'}`;
  }

  function locationKey(player) {
    return `${player.areaId}:${testimonyZone(player.x, player.y)}`;
  }

  function npcMemory() {
    return { dwell: new Map(), sightings: new Map(), goal: null, route: [], routeKey: '',
      routeArea: '', routeAt: 0, nextThinkAt: 0, nextRoamAt: 0, detectiveSuspectId: '' };
  }

  // All movement still goes through movePlayer; these waypoints only set the usual joystick input.
  function npcLineClear(areaId, start, end) {
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    for (let step = 0; step <= Math.ceil(length / 20); step += 1) {
      const fraction = step / Math.max(1, Math.ceil(length / 20));
      if (collides(start.x + (end.x - start.x) * fraction,
        start.y + (end.y - start.y) * fraction, areaId)) return false;
    }
    return true;
  }

  const NPC_GRID = Object.fromEntries(Object.keys(AREA_CONFIGS).map((areaId) => {
    const nodes = new Map();
    for (let row = 0; row <= 12; row += 1) {
      for (let col = 0; col <= 23; col += 1) {
        const node = { x: 40 + col * NPC_GRID_STEP, y: 40 + row * NPC_GRID_STEP, col, row };
        if (!collides(node.x, node.y, areaId)) nodes.set(`${col},${row}`, node);
      }
    }
    return [areaId, nodes];
  }));

  function npcRoute(player, destination, reach = 65) {
    const nodes = NPC_GRID[player.areaId];
    if (!nodes) return [];
    const candidates = [];
    if (!collides(destination.x, destination.y, player.areaId)) candidates.push(destination);
    // Meals and the gnawable log can sit on blocked artwork. Search walkable points
    // inside the same interaction radius instead of aiming into the obstacle.
    if (reach > 65) {
      for (const radius of [Math.min(reach, 135), Math.max(45, Math.min(reach - 20, 90))]) {
        for (let direction = 0; direction < 24; direction += 1) {
          const angle = direction * Math.PI / 12;
          const point = { x: destination.x + Math.cos(angle) * radius,
            y: destination.y + Math.sin(angle) * radius };
          if (!collides(point.x, point.y, player.areaId)) candidates.push(point);
        }
      }
    }
    const directlyReachable = candidates.filter((point) => npcLineClear(player.areaId, player, point))
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y)
        - Math.hypot(b.x - player.x, b.y - player.y))[0];
    if (directlyReachable) return [directlyReachable];
    const starts = [...nodes.values()]
      .filter((node) => Math.hypot(node.x - player.x, node.y - player.y) <= 165
        && npcLineClear(player.areaId, player, node))
      .sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y)
        - Math.hypot(b.x - player.x, b.y - player.y)).slice(0, 8);
    if (!starts.length) return [];
    const goals = new Map();
    for (const node of nodes.values()) {
      const anchor = candidates.filter((point) => Math.hypot(node.x - point.x, node.y - point.y) <= 140
        && npcLineClear(player.areaId, node, point))
        .sort((a, b) => Math.hypot(node.x - a.x, node.y - a.y)
          - Math.hypot(node.x - b.x, node.y - b.y))[0];
      if (anchor) goals.set(`${node.col},${node.row}`, anchor);
    }
    if (!goals.size) return [];
    const open = new Set();
    const cost = new Map();
    const previous = new Map();
    for (const node of starts) {
      const key = `${node.col},${node.row}`;
      open.add(key);
      cost.set(key, Math.hypot(node.x - player.x, node.y - player.y));
    }
    const estimate = (node) => Math.max(0, Math.hypot(node.x - destination.x, node.y - destination.y) - reach);
    while (open.size) {
      let current = null;
      for (const key of open) {
        if (current === null || cost.get(key) + estimate(nodes.get(key))
          < cost.get(current) + estimate(nodes.get(current))) current = key;
      }
      open.delete(current);
      if (goals.has(current)) {
        const result = [];
        for (let key = current; key; key = previous.get(key)) result.unshift(nodes.get(key));
        result.push(goals.get(current));
        return result;
      }
      const node = nodes.get(current);
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
        if (!dx && !dy) continue;
        const key = `${node.col + dx},${node.row + dy}`;
        const next = nodes.get(key);
        if (!next || !npcLineClear(player.areaId, node, next)) continue;
        const nextCost = cost.get(current) + Math.hypot(dx, dy) * NPC_GRID_STEP;
        if (nextCost >= (cost.get(key) ?? Infinity)) continue;
        previous.set(key, current);
        cost.set(key, nextCost);
        open.add(key);
      }
    }
    return [];
  }

  function nearestActivePlayer(room, player, distance = SPECIAL_ACTION_DISTANCE) {
    if (!room || !player) return null;
    const nearest = Array.from(room.players.values())
      .filter((item) => item.id !== player.id && !item.ghost
        && !item.expelled && item.areaId === player.areaId)
      .map((item) => ({ item, distance: Math.hypot(item.x - player.x, item.y - player.y) }))
      .filter((entry) => entry.distance <= distance)
      .sort((a, b) => a.distance - b.distance)[0];
    return nearest ? nearest.item : null;
  }

  function hungerAfterMeal(hunger, digestionReady) {
    const current = Math.max(0, Math.min(100, Number(hunger) || 0));
    return digestionReady ? 0 : Math.ceil(current / 2);
  }

  function culpritCountForPlayers(playerCount) {
    if (playerCount <= 0) return 0;
    return Math.max(1, Math.floor(playerCount / 5));
  }

  function investigationLevelForPlayer(player) {
    if (player && player.specialRole === 'jester') return { level: 'medium', label: '中', score: 2 };
    if (player && player.role === 'culprit') return { level: 'high', label: '高', score: 3 };
    return { level: 'low', label: '低', score: 1 };
  }

  function displayedIdentity(player, now = Date.now()) {
    const disguised = Boolean(player && player.specialRole === 'jester'
      && player.disguiseTargetName && player.disguiseTargetCharacterId
      && now < (player.disguiseUntil || 0));
    return {
      name: disguised ? player.disguiseTargetName : player.name,
      characterId: disguised ? player.disguiseTargetCharacterId : player.characterId,
      disguised
    };
  }

  function shuffled(items) {
    const result = Array.from(items);
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = randomInt(index + 1);
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function assignRoles(room) {
    const players = Array.from(room.players.values());
    room.culpritCount = culpritCountForPlayers(players.length);
    const order = shuffled(players);
    if (room.testMode) {
      const hostIndex = order.findIndex((player) => player.isHost);
      if (hostIndex > 0) [order[0], order[hostIndex]] = [order[hostIndex], order[0]];
    }
    const culprits = new Set(order.slice(0, room.culpritCount).map((player) => player.id));
    for (const player of players) {
      player.role = culprits.has(player.id) ? 'culprit' : 'character';
      player.specialRole = null;
      player.investigateUsed = false;
      player.investigationResult = null;
      player.disguiseUsed = false;
      player.disguiseUntil = 0;
      player.disguiseTargetName = '';
      player.disguiseTargetCharacterId = 0;
      player.chefMealUsed = false;
      player.hasNut = true;
      player.ghost = false;
      player.expelled = false;
      player.stealStartReadyAt = player.role === 'culprit' ? room.stealUnlockAt : 0;
      player.stealReadyAt = player.stealStartReadyAt;
      player.ventReadyAt = 0;
      player.blackoutReadyAt = 0;
      player.eatReadyAt = 0;
      player.gnawReadyAt = 0;
      player.wheelReadyAt = 0;
      player.hunger = 0;
      player.hungerDistance = 0;
      player.digestionReady = false;
    }
    if (players.length >= SPECIAL_ROLE_MIN_PLAYERS) {
      const jester = order.find((player) => player.role === 'culprit');
      const detective = order.find((player) => player.role === 'character');
      if (jester) jester.specialRole = 'jester';
      if (detective) detective.specialRole = 'detective';
    }
    if (players.length >= CHEF_ROLE_MIN_PLAYERS) {
      const chef = order.find((player) => player.role === 'character' && player.specialRole !== 'detective');
      if (chef) chef.specialRole = 'chef';
    }
  }

  function spawnPlayers(room) {
    const positions = [
      [960, 175], [780, 175], [1140, 175], [520, 500], [1400, 500], [500, 790],
      [1420, 790], [820, 920], [1100, 920], [340, 540], [1580, 540]
    ];
    let index = 0;
    for (const player of room.players.values()) {
      const position = positions[index++] || [960, 175];
      Object.assign(player, {
        areaId: 'bedroom', x: position[0], y: position[1], vx: 0, vy: 0,
        input: { x: 0, y: 0 }, hunger: 0, hungerDistance: 0,
        digestionReady: false, eatReadyAt: 0, gnawReadyAt: 0, wheelReadyAt: 0
      });
      if (player.isNpc) player.npc = npcMemory();
    }
  }

  function resetPlayerForLobby(player) {
    Object.assign(player, {
      ready: Boolean(player.isNpc), input: { x: 0, y: 0 }, vx: 0, vy: 0,
      role: null, specialRole: null, investigateUsed: false, investigationResult: null,
      disguiseUsed: false, disguiseUntil: 0, disguiseTargetName: '', disguiseTargetCharacterId: 0,
      chefMealUsed: false,
      hasNut: true, ghost: false, expelled: false, hunger: 0, hungerDistance: 0,
      digestionReady: false, stealReadyAt: 0, stealStartReadyAt: 0, ventReadyAt: 0,
      blackoutReadyAt: 0, eatReadyAt: 0, gnawReadyAt: 0, wheelReadyAt: 0
    });
    if (player.isNpc) player.npc = npcMemory();
  }

  class HostGameEngine {
    constructor(options = {}) {
      this.rooms = new Map();
      this.connections = new Map();
      this.deliver = typeof options.deliver === 'function' ? options.deliver : () => {};
      this.joinBase = typeof options.joinBase === 'function' ? options.joinBase : () => 'http://localhost:32145';
      this.normalWheelEmptyMs = Math.max(250, Number(options.wheelEmptyMs) || WHEEL_EMPTY_MS);
      this.testWheelEmptyMs = Math.max(250, Number(options.testWheelEmptyMs) || TEST_WHEEL_EMPTY_MS);
      this.reconnectMs = Math.max(1000, Number(options.reconnectMs) || RECONNECT_MS);
      this.meetingDurationMs = Math.max(10, Number(options.meetingDurationMs) || MEETING_DURATION_MS);
      this.testMeetingDurationMs = Math.max(10, Number(options.testMeetingDurationMs) || TEST_MEETING_DURATION_MS);
      this.meetingCooldownMs = Math.max(0, Number(options.meetingCooldownMs) || MEETING_COOLDOWN_MS);
      this.expulsionDurationMs = Math.max(10, Number(options.expulsionDurationMs) || EXPULSION_DURATION_MS);
      this.noExpulsionDurationMs = Math.max(10, Number(options.noExpulsionDurationMs) || 1600);
      this.lastTick = Date.now();
      this.snapshotCounter = 0;
      this.tickTimer = setInterval(() => this.tick(), 1000 / 30);
      if (this.tickTimer && typeof this.tickTimer.unref === 'function') this.tickTimer.unref();
    }

    connect(connectionId) {
      const id = String(connectionId || '');
      if (!id) return;
      if (!this.connections.has(id)) this.connections.set(id, { id, roomCode: '', playerId: '', sessionToken: '' });
    }

    disconnect(connectionId) {
      const connection = this.connections.get(String(connectionId || ''));
      if (!connection) return;
      const room = connection.roomCode ? this.rooms.get(connection.roomCode) : null;
      const player = room && connection.playerId ? room.players.get(connection.playerId) : null;
      this.connections.delete(connection.id);
      if (!room) return;
      if (!player) {
        if (room.hostConnectionId === connection.id && room.players.size === 0) {
          const timer = setTimeout(() => {
            const latest = this.rooms.get(room.code);
            if (latest && latest.hostConnectionId === connection.id && latest.players.size === 0) this.rooms.delete(room.code);
          }, this.reconnectMs);
          if (timer && typeof timer.unref === 'function') timer.unref();
        }
        return;
      }
      player.connected = false;
      player.input = { x: 0, y: 0 };
      player.vx = 0;
      player.vy = 0;
      if (room.phase === 'playing') {
        if (this.hasOnlineHuman(room)) {
          // v2: NPC以外の誰かが接続中なら試合を止めない。切断した人のキャラクターはその場に残る。
          this.broadcastRoom(room, 'playerConnection', { playerName: player.name, online: false });
          this.completeMeetingIfAllVoted(room);
          this.emitLobby(room);
          return;
        }
        room.paused = true;
        room.pausePlayerName = player.name;
        this.pauseMeetingTimer(room);
        this.broadcastRoom(room, 'connectionPause', { paused: true, playerName: player.name, seconds: this.reconnectMs / 1000 });
      }
      this.emitLobby(room);
      this.clearDisconnectTimer(player);
      player.disconnectTimer = setTimeout(() => {
        if (player.connected) return;
        if (room.phase === 'playing') {
          if (this.hasOnlineHuman(room)) return; // ほかの人が戻っていれば続行中
          this.abortMatch(room, `${player.name}が戻らなかったため、試合を勝敗なしで終了しました。`);
        }
        room.players.delete(player.id);
        this.emitLobby(room);
      }, this.reconnectMs);
      if (player.disconnectTimer && typeof player.disconnectTimer.unref === 'function') player.disconnectTimer.unref();
    }

    stop() {
      clearInterval(this.tickTimer);
      for (const room of this.rooms.values()) {
        this.clearMeetingTimers(room);
        for (const player of room.players.values()) this.clearDisconnectTimer(player);
      }
      this.rooms.clear();
      this.connections.clear();
    }

    async dispatch(connectionId, eventName, payload = {}) {
      const id = String(connectionId || '');
      this.connect(id);
      const connection = this.connections.get(id);
      const handlers = {
        createRoom: this.createRoom,
        resumeHost: this.resumeHost,
        inspectRoom: this.inspectRoom,
        joinRoom: this.joinRoom,
        addNpc: this.addNpc,
        removeNpc: this.removeNpc,
        changeCharacter: this.changeCharacter,
        setReady: this.setReady,
        startGame: this.startGame,
        playerInput: this.playerInput,
        eatFood: this.eatFood,
        placeChefMeal: this.placeChefMeal,
        gnawLog: this.gnawLog,
        spinWheel: this.spinWheel,
        stealNut: this.stealNut,
        useVent: this.useVent,
        triggerBlackout: this.triggerBlackout,
        investigatePlayer: this.investigatePlayer,
        disguiseAsPlayer: this.disguiseAsPlayer,
        callMeeting: this.callMeeting,
        shareTestimony: this.shareTestimony,
        castVote: this.castVote,
        returnToLobby: this.returnToLobby
      };
      const handler = handlers[eventName];
      if (!handler) return { ok: false, error: '対応していない操作です。' };
      try {
        return await handler.call(this, connection, payload || {});
      } catch (error) {
        return { ok: false, error: '操作を処理できませんでした。', detail: String(error && error.message || error) };
      }
    }

    send(connectionId, eventName, payload) {
      if (!this.connections.has(connectionId)) return;
      this.deliver(connectionId, eventName, payload);
    }

    broadcastRoom(room, eventName, payload) {
      for (const connection of this.connections.values()) {
        if (connection.roomCode === room.code) this.send(connection.id, eventName, payload);
      }
    }

    getRoom(connection) {
      return connection && connection.roomCode ? this.rooms.get(connection.roomCode) : null;
    }

    isRoomHost(connection, room) {
      return Boolean(room && room.hostToken && connection && connection.sessionToken === room.hostToken);
    }

    makeRoomCode() {
      const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      do {
        code = Array.from({ length: 6 }, () => letters[randomInt(letters.length)]).join('');
      } while (this.rooms.has(code));
      return code;
    }

    getJoinUrls(code) {
      const base = String(this.joinBase() || 'http://localhost:32145').replace(/\/$/, '');
      const phoneReady = !/^https?:\/\/(localhost|127\.)/i.test(base);
      let address = base;
      try { address = new URL(base).hostname; } catch { /* 表示用だけなので、そのまま使います。 */ }
      return [{
        name: phoneReady ? 'インターネット経由（Wi-Fiが違ってもOK）' : 'このPCだけ（公開URLではありません）',
        address,
        url: `${base}/?room=${code}`,
        phoneReady
      }];
    }

    emitLobby(room) {
      this.broadcastRoom(room, 'lobbyState', publicLobby(room));
    }

    emitPrivateState(player) {
      if (player && player.connectionId) this.send(player.connectionId, 'privateState', privatePlayerState(player));
    }

    emitBlackoutState(room) {
      this.broadcastRoom(room, 'blackoutState', {
        active: Boolean(room.blackoutActive), endsAt: 0,
        reason: room.blackoutReason || null, temporaryAutoRestore: false
      });
    }

    emitSystemState(room) {
      this.broadcastRoom(room, 'systemState', publicSystems(room));
    }

    clearDisconnectTimer(player) {
      if (player && player.disconnectTimer) clearTimeout(player.disconnectTimer);
      if (player) player.disconnectTimer = null;
    }

    adoptPlayerConnection(player, connection) {
      if (!player || !connection) return;
      const previousConnectionId = player.connectionId;
      if (previousConnectionId && previousConnectionId !== connection.id) {
        this.connections.delete(previousConnectionId);
      }
      this.clearDisconnectTimer(player);
      player.connectionId = connection.id;
      player.connected = true;
      connection.playerId = player.id;
    }

    hasOnlineHuman(room) {
      return Boolean(room) && Array.from(room.players.values()).some((player) => !player.isNpc && player.connected);
    }

    onlineVoterCount(room) {
      const meeting = room && room.meeting;
      if (!meeting) return 0;
      return meeting.eligibleIds.map((id) => room.players.get(id))
        .filter((player) => player && player.connected && player.hasNut && !player.ghost && !player.expelled).length;
    }

    completeMeetingIfAllVoted(room) {
      const meeting = room && room.meeting;
      if (!meeting || !meeting.active || meeting.paused || room.paused) return;
      const voters = this.onlineVoterCount(room);
      if (voters > 0 && meeting.votes.size >= voters) this.resolveMeeting(room);
      else this.broadcastRoom(room, 'meetingState', publicMeeting(room));
    }

    scheduleOfflineRemoval(room) {
      // 試合中に切断したまま戻らなかった人は、ロビーに戻った後30秒で外す
      for (const player of room.players.values()) {
        if (player.isNpc || player.connected || player.disconnectTimer) continue;
        player.disconnectTimer = setTimeout(() => {
          player.disconnectTimer = null;
          if (player.connected || room.phase === 'playing') return;
          room.players.delete(player.id);
          this.emitLobby(room);
        }, this.reconnectMs);
        if (player.disconnectTimer && typeof player.disconnectTimer.unref === 'function') player.disconnectTimer.unref();
      }
    }

    resumeRoomIfReady(room) {
      if (!room || room.phase !== 'playing') return;
      if (this.hasOnlineHuman(room)) {
        if (!room.paused) {
          // 試合は続行中。戻ってきた人の画面の「待機中」表示を消す
          this.broadcastRoom(room, 'connectionPause', { paused: false });
          return;
        }
        room.paused = false;
        room.pausePlayerName = '';
        this.resumeMeetingTimer(room);
        this.broadcastRoom(room, 'connectionPause', { paused: false });
        return;
      }
      const waitingFor = Array.from(room.players.values()).find((player) => !player.connected);
      room.paused = true;
      room.pausePlayerName = waitingFor ? waitingFor.name : room.pausePlayerName;
      this.broadcastRoom(room, 'connectionPause', {
        paused: true,
        playerName: room.pausePlayerName,
        seconds: (room.reconnectMs || this.reconnectMs) / 1000
      });
    }

    allConnected(room) {
      return Array.from(room.players.values()).every((player) => player.connected);
    }

    gameplayPaused(room) {
      return Boolean(room && (room.paused || (room.meeting && room.meeting.active) || room.meetingResolving));
    }

    abortMatch(room, message) {
      this.clearMeetingTimers(room);
      room.phase = 'lobby';
      room.paused = false;
      room.pausePlayerName = '';
      room.testMode = false;
      room.culpritCount = 0;
      room.stealUnlockAt = 0;
      room.blackoutActive = false;
      room.blackoutReason = null;
      room.wheelCharge = 100;
      room.foodSpots = chooseFoodSpots(room.foodSpots);
      room.chefMeal = null;
      room.meeting = null;
      room.meetingResolution = null;
      room.meetingResolving = false;
      room.meetingReadyAt = 0;
      room.gameResult = null;
      for (const player of room.players.values()) resetPlayerForLobby(player);
      this.scheduleOfflineRemoval(room);
      this.broadcastRoom(room, 'matchAborted', { message });
      this.emitLobby(room);
    }

    visibleSnapshot(room, viewer, now) {
      const players = Array.from(room.players.values())
        .filter((player) => player.id === viewer.id || (!player.ghost && !player.expelled && player.areaId === viewer.areaId))
        .map((player) => {
          const identity = displayedIdentity(player, now);
          return {
            id: player.id, name: identity.name, characterId: identity.characterId,
            areaId: player.areaId, x: Math.round(player.x * 10) / 10,
            y: Math.round(player.y * 10) / 10, connected: player.connected,
            isSelf: player.id === viewer.id
          };
        });
      return {
        at: now, areaId: viewer.areaId, players,
        selfState: {
          hunger: Math.max(0, Math.min(100, Number(viewer.hunger) || 0)),
          digestionReady: Boolean(viewer.digestionReady)
        },
        systems: publicSystems(room),
        blackout: {
          active: Boolean(room.blackoutActive), endsAt: 0,
          reason: room.blackoutReason || null, temporaryAutoRestore: false
        },
        connectedPlayerCount: Array.from(room.players.values()).filter((player) => player.connected).length
      };
    }

    createRoom(connection, payload) {
      const sessionToken = String(payload.sessionToken || '').slice(0, 100) || makeToken();
      const code = this.makeRoomCode();
      const room = {
        code, hostToken: sessionToken, hostConnectionId: connection.id,
        players: new Map(), phase: 'lobby', paused: false, pausePlayerName: '',
        reconnectMs: this.reconnectMs, testMode: false,
        culpritCount: 0, stealUnlockAt: 0, blackoutActive: false, blackoutReason: null,
        wheelCharge: 100, wheelEmptyMs: this.normalWheelEmptyMs,
        foodSpots: chooseFoodSpots(), chefMeal: null, meeting: null, meetingResolution: null, meetingResolving: false,
        meetingReadyAt: 0, meetingTimer: null, meetingEndTimer: null,
        meetingEndRemainingMs: 0, meetingEndEndsAt: 0, pendingMeetingVictory: null,
        gameResult: null, createdAt: Date.now()
      };
      this.rooms.set(code, room);
      connection.roomCode = code;
      connection.sessionToken = sessionToken;
      const result = { ok: true, code, joinUrls: this.getJoinUrls(code), sessionToken };
      this.emitLobby(room);
      return result;
    }

    resumeHost(connection, payload) {
      const code = cleanRoomCode(payload.code);
      const sessionToken = String(payload.sessionToken || '').slice(0, 100);
      const room = this.rooms.get(code);
      if (!room || !sessionToken || room.hostToken !== sessionToken) return { ok: false, error: '親機の部屋を復元できませんでした。' };
      room.hostConnectionId = connection.id;
      connection.roomCode = code;
      connection.sessionToken = sessionToken;
      const player = Array.from(room.players.values()).find((item) => item.sessionToken === sessionToken);
      if (player) {
        this.adoptPlayerConnection(player, connection);
      }
      this.resumeRoomIfReady(room);
      const result = {
        ok: true, lobby: publicLobby(room), joinUrls: this.getJoinUrls(code),
        playerId: player ? player.id : null,
        game: room.phase !== 'lobby' ? publicGameConfig(room) : null,
        privateState: player && room.phase !== 'lobby' ? privatePlayerState(player) : null
      };
      this.emitLobby(room);
      return result;
    }

    inspectRoom(_connection, payload) {
      const room = this.rooms.get(cleanRoomCode(payload.code));
      if (!room) return { ok: false, error: 'その部屋は見つかりません。' };
      return { ok: true, lobby: publicLobby(room) };
    }

    joinRoom(connection, payload) {
      const code = cleanRoomCode(payload.code);
      const room = this.rooms.get(code);
      const name = cleanName(payload.name);
      const characterId = Number(payload.characterId);
      const requestedToken = String(payload.sessionToken || '').slice(0, 100);
      if (!room) return { ok: false, error: 'その部屋は見つかりません。' };
      if (!name) return { ok: false, error: '名前を入力してください。' };
      if (!Number.isInteger(characterId) || characterId < 1 || characterId > CHARACTER_COUNT) return { ok: false, error: 'キャラクターを選んでください。' };

      const returning = requestedToken
        ? Array.from(room.players.values()).find((player) => player.sessionToken === requestedToken)
        : null;
      if (returning) {
        if (Array.from(room.players.values()).some((player) => player.id !== returning.id && player.characterId === characterId)) {
          return { ok: false, error: 'そのキャラクターは使用中です。' };
        }
        this.adoptPlayerConnection(returning, connection);
        returning.name = name;
        if (room.phase === 'lobby') returning.characterId = characterId;
        connection.roomCode = code;
        connection.sessionToken = returning.sessionToken;
        this.resumeRoomIfReady(room);
        const result = {
          ok: true, playerId: returning.id, sessionToken: returning.sessionToken,
          phase: room.phase, isHost: this.isRoomHost(connection, room),
          world: WORLD, areas: publicAreas(), vents: VENTS,
          game: room.phase !== 'lobby' ? publicGameConfig(room) : null,
          privateState: room.phase !== 'lobby' ? privatePlayerState(returning) : null
        };
        this.emitLobby(room);
        return result;
      }

      if (room.phase !== 'lobby') return { ok: false, error: '試合はすでに始まっています。' };
      if (room.players.size >= MAX_PLAYERS) return { ok: false, error: '部屋は満員です。' };
      if (Array.from(room.players.values()).some((player) => player.name.toLowerCase() === name.toLowerCase())) return { ok: false, error: '同じ名前が使われています。' };
      if (Array.from(room.players.values()).some((player) => player.characterId === characterId)) return { ok: false, error: 'そのキャラクターは使用中です。' };

      const sessionToken = requestedToken || makeToken();
      const player = {
        id: makeToken(9), connectionId: connection.id, sessionToken, name, characterId,
        ready: false, connected: true, isHost: room.hostToken === sessionToken,
        areaId: 'bedroom', x: 960, y: 175, vx: 0, vy: 0, input: { x: 0, y: 0 },
        role: null, specialRole: null, investigateUsed: false, investigationResult: null,
        disguiseUsed: false, disguiseUntil: 0, disguiseTargetName: '', disguiseTargetCharacterId: 0,
        chefMealUsed: false,
        hasNut: true, ghost: false, expelled: false, hunger: 0, hungerDistance: 0,
        digestionReady: false, stealReadyAt: 0, ventReadyAt: 0,
        blackoutReadyAt: 0, eatReadyAt: 0, gnawReadyAt: 0,
        wheelReadyAt: 0, disconnectTimer: null
      };
      room.players.set(player.id, player);
      connection.playerId = player.id;
      connection.roomCode = code;
      connection.sessionToken = sessionToken;
      this.emitLobby(room);
      return {
        ok: true, playerId: player.id, sessionToken, phase: room.phase,
        isHost: player.isHost, world: WORLD, areas: publicAreas(), vents: VENTS
      };
    }

    addNpc(connection) {
      const room = this.getRoom(connection);
      if (!room || !this.isRoomHost(connection, room)) return { ok: false, error: '親機だけがNPCを追加できます。' };
      if (room.phase !== 'lobby') return { ok: false, error: 'NPCは待機部屋で追加してください。' };
      if (room.players.size >= MAX_PLAYERS) return { ok: false, error: '部屋は満員です。' };
      const taken = new Set([...room.players.values()].map((player) => player.characterId));
      const characterId = Array.from({ length: CHARACTER_COUNT }, (_, index) => index + 1)
        .find((id) => !taken.has(id));
      let number = 1;
      while ([...room.players.values()].some((player) => player.name.toLowerCase() === `npc ${number}`)) number += 1;
      const npc = {
        id: makeToken(9), connectionId: '', sessionToken: '', name: `NPC ${number}`, characterId,
        isNpc: true, isHost: false, ready: true, connected: true,
        areaId: 'bedroom', x: 960, y: 175, vx: 0, vy: 0, input: { x: 0, y: 0 },
        npc: npcMemory(), disconnectTimer: null
      };
      resetPlayerForLobby(npc);
      room.players.set(npc.id, npc);
      this.emitLobby(room);
      return { ok: true, playerId: npc.id };
    }

    removeNpc(connection, payload) {
      const room = this.getRoom(connection);
      if (!room || !this.isRoomHost(connection, room)) return { ok: false, error: '親機だけがNPCを削除できます。' };
      if (room.phase !== 'lobby') return { ok: false, error: 'NPCは待機部屋で削除してください。' };
      const player = room.players.get(String(payload.playerId || ''));
      if (!player?.isNpc) return { ok: false, error: 'NPCが見つかりません。' };
      room.players.delete(player.id);
      this.emitLobby(room);
      return { ok: true };
    }

    changeCharacter(connection, payload) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const characterId = Number(payload.characterId);
      if (!room || !player || room.phase !== 'lobby') return { ok: false, error: '今は変更できません。' };
      if (!Number.isInteger(characterId) || characterId < 1 || characterId > CHARACTER_COUNT) return { ok: false, error: 'キャラクターが正しくありません。' };
      if (Array.from(room.players.values()).some((item) => item.id !== player.id && item.characterId === characterId)) return { ok: false, error: 'そのキャラクターは使用中です。' };
      player.characterId = characterId;
      player.ready = false;
      this.emitLobby(room);
      return { ok: true };
    }

    setReady(connection, payload) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      if (!room || !player || room.phase !== 'lobby') return { ok: false, error: '今は準備状態を変更できません。' };
      player.ready = Boolean(payload.ready);
      this.emitLobby(room);
      return { ok: true, ready: player.ready };
    }

    startGame(connection, payload) {
      const room = this.getRoom(connection);
      if (!room || !this.isRoomHost(connection, room)) return { ok: false, error: '親機だけが開始できます。' };
      if (room.phase !== 'lobby') return { ok: false, error: 'すでに開始されています。' };
      const players = Array.from(room.players.values());
      const testMode = Boolean(payload.testMode);
      if (players.length < (testMode ? 1 : MIN_PLAYERS) || !players.some((player) => !player.isNpc)) {
        return { ok: false, error: '親機またはスマホの参加者が1人以上必要です。' };
      }
      if (!testMode && !players.every((player) => player.ready && player.connected)) return { ok: false, error: '全員が準備完了になるまで待ってください。' };
      room.phase = 'playing';
      room.paused = false;
      room.pausePlayerName = '';
      room.testMode = testMode;
      room.stealUnlockAt = Date.now() + INITIAL_STEAL_LOCK_MS;
      room.blackoutActive = false;
      room.blackoutReason = null;
      room.wheelCharge = 100;
      room.wheelEmptyMs = testMode ? this.testWheelEmptyMs : this.normalWheelEmptyMs;
      room.foodSpots = chooseFoodSpots(room.foodSpots);
      room.chefMeal = null;
      room.meeting = null;
      room.meetingResolution = null;
      room.meetingResolving = false;
      room.meetingReadyAt = 0;
      room.gameResult = null;
      assignRoles(room);
      spawnPlayers(room);
      this.broadcastRoom(room, 'gameStarted', publicGameConfig(room));
      for (const player of players) this.emitPrivateState(player);
      this.emitLobby(room);
      return { ok: true };
    }

    playerInput(connection, payload) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room) || !player.connected || player.expelled) return { ok: false };
      const x = Number(payload.x);
      const y = Number(payload.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return { ok: false };
      const magnitude = Math.hypot(x, y);
      player.input = magnitude > 1 ? { x: x / magnitude, y: y / magnitude } : { x, y };
      return { ok: true };
    }

    eatFood(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今はご飯を食べられません。' };
      if (player.ghost) return { ok: false, error: 'ナッツを失った後は、回し車だけを手伝えます。' };
      if (now < player.eatReadyAt) return { ok: false, error: '食事は準備中です。', readyAt: player.eatReadyAt };
      const meal = [...(room.foodSpots || []), room.chefMeal]
        .filter((item) => isNearInteraction(player, item))
        .map((item) => ({ item, distance: Math.hypot(item.x - player.x, item.y - player.y) }))
        .sort((a, b) => a.distance - b.distance)[0]?.item;
      if (!meal) return { ok: false, error: '光っている食事へ近づいてください。' };
      if ((Number(player.hunger) || 0) <= 0) return { ok: false, error: '空腹度はすでに0です。' };
      const usedGnaw = Boolean(player.digestionReady);
      player.hunger = hungerAfterMeal(player.hunger, usedGnaw);
      player.hungerDistance = 0;
      player.digestionReady = false;
      player.eatReadyAt = now + FOOD_COOLDOWN_MS;
      if (room.chefMeal && meal.id === room.chefMeal.id) {
        room.chefMeal = null;
      } else {
        const mealIndex = room.foodSpots.findIndex((spot) => spot.id === meal.id);
        if (mealIndex >= 0) room.foodSpots[mealIndex] = chooseFoodSpot(meal.areaId, meal.id);
      }
      this.emitPrivateState(player);
      this.emitSystemState(room);
      return { ok: true, hunger: player.hunger, fullAbsorption: usedGnaw, readyAt: player.eatReadyAt, systems: publicSystems(room) };
    }

    placeChefMeal(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) {
        return { ok: false, error: '今は食事を置けません。' };
      }
      if (player.specialRole !== 'chef') return { ok: false, error: '料理人だけが使える行動です。' };
      if (player.ghost || player.expelled) return { ok: false, error: '今は食事を置けません。' };
      if (player.chefMealUsed) return { ok: false, error: '食事を置けるのは1試合に1回だけです。' };
      player.chefMealUsed = true;
      room.chefMeal = {
        id: `chef-meal-${player.id}`,
        areaId: player.areaId,
        x: Math.round(player.x * 10) / 10,
        y: Math.round(player.y * 10) / 10,
        label: '料理人のご飯',
        chefMade: true
      };
      this.emitPrivateState(player);
      this.emitSystemState(room);
      return { ok: true, meal: room.chefMeal, systems: publicSystems(room) };
    }

    gnawLog(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今は丸太をかじれません。' };
      if (player.ghost) return { ok: false, error: 'ナッツを失った後は、回し車だけを手伝えます。' };
      if (now < player.gnawReadyAt) return { ok: false, error: '丸太かじりは準備中です。', readyAt: player.gnawReadyAt };
      if (!isNearInteraction(player, LOG_STATION)) return { ok: false, error: '大きな丸太へ近づいてください。' };
      player.digestionReady = true;
      player.gnawReadyAt = now + GNAW_COOLDOWN_MS;
      this.emitPrivateState(player);
      return { ok: true, digestionReady: true, readyAt: player.gnawReadyAt };
    }

    spinWheel(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今は回し車を回せません。' };
      if (player.expelled) return { ok: false, error: '追放された後は行動できません。' };
      if (now < player.wheelReadyAt) return { ok: false, error: '回し車は準備中です。', readyAt: player.wheelReadyAt };
      if (!isNearInteraction(player, WHEEL_STATION)) return { ok: false, error: '回し車へ近づいてください。' };
      const restored = Boolean(room.blackoutActive);
      room.wheelCharge = 100;
      player.wheelReadyAt = now + WHEEL_COOLDOWN_MS;
      if (restored) {
        room.blackoutActive = false;
        room.blackoutReason = null;
        this.emitBlackoutState(room);
      }
      this.emitPrivateState(player);
      this.emitSystemState(room);
      return { ok: true, restored, readyAt: player.wheelReadyAt, systems: publicSystems(room) };
    }

    stealNut(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今はナッツを奪えません。' };
      if (player.role !== 'culprit' || player.ghost) return { ok: false, error: 'ナッツ強盗だけが使える行動です。' };
      if (now < room.stealUnlockAt) return { ok: false, error: 'ゲーム開始から30秒間はナッツを奪えません。', readyAt: room.stealUnlockAt };
      if (now < player.stealReadyAt) return { ok: false, error: 'ナッツ強奪は準備中です。', readyAt: player.stealReadyAt };
      const target = Array.from(room.players.values())
        .filter((item) => item.id !== player.id && item.role === 'character' && item.hasNut && !item.ghost && item.areaId === player.areaId)
        .map((item) => ({ item, distance: Math.hypot(item.x - player.x, item.y - player.y) }))
        .filter((entry) => entry.distance <= STEAL_DISTANCE)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!target) return { ok: false, error: '近くにナッツを持つ相手がいません。' };
      player.stealReadyAt = now + STEAL_COOLDOWN_MS;
      target.item.hasNut = false;
      target.item.ghost = true;
      target.item.input = { x: 0, y: 0 };
      this.send(target.item.connectionId, 'nutStolen', { message: 'ナッツを奪われました。あなたの姿は、ほかの人から見えなくなりました。' });
      this.emitPrivateState(target.item);
      this.emitPrivateState(player);
      const victory = this.evaluateVictory(room);
      if (victory) this.finishGame(room, victory);
      return { ok: true, targetName: target.item.name, readyAt: player.stealReadyAt };
    }

    useVent(connection, payload = {}) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今は通気口を使えません。' };
      if (player.role !== 'culprit' || player.ghost) return { ok: false, error: 'ナッツ強盗だけが使える行動です。' };
      if (now < player.ventReadyAt) return { ok: false, error: '通気口は準備中です。', readyAt: player.ventReadyAt };
      const vent = VENTS.filter((item) => item.areaId === player.areaId)
        .map((item) => ({ item, distance: Math.hypot(item.x - player.x, item.y - player.y) }))
        .filter((entry) => entry.distance <= VENT_DISTANCE)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!vent) return { ok: false, error: '花柄・葉っぱ柄のマットに近づいてください。' };
      const destinationId = String(payload.destinationId || '');
      const destination = VENTS.find((item) => item.id === destinationId && item.id !== vent.item.id);
      if (!destination) return { ok: false, error: '移動先の通気口を選んでください。', chooseDestination: true };
      Object.assign(player, {
        areaId: destination.areaId, x: destination.x, y: destination.y,
        vx: 0, vy: 0, input: { x: 0, y: 0 }, ventReadyAt: now + VENT_COOLDOWN_MS
      });
      this.emitPrivateState(player);
      return { ok: true, destinationId: destination.id, destinationAreaId: destination.areaId, readyAt: player.ventReadyAt };
    }

    triggerBlackout(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) return { ok: false, error: '今は停電させられません。' };
      if (player.role !== 'culprit' || player.ghost) return { ok: false, error: 'ナッツ強盗だけが使える行動です。' };
      if (room.blackoutActive) return { ok: false, error: 'すでに停電中です。' };
      if (now < player.blackoutReadyAt) return { ok: false, error: '停電は準備中です。', readyAt: player.blackoutReadyAt };
      room.blackoutActive = true;
      room.blackoutReason = 'culprit';
      player.blackoutReadyAt = now + BLACKOUT_COOLDOWN_MS;
      this.emitPrivateState(player);
      this.emitBlackoutState(room);
      return { ok: true, endsAt: 0, readyAt: player.blackoutReadyAt };
    }

    investigatePlayer(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) {
        return { ok: false, error: '今は調査できません。' };
      }
      if (player.specialRole !== 'detective') return { ok: false, error: '探偵だけが使える行動です。' };
      if (player.ghost || player.expelled) return { ok: false, error: '今は調査に参加できません。' };
      if (player.investigateUsed) return { ok: false, error: '調査は1試合1回だけです。' };
      const target = nearestActivePlayer(room, player);
      if (!target) return { ok: false, error: '調査する相手の近くへ移動してください。' };
      const possibility = investigationLevelForPlayer(target);
      const identity = displayedIdentity(target, now);
      player.investigateUsed = true;
      player.investigationResult = {
        targetName: identity.name,
        level: possibility.level,
        label: possibility.label,
        score: possibility.score
      };
      this.emitPrivateState(player);
      return { ok: true, ...player.investigationResult };
    }

    disguiseAsPlayer(connection, payload = {}) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || this.gameplayPaused(room)) {
        return { ok: false, error: '今は変身できません。' };
      }
      if (player.specialRole !== 'jester') return { ok: false, error: '道化師だけが使える行動です。' };
      if (player.ghost || player.expelled) return { ok: false, error: '今は変身できません。' };
      if (player.disguiseUsed) return { ok: false, error: '変身は1試合1回だけです。' };
      let target = nearestActivePlayer(room, player);
      if (player.isNpc) {
        if (target) return { ok: false, error: 'NPCは周囲に誰もいないときに変身します。' };
        const selected = room.players.get(String(payload.targetId || ''));
        target = selected && selected.id !== player.id
          && !selected.ghost && !selected.expelled ? selected : null;
      }
      if (!target) return { ok: false, error: player.isNpc
        ? '変身できる相手が見つかりません。' : '変身する相手の近くへ移動してください。' };
      const targetIdentity = displayedIdentity(target, now);
      player.disguiseUsed = true;
      player.disguiseUntil = now + DISGUISE_DURATION_MS;
      player.disguiseTargetName = targetIdentity.name;
      player.disguiseTargetCharacterId = targetIdentity.characterId;
      this.emitPrivateState(player);
      return {
        ok: true,
        targetName: player.disguiseTargetName,
        disguiseUntil: player.disguiseUntil,
        durationMs: DISGUISE_DURATION_MS
      };
    }

    clearMeetingTimers(room) {
      if (!room) return;
      if (room.meetingTimer) clearTimeout(room.meetingTimer);
      if (room.meetingEndTimer) clearTimeout(room.meetingEndTimer);
      room.meetingTimer = null;
      room.meetingEndTimer = null;
      room.meetingEndRemainingMs = 0;
      room.meetingEndEndsAt = 0;
      room.pendingMeetingVictory = null;
    }

    armMeetingTimer(room, duration) {
      if (!room || !room.meeting?.active) return;
      if (room.meetingTimer) clearTimeout(room.meetingTimer);
      const delay = Math.max(10, Number(duration) || 10);
      room.meeting.paused = false;
      room.meeting.remainingMs = delay;
      room.meeting.endsAt = Date.now() + delay;
      room.meetingTimer = setTimeout(() => this.resolveMeeting(room), delay);
      if (room.meetingTimer && typeof room.meetingTimer.unref === 'function') room.meetingTimer.unref();
    }

    pauseMeetingTimer(room) {
      const meeting = room && room.meeting;
      if (meeting?.active && !meeting.paused) {
        meeting.remainingMs = Math.max(10, meeting.endsAt - Date.now());
        meeting.paused = true;
        if (room.meetingTimer) clearTimeout(room.meetingTimer);
        room.meetingTimer = null;
        this.broadcastRoom(room, 'meetingState', publicMeeting(room));
      }
      if (room?.meetingResolving && room.meetingEndTimer) {
        room.meetingEndRemainingMs = Math.max(10, room.meetingEndEndsAt - Date.now());
        clearTimeout(room.meetingEndTimer);
        room.meetingEndTimer = null;
      }
    }

    resumeMeetingTimer(room) {
      const meeting = room && room.meeting;
      if (meeting?.active && meeting.paused) {
        this.armMeetingTimer(room, meeting.remainingMs);
        this.broadcastRoom(room, 'meetingState', publicMeeting(room));
      }
      if (room?.meetingResolving && !room.meetingEndTimer && room.meetingEndRemainingMs > 0) {
        this.armMeetingEndTimer(room, room.meetingEndRemainingMs, room.pendingMeetingVictory);
      }
    }

    armMeetingEndTimer(room, duration, victory) {
      if (!room || room.phase !== 'playing' || !room.meetingResolving) return;
      if (room.meetingEndTimer) clearTimeout(room.meetingEndTimer);
      const delay = Math.max(10, Number(duration) || 10);
      room.meetingEndRemainingMs = delay;
      room.meetingEndEndsAt = Date.now() + delay;
      room.pendingMeetingVictory = victory || null;
      room.meetingEndTimer = setTimeout(() => {
        room.meetingEndTimer = null;
        room.meetingEndRemainingMs = 0;
        room.meetingEndEndsAt = 0;
        const pendingVictory = room.pendingMeetingVictory;
        room.pendingMeetingVictory = null;
        if (room.phase !== 'playing') return;
        if (room.paused) {
          room.meetingEndRemainingMs = 10;
          room.pendingMeetingVictory = pendingVictory;
          return;
        }
        if (pendingVictory) {
          this.finishGame(room, pendingVictory);
          return;
        }
        room.meetingResolving = false;
        room.meeting = null;
        room.meetingResolution = null;
        this.broadcastRoom(room, 'meetingEnded', { meetingReadyAt: room.meetingReadyAt });
      }, delay);
      if (room.meetingEndTimer && typeof room.meetingEndTimer.unref === 'function') room.meetingEndTimer.unref();
    }

    callMeeting(connection) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const now = Date.now();
      if (!room || !player || room.phase !== 'playing' || room.paused || room.meetingResolving || room.meeting?.active) {
        return { ok: false, error: '今は会議を開けません。' };
      }
      if (!player.hasNut || player.ghost || player.expelled) {
        return { ok: false, error: 'ナッツを持っている参加者だけが会議を開けます。' };
      }
      if (now < (room.meetingReadyAt || 0)) {
        return { ok: false, error: '会議を続けて開くことはできません。', readyAt: room.meetingReadyAt };
      }
      const eligible = eligibleMeetingPlayers(room);
      if (eligible.length === 0) return { ok: false, error: '投票できる参加者がいません。' };
      for (const item of room.players.values()) {
        item.input = { x: 0, y: 0 };
        item.vx = 0;
        item.vy = 0;
      }
      const duration = room.testMode ? this.testMeetingDurationMs : this.meetingDurationMs;
      room.meetingResolution = null;
      room.meeting = {
        active: true,
        callerId: player.id,
        eligibleIds: eligible.map((item) => item.id),
        votes: new Map(),
        testimonies: new Map(),
        endsAt: now + duration,
        remainingMs: duration,
        paused: false
      };
      const meetingState = publicMeeting(room);
      this.broadcastRoom(room, 'meetingStarted', meetingState);
      this.armMeetingTimer(room, duration);
      for (const npc of eligible.filter((item) => item.isNpc)) {
        const dwell = [...npc.npc.dwell.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const [areaId, zoneId] = dwell ? dwell.split(':') : [npc.areaId, testimonyZone(npc.x, npc.y)];
        this.shareTestimony({ roomCode: room.code, playerId: npc.id }, { areaId, zoneId });
      }
      return { ok: true, meeting: meetingState };
    }

    shareTestimony(connection, payload) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const meeting = room && room.meeting;
      if (!room || !player || !player.connected || room.phase !== 'playing' || room.paused
        || !meeting?.active || meeting.paused) {
        return { ok: false, error: '今は証言できません。' };
      }
      if (!meeting.eligibleIds.includes(player.id) || player.ghost || player.expelled || !player.hasNut) {
        return { ok: false, error: '会議に参加できる人だけが証言できます。' };
      }
      if (meeting.testimonies.has(player.id)) {
        return { ok: false, error: 'この会議での証言は1回だけです。' };
      }
      const areaId = String(payload.areaId || '');
      const zoneId = String(payload.zoneId || '');
      if (!Object.hasOwn(AREA_CONFIGS, areaId) || !TESTIMONY_ZONES.includes(zoneId)) {
        return { ok: false, error: 'ステージと場所を選んでください。' };
      }
      meeting.testimonies.set(player.id, { areaId, zoneId });
      this.broadcastRoom(room, 'meetingState', publicMeeting(room));
      return { ok: true, playerId: player.id, areaId, zoneId };
    }

    castVote(connection, payload) {
      const room = this.getRoom(connection);
      const player = room && room.players.get(connection.playerId);
      const meeting = room && room.meeting;
      if (!room || !player || room.phase !== 'playing' || room.paused || !meeting || !meeting.active || meeting.paused) {
        return { ok: false, error: '投票時間ではありません。' };
      }
      if (!meeting.eligibleIds.includes(player.id) || player.ghost || player.expelled || !player.hasNut) {
        return { ok: false, error: 'ナッツを持っていないため、投票には参加できません。' };
      }
      if (meeting.votes.has(player.id)) return { ok: false, error: '投票は1回だけです。' };
      const targetId = String(payload.targetId || '');
      if (targetId !== 'skip' && !meeting.eligibleIds.includes(targetId)) {
        return { ok: false, error: '投票先が正しくありません。' };
      }
      meeting.votes.set(player.id, targetId);
      const state = publicMeeting(room);
      this.broadcastRoom(room, 'meetingState', state);
      if (meeting.votes.size >= this.onlineVoterCount(room)) this.resolveMeeting(room);
      return { ok: true, targetId };
    }

    resolveMeeting(room) {
      const meeting = room && room.meeting;
      if (!room || room.phase !== 'playing' || !meeting || !meeting.active) return;
      if (room.paused) {
        this.pauseMeetingTimer(room);
        return;
      }
      if (room.meetingTimer) clearTimeout(room.meetingTimer);
      room.meetingTimer = null;
      const counts = new Map();
      for (const targetId of meeting.votes.values()) counts.set(targetId, (counts.get(targetId) || 0) + 1);
      const options = ['skip', ...meeting.eligibleIds];
      const maximum = Math.max(0, ...options.map((id) => counts.get(id) || 0));
      const winners = maximum > 0 ? options.filter((id) => (counts.get(id) || 0) === maximum) : [];
      const expelledId = winners.length === 1 && winners[0] !== 'skip' ? winners[0] : '';
      const expelled = expelledId ? room.players.get(expelledId) : null;
      const meetingSummary = publicMeeting(room);
      meeting.active = false;
      room.meetingResolving = true;
      room.meetingReadyAt = Date.now() + this.meetingCooldownMs;
      if (expelled) {
        expelled.expelled = true;
        expelled.ghost = true;
        expelled.hasNut = false;
        expelled.input = { x: 0, y: 0 };
        expelled.vx = 0;
        expelled.vy = 0;
        this.emitPrivateState(expelled);
      }
      const tie = winners.length > 1;
      const skipped = winners.length === 1 && winners[0] === 'skip';
      const result = {
        expelled: expelled ? {
          id: expelled.id,
          name: expelled.name,
          characterId: expelled.characterId,
          wasCulprit: expelled.role === 'culprit'
        } : null,
        tie,
        skipped,
        participants: meetingSummary.participants,
        testimonies: meetingSummary.testimonies,
        voteCounts: Object.fromEntries(counts),
        message: expelled
          ? `${expelled.name}が追放されます。`
          : (tie ? '同数票のため、誰も追放されません。' : '今回は誰も追放されません。')
      };
      room.meetingResolution = result;
      this.broadcastRoom(room, 'meetingResolved', result);
      for (const npc of room.players.values()) if (npc.isNpc) npc.npc = npcMemory();
      const victory = this.evaluateVictory(room);
      const waitMs = expelled ? this.expulsionDurationMs : this.noExpulsionDurationMs;
      this.armMeetingEndTimer(room, waitMs, victory);
    }

    evaluateVictory(room) {
      if (!room || room.phase !== 'playing') return null;
      if (room.testMode) return null;
      const players = Array.from(room.players.values());
      const activeCulprits = players.filter((player) => player.role === 'culprit' && !player.expelled);
      if (activeCulprits.length === 0) {
        return {
          winner: 'characters',
          reason: 'all-culprits-expelled',
          title: 'キャラクターチームの勝利！',
          message: '会議ですべてのナッツ強盗を追放しました。'
        };
      }
      const activePlayers = players.filter((player) => !player.ghost && !player.expelled);
      // A stolen nut removes a character from play, just like a meeting expulsion.
      // One-player games contain no characters to remove, so they must not end at start.
      if (players.some((player) => player.role === 'character')
        && !activePlayers.some((player) => player.role === 'character')) {
        return {
          winner: 'culprits',
          reason: 'all-characters-gone',
          title: 'ナッツ強盗の勝利！',
          message: 'ナッツ強盗以外の参加者が全員いなくなりました。'
        };
      }
      const nutHolders = activePlayers.filter((player) => player.hasNut);
      // Count every active nut holder, including culprits and NPCs. Require at least
      // one loss so a small match cannot end as soon as it starts.
      if (nutHolders.length < players.length && nutHolders.length <= 3) {
        return {
          winner: 'culprits',
          reason: 'nuts-reduced',
          title: 'ナッツ強盗の勝利！',
          message: `ナッツを持つ人が${nutHolders.length}人になりました。`
        };
      }
      if (activePlayers.length > 0 && activePlayers.every((player) => (Number(player.hunger) || 0) >= 100)) {
        return {
          winner: 'culprits',
          reason: 'everyone-hungry',
          title: 'ナッツ強盗の勝利！',
          message: '残っている全員の空腹度が100になりました。'
        };
      }
      return null;
    }

    finishGame(room, result) {
      if (!room || room.phase !== 'playing' || room.gameResult) return;
      this.clearMeetingTimers(room);
      room.phase = 'ended';
      room.paused = true;
      room.meeting = null;
      room.meetingResolution = null;
      room.meetingResolving = false;
      room.gameResult = {
        ...result,
        culpritNames: Array.from(room.players.values())
          .filter((player) => player.role === 'culprit')
          .map((player) => player.name)
      };
      this.broadcastRoom(room, 'gameOver', room.gameResult);
      this.emitLobby(room);
    }

    returnToLobby(connection) {
      const room = this.getRoom(connection);
      if (!room || !this.isRoomHost(connection, room)) return { ok: false, error: '親機だけが戻せます。' };
      this.abortMatch(room, '親機がロビーへ戻しました。');
      return { ok: true };
    }

    runNpcMeeting(room, now) {
      const meeting = room.meeting;
      if (!meeting?.active || meeting.paused) return;
      const claimsReady = meeting.eligibleIds.every((id) => meeting.testimonies.has(id) || !room.players.get(id)?.connected);
      for (const id of meeting.eligibleIds) {
        if (!meeting.active) break;
        const npc = room.players.get(id);
        if (!npc?.isNpc || meeting.votes.has(id)) continue;
        const suspectId = npc.npc.detectiveSuspectId;
        if (suspectId && meeting.eligibleIds.includes(suspectId)) {
          const result = this.castVote({ roomCode: room.code, playerId: id }, { targetId: suspectId });
          if (result.ok) npc.npc.detectiveSuspectId = '';
          continue;
        }
        npc.npc.detectiveSuspectId = '';
        if (!claimsReady && meeting.endsAt - now > 3500) continue;
        const candidates = meeting.eligibleIds.filter((otherId) => {
          if (otherId === id || !meeting.testimonies.has(otherId)) return false;
          const claim = meeting.testimonies.get(otherId);
          return !npc.npc.sightings.get(otherId)?.has(`${claim.areaId}:${claim.zoneId}`);
        });
        if (candidates.length) this.castVote({ roomCode: room.code, playerId: id }, {
          targetId: candidates[randomInt(candidates.length)]
        });
        // An eyewitness who has no unverified claim abstains; the meeting timer still resolves.
      }
    }

    rememberNpc(room, npc, dt) {
      const key = locationKey(npc);
      npc.npc.dwell.set(key, (npc.npc.dwell.get(key) || 0) + dt * 1000);
      if (npc.ghost) return;
      for (const other of room.players.values()) {
        if (other.id === npc.id || other.areaId !== npc.areaId
          || other.ghost || other.expelled) continue;
        const distance = Math.hypot(npc.x - other.x, npc.y - other.y);
        if (distance > (room.blackoutActive ? 150 : NPC_SIGHT_DISTANCE)
          || !npcLineClear(npc.areaId, npc, other)) continue;
        if (!npc.npc.sightings.has(other.id)) npc.npc.sightings.set(other.id, new Set());
        npc.npc.sightings.get(other.id).add(locationKey(other));
      }
    }

    followNpcGoal(npc, goal, now) {
      if (!goal) { npc.input = { x: 0, y: 0 }; return; }
      const side = goal.areaId === npc.areaId ? ''
        : (AREA_TRANSITIONS[npc.areaId].top === goal.areaId ? 'top' : 'bottom');
      if (side && Math.abs(npc.x - 960) < 45
        && (side === 'top' ? npc.y < 110 : npc.y > 970)) {
        npc.input = { x: 0, y: side === 'top' ? -1 : 1 };
        return;
      }
      const destination = side
        ? { x: 960, y: side === 'top' ? 65 : WORLD.height - 65 }
        : goal;
      const reach = side ? 60 : goal.reach;
      const key = `${npc.areaId}:${goal.areaId}:${goal.id}:${side}:${Math.round(destination.x / 80)}:${Math.round(destination.y / 80)}`;
      if (npc.npc.routeKey !== key || npc.npc.routeArea !== npc.areaId
        || now - npc.npc.routeAt > 2700) {
        npc.npc.route = npcRoute(npc, destination, reach);
        npc.npc.routeKey = key;
        npc.npc.routeArea = npc.areaId;
        npc.npc.routeAt = now;
      }
      while (npc.npc.route.length
        && Math.hypot(npc.npc.route[0].x - npc.x, npc.npc.route[0].y - npc.y)
          < (npc.npc.route.length === 1 ? 12 : 45)) npc.npc.route.shift();
      const point = npc.npc.route[0];
      if (!point) { npc.input = { x: 0, y: 0 }; return; }
      const dx = point.x - npc.x;
      const dy = point.y - npc.y;
      const length = Math.hypot(dx, dy);
      npc.input = { x: dx / length, y: dy / length };
    }

    npcPatrol(npc, now) {
      if (npc.npc.goal?.id === 'patrol' && now < npc.npc.nextRoamAt
        && (npc.npc.goal.areaId !== npc.areaId
          || Math.hypot(npc.x - npc.npc.goal.x, npc.y - npc.npc.goal.y) > 100)) {
        return npc.npc.goal;
      }
      const areas = Object.keys(AREA_CONFIGS);
      const areaId = randomInt(4) ? npc.areaId : areas[randomInt(areas.length)];
      const nodes = [...NPC_GRID[areaId].values()]
        .filter((node) => areaId !== npc.areaId || Math.hypot(node.x - npc.x, node.y - npc.y) > 320);
      const point = nodes[randomInt(nodes.length)] || { x: 960, y: 175 };
      npc.npc.nextRoamAt = now + 14000;
      npc.npc.goal = { id: 'patrol', areaId, x: point.x, y: point.y, reach: 65 };
      return npc.npc.goal;
    }

    updateNpc(room, npc, now) {
      if (now < npc.npc.nextThinkAt) return;
      npc.npc.nextThinkAt = now + 270;
      const connection = { roomCode: room.code, playerId: npc.id };
      if (room.blackoutActive) {
        if (isNearInteraction(npc, WHEEL_STATION)) {
          this.spinWheel(connection);
          npc.input = { x: 0, y: 0 };
          return;
        }
        this.followNpcGoal(npc, { ...WHEEL_STATION, reach: 125 }, now);
        return;
      }
      if (npc.ghost) {
        this.followNpcGoal(npc, this.npcPatrol(npc, now), now);
        return;
      }
      if (npc.specialRole === 'chef' && npc.hunger >= 100 && !npc.chefMealUsed
        && ![...(room.foodSpots || []), room.chefMeal]
          .some((meal) => isNearInteraction(npc, meal))) {
        this.placeChefMeal(connection);
      }
      const near = nearestActivePlayer(room, npc);
      if (npc.specialRole === 'detective' && near && !npc.investigateUsed) {
        const result = this.investigatePlayer(connection);
        if (result.ok && result.score === 3) npc.npc.detectiveSuspectId = near.id;
      }
      if (npc.npc.detectiveSuspectId) {
        const suspect = room.players.get(npc.npc.detectiveSuspectId);
        if (!suspect || !suspect.hasNut || suspect.ghost || suspect.expelled) {
          npc.npc.detectiveSuspectId = '';
        } else if (now >= (room.meetingReadyAt || 0)) {
          const opened = this.callMeeting(connection);
          if (opened.ok) {
            const voted = this.castVote(connection, { targetId: suspect.id });
            if (voted.ok) npc.npc.detectiveSuspectId = '';
            return;
          }
        }
      }
      if (npc.specialRole === 'jester' && !near && !npc.disguiseUsed) {
        const targets = [...room.players.values()].filter((other) => other.id !== npc.id
          && !other.ghost && !other.expelled);
        if (targets.length) this.disguiseAsPlayer(connection, {
          targetId: targets[randomInt(targets.length)].id
        });
      }
      if (npc.hunger >= 50) {
        if (!npc.digestionReady) {
          if (isNearInteraction(npc, LOG_STATION)) {
            this.gnawLog(connection);
            npc.input = { x: 0, y: 0 };
          } else this.followNpcGoal(npc, { ...LOG_STATION, reach: 125 }, now);
          return;
        }
        const meals = [...room.foodSpots, room.chefMeal].filter(Boolean);
        const meal = meals.filter((item) => item.areaId === npc.areaId)
          .sort((a, b) => Math.hypot(npc.x - a.x, npc.y - a.y) - Math.hypot(npc.x - b.x, npc.y - b.y))[0]
          || meals.find((item) => item.areaId === 'dining') || meals[0];
        if (meal) {
          if (isNearInteraction(npc, meal)) {
            this.eatFood(connection);
            npc.input = { x: 0, y: 0 };
          } else this.followNpcGoal(npc, { ...meal, reach: 125 }, now);
          return;
        }
      }
      if (npc.role === 'culprit' && now >= room.stealUnlockAt && now >= npc.stealReadyAt) {
        const targets = [...room.players.values()].filter((item) => item.id !== npc.id
          && item.role === 'character' && item.hasNut && !item.ghost && !item.expelled);
        const prey = targets.sort((a, b) => (a.areaId === npc.areaId ? 0 : 2300)
          + Math.hypot(a.x - npc.x, a.y - npc.y)
          - (b.areaId === npc.areaId ? 0 : 2300) - Math.hypot(b.x - npc.x, b.y - npc.y))[0];
        if (prey) {
          if (isNearInteraction(npc, prey, STEAL_DISTANCE)) {
            this.stealNut(connection);
            npc.input = { x: 0, y: 0 };
          } else this.followNpcGoal(npc, { id: `prey-${prey.id}`, areaId: prey.areaId,
            x: prey.x, y: prey.y, reach: 75 }, now);
          return;
        }
      }
      this.followNpcGoal(npc, this.npcPatrol(npc, now), now);
    }

    tick() {
      const now = Date.now();
      const dt = Math.min(0.05, (now - this.lastTick) / 1000);
      this.lastTick = now;
      this.snapshotCounter += 1;
      for (const room of this.rooms.values()) {
        if (room.phase !== 'playing' || room.paused) continue;
        if (room.meeting?.active) {
          this.runNpcMeeting(room, now);
          continue;
        }
        if (this.gameplayPaused(room)) continue;
        const drainPerSecond = 100000 / Math.max(250, room.wheelEmptyMs || WHEEL_EMPTY_MS);
        room.wheelCharge = Math.max(0, (Number(room.wheelCharge) || 0) - drainPerSecond * dt);
        if (room.wheelCharge === 0 && !room.blackoutActive) {
          room.blackoutActive = true;
          room.blackoutReason = 'wheel';
          this.emitBlackoutState(room);
          this.emitSystemState(room);
        }
        for (const player of room.players.values()) {
          if (!player.connected || player.expelled) continue;
          if (player.isNpc) this.updateNpc(room, player, now);
          if (room.phase !== 'playing' || this.gameplayPaused(room)) break;
          movePlayer(player, dt);
        }
        if (room.phase !== 'playing' || this.gameplayPaused(room)) continue;
        for (const player of room.players.values()) if (player.isNpc && !player.expelled) this.rememberNpc(room, player, dt);
        const victory = this.evaluateVictory(room);
        if (victory) {
          this.finishGame(room, victory);
          continue;
        }
        if (this.snapshotCounter % 2 === 0) {
          for (const viewer of room.players.values()) {
            if (viewer.connected && viewer.connectionId) this.send(viewer.connectionId, 'snapshot', this.visibleSnapshot(room, viewer, now));
          }
        }
      }
    }

    getRoomStateForTest(code) {
      return this.rooms.get(cleanRoomCode(code));
    }
  }

  const api = {
    HostGameEngine, WORLD, AREA_CONFIGS, AREA_TRANSITIONS, VENTS, MAX_PLAYERS, CHARACTER_COUNT,
    PLAYER_RADIUS, FOOD_SPOTS, LOG_STATION, WHEEL_STATION,
    HUNGER_STEP_DISTANCE, SPECIAL_ROLE_MIN_PLAYERS, CHEF_ROLE_MIN_PLAYERS,
    SPECIAL_ACTION_DISTANCE, DISGUISE_DURATION_MS,
    collides, culpritCountForPlayers, movePlayer, hungerAfterMeal, investigationLevelForPlayer
  };
  global.NutsGameCore = api;
  global.NutsHostEngine = HostGameEngine;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
