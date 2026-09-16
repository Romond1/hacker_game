import { FrameOrnament } from "./FrameOrnament";
import { useState } from 'react';
import { ECONOMY, rankFor, type PlayerProgression, type ShopItem } from '../../domain/progression';

function CompanionArt({ pup }: { pup: boolean }) {
  return <svg className="companion-art" viewBox="0 0 320 280" fill="none" aria-hidden="true">
    <ellipse cx="160" cy="246" rx="100" ry="15" fill="#5bdded" opacity=".12" />
    {pup ? <><path d="M86 139 55 71l62 22M204 94l65-23-24 79" fill="#243b58" stroke="#91c4e9" strokeWidth="7"/><path d="m98 95 65-14 69 21 22 69-35 56H110l-38-58Z" fill="#243b58" stroke="#91c4e9" strokeWidth="7"/><path d="m100 150 43 5m35 0 43-5" stroke="#73f0f4" strokeWidth="12" strokeLinecap="round"/><path d="m131 193 29-13 31 13-31 23Z" fill="#090f20" stroke="#6ab9d6" strokeWidth="3"/></> : <><path d="M85 138H30m205 0h55" stroke="#8baecb" strokeWidth="14"/><ellipse cx="46" cy="115" rx="39" ry="10" stroke="#62d9e8" strokeWidth="6"/><ellipse cx="274" cy="115" rx="39" ry="10" stroke="#62d9e8" strokeWidth="6"/><path d="m95 98 65-23 66 23 20 77-48 37h-75l-48-37Z" fill="#233952" stroke="#91c4e9" strokeWidth="7"/><circle cx="160" cy="146" r="36" fill="#0b172a" stroke="#66ddec" strokeWidth="6"/><circle cx="160" cy="146" r="17" fill="#83f6f3"/><path d="m120 212-12 22m92-22 12 22" stroke="#a4bfd5" strokeWidth="8"/></>}
  </svg>;
}

export function AccessoryArmoury({ category, state, testMode, busy, change, trial, onTrial }: {
  category: 'badge' | 'companion'; state: PlayerProgression; testMode: boolean; busy: boolean;
  change: (action: string, itemId: string, category: string, item?: ShopItem) => Promise<void>;
  trial?: string; onTrial: (id?: string) => void;
}) {
  const items = ECONOMY.items.filter(item => item.category === category);
  const [selected, setSelected] = useState(state.equippedItems[category] ?? items[0].itemId);
  const item = items.find(item => item.itemId === selected) ?? items[0];
  const hero = ECONOMY.items.find(item => item.itemId === state.equippedItems.hero);
  const owned = state.inventory.includes(item.itemId), equipped = state.equippedItems[category] === item.itemId;
  const rank = rankFor(state.completedMissions);
  const locked = !testMode && (item.availability === 'future' || (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked) || ECONOMY.ranks.findIndex(r => r.id === rank.id) < ECONOMY.ranks.findIndex(r => r.id === item.requiredRank));
  const affordable = testMode || state.currentCredits >= item.price;
  const art = () => category === 'badge'
    ? <div className={`portrait-frame premium-frame ${item.asset.className ?? 'frame-rookie'}`}><img src={`${import.meta.env.BASE_URL}${hero?.asset.image ?? 'heroes/wolf/standard.png'}`} alt="Your hero wearing the selected portrait frame" /><FrameOrnament /></div>
    : <CompanionArt pup={item.itemId === 'cyber-pup'} />;
  return <section className={`accessory-armoury rarity-${item.rarity} ${category === "badge" ? "premium-badge-bay" : ""}`} aria-label={category === 'badge' ? 'Badge frames' : 'Companion armoury'}>
    <div className="armoury-intro"><div><span className="armoury-kicker">{category === 'badge' ? 'FRAME YOUR IDENTITY' : 'MEET YOUR SIDEKICK'}</span><h2>{category === 'badge' ? 'A badge of your own.' : 'Every hero needs a friend.'}</h2></div></div>
    <div className="accessory-layout"><div className="accessory-stage"><span className="accessory-status">{equipped ? '✓ Equipped' : owned ? '✓ Owned' : locked ? 'Locked' : 'Available'}</span>{art()}<h3>{item.name}</h3><span className="rarity-label">{item.rarity}</span></div>
      <div className="accessory-options"><span className="armoury-kicker">{category === 'badge' ? 'CHOOSE YOUR FRAME' : 'CHOOSE YOUR COMPANION'}</span>
        <div className="accessory-roster">{items.map(option => <button key={option.itemId} aria-pressed={item.itemId === option.itemId} data-help={option.description} onClick={() => setSelected(option.itemId)} aria-label={`Preview ${option.name}`}><span className={`accessory-emblem ${option.asset.className ?? 'frame-rookie'}`}>{category === 'badge' ? '◇' : option.itemId === 'mini-drone' ? '⌁' : '◉'}</span><span>{option.name}<small>{state.inventory.includes(option.itemId) ? '✓ Owned' : `${option.price} credits`} · {option.rarity}</small></span></button>)}</div>
        <p className="hero-lore">{item.description}</p>
        {category === 'badge' && <p className="hero-lore">Frames surround your hero portrait. Collect a new style and switch whenever you like.</p>}
        <div className="hero-price"><strong>{item.price}</strong><span>Credits</span><b>{locked ? `Requires ${ECONOMY.ranks.find(r => r.id === item.requiredRank)?.name} rank` : owned ? 'In your collection' : !affordable ? `${item.price-state.currentCredits} more needed` : 'Ready to unlock'}</b></div>
        {category === 'companion' && <button className="trial-button" aria-label={trial === item.itemId ? `Stop testing ${item.name}` : `Try ${item.name} in shop`} onClick={() => onTrial(trial === item.itemId ? undefined : item.itemId)}>{trial === item.itemId ? 'STOP TESTING' : 'TRY IN SHOP'}</button>}
        <button className="hero-main-action" disabled={busy || (!owned && (locked || !affordable))} aria-label={`${equipped ? 'Use default for' : owned ? 'Equip' : 'Buy'} ${item.name}`} onClick={() => void change(owned ? 'student.equip' : 'student.purchase', equipped ? '' : item.itemId, category, owned ? undefined : item)}><span>{busy ? 'Saving…' : equipped ? 'Use default' : owned ? 'Equip' : locked ? 'Rank locked' : !affordable ? 'Keep earning credits' : 'Unlock'} {category === 'badge' ? 'frame' : 'companion'}</span><span>→</span></button>
      </div></div>
  </section>;
}
