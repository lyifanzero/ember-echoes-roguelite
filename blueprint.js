(() => {
  "use strict";
  const chapters = [...document.querySelectorAll(".chapter")];
  const nav = document.getElementById("chapterNav"), title = document.getElementById("chapterTitle"), indexLabel = document.getElementById("chapterIndex");
  const noteInput = document.getElementById("noteInput"), statusSelect = document.getElementById("chapterStatus"), saveState = document.getElementById("saveState");
  const storageKey = "emberBlueprintV01";
  const state = loadState();
  let activeIndex = Math.max(0, Math.min(chapters.length - 1, Number(state.activeIndex) || 0));
  let editing = false, saveTimer = 0;

  function loadState() {
    try { return { notes: {}, statuses: {}, choices: {}, edits: {}, ...JSON.parse(localStorage.getItem(storageKey) || "{}") }; }
    catch { return { notes: {}, statuses: {}, choices: {}, edits: {} }; }
  }
  function saveStateNow() {
    state.activeIndex = activeIndex;
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* local preview may disable storage */ }
    saveState.textContent = "已自动保存";
  }
  function scheduleSave() {
    saveState.textContent = "正在保存…"; clearTimeout(saveTimer); saveTimer = setTimeout(saveStateNow, 250);
  }
  function chapterId(chapter = chapters[activeIndex]) { return chapter.dataset.chapter; }

  chapters.forEach((chapter, chapterIndex) => {
    const button = document.createElement("button");
    button.innerHTML = `<i>${String(chapterIndex + 1).padStart(2,"0")}</i><b>${chapter.dataset.title}</b>`;
    button.onclick = () => showChapter(chapterIndex); nav.appendChild(button);
  });

  function showChapter(nextIndex) {
    activeIndex = (nextIndex + chapters.length) % chapters.length;
    chapters.forEach((chapter, i) => chapter.classList.toggle("active", i === activeIndex));
    [...nav.children].forEach((button, i) => button.classList.toggle("active", i === activeIndex));
    title.textContent = chapters[activeIndex].dataset.title;
    indexLabel.textContent = `${String(activeIndex + 1).padStart(2,"0")} / ${String(chapters.length).padStart(2,"0")}`;
    noteInput.value = state.notes[chapterId()] || "";
    statusSelect.value = state.statuses[chapterId()] || "draft";
    document.getElementById("prevButton").disabled = activeIndex === 0;
    document.getElementById("nextButton").textContent = activeIndex === chapters.length - 1 ? "回到第一章 →" : "下一章 →";
    saveStateNow(); updateProgress();
  }

  noteInput.addEventListener("input", () => { state.notes[chapterId()] = noteInput.value; scheduleSave(); });
  statusSelect.addEventListener("change", () => { state.statuses[chapterId()] = statusSelect.value; saveStateNow(); updateProgress(); });
  document.getElementById("prevButton").onclick = () => showChapter(Math.max(0, activeIndex - 1));
  document.getElementById("nextButton").onclick = () => showChapter(activeIndex === chapters.length - 1 ? 0 : activeIndex + 1);

  document.getElementById("noteButton").onclick = () => {
    document.body.classList.toggle("notes-closed");
    document.getElementById("noteButton").classList.toggle("selected", !document.body.classList.contains("notes-closed"));
  };
  document.getElementById("closeNotes").onclick = () => { document.body.classList.add("notes-closed"); document.getElementById("noteButton").classList.remove("selected"); };

  const editables = [...document.querySelectorAll("[data-editable]")];
  for (const element of editables) {
    if (state.edits[element.id] !== undefined) element.innerHTML = state.edits[element.id];
    element.addEventListener("input", () => { state.edits[element.id] = element.innerHTML; scheduleSave(); });
  }
  document.getElementById("editButton").onclick = () => {
    editing = !editing; document.body.classList.toggle("editing", editing);
    document.getElementById("editButton").textContent = editing ? "完成编辑" : "编辑蓝图";
    document.getElementById("editButton").classList.toggle("selected", editing);
    for (const element of editables) element.contentEditable = String(editing);
    if (!editing) saveStateNow();
  };

  for (const group of document.querySelectorAll("[data-choice]")) {
    const key = group.dataset.choice;
    for (const button of group.querySelectorAll("button[data-value]")) {
      button.classList.toggle("selected", state.choices[key] === button.dataset.value);
      button.onclick = () => {
        state.choices[key] = button.dataset.value;
        for (const peer of group.querySelectorAll("button[data-value]")) peer.classList.toggle("selected", peer === button);
        scheduleSave();
      };
    }
  }

  function updateProgress() {
    const confirmed = chapters.filter(chapter => state.statuses[chapter.dataset.chapter] === "confirmed").length;
    document.getElementById("completionText").textContent = `${confirmed} / ${chapters.length} 已确认`;
    document.getElementById("completionBar").style.width = `${confirmed / chapters.length * 100}%`;
    [...nav.children].forEach((button, i) => button.classList.toggle("confirmed", state.statuses[chapters[i].dataset.chapter] === "confirmed"));
  }

  function exportDiscussion() {
    const lines = ["# 宠物宇宙开拓计划 · 产品结构蓝图讨论稿", "", `导出时间：${new Date().toLocaleString("zh-CN")}`, ""];
    chapters.forEach((chapter, i) => {
      const id = chapter.dataset.chapter, status = { draft:"草案", discussing:"讨论中", confirmed:"已确认" }[state.statuses[id] || "draft"];
      lines.push(`## ${String(i + 1).padStart(2,"0")} ${chapter.dataset.title}（${status}）`, "", state.notes[id] || "暂无讨论笔记。", "");
    });
    lines.push("## 已记录决策", "");
    for (const [key, value] of Object.entries(state.choices)) lines.push(`- ${key}: ${value}`);
    lines.push("", "## 蓝图文本修改", "", `已修改 ${Object.keys(state.edits).length} 个内容节点；修改保存在当前浏览器。`);
    const blob = new Blob([lines.join("\n")], { type:"text/markdown;charset=utf-8" }), link = document.createElement("a");
    link.href = URL.createObjectURL(blob); link.download = "产品结构蓝图-讨论稿.md"; link.click(); URL.revokeObjectURL(link.href);
  }
  document.getElementById("exportButton").onclick = exportDiscussion;
  window.addEventListener("keydown", event => {
    if (event.key === "ArrowLeft" && !editing && document.activeElement !== noteInput) showChapter(Math.max(0, activeIndex - 1));
    if (event.key === "ArrowRight" && !editing && document.activeElement !== noteInput) showChapter(activeIndex === chapters.length - 1 ? 0 : activeIndex + 1);
  });
  showChapter(activeIndex);
})();
