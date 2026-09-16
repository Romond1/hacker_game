import type { TrainingProgress } from "../../domain/training";
import type { TrainingModule } from "../../training/catalog";
import type { SupportLanguage } from "../../domain/mission";
import {
  localizedTrainingCopy,
  trainingBeginModule,
  trainingCopy,
  trainingCreditPerRun,
  trainingMissionRequirement,
  trainingRoundCount,
  trainingRunCount,
  trainingXpMaximum,
} from "../../i18n/training";
import { TrainingCopy } from "./TrainingCopy";
import { AmbientLayer } from "../gamefeel/AmbientLayer";
import { OperatorMessage } from "../gamefeel/OperatorMessage";
import { ProgressMeter } from "../gamefeel/ProgressMeter";
import { robotDefenseModes, robotDefenseUnlocked, type RobotDefenseModeId } from "../../training/robot-defense";

function formatTime(seconds: number | null): string {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function emptyProgress(module: TrainingModule): TrainingProgress {
  return {
    trainingId: module.id,
    unlocked: false,
    completedRuns: 0,
    rewardedRuns: 0,
    creditsEarned: 0,
    creditCap: module.reward.creditCap,
    bestScore: null,
    bestTimeSeconds: null,
    bestAccuracy: null,
    longestStreak: 0,
    highestRank: null,
    lastCompletedAt: null,
  };
}

export function TrainingCenter({
  language,
  modules,
  progress,
  onStart,
  completedMissions = [],
  onRobotDefense,
  onBack,
}: {
  language: SupportLanguage;
  modules: readonly TrainingModule[];
  progress: TrainingProgress[];
  onStart: (trainingId: string) => void;
  completedMissions?: number[];
  onRobotDefense?: (mode: RobotDefenseModeId) => void;
  onBack: () => void;
}) {
  return (
    <main className="page training-center">
      <AmbientLayer variant="signal" />
      <button aria-label="Home Base" className="back-link" onClick={onBack}>
        ← <TrainingCopy copy={trainingCopy("backHomeBase", language)} />
      </button>
      <header className="training-center-heading">
        <div>
          <p className="eyebrow">
            <TrainingCopy
              copy={trainingCopy("homeBaseTrainingCenter", language)}
            />
          </p>
          <h1>
            <TrainingCopy copy={trainingCopy("sharpenSystems", language)} />
          </h1>
          <p>
            <TrainingCopy copy={trainingCopy("shortDrills", language)} />
          </p>
        </div>
        <div className="training-signal" aria-hidden="true">
          <span>SYS</span>
          <i />
          <i />
          <i />
        </div>
      </header>
      <OperatorMessage
        message={
          <TrainingCopy
            copy={{
              en: "Select a module. Your personal best is waiting.",
              support:
                language === "it"
                  ? "Scegli un modulo. Il tuo record personale ti aspetta."
                  : "モジュールを選択してください。自己ベストに挑戦しましょう。",
              lang: language,
            }}
          />
        }
        title="CYBER GUIDE / TRAINING"
      />
      {onRobotDefense && <section className="robot-defense-modes" aria-label="Robot Defense training modes">
        <header><p className="eyebrow">TRAINING GROUND / {language === 'it' ? 'Campo di addestramento' : '訓練場'}</p><h2>Robot Defense Training</h2><p>Practice mouse skills, then apply them in the campaign. <small lang={language}>{language === 'it' ? 'Allena le abilità del mouse e poi usale nelle missioni.' : 'マウス操作を練習して、ミッションで使いましょう。'}</small></p></header>
        <div className="robot-defense-mode-grid">{robotDefenseModes.map(mode => {
          const unlocked = robotDefenseUnlocked(mode, completedMissions);
          return <article key={mode.id} className={`robot-defense-mode ${unlocked ? 'available' : 'locked'}`} aria-label={mode.name}>
            <span>TRAINING {'trainingNumber' in mode ? mode.trainingNumber : `${mode.requiredMission}.5`}</span><h3>{mode.name}</h3><small lang={language}>{mode.support[language]}</small>
            <p>{mode.skill.en}</p><small lang={language}>{mode.skill[language]}</small>
            {unlocked ? <button aria-label={`Train ${mode.name}`} className="primary-button" onClick={() => onRobotDefense(mode.id)}>Start training →</button>
              : <p className="training-lock-note">Complete Mission {mode.requiredMission} to unlock. <small lang={language}>{language === 'it' ? `Completa la Missione ${mode.requiredMission} per sbloccare.` : `ミッション${mode.requiredMission}を完了すると解除されます。`}</small></p>}
          </article>;
        })}</div>
      </section>}
      <section className="training-module-list" aria-label="Training modules">
        {modules.map((module, moduleIndex) => {
          const state =
            progress.find((item) => item.trainingId === module.id) ??
            emptyProgress(module);
          const rewardComplete = state.creditsEarned >= state.creditCap;
          return (
            <article
              key={module.id}
              className={`training-module ${state.unlocked ? "available" : "locked"}`}
              aria-label={module.title}
            >
              <div className="training-module-index">
                <TrainingCopy copy={trainingCopy("module", language)} />
                <strong>{module.id === "data-transfer" ? "06" : String(moduleIndex + 1).padStart(2, "0")}</strong>
                <TrainingCopy copy={trainingCopy("beginner", language)} />
              </div>
              <div className="training-module-copy">
                <p className="eyebrow">
                  <TrainingCopy
                    copy={localizedTrainingCopy(
                      module.localized.skill,
                      language,
                    )}
                  />
                </p>
                <h2>
                  <TrainingCopy
                    copy={localizedTrainingCopy(
                      module.localized.title,
                      language,
                    )}
                  />
                </h2>
                <p>
                  <TrainingCopy
                    copy={localizedTrainingCopy(
                      module.localized.description,
                      language,
                    )}
                  />
                </p>
                <div className="training-policy">
                  <TrainingCopy
                    copy={trainingRoundCount(language, module.rounds)}
                  />
                  <TrainingCopy
                    copy={trainingXpMaximum(language, module.reward.xpMax)}
                  />
                  <TrainingCopy
                    copy={trainingCreditPerRun(
                      language,
                      module.reward.creditsPerRun,
                    )}
                  />
                </div>
                {!state.unlocked && (
                  <p className="training-lock-note">
                    <TrainingCopy
                      copy={trainingMissionRequirement(
                        language,
                        Math.max(...module.requiredCompletedMissions),
                      )}
                    />
                  </p>
                )}
                {rewardComplete && (
                  <p className="training-complete-note">
                    <TrainingCopy
                      copy={trainingCopy("rewardComplete", language)}
                    />
                  </p>
                )}
              </div>
              <div className="training-module-data">
                <div className="training-credit-readout">
                  <TrainingCopy
                    copy={trainingCopy("moduleCredits", language)}
                  />
                  <strong>
                    {state.creditsEarned} / {state.creditCap}
                  </strong>
                </div>
                <ProgressMeter
                  label={`${module.title} Credit progress`}
                  value={state.creditsEarned}
                  max={state.creditCap}
                />
                <dl>
                  <div>
                    <dt>
                      <TrainingCopy copy={trainingCopy("runs", language)} />
                    </dt>
                    <dd>
                      <TrainingCopy
                        copy={trainingRunCount(language, state.completedRuns)}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <TrainingCopy
                        copy={trainingCopy("bestScore", language)}
                      />
                    </dt>
                    <dd>{state.bestScore?.toLocaleString() ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>
                      <TrainingCopy copy={trainingCopy("accuracy", language)} />
                    </dt>
                    <dd>
                      {state.bestAccuracy === null
                        ? "—"
                        : `${state.bestAccuracy}%`}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <TrainingCopy copy={trainingCopy("bestTime", language)} />
                    </dt>
                    <dd>{formatTime(state.bestTimeSeconds)}</dd>
                  </div>
                  <div>
                    <dt>
                      <TrainingCopy copy={trainingCopy("rank", language)} />
                    </dt>
                    <dd>{state.highestRank ?? "—"}</dd>
                  </div>
                </dl>
                {state.unlocked && (
                  <button
                    aria-label={
                      rewardComplete
                        ? `Replay ${module.title}`
                        : `Begin ${module.title}`
                    }
                    className="primary-button"
                    onClick={() => onStart(module.id)}
                  >
                    <TrainingCopy
                      copy={trainingBeginModule(
                        language,
                        module.title,
                        module.localized.title[language],
                        rewardComplete,
                      )}
                    />
                    <span>→</span>
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
