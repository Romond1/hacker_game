import { useState } from "react";
import { api, type SessionUser } from "../../api/client";
import {
  ECONOMY,
  rankFor,
  type PlayerProgression,
} from "../../domain/progression";
import { Copy } from "./Copy";
import { ProgressMeter } from "../gamefeel/ProgressMeter";
import { MISSIONS } from "../../missions/catalog";

export function HackerProfile({
  user,
  progression: state,
  onShop,
  onUpdate,
}: {
  user: SessionUser;
  progression: PlayerProgression;
  onShop: () => void;
  onUpdate: (state: PlayerProgression) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const language = user.supportLanguage;
  const rank = rankFor(state.completedMissions);
  const badge = ECONOMY.items.find(
    (item) => item.itemId === state.equippedItems.badge,
  );
  async function sound() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ progression: PlayerProgression }>(
        "student.sound",
        { muted: !state.settings.muted },
        user.csrfToken,
      );
      onUpdate(result.progression);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="hacker-profile">
      <div className="hacker-identity">
        <p className="eyebrow">HACKER / {rank.name.toUpperCase()}</p>
        <h2>{state.hackerCodename ?? "ANONYMOUS"}</h2>
        {badge && (
          <span className="equipped-badge">
            {badge.icon} {badge.asset.label}
          </span>
        )}
      </div>
      <dl className="profile-values">
        <div>
          <dt>
            <Copy id="permanent" language={language} />
          </dt>
          <dd>{state.lifetimeXP.toLocaleString()}</dd>
        </div>
        <div>
          <dt>
            <Copy id="balance" language={language} />
          </dt>
          <dd>{state.currentCredits}</dd>
        </div>
      </dl>
      <div className="profile-progression">
        <ProgressMeter
          label="Campaign access"
          value={state.completedMissions.length}
          max={MISSIONS.length}
          detail={`${state.completedMissions.length} / ${MISSIONS.length} missions`}
        />
        <div className="equipment-slots" aria-label="Equipped loadout">
          {["hero", "badge", "cursor", "terminalTheme", "companion"].map((category) => {
            const equipped = ECONOMY.items.find(
              (item) => item.itemId === state.equippedItems[category],
            );
            return (
              <span key={category}>
                <small>{category.replace(/([A-Z])/g, " $1")}</small>
                <b>
                  {equipped ? `${equipped.icon} ${equipped.name}` : "DEFAULT"}
                </b>
              </span>
            );
          })}
        </div>
      </div>
      <div className="profile-actions">
        <button className="primary-button" onClick={onShop}>
          <Copy id="shop" language={language} />
          <span>{state.storyFlags.shopUnlocked ? "→" : "◇"}</span>
        </button>
        <button
          className="sound-toggle"
          disabled={busy}
          onClick={() => void sound()}
        >
          <Copy
            id={state.settings.muted ? "soundOff" : "soundOn"}
            language={language}
          />
        </button>
        {error && <p role="alert">{error}</p>}
      </div>
      {state.achievements.length > 0 && (
        <div className="profile-achievements" aria-label="Achievements">
          {state.achievements.map((id) => (
            <span key={id}>◇ {id.replaceAll("-", " ").toUpperCase()}</span>
          ))}
        </div>
      )}
    </section>
  );
}
