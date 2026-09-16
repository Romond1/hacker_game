import { useRef, useState } from "react";
import { AccessoryArmoury } from "./AccessoryArmoury";
import { ShopHelpers } from "./ShopHelpers";
import { HeroArmoury } from "./HeroArmoury";
import { api, type SessionUser } from "../../api/client";
import {
  ECONOMY,
  rankFor,
  type PlayerProgression,
  type ShopItem,
} from "../../domain/progression";
import { playEffect } from "../../effects/gameEffects";
import { Copy } from "./Copy";
import { shopDescription, SHOP_UI_COPY } from "../../i18n/shop";
import { AmbientLayer } from "../gamefeel/AmbientLayer";
import { ProgressMeter } from "../gamefeel/ProgressMeter";
import { PurchaseReveal } from "../gamefeel/PurchaseReveal";
import { MouseCosmetics } from "./MouseCosmetics";
import { AnimatedCursor } from "./AnimatedCursor";
import { trailIntensity, useTrailPreferences } from "./trailPreferences";

type Props = {
  user: SessionUser;
  progression: PlayerProgression;
  onUpdate: (state: PlayerProgression) => void;
  onBack: () => void;
};
export type ShopDepartment = "heroes" | "badges" | "pointers" | "themes" | "assistants";

const THEME_PREVIEW_TOKENS: Record<string, React.CSSProperties> = {
  "orbit-blue-theme": {
    "--game-bg": "#07111F",
    "--game-surface": "#0D1B2D",
    "--game-surface-raised": "#14263B",
    "--game-border": "#29465F",
    "--game-text": "#EDF6FF",
    "--game-text-muted": "#ADC1D5",
    "--game-accent": "#55D9F5",
    "--game-selection": "#173D55",
  } as React.CSSProperties,
  "matrix-terminal": {
    "--game-bg": "#020b06",
    "--game-surface": "#06190f",
    "--game-surface-raised": "#0a2617",
    "--game-border": "#1a4d2d",
    "--game-text": "#d4ffd8",
    "--game-text-muted": "#72a87a",
    "--game-accent": "#00ff66",
    "--game-selection": "#0f3d1f",
  } as React.CSSProperties,
  "solar-amber-theme": {
    "--game-bg": "#0d0802",
    "--game-surface": "#1e1305",
    "--game-surface-raised": "#2e1e08",
    "--game-border": "#4d330e",
    "--game-text": "#fff2df",
    "--game-text-muted": "#ab8e65",
    "--game-accent": "#ff9900",
    "--game-selection": "#3d260a",
  } as React.CSSProperties,
};

const IMPORTED_CURSOR_PREVIEWS: Record<string, string> = {
  "cursor-glacier": "cursor-glacier-preview.png",
  "cursor-hologram": "cursor-hologram-preview.png",
  "cursor-ani-spark": "cursor-ani-spark-frame-0.png",
  "cursor-ani-ship": "cursor-ani-ship-frame-0.png",
  "cursor-ani-sabre": "cursor-ani-sabre-frame-0.png",
};
const IMPORTED_CURSOR_HOTSPOTS: Record<string, string> = {
  "cursor-glacier": "TIP [3, 1]",
  "cursor-hologram": "TIP [2, 1]",
  "cursor-ani-spark": "TIP [0, 0]",
  "cursor-ani-ship": "TIP [0, 0]",
  "cursor-ani-sabre": "TIP [0, 0]",
};

export function HackerShop({
  user,
  progression: state,
  onUpdate,
  onBack,
}: Props) {
  const isGodMode = Boolean(user.canTestShop);
  const [department, setDepartment] = useState<ShopDepartment>("heroes");
  const { preferences: trailPreferences, save: saveTrailIntensity } = useTrailPreferences(user.id);
  const [mouseTab, setMouseTab] = useState<"pointers" | "effects" | "animation">("pointers");
  const shopRef = useRef<HTMLElement>(null);
  const [selectedPointerId, setSelectedPointerId] = useState<string>("neon-pointer");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("orbit-blue-theme");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"purchaseSuccess" | "equipmentSaved">();
  const [purchaseReveal, setPurchaseReveal] = useState<{
    item: ShopItem;
    processing: boolean;
  }>();

  // Pointer size preference
  const [cursorSize, setCursorSize] = useState<"standard" | "large">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("cyber_hero_cursor_size") as "standard" | "large") || "standard";
    }
    return "standard";
  });

  function handleSizeToggle(newSize: "standard" | "large") {
    setCursorSize(newSize);
    if (typeof window !== "undefined") {
      localStorage.setItem("cyber_hero_cursor_size", newSize);
      window.dispatchEvent(new CustomEvent("cursor-size-changed", { detail: newSize }));
    }
    playEffect("click", state.settings.muted);
  }

  // Draggable keycard sandbox state
  const [dragSecured, setDragSecured] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Bullseye precision test state
  const [targetAccuracy, setTargetAccuracy] = useState<string>("SENSOR READY · CLICK BULLSEYE");

  // In-shop trial loadout (active in Cyber Shop only)
  const [trialItems, setTrialItems] = useState<{
    cursor?: string;
    mouseEffect?: string;
    mouseAnimation?: string;
    terminalTheme?: string;
    companion?: string;
  }>({});

  // Active items in the shop
  const activeCursor = trialItems.cursor ?? state.equippedItems.cursor;
  const activeMouseEffect = trialItems.mouseEffect ?? state.equippedItems.mouseEffect;
  const activeMouseAnimation = trialItems.mouseAnimation ?? state.equippedItems.mouseAnimation;
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

  function handleBullseyeClick(e: React.MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const maxDist = rect.width / 2;
    const accuracy = Math.max(0, Math.round(100 - (dist / maxDist) * 100));
    setTargetAccuracy(`ACCURACY: ${accuracy}% · ${dist.toFixed(1)}px DEV`);
    handleTestPadClick(e);
  }

  // Filter items by department
  const filteredItems = ECONOMY.items.filter((item) => {
    if (department === "pointers") return item.category === (mouseTab === "pointers" ? "cursor" : mouseTab === "effects" ? "mouseEffect" : "mouseAnimation");
    if (department === "themes") return item.category === "terminalTheme";
    if (department === "assistants") return item.category === "companion";
    return true;
  });

  const shopThemeId = activeTheme === "orbit-blue-theme" ? "orbit-blue" : activeTheme === "matrix-terminal" ? "matrix" : activeTheme === "solar-amber-theme" ? "solar-amber" : undefined;

  return (
    <main
      ref={shopRef}
      className={`page shop-page cyber-shop-page ${activeCursor ?? ""} ${activeTheme ?? ""}`}
      data-theme={shopThemeId}
      data-cursor={activeCursor || undefined}
      data-cursor-size={cursorSize}
    >
      <AnimatedCursor cursor={activeCursor} scopeRef={shopRef} />
      <MouseCosmetics effect={activeMouseEffect} animation={activeMouseAnimation} intensity={trailIntensity(trailPreferences, activeMouseEffect)} scopeRef={shopRef} />
      <AmbientLayer variant="scan" />
      <p className="eyebrow" role="status">{state.storyFlags.rareEquipmentUnlocked ? '◆ RARE EQUIPMENT UNLOCKED · MOUSE MASTER' : '◇ COMPLETE MISSION 7 TO UNLOCK RARE EQUIPMENT'}</p><ShopHelpers scope={shopRef} />

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
        <button className="armoury-back" aria-label="Return home" onClick={onBack}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m14 5-7 7 7 7M7 12h14" /></svg><span>Back</span></button>
        <div>
          <p className="eyebrow">CYBER HERO / ARMOURY</p>
          <h1>
            <Copy id="shop" language={language} />
          </h1>
        </div>
        <div className="wallet">
          <div className="wallet-credits">
            <strong key={state.currentCredits}>{isGodMode ? "99,999" : state.currentCredits.toLocaleString()}</strong>
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
          <details className="armoury-credit-help"><summary>How do I earn credits?</summary><Copy id="economyHelp" language={language} /></details>

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
              data-help="Heroes: choose an animal, color, and armour tier."
              className={`department-tab ${department === "heroes" ? "active" : ""}`}
              onClick={() => {
                setDepartment("heroes");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 11 3 3 5-6"/></svg></span>
              <div className="tab-text">
                <strong>01. HEROES</strong>
                <small>{language === "it" ? "Operativi e armature" : language === "ja" ? "ヒーローと装甲" : "Operatives and Armor"}</small>
              </div>
            </button>
            <button className={`department-tab ${department === "badges" ? "active" : ""}`} onClick={() => setDepartment("badges")} data-help="Badges: choose a frame around your hero portrait."><span className="tab-icon">◇</span><div className="tab-text"><strong>BADGES</strong><small>Hero portrait frames</small></div></button>
            <button
              data-help="Mouse Studio: try pointers, trails, and animations."
              className={`department-tab ${department === "pointers" ? "active" : ""}`}
              onClick={() => {
                setDepartment("pointers");
                playEffect("hover", state.settings.muted);
              }}
            >
              <span className="tab-icon">↗</span>
              <div className="tab-text">
                <strong>02. MOUSE STUDIO</strong>
                <small>{language === "it" ? "Puntatori, scie e animazioni" : language === "ja" ? "ポインター・軌跡・動き" : "Pointers, Trails and Motion"}</small>
              </div>
            </button>
            <button
              data-help="Themes: preview a new color scheme for your computer."
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
              data-help="Companions: meet a helper to join your adventures."
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

          {department === "pointers" && (
            <nav className="mouse-studio-tabs" aria-label="Mouse customization">
              {(["pointers", "effects", "animation"] as const).map((tab, index) => (
                <button key={tab} type="button" className={mouseTab === tab ? "active" : ""} aria-current={mouseTab === tab ? "page" : undefined} onClick={() => { setMouseTab(tab); playEffect("click", state.settings.muted); }}>
                  <small>0{index + 1} / MOUSE</small>
                  <strong>{tab === "pointers" ? "POINTERS" : tab === "effects" ? "EFFECTS & TRAILS" : "ANIMATION"}</strong>
                  <span lang={language}>{tab === "pointers" ? (language === "it" ? "Puntatori" : "ポインター") : tab === "effects" ? (language === "it" ? "Effetti e scie" : "エフェクトと軌跡") : (language === "it" ? "Animazione" : "アニメーション")}</span>
                </button>
              ))}
            </nav>
          )}

          {department === "heroes" && <HeroArmoury state={state} testMode={isGodMode} busy={busy} language={language} change={change} />}

          {/* ========================================================================= */}
          {/* POINTERS DEPARTMENT: STITCH SCREEN 4 SPLIT-PANEL LAYOUT                  */}
          {/* ========================================================================= */}
          {department === "pointers" && mouseTab === "pointers" && (
            <div className="shop-split-layout">
              {/* LEFT COLUMN: MAGNIFIED PREVIEW & REAL-SIZE INTERACTIVE CALIBRATION PAD */}
              <div className="shop-preview-column">
                <section className="pointer-magnified-card">
                  <div className="magnified-hud-header">
                    <div>
                      <span>RETICLE CALIBRATION // 4X MAGNIFIED</span>
                      <strong>{ECONOMY.items.find(i => i.itemId === selectedPointerId)?.name ?? "Neon Pointer"}</strong>
                    </div>
                    <span className="magnified-tag">
                      {SHOP_UI_COPY.magnifiedPreview[language]}
                    </span>
                  </div>

                  <div className="magnified-stage">
                    <div className="magnified-svg-container">
                      {IMPORTED_CURSOR_PREVIEWS[selectedPointerId] ? (
                        <img className="imported-cursor-preview" src={`${import.meta.env.BASE_URL}cursors/${IMPORTED_CURSOR_PREVIEWS[selectedPointerId]}`} alt={`${ECONOMY.items.find(i => i.itemId === selectedPointerId)?.name ?? "Pointer"} enlarged design`} width="140" height="140" />
                      ) : selectedPointerId.startsWith("cursor-") ? (
                        <img src={`${import.meta.env.BASE_URL}cursors/${selectedPointerId}.svg`} alt={`${ECONOMY.items.find(i => i.itemId === selectedPointerId)?.name ?? "Pointer"} enlarged design`} width="140" height="140" />
                      ) : selectedPointerId === "neon-pointer" ? (
                        <svg width="140" height="140" viewBox="0 0 28 28" fill="none">
                          <path d="M2 2L20 15L12.5 16.5L16.5 25.5L12 27.5L8 18.5L2 22Z" fill="#07111A" stroke="#07111A" strokeWidth="2.5" strokeLinejoin="round" />
                          <path d="M2 2L20 15L12.5 16.5L16.5 25.5L12 27.5L8 18.5L2 22Z" fill="#091A26" stroke="#00F0FF" strokeWidth="1.5" strokeLinejoin="round" />
                          <path d="M3.5 4.5L10.5 10.5M4 4L4 16" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
                        </svg>
                      ) : selectedPointerId === "tactical-crosshair" ? (
                        <img src={`${import.meta.env.BASE_URL}cursors/tactical-crosshair.svg`} alt="Tactical Crosshair enlarged design" width="140" height="140" />
                      ) : (
                        <svg width="140" height="140" viewBox="0 0 28 32" fill="none">
                          <path d="M4 2L24 16L14 18L18 28L12 29L8 19L4 23Z" fill="#00F0FF" stroke="#05141E" strokeWidth="2" />
                          <path d="M6 6L20 16L13 17.5L8 7Z" fill="#FFFFFF" opacity="0.7" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="magnified-telemetry">
                    <div className="telemetry-node">
                      HOTSPOT SPEC:
                      <b>{selectedPointerId === "cursor-glacier" && cursorSize === "large" ? "TIP [4, 1]" : selectedPointerId === "cursor-hologram" && cursorSize === "large" ? "TIP [3, 1]" : IMPORTED_CURSOR_HOTSPOTS[selectedPointerId] ?? (selectedPointerId === "neon-pointer" ? (cursorSize === "large" ? "TIP [3, 3]" : "TIP [2, 2]") : selectedPointerId === "tactical-crosshair" ? "CENTER [16, 16]" : selectedPointerId.startsWith("cursor-") ? "TIP [2, 2]" : "TIP [4, 2]")}</b>
                    </div>
                    <div className="telemetry-node">
                      SILHOUETTE:
                      <b>HIGH-CONTRAST DARK #07111A</b>
                    </div>
                    <div className="telemetry-node">
                      ACTIVE SCALE:
                      <b>{cursorSize === "large" ? `LARGE (${IMPORTED_CURSOR_PREVIEWS[selectedPointerId] ? 48 : 36}PX)` : `STANDARD (${IMPORTED_CURSOR_PREVIEWS[selectedPointerId] ? 40 : 28}PX)`}</b>
                    </div>
                    <div className="telemetry-node">
                      CYBER EDGE:
                      <b>CIRCUIT CYAN #00F0FF</b>
                    </div>
                  </div>
                </section>

                {/* REAL-SIZE INTERACTIVE CALIBRATION PAD */}
                <section
                  className="pointer-calibration-pad"
                  onClick={handleTestPadClick}
                  data-cursor={activeCursor || undefined}
                  data-cursor-size={cursorSize}
                  role="region"
                  aria-label="Pointer Interactive Calibration Pad"
                >
                  <div className="calibration-pad-header">
                    <strong>
                      POINTER CALIBRATION PAD // TEST AREA
                      <small className="item-description-support">{SHOP_UI_COPY.calibrationPadTitle[language]}</small>
                    </strong>
                    <p>{SHOP_UI_COPY.calibrationPadSubtitle[language]}</p>
                  </div>

                  <div className="calibration-sandbox-grid">
                    {/* BUTTON STATE TEST */}
                    <div className="sandbox-box">
                      <span className="box-label">01. POINTER HOVER STATE</span>
                      <button
                        type="button"
                        className="test-pad-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          playEffect("click", state.settings.muted);
                        }}
                      >
                        TEST BUTTON <small>· {SHOP_UI_COPY.testButton[language]}</small>
                      </button>
                    </div>

                    {/* LINK STATE TEST */}
                    <div className="sandbox-box">
                      <span className="box-label">02. HYPERLINK STATE</span>
                      <a
                        href="#pointer-calibration"
                        className="test-pad-link"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        SECURE LINK <small>· {SHOP_UI_COPY.testLink[language]}</small>
                      </a>
                    </div>

                    {/* SELECTABLE TEXT STATE TEST */}
                    <div className="sandbox-box" style={{ gridColumn: "1 / -1" }}>
                      <span className="box-label">03. TEXT SELECTION STATE (I-BEAM)</span>
                      <div className="test-pad-selectable" onClick={(e) => e.stopPropagation()}>
                        {SHOP_UI_COPY.testSelectableText[language]}
                      </div>
                    </div>

                    {/* FOLDER & FILE INTERACTION TEST */}
                    <div className="sandbox-box" style={{ gridColumn: "1 / -1" }}>
                      <span className="box-label">04. DESKTOP TARGETS</span>
                      <div className="test-pad-files" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="test-file-item"
                          onClick={() => playEffect("click", state.settings.muted)}
                        >
                          <span>📁</span> DIR mission-files <small>({SHOP_UI_COPY.testFolder[language]})</small>
                        </button>
                        <button
                          type="button"
                          className="test-file-item"
                          onClick={() => playEffect("click", state.settings.muted)}
                        >
                          <span>📄</span> TXT cipher-key.key <small>({SHOP_UI_COPY.testFile[language]})</small>
                        </button>
                      </div>
                    </div>

                    {/* DRAGGABLE OBJECT TEST */}
                    <div className="test-pad-drag-zone" onClick={(e) => e.stopPropagation()}>
                      <div
                        draggable
                        className="draggable-keycard"
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", "KEYCARD");
                        }}
                      >
                        🔑 KEYCARD TOKEN <small>({SHOP_UI_COPY.draggableToken[language]})</small>
                      </div>
                      <div
                        className={`drop-receptacle ${isDragOver ? "drag-over" : ""} ${dragSecured ? "secured" : ""}`}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOver(true);
                        }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragOver(false);
                          setDragSecured(true);
                          playEffect("unlock", state.settings.muted);
                        }}
                      >
                        {dragSecured ? SHOP_UI_COPY.droppedSuccess[language] : SHOP_UI_COPY.dropTarget[language]}
                      </div>
                    </div>

                    {/* PRECISION BULLSEYE TARGET */}
                    <div className="precision-target-shell">
                      <div
                        className="bullseye-target"
                        onClick={handleBullseyeClick}
                        role="button"
                        tabIndex={0}
                        aria-label="Click accuracy bullseye target"
                      />
                      <div className="precision-target-readout">
                        <span>{SHOP_UI_COPY.precisionTarget[language]}</span>
                        <b>{targetAccuracy}</b>
                        <small>{SHOP_UI_COPY.clickFeedback[language]}</small>
                      </div>
                    </div>
                  </div>

                  {/* CLICK RIPPLES */}
                  {pointerClicks.map((click) => (
                    <span
                      key={click.id}
                      className={`pointer-ripple ${click.double ? "double-pulse" : ""}`}
                      style={{ left: `${click.x}px`, top: `${click.y}px` }}
                    />
                  ))}
                </section>
              </div>

              {/* RIGHT COLUMN: POINTER SCALE SELECTOR & POINTER ITEMS */}
              <div className="shop-selection-column">
                {/* ACCESSIBILITY SIZE SWITCH */}
                <div className="pointer-size-switch">
                      <span>{SHOP_UI_COPY.cursorSizeLabel.en}<small lang={language}>{SHOP_UI_COPY.cursorSizeLabel[language]}</small></span>
                  <div className="size-btn-group" role="group" aria-label="Pointer Size Preference">
                    <button
                      type="button"
                      className={`size-toggle-btn ${cursorSize === "standard" ? "active" : ""}`}
                      aria-pressed={cursorSize === "standard"}
                      onClick={() => handleSizeToggle("standard")}
                    >
                      Standard ({IMPORTED_CURSOR_PREVIEWS[selectedPointerId] ? 40 : 28}px)
                    </button>
                    <button
                      type="button"
                      className={`size-toggle-btn ${cursorSize === "large" ? "active" : ""}`}
                      aria-pressed={cursorSize === "large"}
                      onClick={() => handleSizeToggle("large")}
                    >
                      Large ({IMPORTED_CURSOR_PREVIEWS[selectedPointerId] ? 48 : 36}px)
                    </button>
                  </div>
                </div>

                {/* POINTER CATALOG CARDS */}
                {filteredItems.map((item) => {
                  const owned = state.inventory.includes(item.itemId);
                  const equipped = state.equippedItems[item.category] === item.itemId;
                  const rankLocked = !isGodMode && (!rank.requiredMissions.includes(1) || (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked)); // operator check
                  const affordable = isGodMode || state.currentCredits >= item.price;
                  const isTrialActive = trialItems.cursor === item.itemId;
                  const isSelected = selectedPointerId === item.itemId;

                  return (
                    <article
                      key={item.itemId}
                      className={`catalog-item-card ${isSelected ? "selected" : ""}`}
                      tabIndex={0}
                      data-help={item.description}
                      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.currentTarget.click(); } }}
                      onClick={() => {
                        setSelectedPointerId(item.itemId);
                        playEffect("click", state.settings.muted);
                      }}
                    >
                      <div className="catalog-item-info">
                        <div className="catalog-item-icon">{IMPORTED_CURSOR_PREVIEWS[item.itemId] ? <img className="imported-cursor-card-art" src={`${import.meta.env.BASE_URL}cursors/${item.itemId.startsWith("cursor-ani-") ? `${item.itemId}-frame-0.png` : `${item.itemId}.png`}`} alt="" /> : item.icon}</div>
                        <div className="catalog-item-text">
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                          <small className="item-description-support" lang={language}>
                            {shopDescription(item.itemId, language)}
                          </small>
                        </div>
                      </div>

                      <div className="catalog-item-status">
                        <span className="catalog-item-price">
                          {item.price} <Copy id="balance" language={language} />
                        </span>
                        {equipped && <span className="active-item-badge">{SHOP_UI_COPY.equippedActive[language]}</span>}
                        {isTrialActive && <span className="trial-active-badge">TESTING IN SHOP</span>}

                        {!owned && (
                          <div className="item-affordability" style={{ width: "100%", minWidth: "160px" }}>
                            <ProgressMeter
                              label={`${item.name} affordability`}
                              value={Math.min(state.currentCredits, item.price)}
                              max={item.price}
                            />
                          </div>
                        )}

                        <div className="card-action-bar" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`trial-button ${isTrialActive ? "active" : ""}`}
                            aria-label={isTrialActive ? `Stop testing ${item.name}` : `Try ${item.name} in shop`}
                            onClick={() => {
                              playEffect("click", state.settings.muted);
                              setSelectedPointerId(item.itemId);
                              setTrialItems((prev) => ({
                                ...prev,
                                cursor: isTrialActive ? undefined : item.itemId,
                              }));
                            }}
                          >
                            <span>{isTrialActive ? SHOP_UI_COPY.stopTesting.en : SHOP_UI_COPY.tryInShop.en}</span><small lang={language}>{isTrialActive ? SHOP_UI_COPY.stopTesting[language] : SHOP_UI_COPY.tryInShop[language]}</small>
                          </button>

                          {equipped ? (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy}
                              onClick={() => void change("student.equip", "", item.category)}
                            >
                              <span>{SHOP_UI_COPY.useDefault.en}</span><small lang={language}>{SHOP_UI_COPY.useDefault[language]}</small>
                            </button>
                          ) : owned ? (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy}
                              onClick={() => void change("student.equip", item.itemId, item.category)}
                            >
                              <span>{SHOP_UI_COPY.equipItem.en}</span><small lang={language}>{SHOP_UI_COPY.equipItem[language]}</small>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy || rankLocked || !affordable}
                              onClick={() => void change("student.purchase", item.itemId, item.category, item)}
                            >
                              {rankLocked ? <span>LOCKED · MISSION 7</span> : <Copy id={!affordable ? "insufficient" : busy ? "saving" : "buy"} language={language} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {department === "pointers" && mouseTab !== "pointers" && (
            <div className="shop-split-layout mouse-effects-layout">
              <div className="shop-preview-column">
                <section className="mouse-effects-preview">
                  <div className="mouse-preview-heading">
                    <small>MOUSE STUDIO // LIVE SIGNAL TEST</small>
                    <h2>{mouseTab === "effects" ? "Leave a signal in your wake." : "Give every move a little life."}</h2>
                    <p>{mouseTab === "effects" ? "Move your pointer across the field to test the trail. Try different colors before equipping one." : "Move and click inside the field to test a restrained pointer animation."}</p>
                  </div>
                  <div className="mouse-effects-field" aria-label="Live mouse effect test field">
                    <div className="mouse-field-orbit" aria-hidden="true"><i /><i /><i /></div>
                    <span className="mouse-field-label">MOVE POINTER HERE <b>↗</b></span>
                    <button type="button" onClick={() => playEffect("click", state.settings.muted)}>CLICK TARGET <span>◎</span></button>
                    <small>LIVE PREVIEW · DESKTOP POINTER</small>
                  </div>
                  <div className="mouse-preview-footer">
                    <span><b>01</b> SELECT A MODULE</span>
                    <span><b>02</b> TRY IN SHOP</span>
                    <span><b>03</b> EQUIP TO KEEP</span>
                  </div>
                </section>
              </div>
              <div className="shop-selection-column mouse-effects-catalog">
                <div className="mouse-catalog-heading">
                  <small>{mouseTab === "effects" ? "TRAIL MODULES" : "MOTION MODULES"} // {filteredItems.length} OPTIONS</small>
                  <h2>{mouseTab === "effects" ? "Effects & trails" : "Pointer animation"}</h2>
                  <p>{mouseTab === "effects" ? "One trail can be equipped alongside any pointer and animation." : "One animation can be equipped alongside any pointer and trail."}</p>
                </div>
                {filteredItems.map((item) => {
                  const owned = state.inventory.includes(item.itemId);
                  const equipped = state.equippedItems[item.category] === item.itemId;
                  const isTrialActive = trialItems[item.category as "mouseEffect" | "mouseAnimation"] === item.itemId;
                  const rankLocked = !isGodMode && (!rank.requiredMissions.includes(1) || (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked));
                  const affordable = isGodMode || state.currentCredits >= item.price;
                  return <article key={item.itemId} className={`mouse-effect-card ${isTrialActive ? "is-trial" : ""}`}>
                    <div className={`mouse-effect-emblem ${item.itemId}`} aria-hidden="true"><span>{item.icon}</span></div>
                    <div className="mouse-effect-copy">
                      <div className="mouse-effect-title"><h3>{item.name}</h3><span>{equipped ? "EQUIPPED" : isTrialActive ? "LIVE TRIAL" : `${item.price} CREDITS`}</span></div>
                      <p>{item.description}</p>
                      <small lang={language}>{shopDescription(item.itemId, language)}</small>
                      <div className="mouse-effect-actions">
                        <button type="button" className={`trial-button ${isTrialActive ? "active" : ""}`} aria-label={isTrialActive ? `Stop testing ${item.name}` : `Try ${item.name} in shop`} onClick={() => setTrialItems(previous => ({ ...previous, [item.category]: isTrialActive ? undefined : item.itemId }))}>
                          {isTrialActive ? "STOP TESTING" : "TRY IN SHOP"}
                        </button>
                        {equipped ? <button type="button" className="quiet-button" disabled={busy} onClick={() => void change("student.equip", "", item.category)}>USE DEFAULT</button>
                          : owned ? <button type="button" className="quiet-button" disabled={busy} onClick={() => void change("student.equip", item.itemId, item.category)}>EQUIP</button>
                          : <button type="button" className="quiet-button" disabled={busy || rankLocked || !affordable} onClick={() => void change("student.purchase", item.itemId, item.category, item)}>{rankLocked ? "LOCKED · MISSION 7" : !affordable ? "MORE CREDITS NEEDED" : `BUY · ${item.price}`}</button>}
                      </div>
                      {item.category === "mouseEffect" && (
                        <div className={`trail-intensity-control ${item.itemId === "trail-rainbow-comet" ? "rainbow" : item.itemId === "trail-solid-signal" ? "solid" : ""}`}>
                          <label htmlFor={`trail-intensity-${item.itemId}`}>
                            <span>TRAIL INTENSITY <small lang={language}>{language === "it" ? "Intensità scia" : "軌跡の強さ"}</small></span>
                            <output>{trailIntensity(trailPreferences, item.itemId)}%</output>
                          </label>
                          <input id={`trail-intensity-${item.itemId}`} type="range" min="10" max="100" step="5" value={trailIntensity(trailPreferences, item.itemId)} aria-label={`${item.name} trail intensity`} style={{ "--trail-fill": `${trailIntensity(trailPreferences, item.itemId)}%` } as React.CSSProperties} onChange={(event) => { saveTrailIntensity(item.itemId, Number(event.currentTarget.value)); setTrialItems(previous => ({ ...previous, mouseEffect: item.itemId })); }} />
                          <div className="trail-range-labels"><span>SUBTLE</span><span>ARCADE</span></div>
                        </div>
                      )}
                    </div>
                  </article>;
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* THEMES DEPARTMENT: STITCH SCREEN 4 SPLIT-PANEL LAYOUT                    */}
          {/* ========================================================================= */}
          {department === "themes" && (
            <div className="shop-split-layout">
              {/* LEFT COLUMN: MINIATURE DASHBOARD & MISSION COMPUTER PREVIEWS */}
              <div className="shop-preview-column">
                <section
                  className="theme-preview-card"
                  style={THEME_PREVIEW_TOKENS[selectedThemeId] ?? THEME_PREVIEW_TOKENS["orbit-blue-theme"]}
                  data-theme={selectedThemeId === "orbit-blue-theme" ? "orbit-blue" : selectedThemeId === "matrix-terminal" ? "matrix" : "solar-amber"}
                >
                  <div className="mini-preview-header">
                    <strong>MINIATURE DASHBOARD PREVIEW <small>· {SHOP_UI_COPY.miniDashboard[language]}</small></strong>
                    <span className="magnified-tag">LIVE MOCKUP</span>
                  </div>

                  <div className="mini-dashboard-frame">
                    <div className="mini-topbar">
                      <span>CYBER HERO // HOME BASE</span>
                      <b>AGENT {state.hackerCodename ?? "ROOKIE"}</b>
                    </div>
                    <div className="mini-mission-card">
                      <div>
                        <strong>MISSION 01: COMPUTER TRAINING</strong>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "var(--game-text-muted)" }}>Desktop Navigation Operations</p>
                      </div>
                      <span className="mini-status-chip">ACTIVE</span>
                    </div>
                  </div>

                  <div className="mini-preview-header" style={{ marginTop: "18px" }}>
                    <strong>MINIATURE MISSION COMPUTER PREVIEW <small>· {SHOP_UI_COPY.miniComputer[language]}</small></strong>
                    <span className="magnified-tag">LIVE MOCKUP</span>
                  </div>

                  <div className="mini-computer-frame">
                    <div className="mini-computer-bar">
                      <span>← Back</span>
                      <span>Desktop / training</span>
                      <span>CYBER GUIDE: READY</span>
                    </div>
                    <div className="mini-file-grid">
                      <div className="mini-file selected">📄 TXT agent-card</div>
                      <div className="mini-file">📁 DIR agent-files</div>
                    </div>
                  </div>
                </section>
              </div>

              {/* RIGHT COLUMN: THEME SELECTION CARDS */}
              <div className="shop-selection-column">
                {filteredItems.map((item) => {
                  const owned = state.inventory.includes(item.itemId);
                  const equipped = state.equippedItems[item.category] === item.itemId;
                  const rankLocked = !isGodMode && (!rank.requiredMissions.includes(1) || (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked));
                  const affordable = isGodMode || state.currentCredits >= item.price;
                  const isTrialActive = trialItems.terminalTheme === item.itemId;
                  const isSelected = selectedThemeId === item.itemId;

                  return (
                    <article
                      key={item.itemId}
                      className={`catalog-item-card ${isSelected ? "selected" : ""}`}
                      tabIndex={0}
                      data-help={item.description}
                      onKeyDown={(event) => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); event.currentTarget.click(); } }}
                      onClick={() => {
                        setSelectedThemeId(item.itemId);
                        playEffect("click", state.settings.muted);
                      }}
                    >
                      <div className="catalog-item-info">
                        <div className="catalog-item-icon">{item.icon}</div>
                        <div className="catalog-item-text">
                          <h3>{item.name}</h3>
                          <p>{item.description}</p>
                          <small className="item-description-support" lang={language}>
                            {shopDescription(item.itemId, language)}
                          </small>
                        </div>
                      </div>

                      <div className="catalog-item-status">
                        <span className="catalog-item-price">
                          {item.price} <Copy id="balance" language={language} />
                        </span>
                        {equipped && <span className="active-item-badge">{SHOP_UI_COPY.equippedActive[language]}</span>}
                        {isTrialActive && <span className="trial-active-badge">TESTING IN SHOP</span>}

                        {!owned && (
                          <div className="item-affordability" style={{ width: "100%", minWidth: "160px" }}>
                            <ProgressMeter
                              label={`${item.name} affordability`}
                              value={Math.min(state.currentCredits, item.price)}
                              max={item.price}
                            />
                          </div>
                        )}

                        <div className="card-action-bar" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className={`trial-button ${isTrialActive ? "active" : ""}`}
                            aria-label={isTrialActive ? `Stop testing ${item.name}` : `Try ${item.name} in shop`}
                            onClick={() => {
                              playEffect("click", state.settings.muted);
                              setSelectedThemeId(item.itemId);
                              setTrialItems((prev) => ({
                                ...prev,
                                terminalTheme: isTrialActive ? undefined : item.itemId,
                              }));
                            }}
                          >
                            <span>{isTrialActive ? SHOP_UI_COPY.stopTesting.en : SHOP_UI_COPY.tryInShop.en}</span><small lang={language}>{isTrialActive ? SHOP_UI_COPY.stopTesting[language] : SHOP_UI_COPY.tryInShop[language]}</small>
                          </button>

                          {equipped ? (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy}
                              onClick={() => void change("student.equip", "", item.category)}
                            >
                              {SHOP_UI_COPY.useDefault[language]}
                            </button>
                          ) : owned ? (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy}
                              onClick={() => void change("student.equip", item.itemId, item.category)}
                            >
                              {SHOP_UI_COPY.equipItem[language]}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="quiet-button"
                              disabled={busy || rankLocked || !affordable}
                              onClick={() => void change("student.purchase", item.itemId, item.category, item)}
                            >
                              {rankLocked ? <span>LOCKED · MISSION 7</span> : <Copy id={!affordable ? "insufficient" : busy ? "saving" : "buy"} language={language} />}
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {(department === "badges" || department === "assistants") && <AccessoryArmoury key={department} category={department === "badges" ? "badge" : "companion"} state={state} testMode={isGodMode} busy={busy} change={change} trial={trialItems.companion} onTrial={(id) => setTrialItems(previous => ({ ...previous, companion: id }))} />}

        </>
      )}
    </main>
  );
}
