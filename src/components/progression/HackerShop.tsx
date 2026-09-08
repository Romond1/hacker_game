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
export function HackerShop({
  user,
  progression: state,
  onUpdate,
  onBack,
}: Props) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<"purchaseSuccess" | "equipmentSaved">();
  const [purchaseReveal, setPurchaseReveal] = useState<{
    item: ShopItem;
    processing: boolean;
  }>();
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
  return (
    <main className="page shop-page">
      <AmbientLayer variant="scan" />
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
      <header className="shop-heading">
        <div>
          <p className="eyebrow">HOME BASE / SUPPLY ACCESS</p>
          <h1>
            <Copy id="shop" language={language} />
          </h1>
        </div>
        <div className="wallet">
          <strong>{state.currentCredits.toLocaleString()}</strong>
          <Copy id="balance" language={language} />
        </div>
      </header>
      {!state.storyFlags.shopUnlocked ? (
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
                    <div key={id}>
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
          <section className="shop-catalog" aria-label="Shop items">
            {ECONOMY.items.map((item) => {
              const owned = state.inventory.includes(item.itemId);
              const rankLocked =
                ECONOMY.ranks.findIndex((r) => r.id === rank.id) <
                ECONOMY.ranks.findIndex((r) => r.id === item.requiredRank);
              const affordable =
                state.currentCredits >= item.price &&
                state.lifetimeCreditsSpent + item.price <= rank.spendingCap;
              return (
                <article
                  className={`shop-item rarity-${item.rarity} ${owned ? "owned" : ""} ${state.equippedItems[item.category] === item.itemId ? "equipped" : ""} ${rankLocked ? "rank-locked" : ""}`}
                  key={item.itemId}
                  onPointerEnter={() =>
                    playEffect("hover", state.settings.muted)
                  }
                >
                  <div
                    className={`item-preview ${item.asset.className ?? ""}`}
                    aria-hidden="true"
                  >
                    <span>{item.icon}</span>
                    {item.itemId === "mini-drone" && <i />}
                  </div>
                  <div className="shop-item-details">
                    <p className="eyebrow">
                      {item.category.replace(/([A-Z])/g, " $1")} · {item.rarity}
                    </p>
                    <h2>{item.name}</h2>
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
                            {item.price - state.currentCredits} CREDITS
                            REMAINING
                          </strong>
                        ) : (
                          <strong>READY TO ACQUIRE</strong>
                        )}
                      </div>
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
                    <button
                      className="quiet-button"
                      disabled={busy || owned || rankLocked || !affordable}
                      aria-label={
                        rankLocked
                          ? "Infiltrator required"
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
                </article>
              );
            })}
          </section>
        </>
      )}
    </main>
  );
}
