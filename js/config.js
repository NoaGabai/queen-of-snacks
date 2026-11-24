// =====================================================================
// הגדרות המשחק – כל המספרים במקום אחד (game-design.md ← "קושי והגדרות").
//
// אפשר לשנות כאן כל מספר כדי לכוון את הקושי, בלי לגעת בשאר הקוד.
// אחרי שינוי: שומרים את הקובץ ומרעננים את הדף. שמירות קיימות ממשיכות לעבוד.
//
// סימנים בדפוסים של האויבים (pattern), לפי הסדר שבו הם חוזרים בלולאה:
//   { t: 'atk', v: 5 }          תקיפה של 5
//   { t: 'def' }                הגנה: הפגיעה הבאה של מאי בחצי (חוץ מ"שובר הגנה")
//   { t: 'charge' }             מתכונן: מה שבא אחריו הוא בדרך כלל מכה חזקה
//   { t: 'burn', v: 4, burn: 2 } מצית: פגיעה של 4, ועוד 2 נזק בתחילת התור של מאי
//   { t: 'heal', v: 10 }        סופר-פוד: האויב מרפא את עצמו
// =====================================================================

const CFG = {

  // ------------------------------------------------------------- מאי
  mai: {
    hpBase: 20,          // חיים ברמה 1
    hpPerLevel: 4,       // עוד חיים בכל רמה
    levelBonusDiv: 2,    // בונוס נזק = רמה ÷ זה (מעוגל למטה)
  },

  // ------------------------------------------------------------- קראנץ'
  crunch: {
    start: 2,            // בתחילת כל קרב
    perTurn: 1,          // נטען בסוף כל תור
    max: 5,
  },

  // ------------------------------------------------------------- מכפילים
  mult: {
    weakVeg: 1.5,        // פגיעה בחולשה של ירק רגיל
    weakBoss: 2,         // פגיעה בחולשה של בוס (בוס יכול לקבוע mult משלו)
    defense: 0.5,        // כשהאויב בהגנה
    guard: 0.5,          // התכרבלות בסווטשירט: חלק מהמכה הבאה שמאי עדיין חוטפת (גם משריפה)
    boost: 1.5,          // משקפיים על העיניים: המהלך הבא
  },

  // ------------------------------------------------------------- מד נישנושים (באחוזים)
  snack: {
    hit: 10,             // מאי פוגעת
    weakHit: 15,         // מאי פוגעת בחולשה
    hurt: 10,            // מאי נפגעת
  },

  // ------------------------------------------------------------- רוגלך ואמא
  rugelach: {
    perTrip: 3,          // כמה רוגלך לכל יציאה (מתמלא אצל ליזי ובמטבח)
    eat: 10,             // אכילה: ריפוי
    throw: 8,            // זריקה: נזק (בלי טעם)
    iritHeal: 10,        // אמא בקרב בוס: ריפוי
    iritBelow: 0.3,      // אמא מגיעה כשהחיים של מאי מתחת ל-30% (פעם אחת בקרב בוס)
  },

  // ------------------------------------------------------------- רמות
  levels: {
    xp: [0, 0, 30, 70, 120, 180, 250, 330, 420, 520, 630],   // ניסיון מצטבר לכל רמה (המקום = הרמה)
    moves: { 2: 'seeds', 3: 'choc_bite', 4: 'salt_wave', 5: 'choc_syrup', 6: 'pancake', 7: 'tabasco' },   // מהלך שנפתח ברמה
    rugelachLevel: 8,    // מהרמה הזו: עוד רוגלך לכל יציאה
    crunchLevel: 9,      // מהרמה הזו: מתחילים כל קרב עם עוד קראנץ'
    snackLevel: 10,      // מהרמה הזו: מד הנישנושים מתמלא מהר יותר
    snackLevelMult: 1.25,
  },

  // ------------------------------------------------------------- 12 המהלכים
  // flav: salty מלוח / sweet מתוק / spicy חריף / plain בלי טעם
  // cost = קראנץ', pow = כוח, heal = ריפוי, burn = שורף, pierce = שובר הגנה
  moves: {
    pretzel:     { flav: 'salty', cost: 0, pow: 4, ic: 'pretzel' },
    cuddle:      { flav: 'plain', cost: 1, guard: true, ic: 'hoodie', d: 'המכה הבאה חצי נזק' },
    seeds:       { flav: 'salty', cost: 2, pow: 9, ic: 'seeds' },
    glasses:     { flav: 'plain', cost: 1, boost: true, ic: 'glasses', d: 'המהלך הבא חזק פי <bdi>1.5</bdi>' },
    choc_bite:   { flav: 'sweet', cost: 0, pow: 3, heal: 2, ic: 'chocbite' },
    cracker:     { flav: 'salty', cost: 2, pow: 6, pierce: true, ic: 'cracker' },
    salt_wave:   { flav: 'salty', cost: 3, pow: 13, ic: 'saltwave' },
    choc_syrup:  { flav: 'sweet', cost: 2, pow: 6, heal: 4, ic: 'chocsyrup' },
    chili:       { flav: 'spicy', cost: 0, pow: 2, burn: 2, ic: 'chilisauce' },
    pancake:     { flav: 'sweet', cost: 3, pow: 0, heal: 12, ic: 'pancake', d: 'מחזיר <bdi>12</bdi> חיים' },
    tabasco:     { flav: 'spicy', cost: 2, pow: 5, burn: 4, ic: 'tabasco' },
    chili_gross: { flav: 'spicy', cost: 3, pow: 8, burn: 6, ic: 'chiligross' },
  },

  // ------------------------------------------------------------- הנישנושים האגדיים (כפתור הזהב)
  legendary: {
    popcorn: { hits: 3, pow: 5 },              // 3 פגיעות מלוחות של 5 (בלי בונוס רמה; כל פגיעה מקבלת חולשה)
    chips:   { pow: 18 },                      // 18 נזק מלוח, מתעלם מהגנה (בלי בונוס רמה)
    kinder:  { pow: 6 },                       // ריפוי מלא + 6 נזק מתוק
    cheetos: { pow: 8, burn: 6, turns: 3 },    // 8 נזק חריף + שורף 6 למשך 3 תורות
  },

  // ------------------------------------------------------------- אויבים ("אויבים v1")
  // hp חיים · weak חולשה · mult מכפיל חולשה (ברירת מחדל: weakVeg / weakBoss) · xp ניסיון · cigs סיגריות
  // g: 'm' = לשון זכר בהודעות (ברירת מחדל: נקבה)
  enemies: {
    // עולם 1 – גינת הבצל הירוק
    tomato:   { he: 'עגבניית שרי', hp: 14, weak: 'salty', xp: 10, cigs: 3, spr: 'world1/veg_tomato', bg: 'world1/bg_garden',
                pattern: [{ t: 'atk', v: 3 }, { t: 'atk', v: 3 }, { t: 'charge' }, { t: 'atk', v: 6 }] },
    carrot:   { he: 'גזר', g: 'm', hp: 18, weak: 'salty', xp: 10, cigs: 3, spr: 'world1/veg_carrot', bg: 'world1/bg_garden',
                pattern: [{ t: 'def' }, { t: 'atk', v: 4 }, { t: 'atk', v: 4 }] },
    onion:    { he: 'הבצל הירוק הגדול', g: 'm', boss: true, hp: 80, weak: 'salty', xp: 40, cigs: 15, legendary: 0, world: 1,
                spr: 'world1/boss_onion_1', spr2: 'world1/boss_onion_2', bg: 'world1/bg_plaza',
                wait: 'מחכה בכיכר', p2name: 'דמעות', p2say: 'דמעות!', p2msg: 'מתחיל לבכות… ומתעצבן!', p2col: '#8FD0F2',
                pattern:  [{ t: 'atk', v: 4 }, { t: 'atk', v: 4 }, { t: 'charge' }, { t: 'atk', v: 8 }],
                pattern2: [{ t: 'atk', v: 5 }, { t: 'atk', v: 5 }, { t: 'charge' }, { t: 'atk', v: 10 }] },
    // עולם 2 – ביצת החמוצים
    cucumber: { he: 'מלפפון', g: 'm', hp: 22, weak: 'sweet', xp: 12, cigs: 4, spr: 'world2/veg_cucumber', bg: 'world2/bg_swamp',
                pattern: [{ t: 'atk', v: 5 }, { t: 'atk', v: 5 }, { t: 'def' }] },
    olive:    { he: 'זית סורי', g: 'm', hp: 18, weak: 'salty', xp: 12, cigs: 4, spr: 'world2/veg_olive', bg: 'world2/bg_swamp',
                pattern: [{ t: 'atk', v: 4 }, { t: 'charge' }, { t: 'atk', v: 9 }] },
    pickle:   { he: 'החמוץ', g: 'm', boss: true, hp: 100, weak: 'salty', xp: 40, cigs: 20, legendary: 1, world: 2,
                spr: 'world2/boss_pickle_1', spr2: 'world2/boss_pickle_2', bg: 'world2/bg_jar',
                wait: 'מחכה בתוך הצנצנת', p2name: 'חומץ', p2say: 'hot pickle!', p2msg: 'מוריד את המשקפיים… ומתחמם!', p2col: '#D6EC98',
                pattern:  [{ t: 'atk', v: 5 }, { t: 'def' }, { t: 'atk', v: 5 }, { t: 'charge' }, { t: 'atk', v: 10 }],
                pattern2: [{ t: 'burn', v: 4, burn: 2 }, { t: 'atk', v: 6 }, { t: 'charge' }, { t: 'atk', v: 12 }] },
  },

  // ------------------------------------------------------------- קישוט המטבח (מחיר בסיגריות + הבונוס)
  decor: {
    yarn:    { price: 20, hp: 4 },        // חוט לליזי: +4 חיים מקסימליים
    speaker: { price: 15 },               // רמקול: נגן שירים (בעדכון עם המוזיקה)
    lava:    { price: 25, snack: 20 },    // מנורת לבה: מד הנישנושים מתחיל ב-20%
    fridge:  { price: 30, cigs: 1 },      // מקרר מלא: +1 סיגריה מכל קרב
    photos:  { price: 35, xp: 0.10 },     // קיר תמונות: +10% ניסיון
    neon:    { price: 60 },               // שלט ניאון: רק יופי
  },

  // ------------------------------------------------------------- התנור של אמא
  oven: {
    choc: { price: 40, eat: 15, throw: 12 },   // רוגלך עם שוקולד כפול: אכילה 15, זריקה 12
    tray: { price: 50, rugelach: 1 },          // מגש גדול: +1 רוגלך לכל יציאה
  },

  // ------------------------------------------------------------- אביזרים
  accessories: {
    pouch:         { crunch: 1 },     // פאוץ': +1 קראנץ' בתחילת קרב
    slippers:      { hp: 6 },         // נעלי בית פרוותיות: +6 חיים מקסימליים
    choc_bracelet: { heal: 2 },       // צמיד שוקולד: מהלכים מתוקים מרפאים עוד 2
    red_polish:    { burn: 2 },       // לק אדום: שריפה +2
    salt_shaker:   { salty: 2 },      // מלחייה: מהלכים מלוחים +2 נזק
    snack_bag:     { rugelach: 1 },   // תיק נישנושים: +1 רוגלך לכל יציאה
  },

  // ------------------------------------------------------------- שקיות הפתעה
  bags: {
    coinCigs: 10,        // שקית מטבע: כמה סיגריות
  },
};
