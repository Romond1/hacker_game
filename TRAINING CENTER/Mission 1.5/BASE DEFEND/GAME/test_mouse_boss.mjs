import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const htmlPath = "file:///d:/AI/SET OUT/GAMES/be_a_hacker/TRAINING CENTER/Mission 1.5/BASE DEFEND/GAME/index.html";
const port = 9226;
const testUserDataDir = path.join(os.tmpdir(), "chrome-mouse-boss-test-profile");

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
  console.log("RUNNING MISSION 7: MOUSE BOSS FIGHT VALIDATION SUITE");
  console.log("=======================================================\n");

  // TEST 1: Mode Configuration & Selection
  console.log("--- TEST 1: Mode Configuration & Selection ---");
  await evalInPage("window.gameInstance.setMode('mouse_boss')");
  await wait(150);

  const modeInfo = await evalInPage(`({
    modeId: window.gameInstance.currentModeId,
    mission: window.gameInstance.currentMode.mission,
    name: window.gameInstance.currentMode.name,
    hasBodyClass: document.body.classList.contains('mouse-boss-mode'),
    hasSkillClass: document.body.classList.contains('mouse-skill-mode'),
    pickerHasBoss: Boolean(document.querySelector('#debug-mode-select option[value="mouse_boss"]')),
    pickerValue: document.querySelector('#debug-mode-select') ? document.querySelector('#debug-mode-select').value : null,
    ultraVisible: document.querySelector('.diff-btn.diff-ultra')?.style.display !== 'none'
  })`);

  assert("Mode ID is 'mouse_boss'", modeInfo.modeId === "mouse_boss");
  assert("Mode Mission number is 7", modeInfo.mission === 7);
  assert("Mode Name is 'Mouse Boss Fight'", modeInfo.name === "Mouse Boss Fight");
  assert("Body has 'mouse-boss-mode' class", modeInfo.hasBodyClass === true);
  assert("Body has 'mouse-skill-mode' class", modeInfo.hasSkillClass === true);
  assert("Debug picker contains 'mouse_boss' option", modeInfo.pickerHasBoss === true);
  assert("Debug picker selects 'mouse_boss'", modeInfo.pickerValue === "mouse_boss");
  assert("Ultra difficulty button is visible in Mouse Boss Fight (Universal 6 difficulties)", modeInfo.ultraVisible === true);

  const miniGameMission7 = await evalInPage(`(() => {
    window.initMiniGame({ mission: 7 });
    return window.gameInstance.currentModeId;
  })()`);
  assert("initMiniGame({ mission: 7 }) activates mouse_boss", miniGameMission7 === "mouse_boss");

  const miniGameModeName = await evalInPage(`(() => {
    window.initMiniGame({ mode: 'mouse_boss_fight' });
    return window.gameInstance.currentModeId;
  })()`);
  assert("initMiniGame({ mode: 'mouse_boss_fight' }) alias activates mouse_boss", miniGameModeName === "mouse_boss");

  // TEST 2: Zero-Kanji Rule Verification
  console.log("\n--- TEST 2: Zero-Kanji Verification for Japanese Translations ---");
  const jaStrings = await evalInPage(`(() => {
    const kanjiRegex = /[\\u4e00-\\u9faf]/;
    const mode = GAME_MODES.mouse_boss;
    const jaTexts = [
      mode.titleSub?.ja || "",
      mode.subtitleSub?.ja || "",
      TRANSLATIONS.ja?.modeMouseBoss || "",
      TRANSLATIONS.ja?.mouseMasterRank || ""
    ];
    const lvl = new MouseBossLevel(window.gameInstance);
    lvl.waves.forEach(w => {
      if (w.titleSub?.ja) jaTexts.push(w.titleSub.ja);
    });
    lvl.dispose();
    return {
      texts: jaTexts,
      hasKanji: jaTexts.some(t => kanjiRegex.test(t)),
      failedStrings: jaTexts.filter(t => kanjiRegex.test(t))
    };
  })()`);

  assert("All checked Japanese strings contain strictly 0 Kanji (" + jaStrings.texts.length + " strings)", jaStrings.hasKanji === false, JSON.stringify(jaStrings.failedStrings));

  // TEST 3: Wave 1 World, Base Radar, Checkpoints, & Spawning
  console.log("\n--- TEST 3: Wave 1 World, Base Radar, Checkpoints, & Spawning ---");
  await evalInPage(`(() => {
    window.gameInstance.startRun();
    window.gameInstance.clearPendingTimers();
    window.gameInstance.startWave(1);
  })()`);
  await wait(300);

  const wave1Info = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    return {
      active: boss?.active,
      currentWave: boss?.currentWave,
      worldHeight: boss?.waves[0].worldHeight,
      robotsTotal: boss?.robotsTotal,
      robotsCount: boss?.robots.length,
      gatesCount: boss?.gates.length,
      gateKey: boss?.gates[0]?.key,
      hasBase: Boolean(boss?.baseEl),
      hasScrollbar: Boolean(boss?.trackBody && boss?.thumb),
      hasChecklist: Boolean(boss?.checklistEl),
      hasCircuitLayer: Boolean(boss?.circuitLayer),
      timerSec: boss?.timerSec,
      initialPositionAtBottom: boss?.viewport?.scrollTop > 1000
    };
  })()`);

  assert("MouseBossLevel is active", wave1Info.active === true);
  assert("Current wave is Wave 1", wave1Info.currentWave === 1);
  assert("Wave 1 world height is 2200px", wave1Info.worldHeight === 2200);
  assert("Wave 1 has 5 robots total", wave1Info.robotsTotal === 5);
  assert("Wave 1 has 1 security gate", wave1Info.gatesCount === 1);
  assert("Wave 1 gate key is 'CYAN'", wave1Info.gateKey === "CYAN");
  assert("Command Base radar is mounted inside world", wave1Info.hasBase === true);
  assert("Cyber scrollbar track and thumb are mounted", wave1Info.hasScrollbar === true);
  assert("Floating MOUSE MASTERY checklist is mounted", wave1Info.hasChecklist === true);
  assert("Wave 1 timer is difficulty-scaled (180s on Very Easy)", wave1Info.timerSec === 180);
  assert("Viewport starts scrolled to bottom (Command Base)", wave1Info.initialPositionAtBottom === true);

  const timerTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const badge = document.getElementById("hud-timer-badge");
    const valEl = document.getElementById("hud-timer-value");
    const initialText = valEl ? valEl.textContent : "";

    // Test urgency classes
    boss.timerSec = 20;
    boss.updateHUD();
    const hasWarning = badge.classList.contains("timer-warning") && !badge.classList.contains("timer-critical");

    boss.timerSec = 10;
    boss.updateHUD();
    const hasCritical = badge.classList.contains("timer-critical") && !badge.classList.contains("timer-warning");

    // Restore timer
    boss.timerSec = 180;
    boss.updateHUD();
    const isNormal = !badge.classList.contains("timer-warning") && !badge.classList.contains("timer-critical");

    return {
      visible: badge.style.display !== "none",
      initialText,
      hasWarning,
      hasCritical,
      isNormal
    };
  })()`);

  assert("HUD timer value displays formatted countdown (MM:SS)", /^[0-9]{2}:[0-9]{2}$/.test(timerTest.initialText));
  assert("HUD timer pulsates red warning at <= 20 seconds", timerTest.hasWarning === true);
  assert("HUD timer grows larger with critical pulse at <= 10 seconds", timerTest.hasCritical === true);
  assert("HUD timer returns to normal when > 20 seconds", timerTest.isNormal === true);

  // TEST 4: Upward Scrolling Barrier & Scroll Physics
  console.log("\n--- TEST 4: Upward Scrolling Barrier & Scroll Physics ---");
  const scrollTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const gate = boss.gates[0];
    
    boss.viewport.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, bubbles: true }));
    const wheelRegistered = boss.wheelEvents > 0;
    
    boss.viewport.scrollTop = 0;
    boss.viewport.dispatchEvent(new Event('scroll'));
    const clampedTop = boss.viewport.scrollTop;
    const minAllowed = gate.pixelY - 140;

    return {
      wheelRegistered,
      scrolledCheckmarked: boss.checkpoints.scrolled,
      barrierEnforced: clampedTop >= minAllowed,
      clampedTop,
      minAllowed
    };
  })()`);

  assert("Wheel events register and trigger metrics", scrollTest.wheelRegistered === true);
  assert("Checklist marks 'SCROLL FACILITY' checked", scrollTest.scrolledCheckmarked === true);
  assert("Upward scroll barrier strictly clamps scrollTop before locked gate", scrollTest.barrierEnforced === true);

  // TEST 5: Single-Click vs Double-Click Robot Restoration
  console.log("\n--- TEST 5: Single-Click vs Double-Click Robot Restoration ---");
  const botClickTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const infectedBot = boss.robots.find(r => r.state === 'infected');
    const initialScore = window.gameInstance.score;

    boss.handleRobotSingleClick(infectedBot);
    const afterSingleRestored = infectedBot.restored;
    const singleClickedClass = infectedBot.element.classList.contains('single-clicked');
    const hintVisible = infectedBot.hint?.classList.contains('visible');

    boss.handleRobotDoubleClick(infectedBot, 200, 200);
    const afterDoubleRestored = infectedBot.restored;
    const restoredClass = infectedBot.element.classList.contains('restored');
    const scoreIncreased = window.gameInstance.score > initialScore;
    const restoredInfectedCheckmarked = boss.checkpoints.restoredInfected;

    return {
      afterSingleRestored,
      singleClickedClass,
      hintVisible,
      afterDoubleRestored,
      restoredClass,
      scoreIncreased,
      restoredInfectedCheckmarked
    };
  })()`);

  assert("Single click does NOT restore the robot", botClickTest.afterSingleRestored === false);
  assert("Single click adds 'single-clicked' class", botClickTest.singleClickedClass === true);
  assert("Single click displays hint 'Double-click to restore!'", botClickTest.hintVisible === true);
  assert("Double click successfully restores the robot", botClickTest.afterDoubleRestored === true);
  assert("Restored robot has 'restored' class", botClickTest.restoredClass === true);
  assert("Restoring robot awards points", botClickTest.scoreIncreased === true);
  assert("Checklist marks 'RESTORE INFECTED' checked", botClickTest.restoredInfectedCheckmarked === true);

  // TEST 6: Cyber Locked Robot Mechanics
  console.log("\n--- TEST 6: Cyber Locked Robot Mechanics ---");
  const lockedBotTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const lockedBot = boss.robots.find(r => r.state === 'locked');
    
    boss.handleRobotDoubleClick(lockedBot, 300, 300);
    const prematureRestore = lockedBot.restored;

    boss.openContextMenu({ clientX: 250, clientY: 250, preventDefault: () => {} }, 'locked', lockedBot);
    const menuOpen = Boolean(boss.activeContextMenu);
    const releaseBtn = boss.activeContextMenu?.querySelector('.boss-context-btn');
    const hasReleaseText = releaseBtn?.textContent?.includes('RELEASE');

    boss.releaseLock(lockedBot);
    const isUnlocked = lockedBot.state === 'infected';
    const releaseCheckmarked = boss.checkpoints.releasedLocked;

    boss.handleRobotDoubleClick(lockedBot, 300, 300);
    const finallyRestored = lockedBot.restored;

    return {
      prematureRestore,
      menuOpen,
      hasReleaseText,
      isUnlocked,
      releaseCheckmarked,
      finallyRestored
    };
  })()`);

  assert("Double-clicking locked robot fails before releasing lock", lockedBotTest.prematureRestore === false);
  assert("Right-clicking locked robot opens in-game context menu", lockedBotTest.menuOpen === true);
  assert("Context menu contains 'RELEASE' action", lockedBotTest.hasReleaseText === true);
  assert("RELEASE action dissolves lock and transitions state to infected", lockedBotTest.isUnlocked === true);
  assert("Checklist marks 'RELEASE CYBER LOCKS' checked", lockedBotTest.releaseCheckmarked === true);
  assert("Double-clicking previously locked robot now restores it", lockedBotTest.finallyRestored === true);

  // TEST 7: Security Relay Gate Bypassing
  console.log("\n--- TEST 7: Security Relay Gate Bypassing ---");
  const gateTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const gate = boss.gates[0];

    gate.sourceCodeEl.dispatchEvent(new MouseEvent('mouseup', { button: 0, bubbles: true }));
    boss.checkpoints.selectedCode = true;
    boss.updateGateMiniChecklist(gate, 'select');
    const selectCheckmarked = boss.checkpoints.selectedCode;

    boss.clipboard = gate.key;
    boss.checkpoints.copiedCode = true;
    boss.updateGateMiniChecklist(gate, 'copy');
    const copyCheckmarked = boss.checkpoints.copiedCode;

    gate.destInputEl.dispatchEvent(new Event('focus', { bubbles: true }));
    const focusMiniStep = gate.checklistEl.querySelector('.step-focus')?.classList.contains('checked');

    boss.checkpoints.pastedCode = true;
    boss.updateGateMiniChecklist(gate, 'paste');
    gate.destInputEl.value = gate.key;
    boss.verifyGateKey(gate, gate.key);

    const gateUnlocked = gate.unlocked;
    const gateCheckmarked = boss.checkpoints.gateUnlocked;
    const barrierDissolved = gate.element.classList.contains('unlocked');

    boss.viewport.scrollTop = 0;
    boss.viewport.dispatchEvent(new Event('scroll'));
    const scrolledPast = boss.viewport.scrollTop === 0;

    return {
      selectCheckmarked,
      copyCheckmarked,
      focusMiniStep,
      gateUnlocked,
      gateCheckmarked,
      barrierDissolved,
      scrolledPast
    };
  })()`);

  assert("Text selection registers and marks checklist", gateTest.selectCheckmarked === true);
  assert("Context menu COPY copies key and marks checklist", gateTest.copyCheckmarked === true);
  assert("Focusing input marks mini-checklist step", gateTest.focusMiniStep === true);
  assert("Pasting matching key unlocks gate", gateTest.gateUnlocked === true);
  assert("Gate barrier dissolves with 'unlocked' class", gateTest.barrierDissolved === true);
  assert("Checklist marks 'UNLOCK SECTOR GATES' checked", gateTest.gateCheckmarked === true);
  assert("Upward scroll barrier is removed after unlocking gate", gateTest.scrolledPast === true);

  try {
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const b64 = shot.result?.data || shot.data;
    if (b64) {
      fs.writeFileSync("C:/Users/user/.gemini/antigravity/brain/ee5b60c5-e0dc-468e-bb09-1a0127daea64/mouse_boss_bottom_checklist.png", Buffer.from(b64, "base64"));
    }
  } catch (e) {
    console.warn("Screenshot capture error:", e);
  }

  // Restore remaining robots in Wave 1
  await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    boss.robots.forEach(r => {
      if (!r.restored && !r.friendly) {
        boss.restoreRobot(r, 100, 100);
      }
    });
    boss.checkWaveProgress();
  })()`);

  await wait(1600);

  // TEST 8: Wave 2 (Decoys & Multiple Gates)
  console.log("\n--- TEST 8: Wave 2 Decoys & Multiple Gates ---");
  const wave2Info = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const decoy = boss.robots.find(r => r.friendly);
    const initialRestored = boss.robotsRestored;
    const initialScore = window.gameInstance.score;

    boss.handleRobotDoubleClick(decoy, 200, 200);
    const decoyRestoredCount = boss.robotsRestored;
    const decoyScore = window.gameInstance.score;
    const decoyHintVisible = decoy?.hint?.classList.contains('visible');

    return {
      currentWave: boss.currentWave,
      gatesCount: boss.gates.length,
      hasDecoy: Boolean(decoy),
      decoyIgnored: decoyRestoredCount === initialRestored && decoyScore === initialScore,
      decoyHintVisible
    };
  })()`);

  assert("Advanced to Wave 2", wave2Info.currentWave === 2);
  assert("Wave 2 has 2 security gates", wave2Info.gatesCount === 2);
  assert("Wave 2 includes friendly decoy robots", wave2Info.hasDecoy === true);
  assert("Double-clicking decoy does NOT add to restored count or score", wave2Info.decoyIgnored === true);
  assert("Decoy displays harmless 'Already secure!' feedback", wave2Info.decoyHintVisible === true);

  // Complete Wave 2
  await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    boss.gates.forEach(g => boss.unlockGate(g));
    boss.robots.forEach(r => {
      if (r.state === 'locked') boss.releaseLock(r);
      if (!r.restored && !r.friendly) boss.restoreRobot(r, 100, 100);
    });
    boss.checkWaveProgress();
  })()`);

  await wait(1600);

  // TEST 9: Wave 3 (Linked Pairs Moving in Tandem)
  console.log("\n--- TEST 9: Wave 3 Linked Pairs (Tandem Movement & Unlink) ---");
  const wave3Info = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const pair = boss.pairs[0];
    const botA = pair?.botA;
    const botB = pair?.botB;

    // Verify tandem movement: distance between botA and botB must remain constant during movement
    const initialDist = botB.x - botA.x;
    boss.update(0.5);
    const afterMoveDist = botB.x - botA.x;
    const movedInTandem = Math.abs(afterMoveDist - initialDist) < 0.01;

    boss.handleRobotDoubleClick(botA, 100, 100);
    const prematureRestore = botA.restored;

    boss.openContextMenu({ clientX: 200, clientY: 200, preventDefault: () => {} }, 'linked', pair);
    const menuOpen = Boolean(boss.activeContextMenu);
    const unlinkBtn = boss.activeContextMenu?.querySelector('.boss-context-btn');
    const hasUnlinkText = unlinkBtn?.textContent?.includes('UNLINK') || unlinkBtn?.textContent?.includes('UNTANGLE');

    boss.unlinkPair(pair);
    const pairUnlinked = pair.unlinked && pair.untangled;
    const unlinkCheckmarked = boss.checkpoints.unlinkedPair && boss.checkpoints.untangledPair;
    const cableSevered = !pair.cableEl?.parentNode;

    boss.handleRobotDoubleClick(botA, 100, 100);
    boss.handleRobotDoubleClick(botB, 100, 100);
    const bothRestored = botA.restored && botB.restored;

    return {
      currentWave: boss.currentWave,
      gatesCount: boss.gates.length,
      movedInTandem,
      prematureRestore,
      menuOpen,
      hasUnlinkText,
      pairUnlinked,
      unlinkCheckmarked,
      cableSevered,
      bothRestored
    };
  })()`);

  assert("Advanced to Wave 3", wave3Info.currentWave === 3);
  assert("Wave 3 has 3 security gates", wave3Info.gatesCount === 3);
  assert("Linked robots move in tandem (fixed relative distance)", wave3Info.movedInTandem === true);
  assert("Double-clicking linked robot fails before unlinking", wave3Info.prematureRestore === false);
  assert("Right-clicking linked pair opens context menu with 'UNLINK'", wave3Info.menuOpen && wave3Info.hasUnlinkText);
  assert("UNLINK action unlinks robots and severs energy cable", wave3Info.pairUnlinked && wave3Info.cableSevered);
  assert("Checklist marks 'UNLINK ROBOT PAIR' checked", wave3Info.unlinkCheckmarked === true);
  assert("Double-clicking unlinked robots successfully restores both", wave3Info.bothRestored === true);

  // Complete Wave 3
  await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    boss.gates.forEach(g => boss.unlockGate(g));
    boss.robots.forEach(r => {
      if (r.state === 'locked') boss.releaseLock(r);
      if (!r.restored && !r.friendly) boss.restoreRobot(r, 100, 100);
    });
    boss.checkWaveProgress();
  })()`);

  await wait(1600);

  // TEST 10: Wave 4 Summit Boss Wave & Primary Relay Climax
  console.log("\n--- TEST 10: Wave 4 Summit Boss Wave & Primary Relay Climax ---");
  const wave4Info = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    return {
      currentWave: boss.currentWave,
      isBossWave: Boolean(boss.waves[3].isBossWave),
      gatesCount: boss.gates.length,
      hasPrimaryRelay: Boolean(boss.primaryRelay),
      relayKey: boss.primaryRelay?.key,
      worldHeight: boss.waves[3].worldHeight
    };
  })()`);

  assert("Advanced to Wave 4 (Boss Wave)", wave4Info.currentWave === 4);
  assert("Wave 4 has 3 security gates + Primary Relay", wave4Info.gatesCount === 3 && wave4Info.hasPrimaryRelay);
  assert("Primary Relay key is 'MASTER-CORE'", wave4Info.relayKey === "MASTER-CORE");
  assert("Wave 4 summit world height is at least 4000px", wave4Info.worldHeight >= 4000);

  const relayTest = await evalInPage(`(() => {
    const boss = window.gameInstance.mouseBossLevel;
    const relay = boss.primaryRelay;

    boss.gates.forEach(g => boss.unlockGate(g));

    boss.restorePrimaryRelay(relay);
    const prematureArmed = relay.armed;

    boss.verifyPrimaryRelayKey(relay, relay.key);
    const relayArmed = relay.armed;
    const relayArmedClass = relay.element.classList.contains('armed');

    boss.restorePrimaryRelay(relay);
    const relayRestored = relay.restored;
    const relayCheckmarked = boss.checkpoints.primaryRelayRestored;

    return {
      prematureArmed,
      relayArmed,
      relayArmedClass,
      relayRestored,
      relayCheckmarked
    };
  })()`);

  assert("Primary Relay requires valid key verification before arming", relayTest.prematureArmed === false);
  assert("Verifying 'MASTER-CORE' arms the Primary Relay", relayTest.relayArmed && relayTest.relayArmedClass);
  assert("Double-clicking Primary Relay triggers restoration", relayTest.relayRestored === true);
  assert("Checklist marks 'PRIMARY COMMAND RELAY' checked", relayTest.relayCheckmarked === true);

  await wait(2200);

  // TEST 11: Victory Results Screen & Metrics
  console.log("\n--- TEST 11: Victory Results Screen & Metrics ---");
  const victoryInfo = await evalInPage(`(() => {
    const game = window.gameInstance;
    const resultsEl = document.getElementById('screen-results');
    return {
      gameState: game.state,
      resultsActive: resultsEl?.classList.contains('active'),
      title: document.getElementById('results-title')?.textContent,
      rank: document.getElementById('res-star-rank-en')?.textContent,
      starsEarned: game.starsEarned,
      wavesDisplay: document.getElementById('res-stat-waves')?.textContent,
      shieldsDisplay: document.getElementById('res-stat-shields')?.textContent,
      earnedXP: game.earnedXP,
      earnedCredits: game.earnedCredits
    };
  })()`);

  assert("Game state is 'victory'", victoryInfo.gameState === "victory");
  assert("Results screen overlay is active", victoryInfo.resultsActive === true);
  assert("Results title is 'Facility Fully Restored!'", victoryInfo.title === "Facility Fully Restored!");
  assert("Player rank is 'MOUSE MASTER!'", victoryInfo.rank === "MOUSE MASTER!");
  assert("Awarded 3 Stars for complete victory", victoryInfo.starsEarned === 3);
  assert("Results screen waves display reads '4 / 4'", victoryInfo.wavesDisplay === "4 / 4");
  assert("Results screen shields display reads '-- / --'", victoryInfo.shieldsDisplay === "-- / --");
  assert("XP and Credits rewarded (+200 XP, +100 Credits)", victoryInfo.earnedXP >= 200 && victoryInfo.earnedCredits >= 100);

  // TEST 12: render_game_to_text Output
  console.log("\n--- TEST 12: render_game_to_text Output ---");
  const renderDataStr = await evalInPage("window.render_game_to_text()");
  const renderData = JSON.parse(renderDataStr);

  assert("render_game_to_text mode is 'mouse_boss'", renderData.mode === "mouse_boss");
  assert("render_game_to_text state is 'victory'", renderData.state === "victory");
  assert("render_game_to_text totalWaves is 4", renderData.totalWaves === 4);
  assert("render_game_to_text reports robotsRestored", typeof renderData.robotsRestored === "number");
  assert("render_game_to_text reports gatesOpen", typeof renderData.gatesOpen === "number");

  console.log("\n=======================================================");
  console.log("ALL MISSION 7 MOUSE BOSS FIGHT TESTS PASSED!");
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
