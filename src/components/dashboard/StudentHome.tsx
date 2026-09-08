import type { SessionUser, StudentDashboard } from "../../api/client";
import { getStudentHomeCopy } from "../../i18n/student";
import { MISSIONS } from "../../missions/catalog";
import type { PlayerProgression } from "../../domain/progression";
import { HackerProfile } from "../progression/HackerProfile";
import { Copy } from "../progression/Copy";
import { trainingAvailableModules, trainingCopy } from "../../i18n/training";
import { TrainingCopy } from "../training/TrainingCopy";
import { AmbientLayer } from "../gamefeel/AmbientLayer";
import { ProgressMeter } from "../gamefeel/ProgressMeter";
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

export function StudentHome({
  user,
  dashboard,
  onMission,
  onSettings,
  onShop,
  onProgression,
  onTraining,
}: {
  user: SessionUser;
  dashboard: StudentDashboard;
  onMission: (missionId: string) => void;
  onSettings: () => void;
  onShop?: () => void;
  onProgression?: (state: PlayerProgression) => void;
  onTraining?: () => void;
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
  const trainingCredits = unlockedTraining.reduce(
    (sum, item) => sum + item.creditsEarned,
    0,
  );
  const trainingCreditCap = unlockedTraining.reduce(
    (sum, item) => sum + item.creditCap,
    0,
  );
  return (
    <main className="page home-page">
      <AmbientLayer variant="grid" />
      <section className="welcome-strip">
        <div>
          <p className="eyebrow">
            {dashboard.progression
              ? dashboard.progression.storyFlags.rookieTrainingCompleted
                ? "HOME BASE / MISSION"
                : "ROOKIE TRAINING / MISSION"
              : "AGENT HOME / LEVEL"}{" "}
            {String(dashboard.currentMission).padStart(2, "0")}
          </p>
          <h1>{copy.welcome.en}</h1>
          <small className="home-support-heading" lang={copy.welcome.lang}>
            {copy.welcome.support}
          </small>
          <div className="bilingual">
            <div>{copy.nextSkill.en}</div>
            <small lang={copy.nextSkill.lang}>{copy.nextSkill.support}</small>
          </div>
        </div>
        <div className="rank-badge">
          <span>{copy.currentMission.en}</span>
          <small lang={copy.currentMission.lang}>
            {copy.currentMission.support}
          </small>
          <strong>Mission {dashboard.currentMission}</strong>
          <span>
            {dashboard.progression ? "Lifetime XP" : copy.totalPoints.en}
          </span>
          <small lang={copy.totalPoints.lang}>{copy.totalPoints.support}</small>
          <strong>
            {dashboard.progression?.lifetimeXP ?? dashboard.totalPoints}
          </strong>
        </div>
      </section>
      {dashboard.progression && (
        <>
          <HackerProfile
            user={user}
            progression={dashboard.progression}
            onShop={onShop ?? (() => undefined)}
            onUpdate={onProgression ?? (() => undefined)}
          />
          {!dashboard.progression.storyFlags.rookieTrainingCompleted && (
            <section className="rookie-introduction">
              <h2>
                <Copy id="training" language={user.supportLanguage} />
              </h2>
              <p>
                <Copy id="introduction" language={user.supportLanguage} />
              </p>
            </section>
          )}
        </>
      )}
      {unlockedTraining.length > 0 && (
        <section
          className="training-home-entry"
          aria-label="Training Center status"
        >
          <div>
            <p className="eyebrow">
              <TrainingCopy
                copy={trainingCopy(
                  "homeBaseTrainingCenter",
                  user.supportLanguage,
                )}
              />
            </p>
            <h2>
              <TrainingCopy
                copy={trainingCopy("keepSystemsSharp", user.supportLanguage)}
              />
            </h2>
            <p>
              <TrainingCopy
                copy={trainingAvailableModules(
                  user.supportLanguage,
                  unlockedTraining.length,
                )}
              />
            </p>
          </div>
          <div className="training-home-readout">
            <TrainingCopy
              copy={trainingCopy("trainingCredits", user.supportLanguage)}
            />
            <strong>
              {trainingCredits} / {trainingCreditCap} Credits
            </strong>
            <ProgressMeter
              label="Training Credits"
              value={trainingCredits}
              max={trainingCreditCap}
              detail={`${trainingCredits} / ${trainingCreditCap}`}
            />
            <button
              aria-label="Open Training Center"
              className="primary-button"
              onClick={onTraining}
            >
              <TrainingCopy
                copy={trainingCopy("openTrainingCenter", user.supportLanguage)}
              />
              <b>→</b>
            </button>
          </div>
        </section>
      )}
      <section className="mission-card-grid" aria-label="Training missions">
        {MISSIONS.map((mission) => {
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
            </article>
          );
        })}
      </section>
      <section className="home-bottom">
        <div>
          <p className="step-label">{copy.progress.en}</p>
          <small lang={copy.progress.lang}>{copy.progress.support}</small>
          <ProgressMeter
            label="Campaign progress"
            value={dashboard.completedMissions.length}
            max={MISSIONS.length}
            detail={`${dashboard.completedMissions.length} / ${MISSIONS.length} nodes secured`}
          />
          <p>
            {dashboard.completedMissions.length} missions completed · Your
            progress is private.
          </p>
        </div>
        <button className="settings-link" onClick={onSettings}>
          <span>✦</span>
          <div>
            <strong>{copy.settings.en}</strong>
            <small lang={copy.settings.lang}>{copy.settings.support}</small>
          </div>
          <b>→</b>
        </button>
      </section>
    </main>
  );
}
