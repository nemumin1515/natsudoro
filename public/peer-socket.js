// ナッツ強盗をさがせ！ PeerJS版 v3 — 通信モジュール
// relay-socket.js（PowerShell中継）と同じ on / emit / ack の窓口を、PeerJS（WebRTC）で実装します。
//   親機ページ（?host=1）: PeerID = idPrefix + 部屋番号 で待ち受け、ゲーム本体（host-engine.js）を動かす
//   参加ページ（?room=XXXXXX）: 親機のPeerIDへ直接つなぐ
(function (global) {
  'use strict';

  const CONFIG = Object.assign({
    publicUrl: '', idPrefix: 'nuts-robber-v3-', server: null, pingMs: 2000, timeoutMs: 9000
  }, global.NUTS_PEER_CONFIG || {});
  const ACK_TIMEOUT_MS = 9000;
  const CONNECT_TIMEOUT_MS = 9000;
  const LOCAL_ID = 'host-local';
  const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const params = new URLSearchParams(global.location.search);

  function cleanCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6);
  }

  function randomCode() {
    const values = new Uint32Array(6);
    global.crypto.getRandomValues(values);
    return Array.from(values, (value) => CODE_LETTERS[value % CODE_LETTERS.length]).join('');
  }

  function peerOptions() {
    const options = { debug: 0 };
    const server = CONFIG.server || null;
    const host = params.get('peerHost') || (server && server.host);
    if (host) {
      options.host = host;
      options.port = Number(params.get('peerPort') || (server && server.port) || 443);
      options.path = params.get('peerPath') || (server && server.path) || '/';
      const secureParam = params.get('peerSecure');
      options.secure = secureParam ? secureParam === '1' : (server && typeof server.secure === 'boolean' ? server.secure : options.port === 443);
    }
    return options;
  }

  function publicBase() {
    if (CONFIG.publicUrl) return String(CONFIG.publicUrl).replace(/\/?(index\.html)?$/, '');
    const url = new URL(global.location.href);
    url.search = '';
    url.hash = '';
    return url.href.replace(/\/?(index\.html)?$/, '');
  }

  class PeerSocket {
    constructor() {
      this.handlers = new Map();
      this.pendingAcks = new Map();
      this.queue = [];
      this.connected = false;
      this.destroyed = false;
      this.isHostPage = params.get('host') === '1';
      this.id = this.isHostPage ? LOCAL_ID : '';
      this.peer = null;
      this.engine = null;
      this.roomCode = '';
      this.clients = new Map();
      this.conn = null;
      this.targetCode = this.isHostPage ? '' : cleanCode(params.get('room'));
      this.lastSeen = 0;
      this.requestCounter = 0;
      this.retryTimer = null;
      this.connectTimer = null;
      this.heartbeatTimer = setInterval(() => this.heartbeat(), CONFIG.pingMs);
      if (typeof global.Peer !== 'function') {
        setTimeout(() => this.fire('connect_error', new Error('通信用ファイル（peerjs.min.js）が読み込めません。')), 0);
        return;
      }
      setTimeout(() => this.open(), 0);
      global.addEventListener('beforeunload', () => this.close(true));
      global.document.addEventListener('visibilitychange', () => {
        if (!global.document.hidden) this.heartbeat();
      });
    }

    // ---- イベント窓口（socket.io と同じ使い方）----
    on(eventName, handler) {
      if (typeof handler !== 'function') return this;
      if (!this.handlers.has(eventName)) this.handlers.set(eventName, new Set());
      this.handlers.get(eventName).add(handler);
      return this;
    }

    off(eventName, handler) {
      const group = this.handlers.get(eventName);
      if (!group) return this;
      if (handler) group.delete(handler);
      else group.clear();
      return this;
    }

    fire(eventName, ...args) {
      const group = this.handlers.get(eventName);
      if (!group) return;
      for (const handler of Array.from(group)) {
        try { handler(...args); } catch (error) { setTimeout(() => { throw error; }, 0); }
      }
    }

    open() {
      if (this.destroyed) return;
      if (this.isHostPage) this.openHost();
      else this.openClient();
    }

    emit(eventName, payload = {}, acknowledgement) {
      const ack = typeof acknowledgement === 'function' ? acknowledgement : null;
      if (this.isHostPage) {
        if (!this.engine) {
          if (ack) ack({ ok: false, error: '通信の準備中です。少し待ってから、もう一度試してください。' });
          return this;
        }
        Promise.resolve(this.engine.dispatch(LOCAL_ID, eventName, payload))
          .then((result) => { if (ack) ack(result); })
          .catch(() => { if (ack) ack({ ok: false, error: '操作を処理できませんでした。' }); });
        return this;
      }
      return this.emitClient(eventName, payload, ack);
    }

    // =========================================================
    // 親機（ゲーム本体を動かすPC）
    // =========================================================
    openHost() {
      clearTimeout(this.retryTimer);
      if (this.peer && !this.peer.destroyed) {
        if (this.peer.disconnected) {
          try { this.peer.reconnect(); } catch { this.scheduleRetry(2000); }
        }
        return;
      }
      const code = this.roomCode || randomCode();
      const peer = new global.Peer(CONFIG.idPrefix + code, peerOptions());
      this.peer = peer;
      peer.on('open', () => {
        if (peer !== this.peer) return;
        this.roomCode = code;
        const first = !this.engine;
        if (first) this.createEngine();
        if (!this.connected) {
          this.connected = true;
          this.fire('connect');
        }
      });
      peer.on('connection', (conn) => this.acceptClient(conn));
      peer.on('disconnected', () => {
        // 紹介用サーバーとの接続だけが切れた状態。つながっている参加者はそのまま遊べます。
        if (peer === this.peer && !this.destroyed) this.scheduleRetry(2000);
      });
      peer.on('error', (error) => {
        if (peer !== this.peer) return;
        const type = error && error.type;
        if (type === 'unavailable-id' && !this.engine) {
          // 同じ部屋番号がすでに使われていた → 別の番号で作り直す
          peer.destroy();
          this.peer = null;
          this.roomCode = '';
          this.scheduleRetry(200);
          return;
        }
        if (type === 'browser-incompatible') {
          this.fire('connect_error', new Error('このブラウザーは通信（WebRTC）に対応していません。'));
          return;
        }
        if (!this.engine) {
          this.fire('connect_error', new Error('通信サーバーに接続できません。インターネット接続を確認してください。'));
          if (peer.destroyed) this.peer = null;
          this.scheduleRetry(2500);
        } else if (peer.destroyed) {
          this.peer = null;
          this.scheduleRetry(2500);
        } else if (peer.disconnected) {
          this.scheduleRetry(2500);
        }
      });
    }

    createEngine() {
      const engine = new global.NutsHostEngine({
        joinBase: publicBase,
        deliver: (targetId, eventName, payload) => this.deliverFromEngine(targetId, eventName, payload)
      });
      // 部屋番号をPeerIDと一致させる（部屋番号＝親機のPeerID）
      engine.makeRoomCode = () => {
        const code = this.roomCode;
        const old = engine.rooms.get(code);
        if (old) {
          engine.clearMeetingTimers(old);
          for (const player of old.players.values()) engine.clearDisconnectTimer(player);
          engine.rooms.delete(code);
        }
        return code;
      };
      engine.connect(LOCAL_ID);
      this.engine = engine;
    }

    acceptClient(conn) {
      const key = `${conn.peer}#${conn.connectionId}`;
      conn.on('open', () => {
        if (this.destroyed) { conn.close(); return; }
        this.clients.set(key, { conn, lastSeen: Date.now() });
        if (this.engine) this.engine.connect(key);
      });
      conn.on('data', (message) => this.handleClientMessage(key, message));
      conn.on('close', () => this.dropClient(key));
      conn.on('error', () => this.dropClient(key));
    }

    async handleClientMessage(key, message) {
      const client = this.clients.get(key);
      if (!client || !message || typeof message !== 'object' || !this.engine) return;
      client.lastSeen = Date.now();
      if (message.kind === 'ping') {
        this.sendTo(client, { kind: 'pong' });
        return;
      }
      if (message.kind === 'bye') {
        this.dropClient(key);
        return;
      }
      if (message.kind !== 'clientEvent') return;
      this.engine.connect(key);
      const result = await this.engine.dispatch(key, String(message.event || ''), message.payload || {});
      if (message.requestId) this.sendTo(client, { kind: 'ack', requestId: message.requestId, payload: result });
    }

    deliverFromEngine(targetId, eventName, payload) {
      if (targetId === LOCAL_ID) {
        this.fire(eventName, payload);
        return;
      }
      const client = this.clients.get(targetId);
      if (client) this.sendTo(client, { kind: 'serverEvent', event: eventName, payload });
    }

    sendTo(client, message) {
      try {
        if (client.conn.open) client.conn.send(message);
      } catch { /* 切断直前の送信失敗は、ハートビートで処理します。 */ }
    }

    dropClient(key) {
      const client = this.clients.get(key);
      if (!client) return;
      this.clients.delete(key);
      try { client.conn.close(); } catch { /* すでに閉じています。 */ }
      if (this.engine) this.engine.disconnect(key);
    }

    // =========================================================
    // 参加者（スマホなど）
    // =========================================================
    openClient() {
      clearTimeout(this.retryTimer);
      if (!this.targetCode || this.connected) return;
      if (!this.peer || this.peer.destroyed) {
        const peer = new global.Peer(peerOptions());
        this.peer = peer;
        peer.on('open', () => { if (peer === this.peer) this.connectToHost(); });
        peer.on('disconnected', () => {
          if (peer !== this.peer || this.destroyed) return;
          try { peer.reconnect(); } catch { /* 次の再試行で作り直します。 */ }
        });
        peer.on('error', (error) => {
          if (peer !== this.peer) return;
          const type = error && error.type;
          if (type === 'peer-unavailable') {
            this.failAttempt(new Error('親機を待っています。部屋番号とQRコードを確認してください。'), '部屋は見つかりません。親機の画面に表示された部屋番号を確認してください。');
            return;
          }
          if (type === 'browser-incompatible') {
            this.failAttempt(new Error('このブラウザーは通信（WebRTC）に対応していません。'));
            return;
          }
          if (!this.connected) {
            try { peer.destroy(); } catch { /* 作り直します。 */ }
            this.peer = null;
            this.failAttempt(new Error('通信サーバーに接続できません。インターネット接続を確認してください。'));
          }
        });
        return;
      }
      if (this.peer.open) this.connectToHost();
      else if (this.peer.disconnected) {
        try { this.peer.reconnect(); } catch { this.peer.destroy(); this.peer = null; this.scheduleRetry(1500); }
      }
    }

    connectToHost() {
      if (this.connected || !this.targetCode || !this.peer || !this.peer.open) return;
      if (this.conn) { try { this.conn.close(); } catch { /* 古い接続を閉じます。 */ } }
      const code = this.targetCode;
      const conn = this.peer.connect(CONFIG.idPrefix + code, { reliable: true, serialization: 'json' });
      this.conn = conn;
      clearTimeout(this.connectTimer);
      this.connectTimer = setTimeout(() => {
        if (conn === this.conn && !this.connected) {
          try { conn.close(); } catch { /* 閉じるだけです。 */ }
          this.failAttempt(new Error('親機につながりません。通信環境を確認してください。'));
        }
      }, CONNECT_TIMEOUT_MS);
      conn.on('open', () => {
        if (conn !== this.conn || this.destroyed) return;
        clearTimeout(this.connectTimer);
        this.connected = true;
        this.lastSeen = Date.now();
        this.id = conn.connectionId;
        this.fire('connect');
        const waiting = this.queue.splice(0);
        for (const item of waiting) this.sendClientEvent(item.event, item.payload, item.ack, item.deadline);
      });
      conn.on('data', (message) => this.handleHostMessage(conn, message));
      conn.on('close', () => { if (conn === this.conn) this.handleDisconnect('closed'); });
      conn.on('error', () => { if (conn === this.conn) this.handleDisconnect('error'); });
    }

    failAttempt(error, ackMessage) {
      clearTimeout(this.connectTimer);
      if (this.conn) { try { this.conn.close(); } catch { /* 閉じるだけです。 */ } }
      this.conn = null;
      this.fire('connect_error', error);
      const waiting = this.queue.splice(0);
      for (const item of waiting) {
        if (item.ack) item.ack({ ok: false, error: ackMessage || error.message });
      }
      this.scheduleRetry(2000);
    }

    handleHostMessage(conn, message) {
      if (conn !== this.conn || !message || typeof message !== 'object') return;
      this.lastSeen = Date.now();
      if (message.kind === 'serverEvent') {
        this.fire(message.event, message.payload);
        return;
      }
      if (message.kind === 'ack' && message.requestId) {
        const waiting = this.pendingAcks.get(message.requestId);
        if (!waiting) return;
        clearTimeout(waiting.timeout);
        this.pendingAcks.delete(message.requestId);
        waiting.callback(message.payload);
      }
    }

    emitClient(eventName, payload, ack) {
      const code = cleanCode(payload && payload.code);
      const switching = code.length === 6 && code !== this.targetCode && (eventName === 'inspectRoom' || eventName === 'joinRoom');
      if (switching) {
        // 別の部屋番号が入力された → その親機へつなぎ直す
        this.targetCode = code;
        if (this.connected) this.handleDisconnect('switch', true);
      }
      if (this.connected) {
        this.sendClientEvent(eventName, payload, ack);
        return this;
      }
      if (eventName === 'playerInput') return this; // 切断中の移動入力は捨てる
      if (!this.targetCode) {
        if (ack) ack({ ok: false, error: '部屋番号を入力してください。' });
        return this;
      }
      if (eventName === 'inspectRoom') this.queue = this.queue.filter((item) => item.event !== 'inspectRoom');
      this.queue.push({ event: eventName, payload, ack, deadline: Date.now() + ACK_TIMEOUT_MS });
      this.open();
      return this;
    }

    sendClientEvent(eventName, payload, ack, deadline) {
      let requestId = '';
      if (ack) {
        requestId = `${Date.now().toString(36)}-${(++this.requestCounter).toString(36)}`;
        const wait = Math.max(1500, (deadline || Date.now() + ACK_TIMEOUT_MS) - Date.now());
        const timeout = setTimeout(() => {
          const waiting = this.pendingAcks.get(requestId);
          if (!waiting) return;
          this.pendingAcks.delete(requestId);
          waiting.callback({ ok: false, error: '返事がないため、もう一度試してください。' });
        }, wait);
        this.pendingAcks.set(requestId, { callback: ack, timeout });
      }
      try {
        this.conn.send({ kind: 'clientEvent', event: eventName, payload, requestId });
      } catch {
        this.handleDisconnect('send failed');
      }
    }

    handleDisconnect(reason, silentRetry = false) {
      if (!this.connected) return;
      this.connected = false;
      clearTimeout(this.connectTimer);
      const conn = this.conn;
      this.conn = null;
      if (conn) { try { conn.close(); } catch { /* 閉じるだけです。 */ } }
      this.fire('disconnect', reason || 'peer disconnected');
      for (const waiting of this.pendingAcks.values()) {
        clearTimeout(waiting.timeout);
        waiting.callback({ ok: false, error: '通信が切れました。再接続しています。' });
      }
      this.pendingAcks.clear();
      this.scheduleRetry(silentRetry ? 0 : 1200);
    }

    // ---- 共通 ----
    heartbeat() {
      if (this.destroyed) return;
      const now = Date.now();
      if (this.isHostPage) {
        for (const [key, client] of Array.from(this.clients.entries())) {
          if (now - client.lastSeen > CONFIG.timeoutMs) this.dropClient(key);
        }
        return;
      }
      if (!this.connected || !this.conn) return;
      if (now - this.lastSeen > CONFIG.timeoutMs) {
        this.handleDisconnect('timeout');
        return;
      }
      try { this.conn.send({ kind: 'ping' }); } catch { this.handleDisconnect('ping failed'); }
    }

    scheduleRetry(delay) {
      clearTimeout(this.retryTimer);
      if (!this.destroyed) this.retryTimer = setTimeout(() => this.open(), Math.max(0, delay));
    }

    close(silent = false) {
      if (this.destroyed) return;
      this.destroyed = true;
      clearTimeout(this.retryTimer);
      clearTimeout(this.connectTimer);
      clearInterval(this.heartbeatTimer);
      if (!this.isHostPage && this.conn && this.conn.open) {
        try { this.conn.send({ kind: 'bye' }); } catch { /* 終了時なので無視します。 */ }
      }
      if (this.engine) this.engine.stop();
      try { if (this.peer) this.peer.destroy(); } catch { /* 終了時なので無視します。 */ }
      if (this.connected && !silent) this.fire('disconnect', 'closed');
      this.connected = false;
    }
  }

  global.io = function io() {
    const socket = new PeerSocket();
    global.__nutsSocket = socket; // 動作確認用
    return socket;
  };
  global.NutsPeerSocket = PeerSocket;
})(typeof globalThis !== 'undefined' ? globalThis : this);
