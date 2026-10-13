// Display units for body measurements. Data is always stored in kg and cm.
// Gym loads stay in kg (Egyptian gyms label plates and stacks in kg).
import { useApp } from '../store/useApp';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export function useUnits() {
  const imperial = useApp((s) => s.data.settings.units) === 'imperial';
  return {
    imperial,
    wUnit: imperial ? 'lb' : 'kg',
    lUnit: imperial ? 'in' : 'cm',
    /** kg -> display number */
    w: (kg: number) => (imperial ? Math.round((kg / KG_PER_LB) * 10) / 10 : Math.round(kg * 10) / 10),
    /** cm -> display number */
    l: (cm: number) => (imperial ? Math.round((cm / CM_PER_IN) * 10) / 10 : Math.round(cm * 10) / 10),
    /** display -> kg */
    toKg: (v: number) => (imperial ? v * KG_PER_LB : v),
    /** display -> cm */
    toCm: (v: number) => (imperial ? v * CM_PER_IN : v),
    fw: (kg: number | null | undefined, sign = false) =>
      kg == null ? '–' : `${sign && kg > 0 ? '+' : ''}${(imperial ? kg / KG_PER_LB : kg).toFixed(1)} ${imperial ? 'lb' : 'kg'}`,
    fl: (cm: number | null | undefined) => (cm == null ? '–' : `${(imperial ? cm / CM_PER_IN : cm).toFixed(1)} ${imperial ? 'in' : 'cm'}`),
  };
}
