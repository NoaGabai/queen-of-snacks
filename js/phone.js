// =====================================================================
// הטלפון של מאי – לפי "מפות v1 / א" ו"שמירות v1", בסגנון art-ui.md.
// 3 אפליקציות: מפת הנישנושים, נישנוש אקספרס, שמירות.
// בשלב הזה רק "שמירות" עובדת; השתיים האחרות יחוברו עם המטבח (שלב 4) והמפה (שלב 5).
// =====================================================================

// כפתור הטלפון הקבוע בפינה הימנית-עליונה. מוסיפים אותו ל-HTML של מסך משחק.
function phoneButtonHTML() { return `<div class="phoneBtn">${sqBtn({ k: 'phone', ic: 'phone', label: 'הטלפון של מאי (P)' })}</div>`; }
// מחברים את הכפתור כך שלחיצה עליו = כמו מקש P
function wirePhoneButton(layer) { layer.on('phone', () => Input.tap('phone')); }
function phoneButtonPressed() { return Input.was('phone'); }

const Phone = {
  open(onSwitched) {
    this.onSwitched = onSwitched;   // מה לעשות אחרי שעברו למשחק שמור אחר
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
      ].join(''), act({ k: 'close', title: 'לסגור' })), focus);
      L.on('map', () => Game.say('מפת הנישנושים תיפתח כשיהיה עולם 1 (שלב 5)'));
      L.on('express', () => Game.say('המטבח של אמא בבנייה (שלב 4)'));
      L.on('saves', () => { this.app = 'saves'; this.render(); });
      L.on('close', () => this.close());
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

  back() {
    if (this.app !== 'home') { this.app = 'home'; this.render('saves'); } else this.close();
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
