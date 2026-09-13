import { useRef, useState } from "react";
import { api, type SessionUser } from "../../api/client";
import {
  ECONOMY,
  rankFor,
  type PlayerProgression,
  type ShopItem,
} from "../../domain/progression";
import { playEffect } from "../../effects/gameEffects";
import { Copy } from "./Copy";
import { shopDescription } from "../../i18n/shop";
import { AmbientLayer } from "../gamefeel/AmbientLayer";
import { ProgressMeter } from "../gamefeel/ProgressMeter";
import { PurchaseReveal } from "../gamefeel/PurchaseReveal";

type Props = {
  user: SessionUser;
  progression: PlayerProgression;
  onUpdate: (state: PlayerProgression) => void;
  onBack: () => void;
};
export type ShopDepartment = "heroes" | "pointers" | "themes" | "assistants";

const SPECIES_CONFIG: Record<
  string,
  { name: string; icon: string; role: { en: string; it: string; ja: string } }
> = {
  wolf: {
    name: "Cyber Wolf (Echo)",
    icon: "🐺",
    role: {
      en: "Reconnaissance and Quantum Communications",
      it: "Ricognizione e comunicazioni quantistiche",
      ja: "偵察および量子通信スペシャリスト",
    },
  },
  panda: {
    name: "Cyber Panda",
    icon: "🐼",
    role: {
      en: "Heavy Defense and Firewall Fortress",
      it: "Difesa pesante e fortezza firewall",
      ja: "重防衛およびファイアウォール要塞",
    },
  },
  tiger: {
    name: "Neon Tiger",
    icon: "🐯",
    role: {
      en: "High-Agility Strike and Counter-Intrusion",
      it: "Assalto rapido e contro-intrusione",
      ja: "高機動強襲およびカウンター侵入",
    },
  },
  bird: {
    name: "Mecha Bird",
    icon: "🦅",
    role: {
      en: "Aerial Surveillance and Satellite Link",
      it: "Sorveglianza aerea e collegamento satellitare",
      ja: "航空監視および衛星リンク",
    },
  },
  rabbit: {
    name: "Quantum Rabbit",
    icon: "🐰",
    role: {
      en: "Ultra-Fast Evasion and Logic Speedrun",
      it: "Evasione ultra rapida e velocità logica",
      ja: "超高速回避および論理スピードラン",
    },
  },
};


export function HackerShop({
  user,
  progression: state,
  onUpdate,
  onBack,
}: Props) {
  const isGodMode = Boolean(user.canTestShop);
  const [department, setDepartment] = useState<ShopDepartment>("heroes");
  const [selectedSpecies, setSelectedSpecies] = useState<string>("wolf");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"purchaseSuccess" | "equipmentSaved">();
  const [purchaseReveal, setPurchaseReveal] = useState<{
    item: ShopItem;
    processing: boolean;
  }>();

  // In-shop trial loadout (active in Cyber Shop only)
  const [trialItems, setTrialItems] = useState<{
    cursor?: string;
    terminalTheme?: string;
    companion?: string;
  }>({});

  // Active items in the shop
  const activeCursor = trialItems.cursor ?? state.equippedItems.cursor;
  const activeTheme = trialItems.terminalTheme ?? state.equippedItems.terminalTheme;
  const activeCompanion = trialItems.companion ?? state.equippedItems.companion;

  // Pointer test pad click ripples
  const [pointerClicks, setPointerClicks] = useState<
    { id: number; x: number; y: number; double: boolean }[]
  >([]);
  const clickCounter = useRef(0);

  const language = user.supportLanguage;
  const rank = rankFor(state.completedMissions);
  async function change(
    action: string,
    itemId: string,
    category: string,
    item?: ShopItem,
  ) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setNotice(undefined);
    if (action === "student.purchase" && item)
      setPurchaseReveal({ item, processing: true });
    try {
      const result = await api<{ progression: PlayerProgression }>(
        action,
        { itemId, category },
        user.csrfToken,
      );
      onUpdate(result.progression);
      setNotice(
        action === "student.purchase" ? "purchaseSuccess" : "equipmentSaved",
      );
      playEffect(
        action === "student.purchase" ? "purchase" : "unlock",
        state.settings.muted,
      );
      if (action === "student.purchase" && item) {
        const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        if (!reduced) await new Promise((resolve) => window.setTimeout(resolve, 650));
        setPurchaseReveal({ item, processing: false });
      } else if (action === "student.equip" && purchaseReveal) {
        setPurchaseReveal(undefined);
      }
    } catch (error) {
      if (action === "student.purchase") setPurchaseReveal(undefined);
      setError(error instanceof Error ? error.message : "Please try again.");
      playEffect("error", state.settings.muted);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function handleTestPadClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++clickCounter.current;
    const double = e.detail > 1;
    setPointerClicks((prev) => [...prev.slice(-4), { id, x, y, double }]);
    playEffect("click", state.settings.muted);
  }

  // Filter items by department
  const filteredItems = ECONOMY.items.filter((item) => {
    if (department === "heroes") {
      if (item.category !== "hero") return false;
      const sp = item.asset && "species" in item.asset ? item.asset.species : "";
      return sp === selectedSpecies;
    }
    if (department === "pointers") return item.category === "cursor";
    if (department === "themes") return item.category === "terminalTheme";
    if (department === "assistants") return item.category === "companion";
    return true;
  });

  return (
    <main className={`page shop-page cyber-shop-page ${activeCursor ?? ""} ${activeTheme ?? ""}`}>
      <AmbientLayer variant="scan" />

      {/* IN-SHOP COMPANION TRIAL PREVIEWS */}
      {activeCompanion === "mini-drone" && (
        <div className="drone-companion in-shop" role="img" aria-label="Mini Drone companion">
          <i /><span>◉</span><i />
          {trialItems.companion === "mini-drone" && <small className="companion-trial-tag">TRIAL ACTIVE</small>}
        </div>
      )}
      {activeCompanion === "cyber-pup" && (
        <div className="cyber-pup-companion in-shop" role="img" aria-label="Cyber Pup companion">
          <div className="pup-avatar">🐕</div>
          <div className="pup-label">
            <strong>CYBER PUP</strong>
            <small>{trialItems.companion === "cyber-pup" ? "TRIAL ACTIVE" : "EQUIPPED"}</small>
          </div>
        </div>
      )}

      {purchaseReveal && (
        <PurchaseReveal
          item={purchaseReveal.item}
          processing={purchaseReveal.processing}
          language={language}
          onEquip={() =>
            void change(
              "student.equip",
              purchaseReveal.item.itemId,
              purchaseReveal.item.category,
            )
          }
          onReturn={() => setPurchaseReveal(undefined)}
        />
      )}
      <button className="back-link" onClick={onBack}>
        <Copy id="back" language={language} />
      </button>

      {/* ACTIVE SHOP TRIAL BANNER */}
      {Object.values(trialItems).some(Boolean) && (
        <aside className="shop-trial-banner" role="status">
          <div className="trial-badge">⚡ TRIAL MODE ACTIVE</div>
          <p>
            Testing in shop:{" "}
            <strong>
              {Object.entries(trialItems)
                .filter(([, id]) => Boolean(id))
                .map(([, id]) => ECONOMY.items.find((i) => i.itemId === id)?.name ?? id)
                .join(" · ")}
            </strong>
            . These trials only work inside the Cyber Shop and are not equipped outside.
          </p>
          <button className="clear-trials-btn" onClick={() => setTrialItems({})}>
            CLEAR ALL TRIALS
          </button>
        </aside>
      )}

      <header className="shop-heading">
        <div>
          <p className="eyebrow">ACADEMY REQUISITION // LOADOUT MATRIX</p>
          <h1>
            <Copy id="shop" language={language} />
          </h1>
        </div>
        <div className="wallet">
          <div className="wallet-credits">
            <strong>{isGodMode ? "99,999" : state.currentCredits.toLocaleString()}</strong>
            <Copy id="balance" language={language} />
          </div>
          {isGodMode && <span className="god-mode-pill">⚡ GOD MODE</span>}
        </div>
      </header>

      {!state.storyFlags.shopUnlocked && !isGodMode ? (
        <section className="shop-locked">
          <span aria-hidden="true">◇</span>
          <h2>
            <Copy id="locked" language={language} />
          </h2>
          <p>
            <Copy id="lockedHelp" language={language} />
          </p>
        </section>
      ) : (
        <>
          <p className="economy-help">
            <Copy id="economyHelp" language={language} />
          </p>

          <div className="shop-feedback" aria-live="polite">
            {notice && (
              <p className="purchase-confirmation">
                <Copy id={notice} language={language} />
              </p>
            )}
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
          </div>

          {/* DEPARTMENT NAVIGATION TABS */}
          <nav className="cyber-shop-departments" aria-label="Cyber Shop Departments">
            <button
              className={`department-tab ${department === "heroes" ? "active" : ""}`}
              onClick={() => {
                setDepartment("heroes");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon">🐺</span>
              <div className="tab-text">
                <strong>01. HEROES</strong>
                <small>{language === "it" ? "Operativi e armature" : language === "ja" ? "ヒーローと装甲" : "Operatives and Armor"}</small>
              </div>
            </button>
            <button
              className={`department-tab ${department === "pointers" ? "active" : ""}`}
              onClick={() => {
                setDepartment("pointers");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon">↗</span>
              <div className="tab-text">
                <strong>02. POINTERS</strong>
                <small>{language === "it" ? "Puntatori di precisione" : language === "ja" ? "精密ポインター" : "Precision Pointers"}</small>
              </div>
            </button>
            <button
              className={`department-tab ${department === "themes" ? "active" : ""}`}
              onClick={() => {
                setDepartment("themes");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon">◈</span>
              <div className="tab-text">
                <strong>03. THEMES</strong>
                <small>{language === "it" ? "Ambiente cockpit" : language === "ja" ? "コックピット環境" : "Cockpit Themes"}</small>
              </div>
            </button>
            <button
              className={`department-tab ${department === "assistants" ? "active" : ""}`}
              onClick={() => {
                setDepartment("assistants");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon">⌁</span>
              <div className="tab-text">
                <strong>04. ASSISTANTS</strong>
                <small>{language === "it" ? "Compagni autonomi" : language === "ja" ? "自律型アシスタント" : "Cyber Companions"}</small>
              </div>
            </button>
          </nav>

          {/* HEROES DEPARTMENT: SPECIES SUB-SELECTOR */}
          {department === "heroes" && (
            <div className="species-selector-bar" aria-label="Select Operative Species">
              <span className="species-label">OPERATIVE ROSTER:</span>
              {Object.entries(SPECIES_CONFIG).map(([spKey, spInfo]) => (
                <button
                  key={spKey}
                  className={`species-button ${selectedSpecies === spKey ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedSpecies(spKey);
                    playEffect("click", state.settings.muted);
                  }}
                >
                  <span>{spInfo.icon}</span>
                  <b>{spInfo.name}</b>
                </button>
              ))}
            </div>
          )}

          {department === "heroes" && SPECIES_CONFIG[selectedSpecies] && (
            <div className="species-intel-banner">
              <div className="intel-pill">
                <span>SPECIES CALLSIGN:</span>
                <strong>{selectedSpecies.toUpperCase()}</strong>
              </div>
              <p>{SPECIES_CONFIG[selectedSpecies].role[language] ?? SPECIES_CONFIG[selectedSpecies].role.en}</p>
            </div>
          )}

          {/* POINTERS DEPARTMENT: INTERACTIVE CALIBRATION PAD */}
          {department === "pointers" && (
            <div
              className="pointer-test-pad"
              onClick={handleTestPadClick}
              role="region"
              aria-label="Pointer Precision Calibration Pad"
            >
              <div className="test-pad-crosshair tl" />
              <div className="test-pad-crosshair tr" />
              <div className="test-pad-crosshair bl" />
              <div className="test-pad-crosshair br" />
              <div className="test-pad-content">
                <strong>POINTER CALIBRATION PAD // TEST AREA</strong>
                <p>Move mouse inside to test reticle feeling. Click or double-click to calibrate pulse sensor.</p>
                <small>◉ SENSOR READY · SINGLE-CLICK FOR SONAR · DOUBLE-CLICK FOR SHOCKWAVE</small>
                <div className="test-pad-active-reticle">
                  ACTIVE RETICLE: <strong>{activeCursor ? (ECONOMY.items.find((i) => i.itemId === activeCursor)?.name ?? activeCursor) : "SYSTEM DEFAULT"}</strong>
                  {trialItems.cursor && <span className="reticle-trial-indicator"> [TRIAL ACTIVE]</span>}
                </div>
              </div>
              {pointerClicks.map((click) => (
                <span
                  key={click.id}
                  className={`pointer-ripple ${click.double ? "double-pulse" : ""}`}
                  style={{ left: `${click.x}px`, top: `${click.y}px` }}
                />
              ))}
            </div>
          )}

          {/* INVENTORY STRIP */}
          <section className="inventory-strip">
            <h2>
              <Copy id="inventory" language={language} />
            </h2>
            {state.inventory.length === 0 ? (
              <p>
                <Copy id="empty" language={language} />
              </p>
            ) : (
              <div className="inventory-items">
                {state.inventory.map((id) => {
                  const item = ECONOMY.items.find((item) => item.itemId === id);
                  if (!item) return <span key={id}>{id}</span>;
                  const equipped = state.equippedItems[item.category] === id;
                  return (
                    <div key={id} className="inventory-card">
                      <strong>
                        {item.icon} {item.name}
                      </strong>
                      <button
                        className="quiet-button"
                        disabled={busy}
                        aria-label={`${equipped ? "Use default for" : "Equip"} ${item.name}`}
                        onClick={() =>
                          void change(
                            "student.equip",
                            equipped ? "" : id,
                            item.category,
                          )
                        }
                      >
                        <Copy
                          id={equipped ? "unequip" : "equip"}
                          language={language}
                        />
                      </button>
                      {equipped && (
                        <small>
                          <Copy id="equipped" language={language} />
                        </small>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* DEPARTMENT CATALOG GRID */}
          <section className="shop-catalog" aria-label="Shop items">
            {filteredItems.map((item) => {
              const owned = state.inventory.includes(item.itemId);
              const isHero = item.category === "hero";
              const isAspirational =
                item.rarity === "elite" || item.rarity === "legendary";
              const heroImg =
                item.asset && "image" in item.asset
                  ? `${import.meta.env.BASE_URL}${item.asset.image}`
                  : null;
              const lore =
                item.asset && "lore" in item.asset ? item.asset.lore : null;
              const canTry = ["cursor", "terminalTheme", "companion"].includes(item.category);
              const isTrialActive = trialItems[item.category as keyof typeof trialItems] === item.itemId;

              const isFuture = (item.availability ?? "available") === "future";
              const futureLocked = !isGodMode && isFuture;
              const rankLocked =
                !isGodMode &&
                ECONOMY.ranks.findIndex((r) => r.id === rank.id) <
                  ECONOMY.ranks.findIndex((r) => r.id === item.requiredRank);
              const affordable =
                isGodMode ||
                (state.currentCredits >= item.price &&
                  state.lifetimeCreditsSpent + item.price <= rank.spendingCap);

              return (
                <article
                  className={`shop-item rarity-${item.rarity} ${owned ? "owned" : ""} ${state.equippedItems[item.category] === item.itemId ? "equipped" : ""} ${rankLocked ? "rank-locked" : ""} ${isHero ? "hero-card" : ""}`}
                  key={item.itemId}
                  onPointerEnter={() =>
                    playEffect("hover", state.settings.muted)
                  }
                >
                  {/* Hero Image or Icon Preview */}
                  <div
                    className={`item-preview ${item.asset.className ?? ""} ${heroImg ? "has-image hero-zoom-container" : ""}`}
                    aria-hidden="true"
                  >
                    {heroImg ? (
                      <>
                        <img
                          src={heroImg}
                          alt={item.name}
                          className="hero-render-img"
                        />
                        <span className="zoom-hint-badge">🔍 PREVIEW</span>

                        {/* On-top tactical enlarged preview */}
                        <div className="hero-zoom-overlay" aria-hidden="true">
                          <div className="zoom-viewframe">
                            <img
                              src={heroImg}
                              alt=""
                              className="zoom-full-img"
                            />
                            <div className="zoom-crosshair tl" />
                            <div className="zoom-crosshair tr" />
                            <div className="zoom-crosshair bl" />
                            <div className="zoom-crosshair br" />
                            <div className="zoom-scan-sweep" />
                          </div>
                          <div className="zoom-overlay-meta">
                            <div className="zoom-overlay-header">
                              <strong className="zoom-overlay-name">{item.name}</strong>
                              <b className={`zoom-tier ${item.rarity}`}>{item.rarity.toUpperCase()}</b>
                            </div>
                            {lore && <p className="zoom-overlay-lore">{lore}</p>}
                          </div>
                        </div>
                      </>
                    ) : (
                      <span>{item.icon}</span>
                    )}
                    {item.itemId === "mini-drone" && <i />}
                    {isAspirational && (
                      <div className="tier-watermark">
                        <span>{item.rarity.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  <div className="shop-item-details">
                    <div className="tier-header-strip">
                      <p className="eyebrow">
                        {item.category.replace(/([A-Z])/g, " $1").toUpperCase()} · {item.rarity.toUpperCase()}
                      </p>
                      {isAspirational && (
                        <span className="aspirational-tag">
                          ASPIRATIONAL PREVIEW
                        </span>
                      )}
                    </div>

                    <h2>{item.name}</h2>

                    {lore && (
                      <p className="hero-lore-text">
                        <strong>CULTURAL ARMOR:</strong> {lore}
                      </p>
                    )}

                    <p>
                      {item.description}
                      <small
                        className="item-description-support"
                        lang={language}
                      >
                        {shopDescription(item.itemId, language)}
                      </small>
                    </p>

                    <strong className="item-price">
                      {item.price} <Copy id="balance" language={language} />
                    </strong>

                    {!owned && (
                      <div className="item-affordability">
                        <ProgressMeter
                          label={`${item.name} affordability`}
                          value={Math.min(state.currentCredits, item.price)}
                          max={item.price}
                        />
                        {state.currentCredits < item.price ? (
                          <strong>
                            {item.price - state.currentCredits} CREDITS REMAINING
                          </strong>
                        ) : (
                          <strong>READY TO ACQUIRE</strong>
                        )}
                      </div>
                    )}

                    {futureLocked && (
                      <p className="item-lock-reason">
                        ◇ Reserved for future campaign operations
                        <small lang={language}>
                          {language === "it"
                            ? "Riservato per future operazioni di campagna"
                            : "今後のキャンペーン作戦用に予約されています"}
                        </small>
                      </p>
                    )}

                    {rankLocked && (
                      <p className="item-lock-reason">
                        ◇ Requires{" "}
                        {item.requiredRank.charAt(0).toUpperCase() +
                          item.requiredRank.slice(1)}{" "}
                        rank
                        <small lang={language}>
                          {language === "it"
                            ? `Richiede il grado ${item.requiredRank}`
                            : `${item.requiredRank}ランクが必要です`}
                        </small>
                      </p>
                    )}

                    <div className="shop-card-actions">
                      {canTry && (
                        <button
                          type="button"
                          className={`trial-button ${isTrialActive ? "active" : ""}`}
                          aria-label={
                            isTrialActive
                              ? `Stop testing ${item.name}`
                              : `Try ${item.name} in shop`
                          }
                          onClick={() => {
                            playEffect("click", state.settings.muted);
                            setTrialItems((prev) => ({
                              ...prev,
                              [item.category]: isTrialActive ? undefined : item.itemId,
                            }));
                          }}
                        >
                          {isTrialActive ? "⚡ TESTING (ON)" : "⚡ TRY IN SHOP"}
                        </button>
                      )}
                      <button
                        className="quiet-button"
                        disabled={busy || owned || rankLocked || futureLocked || !affordable}
                        aria-label={
                          futureLocked
                            ? `Future campaign unlock for ${item.name}`
                            : rankLocked
                              ? `${item.requiredRank.charAt(0).toUpperCase() + item.requiredRank.slice(1)} required`
                              : `${owned ? "Owned" : "Buy"} ${item.name}`
                        }
                        onClick={() =>
                          void change(
                            "student.purchase",
                            item.itemId,
                            item.category,
                            item,
                          )
                        }
                      >
                        <Copy
                          id={
                            owned
                              ? "owned"
                              : futureLocked
                                ? "locked"
                                : rankLocked
                                  ? "rankRequired"
                                  : !affordable
                                    ? "insufficient"
                                    : busy
                                      ? "saving"
                                      : "buy"
                          }
                          language={language}
                        />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
