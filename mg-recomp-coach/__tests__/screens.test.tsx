// Render smoke test: every screen renders with demo data (catches runtime errors without a device).
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import Today from '../src/app/(tabs)/index';
import Gym from '../src/app/(tabs)/gym';
import Me from '../src/app/(tabs)/me';
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
import { addDays, todayISO } from '../src/engine/dates';
import { defaultData } from '../src/engine/defaults';
import { buildDemoData } from '../src/services/demo';
import { useApp } from '../src/store/useApp';

beforeAll(async () => {
  // Let zustand finish its async rehydration so it cannot overwrite the seeded state mid-test.
  await useApp.persist.rehydrate();
});

const routes: Record<string, React.ComponentType<any>> = {
  index: Today,
  gym: Gym,
  me: Me,
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
  '/': /Your numbers/,
  '/gym': /All workouts/,
  '/me': /Total lost/,
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
  '/history': /Squat|Bench|Deadlift/,
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
    useApp.getState().startWorkout(todayISO(), 'BENCH', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    expect((await screen.findAllByText(/Bench press/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Not available \/ busy\?/).length).toBeGreaterThan(0);
    expect(screen.getByText('Finish workout')).toBeTruthy();
  });
});

describe('interactions', () => {
  test('log a set, rest timer starts, finish and save the workout', async () => {
    const d = { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } };
    useApp.setState({ data: d, hydrated: true, active: null, restTimer: null });
    useApp.getState().startWorkout(todayISO(), 'MINIMUM', 'minimum', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    await fireEvent.press(screen.getAllByLabelText('Set 1 done')[0]);
    expect(useApp.getState().active?.sets.filter((s) => s.done)).toHaveLength(1);
    expect(useApp.getState().restTimer?.total).toBe(90); // leg press rest
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
    useApp.getState().startWorkout(todayISO(), 'BENCH', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    await fireEvent.press(screen.getAllByText('Not available / busy?')[0]);
    await fireEvent.changeText(await screen.findByLabelText('Type my own'), 'Bench dips');
    await fireEvent.press(screen.getByText('Use my own'));
    expect(screen.getByText(/Blocked: Dips/)).toBeTruthy();
  });
});

describe('log tab and AI setup', () => {
  const fresh = () => ({ ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } });

  test('Today submits each input on its own and can undo it', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.changeText(screen.getByLabelText('Weight (kg)'), '108.4');
    await fireEvent.press(screen.getAllByText('Submit')[0]);
    expect(useApp.getState().data.body[todayISO()]?.weight).toBe(108.4);
    await fireEvent.changeText(screen.getByLabelText('Total from your phone’s step counter'), '7200');
    await fireEvent.press(screen.getAllByText('Submit')[1]);
    expect(useApp.getState().data.dayLogs[todayISO()]?.steps).toBe(7200);
    await fireEvent.press(screen.getByLabelText('Add a glass of water (250 ml)'));
    expect(useApp.getState().data.dayLogs[todayISO()]?.water).toBe(1);
    expect(screen.getByText('Weight 108.4 kg')).toBeTruthy();
    expect(useApp.getState().data.entries).toHaveLength(3);
    await fireEvent.press(screen.getByLabelText('Undo: Weight 108.4 kg'));
    expect(useApp.getState().data.body[todayISO()]?.weight).toBeUndefined();
    expect(useApp.getState().data.entries).toHaveLength(2);
  });

  test('extra food counts toward the day on Today', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Type it'));
    await fireEvent.press(await screen.findByText('Banana · 105'));
    const log = useApp.getState().data.dayLogs[todayISO()];
    expect(log?.extras?.[0]).toMatchObject({ name: 'Banana', kcal: 105 });
    expect(screen.getByText(/105 \/ /)).toBeTruthy();
  });

  test('the Gym tab lists every workout and its exercises', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/gym' });
    await fireEvent.press(screen.getByLabelText('Deadlift day. Show exercises'));
    expect(screen.getByText('Light squat')).toBeTruthy();
    expect(screen.getByText('Start Deadlift day now')).toBeTruthy();
  });

  test('Me > Coach shows the AI key setup under Ask a question', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/me' });
    await fireEvent.press(screen.getByLabelText('Coach'));
    await fireEvent.press(screen.getByLabelText('Ask a question'));
    expect(await screen.findByText(/Connect the AI coach/)).toBeTruthy();
    expect(screen.getByText('Open Anthropic Console')).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('API key'), 'not-a-real-key-123456789');
    await fireEvent.press(screen.getByText('Save and test'));
    expect(screen.getByText(/Keys start with sk-ant-/)).toBeTruthy();
  });
});

describe('training program, logging and progression', () => {
  const fresh = () => ({ ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } });

  test('the live workout shows the learning banner, a tutorial button and big stepper inputs', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'SQUAT', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    expect((await screen.findAllByText(/Learning phase - light weights, focus on form/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Watch tutorial').length).toBe(4);
    await fireEvent.press(screen.getAllByLabelText('Increase Set 1 weight in kilograms')[0]);
    await fireEvent.press(screen.getAllByLabelText('Increase Set 1 weight in kilograms')[0]);
    await fireEvent.press(screen.getAllByLabelText('Set 1 done')[0]);
    const set = useApp.getState().active?.sets[0];
    expect(set).toMatchObject({ exerciseId: 'squat', weight: 5, reps: 5, done: true, clean: true });
  });

  test('Watch tutorial opens the exercise link', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'BENCH', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    await fireEvent.press(screen.getAllByLabelText('Watch tutorial: Bench press')[0]);
    expect(open).toHaveBeenCalledWith(expect.stringContaining('youtube.com'));
    expect(open.mock.calls[0][0]).toMatch(/Bench%20press/);
    open.mockRestore();
  });

  test('last session numbers show next to each set and drive the next suggestion', async () => {
    const d = fresh();
    d.workouts = [
      {
        id: 'w1', date: '2026-01-02', sessionKey: 'BENCH', kind: 'full', startedAt: 1, durationMin: 60, deload: false, finished: true,
        sets: [0, 1, 2, 3].map((i) => ({ exerciseId: 'bench', nameUsed: 'Bench press', setIndex: i, weight: 60, reps: 5, rir: null, clean: true, done: true })),
      },
    ];
    useApp.setState({ data: d, hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'BENCH', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    expect(screen.getAllByText(/Last time: 60 kg × 5/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Add 2.5 kg: 62.5 kg x 5/)).toBeTruthy();
  });

  test('marking form as not clean saves it on the sets', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    useApp.getState().startWorkout(todayISO(), 'BENCH', 'full', false);
    await renderRouter(routes, { initialUrl: '/gym' });
    await fireEvent.press(screen.getAllByLabelText('Set 1 done')[0]);
    await fireEvent.press(screen.getAllByLabelText('Form was clean on every set')[0]);
    expect(useApp.getState().active?.sets[0].clean).toBe(false);
  });
});

describe('food by portion, protein tracker and busy day', () => {
  const fresh = () => ({ ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } });

  test('protein quick buttons add portions that count toward protein', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByLabelText(/^Add 1 palm of Grilled chicken breast/));
    await fireEvent.press(screen.getByLabelText(/^Add 1 palm of Grilled chicken breast/));
    const log = useApp.getState().data.dayLogs[todayISO()];
    expect(log?.extras).toHaveLength(1);
    expect(log?.extras?.[0]).toMatchObject({ foodId: 'chicken_palm', qty: 2, protein: 62, kcal: 330 });
  });

  test('Add by portion lists foods with hands, spoons and pieces', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Add by portion'));
    expect(await screen.findByText(/1 palm = the size and thickness of your palm/)).toBeTruthy();
    await fireEvent.press(screen.getByText(/^Carbs/));
    expect(screen.getByText('Foul medames')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Add one portion of Rice'));
    expect(useApp.getState().data.dayLogs[todayISO()]?.extras?.[0]).toMatchObject({ foodId: 'rice', qty: 1, kcal: 160 });
    await fireEvent.press(screen.getByLabelText('Remove one portion of Rice'));
    expect(useApp.getState().data.dayLogs[todayISO()]?.extras).toHaveLength(0);
  });

  test('busy day mode shows three simple meals and the protein target only', async () => {
    useApp.setState({ data: fresh(), hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByText('Busy day? Minimum-effort mode'));
    expect(useApp.getState().data.dayLogs[todayISO()]?.busy).toBe(true);
    expect(await screen.findByText(/Busy day mode: three simple meals/)).toBeTruthy();
    expect(screen.getByText('Eggs, foul and bread')).toBeTruthy();
    expect(screen.getByText('Chicken, rice, salad')).toBeTruthy();
    expect(screen.getByText('Tawook plate')).toBeTruthy();
    expect(screen.queryByText('Your numbers')).toBeNull();
    expect(screen.queryByText('Work snack')).toBeNull();
    await fireEvent.press(screen.getByLabelText(/^Lunch: Chicken, rice, salad/));
    expect(useApp.getState().data.dayLogs[todayISO()]?.meals.L?.status).toBe('eaten');
    expect(screen.getByText('Protein today')).toBeTruthy();
    await fireEvent.press(screen.getByText('Back to the full plan'));
    expect(useApp.getState().data.dayLogs[todayISO()]?.busy).toBe(false);
  });
});

describe('weekly check-in', () => {
  test('Progress shows the weekly average, the target and a calorie suggestion', async () => {
    const d = { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: addDays(todayISO(), -28), startWeight: 110 } };
    // Week avgs: start of program -> losing 1 kg a week (too fast).
    for (let i = 1; i <= 28; i++) {
      const date = addDays(todayISO(), -i);
      d.body[date] = { weight: 110 - (28 - i) * (1 / 7) };
    }
    useApp.setState({ data: d, hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/me' });
    expect(await screen.findByText('WEEKLY CHECK-IN')).toBeTruthy();
    expect(screen.getByText(/lose 0.3–0.7 kg per week/)).toBeTruthy();
    expect(screen.getByText('Lifts over time')).toBeTruthy();
  });

  test('quick weight stepper saves today’s smart scale weight', async () => {
    useApp.setState({ data: { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } }, hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/me' });
    await fireEvent.press(screen.getByLabelText('Increase Smart scale today'));
    await fireEvent.press(screen.getByText('Save today’s weight'));
    expect(useApp.getState().data.body[todayISO()]?.weight).toBe(110.1);
  });
});

describe('Me tab', () => {
  test('Plan shows the roadmap, settings links and the meal plan', async () => {
    useApp.setState({ data: { ...defaultData(), profile: { ...defaultData().profile, onboarded: true, startDate: todayISO() } }, hydrated: true, active: null });
    await renderRouter(routes, { initialUrl: '/me' });
    await fireEvent.press(screen.getByLabelText('Plan'));
    expect(screen.getByText('12-week roadmap')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('This week’s meals')).toBeTruthy();
    expect(screen.getByText('Meal library')).toBeTruthy();
  });
});
