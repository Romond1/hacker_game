import { useState, type CSSProperties } from 'react';
import { ECONOMY, rankFor, type PlayerProgression, type ShopItem } from '../../domain/progression';
import { ProgressMeter } from '../gamefeel/ProgressMeter';

const animals = [
  ['wolf', 'Cyber Wolf', 'Recon & communications'], ['panda', 'Cyber Panda', 'Heavy defence'],
  ['tiger', 'Neon Tiger', 'Agility & protection'], ['bird', 'Mecha Bird', 'Aerial surveillance'],
  ['rabbit', 'Quantum Rabbit', 'Speed & evasion'],
] as const;
export const HERO_COLORS = [
  ['cyan', 'Cyan', '#4bdcf1'], ['white', 'White', '#edf3fa'], ['cobalt', 'Cobalt Blue', '#4276ed'],
  ['red', 'Red', '#f16069'], ['purple', 'Purple', '#ba81f4'], ['green', 'Green', '#80cf86'],
] as const;
const tiers = ['standard', 'rare', 'elite', 'legendary'] as const;
export function heroVariantId(species: string, color: string, tier: string) {
  return `hero-${species}-${color === 'cyan' ? '' : `${color}-`}${tier}`;
}

export function HeroArmoury({ state, testMode, busy, language, change }: {
  state: PlayerProgression; testMode: boolean; busy: boolean; language: 'it' | 'ja';
  change: (action: string, itemId: string, category: string, item?: ShopItem) => Promise<void>;
}) {
  const equippedHero = ECONOMY.items.find(item => item.itemId === state.equippedItems.hero);
  const [species, setSpecies] = useState(() => equippedHero?.asset.species ?? 'wolf');
  const [color, setColor] = useState(() => HERO_COLORS.find(([id]) => equippedHero?.itemId.includes(`-${id}-`))?.[0] ?? 'cyan');
  const [tier, setTier] = useState(() => equippedHero?.rarity ?? 'standard');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const item = ECONOMY.items.find(item => item.itemId === heroVariantId(species, color, tier))!;
  const owned = state.inventory.includes(item.itemId);
  const equipped = state.equippedItems.hero === item.itemId;
  const rank = rankFor(state.completedMissions);
  const futureLocked = !testMode && item.availability === 'future';
  const rankLocked = !testMode && (ECONOMY.ranks.findIndex(r => r.id === rank.id) < ECONOMY.ranks.findIndex(r => r.id === item.requiredRank) || (item.rarity === 'rare' && !state.storyFlags.rareEquipmentUnlocked));
  const affordable = testMode || state.currentCredits >= item.price;
  const ownedHeroes = ECONOMY.items.filter(item => item.category === 'hero' && state.inventory.includes(item.itemId));
  const animal = animals.find(([id]) => id === species)!;
  const colorName = HERO_COLORS.find(([id]) => id === color)![1];
  const chooseOwned = (hero: ShopItem) => {
    setSpecies(hero.asset.species!);
    setColor(HERO_COLORS.find(([id]) => hero.itemId.includes(`-${id}-`))?.[0] ?? 'cyan');
    setTier(hero.rarity);
  };
  return <section className={`hero-armoury rarity-${tier}`} aria-label="Hero armoury">
    <div className="armoury-intro"><div><span className="armoury-kicker">MAKE IT YOURS</span><h2>Choose your hero.</h2></div><button className="collection-toggle" aria-pressed={ownedOnly} onClick={() => setOwnedOnly(!ownedOnly)}>{ownedOnly ? 'All heroes' : 'My collection'} <b>{ownedHeroes.length} / 120</b></button></div>
    {ownedOnly && <div className="armoury-owned" aria-label="Your hero collection">
      {ownedHeroes.length ? ownedHeroes.map(hero => <button key={hero.itemId} onClick={() => chooseOwned(hero)} aria-label={`Preview owned ${hero.name}`} aria-pressed={hero.itemId === item.itemId}><img src={`${import.meta.env.BASE_URL}${hero.asset.image}`} alt="" /><span>{hero.name}</span>{state.equippedItems.hero === hero.itemId && <b>Equipped</b>}</button>) : <p>Your collection starts with your first hero. Choose an animal, a color, and an armour tier below.</p>}
    </div>}
    <div className="armoury-stage">
      <nav className="hero-roster" aria-label="Choose animal">
        {animals.map(([id, name], index) => <button key={id} aria-label={`Choose ${name}`} aria-pressed={species === id} onClick={() => setSpecies(id)}><span className="roster-number">0{index + 1}</span><img src={`${import.meta.env.BASE_URL}heroes/${id}/standard.png`} alt="" /><span>{name}</span></button>)}
      </nav>
      <div className="hero-showcase">
        <div className="showcase-title"><span>HERO / {species.toUpperCase()}</span><strong>{equipped ? '✓ Equipped' : owned ? '✓ Owned' : futureLocked || rankLocked ? 'Locked' : 'Available'}</strong></div>
        <div className="hero-art-frame" key={item.itemId}>
          <img className="armoury-hero-art" src={`${import.meta.env.BASE_URL}${item.asset.image}`} alt={`${item.name} ${colorName} ${tier} armour preview`} />
          <div className="hero-art-vignette" />
          <div className="hero-prestige" aria-hidden="true">{tier === 'legendary' ? '✦ ✦ ✦ ✦' : tier === 'elite' ? '◆ ◆ ◆' : tier === 'rare' ? '◆ ◆' : '◆'}</div>
          <div className="hero-art-caption"><span>{tier} armour</span><h3>{animal[1]}</h3><p>{animal[2]}</p></div>
        </div>
        <div className="hero-platform" aria-hidden="true" />
      </div>
      <div className="hero-loadout">
        <div className="loadout-heading"><span className="armoury-kicker">YOUR LOADOUT</span><h3>{item.name.split(' · ')[0]}</h3><span className="rarity-label">{tier} / {colorName}</span></div>
        <fieldset className="hero-color-picker"><legend><b>01</b> Choose a color <span>{colorName}</span></legend><div>{HERO_COLORS.map(([id, name, hex]) => <button key={id} type="button" data-help={`${name} color — preview this color on your hero.`} aria-label={`Choose ${name} color`} aria-pressed={color === id} onClick={() => setColor(id)} style={{ '--swatch': hex } as CSSProperties}><i aria-hidden="true">{color === id ? '✓' : ''}</i><span>{name === 'Cobalt Blue' ? 'Cobalt' : name}</span></button>)}</div></fieldset>
        <fieldset className="hero-tier-picker"><legend><b>02</b> Choose your armour</legend><div>{tiers.map((value, index) => {
          const variant = ECONOMY.items.find(hero => hero.itemId === heroVariantId(species, color, value))!;
          const collected = state.inventory.includes(variant.itemId);
          return <button key={value} type="button" className={`tier-${value}`} data-help={`${value.charAt(0).toUpperCase() + value.slice(1)} armour — ${collected ? "already in your collection" : `${variant.price} credits`}.`} aria-label={`Preview ${value} armour`} aria-pressed={tier === value} onClick={() => setTier(value)}><i aria-hidden="true">{'◆'.repeat(index + 1)}</i><span>{value}</span><small>{collected ? '✓ Owned' : !testMode && variant.availability === 'future' ? 'Locked' : `${variant.price} credits`}</small></button>;
        })}</div></fieldset>
        <p className="hero-lore">{item.asset.lore}</p>
        <div className="hero-purchase-zone" aria-live="polite">
          {owned ? <p className="hero-owned-message">✓ Yours to wear. Switch heroes whenever you like.</p> : <><div className="hero-price"><strong>{item.price}</strong><span>Credits</span><b>{futureLocked ? 'Future unlock' : rankLocked ? 'Rank locked' : affordable ? 'Ready to unlock' : `${item.price - state.currentCredits} more needed`}</b></div>
          {!affordable && !futureLocked && <ProgressMeter label={`${item.name} affordability`} value={Math.min(state.currentCredits, item.price)} max={item.price} />}</>}
          {futureLocked && !owned && <p>Reserved for future campaign operations. Requires Infiltrator rank.</p>}
          {rankLocked && !futureLocked && !owned && <p>Requires {ECONOMY.ranks.find(r => r.id === item.requiredRank)?.name} rank.</p>}
          <button className="hero-main-action" disabled={busy || (!owned && (futureLocked || rankLocked || !affordable))} aria-label={equipped ? `Use default for ${item.name}` : owned ? `Equip ${item.name}` : futureLocked ? `Future campaign unlock for ${item.name}` : `Buy ${item.name}`} onClick={() => void change(owned ? 'student.equip' : 'student.purchase', equipped ? '' : item.itemId, 'hero', owned ? undefined : item)}>
            <span>{busy ? 'Saving…' : equipped ? 'Use default hero' : owned ? 'Equip hero' : futureLocked || rankLocked ? 'Locked' : !affordable ? 'Keep earning credits' : 'Unlock hero'}<small lang={language}>{language === 'it' ? (owned ? 'Scegli il tuo eroe' : 'Sblocca il tuo eroe') : (owned ? 'ヒーローを装備' : 'ヒーローを解除')}</small></span><span aria-hidden="true">{futureLocked || rankLocked ? '◇' : '→'}</span>
          </button>
          {!owned && !futureLocked && <small className="purchase-note">Unlocks this color and armour. No random rewards.</small>}
        </div>
      </div>
    </div>
  </section>;
}
