// =====================================================================
// חדר בדיקה (זמני) – כדי לבדוק תנועה וקלט לפני שבונים מפה אמיתית.
// מאי כאן היא סקיצה קטנה בצבעים שלה; הספרייט של ההליכה (24×36) יגיע משיחת העיצוב.
// =====================================================================

const TestRoomScene = {
  usesPad: true,
  countsTime: true,   // זמן משחק נספר כאן

  enter() {
    const pl = (Save.state && Save.state.place) || { x: 120, y: 150 };
    this.mai = { x: pl.x, y: pl.y, dir: 'down', walk: 0, moving: false };
    this.lizzy = { x: 340, y: 124 };   // ליזי בחצי גודל במפה (זמני)
    this.room = { x: 24, y: 40, w: 432, h: 196 };
  },

  update(dt) {
    const m = this.mai, speed = 70;
    let dx = 0, dy = 0;
    if (Input.is('left')) dx -= 1;
    if (Input.is('right')) dx += 1;
    if (Input.is('up')) dy -= 1;
    if (Input.is('down')) dy += 1;
    if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
    m.moving = !!(dx || dy);
    if (m.moving) {
      m.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      m.walk += dt;
      const r = this.room;
      const nx = Math.max(r.x + 8, Math.min(r.x + r.w - 8, m.x + dx * speed * dt));
      const ny = Math.max(r.y + 20, Math.min(r.y + r.h - 2, m.y + dy * speed * dt));
      // לא לעבור דרך ליזי
      if (Math.hypot(nx - this.lizzy.x - 10, ny - this.lizzy.y - 25) > 12) { m.x = nx; m.y = ny; }
    }

    if (Save.state) Save.state.place = { scene: 'testroom', x: Math.round(m.x), y: Math.round(m.y) };

    const nearLizzy = Math.hypot(m.x - this.lizzy.x - 10, m.y - this.lizzy.y - 25) < 30;
    this.nearLizzy = nearLizzy;
    const tappedLizzy = Input.taps.some(p => Math.abs(p.x - this.lizzy.x - 10) < 16 && Math.abs(p.y - this.lizzy.y - 13) < 18);
    if ((Input.was('a') || tappedLizzy) && nearLizzy) this.petLizzy();
    if (this.purr) this.purr = Math.max(0, this.purr - dt);

    if (phoneButtonPressed()) { Sound.select(); Phone.open(() => Game.go(TestRoomScene)); return; }
    if (Input.was('b')) { Sound.back(); Save.saveNow(); Game.go(TitleScene); }
  },

  // ליזי = נקודת שמירה: ריפוי, מילוי רוגלך ושמירה אוטומטית
  petLizzy() {
    Sound.select(); this.purr = 2;
    const st = Save.state;
    if (st) {
      st.hp = 20 + 4 * (st.level - 1);
      st.rugelach = Math.max(st.rugelach, 3);
      st.lastLizzy = 'testroom';
      const first = !st.flags.lizzyTip; st.flags.lizzyTip = true;
      Save.saveNow();
      Game.say(first ? 'ליזי: "פה שומרים ומתמלאים" 🐱💗' : `ליזי שמרה את המשחק ✓ 💗`);
    }
  },

  draw(t) {
    const r = this.room;
    rect(0, 0, W, H, '#2a3d1c');
    // רצפת דשא משובצת (אריחים 16×16)
    ctx.save(); ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    for (let y = r.y; y < r.y + r.h; y += 16)
      for (let x = r.x; x < r.x + r.w; x += 16)
        rect(x, y, 16, 16, ((x + y) / 16) % 2 ? '#5E8F3A' : '#578634');
    ctx.restore();
    // שביל עפר
    rect(r.x, 140, r.w, 20, '#b08a5a'); rect(r.x, 140, r.w, 1, '#8c6a42'); rect(r.x, 159, r.w, 1, '#8c6a42');
    // גדר
    rect(r.x - 2, r.y - 2, r.w + 4, 2, PAL.outline); rect(r.x - 2, r.y + r.h, r.w + 4, 2, PAL.outline);
    rect(r.x - 2, r.y, 2, r.h, PAL.outline); rect(r.x + r.w, r.y, 2, r.h, PAL.outline);

    // סידור לפי עומק: מי שלמטה יותר מצויר אחרון
    const items = [
      { y: this.lizzy.y + 25, draw: () => drawImgHalf(this.purr ? 'lizzy_purr' : 'lizzy_sit', this.lizzy.x, this.lizzy.y) },
      { y: this.mai.y, draw: () => drawMaiSketch(this.mai, t) },
    ].sort((a, b) => a.y - b.y);
    items.forEach(i => i.draw());

    if (this.nearLizzy) text(Input.isTouch ? 'ללטף את ליזי (A)' : 'ללטף את ליזי (Enter)', this.lizzy.x + 10, this.lizzy.y - 8, {
      size: 10, bold: true, stroke: PAL.outline, strokeWidth: 3,
    });

    panel(W / 2 - 150, 6, 300, 26, 'rgba(58,38,24,0.85)');
    text(Input.isTouch ? 'חדר בדיקה · ג׳ויסטיק משמאל · B = למסך הפתיחה' : 'חדר בדיקה · חיצים / WASD · Esc = למסך הפתיחה',
      W / 2, 20, { size: 11, color: PAL.paper });

    // שורת מידע זמנית: משבצת וזמן משחק
    if (Save.state) {
      panel(6, 6, 74, 26, 'rgba(58,38,24,0.85)');
      text(`💾 ${Save.slot + 1} · ⏱ ${formatPlayTime(Save.state.playTime)}`, 43, 20, { size: 10, color: PAL.paper });
    }
    drawPhoneButton(t);
  },
};

// סקיצה זמנית של מאי במפה (14×24), בצבעי art-bible
function drawMaiSketch(m, t) {
  const x = Math.round(m.x - 7), step = m.moving ? (Math.floor(m.walk * 8) % 2) : 0;
  const y = Math.round(m.y - 24) - (m.moving && step ? 1 : 0);
  ctx.fillStyle = 'rgba(58,38,24,0.25)'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 7, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  const O = PAL.outline, HAIR = '#94603A', SKIN = '#EDBB8E', SW = '#60626C', BL = '#D6CCBA', PN = '#A0A2A7', SH = '#F2F0E8';
  rect(x + 2, y - 1, 10, 26, O);                  // קו מתאר גס
  rect(x + 3, y, 8, 9, HAIR);                     // שיער
  if (m.dir !== 'up') {
    rect(x + 4, y + 2, 6, 6, SKIN);               // פנים
    if (m.dir !== 'left') rect(x + (m.dir === 'right' ? 8 : 5), y + 4, 1, 1, '#3E2214');
    if (m.dir !== 'right') rect(x + (m.dir === 'left' ? 5 : 8), y + 4, 1, 1, '#3E2214');
  }
  rect(x + 4, y + 1, 6, 1, '#3A3A40');             // משקפיים על הראש
  rect(x + 3, y + 9, 8, 8, SW);                   // סווטשירט
  rect(x + 3, y + 12, 1, 4, BL); rect(x + 10, y + 12, 1, 4, BL); // שרוולים מולבנים
  rect(x + 4, y + 17, 3, 5 - (step ? 1 : 0), PN); // רגליים
  rect(x + 7, y + 17, 3, 5 - (step ? 0 : 1), PN);
  rect(x + 4, y + 22 - (step ? 1 : 0), 3, 2, SH);
  rect(x + 7, y + 22 - (step ? 0 : 1), 3, 2, SH);
}

function drawImgHalf(name, x, y) {
  const img = Assets.get(name); if (!img) return;
  ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(img.width / 2), Math.round(img.height / 2));
}
