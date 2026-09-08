import { useEffect, useState } from "react";
import type { TrainingCompletion } from "../../domain/training";
import { ECONOMY } from "../../domain/progression";
import { Confetti } from "../../effects/Confetti";
import { playEffect } from "../../effects/gameEffects";
import type { SupportLanguage } from "../../domain/mission";
import { trainingCopy, trainingModuleState } from "../../i18n/training";
import { TrainingCopy } from "./TrainingCopy";
import { getTrainingModule } from "../../training/catalog";
import { RewardCounter } from "../gamefeel/RewardCounter";
import { OperatorMessage } from "../gamefeel/OperatorMessage";

function formatTime(seconds: number | null): string {
  if (seconds === null) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function TrainingResults({
  language,
  completion,
  onReplay,
  onReturn,
  onHome,
}: {
  language: SupportLanguage;
  completion: TrainingCompletion;
  onReplay: () => void;
  onReturn: () => void;
  onHome?: () => void;
}) {
  const reduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const [fraction, setFraction] = useState(reduced ? 1 : 0);
  const [ready, setReady] = useState(reduced);
  const [analyzing, setAnalyzing] = useState(!reduced);
  const { result, reward, progress } = completion;

  useEffect(() => {
    if (reduced) {
      playEffect(
        completion.achievements.length ? "achievement" : "missionComplete",
        completion.progression.settings.muted,
      );
      return;
    }
    playEffect("validation", completion.progression.settings.muted);
    const started = Date.now();
    const interval = window.setInterval(
      () => setFraction(Math.min(1, (Date.now() - started) / 1300)),
      35,
    );
    const timer = window.setTimeout(() => {
      setFraction(1);
      setReady(true);
      window.clearInterval(interval);
    }, 3000);
    const reveal = window.setTimeout(() => {
      setAnalyzing(false);
      playEffect(
        completion.achievements.length ? "achievement" : "missionComplete",
        completion.progression.settings.muted,
      );
    }, 700);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
      window.clearTimeout(reveal);
    };
  }, []);

  const shownScore = Math.round(result.score * fraction);
  const complete = progress.creditsEarned >= progress.creditCap;
  const achievementNames = completion.achievements.map(
    (id) =>
      ECONOMY.trainingAchievements.find((item) => item.id === id)?.name ??
      id.toUpperCase(),
  );
  const module = getTrainingModule(progress.trainingId);

  return (
    <main className="page training-results">
      <Confetti />
      {analyzing && <div className="training-analysis active" role="status"><TrainingCopy copy={trainingCopy("analyzingPerformance", language)} /><span aria-hidden="true" /></div>}
      <section className="training-results-hero">
        <p className="eyebrow">
          <TrainingCopy
            copy={
              module
                ? trainingModuleState(
                    language,
                    module.title,
                    module.localized.title[language],
                    "Verified",
                  )
                : trainingCopy("systemsVerified", language)
            }
          />
        </p>
        <h1 aria-label="Training complete">
          <TrainingCopy copy={trainingCopy("trainingComplete", language)} />
        </h1>
        <p>
          <TrainingCopy
            copy={trainingCopy(
              completion.isPersonalBest ? "newPersonalBest" : "bestsRemain",
              language,
            )}
          />
        </p>
        <div
          className="training-rank"
          aria-label={`Training rank ${result.rank}`}
        >
          <TrainingCopy copy={trainingCopy("rank", language)} />
          <strong>{result.rank}</strong>
        </div>
      </section>
      <section className="training-result-report">
        <div className="training-result-score">
          <TrainingCopy copy={trainingCopy("finalScore", language)} />
          <strong>{shownScore.toLocaleString()}</strong>
          <TrainingCopy copy={trainingCopy("canonicalResult", language)} />
        </div>
        <div className="training-result-rewards">
          <strong>
            <RewardCounter
              value={reward.xp}
              prefix="+"
              suffix=" XP"
              delay={reduced ? 0 : 850}
              duration={650}
            />
          </strong>
          <strong>
            <RewardCounter
              value={reward.credits}
              prefix="+"
              suffix={reward.credits === 1 ? " Credit" : " Credits"}
              delay={reduced ? 0 : 1650}
              duration={650}
            />
          </strong>
        </div>
        <div className="training-result-metrics">
          <div>
            <TrainingCopy copy={trainingCopy("accuracy", language)} />
            <strong>{result.accuracy}%</strong>
          </div>
          <div>
            <TrainingCopy copy={trainingCopy("streak", language)} />
            <strong>{result.longestStreak}</strong>
          </div>
          <div>
            <TrainingCopy copy={trainingCopy("bestTime", language)} />
            <strong>{formatTime(progress.bestTimeSeconds)}</strong>
          </div>
          <div>
            <TrainingCopy copy={trainingCopy("bestRank", language)} />
            <strong>{progress.highestRank ?? "—"}</strong>
          </div>
        </div>
        <div className="training-result-cap">
          <div>
            <TrainingCopy copy={trainingCopy("moduleCredits", language)} />
            <strong>
              {progress.creditsEarned} / {progress.creditCap}
            </strong>
          </div>
          <meter
            min={0}
            max={progress.creditCap}
            value={progress.creditsEarned}
          />
          {complete && (
            <p>
              <TrainingCopy
                copy={trainingCopy("rewardCapComplete", language)}
              />
            </p>
          )}
        </div>
        {achievementNames.length > 0 && (
          <div
            className="training-achievements"
            aria-label="Achievements earned"
          >
            {achievementNames.map((name) => (
              <span key={name}>◇ {name}</span>
            ))}
          </div>
        )}
        <OperatorMessage
          tone="success"
          message={
            <TrainingCopy
              copy={
                completion.isPersonalBest
                  ? trainingCopy("newPersonalBest", language)
                  : trainingCopy("bestsRemain", language)
              }
            />
          }
        />
        <div className="training-actions">
          <button
            aria-label="Return to Home Base"
            className="quiet-button"
            disabled={!ready}
            onClick={onHome ?? onReturn}
          >
            <TrainingCopy copy={trainingCopy("returnHomeBase", language)} />
          </button>
          <button
            aria-label="Return to Training Center"
            className="quiet-button"
            disabled={!ready}
            onClick={onReturn}
          >
            <TrainingCopy
              copy={trainingCopy("returnTrainingCenter", language)}
            />
          </button>
          <button
            aria-label="Train again"
            className="primary-button"
            disabled={!ready}
            onClick={onReplay}
          >
            <TrainingCopy copy={trainingCopy("trainAgain", language)} />{" "}
            <span>↻</span>
          </button>
        </div>
      </section>
    </main>
  );
}
