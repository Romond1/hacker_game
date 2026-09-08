import { useEffect, useRef, useState } from "react";
import { api, type SessionUser } from "../../api/client";
import { ECONOMY, type PlayerProgression } from "../../domain/progression";
import { playEffect } from "../../effects/gameEffects";
import { Copy } from "./Copy";
import { StoryBeatSequence } from "../gamefeel/StoryBeatSequence";
import { progressionCopy } from "../../i18n/progression";

export function IdentityProtocol({
  user,
  progression,
  onUpdate,
}: {
  user: SessionUser;
  progression: PlayerProgression;
  onUpdate: (state: PlayerProgression) => void;
}) {
  const [active, setActive] = useState(false);
  const [codename, setCodename] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const language = user.supportLanguage;
  const warning = progressionCopy("warning", language);
  const protocol = progressionCopy("protocol", language);
  useEffect(() => {
    playEffect("warning", progression.settings.muted);
  }, []);
  async function save() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ progression: PlayerProgression }>(
        "student.identity",
        { codename },
        user.csrfToken,
      );
      playEffect("unlock", progression.settings.muted);
      onUpdate(result.progression);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <main className={`protocol-screen ${active ? "" : "breach-screen"}`}>
      <div className="protocol-content">
        {!active && (
          <StoryBeatSequence
            compact
            ariaLabel="Identity protocol alert"
            supportLanguage={language}
            muted={progression.settings.muted}
            steps={[
              {
                text: warning.en,
                supportText: warning.support,
                tone: "warning",
                duration: 550,
              },
              {
                text: protocol.en,
                supportText: protocol.support,
                duration: 550,
              },
            ]}
            onComplete={() => undefined}
          />
        )}
        <p className="eyebrow">
          <Copy id="trainingComplete" language={language} />
        </p>
        {!active ? (
          <>
            <div className="breach-symbol" aria-hidden="true">
              !
            </div>
            <h1>
              <Copy id="warning" language={language} />
            </h1>
            <p>
              <Copy id="protocol" language={language} />
            </p>
            <button
              autoFocus
              className="primary-button"
              onClick={() => {
                setActive(true);
                playEffect("accessGranted", progression.settings.muted);
              }}
            >
              <Copy id="activate" language={language} />
              <span>→</span>
            </button>
          </>
        ) : (
          <>
            <p className="eyebrow">
              <Copy id="protocol" language={language} />
            </p>
            <h1>
              <Copy id="codename" language={language} />
            </h1>
            <p>
              <Copy id="identityHelp" language={language} />
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <label htmlFor="codename">
                <Copy id="codename" language={language} />
              </label>
              <input
                id="codename"
                autoFocus
                autoComplete="off"
                autoCapitalize="characters"
                value={codename}
                minLength={3}
                maxLength={16}
                pattern="[A-Za-z][A-Za-z0-9_\-]{2,15}"
                aria-describedby="codename-rules"
                onChange={(event) =>
                  setCodename(event.target.value.toUpperCase())
                }
                required
              />
              <p id="codename-rules" className="name-rules">
                <Copy id="nameRules" language={language} />
              </p>
              <div className="codename-suggestions">
                {ECONOMY.suggestedCodenames.map((name) => (
                  <button
                    className="quiet-button"
                    type="button"
                    key={name}
                    onClick={() => setCodename(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <button
                className="primary-button"
                disabled={busy || codename.length < 3}
              >
                <Copy id={busy ? "saving" : "saveName"} language={language} />
                <span>→</span>
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}

export function Transmission({
  user,
  progression,
  onUpdate,
}: {
  user: SessionUser;
  progression: PlayerProgression;
  onUpdate: (state: PlayerProgression) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const language = user.supportLanguage;
  const signal = progressionCopy("signal", language);
  const incoming = progressionCopy("incoming", language);
  const breach = progressionCopy("breach", language);
  useEffect(() => {
    playEffect("transmission", progression.settings.muted);
  }, []);
  async function acknowledge() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await api<{ progression: PlayerProgression }>(
        "student.story",
        { flag: "mission4TransmissionSeen" },
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
    <main className="protocol-screen transmission-screen">
      <div className="protocol-content">
        {!sequenceComplete && (
          <StoryBeatSequence
            ariaLabel="Incoming transmission"
            supportLanguage={language}
            muted={progression.settings.muted}
            skippable
            skipSupportText={
              language === "it" ? "Salta sequenza" : "シーケンスをスキップ"
            }
            steps={[
              {
                text: signal.en,
                supportText: signal.support,
                tone: "warning",
                sound: "alarm",
                duration: 550,
              },
              {
                text: incoming.en,
                supportText: incoming.support,
                sound: "transmission",
                duration: 550,
              },
              {
                text: breach.en,
                supportText: breach.support,
                tone: "warning",
                duration: 550,
              },
            ]}
            onComplete={() => setSequenceComplete(true)}
          />
        )}
        {sequenceComplete && (
          <>
            <p className="eyebrow">
              <Copy id="signal" language={language} />
            </p>
            <h1>
              MISSION 04
              <br />
              <span className="classified">
                <Copy id="classified" language={language} />
              </span>
            </h1>
            <p>
              <Copy id="breach" language={language} />
            </p>
            <p>
              <Copy id="teaserHelp" language={language} />
            </p>
            <div className="incoming-signal">
              <span />
              <Copy id="incoming" language={language} />
            </div>
            {error && <p role="alert">{error}</p>}
            <button
              autoFocus
              className="primary-button"
              disabled={busy}
              onClick={() => void acknowledge()}
            >
              <Copy id={busy ? "saving" : "enterNetwork"} language={language} />
              <span>→</span>
            </button>
          </>
        )}
      </div>
    </main>
  );
}
