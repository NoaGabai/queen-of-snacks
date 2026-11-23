// =====================================================================
// מסך פתיחה (זמני עד העיצוב הסופי) – לפי "פתיחה וסוף v1":
// שם המשחק, מאי ברקע וליזי ישנה לידה, "משחק חדש" / "משחק שמור", והקדשה.
// הרקע מצויר בקנבס (פיקסל-ארט), והממשק ב-HTML לפי art-ui.md.
// =====================================================================

const TitleScene = {
  enter() {
    // במסך הפתיחה אין משחק פעיל (הוא כבר נשמר לפני שהגענו לכאן)
    Save.slot = null; Save.state = null;

    // כוכבים קבועים (לא אקראיים בכל פריים)
    this.stars = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) this.stars.push({ x: rnd() * W, y: rnd() * 150, p: rnd() * 6, big: rnd() < 0.15 });
    this.zz = 0;
    this.build();
  },
  exit() { this.L.unmount(); },

  build() {
    const has = Save.any();
    if (this.L) this.L.unmount();
    this.L = Layer(`<div id="title">
        <div class="logo"><h1>מלכת הנישנושים</h1></div>
        <div class="menu">
          ${act({ k: 'new', ic: 'star', title: 'משחק חדש', desc: 'להתחיל מההתחלה' })}
          ${act({ k: 'load', ic: 'open', title: 'משחק שמור', desc: has ? 'להמשיך מאיפה שעצרת' : 'עוד אין משחקים שמורים', disabled: !has })}
        </div>
        <div class="ded">למאי, מנועה ${icon('heart')}</div>
        ${Save.ok ? '' : '<div class="warn"><span class="tag warn">הדפדפן הזה לא מאפשר לשמור. המשחק יישמר רק עד שסוגרים את הדף.</span></div>'}
      </div>`, { screen: true, focus: has ? 'load' : 'new' }).mount();
    this.L.on('new', () => this.newGame()).on('load', () => this.loadGame());
  },

  // "משחק חדש": בוחרים משבצת. משבצת מלאה נדרסת רק אחרי אישור.
  newGame() {
    SlotPicker({
      title: 'משחק חדש: באיזו משבצת?',
      isEnabled: () => true,
      onPick: (i, d) => {
        const start = () => { Save.startNew(i); Game.goClean(KitchenScene); };
        if (d) Confirm('בטוחה? המשחק הזה יימחק', start, {
          sub: `משבצת <bdi>${i + 1}</bdi> · רמה <bdi>${d.level}</bdi> · ${formatPlayTime(d.playTime)}`, yes: 'כן, למחוק',
        });
        else start();
      },
    });
  },

  // "משחק שמור": רשימת המשבצות, ובוחרים מאיפה להמשיך
  loadGame() {
    if (!Save.any()) return;
    const P = SlotPicker({
      title: 'מאיפה ממשיכים?',
      isEnabled: (i, d) => !!d,
      canDelete: true,
      onPick: (i) => { if (Save.load(i)) Game.goClean(sceneFor(Save.state)); },
    });
    // אחרי מחיקה, הכפתור "משחק שמור" צריך להתעדכן
    const exit = P.exit; P.exit = () => { exit(); this.build(); };
  },

  update(dt) {
    this.zz += dt;
    this.L.focus.update();
  },

  draw(t) {
    // שמיים חלומיים
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1230'); g.addColorStop(0.55, '#4a2f6e'); g.addColorStop(1, '#c87a6a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    for (const s of this.stars) {
      if (Math.sin(t * 2 + s.p) <= -0.3) continue;
      rect(s.x, s.y, 1, 1, '#FFF4E0');
      if (s.big) { rect(s.x - 1, s.y, 3, 1, 'rgba(255,244,224,.5)'); rect(s.x, s.y - 1, 1, 3, 'rgba(255,244,224,.5)'); }
    }

    // ירח
    ctx.fillStyle = PAL.warm; ctx.beginPath(); ctx.arc(70, 42, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d1f4a'; ctx.beginPath(); ctx.arc(77, 37, 14, 0, Math.PI * 2); ctx.fill();

    // גבעה ודשא
    ctx.fillStyle = '#3f6a26'; ctx.beginPath(); ctx.ellipse(110, 250, 190, 40, 0, 0, Math.PI * 2); ctx.fill();
    rect(0, 238, W, 32, '#4a7a2e');
    for (let x = 0; x < W; x += 6) rect(x + ((x / 6) % 2), 236 + ((x * 7) % 3), 2, 3, '#5E8F3A');
    rect(0, 238, W, 1, PAL.outline);

    // מאי (נושמת: קפיצה של פיקסל אחד) וליזי ישנה
    const breathe = Math.sin(t * 2.2) > 0 ? 0 : 1;
    drawImg('mai3_idle', 46, 145 + breathe);
    drawImg('lizzy_sleep', 108, 190);
    // Zzz בפיקסלים
    for (let i = 0; i < 3; i++) {
      const k = ((this.zz * 0.6 + i / 3) % 1);
      pixZ(140 + k * 14, 186 - k * 26, k < 0.4 ? 1 : 2, `rgba(255,244,224,${1 - k})`);
    }
  },
};

// אות z קטנה בפיקסלים (s = גודל פיקסל)
function pixZ(x, y, s, color) {
  x = Math.round(x); y = Math.round(y); ctx.fillStyle = color;
  ctx.fillRect(x, y, 4 * s, s);
  ctx.fillRect(x + 2 * s, y + s, s, s);
  ctx.fillRect(x + s, y + 2 * s, s, s);
  ctx.fillRect(x, y + 3 * s, 4 * s, s);
}
