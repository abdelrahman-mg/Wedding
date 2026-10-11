// Boots the real route tree (root layout, tabs layout, redirects) from src/app.
import { renderRouter, screen } from 'expo-router/testing-library';
import path from 'path';
import { todayISO } from '../src/engine/dates';
import { defaultData } from '../src/engine/defaults';
import { useApp } from '../src/store/useApp';

const APP = path.join(__dirname, '../src/app');

beforeAll(async () => {
  await useApp.persist.rehydrate();
});

test('first launch redirects to onboarding', async () => {
  useApp.setState({ data: defaultData(), hydrated: true, active: null });
  await renderRouter(APP, { initialUrl: '/' });
  // The tabs layout redirects to /onboarding until onboarding is done.
  expect(await screen.findByText(/Hey MG/)).toBeTruthy();
  expect(screen.queryByText('Today')).toBeNull();
});

test('after onboarding the tabs render', async () => {
  const d = defaultData();
  d.profile = { ...d.profile, onboarded: true, startDate: todayISO() };
  useApp.setState({ data: d, hydrated: true, active: null });
  await renderRouter(APP, { initialUrl: '/' });
  expect(await screen.findByText(/Hi, MG/)).toBeTruthy();
  for (const tab of ['Today', 'Log', 'Train', 'Progress', 'Coach']) expect(screen.getAllByText(tab).length).toBeGreaterThan(0);
});
