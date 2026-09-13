import type { SessionUser, StudentDashboard } from "../../api/client";
import { getStudentHomeCopy } from "../../i18n/student";
import { MISSIONS } from "../../missions/catalog";
import { ECONOMY, type PlayerProgression } from "../../domain/progression";
import { HackerProfile } from "../progression/HackerProfile";
import { trainingAvailableModules, trainingCopy } from "../../i18n/training";
import { TrainingCopy } from "../training/TrainingCopy";
import { AmbientLayer } from "../gamefeel/AmbientLayer";
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
  const heroImgSrc =
    equippedHero?.asset && "image" in equippedHero.asset
      ? `${import.meta.env.BASE_URL}${equippedHero.asset.image}`
      : `${import.meta.env.BASE_URL}echo-cyber-wolf.png`;
  const heroLabel = equippedHero
    ? `◉ ${equippedHero.name.toUpperCase()} // ONLINE`
    : "◉ OPERATIVE_ECHO // ONLINE";
  const hasEchoPortrait = hasIdentity && (user.username.toLowerCase() === "test.hacker" || Boolean(equippedHero));
  const hasAnonymousPortrait = !hasIdentity;
  const hasPortrait = hasEchoPortrait || hasAnonymousPortrait;
  const launchCurrentMission = () => {
    if (!activeProgress?.unlocked) return;
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
          <div className="echo-portrait">
            <img src={heroImgSrc} alt={equippedHero?.name ?? "Echo cyber-wolf operative"} />
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
          <div className="echo-title">
            {operativeName ? <h1>{operativeName}</h1> : <strong className="identity-pending-title">IDENTITY PENDING</strong>}
            <span>{dashboard.rank}</span>
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
          {progression && hasIdentity && (
            <HackerProfile
              user={user}
              progression={progression}
              onShop={onShop ?? (() => undefined)}
              onUpdate={onProgression ?? (() => undefined)}
            />
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

      <section className="cyber-home-launch cyber-glass spectral-border" data-rgb-pattern="launch-reverse">
        <div><span>▣</span><p><small>READY TO ENGAGE</small><strong>CONSOLE LINK ESTABLISHED</strong><em>{copy.nextSkill.en}</em></p></div>
        <button disabled={!activeProgress?.unlocked} onClick={launchCurrentMission}>
          <span>ϟ</span><strong>BEGIN OPERATION</strong><small lang={user.supportLanguage}>{support.beginOperation}</small>
        </button>
      </section>

      <section className="cyber-home-network cyber-glass spectral-border" data-rgb-pattern="campaign-diagonal">
        <header>
          <div><span>⌘</span><p><strong>CAMPAIGN PROGRESSION NETWORK</strong><small lang={user.supportLanguage}>{support.campaignNetwork}</small></p></div>
          <b>{dashboard.completedMissions.length} / {MISSIONS.length} SECURED</b>
        </header>
        <section className="mission-card-grid" aria-label="Training missions">
        {MISSIONS.map((mission) => {
          const robotMode = robotDefenseModes.find(mode => mode.requiredMission === mission.number);
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
              className={`mission-card ${state} ${dashboard.currentMission === mission.number ? "current" : ""}`}
              aria-label={`Mission ${mission.number}: ${mission.title.en}`}
              onPointerEnter={() => playEffect("hover", dashboard.progression?.settings.muted ?? true)}
            >
              <div className="mission-number">
                <span>{mission.number <= 3 ? "ROOKIE" : "OPERATOR"}</span>
                <strong>{String(mission.number).padStart(2, "0")}</strong>
              </div>
              <div className="mission-summary">
                {state === "available" && progress.attemptCount === 0 && (
                  <span className="new-signal">NEW SIGNAL</span>
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
                    <span>Complete the previous mission.</span>
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
                      {state === "completed" ? "Replay" : copy.openBriefing.en}
                      <small lang={user.supportLanguage}>
                        {state === "completed"
                          ? labels.replay[user.supportLanguage]
                          : labels.briefing[user.supportLanguage]}
                      </small>
                    </span>
                    <b>→</b>
                  </button>
                )}
              </div>
              {robotMode && onRobotDefense && robotDefenseUnlocked(robotMode, dashboard.completedMissions) && <button className="mission-training-link" aria-label={`Train ${robotMode.name}`} onClick={() => onRobotDefense(robotMode.id)}><span>TRAINING CENTER <small lang={user.supportLanguage}>{support.trainingCenter}</small></span><strong>{robotMode.name}</strong><small lang={user.supportLanguage}>{robotMode.support[user.supportLanguage]}</small><b>→</b></button>}
            </article>
          );
        })}
        </section>
      </section>

      <section className="cyber-home-utilities">
        <section className="cyber-home-training cyber-glass spectral-border" data-rgb-pattern="training-orbit" aria-label="Training Center status">
          <header><span>◎</span><div><strong>TRAINING CENTER</strong><small lang={user.supportLanguage}>{support.trainingCenter}</small></div><b>{availableTrainingCount} READY</b></header>
          <h2><TrainingCopy copy={trainingCopy("keepSystemsSharp", user.supportLanguage)} /></h2>
          {availableTrainingCount > 0 ? (
            <>
              <p><TrainingCopy copy={trainingAvailableModules(user.supportLanguage, availableTrainingCount)} /></p>
              {trainingCreditCap > 0 && <><strong>{trainingCredits} / {trainingCreditCap} Credits</strong><ProgressMeter label="Training Credits" value={trainingCredits} max={trainingCreditCap} detail={`${trainingCredits} / ${trainingCreditCap}`} /></>}
              <button aria-label="Open Training Center" className="cyber-outline-button cyan" onClick={onTraining}><TrainingCopy copy={trainingCopy("openTrainingCenter", user.supportLanguage)} /><b>→</b></button>
            </>
          ) : <p><span>Training modules unlock through the campaign.</span><small lang={user.supportLanguage}>{support.trainingLocked}</small></p>}
        </section>

        <section className="cyber-home-supply cyber-glass spectral-border" data-rgb-pattern="supply-reverse">
          <header><span>▦</span><div><strong>CYBER SHOP</strong><small lang={user.supportLanguage}>{support.supplyDepot}</small></div><b>{progression?.currentCredits ?? 0} CREDITS</b></header>
          <div className="supply-preview"><i>◇</i><p><strong>AGENT LOADOUT</strong><span>HEROES · POINTERS · THEMES · ASSISTANTS</span></p></div>
          <button className="cyber-outline-button orange" onClick={onShop}><span>OPEN CYBER SHOP</span><small lang={user.supportLanguage}>{support.openSupply}</small><b>→</b></button>
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
