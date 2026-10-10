import { planAverageKcal } from '../engine/nutrition';
import { weekFor } from '../engine/selectors';
import { weekTarget } from '../engine/targets';
import type { AppData, ISODate } from '../engine/types';

/** Context for validating changes against the hard limits for the current week. */
export function limitCtxFor(data: AppData, today: ISODate) {
  const wt = weekTarget(Math.min(12, weekFor(data, today)));
  return {
    planAvgKcal: planAverageKcal(data.plan),
    doctorCleared: data.settings.doctorCleared,
    stepsBase: wt.steps,
    cardioBase: wt.cardio,
    kcalAdjust: data.adjust.kcalAdjust,
  };
}
