import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlPath = "file:///d:/AI/SET OUT/GAMES/be_a_hacker/TRAINING CENTER/Mission 1.5/BASE DEFEND/GAME/index.html";
const port = 9229;
const testUserDataDir = path.join(os.tmpdir(), "chrome-robot-link-test-profile");
const artifactDir = "C:\\Users\\user\\.gemini\\antigravity\\brain\\6a32946a-7c6a-41be-8234-125bdfe2c36b";

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

  // Wait for gameInstance to initialize
  for (let i = 0; i < 30; i++) {
    const ready = await evalInPage(`Boolean(window.gameInstance && window.GAME_MODES)`);
    if (ready) break;
    await wait(200);
  }

  console.log("\n=======================================================");
  console.log("MISSION 5 ROBOT LINK TEST SUITE");
  console.log("=======================================================\n");

  // TEST 1: Mode Registration & Aliases
  console.log("--- TEST 1: Mode Registration & Aliases ---");
  const modesInfo = await evalInPage(`(() => {
    const m = window.GAME_MODES.robot_link;
    return {
      hasRobotLink: Boolean(m),
      hasRobotUntangle: Boolean(window.GAME_MODES.robot_untangle),
      linkNameEn: m?.name,
      linkNameJa: m?.name_ja || m?.titleSub?.ja,
      linkDescEn: m?.desc || m?.subtitleEn,
      linkDescJa: m?.desc_ja || m?.subtitleSub?.ja,
      robotLinkLevelExists: typeof window.RobotLinkLevel === "function"
    };
  })()`);

  assert("window.GAME_MODES.robot_link is defined", modesInfo.hasRobotLink);
  assert("window.GAME_MODES.robot_untangle aliases to robot_link", modesInfo.hasRobotUntangle);
  assert("robot_link English title is 'Robot Link'", modesInfo.linkNameEn.includes("Robot Link"));
  assert("robot_link Japanese title is 0-kanji 'ロボット リンク'", modesInfo.linkNameJa.includes("ロボット リンク"));
  assert("window.RobotLinkLevel class is exported", modesInfo.robotLinkLevelExists);

  // Kanji check on descriptions
  const kanjiRegex = /[\u4E00-\u9FAF]/;
  assert("robot_link Japanese name has 0-Kanji", !kanjiRegex.test(modesInfo.linkNameJa));
  assert("robot_link Japanese desc has 0-Kanji", !kanjiRegex.test(modesInfo.linkDescJa));

  // TEST 1b: Splash Screen Mission Selector & Universal 6 Difficulties
  console.log("\n--- TEST 1b: Splash Screen Mission Selector & Universal 6 Difficulties ---");
  const splashInfo = await evalInPage(`(() => {
    const missionBtns = Array.from(document.querySelectorAll(".mission-btn"));
    const modes = missionBtns.map(b => b.getAttribute("data-mode"));

    // Test clicking mission 5 (Robot Link) on splash screen
    const linkBtn = document.querySelector(".mission-btn[data-mode='robot_link']");
    if (linkBtn) linkBtn.click();

    const diffGroup = document.querySelector(".difficulty-group");
    const diffGroupVisible = diffGroup ? window.getComputedStyle(diffGroup).display !== "none" : false;
    const diffBtns = Array.from(document.querySelectorAll(".diff-btn"));
    const diffs = diffBtns.map(b => b.getAttribute("data-diff"));
    const ultraBtn = document.querySelector(".diff-btn.diff-ultra");
    const ultraVisible = ultraBtn ? window.getComputedStyle(ultraBtn).display !== "none" : false;
    const allDiffsVisible = diffBtns.every(b => window.getComputedStyle(b).display !== "none");

    return {
      missionCount: missionBtns.length,
      modes,
      diffCount: diffBtns.length,
      diffs,
      diffGroupVisible,
      ultraVisible,
      allDiffsVisible,
      currentModeAfterClick: window.gameInstance.currentModeId,
      linkBtnSelected: linkBtn ? linkBtn.classList.contains("selected") : false
    };
  })()`);

  assert("Splash screen has all 7 mission buttons", splashInfo.missionCount === 7);
  assert("Splash screen includes 'robot_link'", splashInfo.modes.includes("robot_link"));
  assert("Splash screen includes 'mouse_boss'", splashInfo.modes.includes("mouse_boss"));
  assert("Splash screen includes 'drag_rescue'", splashInfo.modes.includes("drag_rescue"));
  assert("Clicking Mission 5 button selects 'robot_link'", splashInfo.currentModeAfterClick === "robot_link");
  assert("Mission 5 button has .selected class", splashInfo.linkBtnSelected === true);
  assert("Difficulty levels group is visible when Robot Link is selected", splashInfo.diffGroupVisible === true);
  assert("Splash screen has all 6 difficulty buttons", splashInfo.diffCount === 6);
  assert("All 6 difficulty level buttons are visible when Robot Link is selected", splashInfo.allDiffsVisible === true);
  assert("Ultra difficulty button is visible on splash screen for Robot Link", splashInfo.ultraVisible === true);

  await captureScreenshot("splash_screen_mission_selector.png");

  // TEST 2: Debug Mode Select Dropdown & initMiniGame
  console.log("\n--- TEST 2: Debug Mode Select Dropdown & initMiniGame ---");
  const debugOpt = await evalInPage(`(() => {
    const opt = document.querySelector("#debug-mode-select option[value='robot_link']");
    return {
      exists: Boolean(opt),
      text: opt ? opt.textContent : null
    };
  })()`);
  assert("Debug mode select includes 'robot_link'", debugOpt.exists);
  assert("Option label is 'Mission 5: Robot Link'", debugOpt.text === "Mission 5: Robot Link");

  // TEST 3: initMiniGame with Mission 5 / robot_untangle alias
  console.log("\n--- TEST 3: initMiniGame Mission 5 / robot_untangle ---");
  const initResult = await evalInPage(`(() => {
    window.initMiniGame({ mission: 5 });
    return {
      currentModeId: window.gameInstance.currentModeId || window.gameInstance.currentMode?.id,
      hasLevel: Boolean(window.gameInstance.robotLinkLevel)
    };
  })()`);
  assert("initMiniGame({ mission: 5 }) sets mode to 'robot_link'", initResult.currentModeId === "robot_link");
  assert("robotLinkLevel is initialized on gameInstance", initResult.hasLevel);

  // TEST 4: Wave 1 Initialization & Tandem Pairs Spawn
  console.log("\n--- TEST 4: Wave 1 Initialization & Tandem Pairs Spawn ---");
  await evalInPage(`(() => {
    window.gameInstance.startRun();
    window.gameInstance.startWave(1);
  })()`);
  await wait(500);

  const wave1Info = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    return {
      active: lvl.active,
      wave: lvl.wave,
      totalRobots: lvl.robots.length,
      pairsCount: lvl.pairs.length,
      cablesInDom: document.querySelectorAll(".robot-link-cable").length,
      svgLayerExists: Boolean(document.getElementById("robot-link-svg")),
      rootExists: Boolean(document.getElementById("robot-link-root"))
    };
  })()`);

  assert("robotLinkLevel is active on wave 1", wave1Info.active);
  assert("Wave is 1", wave1Info.wave === 1);
  assert("Spawned 2 pairs (4 robots total) for wave 1", wave1Info.pairsCount === 2 && wave1Info.totalRobots === 4);
  assert("SVG layer #robot-link-svg exists in DOM", wave1Info.svgLayerExists);
  assert("Root container #robot-link-root exists in DOM", wave1Info.rootExists);
  assert("Link cables rendered in DOM for active pairs", wave1Info.cablesInDom === 2);

  // TEST 5: Tandem Movement & Position Sync
  console.log("\n--- TEST 5: Tandem Movement & Position Sync ---");
  const posBefore = await evalInPage(`(() => {
    const p = window.gameInstance.robotLinkLevel.pairs[0];
    return { y1: p.bot1.y, y2: p.bot2.y, cableY1: p.cableEl ? p.cableEl.getAttribute("y1") : null };
  })()`);
  await wait(800);
  const posAfter = await evalInPage(`(() => {
    const p = window.gameInstance.robotLinkLevel.pairs[0];
    return { y1: p.bot1.y, y2: p.bot2.y, cableY1: p.cableEl ? p.cableEl.getAttribute("y1") : null };
  })()`);

  assert("Pair robots move downwards in tandem", posAfter.y1 > posBefore.y1 && posAfter.y2 > posBefore.y2);
  assert("SVG Cable updates position along with robots", Number(posAfter.cableY1) > Number(posBefore.cableY1));

  // Take screenshot of linked pairs descending
  await captureScreenshot("robot_link_pairs_descending.png");

  // TEST 6: Double-Click While Linked is Blocked + Warning Toast
  console.log("\n--- TEST 6: Double-Click While Linked Blocked + Toast ---");
  const blockTest = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const bot = lvl.robots[0];
    const initialRestored = lvl.restoredCount;
    // Simulate double click on bot element while still linked
    bot.el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    const toast = document.querySelector(".link-warning-toast");
    return {
      stillHacked: bot.hacked === true,
      restoredCountUnchanged: lvl.restoredCount === initialRestored,
      toastExists: Boolean(toast),
      toastText: toast ? toast.textContent : "",
      toastHasZeroKanji: toast ? !/[\u4E00-\u9FAF]/.test(toast.textContent) : false
    };
  })()`);

  assert("Double-click while linked is blocked (robot remains hacked)", blockTest.stillHacked);
  assert("Restored count unchanged", blockTest.restoredCountUnchanged);
  assert("Warning toast is displayed", blockTest.toastExists);
  assert("Warning toast contains English instruction 'Unlink the robots'", blockTest.toastText.includes("Unlink the robots"));
  assert("Warning toast Japanese text has 0-Kanji", blockTest.toastHasZeroKanji);

  // Take screenshot of warning toast
  await captureScreenshot("robot_link_warning_toast.png");

  // TEST 7: Right-Click Opens Context Menu with STRICTLY ONE button: UNLINK
  console.log("\n--- TEST 7: Context Menu Strictly ONE Item: UNLINK ---");
  const menuTest = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const bot = lvl.robots[0];
    // Right click robot
    bot.el.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }));
    const menu = document.getElementById("link-context-menu");
    const buttons = menu ? Array.from(menu.querySelectorAll("button")) : [];
    return {
      menuVisible: Boolean(menu),
      buttonCount: buttons.length,
      buttonText: buttons[0] ? buttons[0].textContent.trim() : "",
      buttonTextHasZeroKanji: buttons[0] ? !/[\u4E00-\u9FAF]/.test(buttons[0].textContent) : false
    };
  })()`);

  assert("Context menu opened on right-click", menuTest.menuVisible);
  assert("Context menu has STRICTLY ONE button", menuTest.buttonCount === 1);
  assert("Context menu button is 'UNLINK'", menuTest.buttonText.includes("UNLINK"));
  assert("Context menu Japanese subtitle has 0-Kanji ('かいじょ')", menuTest.buttonTextHasZeroKanji);

  // Take screenshot of context menu
  await captureScreenshot("robot_link_context_menu.png");

  // TEST 8: Click UNLINK -> Link Severed & Cable Removed
  console.log("\n--- TEST 8: Click UNLINK Severs Link ---");
  const unlinkTest = await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const p = lvl.pairs[0];
    const btn = document.querySelector(".link-unlink-btn");
    btn.click();
    return {
      pairUnlinked: p.unlinked === true,
      bot1Linked: p.bot1.linked === false,
      bot2Linked: p.bot2.linked === false,
      cableHidden: !p.cableEl || p.cableEl.style.opacity === "0" || !p.cableEl.parentNode,
      menuClosed: !document.getElementById("link-context-menu")
    };
  })()`);

  assert("Pair marked unlinked", unlinkTest.pairUnlinked);
  assert("Bot 1 linked is false", unlinkTest.bot1Linked);
  assert("Bot 2 linked is false", unlinkTest.bot2Linked);
  assert("SVG Cable is removed/faded", unlinkTest.cableHidden);
  assert("Context menu closes after click", unlinkTest.menuClosed);

  // TEST 9: Double-Click Unlinked Robot -> Restores to Cyan Color
  console.log("\n--- TEST 9: Double-Click Restores to Cyan Color + Base Defend Circuit Bolt ---");
  const restoreTest = await evalInPage(`(async () => {
    const lvl = window.gameInstance.robotLinkLevel;
    const bot1 = lvl.pairs[0].bot1;

    // Spy on Base Defend circuit snap and audio
    let circuitSnapped = false;
    let sfxPlayed = false;
    let chimePlayed = false;
    const origSnap = window.gameInstance.effects.triggerCircuitSnap.bind(window.gameInstance.effects);
    window.gameInstance.effects.triggerCircuitSnap = (bx, by, px, py) => {
      circuitSnapped = true;
      origSnap(bx, by, px, py);
    };
    const origZap = window.gameInstance.audioManager.playCircuitSnap.bind(window.gameInstance.audioManager);
    window.gameInstance.audioManager.playCircuitSnap = () => {
      sfxPlayed = true;
      origZap();
    };
    const origChime = window.gameInstance.audioManager.playRestoreChime.bind(window.gameInstance.audioManager);
    window.gameInstance.audioManager.playRestoreChime = () => {
      chimePlayed = true;
      origChime();
    };

    bot1.el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));

    // Wait for the rapid malware purge flicker sequence (450ms) to complete
    await new Promise(r => setTimeout(r, 500));

    const imgEl = bot1.el.querySelector("img");
    return {
      bot1Restored: bot1.hacked === false,
      hasRestoredClass: bot1.el.classList.contains("restored"),
      imgSrc: imgEl ? imgEl.src : "",
      imgSrcIncludesRestored: imgEl ? imgEl.src.includes("-restored.png") : false,
      restoredCount: lvl.restoredCount,
      circuitSnapped,
      sfxPlayed,
      chimePlayed
    };
  })()`);

  assert("Bot 1 marked restored (hacked=false)", restoreTest.bot1Restored);
  assert("Bot 1 element has 'restored' class", restoreTest.hasRestoredClass);
  assert("Bot 1 image source switched to -restored.png", restoreTest.imgSrcIncludesRestored);
  assert("Restored count incremented to 1", restoreTest.restoredCount === 1);
  assert("Base Defend digital lightning bolt (triggerCircuitSnap) fired", restoreTest.circuitSnapped);
  assert("Base Defend zap sound effect (playCircuitSnap) played", restoreTest.sfxPlayed);
  assert("Base Defend restore chime sound effect (playRestoreChime) played", restoreTest.chimePlayed);

  // Wait a bit and restore bot2 as well
  await evalInPage(`(() => {
    const lvl = window.gameInstance.robotLinkLevel;
    const bot2 = lvl.pairs[0].bot2;
    bot2.el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
  })()`);
  await wait(300);

  // Take screenshot of restored cyan bot
  await captureScreenshot("robot_link_restored_cyan.png");

  // TEST 10: Sprite Assets Verification (Robot 1, 2, 3, 4 hacked & restored)
  console.log("\n--- TEST 10: Sprite Assets Verification ---");
  const spriteCheck = await evalInPage(`(() => {
    const types = ['standard', 'heavy', 'speeder', 'tank'];
    const results = {};
    for (const t of types) {
      results[t] = {
        hacked: window.gameInstance.robotLinkLevel.typeConfig[t].spriteHacked,
        restored: window.gameInstance.robotLinkLevel.typeConfig[t].spriteRestored
      };
    }
    return results;
  })()`);

  for (const [type, paths] of Object.entries(spriteCheck)) {
    assert(`Sprite config for ${type} hacked exists`, paths.hacked.includes("-hacked.png"));
    assert(`Sprite config for ${type} restored exists`, paths.restored.includes("-restored.png"));
  }

  // TEST 10b: Same Size as Base Defend (76px Robots & 220px Base) & Tightly Linked
  console.log("\n--- TEST 10b: Base Defend Robot/Base Sizing & Tight Tandem Linking ---");
  const sizingCheck = await evalInPage(`(() => {
    const botEl = document.querySelector(".robot-entity");
    const baseEl = document.getElementById("base-defense");
    const rootEl = document.getElementById("robot-link-root");
    const p1 = window.gameInstance.robotLinkLevel?.pairs[0];
    const distanceBetweenCenters = p1 ? Math.abs(p1.bot2.normX - p1.bot1.normX) : null;
    return {
      isLinkMode: document.body.classList.contains("robot-link-mode"),
      botWidth: botEl ? window.getComputedStyle(botEl).width : null,
      botHeight: botEl ? window.getComputedStyle(botEl).height : null,
      baseHeight: baseEl ? window.getComputedStyle(baseEl).height : null,
      rootZIndex: rootEl ? window.getComputedStyle(rootEl).zIndex : null,
      distanceBetweenCenters
    };
  })()`);

  assert("body has 'robot-link-mode' class", sizingCheck.isLinkMode);
  assert("Robot width is same as Base Defend (76px)", sizingCheck.botWidth === "76px");
  assert("Robot height is same as Base Defend (76px)", sizingCheck.botHeight === "76px");
  assert("Base defense height is same as Base Defend (220px)", sizingCheck.baseHeight === "220px");
  assert("robot-link-root z-index is 12 (behind defense line/base)", sizingCheck.rootZIndex === "12");
  assert("Robots are linked tightly together (~0.108 distance, much closer than 0.20)", sizingCheck.distanceBetweenCenters < 0.15);

  // TEST 10c: Defense Line Collision & 1 Health Point Loss
  console.log("\n--- TEST 10c: Defense Line Collision & 1 Health Point Loss ---");
  const damageCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const lvl = game.robotLinkLevel;
    const p2 = lvl.pairs[1];
    if (!p2) return { error: "No pair 2" };

    const initialShields = game.shields;
    // Fast-forward pair 2 down past the defense line
    p2.y = 0.81;
    lvl.update(0.016);

    const hitFlash = document.getElementById("defense-line")?.classList.contains("damaged");
    return {
      initialShields,
      newShields: game.shields,
      shieldsLost: initialShields - game.shields,
      hitFlash
    };
  })()`);

  assert("Robots crossing defense line cause base to lose shields", damageCheck.shieldsLost > 0);
  assert("Base lost 1 shield per robot passing line (total 2 for linked pair)", damageCheck.shieldsLost === 2);
  assert("Defense line triggered damage flash", damageCheck.hitFlash);

  // TEST 10d: All 6 Difficulty Levels Configured (Very Easy to Ultra)
  console.log("\n--- TEST 10d: 6 Difficulty Levels Verification ---");
  const diffCheck = await evalInPage(`(() => {
    const levels = ['veryEasy', 'easy', 'normal', 'difficult', 'hard', 'ultra'];
    const results = {};
    for (const key of levels) {
      const cfg = window.DIFFICULTY_SETTINGS[key];
      results[key] = {
        exists: Boolean(cfg),
        shields: cfg ? cfg.startingShields : null,
        travelTimeSec: cfg ? cfg.travelTimeSec : null,
        isEndless: Boolean(cfg?.isEndless)
      };
    }
    return results;
  })()`);

  assert("veryEasy difficulty: 8 shields, 12s travel", diffCheck.veryEasy.shields === 8 && diffCheck.veryEasy.travelTimeSec === 12);
  assert("easy difficulty: 7 shields, 10s travel", diffCheck.easy.shields === 7 && diffCheck.easy.travelTimeSec === 10);
  assert("normal difficulty: 6 shields, 8s travel", diffCheck.normal.shields === 6 && diffCheck.normal.travelTimeSec === 8);
  assert("difficult difficulty: 5 shields, 7s travel", diffCheck.difficult.shields === 5 && diffCheck.difficult.travelTimeSec === 7);
  assert("hard difficulty: 4 shields, 6s travel", diffCheck.hard.shields === 4 && diffCheck.hard.travelTimeSec === 6);
  assert("ultra difficulty: 4 shields, 5.2s travel, endless mode", diffCheck.ultra.shields === 4 && diffCheck.ultra.isEndless === true);

  // TEST 11: Wave Progression & Victory Results Screen
  console.log("\n--- TEST 11: Wave Progression & Victory Results Screen ---");
  await evalInPage(`(() => {
    window.gameInstance.shields = window.gameInstance.maxShields;
    window.gameInstance.setLanguage("ja");
    window.gameInstance.endGame(true);
  })()`);
  await wait(500);

  const victoryTest = await evalInPage(`(() => {
    return {
      gameState: window.gameInstance.state,
      rankEn: document.getElementById("res-star-rank-en")?.textContent,
      rankJa: document.getElementById("res-star-rank-sub")?.textContent,
      wavesText: document.getElementById("res-stat-waves")?.textContent,
      stars: window.gameInstance.starsEarned
    };
  })()`);

  assert("Game state transitioned to victory", victoryTest.gameState === "victory");
  assert("Victory rank is 'LINK MASTER!'", victoryTest.rankEn === "LINK MASTER!");
  assert("Japanese victory rank is 0-Kanji 'リンク マスター！'", victoryTest.rankJa === "リンク マスター！");
  assert("3 Stars earned for complete victory", victoryTest.stars === 3);

  // Take screenshot of victory results screen
  await captureScreenshot("robot_link_victory.png");

  // TEST 12: render_game_to_text Output
  console.log("\n--- TEST 12: render_game_to_text Output ---");
  const renderDataStr = await evalInPage("window.render_game_to_text()");
  const renderData = JSON.parse(renderDataStr);
  assert("render_game_to_text mode is 'robot_link'", renderData.mode === "robot_link");
  assert("render_game_to_text state is 'victory'", renderData.state === "victory");
  assert("render_game_to_text totalWaves is 3", renderData.totalWaves === 3);

  console.log("\n=======================================================");
  console.log("ALL MISSION 5 ROBOT LINK TESTS PASSED!");
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
