import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlPath = "file:///d:/AI/SET OUT/GAMES/be_a_hacker/TRAINING CENTER/Mission 1.5/BASE DEFEND/GAME/index.html";
const port = 9230;
const testUserDataDir = path.join(os.tmpdir(), "chrome-robot-link-levels-profile");
const artifactDir = "C:\\Users\\user\\.gemini\\antigravity\\brain\\6a32946a-7c6a-41be-8234-125bdfe2c36b";

if (!fs.existsSync(artifactDir)) {
  fs.mkdirSync(artifactDir, { recursive: true });
}

const chromeProc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${testUserDataDir}`,
  "--headless=new",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  htmlPath
], { stdio: "ignore" });

let ws = null;
let reqId = 1;
const pending = new Map();

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = reqId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evalInPage(expr) {
  const res = await send("Runtime.evaluate", {
    expression: expr,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.result.exceptionDetails) {
    const desc = res.result.exceptionDetails.exception?.description || res.result.exceptionDetails.text;
    throw new Error(`Page Error: ${desc}`);
  }
  return res.result.result?.value;
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function assert(description, condition, extraInfo = "") {
  if (condition) {
    console.log(`[PASS] ${description}`);
  } else {
    console.error(`[FAIL] ${description} ${extraInfo}`);
    process.exitCode = 1;
  }
}

async function captureScreenshot(name, clip = null) {
  const params = { format: "png" };
  if (clip) params.clip = clip;
  const shot = await send("Page.captureScreenshot", params);
  const outPath = path.join(artifactDir, name);
  fs.writeFileSync(outPath, Buffer.from(shot.result.data, "base64"));
  console.log(`[SCREENSHOT] Saved ${name}`);
}

async function runTests() {
  console.log("Waiting for Chrome DevTools endpoint on port " + port + "...");
  let pageWsUrl = null;
  for (let i = 0; i < 30; i++) {
    await wait(300);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json`);
      const list = await res.json();
      const target = list.find(t => t.type === "page" && t.url.includes("index.html"));
      if (target && target.webSocketDebuggerUrl) {
        pageWsUrl = target.webSocketDebuggerUrl;
        break;
      }
    } catch (e) {}
  }

  if (!pageWsUrl) {
    console.error("Failed to connect to Chrome page.");
    chromeProc.kill();
    process.exit(1);
  }

  ws = new WebSocket(pageWsUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg);
      }
    };
  });

  console.log("Connected to browser. Enabling Runtime, DOM & Page...");
  await send("Runtime.enable");
  await send("DOM.enable");
  await send("Page.enable");

  // Wait for game initialization
  for (let i = 0; i < 30; i++) {
    const ready = await evalInPage(`Boolean(window.gameInstance && window.GAME_MODES && window.RobotLinkLevel)`);
    if (ready) break;
    await wait(200);
  }

  const kanjiRegex = /[\u4E00-\u9FAF]/;

  console.log("\n=======================================================");
  console.log("ROBOT LINK PROGRESSIVE LEVELS & HUD VERIFICATION SUITE");
  console.log("=======================================================\n");

  // TEST 1: Level 1 Start & HUD Inspection (EN & JA)
  console.log("--- TEST 1: Level 1 Start & HUD Inspection ---");
  await evalInPage(`(() => {
    window.gameInstance.setMode('robot_link');
    window.gameInstance.selectedDifficulty = 'normal';
    window.gameInstance.shields = window.DIFFICULTY_SETTINGS['normal'].startingShields;
    window.gameInstance.maxShields = window.DIFFICULTY_SETTINGS['normal'].startingShields;
    window.gameInstance.totalWaves = 3;
    window.gameInstance.setLanguage('en');
    window.gameInstance.startRun();
    window.gameInstance.startWave(1);
  })()`);
  await wait(400);

  const l1En = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    const waveSub = document.getElementById("hud-wave-sub")?.textContent;
    const scoreText = document.getElementById("hud-score-text")?.textContent;
    const scoreSub = document.getElementById("hud-score-sub")?.textContent;
    const shieldPipsCount = document.querySelectorAll("#base-shield-pips .large-shield-pip").length;
    return {
      wave: lvl.currentWave,
      totalWaves: lvl.totalWaves,
      pairsCount: lvl.pairs.length,
      robotsCount: lvl.robots.length,
      robotsTotal: lvl.robotsTotal,
      waveText,
      waveSub,
      scoreText,
      scoreSub,
      shieldPipsCount,
      speeds: lvl.pairs.map(p => p.speed)
    };
  })()`);

  assert("Level 1 has currentWave = 1", l1En.wave === 1);
  assert("Level 1 has totalWaves = 3", l1En.totalWaves === 3);
  assert("Level 1 spawns exactly 2 pairs (easy entry)", l1En.pairsCount === 2);
  assert("Level 1 total robots is 4", l1En.robotsCount === 4 && l1En.robotsTotal === 4);
  assert("HUD Wave Text is 'LEVEL 1 / 3'", l1En.waveText === "LEVEL 1 / 3");
  assert("HUD Score Text is 'RESTORED: 0 / 4'", l1En.scoreText === "RESTORED: 0 / 4");
  assert("HUD Shield Pips rendered correctly (6 shields for normal)", l1En.shieldPipsCount === 6);

  // Switch to JA and check zero-kanji in HUD
  await evalInPage(`(() => {
    window.gameInstance.setLanguage('ja');
    window.gameInstance.robotLinkLevel.updateHUD();
  })()`);
  const l1Ja = await evalInPage(`(() => {
    const waveSub = document.getElementById("hud-wave-sub")?.textContent;
    const scoreSub = document.getElementById("hud-score-sub")?.textContent;
    return { waveSub, scoreSub };
  })()`);

  assert("Level 1 JA HUD Wave Sub is 'レベル 1 / 3'", l1Ja.waveSub === "レベル 1 / 3");
  assert("Level 1 JA HUD Wave Sub has 0-Kanji", !kanjiRegex.test(l1Ja.waveSub));
  assert("Level 1 JA HUD Score Sub is 'なおした: 0 / 4'", l1Ja.scoreSub === "なおした: 0 / 4");
  assert("Level 1 JA HUD Score Sub has 0-Kanji", !kanjiRegex.test(l1Ja.scoreSub));

  await captureScreenshot("robot_link_level1_active.png");

  // TEST 2: Mid-Level Progress & HUD Update when 1 Robot Restored
  console.log("\n--- TEST 2: Mid-Level Progress & HUD Update ---");
  await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const p1 = lvl.pairs[0];
    p1.unlinked = true;
    p1.botA.linked = false;
    p1.botB.linked = false;
    if (p1.cableEl) p1.cableEl.style.display = "none";
    lvl.restoreBot(p1.botA, p1);
  })()`);
  await wait(200);

  const midLvl = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const scoreText = document.getElementById("hud-score-text")?.textContent;
    const scoreSub = document.getElementById("hud-score-sub")?.textContent;
    return {
      restoredCount: lvl.robotsRestored,
      scoreText,
      scoreSub
    };
  })()`);

  assert("Robots restored incremented to 1", midLvl.restoredCount === 1);
  assert("HUD score text updated to 'RESTORED: 1 / 4'", midLvl.scoreText === "RESTORED: 1 / 4");
  assert("HUD score sub updated to 'なおした: 1 / 4'", midLvl.scoreSub === "なおした: 1 / 4");

  // TEST 3: Wave Completion Intermission Fanfare & Stars
  console.log("\n--- TEST 3: Wave 1 Completion Intermission Fanfare & Stars ---");
  await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    for (const p of lvl.pairs) {
      p.unlinked = true;
      p.botA.linked = false;
      p.botB.linked = false;
      if (!p.botA.restored) lvl.restoreBot(p.botA, p);
      if (!p.botB.restored) lvl.restoreBot(p.botB, p);
      p.botA.resolved = true;
      p.botB.resolved = true;
      p.resolved = true;
    }
    lvl.checkWaveProgress();
  })()`);
  await wait(400);

  const wave1Complete = await evalInPage(`(() => {
    const overlay = document.getElementById("floating-wave-stars-overlay");
    const starTitleEn = document.getElementById("floating-stars-title-en")?.textContent;
    const starTitleSub = document.getElementById("floating-stars-title-sub")?.textContent;

    return {
      gameState: window.gameInstance.state,
      overlayVisible: overlay ? window.getComputedStyle(overlay).display !== "none" : false,
      starTitleEn,
      starTitleSub
    };
  })()`);

  assert("Game transitioned to INTERMISSION state on wave completion", wave1Complete.gameState === "intermission");
  assert("Intermission star overlay is visible", wave1Complete.overlayVisible);
  assert("Intermission star title is 'Level 1 Cleared!'", wave1Complete.starTitleEn === "Level 1 Cleared!");
  assert("Intermission star JA subtitle is 'レベル 1 クリア！'", wave1Complete.starTitleSub === "レベル 1 クリア！");
  assert("Intermission star JA subtitle has 0-Kanji", !kanjiRegex.test(wave1Complete.starTitleSub));

  await captureScreenshot("robot_link_level1_cleared_intermission.png");

  // TEST 4: Level 2 Progression & Difficulty Scaling
  console.log("\n--- TEST 4: Level 2 Progression & Scaling ---");
  await evalInPage(`(() => {
    window.gameInstance.setLanguage('en');
    window.gameInstance.startWave(2);
  })()`);
  await wait(400);

  const l2 = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    const scoreText = document.getElementById("hud-score-text")?.textContent;
    return {
      wave: lvl.currentWave,
      pairsCount: lvl.pairs.length,
      robotsCount: lvl.robots.length,
      robotsTotal: lvl.robotsTotal,
      waveText,
      scoreText,
      speeds: lvl.pairs.map(p => p.speed),
      types: lvl.robots.map(r => r.type)
    };
  })()`);

  assert("Level 2 has currentWave = 2", l2.wave === 2);
  assert("Level 2 spawns 4 pairs (8 robots total) on Normal", l2.pairsCount === 4 && l2.robotsCount === 8);
  assert("HUD Wave Text is 'LEVEL 2 / 3'", l2.waveText === "LEVEL 2 / 3");
  assert("HUD Score Text is 'RESTORED: 0 / 8'", l2.scoreText === "RESTORED: 0 / 8");

  const l1AvgSpeed = l1En.speeds.reduce((a, b) => a + b, 0) / l1En.speeds.length;
  const l2AvgSpeed = l2.speeds.reduce((a, b) => a + b, 0) / l2.speeds.length;
  assert(`Level 2 average speed (${l2AvgSpeed.toFixed(4)}) is faster than Level 1 (${l1AvgSpeed.toFixed(4)})`, l2AvgSpeed > l1AvgSpeed);
  assert("Level 2 introduces speeders or heavies", l2.types.includes("speeder") || l2.types.includes("heavy"));

  await captureScreenshot("robot_link_level2_active.png");

  // TEST 5: Level 3 Progression & Climax Scaling
  console.log("\n--- TEST 5: Level 3 Progression & Climax Scaling ---");
  await evalInPage(`(() => {
    window.gameInstance.startWave(3);
  })()`);
  await wait(400);

  const l3 = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    const scoreText = document.getElementById("hud-score-text")?.textContent;
    return {
      wave: lvl.currentWave,
      pairsCount: lvl.pairs.length,
      robotsCount: lvl.robots.length,
      robotsTotal: lvl.robotsTotal,
      waveText,
      scoreText,
      speeds: lvl.pairs.map(p => p.speed),
      types: lvl.robots.map(r => r.type)
    };
  })()`);

  assert("Level 3 has currentWave = 3", l3.wave === 3);
  assert("Level 3 spawns 5 pairs (10 robots total) on Normal", l3.pairsCount === 5 && l3.robotsCount === 10);
  assert("HUD Wave Text is 'LEVEL 3 / 3'", l3.waveText === "LEVEL 3 / 3");
  assert("HUD Score Text is 'RESTORED: 0 / 10'", l3.scoreText === "RESTORED: 0 / 10");

  const l3AvgSpeed = l3.speeds.reduce((a, b) => a + b, 0) / l3.speeds.length;
  assert(`Level 3 average speed (${l3AvgSpeed.toFixed(4)}) is faster than Level 2 (${l2AvgSpeed.toFixed(4)})`, l3AvgSpeed > l2AvgSpeed);
  assert("Level 3 contains tanks, speeders, or heavies", l3.types.includes("tank") || l3.types.includes("speeder"));

  await captureScreenshot("robot_link_level3_active.png");

  // TEST 6: All Levels Cleared Completion Fanfare & Victory
  console.log("\n--- TEST 6: All Levels Cleared Completion Fanfare & Victory ---");
  await evalInPage(`(() => {
    window.gameInstance.setLanguage('ja');
    // Restore and resolve all robots in level 3
    const lvl = window.gameInstance.robotLinkLevel;
    for (const p of lvl.pairs) {
      p.unlinked = true;
      p.botA.linked = false;
      p.botB.linked = false;
      if (!p.botA.restored) lvl.restoreBot(p.botA, p);
      if (!p.botB.restored) lvl.restoreBot(p.botB, p);
      p.botA.resolved = true;
      p.botB.resolved = true;
      p.resolved = true;
    }
    lvl.checkWaveProgress();
  })()`);
  await wait(400);

  const finalVictory = await evalInPage(`(() => {
    const starTitleEn = document.getElementById("floating-stars-title-en")?.textContent;
    const starTitleSub = document.getElementById("floating-stars-title-sub")?.textContent;
    return {
      starTitleEn,
      starTitleSub
    };
  })()`);

  assert("Final complete title is 'All Levels Cleared!'", finalVictory.starTitleEn === "All Levels Cleared!");
  assert("Final complete JA subtitle is 'ぜんレベル クリア！'", finalVictory.starTitleSub === "ぜんレベル クリア！");
  assert("Final complete JA subtitle has 0-Kanji", !kanjiRegex.test(finalVictory.starTitleSub));

  await captureScreenshot("robot_link_all_levels_cleared.png");

  // Advance from star modal to victory screen
  await evalInPage(`(() => {
    window.gameInstance.endGame(true);
  })()`);
  await wait(500);

  const resScreen = await evalInPage(`(() => {
    return {
      gameState: window.gameInstance.state,
      wavesText: document.getElementById("res-stat-waves")?.textContent,
      botsText: document.getElementById("res-stat-bots")?.textContent
    };
  })()`);

  assert("Victory screen waves stat displays '3 / 3'", resScreen.wavesText === "3 / 3");
  assert("Game state is 'victory'", resScreen.gameState === "victory");

  // TEST 7: Ultra Mode Endless Levels & Scaling
  console.log("\n--- TEST 7: Ultra Endless Mode Level Scaling ---");
  await evalInPage(`(() => {
    window.gameInstance.setMode('robot_link');
    window.gameInstance.selectedDifficulty = 'ultra';
    window.gameInstance.shields = window.DIFFICULTY_SETTINGS['ultra'].startingShields;
    window.gameInstance.maxShields = window.DIFFICULTY_SETTINGS['ultra'].startingShields;
    window.gameInstance.totalWaves = Infinity;
    window.gameInstance.setLanguage('ja');
    window.gameInstance.startRun();
    window.gameInstance.startWave(1);
  })()`);
  await wait(400);

  const ultra1 = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    const waveSub = document.getElementById("hud-wave-sub")?.textContent;
    return {
      wave: lvl.currentWave,
      isTotalWavesInfinity: (lvl.totalWaves === Infinity),
      pairsCount: lvl.pairs.length,
      waveText,
      waveSub,
      speed: lvl.pairs[0]?.speed
    };
  })()`);

  assert("Ultra mode totalWaves is Infinity", ultra1.isTotalWavesInfinity === true);
  assert("Ultra HUD Wave Text shows infinity symbol 'LEVEL 1 / ∞'", ultra1.waveText === "LEVEL 1 / ∞");
  assert("Ultra HUD JA Wave Sub shows 0-kanji 'レベル 1 / むげん'", ultra1.waveSub === "レベル 1 / むげん");
  assert("Ultra HUD JA Wave Sub has 0-Kanji", !kanjiRegex.test(ultra1.waveSub));

  // Check Ultra Wave 4 speed & pair count escalation
  await evalInPage(`(() => {
    window.gameInstance.startWave(4);
  })()`);
  await wait(400);

  const ultra4 = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    return {
      wave: lvl.currentWave,
      pairsCount: lvl.pairs.length,
      waveText,
      speed: lvl.pairs[0]?.speed
    };
  })()`);

  assert("Ultra Level 4 wave is 4", ultra4.wave === 4);
  assert("Ultra Level 4 has 5 pairs (scaled up from 3 in level 1)", ultra4.pairsCount === 5);
  assert(`Ultra Level 4 speed (${ultra4.speed.toFixed(4)}) escalated vs Level 1 (${ultra1.speed.toFixed(4)})`, ultra4.speed > ultra1.speed);
  assert("Ultra Level 4 HUD shows 'LEVEL 4 / ∞'", ultra4.waveText === "LEVEL 4 / ∞");

  await captureScreenshot("robot_link_ultra_level4.png");

  // TEST 8: render_game_to_text includes level
  console.log("\n--- TEST 8: render_game_to_text includes level ---");
  const renderJson = JSON.parse(await evalInPage("window.render_game_to_text()"));
  assert("render_game_to_text has level field equal to currentWave", renderJson.level === 4);
  assert("render_game_to_text totalWaves is null/Infinity in ultra", renderJson.totalWaves === null || renderJson.totalWaves === Infinity);

  console.log("\n=======================================================");
  console.log("ALL ROBOT LINK PROGRESSIVE LEVEL TESTS PASSED!");
  console.log("=======================================================\n");

  ws.close();
  chromeProc.kill();
  process.exit(process.exitCode || 0);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  if (chromeProc) chromeProc.kill();
  process.exit(1);
});
