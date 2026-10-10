// Offline scripted coach answers for the quick-action chips.

export type ChipAction =
  | 'minimum'
  | 'walk'
  | 'planB'
  | 'band'
  | 'pain'
  | 'report'
  | 'eatingOut'
  | 'equipment';

export interface CoachScript {
  id: string;
  chip: string;
  title: string;
  lines: string[];
  actions: { label: string; action: ChipAction }[];
}

export const COACH_SCRIPTS: CoachScript[] = [
  {
    id: 'busy',
    chip: 'Equipment is busy',
    title: 'Busy gym, same progress',
    lines: [
      'Every exercise has a "Not available / busy?" button with two safe alternatives.',
      'Pick one and choose "Just today". It keeps its own progression history.',
      'Or do the next exercise first and come back. Order matters less than finishing.',
      'Never swap into dips, behind-the-neck moves, upright rows, wide flyes or heavy overhead pressing.',
    ],
    actions: [{ label: 'Open today’s workout', action: 'equipment' }],
  },
  {
    id: 'exhausted',
    chip: "I'm exhausted",
    title: 'Low energy plan',
    lines: [
      'Do the 30-minute minimum version: leg press 2x10, chest press 2x10, seated row 2x10, plank 2x30 s. It still counts.',
      'Too tired even for that? Walk 20-30 minutes. That is 40% credit and keeps the habit alive.',
      'Food: just hit the three anchors today: a protein breakfast, the planned lunch, and dinner with 1.5 palms of protein.',
      'Tonight: lights off by 23:30. Tiredness is often a sleep problem, not a willpower problem.',
    ],
    actions: [
      { label: 'Start minimum version', action: 'minimum' },
      { label: 'Walk instead', action: 'walk' },
    ],
  },
  {
    id: 'ateout',
    chip: 'I ate out',
    title: 'Eating out rules',
    lines: [
      'Protein first, then water. The next meal is normal.',
      'Never skip the next meal to "make up" for it. That leads to the next binge.',
      'Log it with Plan B > "Log something else" with a rough kcal estimate. Honest beats perfect.',
      'Delivery default: grilled chicken or kebab plate, rice OR bread, salad, no fries, no extra sauce.',
    ],
    actions: [{ label: 'See all eating-out rules', action: 'eatingOut' }],
  },
  {
    id: 'stuck',
    chip: 'Weight is stuck',
    title: 'Is it really stuck?',
    lines: [
      'Daily weight jumps 1-2 kg from salt, carbs, water and the toilet. Only the weekly average counts.',
      'Judge the trend over 3-4 weeks, not days. The coach only acts on two weeks in a row above the band.',
      'Check the waist: if it is dropping while weight is flat, recomposition is working.',
      'Honest check: oil measured with a teaspoon? Bread portions? Weekend snacks logged?',
    ],
    actions: [{ label: 'Show my band chart', action: 'band' }],
  },
  {
    id: 'missed',
    chip: 'I missed 2 days',
    title: 'New day, same plan',
    lines: [
      'Two days do not undo two weeks. Nothing is lost.',
      'Do not compensate. No extra cardio, no skipped meals. Just restart with the next planned meal.',
      'Today: hit protein, drink 10 glasses, and do the minimum version if it is a gym day.',
      'Tip: prep tomorrow’s work snack tonight.',
    ],
    actions: [{ label: 'Minimum version', action: 'minimum' }],
  },
  {
    id: 'hurts',
    chip: 'Something hurts',
    title: 'Pain: stop or modify',
    lines: [
      'Sharp pain, instability, swelling or the knee giving way: stop the exercise now.',
      'Mild discomfort: reduce the weight, shorten the range, or swap to an alternative.',
      'Log it with the "Something hurt" button so the coach can track it.',
      'Same area twice in 14 days: see an orthopedist or physio before loading it again.',
      'Chest pain, fainting or severe breathlessness is not a gym problem: stop and seek care (Egypt ambulance: 123).',
    ],
    actions: [{ label: 'Log a pain flag', action: 'pain' }],
  },
];
