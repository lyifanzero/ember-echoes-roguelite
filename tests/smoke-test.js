"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...names) { names.forEach(name => this.values.add(name)); }
  remove(...names) { names.forEach(name => this.values.delete(name)); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    const next = force === undefined ? !this.contains(name) : force;
    next ? this.add(name) : this.remove(name);
    return next;
  }
}

function fakeElement(id = "") {
  return {
    id,
    className: "",
    classList: new FakeClassList(),
    style: { setProperty(name, value) { this[name] = value; } },
    dataset: {},
    children: [],
    textContent: "",
    innerHTML: "",
    onclick: null,
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; this.innerHTML = ""; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; }
  };
}

const noOp = () => {};
const gradient = { addColorStop: noOp };
const context = new Proxy({}, {
  get(target, prop) {
    if (prop in target) return target[prop];
    if (prop === "createRadialGradient") return () => gradient;
    return noOp;
  },
  set(target, prop, value) { target[prop] = value; return true; }
});

const elements = new Map();
function getElement(id) {
  if (!elements.has(id)) {
    const element = fakeElement(id);
    if (id === "gameCanvas") element.getContext = () => context;
    if (["hud", "originScreen", "upgradeScreen", "chestScreen", "detailsScreen", "codexScreen", "achievementScreen", "pauseScreen", "endScreen", "toast", "bossBarWrap", "touchControls"].includes(id)) {
      element.classList.add("hidden");
    }
    elements.set(id, element);
  }
  return elements.get(id);
}

const listeners = {};
const animationFrames = [];
global.document = {
  getElementById: getElement,
  createElement: () => fakeElement()
};
global.window = {
  devicePixelRatio: 1,
  __GAME_TEST__: true,
  addEventListener(type, handler) { (listeners[type] ||= []).push(handler); }
};
global.requestAnimationFrame = callback => { animationFrames.push(callback); return animationFrames.length; };
const storage = new Map();
global.localStorage = {
  getItem(key) { return storage.get(key) || null; },
  setItem(key, value) { storage.set(key, value); }
};

let randomSeed = 1337;
Math.random = () => ((randomSeed = randomSeed * 16807 % 2147483647) - 1) / 2147483646;

require(path.join(__dirname, "..", "balance.js"));
require(path.join(__dirname, "..", "game.js"));

const start = getElement("startButton");
assert.equal(typeof start.onclick, "function", "开始按钮应绑定事件");
getElement("codexButton").onclick();
assert.equal(getElement("codexScreen").classList.contains("hidden"), false, "研究档案应可打开");
assert.match(getElement("codexContent").innerHTML, /流派共鸣/, "研究档案应展示共鸣研究进度");
getElement("closeCodexButton").onclick();
getElement("achievementButton").onclick();
assert.equal(getElement("achievementScreen").classList.contains("hidden"), false, "成就面板应可打开");
assert.match(getElement("achievementContent").innerHTML, /毫发无伤/, "成就面板应展示特殊通关挑战");
getElement("closeAchievementButton").onclick();
assert.equal(typeof getElement("rogueModeButton").onclick, "function", "闯关模式应可选择");
assert.equal(typeof getElement("endlessModeButton").onclick, "function", "无尽模式应可选择");
getElement("endlessModeButton").onclick();
assert.match(getElement("modeDescription").textContent, /45 秒/, "无尽模式应展示补给规则");
getElement("rogueModeButton").onclick();
getElement("hardButton").onclick();
assert.equal(getElement("hardButton").classList.contains("selected"), true, "难度按钮应更新选择状态");
getElement("normalButton").onclick();
start.onclick();
assert.equal(getElement("originScreen").classList.contains("hidden"), false, "开始远征后应进入角色选择");
assert.equal(getElement("originChoices").children.length, 8, "开局应提供全部八种角色流派供自主选择");
assert.match(getElement("originChoices").children[0].innerHTML, /限制：/, "角色卡应明确展示自身限制");
getElement("originChoices").children[0].onclick();
assert.match(getElement("originTitle").textContent, /选择武器/, "选择角色后应进入初始武器选择");
assert.equal(getElement("originChoices").children.length, 3, "角色应提供适配的初始武器选项");
assert.match(getElement("originChoices").children[0].innerHTML, /weapon-visual/, "武器选择应展示实体外观预览");
getElement("originChoices").children[0].onclick();
assert.ok(storage.has("emberEchoProfile"), "选择原型后应保存跨局研究进度");
assert.equal(getElement("hud").classList.contains("hidden"), false, "开始后应显示 HUD");
assert.equal(getElement("touchControls").classList.contains("hidden"), false, "战斗开始后应启用移动端触控层");
const canvas = getElement("gameCanvas"), joystick = getElement("joystick"), knob = getElement("joystickKnob");
assert.equal(typeof canvas.onpointerdown, "function", "整个战场应绑定移动端触控事件");
canvas.onpointerdown({ pointerType: "touch", pointerId: 7, clientX: 640, clientY: 360, preventDefault: noOp });
assert.equal(joystick.classList.contains("active"), true, "触摸战场任意位置应显示动态摇杆");
assert.equal(joystick.style.left, "640px", "动态摇杆中心应跟随首次触摸位置");
canvas.onpointermove({ pointerType: "touch", pointerId: 7, clientX: 700, clientY: 360, preventDefault: noOp });
assert.match(knob.style.transform, /calc\(-50% \+ 59px\)/, "拖动手指应推动摇杆并限制最大半径");
canvas.onpointerup({ pointerType: "touch", pointerId: 7 });
assert.equal(joystick.classList.contains("active"), false, "松手后动态摇杆应消失");
const aimProbe = window.__EMBER_TEST_API__.probeAutoAim();
assert.ok(aimProbe.length > 0, "远程武器应能生成锁敌弹丸");
assert.ok(aimProbe.every(shot => shot.locked && shot.homing > 0), "所有远程弹丸都应绑定目标并持续追踪");
assert.ok(aimProbe.every(shot => shot.angleError < .001), "武器初始射击方向不应加入随机偏差");
assert.ok(aimProbe.some(shot => Math.abs(shot.damage - shot.baseDamage) > .001), "随机性应体现在实际伤害数值上");

let now = performance.now();
for (let index = 0; index < 120; index++) {
  const callback = animationFrames.shift();
  assert.equal(typeof callback, "function", "游戏运行时应持续请求动画帧");
  now += 16.6667;
  callback(now);
}

assert.match(getElement("timerText").textContent, /^00:0[12]$/, "关卡倒计时应随帧循环更新");
assert.match(getElement("hpText").textContent, /^\d+ \/ \d+$/, "原型生命值应正确显示");
assert.match(getElement("weaponStrip").innerHTML, /LV\./, "HUD 应展示当前武器");
assert.match(getElement("weaponStrip").innerHTML, /weapon-visual/, "HUD 应展示武器实体外观");
assert.match(getElement("weaponStrip").innerHTML, /guardian/, "HUD 应单独展示守护装备");

window.__EMBER_TEST_API__.openEliteChest();
assert.equal(getElement("chestScreen").classList.contains("hidden"), false, "拾取精英宝箱后应暂停并展示奖励");
assert.equal(getElement("chestChoices").children.length, 3, "精英宝箱应提供三项高价值奖励");
getElement("chestChoices").children[0].onclick();
assert.equal(getElement("chestScreen").classList.contains("hidden"), true, "选择奖励后应返回战斗");

listeners.keydown[0]({ key: "p", repeat: false, preventDefault: noOp });
assert.equal(getElement("pauseScreen").classList.contains("hidden"), false, "P 键应暂停游戏");
getElement("resumeButton").onclick();
assert.equal(getElement("pauseScreen").classList.contains("hidden"), true, "继续按钮应关闭暂停层");

listeners.keydown[0]({ key: "Tab", repeat: false, preventDefault: noOp });
assert.equal(getElement("detailsScreen").classList.contains("hidden"), false, "Tab 应打开构筑面板");
assert.match(getElement("detailsLoadout").innerHTML, /角色属性/, "构筑面板应展示角色属性");
assert.match(getElement("detailsLoadout").innerHTML, /实体武器/, "构筑面板应展示全部实体武器");
assert.match(getElement("detailsLoadout").innerHTML, /weapon-visual/, "构筑面板应展示武器外观预览");
assert.match(getElement("detailsLoadout").innerHTML, /守护装备/, "构筑面板应展示守护装备");
getElement("closeDetailsButton").onclick();

for (let index = 0; index < 260 && getElement("upgradeScreen").classList.contains("hidden"); index++) {
  const callback = animationFrames.shift();
  if (!callback) break;
  now += 16.6667;
  callback(now);
}

assert.equal(getElement("upgradeScreen").classList.contains("hidden"), false, "关卡结束后应进入整备界面");
assert.equal(getElement("upgradeChoices").children.length, 3, "整备界面应提供三项强化");
assert.match(getElement("upgradeChoices").children[0].className, /rarity-(common|rare|epic)/, "强化应具有随机稀有度");
assert.equal(getElement("routeChoices").children.length, 3, "关卡结束后应提供三条随机路线");
assert.match(getElement("upgradeLoadout").innerHTML, /实体武器/, "关卡结算应展示完整构筑");
assert.match(getElement("upgradeLoadout").innerHTML, /守护装备/, "关卡结算应展示守护构筑");
getElement("upgradeChoices").children[0].onclick();
assert.equal(getElement("continueButton").classList.contains("hidden"), true, "未选择路线时不能进入下一关");
assert.match(getElement("pointsRemaining").textContent, /请选择下一条路线/, "应明确提示玩家完成路线决策");
getElement("routeChoices").children[0].onclick();
assert.equal(getElement("continueButton").classList.contains("hidden"), false, "分配完技能点后应允许进入下一关");
getElement("continueButton").onclick();
assert.equal(getElement("upgradeScreen").classList.contains("hidden"), true, "继续后应关闭整备界面");

console.log("Smoke test passed: modes, combat loop, loadout, stage settlement, upgrade and continue.");
