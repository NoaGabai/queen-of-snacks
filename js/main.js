// =====================================================================
// נקודת הכניסה: מחכים לגופן ולתמונות, ומתחילים במסך הפתיחה
// =====================================================================
fit();
document.getElementById('rotateIcon').innerHTML = icon('phone');

// הגופן Heebo ארוז ב-assets/fonts/heebo.css. מחכים לו (עד 2 שניות) לפני הציור הראשון.
// אם הוא חסר, המשחק ממשיך עם גופן המערכת.
function loadFonts() {
  if (!document.fonts || !document.fonts.load) return Promise.resolve();
  const want = Promise.all([document.fonts.load('400 21px Heebo'), document.fonts.load('700 22px Heebo')])
    .then(() => { if (!document.fonts.check('700 22px Heebo')) console.warn('הגופן Heebo לא נמצא – ראו assets/fonts/README.md'); })
    .catch(() => { });
  return Promise.race([want, new Promise(r => setTimeout(r, 2000))]);
}

// המסכים שאפשר להיות בהם כשהמשחק נשמר
const SCENES = { kitchen: KitchenScene, world1: World1Scene };
const WORLD_SCENES = { 1: World1Scene };     // עולמות 2–5 יתווספו בהמשך
function sceneFor(st) { return SCENES[st.place && st.place.scene] || KitchenScene; }

Promise.all([
  loadFonts(),
  Assets.load([
    'mai3_idle', 'mai3_glasses', 'mai3_cuddle',
    'lizzy_sit', 'lizzy_sleep', 'lizzy_purr',
    ...KITCHEN_IMAGES(), ...WORLD1_IMAGES(), ...BATTLE_IMAGES(),
  ]),
]).then(() => {
  document.getElementById('loading').remove();
  Game.go(TitleScene);
  startLoop();
});
