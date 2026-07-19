"use strict";

const assert = require("node:assert/strict");
const balance = require("../balance.js");

const snapshot = balance.balanceSnapshot();
assert.equal(snapshot.weapons.length, 9, "应覆盖九种差异化武器的平衡曲线");
assert.equal(snapshot.enemyGrowth.length, 10, "应覆盖十关敌人生命成长");
assert.equal(balance.stageGrowth(0), 1, "第一关不应额外膨胀生命");
assert.ok(balance.stageGrowth(9) <= 2.7, "第十关基础生命倍率应控制在 2.7 倍以内");

for (const id of ["ember", "twins", "nova", "orbit", "rail", "scatter", "flame", "tesla", "turret"]) {
  const level1 = balance.weaponStats(id, 1), level5 = balance.weaponStats(id, 5);
  assert.ok(level1.expectedDps >= 18 && level1.expectedDps <= 50, `${id} 一级理论 DPS 应处于可比区间`);
  assert.ok(level5.expectedDps >= 60 && level5.expectedDps <= 145, `${id} 五级理论 DPS 不应出现数量级失衡`);
  assert.ok(level5.expectedDps > level1.expectedDps * 1.8, `${id} 升级应产生明确成长`);
}

assert.equal(balance.CONFIG.combat.waveMax, 6, "单次敌潮应限制数量，避免视觉和数值拥塞");
assert.ok(balance.CONFIG.drops.healBase > 0 && balance.CONFIG.drops.chestLuck > 0, "治疗与幸运宝箱应拥有可测试的掉率参数");

const sequence = values => () => values.shift();
const low = balance.damageRoll(100, .9, .05, sequence([0, 1]));
const high = balance.damageRoll(100, .9, .05, sequence([1, 1]));
assert.equal(Math.round(low.damage), 90, "基础精准度的最低非暴击伤害应为 90%");
assert.equal(Math.round(high.damage), 110, "基础精准度的最高非暴击伤害应为 110%");
const calibrated = balance.damageRoll(100, .98, 0, sequence([0, 1]));
assert.equal(Math.round(calibrated.damage), 98, "精准强化应收窄伤害波动而不是改变射击方向");
const stage5BossTtk = balance.CONFIG.enemies.boss.hp * balance.stageGrowth(4) / 250;
const stage10BossTtk = balance.CONFIG.enemies.boss.hp * balance.stageGrowth(9) / 420;
assert.ok(stage5BossTtk <= 20 && stage10BossTtk <= 18, "成熟构筑应能在首领基础时间窗内完成击杀");

console.log("Balance test passed: DPS curves, stage growth, precision variance and critical model.");
