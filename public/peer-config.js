// ナッツ強盗をさがせ！ PeerJS版 v3 — 通信の設定
// ふだんは変更不要です。
(function (global) {
  'use strict';
  global.NUTS_PEER_CONFIG = {
    // スマホ用QRコードに入れる公開URL（末尾の / まで）。
    // 空欄なら、今開いているページのURLを自動で使います（GitHub Pagesならそのままで動きます）。
    // 例: 'https://ユーザー名.github.io/nuts-robber/public/'
    publicUrl: '',

    // PeerJSのID（部屋番号の前に付ける文字）。他のアプリと重ならない名前にします。
    idPrefix: 'nuts-robber-v3-',

    // PeerJSの接続先サーバー。null なら PeerJS の無料公開サーバー（0.peerjs.com）を使います。
    // 自分でサーバーを立てた場合の例: { host: 'example.com', port: 443, path: '/', secure: true }
    // テスト用に URL へ ?peerHost=localhost&peerPort=9000 を付けても切り替えられます。
    server: null,

    // 接続確認（ハートビート）
    pingMs: 2000,     // この間隔で生存確認を送る
    timeoutMs: 9000   // この時間応答がなければ切断とみなす
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
