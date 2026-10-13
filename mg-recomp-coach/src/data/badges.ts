export const BADGES = [
  { id: 'first_workout', name: 'First workout', desc: 'Logged your first workout.' },
  { id: 'full_week', name: 'First full week', desc: '3 of 3 workouts in one week.' },
  { id: 'streak_7', name: '7-day streak', desc: '7 days in a row at 70+.' },
  { id: 'streak_30', name: '30-day streak', desc: '30 days in a row at 70+.' },
  { id: 'first_pr', name: 'First personal record', desc: 'Beat your best on any exercise.' },
  { id: 'lost_2', name: 'First 2 kg', desc: 'Weekly average 2 kg below start.' },
  { id: 'lost_5', name: '5 kg lost', desc: 'Weekly average 5 kg below start.' },
  { id: 'lost_10', name: '10 kg lost', desc: 'Weekly average 10 kg below start.' },
  { id: 'waist_5', name: 'Waist down 5 cm', desc: 'Waist 5 cm below your start.' },
  { id: 'zero_oil', name: 'Oil rule week', desc: '7 days with the oil rule ticked (4 tsp or less).' },
  { id: 'planb_master', name: 'Plan B master', desc: 'Used Plan B 5 times and stayed on plan.' },
  { id: 'deload_done', name: 'Deload done', desc: 'Finished a deload week of training.' },
  { id: 'week12_test', name: 'Week 12 test done', desc: 'Recorded the final strength test.' },
] as const;

export type BadgeId = (typeof BADGES)[number]['id'];
