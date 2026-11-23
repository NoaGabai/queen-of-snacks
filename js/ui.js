// =====================================================================
// ממשק משותף (לפי art-ui.md):
//   act()        – רכיב הכפתור האחיד (אריח אייקון | טקסט | צד), 4 מצבים
//   FocusList    – ניווט במקלדת בין הכפתורים של שכבה (חיצים לפי מיקום, Enter, Esc)
//   Layer        – שכבת HTML מעל הקנבס (מסך או חלון), שמתחברת למנהל המסכים
//   Confirm      – חלון אישור (הפוקוס מתחיל על "לא")
//   SlotPicker   – בחירת משבצת שמירה
// =====================================================================

// ---------------------------------------------------------------------
// רכיב הכפתור האחיד
// opt: { k, ic, flav, title, desc, side, cls, disabled, iconCls }
// בלי ic = כפתור טקסט בלבד (cls 'plain')
// ---------------------------------------------------------------------
function act(o) {
  const tile = o.ic ? `<span class="tile">${icon(o.ic, o.iconCls || '')}</span>` : '';
  const cls = 'act' + (o.ic ? '' : ' plain') + (o.cls ? ' ' + o.cls : '');
  return `<button class="${cls}" tabindex="-1" ${o.k ? `data-k="${o.k}"` : ''} ${o.flav ? `data-flav="${o.flav}"` : ''} ${o.disabled ? 'disabled' : ''}>
    ${tile}<span class="txt"><span class="t">${o.title}</span>${o.desc ? `<span class="d">${o.desc}</span>` : ''}</span>${o.ic ? `<span class="side">${o.side || ''}</span>` : ''}</button>`;
}
// כפתור אייקון מרובע (טלפון, מחיקה)
function sqBtn(o) {
  return `<button class="act sq ${o.cls || ''}" tabindex="-1" data-k="${o.k}" aria-label="${esc(o.label || '')}" title="${esc(o.label || '')}"><span class="tile">${icon(o.ic)}</span></button>`;
}

// ---------------------------------------------------------------------
// ניווט במקלדת. החיצים זזים לכפתור הקרוב ביותר בכיוון (עובד ברשימות, בשורות ובטבלאות).
// במגע/עכבר המיקוד לא מוצג עד שמשתמשים במקלדת.
// ---------------------------------------------------------------------
class FocusList {
  constructor(root, opt = {}) {
    this.root = root; this.cur = null;
    root.addEventListener('pointerover', e => {
      const b = e.target.closest('button.act');
      if (b && e.pointerType === 'mouse' && !b.disabled) this.set(b, false);
    });
    this.refresh(opt.focus);
  }
  items() { return [...this.root.querySelectorAll('button.act')].filter(b => !b.disabled && b.offsetParent !== null); }
  // focus: data-k של הכפתור שמתחילים בו (או כלום = הראשון)
  refresh(focus) {
    const it = this.items();
    const want = focus ? it.find(b => b.dataset.k === focus) : null;
    this.set(want || (it.includes(this.cur) ? this.cur : it[0]) || null, Input.usedKeys || !Input.isTouch);   // במחשב המיקוד מוצג מיד, במגע רק אחרי מקלדת
  }
  set(b, show) {
    if (this.cur) this.cur.classList.remove('sel');
    this.cur = b;
    if (b && show) b.classList.add('sel');
  }
  move(dir) {
    const it = this.items(); if (!it.length) return;
    if (!this.cur || !it.includes(this.cur)) { this.set(it[0], true); return; }
    const c = this.cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2;
    const v = dir === 'up' || dir === 'down', sign = (dir === 'down' || dir === 'right') ? 1 : -1;
    let best = null, bs = Infinity, wrap = null, ws = Infinity;
    for (const b of it) {
      if (b === this.cur) continue;
      const r = b.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      const main = (v ? dy : dx) * sign, cross = Math.abs(v ? dx : dy);
      if (main > 4) { const s = main + cross * 2; if (s < bs) { bs = s; best = b; } }
      else if (v && main < -4) { const s = -main * 100 - cross; if (s < ws) { ws = s; wrap = b; } }   // גלישה מהסוף להתחלה
    }
    const nb = best || (v ? wrap : null);
    if (nb) { this.set(nb, true); Sound.move(); } else if (!this.cur.classList.contains('sel')) this.set(this.cur, true);
  }
  press() {
    const b = this.cur; if (!b) return;
    if (!b.classList.contains('sel')) { this.set(b, true); return; }   // Enter ראשון רק מציג איפה המיקוד
    b.classList.add('press');
    setTimeout(() => { b.classList.remove('press'); if (b.isConnected && !b.disabled) b.click(); }, 90);
  }
  update() {
    for (const d of ['up', 'down', 'left', 'right']) if (Input.was(d)) this.move(d);
    if (Input.was('a')) this.press();
  }
}

// צליל בחירה לכל לחיצה על כפתור בממשק
UIROOT.addEventListener('click', e => { const b = e.target.closest('button.act'); if (b && !b.disabled && !b.dataset.silent) Sound.select(); });

// ---------------------------------------------------------------------
// שכבת HTML. מסך: Layer(html, {screen:true}); חלון: Layer(html) + Game.push.
// opt: { focus, onBack, dim, cls, screen, onUpdate }
// ---------------------------------------------------------------------
function Layer(html, opt = {}) {
  const node = el(`<div class="layer${opt.dim === false || opt.screen ? '' : ' dim'} ${opt.cls || ''}">${html}</div>`);
  const L = {
    el: node,
    q(sel) { return node.querySelector(sel); },
    // חיבור לחיצה לכפתור לפי data-k
    on(k, fn) { const b = node.querySelector(`[data-k="${k}"]`); if (b) b.onclick = fn; return L; },
    set(html2, focus) { node.innerHTML = html2; L.focus.refresh(focus); },
    mount() {
      if (opt.screen) UIROOT.prepend(node); else UIROOT.appendChild(node);
      L.focus = new FocusList(node, { focus: opt.focus });
      return L;
    },
    unmount() { node.remove(); },
    // ממשק של חלון במנהל המסכים
    enter() { L.mount(); opt.onEnter && opt.onEnter(L); },
    exit() { L.unmount(); },
    update(dt) {
      if (Input.was('b')) { Sound.back(); (opt.onBack || (() => Game.pop()))(); return; }
      L.focus.update();
      opt.onUpdate && opt.onUpdate(dt);
    },
    draw() { },
  };
  return L;
}

// ---------------------------------------------------------------------
// חלון אישור: "בטוחה? ..." עם לא / כן. הפוקוס מתחיל על "לא" – הכי בטוח.
// ---------------------------------------------------------------------
function Confirm(msg, onYes, opt = {}) {
  const no = () => { Game.pop(); opt.onNo && opt.onNo(); };
  const L = Layer(`
    <div class="panel dialog center" style="width:640px">
      <h2>${msg}</h2>
      ${opt.sub ? `<p>${opt.sub}</p>` : ''}
      <div class="row">
        ${act({ k: 'no', title: opt.no || 'לא' })}
        ${act({ k: 'yes', title: opt.yes || 'כן' })}
      </div>
    </div>`, { focus: 'no', onBack: no });
  Game.push(L);
  L.on('no', no).on('yes', () => { Game.pop(); onYes(); });
  return L;
}

// ---------------------------------------------------------------------
// בחירת משבצת שמירה (מסך הפתיחה ואפליקציית "שמירות")
// opt: { title, isEnabled(i, data), onPick(i, data), canDelete }
// ---------------------------------------------------------------------
function SlotPicker(opt) {
  const L = Layer('', { cls: 'picker' });
  const build = (focus) => {
    const data = Save.all();
    const rows = data.map((d, i) => `<div class="slotRow">
        ${slotCard(i, d, !opt.isEnabled(i, d))}
        ${opt.canDelete && d ? sqBtn({ k: 'del' + i, ic: 'trash', label: 'למחוק את משבצת ' + (i + 1) }) : ''}
      </div>`).join('');
    L.set(`
      <div class="panel dialog center slots">
        <h2>${opt.title}</h2>
        <div class="list">${rows}</div>
        <div class="row" style="width:300px;align-self:center">${act({ k: 'back', title: 'חזרה' })}</div>
      </div>`, focus);
    data.forEach((d, i) => {
      L.on('slot' + i, () => opt.onPick(i, d));
      L.on('del' + i, () => Confirm(`למחוק את משבצת <bdi>${i + 1}</bdi>?`, () => {
        Save.remove(i); Game.say('המשבצת נמחקה');
        if (!Save.any()) Game.pop(); else build();
      }, { sub: 'אי אפשר לבטל את זה.', yes: 'למחוק' }));
    });
    L.on('back', () => Game.pop());
  };
  const origEnter = L.enter;
  L.enter = () => { origEnter(); build(); };
  L.rebuild = build;
  Game.push(L);
  return L;
}

function slotCard(i, d, disabled) {
  const n = `<bdi>${i + 1}</bdi>`;
  if (!d) return act({ k: 'slot' + i, ic: 'star', title: `משבצת ${n}`, desc: 'ריקה', disabled });
  const active = Save.slot === i && Save.state;
  return act({
    k: 'slot' + i, ic: 'disk', disabled,
    title: `משבצת ${n} · ${WORLD_NAMES[d.world]}`,
    desc: `עולם <bdi>${d.world}</bdi> · רמה <bdi>${d.level}</bdi> · חברות <bdi dir="ltr">${d.friends.length}/5</bdi> · ${formatPlayTime(d.playTime)}`,
    side: `<span class="when"><bdi>${formatDate(d.savedAt)}</bdi></span>${active ? '<span class="tag">המשחק הנוכחי</span>' : ''}`,
  });
}
