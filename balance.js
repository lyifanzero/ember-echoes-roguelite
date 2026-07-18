(function attachBalance(root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.__EMBER_BALANCE__ = api;
})(typeof window !== "undefined" ? window : globalThis, function createBalance() {
  "use strict";

  const CONFIG = {
    player: { basePrecision: .9, baseCritChance: .05, critMultiplier: 1.65 },
    progression: { enemyHpPerStage: .18, endlessHpPerSecond: 1 / 360 },
    weapons: {
      ember: { baseDamage: 18, damagePerLevel: 4, baseCooldown: .62, cooldownPerLevel: .04, minCooldown: .25, speed: 650, radius: 5.8, life: 1.8, homing: 12 },
      twins: { baseDamage: 10.5, damagePerLevel: 2.4, baseCooldown: 1.02, cooldownPerLevel: .055, minCooldown: .42, speed: 570, radius: 5.8, life: 1.65, homing: 10 },
      nova: { baseDamage: 7, damagePerLevel: 2.8, baseCooldown: 3.3, cooldownPerLevel: .18, minCooldown: 1.65, speed: 430, radius: 5.2, life: 2.15, homing: 8 },
      orbit: { baseDamage: 8, damagePerLevel: 3.5, hitCooldown: .28, baseRadius: 58, radiusPerLevel: 4 }
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
    let projectiles = 1, cooldown = Math.max(data.minCooldown, data.baseCooldown - data.cooldownPerLevel * safeLevel) * fireRate;
    if (id === "ember") projectiles += context.multishot || 0;
    if (id === "twins") projectiles = 2 + Math.floor((safeLevel - 1) / 2);
    if (id === "nova") projectiles = 6 + safeLevel + (context.starfall ? 4 : 0);
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
