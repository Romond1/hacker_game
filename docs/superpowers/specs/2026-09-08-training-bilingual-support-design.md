# Training Bilingual Support Design

## Scope

Student-facing training UI will be English-first with the signed-in student's configured Italian or Japanese support line directly underneath. This applies only to Home Base training entry points, the Training Center, training sessions, and training results.

Mission localization is explicitly unchanged. Missions keep their existing Translate button, event logging, and score consequences. Training has no Translate button, translation event, or translation penalty because its support text is always visible.

## Copy model

Create a dedicated typed training copy catalog for English, Italian, and Japanese. A small training-specific bilingual component will render the English line and a secondary `<small lang="it|ja">` support line. Dynamic messages will use typed formatter functions so names, round counts, scores, and limits remain accurate.

Training module metadata will expose localized title, description, and skill strings. The public identifiers and authoritative gameplay policy remain unchanged.

Technical tokens remain standardized: XP, Credits, rank letters, scores, timers, access codes, and achievement names. Instructions, headings, labels, statuses, warnings, explanatory prose, and buttons receive support-language copy.

## Component changes

- `StudentHome`: localize the Training Center entry, availability status, Credit label, and action.
- `TrainingCenter`: accept the student's support language and localize navigation, headings, module metadata, policy explanations, metrics, locked/capped statuses, and start/replay action.
- `TrainingSession`: localize introduction, live-round labels and instructions, saving/error states, and all actions. The Systems Calibration task receives the support language for its instruction text.
- `TrainingResults`: receive the support language and localize headings, personal-best status, metrics, canonical-result explanation, cap status, and actions.
- `App`: pass the authenticated student's profile language into the training components. No language choice is stored in an attempt or submitted with evidence.

## Layout and accessibility

Support text will follow the existing bilingual visual hierarchy: English remains primary; Italian/Japanese appears immediately beneath it with quieter color and smaller type. Interactive controls will contain both visible lines while retaining concise English accessible names for existing automation. Correct `lang` attributes will help assistive technology pronounce support text.

Responsive layouts will allow Japanese and Italian strings to wrap without clipping or horizontal overflow.

## Validation

Tests will first demonstrate the current missing behavior, then verify:

- Italian support throughout Home Base and the complete training flow.
- Japanese support throughout the same reusable components.
- Technical tokens remain unchanged.
- `training.finish` still submits only attempt ID, evidence, and duration; localization never affects scoring or rewards.
- Existing mission translation behavior and mission regression tests remain unchanged.

The authenticated browser journey will capture and visually inspect localized training screens and check for console errors and responsive overflow.
