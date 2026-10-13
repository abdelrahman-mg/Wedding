// Hand-drawn SVG line chart: series, optional shaded band, baseline, tap a point to read it.
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { T } from './kit';
import { fonts, useTheme } from './theme';

export interface ChartPoint {
  x: number;
  y: number;
  label?: string;
}

export interface ChartSeries {
  id: string;
  points: ChartPoint[];
  color: string;
  width?: number;
  dots?: boolean;
  dashed?: boolean;
  name?: string;
}

export interface BandPoint {
  x: number;
  low: number;
  high: number;
}

export function LineChart({
  series,
  band,
  baseline,
  height = 200,
  yFmt = (n) => String(Math.round(n)),
  xFmt,
  xTicks,
  emptyText = 'No data yet.',
  a11ySummary,
}: {
  series: ChartSeries[];
  band?: BandPoint[];
  baseline?: { y: number; label: string };
  height?: number;
  yFmt?: (n: number) => string;
  xFmt?: (x: number) => string;
  xTicks?: number[];
  emptyText?: string;
  a11ySummary?: string;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<ChartPoint | null>(null);
  const pad = { l: 40, r: 10, t: 10, b: 22 };

  const all = series.flatMap((s) => s.points);
  const bounds = useMemo(() => {
    const xs = [...all.map((p) => p.x), ...(band ?? []).map((b) => b.x)];
    const ys = [...all.map((p) => p.y), ...(band ?? []).flatMap((b) => [b.low, b.high]), ...(baseline ? [baseline.y] : [])];
    if (!xs.length || !ys.length) return null;
    let yMin = Math.min(...ys);
    let yMax = Math.max(...ys);
    if (yMax - yMin < 2) {
      yMin -= 1;
      yMax += 1;
    }
    const padY = (yMax - yMin) * 0.08;
    return { xMin: Math.min(...xs), xMax: Math.max(...xs, Math.min(...xs) + 1), yMin: yMin - padY, yMax: yMax + padY };
  }, [all, band, baseline]);

  if (!all.length || !bounds) {
    return (
      <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
        <T muted center>{emptyText}</T>
      </View>
    );
  }

  const iw = Math.max(1, w - pad.l - pad.r);
  const ih = height - pad.t - pad.b;
  const sx = (x: number) => pad.l + ((x - bounds.xMin) / (bounds.xMax - bounds.xMin)) * iw;
  const sy = (y: number) => pad.t + (1 - (y - bounds.yMin) / (bounds.yMax - bounds.yMin)) * ih;
  const path = (pts: ChartPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');

  let bandPath = '';
  if (band && band.length) {
    const b = [...band].sort((a, z) => a.x - z.x);
    bandPath =
      b.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.high).toFixed(1)}`).join(' ') +
      ' ' +
      [...b].reverse().map((p) => `L${sx(p.x).toFixed(1)},${sy(p.low).toFixed(1)}`).join(' ') +
      ' Z';
  }

  const ticksY = [0, 0.5, 1].map((f) => bounds.yMin + (bounds.yMax - bounds.yMin) * f);
  const tickX = xTicks ?? [bounds.xMin, bounds.xMax];
  const dotted = series.find((s) => s.dots) ?? series[0];

  const onPress = (e: { nativeEvent: { locationX: number } }) => {
    const x = e.nativeEvent.locationX;
    let best: ChartPoint | null = null;
    let bd = Infinity;
    for (const p of dotted.points) {
      const d = Math.abs(sx(p.x) - x);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    setSel(best);
  };

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={a11ySummary}>
      {w > 0 ? (
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Tap the chart to read the nearest value">
          <Svg width={w} height={height}>
            {ticksY.map((t, i) => (
              <Line key={i} x1={pad.l} x2={w - pad.r} y1={sy(t)} y2={sy(t)} stroke={c.border} strokeWidth={1} />
            ))}
            {ticksY.map((t, i) => (
              <SvgText key={`t${i}`} x={pad.l - 6} y={sy(t) + 4} fontSize={10} fill={c.textMuted} textAnchor="end" fontFamily={fonts.body}>
                {yFmt(t)}
              </SvgText>
            ))}
            {tickX.map((t, i) => (
              <SvgText key={`x${i}`} x={sx(t)} y={height - 6} fontSize={10} fill={c.textMuted} textAnchor={i === 0 ? 'start' : i === tickX.length - 1 ? 'end' : 'middle'} fontFamily={fonts.body}>
                {xFmt ? xFmt(t) : String(t)}
              </SvgText>
            ))}
            {bandPath ? <Path d={bandPath} fill={c.chartBand} stroke="none" /> : null}
            {baseline ? (
              <>
                <Line x1={pad.l} x2={w - pad.r} y1={sy(baseline.y)} y2={sy(baseline.y)} stroke={c.accent} strokeDasharray="4 4" strokeWidth={1.5} />
                <SvgText x={w - pad.r} y={sy(baseline.y) - 4} fontSize={10} fill={c.textMuted} textAnchor="end" fontFamily={fonts.body}>
                  {baseline.label}
                </SvgText>
              </>
            ) : null}
            {series.map((s) =>
              s.points.length > 1 ? (
                <Path key={s.id} d={path(s.points)} stroke={s.color} strokeWidth={s.width ?? 2.5} fill="none" strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
              ) : null,
            )}
            {series
              .filter((s) => s.dots || s.points.length === 1)
              .map((s) => s.points.map((p, i) => <Circle key={`${s.id}${i}`} cx={sx(p.x)} cy={sy(p.y)} r={sel === p ? 5 : 3} fill={s.color} />))}
          </Svg>
        </Pressable>
      ) : (
        <View style={{ height }} />
      )}
      <T v="caption" muted>
        {sel ? sel.label ?? `${xFmt ? xFmt(sel.x) : sel.x}: ${yFmt(sel.y)}` : 'Tap the chart to see a value.'}
      </T>
    </View>
  );
}
