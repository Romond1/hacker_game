import { FrameOrnament } from "../progression/FrameOrnament";
import type { SessionUser, StudentDashboard } from "../../api/client";
import { getStudentHomeCopy } from "../../i18n/student";
import { MISSIONS } from "../../missions/catalog";
import { ECONOMY, type PlayerProgression } from "../../domain/progression";
import { trainingAvailableModules, trainingCopy } from "../../i18n/training";
import { TrainingCopy } from "../training/TrainingCopy";
import { AmbientLayer } from "../gamefeel/AmbientLayer";

const EQUIPMENT_CATEGORIES = [
  { key: "hero", label: "HERO" },
  { key: "badge", label: "BADGE" },
  { key: "cursor", label: "CURSOR" },
  { key: "mouseEffect", label: "MOUSE EFFECT" },
  { key: "mouseAnimation", label: "MOUSE ANIMATION" },
  { key: "terminalTheme", label: "TERMINAL THEME" },
  { key: "companion", label: "COMPANION" },
] as const;
import { ProgressMeter } from "../gamefeel/ProgressMeter";
import { robotDefenseModes, robotDefenseUnlocked } from "../../training/robot-defense";
import type { RobotDefenseModeId } from "../../training/robot-defense";
import { playEffect } from "../../effects/gameEffects";

function formatTime(seconds: number | null): string {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const labels = {
  available: { it: "Disponibile ora", ja: "利用できます" },
  completed: { it: "Completata", ja: "完了" },
  locked: { it: "Bloccata", ja: "ロック中" },
  replay: { it: "Rigioca", ja: "もう一度プレイ" },
  briefing: { it: "Apri il briefing", ja: "ブリーフィングを開く" },
  startMission: { it: "Inizia missione", ja: "ミッション開始" },
  lockedHelp: {
    it: "Completa la missione precedente.",
    ja: "前のミッションを完了してください。",
  },
} as const;

const dashboardLabels = {
  it: {
    homeBase: "Base operativa",
    echoOnline: "Guida cyber online",
    currentOperation: "Operazione attuale",
    beginOperation: "Inizia operazione",
    campaignNetwork: "Rete di avanzamento della campagna",
    secured: "protetti",
    trainingCenter: "Centro di addestramento",
    trainingLocked: "Completa una missione per sbloccare l'addestramento.",
    supplyDepot: "Cyber Shop",
    openSupply: "Apri il Cyber Shop",
    systemReady: "Sistema pronto",
    identityPending: "Identità in attesa",
    identityHelp: "Completa tre Missioni Rookie per creare la tua identità hacker.",
    profileEncrypted: "Profilo operativo crittografato",
    lockedStatus: "Bloccato",
    shopLockedHelp: "Completa tre Missioni Rookie per sbloccare il Cyber Shop.",
  },
  ja: {
    homeBase: "ホームベース",
    echoOnline: "サイバーガイド・オンライン",
    currentOperation: "現在の作戦",
    beginOperation: "作戦開始",
    campaignNetwork: "キャンペーン進行ネットワーク",
    secured: "確保済み",
    trainingCenter: "トレーニングセンター",
    trainingLocked: "ミッションを完了するとトレーニングが解除されます。",
    supplyDepot: "サイバーショップ",
    openSupply: "サイバーショップを開く",
    systemReady: "システム準備完了",
    identityPending: "アイデンティティ保留中",
    identityHelp: "3つのルーキーミッションを完了して、ハッカーとしての自分を作成しましょう。",
    profileEncrypted: "オペレータープロフィール暗号化中",
    lockedStatus: "ロック中",
    shopLockedHelp: "3つのルーキーミッションを完了するとサイバーショップが解除されます。",
  },
} as const;

export function StudentHome({
  user,
  dashboard,
  onMission,
  onSettings,
  onShop,
  onProgression,
  onTraining,
  onRobotDefense,
}: {
  user: SessionUser;
  dashboard: StudentDashboard;
  onMission: (missionId: string) => void;
  onSettings: () => void;
  onShop?: () => void;
  onProgression?: (state: PlayerProgression) => void;
  onTraining?: () => void;
  onRobotDefense?: (mode: RobotDefenseModeId) => void;
}) {
  const copy = getStudentHomeCopy(
    user.supportLanguage,
    dashboard.progression
      ? (dashboard.progression.hackerCodename ?? "Rookie")
      : user.displayName,
  );
  const unlockedTraining = (dashboard.training ?? []).filter(
    (item) => item.unlocked,
  );
  const availableRobotModes = robotDefenseModes.filter(mode => robotDefenseUnlocked(mode, dashboard.completedMissions));
  const availableTrainingCount = unlockedTraining.length + availableRobotModes.length;
  const trainingCredits = unlockedTraining.reduce(
    (sum, item) => sum + item.creditsEarned,
    0,
  );
  const trainingCreditCap = unlockedTraining.reduce(
    (sum, item) => sum + item.creditCap,
    0,
  );
  const activeMission = MISSIONS.find(
    (mission) => mission.number === dashboard.currentMission,
  ) ?? MISSIONS[0];
  const activeProgress = dashboard.missions.find(
    (item) => item.missionId === activeMission.id,
  );
  const support = dashboardLabels[user.supportLanguage];
  const progression = dashboard.progression;
  const hasIdentity = Boolean(
    progression?.hackerIdentityUnlocked && progression.hackerCodename,
  );
  const operativeName = hasIdentity ? progression?.hackerCodename : null;
  const equippedHero = progression?.equippedItems?.hero
    ? ECONOMY.items.find((item) => item.itemId === progression.equippedItems.hero)
    : undefined;
  const equippedBadge = ECONOMY.items.find(item => item.itemId === progression?.equippedItems.badge);
  const heroImgSrc =
    equippedHero?.asset && "image" in equippedHero.asset
      ? `${import.meta.env.BASE_URL}${equippedHero.asset.image}`
      : `${import.meta.env.BASE_URL}echo-cyber-wolf.png`;
  const heroLabel = equippedHero
    ? `◉ ${equippedHero.name.toUpperCase()} // ONLINE`
    : "◉ OPERATIVE_ECHO // ONLINE";
  const hasEchoPortrait = hasIdentity && (user.username.toLowerCase() === "test.hacker" || Boolean(equippedHero) || Boolean(progression?.equippedItems.badge));
  const hasAnonymousPortrait = !hasIdentity;
  const hasPortrait = hasEchoPortrait || hasAnonymousPortrait;
  const isMissionUnlocked = activeProgress?.unlocked ?? (activeMission.number === 1 || dashboard.completedMissions.includes(activeMission.number));
  const neededTraining = !isMissionUnlocked && activeMission.number > 3 && dashboard.completedMissions.includes(activeMission.number - 1);
  const startNeededTraining = () => {
    const mode = robotDefenseModes.find(mode => 'trainingNumber' in mode && mode.trainingNumber === activeMission.number);
    if (mode && onRobotDefense) onRobotDefense(mode.id); else onTraining?.();
  };
  const isShopUnlocked = Boolean(
    progression?.storyFlags?.shopUnlocked ||
    dashboard.completedMissions.includes(3) ||
    dashboard.completedMissions.some((m) => m >= 3) ||
    user.username.toLowerCase() === "test.hacker"
  );
  const isTrainingUnlocked = Boolean(availableTrainingCount > 0 || dashboard.completedMissions.length >= 1);
  const launchCurrentMission = () => {
    if (!isMissionUnlocked) return;
    playEffect("click", progression?.settings.muted ?? true);
    onMission(activeMission.id);
  };
  return (
    <main className="page home-page cyber-home" aria-label="Cyber Hero Home Base">
      <div className="cyber-home-background" aria-hidden="true">
        <div className="cyber-login-grid" />
        <div className="cyber-login-floor" />
        <div className="cyber-login-scan" />
        <div className="cyber-login-glow glow-one" />
        <div className="cyber-login-glow glow-two" />
        <div className="cyber-login-shape shape-one" />
        <div className="cyber-login-shape shape-two" />
      </div>
      <AmbientLayer variant="grid" />

      <header className="cyber-home-status">
        <div><i /><strong>NEURAL LINK: SYNCHRONIZED</strong></div>
        <span>{operativeName ? `◇ ${operativeName} ONLINE · QUANTUM UPLINK ESTABLISHED` : "◇ IDENTITY PROTOCOL PENDING · SECURE CHANNEL ACTIVE"}</span>
        <b>FIREWALL: ARMED</b>
      </header>

      <section className={`cyber-home-echo cyber-glass spectral-border ${hasPortrait ? "" : "no-portrait"}`} data-rgb-pattern="echo-orbit">
        {hasEchoPortrait && (
          <div className={`echo-portrait ${equippedBadge ? `premium-frame ${equippedBadge.asset.className ?? "frame-rookie"}` : ""}`}>
            <img src={heroImgSrc} alt={equippedHero?.name ?? "Echo cyber-wolf operative"} />
            {equippedBadge && <FrameOrnament />}
            <span>{heroLabel}</span>
          </div>
        )}
        {hasAnonymousPortrait && (
          <div className="echo-portrait anonymous-portrait">
            <img src={`${import.meta.env.BASE_URL}anonymous-cadet.png`} alt="Anonymous cadet awaiting identity selection" />
            <span>◉ IDENTITY FILE // ENCRYPTED</span>
          </div>
        )}
        <div className="echo-command">
          <p className="eyebrow">{hasIdentity ? "CYBER GUIDE" : "OPERATIVE PROFILE: ENCRYPTED"} // <span lang={user.supportLanguage}>{hasIdentity ? support.echoOnline : support.profileEncrypted}</span></p>
          <div className="echo-header-row">
            <div className="echo-title">
              {operativeName ? <h1>{operativeName}</h1> : <strong className="identity-pending-title">IDENTITY PENDING</strong>}
              <span>{dashboard.rank}</span>
            </div>
            <section className="cyber-home-launch cyber-glass spectral-border" data-rgb-pattern="launch-reverse" aria-label="Operation launch console">
              <div><span>▣</span><p><small>{neededTraining ? `TRAINING ${activeMission.number} READY` : isMissionUnlocked ? 'NEXT MISSION READY' : 'MISSION LOCKED'}</small><strong>MISSION {String(activeMission.number).padStart(2, '0')} · {activeMission.title.en}</strong><em lang={user.supportLanguage}>{activeMission.title[user.supportLanguage]}</em></p></div>
              <button disabled={!isMissionUnlocked && !neededTraining} onClick={neededTraining ? startNeededTraining : launchCurrentMission} aria-label={neededTraining ? `Start Training ${activeMission.number}` : `Start Mission ${activeMission.number}: ${activeMission.title.en}`}>
                <span>ϟ</span><strong>{neededTraining ? "START TRAINING" : "START MISSION"} {String(activeMission.number).padStart(2, '0')}</strong><small lang={user.supportLanguage}>{labels.startMission[user.supportLanguage]}</small>
              </button>
            </section>
          </div>
          {operativeName ? (
            <><p className="echo-welcome">{copy.welcome.en}</p><small lang={copy.welcome.lang}>{copy.welcome.support}</small></>
          ) : (
            <><p className="echo-welcome">Complete three Rookie Missions to create your hacker identity.</p><small lang={user.supportLanguage}>{support.identityHelp}</small></>
          )}
          <div className="echo-readouts">
            <div><span>{progression ? "LIFETIME XP" : copy.totalPoints.en}<small lang={copy.totalPoints.lang}>{copy.totalPoints.support}</small></span><strong>{progression?.lifetimeXP ?? dashboard.totalPoints}</strong></div>
            <div><span>CREDITS</span><strong>{progression?.currentCredits ?? 0}</strong></div>
            <div><span>{copy.currentMission.en}<small lang={copy.currentMission.lang}>{copy.currentMission.support}</small></span><strong>{String(dashboard.currentMission).padStart(2, "0")}</strong></div>
          </div>

          <div className="echo-quick-utilities">
            <section
              className={`echo-utility-card cyber-home-training cyber-glass spectral-border ${isTrainingUnlocked ? "" : "is-locked"}`}
              data-rgb-pattern="training-orbit"
              aria-label="Training Center status"
            >
              <header className="echo-utility-header">
                <div>
                  <span>◎</span>
                  <div>
                    <strong>TRAINING CENTER</strong>
                    <small lang={user.supportLanguage}>{support.trainingCenter}</small>
                  </div>
                </div>
                <b className="echo-utility-tag">
                  {isTrainingUnlocked ? `${availableTrainingCount} READY` : support.lockedStatus}
                </b>
              </header>
              {!isTrainingUnlocked && <h2 className="utility-heading"><TrainingCopy copy={trainingCopy("keepSystemsSharp", user.supportLanguage)} /></h2>}
              <div className="echo-utility-body">
                {isTrainingUnlocked ? (
                  <>
                    <p><TrainingCopy copy={trainingAvailableModules(user.supportLanguage, availableTrainingCount)} /></p>
                    {trainingCreditCap > 0 && (
                      <div className="utility-credits-row">
                        <strong>{trainingCredits} / {trainingCreditCap} Credits</strong>
                        <ProgressMeter label="Training Credits" value={trainingCredits} max={trainingCreditCap} detail={`${trainingCredits} / ${trainingCreditCap}`} />
                      </div>
                    )}
                  </>
                ) : (
                  <p><span>Training modules unlock through the campaign.</span><small lang={user.supportLanguage}>{support.trainingLocked}</small></p>
                )}
              </div>
              <button
                aria-label="Open Training Center"
                className="cyber-outline-button cyan"
                onClick={onTraining}
                disabled={!isTrainingUnlocked}
              >
                <TrainingCopy copy={trainingCopy("openTrainingCenter", user.supportLanguage)} />
                <b>→</b>
              </button>
            </section>

            <section
              className={`echo-utility-card cyber-home-supply cyber-glass spectral-border ${isShopUnlocked ? "" : "is-locked"}`}
              data-rgb-pattern="supply-reverse"
              aria-label="Cyber Shop status"
            >
              <header className="echo-utility-header">
                <div>
                  <span>▦</span>
                  <div>
                    <strong>CYBER SHOP</strong>
                    <small lang={user.supportLanguage}>{support.supplyDepot}</small>
                  </div>
                </div>
                <b className="echo-utility-tag">
                  {isShopUnlocked ? `${progression?.currentCredits ?? 0} CREDITS` : (user.supportLanguage === "ja" ? "作戦03で解除" : "MISSIONE 3")}
                </b>
              </header>
              <h2 className="utility-heading">
                {isShopUnlocked ? (
                  <>
                    <span>CYBER SHOP // RECON & GEAR</span>
                    <small lang={user.supportLanguage}>
                      {user.supportLanguage === "ja" ? "装備とカスタマイズ" : "Equipaggiamento e personalizzazione"}
                    </small>
                  </>
                ) : (
                  <>
                    <span>CYBER SHOP // LOCKED</span>
                    <small lang={user.supportLanguage}>
                      {user.supportLanguage === "ja" ? "作戦03で解除" : "Sblocca con Missione 3"}
                    </small>
                  </>
                )}
              </h2>
              <div className="echo-utility-body">
                {!isShopUnlocked && (
                  <p className="shop-locked-help">
                    <span>Shop unlocks after completing Mission 3.</span>
                    <small lang={user.supportLanguage}>{support.shopLockedHelp}</small>
                  </p>
                )}
                <details className="echo-loadout"><summary>YOUR GEAR <small lang={user.supportLanguage}>{user.supportLanguage === 'it' ? 'Il tuo equipaggiamento' : '装備を見る'}</small></summary>
                <div role="region" className="echo-equipment-grid" aria-label="Equipped loadout">
                  {EQUIPMENT_CATEGORIES.map(({ key, label }) => {
                    const equipped = ECONOMY.items.find(
                      (item) => item.itemId === progression?.equippedItems?.[key],
                    );
                    return (
                      <span key={key} className="echo-slot-chip">
                        <small>{label}</small>
                        <b>{equipped ? `${equipped.icon} ${equipped.name}` : "DEFAULT"}</b>
                      </span>
                    );
                  })}
                </div></details>
              </div>
              <button
                aria-label="Open Cyber Shop"
                className="cyber-shop-button"
                onClick={onShop}
                disabled={!isShopUnlocked}
              >
                <div>
                  <strong>OPEN CYBER SHOP</strong>
                  <small lang={user.supportLanguage}>{support.openSupply}</small>
                </div>
                <b>{isShopUnlocked ? "→" : "◇"}</b>
              </button>
            </section>
          </div>
          {progression && progression.achievements && progression.achievements.length > 0 && (
            <div className="profile-achievements" aria-label="Achievements">
              {progression.achievements.map((id) => (
                <span key={id}>◇ {id.replaceAll("-", " ").toUpperCase()}</span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="cyber-home-operation cyber-glass spectral-border" data-rgb-pattern="mission-wave">
        <div className="operation-copy">
          <p className="eyebrow">CURRENT OPERATION // <span lang={user.supportLanguage}>{support.currentOperation}</span></p>
          <span className="operation-priority">PRIORITY MISSION {String(activeMission.number).padStart(2, "0")}</span>
          <h2>OPERATION {String(activeMission.number).padStart(2, "0")} — <em>{activeMission.title.en}</em></h2>
          <h3 lang={user.supportLanguage}>{activeMission.title[user.supportLanguage]}</h3>
          <p>{activeMission.story.en}</p>
          <small lang={user.supportLanguage}>{activeMission.story[user.supportLanguage]}</small>
        </div>
        <div className="operation-radar" aria-hidden="true">
          <i /><i /><i /><b /><span />
          <small>RF_SIGNAL_MONITOR // NODE_{String(activeMission.number).padStart(2, "0")}</small>
        </div>
      </section>

      <section className="cyber-home-network cyber-glass spectral-border" data-rgb-pattern="campaign-diagonal">
        <header>
          <div><span>⌘</span><p><strong>CAMPAIGN PROGRESSION NETWORK</strong><small lang={user.supportLanguage}>{support.campaignNetwork}</small></p></div>
          <b>{dashboard.completedMissions.length} / {MISSIONS.length} SECURED</b>
        </header>
        <section className="mission-card-grid" aria-label="Training missions">
        {MISSIONS.map((mission) => {
          const robotMode = robotDefenseModes.find(mode => mission.number <= 3 ? mode.requiredMission === mission.number && !('trainingNumber' in mode) : 'trainingNumber' in mode && mode.trainingNumber === mission.number);
          const progress = dashboard.missions.find(
            (item) => item.missionId === mission.id,
          ) ?? {
            missionId: mission.id,
            missionNumber: mission.number,
            unlocked: mission.number === 1,
            completed: false,
            bestScore: null,
            bestTimeSeconds: null,
            totalPoints: 0,
            attemptCount: 0,
          };
          const state = progress.completed
            ? "completed"
            : progress.unlocked
              ? "available"
              : "locked";
          const englishStatus =
            state === "completed"
              ? "Completed"
              : state === "available"
                ? "Available now"
                : "Locked";
          return (
            <article
              key={mission.id}
              className={`mission-card ${state} ${mission.recoveryChallenge ? "recovery-boss-card" : ""} ${dashboard.currentMission === mission.number ? "current" : ""}`}
              aria-label={`Mission ${mission.number}: ${mission.title.en}`}
              onPointerEnter={() => playEffect("hover", dashboard.progression?.settings.muted ?? true)}
            >
              <div className="mission-number">
                <span>{mission.recoveryChallenge ? "BOSS" : mission.number <= 3 ? "ROOKIE" : "OPERATOR"}</span>
                <strong>{String(mission.number).padStart(2, "0")}</strong>
              </div>
              <div className="mission-summary">
                {state === "available" && progress.attemptCount === 0 && (
                  <span className="new-signal">{mission.recoveryChallenge ? 'EMERGENCY SIGNAL' : 'NEW SIGNAL'}</span>
                )}
                <p className="status-chip">{englishStatus}</p>
                <small className="status-support" lang={user.supportLanguage}>
                  {labels[state][user.supportLanguage]}
                </small>
                <h2>{mission.title.en}</h2>
                <h3 lang={user.supportLanguage}>
                  {mission.title[user.supportLanguage]}
                </h3>
                <p>{mission.story.en}</p>
                <div className="skill-row">
                  {mission.skills.map((skill) => (
                    <span key={skill.en}>{skill.en}</span>
                  ))}
                </div>
              </div>
              <div className="mission-action">
                <dl>
                  <div>
                    <dt>{copy.personalBest.en}</dt>
                    <small lang={copy.personalBest.lang}>
                      {copy.personalBest.support}
                    </small>
                    <dd>
                      {progress.bestScore === null
                        ? "First attempt"
                        : `${progress.bestScore} pts`}
                    </dd>
                  </div>
                  <div>
                    <dt>{copy.bestTime.en}</dt>
                    <small lang={copy.bestTime.lang}>
                      {copy.bestTime.support}
                    </small>
                    <dd>{formatTime(progress.bestTimeSeconds)}</dd>
                  </div>
                </dl>
                {state === "locked" ? (
                  <div className="locked-note">
                    <span>Complete the previous mission{mission.number > 3 ? ` and Training ${mission.number}` : ""}.</span>
                    <small lang={user.supportLanguage}>
                      {labels.lockedHelp[user.supportLanguage]}
                    </small>
                  </div>
                ) : (
                  <button
                    className="primary-button"
                    onClick={() => { playEffect("click", dashboard.progression?.settings.muted ?? true); onMission(mission.id); }}
                  >
                    <span>
                      {state === "completed" ? "Replay" : mission.number <= 3 ? "Start Mission" : copy.openBriefing.en}
                      <small lang={user.supportLanguage}>
                        {state === "completed"
                          ? labels.replay[user.supportLanguage]
                          : (mission.number <= 3 ? labels.startMission : labels.briefing)[user.supportLanguage]}
                      </small>
                    </span>
                    <b>→</b>
                  </button>
                )}
              </div>
              {mission.number === 6 && dashboard.completedMissions.includes(5) && <button className="mission-training-link" onClick={onTraining}>Training 6 → Data Transfer → Mission 6</button>}
              {robotMode && onRobotDefense && robotDefenseUnlocked(robotMode, dashboard.completedMissions) && <button className="mission-training-link" aria-label={`Train ${robotMode.name}`} onClick={() => onRobotDefense(robotMode.id)}><span>✦ {mission.number > 3 ? `TRAINING ${mission.number} → MISSION ${mission.number}` : "BONUS TRAINING · READY"} <small lang={user.supportLanguage}>{support.trainingCenter}</small></span><strong>{robotMode.name}</strong><small lang={user.supportLanguage}>{robotMode.support[user.supportLanguage]}</small><b>→</b></button>}
            </article>
          );
        })}
        </section>
      </section>

      <section className="cyber-home-system cyber-glass spectral-border" data-rgb-pattern="system-wave">
        <div>
          <p className="step-label">{copy.progress.en} <small lang={copy.progress.lang}>{copy.progress.support}</small></p>
          <ProgressMeter
            label="Campaign progress"
            value={dashboard.completedMissions.length}
            max={MISSIONS.length}
            detail={`${dashboard.completedMissions.length} / ${MISSIONS.length} nodes secured`}
          />
          <p>
            {dashboard.completedMissions.length} missions completed · Your progress is private.
          </p>
        </div>
        <div className="system-stream"><span>NODE_SYNC_OK</span><span>{operativeName ? `${operativeName}_LINK_ACTIVE` : "IDENTITY_LOCKED"}</span><span>TRAINING_ENCLAVE_SECURE</span></div>
        <button className="settings-link" onClick={onSettings}>
          <span>✦</span>
          <div>
            <strong>{copy.settings.en}</strong>
            <small lang={copy.settings.lang}>{copy.settings.support}</small>
          </div>
          <b>→</b>
        </button>
      </section>
      <footer className="cyber-home-footer"><span>● SYNC: 0.002s</span><b>SYSTEM CONSOLE: {operativeName ? `${operativeName}@CYBER-HERO` : "ACCESS_PENDING"}</b><strong>{support.systemReady}</strong></footer>
    </main>
  );
}
