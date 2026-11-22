// =====================================================================
// 📱 הטלפון של מאי – לפי "מפות v1 / א" ו"שמירות v1".
// 3 אפליקציות: מפת הנישנושים, נישנוש אקספרס, שמירות.
// בשלב הזה רק "שמירות" עובדת; השתיים האחרות יחוברו עם המפה והמטבח.
// =====================================================================

const PHONE_BTN = { x: 448, y: 6, w: 26, h: 30 };

function drawPhoneButton(t) {
  const b = PHONE_BTN;
  panel(b.x, b.y, b.w, b.h, PAL.secondary);
  rect(b.x + 7, b.y + 5, 12, 20, PAL.outline); rect(b.x + 8, b.y + 7, 10, 14, '#9fd3e8');
  rect(b.x + 11, b.y + 22, 4, 1, PAL.paper);
  if (!Input.isTouch) text('P', b.x - 6, b.y + b.h - 5, { size: 8, color: PAL.paper, stroke: PAL.outline, strokeWidth: 2 });
}
// האם נגעו בכפתור הטלפון / לחצו P
function phoneButtonPressed() {
  if (Input.was('phone')) return true;
  const b = PHONE_BTN;
  return Input.taps.some(p => p.x >= b.x - 4 && p.x <= b.x + b.w + 4 && p.y >= b.y - 4 && p.y <= b.y + b.h + 4);
}

const Phone = {
  // רוחב 170 וגובה 234 ברזולוציה הפנימית, באמצע המסך
  x: 155, y: 18, w: 170, h: 234,

  open(onSwitched) {
    this.onSwitched = onSwitched;   // מה לעשות אחרי שעברו למשחק שמור אחר
    this.app = 'home';
    Game.push(this);
  },
  enter() { this.buildMenu(); },

  buildMenu() {
    const sx = this.x + 10, sw = this.w - 20;
    const row = (i, label, onPress, extra = {}) =>
      Object.assign({ label, x: sx + 4, y: this.y + 52 + i * 38, w: sw - 8, h: 30, size: 12, onPress }, extra);
    const close = { label: 'לסגור', x: this.x + this.w / 2 - 30, y: this.y + this.h - 34, w: 60, h: 20, size: 11, onPress: () => this.close() };

    if (this.app === 'home') {
      this.menu = new Menu([
        row(0, '🗺️ מפת הנישנושים', () => Game.say('המפה נפתחת בשלב הבא 🗺️')),
        row(1, '🛵 נישנוש אקספרס', () => Game.say('המטבח של אמא עוד בבנייה 🛵')),
        row(2, '💾 שמירות', () => { this.app = 'saves'; this.buildMenu(); }),
        close,
      ]);
    } else if (this.app === 'saves') {
      this.menu = new Menu([
        row(0, 'לשמור עכשיו', () => this.saveNow()),
        row(1, 'לשמור במשבצת אחרת', () => this.saveOther(), { size: 11 }),
        row(2, 'לפתוח משחק שמור', () => this.openOther()),
        { label: 'חזרה', x: this.x + this.w / 2 - 30, y: this.y + this.h - 34, w: 60, h: 20, size: 11, onPress: () => { this.app = 'home'; this.buildMenu(); } },
      ]);
    }
  },

  saveNow() {
    if (Save.saveNow()) { Sound.select(); Game.say(`נשמר במשבצת ${Save.slot + 1} ✓`); }
  },

  saveOther() {
    SlotPicker({
      title: 'לשמור עותק במשבצת…',
      isEnabled: (i) => i !== Save.slot,
      onPick: (i, d) => {
        const doIt = () => { Save.saveAs(i); Game.pop(); Game.say(`עותק נשמר במשבצת ${i + 1} ✓`); };
        if (d) Confirm(`לדרוס את משבצת ${i + 1}?`, doIt, { sub: 'המשחק שהיה שם יימחק', yes: 'לדרוס' });
        else doIt();
      },
    });
  },

  openOther() {
    SlotPicker({
      title: 'לפתוח משחק שמור',
      isEnabled: (i, d) => !!d,
      onPick: (i) => {
        if (i === Save.slot) { Game.say('זה המשחק שפתוח עכשיו 🙂'); return; }
        // לפני מעבר: המשחק הנוכחי נשמר אוטומטית
        if (Save.switchTo(i)) { Game.say(`עברנו למשבצת ${i + 1} (הקודמת נשמרה ✓)`); this.onSwitched && this.onSwitched(); }
      },
    });
  },

  close() { Game.pop(); },

  update() {
    if (Input.was('b') || Input.was('phone')) {
      Sound.back();
      if (this.app !== 'home') { this.app = 'home'; this.buildMenu(); } else this.close();
      return;
    }
    this.menu.update();
  },

  draw(t) {
    dim(0.45);
    const { x, y, w, h } = this;
    // גוף הטלפון
    ctx.fillStyle = PAL.outline; ctx.beginPath(); ctx.roundRect(x - 2, y - 2, w + 4, h + 4, 14); ctx.fill();
    ctx.fillStyle = '#2a2233'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
    // מסך
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, '#f7b8c8'); g.addColorStop(1, '#a98be0');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + 6, y + 6, w - 12, h - 12, 8); ctx.fill();
    // שורת מצב: שעה אמיתית + סוללה
    const d = new Date();
    text(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`, x + w - 22, y + 15, { size: 9, bold: true, color: PAL.outline });
    rect(x + 14, y + 12, 12, 6, PAL.outline); rect(x + 15, y + 13, 8, 4, '#7ad06a'); rect(x + 26, y + 14, 1, 2, PAL.outline);
    rect(x + w / 2 - 14, y + 9, 28, 5, '#2a2233');   // "נוץ'"
    text(this.app === 'home' ? 'הטלפון של מאי' : '💾 שמירות', x + w / 2, y + 34, { size: 13, bold: true, color: PAL.outline });
    if (this.app === 'saves' && Save.slot !== null)
      text(`משחקת עכשיו במשבצת ${Save.slot + 1}`, x + w / 2, y + 168, { size: 9, color: PAL.outline });
    this.menu.draw(t);
  },
};
