// =====================================================================
// הטלפון של מאי – לפי "מפות v1 / א" ו"שמירות v1", בסגנון art-ui.md.
// 3 אפליקציות: מפת הנישנושים, נישנוש אקספרס, שמירות.
// כל 3 האפליקציות עובדות מאז שלב 5.
// =====================================================================

// כפתור הטלפון הקבוע בפינה הימנית-עליונה. מוסיפים אותו ל-HTML של מסך משחק.
function phoneButtonHTML() { return `<div class="phoneBtn">${sqBtn({ k: 'phone', ic: 'phone', label: 'הטלפון של מאי (P)' })}</div>`; }
// מחברים את הכפתור כך שלחיצה עליו = כמו מקש P
function wirePhoneButton(layer) { layer.on('phone', () => Input.tap('phone')); }
function phoneButtonPressed() { return Input.was('phone'); }

const Phone = {
  open(onSwitched) {
    // אחרי מעבר למשחק שמור אחר: הולכים למקום שבו הוא נשמר
    this.onSwitched = onSwitched || (() => Game.goClean(sceneFor(Save.state)));
    this.app = 'home';
    this.L = Layer('', { onBack: () => this.back(), onUpdate: () => this.tick() });
    const enter = this.L.enter;
    this.L.enter = () => { enter(); this.render(); };
    // מקש P/Tab סוגר את הטלפון מכל מקום בתוכו
    const upd = this.L.update;
    this.L.update = (dt) => { if (Input.was('phone')) { Sound.back(); this.close(); return; } upd(dt); };
    Game.push(this.L);
  },

  clock() { const d = new Date(), p = n => String(n).padStart(2, '0'); return `${p(d.getHours())}:${p(d.getMinutes())}`; },
  tick() { const c = this.L.q('.clock'); if (c && c.textContent !== this.clock()) c.textContent = this.clock(); },

  frame(title, note, apps, foot) {
    return `<div class="panel phone center"><div class="screen">
        <div class="status"><bdi class="clock" dir="ltr">${this.clock()}</bdi><span class="notch"></span><span class="battery"><i></i></span></div>
        <h2>${title}</h2>${note ? `<div class="note">${note}</div>` : ''}
        <div class="apps">${apps}</div>
        <div class="foot">${foot}</div>
      </div></div>`;
  },

  render(focus) {
    const L = this.L;
    if (this.app === 'home') {
      L.set(this.frame('הטלפון של מאי', '', [
        act({ k: 'map', ic: 'map', title: 'מפת הנישנושים', desc: 'בחירת עולם' }),
        act({ k: 'express', ic: 'scooter', title: 'נישנוש אקספרס', desc: 'חזרה למטבח' }),
        act({ k: 'saves', ic: 'disk', title: 'שמירות', desc: 'לשמור ולפתוח משחקים' }),
      ].join(''), `<div class="row">${act({ k: 'title', title: 'למסך הפתיחה' })}${act({ k: 'close', title: 'לסגור' })}</div>`), focus);
      L.on('title', () => { Save.saveNow(); Game.goClean(TitleScene); });
      L.on('map', () => { this.app = 'map'; this.render(); });
      L.on('express', () => this.express());
      L.on('saves', () => { this.app = 'saves'; this.render(); });
      L.on('close', () => this.close());
    } else if (this.app === 'map') {
      // "מפת הנישנושים": העולמות נפתחים לפי הסדר; עולם נעול אפור
      const st = Save.state;
      L.set(this.frame('מפת הנישנושים', 'לאן נוסעים?', WORLD_NAMES.slice(1).map((n, i) => act({
        k: 'w' + (i + 1), ic: 'map', title: n, desc: i + 1 <= st.unlockedWorlds ? `עולם <bdi>${i + 1}</bdi>` : 'נעול',
        disabled: i + 1 > st.unlockedWorlds || !WORLD_SCENES[i + 1],
      })).join(''), act({ k: 'back', title: 'חזרה' })), focus);
      for (let n = 1; n <= 5; n++) L.on('w' + n, () => this.travel(n));
      L.on('back', () => this.back());
    } else {
      const note = Save.slot !== null ? `משחקת עכשיו במשבצת <bdi>${Save.slot + 1}</bdi>` : '';
      L.set(this.frame('שמירות', note, [
        act({ k: 'now', ic: 'disk', title: 'לשמור עכשיו', desc: 'במשבצת הנוכחית' }),
        act({ k: 'other', ic: 'copy', title: 'לשמור במשבצת אחרת', desc: 'עותק גיבוי' }),
        act({ k: 'open', ic: 'open', title: 'לפתוח משחק שמור', desc: 'הנוכחי יישמר קודם' }),
      ].join(''), act({ k: 'back', title: 'חזרה' })), focus);
      L.on('now', () => this.saveNow());
      L.on('other', () => this.saveOther());
      L.on('open', () => this.openOther());
      L.on('back', () => this.back());
    }
  },

  // נוסעים לעולם: מופיעים אצל ליזי האחרונה שביקרנו בה בעולם הזה (או בכניסה)
  travel(n) {
    if (Game.scene.id === 'world' + n) { Game.say('את כבר כאן'); return; }
    Save.state.place = { scene: 'travel' };
    Save.saveNow(); Game.goClean(WORLD_SCENES[n]);
  },
  // "נישנוש אקספרס": חזרה מיידית למטבח מכל מקום
  express() {
    if (Game.scene.id === 'kitchen') { Game.say('את כבר במטבח'); return; }
    Save.state.place = { scene: 'travel' };
    Save.saveNow(); Game.goClean(KitchenScene);
    Game.say(`${icon('scooter')}נישנוש אקספרס בדרך למטבח`);
  },

  back() {
    if (this.app !== 'home') { const from = this.app; this.app = 'home'; this.render(from); } else this.close();
  },
  close() { Game.pop(); },

  saveNow() {
    if (Save.saveNow()) Game.say(`נשמר במשבצת <bdi>${Save.slot + 1}</bdi>`);
  },

  saveOther() {
    SlotPicker({
      title: 'לשמור עותק במשבצת…',
      isEnabled: (i) => i !== Save.slot,
      onPick: (i, d) => {
        const doIt = () => { Save.saveAs(i); Game.pop(); Game.say(`עותק נשמר במשבצת <bdi>${i + 1}</bdi>`); };
        if (d) Confirm(`לדרוס את משבצת <bdi>${i + 1}</bdi>?`, doIt, { sub: 'המשחק שהיה שם יימחק.', yes: 'לדרוס' });
        else doIt();
      },
    });
  },

  openOther() {
    SlotPicker({
      title: 'לפתוח משחק שמור',
      isEnabled: (i, d) => !!d,
      onPick: (i) => {
        if (i === Save.slot) { Game.say('זה המשחק שפתוח עכשיו'); return; }
        // לפני מעבר: המשחק הנוכחי נשמר אוטומטית
        if (Save.switchTo(i)) { Game.say(`עברנו למשבצת <bdi>${i + 1}</bdi>. הקודמת נשמרה.`); this.onSwitched && this.onSwitched(); }
      },
    });
  },
};
