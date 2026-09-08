import { useEffect, useState } from "react";
import type { SessionUser } from "../../api/client";
import type {
  PlayerProgression,
  RewardReceipt,
} from "../../domain/progression";
import { playEffect } from "../../effects/gameEffects";
import { Copy } from "./Copy";
import { Confetti } from "../../effects/Confetti";
import { RewardCounter } from "../gamefeel/RewardCounter";
import { OperatorMessage } from "../gamefeel/OperatorMessage";

export function RewardSequence({
  user,
  reward,
  progression,
  missionNumber,
  onContinue,
}: {
  user: SessionUser;
  reward: RewardReceipt;
  progression: PlayerProgression;
  missionNumber: number;
  onContinue: () => void;
}) {
  const reduced =
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const [ready, setReady] = useState(reduced);
  const [stage, setStage] = useState(reduced ? "reveal" : "validating");
  const language = user.supportLanguage;
  useEffect(() => {
    if (reduced) {
      playEffect("missionComplete", progression.settings.muted);
      return;
    }
    playEffect("validation", progression.settings.muted);
    const success = window.setTimeout(() => {
      setStage("success");
      playEffect("missionComplete", progression.settings.muted);
    }, 700);
    const reveal = window.setTimeout(() => setStage("reveal"), 2200);
    const timer = window.setTimeout(() => setReady(true), 3000);
    return () => {
      window.clearTimeout(success);
      window.clearTimeout(reveal);
      window.clearTimeout(timer);
    };
  }, []);
  const completed = progression.completedMissions.filter(
    (number) => number <= 3,
  ).length;
  return (
    <section
      className={`reward-sequence reward-stage-${stage}`}
      role="dialog"
      aria-modal="true"
      aria-label="Mission rewards"
    >
      <Confetti />
      <div className="reward-content">
        <p className="eyebrow">
          MISSION {String(missionNumber).padStart(2, "0")}
        </p>
        <div className="reward-validation" role="status">
          <Copy
            id={
              stage === "validating"
                ? "validating"
                : stage === "success"
                  ? "accessGranted"
                  : "rewardsConfirmed"
            }
            language={language}
          />
          <span aria-hidden="true" />
        </div>
        <h1>
          <Copy id="accessGranted" language={language} />
        </h1>
        <p>
          <Copy id="missionComplete" language={language} />
        </p>
        <div className="reward-amounts">
          <div>
            <strong>
              <RewardCounter
                value={reward.xp}
                prefix="+"
                delay={reduced ? 0 : 850}
                duration={650}
              />
            </strong>
            <span>XP</span>
            <small>{reward.totalXP.toLocaleString()} TOTAL XP</small>
          </div>
          <div>
            <strong>
              <RewardCounter
                value={reward.credits}
                prefix="+"
                delay={reduced ? 0 : 1650}
                duration={650}
              />
            </strong>
            <Copy id="balance" language={language} />
            <small>{reward.currentCredits} CREDITS</small>
          </div>
        </div>
        {reward.creditLimitReached && (
          <p className="reward-limit">
            <Copy id="replayCap" language={language} />
          </p>
        )}
        {missionNumber === 4 ? (
          <div className="mission-four-story-beat">
            <strong>COMMUNICATION NODE SECURED</strong>
            <Copy id="sourceIdentified" language={language} />
            <Copy id="unknownNetworkActivity" language={language} />
          </div>
        ) : (
          <div className="rookie-reward-progress">
            <strong>
              <Copy
                id={completed === 3 ? "trainingComplete" : "training"}
                language={language}
              />
            </strong>
            <div
              className="training-segments"
              aria-label={`${completed} of 3 training missions complete`}
            >
              {[1, 2, 3].map((number) => (
                <span
                  key={number}
                  className={
                    progression.completedMissions.includes(number)
                      ? "complete"
                      : ""
                  }
                >
                  {String(number).padStart(2, "0")}
                </span>
              ))}
            </div>
            {completed > 0 && completed < 3 && (
              <p className="eyebrow">
                <Copy
                  id={completed === 2 ? "oneRemains" : "twoRemain"}
                  language={language}
                />
              </p>
            )}
            <small>
              {completed} / 3{" "}
              {completed === 3 ? "COMPLETE" : "MISSIONS COMPLETE"}
            </small>
          </div>
        )}
        <OperatorMessage
          tone="success"
          message={
            <Copy
              id={missionNumber === 4 ? "nodeSecured" : "signalConfirmed"}
              language={language}
            />
          }
        />
        <button
          autoFocus
          disabled={!ready}
          className="primary-button"
          onClick={onContinue}
        >
          <Copy id="claimRewards" language={language} />
          <span>→</span>
        </button>
      </div>
    </section>
  );
}
