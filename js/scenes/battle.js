// =====================================================================
// שלב 6: מסך הקרב – לפי "חוקי קרב v1" (game-design) ו-battle_screen.html / art-ui.md.
// גנרי: האויב מוגדר בנתונים (ספרייט, חיים, חולשה, דפוס כוונות, רקע). המהלכים – 4 המהלכים שבתיק של מאי.
// BattleScene.start(key, { onWin, onLose, onFlee }) ← בסוף הקרב נקראת אחת מהן, והיא מחליטה לאן חוזרים.
// =====================================================================

const FLAV = { salty: { he: 'מלוח', ic: 'salt' }, sweet: { he: 'מתוק', ic: 'choc' }, spicy: { he: 'חריף', ic: 'fire' }, plain: { he: 'בלי טעם' } };

// המהלכים והאויבים (כולל כל המספרים) מוגדרים ב-js/config.js
const MOVES = CFG.moves;
const ENEMIES = CFG.enemies;
// נישנושים אגדיים (כפתור הזהב). המספרים ב-CFG.legendary; האינדקס = הסדר ב-Save.state.legendary
const LG = CFG.legendary;
const LEGENDARY = [
  { he: 'פופקורן', ic: 'popcorn', d: 'שלוש פגיעות מלוחות',
    run: async B => { for (let i = 0; i < LG.popcorn.hits && B.S.en.cur > 0; i++) { const { d, weak } = B.dmgTo(LG.popcorn.pow, 'salty', { noLevel: true }); await B.damageEnemy(d, weak, null, { big: true, quiet: i > 0 }); await wait(120); } } },
  { he: 'תפוצ׳יפס', ic: 'chips', d: `<bdi>${LG.chips.pow}</bdi> נזק מלוח, דרך הגנה`,
    run: async B => { const { d, weak } = B.dmgTo(LG.chips.pow, 'salty', { noLevel: true, pierce: true, noBoost: true }); await B.damageEnemy(d, weak, 'התפוצ׳יפס', { big: true, pierce: true }); } },
];
// כל התמונות של הקרב (לפי האויבים בהגדרות)
const BATTLE_IMAGES = () => {
  const l = new Set(['irit_tray']);
  for (const k in ENEMIES) { const E = ENEMIES[k]; [E.spr, E.spr2, E.bg].forEach(n => n && l.add(n)); }
  return [...l];
};

const INTENT_IC = { atk: 'sword', def: 'shield', charge: 'charge', burn: 'fire', heal: 'leaf' };
const BMAI = { x: 100, foot: 198 }, BENE = { x: 360, foot: 124 };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ספרות נזק בפיקסלים (חלק מהאיור, לא טקסט ממשק)
const DIG = {
  '0': '01110100011001110101110011000101110', '1': '00100011000010000100001000010001110', '2': '01110100010000100010001000100011111',
  '3': '11110000010000101110000010000111110', '4': '00010001100101010010111110001000010', '5': '11111100001111000001000011000101110',
  '6': '00110010001000011110100011000101110', '7': '11111000010001000100010000100001000', '8': '01110100011000101110100011000101110',
  '9': '01110100011000101111000010001001100', '-': '00000000000000011111000000000000000', '+': '00000001000010011111001000010000000' };
function pixNum(txt, cx, y, col, s) {
  const adv = 6 * s, w = txt.length * adv - s, x0 = Math.round(cx - w / 2);
  const plot = (ox, oy, c) => { ctx.fillStyle = c; [...txt].forEach((ch, i) => { const m = DIG[ch]; if (!m) return;
    for (let k = 0; k < 35; k++) if (m[k] === '1') ctx.fillRect(x0 + i * adv + (k % 5) * s + ox, y + ((k / 5) | 0) * s + oy, s, s); }); };
  for (const [ox, oy] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [1, 2], [0, 2]]) plot(ox, oy, '#3A2618');
  plot(0, 0, col);
}
// הבהוב: עותק צבוע של ספרייט (לבן/אדום), נשמר בזיכרון
const _tint = {};
function tinted(name, col) {
  const k = name + col; if (_tint[k]) return _tint[k];
  const img = Assets.get(name); if (!img) return null;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = col; g.fillRect(0, 0, c.width, c.height);
  return (_tint[k] = c);
}

const BattleScene = {
  id: 'battle', countsTime: true,

  start(key, opts) { this.key = key; this.opts = opts || {}; Game.goClean(this); },

  enter() {
    const st = Save.state, E = ENEMIES[this.key];
    const C = CFG.crunch, crunch0 = C.start + (st.level >= CFG.levels.crunchLevel ? 1 : 0) + (st.accessories.includes('pouch') ? CFG.accessories.pouch.crunch : 0);
    this.S = {
      mai: { hp: Math.min(st.hp, Stats.maxHp(st)), max: Stats.maxHp(st), crunch: Math.min(C.max, crunch0), snack: st.decor.includes('lava') ? CFG.decor.lava.snack : 0,
             guard: false, boost: false, burn: 0, spr: 'mai3_idle', roga: st.rugelach },
      en: { ...E, cur: E.hp, step: 0, alive: true, phase: 1, burn: 0, sprNow: E.spr },
      busy: false, over: false, pop: false, iritUsed: false, arrow: null,
      fx: { shake: 0, amp: 2, flash: null, mOff: 0, eOff: 0, nums: [], burst: null, dis: null, bounce: 0, fade: 1, irit: null },
    };
    this.bid = (this.bid || 0) + 1;
    this.build();
    this.dy = 0; Screen.onFit = () => { this.layoutShift(); this.render(); };
    const en = this.S.en;
    if (en.boss) { this.msg(`${en.he} ${en.wait || 'מחכה'}. מבוס לא בורחים!`); setTimeout(() => this.say('מה יש בזה?', 'mai', 1800), 450); }
    else this.msg(`${en.he} ${this.v('חוסם', 'חוסמת')} את הדרך!`);
    this.layoutShift(); this.render();
    if (!en.boss) this.tutStart();
  },
  exit() { this.L.unmount(); if (Screen.onFit) Screen.onFit = null; },
  // במסך נמוך (טלפון) התפריט מכסה יותר מהעולם: מזיזים את כל הזירה למעלה (עד 24px עולם),
  // כך שהרגליים של מאי נשארות מעל התפריט. השמיים למעלה נחתכים קצת.
  layoutShift() {
    const m = this.L.q('.menu'); if (!m) return;
    const top = (Screen.toUI(0, m.getBoundingClientRect().top).y - Screen.wy0) / Screen.k;   // ראש התפריט, ביחידות עולם
    // בוס גבוה: מזיזים פחות, כדי שהפנים שלו לא ייכנסו מתחת ללוחות שלמעלה
    this.dy = clamp(Math.ceil(BMAI.foot + 3 - top), 0, this.eh() > 90 ? 12 : 24);
  },
  wy(y) { return uy(y - (this.dy || 0)) + 'px'; },

  // ---------------- הדרכה (פתיחה וסוף v1 / ג): 3 בועות בקרב הראשון, כל אחת פעם אחת ----------------
  tutStart() {
    const f = Save.state.flags, E = this.S.en, he = E.g === 'm';
    if (f.tut1) return;
    const bid = this.bid;
    setTimeout(() => {
      if (Game.scene !== this || this.bid !== bid || this.S.over) return;
      f.tut1 = true; this.tip(he ? 'תראי מה הוא מתכנן' : 'תראי מה היא מתכננת', this.L.q('.intent'), 'above');
      setTimeout(() => {
        if (Game.scene !== this || this.bid !== bid || this.S.busy || this.S.over || f.tut2) return;
        const i = this.slots.findIndex(m => m && MOVES[m].pow && MOVES[m].flav === E.weak);
        if (i < 0) return;
        f.tut2 = true;
        const fl = FLAV[E.weak].he, mv = MOVE_NAMES[this.slots[i]];
        this.tip(`${mv} ${fl}, ו${he ? 'הוא לא סובל' : 'היא לא סובלת'} מ${fl}`, this.L.q(`[data-k="mv${i}"]`), 'above', true);
      }, 2400);
    }, 1300);
  },
  // הבועה השלישית: בפעם הראשונה שאויב "מתכונן" (💢)
  tutCharge() {
    const f = Save.state.flags, S = this.S;
    if (f.tut3 || S.busy || S.over || this.intentOf().t !== 'charge') return;
    const i = this.slots.indexOf('cuddle'); if (i < 0) return;
    f.tut3 = true;
    this.tip(`${S.en.g === 'm' ? 'הוא מתכונן' : 'היא מתכוננת'} למכה חזקה, תתכרבלי!`, this.L.q(`[data-k="mv${i}"]`), 'above', true);
  },
  // בועת הדרכה ליד אלמנט בממשק. נשארת עד הפעולה הבאה של מאי
  tip(text, anchor, where = 'above', keep) {
    if (!anchor) return;
    if (!keep) this.clearTips();
    const r = anchor.getBoundingClientRect(), p = Screen.toUI(r.left + r.width / 2, where === 'below' ? r.bottom : r.top);
    const x = p.x, y = where === 'below' ? p.y + 70 : p.y - 8;
    const b = document.createElement('div'); b.className = 'say tut' + (where === 'below' ? ' up' : ''); b.textContent = text;
    b.style.left = clamp(x, 110, Screen.uw - 110) + 'px'; b.style.top = y + 'px';
    this.L.q('.battle').appendChild(b);
  },
  clearTips() { this.L.el.querySelectorAll('.say.tut').forEach(e => e.remove()); },

  // ---------------- HTML ----------------
  build() {
    const st = Save.state;
    this.L = Layer(`<div class="battle">
      <div class="panel stat ehud">
        <div class="head"><span class="name"></span><span class="tag eweak"></span></div>
        <div class="meter"><span class="lbl">חיים</span><div class="bar ebar"><i></i></div><bdi class="val ehp" dir="ltr"></bdi></div>
      </div>
      <div class="intent"></div>
      <div class="panel stat mhud">
        <div class="head"><span class="name">מאי</span><span class="sub">רמה <bdi>${st.level}</bdi></span></div>
        <div class="meter"><span class="lbl">חיים</span><div class="bar mbar"><i></i></div><bdi class="val mhp" dir="ltr"></bdi></div>
        <div class="meter"><span class="lbl">קראנץ׳</span><div class="pips"></div><bdi class="val mcr" dir="ltr"></bdi></div>
        <div class="meter"><span class="lbl">מד נישנושים</span><div class="bar snack sbar"><i></i></div><bdi class="val msn" dir="ltr"></bdi></div>
      </div>
      <div class="panel menu"><div class="moves"></div><div class="items"></div><div class="msg"></div></div>
      <div class="panel rogaPop" hidden></div>
      <div class="specialWrap"></div>
      <div class="panel result" hidden></div>
    </div>`, { screen: true }).mount();
    const L = this.L;
    // 4 משבצות מהלכים (מהתיק של מאי)
    const slots = this.slots = [0, 1, 2, 3].map(i => st.moves[i]);   // המהלכים של הקרב הזה (גם אם נפתח מהלך חדש בסופו)
    L.q('.moves').innerHTML = slots.map((id, i) => {
      if (!id) return act({ k: 'mv' + i, title: 'משבצת ריקה', desc: 'מהלכים חדשים: ברמות ובשקיות', ic: 'star', cls: 'empty', disabled: true });
      const m = MOVES[id];
      return act({ k: 'mv' + i, ic: m.ic || 'star', flav: m.flav, title: MOVE_NAMES[id], desc: this.moveDesc(m),
        side: `<span class="cost">${m.cost ? Array(m.cost).fill(icon('crunch')).join('') : '<span class="free">חינם</span>'}</span><span class="tag adv" data-adv hidden>סופר יעיל</span>` });
    }).join('');
    slots.forEach((id, i) => id && L.on('mv' + i, () => this.playerMove(id)));
    L.q('.items').innerHTML = act({ k: 'roga', ic: 'rugelach', title: 'רוגלך', desc: ' ' }) + act({ k: 'flee', ic: 'flee', title: 'בריחה', desc: 'תמיד מצליחה' });
    L.on('roga', () => this.togglePop()).on('flee', () => this.flee());
    const choc = st.oven.includes('choc'), RG = CFG.rugelach, OV = CFG.oven.choc;
    L.q('.rogaPop').innerHTML = act({ k: 'eat', ic: 'rugelach', flav: 'sweet', title: 'לאכול', desc: `מחזיר <bdi>${choc ? OV.eat : RG.eat}</bdi> חיים` }) +
                                 act({ k: 'throw', ic: 'rugelach', flav: 'sweet', title: 'לזרוק', desc: `<bdi>${choc ? OV.throw : RG.throw}</bdi> נזק` });
    L.on('eat', () => this.eat()).on('throw', () => this.throwR());
    // כפתור הזהב: הנישנוש האגדי (רק כשיש כבר אחד ביד)
    // (כשיש כמה – כפתור לכל אחד, והיא בוחרת. העיצוב לבחירה עוד פתוח בשיחת העיצוב)
    const legs = [...st.legendary].sort((a, b) => b - a).map(i => [i, LEGENDARY[i]]).filter(([, l]) => l);
    L.q('.specialWrap').innerHTML = legs.map(([i, l]) => act({ k: 'special' + i, ic: l.ic, title: l.he, desc: l.d, cls: 'special', side: '<span class="tag adv">מוכן</span>' })).join('');
    for (const [i, l] of legs) L.on('special' + i, () => this.special(l));
    this.blinkT = 0;
  },

  moveDesc(m) {
    if (m.d) return m.d;
    const parts = [];
    if (m.pow) parts.push(`<bdi>${m.pow + Math.floor(Save.state.level / CFG.mai.levelBonusDiv)}</bdi> נזק`);
    if (m.heal) parts.push(`מרפא <bdi>${m.heal}</bdi>`);
    if (m.burn) parts.push(`שורף <bdi>${this.burnOf(m.burn)}</bdi>`);
    if (m.pierce) parts.push('שובר הגנה');
    parts.push(FLAV[m.flav].he);
    return parts.join(' · ');
  },

  msg(html) { this.L.q('.msg').innerHTML = `<span>${html}</span>`; },
  eh() { const im = Assets.get(this.S.en.sprNow); return im ? im.height : 40; },
  say(text, who, ms = 1300) {
    const b = document.createElement('div'); b.className = 'say bt'; b.dir = 'auto'; b.textContent = text;
    const p = who === 'mai' ? (Screen.compact ? { x: BMAI.x + 66, y: BMAI.foot - 62 } : { x: BMAI.x, y: BMAI.foot - 108 }) : who === 'irit' ? { x: 46, y: BMAI.foot - 104 }
      : this.eh() > 90 ? { x: BENE.x - 40, y: BENE.foot - this.eh() + 30 } : { x: BENE.x, y: BENE.foot - this.eh() - 10 };
    b.style.left = ux(p.x) + 'px'; b.style.top = this.wy(p.y); this.L.q('.battle').appendChild(b); if (ms) setTimeout(() => b.remove(), ms);
  },
  intentOf() { const E = this.S.en; return E.pattern[E.step % E.pattern.length]; },

  setBar(sel, v, max, hp = true) {
    const p = Math.max(0, v / max), el = this.L.q(sel); el.querySelector('i').style.width = (p * 100) + '%';
    if (hp) { el.classList.toggle('mid', p <= .5 && p >= .3); el.classList.toggle('low', p < .3); }
  },
  render() {
    const S = this.S, E = S.en, M = S.mai, L = this.L, q = s => L.q(s);
    q('.ehud .name').textContent = E.he;
    q('.eweak').innerHTML = `${icon(FLAV[E.weak].ic || 'salt')}חולשה: ${FLAV[E.weak].he}`;
    this.setBar('.ebar', E.cur, E.hp); q('.ehp').textContent = `${Math.max(0, E.cur)}/${E.hp}`;
    this.setBar('.mbar', M.hp, M.max); q('.mhp').textContent = `${Math.max(0, M.hp)}/${M.max}`;
    q('.mhud').classList.toggle('low', M.hp / M.max < .3 && M.hp > 0);
    q('.pips').innerHTML = [...Array(CFG.crunch.max).keys()].map(i => icon(i < M.crunch ? 'crunch' : 'crunchOff')).join(''); q('.mcr').textContent = `${M.crunch}/${CFG.crunch.max}`;
    const sn = Math.min(100, Math.round(M.snack)); this.setBar('.sbar', sn, 100, false); q('.msn').textContent = `${sn}%`;
    // בועת הכוונה
    const it = this.intentOf(), ib = q('.intent'), danger = it.t === 'charge' || it.t === 'burn' || (it.t === 'atk' && it.v >= 6);
    ib.innerHTML = icon(INTENT_IC[it.t]) + (it.v ? `<bdi>${it.v}</bdi>` : '');
    ib.className = 'intent' + (danger ? ' danger' : ''); ib.style.display = E.alive && !S.over ? 'flex' : 'none';
    if (this.eh() > 90) { ib.style.left = ux(BENE.x - 108) + 'px'; ib.style.top = this.wy(BENE.foot - (Screen.compact ? 34 : 96)); }
    else if (Screen.compact) { ib.style.left = ux(BENE.x - 74) + 'px'; ib.style.top = this.wy(BENE.foot - 34); }   // בטלפון: משמאל לירק (הלוחות למעלה)
    else { ib.style.left = ux(BENE.x + 26) + 'px'; ib.style.top = this.wy(BENE.foot - this.eh() - 22); }
    // כפתורים
    const locked = S.busy || S.over;
    this.slots.forEach((id, i) => {
      const b = L.q(`[data-k="mv${i}"]`); if (!b || !id) return; const m = MOVES[id];
      b.disabled = locked || M.crunch < m.cost;
      b.querySelector('[data-adv]').hidden = !(m.pow && m.flav === E.weak);
    });
    const rb = L.q('[data-k="roga"]'); rb.querySelector('.d').innerHTML = M.roga ? `נותרו <bdi>${M.roga}</bdi>` : 'נגמר';
    rb.disabled = locked || M.roga <= 0; rb.classList.toggle('sel', S.pop);
    const fb = L.q('[data-k="flee"]'); fb.disabled = locked || !!E.boss; fb.querySelector('.d').textContent = E.boss ? 'לא בקרב בוס' : 'תמיד מצליחה';
    const pop = q('.rogaPop'); pop.hidden = !(S.pop && !locked);
    if (!pop.hidden) { const r = rb.getBoundingClientRect(); pop.style.left = (Screen.toUI(r.right, 0).x - 280) + 'px'; }
    L.el.querySelectorAll('.special').forEach(sp => { sp.hidden = !(M.snack >= 100 && !S.over); sp.disabled = locked; });
    L.focus.refresh(S.pop && !locked ? 'eat' : undefined);
  },

  // ---------------- חוקי הקרב ----------------
  // נזק = כוח + רמה÷2 ← ×2 חולשת בוס / ×1.5 חולשה של ירק ← ×1.5 משקפיים ← −50% אם האויב בהגנה
  dmgTo(pow, flav, o = {}) {
    const st = Save.state, S = this.S;
    const X = CFG.mult;
    let d = pow + (o.noLevel ? 0 : Math.floor(st.level / CFG.mai.levelBonusDiv)) + (flav === 'salty' && st.accessories.includes('salt_shaker') ? CFG.accessories.salt_shaker.salty : 0);
    const weak = flav === S.en.weak;
    if (weak) d = Math.floor(d * this.weakMult());
    if (S.mai.boost && !o.noBoost) d = Math.floor(d * X.boost);
    if (this.intentOf().t === 'def' && !o.pierce) d = Math.floor(d * X.defense);
    return { d, weak };
  },
  // מילה בזכר / בנקבה לפי האויב (g: 'm' בהגדרות)
  v(m, f) { return this.S.en.g === 'm' ? m : f; },
  weakMult() { const E = this.S.en; return E.mult || (E.boss ? CFG.mult.weakBoss : CFG.mult.weakVeg); },
  burnOf(b) { return b + (Save.state.accessories.includes('red_polish') ? CFG.accessories.red_polish.burn : 0); },
  snackGain(n) { const LV = CFG.levels; this.S.mai.snack = Math.min(100, this.S.mai.snack + n * (Save.state.level >= LV.snackLevel ? LV.snackLevelMult : 1)); },

  async playerMove(id) {
    const S = this.S, M = S.mai, m = MOVES[id];
    if (S.busy || S.over || M.crunch < m.cost) return;
    S.busy = true; S.pop = false; M.crunch -= m.cost; this.clearTips(); this.render();
    if (m.guard) { M.guard = true; M.spr = 'mai3_cuddle'; this.msg('מאי נעלמת לתוך הסווטשירט.'); this.burst(BMAI.x, BMAI.foot - 50, '#C9CBCE', 320); await wait(650); }
    else if (m.boost) { M.boost = true; M.spr = 'mai3_glasses'; this.say('רק שאני לא אאבד אותם', 'mai', 1500); this.burst(BMAI.x, BMAI.foot - 80, '#9C8CC4', 320); this.msg('המשקפיים ירדו לעיניים. המהלך הבא חזק פי <bdi>1.5</bdi>.'); await wait(950); }
    else {
      const name = MOVE_NAMES[id];
      if (m.pow) {
        this.msg(`מאי זורקת ${name}!`); await this.lunge('mai');
        const { d, weak } = this.dmgTo(m.pow, m.flav, { pierce: m.pierce });
        this.endBoost();
        await this.damageEnemy(d, weak, name);
        if (m.burn && S.en.cur > 0) { S.en.burn = this.burnOf(m.burn); this.msg(`${S.en.he} עולה באש!`); await wait(400); }
      }
      if (m.heal) {
        const h = Math.min(m.heal + (Save.state.accessories.includes('choc_bracelet') && m.flav === 'sweet' ? CFG.accessories.choc_bracelet.heal : 0), M.max - M.hp);
        M.hp += h; if (!m.pow) { this.msg(`${name}! מאי מרגישה טוב יותר.`); this.endBoost(); }
        await this.hit('mai', h, { heal: true }); this.render(); await wait(300);
      }
    }
    if (await this.checkEnd()) return;
    await this.enemyTurn();
  },
  endBoost() { const M = this.S.mai; if (M.boost) { M.boost = false; if (M.spr === 'mai3_glasses') M.spr = 'mai3_idle'; } },

  async damageEnemy(d, weak, what, o = {}) {
    const E = this.S.en; E.cur -= d; this.snackGain(weak ? CFG.snack.weakHit : CFG.snack.hit);
    const def = this.intentOf().t === 'def' && !o.pierce;
    if (!o.quiet) this.msg(weak ? `סופר יעיל! ${what || 'הפגיעה'} פוגע${what ? '' : 'ת'} ב${E.he}.` : def ? `${E.he} ${this.v('מתגונן', 'מתגוננת')}. הנזק נחתך בחצי.` : `${what || 'הפגיעה'} פוגע${what ? '' : 'ת'} ב${E.he}.`);
    await this.hit('en', d, { weak, big: o.big }); this.render(); await wait(300); await this.maybePhaseTwo();
  },
  async maybePhaseTwo() {
    const E = this.S.en, F = this.S.fx;
    if (!E.boss || E.phase === 2 || E.cur <= 0 || E.cur > E.hp / 2) return;
    E.phase = 2; this.msg(`${E.he} ${E.p2msg}`); F.shake = 700; F.amp = 4;
    for (let i = 0; i < 4; i++) { F.flash = { who: 'en', mode: '#ffffff' }; await wait(70); F.flash = null; await wait(70); }
    E.sprNow = E.spr2; E.pattern = E.pattern2; E.step = 0; this.burst(BENE.x, BENE.foot - 60, E.p2col, 600); this.render();
    this.say(E.p2say, 'en', 1400); await wait(1000); this.msg(`שלב 2, "${E.p2name}": המכות חזקות יותר.`); await wait(700);
  },

  async enemyTurn() {
    const S = this.S, E = S.en, M = S.mai;
    S.arrow = 'en'; this.render(); await wait(450);
    // שריפה על האויב: נזק בתחילת התור שלו (החולשה חלה גם עליה)
    if (E.burn) {
      let d = E.burn; if (E.weak === 'spicy') d = Math.floor(d * this.weakMult()); E.burn = 0;
      E.cur -= d; this.msg(`${E.he} ${this.v('נשרף', 'נשרפת')}.`); await this.hit('en', d, {}); this.render(); await wait(300);
      if (await this.checkEnd()) return;
    }
    const it = this.intentOf(), X = CFG.mult;
    if (it.t === 'atk' || it.t === 'burn') {
      this.msg(it.t === 'burn' ? `${E.he} ${this.v('מצית', 'מציתה')}! מאי נפגעת ונשרפת.` : `${E.he} ${this.v('תוקף', 'תוקפת')}!`); await this.lunge('en');
      let d = it.v; if (M.guard) d = Math.ceil(d * X.guard);
      M.hp -= d; this.snackGain(CFG.snack.hurt); this.say('איכ לא', 'mai', 900);
      if (it.t === 'burn') this.burst(BMAI.x, BMAI.foot - 50, '#E2231A', 300);
      await this.hit('mai', d, { big: d >= 6 });
      // מצית: השריפה נדלקת עכשיו, והנזק שלה בתחילת התור של מאי (הסווטשירט חוצה גם אותה)
      if (it.t === 'burn') { const b = it.burn != null ? it.burn : Math.ceil(it.v / 2); M.burn = M.guard ? Math.ceil(b * X.guard) : b; }
    } else if (it.t === 'def') { this.msg(`${E.he} ${this.v('מתכנס', 'מתכנסת')} מאחורי מגן.`); this.burst(BENE.x, BENE.foot - 24, '#8FB8E8', 300); await wait(550); }
    else if (it.t === 'charge') { this.msg(`${E.he} ${this.v('אוסף', 'אוספת')} כוח. המכה הבאה תהיה חזקה.`); for (let i = 0; i < 3; i++) { S.fx.flash = { who: 'en', mode: '#ff3b3b' }; await wait(80); S.fx.flash = null; await wait(80); } }
    else if (it.t === 'heal') { const h = Math.min(it.v, E.hp - E.cur); E.cur += h; this.msg(`${E.he} ${this.v('אוכל', 'אוכלת')} סופר-פוד.`); await this.hit('en', h, { heal: true }); }
    E.step++; M.guard = false; if (M.spr === 'mai3_cuddle') M.spr = M.boost ? 'mai3_glasses' : 'mai3_idle';
    // שריפה על מאי: בתחילת התור שלה
    if (M.burn && M.hp > 0) { const d = M.burn; M.burn = 0; this.render(); await wait(350); M.hp -= d; this.msg(`מאי נשרפת: <bdi>${d}</bdi> נזק.`); await this.hit('mai', d, {}); await wait(250); }
    M.crunch = Math.min(CFG.crunch.max, M.crunch + CFG.crunch.perTurn); S.arrow = null; this.render();
    if (await this.checkEnd()) return;
    if (E.boss && !S.iritUsed && M.hp / M.max < CFG.rugelach.iritBelow) await this.iritHelps();
    S.busy = false; this.msg('מה מאי עושה?'); this.render(); this.tutCharge();
  },

  // אמא מצילה – פעם אחת בקרב בוס, מתחת ל-30% חיים
  async iritHelps() {
    const S = this.S, M = S.mai; S.iritUsed = true; S.fx.irit = { x: -40 };
    for (let x = -40; x <= 34; x += 6) { S.fx.irit.x = x; await wait(16); }
    this.say('קחי רוגלך, מאמי!', 'irit', 1600); this.msg('אמא הגיעה עם רוגלך!'); await wait(700);
    const h = Math.min(CFG.rugelach.iritHeal, M.max - M.hp); M.hp += h; this.burst(BMAI.x, BMAI.foot - 50, '#E0A45A', 400); await this.hit('mai', h, { heal: true }); this.render(); await wait(900);
    for (let x = 34; x >= -50; x -= 8) { S.fx.irit.x = x; await wait(16); } S.fx.irit = null;
  },

  togglePop() { const S = this.S; if (S.busy || S.over) return; this.clearTips(); S.pop = !S.pop; this.render(); },
  async eat() {
    const S = this.S, M = S.mai; if (S.busy || M.roga <= 0) return;
    S.busy = true; S.pop = false; M.roga--; const h = Math.min(Save.state.oven.includes('choc') ? CFG.oven.choc.eat : CFG.rugelach.eat, M.max - M.hp); M.hp += h;
    this.msg('מאי אוכלת רוגלך של אמא.'); await this.hit('mai', h, { heal: true }); this.render(); await wait(500); await this.enemyTurn();
  },
  async throwR() {
    const S = this.S, M = S.mai; if (S.busy || M.roga <= 0) return;
    S.busy = true; S.pop = false; M.roga--; this.render(); this.msg('מאי זורקת רוגלך!'); await this.lunge('mai');
    let d = Save.state.oven.includes('choc') ? CFG.oven.choc.throw : CFG.rugelach.throw; if (this.intentOf().t === 'def') d = Math.floor(d * CFG.mult.defense);
    await this.damageEnemy(d, false, 'הרוגלך'); if (await this.checkEnd()) return; await this.enemyTurn();
  },
  async special(leg) {
    const S = this.S; if (S.busy || S.over || S.mai.snack < 100) return;
    S.busy = true; S.pop = false; S.mai.snack = 0; this.render(); this.msg(`${leg.he}! ${leg.d}.`);
    this.burst(BENE.x, BENE.foot - 22, '#FFE58A', 550); await wait(200);
    await leg.run(this);
    if (await this.checkEnd()) return; await this.enemyTurn();
  },
  async flee() {
    const S = this.S; if (S.busy || S.over || S.en.boss) return;
    S.busy = true; S.over = true; S.pop = false; this.clearTips(); this.render(); this.msg('מאי בורחת.');
    for (let i = 0; i < 8; i++) { S.fx.mOff -= 6; await wait(30); }
    this.finish('flee');
  },

  async checkEnd() {
    const S = this.S, E = S.en, M = S.mai;
    if (E.cur <= 0 && E.alive) {
      E.alive = false; S.over = true; this.render(); this.startDissolve(); this.msg(`${E.he} ${this.v('התפורר', 'התפוררה')}.`); await wait(900);
      S.fx.bounce = 700; this.say(E.boss ? 'תבכי, זה לא מרגש אותי' : 'מה יש בזה?', 'mai', 2400); await wait(1400);
      this.win(); return true;
    }
    if (M.hp <= 0) {
      S.over = true; this.render(); for (let a = 1; a >= .2; a -= .1) { S.fx.fade = a; await wait(60); }
      this.say('מה אמרתי? מה ענית?', 'mai', 2400); await wait(1200);
      this.result('פסילה', 'חוזרים לליזי האחרונה, עם כל הניסיון.', '', 'לליזי', () => this.finish('lose'));
      return true;
    }
    return false;
  },

  // ניצחון: ניסיון וסיגריות (+10% קיר תמונות, +1 מקרר), עלייה ברמה, נישנוש אגדי מבוס
  win() {
    const st = Save.state, E = this.S.en;
    const xp = Math.round(E.xp * (1 + (st.decor.includes('photos') ? CFG.decor.photos.xp : 0))), cigs = E.cigs + (st.decor.includes('fridge') ? CFG.decor.fridge.cigs : 0);
    st.hp = Math.max(1, this.S.mai.hp); st.rugelach = this.S.mai.roga;
    const up = gainXp(xp);
    gainCigs(cigs, t => setTimeout(() => { if (Game.scene === this) this.say(t, 'mai', 1600); }, 2600));   // אחרי המשפט של הניצחון
    let rewards = `<span><bdi dir="ltr">+${xp}</bdi> ניסיון</span><span>${icon('cig')}<bdi dir="ltr">+${cigs}</bdi></span>`;
    if (up) rewards += `<span>רמה <bdi>${up.level}</bdi>!</span>` + up.moves.map(m => `<span class="legend">מהלך חדש: ${MOVE_NAMES[m]}</span>`).join('');
    if (E.boss) {
      const leg = LEGENDARY[E.legendary];
      rewards = `<span class="legend">${icon(leg.ic)}${leg.he}</span>` + rewards;
      const nth = ['הראשון', 'השני', 'השלישי', 'הרביעי', 'החמישי'][st.legendary.length] || '';
      this.result('ניצחון על הבוס!', `${WORLD_NAMES[E.world]} שוחררה. הנישנוש האגדי ${nth} שלך:`, rewards, 'חזרה למטבח', () => this.finish('win'));
    } else this.result('ניצחון', `${E.he} כבר לא ${this.v('חוסם', 'חוסמת')} את הדרך.`, rewards, 'ממשיכים', () => this.finish('win'));
  },
  result(title, text, rewards, btn, fn) {
    const r = this.L.q('.result');
    r.innerHTML = `<h2>${title}</h2><p>${text}</p>${rewards ? `<div class="rewards">${rewards}</div>` : ''}${act({ k: 'go', title: btn })}`;
    r.hidden = false; this.L.on('go', fn); this.S.busy = false; this.render(); this.L.focus.refresh('go');
  },
  // סוף הקרב: שומרים את מה שנשאר ומחזירים את השליטה למי שפתח את הקרב
  finish(how) {
    if (this._done) return; this._done = true;
    const st = Save.state;
    if (how !== 'win') { st.hp = Math.max(1, this.S.mai.hp); st.rugelach = this.S.mai.roga; }
    const cb = { win: this.opts.onWin, lose: this.opts.onLose, flee: this.opts.onFlee }[how];
    setTimeout(() => { this._done = false; }, 600);
    cb && cb();
  },

  // ---------------- אנימציה ----------------
  async lunge(who) { const k = who === 'mai' ? 'mOff' : 'eOff', dir = who === 'mai' ? 1 : -1; for (const v of [1, 2, 3, 4, 4, 2, 0]) { this.S.fx[k] = v * dir; await wait(28); } },
  async hit(who, n, o = {}) {
    const F = this.S.fx, p = who === 'mai' ? { x: BMAI.x, y: BMAI.foot - 80 } : { x: BENE.x, y: Math.max(10, BENE.foot - this.eh() - 26) };
    F.nums.push({ txt: (o.heal ? '+' : '-') + n, x: p.x, y: p.y, col: o.heal ? '#7CF07C' : o.weak ? '#FFE066' : '#FFFFFF', s: o.weak ? 3 : 2, t: 0 });
    if (o.heal) return;
    Sound.tone(o.big ? 160 : 220, 0.12, 'square', 0.05, -60);
    F.shake = o.big ? 260 : 170; F.amp = o.big ? 3 : 2;
    for (const m of ['#ffffff', null, '#ff3b3b', null, '#ffffff', null]) { F.flash = m ? { who, mode: m } : null; await wait(45); }
  },
  burst(x, y, col, dur = 450) {
    const parts = [], cols = [col, '#FFF4C2', '#FFFFFF'];
    for (let i = 0; i < 34; i++) parts.push({ a: Math.random() * Math.PI * 2, sp: .4 + Math.random() * .9, c: cols[i % 3] });
    this.S.fx.burst = { x, y, col, dur, t: 0, parts };
  },
  // התפוגגות לפיקסלים מלמטה למעלה (בלי getImageData – עובד גם מ-file://)
  startDissolve() {
    const name = this.S.en.sprNow, img = Assets.get(name); if (!img) return;
    const ox = Math.round(BENE.x - img.width / 2), oy = Math.round(BENE.foot - img.height), parts = [];
    for (let y = 0; y < img.height; y += 2) for (let x = 0; x < img.width; x += 2)
      parts.push({ sx: x, sy: y, x: ox + x, y: oy + y, delay: (img.height - y) * 9 + Math.random() * 260, vx: (Math.random() * 2 - 1) * .02, vy: -.01 - Math.random() * .03 });
    this.S.fx.dis = { img, parts, t: 0 };
  },

  update(dt) {
    if (Input.was('b') && this.S.pop) { Sound.back(); this.S.pop = false; this.render(); return; }
    this.L.focus.update();
    // מסגרת לוח מאי מהבהבת בחיים נמוכים
    this.blinkT += dt; if (this.blinkT > .4) { this.blinkT = 0; const h = this.L.q('.mhud'); if (h.classList.contains('low')) h.classList.toggle('blink'); }
  },

  draw(t) {
    const S = this.S, F = S.fx, T = t * 1000, dt = 16;
    let sx = 0, sy = 0; if (F.shake > 0) { F.shake -= dt; sx = Math.round((Math.random() * 2 - 1) * F.amp); sy = Math.round((Math.random() * 2 - 1) * F.amp); }
    ctx.save(); ctx.translate(sx, sy - (this.dy || 0));
    drawImg(S.en.bg, 0, 0);
    if (this.dy) { const bg = Assets.get(S.en.bg); if (bg) ctx.drawImage(bg, 0, H - 1, W, 1, 0, H, W, this.dy + 4); }   // השורה התחתונה נמתחת לרצועה שנחשפה
    const E = S.en, ei = Assets.get(E.sprNow);
    if (E.alive && ei) {
      shadowAt(BENE.x, BENE.foot, ei.width * .45, .28);
      const im = F.flash && F.flash.who === 'en' ? tinted(E.sprNow, F.flash.mode) : ei;
      ctx.drawImage(im, Math.round(BENE.x + F.eOff - ei.width / 2), Math.round(BENE.foot - ei.height + Math.sin(T / 260)));
    } else if (F.dis) this.drawDissolve(F.dis, dt);
    const mb = F.bounce > 0 ? -Math.round(Math.abs(Math.sin(F.bounce / 90)) * 6) : 0; if (F.bounce > 0) F.bounce -= dt;
    if (F.irit) { const ii = Assets.get('irit_tray'); if (ii) ctx.drawImage(ii, Math.round(F.irit.x - ii.width / 2), BMAI.foot + 4 - ii.height); }
    shadowAt(BMAI.x, BMAI.foot, 22, .28);
    const mi = Assets.get(S.mai.spr);
    if (mi) {
      const im = F.flash && F.flash.who === 'mai' ? tinted(S.mai.spr, F.flash.mode) : mi;
      ctx.globalAlpha = F.fade; ctx.drawImage(im, Math.round(BMAI.x + F.mOff - mi.width / 2), Math.round(BMAI.foot - mi.height + mb)); ctx.globalAlpha = 1;
    }
    // חץ התור
    const who = S.arrow || (!S.busy && !S.over ? 'mai' : null);
    if (who && !(who === 'en' && !E.alive)) { const b = Math.round(Math.sin(T / 160) * 2); goldArrow(who === 'mai' ? BMAI.x : BENE.x, Math.max(4, who === 'mai' ? BMAI.foot - 104 : BENE.foot - this.eh() - 14) + b); }
    // פרץ חלקיקים
    if (F.burst) {
      F.burst.t += dt; const p = F.burst.t / F.burst.dur;
      if (p >= 1) F.burst = null; else {
        ctx.fillStyle = F.burst.col; ctx.globalAlpha = .22 * (1 - p); ctx.fillRect(-4, -4, W + 8, H + 8); ctx.globalAlpha = 1;
        for (const q of F.burst.parts) { const r = q.sp * p * 60; ctx.fillStyle = q.c; ctx.fillRect((F.burst.x + Math.cos(q.a) * r) | 0, (F.burst.y + Math.sin(q.a) * r) | 0, p < .7 ? 3 : 2, p < .7 ? 3 : 2); }
        ctx.strokeStyle = '#FFF6C8'; ctx.globalAlpha = 1 - p; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(F.burst.x, F.burst.y, 6 + p * 46, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    for (const n of F.nums) { n.t += dt; const p = n.t / 800; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p - .6) / .4); pixNum(n.txt, n.x, Math.round(n.y - Math.min(12, n.t / 30)), n.col, n.s); ctx.globalAlpha = 1; }
    F.nums = F.nums.filter(n => n.t < 800);
    ctx.restore();
  },
  drawDissolve(D, dt) {
    D.t += dt; let alive = 0;
    for (const p of D.parts) {
      const k = D.t - p.delay; let a = 1, x = p.x, y = p.y;
      if (k > 0) { a = Math.max(0, 1 - k / 420); x += p.vx * k; y += p.vy * k + k * k * .00004; }
      if (a <= 0) continue; alive++;
      ctx.globalAlpha = a; ctx.drawImage(D.img, p.sx, p.sy, 2, 2, x | 0, y | 0, 2, 2);
    }
    ctx.globalAlpha = 1; if (!alive) this.S.fx.dis = null;
  },
};
