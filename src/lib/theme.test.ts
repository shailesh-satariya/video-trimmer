import { describe, expect, it } from 'vitest';

import { isThemePreference, resolveTheme } from './theme';

describe('theme preference', () => {
  it('accepts the supported preferences', () => {
    expect(isThemePreference('system')).toBe(true);
    expect(isThemePreference('light')).toBe(true);
    expect(isThemePreference('dark')).toBe(true);
  });

  it('rejects missing and unknown preferences', () => {
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference('sepia')).toBe(false);
  });

  it('resolves system preferences from the active media query', () => {
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('system', true)).toBe('dark');
  });

  it('keeps an explicit preference regardless of the system theme', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
