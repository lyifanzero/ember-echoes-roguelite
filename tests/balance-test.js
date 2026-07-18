"use strict";

const assert = require("node:assert/strict");
const balance = require("../balance.js");

const snapshot = balance.balanceSnapshot();
assert.equal(snapshot.weapons.length, 4, "应覆盖全部四种武器的平衡曲线");
assert.equal(snapshot.enemyGrowth.length, 10, "应覆盖十关敌人生命成长");
assert.equal(balance.stageGrowth(0), 1, "第一关不应额外膨胀生命");
assert.ok(balance.stageGrowth(9) <= 2.7, "第十关基础生命倍率应控制在 2.7 倍以内");

for (const id of ["ember", "twins", "nova", "orbit"]) {
  const level1 = balance.weaponStats(id, 1), level5 = balance.weaponStats(id, 5);
  assert.ok(level1.expectedDps >= 20 && level1.expectedDps <= 50, `${id} 一级理论 DPS 应处于可比区间`);
  assert.ok(level5.expectedDps >= 85 && level5.expectedDps <= 135, `${id} 五级理论 DPS 不应出现数量级失衡`);
  assert.ok(level5.expectedDps > level1.expectedDps * 2, `${id} 升级应产生明确成长`);
}

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
