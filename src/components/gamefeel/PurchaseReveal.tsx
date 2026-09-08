import type { ShopItem } from "../../domain/progression";
import type { SupportLanguage } from "../../domain/mission";
import { Copy } from "../progression/Copy";

export function PurchaseReveal({
  item,
  processing,
  language,
  onEquip,
  onReturn,
}: {
  item: ShopItem;
  processing: boolean;
  language: SupportLanguage;
  onEquip: () => void;
  onReturn: () => void;
}) {
  return (
    <section
      className={`purchase-reveal ${processing ? "processing" : "acquired"} rarity-${item.rarity}`}
      role="dialog"
      aria-modal="true"
      aria-label="Item purchase"
    >
      <div className="purchase-scan" aria-hidden="true" />
      <p className="eyebrow">
        <Copy
          id={processing ? "processingPurchase" : "itemAcquired"}
          language={language}
        />
      </p>
      <div
        className={`purchase-item-icon ${item.asset.className ?? ""}`}
        aria-hidden="true"
      >
        {item.icon}
      </div>
      <small>
        {item.rarity.toUpperCase()} ·{" "}
        {item.category.replace(/([A-Z])/g, " $1").toUpperCase()}
      </small>
      <h2>{item.name}</h2>
      {processing ? (
        <div className="purchase-loader" aria-hidden="true">
          <span />
        </div>
      ) : (
        <div className="purchase-actions">
          <button className="primary-button" onClick={onEquip}>
            <Copy id="equipNow" language={language} />
            <span>→</span>
          </button>
          <button className="quiet-button" onClick={onReturn}>
            <Copy id="returnShop" language={language} />
          </button>
        </div>
      )}
    </section>
  );
}
