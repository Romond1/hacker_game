import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlPath = "file:///d:/AI/SET OUT/GAMES/be_a_hacker/TRAINING CENTER/Mission 1.5/BASE DEFEND/GAME/index.html";
const port = 9222;
const testUserDataDir = path.join(os.tmpdir(), "chrome-defense-test-profile");

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

async function runTests() {
  console.log("Waiting for Chrome DevTools endpoint...");
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
    } catch {}
  }

  if (!pageWsUrl) {
    throw new Error("Could not find debugger WebSocket URL");
  }

  console.log("Connecting to WebSocket:", pageWsUrl);
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

  const results = [];
  function assert(name, condition, extra = "") {
    if (condition) {
      console.log(`[PASS] ${name} ${extra}`);
      results.push({ name, passed: true });
    } else {
      console.error(`[FAIL] ${name} ${extra}`);
      results.push({ name, passed: false, extra });
    }
  }

  console.log("\n--- STARTING TESTS ---\n");

  // Test 1: Title and Start Screen
  const title = await evalInPage("document.title");
  assert("Page Title", title === "Double-Click Defense - Mission 1.5 Mini-Game", `Title was: ${title}`);

  const startScreenActive = await evalInPage("document.getElementById('screen-start').classList.contains('active')");
  assert("Start Screen Visible initially", startScreenActive === true);

  const diffButtonsCount = await evalInPage("document.querySelectorAll('.diff-btn').length");
  assert("6 Difficulty Buttons Present (including Ultra)", diffButtonsCount === 6);

  const defaultDiff = await evalInPage("window.gameInstance.selectedDifficulty");
  assert("Default game difficulty is 'Very Easy'", defaultDiff === "veryEasy");

  const veryEasySelected = await evalInPage("Boolean(document.querySelector('.diff-btn[data-diff=\"veryEasy\"].selected'))");
  assert("Very Easy difficulty button has 'selected' class on start", veryEasySelected === true);

  // Test 2: Language Selection & Dual Language Verification
  console.log("\nTesting Language Selection & Dual Language System...");
  const langButtonsCount = await evalInPage("document.querySelectorAll('.lang-btn').length");
  assert("3 Language Options on Intro Screen (English, Japanese, Italian)", langButtonsCount === 3);

  // Switch to Japanese
  await evalInPage("document.querySelector('[data-lang=\"ja\"]').click()");
  const isBodyLangJa = await evalInPage("document.body.classList.contains('lang-ja')");
  assert("Selecting Japanese adds 'lang-ja' class", isBodyLangJa === true);

  // Check Japanese text has ZERO Kanji (Hiragana & Katakana ONLY)
  const jaTextCheck = await evalInPage(`(() => {
    const jaDict = TRANSLATIONS.ja;
    const allJaStrings = Object.values(jaDict).join(" ");
    const kanjiRegex = /[\\u4E00-\\u9FAF]/g;
    const kanjiMatches = allJaStrings.match(kanjiRegex);
    return {
      totalKeys: Object.keys(jaDict).length,
      hasKanji: kanjiMatches !== null,
      kanjiCount: kanjiMatches ? kanjiMatches.length : 0
    };
  })()`);
  assert("Japanese Dictionary contains Hiragana & Katakana ONLY (0 Kanji)", jaTextCheck.hasKanji === false, `Kanji count: ${jaTextCheck.kanjiCount}`);

  // Switch to Italian
  await evalInPage("document.querySelector('[data-lang=\"it\"]').click()");
  const isBodyLangIt = await evalInPage("document.body.classList.contains('lang-it')");
  assert("Selecting Italian adds 'lang-it' class", isBodyLangIt === true);

  // Switch to English
  await evalInPage("document.querySelector('[data-lang=\"en\"]').click()");
  const isBodyLangEn = await evalInPage("document.body.classList.contains('lang-en')");
  assert("Selecting English adds 'lang-en' class", isBodyLangEn === true);

  // Switch back to Japanese for rest of tests to verify dual display
  await evalInPage("document.querySelector('[data-lang=\"ja\"]').click()");

  // Test 3: Large Shields Indicator Under Base
  console.log("\nTesting Large Shields Indicator Placement & Sizing...");
  const shieldsUnderBase = await evalInPage("Boolean(document.querySelector('#base-defense #base-shields-container'))");
  assert("Shields indicator is located inside #base-defense directly under base", shieldsUnderBase === true);

  const largeShieldPipsCount = await evalInPage("document.querySelectorAll('.large-shield-pip').length");
  assert("Large shield pips rendered for base (count = 6 on normal)", largeShieldPipsCount === 6);

  const numericReadout = await evalInPage("document.getElementById('base-shields-numeric').textContent");
  assert("Numeric shield readout displayed (e.g. 6 / 6)", numericReadout === "6 / 6");

  // Test Base & Shield Clearance / Zero Overlap
  const clearances = await evalInPage(`(() => {
    const line = document.getElementById('defense-line').getBoundingClientRect();
    const label = document.querySelector('.base-label-overlay').getBoundingClientRect();
    const baseImg = document.getElementById('base-image').getBoundingClientRect();
    const shields = document.getElementById('base-shields-container').getBoundingClientRect();
    return {
      baseImgHeight: baseImg.height,
      baseImgWidth: baseImg.width,
      overlapLineLabel: !(line.bottom <= label.top || label.bottom <= line.top),
      overlapLabelImg: !(label.bottom <= baseImg.top || baseImg.bottom <= label.top),
      overlapImgShields: !(baseImg.bottom <= shields.top || shields.bottom <= baseImg.top),
      shieldsUnderneath: baseImg.bottom <= shields.top
    };
  })()`);
  assert("Base image is fully sized (height >= 80px, width >= 100px)", clearances.baseImgHeight >= 80 && clearances.baseImgWidth >= 100);
  assert("Base and shields have zero overlap (shields cleanly underneath)", clearances.overlapImgShields === false && clearances.shieldsUnderneath === true);
  assert("Defense line does not overlap base label or image", clearances.overlapLineLabel === false && clearances.overlapLabelImg === false);

  // Test 4: Custom Art Assets Integration
  console.log("\nTesting Art Assets Integration...");
  const baseImgSrc = await evalInPage("document.getElementById('base-image').getAttribute('src')");
  assert("Base structure uses base.png", baseImgSrc.includes("base.png"));

  const gameboardBg = await evalInPage("window.getComputedStyle(document.getElementById('playfield')).backgroundImage");
  assert("Playfield background uses gameboard.jpeg", gameboardBg.includes("gameboard.jpeg"));

  // Test 5: Practice Mode
  console.log("\nTesting Practice Mode...");
  await evalInPage("window.gameInstance.startPractice()");
  await wait(200);

  const practiceState = await evalInPage("window.gameInstance.state");
  assert("Game State is Practice", practiceState === "practice");

  const practiceBotsCount = await evalInPage("window.gameInstance.robots.length");
  assert("Stationary Practice Bot Spawned", practiceBotsCount === 1);

  const bot1Id = await evalInPage("window.gameInstance.robots[0].id");

  // Check robot uses custom artwork robot1-hacked.png
  const robotImgSrc = await evalInPage(`document.querySelector('[data-id="${bot1Id}"] .robot-image-art')?.getAttribute('src')`);
  assert("Robot uses robot1-hacked.png artwork", robotImgSrc && robotImgSrc.includes("robot1-hacked.png"));

  // Single click does NOT destroy robot
  await evalInPage(`(() => {
    const el = document.querySelector('[data-id="${bot1Id}"]');
    const evt = new PointerEvent('pointerdown', { button: 0, bubbles: true });
    el.dispatchEvent(evt);
  })()`);
  await wait(100);

  const bot1DestroyedAfter1 = await evalInPage("window.gameInstance.robots[0].destroyed");
  const bot1IsHeld = await evalInPage("window.gameInstance.robots[0].isHeld");
  const bot1Reticle = await evalInPage("window.gameInstance.robots[0].element.classList.contains('held')");

  assert("Single click does NOT destroy robot", bot1DestroyedAfter1 === false);
  assert("Single click activates temporary hold", bot1IsHeld === true);
  assert("Single click displays targeting ring", bot1Reticle === true);

  // Second click within window destroys robot and triggers restoration animation
  await evalInPage(`(() => {
    const el = document.querySelector('[data-id="${bot1Id}"]');
    const evt = new PointerEvent('pointerdown', { button: 0, bubbles: true });
    el.dispatchEvent(evt);
  })()`);

  // Verify Cyber Circuit Snap and malware purge sequence
  const isPracticeBotRestored = await evalInPage(`(() => {
    const el = document.querySelector('[data-id="${bot1Id}"]');
    return el && (el.classList.contains("restoring") || el.classList.contains("restored"));
  })()`);
  assert("Cyber Circuit Snap and malware purge sequence trigger on double-click restore", isPracticeBotRestored === true);
  await wait(500);

  const practiceStepAfterDestroy = await evalInPage("window.gameInstance.practiceStep");
  assert("Valid double-click destroys practice target and advances", practiceStepAfterDestroy === 2);

  // Finish practice target 2 & 3
  console.log("Advancing practice target 2 and 3...");
  await wait(500);
  const bot2Id = await evalInPage("window.gameInstance.robots[0]?.id");
  await evalInPage(`(() => {
    const el2 = document.querySelector('[data-id="${bot2Id}"]');
    if (!el2) throw new Error("Could not find robot element for bot2");
    el2.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    el2.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(600);

  const bot3Id = await evalInPage("window.gameInstance.robots[0]?.id");
  await evalInPage(`(() => {
    const el3 = document.querySelector('[data-id="${bot3Id}"]');
    if (!el3) throw new Error("Could not find robot element for bot3");
    el3.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    el3.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(800);

  const practiceDoneVisible = await evalInPage("document.getElementById('screen-practice-done').classList.contains('active')");
  assert("Practice completion screen displayed with Start Game option", practiceDoneVisible === true);

  // Test 6: Active Gameplay & Double-Click Edge Cases
  console.log("\nTesting Active Gameplay & Double-Click Edge Cases...");
  await evalInPage("window.gameInstance.startRun()");
  await wait(100);

  const countdownState = await evalInPage("window.gameInstance.state");
  assert("Starts with Countdown state", countdownState === "countdown");

  await evalInPage("window.gameInstance.startWave(1)");
  await wait(100);

  const activeState = await evalInPage("window.gameInstance.state");
  assert("Transitions to Active Game state", activeState === "active");

  // Spawn two test robots manually to test mismatch click
  await evalInPage(`(() => {
    window.gameInstance.clearAllRobots();
    const r1 = new Robot(101, 0, 10, true);
    const r2 = new Robot(102, 1, 10, true);
    window.gameInstance.robots.push(r1, r2);
    window.gameInstance.playfieldEl.appendChild(r1.element);
    window.gameInstance.playfieldEl.appendChild(r2.element);
  })()`);
  await wait(50);

  // Click Robot 101 once
  await evalInPage(`(() => {
    document.querySelector('[data-id="101"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const r1Pending = await evalInPage("window.gameInstance.inputEngine.pendingRobotId");
  assert("Robot 101 is pending after 1st click", r1Pending === 101);

  // Click Robot 102 once -> should NOT combine to destroy 102!
  await evalInPage(`(() => {
    document.querySelector('[data-id="102"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const r2Destroyed = await evalInPage("window.gameInstance.getRobotById(102).destroyed");
  const r2Pending = await evalInPage("window.gameInstance.inputEngine.pendingRobotId");
  assert("Clicks on different robots do NOT combine to destroy", r2Destroyed === false);
  assert("Robot 102 is now the pending target", r2Pending === 102);

  // Test Right Click does not damage or register
  await evalInPage(`(() => {
    document.querySelector('[data-id="102"]').dispatchEvent(new PointerEvent('pointerdown', { button: 2, bubbles: true }));
  })()`);
  const r2DestroyedAfterRight = await evalInPage("window.gameInstance.getRobotById(102).destroyed");
  assert("Right click does not damage robot", r2DestroyedAfterRight === false);

  // Test empty playfield click clears pending target
  await evalInPage(`(() => {
    window.gameInstance.playfieldEl.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const pendingAfterEmpty = await evalInPage("window.gameInstance.inputEngine.pendingRobotId");
  assert("Empty playfield click clears pending double-click target", pendingAfterEmpty === null);

  // Test Hold Happens At Most Once per robot
  console.log("\nTesting Hold Restriction (once per robot)...");
  await evalInPage(`(() => {
    document.querySelector('[data-id="101"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const r1HeldOnce1 = await evalInPage("window.gameInstance.getRobotById(101).heldOnce");
  assert("Robot 101 marked heldOnce = true", r1HeldOnce1 === true);

  await wait(550);
  const r1HeldAfterExpiry = await evalInPage("window.gameInstance.getRobotById(101).isHeld");
  assert("Hold expired after window", r1HeldAfterExpiry === false);

  await evalInPage(`(() => {
    document.querySelector('[data-id="101"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const r1IsHeldSecondTime = await evalInPage("window.gameInstance.getRobotById(101).isHeld");
  assert("Hold in place happens at most ONCE per robot", r1IsHeldSecondTime === false);

  // Test Destroying Robot Awards 100 Score and removes it
  console.log("\nTesting Scoring and Destruction...");
  const initialScore = await evalInPage("window.gameInstance.score");
  await evalInPage(`(() => {
    document.querySelector('[data-id="101"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const scoreAfterDestroy = await evalInPage("window.gameInstance.score");
  const botsDestroyed = await evalInPage("window.gameInstance.robotsDestroyed");
  assert("Score increases by 100 points on double-click destroy", scoreAfterDestroy === initialScore + 100);
  assert("Robots destroyed counter increments", botsDestroyed === 1);

  // Test Escaped Robot causes 1 Shield Damage on Large Shields Indicator
  console.log("\nTesting Shield Damage on Escaped Robot...");
  const initialShields = await evalInPage("window.gameInstance.shields");
  await evalInPage(`(() => {
    const rEscape = window.gameInstance.getRobotById(102);
    window.gameInstance.handleRobotEscaped(rEscape);
  })()`);
  const shieldsAfterEscape = await evalInPage("window.gameInstance.shields");
  const lostPipsCount = await evalInPage("document.querySelectorAll('.large-shield-pip.lost').length");
  assert("Escaped robot causes 1 shield damage", shieldsAfterEscape === initialShields - 1);
  assert("Large shield pip marked as lost visually", lostPipsCount === 1);

  // Test Defeat on Zero Shields
  console.log("\nTesting Defeat condition...");
  await evalInPage("window.gameInstance.shields = 1");
  await evalInPage(`(() => {
    const rKill = new Robot(999, 0, 10, true);
    window.gameInstance.handleRobotEscaped(rKill);
  })()`);
  await wait(600);

  const defeatState = await evalInPage("window.gameInstance.state");
  const defeatMsg = await evalInPage("document.getElementById('results-title').textContent");
  assert("Zero shields produces Defeat", defeatState === "defeat");
  assert("Defeat title matches specification", defeatMsg.includes("Robots Got Through"));

  const consecutiveDefeats1 = await evalInPage("window.gameInstance.consecutiveDefeats");
  assert("Consecutive defeats tracked (count = 1)", consecutiveDefeats1 === 1);

  // Trigger 2nd defeat to test Extra Help Offer
  console.log("\nTesting Extra Help Offer after 2 consecutive defeats...");
  await evalInPage("window.gameInstance.endGame(false)");
  await wait(600);
  const consecutiveDefeats2 = await evalInPage("window.gameInstance.consecutiveDefeats");
  const extraHelpBtnVisible = await evalInPage("document.getElementById('res-extra-help-btn').style.display !== 'none'");
  assert("Consecutive defeats reaches 2", consecutiveDefeats2 === 2);
  assert("Extra help button offered after 2 consecutive defeats", extraHelpBtnVisible === true);

  // Click Extra Help Button
  await evalInPage("document.getElementById('res-extra-help-btn').click()");
  await wait(200);
  const isHelpActive = await evalInPage("window.gameInstance.extraHelpActive");
  const startingShieldsWithHelp = await evalInPage("window.gameInstance.shields");
  const diffBaseShields = await evalInPage("DIFFICULTY_SETTINGS[window.gameInstance.selectedDifficulty].startingShields");
  assert("Extra help is active", isHelpActive === true);
  assert(`Starting shields increased by +2 (bonus shields: ${startingShieldsWithHelp})`, startingShieldsWithHelp === diffBaseShields + 2);

  // Test Pause and Resume
  console.log("\nTesting Pause and Resume...");
  await evalInPage("window.gameInstance.togglePause()");
  const pausedState = await evalInPage("window.gameInstance.state");
  const pauseScreenActive = await evalInPage("document.getElementById('screen-pause').classList.contains('active')");
  assert("Game pauses and shows pause screen", pausedState === "paused" && pauseScreenActive === true);

  await evalInPage("window.gameInstance.resumeGame()");
  const resumedState = await evalInPage("window.gameInstance.state");
  assert("Game resumes cleanly", resumedState === "countdown" || resumedState === "active");

  // Test Victory & Integration Hook
  console.log("\nTesting Victory & Integration Hook...");
  await evalInPage(`
    window.hookResult = null;
    window.onGameComplete = (data) => { window.hookResult = data; };
    window.gameInstance.shields = 5;
    window.gameInstance.score = 2100;
    window.gameInstance.robotsDestroyed = 21;
    window.gameInstance.endGame(true);
  `);
  await wait(600);

  const victoryState = await evalInPage("window.gameInstance.state");
  assert("Ends in Victory", victoryState === "victory");

  const hookResult = await evalInPage("window.hookResult");
  assert("Completion hook fired", hookResult !== null);
  assert("Hook gameId is 'double-click-defense'", hookResult.gameId === "double-click-defense");
  assert("Hook language is reported", hookResult.language === "ja");
  assert("Hook victory is true", hookResult.victory === true);
  assert("Hook score is reported", hookResult.score === 2100);
  assert("Hook shields remaining is reported", hookResult.shieldsRemaining === 5);
  assert("Hook extra help used is reported", hookResult.extraHelpUsed === true);

  // Test Full 3-Wave Natural Progression to Victory
  console.log("\nTesting Full 3-Wave Natural Progression...");
  await evalInPage(`(() => {
    window.gameInstance.selectedDifficulty = "veryEasy";
    window.gameInstance.startRun();
    window.gameInstance.startWave(1);
  })()`);
  await wait(100);

  for (let w = 1; w <= 3; w++) {
    const waveNum = await evalInPage("window.gameInstance.currentWave");
    assert(`Reached Wave ${w}`, waveNum === w);

    await evalInPage(`(() => {
      const needed = window.gameInstance.waveRobotsToSpawn;
      while (window.gameInstance.waveRobotsSpawned < needed) {
        window.gameInstance.spawnRobot(10);
        window.gameInstance.waveRobotsSpawned++;
      }
      const active = [...window.gameInstance.robots];
      for (const r of active) {
        window.gameInstance.destroyRobot(r);
      }
      window.gameInstance.handleWaveCompleted();
    })()`);

    if (w < 3) {
      const intermissionState = await evalInPage("window.gameInstance.state");
      assert(`Intermission between Wave ${w} and Wave ${w+1}`, intermissionState === "intermission");
      await evalInPage(`window.gameInstance.startWave(${w + 1})`);
      await wait(100);
    }
  }

  // Allow 2200ms star animation from showWaveStars to finish and transition to victory
  await wait(2400);
  const naturalVictoryState = await evalInPage("window.gameInstance.state");
  const finalScore = await evalInPage("window.gameInstance.score");
  const finalRobots = await evalInPage("window.gameInstance.robotsDestroyed");
  assert("Full 3 waves ends naturally in Victory", naturalVictoryState === "victory");
  assert("All 15 robots destroyed (4 + 5 + 6 = 15)", finalRobots === 15);
  assert("Final score is 1,500 (15 * 100)", finalScore === 1500);

  // Test Hitbox Toggle Shortcut
  console.log("\nTesting Debug Hitbox toggle...");
  await evalInPage("document.getElementById('debug-hitbox-toggle').click()");
  const hasDebugClass = await evalInPage("document.body.classList.contains('debug-hitboxes')");
  assert("Hitbox visualization toggle works", hasDebugClass === true);

  // =========================================================================
  // TEST SECTION 7: ROBOT 2 (HEAVY ROBOT) COMPREHENSIVE TESTS
  // =========================================================================
  console.log("\n--- TESTING ROBOT 2 (HEAVY ROBOT) MECHANICS ---\n");

  // Test 7.1: Robot 2 Asset Config and Preloading
  const robot2AssetConfig = await evalInPage("ASSET_CONFIG.robot2.src");
  const bigExplosionFramesCount = await evalInPage("ASSET_CONFIG.destructionBig.frameCount");
  assert("Asset config has robot2-hacked.png", robot2AssetConfig.includes("robot2-hacked.png"));
  assert("Big explosion has 5 frames", bigExplosionFramesCount === 5);

  // Test 7.2: Heavy Robot Class Instantiation & DOM Structure
  const heavyBotInfo = await evalInPage(`(() => {
    const hb = new Robot(501, 2, 15.2, true, "heavy");
    window.gameInstance.robots.push(hb);
    window.gameInstance.playfieldEl.appendChild(hb.element);
    const el = hb.element;
    return {
      id: hb.id,
      type: hb.type,
      health: hb.health,
      maxHealth: hb.maxHealth,
      hasHeavyClass: el.classList.contains("robot-heavy"),
      hasHealthPips: Boolean(el.querySelector(".robot-health-pips")),
      pipCount: el.querySelectorAll(".heavy-health-pip").length,
      imgSrc: el.querySelector(".robot-image-art")?.getAttribute("src")
    };
  })()`);
  assert("Heavy robot has type 'heavy'", heavyBotInfo.type === "heavy");
  assert("Heavy robot starts with health = 2 and maxHealth = 2", heavyBotInfo.health === 2 && heavyBotInfo.maxHealth === 2);
  assert("Heavy robot element has 'robot-heavy' class", heavyBotInfo.hasHeavyClass === true);
  assert("Heavy robot displays 2 health pips", heavyBotInfo.hasHealthPips === true && heavyBotInfo.pipCount === 2);
  assert("Heavy robot uses robot2-hacked.png sprite", heavyBotInfo.imgSrc && heavyBotInfo.imgSrc.includes("robot2-hacked.png"));

  // Test 7.3: First Double-Click on Heavy Robot Damages But Does NOT Destroy
  console.log("\nTesting 1st Double-Click on Heavy Robot...");
  const scoreBeforeHeavy = await evalInPage("window.gameInstance.score");
  // 1st click
  await evalInPage(`(() => {
    document.querySelector('[data-id="501"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const heavyPendingAfter1 = await evalInPage("window.gameInstance.inputEngine.pendingRobotId");
  assert("1st click marks Heavy Robot as pending target", heavyPendingAfter1 === 501);

  // 2nd click completes 1st double-click -> should damage, not destroy
  await evalInPage(`(() => {
    document.querySelector('[data-id="501"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(100);

  const heavyAfterHit1 = await evalInPage(`(() => {
    const hb = window.gameInstance.getRobotById(501);
    const el = hb.element;
    return {
      destroyed: hb.destroyed,
      health: hb.health,
      hasDamagedClass: el.classList.contains("armor-damaged"),
      pip1Lost: el.querySelector(".pip-1").classList.contains("lost"),
      pip2Lost: el.querySelector(".pip-2").classList.contains("lost"),
      tagText: el.querySelector(".click-again-tag .main-en")?.textContent
    };
  })()`);
  const scoreAfterHit1 = await evalInPage("window.gameInstance.score");

  assert("Heavy robot is NOT destroyed after 1st double-click", heavyAfterHit1.destroyed === false);
  assert("Heavy robot health reduced to 1", heavyAfterHit1.health === 1);
  assert("Heavy robot receives 'armor-damaged' class", heavyAfterHit1.hasDamagedClass === true);
  assert("First health pip marked as lost", heavyAfterHit1.pip1Lost === true && heavyAfterHit1.pip2Lost === false);
  assert("Click tag updates to '1 MORE HIT!'", heavyAfterHit1.tagText === "1 MORE HIT!");
  assert("First double-click awards +50 points", scoreAfterHit1 === scoreBeforeHeavy + 50);

  // Test 7.4: Second Double-Click Destroys Heavy Robot & Spawns Big Explosion
  console.log("\nTesting 2nd Double-Click on Heavy Robot (Destruction)...");
  // 3rd click (1st click of 2nd double-click)
  await evalInPage(`(() => {
    document.querySelector('[data-id="501"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  const heavyPendingAfter3 = await evalInPage("window.gameInstance.inputEngine.pendingRobotId");
  assert("3rd click locks on to Heavy Robot for 2nd double-click", heavyPendingAfter3 === 501);

  // 4th click (completes 2nd double-click) -> destroys Heavy Robot!
  await evalInPage(`(() => {
    document.querySelector('[data-id="501"]').dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);

  // Verify Cyber Circuit Snap & restored state on Heavy Robot
  const heavyRestoredPresent = await evalInPage(`(() => {
    const el = document.querySelector('[data-id="501"]');
    return el && (el.classList.contains("restoring") || el.classList.contains("restored"));
  })()`);
  assert("Cyber Circuit Snap and restored state trigger on Heavy Robot restoration", heavyRestoredPresent === true);

  await wait(200);
  const heavyBotDestroyed = await evalInPage("window.gameInstance.getRobotById(501) === undefined");
  const scoreAfterDestroyHeavy = await evalInPage("window.gameInstance.score");
  assert("Heavy robot is fully destroyed and removed from active robots list", heavyBotDestroyed === true);
  assert("Final double-click awards +150 points (total 200 for heavy robot)", scoreAfterDestroyHeavy === scoreAfterHit1 + 150);

  // Test 7.5: Robot 2 Movement Speed (1.9x travel time, ~47% slower in Reinforcements)
  console.log("\nTesting Heavy Robot Travel Time & Speed scaling...");
  const speedCheck = await evalInPage(`(() => {
    window.gameInstance.selectedDifficulty = "normal";
    const diff = DIFFICULTY_SETTINGS.normal;
    const baseTravel = diff.travelTimeSec;

    // Spawn 1 standard robot in base_defense mode
    window.gameInstance.setMode("base_defense");
    window.gameInstance.clearAllRobots();
    window.gameInstance.spawnRobot(baseTravel);
    const standardRobot = window.gameInstance.robots[0];

    // Spawn 1 heavy robot in reinforcements mode
    window.gameInstance.setMode("reinforcements");
    window.gameInstance.waveRobotsToSpawn = 10;
    window.gameInstance.heavyRobotsToSpawn = 1;
    window.gameInstance.heavyRobotsSpawned = 0;
    window.gameInstance.waveRobotsSpawned = 9; // force heavyRemaining >= totalRemaining
    window.gameInstance.spawnRobot(baseTravel);
    const heavyRobot = window.gameInstance.robots[1];

    return {
      baseTravel,
      standardTravel: standardRobot.travelTimeSec,
      heavyTravel: heavyRobot.travelTimeSec,
      ratio: heavyRobot.travelTimeSec / standardRobot.travelTimeSec,
      heavyType: heavyRobot.type
    };
  })()`);
  assert("Standard robot has normal travel time (8.0s on Normal)", speedCheck.standardTravel === 8.0);
  assert("Heavy robot has travel time scaled by 1.9x (15.2s on Normal)", Math.abs(speedCheck.heavyTravel - 15.2) < 0.01);
  assert("Heavy robot moves significantly slower than standard robot", speedCheck.ratio >= 1.89);

  // Test 7.6: Difficulty Frequencies in Reinforcements
  console.log("\nTesting Robot 2 Spawn Frequencies per Difficulty Setting in Reinforcements...");
  const diffFrequencyCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("reinforcements");
    const results = {};
    const tiers = ["veryEasy", "easy", "normal", "difficult", "hard"];

    for (const tier of tiers) {
      window.gameInstance.selectedDifficulty = tier;
      const diff = DIFFICULTY_SETTINGS[tier];
      let totalHeavySpawned = 0;
      const perWaveHeavy = [];

      for (let wave = 1; wave <= 3; wave++) {
        window.gameInstance.startWave(wave);
        const waveTotal = window.gameInstance.waveRobotsToSpawn;
        let waveHeavy = 0;

        while (window.gameInstance.waveRobotsSpawned < waveTotal) {
          const prevCount = window.gameInstance.heavyRobotsSpawned;
          window.gameInstance.spawnRobot(diff.travelTimeSec);
          window.gameInstance.waveRobotsSpawned++;
          if (window.gameInstance.heavyRobotsSpawned > prevCount) {
            waveHeavy++;
          }
        }
        totalHeavySpawned += waveHeavy;
        perWaveHeavy.push(waveHeavy);
      }
      results[tier] = { totalHeavySpawned, perWaveHeavy };
    }
    window.gameInstance.setMode("base_defense");
    return results;
  })()`);

  assert("Very Easy has 0 Heavy Robots total across run", diffFrequencyCheck.veryEasy.totalHeavySpawned === 0);
  assert("Easy has 0 Heavy Robots total across run", diffFrequencyCheck.easy.totalHeavySpawned === 0);
  assert("Normal (medium) has exactly 1 Heavy Robot total (in wave 3)", diffFrequencyCheck.normal.totalHeavySpawned === 1 && diffFrequencyCheck.normal.perWaveHeavy[2] === 1);
  assert("Difficult has exactly 3 Heavy Robots total (Wave 1: 0, Wave 2: 1, Wave 3: 2)", diffFrequencyCheck.difficult.totalHeavySpawned === 3 && JSON.stringify(diffFrequencyCheck.difficult.perWaveHeavy) === JSON.stringify([0, 1, 2]));
  assert("Hard has exactly 5 Heavy Robots total (Wave 1: 1, Wave 2: 2, Wave 3: 2)", diffFrequencyCheck.hard.totalHeavySpawned === 5 && JSON.stringify(diffFrequencyCheck.hard.perWaveHeavy) === JSON.stringify([1, 2, 2]));

  // =========================================================================
  // TEST SECTION 8: 3-GAME EDUCATIONAL SCAFFOLDING & MODES
  // =========================================================================
  console.log("\n--- TESTING 3-GAME EDUCATIONAL SCAFFOLDING & MODES ---");

  // Test 8.1: Mode configuration and GAME_MODES dictionary
  const modeConfigCheck = await evalInPage(`(() => {
    return {
      modesPresent: !!(GAME_MODES.base_defense && GAME_MODES.reinforcements && GAME_MODES.robot_override),
      baseMission: GAME_MODES.base_defense.mission,
      reinfMission: GAME_MODES.reinforcements.mission,
      overrideMission: GAME_MODES.robot_override.mission,
      overrideMechanic: GAME_MODES.robot_override.mechanic
    };
  })()`);
  assert("GAME_MODES defines all 3 missions", modeConfigCheck.modesPresent);
  assert("Mission numbers are 1, 2, 3", modeConfigCheck.baseMission === 1 && modeConfigCheck.reinfMission === 2 && modeConfigCheck.overrideMission === 3);
  assert("Mission 3 has 'override_keyboard' mechanic", modeConfigCheck.overrideMechanic === "override_keyboard");

  // Test 8.2: Switching modes via initMiniGame API
  console.log("\nTesting window.initMiniGame API & Mode Switching...");
  const apiSwitchCheck = await evalInPage(`(() => {
    window.initMiniGame({ mode: "reinforcements", language: "ja" });
    const m2Id = window.gameInstance.currentModeId;
    const m2Title = document.getElementById("start-screen-title-en").textContent;
    const m2SubJa = document.getElementById("start-screen-title-sub").textContent;

    window.initMiniGame({ mission: 3, language: "ja" });
    const m3Id = window.gameInstance.currentModeId;
    const m3Title = document.getElementById("start-screen-title-en").textContent;
    const m3SubJa = document.getElementById("start-screen-title-sub").textContent;

    // Reset back to English for following tests
    window.gameInstance.setLanguage("en");

    return { m2Id, m2Title, m2SubJa, m3Id, m3Title, m3SubJa };
  })()`);
  assert("initMiniGame switches to Reinforcements mode", apiSwitchCheck.m2Id === "reinforcements" && apiSwitchCheck.m2Title === "Reinforcements");
  assert("Reinforcements Japanese subtitle has 0 Kanji", !/[一-龯]/.test(apiSwitchCheck.m2SubJa), `Subtitle was: ${apiSwitchCheck.m2SubJa}`);
  assert("initMiniGame switches to Robot Override mode", apiSwitchCheck.m3Id === "robot_override" && apiSwitchCheck.m3Title === "Robot Override");
  assert("Robot Override Japanese subtitle has 0 Kanji", !/[一-龯]/.test(apiSwitchCheck.m3SubJa), `Subtitle was: ${apiSwitchCheck.m3SubJa}`);

  // Test 8.3: Cycle Next Mode
  const cycleCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("base_defense");
    const m1 = window.gameInstance.currentModeId;
    window.gameInstance.cycleNextMode();
    const m2 = window.gameInstance.currentModeId;
    window.gameInstance.cycleNextMode();
    const m3 = window.gameInstance.currentModeId;
    window.gameInstance.cycleNextMode();
    const m1Loop = window.gameInstance.currentModeId;
    return { m1, m2, m3, m1Loop };
  })()`);
  assert("cycleNextMode loops through base_defense -> reinforcements -> robot_override -> base_defense",
    cycleCheck.m1 === "base_defense" && cycleCheck.m2 === "reinforcements" && cycleCheck.m3 === "robot_override" && cycleCheck.m1Loop === "base_defense");

  // =========================================================================
  // TEST SECTION 9: MODE 2 (REINFORCEMENTS) - ROBOT 3 & ROBOT 4
  // =========================================================================
  console.log("\n--- TESTING MODE 2 (REINFORCEMENTS) - ROBOT 3 & ROBOT 4 ---");

  // Test 9.1: Assets exist in ASSET_CONFIG
  const assetCheck = await evalInPage(`(() => {
    return {
      robot3: ASSET_CONFIG.robot3.src,
      robot4: ASSET_CONFIG.robot4.src,
      robot5: ASSET_CONFIG.robot5Text.src,
      blueExp: ASSET_CONFIG.destructionBlue.basePath,
      blueExpCount: ASSET_CONFIG.destructionBlue.frameCount
    };
  })()`);
  assert("Asset config has robot3-hacked.png", assetCheck.robot3.includes("robot3-hacked.png"));
  assert("Asset config has robot4-hacked.png", assetCheck.robot4.includes("robot4-hacked.png"));
  assert("Asset config has robot5-text-hacked.png", assetCheck.robot5.includes("robot5-text-hacked.png"));
  assert("Asset config has explosion blue (10 frames)", assetCheck.blueExpCount === 10);

  // Test 9.2: Robot 3 (Speeder) Mechanics
  console.log("\nTesting Robot 3 (Agile Speeder)...");
  const speederCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("reinforcements");
    window.gameInstance.clearAllRobots();
    window.gameInstance.inputEngine.reset();
    window.gameInstance.score = 0;
    window.gameInstance.robotsDestroyed = 0;

    const speeder = new Robot(401, 1, 5.0, false, "speeder");
    window.gameInstance.robots.push(speeder);
    window.gameInstance.playfieldEl.appendChild(speeder.element);

    const hasClass = speeder.element.classList.contains("robot-speeder");
    const imgSrc = speeder.element.querySelector(".robot-image-art").src;
    const initialHealth = speeder.health;

    // First click
    window.gameInstance.inputEngine.handleTargetClick(speeder, { button: 0 });
    const isPending = window.gameInstance.inputEngine.pendingRobotId === speeder.id;

    // Second click (Double click)
    window.gameInstance.inputEngine.handleTargetClick(speeder, { button: 0 });
    const isDestroyed = speeder.destroyed;
    const activeCount = window.gameInstance.robots.length;
    const scoreAfter = window.gameInstance.score;

    return { hasClass, imgSrc, initialHealth, isPending, isDestroyed, activeCount, scoreAfter };
  })()`);
  assert("Speeder has 'robot-speeder' CSS class", speederCheck.hasClass);
  assert("Speeder uses robot3-hacked.png image", speederCheck.imgSrc.includes("robot3-hacked.png"));
  assert("Speeder has 1 health", speederCheck.initialHealth === 1);
  assert("Speeder destroyed on single double-click", speederCheck.isDestroyed && speederCheck.activeCount === 0);
  assert("Speeder awards +120 points on destroy", speederCheck.scoreAfter === 120);

  // Test 9.3: Robot 4 (Armored Tank) Mechanics
  console.log("\nTesting Robot 4 (Armored Tank)...");
  const tankCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("reinforcements");
    window.gameInstance.clearAllRobots();
    window.gameInstance.inputEngine.reset();
    window.gameInstance.score = 0;

    const tank = new Robot(402, 2, 12.0, false, "tank");
    window.gameInstance.robots.push(tank);
    window.gameInstance.playfieldEl.appendChild(tank.element);

    const hasClass = tank.element.classList.contains("robot-tank");
    const imgSrc = tank.element.querySelector(".robot-image-art").src;
    const initialHealth = tank.health;
    const pipCount = tank.element.querySelectorAll(".heavy-health-pip").length;

    // 1st Double-Click (Damages armor)
    window.gameInstance.inputEngine.handleTargetClick(tank, { button: 0 });
    window.gameInstance.inputEngine.handleTargetClick(tank, { button: 0 });
    const healthAfter1 = tank.health;
    const scoreAfter1 = window.gameInstance.score;
    const isDamaged = tank.element.classList.contains("armor-damaged");

    // 2nd Double-Click (Destroys tank)
    window.gameInstance.inputEngine.handleTargetClick(tank, { button: 0 });
    window.gameInstance.inputEngine.handleTargetClick(tank, { button: 0 });
    const isDestroyed = tank.destroyed;
    const scoreAfter2 = window.gameInstance.score;

    return { hasClass, imgSrc, initialHealth, pipCount, healthAfter1, scoreAfter1, isDamaged, isDestroyed, scoreAfter2 };
  })()`);
  assert("Tank has 'robot-tank' CSS class", tankCheck.hasClass);
  assert("Tank uses robot4-hacked.png image", tankCheck.imgSrc.includes("robot4-hacked.png"));
  assert("Tank starts with 2 health and 2 health pips", tankCheck.initialHealth === 2 && tankCheck.pipCount === 2);
  assert("1st double-click damages Tank to 1 health and adds 'armor-damaged' class", tankCheck.healthAfter1 === 1 && tankCheck.isDamaged);
  assert("1st double-click awards +50 damage points", tankCheck.scoreAfter1 === 50);
  assert("2nd double-click destroys Tank", tankCheck.isDestroyed);
  assert("Tank destruction awards +180 points (total 230 points)", tankCheck.scoreAfter2 === 230);

  // =========================================================================
  // TEST SECTION 10: MODE 3 (ROBOT OVERRIDE) - FREEZE & KEYBOARD BLAST
  // =========================================================================
  console.log("\n--- TESTING MODE 3 (ROBOT OVERRIDE) - FREEZE & KEYBOARD BLAST ---");

  const overrideMechanicsCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("robot_override");
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();
    window.gameInstance.inputEngine.reset();
    window.gameInstance.score = 0;

    const bot5 = new Robot(501, 2, 10.0, false, "override");
    window.gameInstance.robots.push(bot5);
    window.gameInstance.playfieldEl.appendChild(bot5.element);

    const hasClass = bot5.element.classList.contains("robot-override");
    const imgSrc = bot5.element.querySelector(".robot-image-art").src;
    const keyBadge = bot5.element.querySelector(".robot-key-badge");
    const assignedKey = bot5.assignedKey;
    const badgeText = keyBadge ? keyBadge.textContent : "";

    // 1st Double-Click (Stuns / Freezes the robot)
    window.gameInstance.inputEngine.handleTargetClick(bot5, { button: 0 });
    window.gameInstance.inputEngine.handleTargetClick(bot5, { button: 0 });

    const isOverridden = bot5.isOverridden;
    const hasOverriddenClass = bot5.element.classList.contains("overridden");

    // Movement test while frozen: call update and ensure normY does not advance
    const yBefore = bot5.normY;
    bot5.update(0.5, 800);
    const yAfter = bot5.normY;
    const stayedFrozen = yBefore === yAfter;

    // Wrong Key Test
    const wrongKey = assignedKey === "A" ? "Z" : "A";
    window.gameInstance.handleKeyboardOverride(wrongKey);
    const stillAliveAfterWrong = !bot5.destroyed;

    // Correct Key Test
    window.gameInstance.handleKeyboardOverride(assignedKey);
    const destroyedAfterCorrect = bot5.destroyed;
    const activeCount = window.gameInstance.robots.length;
    const scoreAfter = window.gameInstance.score;

    // Check restored state in DOM
    const el = document.querySelector('[data-id="501"]');
    const overrideRestoredPresent = !!(el && (el.classList.contains("restoring") || el.classList.contains("restored")));

    // Unfreeze check: advance update
    bot5.isRestoring = false; // fast forward past flicker
    const yBeforeMove = bot5.normY;
    bot5.update(0.5, 800);
    const movesDownHome = bot5.normY > yBeforeMove;
    const isNoLongerOverridden = bot5.isOverridden === false;
    const isFriendlyActive = (window.gameInstance.friendlyRobots || []).includes(bot5);

    return {
      hasClass,
      imgSrc,
      assignedKey,
      badgeText,
      isOverridden,
      hasOverriddenClass,
      stayedFrozen,
      stillAliveAfterWrong,
      destroyedAfterCorrect,
      activeCount,
      scoreAfter,
      overrideRestoredPresent,
      movesDownHome,
      isNoLongerOverridden,
      isFriendlyActive
    };
  })()`);

  assert("Override bot has 'robot-override' class", overrideMechanicsCheck.hasClass);
  assert("Override bot uses robot5-text-hacked.png image", overrideMechanicsCheck.imgSrc.includes("robot5-text-hacked.png"));
  assert("Key badge displays assigned key in upper cockpit chamber", overrideMechanicsCheck.badgeText === overrideMechanicsCheck.assignedKey);
  assert("Double-click freezes robot (isOverridden = true)", overrideMechanicsCheck.isOverridden);
  assert("Robot receives 'overridden' styling with electrical glow", overrideMechanicsCheck.hasOverriddenClass);
  assert("Frozen robot halts vertical movement completely", overrideMechanicsCheck.stayedFrozen);
  assert("Pressing wrong key does NOT destroy robot", overrideMechanicsCheck.stillAliveAfterWrong);
  assert("Pressing assigned key on keyboard destroys robot", overrideMechanicsCheck.destroyedAfterCorrect && overrideMechanicsCheck.activeCount === 0);
  assert("Keyboard override blast awards +200 points", overrideMechanicsCheck.scoreAfter === 200);
  assert("Circuit Snap & restored state trigger on keyboard restore", overrideMechanicsCheck.overrideRestoredPresent);
  assert("Restored override bot is no longer marked isOverridden = true", overrideMechanicsCheck.isNoLongerOverridden);
  assert("Restored override bot cruises rapidly downward towards base without wobbling", overrideMechanicsCheck.movesDownHome);
  assert("Restored override bot is tracked in friendlyRobots list", overrideMechanicsCheck.isFriendlyActive);

  // Test 10.2: Completion Hook Reports Mode & Mission
  console.log("\nTesting Completion Hook with Mode & Mission Details...");
  const hookCheck = await evalInPage(`(() => {
    let captured = null;
    window.onGameComplete = (data) => { captured = data; };
    window.gameInstance.completionEmitted = false;
    window.gameInstance.setMode("robot_override");
    window.gameInstance.endGame(true);
    return captured;
  })()`);
  assert("Completion hook captures mode = 'robot_override'", hookCheck.mode === "robot_override");
  assert("Completion hook captures mission = 3", hookCheck.mission === 3);
  assert("Completion hook reports victory = true", hookCheck.victory === true);

  // Test 10.3: Key 'P' Override Destroys Robot Without Pausing Game
  console.log("\nTesting Key 'P' Destruction vs Pause...");
  const pKeyCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("robot_override");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    const pBot = new Robot(777, 2, 10.0, false, "override");
    pBot.assignedKey = "P";
    const badge = pBot.element.querySelector(".robot-key-badge");
    if (badge) badge.textContent = "P";

    window.gameInstance.robots.push(pBot);
    window.gameInstance.playfieldEl.appendChild(pBot.element);

    // Double-click to freeze
    window.gameInstance.overrideRobot(pBot);
    const wasFrozen = pBot.isOverridden;

    // Simulate pressing 'p' keyboard key via DOM event
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "p", bubbles: true }));

    const stateAfterP = window.gameInstance.state;
    const isDestroyedAfterP = pBot.destroyed;

    return { wasFrozen, stateAfterP, isDestroyedAfterP };
  })()`);
  assert("Overridden robot with letter 'P' was successfully frozen", pKeyCheck.wasFrozen);
  assert("Pressing 'P' keyboard key does NOT pause the game (state remains ACTIVE)", pKeyCheck.stateAfterP === "active", `State was: ${pKeyCheck.stateAfterP}`);
  assert("Pressing 'P' keyboard key successfully destroys the 'P' robot", pKeyCheck.isDestroyedAfterP);

  // Test 10.3b: Key 'M' and 'H' Override Destroys Robots Without Mode Switch or Hitbox Toggles
  console.log("\nTesting Key 'M' and 'H' Destruction vs Shortcut Conflicts...");
  const mKeyCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("robot_override");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    const mBot = new Robot(888, 2, 10.0, false, "override");
    mBot.assignedKey = "M";
    window.gameInstance.robots.push(mBot);
    window.gameInstance.playfieldEl.appendChild(mBot.element);

    window.gameInstance.overrideRobot(mBot);

    // Simulate pressing 'm' keyboard key
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "m", bubbles: true }));

    const modeAfterM = window.gameInstance.currentModeId;
    const isDestroyedAfterM = mBot.destroyed;
    const hitboxesBeforeH = GAME_CONFIG.debugHitboxes;

    const hBot = new Robot(889, 3, 10.0, false, "override");
    hBot.assignedKey = "H";
    window.gameInstance.robots.push(hBot);
    window.gameInstance.playfieldEl.appendChild(hBot.element);
    window.gameInstance.overrideRobot(hBot);

    // Simulate pressing 'h' keyboard key
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "h", bubbles: true }));

    const isDestroyedAfterH = hBot.destroyed;
    const hitboxesAfterH = GAME_CONFIG.debugHitboxes;

    return { modeAfterM, isDestroyedAfterM, isDestroyedAfterH, hitboxesUnchanged: (hitboxesBeforeH === hitboxesAfterH) };
  })()`);
  assert("Pressing 'M' key does NOT restart or switch mode (mode remains 'robot_override')", mKeyCheck.modeAfterM === "robot_override");
  assert("Pressing 'M' key successfully destroys 'M' override robot", mKeyCheck.isDestroyedAfterM);
  assert("Pressing 'H' key does NOT toggle debug hitboxes", mKeyCheck.hitboxesUnchanged);
  assert("Pressing 'H' key successfully destroys 'H' override robot", mKeyCheck.isDestroyedAfterH);

  // Test 10.4: Wave 1 Robot Override Pacing (Strictly 1 Robot at a Time)
  console.log("\nTesting Robot Override Wave 1 Single-Robot Pacing...");
  const singleBotPacingCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("robot_override");
    window.gameInstance.startWave(1);
    window.gameInstance.clearAllRobots();
    window.gameInstance.spawnTimerMs = 0; // Trigger spawn

    // 1st tick spawns 1st robot
    window.gameInstance.updateActiveGame(0.1, 100);
    const countAfter1stSpawn = window.gameInstance.robots.filter(r => !r.destroyed && !r.escaped).length;

    // Further ticks with timer = 0 should NOT spawn 2nd robot because maxActive is 1
    window.gameInstance.spawnTimerMs = 0;
    window.gameInstance.updateActiveGame(0.1, 100);
    const countStill1 = window.gameInstance.robots.filter(r => !r.destroyed && !r.escaped).length;

    // Destroy 1st robot
    const firstBot = window.gameInstance.robots[0];
    window.gameInstance.destroyRobot(firstBot, "blue");
    const countAfterDestroy = window.gameInstance.robots.filter(r => !r.destroyed && !r.escaped).length;

    // Now spawn timer expires, next robot spawns
    window.gameInstance.spawnTimerMs = 0;
    window.gameInstance.updateActiveGame(0.1, 100);
    const countAfter2ndSpawn = window.gameInstance.robots.filter(r => !r.destroyed && !r.escaped).length;

    return { countAfter1stSpawn, countStill1, countAfterDestroy, countAfter2ndSpawn };
  })()`);
  assert("Wave 1 spawns initial robot", singleBotPacingCheck.countAfter1stSpawn === 1);
  assert("Wave 1 strictly caps active robots at 1 (no second robot spawns while first is alive)", singleBotPacingCheck.countStill1 === 1);
  assert("Active count drops to 0 on destruction", singleBotPacingCheck.countAfterDestroy === 0);
  assert("Next robot cleanly spawns after previous one is destroyed", singleBotPacingCheck.countAfter2ndSpawn === 1);

  // Test 11.1: Combo Streaks & Floating Combo Callouts
  console.log("\nTesting Combo System & Floating Callout Banners...");
  const comboCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("base_defense");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    const bot1 = new Robot(101, 1, 10, false, "standard");
    const bot2 = new Robot(102, 2, 10, false, "standard");
    const bot3 = new Robot(103, 3, 10, false, "standard");
    window.gameInstance.robots.push(bot1, bot2, bot3);
    window.gameInstance.playfieldEl.appendChild(bot1.element);
    window.gameInstance.playfieldEl.appendChild(bot2.element);
    window.gameInstance.playfieldEl.appendChild(bot3.element);

    // Initial combo is 0
    const comboInit = window.gameInstance.currentCombo;

    // Destroy 1st bot -> combo 1
    window.gameInstance.destroyRobot(bot1);
    const comboAfter1 = window.gameInstance.currentCombo;
    const bannerAfter1 = Boolean(document.querySelector('.floating-combo-banner'));

    // Destroy 2nd bot -> combo 2, callout spawns
    window.gameInstance.destroyRobot(bot2);
    const comboAfter2 = window.gameInstance.currentCombo;
    const bannerAfter2 = Boolean(document.querySelector('.floating-combo-banner'));
    const bannerText2 = document.querySelector('.floating-combo-banner')?.textContent || "";

    // Destroy 3rd bot -> combo 3
    window.gameInstance.destroyRobot(bot3);
    const comboAfter3 = window.gameInstance.currentCombo;
    const maxCombo = window.gameInstance.maxCombo;

    return { comboInit, comboAfter1, bannerAfter1, comboAfter2, bannerAfter2, bannerText2, comboAfter3, maxCombo };
  })()`);
  assert("Initial combo streak is 0", comboCheck.comboInit === 0);
  assert("Destroying 1 robot sets combo streak to 1", comboCheck.comboAfter1 === 1);
  assert("Combo banner does NOT show for combo = 1 (only >= 2)", comboCheck.bannerAfter1 === false);
  assert("Destroying 2nd robot increments combo to 2", comboCheck.comboAfter2 === 2);
  assert("Floating combo callout banner spawns on combo >= 2", comboCheck.bannerAfter2 === true);
  assert("Combo banner displays 'NICE! x2'", comboCheck.bannerText2.includes("NICE") && comboCheck.bannerText2.includes("2"));
  assert("Max combo tracks highest streak achieved (3)", comboCheck.maxCombo === 3);

  // Test 11.2: Combo Reset on Missed Key and Escaped Robot
  console.log("\nTesting Combo Streak Reset on Missed Key & Escaped Robot...");
  const comboResetCheck = await evalInPage(`(() => {
    window.gameInstance.currentCombo = 3;

    // Escaped robot resets combo
    const escapeBot = new Robot(201, 1, 10, false, "standard");
    window.gameInstance.robots.push(escapeBot);
    window.gameInstance.handleRobotEscaped(escapeBot);
    const comboAfterEscape = window.gameInstance.currentCombo;

    // Re-set combo to 4, test missed key in override mode
    window.gameInstance.currentCombo = 4;
    window.gameInstance.setMode("robot_override");
    const overBot = new Robot(202, 2, 10, false, "override");
    overBot.assignedKey = "A";
    overBot.isOverridden = true;
    window.gameInstance.robots.push(overBot);
    window.gameInstance.handleKeyboardOverride("Z"); // Wrong key!
    const comboAfterWrongKey = window.gameInstance.currentCombo;

    return { comboAfterEscape, comboAfterWrongKey };
  })()`);
  assert("Escaped robot resets combo streak to 0", comboResetCheck.comboAfterEscape === 0);
  assert("Pressing wrong key resets combo streak to 0", comboResetCheck.comboAfterWrongKey === 0);

  // Test 11.3: Holographic 3D Keycap Pop on Keyboard Override Match
  console.log("\nTesting Holographic Keycap Pop on Override Match...");
  const keycapCheck = await evalInPage(`(() => {
    window.gameInstance.setMode("robot_override");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    const overBot = new Robot(301, 2, 10, false, "override");
    overBot.assignedKey = "K";
    window.gameInstance.robots.push(overBot);
    window.gameInstance.playfieldEl.appendChild(overBot.element);

    window.gameInstance.overrideRobot(overBot);
    window.gameInstance.handleKeyboardOverride("K");

    const keycapEl = document.querySelector(".holographic-keycap");
    const keycapText = keycapEl?.textContent;
    return {
      hasKeycap: Boolean(keycapEl),
      keycapText
    };
  })()`);
  assert("Holographic keycap pop element (.holographic-keycap) spawns on key override", keycapCheck.hasKeycap === true);
  assert("Holographic keycap displays the pressed letter 'K'", keycapCheck.keycapText === "K");

  // Test 11.4: 3-Star Rating System & Rank Badge
  console.log("\nTesting 3-Star Rating System & Rank Badge Calculation...");
  const starCheck = await evalInPage(`(() => {
    window.gameInstance.setLanguage("en");

    // Case 1: Victory with max shields (6/6) -> 3 stars
    window.gameInstance.maxShields = 6;
    window.gameInstance.shields = 6;
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);
    const stars3 = window.gameInstance.starsEarned;
    const rank3En = document.getElementById("res-star-rank-en").textContent;

    // Case 2: Victory with 3/6 shields -> 2 stars
    window.gameInstance.maxShields = 6;
    window.gameInstance.shields = 3;
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);
    const stars2 = window.gameInstance.starsEarned;
    const rank2En = document.getElementById("res-star-rank-en").textContent;

    // Case 3: Victory with 1/6 shields -> 1 star
    window.gameInstance.maxShields = 6;
    window.gameInstance.shields = 1;
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);
    const stars1 = window.gameInstance.starsEarned;
    const rank1En = document.getElementById("res-star-rank-en").textContent;

    // Case 4: Defeat -> 0 stars
    window.gameInstance.shields = 0;
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(false);
    const stars0 = window.gameInstance.starsEarned;
    const rank0En = document.getElementById("res-star-rank-en").textContent;

    return { stars3, rank3En, stars2, rank2En, stars1, rank1En, stars0, rank0En };
  })()`);
  assert("Victory with full shields awards 3 Stars", starCheck.stars3 === 3);
  assert("3 Stars rank title is 'DEFENSE MASTER!'", starCheck.rank3En === "DEFENSE MASTER!");
  assert("Victory with 50% shields awards 2 Stars", starCheck.stars2 === 2);
  assert("2 Stars rank title is 'GREAT DEFENDER!'", starCheck.rank2En === "GREAT DEFENDER!");
  assert("Victory with 1 shield awards 1 Star", starCheck.stars1 === 1);
  assert("1 Star rank title is 'BASE SECURED!'", starCheck.rank1En === "BASE SECURED!");
  assert("Defeat awards 0 Stars", starCheck.stars0 === 0);
  assert("0 Stars rank title is 'TRY AGAIN!'", starCheck.rank0En === "TRY AGAIN!");

  // Test 11.5: Sequential Star Pop Visuals & Zero-Kanji Japanese Rank Subtext
  console.log("\nTesting Star Slots & Zero-Kanji Japanese Subtitles...");
  await evalInPage("window.gameInstance.setLanguage('ja')");
  await evalInPage(`(() => {
    window.gameInstance.maxShields = 6;
    window.gameInstance.shields = 6;
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);
  })()`);
  await wait(950); // Wait for sequential star animations (260ms, 580ms, 900ms)

  const starDomCheck = await evalInPage(`(() => {
    const star1Earned = document.getElementById("res-star-1").classList.contains("earned");
    const star2Earned = document.getElementById("res-star-2").classList.contains("earned");
    const star3Earned = document.getElementById("res-star-3").classList.contains("earned");
    const rankSubJa = document.getElementById("res-star-rank-sub").textContent;
    const kanjiRegex = /[\\u4E00-\\u9FAF]/g;
    const hasKanji = kanjiRegex.test(rankSubJa);

    return { star1Earned, star2Earned, star3Earned, rankSubJa, hasKanji };
  })()`);
  assert("Star slot 1 earned class applied", starDomCheck.star1Earned === true);
  assert("Star slot 2 earned class applied", starDomCheck.star2Earned === true);
  assert("Star slot 3 earned class applied", starDomCheck.star3Earned === true);
  assert("Japanese 3-Star Rank badge subtitle matches 'パーフェクト ぼうえい！'", starDomCheck.rankSubJa === "パーフェクト ぼうえい！");
  assert("Japanese Star Rank badge contains 0 Kanji (strictly Hiragana & Katakana)", starDomCheck.hasKanji === false);

  // Test 11.6: Cyber Hero Meta Rewards (XP & Credits) in UI & Completion Hook
  console.log("\nTesting Cyber Hero Meta Economy (XP & Credits)...");
  const rewardsCheck = await evalInPage(`(() => {
    let capturedHook = null;
    window.onGameComplete = (data) => { capturedHook = data; };

    window.gameInstance.setMode("robot_override");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    // Destroy 2 robots to generate combo and meta currency
    const r1 = new Robot(401, 1, 10, false, "override");
    const r2 = new Robot(402, 2, 10, false, "override");
    window.gameInstance.robots.push(r1, r2);
    window.gameInstance.destroyRobot(r1, "blue");
    window.gameInstance.destroyRobot(r2, "blue");

    // Complete run
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);

    const xpUi = document.getElementById("res-reward-xp").textContent;
    const creditsUi = document.getElementById("res-reward-credits").textContent;

    return {
      xpUi,
      creditsUi,
      capturedHook
    };
  })()`);

  assert("Results screen displays earned XP chip (e.g. +139 XP)", rewardsCheck.xpUi.includes("XP") && parseInt(rewardsCheck.xpUi.replace(/[^0-9]/g, ""), 10) > 0);
  assert("Results screen displays earned Credits chip (e.g. +69)", parseInt(rewardsCheck.creditsUi.replace(/[^0-9]/g, ""), 10) > 0);
  assert("Completion telemetry hook captures starsEarned (1-3)", rewardsCheck.capturedHook.starsEarned >= 1 && rewardsCheck.capturedHook.starsEarned <= 3);
  assert("Completion telemetry hook captures earnedXP", rewardsCheck.capturedHook.earnedXP > 0);
  assert("Completion telemetry hook captures earnedCredits", rewardsCheck.capturedHook.earnedCredits > 0);
  assert("Completion telemetry hook captures maxCombo", rewardsCheck.capturedHook.maxCombo === 2);

  // =========================================================================
  // TEST SECTION 12: JUICE-UP, SPAWN BALANCE, DUAL CURRENCY, & TYPOGRAPHY
  // =========================================================================
  console.log("\n--- TESTING SPAWN BALANCE, WAVE STARS, DUAL CREDITS & TYPOGRAPHY ---\n");

  // Test 12.1: Lane Spawn Balance (No Left-Side Bias)
  console.log("Testing Lane Spawn Fairness across 100 spawns...");
  const spawnDistribution = await evalInPage(`(() => {
    window.gameInstance.setMode("base_defense");
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.state = GAME_STATES.ACTIVE;
    window.gameInstance.clearAllRobots();

    const laneCounts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 100; i++) {
      window.gameInstance.spawnRobot(10);
      const lastBot = window.gameInstance.robots[window.gameInstance.robots.length - 1];
      if (lastBot) {
        laneCounts[lastBot.laneIndex]++;
      }
      window.gameInstance.clearAllRobots();
    }
    const leftCount = laneCounts[0] + laneCounts[1];
    const rightCount = laneCounts[3] + laneCounts[4];
    return { laneCounts, leftCount, rightCount };
  })()`);

  console.log("Lane spawn counts [0..4]:", spawnDistribution.laneCounts);
  assert("Every lane (0, 1, 2, 3, 4) gets spawned robots (> 10 out of 100)", spawnDistribution.laneCounts.every(c => c >= 10));
  assert("Left lanes (0, 1) and Right lanes (3, 4) are well-balanced (|left - right| < 25)", Math.abs(spawnDistribution.leftCount - spawnDistribution.rightCount) < 25);

  // Test 12.2: Floating Wave Stars Overlay (Juice-Up)
  console.log("\nTesting Floating Wave Stars Overlay...");
  const starOverlayCheck = await evalInPage(`(() => {
    const overlay = document.getElementById("floating-wave-stars-overlay");
    const bg = window.getComputedStyle(overlay).backgroundColor;
    
    // Call showWaveStars with 2 stars
    window.gameInstance.showWaveStars(2, "TEST WAVE 2", "GREAT JOB!", null, 1500);

    const isVisible = overlay.style.display !== "none";
    const renderedStars = overlay.querySelectorAll(".floating-wave-star").length;
    const starStyle = renderedStars > 0 ? window.getComputedStyle(overlay.querySelector(".floating-wave-star")) : null;
    const hasBurstAnim = starStyle && starStyle.animationName.includes("floatingStarBurst");
    const titleText = document.getElementById("floating-stars-title-en")?.textContent || "";

    return {
      bg,
      isVisible,
      renderedStars,
      hasBurstAnim,
      titleText
    };
  })()`);

  assert("Wave stars overlay has transparent/no background", starOverlayCheck.bg.includes("rgba(0, 0, 0, 0)") || starOverlayCheck.bg === "transparent");
  assert("Wave stars overlay activates with visible display", starOverlayCheck.isVisible === true);
  assert("Wave stars overlay renders correct star count (2 stars)", starOverlayCheck.renderedStars === 2);
  assert("Wave stars have rubber-band burst animation applied", starOverlayCheck.hasBurstAnim === true);
  assert("Wave stars overlay displays wave clear title", starOverlayCheck.titleText.includes("TEST WAVE 2"));

  // Test 12.3: Dual Currency Redesign (Training Credits vs Cyber Hero Credit)
  console.log("\nTesting Dual Currency (Training Credits + Cyber Hero Credit)...");
  const dualCurrencyCheck = await evalInPage(`(() => {
    let telemetryHook = null;
    window.onGameComplete = (d) => { telemetryHook = d; };

    // Victory run
    window.gameInstance.completionEmitted = false;
    window.gameInstance.endGame(true);

    const trainChip = document.getElementById("res-reward-credits");
    const cyberChip = document.getElementById("res-reward-cyber-credits");
    const cyberChipContainer = document.getElementById("res-cyber-hero-chip");
    const coinSymbol = cyberChipContainer.querySelector("text")?.textContent;

    return {
      trainChipText: trainChip?.textContent,
      cyberChipText: cyberChip?.textContent,
      cyberVisible: cyberChipContainer && window.getComputedStyle(cyberChipContainer).display !== "none",
      coinSymbol,
      telemetryHook
    };
  })()`);

  assert("Training Credits chip displays earned training credits", parseInt(dualCurrencyCheck.trainChipText.replace(/[^0-9]/g, ""), 10) > 0);
  assert("Cyber Hero Credit chip displays +1 on 3-wave victory", dualCurrencyCheck.cyberChipText.trim() === "+1");
  assert("Cyber Hero Credit container is visible on victory", dualCurrencyCheck.cyberVisible === true);
  assert("Cyber Hero Coin features embossed 'C' symbol", dualCurrencyCheck.coinSymbol === "C");
  assert("Telemetry hook reports cyberHeroCredits = 1 on victory", dualCurrencyCheck.telemetryHook.cyberHeroCredits === 1);
  assert("Telemetry hook reports trainingCredits as numeric", dualCurrencyCheck.telemetryHook.trainingCredits > 0);

  // Test 12.4: Kid-Friendly Typography & Results Screen Gentle Breathing Animation
  console.log("\nTesting Kid-Friendly Typography & Breathing Animation...");
  // Allow 500ms transition for results screen to become active
  await wait(600);
  const typographyCheck = await evalInPage(`(() => {
    const rootStyle = window.getComputedStyle(document.body);
    const card = document.querySelector("#screen-results .screen-card");
    const cardStyle = window.getComputedStyle(card);

    return {
      fontFamily: rootStyle.fontFamily,
      cardAnim: cardStyle.animationName,
      titleFontSize: parseFloat(window.getComputedStyle(document.querySelector(".screen-title")).fontSize)
    };
  })()`);

  assert("Font family includes Fredoka and M PLUS Rounded 1c", typographyCheck.fontFamily.includes("Fredoka") || typographyCheck.fontFamily.includes("Rounded"));
  assert("Screen title font size is larger (>= 28px)", typographyCheck.titleFontSize >= 28);
  assert("Results screen card has breathing animation ('gentleScreenBreathe')", typographyCheck.cardAnim.includes("gentleScreenBreathe"));

  // ===========================================================================
  // TEST SECTION 13: EXTENDED CIRCUIT LIGHTNING, MALWARE PURGE FLICKER, & DOWNWARD BASE DOCKING
  // ===========================================================================
  console.log("\n--- TEST SECTION 13: EXTENDED CIRCUIT LIGHTNING, PURGE FLICKER & SAFE DOCKING ---");

  // Test 13.1: Extended Circuit Lightning Duration (> 300ms)
  console.log("\nTesting Extended Circuit Lightning Duration (> 300ms)...");
  const circuitSnapCheck = await evalInPage(`(() => {
    const snapLayer = document.getElementById("circuit-snap-layer");
    window.gameInstance.effects.triggerCircuitSnap(200, 500, 200, 100);
    const hasInitialSvg = snapLayer.innerHTML.includes("<path") && snapLayer.innerHTML.includes("circle");
    return { hasInitialSvg };
  })()`);
  assert("Circuit lightning renders SVG path traces and nodes immediately", circuitSnapCheck.hasInitialSvg);

  await wait(280);
  const circuitStillActive = await evalInPage(`(() => {
    const snapLayer = document.getElementById("circuit-snap-layer");
    return snapLayer.innerHTML.includes("<path");
  })()`);
  assert("Circuit lightning persists beyond 280ms (extended duration vs old 115ms)", circuitStillActive === true);

  await wait(240); // total 520ms
  const circuitCleared = await evalInPage(`(() => {
    const snapLayer = document.getElementById("circuit-snap-layer");
    return snapLayer.innerHTML === "";
  })()`);
  assert("Circuit lightning cleanly clears after ~460ms", circuitCleared === true);

  // Test 13.2: Friendly Robot Downward Movement & Immunity to Defense Line Damage
  console.log("\nTesting Restored Robot Downward Movement & 0 Shield Loss...");
  const downwardMoveCheck = await evalInPage(`(() => {
    window.gameInstance.clearAllRobots();
    window.gameInstance.friendlyRobots = [];
    window.gameInstance.shields = 3;
    window.gameInstance.score = 1000;

    // Create and spawn a robot
    const r = new Robot(901, 2, 4.0, false, "standard");
    r.normY = 0.4;
    window.gameInstance.robots.push(r);
    window.gameInstance.playfieldEl.appendChild(r.element);

    // Call restore
    r.restore(300, 300);
    const isRestoredSet = r.isRestored === true;
    const isRestoringInitial = r.isRestoring === true;

    // Movement while isRestoring should be paused (in place)
    const yBefore = r.normY;
    r.update(0.1, 800);
    const pausedDuringFlicker = r.normY === yBefore;

    // Fast-forward past flicker (simulate flicker end)
    r.isRestoring = false;
    r.element.classList.remove("restoring");
    r.element.classList.add("restored");

    // Move downward
    r.update(0.5, 800);
    const movedDownward = r.normY > yBefore;

    // Advance across defense line (normY >= GAME_CONFIG.defenseLineYNorm, e.g. 0.82)
    r.normY = GAME_CONFIG.defenseLineYNorm + 0.02;
    r.update(0.01, 800);
    const didNotEscape = r.escaped === false;
    const shieldsIntact = window.gameInstance.shields === 3;

    return {
      isRestoredSet,
      isRestoringInitial,
      pausedDuringFlicker,
      movedDownward,
      didNotEscape,
      shieldsIntact,
      finalY: r.normY
    };
  })()`);

  assert("Robot marks isRestored = true on restore", downwardMoveCheck.isRestoredSet);
  assert("Robot pauses movement during malware purge flicker", downwardMoveCheck.pausedDuringFlicker);
  assert("Restored robot moves downward towards the base (normY increases)", downwardMoveCheck.movedDownward);
  assert("Restored robot crosses defense line without triggering 'escaped'", downwardMoveCheck.didNotEscape);
  assert("Restored robot causes 0 shield damage to player base", downwardMoveCheck.shieldsIntact);

  // Test 13.3: Safe Arrival Base Docking, Audio & +50 Score Callout (Zero-Kanji in Japanese)
  console.log("\nTesting Safe Arrival Docking & Japanese Zero-Kanji Callout...");
  const safeDockCheck = await evalInPage(`(() => {
    window.gameInstance.setLanguage("ja");
    const scoreBefore = window.gameInstance.score;
    const savedBefore = window.gameInstance.safeRobotsSaved || 0;

    // Create a restored robot positioned right at docking threshold (normY = 0.88)
    const r = new Robot(902, 2, 4.0, false, "standard");
    r.normY = 0.88;
    r.isRestored = true;
    r.isRestoring = false;
    window.gameInstance.friendlyRobots = [r];
    window.gameInstance.playfieldEl.appendChild(r.element);

    // Call update to trigger safe arrival docking
    r.update(0.05, 800);

    const isDocked = r.isDocked === true;
    const hasDockingClass = r.element.classList.contains("docking");
    const scoreAfter = window.gameInstance.score;
    const savedAfter = window.gameInstance.safeRobotsSaved;

    // Check floating score callout in DOM
    const floatingScores = Array.from(document.querySelectorAll(".floating-score"));
    const lastScoreText = floatingScores[floatingScores.length - 1]?.textContent || "";

    // Check Zero Kanji in Japanese safe text
    const kanjiRegex = /[\\u4e00-\\u9faf]/;
    const hasNoKanji = !kanjiRegex.test(lastScoreText);

    // Restore English
    window.gameInstance.setLanguage("en");

    return {
      isDocked,
      hasDockingClass,
      awarded50: scoreAfter === scoreBefore + 50,
      savedIncremented: savedAfter === savedBefore + 1,
      lastScoreText,
      hasNoKanji
    };
  })()`);

  assert("Robot receives isDocked = true and .docking class at base", safeDockCheck.isDocked && safeDockCheck.hasDockingClass);
  assert("Safe arrival awards +50 bonus score", safeDockCheck.awarded50);
  assert("safeRobotsSaved counter increments on safe arrival", safeDockCheck.savedIncremented);
  assert("Japanese safe arrival text uses 'あんぜん！ +50'", safeDockCheck.lastScoreText.includes("あんぜん！") && safeDockCheck.lastScoreText.includes("+50"));
  assert("Japanese safe arrival text contains ZERO Kanji characters", safeDockCheck.hasNoKanji);

  // ===========================================================================
  // TEST SECTION 14: ZERO CORNER ARTIFACTS & ANIMATED CYAN AIMING RETICLE
  // ===========================================================================
  console.log("\n--- TEST SECTION 14: ZERO CORNER ARTIFACTS & CYAN AIMING RETICLE ---");

  // Test 14.1: Robot Position Integrity During Restoration (Zero Corner Teleportation)
  console.log("\nTesting Zero Corner Teleportation during Restoration...");
  const cornerArtifactCheck = await evalInPage(`(() => {
    window.gameInstance.clearAllRobots();
    const w = window.gameInstance.playfieldEl.clientWidth;
    const h = window.gameInstance.playfieldEl.clientHeight;

    // Spawn robot in lane 2 (middle of field)
    const bot = new Robot(903, 2, 6.0, false, "standard");
    bot.normY = 0.45;
    window.gameInstance.robots.push(bot);
    window.gameInstance.playfieldEl.appendChild(bot.element);
    bot.render(w, h);

    const expectedX = bot.normX * w;
    const expectedY = bot.normY * h;
    const leftBefore = parseFloat(bot.element.style.left);
    const topBefore = parseFloat(bot.element.style.top);

    // Call restore
    bot.restore(expectedX, expectedY);

    // Immediately check if the robot jumped to top-left corner (0, 0)
    const leftDuring = parseFloat(bot.element.style.left);
    const topDuring = parseFloat(bot.element.style.top);
    const hasRestoring = bot.element.classList.contains("restoring");
    const visualHasAnim = window.getComputedStyle(bot.element.querySelector(".robot-visual")).animationName.includes("restoreVisualShake");

    return {
      leftBefore,
      topBefore,
      leftDuring,
      topDuring,
      expectedX,
      expectedY,
      hasRestoring,
      visualHasAnim,
      isNearCenter: Math.abs(leftDuring - expectedX) < 2 && Math.abs(topDuring - expectedY) < 2,
      isNotZeroZero: leftDuring > 50 && topDuring > 50
    };
  })()`);

  assert("Robot has non-zero initial left and top coordinates", cornerArtifactCheck.leftBefore > 50 && cornerArtifactCheck.topBefore > 50);
  assert("Robot element retains correct in-lane left and top coordinates during restore", cornerArtifactCheck.isNearCenter);
  assert("Robot does NOT teleport to top-left corner (0, 0) when restored", cornerArtifactCheck.isNotZeroZero);
  assert("Restoration shake animation is applied strictly to .robot-visual", cornerArtifactCheck.visualHasAnim);

  // Test 14.2: Playfield Cursor Hiding & Cyan Aiming Reticle Structure
  console.log("\nTesting Cyan Aiming Reticle Cursor Structure & CSS...");
  const reticleDomCheck = await evalInPage(`(() => {
    const playfield = document.getElementById("playfield");
    const pfStyle = window.getComputedStyle(playfield);
    const reticle = document.getElementById("playfield-reticle");
    const svg = reticle ? reticle.querySelector(".reticle-svg") : null;
    const brackets = reticle ? reticle.querySelectorAll(".reticle-bracket") : [];
    const innerRing = reticle ? reticle.querySelector(".reticle-inner-ring") : null;
    const centerDot = reticle ? reticle.querySelector(".reticle-center-dot") : null;

    return {
      playfieldCursor: pfStyle.cursor,
      hasReticle: !!reticle,
      hasSvg: !!svg,
      bracketCount: brackets.length,
      hasInnerRing: !!innerRing,
      hasCenterDot: !!centerDot,
      reticleZIndex: parseInt(window.getComputedStyle(reticle).zIndex, 10)
    };
  })()`);

  assert("Playfield has cursor set to 'none'", reticleDomCheck.playfieldCursor === "none");
  assert("Cyan Aiming Reticle element exists in playfield", reticleDomCheck.hasReticle && reticleDomCheck.hasSvg);
  assert("Reticle contains 4 rounded quadrant targeting brackets", reticleDomCheck.bracketCount === 4);
  assert("Reticle contains inner scan ring and precision center dot", reticleDomCheck.hasInnerRing && reticleDomCheck.hasCenterDot);
  assert("Reticle has high z-index (>= 100) to render above game entities", reticleDomCheck.reticleZIndex >= 100);

  // Test 14.3: Reticle Pointer Movement & Target Hover Feedback
  console.log("\nTesting Reticle Pointermove & Target Lock-On...");
  const reticleInteractionCheck = await evalInPage(`(() => {
    const playfield = document.getElementById("playfield");
    const reticle = document.getElementById("playfield-reticle");
    const rect = playfield.getBoundingClientRect();

    // Spawn a target robot
    window.gameInstance.clearAllRobots();
    const w = playfield.clientWidth;
    const h = playfield.clientHeight;
    const bot = new Robot(904, 2, 6.0, false, "standard");
    bot.normY = 0.5;
    window.gameInstance.robots.push(bot);
    playfield.appendChild(bot.element);
    bot.render(w, h);

    const botRect = bot.element.getBoundingClientRect();
    const botCenterX = botRect.left + botRect.width / 2;
    const botCenterY = botRect.top + botRect.height / 2;

    // Simulate pointermove over empty playfield
    const emptyX = rect.left + 50;
    const emptyY = rect.top + 50;
    playfield.dispatchEvent(new PointerEvent("pointermove", { clientX: emptyX, clientY: emptyY, bubbles: true }));

    const opacityOnMove = reticle.style.opacity;
    const hasLockOnEmpty = reticle.classList.contains("targeting-robot");

    // Simulate pointermove directly over target robot (bubbles to playfield)
    bot.element.dispatchEvent(new PointerEvent("pointermove", { clientX: botCenterX, clientY: botCenterY, bubbles: true }));
    const hasLockOnRobot = reticle.classList.contains("targeting-robot");

    // Simulate pointerleave
    playfield.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    const opacityOnLeave = reticle.style.opacity;

    return {
      opacityOnMove,
      hasLockOnEmpty,
      hasLockOnRobot,
      opacityOnLeave
    };
  })()`);

  assert("Reticle becomes visible (style.opacity = '1') on pointermove", reticleInteractionCheck.opacityOnMove === "1");
  assert("Reticle does not activate lock-on over empty space", reticleInteractionCheck.hasLockOnEmpty === false);
  assert("Reticle activates 'targeting-robot' lock-on state over hostile robot", reticleInteractionCheck.hasLockOnRobot === true);
  assert("Reticle hides (style.opacity = '0') when pointer leaves playfield", reticleInteractionCheck.opacityOnLeave === "0");

  // --- TEST SECTION 15: ULTRA ENDLESS DIFFICULTY & CONFIRMATION MODAL ---
  console.log("\n--- TEST SECTION 15: ULTRA ENDLESS DIFFICULTY & CONFIRMATION MODAL ---");

  // Test 15.1: Ultra Button Existence & Red Styling
  console.log("\nTesting Ultra Difficulty Button & Red Styling...");
  const ultraBtnInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    const btn = document.querySelector(".diff-btn.diff-ultra");
    if (!btn) return { exists: false };
    const style = window.getComputedStyle(btn);
    const mainEn = btn.querySelector(".main-en")?.textContent.trim();

    game.setLanguage("ja");
    const subLangJa = btn.querySelector(".sub-lang")?.textContent.trim();
    game.setLanguage("en");

    return {
      exists: true,
      dataDiff: btn.getAttribute("data-diff"),
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      color: style.color,
      mainEn,
      subLangJa
    };
  })()`);

  assert("Ultra button (.diff-btn.diff-ultra) exists in difficulty options", ultraBtnInfo.exists === true);
  assert("Ultra button has data-diff='ultra'", ultraBtnInfo.dataDiff === "ultra");
  assert("Ultra button has red frame border (e.g. #ef4444 / rgb(239, 68, 68))", ultraBtnInfo.borderColor.includes("239") || ultraBtnInfo.borderColor.includes("248"));
  assert("Ultra button solid red background removed in favor of red frame", !ultraBtnInfo.backgroundColor.includes("185"));
  assert("Ultra button main label is 'Ultra'", ultraBtnInfo.mainEn === "Ultra");
  assert("Ultra button Japanese sub-label is 'ウルトラ'", ultraBtnInfo.subLangJa === "ウルトラ");

  // Test 15.2: Ultra Button Mode Filtering (Mission 1 & 2 vs Mission 3)
  console.log("\nTesting Ultra Button Visibility across Modes...");
  const modeVisibilityInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    const btn = document.querySelector(".diff-btn.diff-ultra");

    // Test Base Defense
    game.setMode("base_defense");
    const baseDefDisplay = window.getComputedStyle(btn).display;

    // Test Reinforcements
    game.setMode("reinforcements");
    const reinDisplay = window.getComputedStyle(btn).display;

    // Test Robot Override
    game.setMode("robot_override");
    const overrideDisplay = window.getComputedStyle(btn).display;

    // Test difficulty fallback if Ultra was active when switching to Robot Override
    game.selectedDifficulty = "ultra";
    game.setMode("robot_override");
    const fallbackDiff = game.selectedDifficulty;

    // Switch back to Base Defense
    game.setMode("base_defense");
    const restoredDisplay = window.getComputedStyle(btn).display;

    return {
      baseDefDisplay,
      reinDisplay,
      overrideDisplay,
      fallbackDiff,
      restoredDisplay
    };
  })()`);

  assert("Ultra button is visible in Mission 1 (Base Defense)", modeVisibilityInfo.baseDefDisplay !== "none");
  assert("Ultra button is visible in Mission 2 (Reinforcements)", modeVisibilityInfo.reinDisplay !== "none");
  assert("Ultra button is HIDDEN (display: none) in Mission 3 (Robot Override)", modeVisibilityInfo.overrideDisplay === "none");
  assert("Switching to Robot Override resets difficulty away from Ultra to 'normal'", modeVisibilityInfo.fallbackDiff === "normal");
  assert("Switching back to Base Defense restores Ultra button visibility", modeVisibilityInfo.restoredDisplay !== "none");

  // Test 15.3: Ultra Confirmation Modal Flow & Localization
  console.log("\nTesting Ultra Confirmation Modal Flow & Translations...");
  const modalFlowInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("base_defense");
    game.setLanguage("en");

    const ultraBtn = document.querySelector(".diff-btn.diff-ultra");
    const modal = document.getElementById("modal-ultra-confirm");
    const titleEl = modal.querySelector(".screen-title .main-en");
    const msgEl = modal.querySelector(".screen-subtitle .main-en");
    const proceedBtn = document.getElementById("ultra-confirm-proceed-btn");
    const cancelBtn = document.getElementById("ultra-confirm-cancel-btn");

    // Click Ultra button -> modal should become active, difficulty not yet ultra
    ultraBtn.click();
    const modalActiveOnInitialClick = modal.classList.contains("active");
    const diffBeforeProceed = game.selectedDifficulty;

    // Click Cancel -> modal closes, difficulty unchanged
    cancelBtn.click();
    const modalClosedOnCancel = !modal.classList.contains("active");
    const diffAfterCancel = game.selectedDifficulty;

    // Click Ultra button again -> modal becomes active
    ultraBtn.click();
    // Click Proceed -> modal closes, difficulty changes to ultra
    proceedBtn.click();
    const modalClosedOnProceed = !modal.classList.contains("active");
    const diffAfterProceed = game.selectedDifficulty;
    const isUltraSelected = ultraBtn.classList.contains("selected");

    // Test Translations in Modal (JA with Zero Kanji check & IT)
    game.setLanguage("ja");
    const titleJa = modal.querySelector(".screen-title .sub-lang")?.textContent.trim();
    const msgJa = modal.querySelector(".screen-subtitle .sub-lang")?.textContent.trim();
    const proceedJa = proceedBtn.querySelector(".sub-lang")?.textContent.trim();
    const cancelJa = cancelBtn.querySelector(".sub-lang")?.textContent.trim();

    const kanjiRegex = /[\\u4E00-\\u9FAF\\u3400-\\u4DBF]/g;
    const jaHasKanji = kanjiRegex.test(titleJa + msgJa + proceedJa + cancelJa);

    game.setLanguage("it");
    const titleIt = modal.querySelector(".screen-title .sub-lang")?.textContent.trim();
    const msgIt = modal.querySelector(".screen-subtitle .sub-lang")?.textContent.trim();

    // Reset language to English
    game.setLanguage("en");

    return {
      modalActiveOnInitialClick,
      diffBeforeProceed,
      modalClosedOnCancel,
      diffAfterCancel,
      modalClosedOnProceed,
      diffAfterProceed,
      isUltraSelected,
      titleJa,
      msgJa,
      jaHasKanji,
      titleIt,
      msgIt
    };
  })()`);

  assert("Clicking Ultra button displays confirmation modal (.modal-overlay.active)", modalFlowInfo.modalActiveOnInitialClick === true);
  assert("Difficulty is NOT set to ultra before proceeding", modalFlowInfo.diffBeforeProceed !== "ultra");
  assert("Clicking Cancel closes the confirmation modal", modalFlowInfo.modalClosedOnCancel === true);
  assert("Clicking Cancel retains previous difficulty", modalFlowInfo.diffAfterCancel !== "ultra");
  assert("Clicking Proceed closes modal and selects Ultra difficulty", modalFlowInfo.modalClosedOnProceed === true && modalFlowInfo.diffAfterProceed === "ultra");
  assert("Ultra button receives 'selected' class on proceed", modalFlowInfo.isUltraSelected === true);
  assert("Japanese modal prompt matches 'ここへ すすみますか？ このレベルは エキスパートの くんれんせい むけです。'", modalFlowInfo.msgJa.includes("ここへ すすみますか？"));
  assert("Japanese modal prompt contains ZERO Kanji characters", modalFlowInfo.jaHasKanji === false);
  assert("Italian modal prompt matches 'Sei sicuro di voler procedere? Questo livello è per allievi esperti.'", modalFlowInfo.msgIt.includes("Sei sicuro"));

  // Test 15.4: Endless Waves Progression & HUD Display
  console.log("\nTesting Ultra Endless Wave Progression & HUD...");
  const endlessWaveInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("base_defense");
    game.selectedDifficulty = "ultra";
    game.totalWaves = Infinity;
    game.currentWave = 1;
    game.shields = 4;
    game.maxShields = 4;
    game.updateHUD();

    const hudWaveTextEn = document.getElementById("hud-wave-text").textContent;
    game.setLanguage("ja");
    const hudWaveSubJa = document.getElementById("hud-wave-sub").textContent;
    game.setLanguage("en");

    // Simulate clearing Wave 1 in Ultra mode
    game.state = "active";
    game.handleWaveCompleted();
    const stateAfterWave1 = game.state; // should be 'intermission'

    // Manually advance to Wave 2
    game.startWave(2);
    const wave2SpawnCount = game.waveRobotsToSpawn;
    const wave2Interval = game.spawnIntervalMs;

    // Advance to Wave 5
    game.startWave(5);
    const wave5SpawnCount = game.waveRobotsToSpawn;
    const wave5Interval = game.spawnIntervalMs;

    return {
      totalWavesIsInf: game.totalWaves === Infinity,
      hudWaveTextEn,
      hudWaveSubJa,
      stateAfterWave1,
      wave2SpawnCount,
      wave5SpawnCount,
      intervalProgressive: wave5Interval < wave2Interval
    };
  })()`);

  assert("Ultra mode totalWaves is Infinity", endlessWaveInfo.totalWavesIsInf === true);
  assert("HUD wave text displays 'WAVE 1 / ∞'", endlessWaveInfo.hudWaveTextEn.includes("∞"));
  assert("Japanese HUD wave text displays 'むげん' with Zero Kanji", endlessWaveInfo.hudWaveSubJa.includes("むげん"));
  assert("Wave completion in Ultra triggers intermission instead of immediate victory", endlessWaveInfo.stateAfterWave1 === "intermission");
  assert("Wave robot spawns scale upward (Wave 5 spawn count > Wave 2 spawn count)", endlessWaveInfo.wave5SpawnCount > endlessWaveInfo.wave2SpawnCount);
  assert("Wave spawn interval tightens progressively as waves advance", endlessWaveInfo.intervalProgressive === true);

  // Test 15.5: Ultra Mode Survival Star Brackets & Meta Economy on Defeat
  console.log("\nTesting Survival Star Brackets (0, 1, 2, 3 Stars) on Defeat...");
  const survivalStarBrackets = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("base_defense");
    game.selectedDifficulty = "ultra";
    game.totalWaves = Infinity;

    // 1. Defeat in Wave 1 (0 waves survived)
    game.currentWave = 1;
    game.shields = 0;
    game.earnedXP = 0;
    game.earnedCredits = 0;
    game.endGame(false);
    const starsW1 = game.starsEarned;
    const rankEnW1 = document.getElementById("res-star-rank-en")?.textContent;
    const cyberCreditW1 = document.getElementById("res-reward-cyber-credits")?.textContent;

    // 2. Defeat in Wave 2 (1 wave survived -> 1 Star)
    game.currentWave = 2;
    game.shields = 0;
    game.endGame(false);
    const starsW2 = game.starsEarned;
    const rankEnW2 = document.getElementById("res-star-rank-en")?.textContent;
    const cyberCreditW2 = document.getElementById("res-reward-cyber-credits")?.textContent;

    // 3. Defeat in Wave 4 (3 waves survived -> 2 Stars & +1 Cyber Credit)
    game.currentWave = 4;
    game.shields = 0;
    game.endGame(false);
    const starsW4 = game.starsEarned;
    const rankEnW4 = document.getElementById("res-star-rank-en")?.textContent;
    const cyberCreditW4 = document.getElementById("res-reward-cyber-credits")?.textContent;

    // 4. Defeat in Wave 6 (5 waves survived -> 3 Stars & +1 Cyber Credit)
    game.currentWave = 6;
    game.shields = 0;
    game.endGame(false);
    const starsW6 = game.starsEarned;
    const rankEnW6 = document.getElementById("res-star-rank-en")?.textContent;
    const cyberCreditW6 = document.getElementById("res-reward-cyber-credits")?.textContent;

    // Test Japanese rank titles and ensure Zero Kanji
    game.setLanguage("ja");
    const rankSubJaW6 = document.getElementById("res-star-rank-sub")?.textContent;
    const kanjiRegex = /[\\u4E00-\\u9FAF\\u3400-\\u4DBF]/g;
    const jaRankHasKanji = kanjiRegex.test(rankSubJaW6);

    return {
      starsW1,
      rankEnW1,
      cyberCreditW1,
      starsW2,
      rankEnW2,
      cyberCreditW2,
      starsW4,
      rankEnW4,
      cyberCreditW4,
      starsW6,
      rankEnW6,
      cyberCreditW6,
      rankSubJaW6,
      jaRankHasKanji
    };
  })()`);

  assert("Defeat in Wave 1 (0 waves survived) awards 0 Stars", survivalStarBrackets.starsW1 === 0);
  assert("0 Stars rank title is 'TRY AGAIN!'", survivalStarBrackets.rankEnW1 === "TRY AGAIN!");
  assert("0 waves survived awards 0 Cyber Hero Credit", survivalStarBrackets.cyberCreditW1 === "0");

  assert("Defeat in Wave 2 (1 wave survived) awards 1 Star", survivalStarBrackets.starsW2 === 1);
  assert("1 Star rank title is 'EXPERT SURVIVOR!'", survivalStarBrackets.rankEnW2 === "EXPERT SURVIVOR!");

  assert("Defeat in Wave 4 (3 waves survived) awards 2 Stars", survivalStarBrackets.starsW4 === 2);
  assert("2 Stars rank title is 'ULTRA DEFENDER!'", survivalStarBrackets.rankEnW4 === "ULTRA DEFENDER!");
  assert("Surviving >= 3 waves awards +1 Cyber Hero Credit", survivalStarBrackets.cyberCreditW4 === "+1");

  assert("Defeat in Wave 6 (5 waves survived) awards 3 Stars", survivalStarBrackets.starsW6 === 3);
  assert("3 Stars rank title is 'ULTRA LEGEND!'", survivalStarBrackets.rankEnW6 === "ULTRA LEGEND!");
  assert("Japanese 3-Star Ultra rank subtitle is 'ウルトラ レジェンド！'", survivalStarBrackets.rankSubJaW6 === "ウルトラ レジェンド！");
  assert("Japanese Ultra rank subtitle contains ZERO Kanji", survivalStarBrackets.jaRankHasKanji === false);

  // =========================================================================
  // TEST SECTION 16: DYNAMIC SPOTLIGHT ONBOARDING TUTORIAL
  // =========================================================================
  console.log("\n--- TEST SECTION 16: DYNAMIC SPOTLIGHT ONBOARDING TUTORIAL ---\n");

  // Test 16.1: Tutorial DOM Elements Structure & Start Screen Flow
  console.log("Testing Tutorial DOM Elements Structure & Start Screen Flow...");
  const tutDomInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.showStartScreen();
    game.selectedDifficulty = "veryEasy";

    const overlay = document.getElementById("tutorial-overlay");
    const spotlight = document.getElementById("tutorial-spotlight");
    const dialogBox = document.getElementById("tutorial-dialog-box");
    const titleEn = document.getElementById("tut-dialog-title-en");
    const titleSub = document.getElementById("tut-dialog-title-sub");
    const tipEn = document.getElementById("tut-dialog-tip-en");
    const tipSub = document.getElementById("tut-dialog-tip-sub");
    const nextBtn = document.getElementById("tutorial-next-btn");
    const skipBtn = document.getElementById("tutorial-skip-btn");
    const startBtn = document.getElementById("tutorial-start-mission-btn");
    const menuBtn = document.getElementById("tutorial-menu-btn");
    const demoCursor = document.getElementById("tutorial-demo-cursor");

    const practiceBtn = document.getElementById("start-practice-btn");
    const playBtn = document.getElementById("start-play-btn");
    const startRow = playBtn ? playBtn.parentElement : null;

    // Test Very Easy mode launch from Play Game button
    playBtn.click();
    const stateAfterVeryEasyClick = game.state;
    const proceedFlagOnVeryEasy = game.tutorialEngine.proceedToMissionOnExit;

    // Test skipping tutorial scene proceeds directly into mission run
    skipBtn.click();
    const stateAfterSkipVeryEasy = game.state;

    // Test Normal difficulty directly launches game run without tutorial
    game.showStartScreen();
    game.selectedDifficulty = "normal";
    playBtn.click();
    const stateAfterNormalClick = game.state;

    // Reset back to start screen and veryEasy
    game.showStartScreen();
    game.selectedDifficulty = "veryEasy";

    return {
      hasOverlay: Boolean(overlay),
      hasSpotlight: Boolean(spotlight),
      hasDialogBox: Boolean(dialogBox),
      hasTitles: Boolean(titleEn && titleSub && tipEn && tipSub),
      hasNextBtn: Boolean(nextBtn),
      hasSkipBtn: Boolean(skipBtn),
      hasStartBtn: Boolean(startBtn),
      hasMenuBtn: Boolean(menuBtn),
      hasDemoCursor: Boolean(demoCursor),
      hasPracticeBtn: Boolean(practiceBtn),
      hasPlayBtn: Boolean(playBtn),
      playBtnIsHero: Boolean(playBtn && playBtn.classList.contains("play-game-hero-btn")),
      startRowHasOnlyPlayBtn: Boolean(startRow && startRow.children.length === 1 && startRow.firstElementChild === playBtn),
      stateAfterVeryEasyClick,
      proceedFlagOnVeryEasy,
      stateAfterSkipVeryEasy,
      stateAfterNormalClick
    };
  })()`);

  assert("Tutorial Overlay element (#tutorial-overlay) exists", tutDomInfo.hasOverlay === true);
  assert("Tutorial Spotlight element (#tutorial-spotlight) exists", tutDomInfo.hasSpotlight === true);
  assert("Tutorial Dialog Box (#tutorial-dialog-box) exists", tutDomInfo.hasDialogBox === true);
  assert("Tutorial Dialog title and tip label elements exist", tutDomInfo.hasTitles === true);
  assert("Tutorial Next button (#tutorial-next-btn) exists", tutDomInfo.hasNextBtn === true);
  assert("Tutorial Persistent Skip button (#tutorial-skip-btn) exists", tutDomInfo.hasSkipBtn === true);
  assert("Tutorial Start Mission & Menu action buttons exist", tutDomInfo.hasStartBtn === true && tutDomInfo.hasMenuBtn === true);
  assert("Tutorial Demo Cursor (#tutorial-demo-cursor) exists", tutDomInfo.hasDemoCursor === true);
  assert("Practice button is completely removed from start screen", tutDomInfo.hasPracticeBtn === false);
  assert("Play Game button exists as prominent hero button (.play-game-hero-btn)", tutDomInfo.hasPlayBtn === true && tutDomInfo.playBtnIsHero === true);
  assert("Start actions row contains ONLY the centered Play Game button", tutDomInfo.startRowHasOnlyPlayBtn === true);
  assert("Clicking Play Game on Very Easy launches the tutorial as a scene", tutDomInfo.stateAfterVeryEasyClick === "tutorial" && tutDomInfo.proceedFlagOnVeryEasy === true);
  assert("Skipping the Very Easy tutorial scene proceeds directly into mission run", tutDomInfo.stateAfterSkipVeryEasy === "countdown" || tutDomInfo.stateAfterSkipVeryEasy === "active");
  assert("Clicking Play Game on Normal difficulty starts mission run directly without tutorial", tutDomInfo.stateAfterNormalClick === "countdown");

  // Test 16.2: Launch Tutorial & Clean Preview State (Step 0)
  console.log("\nTesting Tutorial Launch & Clean Board Preview (Step 0)...");
  const step0Info = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.startTutorial(0);
    const overlay = document.getElementById("tutorial-overlay");
    const spotlight = document.getElementById("tutorial-spotlight");
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;

    return {
      state: game.state,
      overlayVisible: overlay && window.getComputedStyle(overlay).display !== "none",
      spotlightPreviewMode: spotlight && spotlight.classList.contains("preview-mode"),
      activeRobotsCount: game.robots.length,
      titleEn
    };
  })()`);

  assert("Launching tutorial sets game state to 'tutorial'", step0Info.state === "tutorial");
  assert("Tutorial Overlay is visible in DOM", step0Info.overlayVisible === true);
  assert("Spotlight is in preview mode (wide opening over board)", step0Info.spotlightPreviewMode === true);
  assert("Step 0 displays clean board with zero hostile robots", step0Info.activeRobotsCount === 0);
  assert("Step 0 title is 'Welcome Trainee!'", step0Info.titleEn === "Welcome Trainee!");

  // Test 16.3: Spotlight Highlighting Base (Step 1) & Defense Line (Step 2)
  console.log("\nTesting Dynamic Spotlight Transitions (Base & Defense Line)...");
  const step1Info = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.tutorialEngine.runStep(1);
    const spotlight = document.getElementById("tutorial-spotlight");
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    const width = parseFloat(spotlight.style.width);
    const height = parseFloat(spotlight.style.height);

    return {
      titleEn,
      spotlightPreviewMode: spotlight.classList.contains("preview-mode"),
      width,
      height
    };
  })()`);

  assert("Step 1 title is 'This is your Base!'", step1Info.titleEn === "This is your Base!");
  assert("Step 1 removes preview mode to darken playfield into glowing spotlight", step1Info.spotlightPreviewMode === false);
  assert("Step 1 spotlight frames base and shields (> 300px width)", step1Info.width >= 300);

  const step2Info = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.tutorialEngine.runStep(2);
    const spotlight = document.getElementById("tutorial-spotlight");
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    const width = parseFloat(spotlight.style.width);
    const height = parseFloat(spotlight.style.height);

    return {
      titleEn,
      width,
      height
    };
  })()`);

  assert("Step 2 title is 'Defense Line!'", step2Info.titleEn === "Defense Line!");
  assert("Step 2 spotlight morphs into horizontal pill framing defense line", step2Info.width >= 500 && step2Info.height <= 60);

  // Test 16.4: Step 3 Enemy Arrival & Step 4 Demo Double-Click
  console.log("\nTesting Step 3 Enemy Arrival & Step 4 Demo Double-Click...");
  const step3Info = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.tutorialEngine.runStep(3);
    const robot = game.tutorialEngine.activeRobot;
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;

    return {
      hasRobot: Boolean(robot),
      robotType: robot ? robot.type : "",
      robotLane: robot ? robot.laneIndex : -1,
      titleEn
    };
  })()`);

  assert("Step 3 spawns single Standard Robot 1 (Scout)", step3Info.hasRobot === true && step3Info.robotType === "standard");
  assert("Step 3 robot spawns in center lane (lane 2)", step3Info.robotLane === 2);
  assert("Step 3 title is 'Hacked Robot Incoming!'", step3Info.titleEn === "Hacked Robot Incoming!");

  // Step 4 Demo Double-Click
  const step4Launch = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.tutorialEngine.runStep(4);
    const demoCursor = document.getElementById("tutorial-demo-cursor");
    const nextBtn = document.getElementById("tutorial-next-btn");

    return {
      demoCursorVisible: demoCursor && window.getComputedStyle(demoCursor).display !== "none",
      nextBtnHidden: nextBtn && nextBtn.style.display === "none"
    };
  })()`);

  assert("Step 4 activates demo cursor pointer", step4Launch.demoCursorVisible === true);
  assert("Step 4 hides Next button during active demonstration", step4Launch.nextBtnHidden === true);

  // Wait for demo clicks to execute (~2.0 seconds)
  await wait(2100);

  const step4DoneInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    const activeBot = game.tutorialEngine.activeRobot;
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    const nextBtn = document.getElementById("tutorial-next-btn");

    return {
      robotIsRestored: activeBot ? activeBot.isRestored : false,
      tipEn,
      nextBtnVisible: nextBtn && nextBtn.style.display !== "none"
    };
  })()`);

  assert("Demo double-click successfully restores the hacked robot to cyan", step4DoneInfo.robotIsRestored === true);
  assert("Step 4 dialog tip updates to 'Saved! The restored robot returned safely to base!'", step4DoneInfo.tipEn.includes("Saved!"));
  assert("Step 4 displays Next button once demonstration completes", step4DoneInfo.nextBtnVisible === true);

  // Test 16.5: Step 5 Interactive Hands-On Double-Click
  console.log("\nTesting Step 5 Interactive Hands-On Try-It-Yourself...");
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(5)`);
  await wait(200);

  const step5Init = await evalInPage(`(() => {
    const game = window.gameInstance;
    return {
      interactiveWaiting: game.tutorialEngine.interactiveWaiting,
      hasRobot: Boolean(game.tutorialEngine.activeRobot),
      robotDestroyed: game.tutorialEngine.activeRobot?.destroyed
    };
  })()`);

  assert("Step 5 enters interactive waiting mode", step5Init.interactiveWaiting === true);
  assert("Step 5 spawns interactive target robot", step5Init.hasRobot === true && step5Init.robotDestroyed === false);

  // Single click on robot triggers guidance
  await evalInPage(`(() => {
    const robotEl = window.gameInstance.tutorialEngine.activeRobot.element;
    robotEl.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(100);

  const singleClickCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    const botHeld = game.tutorialEngine.activeRobot.isHeld;
    return {
      firstClickRegistered: game.tutorialEngine.firstClickRegistered,
      tipEn,
      botHeld
    };
  })()`);

  assert("Single click registers first click in tutorial engine", singleClickCheck.firstClickRegistered === true);
  assert("Single click updates prompt to 'Nice! Quickly click one more time! (Click-Click)'", singleClickCheck.tipEn.includes("Quickly click one more time"));
  assert("Interactive robot activates targeting hold", singleClickCheck.botHeld === true);

  // Second click triggers full double-click restoration
  await evalInPage(`(() => {
    const robotEl = window.gameInstance.tutorialEngine.activeRobot.element;
    robotEl.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(200);

  const doubleClickCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    return {
      robotRestored: game.tutorialEngine.activeRobot.isRestored,
      interactiveWaiting: game.tutorialEngine.interactiveWaiting
    };
  })()`);

  assert("Valid second click restores interactive robot", doubleClickCheck.robotRestored === true);
  assert("Tutorial finishes interactive waiting upon restore", doubleClickCheck.interactiveWaiting === false);

  // Wait for advance to Step 6 (completion card)
  await wait(1100);

  const step6Info = await evalInPage(`(() => {
    const game = window.gameInstance;
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    const startMissionBtn = document.getElementById("tutorial-start-mission-btn");
    const menuBtn = document.getElementById("tutorial-menu-btn");

    return {
      currentStep: game.tutorialEngine.currentStep,
      titleEn,
      startMissionBtnVisible: startMissionBtn && window.getComputedStyle(startMissionBtn).display !== "none",
      menuBtnVisible: menuBtn && window.getComputedStyle(menuBtn).display !== "none"
    };
  })()`);

  assert("Tutorial advances to Step 6 (Completion)", step6Info.currentStep === 6);
  assert("Step 6 title is 'Awesome! You Did It!'", step6Info.titleEn === "Awesome! You Did It!");
  assert("Step 6 provides visible 'Start Mission' button", step6Info.startMissionBtnVisible === true);
  assert("Step 6 provides visible 'Main Menu' button", step6Info.menuBtnVisible === true);

  // Test 16.6: Persistent Skip Button Clean Exit
  console.log("\nTesting Persistent Skip Button Clean Exit...");
  const skipTestResult = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.startTutorial(2); // start at step 2
    const skipBtn = document.getElementById("tutorial-skip-btn");
    skipBtn.click();

    const overlay = document.getElementById("tutorial-overlay");
    const startScreen = document.getElementById("screen-start");

    return {
      state: game.state,
      timeoutsCleared: game.tutorialEngine.timeouts.length === 0,
      overlayHidden: overlay.style.display === "none",
      startScreenActive: startScreen.classList.contains("active"),
      robotsCleared: game.robots.length === 0
    };
  })()`);

  assert("Clicking Skip returns game state to 'start'", skipTestResult.state === "start");
  assert("Clicking Skip clears all pending tutorial timeouts", skipTestResult.timeoutsCleared === true);
  assert("Clicking Skip cleanly hides #tutorial-overlay", skipTestResult.overlayHidden === true);
  assert("Clicking Skip reactivates #screen-start", skipTestResult.startScreenActive === true);
  assert("Clicking Skip clears all tutorial robot entities", skipTestResult.robotsCleared === true);

  // Test 16.7: Strict Zero-Kanji Verification for All Japanese Tutorial Strings
  console.log("\nTesting Zero-Kanji Verification for All Japanese Tutorial Strings...");
  const jaTutStringsCheck = await evalInPage(`(() => {
    const ja = TRANSLATIONS.ja;
    const tutKeys = [
      'tutSkip', 'tutNext', 'tutStartMission', 'tutMainMenu',
      'tutPreviewTitle', 'tutPreviewTip', 'tutBaseTitle', 'tutBaseTip',
      'tutLineTitle', 'tutLineTip', 'tutRobotTitle', 'tutRobotTip',
      'tutDemoTitle', 'tutDemoTip', 'tutRestoredTip',
      'tutYourTurnTitle', 'tutYourTurnTip', 'tutClickAgainTip',
      'tutSuccessTitle', 'tutSuccessTip', 'practiceFirst'
    ];

    const kanjiRegex = /[\\u4E00-\\u9FAF\\u3400-\\u4DBF]/g;
    const failures = [];

    for (const key of tutKeys) {
      const val = ja[key];
      if (!val) {
        failures.push({ key, error: "Missing key" });
      } else if (kanjiRegex.test(val)) {
        failures.push({ key, value: val, error: "Contains Kanji" });
      }
    }

    return {
      checkedKeysCount: tutKeys.length,
      allPassed: failures.length === 0,
      failures
    };
  })()`);

  assert("All 21 Japanese tutorial translation keys are present", jaTutStringsCheck.checkedKeysCount === 21);
  assert("All Japanese tutorial strings strictly contain ZERO Kanji (Hiragana & Katakana ONLY)", jaTutStringsCheck.allPassed === true, JSON.stringify(jaTutStringsCheck.failures));

  // =========================================================================
  // SECTION 17: ROBOT OVERRIDE TUTORIAL, PROMPT POSITION, ENLARGED LETTER BADGE & WIDE RESULTS SCREEN
  // =========================================================================
  console.log("\n========================================");
  console.log("SECTION 17: ROBOT OVERRIDE TUTORIAL & VISUAL REFINEMENTS");
  console.log("========================================");

  // Test 17.1: Override Robot Letter Enlargement & Centering on Selection
  console.log("\nTesting Override Robot Letter Enlargement on Selection...");
  const badgeEnlargeTest = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.clearAllRobots();
    const bot = new Robot(701, 2, 10, true, "override");
    bot.assignedKey = 'M';
    const b = bot.element.querySelector(".robot-key-badge");
    if (b) b.textContent = 'M';
    game.robots.push(bot);
    game.playfieldEl.appendChild(bot.element);
    game.renderEntities();

    const badgeBefore = bot.element.querySelector(".robot-key-badge");
    const styleBefore = window.getComputedStyle(badgeBefore);
    const fontSizeBefore = parseInt(styleBefore.fontSize, 10);

    // Freeze for override
    game.overrideRobot(bot);

    return {
      hasOverriddenClass: bot.element.classList.contains("overridden"),
      fontSizeBefore
    };
  })()`);

  await wait(300);

  const badgeAfterCheck = await evalInPage(`(() => {
    const bot = window.gameInstance.getRobotById(701);
    const badgeAfter = bot.element.querySelector(".robot-key-badge");
    const styleAfter = window.getComputedStyle(badgeAfter);
    const fontSizeAfter = parseInt(styleAfter.fontSize, 10);

    return {
      fontSizeAfter,
      topAfterPx: parseFloat(styleAfter.top),
      leftAfterPx: parseFloat(styleAfter.left),
      badgeText: badgeAfter.textContent
    };
  })()`);

  assert("Override robot receives 'overridden' class on freeze", badgeEnlargeTest.hasOverriddenClass === true);
  assert("Letter badge has standard size before selection (~18-20px)", badgeEnlargeTest.fontSizeBefore <= 24);
  assert("Letter badge enlarges to massive size when selected (>= 45px, target 50px)", badgeAfterCheck.fontSizeAfter >= 45);
  assert("Letter badge is centered on mecha (top ~ 53px, left ~ 53px for 106px mecha)", Math.abs(badgeAfterCheck.topAfterPx - 53) < 4 && Math.abs(badgeAfterCheck.leftAfterPx - 53) < 4);
  assert("Letter badge correctly displays assigned key", badgeAfterCheck.badgeText === "M");

  // Test 17.2: Bottom Positioning of .click-again-tag on Selection
  console.log("\nTesting Bottom Positioning of .click-again-tag on Selection...");
  const promptPositionTest = await evalInPage(`(() => {
    const bot = window.gameInstance.getRobotById(701);
    const tag = bot.element.querySelector(".click-again-tag");
    const style = window.getComputedStyle(tag);

    return {
      bottom: style.bottom,
      display: style.display,
      textContent: tag.querySelector(".main-en")?.textContent
    };
  })()`);

  assert("When mecha is selected, prompt tag moves to bottom (-38px)", promptPositionTest.bottom === "-38px" || promptPositionTest.bottom.includes("-38"));
  assert("When mecha is selected, prompt tag is visible (display: flex)", promptPositionTest.display === "flex");
  assert("Prompt tag displays 'PRESS: [M]'", promptPositionTest.textContent.includes("PRESS: [M]"));

  // Test 17.3: Wide Results Screen Layout Dimensions
  console.log("\nTesting Wide Results Screen Layout Dimensions...");
  await evalInPage(`window.gameInstance.showResultsScreen(true)`);
  await wait(200);

  const resultsLayoutTest = await evalInPage(`(() => {
    const card = document.querySelector("#screen-results .screen-card");
    const wideBody = document.querySelector("#screen-results .results-wide-body");
    const leftCol = document.querySelector("#screen-results .results-wide-left");
    const rightCol = document.querySelector("#screen-results .results-wide-right");
    const replayBtn = document.getElementById("res-replay-btn");
    const menuBtn = document.getElementById("res-menu-btn");

    const cardRect = card.getBoundingClientRect();
    const replayRect = replayBtn.getBoundingClientRect();

    return {
      cardWidth: cardRect.width,
      cardHeight: cardRect.height,
      cardScrollHeight: card.scrollHeight,
      cardClientHeight: card.clientHeight,
      cardMaxWidth: window.getComputedStyle(card).maxWidth,
      hasWideBody: Boolean(wideBody),
      hasLeftCol: Boolean(leftCol),
      hasRightCol: Boolean(rightCol),
      wideBodyDisplay: window.getComputedStyle(wideBody).display,
      replayBtnVisible: replayRect.top >= 0 && replayRect.height > 0,
      replayBtnClickable: !replayBtn.disabled && replayRect.width > 0 && replayRect.height > 0,
      noCardScroll: card.scrollHeight <= card.clientHeight + 2
    };
  })()`);

  assert("Results screen card utilizes wider max-width (max-width: 820px)", resultsLayoutTest.cardMaxWidth === "820px");
  assert("Results screen card maintains compact height (height <= 450px)", resultsLayoutTest.cardHeight <= 450);
  assert("Results screen has wide body wrapper with 2-column grid layout", resultsLayoutTest.hasWideBody && resultsLayoutTest.wideBodyDisplay === "grid");
  assert("Results screen has 2-column structure (left and right)", resultsLayoutTest.hasLeftCol && resultsLayoutTest.hasRightCol);
  assert("No vertical scrolling required inside results screen card", resultsLayoutTest.noCardScroll === true);
  assert("Play Again button is directly visible and clickable", resultsLayoutTest.replayBtnClickable === true);

  // Test 17.4: Robot Override Tutorial Launch & Step 3 Arrival
  console.log("\nTesting Robot Override Tutorial Step 3 Enemy Arrival...");
  const overrideTutStep3 = await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("robot_override");
    game.startTutorial(3);

    const isOverride = game.tutorialEngine.isOverrideMode();
    const activeBot = game.tutorialEngine.activeRobot;
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    const badge = activeBot?.element?.querySelector(".robot-key-badge");

    return {
      isOverride,
      hasRobot: Boolean(activeBot),
      robotType: activeBot?.type,
      assignedKey: activeBot?.assignedKey,
      badgeText: badge?.textContent,
      titleEn
    };
  })()`);

  assert("TutorialEngine detects Robot Override mode", overrideTutStep3.isOverride === true);
  assert("Step 3 spawns an 'override' type robot", overrideTutStep3.robotType === "override");
  assert("Override robot has key badge with key 'K'", overrideTutStep3.assignedKey === 'K' && overrideTutStep3.badgeText === 'K');
  assert("Step 3 title is 'Hacked Mecha Incoming!'", overrideTutStep3.titleEn === "Hacked Mecha Incoming!");

  // Test 17.5: Robot Override Tutorial Step 4 Demo Flow
  console.log("\nTesting Robot Override Tutorial Step 4 Demo Flow...");
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(4)`);
  await wait(1350);

  const step4SelectedCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    return {
      isOverridden: bot?.isOverridden,
      hasOverriddenClass: bot?.element?.classList.contains("overridden")
    };
  })()`);
  assert("Step 4 demo click freezes/selects mecha", step4SelectedCheck.isOverridden === true && step4SelectedCheck.hasOverriddenClass === true);

  // Wait for step 4 key simulation and restore
  await wait(1800);
  const step4DoneOverride = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    const nextBtn = document.getElementById("tutorial-next-btn");
    return {
      isRestored: bot?.isRestored,
      tipEn,
      nextBtnVisible: nextBtn && window.getComputedStyle(nextBtn).display !== "none"
    };
  })()`);

  assert("Step 4 demo restores the override mecha via simulated keycap press", step4DoneOverride.isRestored === true);
  assert("Step 4 dialog tip updates with override completion tip", step4DoneOverride.tipEn.includes("Malware purged!"));
  assert("Step 4 displays Next button", step4DoneOverride.nextBtnVisible === true);

  // Test 17.6: Robot Override Tutorial Step 5: 1-Mecha Hands-On Try (Double-Click Freeze + Keyboard Type)
  console.log("\nTesting Robot Override Tutorial Step 5: 1-Mecha Hands-On (Double-Click Freeze + Keyboard Type)...");
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(5)`);
  await wait(200);

  const overrideStep5Init = await evalInPage(`(() => {
    const game = window.gameInstance;
    const active = game.robots.filter(r => !r.destroyed && !r.escaped && r.type === "override");
    return {
      interactiveWaiting: game.tutorialEngine.interactiveWaiting,
      count: active.length,
      assignedKey: active[0]?.assignedKey
    };
  })()`);

  assert("Step 5 enters interactive waiting for 1 override mecha", overrideStep5Init.interactiveWaiting === true);
  assert("Step 5 spawns exactly 1 override mecha with key 'K'", overrideStep5Init.count === 1 && overrideStep5Init.assignedKey === 'K');

  // Trainee performs SINGLE CLICK on the mecha:
  // MUST NOT freeze the mecha! Must prompt to click one more time!
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    bot.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(100);

  const step5SingleClickCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      isOverridden: bot?.isOverridden,
      tipEn
    };
  })()`);
  assert("Single click does NOT freeze the mecha (isOverridden = false)", step5SingleClickCheck.isOverridden === false);
  assert("Single click prompts student to click one more time", step5SingleClickCheck.tipEn.includes("one more time") || step5SingleClickCheck.tipEn.includes("Click-Click"));

  // Trainee performs SECOND CLICK (Double-Click) on the mecha:
  // MUST FREEZE the mecha and instruct student to type on keyboard!
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    bot.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(100);

  const step5DoubleClickCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      isOverridden: bot?.isOverridden,
      tipEn
    };
  })()`);
  assert("Valid double-click freezes the mecha (isOverridden = true)", step5DoubleClickCheck.isOverridden === true);
  assert("Double-click instructs student to look at keyboard and type [K]", step5DoubleClickCheck.tipEn.includes("Look at your keyboard") && step5DoubleClickCheck.tipEn.includes("[K]"));

  // Trainee tries clicking the FROZEN mecha again:
  // MUST NOT restore or destroy the mecha!
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    bot.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
    bot.element.dispatchEvent(new PointerEvent('pointerdown', { button: 0, bubbles: true }));
  })()`);
  await wait(100);

  const step5ClickFrozenCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.robots.find(r => r.assignedKey === 'K');
    return {
      isRestored: bot?.isRestored,
      destroyed: bot?.destroyed,
      isOverridden: bot?.isOverridden
    };
  })()`);
  assert("Clicking an already frozen mecha does NOT restore it (requires keyboard)", step5ClickFrozenCheck.isRestored === false && step5ClickFrozenCheck.destroyed === false);

  // Trainee types matching key 'K' on physical keyboard:
  // Restores the mecha!
  await evalInPage(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
  })()`);
  await wait(300);

  const step5RestoreCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const botFriendly = (game.friendlyRobots || []).find(r => r.assignedKey === 'K');
    const botHostile = game.robots.find(r => r.assignedKey === 'K');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      restored: !!(botFriendly && botFriendly.isRestored && !botHostile),
      tipEn
    };
  })()`);
  assert("Typing 'K' on keyboard restores the mecha", step5RestoreCheck.restored === true);
  assert("Step 5 celebratory tip introduces Double Freeze Tactic with two mechas", step5RestoreCheck.tipEn.includes("Double Freeze") || step5RestoreCheck.tipEn.includes("TWO mechas"));

  // Test 17.7: Robot Override Tutorial Step 6: 2-Mechas Double Freeze Tactic Hands-On
  console.log("\nTesting Robot Override Tutorial Step 6: 2-Mecha Double Freeze Tactic...");
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(6)`);
  await wait(200);

  const step6Init = await evalInPage(`(() => {
    const game = window.gameInstance;
    const active = game.robots.filter(r => !r.destroyed && !r.escaped && r.type === "override");
    const spotlight = document.getElementById("tutorial-spotlight");
    return {
      interactiveWaiting: game.tutorialEngine.interactiveWaiting,
      count: active.length,
      keys: active.map(r => r.assignedKey).sort(),
      spotlightWidth: parseFloat(spotlight.style.width)
    };
  })()`);
  assert("Step 6 enters interactive waiting for 2 override mechas", step6Init.interactiveWaiting === true);
  assert("Step 6 spawns exactly 2 override mechas with keys 'J' and 'K'", step6Init.count === 2 && JSON.stringify(step6Init.keys) === JSON.stringify(["J", "K"]));
  assert("Step 6 wide spotlight spans lanes 1 to 3 (> 400px width)", step6Init.spotlightWidth > 400);

  // Double-click Mecha 1 (key 'J') to freeze it
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot1 = game.robots.find(r => r.assignedKey === 'J');
    game.inputEngine.handleTargetClick(bot1, { button: 0 });
    game.inputEngine.handleTargetClick(bot1, { button: 0 });
  })()`);
  await wait(100);

  const step6Freeze1Check = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot1 = game.robots.find(r => r.assignedKey === 'J');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      bot1Frozen: bot1?.isOverridden,
      tipEn
    };
  })()`);
  assert("Double-clicking first mecha freezes it (isOverridden = true)", step6Freeze1Check.bot1Frozen === true);
  assert("Prompts student to freeze second robot too", step6Freeze1Check.tipEn.includes("second robot"));

  // Double-click Mecha 2 (key 'K') to freeze it too
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot2 = game.robots.find(r => r.assignedKey === 'K');
    game.inputEngine.handleTargetClick(bot2, { button: 0 });
    game.inputEngine.handleTargetClick(bot2, { button: 0 });
  })()`);
  await wait(100);

  const step6Freeze2Check = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot2 = game.robots.find(r => r.assignedKey === 'K');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      bot2Frozen: bot2?.isOverridden,
      tipEn
    };
  })()`);
  assert("Double-clicking second mecha freezes it (both are now frozen)", step6Freeze2Check.bot2Frozen === true);
  assert("Both frozen prompts student to type letters [J] and [K]", step6Freeze2Check.tipEn.includes("Both frozen") && step6Freeze2Check.tipEn.includes("[J]") && step6Freeze2Check.tipEn.includes("[K]"));

  // Typing 'J' restores Mecha 1
  await evalInPage(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }));
  })()`);
  await wait(300);

  const step6TypeJCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot1Friendly = (game.friendlyRobots || []).find(r => r.assignedKey === 'J');
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      restored: bot1Friendly?.isRestored,
      tipEn
    };
  })()`);
  assert("Typing 'J' restores the first mecha", step6TypeJCheck.restored === true);
  assert("Dialog prompts to type the remaining key [K]", step6TypeJCheck.tipEn.includes("[K]"));

  // Typing 'K' restores Mecha 2
  await evalInPage(`(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', bubbles: true }));
  })()`);
  await wait(300);

  const step6TypeKCheck = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot2Friendly = (game.friendlyRobots || []).find(r => r.assignedKey === 'K');
    return {
      restored: bot2Friendly?.isRestored,
      interactiveWaiting: game.tutorialEngine.interactiveWaiting
    };
  })()`);
  assert("Typing 'K' restores the second mecha", step6TypeKCheck.restored === true);
  assert("Interactive waiting concludes when both mechas are restored", step6TypeKCheck.interactiveWaiting === false);

  // Transition to Step 7 (Completion)
  await wait(1300);
  const step7Result = await evalInPage(`(() => {
    const game = window.gameInstance;
    const startBtn = document.getElementById("tutorial-start-mission-btn");
    return {
      currentStep: game.tutorialEngine.currentStep,
      startVisible: startBtn && window.getComputedStyle(startBtn).display !== "none"
    };
  })()`);
  assert("Tutorial advances to Step 7 victory celebration", step7Result.currentStep === 7);
  assert("Step 7 provides visible 'Start Mission' button", step7Result.startVisible === true);

  // Test 17.8: Strict Zero-Kanji Verification for All Japanese Override Tutorial Keys
  console.log("\nTesting Zero-Kanji Verification for All 18 Override Tutorial Japanese Keys...");
  const jaOverrideKeysCheck = await evalInPage(`(() => {
    const ja = TRANSLATIONS.ja;
    const overrideKeys = [
      'tutOverridePreviewTitle', 'tutOverridePreviewTip',
      'tutOverrideRobotTitle', 'tutOverrideRobotTip',
      'tutOverrideDemoTitle', 'tutOverrideDemoTip',
      'tutOverrideMultiTip',
      'tutOverrideRestoredTip',
      'tutOverrideYourTurnTitle', 'tutOverrideYourTurnTip',
      'tutOverrideTypeKeyTip',
      'tutOverride1RestoredTitle', 'tutOverride1RestoredTip',
      'tutOverrideDoubleFreezeTitle', 'tutOverrideDoubleFreezeTip',
      'tutOverrideFreezeSecondTip', 'tutOverrideBothFrozenTip',
      'tutOverrideTryMultiHalfTip',
      'tutOverrideSuccessTitle', 'tutOverrideSuccessTip'
    ];

    const kanjiRegex = /[\\u4E00-\\u9FAF\\u3400-\\u4DBF]/g;
    const failures = [];

    for (const key of overrideKeys) {
      const val = ja[key];
      if (!val) {
        failures.push({ key, error: "Missing key" });
      } else if (kanjiRegex.test(val)) {
        failures.push({ key, value: val, error: "Contains Kanji" });
      }
    }

    return {
      checkedCount: overrideKeys.length,
      allPassed: failures.length === 0,
      failures
    };
  })()`);

  assert("All 20 Japanese Override tutorial translation keys are present", jaOverrideKeysCheck.checkedCount === 20);
  assert("All 20 Japanese Override tutorial keys strictly contain ZERO Kanji", jaOverrideKeysCheck.allPassed === true, JSON.stringify(jaOverrideKeysCheck.failures));

  // =========================================================================
  // SECTION 18: BASE DEFENSE PURITY, REINFORCEMENTS DEDICATED TUTORIAL,
  // 4-BAR BASE LIFE GUIDANCE & ZERO-KANJI VERIFICATION
  // =========================================================================
  console.log("\n========================================");
  console.log("SECTION 18: BASE DEFENSE PURITY, REINFORCEMENTS TUTORIAL, 4-BAR BASE SHIELDS & LOCALIZATION");
  console.log("========================================");

  // Test 18.1: Base Defense Purity (Strictly Standard Scouts, 0 Heavy 2-Hit Robots)
  console.log("\nTesting Base Defense Purity across all 3 Waves...");
  await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("base_defense");
    game.selectedDifficulty = "normal";
    game.startRun();
  })()`);
  await wait(200);

  const baseDefenseSpawns = await evalInPage(`(() => {
    const game = window.gameInstance;
    const spawnedTypes = [];
    for (let w = 1; w <= 3; w++) {
      game.currentWave = w;
      game.startWave(w);
      for (let s = 0; s < 15; s++) {
        game.spawnRobot(8.0);
        game.waveRobotsSpawned++;
        const lastBot = game.robots[game.robots.length - 1];
        if (lastBot) spawnedTypes.push(lastBot.type);
      }
    }
    return {
      totalSpawned: spawnedTypes.length,
      heavyCount: spawnedTypes.filter(t => t === "heavy").length,
      standardCount: spawnedTypes.filter(t => t === "standard").length,
      allStandard: spawnedTypes.every(t => t === "standard")
    };
  })()`);

  assert("Base Defense spawned 45 robots across waves", baseDefenseSpawns.totalSpawned === 45);
  assert("Base Defense spawns strictly 0 heavy 2-hit robots", baseDefenseSpawns.heavyCount === 0);
  assert("Base Defense robots are 100% standard scouts", baseDefenseSpawns.allStandard === true);

  // Test 18.2: Reinforcements Spawns Heavy 2-Hit Robots Across Waves
  console.log("\nTesting Reinforcements Mode Spawns Heavy 2-Hit Robots...");
  await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("reinforcements");
    game.selectedDifficulty = "normal";
    game.startRun();
  })()`);
  await wait(200);

  const reinfSpawns = await evalInPage(`(() => {
    const game = window.gameInstance;
    const spawnedTypes = [];
    for (let w = 1; w <= 3; w++) {
      game.currentWave = w;
      game.startWave(w);
      for (let s = 0; s < 15; s++) {
        game.spawnRobot(8.0);
        game.waveRobotsSpawned++;
        const lastBot = game.robots[game.robots.length - 1];
        if (lastBot) spawnedTypes.push(lastBot.type);
      }
    }
    return {
      totalSpawned: spawnedTypes.length,
      heavyCount: spawnedTypes.filter(t => t === "heavy").length,
      hasSpeederOrTank: spawnedTypes.some(t => t === "speeder" || t === "tank")
    };
  })()`);

  assert("Reinforcements spawns heavy 2-hit robots across waves", reinfSpawns.heavyCount > 0);

  // Test 18.3: 4-Bar Base Shields Guidance Across All 3 Tutorials
  console.log("\nTesting 4-Bar Base Shields Guidance Across All 3 Tutorials...");
  const modesToTest = ["base_defense", "reinforcements", "robot_override"];

  for (const mId of modesToTest) {
    const shieldResult = await evalInPage(`(() => {
      const game = window.gameInstance;
      game.setMode("${mId}");
      game.startTutorial(1);

      const pips = document.querySelectorAll("#base-shield-pips .large-shield-pip");
      const lostPips = document.querySelectorAll("#base-shield-pips .large-shield-pip.lost");
      const shContainer = document.getElementById("base-shields-container");
      const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent || "";

      return {
        modeId: "${mId}",
        shields: game.shields,
        maxShields: game.maxShields,
        pipCount: pips.length,
        lostCount: lostPips.length,
        hasHighlight: shContainer?.classList.contains("tutorial-highlight"),
        tipMentions4: tipEn.includes("4 shields") || tipEn.includes("4 life points") || tipEn.includes("4 bars"),
        tipMentionsGameOver: tipEn.includes("drops to 0") || tipEn.includes("lose the game")
      };
    })()`);

    assert(`Step 1 in ${mId} sets shields = 4`, shieldResult.shields === 4);
    assert(`Step 1 in ${mId} sets maxShields = 4`, shieldResult.maxShields === 4);
    assert(`Step 1 in ${mId} renders exactly 4 full shield pips (4/4)`, shieldResult.pipCount === 4 && shieldResult.lostCount === 0);
    assert(`Step 1 in ${mId} highlights #base-shields-container`, shieldResult.hasHighlight === true);
    assert(`Step 1 in ${mId} explains base has 4 life points`, shieldResult.tipMentions4 === true);
    assert(`Step 1 in ${mId} explains game over when life reaches 0`, shieldResult.tipMentionsGameOver === true);

    // Step 2 removes highlight
    const step2Clean = await evalInPage(`(() => {
      window.gameInstance.tutorialEngine.runStep(2);
      const shContainer = document.getElementById("base-shields-container");
      return !shContainer?.classList.contains("tutorial-highlight");
    })()`);
    assert(`Step 2 in ${mId} removes .tutorial-highlight from #base-shields-container`, step2Clean === true);
  }

  // Test 18.4: Dedicated Reinforcements Spotlight Tutorial Complete Flow
  console.log("\nTesting Dedicated Reinforcements Spotlight Tutorial Flow...");
  await evalInPage(`(() => {
    const game = window.gameInstance;
    game.setMode("reinforcements");
    game.startTutorial(0);
  })()`);
  await wait(200);

  const reinfStep0 = await evalInPage(`(() => {
    return {
      titleEn: document.getElementById("tut-dialog-title-en")?.textContent,
      tipEn: document.getElementById("tut-dialog-tip-en")?.textContent
    };
  })()`);
  assert("Reinforcements Step 0 preview has dedicated reinforcements title", reinfStep0.titleEn.includes("Reinforcements"));
  assert("Reinforcements Step 0 preview explains heavy armored robots", reinfStep0.tipEn.includes("heavy armored robots"));

  // Step 3 Enemy Arrival: Spawns Heavy Robot
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(3)`);
  await wait(200);

  const reinfStep3 = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    return {
      botType: bot?.type,
      botHealth: bot?.health,
      titleEn
    };
  })()`);
  assert("Reinforcements Step 3 spawns heavy robot (Robot 2)", reinfStep3.botType === "heavy");
  assert("Reinforcements Step 3 heavy robot has 2 health", reinfStep3.botHealth === 2);
  assert("Reinforcements Step 3 title announces Heavy Armored Robot", reinfStep3.titleEn.includes("Heavy Armored Robot"));

  // Step 4 Dual Double-Click Demo
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(4)`);
  await wait(2800);

  const reinfStep4 = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    const nextBtn = document.getElementById("tutorial-next-btn");
    return {
      isRestored: bot?.isRestored,
      tipEn,
      nextVisible: nextBtn && window.getComputedStyle(nextBtn).display !== "none"
    };
  })()`);
  assert("Reinforcements Step 4 demo restores heavy mecha via dual double-click", reinfStep4.isRestored === true);
  assert("Reinforcements Step 4 dialog tip celebrates heavy robot restoration", reinfStep4.tipEn.includes("Restored!"));
  assert("Reinforcements Step 4 enables Next button", reinfStep4.nextVisible === true);

  // Step 5 Interactive Hands-On: Dual Double-Click
  await evalInPage(`window.gameInstance.tutorialEngine.runStep(5)`);
  await wait(200);

  const reinfStep5Init = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    return {
      interactiveWaiting: game.tutorialEngine.interactiveWaiting,
      botType: bot?.type,
      botHealth: bot?.health
    };
  })()`);
  assert("Reinforcements Step 5 enters interactive waiting", reinfStep5Init.interactiveWaiting === true);
  assert("Reinforcements Step 5 spawns heavy robot with 2 health", reinfStep5Init.botType === "heavy" && reinfStep5Init.botHealth === 2);

  // Double Click 1: Hit 1 -> damages armor
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    game.inputEngine.handleTargetClick(bot, { button: 0 });
    game.inputEngine.handleTargetClick(bot, { button: 0 });
  })()`);
  await wait(100);

  const reinfHit1Result = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    const tipEn = document.getElementById("tut-dialog-tip-en")?.textContent;
    return {
      botHealth: bot?.health,
      tipEn
    };
  })()`);
  assert("First double-click reduces heavy robot health to 1", reinfHit1Result.botHealth === 1);
  assert("First double-click instructs student to double-click ONE MORE TIME", reinfHit1Result.tipEn.includes("one more time") || reinfHit1Result.tipEn.includes("Armor cracked"));

  // Double Click 2: Hit 2 -> restores mecha!
  await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    game.inputEngine.handleTargetClick(bot, { button: 0 });
    game.inputEngine.handleTargetClick(bot, { button: 0 });
  })()`);
  await wait(200);

  const reinfHit2Result = await evalInPage(`(() => {
    const game = window.gameInstance;
    const bot = game.tutorialEngine.activeRobot;
    return {
      isRestored: bot?.isRestored,
      interactiveWaiting: game.tutorialEngine.interactiveWaiting
    };
  })()`);
  assert("Second double-click restores the heavy mecha", reinfHit2Result.isRestored === true);
  assert("Interactive waiting finishes upon heavy mecha restoration", reinfHit2Result.interactiveWaiting === false);

  // Transition to Step 6
  await wait(1000);
  const reinfStep6Result = await evalInPage(`(() => {
    const game = window.gameInstance;
    const titleEn = document.getElementById("tut-dialog-title-en")?.textContent;
    const startBtn = document.getElementById("tutorial-start-mission-btn");
    return {
      currentStep: game.tutorialEngine.currentStep,
      titleEn,
      startVisible: startBtn && window.getComputedStyle(startBtn).display !== "none"
    };
  })()`);
  assert("Reinforcements tutorial advances to Step 6 completion", reinfStep6Result.currentStep === 6);
  assert("Reinforcements Step 6 displays 'Start Mission' button", reinfStep6Result.startVisible === true);

  // Test 18.5: Zero-Kanji Verification for All Japanese Tutorial Strings Across All Modes
  console.log("\nTesting Zero-Kanji Verification Across All Japanese Tutorial Translations...");
  const jaAllTutKeysCheck = await evalInPage(`(() => {
    const ja = TRANSLATIONS.ja;
    const allTutorialKeys = [
      'tutBaseTitle', 'tutBaseTip',
      'tutLineTitle', 'tutLineTip',
      'tutPreviewTitle', 'tutPreviewTip',
      'tutRobotTitle', 'tutRobotTip',
      'tutDemoTitle', 'tutDemoTip',
      'tutRestoredTip',
      'tutYourTurnTitle', 'tutYourTurnTip', 'tutClickAgainTip',
      'tutSuccessTitle', 'tutSuccessTip',
      'tutReinfPreviewTitle', 'tutReinfPreviewTip',
      'tutReinfRobotTitle', 'tutReinfRobotTip',
      'tutReinfDemoTitle', 'tutReinfDemoTip',
      'tutReinfRestoredTip',
      'tutReinfYourTurnTitle', 'tutReinfYourTurnTip', 'tutReinfHit1Tip',
      'tutReinfSuccessTitle', 'tutReinfSuccessTip',
      'tutOverridePreviewTitle', 'tutOverridePreviewTip',
      'tutOverrideRobotTitle', 'tutOverrideRobotTip',
      'tutOverrideDemoTitle', 'tutOverrideDemoTip',
      'tutOverrideMultiTip',
      'tutOverrideRestoredTip',
      'tutOverrideYourTurnTitle', 'tutOverrideYourTurnTip',
      'tutOverrideTypeKeyTip',
      'tutOverride1RestoredTitle', 'tutOverride1RestoredTip',
      'tutOverrideDoubleFreezeTitle', 'tutOverrideDoubleFreezeTip',
      'tutOverrideFreezeSecondTip', 'tutOverrideBothFrozenTip',
      'tutOverrideTryMultiHalfTip',
      'tutOverrideSuccessTitle', 'tutOverrideSuccessTip'
    ];

    const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]/g;
    const failures = [];

    for (const key of allTutorialKeys) {
      const val = ja[key];
      if (!val) {
        failures.push({ key, error: "Missing key" });
      } else if (kanjiRegex.test(val)) {
        failures.push({ key, value: val, error: "Contains Kanji" });
      }
    }

    return {
      checkedCount: allTutorialKeys.length,
      allPassed: failures.length === 0,
      failures
    };
  })()`);

  assert("All 48 Japanese tutorial translation keys are present", jaAllTutKeysCheck.checkedCount === 48);
  assert("All 48 Japanese tutorial translation keys strictly contain ZERO Kanji", jaAllTutKeysCheck.allPassed === true, JSON.stringify(jaAllTutKeysCheck.failures));

  const allPassed = results.every(r => r.passed);
  console.log(`\n========================================`);
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`ALL TESTS PASSED: ${allPassed}`);
  console.log(`========================================\n`);

  ws.close();
  chromeProc.kill();
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  if (ws) ws.close();
  chromeProc.kill();
  process.exit(1);
});
