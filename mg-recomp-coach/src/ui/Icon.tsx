// Small hand-drawn SVG icon set (no icon-font dependency).
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'today'
  | 'train'
  | 'progress'
  | 'coach'
  | 'plan'
  | 'flame'
  | 'check'
  | 'plus'
  | 'minus'
  | 'left'
  | 'right'
  | 'close'
  | 'swap'
  | 'alert'
  | 'heart'
  | 'drop'
  | 'timer'
  | 'star'
  | 'trophy'
  | 'camera'
  | 'gear'
  | 'bolt'
  | 'walk'
  | 'moon'
  | 'scale'
  | 'copy'
  | 'cart'
  | 'down'
  | 'up'
  | 'play'
  | 'food';

export function Icon({ name, size = 22, color, strokeWidth = 2 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const body = () => {
    switch (name) {
      case 'today':
        return (
          <>
            <Circle cx={12} cy={12} r={4} {...p} />
            <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} />
          </>
        );
      case 'play':
        return <Path d="M8 5.5v13l11-6.5z" {...p} />;
      case 'train':
        return <Path d="M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12" {...p} />;
      case 'progress':
        return <Path d="M3 20h18M5 16l4-5 4 3 6-8" {...p} />;
      case 'coach':
        return <Path d="M4 5h16v11H9l-5 4V5z M8 10h8M8 13h5" {...p} />;
      case 'plan':
        return <Path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" {...p} />;
      case 'flame':
        return <Path d="M12 22c4 0 7-2.8 7-7 0-4-3-6.5-4-10-1.5 2-2 3.5-2 5-1-1-2-2-2.5-4C8 8.5 5 11 5 15c0 4.2 3 7 7 7z" {...p} />;
      case 'check':
        return <Path d="M4 12.5l5 5L20 6.5" {...p} />;
      case 'plus':
        return <Path d="M12 5v14M5 12h14" {...p} />;
      case 'minus':
        return <Path d="M5 12h14" {...p} />;
      case 'left':
        return <Path d="M15 5l-7 7 7 7" {...p} />;
      case 'right':
        return <Path d="M9 5l7 7-7 7" {...p} />;
      case 'down':
        return <Path d="M5 9l7 7 7-7" {...p} />;
      case 'up':
        return <Path d="M5 15l7-7 7 7" {...p} />;
      case 'close':
        return <Path d="M6 6l12 12M18 6L6 18" {...p} />;
      case 'swap':
        return <Path d="M4 8h13l-3-3M20 16H7l3 3" {...p} />;
      case 'alert':
        return (
          <>
            <Path d="M12 3l10 18H2L12 3z" {...p} />
            <Path d="M12 10v5M12 18h.01" {...p} />
          </>
        );
      case 'heart':
        return <Path d="M12 20s-8-5-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 9c0 6-8 11-8 11z" {...p} />;
      case 'drop':
        return <Path d="M12 3s7 7.5 7 12a7 7 0 01-14 0c0-4.5 7-12 7-12z" {...p} />;
      case 'timer':
        return (
          <>
            <Circle cx={12} cy={13} r={8} {...p} />
            <Path d="M12 9v4l2.5 2.5M9 2h6" {...p} />
          </>
        );
      case 'star':
        return <Path d="M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.4 6.5 20.3l1-6.2L3 9.7l6.2-.9L12 3z" {...p} />;
      case 'trophy':
        return <Path d="M8 4h8v5a4 4 0 01-8 0V4zM8 6H4a4 4 0 004 4M16 6h4a4 4 0 01-4 4M12 13v4M8 21h8M9 17h6" {...p} />;
      case 'camera':
        return (
          <>
            <Path d="M4 7h3l2-3h6l2 3h3v12H4V7z" {...p} />
            <Circle cx={12} cy={13} r={3.5} {...p} />
          </>
        );
      case 'gear':
        return (
          <>
            <Circle cx={12} cy={12} r={3} {...p} />
            <Path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9L7 7M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" {...p} />
          </>
        );
      case 'food':
        return <Path d="M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M17 3c-2 0-3 2-3 6s1 4 3 4v8" {...p} />;
      case 'bolt':
        return <Path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" {...p} />;
      case 'walk':
        return (
          <>
            <Circle cx={13} cy={4} r={2} {...p} />
            <Path d="M10 21l2-6 3 3v3M7 12l3-4 4 1 2 4M12 15l-1-5" {...p} />
          </>
        );
      case 'moon':
        return <Path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" {...p} />;
      case 'scale':
        return (
          <>
            <Rect x={3} y={4} width={18} height={16} rx={4} {...p} />
            <Path d="M8 9a5 5 0 018 0M12 9l1.5-2" {...p} />
          </>
        );
      case 'copy':
        return (
          <>
            <Rect x={8} y={8} width={12} height={12} rx={2} {...p} />
            <Path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" {...p} />
          </>
        );
      case 'cart':
        return (
          <>
            <Path d="M3 4h2l2.5 11h11L21 8H6.5" {...p} />
            <Circle cx={9} cy={19} r={1.5} {...p} />
            <Circle cx={17} cy={19} r={1.5} {...p} />
          </>
        );
    }
  };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      {body()}
    </Svg>
  );
}
