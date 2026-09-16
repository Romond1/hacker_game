import { describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { ECONOMY, emptyProgression } from '../src/domain/progression';
import { equipItem, purchaseItem } from './progressionCore';

describe('hero color collection', () => {
  it('provides all 120 variants with real assets and the original tier policies', () => {
    const heroes = ECONOMY.items.filter(item => item.category === 'hero');
    expect(heroes).toHaveLength(120);
    expect(new Set(ECONOMY.items.map(item => item.itemId)).size).toBe(ECONOMY.items.length);
    for (const species of ['wolf', 'panda', 'tiger', 'bird', 'rabbit']) {
      for (const tier of ['standard', 'rare', 'elite', 'legendary']) {
        const original = heroes.find(item => item.itemId === `hero-${species}-${tier}`)!;
        for (const color of ['white', 'cobalt', 'red', 'purple', 'green']) {
          const variant = heroes.find(item => item.itemId === `hero-${species}-${color}-${tier}`)!;
          expect(variant).toBeDefined();
          expect([variant.price, variant.requiredRank, variant.availability, variant.purchasable, variant.equipable])
            .toEqual([original.price, original.requiredRank, original.availability, original.purchasable, original.equipable]);
          expect(existsSync(resolve('public', variant.asset.image!))).toBe(true);
        }
      }
    }
  });
  it('keeps color ownership independent, charges once and preserves existing equipment', () => {
    const state = { ...emptyProgression(), completedMissions: [1,2,3], currentCredits: 70, storyFlags: { shopUnlocked: true }, inventory: ['hero-wolf-standard'], equippedItems: { hero: 'hero-wolf-standard' } };
    expect(() => equipItem(state, 'hero-wolf-white-standard', 'hero')).toThrow();
    purchaseItem(state, 'hero-wolf-cobalt-standard');
    expect(state.currentCredits).toBe(30);
    expect(state.equippedItems.hero).toBe('hero-wolf-standard');
    expect(() => purchaseItem(state, 'hero-wolf-cobalt-standard')).toThrow();
    expect(() => purchaseItem(state, 'hero-wolf-white-standard')).toThrow();
    expect(() => purchaseItem(state, 'hero-wolf-purple-elite')).toThrow();
    equipItem(state, 'hero-wolf-cobalt-standard', 'hero');
    expect(state.equippedItems.hero).toBe('hero-wolf-cobalt-standard');
    expect(state.inventory).toEqual(['hero-wolf-standard', 'hero-wolf-cobalt-standard']);
  });
});
