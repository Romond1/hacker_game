# Training Bilingual Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every student-facing training screen English-first with always-visible Italian or Japanese support copy, without changing mission translation penalties or training scoring.

**Architecture:** Add a typed training-only localization catalog and a reusable bilingual renderer, then pass the authenticated profile language through Home Base, Training Center, TrainingSession, SystemsCalibrationTask, and TrainingResults. Localized module metadata remains presentation-only; attempt evidence and authoritative reward APIs stay unchanged.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, existing Playwright browser journey.

---

## File Map

**Create:**

- `src/i18n/training.ts` — typed static and dynamic English/Italian/Japanese training copy.
- `src/i18n/training.test.ts` — catalog and formatter coverage.
- `src/components/training/TrainingCopy.tsx` — consistent English-first/support-line rendering.

**Modify:**

- `src/training/systems-calibration.ts` — localized module title, description, and skill metadata.
- `src/components/dashboard/StudentHome.tsx` and test — bilingual Home Base training entry.
- `src/components/training/TrainingCenter.tsx` and test — support-language prop and bilingual module listing.
- `src/components/training/TrainingSession.tsx`, `SystemsCalibrationTask.tsx`, `TrainingResults.tsx`, and tests — bilingual training lifecycle.
- `src/App.tsx` and `src/App.test.tsx` — propagate the profile language and retain the unchanged finish payload.
- `src/training.css` — secondary support-line hierarchy and wrapping.
- `scripts/verify-progression-browser.mjs` — Italian/Japanese assertions and screenshots.
- `progress.md` — implementation and verification record.

## Task 1: Typed Training Copy Foundation

**Files:** Create `src/i18n/training.ts`, `src/i18n/training.test.ts`, `src/components/training/TrainingCopy.tsx`; modify `src/training/systems-calibration.ts`.

- [ ] **Step 1: Write failing catalog tests**

```ts
expect(trainingCopy('startTraining', 'it')).toEqual({ en: 'Start training', support: "Inizia l'addestramento", lang: 'it' });
expect(trainingCopy('startTraining', 'ja')).toEqual({ en: 'Start training', support: 'トレーニングを開始', lang: 'ja' });
expect(trainingCopy('matchCodes', 'it', { count: 5, name: 'NOVA' }).support).toContain('5');
expect(systemsCalibration.localized.title.ja).toBe('システム調整');
```

- [ ] **Step 2: Run `npx vitest run src/i18n/training.test.ts`; expect failure because the catalog does not exist**

- [ ] **Step 3: Implement the typed catalog and renderer**

```ts
export type TrainingCopy = { en: string; support: string; lang: SupportLanguage };
const messages = {
  startTraining: { en: 'Start training', it: "Inizia l'addestramento", ja: 'トレーニングを開始' },
  returnCenter: { en: 'Return to Training Center', it: 'Torna al Centro di addestramento', ja: 'トレーニングセンターに戻る' },
} as const;
export function trainingCopy(key: keyof typeof messages, language: SupportLanguage): TrainingCopy {
  const value = messages[key];
  return { en: value.en, support: value[language], lang: language };
}
```

Add dynamic copy functions for agent/count instructions, round progress, runs, Credit status, personal-best status, and capped-reward explanation. Define `LocalizedTrainingText = { en: string; it: string; ja: string }` and add `localized` metadata to Systems Calibration while preserving its English `title`, `description`, and `skill` compatibility fields.

```tsx
export function TrainingCopy({ copy, className = '' }: { copy: TrainingCopyValue; className?: string }) {
  return <span className={`training-copy ${className}`}><span>{copy.en}</span><small lang={copy.lang}>{copy.support}</small></span>;
}
```

- [ ] **Step 4: Run the catalog tests and `src/training/catalog.test.ts`; expect pass**

- [ ] **Step 5: Commit with `git commit -m "feat: add bilingual training copy catalog"`**

## Task 2: Home Base and Training Center

**Files:** Modify `src/components/dashboard/StudentHome.tsx`, its test, `src/components/training/TrainingCenter.tsx`, its test, and `src/training.css`.

- [ ] **Step 1: Add failing Italian and Japanese UI tests**

```tsx
render(<StudentHome user={italianStudent} dashboard={unlockedDashboard} {...handlers} />);
expect(screen.getByText('Mantieni efficienti i tuoi sistemi.')).toHaveAttribute('lang', 'it');
expect(screen.getByText('Apri il Centro di addestramento')).toHaveAttribute('lang', 'it');

render(<TrainingCenter language="ja" modules={TRAINING_MODULES} progress={[available]} {...handlers} />);
expect(screen.getByText('システムを磨きましょう。')).toHaveAttribute('lang', 'ja');
expect(screen.getByText('システム調整')).toHaveAttribute('lang', 'ja');
```

- [ ] **Step 2: Run both test files; expect missing support-copy failures**

- [ ] **Step 3: Render bilingual copy throughout both components**

Pass `language: SupportLanguage` into `TrainingCenter`. Use `TrainingCopy` for headings, descriptions, statuses, metric labels, warning/cap messages, and button labels. Render localized module metadata beneath English metadata. Keep XP, Credits, numeric values, times, and ranks unchanged.

```tsx
<button aria-label={action.en} className="primary-button">
  <TrainingCopy copy={action} /><b>→</b>
</button>
```

- [ ] **Step 4: Add `.training-copy` layout rules that wrap support lines safely, then run both tests and `npm run check`; expect pass**

- [ ] **Step 5: Commit with `git commit -m "feat: localize training entry and center"`**

## Task 3: Training Session and Results

**Files:** Modify `TrainingSession.tsx`, `SystemsCalibrationTask.tsx`, `TrainingResults.tsx`, their tests, and `src/training.css`.

- [ ] **Step 1: Add failing lifecycle tests for both support languages and payload isolation**

```tsx
render(<TrainingSession user={italianStudent} module={systemsCalibration} attempt={attempt} finish={finish} onExit={vi.fn()} />);
expect(screen.getByText("Verifica il segnale.")).toHaveAttribute('lang', 'it');
fireEvent.click(screen.getByRole('button', { name: 'Start training' }));
expect(screen.getByText('Seleziona il codice corrispondente dal flusso di verifica attivo.')).toHaveAttribute('lang', 'it');

render(<TrainingResults language="ja" completion={completion} onReplay={vi.fn()} onReturn={vi.fn()} />);
expect(screen.getByText('トレーニング完了。')).toHaveAttribute('lang', 'ja');
expect(screen.getByText('トレーニングセンターに戻る')).toHaveAttribute('lang', 'ja');
```

Complete a session and assert the finish callback receives exactly `{ attemptId, evidence, durationSeconds }`, with no language, translation count, or penalty field.

- [ ] **Step 2: Run the three training component test files; expect missing-language-prop/copy failures**

- [ ] **Step 3: Thread `user.supportLanguage` through the lifecycle**

Localize intro, live labels, task instruction, saving, retry/error, completion, cap warning, and buttons. Pass `language={user.supportLanguage}` into `SystemsCalibrationTask` and `TrainingResults`. Preserve access codes, XP, Credits, rank, achievements, evidence, score calculations, and API payloads verbatim.

- [ ] **Step 4: Run all training component tests plus `src/domain/training.test.ts`; expect pass**

- [ ] **Step 5: Commit with `git commit -m "feat: localize training sessions and results"`**

## Task 4: App Integration and Browser Verification

**Files:** Modify `src/App.tsx`, `src/App.test.tsx`, `scripts/verify-progression-browser.mjs`, and `progress.md`.

- [ ] **Step 1: Add a failing App journey assertion**

Use the Italian Test Student fixture and assert support copy appears after opening Training Center. After five rounds, inspect the captured `training.finish` body:

```ts
expect(finishBody).toEqual({
  action: 'training.finish',
  attemptId: 'training-attempt-1',
  evidence: expect.any(Array),
  durationSeconds: expect.any(Number),
});
expect(JSON.stringify(finishBody)).not.toMatch(/language|translation|penalty/i);
```

- [ ] **Step 2: Run `src/App.test.tsx`; expect failure because TrainingCenter does not receive the profile language**

- [ ] **Step 3: Pass `user.supportLanguage` to TrainingCenter and extend the browser journey**

Assert Test Student sees Italian copy and a Japanese student sees Japanese copy. Save localized training screenshots and assert `document.documentElement.scrollWidth <= innerWidth` at desktop and mobile sizes. Do not change any mission component or mission event payload.

- [ ] **Step 4: Append the localization boundary and verification results to `progress.md`**

- [ ] **Step 5: Run `npm test`, `npm run check`, `npm run build`, and `npm run test:browser`; inspect localized screenshots and console errors; expect pass**

- [ ] **Step 6: Verify `git diff phase-2.1-training-framework...HEAD --check` and commit with `git commit -m "feat: add profile-driven bilingual training"`**
