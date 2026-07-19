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
assert.match(script, /localStorage\.setItem/, "讨论状态应保存在当前浏览器");
assert.match(script, /exportDiscussion/, "蓝图应能导出讨论稿");
assert.match(css, /@media\(max-width:760px\)/, "蓝图应提供移动端布局");

console.log("Blueprint test passed: chapters, editing, decisions, persistence and responsive layout.");
