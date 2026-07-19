"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "blueprint.html"), "utf8");
const css = fs.readFileSync(path.join(root, "blueprint.css"), "utf8");
const script = fs.readFileSync(path.join(root, "blueprint.js"), "utf8");

const chapters = [...html.matchAll(/<article class="chapter(?: active)?" data-chapter="([^"]+)"/g)].map(match => match[1]);
assert.deepEqual(chapters, ["vision", "world", "loop", "session", "systems", "home", "slice", "decisions"], "蓝图应保持八章由全局到模块的讨论结构");
assert.match(html, /data-choice="homeForm"/, "蓝图应记录家园形式决策");
assert.match(html, /data-choice="lossRule"/, "蓝图应记录撤离损失决策");
assert.match(html, /data-editable/, "蓝图正文应支持直接编辑");
assert.match(html, /固定槽位居住舱/, "已确认的轻家园范围应写入垂直切片");
assert.match(html, /居民复杂寻路与生活模拟/, "蓝图应明确首版不制作复杂居民模拟");
assert.match(html, /不强迫经营，不阻塞下一次战斗/, "产品定位应说明战斗与轻家园的受众桥接原则");
assert.match(html, /核心玩法[\s\S]*肉鸽战斗与构筑/, "蓝图应将肉鸽战斗明确为核心玩法");
assert.match(html, /局内副玩法[\s\S]*搜打撤与货舱选择/, "搜打撤应明确归入局内副玩法");
assert.match(html, /局外副玩法[\s\S]*宠物轻家园/, "宠物家园应明确归入局外副玩法");
assert.match(html, /采用轻度搜打撤/, "远征结构应记录已经确认的轻度搜打撤方案");
assert.match(html, /局内战斗值[\s\S]*带出物资值[\s\S]*局外经济值/, "蓝图应隔离三层数值体系");
assert.match(html, /永久伤害、生命和战斗倍率永远不因局外成长改变/, "局外成长不得改变永久战斗倍率");
assert.match(html, /只能完成特定任务解锁/, "仓库和货舱扩容必须由特定任务解锁");
assert.match(html, /普通货舱与安全槽均设固定上限/, "局内背包容量不得无限膨胀");
assert.match(html, /初始 4\+1、上限 6\+2/, "货舱数值应标明为可调整的原型占位值");
assert.match(html, /战斗中拾取密封物资箱[\s\S]*关卡结束统一开箱[\s\S]*撤离或继续深入/, "轻度搜打撤应有不打断战斗的完整原型流程");
assert.match(html, /基础材料包[\s\S]*蓝图芯片[\s\S]*陈列遗物[\s\S]*居民信物/, "首版货物应保持四类清晰用途");
assert.match(html, /基础材料包[\s\S]*1 格 · 可堆叠/, "常规材料应提供稳定且高占格效率的收益");
assert.match(html, /陈列遗物[\s\S]*2 格 · 可展示/, "大型收藏物应通过额外占格制造取舍");
assert.match(html, /货舱已满[\s\S]*永不自动删除已有货物/, "货舱替换必须由玩家明确决定");
assert.match(html, /重复蓝图自动转为少量材料/, "重复蓝图不应成为无效掉落");
assert.match(html, /战斗强化宝箱[\s\S]*本局武器、技能与数值[\s\S]*密封物资箱[\s\S]*可撤离货物/, "局内强化宝箱与可撤离物资箱必须明确区分");
assert.match(script, /localStorage\.setItem/, "讨论状态应保存在当前浏览器");
assert.match(script, /exportDiscussion/, "蓝图应能导出讨论稿");
assert.match(css, /@media\(max-width:760px\)/, "蓝图应提供移动端布局");

console.log("Blueprint test passed: chapters, editing, decisions, persistence and responsive layout.");
