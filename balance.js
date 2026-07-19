(function attachBalance(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.__EMBER_BALANCE__ = api;
})(typeof window !== "undefined" ? window : globalThis, function createBalance() {
  "use strict";

  const CONFIG = {
    player: { basePrecision: .9, baseCritChance: .05, critMultiplier: 1.65 },
    progression: { enemyHpPerStage: .18, endlessHpPerSecond: 1 / 360 },
    combat: { maxWeapons: 6, waveMax: 6, waveMinInterval: .38, stageIntensity: .22 },
    drops: { healBase: .018, healLuck: .045, chestBase: .0035, chestLuck: .032, maxLuckyChest: .055 },
    weapons: {
      ember: { baseDamage: 18, damagePerLevel: 4, baseCooldown: .62, cooldownPerLevel: .04, minCooldown: .25, speed: 650, radius: 5.8, life: 1.8, homing: 12 },
      twins: { baseDamage: 10.5, damagePerLevel: 2.4, baseCooldown: 1.02, cooldownPerLevel: .055, minCooldown: .42, speed: 570, radius: 5.8, life: 1.65, homing: 10 },
      nova: { baseDamage: 7, damagePerLevel: 2.8, baseCooldown: 3.3, cooldownPerLevel: .18, minCooldown: 1.65, speed: 430, radius: 5.2, life: 2.15, homing: 8 },
      orbit: { baseDamage: 8, damagePerLevel: 3.5, hitCooldown: .28, baseRadius: 58, radiusPerLevel: 4 },
      rail: { baseDamage: 35, damagePerLevel: 9, baseCooldown: 1.72, cooldownPerLevel: .085, minCooldown: .92, speed: 920, radius: 7.4, life: 1.35, homing: 14 },
      scatter: { baseDamage: 5.5, damagePerLevel: 1.6, baseCooldown: 1.18, cooldownPerLevel: .055, minCooldown: .68, speed: 610, radius: 4.8, life: .72, homing: 13 },
      flame: { baseDamage: 4.8, damagePerLevel: 1.3, baseCooldown: .23, cooldownPerLevel: .012, minCooldown: .11, speed: 390, radius: 6.8, life: .52, homing: 15 },
      tesla: { baseDamage: 15, damagePerLevel: 5, baseCooldown: 1.42, cooldownPerLevel: .06, minCooldown: .82, chainRange: 185 },
      turret: { baseDamage: 9, damagePerLevel: 3.4, shotCooldown: .62, shotCooldownPerLevel: .035, minShotCooldown: .3, deployCooldown: 8.5, lifetime: 16, range: 330, speed: 600, homing: 11 }
    },
    guardian: { sentinelHoming: 11 },
    enemies: {
      crawler: { r: 14, hp: 36, speed: 66, damage: 11, xp: 3 },
      swift: { r: 11, hp: 26, speed: 104, damage: 9, xp: 4 },
      tank: { r: 24, hp: 125, speed: 40, damage: 19, xp: 9 },
      shooter: { r: 17, hp: 62, speed: 55, damage: 10, xp: 8, attackRate: 1.7 },
      charger: { r: 20, hp: 92, speed: 48, damage: 24, xp: 10, attackRate: 3.1 },
      summoner: { r: 21, hp: 112, speed: 38, damage: 12, xp: 14, attackRate: 4.2 },
      minion: { r: 8, hp: 18, speed: 120, damage: 6, xp: 1 },
      elite: { r: 30, hp: 440, speed: 54, damage: 24, xp: 36, elite: true, attackRate: 2.2 },
      boss: { r: 55, hp: 2800, speed: 34, damage: 30, xp: 130, boss: true, attackRate: 1.8 }
    }
  };

  function stageGrowth(stageIndex) { return 1 + Math.max(0, stageIndex) * CONFIG.progression.enemyHpPerStage; }

  function damageRoll(baseDamage, precision = CONFIG.player.basePrecision, critChance = CONFIG.player.baseCritChance, random = Math.random) {
    const spread = Math.max(.02, 1 - Math.min(.98, Math.max(.5, precision)));
    const variance = 1 - spread + random() * spread * 2;
    const crit = random() < Math.max(0, Math.min(.75, critChance));
    return { damage: baseDamage * variance * (crit ? CONFIG.player.critMultiplier : 1), variance, crit };
  }

  function weaponStats(id, level = 1, context = {}) {
    const safeLevel = Math.max(1, level), data = CONFIG.weapons[id], fireRate = context.fireRate || 1;
    if (!data) throw new Error(`Unknown weapon: ${id}`);
    if (id === "orbit") {
      const damage = data.baseDamage + data.damagePerLevel * safeLevel;
      return { id, level: safeLevel, damage, projectiles: 2 + Math.floor(safeLevel / 2), cooldown: data.hitCooldown,
        radius: data.baseRadius + data.radiusPerLevel * safeLevel, expectedDps: damage / data.hitCooldown };
    }
    const damage = data.baseDamage + data.damagePerLevel * safeLevel;
    if (id === "tesla") {
      const projectiles = 2 + Math.floor(safeLevel / 3), cooldown = Math.max(data.minCooldown, data.baseCooldown - data.cooldownPerLevel * safeLevel) * fireRate;
      return { id, level: safeLevel, damage, projectiles, cooldown, chainRange: data.chainRange, expectedDps: damage * projectiles / cooldown };
    }
    if (id === "turret") {
      const projectiles = 1 + Math.floor(safeLevel / 4), cooldown = Math.max(data.minShotCooldown, data.shotCooldown - data.shotCooldownPerLevel * safeLevel) * fireRate;
      return { id, level: safeLevel, damage, projectiles, cooldown, deployCooldown: Math.max(4.5, data.deployCooldown - safeLevel * .45), lifetime: data.lifetime + safeLevel, range: data.range + safeLevel * 12, speed: data.speed, homing: data.homing, expectedDps: damage * projectiles / cooldown };
    }
    let projectiles = 1, cooldown = Math.max(data.minCooldown, data.baseCooldown - data.cooldownPerLevel * safeLevel) * fireRate;
    if (id === "ember") projectiles += context.multishot || 0;
    if (id === "twins") projectiles = 2 + Math.floor((safeLevel - 1) / 2);
    if (id === "nova") projectiles = 6 + safeLevel + (context.starfall ? 4 : 0);
    if (id === "scatter") projectiles = 5 + Math.floor(safeLevel / 2);
    if (id === "flame") projectiles = 1 + (safeLevel >= 5 ? 1 : 0);
    if (context.barrage && (id === "ember" || id === "twins")) cooldown *= .8;
    const critChance = context.critChance ?? CONFIG.player.baseCritChance;
    const expectedHit = damage * (1 + critChance * (CONFIG.player.critMultiplier - 1));
    return { id, level: safeLevel, damage, projectiles, cooldown, speed: data.speed, radius: data.radius, life: data.life,
      homing: data.homing, expectedDps: expectedHit * projectiles / cooldown };
  }

  function balanceSnapshot() {
    const levels = [1, 3, 5];
    return {
      weapons: Object.keys(CONFIG.weapons).map(id => ({ id, levels: levels.map(level => weaponStats(id, level)) })),
      enemyGrowth: Array.from({ length: 10 }, (_, stage) => stageGrowth(stage)),
      baselinePrecision: CONFIG.player.basePrecision,
      baselineCritChance: CONFIG.player.baseCritChance
    };
  }

  return { CONFIG, stageGrowth, damageRoll, weaponStats, balanceSnapshot };
});
