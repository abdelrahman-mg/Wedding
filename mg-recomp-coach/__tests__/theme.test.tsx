import { renderRouter, screen, fireEvent } from 'expo-router/testing-library';
import Settings from '../src/app/settings';
import { defaultData, migrate } from '../src/engine/defaults';
import { getTheme, THEMES } from '../src/ui/theme';
import { useApp } from '../src/store/useApp';

describe('color schemes', () => {
  test('every scheme has a complete light and dark palette', () => {
    const keys = Object.keys(THEMES[0].light).sort();
    expect(THEMES.length).toBeGreaterThanOrEqual(6);
    for (const t of THEMES) {
      expect(Object.keys(t.light).sort()).toEqual(keys);
      expect(Object.keys(t.dark).sort()).toEqual(keys);
      for (const v of [...Object.values(t.light), ...Object.values(t.dark)]) expect(typeof v).toBe('string');
    }
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  test('unknown or missing ids fall back to the original', () => {
    expect(getTheme(undefined).id).toBe('nile');
    expect(getTheme('nope').id).toBe('nile');
  });

  test('older saved data without a palette gets the original', () => {
    const old: any = defaultData();
    delete old.settings.palette;
    expect(migrate(old).settings.palette).toBe('nile');
  });

  test('picking a scheme in Settings applies and is remembered', async () => {
    useApp.setState({ data: { ...defaultData(), profile: { ...defaultData().profile, onboarded: true } }, hydrated: true, active: null });
    await renderRouter({ index: Settings }, { initialUrl: '/' });
    await fireEvent.press(screen.getByLabelText('Sunset. Warm orange and cream'));
    expect(useApp.getState().data.settings.palette).toBe('sunset');
    await fireEvent.press(screen.getByLabelText('Appearance: Dark'));
    expect(useApp.getState().data.settings.theme).toBe('dark');
  });
});
