import { describe, expect, it } from 'vitest';
import { preferredLoginLanguages } from './login';

describe('preferredLoginLanguages', () => {
  it('puts Japanese first when Japanese is the browser preference', () => {
    expect(preferredLoginLanguages(['ja-JP', 'en-US', 'it-IT'])).toEqual(['ja', 'it']);
  });

  it('puts Italian first when Italian is the browser preference', () => {
    expect(preferredLoginLanguages(['it-IT', 'en-US', 'ja-JP'])).toEqual(['it', 'ja']);
  });

  it('uses Italian then Japanese for an English-only or unknown browser', () => {
    expect(preferredLoginLanguages(['en-GB'])).toEqual(['it', 'ja']);
    expect(preferredLoginLanguages(['fr-FR'])).toEqual(['it', 'ja']);
  });
});
