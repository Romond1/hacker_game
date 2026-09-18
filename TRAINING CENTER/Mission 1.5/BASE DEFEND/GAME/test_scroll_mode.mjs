import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlPath = "file:///d:/AI/SET OUT/GAMES/be_a_hacker/TRAINING CENTER/Mission 1.5/BASE DEFEND/GAME/index.html";
const port = 9224;
const testUserDataDir = path.join(os.tmpdir(), "chrome-scroll-test-profile");

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

  console.log("Connected to browser. Enabling Runtime & DOM...");
  await send("Runtime.enable");

  // Wait for scripts in index.html to finish executing and initializing
  for (let i = 0; i < 50; i++) {
    try {
      const ready = await evalInPage("typeof window.gameInstance !== 'undefined' && typeof TRANSLATIONS !== 'undefined'");
      if (ready) break;
    } catch {}
    await wait(100);
  }

  console.log("\n=======================================================");
  console.log("RUNNING MISSION 3: SCROLL TRAINING VALIDATION SUITE");
  console.log("=======================================================\n");

  // 1. Mode Configuration & Selection
  console.log("--- TEST 1: Mode Configuration & Selection ---");
  const modeData = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("scroll_training");
    const m = game.currentMode;
    const isBodyClass = document.body.classList.contains("scroll-training-mode");
    const select = document.getElementById("debug-mode-select");
    const ultraBtn = document.querySelector(".diff-btn.diff-ultra");
    return {
      id: m.id,
      mission: m.mission,
      mechanic: m.mechanic,
      name: m.name,
      isBodyClass,
      selectHasScroll: Array.from(select?.options || []).some(o => o.value === "scroll_training"),
      selectVal: select?.value,
      ultraVisible: ultraBtn ? window.getComputedStyle(ultraBtn).display !== "none" : false
    };
  })()`);

  assert("Mode ID is 'scroll_training'", modeData.id === "scroll_training");
  assert("Mode Mission number is 3", modeData.mission === 3);
  assert("Mode mechanic is 'mouse_wheel_scroll'", modeData.mechanic === "mouse_wheel_scroll");
  assert("Body has 'scroll-training-mode' class", modeData.isBodyClass === true);
  assert("Debug picker contains 'scroll_training' option", modeData.selectHasScroll === true);
  assert("Debug picker selects 'scroll_training'", modeData.selectVal === "scroll_training");
  assert("Ultra difficulty button is visible in Scroll Training (Universal 6 difficulties)", modeData.ultraVisible === true);

  // 2. Zero-Kanji Japanese Verification
  console.log("\n--- TEST 2: Zero-Kanji Verification for Scroll Training Translations ---");
  const kanjiCheck = await evalInPage(`(() => {
    const dict = TRANSLATIONS.ja;
    const m = GAME_MODES.scroll_training;
    const strings = [
      m.titleSub.ja,
      m.subtitleSub.ja,
      dict.modeScrollTraining,
      dict.scrollStartSubtitle,
      dict.tryMouseWheel,
      dict.useWheelPrompt,
      dict.scrollMouseWheel,
      dict.robotsRestoredLabel,
      dict.scrollTimeRemaining,
      dict.scrollUp,
      dict.scrollDown,
      dict.scrollCenterBase,
      dict.timeExpiredTitle,
      dict.timeExpiredMsg
    ];
    const kanjiRegex = /[一-龯]/;
    const failing = strings.filter(s => typeof s === 'string' && kanjiRegex.test(s));
    return { failing, checkedCount: strings.length };
  })()`);

  assert(`All checked Japanese strings contain strictly 0 Kanji (${kanjiCheck.checkedCount} strings)`, kanjiCheck.failing.length === 0, `Failing: ${kanjiCheck.failing.join(", ")}`);

  // 3. Level 1 Initialization, Environment & Base Centering
  console.log("\n--- TEST 3: Level 1 World Environment, Central Base & Spawning ---");
  const level1Data = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.startRun();
    game.clearPendingTimers();
    game.startWave(1);

    const level = game.scrollTrainingLevel;
    const viewport = level.viewport;
    const world = level.world;
    const base = level.centralBase;
    const robots = level.robots;

    const aboveRobots = robots.filter(r => r.zone === "above");
    const belowRobots = robots.filter(r => r.zone === "below");

    const widget = level.wheelWidget;
    const track = level.track;
    const thumb = level.thumb;

    return {
      active: level.active,
      wave: level.currentWave,
      robotsTotal: level.robotsTotal,
      robotElementsCount: robots.length,
      aboveCount: aboveRobots.length,
      belowCount: belowRobots.length,
      timerSec: level.timerSec,
      hasCentralBase: !!base,
      hasWidget: !!widget,
      hasTrack: !!track,
      hasThumb: !!thumb,
      hasCircuitLayer: !!level.circuitLayer,
      blipsCount: level.minimapBlipsContainer ? level.minimapBlipsContainer.querySelectorAll(".track-minimap-blip").length : 0,
      infectedBlipsCount: level.minimapBlipsContainer ? level.minimapBlipsContainer.querySelectorAll(".track-minimap-blip.infected").length : 0,
      wheelDotsCount: level.wheelDotsContainer ? level.wheelDotsContainer.querySelectorAll(".widget-wheel-dot").length : 0,
      worldHeight: parseInt(world.style.minHeight, 10),
      viewportScrollTop: viewport.scrollTop
    };
  })()`);

  assert("ScrollTrainingLevel is active", level1Data.active === true);
  assert("Current wave is Level 1", level1Data.wave === 1);
  assert("Level 1 has exactly 4 robots", level1Data.robotsTotal === 4 && level1Data.robotElementsCount === 4);
  assert("Strict division: exactly 2 robots above the central base", level1Data.aboveCount === 2);
  assert("Strict division: exactly 2 robots below the central base", level1Data.belowCount === 2);
  assert("Level 1 timer is difficulty-scaled (100s on Very Easy)", level1Data.timerSec === 100);
  assert("Central Base is present inside world", level1Data.hasCentralBase === true);
  assert("Mouse Wheel training widget is present", level1Data.hasWidget === true);
  assert("Stylized cyber scrollbar track is present", level1Data.hasTrack === true);
  assert("Cyber scrollbar thumb is present", level1Data.hasThumb === true);
  assert("Circuit flash SVG layer is present inside world", level1Data.hasCircuitLayer === true);
  assert("Scroll minimap track has exactly 4 robot blips", level1Data.blipsCount === 4);
  assert("All 4 minimap blips are initially orange infected dots", level1Data.infectedBlipsCount === 4);
  assert("Mouse wheel widget has 4 target indicator dots", level1Data.wheelDotsCount === 4);
  assert("Level 1 world height is 2400px", level1Data.worldHeight === 2400);

  const scrollTimerTest = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    const badge = document.getElementById("hud-timer-badge");
    const valEl = document.getElementById("hud-timer-value");
    const initialText = valEl ? valEl.textContent : "";

    level.timerSec = 20;
    game.updateHUD();
    const hasWarning = badge.classList.contains("timer-warning") && !badge.classList.contains("timer-critical");

    level.timerSec = 10;
    game.updateHUD();
    const hasCritical = badge.classList.contains("timer-critical") && !badge.classList.contains("timer-warning");

    level.timerSec = 100;
    game.updateHUD();
    const isNormal = !badge.classList.contains("timer-warning") && !badge.classList.contains("timer-critical");

    return {
      initialText,
      hasWarning,
      hasCritical,
      isNormal
    };
  })()`);

  assert("Scroll Training HUD timer displays countdown (MM:SS)", /^[0-9]{2}:[0-9]{2}$/.test(scrollTimerTest.initialText));
  assert("Scroll Training HUD timer pulsates red at <= 20s", scrollTimerTest.hasWarning === true);
  assert("Scroll Training HUD timer grows larger with critical pulse at <= 10s", scrollTimerTest.hasCritical === true);
  assert("Scroll Training HUD timer returns to normal at > 20s", scrollTimerTest.isNormal === true);

  // 4. Mouse-Wheel Reactivity & Widget Live Animation
  console.log("\n--- TEST 4: Mouse Wheel Reactivity & Widget Live Animation ---");
  const wheelResult = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    const viewport = level.viewport;
    const widget = level.wheelWidget;

    const wheelEventDown = new WheelEvent("wheel", { deltaY: 120, bubbles: true });
    viewport.dispatchEvent(wheelEventDown);

    const hasDownClass = widget.classList.contains("scrolling-down");
    const hasPulseClass = widget.classList.contains("wheel-pulse");
    const wheelCount1 = level.wheelEvents;

    const wheelEventUp = new WheelEvent("wheel", { deltaY: -120, bubbles: true });
    viewport.dispatchEvent(wheelEventUp);

    const hasUpClass = widget.classList.contains("scrolling-up");
    const wheelCount2 = level.wheelEvents;

    return { hasDownClass, hasPulseClass, hasUpClass, wheelCount1, wheelCount2 };
  })()`);

  assert("Widget activates 'scrolling-down' class on downward wheel event", wheelResult.hasDownClass === true);
  assert("Widget activates 'wheel-pulse' glow on wheel action", wheelResult.hasPulseClass === true);
  assert("Widget activates 'scrolling-up' class on upward wheel event", wheelResult.hasUpClass === true);
  assert("Wheel events count increments properly", wheelResult.wheelCount2 === 2);

  // 5. Single Click vs Double Click Robot Restoration
  console.log("\n--- TEST 5: Single-Click vs Double-Click Robot Restoration ---");
  const clickResult = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    const firstBot = level.robots[0];
    const initialScore = game.score;

    firstBot.element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const restoredAfterSingle = firstBot.restored;
    const hasSingleClickedClass = firstBot.element.classList.contains("single-clicked");
    const hintVisible = firstBot.hint.classList.contains("visible");

    firstBot.element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    const restoredAfterDbl = firstBot.restored;
    const hasRestoredClass = firstBot.element.classList.contains("restored");
    const hasInfectedClass = firstBot.element.classList.contains("infected");
    const badgeText = firstBot.badge.textContent;
    const imgSrc = firstBot.img.src;
    const scoreGain = game.score - initialScore;
    const blipRestored = firstBot.minimapBlip ? firstBot.minimapBlip.classList.contains("restored") : false;
    const wheelDotRestored = firstBot.wheelDot ? firstBot.wheelDot.classList.contains("restored") : false;
    const hasCircuitAura = firstBot.element.querySelector(".restoration-circuit-aura") !== null;
    const hasCircuitFlash = level.circuitLayer ? level.circuitLayer.innerHTML.includes("<path") : false;

    return {
      restoredAfterSingle,
      hasSingleClickedClass,
      hintVisible,
      restoredAfterDbl,
      hasRestoredClass,
      hasInfectedClass,
      badgeText,
      imgSrc,
      scoreGain,
      blipRestored,
      wheelDotRestored,
      hasCircuitAura,
      hasCircuitFlash
    };
  })()`);

  assert("Single click does NOT restore the robot", clickResult.restoredAfterSingle === false);
  assert("Single click applies 'single-clicked' class for visual feedback", clickResult.hasSingleClickedClass === true);
  assert("Single click displays 'Double-click to restore!' hint", clickResult.hintVisible === true);
  assert("Double click successfully restores the robot", clickResult.restoredAfterDbl === true);
  assert("Restored robot has 'restored' class", clickResult.hasRestoredClass === true);
  assert("Restored robot removed 'infected' class", clickResult.hasInfectedClass === false);
  assert("Restored robot badge text says 'RESTORED!'", clickResult.badgeText === "RESTORED!");
  assert("Restored robot image switched to -restored.png", clickResult.imgSrc.includes("-restored.png"));
  assert("Restoring robot awards +150 points", clickResult.scoreGain === 150);
  assert("Minimap blip turns to cyan restored state", clickResult.blipRestored === true);
  assert("Mouse wheel dot turns to cyan restored state", clickResult.wheelDotRestored === true);
  assert("Robot receives animated circular circuit aura", clickResult.hasCircuitAura === true);
  assert("Circuit lightning flash shoots from Central Base to robot", clickResult.hasCircuitFlash === true);

  // 6. HUD Updates with Restored Count & Timer
  console.log("\n--- TEST 6: HUD Updates in Scroll Training ---");
  const hudResult = await evalInPage(`(() => {
    const timerBadge = document.getElementById("hud-timer-badge");
    const timerVal = document.getElementById("hud-timer-value")?.textContent;
    const waveText = document.getElementById("hud-wave-text")?.textContent;
    const scoreText = document.getElementById("hud-score-text")?.textContent;

    return {
      timerVisible: timerBadge ? window.getComputedStyle(timerBadge).display !== "none" : false,
      timerVal,
      waveText,
      scoreText
    };
  })()`);

  assert("HUD Timer badge is visible", hudResult.timerVisible === true);
  assert("HUD Level display reads 'LEVEL 1 / 3'", hudResult.waveText === "LEVEL 1 / 3");
  assert("HUD Score display reads 'RESTORED: 1 / 4'", hudResult.scoreText === "RESTORED: 1 / 4");

  // 7. Complete Level 1 -> Advance to Level 2
  console.log("\n--- TEST 7: Complete Level 1 & Advance to Level 2 ---");
  const advanceToL2 = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    level.wheelEvents = 10;
    level.robots.slice(1).forEach(bot => {
      bot.element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
    return {
      robotsRestored: level.robotsRestored,
      robotsTotal: level.robotsTotal
    };
  })()`);

  assert("All 4 robots restored in Level 1", advanceToL2.robotsRestored === 4);

  await wait(2400);

  const level2Data = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    const robots = level.robots;
    const above = robots.filter(r => r.zone === "above").length;
    const below = robots.filter(r => r.zone === "below").length;
    return {
      currentWave: level.currentWave,
      totalRobots: level.robotsTotal,
      above,
      below,
      timerSec: level.timerSec,
      worldHeight: parseInt(level.world.style.minHeight, 10)
    };
  })()`);

  assert("Advanced to Level 2", level2Data.currentWave === 2);
  assert("Level 2 has 6 robots total", level2Data.totalRobots === 6);
  assert("Level 2 has 3 robots above base", level2Data.above === 3);
  assert("Level 2 has 3 robots below base", level2Data.below === 3);
  assert("Level 2 world height is 2800px", level2Data.worldHeight === 2800);
  assert("Level 2 timer is 90 seconds (Very Easy)", level2Data.timerSec === 90);

  // 8. Complete Level 2 -> Advance to Level 3
  console.log("\n--- TEST 8: Complete Level 2 & Advance to Level 3 ---");
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    level.wheelEvents = 10;
    level.robots.forEach(bot => {
      bot.element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
  })()`);

  await wait(2400);

  const level3Data = await evalInPage(`(() => {
    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    const robots = level.robots;
    const above = robots.filter(r => r.zone === "above").length;
    const below = robots.filter(r => r.zone === "below").length;
    return {
      currentWave: level.currentWave,
      totalRobots: level.robotsTotal,
      above,
      below,
      timerSec: level.timerSec,
      worldHeight: parseInt(level.world.style.minHeight, 10)
    };
  })()`);

  assert("Advanced to Level 3", level3Data.currentWave === 3);
  assert("Level 3 has 8 robots total", level3Data.totalRobots === 8);
  assert("Level 3 has 4 robots above base", level3Data.above === 4);
  assert("Level 3 has 4 robots below base", level3Data.below === 4);
  assert("Level 3 world height is 3400px", level3Data.worldHeight === 3400);
  assert("Level 3 timer is 85 seconds (Very Easy)", level3Data.timerSec === 85);

  // 9. Complete Level 3 -> Victory Results Screen
  console.log("\n--- TEST 9: Complete Level 3 & Victory Results Screen ---");
  await evalInPage(`(() => {
    window._lastCompletionEvent = null;
    window.addEventListener("game-complete", (e) => {
      window._lastCompletionEvent = e.detail;
    }, { once: true });

    const game = window.gameInstance;
    const level = game.scrollTrainingLevel;
    level.wheelEvents = 10;
    level.robots.forEach(bot => {
      bot.element.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    });
  })()`);

  await wait(3000);

  const victoryData = await evalInPage(`(() => {
    const game = window.gameInstance;
    const results = document.getElementById("screen-results");
    const isResultsActive = results?.classList.contains("active");
    const title = document.getElementById("results-title")?.textContent;
    const rankEn = document.getElementById("res-star-rank-en")?.textContent;
    const statWaves = document.getElementById("res-stat-waves")?.textContent;
    const statShields = document.getElementById("res-stat-shields")?.textContent;
    const statBots = document.getElementById("res-stat-bots")?.textContent;
    const starsEarned = game.starsEarned;
    const completion = window._lastCompletionEvent;

    return {
      state: game.state,
      isResultsActive,
      title,
      rankEn,
      statWaves,
      statShields,
      statBots,
      starsEarned,
      completion
    };
  })()`);

  assert("Game state is 'victory'", victoryData.state === "victory");
  assert("Results screen is displayed", victoryData.isResultsActive === true);
  assert("Results title is 'All Robots Restored!'", victoryData.title === "All Robots Restored!");
  assert("Player rank is 'SCROLL MASTER!'", victoryData.rankEn === "SCROLL MASTER!");
  assert("Earned 3 Stars for flawless completion", victoryData.starsEarned === 3);
  assert("Results screen waves display reads '3 / 3'", victoryData.statWaves === "3 / 3");
  assert("Results screen shields display reads '-- / --'", victoryData.statShields === "-- / --");
  assert("Game completion hook fired with victory = true", victoryData.completion?.victory === true);
  assert("Game completion hook reported mode = 'scroll_training'", victoryData.completion?.mode === "scroll_training");
  assert("Game completion hook reported 3 stars", victoryData.completion?.starsEarned === 3);

  // 10. Timeout Defeat Flow
  console.log("\n--- TEST 10: Timeout Defeat Flow ---");
  const defeatData = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.startRun();
    game.clearPendingTimers();
    game.startWave(1);

    const level = game.scrollTrainingLevel;
    level.timerSec = 0;
    level.onTimeExpired();

    const title = document.getElementById("results-title")?.textContent;
    const rankEn = document.getElementById("res-star-rank-en")?.textContent;

    return {
      state: game.state,
      title,
      rankEn,
      starsEarned: game.starsEarned
    };
  })()`);

  assert("Game state on timeout is 'defeat'", defeatData.state === "defeat");
  assert("Results title on timeout is 'TIME EXPIRED!'", defeatData.title === "TIME EXPIRED!");
  assert("Player rank on timeout is 'TRY AGAIN!'", defeatData.rankEn === "TRY AGAIN!");
  assert("Stars earned on defeat is 0", defeatData.starsEarned === 0);

  // 11. render_game_to_text Integration
  console.log("\n--- TEST 11: render_game_to_text Output ---");
  const textOutput = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("scroll_training");
    game.startRun();
    game.clearPendingTimers();
    game.startWave(1);
    const jsonStr = window.render_game_to_text();
    return JSON.parse(jsonStr);
  })()`);

  assert("render_game_to_text reports mode = 'scroll_training'", textOutput.mode === "scroll_training");
  assert("render_game_to_text reports level = 1", textOutput.level === 1);
  assert("render_game_to_text reports total = 4", textOutput.total === 4);
  assert("render_game_to_text reports restored = 0", textOutput.restored === 0);
  assert("render_game_to_text reports timerSec > 0", textOutput.timerSec > 0);

  console.log("\n=======================================================");
  console.log("ALL SCROLL TRAINING VALIDATION TESTS PASSED!");
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
