// =====================================================================
// חלונות ממשק משותפים: אישור (כן/לא) ובחירת משבצת שמירה
// =====================================================================

function dim(a = 0.6) { ctx.fillStyle = `rgba(27,18,48,${a})`; ctx.fillRect(0, 0, W, H); }

// ---------------------------------------------------------------------
// חלון אישור: "בטוחה? ..." עם כן / לא
// ---------------------------------------------------------------------
function Confirm(msg, onYes, opt = {}) {
  const w = 260, h = 96, x = (W - w) / 2, y = (H - h) / 2;
  const bw = 90, by = y + h - 38;
  const o = {
    enter() {
      this.menu = new Menu([
        { label: opt.no || 'לא', x: x + 20, y: by, w: bw, h: 26, onPress: () => { Game.pop(); opt.onNo && opt.onNo(); } },
        { label: opt.yes || 'כן', x: x + w - 20 - bw, y: by, w: bw, h: 26, onPress: () => { Game.pop(); onYes(); } },
      ], { focus: 0 });   // הפוקוס מתחיל על "לא" – הכי בטוח
    },
    update() {
      if (Input.was('b')) { Sound.back(); Game.pop(); opt.onNo && opt.onNo(); return; }
      this.menu.update();
    },
    draw(t) {
      dim(0.55);
      panel(x, y, w, h, PAL.paper);
      text(msg, W / 2, y + 22, { size: 13, bold: true, color: PAL.outline });
      if (opt.sub) text(opt.sub, W / 2, y + 40, { size: 10, color: '#7a5a44' });
      this.menu.draw(t);
    },
  };
  Game.push(o);
}

// ---------------------------------------------------------------------
// בחירת משבצת שמירה (משמש את מסך הפתיחה ואת אפליקציית "שמירות")
// opt: { title, isEnabled(i, data), onPick(i, data), canDelete }
// ---------------------------------------------------------------------
function SlotPicker(opt) {
  const pw = 400, ph = 232, px = (W - pw) / 2, py = (H - ph) / 2;
  const cw = 376, chh = 46, cx = px + 12;
  const o = {
    enter() { this.build(); },
    build() {
      const data = Save.all();
      const items = data.map((d, i) => ({
        x: cx, y: py + 34 + i * (chh + 8), w: cw, h: chh,
        disabled: !opt.isEnabled(i, d),
        onPress: () => opt.onPick(i, d),
        render: (it, f, bob) => drawSlotCard(it, i, d, f, bob),
      }));
      // כפתור מחיקה קטן ליד כל משבצת מלאה (רק אם מבקשים)
      if (opt.canDelete) data.forEach((d, i) => {
        if (!d) return;
        items.push({
          x: cx + 6, y: py + 34 + i * (chh + 8) + chh - 20, w: 16, h: 16,
          onPress: () => Confirm('למחוק את משבצת ' + (i + 1) + '?', () => {
            Save.remove(i); Game.say('המשבצת נמחקה'); this.build();
            if (!Save.any()) Game.pop();
          }, { sub: 'אי אפשר לבטל את זה', yes: 'למחוק' }),
          render: (it, f) => { panel(it.x, it.y, it.w, it.h, f ? PAL.warm : '#e9d9c4'); text('🗑', it.x + 8, it.y + 9, { size: 9 }); },
        });
      });
      items.push({ label: 'חזרה', x: px + pw / 2 - 45, y: py + ph - 30, w: 90, h: 22, size: 12, onPress: () => Game.pop() });
      const firstOk = items.findIndex(it => !it.disabled);
      this.menu = new Menu(items, { focus: Math.max(0, firstOk) });
    },
    update() {
      if (Input.was('b')) { Sound.back(); Game.pop(); return; }
      this.menu.update();
    },
    draw(t) {
      dim(0.6);
      panel(px, py, pw, ph, '#4a2f6e', { light: 'rgba(255,255,255,0.3)' });
      text(opt.title, W / 2, py + 17, { size: 15, bold: true, color: PAL.paper, stroke: PAL.outline, strokeWidth: 3 });
      this.menu.draw(t);
    },
  };
  Game.push(o);
  return o;
}

function drawSlotCard(it, i, d, focused, bob) {
  const x = it.x, y = it.y + bob, w = it.w, h = it.h;
  const active = Save.slot === i && Save.state;
  const fill = it.disabled ? '#b9aa98' : focused ? PAL.warm : PAL.paper;
  panel(x, y, w, h, fill);
  const R = x + w - 10;
  if (!d) {
    text(`משבצת ${i + 1}`, R, y + 15, { size: 12, bold: true, color: PAL.outline, align: 'right' });
    text('ריקה ✨', R, y + 32, { size: 11, color: '#7a5a44', align: 'right' });
    return;
  }
  text(`משבצת ${i + 1} · עולם ${d.world}: ${WORLD_NAMES[d.world]}`, R, y + 14, { size: 12, bold: true, color: PAL.outline, align: 'right' });
  text(`רמה ${d.level} · 👯 ${d.friends.length}/5 · ⏱ ${formatPlayTime(d.playTime)}`, R, y + 32, { size: 11, color: PAL.outline, align: 'right' });
  text(formatDate(d.savedAt), x + 28, y + 14, { size: 9, color: '#7a5a44', align: 'left' });
  if (active) {
    panel(x + 28, y + 26, 62, 14, PAL.secondary);
    text('המשחק הנוכחי', x + 59, y + 33, { size: 8, bold: true });
  }
}
