// ナッツ強盗をさがせ！ v3 — あそびかた（チュートリアル）
// 絵本のような10枚のページで、おうちのくらしのきまりを説明します。
(function (global) {
  'use strict';

  const SEEN_KEY = 'nuts-tutorial-seen-v3';
  const CH = (n) => `./assets/characters/character-${String(n).padStart(2, '0')}.png`;
  const MAP = { bedroom: './assets/maps/bedroom.webp', dining: './assets/maps/dining.webp', cloud: './assets/maps/cloud-garden.webp' };
  const GUIDE = CH(7); // 案内役「くらし係のモモ」

  // 地図の一部（中心 cx, cy）を切り抜いて表示する
  function mapCrop(area, cx, cy) {
    const px = Math.max(0, Math.min(100, (cx - 384) / 1152 * 100));
    const py = Math.max(0, Math.min(100, (cy - 216) / 648 * 100));
    return `<div class="tut-map" style="background-image:url('${MAP[area]}');background-position:${px.toFixed(1)}% ${py.toFixed(1)}%"></div>`;
  }

  const say = (text) => `<div class="tut-say"><img src="${GUIDE}" alt=""><p>${text}</p></div>`;
  const points = (items) => `<ul class="tut-points">${items.map(([icon, text]) => `<li><span>${icon}</span><span>${text}</span></li>`).join('')}</ul>`;
  const key = (k) => `<span class="tut-key">${k}</span>`;

  const PAGES = [
    {
      kicker: 'WELCOME',
      title: 'ようこそ、ちいさなおうちへ',
      art: `<div class="tut-art tut-welcome">
        ${mapCrop('bedroom', 960, 300)}
        <div class="tut-shade" style="background:linear-gradient(transparent 40%, rgba(40,90,40,0.55))"></div>
        <div class="tut-row">
          <figure><img src="${CH(9)}" alt=""><figcaption>🥜</figcaption></figure>
          <figure><img src="${CH(5)}" alt=""><figcaption>🥜</figcaption></figure>
          <figure class="suspect"><img src="${CH(2)}" alt=""><figcaption>？</figcaption></figure>
          <figure><img src="${CH(8)}" alt=""><figcaption>🥜</figcaption></figure>
          <figure><img src="${CH(1)}" alt=""><figcaption>🥜</figcaption></figure>
        </div>
        <span class="tut-chip" style="left:10px;top:10px">みんなの宝物 = ナッツ1こ</span>
      </div>`,
      text: say('ここは、ふかふかの寝床と丸太の食堂がある、ちいさなおうち。みんな、大事なナッツを1こずつ持っているよ。') + points([
        ['🥜', 'でも、この中に<b>ナッツ強盗</b>がまぎれこんでいる！'],
        ['👀', 'くらしのきまりを守りながら、だれが強盗なのか見やぶろう。'],
        ['🎭', '自分の役は、ゲームが始まると<b>自分の画面だけ</b>に出るよ。']
      ])
    },
    {
      kicker: 'MOVE',
      title: 'おうちの中をおさんぽ',
      art: `<div class="tut-art">
        ${mapCrop('dining', 900, 560)}
        <img class="tut-char tut-walker" src="${CH(9)}" alt="">
        <div class="tut-finger">👆</div>
        <div class="tut-stages">
          <div style="background-image:url('${MAP.cloud}')"><span>天空の雲庭</span></div>
          <div style="background-image:url('${MAP.dining}')"><span>丸太食堂</span></div>
          <div style="background-image:url('${MAP.bedroom}')"><span>ふかふか寝床</span></div>
        </div>
        <span class="tut-chip" style="left:10px;bottom:10px">画面を押したまま、行きたい方へ</span>
      </div>`,
      text: say('画面のどこかを押したまま、行きたい方へ指をすべらせてね。キャラクターが指の方へ歩いていくよ。') + points([
        ['👆', 'スマホ：<b>画面を押して指を動かす</b>か、左下の<b>移動スティック</b>。'],
        ['⌨️', 'パソコン：' + key('W') + key('A') + key('S') + key('D') + ' か 矢印キー。'],
        ['🚪', '部屋は3つ。<b>画面の上と下のまんなか</b>にある出入口から、となりの部屋へ行けるよ。']
      ])
    },
    {
      kicker: 'HUNGER',
      title: '歩くと、おなかがすく',
      art: `<div class="tut-art" style="background:linear-gradient(#f7e2b5,#e9c98f)">
        <span class="tut-chip" style="left:6%;top:8%">空腹度</span>
        <div class="tut-meter" style="left:24%;right:6%;top:9%"><i class="tut-hunger-fill"></i></div>
        <div class="tut-lane" style="top:30%"><img class="tut-char tut-runner-fast" src="${CH(9)}" alt=""><span class="tut-chip">おなかいっぱい</span></div>
        <div class="tut-lane" style="top:62%"><img class="tut-char tut-runner-slow" src="${CH(5)}" alt=""><span class="tut-chip" style="background:rgba(153,51,40,0.95)">空腹度100 → のろのろ</span></div>
      </div>`,
      text: say('たくさん歩くと、おなかがへっていくよ。画面の「空腹度」をよく見てね。') + points([
        ['👣', '歩いた分だけ<b>空腹度</b>が上がっていく（0〜100）。'],
        ['🐢', '空腹度が<b>100</b>になると、<b>足がおそく</b>なる（ふだんの半分くらい）。'],
        ['⚠️', 'みんなの空腹度が100になってしまうと、<b>強盗の勝ち</b>！ ごはんを忘れずに。']
      ])
    },
    {
      kicker: 'LOG & MEAL',
      title: 'ごはんの前に、丸太をカリカリ',
      art: `<div class="tut-art">
        ${mapCrop('dining', 640, 420)}
        <div class="tut-flow bad" style="top:8%"><span class="ico">🍱</span><span class="arrow">だけ</span><span class="num">空腹度 80 → 40</span><span class="tag">吸収効率：半分</span></div>
        <div class="tut-flow" style="bottom:8%"><span class="ico">🪵</span><span class="arrow">→</span><span class="ico">🍱</span><span class="num good">空腹度 80 → 0</span><span class="tag">吸収効率：最大</span></div>
      </div>`,
      text: say('ごはんは、先に丸太をかじって歯とおなかの準備をしてから食べると、ぜんぶ力になるんだよ。') + points([
        ['🍱', 'ごはんは<b>各部屋に1つずつ</b>。だれかが食べると、同じ部屋の別の場所にまた出てくるよ。'],
        ['½', 'そのまま食べると、空腹度は<b>半分しか</b>減らない（吸収効率：半分）。'],
        ['🪵', '<b>丸太食堂の大きな丸太</b>をかじってから食べると、空腹度が<b>0</b>にもどる（吸収効率：最大）。'],
        ['🔁', '丸太の効き目は<b>次の1回のごはん</b>まで。食べたら、またかじろう。']
      ])
    },
    {
      kicker: 'POWER WHEEL',
      title: '回し車が止まると、まっくら',
      art: `<div class="tut-art">
        ${mapCrop('dining', 1500, 760)}
        <span class="tut-chip" style="left:6%;top:8%"><span class="tut-spin">☸</span> 回し車</span>
        <div class="tut-meter" style="left:34%;right:6%;top:9%"><i class="tut-charge-fill"></i></div>
        <img class="tut-char" src="${CH(8)}" alt="" style="left:28%;top:44%">
        <div class="tut-shade tut-dark"></div>
      </div>`,
      text: say('おうちの明かりは、丸太食堂の回し車で作っているの。だれも回さないと、電気がなくなってしまうよ。') + points([
        ['🔋', '回し車の電気は、<b>約60秒</b>でなくなる。'],
        ['🌑', '電気がなくなると<b>停電</b>。自分のまわりの丸い範囲しか見えなくなる。'],
        ['☸', '丸太食堂の<b>右下の回し車</b>に近づいて「回す」を押すと、<b>100%</b>にもどって明かりがつく。'],
        ['👻', 'ナッツを取られた人も、回し車だけは回せるよ。']
      ])
    },
    {
      kicker: 'NUT ROBBER',
      title: 'ナッツ強盗のしわざ',
      art: `<div class="tut-art">
        ${mapCrop('bedroom', 700, 540)}
        <img class="tut-char tut-robber" src="${CH(2)}" alt="" style="left:18%;top:30%">
        <img class="tut-char" src="${CH(9)}" alt="" style="left:62%;top:30%">
        <div class="tut-nut">🥜</div>
        <div class="tut-actions">
          <div class="tut-a-steal"><span>🥜</span>奪う</div>
          <div class="tut-a-vent"><span>❧</span>通気口</div>
          <div class="tut-a-black"><span>💡</span>停電</div>
        </div>
      </div>`,
      text: say('強盗は、みんなと同じ顔をしてくらしているよ。こっそり近づいて、ナッツをねらってくるの。') + points([
        ['🥜', '強盗は近くの人のナッツを<b>奪える</b>。ただし<b>ゲーム開始から30秒</b>は奪えない。'],
        ['❧', '<b>花柄・葉っぱ柄のマット</b>は通気口。強盗だけが、ほかのマットへワープできる。'],
        ['💡', '強盗は<b>停電</b>も起こせる。回し車を回せば直るよ。'],
        ['👻', 'ナッツを取られた人は<b>みんなから見えなくなり</b>、会議にも出られない。']
      ])
    },
    {
      kicker: 'MEETING',
      title: 'あやしい！と思ったら会議',
      art: `<div class="tut-art tut-meeting">
        <span class="tut-chip" style="left:6%;top:6%">📣 緊急会議　のこり 30秒</span>
        <div class="tut-vote" style="top:26%"><img src="${CH(2)}" alt=""><div class="bar"><i style="width:80%"></i></div><span>3票</span></div>
        <div class="tut-vote" style="top:46%"><img src="${CH(5)}" alt=""><div class="bar"><i style="width:28%"></i></div><span>1票</span></div>
        <div class="tut-vote" style="top:66%"><img src="${CH(8)}" alt=""><div class="bar"><i style="width:0%"></i></div><span>0票</span></div>
        <div class="tut-hand">🤏</div>
      </div>`,
      text: say('会議では、いた場所を教え合って、強盗だと思う人に投票するよ。いちばん票が多い人は、大きな手につまみ出されちゃう！') + points([
        ['📣', '<b>ナッツを持っている人だけ</b>が「会議」を開ける。'],
        ['🗺️', '会議では「どの部屋の、どのあたりにいたか」を<b>1回だけ証言</b>できる（うそもつける）。'],
        ['🗳️', '投票で<b>いちばん多い人</b>が追放。同じ数や「だれも追放しない」が多いときは、追放なし。'],
        ['⏳', '会議のあと、しばらくは次の会議を開けないよ。']
      ])
    },
    {
      kicker: 'SPECIAL ROLES',
      title: '人数が多いと、とくべつな係も',
      art: `<div class="tut-art" style="background:#2b1d15">
        <div class="tut-roles">
          <div class="det"><span>🔎</span><b>探偵</b>近くの人をしらべて、強盗っぽさを 高・中・低 で知る（1回）</div>
          <div class="jes"><span>🎭</span><b>道化師</b>強盗の仲間。近くの人に20秒へんしん（1回）</div>
          <div class="chef"><span>🍳</span><b>料理人</b>いる場所に、ごはんを1つ置ける（1回）</div>
        </div>
      </div>`,
      text: say('4人以上なら探偵と道化師、5人以上なら料理人がいるよ。だれが何の係かは、ないしょ。') + points([
        ['🔎', '<b>探偵</b>（4人〜・キャラクター側）：結果は 高（3）・中（2）・低（1）。'],
        ['🎭', '<b>道化師</b>（4人〜・強盗側）：へんしん中は名前も姿も相手そっくり。会議では本当の姿にもどる。'],
        ['🍳', '<b>料理人</b>（5人〜・キャラクター側）：置いたごはんは、だれかが食べるまで残る。']
      ])
    },
    {
      kicker: 'HOW TO WIN',
      title: '勝ち負けのきまり',
      art: `<div class="tut-art" style="background:#2b1d15">
        <div class="tut-win">
          <div class="good"><span class="i">🏆</span><b>キャラクターの勝ち</b>会議で、強盗を<b>全員</b>追放する</div>
          <div class="evil"><span class="i">🥜</span><b>強盗の勝ち</b>・ナッツを持つ人が3人以下になる<br>・強盗以外がみんないなくなる<br>・みんなの空腹度が100になる</div>
        </div>
      </div>`,
      text: say('強盗を見つけて追い出せば、おうちは平和にもどるよ。でも、のんびりしているとナッツがどんどん減っていくから気をつけて。') + points([
        ['🏆', 'キャラクター側：会議で<b>強盗を全員</b>追放する。'],
        ['🥜', '強盗側：ナッツを持つ人が<b>3人以下</b>になる（強盗自身もふくむ）。'],
        ['🚪', '強盗側：強盗以外が<b>みんないなくなる</b>（ナッツを取られる・追放される）。'],
        ['🍽️', '強盗側：残っている全員の<b>空腹度が100</b>になる。']
      ])
    },
    {
      kicker: 'READY?',
      title: 'くらしのボタン早見表',
      art: `<div class="tut-art" style="background:#3b2618">
        <div class="tut-cheat">
          <div><span>🍱</span>食べる${key('Z')}</div>
          <div><span>🪵</span>丸太${key('X')}</div>
          <div><span>☸</span>回す${key('C')}</div>
          <div><span>📣</span>会議${key('M')}</div>
          <div><span>🥜</span>奪う${key('E')}</div>
          <div><span>❧</span>通気口${key('Q')}</div>
          <div><span>💡</span>停電${key('F')}</div>
          <div><span style="font-size:1rem">🔎🎭🍳</span>係<em class="keys">${key('R')}${key('T')}${key('G')}</em></div>
        </div>
      </div>`,
      text: say('ボタンは、近くに行くと使えるようになるよ。それじゃあ、いってらっしゃい！') + points([
        ['1️⃣', 'おさんぽしながら、<b>丸太 → ごはん</b>でおなかを守る。'],
        ['2️⃣', '<b>回し車</b>の電気が減ってきたら、だれかが回しに行く。'],
        ['3️⃣', 'あやしい動きを見たら<b>会議</b>で話し合う。'],
        ['📖', 'このページは、あとからでも「あそびかた」ボタンで見られるよ。']
      ])
    }
  ];

  let overlay = null;
  let index = 0;
  let touchStartX = null;

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'tutorialOverlay';
    overlay.className = 'tut-overlay hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'あそびかた');
    overlay.innerHTML = `
      <div class="tut-board">
        <div class="tut-head">
          <span class="tut-sign">📖 おうちのくらし手帳</span>
          <span class="tut-step" id="tutStep"></span>
          <button type="button" class="tut-close" id="tutClose" aria-label="とじる">✕</button>
        </div>
        <div class="tut-page" id="tutPage"></div>
        <div class="tut-foot">
          <button type="button" class="secondary tut-nav" id="tutPrev">← もどる</button>
          <div class="tut-dots" id="tutDots"></div>
          <button type="button" class="primary tut-nav" id="tutNext">つぎへ →</button>
        </div>
      </div>`;
    document.body.append(overlay);
    overlay.querySelector('#tutClose').addEventListener('click', close);
    overlay.querySelector('#tutPrev').addEventListener('click', () => go(index - 1));
    overlay.querySelector('#tutNext').addEventListener('click', () => (index >= PAGES.length - 1 ? close() : go(index + 1)));
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    overlay.addEventListener('touchstart', (event) => { touchStartX = event.touches[0]?.clientX ?? null; }, { passive: true });
    overlay.addEventListener('touchend', (event) => {
      if (touchStartX == null) return;
      const dx = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
      touchStartX = null;
      if (Math.abs(dx) > 60) go(index + (dx < 0 ? 1 : -1));
    }, { passive: true });
    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); go(index + 1); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); event.stopPropagation(); go(index - 1); }
      else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    }, true);
  }

  function render() {
    const page = PAGES[index];
    overlay.querySelector('#tutPage').innerHTML = `${page.art}
      <div class="tut-text">
        <p class="tut-kicker">${page.kicker}</p>
        <h2 class="tut-title">${page.title}</h2>
        ${page.text}
      </div>`;
    overlay.querySelector('#tutStep').textContent = `${index + 1} / ${PAGES.length}`;
    overlay.querySelector('#tutPrev').style.visibility = index === 0 ? 'hidden' : 'visible';
    overlay.querySelector('#tutNext').textContent = index === PAGES.length - 1 ? 'はじめる！' : 'つぎへ →';
    const dots = overlay.querySelector('#tutDots');
    dots.replaceChildren(...PAGES.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = i === index ? 'on' : '';
      dot.setAttribute('aria-label', `${i + 1}ページ目`);
      dot.addEventListener('click', () => go(i));
      return dot;
    }));
  }

  function go(next) {
    index = Math.max(0, Math.min(PAGES.length - 1, next));
    render();
  }

  function open(startAt = 0) {
    if (!overlay) build();
    index = 0;
    go(startAt);
    overlay.classList.remove('hidden');
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* 保存できなくても表示はできます。 */ }
  }

  function close() {
    if (overlay) overlay.classList.add('hidden');
  }

  function isOpen() {
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }

  function seen() {
    try { return localStorage.getItem(SEEN_KEY) === '1'; } catch { return false; }
  }

  global.NutsTutorial = { open, close, isOpen, seen, pageCount: PAGES.length };
})(typeof globalThis !== 'undefined' ? globalThis : this);
