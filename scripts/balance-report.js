"use strict";

const balance = require("../balance.js");
const levels = [1, 3, 5];
const names = {
  ember: "余烬连弩", twins: "双生侧炮", nova: "脉冲环", orbit: "星环刃", rail: "裂隙轨道枪",
  scatter: "铸渣霰弹器", flame: "熔炉喷射器", tesla: "电弧线圈", turret: "铸火炮塔"
};

console.log("\n武器理论输出（基础角色，含基础暴击期望）");
console.table(Object.keys(names).flatMap(id => levels.map(level => {
  const stats = balance.weaponStats(id, level);
  return { 武器: names[id], 等级: level, 单次伤害: stats.damage.toFixed(1), 弹丸或刃数: stats.projectiles, 攻击间隔: stats.cooldown.toFixed(2), 理论DPS: stats.expectedDps.toFixed(1) };
})));

console.log("十关基础敌人生命成长（未计难度、路线和异变）");
console.table(Array.from({ length: 10 }, (_, index) => ({
  关卡: index + 1,
  生命倍率: balance.stageGrowth(index).toFixed(2),
  爬行影生命: Math.round(balance.CONFIG.enemies.crawler.hp * balance.stageGrowth(index)),
  甲壳兽生命: Math.round(balance.CONFIG.enemies.tank.hp * balance.stageGrowth(index)),
  首领生命: Math.round(balance.CONFIG.enemies.boss.hp * balance.stageGrowth(index))
})));

console.log("\n基线：精准 90%，非暴击伤害区间 90%～110%，暴击率 5%，暴击倍率 1.65。\n");
