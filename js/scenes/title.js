// =====================================================================
// מסך פתיחה (זמני) – לפי "פתיחה וסוף v1":
// שם המשחק, מאי ברקע וליזי ישנה לידה, "משחק חדש" / "משחק שמור", והקדשה.
// העיצוב הסופי יגיע משיחת העיצוב.
// =====================================================================

const TitleScene = {
  enter() {
    // כוכבים קבועים (לא אקראיים בכל פריים)
    this.stars = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 70; i++) this.stars.push({ x: rnd() * W, y: rnd() * 150, p: rnd() * 6, big: rnd() < 0.15 });
    this.zz = 0;

    const bx = 250, bw = 150, bh = 30;
    this.menu = new Menu([
      { label: 'משחק חדש', x: bx, y: 132, w: bw, h: bh, onPress: () => Game.go(TestRoomScene) },
      { label: 'משחק שמור', x: bx, y: 172, w: bw, h: bh, onPress: () => Game.say('עוד אין שמירות – זה שלב 2 💾') },
    ]);
  },

  update(dt) {
    this.zz += dt;
    this.menu.update();
  },

  draw(t) {
    // שמיים חלומיים
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b1230'); g.addColorStop(0.55, '#4a2f6e'); g.addColorStop(1, '#c87a6a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    for (const s of this.stars) {
      const on = Math.sin(t * 2 + s.p) > -0.3;
      if (!on) continue;
      rect(s.x, s.y, 1, 1, '#FFF4E0');
      if (s.big) { rect(s.x - 1, s.y, 3, 1, 'rgba(255,244,224,.5)'); rect(s.x, s.y - 1, 1, 3, 'rgba(255,244,224,.5)'); }
    }

    // ירח
    ctx.fillStyle = PAL.warm; ctx.beginPath(); ctx.arc(70, 42, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d1f4a'; ctx.beginPath(); ctx.arc(77, 37, 14, 0, Math.PI * 2); ctx.fill();

    // גבעה ודשא (צבעי עולם 1)
    ctx.fillStyle = '#3f6a26'; ctx.beginPath(); ctx.ellipse(110, 250, 190, 40, 0, 0, Math.PI * 2); ctx.fill();
    rect(0, 238, W, 32, '#4a7a2e');
    for (let x = 0; x < W; x += 6) rect(x + ((x / 6) % 2), 236 + ((x * 7) % 3), 2, 3, PAL.w1);
    rect(0, 238, W, 1, PAL.outline);

    // מאי (נושמת: קפיצה של פיקסל אחד) וליזי ישנה
    const breathe = Math.sin(t * 2.2) > 0 ? 0 : 1;
    drawImg('mai3_idle', 46, 145 + breathe);
    drawImg('lizzy_sleep', 108, 190);
    // Zzz
    for (let i = 0; i < 3; i++) {
      const k = ((this.zz * 0.6 + i / 3) % 1);
      text('z', 140 + k * 14, 186 - k * 26, { size: 8 + k * 6, color: `rgba(255,244,224,${1 - k})`, bold: true });
    }

    // שם המשחק
    const bob = Math.round(Math.sin(t * 1.5) * 2);
    text('👑', 325, 30 + bob, { size: 22 });
    text('מלכת הנישנושים', 325, 70 + bob, {
      size: 38, bold: true, color: PAL.salty, stroke: PAL.outline, strokeWidth: 6, shadow: '#1b1230',
    });

    this.menu.draw(t);

    // הקדשה
    text('למאי, מנועה 💛', 325, 222, { size: 11, color: PAL.paper });
  },
};
