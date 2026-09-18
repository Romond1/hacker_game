/* ==========================================================================
   MISSION 4 TRAINING: FALLING DEBRIS
   Educational Physical Skill: CLICK + HOLD + DRAG + RELEASE
   Continuous falling debris hazard avoidance with physical base repositioning.
   Preserves the existing game shell, visual language, HUD, scoring, audio,
   tutorial architecture, difficulty system, and completion screens.
   ========================================================================== */
(() => {
  const modes = {
    drag_rescue: {
      id: 'drag_rescue',
      mission: 4,
      name: 'Falling Debris',
      titleEn: 'Mission 4 Training · Falling Debris',
      titleSub: {
        en: 'Falling Debris',
        ja: 'ミッション 4: らっか デブリ',
        it: 'Missione 4: Caduta Detriti'
      },
      subtitleEn: 'Meteor storm! LEFT-click and HOLD Base Alpha & Beta, DRAG out of harm\'s way, and RELEASE.',
      subtitleSub: {
        en: 'Click, hold, drag, and release to save both bases!',
        ja: 'らっかデブリから ふたつのきティを まもれ！ ひだりクリックを おしたまま きティを うごかして、はなそう！',
        it: 'Tempesta di meteoriti! Clicca e tieni premute le basi, trascinale lontano dai crateri e rilascia.'
      },
      allowedRobots: [],
      mechanic: 'drag_base_avoidance'
    },
    robot_link: {
      id: 'robot_link',
      mission: 5,
      name: 'Mission 5 Robot Link',
      titleEn: 'Mission 5 Training · Robot Link',
      titleSub: { it: 'Collega Robot', ja: 'ミッション 5: ロボット リンク' },
      subtitleEn: 'Linked robots incoming in tandem! RIGHT-CLICK either robot to open the UNLINK menu. Click UNLINK to sever the link, then DOUBLE-CLICK each robot to restore it to cyan!',
      subtitleSub: { it: 'Fai clic destro per aprire il menu UNLINK, poi doppio clic per ripristinare!', ja: 'ロボットを みぎクリックして UNLINK で かいじょ！ かいじょしたら ダブルクリックで なおそう！' },
      allowedRobots: ['standard', 'heavy', 'speeder', 'tank'],
      mechanic: 'context_menu_unlink_restore'
    },
    robot_untangle: {
      id: 'robot_untangle',
      mission: 5,
      name: 'Mission 5 Robot Link',
      titleEn: 'Mission 5 Training · Robot Link',
      titleSub: { it: 'Collega Robot', ja: 'ミッション 5: ロボット リンク' },
      subtitleEn: 'Linked robots incoming in tandem! RIGHT-CLICK either robot to open the UNLINK menu. Click UNLINK to sever the link, then DOUBLE-CLICK each robot to restore it to cyan!',
      subtitleSub: { it: 'Fai clic destro per aprire il menu UNLINK, poi doppio clic per ripristinare!', ja: 'ロボットを みぎクリックして UNLINK で かいじょ！ かいじょしたら ダブルクリックで なおそう！' },
      allowedRobots: ['standard', 'heavy', 'speeder', 'tank'],
      mechanic: 'context_menu_unlink_restore'
    },
    mouse_boss: {
      id: 'mouse_boss',
      mission: 7,
      name: 'Mouse Boss Fight',
      titleEn: 'Mission 7 Training · Mouse Boss Fight',
      titleSub: {
        en: 'Mouse Boss Fight',
        ja: 'マウスボスバトル',
        it: 'Scontro Boss Mouse'
      },
      subtitleEn: 'Scroll the cyber facility, bypass security gates, untangle the bots, and restore the Primary Relay.',
      subtitleSub: {
        en: 'Master every mouse skill in this final boss combat challenge!',
        ja: 'すべての マウスわざを つかいこなして、メインリレーを ふっきゅうせよ！',
        it: 'Padroneggia tutte le abilità del mouse in questa sfida boss finale!'
      },
      allowedRobots: [],
      mechanic: 'mouse_boss'
    }
  };

  const STATES = (typeof GAME_STATES !== 'undefined') ? GAME_STATES : {
    START: 'start',
    PRACTICE: 'practice',
    TUTORIAL: 'tutorial',
    COUNTDOWN: 'countdown',
    ACTIVE: 'active',
    INTERMISSION: 'intermission',
    PAUSED: 'paused',
    VICTORY: 'victory',
    DEFEAT: 'defeat'
  };
  const scorePerDebris = (typeof GAME_CONFIG !== 'undefined' && GAME_CONFIG.scorePerRobot) || 100;

  // Safe synthesized audio trigger that never crashes if a method is missing
  const playSfx = (name) => {
    try {
      const am = (typeof audioManager !== 'undefined') ? audioManager : (window.gameInstance && window.gameInstance.audioManager);
      if (!am || am.muted) return;
      if (name === 'destroy' || name === 'explosion' || name === 'impact') {
        if (typeof am.playHeavyDestroy === 'function') am.playHeavyDestroy();
        else if (typeof am.playDestroy === 'function') am.playDestroy();
        else if (typeof am.playExplosion === 'function') am.playExplosion();
      } else if (name === 'lockOn') {
        if (typeof am.playLockOn === 'function') am.playLockOn();
      } else if (name === 'victory') {
        if (typeof am.playVictory === 'function') am.playVictory();
      }
    } catch (e) {
      console.warn('[Audio] playSfx error:', e);
    }
  };

  if (typeof audioManager !== 'undefined' && audioManager && !audioManager.playExplosion) {
    audioManager.playExplosion = function() {
      if (typeof this.playHeavyDestroy === 'function') this.playHeavyDestroy();
      else if (typeof this.playDestroy === 'function') this.playDestroy();
    };
  }

  if (typeof GAME_MODES !== 'undefined') {
    Object.assign(GAME_MODES, modes);
    GAME_MODES.falling_debris = modes.drag_rescue;
    GAME_MODES.mouse_boss_fight = modes.mouse_boss;
    GAME_MODES.mouseBoss = modes.mouse_boss;
    GAME_MODES.robot_untangle = modes.robot_link;
    GAME_MODES.robotLink = modes.robot_link;
    GAME_MODES.robotUntangle = modes.robot_link;
  }

  // Inject Dedicated Style Layer for Falling Debris
  const style = document.createElement('style');
  style.id = 'falling-debris-styles';
  style.textContent = `
    .mouse-training-root {
      position: absolute;
      inset: 0;
      z-index: 45;
      touch-action: none;
      user-select: none;
      pointer-events: none;
      overflow: hidden;
    }

    .debris-instruction-banner {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      max-width: 580px;
      width: 92%;
      text-align: center;
      padding: 8px 18px;
      border: 1px solid rgba(0, 240, 255, 0.45);
      border-radius: 24px;
      background: rgba(9, 28, 46, 0.90);
      color: #efffff;
      font: 700 clamp(12px, 1.5vw, 15px)/1.35 var(--font-family, sans-serif);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0, 240, 255, 0.25);
      box-sizing: border-box;
      pointer-events: none;
      z-index: 45;
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .debris-instruction-banner.fade-out {
      opacity: 0;
      transform: translateX(-50%) translateY(-10px);
    }
    .debris-instruction-banner small {
      display: block;
      color: #a9e7eb;
      font-size: 0.8em;
      font-weight: 500;
      margin-top: 2px;
    }

    /* Base Entity (Player draggable object) */
    .debris-base-entity {
      position: absolute;
      width: clamp(105px, 15vw, 140px);
      height: clamp(85px, 13vw, 115px);
      transform: translate(-50%, -50%);
      cursor: grab;
      touch-action: none;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 40;
      transition: transform 0.08s ease-out, filter 0.2s ease, opacity 0.3s ease;
      background: transparent;
      border: none;
      padding: 0;
    }
    .debris-base-entity:focus-visible {
      outline: 2px solid #00f0ff;
      outline-offset: 4px;
    }
    .debris-base-entity.grabbed {
      cursor: grabbing !important;
      transform: translate(-50%, -50%) scale(1.06);
      filter: drop-shadow(0 0 22px #00f0ff) brightness(1.15);
      z-index: 48;
    }
    .debris-base-entity.in-danger {
      filter: drop-shadow(0 0 22px #ff2222) brightness(1.2);
    }
    .debris-base-entity.in-danger .debris-base-shield-halo {
      border-color: #ff3333 !important;
      box-shadow: 0 0 22px rgba(255, 51, 51, 0.9) !important;
      animation: dangerHaloPulse 0.4s infinite alternate ease-in-out;
    }
    @keyframes dangerHaloPulse {
      0% { transform: scale(0.98); opacity: 0.8; }
      100% { transform: scale(1.06); opacity: 1; }
    }
    .debris-base-entity.damaged {
      animation: debrisBaseShake 0.4s ease-in-out;
      filter: drop-shadow(0 0 25px #ff4444) brightness(1.6);
    }
    @keyframes debrisBaseShake {
      0%, 100% { transform: translate(-50%, -50%); }
      20% { transform: translate(-56%, -48%); }
      40% { transform: translate(-44%, -52%); }
      60% { transform: translate(-54%, -50%); }
      80% { transform: translate(-46%, -49%); }
    }

    /* Base Destroyed State */
    .debris-base-entity.destroyed {
      opacity: 0.35 !important;
      filter: grayscale(1) brightness(0.5) !important;
      cursor: not-allowed !important;
      pointer-events: none !important;
    }
    .debris-base-entity.destroyed .debris-base-shield-halo {
      display: none !important;
    }
    .debris-base-entity.destroyed .debris-base-label {
      color: #888888 !important;
      border-color: #555555 !important;
      text-decoration: line-through;
    }

    /* Per-Base Health Bar (3 pips displayed directly above base label) */
    .debris-base-health-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 3px;
      pointer-events: none;
      background: rgba(5, 8, 17, 0.90);
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid rgba(0, 240, 255, 0.45);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
      z-index: 41;
    }
    .debris-base-entity.beta .debris-base-health-bar {
      border-color: rgba(34, 197, 94, 0.65);
    }
    .debris-hp-pip {
      width: 16px;
      height: 6px;
      border-radius: 2px;
      background: #00f0ff;
      box-shadow: 0 0 6px #00f0ff;
      transition: all 0.25s ease;
    }
    /* Base Beta: 100% Green Theme (Label, Health Bar, Pips, Shield Halo, Hitbox) */
    .debris-base-entity.beta .debris-hp-pip {
      background: #22c55e;
      box-shadow: 0 0 7px #22c55e;
    }
    .debris-hp-pip.lost {
      background: rgba(255, 68, 68, 0.25) !important;
      box-shadow: none !important;
      border: 1px solid rgba(255, 68, 68, 0.4);
    }

    .debris-base-img {
      width: 100%;
      height: 75%;
      object-fit: contain;
      pointer-events: none;
      filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.7));
    }

    .debris-base-label {
      font-family: var(--font-family, sans-serif);
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 1px;
      color: #00f0ff;
      text-shadow: 0 0 8px rgba(0, 240, 255, 0.8);
      background: rgba(5, 8, 17, 0.85);
      padding: 2px 8px;
      border-radius: 6px;
      border: 1px solid rgba(0, 240, 255, 0.4);
      margin-bottom: 2px;
      pointer-events: none;
      white-space: nowrap;
    }
    .debris-base-entity.beta .debris-base-label {
      color: #22c55e;
      text-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
      border-color: rgba(34, 197, 94, 0.6);
    }

    .debris-base-shield-halo {
      position: absolute;
      inset: -6px;
      border: 2px solid rgba(0, 240, 255, 0.35);
      border-radius: 20px;
      pointer-events: none;
      transition: all 0.2s ease;
      background: radial-gradient(ellipse at center, rgba(0, 240, 255, 0.08) 0%, transparent 70%);
    }
    .debris-base-entity.grabbed .debris-base-shield-halo {
      border-color: #00f0ff;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.6);
      background: radial-gradient(ellipse at center, rgba(0, 240, 255, 0.18) 0%, transparent 75%);
    }
    .debris-base-entity.beta .debris-base-shield-halo {
      border-color: rgba(34, 197, 94, 0.45);
      background: radial-gradient(ellipse at center, rgba(34, 197, 94, 0.09) 0%, transparent 70%);
    }
    .debris-base-entity.beta.grabbed .debris-base-shield-halo {
      border-color: #22c55e;
      box-shadow: 0 0 22px rgba(34, 197, 94, 0.75);
      background: radial-gradient(ellipse at center, rgba(34, 197, 94, 0.22) 0%, transparent 75%);
    }
    .debris-base-entity.beta.grabbed {
      filter: drop-shadow(0 0 22px #22c55e) brightness(1.15) !important;
    }
    .debris-base-entity.beta:focus-visible {
      outline: 2px solid #22c55e;
    }
    body.debug-hitboxes .debris-base-entity.beta {
      outline: 2px dashed #22c55e !important;
    }

    /* Danger Warning Zones - Highly Visible Glowing & Breathing Animation */
    .debris-danger-zone {
      position: absolute;
      transform: translate(-50%, -50%);
      width: clamp(140px, 19vw, 175px);
      height: clamp(105px, 14vw, 135px);
      border: 3px dashed #ff3333;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(255, 34, 34, 0.45) 0%, rgba(255, 68, 68, 0.22) 50%, rgba(255, 34, 34, 0.05) 75%, transparent 100%);
      pointer-events: none;
      z-index: 25;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      animation: dangerGlowBreathe 1.2s infinite ease-in-out;
    }
    @keyframes dangerGlowBreathe {
      0% {
        transform: translate(-50%, -50%) scale(0.95);
        box-shadow: 0 0 22px rgba(255, 34, 34, 0.75), 0 0 50px rgba(255, 68, 68, 0.4), inset 0 0 25px rgba(255, 34, 34, 0.45);
        border-color: #ff3333;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.08);
        box-shadow: 0 0 38px rgba(255, 60, 60, 0.95), 0 0 80px rgba(255, 100, 50, 0.65), inset 0 0 45px rgba(255, 50, 50, 0.65);
        border-color: #ff8833;
      }
      100% {
        transform: translate(-50%, -50%) scale(0.95);
        box-shadow: 0 0 22px rgba(255, 34, 34, 0.75), 0 0 50px rgba(255, 68, 68, 0.4), inset 0 0 25px rgba(255, 34, 34, 0.45);
        border-color: #ff3333;
      }
    }

    .debris-danger-ring {
      position: absolute;
      inset: -14px;
      border: 2px solid rgba(255, 68, 68, 0.75);
      border-radius: 50%;
      pointer-events: none;
      animation: dangerRingPulse 1.2s infinite ease-out;
    }
    @keyframes dangerRingPulse {
      0% { transform: scale(0.85); opacity: 0.9; }
      100% { transform: scale(1.18); opacity: 0; }
    }

    .debris-danger-zone.near-impact {
      border-color: #ff1111;
      background: radial-gradient(ellipse at center, rgba(255, 20, 20, 0.6) 0%, rgba(255, 50, 50, 0.35) 60%, transparent 100%);
      animation: dangerZoneFastPulse 0.3s infinite alternate ease-in-out;
    }
    @keyframes dangerZoneFastPulse {
      0% {
        transform: translate(-50%, -50%) scale(1.02);
        box-shadow: 0 0 32px rgba(255, 20, 20, 0.95), 0 0 65px rgba(255, 50, 20, 0.65);
      }
      100% {
        transform: translate(-50%, -50%) scale(1.14);
        box-shadow: 0 0 55px rgba(255, 0, 0, 1), 0 0 95px rgba(255, 80, 0, 0.88);
      }
    }

    .debris-danger-label {
      position: relative;
      z-index: 49;
      font-family: var(--font-family, sans-serif);
      font-weight: 900;
      font-size: clamp(11px, 1.3vw, 14px);
      letter-spacing: 1px;
      color: #ffffff;
      text-shadow: 0 0 8px #ff1111, 0 0 14px #ff3333;
      background: rgba(220, 20, 20, 0.88);
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.4);
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.7), 0 0 12px rgba(255, 34, 34, 0.8);
      white-space: nowrap;
    }
    .debris-danger-shadow {
      position: absolute;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.65);
      width: 50%;
      height: 40%;
      transform: scale(0.2);
      filter: blur(4px);
      pointer-events: none;
    }

    /* Falling Boulder Object - strictly controlled size: max 85px */
    .debris-boulder-entity {
      position: absolute;
      width: clamp(65px, 8.5vw, 85px);
      height: clamp(65px, 8.5vw, 85px);
      max-width: 85px;
      max-height: 85px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 35;
      object-fit: contain;
      filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.85));
    }

    /* Impact Explosion FX */
    .debris-impact-fx {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 150px;
      height: 150px;
      pointer-events: none;
      z-index: 42;
      border-radius: 50%;
      background: radial-gradient(circle, #ffffff 0%, #ff8c00 40%, rgba(255, 68, 68, 0.75) 70%, transparent 100%);
      animation: debrisImpactFlash 0.35s ease-out forwards;
    }
    @keyframes debrisImpactFlash {
      0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.85; }
      100% { transform: translate(-50%, -50%) scale(1.6); opacity: 0; }
    }

    /* Dust Crater Ring */
    .debris-crater-ring {
      position: absolute;
      transform: translate(-50%, -50%);
      width: 90px;
      height: 45px;
      border: 2px solid rgba(255, 170, 68, 0.7);
      border-radius: 50%;
      pointer-events: none;
      z-index: 22;
      animation: debrisCraterFade 0.6s ease-out forwards;
    }
    @keyframes debrisCraterFade {
      0% { transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
      100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
    }

    /* Hide static base-defense container during Falling Debris mode */
    body.drag-rescue-mode #base-defense {
      display: none !important;
    }


    /* Robot Untangle Mode Styles */
    .mouse-training { position:absolute; inset:0; z-index:50; touch-action:none; user-select:none; }
    .mouse-training-instruction { position:absolute; top:3%; left:5%; width:90%; text-align:center; padding:14px; border:1px solid #50e5ee; border-radius:12px; background:#091c2ef2; color:#efffff; font:600 clamp(14px,2vw,22px)/1.4 sans-serif; box-sizing:border-box; }
    .mouse-training-instruction small { display:block; color:#a9e7eb; font-size:.72em; }
    .mouse-bot { position:absolute; width:clamp(70px,13%,125px); height:clamp(90px,24%,155px); border:2px solid transparent; background:transparent; transform:translate(-50%,-50%); cursor:grab; touch-action:none; color:white; padding:0; }
    .mouse-bot img { width:100%; height:80%; object-fit:contain; pointer-events:none; filter:drop-shadow(0 0 10px #00eaff); }
    .mouse-bot.selected { border-color:#a5faff; border-radius:12px; }
    .mouse-bot.tangled::after { content:'⛓'; position:absolute; inset:25% 0; font-size:50px; color:#ffad6b; text-shadow:0 0 10px #fa6800; }
    .mouse-options { position:absolute; z-index:40; width:180px; max-width:70%; background:#e6f0f3; color:#102836; padding:5px; border:1px solid #687c89; border-radius:4px; box-shadow:4px 5px 12px #0008; }
    .mouse-options button { display:block; width:100%; text-align:left; background:transparent; color:inherit; padding:10px; border:0; font:16px sans-serif; }
    .mouse-options button:hover,.mouse-options button:focus { background:#b9e7f4; }
    .mouse-options small { display:block; font-size:12px; }

    /* Enlarged End Screen (Results Screen) in Falling Debris - Fills the Screen */
    body.drag-rescue-mode #screen-results {
      padding: 10px;
      box-sizing: border-box;
    }
    body.drag-rescue-mode #screen-results .screen-card {
      width: 98%;
      max-width: min(1200px, 98vw);
      height: 96%;
      max-height: 96vh;
      padding: 20px 32px;
      gap: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 2.5px solid rgba(0, 240, 255, 0.6);
      box-shadow: 0 0 45px rgba(0, 240, 255, 0.25), 0 14px 45px rgba(0, 0, 0, 0.85);
      box-sizing: border-box;
      border-radius: 20px;
    }
    body.drag-rescue-mode #screen-results .screen-title {
      font-size: clamp(24px, 3.2vw, 36px);
      line-height: 1.15;
    }
    body.drag-rescue-mode #screen-results .screen-title .sub-lang {
      font-size: clamp(14px, 1.8vw, 18px);
    }
    body.drag-rescue-mode #screen-results .screen-subtitle {
      font-size: clamp(14px, 1.7vw, 18px);
      max-width: 900px;
      line-height: 1.35;
    }
    body.drag-rescue-mode #screen-results .results-wide-body {
      flex: 1;
      width: 100%;
      display: grid;
      grid-template-columns: 1.1fr 1.3fr;
      gap: 28px;
      align-items: center;
    }
    body.drag-rescue-mode #screen-results .star-slot {
      font-size: clamp(52px, 6.5vw, 68px);
    }
    body.drag-rescue-mode #screen-results .star-rank-badge {
      font-size: clamp(14px, 1.8vw, 18px);
      padding: 6px 20px;
    }
    body.drag-rescue-mode #screen-results .results-rewards-row {
      gap: 12px;
    }
    body.drag-rescue-mode #screen-results .reward-chip {
      padding: 10px 14px;
    }
    body.drag-rescue-mode #screen-results .results-grid {
      gap: 12px;
    }
    body.drag-rescue-mode #screen-results .result-stat-card {
      padding: 12px 18px;
    }
    body.drag-rescue-mode #screen-results .result-stat-val {
      font-size: clamp(18px, 2.4vw, 26px);
    }
    body.drag-rescue-mode #screen-results .btn-row {
      margin-top: 6px;
      gap: 24px;
    }
    body.drag-rescue-mode #screen-results .primary-btn,
    body.drag-rescue-mode #screen-results .secondary-btn {
      padding: 12px 36px;
      font-size: clamp(15px, 1.8vw, 18px);
    }

    /* Game Mode Picker in Debug Bar */
    .debug-mode-select {
      background: #0d1527;
      color: #00f0ff;
      border: 1px solid rgba(0, 240, 255, 0.45);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      padding: 1px 6px;
      margin-left: 8px;
      cursor: pointer;
      font-family: inherit;
      outline: none;
      transition: all 0.15s ease;
    }
    .debug-mode-select:hover, .debug-mode-select:focus {
      border-color: #00f0ff;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
      background: #111c33;
    }
    .debug-mode-select option {
      background: #0d1527;
      color: #e2e8f0;
      padding: 4px;
    }
  `;
  document.head.appendChild(style);

  // Core Falling Debris Level Engine
  class FallingDebrisLevel {
    constructor(game) {
      this.game = game;
      this.active = true;
      this.elapsedTime = 0;
      this.spawnTimer = 1.0;
      this.boulders = [];
      this.dangerZones = [];
      this.bouldersSpawnedInWave = 0;
      this.bouldersAvoidedInWave = 0;
      this.activeDrag = null;
      this.nextThreatId = 1;
      this.lastTargetedBaseId = 2; // Initial state: 1st rock targets Base 1 (Alpha)

      // Difficulty Configurations: 2 bases across all difficulties, 10 debris per wave
      // Difficulty Configurations: 2 bases across all difficulties, exactly 3 waves of 10 debris each
      this.difficultyConfig = {
        veryEasy:  { waves: 3, bases: 2, simultaneous: 1, fallSec: 4.6, interval: 2.8, waveDebris: 10 },
        easy:      { waves: 3, bases: 2, simultaneous: 2, fallSec: 4.2, interval: 2.4, waveDebris: 10 },
        normal:    { waves: 3, bases: 2, simultaneous: 2, fallSec: 3.8, interval: 2.0, waveDebris: 10 },
        difficult: { waves: 3, bases: 2, simultaneous: 3, fallSec: 3.6, interval: 1.8, waveDebris: 10 },
        hard:      { waves: 3, bases: 2, simultaneous: 3, fallSec: 3.4, interval: 1.6, waveDebris: 10 },
        ultra:     { waves: 3, bases: 2, simultaneous: 4, fallSec: 3.2, interval: 1.4, waveDebris: 10 }
      };

      this.mount();
    }

    getConfig() {
      if (this.game.state === STATES.TUTORIAL) {
        return this.difficultyConfig.veryEasy;
      }
      return this.difficultyConfig[this.game.selectedDifficulty] || this.difficultyConfig.normal;
    }

    text(en, ja, it) {
      const l = this.game.currentLanguage;
      return l === 'ja' ? ja : (l === 'it' ? it : en);
    }

    mount() {
      this.dispose();
      this.active = true;
      this.root = document.createElement('div');
      this.root.className = 'mouse-training-root falling-debris-active';
      this.root.oncontextmenu = (e) => e.preventDefault();
      this.game.playfieldEl.appendChild(this.root);

      const cfg = this.getConfig();
      this.game.totalWaves = cfg.waves === Infinity ? Infinity : 3;

      // Top Instruction Banner
      this.banner = document.createElement('div');
      this.banner.className = 'debris-instruction-banner';
      this.banner.setAttribute('role', 'status');
      this.root.appendChild(this.banner);
      this.updateBanner();

      // Bases Setup: Always spawn 2 bases (Base Alpha & Base Beta) with 3 HP each
      this.bases = [];
      this.bases.push(this.createBase(1, 32, 68, 'BASE ALPHA', false));
      this.bases.push(this.createBase(2, 68, 68, 'BASE BETA', true));
      this.lastTargetedBaseId = 2;

      this.game.maxShields = 6;
      this.game.shields = 6;
      this.game.updateHUD();

      // Playfield interaction listeners for pointer dragging
      this.bindDragHandlers();
    }

    updateBanner() {
      this.banner.innerHTML = `
        <span>${this.text('PROTECT BOTH BASES! MOVE THEM AWAY FROM FALLING DEBRIS', 'ふたつのきティを まもれ！ らっかデブリから にがそう', 'PROTEGGI ENTRAMBE LE BASI! SPOSTALE LONTANO DAI DETRITI')}</span>
        <small>${this.text('Click, hold, and drag Base Alpha and Beta away from glowing craters!', 'ひだりクリックをおしたまま、あかいエリアから きティを にがそう！', 'Clicca, tieni premuto e sposta le basi lontane dai crateri luminosi!')}</small>
      `;
      this.banner.classList.remove('fade-out');
      this.banner.style.opacity = '1';
      if (this.bannerFadeTimeout) clearTimeout(this.bannerFadeTimeout);
      this.bannerFadeTimeout = setTimeout(() => {
        if (this.banner) this.banner.classList.add('fade-out');
      }, 3500);
    }

    createBase(id, xPercent, yPercent, name, isBeta) {
      const btn = document.createElement('button');
      btn.className = `debris-base-entity ${isBeta ? 'beta' : 'alpha'}`;
      btn.setAttribute('aria-label', name);
      btn.setAttribute('data-base-id', String(id));
      btn.style.left = `${xPercent}%`;
      btn.style.top = `${yPercent}%`;

      const halo = document.createElement('div');
      halo.className = 'debris-base-shield-halo';

      // 3-Pip Health Bar above base label
      const healthBar = document.createElement('div');
      healthBar.className = 'debris-base-health-bar';
      healthBar.setAttribute('aria-label', `${name} Health`);
      const pips = [];
      const maxHp = 3;
      for (let i = 0; i < maxHp; i++) {
        const pip = document.createElement('div');
        pip.className = 'debris-hp-pip';
        healthBar.appendChild(pip);
        pips.push(pip);
      }

      const label = document.createElement('span');
      label.className = 'debris-base-label';
      label.textContent = name;

      const img = document.createElement('img');
      img.className = 'debris-base-img';
      img.src = '../ART/base.png';
      img.alt = name;
      img.draggable = false;

      btn.append(halo, healthBar, label, img);
      this.root.appendChild(btn);

      const baseObj = {
        id,
        name,
        isBeta,
        element: btn,
        healthBarEl: healthBar,
        pips,
        hp: maxHp,
        maxHp,
        isDestroyed: false,
        xPercent,
        yPercent,
        width: 125,
        height: 100,
        updateHealthUI: function() {
          this.pips.forEach((pip, idx) => {
            pip.classList.toggle('lost', idx >= this.hp);
          });
        }
      };
      baseObj.updateHealthUI();
      return baseObj;
    }

    bindDragHandlers() {
      this.bases.forEach(base => {
        const el = base.element;

        el.addEventListener('pointerdown', (e) => {
          if (e.button !== 0) return; // ONLY Left Click
          if (base.isDestroyed || base.hp <= 0) return; // Destroyed bases cannot be dragged
          if (this.game.state !== STATES.ACTIVE && this.game.state !== STATES.TUTORIAL) return;

          e.preventDefault();
          e.stopPropagation();

          try {
            el.setPointerCapture(e.pointerId);
          } catch {}

          const rect = el.getBoundingClientRect();

          // Preserve exact grab offset so base does NOT snap to center
          this.activeDrag = {
            pointerId: e.pointerId,
            base,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            startX: rect.left,
            startY: rect.top,
            hasMoved: false
          };

          el.classList.add('grabbed');
          if (typeof audioManager !== 'undefined') {
            audioManager.playLockOn();
          }
        });

        el.addEventListener('pointermove', (e) => {
          if (!this.activeDrag || this.activeDrag.pointerId !== e.pointerId) return;
          if (this.activeDrag.base.isDestroyed) {
            this.cancelDrag();
            return;
          }
          if (!(e.buttons & 1)) {
            this.releaseDrag(e);
            return;
          }

          e.preventDefault();
          const pfRect = this.game.playfieldEl.getBoundingClientRect();
          const drag = this.activeDrag;

          let targetLeft = e.clientX - drag.offsetX - pfRect.left;
          let targetTop = e.clientY - drag.offsetY - pfRect.top;

          const baseW = el.offsetWidth || 125;
          const baseH = el.offsetHeight || 100;

          const minLeft = 12;
          const maxLeft = pfRect.width - baseW - 12;
          const minTop = pfRect.height * 0.44;
          const maxTop = pfRect.height * 0.88;

          targetLeft = Math.max(minLeft, Math.min(maxLeft, targetLeft));
          targetTop = Math.max(minTop, Math.min(maxTop, targetTop));

          const centerXPercent = ((targetLeft + baseW / 2) / pfRect.width) * 100;
          const centerYPercent = ((targetTop + baseH / 2) / pfRect.height) * 100;

          base.xPercent = centerXPercent;
          base.yPercent = centerYPercent;

          el.style.left = `${centerXPercent}%`;
          el.style.top = `${centerYPercent}%`;

          if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > 12) {
            drag.hasMoved = true;
          }
        });

        const onUp = (e) => {
          if (!this.activeDrag || this.activeDrag.pointerId !== e.pointerId) return;
          if (e.button !== 0) return;
          e.preventDefault();
          this.releaseDrag(e);
        };

        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', () => this.cancelDrag());
      });
    }

    releaseDrag(e) {
      if (!this.activeDrag) return;
      const { base, pointerId } = this.activeDrag;
      const el = base.element;
      el.classList.remove('grabbed');

      try {
        if (el.hasPointerCapture(pointerId)) {
          el.releasePointerCapture(pointerId);
        }
      } catch {}

      this.activeDrag = null;
    }

    cancelDrag() {
      if (this.activeDrag) {
        const { base, pointerId } = this.activeDrag;
        base.element.classList.remove('grabbed');
        try {
          if (base.element.hasPointerCapture(pointerId)) {
            base.element.releasePointerCapture(pointerId);
          }
        } catch {}
        this.activeDrag = null;
      }
    }

    update(dt) {
      if (!this.active || (this.game.state !== STATES.ACTIVE && this.game.state !== STATES.TUTORIAL)) return;

      this.elapsedTime += dt;
      this.game.activePlayDurationSec += dt;

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnNextThreat();
        const cfg = this.getConfig();
        this.spawnTimer = cfg.interval;
      }

      // Check if surviving bases are directly over an active danger zone and toggle alert aura
      if (this.bases && this.bases.length) {
        this.bases.forEach(base => {
          if (base.isDestroyed || base.hp <= 0) {
            base.element.classList.remove('in-danger');
            return;
          }
          const isUnderThreat = this.dangerZones.some(dz => {
            const dx = Math.abs(dz.xPercent - base.xPercent);
            const dy = Math.abs(dz.yPercent - base.yPercent);
            return dx < 14 && dy < 14;
          });
          base.element.classList.toggle('in-danger', isUnderThreat);
        });
      }

      const pfRect = this.game.playfieldEl.getBoundingClientRect();
      const toRemove = [];

      for (let i = 0; i < this.boulders.length; i++) {
        const b = this.boulders[i];
        b.elapsed += dt;
        const progress = Math.min(1.0, b.elapsed / b.duration);

        const currentY = b.startYPercent + progress * (b.targetYPercent - b.startYPercent);
        const currentX = b.startXPercent + progress * (b.targetXPercent - b.startXPercent);

        b.element.style.top = `${currentY}%`;
        b.element.style.left = `${currentX}%`;
        b.element.style.transform = `translate(-50%, -50%) rotate(${progress * 220 + b.rotOffset}deg) scale(${0.7 + progress * 0.35})`;

        if (b.dangerZone && b.dangerZone.shadowEl) {
          const shadowScale = 0.2 + progress * 0.8;
          b.dangerZone.shadowEl.style.transform = `scale(${shadowScale})`;
          if (progress >= 0.72) {
            b.dangerZone.element.classList.add('near-impact');
          }
        }

        if (progress >= 1.0) {
          this.handleBoulderImpact(b, pfRect);
          toRemove.push(i);
        }
      }

      for (let i = toRemove.length - 1; i >= 0; i--) {
        const idx = toRemove[i];
        const b = this.boulders[idx];
        if (b.element.parentNode) b.element.remove();
        if (b.dangerZone && b.dangerZone.element.parentNode) b.dangerZone.element.remove();
        this.dangerZones = this.dangerZones.filter(dz => dz !== b.dangerZone);
        this.boulders.splice(idx, 1);
      }

      // Check wave progress now that impacted boulders are spliced from this.boulders
      const cfg = this.getConfig();
      if (toRemove.length > 0 || (this.bouldersSpawnedInWave >= cfg.waveDebris && this.boulders.length === 0)) {
        this.checkWaveProgress();
      }
    }

    spawnNextThreat() {
      const cfg = this.getConfig();
      // Cap debris at configured wave count (e.g. 10 debris) so waves complete properly
      if (this.bouldersSpawnedInWave >= cfg.waveDebris) return;
      if (this.dangerZones.length >= cfg.simultaneous) return;

      const survivingBases = this.bases.filter(b => !b.isDestroyed && b.hp > 0);
      if (!survivingBases.length) return;

      const threatId = this.nextThreatId++;
      const target = this.calculateFairTarget();
      if (!target) return;

      const dangerZoneEl = document.createElement('div');
      dangerZoneEl.className = 'debris-danger-zone';
      dangerZoneEl.style.left = `${target.x}%`;
      dangerZoneEl.style.top = `${target.y}%`;

      const ringEl = document.createElement('div');
      ringEl.className = 'debris-danger-ring';

      const shadowEl = document.createElement('div');
      shadowEl.className = 'debris-danger-shadow';

      const labelEl = document.createElement('div');
      labelEl.className = 'debris-danger-label';
      labelEl.textContent = this.text('⚠ IMPACT', '⚠ けいこく', '⚠ IMPATTO');

      dangerZoneEl.append(ringEl, shadowEl, labelEl);
      this.root.appendChild(dangerZoneEl);

      const dangerZone = {
        id: threatId,
        element: dangerZoneEl,
        shadowEl,
        xPercent: target.x,
        yPercent: target.y,
        isTargetingBase: !!target.isTargetingBase,
        targetBaseId: target.targetBaseId
      };
      this.dangerZones.push(dangerZone);

      const boulderImg = document.createElement('img');
      boulderImg.className = 'debris-boulder-entity';
      boulderImg.src = '../ART/boulder/boulder1.png';
      boulderImg.alt = 'Falling Debris';
      boulderImg.style.width = '75px';
      boulderImg.style.height = '75px';

      const startX = target.x + (Math.random() * 8 - 4);
      const startY = -12;

      boulderImg.style.left = `${startX}%`;
      boulderImg.style.top = `${startY}%`;
      this.root.appendChild(boulderImg);

      const boulder = {
        id: threatId,
        element: boulderImg,
        dangerZone,
        startXPercent: startX,
        startYPercent: startY,
        targetXPercent: target.x,
        targetYPercent: target.y,
        duration: cfg.fallSec,
        elapsed: 0,
        rotOffset: Math.random() * 60,
        isTargetingBase: !!target.isTargetingBase
      };

      this.boulders.push(boulder);
      this.bouldersSpawnedInWave++;
    }

    calculateFairTarget() {
      if (!this.bases || !this.bases.length) return null;

      // Only target bases that are still alive
      const survivingBases = this.bases.filter(b => !b.isDestroyed && b.hp > 0);
      if (!survivingBases.length) return null;

      // Check which active threats are currently targeting a base
      const activeTargeted = this.dangerZones.filter(dz => dz.isTargetingBase);

      // 1. If NO threat is currently targeting a base: TARGET A BASE!
      if (activeTargeted.length === 0) {
        let targetBase = survivingBases[0];
        if (survivingBases.length > 1) {
          // Strictly alternate between Base Alpha and Base Beta to make player move both
          const otherBase = survivingBases.find(b => b.id !== this.lastTargetedBaseId);
          targetBase = otherBase || survivingBases[0];
        }
        this.lastTargetedBaseId = targetBase.id;

        // Target base's current real-time location
        const targetX = Math.max(16, Math.min(84, targetBase.xPercent));
        const targetY = Math.max(56, Math.min(76, targetBase.yPercent));

        return {
          x: targetX,
          y: targetY,
          isTargetingBase: true,
          targetBaseId: targetBase.id
        };
      }

      // 2. In higher levels when 2+ rocks are falling simultaneously:
      // Exactly ONE targets the base, and additional rocks land outside safely!
      const targetedX = activeTargeted[0].xPercent;
      const candidates = [16, 32, 50, 68, 84];

      // Filter sectors that are at least 26% away from the targeted base,
      // and at least 20% away from any existing danger zones
      let validSectors = candidates.filter(sec => {
        if (Math.abs(sec - targetedX) < 26) return false;
        for (const dz of this.dangerZones) {
          if (Math.abs(sec - dz.xPercent) < 20) return false;
        }
        return true;
      });

      if (!validSectors.length) {
        validSectors = candidates.slice().sort((a, b) => {
          const minA = Math.min(...[targetedX, ...this.dangerZones.map(dz => dz.xPercent)].map(x => Math.abs(a - x)));
          const minB = Math.min(...[targetedX, ...this.dangerZones.map(dz => dz.xPercent)].map(x => Math.abs(b - x)));
          return minB - minA;
        });
      }

      const outsideSector = validSectors[Math.floor(Math.random() * validSectors.length)];
      return {
        x: outsideSector,
        y: 68 + (Math.random() * 6 - 3),
        isTargetingBase: false,
        targetBaseId: null
      };
    }

    handleBoulderImpact(boulder, pfRect) {
      const impactPixelX = (boulder.targetXPercent / 100) * pfRect.width;
      const impactPixelY = (boulder.targetYPercent / 100) * pfRect.height;

      this.spawnImpactFX(impactPixelX, impactPixelY);

      if (boulder.element && boulder.element.parentNode) {
        boulder.element.remove();
      }
      if (boulder.dangerZone && boulder.dangerZone.element && boulder.dangerZone.element.parentNode) {
        boulder.dangerZone.element.remove();
      }

      // Hit detection: Check if any part of the impact crater touches or overlaps any SURVIVING base
      let hitAny = false;
      const survivingBases = this.bases.filter(b => !b.isDestroyed && b.hp > 0);
      survivingBases.forEach(base => {
        const basePixelX = (base.xPercent / 100) * pfRect.width;
        const basePixelY = (base.yPercent / 100) * pfRect.height;

        const distX = Math.abs(impactPixelX - basePixelX);
        const distY = Math.abs(impactPixelY - basePixelY);

        const baseW = (base.element && base.element.offsetWidth) || 125;
        const baseH = (base.element && base.element.offsetHeight) || 100;
        const craterW = (boulder.dangerZone?.element?.offsetWidth) || 160;
        const craterH = (boulder.dangerZone?.element?.offsetHeight) || 120;

        const touchThresholdX = (baseW * 0.48) + (craterW * 0.46);
        const touchThresholdY = (baseH * 0.48) + (craterH * 0.46);

        const normalizedDist = Math.hypot(distX / touchThresholdX, distY / touchThresholdY);

        if (normalizedDist <= 1.0) {
          hitAny = true;
          this.damageBase(base);
        }
      });

      if (!hitAny) {
        this.bouldersAvoidedInWave++;
        this.game.robotsDestroyed = (this.game.robotsDestroyed || 0) + 1;
        this.game.score = (this.game.score || 0) + scorePerDebris;
        this.game.comboCount = (this.game.comboCount || 0) + 1;
        if (this.game.comboCount > (this.game.maxCombo || 0)) {
          this.game.maxCombo = this.game.comboCount;
        }
        this.game.updateHUD();
        playSfx('lockOn');
      }
    }

    damageBase(base) {
      base.hp = Math.max(0, base.hp - 1);
      base.updateHealthUI();

      base.element.classList.add('damaged');
      setTimeout(() => {
        if (base.element) base.element.classList.remove('damaged');
      }, 450);

      playSfx('destroy');

      // Update total shields to equal sum of remaining base HPs
      const totalHp = this.bases.reduce((sum, b) => sum + (b.isDestroyed ? 0 : b.hp), 0);
      this.game.shields = totalHp;
      this.game.comboCount = 0;
      this.game.updateHUD();

      // Check if this specific base is destroyed
      if (base.hp <= 0) {
        base.isDestroyed = true;
        base.element.classList.add('destroyed');
        base.element.classList.remove('in-danger');
        if (this.activeDrag && this.activeDrag.base === base) {
          this.cancelDrag();
        }

        const pfRect = this.game.playfieldEl.getBoundingClientRect();
        const basePixelX = (base.xPercent / 100) * pfRect.width;
        const basePixelY = (base.yPercent / 100) * pfRect.height;
        this.spawnImpactFX(basePixelX, basePixelY);

        // Check if BOTH bases are destroyed
        const anySurviving = this.bases.some(b => !b.isDestroyed && b.hp > 0);
        if (!anySurviving) {
          this.game.endGame(false);
          return;
        }
      }
    }

    spawnImpactFX(pixelX, pixelY) {
      const flash = document.createElement('div');
      flash.className = 'debris-impact-fx';
      flash.style.left = `${pixelX}px`;
      flash.style.top = `${pixelY}px`;

      const ring = document.createElement('div');
      ring.className = 'debris-crater-ring';
      ring.style.left = `${pixelX}px`;
      ring.style.top = `${pixelY}px`;

      this.root.append(flash, ring);
      playSfx('destroy');

      setTimeout(() => {
        if (flash.parentNode) flash.remove();
        if (ring.parentNode) ring.remove();
      }, 600);
    }

    checkWaveProgress() {
      const cfg = this.getConfig();
      if (this.bouldersSpawnedInWave >= cfg.waveDebris && this.boulders.length === 0) {
        if (this.waveTransitionTriggered) return;
        this.waveTransitionTriggered = true;
        if (typeof this.game.handleWaveCompleted === 'function') {
          this.game.handleWaveCompleted();
        } else if (this.game.currentWave >= 3) {
          this.game.endGame(true);
        } else {
          this.game.startWave(this.game.currentWave + 1);
        }
      }
    }

    startWave(waveNum) {
      this.bouldersSpawnedInWave = 0;
      this.bouldersAvoidedInWave = 0;
      this.waveTransitionTriggered = false;
      this.spawnTimer = 1.0;
      this.updateBanner();

      // Surviving bases receive +1 repair pip on wave advance (up to max 3)
      this.bases.forEach(b => {
        if (!b.isDestroyed && b.hp > 0 && b.hp < b.maxHp) {
          b.hp = Math.min(b.maxHp, b.hp + 1);
          b.updateHealthUI();
        }
      });
      const totalHp = this.bases.reduce((sum, b) => sum + (b.isDestroyed ? 0 : b.hp), 0);
      this.game.shields = totalHp;
      this.game.updateHUD();
    }

    dispose() {
      this.active = false;
      this.cancelDrag();
      if (this.bannerFadeTimeout) clearTimeout(this.bannerFadeTimeout);
      if (this.root && this.root.parentNode) {
        this.root.remove();
      }
      this.boulders = [];
      this.dangerZones = [];
      this.bases = [];
    }
  }

  // Mission 5 Robot Link Mode Engine Delegate
  class ProxyRobotLinkLevel {
    constructor(game) {
      if (typeof window !== 'undefined' && window.RobotLinkLevel && window.RobotLinkLevel !== ProxyRobotLinkLevel) {
        return new window.RobotLinkLevel(game);
      }
      this.game = game;
      this.active = false;
      this.robots = [];
      this.pairs = [];
      this.ready = true;
    }
    startWave(w) {
      if (typeof window !== 'undefined' && window.RobotLinkLevel && window.RobotLinkLevel !== ProxyRobotLinkLevel) {
        const inst = new window.RobotLinkLevel(this.game);
        if (this.game) {
          this.game.robotLinkLevel = inst;
          this.game.untangleLevel = inst;
        }
        inst.startWave(w);
      }
    }
    update(dt) {}
    dispose() {
      this.active = false;
    }
  }
  const RobotLinkLevel = (typeof window !== 'undefined' && window.RobotLinkLevel) ? window.RobotLinkLevel : ProxyRobotLinkLevel;
  const RobotUntangleLevel = RobotLinkLevel;

  // Hook into GameEngine / CyberHeroGame Prototype
  const GameClass = (typeof GameEngine !== 'undefined') ? GameEngine : (typeof CyberHeroGame !== 'undefined' ? CyberHeroGame : window.GameEngine);
  const proto = GameClass.prototype;
  const original = {
    init: proto.init,
    setMode: proto.setMode,
    playGame: proto.playGame,
    startRun: proto.startRun,
    startWave: proto.startWave,
    handleWaveCompleted: proto.handleWaveCompleted,
    updateActiveGame: proto.updateActiveGame,
    clearAllRobots: proto.clearAllRobots,
    endGame: proto.endGame,
    startTutorial: proto.startTutorial,
    updateModeDisplay: proto.updateModeDisplay,
    togglePause: proto.togglePause,
    hideAllScreens: proto.hideAllScreens,
    showStartScreen: proto.showStartScreen,
    startRun: proto.startRun
  };

  proto.hideAllScreens = function(...args) {
    const res = original.hideAllScreens.apply(this, args);
    // Guarantee all overlay screens have any lingering inline styles stripped
    document.querySelectorAll('.overlay-screen').forEach(el => {
      el.classList.remove('active');
      el.style.opacity = '';
      el.style.pointerEvents = '';
      el.style.display = '';
    });
    return res;
  };

  proto.showStartScreen = function(...args) {
    if (this._endGameResultsTimer) {
      clearTimeout(this._endGameResultsTimer);
      this._endGameResultsTimer = null;
    }
    const res = original.showStartScreen.apply(this, args);
    const results = document.getElementById('screen-results');
    if (results) results.classList.remove('active');
    const startScreen = document.getElementById('screen-start');
    if (startScreen) startScreen.classList.add('active');
    return res;
  };

  proto.startRun = function(...args) {
    if (this._endGameResultsTimer) {
      clearTimeout(this._endGameResultsTimer);
      this._endGameResultsTimer = null;
    }
    const res = original.startRun.apply(this, args);
    const results = document.getElementById('screen-results');
    if (results) results.classList.remove('active');
    return res;
  };

  proto.startRun = function(...args) {
    if (this.currentModeId === 'drag_rescue') {
      this.totalWaves = 3;
    }
    return original.startRun.apply(this, args);
  };

  proto.init = function(...args) {
    const res = original.init.apply(this, args);
    return res;
  };

  proto.setMode = function(modeId) {
    if (this.fallingDebrisLevel) {
      this.fallingDebrisLevel.dispose();
      this.fallingDebrisLevel = null;
    }
    if (this.robotLinkLevel) {
      this.robotLinkLevel.dispose();
      this.robotLinkLevel = null;
    }
    if (this.untangleLevel) {
      this.untangleLevel.dispose();
      this.untangleLevel = null;
    }
    if (this.mouseBossLevel && modeId !== 'mouse_boss') {
      this.mouseBossLevel.dispose();
      this.mouseBossLevel = null;
    }

    original.setMode.call(this, modeId);

    const isFallingDebris = this.currentModeId === 'drag_rescue';
    const isUntangle = this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle';
    const isScroll = this.currentModeId === 'scroll_training';
    const isBoss = this.currentModeId === 'mouse_boss';
    document.body.classList.toggle('drag-rescue-mode', isFallingDebris);
    document.body.classList.toggle('scroll-training-mode', isScroll);
    document.body.classList.toggle('mouse-boss-mode', isBoss);
    document.body.classList.toggle('robot-link-mode', isUntangle);
    document.body.classList.toggle('mouse-skill-mode', isFallingDebris || isUntangle || isScroll || isBoss);
    document.body.classList.toggle('mouse-context-mode', isUntangle);

    if (isFallingDebris) {
      this.totalWaves = 3;
    }

    // Reset stat label when leaving drag_rescue
    const botsLabelContainer = document.getElementById('res-stat-bots')?.closest('.result-stat-card')?.querySelector('.result-stat-label');
    if (botsLabelContainer) {
      const mainEn = botsLabelContainer.querySelector('.main-en');
      const subLang = botsLabelContainer.querySelector('.sub-lang');
      if (isFallingDebris) {
        if (mainEn) mainEn.textContent = 'Debris Avoided';
        if (subLang) subLang.textContent = (this.currentLanguage === 'ja') ? 'かわした デブリ' : ((this.currentLanguage === 'it') ? 'Detriti Schivati' : 'Debris Avoided');
      } else {
        if (mainEn) mainEn.textContent = 'Robots Restored';
        if (subLang) subLang.textContent = (this.currentLanguage === 'ja') ? 'なおした ロボット' : ((this.currentLanguage === 'it') ? 'Robot Riparati' : 'Robots Restored');
      }
    }

    if (this.state === STATES.ACTIVE || this.state === STATES.PAUSED) {
      this.startRun();
    }
  };

  proto.playGame = function() {
    if (this.currentModeId === 'drag_rescue') {
      if (this.selectedDifficulty === 'veryEasy') {
        return this.startTutorial(0, true);
      }
      return this.startRun();
    }
    if (this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle' || this.currentModeId === 'scroll_training' || this.currentModeId === 'mouse_boss') {
      return this.startRun();
    }
    return original.playGame.call(this);
  };

  proto.startTutorial = function(...args) {
    if (this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle' || this.currentModeId === 'scroll_training' || this.currentModeId === 'mouse_boss') {
      return this.startRun();
    }
    return original.startTutorial.apply(this, args);
  };

  proto.startWave = function(waveNum) {
    if (this.currentModeId === 'drag_rescue') {
      this.state = STATES.ACTIVE;
      this.currentWave = waveNum;
      this.totalWaves = 3;
      this.updateHUD();

      const dict = TRANSLATIONS[this.currentLanguage] || {};
      const titleEn = `Wave ${waveNum}`;
      const titleSub = (dict.wave ? `${dict.wave} ${waveNum}` : "");
      let subEn = "PROTECT BOTH BASES";
      let subSub = (this.currentLanguage === 'ja') ? 'ふたつのきティを まもれ' : ((this.currentLanguage === 'it') ? 'PROTEGGI ENTRAMBE LE BASI' : 'PROTECT BOTH BASES');
      if (waveNum === 3) {
        subEn = "FINAL WAVE CHALLENGE";
        subSub = (this.currentLanguage === 'ja') ? 'さいしゅう ウェーブ！' : ((this.currentLanguage === 'it') ? 'SFIDA ONDATA FINALE' : 'FINAL WAVE CHALLENGE');
      }
      if (typeof this.showAnnouncement === 'function') {
        this.showAnnouncement(titleEn, titleSub, subEn, subSub);
      }

      if (!this.fallingDebrisLevel) {
        this.fallingDebrisLevel = new FallingDebrisLevel(this);
      } else {
        this.fallingDebrisLevel.startWave(waveNum);
      }
      return;
    }
    if (this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle') {
      this.state = STATES.ACTIVE;
      this.currentWave = waveNum;
      this.totalWaves = (this.selectedDifficulty === 'ultra') ? Infinity : 3;
      if (!this.robotLinkLevel) {
        const Cls = window.RobotLinkLevel || RobotUntangleLevel;
        this.robotLinkLevel = new Cls(this);
      }
      this.untangleLevel = this.robotLinkLevel;
      this.robotLinkLevel.startWave(waveNum);
      if (this.robotLinkLevel.updateHUD) {
        this.robotLinkLevel.updateHUD();
      } else {
        this.updateHUD();
      }
      return;
    }
    return original.startWave.call(this, waveNum);
  };

  proto.updateActiveGame = function(dt, ms) {
    if (this.currentModeId === 'drag_rescue' && this.fallingDebrisLevel) {
      try {
        return this.fallingDebrisLevel.update(dt);
      } catch (err) {
        console.error('FallingDebris update error:', err);
      }
    }
    if ((this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle') && (this.robotLinkLevel || this.untangleLevel)) {
      try {
        const lvl = this.robotLinkLevel || this.untangleLevel;
        return lvl.update(dt);
      } catch (err) {
        console.error('RobotLink update error:', err);
      }
    }
    return original.updateActiveGame.call(this, dt, ms);
  };

  proto.clearAllRobots = function() {
    if (this.fallingDebrisLevel) {
      this.fallingDebrisLevel.dispose();
      this.fallingDebrisLevel = null;
    }
    if (this.robotLinkLevel) {
      this.robotLinkLevel.dispose();
      this.robotLinkLevel = null;
    }
    if (this.untangleLevel) {
      this.untangleLevel.dispose();
      this.untangleLevel = null;
    }
    return original.clearAllRobots.call(this);
  };

  proto.togglePause = function(...args) {
    if (this.fallingDebrisLevel) {
      this.fallingDebrisLevel.cancelDrag();
    }
    if (this.robotLinkLevel) {
      this.robotLinkLevel.closeContextMenu?.();
    }
    if (this.untangleLevel) {
      this.untangleLevel.closeContextMenu?.();
      this.untangleLevel.menu?.remove?.();
    }
    return original.togglePause.apply(this, args);
  };

  proto.updateModeDisplay = function() {
    original.updateModeDisplay.call(this);
    const isFallingDebris = this.currentModeId === 'drag_rescue';
    const isUntangle = this.currentModeId === 'robot_link' || this.currentModeId === 'robot_untangle';
    const isScroll = this.currentModeId === 'scroll_training';
    const isBoss = this.currentModeId === 'mouse_boss';
    document.body.classList.toggle('drag-rescue-mode', isFallingDebris);
    document.body.classList.toggle('scroll-training-mode', isScroll);
    document.body.classList.toggle('mouse-boss-mode', isBoss);
    document.body.classList.toggle('robot-link-mode', isUntangle);
    document.body.classList.toggle('mouse-skill-mode', isFallingDebris || isUntangle || isScroll || isBoss);
    document.body.classList.toggle('mouse-context-mode', isUntangle);

    if (this.selectedDifficulty === 'ultra') {
      this.totalWaves = Infinity;
    } else {
      this.totalWaves = 3;
    }

    const picker = document.getElementById('debug-mode-select');
    if (picker && picker.value !== this.currentModeId) {
      picker.value = this.currentModeId;
    }

    // Ultra mode is universally available across all missions
    const ultraBtn = document.querySelector('.diff-btn.diff-ultra');
    if (ultraBtn) {
      ultraBtn.style.display = 'flex';
    }

    // Sync mission selector buttons on splash screen
    document.querySelectorAll('.mission-btn').forEach(btn => {
      const mode = btn.getAttribute('data-mode');
      const isSelected = mode === this.currentModeId || (mode === 'robot_link' && this.currentModeId === 'robot_untangle') || (mode === 'drag_rescue' && this.currentModeId === 'falling_debris');
      btn.classList.toggle('selected', isSelected);
    });
  };

  proto.handleWaveCompleted = function() {
    if (this.currentModeId === 'drag_rescue') {
      if (this.shields <= 0) return;

      const dict = TRANSLATIONS[this.currentLanguage] || {};
      const totalGameWaves = 3;

      if (this.currentWave < totalGameWaves) {
        this.state = STATES.INTERMISSION;
        this.inputEngine?.reset();

        const titleEn = `Wave ${this.currentWave} Cleared!`;
        const titleSub = (dict.waveCleared ? dict.waveCleared.replace("{n}", this.currentWave) : "");
        const starCount = this.currentWave;

        this.showWaveStars(starCount, titleEn, titleSub, () => {
          if (this.state === STATES.INTERMISSION) {
            this.startWave(this.currentWave + 1);
          }
        }, 2000);
      } else {
        // Final Wave 3 cleared! Show 3 floating stars popping with fanfare before results screen
        this.state = STATES.INTERMISSION;
        this.inputEngine?.reset();

        const titleEn = "All Waves Defended!";
        const titleSub = (this.currentLanguage === 'ja') ? 'きティを まもりきった！' : ((this.currentLanguage === 'it') ? 'Tutte le Ondate Difese!' : 'All Waves Defended!');

        this.showWaveStars(3, titleEn, titleSub, () => {
          this.endGame(true);
        }, 2200);
      }
      return;
    }
    return original.handleWaveCompleted.call(this);
  };

  proto.endGame = function(victory) {
    let capturedTimerId = null;
    const origSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      const id = origSetTimeout.call(window, fn, delay, ...args);
      if (delay === 500) {
        capturedTimerId = id;
      }
      return id;
    };
    try {
      original.endGame.call(this, victory);
    } finally {
      window.setTimeout = origSetTimeout;
    }
    if (capturedTimerId) {
      this._endGameResultsTimer = capturedTimerId;
    }
    if (this.currentModeId !== 'drag_rescue') return;

    // Clean up active boulders and danger zones from the playfield
    if (this.fallingDebrisLevel) {
      this.fallingDebrisLevel.boulders.forEach(b => { if (b.element && b.element.parentNode) b.element.remove(); });
      this.fallingDebrisLevel.dangerZones.forEach(dz => { if (dz.element && dz.element.parentNode) dz.element.remove(); });
      this.fallingDebrisLevel.boulders = [];
      this.fallingDebrisLevel.dangerZones = [];
      if (this.fallingDebrisLevel.banner) {
        this.fallingDebrisLevel.banner.style.display = 'none';
      }
    }

    const titleEl = document.getElementById('results-title');
    const titleSubEl = document.getElementById('results-title-sub');
    const msgEl = document.getElementById('results-message');
    const msgSubEl = document.getElementById('results-message-sub');

    // Customize the 3rd stat card label to "Debris Avoided"
    const botsLabelContainer = document.getElementById('res-stat-bots')?.closest('.result-stat-card')?.querySelector('.result-stat-label');
    if (botsLabelContainer) {
      const mainEn = botsLabelContainer.querySelector('.main-en');
      const subLang = botsLabelContainer.querySelector('.sub-lang');
      if (mainEn) mainEn.textContent = 'Debris Avoided';
      if (subLang) {
        subLang.textContent = (this.currentLanguage === 'ja') ? 'かわした デブリ' : ((this.currentLanguage === 'it') ? 'Detriti Schivati' : 'Debris Avoided');
      }
    }

    // Force waves stat to reflect 3 waves
    const wavesStatEl = document.getElementById('res-stat-waves');
    if (wavesStatEl) {
      wavesStatEl.textContent = `${victory ? 3 : Math.max(1, this.currentWave - 1)} / 3`;
    }

    if (victory) {
      const survivingCount = this.fallingDebrisLevel?.bases?.filter(b => !b.isDestroyed).length || 2;
      if (titleEl) {
        titleEl.textContent = survivingCount >= 2 ? 'BOTH BASES PROTECTED!' : 'BASE SURVIVED!';
        titleEl.style.color = 'var(--cyan-main)';
      }
      if (titleSubEl) {
        titleSubEl.textContent = (this.currentLanguage === 'ja') ? 'きティの ぼうえい せいこう！' : ((this.currentLanguage === 'it') ? 'BASE PROTETTA!' : 'BASES PROTECTED!');
      }
      if (msgEl) {
        msgEl.textContent = `Terrific mouse control! Avoided ${this.robotsDestroyed} falling boulders across all 3 waves. CLICK → HOLD → DRAG → RELEASE mastered!`;
      }
      if (msgSubEl) {
        msgSubEl.textContent = (this.currentLanguage === 'ja') ? '全3ウェーブクリア！ おしたまま うごかす そうさを マスターしたね！' : ((this.currentLanguage === 'it') ? 'Tutte le 3 ondate superate! Hai padroneggiato CLIC → TIENI → TRASCINA → RILASCIA!' : 'All 3 waves cleared! CLICK → HOLD → DRAG → RELEASE mastered!');
      }
    } else {
      if (titleEl) {
        titleEl.textContent = 'BOTH BASES DESTROYED!';
        titleEl.style.color = 'var(--orange-main)';
      }
      if (titleSubEl) {
        titleSubEl.textContent = (this.currentLanguage === 'ja') ? 'きティが はかいされた！' : ((this.currentLanguage === 'it') ? 'BASI DISTRUTTE!' : 'BASES DESTROYED!');
      }
      if (msgEl) {
        msgEl.textContent = 'Falling debris hit both bases! Practice holding LEFT-click to drag each base clear of the glowing red craters.';
      }
      if (msgSubEl) {
        msgSubEl.textContent = (this.currentLanguage === 'ja') ? 'ひだりクリックをおしたまま、あかいクレーターから にがそう。もういちど ちょうせん！' : ((this.currentLanguage === 'it') ? 'Trascina le basi lontano dai crateri luminosi. Riprova!' : 'Hold LEFT-click to drag bases clear of glowing craters.');
      }
    }

  };

  // Dedicated Tutorial Demonstration for Falling Debris (Two Bases & Glowing Breathing Impact Craters)
  const originalTutorialExit = TutorialEngine.prototype.exitTutorial;
  TutorialEngine.prototype.exitTutorial = function(startMission = false) {
    this.clearAllTimeouts();
    document.querySelectorAll('.tutorial-debris-layer').forEach(el => el.remove());
    if (this.game && this.game.playfieldEl) {
      this.game.playfieldEl.querySelectorAll(
        '.debris-boulder-entity, .debris-danger-zone, .debris-impact-fx, .tutorial-debris-layer'
      ).forEach(el => el.remove());
    }
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
      this.overlayEl.classList.remove('active');
    }
    const shouldStartMission = startMission || this.proceedToMissionOnExit;
    this.proceedToMissionOnExit = false;
    if (shouldStartMission) {
      this.game.startRun();
    } else {
      this.game.showStartScreen();
    }
  };

  const originalTutorialRunStep = TutorialEngine.prototype.runStep;
  TutorialEngine.prototype.runStep = function(step) {
    if (this.game.currentModeId !== 'drag_rescue') {
      return originalTutorialRunStep.call(this, step);
    }

    this.clearAllTimeouts();
    this.currentStep = step;
    this.game.clearAllRobots();

    if (this.demoCursorEl) {
      this.demoCursorEl.style.display = 'none';
      this.demoCursorEl.style.opacity = '0';
      this.demoCursorEl.style.transition = 'none';
    }
    if (this.nextBtn) this.nextBtn.style.display = 'none';
    if (this.startMissionBtn) this.startMissionBtn.style.display = 'none';
    if (this.menuBtn) this.menuBtn.style.display = 'none';

    if (this.dialogBoxEl) {
      this.dialogBoxEl.style.top = '3%';
      this.dialogBoxEl.style.bottom = 'auto';
    }

    const pfRect = this.game.playfieldEl.getBoundingClientRect();
    const w = pfRect.width || 800;
    const h = pfRect.height || 600;

    const oldTut = this.game.playfieldEl.querySelector('.tutorial-debris-layer');
    if (oldTut) oldTut.remove();

    const tutLayer = document.createElement('div');
    tutLayer.className = 'tutorial-debris-layer mouse-training-root';
    this.game.playfieldEl.appendChild(tutLayer);

    const lang = this.game.currentLanguage;
    const t = (en, ja, it) => lang === 'ja' ? ja : (lang === 'it' ? it : en);

    if (step === 0) {
      this.setSpotlightRect(w * 0.15, h * 0.40, w * 0.70, h * 0.50, '24px');
      this.dialogTitleEnEl.textContent = 'TWO BASES TO DEFEND!';
      this.dialogTitleSubEl.textContent = t('', 'ふたつの きティを まもれ！', 'DUE BASI DA DIFENDERE!');
      this.dialogTipEnEl.textContent = 'Boulders are falling! Protect both Base Alpha and Base Beta by dragging them out of danger.';
      this.dialogTipSubEl.textContent = t('', 'そらから デブリが おちてくる！ アルファと ベータを うごかして まもろう。', 'I massi cadono dal cielo! Proteggi entrambe le basi spostandole fuori pericolo.');

      const baseAlpha = document.createElement('div');
      baseAlpha.className = 'debris-base-entity alpha';
      baseAlpha.style.left = '32%';
      baseAlpha.style.top = '68%';
      baseAlpha.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE ALPHA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Alpha">';

      const baseBeta = document.createElement('div');
      baseBeta.className = 'debris-base-entity beta';
      baseBeta.style.left = '68%';
      baseBeta.style.top = '68%';
      baseBeta.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE BETA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Beta">';

      tutLayer.append(baseAlpha, baseBeta);

      if (this.nextBtn) this.nextBtn.style.display = 'inline-flex';
    }
    else if (step === 1) {
      this.setSpotlightRect(w * 0.08, h * 0.35, w * 0.84, h * 0.58, '24px');

      this.dialogTitleEnEl.textContent = 'Watch: CLICK → HOLD → DRAG → RELEASE';
      this.dialogTitleSubEl.textContent = t('', 'おてほんを みよう', 'Guarda: CLIC → TIENI → TRASCINA → RILASCIA');
      this.dialogTipEnEl.textContent = 'A glowing crater appeared under Base Alpha! Watch the pointer drag it out of the way.';
      this.dialogTipSubEl.textContent = t('', 'アルファのしたに あかいクレーターが！ うごかして にがそう。', 'Un cratere luminoso è sotto Base Alpha! Guarda come si sposta via.');

      const danger = document.createElement('div');
      danger.className = 'debris-danger-zone';
      danger.style.left = '32%';
      danger.style.top = '68%';
      danger.innerHTML = `<div class="debris-danger-ring"></div><div class="debris-danger-label">${t('⚠ IMPACT', '⚠ けいこく', '⚠ IMPATTO')}</div>`;
      tutLayer.appendChild(danger);

      const baseAlpha = document.createElement('div');
      baseAlpha.className = 'debris-base-entity alpha in-danger';
      baseAlpha.style.left = '32%';
      baseAlpha.style.top = '68%';
      baseAlpha.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE ALPHA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Alpha">';

      const baseBeta = document.createElement('div');
      baseBeta.className = 'debris-base-entity beta';
      baseBeta.style.left = '68%';
      baseBeta.style.top = '68%';
      baseBeta.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE BETA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Beta">';

      tutLayer.append(baseAlpha, baseBeta);

      const boulder = document.createElement('img');
      boulder.className = 'debris-boulder-entity';
      boulder.src = '../ART/boulder/boulder1.png';
      boulder.style.width = '75px';
      boulder.style.height = '75px';
      boulder.style.left = '32%';
      boulder.style.top = '0%';
      tutLayer.appendChild(boulder);

      const cur = this.demoCursorEl;
      cur.style.display = 'block';
      cur.style.opacity = '1';
      cur.style.left = '48%';
      cur.style.top = '50%';

      this.addTimeout(() => {
        cur.style.transition = 'all 0.8s ease';
        cur.style.left = '32%';
        cur.style.top = '68%';
      }, 300);

      this.addTimeout(() => {
        this.dialogTipEnEl.textContent = 'HOLD LEFT CLICK ON BASE ALPHA.';
        this.dialogTipSubEl.textContent = t('', 'アルファを ひだりボタンで おしたまま。', 'TIENI PREMUTO IL TASTO SINISTRO SU BASE ALPHA.');
        cur.style.filter = 'drop-shadow(0 0 14px #00f0ff)';
        baseAlpha.classList.add('grabbed');
        playSfx('lockOn');
      }, 1200);

      this.addTimeout(() => {
        this.dialogTipEnEl.textContent = 'DRAG BASE ALPHA AWAY FROM THE GLOWING CRATER.';
        this.dialogTipSubEl.textContent = t('', 'あかいクレーターから にがすように ドラッグ。', 'TRASCINA BASE ALPHA VIA DAL CRATERE.');
        cur.style.transition = 'all 1.6s ease';
        cur.style.left = '16%';
        baseAlpha.style.transition = 'all 1.6s ease';
        baseAlpha.style.left = '16%';
        baseAlpha.classList.remove('in-danger');
      }, 2000);

      this.addTimeout(() => {
        this.dialogTipEnEl.textContent = 'RELEASE! Base Alpha is safe from the impact!';
        this.dialogTipSubEl.textContent = t('', 'はなす！ アルファは あんぜんだよ。', 'RILASCIA! Base Alpha è salva dall’impatto!');
        cur.style.filter = 'none';
        baseAlpha.classList.remove('grabbed');
      }, 3800);

      this.addTimeout(() => {
        boulder.style.transition = 'top 0.8s cubic-bezier(0.55, 0, 1, 0.45)';
        boulder.style.top = '68%';
      }, 3600);

      this.addTimeout(() => {
        playSfx('destroy');
        if (danger.parentNode) danger.remove();
        if (boulder.parentNode) boulder.remove();

        const flash = document.createElement('div');
        flash.className = 'debris-impact-fx';
        flash.style.left = '32%';
        flash.style.top = '68%';
        tutLayer.appendChild(flash);

        this.dialogTipEnEl.textContent = 'BOULDER IMPACTED! Both bases survived!';
        this.dialogTipSubEl.textContent = t('', 'デブリが ばくはつ！ ふたつの きティは ぶじだったよ！', 'IMPATTO! Entrambe le basi sono salve!');
      }, 4450);

      this.addTimeout(() => {
        this.runStep(2);
      }, 5700);
    }
    else if (step === 2) {
      this.setSpotlightRect(w * 0.08, h * 0.35, w * 0.84, h * 0.58, '24px');

      this.dialogTitleEnEl.textContent = 'Your Turn! Dodge the Crater';
      this.dialogTitleSubEl.textContent = t('', 'やってみよう！ クレーターから にげよう', 'Tocca a te! Schiva il cratere');
      this.dialogTipEnEl.textContent = 'HOLD LEFT CLICK on Base Alpha, DRAG it away from the glowing crater, and RELEASE.';
      this.dialogTipSubEl.textContent = t('', 'アルファを ひだりクリックしたまま、あかいクレーターの そとへ うごかして はなそう。', 'Tieni premuto su Base Alpha, trascinala via dal cratere e rilascia.');

      const danger = document.createElement('div');
      danger.className = 'debris-danger-zone';
      danger.style.left = '35%';
      danger.style.top = '68%';
      danger.innerHTML = `<div class="debris-danger-ring"></div><div class="debris-danger-label">${t('⚠ DANGER', '⚠ きけん', '⚠ PERICOLO')}</div>`;
      tutLayer.appendChild(danger);

      const baseAlpha = document.createElement('button');
      baseAlpha.className = 'debris-base-entity alpha in-danger';
      baseAlpha.style.left = '35%';
      baseAlpha.style.top = '68%';
      baseAlpha.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE ALPHA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Alpha">';

      const baseBeta = document.createElement('div');
      baseBeta.className = 'debris-base-entity beta';
      baseBeta.style.left = '68%';
      baseBeta.style.top = '68%';
      baseBeta.innerHTML = '<div class="debris-base-shield-halo"></div><span class="debris-base-label">BASE BETA</span><img class="debris-base-img" src="../ART/base.png" alt="Base Beta">';

      tutLayer.append(baseAlpha, baseBeta);

      let dragInfo = null;
      let practiceCompleted = false;

      baseAlpha.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || practiceCompleted) return;
        e.preventDefault();
        try { baseAlpha.setPointerCapture(e.pointerId); } catch {}
        const rect = baseAlpha.getBoundingClientRect();
        dragInfo = {
          id: e.pointerId,
          offsetX: e.clientX - rect.left,
          offsetY: e.clientY - rect.top,
          startX: rect.left,
          startY: rect.top
        };
        baseAlpha.classList.add('grabbed');
        if (typeof audioManager !== 'undefined') audioManager.playLockOn();
      });

      baseAlpha.addEventListener('pointermove', (e) => {
        if (!dragInfo || dragInfo.id !== e.pointerId || practiceCompleted) return;
        if (!(e.buttons & 1)) { dragInfo = null; baseAlpha.classList.remove('grabbed'); return; }

        const r = tutLayer.getBoundingClientRect();
        const baseW = baseAlpha.offsetWidth || 120;
        const baseH = baseAlpha.offsetHeight || 95;

        let left = e.clientX - dragInfo.offsetX - r.left;
        let top = e.clientY - dragInfo.offsetY - r.top;

        left = Math.max(10, Math.min(r.width - baseW - 10, left));
        top = Math.max(r.height * 0.45, Math.min(r.height * 0.85, top));

        const xPct = ((left + baseW / 2) / r.width) * 100;
        const yPct = ((top + baseH / 2) / r.height) * 100;

        baseAlpha.style.left = `${xPct}%`;
        baseAlpha.style.top = `${yPct}%`;

        const distFromCrater = Math.abs(xPct - 35);
        baseAlpha.classList.toggle('in-danger', distFromCrater < 16);
      });

      const onUp = (e) => {
        if (!dragInfo || dragInfo.id !== e.pointerId || practiceCompleted) return;
        baseAlpha.classList.remove('grabbed');
        try { baseAlpha.releasePointerCapture(e.pointerId); } catch {}
        const curX = parseFloat(baseAlpha.style.left);

        // Success condition: Base Alpha moved clear of the crater (>= 18% distance from crater center at 35%)
        if (Math.abs(curX - 35) >= 18) {
          practiceCompleted = true;
          dragInfo = null;
          baseAlpha.style.pointerEvents = 'none';
          baseAlpha.classList.remove('in-danger');

          playSfx('lockOn');
          this.dialogTipEnEl.textContent = 'PERFECT! Boulder inbound!';
          this.dialogTipSubEl.textContent = t('', 'バッチリ！ デブリが おちてくるよ！', 'PERFETTO! Arriva il masso!');

          const b = document.createElement('img');
          b.className = 'debris-boulder-entity';
          b.src = '../ART/boulder/boulder1.png';
          b.style.width = '75px';
          b.style.height = '75px';
          b.style.left = '35%';
          b.style.top = '0%';
          tutLayer.appendChild(b);

          this.addTimeout(() => {
            b.style.transition = 'top 0.7s cubic-bezier(0.55, 0, 1, 0.45)';
            b.style.top = '68%';
          }, 100);

          this.addTimeout(() => {
            playSfx('destroy');
            if (danger.parentNode) danger.remove();
            if (b.parentNode) b.remove();

            const flash = document.createElement('div');
            flash.className = 'debris-impact-fx';
            flash.style.left = '35%';
            flash.style.top = '68%';
            tutLayer.appendChild(flash);

            this.dialogTipEnEl.textContent = 'OUTSTANDING! Base Alpha escaped the impact!';
            this.dialogTipSubEl.textContent = t('', 'せいこう！ アルファを まもりきったね！', 'FANTASTICO! Base Alpha è salva!');

            this.addTimeout(() => this.runStep(3), 1100);
          }, 850);
        } else {
          dragInfo = null;
          this.dialogTipEnEl.textContent = 'Watch out! DRAG Base Alpha completely OUT of the glowing red crater before releasing.';
          this.dialogTipSubEl.textContent = t('', 'あかいクレーターの そとまで しっかり うごかして はなそう。もういちど！', 'Trascina Base Alpha completamente fuori dal cratere prima di rilasciare.');
        }
      };

      baseAlpha.addEventListener('pointerup', onUp);
      baseAlpha.addEventListener('pointercancel', () => { dragInfo = null; baseAlpha.classList.remove('grabbed'); });
    }
    else if (step >= 3) {
      this.setSpotlightRect(w * 0.15, h * 0.05, w * 0.70, h * 0.38, '20px');
      this.dialogTitleEnEl.textContent = 'TRAINING COMPLETE!';
      this.dialogTitleSubEl.textContent = t('', 'くんれん かんりょう！', 'ADDESTRAMENTO COMPLETATO!');
      this.dialogTipEnEl.textContent = 'You have mastered CLICK + HOLD + DRAG + RELEASE! Both bases are ready to defend.';
      this.dialogTipSubEl.textContent = t('', 'おしたまま ドラッグする そうさは バッチリ！ ふたつの きティを まもろう！', 'Hai padroneggiato CLIC + TIENI + TRASCINA + RILASCIA!');

      if (this.startMissionBtn) {
        this.startMissionBtn.style.display = 'inline-flex';
        this.startMissionBtn.style.visibility = 'visible';
        this.startMissionBtn.style.opacity = '1';
        this.startMissionBtn.style.pointerEvents = 'auto';
        this.startMissionBtn.focus();
      }
      if (this.menuBtn) {
        this.menuBtn.style.display = 'inline-flex';
        this.menuBtn.style.visibility = 'visible';
        this.menuBtn.style.opacity = '1';
        this.menuBtn.style.pointerEvents = 'auto';
      }
      if (this.nextBtn) this.nextBtn.style.display = 'none';

      if (this.game.effects) this.game.effects.spawnCelebration();
      playSfx('victory');
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    const game = window.gameInstance;
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode') || params.get('game');
    const mission = params.get('mission');

    if (modes[mode]) {
      game.setMode(mode);
    } else if (mode === 'scroll_training' || mode === 'scroll' || mode === 'scrollTraining') {
      game.setMode('scroll_training');
    } else if (mode === 'falling_debris' || mission === '4') {
      game.setMode('drag_rescue');
    } else if (mode === 'robot_link' || mode === 'robot_untangle' || mission === '5') {
      game.setMode('robot_link');
    } else if (mode === 'mouse_boss' || mode === 'mouse_boss_fight' || mode === 'mouseBoss' || mission === '7') {
      game.setMode('mouse_boss');
    }

    // Setup mode picker underneath in debug-bar
    const debugBar = document.getElementById('debug-bar');
    if (debugBar) {
      let picker = document.getElementById('debug-mode-select');
      if (!picker) {
        picker = document.createElement('select');
        picker.id = 'debug-mode-select';
        picker.className = 'debug-mode-select';
        picker.setAttribute('aria-label', 'Select Training Game Mode');
        picker.title = 'Switch training game mode';
        picker.innerHTML = '<option value="base_defense">Mission 1.5: Base Defense</option>' +
          '<option value="reinforcements">Mission 2.5: Reinforcements</option>' +
          '<option value="robot_override">Mission 3.5: Robot Override</option>' +
          '<option value="scroll_training">Mission 3: Scroll Training</option>' +
          '<option value="drag_rescue">Mission 4: Falling Debris</option>' +
          '<option value="robot_link">Mission 5: Robot Link</option>' +
          '<option value="mouse_boss">Mission 7: Mouse Boss Fight</option>';
        picker.value = game.currentModeId;
        picker.addEventListener('change', (e) => {
          game.setMode(e.target.value);
          if (game.state === STATES.ACTIVE || game.state === STATES.PAUSED) {
            game.startRun();
          } else {
            game.showStartScreen();
          }
        });
        const modeBtn = document.getElementById('debug-mode-toggle');
        if (modeBtn && modeBtn.parentNode) {
          modeBtn.parentNode.insertBefore(picker, modeBtn.nextSibling);
        }
      } else {
        picker.value = game.currentModeId;
      }
    }

    // Mode cycling for toggle button
    const modeBtn = document.getElementById('debug-mode-toggle');
    if (modeBtn && !modeBtn._hasCustomCycle) {
      modeBtn._hasCustomCycle = true;
      modeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        const modeSequence = ['base_defense', 'reinforcements', 'robot_override', 'scroll_training', 'drag_rescue', 'robot_link', 'mouse_boss'];
        const currentIdx = modeSequence.indexOf(game.currentModeId);
        const nextMode = modeSequence[(currentIdx + 1) % modeSequence.length];
        game.setMode(nextMode);
        if (game.state === STATES.ACTIVE || game.state === STATES.PAUSED) {
          game.startRun();
        } else {
          game.showStartScreen();
        }
      }, true);
    }



    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        game.fallingDebrisLevel?.cancelDrag();
        game.robotLinkLevel?.closeContextMenu?.();
        game.untangleLevel?.closeContextMenu?.();
        game.untangleLevel?.menu?.remove?.();
        game.mouseBossLevel?.closeContextMenu();
      }
    });

    window.render_game_to_text = () => {
      if (game.currentModeId === 'mouse_boss') {
        return JSON.stringify({
          mode: game.currentModeId,
          state: game.state,
          wave: game.currentWave,
          score: game.score,
          shields: game.shields,
          activeWave: game.mouseBossLevel?.currentWave || 1,
          robotsRestored: game.mouseBossLevel?.robotsRestored || 0,
          robotsTotal: game.mouseBossLevel?.robotsTotal || 0,
          gatesOpen: game.mouseBossLevel?.gatesOpen || 0,
          gatesTotal: game.mouseBossLevel?.gatesTotal || 0,
          scrollTop: game.mouseBossLevel?.viewport?.scrollTop || 0,
          totalWaves: 4
        });
      }
      if (game.currentModeId === 'scroll_training') {
        return JSON.stringify({
          mode: game.currentModeId,
          state: game.state,
          level: game.currentWave,
          score: game.score,
          restored: game.scrollTrainingLevel?.robotsRestored || 0,
          total: game.scrollTrainingLevel?.robotsTotal || 0,
          timerSec: game.scrollTrainingLevel?.timerSec || 0,
          wheelEvents: game.scrollTrainingLevel?.wheelEvents || 0,
          scrollTop: game.scrollTrainingLevel?.viewport?.scrollTop || 0,
          totalWaves: 3
        });
      }
      if (game.currentModeId === 'robot_link' || game.currentModeId === 'robot_untangle') {
        const lvl = game.robotLinkLevel || game.untangleLevel;
        return JSON.stringify({
          mode: game.currentModeId,
          state: game.state,
          round: game.currentWave,
          wave: game.currentWave,
          level: game.currentWave,
          score: game.score,
          shields: game.shields,
          activePairs: lvl?.pairs?.filter(p => !p.resolved)?.length || 0,
          unlinkedPairs: lvl?.unlinkedPairs || 0,
          robotsRestored: lvl?.robotsRestored || game.robotsDestroyed || 0,
          robotsTotal: lvl?.robotsTotal || 0,
          totalWaves: (game.selectedDifficulty === 'ultra') ? Infinity : (lvl?.totalWaves || game.totalWaves || 3),
          holding: false,
          ready: true,
          difficulty: game.selectedDifficulty
        });
      }
      return JSON.stringify({
        mode: game.currentModeId,
        state: game.state,
        wave: game.currentWave,
        score: game.score,
        shields: game.shields,
        bouldersAvoided: game.robotsDestroyed,
        isDragging: !!game.fallingDebrisLevel?.activeDrag,
        activeBoulders: game.fallingDebrisLevel?.boulders?.length || 0,
        activeDangerZones: game.fallingDebrisLevel?.dangerZones?.length || 0,
        activeBases: game.fallingDebrisLevel?.bases?.filter(b => !b.isDestroyed)?.length || 0,
        difficulty: game.selectedDifficulty,
        totalWaves: game.totalWaves
      });
    };
  });
})();
