(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const frame = document.getElementById("gameFrame");
  const TAU = Math.PI * 2;
  const FAST_TEST = Boolean(window.__GAME_TEST__);
  const keys = new Set();
  const ui = {
    hud: byId("hud"), start: byId("startScreen"), upgrade: byId("upgradeScreen"),
    details: byId("detailsScreen"), pause: byId("pauseScreen"), end: byId("endScreen"),
    hpText: byId("hpText"), hpBar: byId("hpBar"), xpBar: byId("xpBar"), levelText: byId("levelText"),
    timer: byId("timerText"), stage: byId("stageText"), kills: byId("killText"), points: byId("pointText"),
    weaponStrip: byId("weaponStrip"), enemyReadout: byId("enemyReadout"),
    bossWrap: byId("bossBarWrap"), bossBar: byId("bossHpBar"), bossText: byId("bossHpText"), bossName: byId("bossName"),
    choices: byId("upgradeChoices"), pointsRemaining: byId("pointsRemaining"), continue: byId("continueButton"),
    upgradeEyebrow: byId("upgradeEyebrow"), upgradeTitle: byId("upgradeTitle"), roundStats: byId("roundStats"),
    upgradeLoadout: byId("upgradeLoadout"), detailsLoadout: byId("detailsLoadout"), endLoadout: byId("endLoadout"),
    reroll: byId("rerollButton"), toast: byId("toast"), endTitle: byId("endTitle"),
    endEyebrow: byId("endEyebrow"), endStats: byId("endStats"), modeDescription: byId("modeDescription"),
    rogueMode: byId("rogueModeButton"), endlessMode: byId("endlessModeButton"), difficultyGroup: byId("difficultyGroup"),
    origin: byId("originScreen"), originChoices: byId("originChoices"), codex: byId("codexScreen"),
    codexContent: byId("codexContent"), metaProgress: byId("metaProgress"), mutationText: byId("mutationText"),
    routeSection: byId("routeSection"), routeChoices: byId("routeChoices"), routeStatus: byId("routeStatus"),
    chest: byId("chestScreen"), chestChoices: byId("chestChoices"), achievement: byId("achievementScreen"),
    achievementContent: byId("achievementContent"), achievementSummary: byId("achievementSummary"),
    touchControls: byId("touchControls"), joystick: byId("joystick"), joystickKnob: byId("joystickKnob")
  };

  const difficulties = {
    easy: { label: "休闲", hp: .78, damage: .72, speed: .9, spawn: .82, reward: 1 },
    normal: { label: "标准", hp: 1, damage: 1, speed: 1, spawn: 1, reward: 1 },
    hard: { label: "残酷", hp: 1.32, damage: 1.2, speed: 1.08, spawn: 1.18, reward: 1.12 },
    nightmare: { label: "噩梦", hp: 1.72, damage: 1.45, speed: 1.16, spawn: 1.38, reward: 1.28 }
  };

  const stages = [
    { name: "灰烬荒原", duration: FAST_TEST ? 4 : 28, unlocks: ["crawler", "swift"] },
    { name: "破碎回廊", duration: FAST_TEST ? 4 : 31, unlocks: ["crawler", "swift", "tank"] },
    { name: "寂静炮台", duration: FAST_TEST ? 4 : 34, unlocks: ["crawler", "swift", "tank", "shooter"] },
    { name: "孵化深井", duration: FAST_TEST ? 4 : 37, unlocks: ["crawler", "tank", "shooter", "summoner"] },
    { name: "熔铁要塞", duration: FAST_TEST ? 6 : 42, unlocks: ["crawler", "tank", "shooter", "charger"], boss: true },
    { name: "逆流墓园", duration: FAST_TEST ? 4 : 38, unlocks: ["swift", "tank", "charger", "summoner"] },
    { name: "蚀光工厂", duration: FAST_TEST ? 4 : 42, unlocks: ["crawler", "shooter", "charger", "summoner"] },
    { name: "无声蜂巢", duration: FAST_TEST ? 4 : 46, unlocks: ["swift", "tank", "shooter", "summoner"] },
    { name: "虚空阶梯", duration: FAST_TEST ? 4 : 50, unlocks: ["crawler", "tank", "shooter", "charger", "summoner"] },
    { name: "裂隙王座", duration: FAST_TEST ? 6 : 58, unlocks: ["crawler", "tank", "shooter", "charger", "summoner"], boss: true }
  ];

  const origins = [
    { id: "ranger", name: "灰烬游侠", icon: "➤", color: "#fb923c", style: "精准追踪 · 弹道成长",
      desc: "放弃侧炮，以高等级连弩和分裂弹丸快速建立正面火力。", kit: ["余烬连弩 LV.2", "分岔火舌 ×1", "伤害 +10%"],
      apply(p) { p.weapons = [{ id: "ember", level: 2, cooldown: 0 }]; p.multishot = 1; p.damageMult *= 1.1; } },
    { id: "gunner", name: "四向枪手", icon: "↔", color: "#22d3ee", style: "多向齐射 · 高速弹幕",
      desc: "保留两套枪械，用更高攻速同时封锁正面与侧面。", kit: ["双生侧炮 LV.2", "余烬连弩 LV.1", "攻击速度 +12%"],
      apply(p) { p.weapons.find(w => w.id === "twins").level = 2; p.fireRateMult *= .88; } },
    { id: "dancer", name: "环刃舞者", icon: "◌", color: "#6ee7b7", style: "贴身环绕 · 高速走位",
      desc: "以移动速度换取贴身切割优势，适合围绕敌群穿梭。", kit: ["星环刃 LV.1", "移动速度 +18%", "拾取范围 +20%"],
      apply(p) { p.weapons = [{ id: "orbit", level: 1, cooldown: 0 }, { id: "ember", level: 1, cooldown: 0 }]; p.guardians = [{ id: "sentinel", level: 1, cooldown: 0, charges: 0 }]; p.speed *= 1.18; p.magnet *= 1.2; } },
    { id: "bulwark", name: "黑曜壁垒", icon: "⬡", color: "#fda4af", style: "重装反击 · 生存成长",
      desc: "牺牲少量速度换取高生命与护甲，稳步构筑不灭防线。", kit: ["最大生命 +35", "护甲 +12%", "移动速度 -7%"],
      apply(p) { p.maxHp += 35; p.hp = p.maxHp; p.armor += .12; p.guardians.find(item => item.id === "shield").level = 2; p.speed *= .93; } },
    { id: "scholar", name: "裂隙学者", icon: "✦", color: "#c084fc", style: "全向脉冲 · 稀有构筑",
      desc: "从脉冲环起步，并拥有更高概率发现稀有与史诗强化。", kit: ["脉冲环 LV.1", "幸运 +22%", "拾取范围 +25%"],
      apply(p) { p.weapons = [{ id: "nova", level: 1, cooldown: 0 }, { id: "ember", level: 1, cooldown: 0 }]; p.guardians = [{ id: "prism", level: 1, cooldown: 0, charges: 1 }]; p.luck += .22; p.magnet *= 1.25; } },
    { id: "scavenger", name: "荒原拾荒者", icon: "◎", color: "#facc15", style: "随机武装 · 高频重掷",
      desc: "每局从两件随机武器开始，拥有更多重掷但生命较低。", kit: ["随机武器 ×2", "额外重掷 ×1", "最大生命 -15"],
      apply(p) { const ids = Object.keys(weaponMeta).sort(() => Math.random() - .5).slice(0, 2); p.weapons = ids.map(id => ({ id, level: 1, cooldown: 0 })); p.maxHp -= 15; p.hp = p.maxHp; p.bonusRerolls = 1; p.luck += .1; } }
  ];

  const routes = [
    { id: "arsenal", name: "失落军械库", icon: "▣", risk: "低风险", desc: "下次整备至少出现 2 个武器强化。", weaponBias: true },
    { id: "hunt", name: "精英狩猎", icon: "♜", risk: "中风险 · +1 技能点", desc: "下关提前出现精英，但结算额外获得 1 点。", forceElite: true, bonusPoint: 1 },
    { id: "camp", name: "余火营地", icon: "♨", risk: "安全路线", desc: "进入下关时额外恢复 35% 最大生命。", healing: .35 },
    { id: "rift", name: "混沌裂隙", icon: "◈", risk: "高风险 · 经验 +35%", desc: "异变效果强化，敌人更危险且经验更多。", mutationBoost: true, xp: 1.35 },
    { id: "archive", name: "古代档案", icon: "⌘", risk: "构筑路线", desc: "下次整备额外重掷 1 次，永久幸运 +8%。", rerolls: 1, luck: .08 },
    { id: "bounty", name: "血色契约", icon: "†", risk: "敌人生命 +25% · +1 技能点", desc: "下关敌人更坚韧，结算额外获得 1 点。", hp: 1.25, bonusPoint: 1 }
  ];

  const mutations = [
    { id: "swarm", name: "孵化狂潮", desc: "敌人更多但更脆弱", spawn: 1.42, hp: .78, speed: 1, damage: 1, xp: 1 },
    { id: "armor", name: "黑曜硬化", desc: "敌人坚韧、缓慢且奖励更高", spawn: .88, hp: 1.38, speed: .87, damage: 1, xp: 1.28 },
    { id: "frenzy", name: "血月躁动", desc: "敌人速度与伤害提升", spawn: 1.08, hp: 1, speed: 1.22, damage: 1.18, xp: 1.22 },
    { id: "volatile", name: "不稳定核心", desc: "敌人死亡时释放危险碎片", spawn: 1, hp: 1, speed: 1, damage: 1, xp: 1.3, volatile: true },
    { id: "abundance", name: "余烬丰饶", desc: "经验产出大幅提升", spawn: 1.08, hp: 1.08, speed: 1, damage: 1, xp: 1.48 }
  ];

  const weaponMeta = {
    ember: { name: "余烬连弩", icon: "➤", desc: "自动追踪最近敌人", tags: ["弹道", "追踪"] },
    twins: { name: "双生侧炮", icon: "↔", desc: "沿角色两侧同时射击", tags: ["弹道", "多向"] },
    orbit: { name: "星环刃", icon: "◌", desc: "环绕角色持续切割", tags: ["环绕", "近战"] },
    nova: { name: "脉冲环", icon: "✦", desc: "向所有方向释放弹幕", tags: ["脉冲", "多向"] }
  };

  const guardianMeta = {
    shield: { name: "炽晶护盾", icon: "◒", desc: "实体盾片环绕角色，自动拦截敌方弹丸", tags: ["护甲", "拦截"] },
    sentinel: { name: "守望无人机", icon: "⌾", desc: "独立悬浮炮台，从侧翼自动攻击敌人", tags: ["守护", "自动炮台"] },
    thorns: { name: "棘甲外骨骼", icon: "✣", desc: "提供接触减伤，受击后释放反击尖刺", tags: ["护甲", "反击"] },
    prism: { name: "棱镜圣衣", icon: "⬢", desc: "周期生成可吸收一次伤害的能量屏障", tags: ["屏障", "恢复"] }
  };

  const synergyCatalog = [
    { id: "barrage", name: "交叉火网", hint: "余烬连弩 LV.2 + 双生侧炮 LV.2", desc: "两种枪械攻击速度额外 +20%", check: p => weaponLevel(p, "ember") >= 2 && weaponLevel(p, "twins") >= 2 },
    { id: "bladeDance", name: "永动刃舞", hint: "星环刃 + 追风足甲 ×2", desc: "环刃伤害 +40%，环绕半径扩大", check: p => weaponLevel(p, "orbit") >= 1 && skillRank(p, "speed") >= 2 },
    { id: "fortress", name: "不灭堡垒", hint: "余烬之心 ×2 + 黑曜护壳 ×2", desc: "额外获得 10% 减伤与每秒 0.4 恢复", check: p => skillRank(p, "health") >= 2 && skillRank(p, "armor") >= 2 },
    { id: "starfall", name: "群星坠落", hint: "脉冲环 LV.2 + 贯穿余辉 ×2", desc: "脉冲弹幕 +4，伤害 +25%", check: p => weaponLevel(p, "nova") >= 2 && skillRank(p, "pierce") >= 2 },
    { id: "arsenal", name: "行走军火库", hint: "同时持有 4 种武器", desc: "所有武器伤害 +20%", check: p => p.weapons.length >= 4 }
  ];

  const achievementCatalog = [
    ...origins.map(origin => ({ id: `win_${origin.id}`, name: `${origin.name}的凯旋`, desc: `使用${origin.name}完成十关远征。`, category: "原型通关" })),
    { id: "clear_no_hit", name: "毫发无伤", desc: "不受到任何伤害完成一关。", category: "关卡挑战" },
    { id: "clear_single_weapon", name: "孤胆武装", desc: "只携带一件武器完成任意关卡。", category: "构筑挑战" },
    { id: "clear_four_weapons", name: "火力展览", desc: "携带全部四类武器完成一关。", category: "构筑挑战" },
    { id: "clear_low_hp", name: "余火一线", desc: "以不超过 20% 的生命完成一关。", category: "极限挑战" },
    { id: "clear_armor40", name: "不可撼动", desc: "以至少 40% 护甲完成一关。", category: "数值挑战" },
    { id: "stage_damage_5000", name: "过量火力", desc: "单关造成至少 5000 点伤害。", category: "数值挑战" },
    { id: "open_5_chests", name: "精英收藏家", desc: "累计开启 5 个精英宝箱。", category: "探索挑战" },
    { id: "win_hard", name: "残酷远征", desc: "在残酷难度完成十关。", category: "难度通关" },
    { id: "win_nightmare", name: "噩梦终结者", desc: "在噩梦难度完成十关。", category: "难度通关" }
  ];

  const enemyMeta = {
    crawler: { name: "爬行影", color: "#8b5cf6" }, swift: { name: "掠影", color: "#38bdf8" },
    tank: { name: "甲壳兽", color: "#b45309" }, shooter: { name: "蚀光炮手", color: "#a16207" },
    charger: { name: "裂角冲锋者", color: "#9f1239" }, summoner: { name: "孵化祭司", color: "#7e22ce" },
    minion: { name: "幼体", color: "#a78bfa" }, elite: { name: "精英影兽", color: "#e879f9" },
    boss: { name: "裂隙领主", color: "#701a35" }
  };

  const upgradeCatalog = [
    skill("damage", "炽烈弹芯", "◆", "所有武器伤害 +18%", p => p.damageMult *= 1.18),
    skill("haste", "过载节拍", "⌁", "所有武器攻击速度 +14%", p => p.fireRateMult *= .86),
    skill("speed", "追风足甲", "➤", "移动速度 +12%", p => p.speed *= 1.12),
    skill("health", "余烬之心", "♥", "最大生命 +20，并恢复 20", p => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); }),
    skill("armor", "黑曜护壳", "⬡", "受到的伤害 -8%", p => p.armor = Math.min(.62, p.armor + .08)),
    skill("magnet", "磁引核心", "◎", "拾取范围 +30%", p => p.magnet *= 1.3),
    skill("regen", "复燃血脉", "♨", "每秒恢复 0.45 生命", p => p.regen += .45),
    skill("pierce", "贯穿余辉", "↠", "弹丸额外贯穿 1 个敌人", p => p.pierce++),
    skill("multishot", "分岔火舌", "⋔", "追踪武器额外发射 1 枚弹丸", p => p.multishot++),
    weaponUpgrade("ember"), weaponUpgrade("twins"), weaponUpgrade("orbit"), weaponUpgrade("nova"),
    guardianUpgrade("shield"), guardianUpgrade("sentinel"), guardianUpgrade("thorns"), guardianUpgrade("prism")
  ];

  let selectedMode = "rogue";
  let selectedDifficulty = "normal";
  let state = "menu";
  let player, enemies, bullets, enemyBullets, gems, chests, particles, texts;
  let stageIndex = 0, stageElapsed = 0, totalElapsed = 0, spawnClock = 0, lastTime = 0;
  let stageKillsStart = 0, stageDamageStart = 0, stageDamageTakenStart = 0, stageEliteSpawned = false, bossSpawned = false;
  let shake = 0, flash = 0, toastTimer = 0, hudClock = 0, endlessCheckpoint = 0;
  let upgradePoints = 0, upgradeReason = "stage", rerolls = 1;
  let currentMutation = mutations[0], currentRoute = null, nextRoute = null, selectedOrigin = null;
  let runSeed = "", profile = loadProfile();
  const touchInput = { x: 0, y: 0, active: false, pointerId: null };

  function byId(id) { return document.getElementById(id); }
  function skill(id, title, icon, desc, apply) {
    const tags = { damage: ["输出"], haste: ["攻速"], speed: ["机动"], health: ["生存"], armor: ["生存"], magnet: ["资源"], regen: ["恢复"], pierce: ["弹道"], multishot: ["弹道", "多重"] };
    return { id, title, icon, desc, kind: "skill", tags: tags[id] || [], apply };
  }
  function weaponUpgrade(id) {
    const meta = weaponMeta[id];
    return { id: `weapon_${id}`, title: meta.name, icon: meta.icon, kind: "weapon", tags: meta.tags, desc: meta.desc,
      apply(p) { const weapon = p.weapons.find(item => item.id === id); weapon ? weapon.level++ : p.weapons.push({ id, level: 1, cooldown: 0 }); } };
  }

  function guardianUpgrade(id) {
    const meta = guardianMeta[id];
    return { id: `guardian_${id}`, title: meta.name, icon: meta.icon, kind: "guardian", tags: meta.tags, desc: meta.desc,
      apply(p) { const item = p.guardians.find(guardian => guardian.id === id); item ? item.level++ : p.guardians.push({ id, level: 1, cooldown: 0, charges: 0 }); } };
  }

  function weaponLevel(p, id) { return p.weapons.find(w => w.id === id)?.level || 0; }
  function guardianLevel(p, id) { return p.guardians.find(item => item.id === id)?.level || 0; }
  function skillRank(p, id) { return p.skills[id] || 0; }
  function activeSynergies() { return player ? synergyCatalog.filter(item => item.check(player)) : []; }
  function hasSynergy(id) { return activeSynergies().some(item => item.id === id); }

  function loadProfile() {
    const fallback = { runs: 0, wins: 0, bestStage: 0, origins: [], weapons: ["ember", "twins"], guardians: ["shield"], synergies: [], achievements: [], chestsOpened: 0 };
    try { return { ...fallback, ...JSON.parse(localStorage.getItem("emberEchoProfile") || "{}") }; } catch { return fallback; }
  }

  function saveProfile() {
    try { localStorage.setItem("emberEchoProfile", JSON.stringify(profile)); } catch { /* file previews may disable storage */ }
  }

  function discover(type, id) {
    if (!profile[type].includes(id)) { profile[type].push(id); saveProfile(); }
  }

  function resetRun() {
    player = {
      x: canvas.logicalWidth / 2, y: canvas.logicalHeight / 2, r: 17, facing: 0, speed: 225,
      hp: 105, maxHp: 105, xp: 0, xpNext: 16, level: 1, kills: 0, pendingPoints: 0,
      damageMult: 1, fireRateMult: 1, armor: 0, regen: 0, magnet: 105, pierce: 0, multishot: 0,
      luck: 0, xpMult: 1, bonusRerolls: 0, chestsOpened: 0, invuln: 0, damageDone: 0, damageTaken: 0, skills: {}, origin: null,
      weapons: [{ id: "ember", level: 1, cooldown: 0 }, { id: "twins", level: 1, cooldown: 0 }],
      guardians: [{ id: "shield", level: 1, cooldown: 0, charges: 1 }], guardianRetaliation: 0
    };
    enemies = []; bullets = []; enemyBullets = []; gems = []; chests = []; particles = []; texts = [];
    stageIndex = 0; totalElapsed = 0; endlessCheckpoint = 0; shake = flash = toastTimer = 0;
    currentRoute = null; nextRoute = null; currentMutation = mutations[Math.floor(Math.random() * mutations.length)];
    runSeed = Math.random().toString(36).slice(2, 8).toUpperCase();
    startStage(true);
    updateHud(true);
  }

  function startStage(first = false) {
    stageElapsed = 0; spawnClock = .35; stageKillsStart = player?.kills || 0; stageDamageStart = player?.damageDone || 0; stageDamageTakenStart = player?.damageTaken || 0;
    stageEliteSpawned = false; bossSpawned = false; enemies = []; bullets = []; enemyBullets = []; gems = []; chests = [];
    if (!first) {
      currentMutation = rollMutation();
      const healing = .22 + (currentRoute?.healing || 0);
      player.hp = Math.min(player.maxHp, player.hp + player.maxHp * healing);
    }
  }

  function openOriginDraft() {
    resetRun(); state = "origin"; selectedOrigin = null;
    ui.start.classList.add("hidden"); ui.end.classList.add("hidden"); ui.origin.classList.remove("hidden"); ui.hud.classList.add("hidden");
    const draft = [...origins].sort(() => Math.random() - .5).slice(0, 3);
    ui.originChoices.innerHTML = "";
    for (const origin of draft) {
      const card = document.createElement("button"); card.className = "origin-card"; card.style.setProperty("--origin-color", origin.color);
      card.innerHTML = `<span class="origin-icon">${origin.icon}</span><small>${origin.style}</small><h3>${origin.name}</h3><p>${origin.desc}</p><div class="origin-kit">${origin.kit.map(item => `<span>${item}</span>`).join("")}</div>`;
      card.onclick = () => startGame(origin); ui.originChoices.appendChild(card);
    }
  }

  function startGame(origin) {
    selectedOrigin = origin; player.origin = origin.id; origin.apply(player); discover("origins", origin.id);
    for (const weapon of player.weapons) discover("weapons", weapon.id);
    for (const guardian of player.guardians) discover("guardians", guardian.id);
    profile.runs++; saveProfile(); state = "playing"; lastTime = performance.now();
    ui.origin.classList.add("hidden"); ui.upgrade.classList.add("hidden");
    ui.hud.classList.remove("hidden"); ui.touchControls.classList.remove("hidden");
    updateHud(true);
    showToast(`${origin.name} · ${selectedMode === "rogue" ? `第 1 关 ${stages[0].name}` : "无尽战场"}`);
    requestAnimationFrame(loop);
  }

  function rollMutation() {
    let chosen = mutations[Math.floor(Math.random() * mutations.length)];
    if (currentRoute?.mutationBoost) chosen = { ...chosen, name: `强化·${chosen.name}`, spawn: chosen.spawn * 1.18, hp: chosen.hp * 1.15, damage: chosen.damage * 1.12, xp: chosen.xp * 1.2 };
    return chosen;
  }

  function resizeCanvas() {
    const rect = frame.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const logicalW = Math.max(640, rect.width), logicalH = Math.max(360, rect.height);
    canvas.width = logicalW * dpr; canvas.height = logicalH * dpr; canvas.dataset.dpr = dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); canvas.logicalWidth = logicalW; canvas.logicalHeight = logicalH;
    if (player) { player.x = clamp(player.x, 30, logicalW - 30); player.y = clamp(player.y, 30, logicalH - 30); }
  }

  function spawnEnemy(type = "crawler", x, y) {
    const diff = difficulties[selectedDifficulty];
    if (x === undefined) {
      const edge = Math.floor(Math.random() * 4), w = canvas.logicalWidth, h = canvas.logicalHeight;
      if (edge === 0) { x = Math.random() * w; y = -45; }
      if (edge === 1) { x = w + 45; y = Math.random() * h; }
      if (edge === 2) { x = Math.random() * w; y = h + 45; }
      if (edge === 3) { x = -45; y = Math.random() * h; }
    }
    const growth = 1 + (selectedMode === "rogue" ? stageIndex * .22 : totalElapsed / 300);
    const specs = {
      crawler: { r: 14, hp: 36, speed: 66, damage: 11, xp: 3 },
      swift: { r: 11, hp: 26, speed: 104, damage: 9, xp: 4 },
      tank: { r: 24, hp: 125, speed: 40, damage: 19, xp: 9 },
      shooter: { r: 17, hp: 62, speed: 55, damage: 10, xp: 8, attackRate: 1.7 },
      charger: { r: 20, hp: 92, speed: 48, damage: 24, xp: 10, attackRate: 3.1 },
      summoner: { r: 21, hp: 112, speed: 38, damage: 12, xp: 14, attackRate: 4.2 },
      minion: { r: 8, hp: 18, speed: 120, damage: 6, xp: 1 },
      elite: { r: 30, hp: 440, speed: 54, damage: 24, xp: 36, elite: true, attackRate: 2.2 },
      boss: { r: 55, hp: 3200, speed: 34, damage: 30, xp: 130, boss: true, attackRate: 1.8 }
    };
    const spec = specs[type], hp = spec.hp * growth * diff.hp * currentMutation.hp * (currentRoute?.hp || 1);
    enemies.push({ x, y, type, ...spec, hp, maxHp: hp, speed: spec.speed * diff.speed * currentMutation.speed, damage: spec.damage * diff.damage * currentMutation.damage,
      hit: 0, phase: Math.random() * TAU, attackClock: rand(.5, spec.attackRate || 2), aiState: "move", stateClock: 0,
      orbitClock: 0, vx: 0, vy: 0 });
  }

  function spawnWave() {
    const diff = difficulties[selectedDifficulty];
    const stage = stages[Math.min(stageIndex, stages.length - 1)];
    const unlocked = selectedMode === "rogue" ? stage.unlocks : endlessUnlocks();
    const intensity = selectedMode === "rogue" ? 1 + stageIndex * .32 : 1 + totalElapsed / 80;
    const count = Math.min(8, 1 + Math.floor(intensity * diff.spawn * currentMutation.spawn));
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let pool = unlocked;
      if (roll < .48) pool = unlocked.filter(t => t === "crawler" || t === "swift");
      spawnEnemy(pool[Math.floor(Math.random() * pool.length)] || "crawler");
    }
    spawnClock = Math.max(.27, (1.05 - intensity * .07) / (diff.spawn * Math.sqrt(currentMutation.spawn)));
  }

  function endlessUnlocks() {
    const list = ["crawler", "swift"];
    if (totalElapsed > 35) list.push("tank");
    if (totalElapsed > 65) list.push("shooter");
    if (totalElapsed > 105) list.push("charger");
    if (totalElapsed > 145) list.push("summoner");
    return list;
  }

  function nearestEnemy() {
    let best = null, bestD = Infinity;
    for (const e of enemies) {
      const d = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
      if (d < bestD) { best = e; bestD = d; }
    }
    return best;
  }

  function fireWeapons(dt) {
    for (const weapon of player.weapons) {
      weapon.cooldown -= dt;
      if (weapon.id === "orbit" || weapon.cooldown > 0 || !enemies.length) continue;
      if (weapon.id === "ember") fireEmber(weapon);
      if (weapon.id === "twins") fireTwins(weapon);
      if (weapon.id === "nova") fireNova(weapon);
    }
    const orbit = player.weapons.find(w => w.id === "orbit");
    if (orbit) updateOrbitDamage(orbit, dt);
  }

  function addPlayerBullet(angle, damage, speed, r, color = "#fdba74", life = 1.45) {
    addPlayerBulletFrom(player.x + Math.cos(angle) * 22, player.y + Math.sin(angle) * 22, angle, damage, speed, r, color, life);
  }

  function addPlayerBulletFrom(x, y, angle, damage, speed, r, color, life = 1.45) {
    bullets.push({ x, y,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, damage: damage * player.damageMult * (hasSynergy("arsenal") ? 1.2 : 1),
      life, pierce: player.pierce, hit: new Set(), color, team: "player" });
  }

  function fireEmber(w) {
    const target = nearestEnemy(); if (!target) return;
    const base = Math.atan2(target.y - player.y, target.x - player.x), count = 1 + player.multishot + Math.floor((w.level - 1) / 3);
    for (let i = 0; i < count; i++) addPlayerBullet(base + (i - (count - 1) / 2) * .12, 16 + w.level * 5, 650, 5.5 + w.level * .35, "#2dd4bf");
    w.cooldown = Math.max(.18, (.52 - w.level * .035) * player.fireRateMult * (hasSynergy("barrage") ? .8 : 1)); muzzle(base, "#2dd4bf");
  }

  function fireTwins(w) {
    const directions = [player.facing + Math.PI / 2, player.facing - Math.PI / 2];
    if (w.level >= 3) directions.push(player.facing + Math.PI);
    if (w.level >= 5) directions.push(player.facing);
    for (const angle of directions) addPlayerBullet(angle, 12 + w.level * 4.3, 540, 6, "#60a5fa", 1.25);
    w.cooldown = Math.max(.3, (.92 - w.level * .055) * player.fireRateMult * (hasSynergy("barrage") ? .8 : 1));
    directions.forEach(angle => muzzle(angle, "#60a5fa"));
  }

  function fireNova(w) {
    const starfall = hasSynergy("starfall"), count = 7 + w.level * 2 + (starfall ? 4 : 0);
    for (let i = 0; i < count; i++) addPlayerBullet(i / count * TAU + totalElapsed * .25, (10 + w.level * 4) * (starfall ? 1.25 : 1), 390, 5, "#c4b5fd", 1.8);
    w.cooldown = Math.max(1.2, (3.25 - w.level * .2) * player.fireRateMult); shake = 3;
    burst(player.x, player.y, "#c4b5fd", 18, 140);
  }

  function updateOrbitDamage(w, dt) {
    const bladeDance = hasSynergy("bladeDance"), count = 2 + Math.floor(w.level / 2), radius = 58 + w.level * 4 + (bladeDance ? 12 : 0);
    for (const e of enemies) {
      e.orbitClock = Math.max(0, e.orbitClock - dt);
      if (e.orbitClock > 0) continue;
      for (let i = 0; i < count; i++) {
        const a = totalElapsed * (2.4 + w.level * .08) + i / count * TAU;
        const x = player.x + Math.cos(a) * radius, y = player.y + Math.sin(a) * radius;
        if (Math.hypot(e.x - x, e.y - y) < e.r + 11) {
          damageEnemy(e, (9 + w.level * 4) * player.damageMult * (bladeDance ? 1.4 : 1), "#a7f3d0"); e.orbitClock = .23; break;
        }
      }
    }
  }

  function updateGuardians(dt) {
    player.guardianRetaliation = Math.max(0, player.guardianRetaliation - dt);
    for (const guardian of player.guardians) {
      guardian.cooldown = Math.max(0, guardian.cooldown - dt);
      if (guardian.id === "shield") {
        const maxCharges = 1 + Math.floor((guardian.level - 1) / 2);
        if (guardian.charges < maxCharges && guardian.cooldown <= 0) { guardian.charges++; guardian.cooldown = Math.max(2.2, 5 - guardian.level * .35); }
        if (guardian.charges > 0) {
          const radius = 68 + guardian.level * 5;
          const incoming = enemyBullets.find(b => b.life > 0 && Math.hypot(b.x - player.x, b.y - player.y) < radius);
          if (incoming) { incoming.life = 0; guardian.charges--; if (guardian.cooldown <= 0) guardian.cooldown = Math.max(2.2, 5 - guardian.level * .35); burst(incoming.x, incoming.y, "#6ee7b7", 9, 120); floatText(player.x, player.y - 42, "护盾拦截", "#a7f3d0"); }
        }
      }
      if (guardian.id === "sentinel" && guardian.cooldown <= 0) {
        const target = nearestEnemy();
        if (target) {
          const position = guardianPosition("sentinel"), angle = Math.atan2(target.y - position.y, target.x - position.x);
          addPlayerBulletFrom(position.x, position.y, angle, 9 + guardian.level * 5, 510, 4.5, "#4ade80", 1.4);
          guardian.cooldown = Math.max(.32, .95 - guardian.level * .08); burst(position.x, position.y, "#4ade80", 3, 55);
        }
      }
      if (guardian.id === "prism") {
        const maxCharges = guardian.level >= 4 ? 2 : 1;
        if (guardian.charges < maxCharges && guardian.cooldown <= 0) { guardian.charges++; guardian.cooldown = Math.max(4.5, 9 - guardian.level * .65); showToast("棱镜屏障已充能"); }
      }
    }
  }

  function guardianPosition(id) {
    const index = Math.max(0, player.guardians.findIndex(item => item.id === id));
    const angle = totalElapsed * 1.7 + index * Math.PI;
    return { x: player.x + Math.cos(angle) * 67, y: player.y + Math.sin(angle) * 67, angle };
  }

  function update(dt) {
    totalElapsed += dt; stageElapsed += dt; player.invuln = Math.max(0, player.invuln - dt);
    player.hp = Math.min(player.maxHp, player.hp + (player.regen + (hasSynergy("fortress") ? .4 : 0)) * dt);
    const mx = clamp(keyAxis("d", "arrowright") - keyAxis("a", "arrowleft") + touchInput.x, -1, 1);
    const my = clamp(keyAxis("s", "arrowdown") - keyAxis("w", "arrowup") + touchInput.y, -1, 1);
    const length = Math.hypot(mx, my) || 1;
    if (mx || my) {
      player.facing = Math.atan2(my, mx);
      player.x = clamp(player.x + mx / length * player.speed * dt, player.r, canvas.logicalWidth - player.r);
      player.y = clamp(player.y + my / length * player.speed * dt, player.r, canvas.logicalHeight - player.r);
      if (Math.random() < dt * 16) particles.push(particle(player.x, player.y + 12, -mx * 12, -my * 12, "#fb923c", .3, 4));
    }

    fireWeapons(dt); updateGuardians(dt);
    spawnClock -= dt;
    if (spawnClock <= 0) spawnWave();
    handleStageEvents();

    for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    for (const b of enemyBullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (Math.hypot(b.x - player.x, b.y - player.y) < b.r + player.r) { damagePlayer(b.damage); b.life = 0; burst(b.x, b.y, b.color, 6, 90); }
    }
    for (const e of enemies) updateEnemy(e, dt);

    for (const b of bullets) for (const e of enemies) {
      if (b.life <= 0 || b.hit.has(e)) continue;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        b.hit.add(e); damageEnemy(e, b.damage, b.color);
        if (b.pierce > 0) b.pierce--; else b.life = 0;
      }
    }
    resolveDeaths();
    collectGems(dt);
    collectChests();
    updateEffects(dt);
    checkLevelProgress();

    hudClock -= dt;
    if (hudClock <= 0) { hudClock = .18; updateHud(); }
    if (player.hp <= 0) endGame(false);
    if (selectedMode === "rogue") checkStageComplete();
    else checkEndlessCheckpoint();
  }

  function keyAxis(letter, arrow) { return keys.has(letter) || keys.has(arrow) ? 1 : 0; }

  function handleStageEvents() {
    if (selectedMode === "rogue") {
      const stage = stages[stageIndex];
      const eliteThreshold = currentRoute?.forceElite ? .34 : .72;
      if (!stageEliteSpawned && (stageIndex > 0 || currentRoute?.forceElite) && stageElapsed > stage.duration * eliteThreshold) {
        stageEliteSpawned = true; spawnEnemy("elite"); showToast("精英威胁进入战场");
      }
      if (stage.boss && !bossSpawned && stageElapsed > stage.duration - 20) {
        bossSpawned = true; spawnEnemy("boss"); showToast("裂隙领主降临");
      }
    } else {
      if (!bossSpawned && totalElapsed > 180 && Math.floor(totalElapsed) % 90 === 0) {
        bossSpawned = true; spawnEnemy("boss"); showToast("无尽首领进入战场");
      }
      if (bossSpawned && !enemies.some(e => e.boss)) bossSpawned = false;
    }
  }

  function updateEnemy(e, dt) {
    e.hit = Math.max(0, e.hit - dt); e.phase += dt * 2.2; e.attackClock -= dt;
    const angle = Math.atan2(player.y - e.y, player.x - e.x), dist = Math.hypot(player.x - e.x, player.y - e.y);
    if (e.type === "swift") moveEnemy(e, angle + Math.sin(e.phase * 2.4) * .72, e.speed, dt);
    else if (e.type === "shooter") updateRanged(e, angle, dist, dt);
    else if (e.type === "charger") updateCharger(e, angle, dt);
    else if (e.type === "summoner") updateSummoner(e, angle, dist, dt);
    else if (e.type === "boss") updateBoss(e, angle, dist, dt);
    else if (e.type === "elite") updateElite(e, angle, dt);
    else moveEnemy(e, angle, e.speed, dt);

    if (dist < player.r + e.r && player.invuln <= 0) {
      damagePlayer(e.damage); e.x -= Math.cos(angle) * 24; e.y -= Math.sin(angle) * 24;
    }
  }

  function moveEnemy(e, angle, speed, dt) { e.x += Math.cos(angle) * speed * dt; e.y += Math.sin(angle) * speed * dt; }

  function updateRanged(e, angle, dist, dt) {
    if (dist > 320) moveEnemy(e, angle, e.speed, dt);
    else if (dist < 205) moveEnemy(e, angle + Math.PI, e.speed * .9, dt);
    else moveEnemy(e, angle + Math.PI / 2, e.speed * .48, dt);
    if (e.attackClock <= 0) { fireEnemyShot(e, angle, 205, 6, e.damage, "#facc15"); e.attackClock = e.attackRate; }
  }

  function updateCharger(e, angle, dt) {
    if (e.aiState === "telegraph") {
      e.stateClock -= dt;
      if (e.stateClock <= 0) { e.aiState = "dash"; e.stateClock = .58; e.vx = Math.cos(e.aimAngle) * 430; e.vy = Math.sin(e.aimAngle) * 430; }
    } else if (e.aiState === "dash") {
      e.x += e.vx * dt; e.y += e.vy * dt; e.stateClock -= dt;
      if (e.stateClock <= 0) { e.aiState = "move"; e.attackClock = e.attackRate; }
    } else {
      moveEnemy(e, angle, e.speed, dt);
      if (e.attackClock <= 0) { e.aiState = "telegraph"; e.stateClock = .72; e.aimAngle = angle; }
    }
  }

  function updateSummoner(e, angle, dist, dt) {
    if (dist < 260) moveEnemy(e, angle + Math.PI, e.speed, dt); else if (dist > 390) moveEnemy(e, angle, e.speed, dt);
    if (e.attackClock <= 0 && enemies.filter(x => x.type === "minion").length < 16) {
      for (let i = 0; i < 2; i++) spawnEnemy("minion", e.x + rand(-24, 24), e.y + rand(-24, 24));
      e.attackClock = e.attackRate; burst(e.x, e.y, enemyMeta.summoner.color, 12, 100);
    }
  }

  function updateElite(e, angle, dt) {
    moveEnemy(e, angle + Math.sin(e.phase) * .25, e.speed, dt);
    if (e.attackClock <= 0) { radialEnemyShots(e, 7, 160, e.damage * .55, "#e879f9"); e.attackClock = e.attackRate; }
  }

  function updateBoss(e, angle, dist, dt) {
    if (dist > 235) moveEnemy(e, angle, e.speed, dt); else moveEnemy(e, angle + Math.PI / 2, e.speed * .55, dt);
    if (e.attackClock <= 0) {
      radialEnemyShots(e, 12, 150 + Math.sin(e.phase) * 22, e.damage * .48, "#fb7185");
      fireEnemyShot(e, angle, 275, 10, e.damage * .7, "#fecdd3"); e.attackClock = e.attackRate; shake = 4;
    }
  }

  function fireEnemyShot(e, angle, speed, r, damage, color) {
    color = e.boss ? "#ff006e" : e.elite ? "#ff1744" : "#ff304f";
    enemyBullets.push({ x: e.x + Math.cos(angle) * e.r, y: e.y + Math.sin(angle) * e.r,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r, damage, color, life: 4.5, team: "enemy" });
    burst(e.x, e.y, color, 4, 55);
  }

  function radialEnemyShots(e, count, speed, damage, color) {
    for (let i = 0; i < count; i++) fireEnemyShot(e, i / count * TAU + e.phase * .12, speed, 6, damage, color);
  }

  function damagePlayer(raw) {
    if (player.invuln > 0) return;
    const prism = player.guardians.find(item => item.id === "prism");
    if (prism?.charges > 0) {
      prism.charges--; prism.cooldown = Math.max(4.5, 9 - prism.level * .65); player.invuln = .25;
      burst(player.x, player.y, "#a5b4fc", 18, 150); floatText(player.x, player.y - 34, "屏障吸收", "#c7d2fe"); return;
    }
    const thornsLevel = guardianLevel(player, "thorns");
    const effectiveArmor = Math.min(.72, player.armor + thornsLevel * .04 + (hasSynergy("fortress") ? .1 : 0));
    const damage = Math.max(1, raw * (1 - effectiveArmor));
    player.hp -= damage; player.damageTaken += damage; player.invuln = .58; shake = 9; flash = .13;
    floatText(player.x, player.y - 28, `-${Math.round(damage)}`, "#fb7185");
    if (thornsLevel && player.guardianRetaliation <= 0) {
      const count = 6 + thornsLevel * 2;
      for (let i = 0; i < count; i++) addPlayerBullet(i / count * TAU, 7 + thornsLevel * 4, 420, 5, "#fbbf24", 1.1);
      player.guardianRetaliation = Math.max(.65, 1.7 - thornsLevel * .16); burst(player.x, player.y, "#fbbf24", 14, 130);
    }
  }

  function damageEnemy(e, damage, color) {
    e.hp -= damage; e.hit = .08; player.damageDone += damage;
    floatText(e.x, e.y - e.r, Math.round(damage), color || "#fde68a"); burst(e.x, e.y, color || enemyMeta[e.type].color, 4, 95);
  }

  function resolveDeaths() {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i]; if (e.hp > 0) continue;
      enemies.splice(i, 1); player.kills++;
      const count = e.boss ? 18 : e.elite ? 9 : e.r > 20 ? 3 : 1;
      const reward = e.xp * difficulties[selectedDifficulty].reward * currentMutation.xp * (currentRoute?.xp || 1) * player.xpMult;
      for (let g = 0; g < count; g++) gems.push({ x: e.x + rand(-14, 14), y: e.y + rand(-14, 14), value: reward / count, r: e.elite || e.boss ? 7 : 5, phase: Math.random() * TAU });
      if (e.elite) chests.push({ x: e.x, y: e.y, r: 15, phase: 0 });
      if (currentMutation.volatile && !e.boss && e.type !== "minion") radialEnemyShots(e, 4, 125, e.damage * .38, "#f0abfc");
      burst(e.x, e.y, enemyMeta[e.type].color, e.boss ? 60 : e.elite ? 25 : 11, e.boss ? 330 : 180);
      shake = e.boss ? 15 : e.elite ? 7 : 2;
    }
  }

  function collectGems(dt) {
    for (let i = gems.length - 1; i >= 0; i--) {
      const g = gems[i]; g.phase += dt * 4;
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      if (dist < player.magnet) { const a = Math.atan2(player.y - g.y, player.x - g.x), speed = 190 + (player.magnet - dist) * 5; g.x += Math.cos(a) * speed * dt; g.y += Math.sin(a) * speed * dt; }
      if (dist < player.r + 10) { player.xp += g.value; gems.splice(i, 1); burst(g.x, g.y, "#22d3ee", 4, 65); }
    }
  }

  function collectChests() {
    if (state !== "playing") return;
    for (let i = chests.length - 1; i >= 0; i--) {
      const chest = chests[i]; chest.phase += .04;
      if (Math.hypot(player.x - chest.x, player.y - chest.y) < player.r + chest.r + 5) {
        chests.splice(i, 1); openEliteChest(); break;
      }
    }
  }

  function openEliteChest() {
    state = "chest"; player.chestsOpened++; profile.chestsOpened++; saveProfile();
    if (profile.chestsOpened >= 5) unlockAchievement("open_5_chests");
    ui.chest.classList.remove("hidden"); ui.chestChoices.innerHTML = "";
    const weaponId = Object.keys(weaponMeta)[Math.floor(Math.random() * Object.keys(weaponMeta).length)];
    const guardianPool = player.guardians.length >= 2 ? player.guardians.map(item => item.id) : Object.keys(guardianMeta);
    const guardianId = guardianPool[Math.floor(Math.random() * guardianPool.length)];
    const rewards = [
      { id: "xp", icon: "✦", type: "经验爆发", title: "浓缩余烬", desc: "立即获得相当于当前升级需求 220% 的经验。", apply() { player.xp += player.xpNext * 2.2; checkLevelProgress(); } },
      { id: "weapon", icon: weaponMeta[weaponId].icon, type: "传奇武器", title: weaponMeta[weaponId].name, desc: "解锁该武器或直接提升 3 级。", apply() { let weapon = player.weapons.find(w => w.id === weaponId); if (!weapon) { weapon = { id: weaponId, level: 0, cooldown: 0 }; player.weapons.push(weapon); } weapon.level += 3; discover("weapons", weaponId); } },
      { id: "guardian", icon: guardianMeta[guardianId].icon, type: "史诗守护装备", title: guardianMeta[guardianId].name, desc: "穿戴该装备或直接提升 2 级。", apply() { let item = player.guardians.find(guardian => guardian.id === guardianId); if (!item) { item = { id: guardianId, level: 0, cooldown: 0, charges: 1 }; player.guardians.push(item); } item.level += 2; discover("guardians", guardianId); } },
      { id: "xpboost", icon: "↟", type: "永久增益", title: "求知渴望", desc: "本局后续所有经验获取永久 +30%。", apply() { player.xpMult *= 1.3; } },
      { id: "points", icon: "◆", type: "构筑资源", title: "双重启示", desc: "立即获得 2 个待分配技能点。", apply() { player.pendingPoints += 2; } },
      { id: "vital", icon: "♥", type: "生存奇物", title: "巨兽心脏", desc: "最大生命 +30，并完全恢复生命。", apply() { player.maxHp += 30; player.hp = player.maxHp; } },
      { id: "fortune", icon: "◎", type: "稀有奇物", title: "黄金罗盘", desc: "幸运 +20%，每次整备额外重掷 1 次。", apply() { player.luck += .2; player.bonusRerolls++; } }
    ];
    const choices = [...rewards].sort(() => Math.random() - .5).slice(0, 3);
    for (const reward of choices) {
      const card = document.createElement("button"); card.className = "chest-card";
      card.innerHTML = `<i>${reward.icon}</i><small>${reward.type}</small><h3>${reward.title}</h3><p>${reward.desc}</p>`;
      card.onclick = () => { reward.apply(); recordSynergies(); ui.chest.classList.add("hidden"); state = "playing"; updateHud(true); lastTime = performance.now(); requestAnimationFrame(loop); };
      ui.chestChoices.appendChild(card);
    }
  }

  function checkLevelProgress() {
    while (player.xp >= player.xpNext) {
      player.xp -= player.xpNext; player.level++; player.pendingPoints++; player.xpNext = Math.floor(player.xpNext * 1.25 + 5);
      showToast(`等级 ${player.level} · 获得 1 技能点（关卡结算时分配）`);
    }
  }

  function checkStageComplete() {
    const stage = stages[stageIndex];
    if (stageElapsed < stage.duration) return;
    if (stage.boss && enemies.some(e => e.boss)) return;
    checkStageAchievements();
    openUpgradeScreen("stage");
  }

  function checkStageAchievements() {
    if (player.damageTaken - stageDamageTakenStart < .01) unlockAchievement("clear_no_hit");
    if (player.weapons.length === 1) unlockAchievement("clear_single_weapon");
    if (player.weapons.length >= 4) unlockAchievement("clear_four_weapons");
    if (player.hp / player.maxHp <= .2) unlockAchievement("clear_low_hp");
    if (player.armor >= .4) unlockAchievement("clear_armor40");
    if (player.damageDone - stageDamageStart >= 5000) unlockAchievement("stage_damage_5000");
  }

  function unlockAchievement(id) {
    if (profile.achievements.includes(id)) return;
    profile.achievements.push(id); saveProfile();
    const achievement = achievementCatalog.find(item => item.id === id);
    if (achievement) showToast(`成就解锁 · ${achievement.name}`);
  }

  function checkEndlessCheckpoint() {
    const checkpoint = Math.floor(totalElapsed / 45);
    if (checkpoint > endlessCheckpoint && player.pendingPoints > 0) { endlessCheckpoint = checkpoint; openUpgradeScreen("checkpoint"); }
  }

  function openUpgradeScreen(reason) {
    if (state !== "playing") return;
    state = "upgrading"; upgradeReason = reason; nextRoute = null;
    rerolls = 1 + player.bonusRerolls + (currentRoute?.rerolls || 0);
    upgradePoints = Math.max(reason === "stage" ? 1 : 0, player.pendingPoints) + (reason === "stage" ? currentRoute?.bonusPoint || 0 : 0); player.pendingPoints = 0;
    ui.upgrade.classList.remove("hidden"); ui.continue.classList.add("hidden"); ui.reroll.classList.remove("hidden");
    ui.upgradeEyebrow.textContent = reason === "stage" ? `第 ${stageIndex + 1} 关完成` : "无尽补给抵达";
    ui.upgradeTitle.textContent = reason === "stage" ? `${stages[stageIndex].name} · 战后整备` : "选择本轮成长";
    const kills = player.kills - stageKillsStart, damage = Math.round(player.damageDone - stageDamageStart);
    ui.roundStats.innerHTML = `<div><strong>${kills}</strong>本关击败</div><div><strong>${damage}</strong>本关伤害</div><div><strong>${formatTime(stageElapsed)}</strong>耗时</div>`;
    if (reason === "stage" && stageIndex < stages.length - 1) { ui.routeSection.classList.remove("hidden"); generateRouteChoices(); }
    else ui.routeSection.classList.add("hidden");
    renderLoadout(ui.upgradeLoadout); rollUpgradeChoices();
  }

  function generateRouteChoices() {
    ui.routeChoices.innerHTML = ""; ui.routeStatus.textContent = "尚未选择";
    const options = [...routes].sort(() => Math.random() - .5).slice(0, 3);
    for (const route of options) {
      const card = document.createElement("button"); card.className = "route-card";
      card.innerHTML = `<i>${route.icon}</i><div><b>${route.name}</b><span>${route.desc}</span><small>${route.risk}</small></div>`;
      card.onclick = () => {
        nextRoute = route;
        for (const child of ui.routeChoices.children) child.classList.remove("selected");
        card.classList.add("selected"); ui.routeStatus.textContent = `已选择 · ${route.name}`; updateContinueState();
      };
      ui.routeChoices.appendChild(card);
    }
  }

  function rollUpgradeChoices() {
    ui.pointsRemaining.textContent = `剩余 ${upgradePoints} 点`;
    ui.choices.innerHTML = "";
    const available = upgradeCatalog.filter(item => item.kind !== "guardian" || player.guardians.some(guardian => `guardian_${guardian.id}` === item.id) || player.guardians.length < 2);
    let pool = [...available].sort(() => Math.random() - .5).slice(0, 3);
    if (currentRoute?.weaponBias) {
      const weaponOptions = upgradeCatalog.filter(item => item.kind === "weapon").sort(() => Math.random() - .5).slice(0, 2);
      const passive = available.filter(item => item.kind !== "weapon").sort(() => Math.random() - .5)[0];
      pool = [...weaponOptions, passive];
    }
    for (const up of pool) {
      const currentWeapon = up.kind === "weapon" ? player.weapons.find(w => `weapon_${w.id}` === up.id) : null;
      const currentGuardian = up.kind === "guardian" ? player.guardians.find(item => `guardian_${item.id}` === up.id) : null;
      const rank = up.kind === "weapon" ? (currentWeapon?.level || 0) : up.kind === "guardian" ? (currentGuardian?.level || 0) : (player.skills[up.id] || 0), rarity = rollRarity();
      const button = document.createElement("button"); button.className = `upgrade-card rarity-${rarity.id}`;
      const kindLabel = up.kind === "weapon" ? "实体武器" : up.kind === "guardian" ? "守护装备" : "被动技能";
      button.innerHTML = `<span class="rarity-label">${rarity.label} · +${rarity.power} 级</span><span class="equipment-kind">${kindLabel}</span><span class="icon">${up.icon}</span><h3>${up.title}</h3><p>${up.desc}</p><div class="upgrade-tags">${(up.tags || []).map(tag => `<i>${tag}</i>`).join("")}</div><small>${rank ? `当前等级 ${rank} → ${rank + rarity.power}` : up.kind === "weapon" ? "装备新武器" : up.kind === "guardian" ? "穿戴守护装备" : "学习被动技能"}</small>`;
      button.onclick = () => chooseUpgrade(up, rarity.power);
      ui.choices.appendChild(button);
    }
    ui.reroll.textContent = rerolls ? `重掷 ×${rerolls}` : "已重掷";
  }

  function rollRarity() {
    const roll = Math.random(), epic = .055 + player.luck * .16, rare = .25 + player.luck * .3;
    if (roll < epic) return { id: "epic", label: "史诗", power: 3 };
    if (roll < epic + rare) return { id: "rare", label: "稀有", power: 2 };
    return { id: "common", label: "普通", power: 1 };
  }

  function chooseUpgrade(up, power) {
    for (let i = 0; i < power; i++) up.apply(player);
    if (up.kind === "skill") player.skills[up.id] = (player.skills[up.id] || 0) + power;
    else if (up.kind === "weapon") discover("weapons", up.id.replace("weapon_", ""));
    else discover("guardians", up.id.replace("guardian_", ""));
    recordSynergies(); upgradePoints--; renderLoadout(ui.upgradeLoadout); updateHud(true);
    if (upgradePoints > 0) rollUpgradeChoices();
    else {
      ui.pointsRemaining.textContent = "技能点已分配"; ui.choices.innerHTML = `<div class="upgrade-complete"><b>构筑已更新</b><span>检查左侧面板，然后继续战斗。</span></div>`;
      ui.reroll.classList.add("hidden"); updateContinueState();
    }
  }

  function updateContinueState() {
    const routeRequired = upgradeReason === "stage" && stageIndex < stages.length - 1;
    const ready = upgradePoints <= 0 && (!routeRequired || nextRoute);
    ui.continue.classList.toggle("hidden", !ready);
    ui.continue.textContent = upgradeReason === "stage" && stageIndex === stages.length - 1 ? "完成本次远征" : upgradeReason === "stage" ? "沿所选路线前进" : "返回无尽战场";
    if (upgradePoints <= 0 && routeRequired && !nextRoute) ui.pointsRemaining.textContent = "请选择下一条路线";
  }

  function recordSynergies() { for (const item of activeSynergies()) discover("synergies", item.id); }

  function continueAfterUpgrade() {
    ui.upgrade.classList.add("hidden");
    if (upgradeReason === "stage" && stageIndex === stages.length - 1) { endGame(true); return; }
    if (upgradeReason === "stage") {
      currentRoute = nextRoute;
      if (currentRoute?.luck) player.luck += currentRoute.luck;
      stageIndex++; startStage(); showToast(`${currentRoute.name} · ${currentMutation.name}`);
    }
    state = "playing"; lastTime = performance.now(); requestAnimationFrame(loop);
  }

  function renderLoadout(container) {
    if (!player) return;
    const attrs = [
      ["生命", `${Math.ceil(player.hp)} / ${player.maxHp}`], ["移动", Math.round(player.speed)],
      ["伤害", `+${Math.round((player.damageMult - 1) * 100)}%`], ["攻速", `+${Math.round((1 / player.fireRateMult - 1) * 100)}%`],
      ["护甲", `${Math.round(player.armor * 100)}%`], ["恢复", `${player.regen.toFixed(1)}/秒`],
      ["贯穿", `+${player.pierce}`], ["拾取", Math.round(player.magnet)],
      ["幸运", `${Math.round(player.luck * 100)}%`], ["局种", runSeed],
      ["路线", currentRoute?.name || "起始区域"], ["异变", currentMutation.name]
    ];
    const weaponRows = player.weapons.map(w => { const meta = weaponMeta[w.id]; return `<div class="loadout-row"><i>${meta.icon}</i><span>${meta.name}<small>${meta.tags.join(" · ")}｜${meta.desc}</small></span><b>LV.${w.level}</b></div>`; }).join("");
    const guardianRows = player.guardians.map(item => { const meta = guardianMeta[item.id]; return `<div class="loadout-row"><i>${meta.icon}</i><span>${meta.name}<small>${meta.tags.join(" · ")}｜${meta.desc}</small></span><b>LV.${item.level}</b></div>`; }).join("");
    const skillRows = Object.entries(player.skills).filter(([,rank]) => rank > 0).map(([id, rank]) => {
      const up = upgradeCatalog.find(item => item.id === id); return `<span class="skill-tag">${up?.title || id} <b>×${rank}</b></span>`;
    }).join("") || `<span class="empty-build">尚未学习被动技能</span>`;
    const synergyRows = synergyCatalog.map(item => { const active = item.check(player); return `<div class="synergy-row ${active ? "active" : ""}"><b>${active ? "✦ " : "◇ "}${item.name}</b><span>${active ? item.desc : item.hint}</span></div>`; }).join("");
    const origin = origins.find(item => item.id === player.origin);
    container.innerHTML = `<section class="loadout-section"><h3>角色属性 · ${origin?.name || "未选择原型"}</h3><div class="attribute-grid">${attrs.map(([a,b]) => `<div class="attribute-item"><span>${a}</span><b>${b}</b></div>`).join("")}</div></section>
      <section class="loadout-section"><h3>实体武器 · ${player.weapons.length}/4</h3><div class="loadout-list">${weaponRows}</div></section>
      <section class="loadout-section"><h3>守护装备 · ${player.guardians.length}/2</h3><div class="loadout-list">${guardianRows}</div></section>
      <section class="loadout-section"><h3>技能与强化</h3><div class="skill-tags">${skillRows}</div></section>
      <section class="loadout-section"><h3>流派共鸣 · ${activeSynergies().length}/${synergyCatalog.length}</h3><div class="loadout-list">${synergyRows}</div></section>`;
  }

  function updateHud(force = false) {
    if (!player) return;
    ui.hpText.textContent = `${Math.ceil(Math.max(0, player.hp))} / ${player.maxHp}`;
    ui.hpBar.style.width = `${clamp(player.hp / player.maxHp * 100, 0, 100)}%`;
    ui.xpBar.style.width = `${clamp(player.xp / player.xpNext * 100, 0, 100)}%`;
    ui.levelText.textContent = `LV. ${player.level}`; ui.kills.textContent = player.kills; ui.points.textContent = player.pendingPoints;
    ui.mutationText.textContent = `${currentMutation.name} · ${currentMutation.desc}`;
    if (selectedMode === "rogue") {
      const stage = stages[stageIndex]; ui.stage.textContent = `第 ${stageIndex + 1}/${stages.length} 关 · ${stage.name}`;
      ui.timer.textContent = formatTime(Math.max(0, stage.duration - stageElapsed));
    } else { ui.stage.textContent = `${difficulties[selectedDifficulty].label}无尽`; ui.timer.textContent = formatTime(totalElapsed); }
    const boss = enemies.find(e => e.boss);
    ui.bossWrap.classList.toggle("hidden", !boss);
    if (boss) { ui.bossBar.style.width = `${Math.max(0, boss.hp / boss.maxHp * 100)}%`; ui.bossText.textContent = `${Math.max(0, Math.ceil(boss.hp))} / ${Math.ceil(boss.maxHp)}`; ui.bossName.textContent = enemyMeta[boss.type].name; }
    if (force || !ui.weaponStrip.innerHTML) {
      const weapons = player.weapons.map(w => `<div class="weapon-pill"><i>${weaponMeta[w.id].icon}</i><span>${weaponMeta[w.id].name} <b>LV.${w.level}</b></span></div>`);
      const guardians = player.guardians.map(item => `<div class="weapon-pill guardian"><i>${guardianMeta[item.id].icon}</i><span>${guardianMeta[item.id].name} <b>LV.${item.level}</b></span></div>`);
      ui.weaponStrip.innerHTML = [...weapons, ...guardians].join("");
    }
    const counts = {};
    for (const e of enemies) counts[e.type] = (counts[e.type] || 0) + 1;
    ui.enemyReadout.innerHTML = Object.entries(counts).filter(([type]) => type !== "minion").slice(0, 4).map(([type,count]) => `<div class="enemy-row" style="--enemy-color:${enemyMeta[type].color}"><i></i><span>${enemyMeta[type].name}</span><b>×${count}</b></div>`).join("");
  }

  function openDetails() {
    if (state === "playing") { state = "details"; renderLoadout(ui.detailsLoadout); ui.details.classList.remove("hidden"); }
    else if (state === "details") closeDetails();
  }

  function closeDetails() { if (state !== "details") return; ui.details.classList.add("hidden"); state = "playing"; lastTime = performance.now(); requestAnimationFrame(loop); }

  function togglePause() {
    if (state === "playing") { state = "paused"; ui.pause.classList.remove("hidden"); }
    else if (state === "paused") { state = "playing"; ui.pause.classList.add("hidden"); lastTime = performance.now(); requestAnimationFrame(loop); }
  }

  function endGame(won) {
    state = "ended"; ui.upgrade.classList.add("hidden"); ui.end.classList.remove("hidden"); ui.touchControls.classList.add("hidden"); resetTouchVector();
    ui.endEyebrow.textContent = won ? "远征完成" : "余火熄灭";
    ui.endTitle.textContent = won ? "你击穿了十重裂隙" : "影潮吞没了你";
    ui.endStats.innerHTML = `<div><strong>${formatTime(totalElapsed)}</strong>战斗时间</div><div><strong>${player.kills}</strong>击败</div><div><strong>${Math.round(player.damageDone)}</strong>总伤害</div><div><strong>${player.level}</strong>等级</div><div><strong>${player.weapons.length}+${player.guardians.length}</strong>武器 / 守护</div>`;
    profile.bestStage = Math.max(profile.bestStage, stageIndex + 1);
    if (won) {
      profile.wins++; unlockAchievement(`win_${player.origin}`);
      if (selectedDifficulty === "hard") unlockAchievement("win_hard");
      if (selectedDifficulty === "nightmare") unlockAchievement("win_nightmare");
    }
    recordSynergies(); saveProfile();
    renderLoadout(ui.endLoadout);
  }

  function backToMenu() {
    state = "menu"; ui.end.classList.add("hidden"); ui.hud.classList.add("hidden"); ui.touchControls.classList.add("hidden"); ui.start.classList.remove("hidden"); renderMetaProgress();
  }

  function cancelOriginDraft() {
    state = "menu"; ui.origin.classList.add("hidden"); ui.start.classList.remove("hidden"); renderMetaProgress();
  }

  function renderMetaProgress() {
    ui.metaProgress.innerHTML = `<span>远征 <b>${profile.runs}</b></span><span>通关 <b>${profile.wins}</b></span><span>原型 <b>${profile.origins.length}/${origins.length}</b></span><span>成就 <b>${profile.achievements.length}/${achievementCatalog.length}</b></span>`;
  }

  function openAchievements() {
    ui.achievement.classList.remove("hidden");
    const unlocked = profile.achievements.length;
    ui.achievementSummary.innerHTML = `<div><strong>${unlocked}/${achievementCatalog.length}</strong>已解锁</div><div><strong>${profile.chestsOpened}</strong>宝箱开启</div><div><strong>${profile.bestStage}/10</strong>最高关卡</div><div><strong>${profile.wins}</strong>远征通关</div>`;
    ui.achievementContent.innerHTML = achievementCatalog.map(item => {
      const done = profile.achievements.includes(item.id);
      return `<article class="achievement-card ${done ? "unlocked" : ""}"><b>${done ? "★" : "☆"} ${item.name}</b><p>${item.desc}</p><small>${item.category} · ${done ? "已完成" : "未完成"}</small></article>`;
    }).join("");
  }

  function openCodex() {
    ui.codex.classList.remove("hidden");
    const originItems = origins.map(item => codexItem(item.name, item.style, profile.origins.includes(item.id))).join("");
    const weaponItems = Object.entries(weaponMeta).map(([id, item]) => codexItem(item.name, `${item.tags.join(" · ")}｜${item.desc}`, profile.weapons.includes(id))).join("");
    const guardianItems = Object.entries(guardianMeta).map(([id, item]) => codexItem(item.name, `${item.tags.join(" · ")}｜${item.desc}`, profile.guardians.includes(id))).join("");
    const synergyItems = synergyCatalog.map(item => codexItem(item.name, `${item.hint}｜${item.desc}`, profile.synergies.includes(item.id), true)).join("");
    ui.codexContent.innerHTML = `<section class="codex-section"><h3>余火原型 · ${profile.origins.length}/${origins.length}</h3><div class="codex-grid">${originItems}</div></section>
      <section class="codex-section"><h3>实体武器研究 · ${profile.weapons.length}/${Object.keys(weaponMeta).length}</h3><div class="codex-grid">${weaponItems}</div></section>
      <section class="codex-section"><h3>守护装备研究 · ${profile.guardians.length}/${Object.keys(guardianMeta).length}</h3><div class="codex-grid">${guardianItems}</div></section>
      <section class="codex-section"><h3>流派共鸣 · ${profile.synergies.length}/${synergyCatalog.length}</h3><div class="codex-grid">${synergyItems}</div></section>`;
  }

  function codexItem(name, desc, discovered, reveal = false) {
    const visible = discovered || reveal;
    return `<div class="codex-item ${discovered ? "discovered" : "locked"}"><b>${discovered ? "✦" : "◇"} ${visible ? name : "尚未发现"}</b><span>${visible ? desc : "在远征中满足条件以记录此项研究。"}</span></div>`;
  }

  function updateEffects(dt) {
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .96; p.vy *= .96; p.life -= dt; }
    for (const t of texts) { t.y -= 34 * dt; t.life -= dt; }
    bullets = bullets.filter(b => b.life > 0 && inBounds(b, 60));
    enemyBullets = enemyBullets.filter(b => b.life > 0 && inBounds(b, 80));
    particles = particles.filter(p => p.life > 0); texts = texts.filter(t => t.life > 0);
    shake *= .86; flash = Math.max(0, flash - dt); toastTimer -= dt;
    if (toastTimer <= 0) ui.toast.classList.add("hidden");
  }

  function inBounds(item, pad) { return item.x > -pad && item.x < canvas.logicalWidth + pad && item.y > -pad && item.y < canvas.logicalHeight + pad; }

  function draw() {
    const w = canvas.logicalWidth, h = canvas.logicalHeight;
    ctx.save(); ctx.translate(shake ? rand(-shake, shake) : 0, shake ? rand(-shake, shake) : 0);
    const gradient = ctx.createRadialGradient(w * .5, h * .45, 40, w * .5, h * .45, Math.max(w, h) * .76);
    gradient.addColorStop(0, "#19243a"); gradient.addColorStop(1, "#080d18"); ctx.fillStyle = gradient; ctx.fillRect(-20, -20, w + 40, h + 40);
    drawArena(w, h);
    for (const g of gems) drawGem(g);
    for (const chest of chests) drawChest(chest);
    for (const b of bullets) drawBullet(b);
    for (const b of enemyBullets) drawEnemyBullet(b);
    for (const e of enemies) drawEnemy(e);
    if (player) { drawMountedWeapons(); drawPlayer(); drawGuardians(); drawOrbitWeapons(); }
    for (const p of particles) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color; circle(p.x, p.y, p.r * p.life / p.max); }
    ctx.globalAlpha = 1;
    for (const t of texts) { ctx.globalAlpha = Math.max(0, t.life / .65); ctx.fillStyle = t.color; ctx.font = "900 13px system-ui"; ctx.textAlign = "center"; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1;
    if (flash) { ctx.fillStyle = `rgba(251,113,133,${flash * .8})`; ctx.fillRect(0, 0, w, h); }
    ctx.restore();
  }

  function drawArena(w, h) {
    ctx.strokeStyle = "rgba(148,163,184,.05)"; ctx.lineWidth = 1; const grid = 48, ox = totalElapsed * 5 % grid, oy = totalElapsed * 3 % grid;
    ctx.beginPath(); for (let x = -grid + ox; x < w + grid; x += grid) { ctx.moveTo(x, 0); ctx.lineTo(x, h); } for (let y = -grid + oy; y < h + grid; y += grid) { ctx.moveTo(0, y); ctx.lineTo(w, y); } ctx.stroke();
    ctx.save(); ctx.translate(w / 2, h / 2); ctx.strokeStyle = "rgba(251,146,60,.065)"; ctx.lineWidth = 2;
    for (let r = 140; r < Math.max(w, h); r += 170) { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke(); } ctx.restore();
  }

  function drawPlayer() {
    if (player.invuln > 0 && Math.floor(player.invuln * 18) % 2) ctx.globalAlpha = .35;
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.facing);
    ctx.shadowBlur = 24; ctx.shadowColor = "#fb923c"; ctx.fillStyle = "#fb923c"; circle(0, 0, player.r + 3); ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff7ed"; circle(0, 0, player.r - 3); ctx.fillStyle = "#111827"; circle(5, -5, 2.5); circle(5, 5, 2.5);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  function drawMountedWeapons() {
    const ember = player.weapons.find(item => item.id === "ember");
    if (ember) drawGun(player.x, player.y, player.facing, "#2dd4bf", 1 + Math.min(.28, ember.level * .035));
    const twins = player.weapons.find(item => item.id === "twins");
    if (twins) {
      const offset = 20, scale = .82 + Math.min(.24, twins.level * .03);
      for (const side of [-1, 1]) {
        const angle = player.facing + side * Math.PI / 2;
        drawGun(player.x + Math.cos(angle) * offset, player.y + Math.sin(angle) * offset, angle, "#60a5fa", scale);
      }
    }
    const nova = player.weapons.find(item => item.id === "nova");
    if (nova) {
      ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(-totalElapsed * (1.4 + nova.level * .06));
      ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = "#8b5cf6";
      ctx.beginPath(); ctx.arc(0, 0, player.r + 10 + Math.sin(totalElapsed * 4) * 2, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.fillStyle = "#ede9fe"; ctx.fillRect(player.r + 6, -3, 9, 6); }
      ctx.restore();
    }
  }

  function drawGun(x, y, angle, color, scale = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    ctx.shadowBlur = 12; ctx.shadowColor = color; ctx.fillStyle = "#172033"; ctx.fillRect(4, -7, 22, 14);
    ctx.fillStyle = color; ctx.fillRect(11, -4, 25, 8); ctx.fillStyle = "#f8fafc"; ctx.fillRect(30, -3, 7, 6);
    ctx.fillStyle = "#334155"; ctx.fillRect(4, 7, 9, 7); ctx.shadowBlur = 0; ctx.restore();
  }

  function drawGuardians() {
    for (const guardian of player.guardians) {
      if (guardian.id === "shield") {
        const maxCharges = 1 + Math.floor((guardian.level - 1) / 2);
        for (let i = 0; i < maxCharges; i++) {
          const angle = totalElapsed * .75 + i / maxCharges * TAU;
          ctx.save(); ctx.translate(player.x + Math.cos(angle) * 43, player.y + Math.sin(angle) * 43); ctx.rotate(angle + Math.PI / 2);
          ctx.globalAlpha = i < guardian.charges ? 1 : .2; ctx.shadowBlur = 14; ctx.shadowColor = "#f59e0b";
          ctx.fillStyle = "#fde68a"; ctx.beginPath(); ctx.moveTo(-10, -6); ctx.lineTo(0, -11); ctx.lineTo(10, -6); ctx.lineTo(8, 8); ctx.lineTo(0, 13); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        }
      } else if (guardian.id === "sentinel") {
        const pos = guardianPosition("sentinel"), target = nearestEnemy(pos.x, pos.y);
        const aim = target ? Math.atan2(target.y - pos.y, target.x - pos.x) : pos.angle;
        ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate(aim); ctx.shadowBlur = 18; ctx.shadowColor = "#34d399";
        ctx.fillStyle = "#064e3b"; ctx.fillRect(0, -4, 19, 8); ctx.fillStyle = "#a7f3d0"; circle(0, 0, 11);
        ctx.fillStyle = "#052e2b"; circle(3, 0, 5); ctx.fillStyle = "#ecfdf5"; circle(5, 0, 2); ctx.restore();
      } else if (guardian.id === "thorns") {
        ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(totalElapsed * .35); ctx.fillStyle = "#fbbf24"; ctx.shadowBlur = 10; ctx.shadowColor = "#f59e0b";
        const count = 6 + Math.min(4, guardian.level);
        for (let i = 0; i < count; i++) { ctx.rotate(TAU / count); ctx.beginPath(); ctx.moveTo(player.r - 2, -5); ctx.lineTo(player.r + 16, 0); ctx.lineTo(player.r - 2, 5); ctx.closePath(); ctx.fill(); }
        ctx.restore();
      } else if (guardian.id === "prism") {
        ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(totalElapsed * .28); ctx.globalAlpha = guardian.charges > 0 ? .8 : .18;
        ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 4; ctx.shadowBlur = 20; ctx.shadowColor = "#818cf8";
        ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, x = Math.cos(a) * 48, y = Math.sin(a) * 48; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke(); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawOrbitWeapons() {
    const w = player.weapons.find(item => item.id === "orbit"); if (!w) return;
    const count = 2 + Math.floor(w.level / 2), radius = 58 + w.level * 4 + (hasSynergy("bladeDance") ? 12 : 0);
    for (let i = 0; i < count; i++) {
      const a = totalElapsed * (2.4 + w.level * .08) + i / count * TAU, x = player.x + Math.cos(a) * radius, y = player.y + Math.sin(a) * radius;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.PI / 2); ctx.shadowBlur = 12; ctx.shadowColor = "#a7f3d0"; ctx.fillStyle = "#d1fae5";
      ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(7, 8); ctx.lineTo(0, 5); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.restore();
    }
  }

  function drawEnemy(e) {
    const meta = enemyMeta[e.type]; ctx.save(); ctx.translate(e.x, e.y); const pulse = 1 + Math.sin(e.phase) * .035; ctx.scale(pulse, pulse);
    if (e.aiState === "telegraph") {
      ctx.save(); ctx.rotate(e.aimAngle); ctx.strokeStyle = "rgba(251,113,133,.7)"; ctx.lineWidth = 3; ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(260, 0); ctx.stroke(); ctx.restore();
      ctx.strokeStyle = "rgba(251,113,133,.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, e.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - e.stateClock / .72)); ctx.stroke();
    }
    ctx.shadowBlur = e.boss ? 30 : e.elite ? 20 : 10; ctx.shadowColor = meta.color; ctx.fillStyle = e.hit ? "#fff" : meta.color;
    if (e.type === "shooter") polygon(3, e.r, Math.PI / 2);
    else if (e.type === "charger") polygon(5, e.r, -Math.PI / 2);
    else if (e.type === "tank") roundedBody(e.r);
    else if (e.type === "summoner") polygon(8, e.r, Math.PI / 8);
    else if (e.type === "swift") polygon(4, e.r, Math.PI / 4);
    else polygon(e.boss ? 12 : e.elite ? 9 : 6, e.r, 0);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#111827";
    if (e.type === "shooter") { circle(0, 2, 5); ctx.fillStyle = "#fef08a"; circle(0, 2, 2); }
    else if (e.type === "summoner") { ctx.strokeStyle = "#1e1b4b"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke(); circle(0, 0, 3); }
    else { circle(-e.r * .25, -2, Math.max(2, e.r * .11)); circle(e.r * .25, -2, Math.max(2, e.r * .11)); }
    if (e.type === "charger") { ctx.fillStyle = "#fecdd3"; ctx.beginPath(); ctx.moveTo(-e.r * .7, -e.r * .55); ctx.lineTo(-e.r * 1.05, -e.r * 1.2); ctx.lineTo(-e.r * .2, -e.r * .7); ctx.fill(); ctx.beginPath(); ctx.moveTo(e.r * .7, -e.r * .55); ctx.lineTo(e.r * 1.05, -e.r * 1.2); ctx.lineTo(e.r * .2, -e.r * .7); ctx.fill(); }
    if (e.hp < e.maxHp || e.elite || e.boss) { ctx.fillStyle = "rgba(4,8,15,.82)"; ctx.fillRect(-e.r, -e.r - 12, e.r * 2, 5); ctx.fillStyle = meta.color; ctx.fillRect(-e.r, -e.r - 12, e.r * 2 * Math.max(0, e.hp / e.maxHp), 5); }
    ctx.restore();
  }

  function roundedBody(r) { ctx.beginPath(); ctx.roundRect(-r, -r * .78, r * 2, r * 1.56, 8); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 3; ctx.stroke(); }
  function polygon(points, radius, rotation) { ctx.beginPath(); for (let i = 0; i < points; i++) { const a = i / points * TAU + rotation, rr = i % 2 && points > 6 ? radius * .82 : radius; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.fill(); }
  function drawBullet(b) {
    const angle = Math.atan2(b.vy, b.vx), length = Math.max(10, b.r * 2.7);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(angle); ctx.shadowBlur = 16; ctx.shadowColor = b.color;
    ctx.strokeStyle = b.color; ctx.lineWidth = Math.max(3, b.r * 1.25); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-length, 0); ctx.lineTo(length * .35, 0); ctx.stroke();
    ctx.fillStyle = "#ffffff"; circle(length * .35, 0, Math.max(2.5, b.r * .58)); ctx.restore();
  }
  function drawEnemyBullet(b) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(totalElapsed * 5); ctx.shadowBlur = 17; ctx.shadowColor = "#ff1744";
    ctx.fillStyle = "#16070b"; polygon(4, b.r + 3, Math.PI / 4); ctx.strokeStyle = "#ff3158"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fff1f2"; polygon(4, Math.max(2, b.r * .32), Math.PI / 4); ctx.shadowBlur = 0; ctx.restore();
  }
  function drawGem(g) { ctx.save(); ctx.translate(g.x, g.y + Math.sin(g.phase) * 2); ctx.rotate(g.phase * .25); ctx.shadowBlur = 12; ctx.shadowColor = "#22d3ee"; ctx.fillStyle = "#67e8f9"; polygon(4, g.r, Math.PI / 4); ctx.restore(); }
  function drawChest(chest) {
    ctx.save(); ctx.translate(chest.x, chest.y + Math.sin(totalElapsed * 3 + chest.phase) * 3); ctx.shadowBlur = 24; ctx.shadowColor = "#fbbf24";
    ctx.fillStyle = "#92400e"; ctx.beginPath(); ctx.roundRect(-17, -12, 34, 26, 6); ctx.fill();
    ctx.fillStyle = "#fbbf24"; ctx.fillRect(-17, -3, 34, 5); ctx.fillRect(-3, -12, 6, 26); ctx.fillStyle = "#fef3c7"; circle(0, 0, 3); ctx.restore();
  }

  function muzzle(angle, color) { burst(player.x + Math.cos(angle) * 22, player.y + Math.sin(angle) * 22, color, 4, 75); }
  function particle(x, y, vx, vy, color, life, r) { return { x, y, vx, vy, color, life, max: life, r }; }
  function burst(x, y, color, count, speed) { for (let i = 0; i < count; i++) { const a = Math.random() * TAU, s = Math.random() * speed, life = rand(.2, .55); particles.push(particle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, life, rand(2, 5))); } }
  function floatText(x, y, text, color) { texts.push({ x, y, text, color, life: .65 }); }
  function showToast(text) { ui.toast.textContent = text; ui.toast.classList.remove("hidden"); toastTimer = 2.5; }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function rand(min, max) { return Math.random() * (max - min) + min; }
  function formatTime(sec) { const safe = Math.max(0, sec); return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(Math.floor(safe % 60)).padStart(2, "0")}`; }

  function loop(now) {
    if (state !== "playing") return;
    const dt = Math.min(.033, Math.max(0, (now - lastTime) / 1000 || 0)); lastTime = now;
    update(dt); draw(); if (state === "playing") requestAnimationFrame(loop);
  }

  function updateTouchVector(event) {
    const rect = ui.joystick.getBoundingClientRect(), centerX = rect.left + rect.width / 2, centerY = rect.top + rect.height / 2;
    const dx = event.clientX - centerX, dy = event.clientY - centerY, max = rect.width * .32, length = Math.hypot(dx, dy) || 1;
    const scale = Math.min(1, max / length), px = dx * scale, py = dy * scale;
    touchInput.x = clamp(px / max, -1, 1); touchInput.y = clamp(py / max, -1, 1);
    ui.joystickKnob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
  }

  function resetTouchVector(event) {
    if (event && touchInput.pointerId !== null && event.pointerId !== touchInput.pointerId) return;
    touchInput.x = 0; touchInput.y = 0; touchInput.active = false; touchInput.pointerId = null;
    ui.joystickKnob.style.transform = "translate(-50%, -50%)";
  }

  ui.joystick.onpointerdown = event => {
    touchInput.active = true; touchInput.pointerId = event.pointerId;
    if (ui.joystick.setPointerCapture) ui.joystick.setPointerCapture(event.pointerId);
    updateTouchVector(event);
  };
  ui.joystick.onpointermove = event => { if (touchInput.active && event.pointerId === touchInput.pointerId) updateTouchVector(event); };
  ui.joystick.onpointerup = resetTouchVector; ui.joystick.onpointercancel = resetTouchVector;

  function selectMode(mode) {
    selectedMode = mode; ui.rogueMode.classList.toggle("selected", mode === "rogue"); ui.endlessMode.classList.toggle("selected", mode === "endless");
    ui.difficultyGroup.classList.remove("hidden");
    ui.modeDescription.textContent = mode === "rogue" ? "完成 10 个逐渐升级的关卡。精英掉落宝箱，每关结束进行路线与构筑决策。" : "敌潮会持续增强，每 45 秒获得一次整备机会。没有终点，只有越来越高的纪录。";
    byId("startButton").textContent = mode === "rogue" ? "进入灰烬荒原" : "开始无尽挑战";
  }

  function selectDifficulty(id) {
    selectedDifficulty = id;
    for (const key of Object.keys(difficulties)) byId(`${key}Button`).classList.toggle("selected", key === id);
  }

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(key)) event.preventDefault();
    keys.add(key);
    if (key === "p" && !event.repeat) togglePause();
    if (key === "tab" && !event.repeat && (state === "playing" || state === "details")) openDetails();
  });
  window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
  window.addEventListener("resize", () => { resizeCanvas(); draw(); });
  byId("startButton").onclick = openOriginDraft; byId("resumeButton").onclick = togglePause;
  byId("closeDetailsButton").onclick = closeDetails; byId("continueButton").onclick = continueAfterUpgrade;
  byId("cancelOriginButton").onclick = cancelOriginDraft; byId("codexButton").onclick = openCodex;
  byId("closeCodexButton").onclick = () => ui.codex.classList.add("hidden");
  byId("achievementButton").onclick = openAchievements; byId("closeAchievementButton").onclick = () => ui.achievement.classList.add("hidden");
  byId("touchBuildButton").onclick = () => { if (state === "playing" || state === "details") openDetails(); };
  byId("touchPauseButton").onclick = () => { if (state === "playing" || state === "paused") togglePause(); };
  byId("restartButton").onclick = backToMenu; ui.rogueMode.onclick = () => selectMode("rogue"); ui.endlessMode.onclick = () => selectMode("endless");
  byId("easyButton").onclick = () => selectDifficulty("easy"); byId("normalButton").onclick = () => selectDifficulty("normal");
  byId("hardButton").onclick = () => selectDifficulty("hard"); byId("nightmareButton").onclick = () => selectDifficulty("nightmare");
  ui.reroll.onclick = () => { if (rerolls > 0 && upgradePoints > 0) { rerolls--; rollUpgradeChoices(); } };

  if (FAST_TEST) window.__EMBER_TEST_API__ = { openEliteChest, unlockAchievement };
  resizeCanvas(); resetRun(); renderMetaProgress(); draw();
})();
