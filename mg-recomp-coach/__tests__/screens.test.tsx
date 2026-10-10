// Render smoke test: every screen renders with demo data (catches runtime errors without a device).
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import Today from '../src/app/(tabs)/index';
import Train from '../src/app/(tabs)/train';
import Progress from '../src/app/(tabs)/progress';
import Coach from '../src/app/(tabs)/coach';
import Plan from '../src/app/(tabs)/plan';
import Onboarding from '../src/app/onboarding';
import Checkin from '../src/app/checkin';
import EditMeals from '../src/app/edit-meals';
import EditWorkouts from '../src/app/edit-workouts';
import Targets from '../src/app/targets';
import Shopping from '../src/app/shopping';
import Prep from '../src/app/prep';
import Guides from '../src/app/guides';
import Reminders from '../src/app/reminders';
import Settings from '../src/app/settings';
import Safety from '../src/app/safety';
import Health from '../src/app/health';
import Badges from '../src/app/badges';
import Photos from '../src/app/photos';
import History from '../src/app/history';
import StrengthTest from '../src/app/strength-test';
import { todayISO } from '../src/engine/dates';
import { defaultData } from '../src/engine/defaults';
import { buildDemoData } from '../src/services/demo';
import { useApp } from '../src/store/useApp';

beforeAll(async () => {
  // Let zustand finish its async rehydration so it cannot overwrite the seeded state mid-test.
  await useApp.persist.rehydrate();
});

const routes: Record<string, React.ComponentType<any>> = {
  index: Today,
  train: Train,
  progress: Progress,
  coach: Coach,
  plan: Plan,
  onboarding: Onboarding,
  checkin: Checkin,
  'edit-meals': EditMeals,
  'edit-workouts': EditWorkouts,
  targets: Targets,
  shopping: Shopping,
  prep: Prep,
  guides: Guides,
  reminders: Reminders,
  settings: Settings,
  safety: Safety,
  health: Health,
  badges: Badges,
  photos: Photos,
  history: History,
  'strength-test': StrengthTest,
};

const expectations: Record<string, RegExp> = {
  '/': /Meals/,
  '/train': /Train/,
  '/progress': /Progress/,
  '/coach': /WHAT THE DATA SAYS/,
  '/plan': /12-week roadmap/,
  '/onboarding': /Hey MG/,
  '/checkin': /Quick questions/,
  '/edit-meals': /Treat lunch day/,
  '/edit-workouts': /Session days/,
  '/targets': /Protein/,
  '/shopping': /Chicken breast/,
  '/prep': /Friday morning/,
  '/guides': /Not available\? Use this/,
  '/reminders': /Snooze all/,
  '/settings': /Demo mode/,
  '/safety': /Stop and seek care/,
  '/health': /Blood pressure/,
  '/badges': /Badges/,
  '/photos': /Compare/,
  '/history': /Lower|Upper/,
  '/strength-test': /Baseline test/,
};

describe.each([
  ['demo data', () => buildDemoData(todayISO())],
  ['fresh install, onboarded today', () => ({ ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } })],
])('screens render with %s', (_label, make) => {
  beforeEach(() => {
    useApp.setState({ data: make(), hydrated: true, active: null, restTimer: null });
  });

  test.each(Object.keys(expectations))('%s', async (url) => {
    await renderRouter(routes, { initialUrl: url });
    const pattern = expectations[url];
    if (url === '/history' && _label.startsWith('fresh')) {
      expect(screen.getByText(/No workouts yet/)).toBeTruthy();
      return;
    }
    expect(screen.getAllByText(pattern).length).toBeGreaterThan(0);
  });
});

describe('workout flow', () => {
  test('starting a workout renders the live session with progression', async () => {
    const d = buildDemoData(todayISO());
    useApp.setState({ data: d, hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'UPPER_A', 'full', false);
    await renderRouter(routes, { initialUrl: '/train' });
    expect((await screen.findAllByText(/Machine chest press/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Not available \/ busy\?/).length).toBeGreaterThan(0);
    expect(screen.getByText('Finish workout')).toBeTruthy();
  });
});

describe('interactions', () => {
  test('log a set, rest timer starts, finish and save the workout', async () => {
    const d = { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } };
    useApp.setState({ data: d, hydrated: true, active: null, restTimer: null });
    useApp.getState().startWorkout(todayISO(), 'MINIMUM', 'minimum', false);
    await renderRouter(routes, { initialUrl: '/train' });
    await fireEvent.press(screen.getAllByLabelText('Set 1 done')[0]);
    expect(useApp.getState().active?.sets.filter((s) => s.done)).toHaveLength(1);
    expect(useApp.getState().restTimer?.total).toBe(120); // leg press rest
    await fireEvent.press(screen.getByText('Finish workout'));
    await fireEvent.press(await screen.findByText('Save workout'));
    const w = useApp.getState().data.workouts;
    expect(w).toHaveLength(1);
    expect(w[0].kind).toBe('minimum');
    expect(useApp.getState().active).toBeNull();
  });

  test('Plan B swaps a meal with a live comparison', async () => {
    const d = { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } };
    useApp.setState({ data: d, hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getAllByText('Plan B')[0]); // breakfast
    expect(await screen.findByText(/LIVE COMPARISON/)).toBeTruthy();
    const firstEmergency = screen.getAllByLabelText(/^E\d · /)[0];
    await fireEvent.press(firstEmergency);
    expect(screen.getByText(/Day total/)).toBeTruthy();
    await fireEvent.press(screen.getByText('Use this'));
    const meal = useApp.getState().data.dayLogs[todayISO()]?.meals.B;
    expect(meal?.status).toBe('planB');
    expect(meal?.mealId).toMatch(/^E\d$/);
    expect(useApp.getState().data.planBCount).toBe(1);
  });

  test('joint-safety check blocks a custom swap', async () => {
    const d = { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } };
    useApp.setState({ data: d, hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'UPPER_A', 'full', false);
    await renderRouter(routes, { initialUrl: '/train' });
    await fireEvent.press(screen.getAllByText('Not available / busy?')[0]);
    await fireEvent.changeText(await screen.findByLabelText('Type my own'), 'Bench dips');
    await fireEvent.press(screen.getByText('Use my own'));
    expect(screen.getByText(/Blocked: Dips/)).toBeTruthy();
  });
});
