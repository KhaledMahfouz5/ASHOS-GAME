import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import rawColors from '@/constants/colors';

export type EnemyKind = 'magma' | 'bat' | 'mimic';
const colors = rawColors.light;

export function EnemyArt({ kind }: { kind: EnemyKind }) {
  if (kind === 'bat') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 52 44" preserveAspectRatio="none">
        <Path d="M26 19C17 8 11 11 3 5L8 26L2 33L16 30L26 39L36 30L50 33L44 25L49 8C41 13 35 9 26 19Z" fill={colors.violetLight} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
        <Ellipse cx="26" cy="25" rx="11" ry="14" fill={colors.violet} stroke={colors.ink} strokeWidth="3" />
        <Ellipse cx="21" cy="23" rx="3" ry="4" fill={colors.gold} />
        <Ellipse cx="31" cy="23" rx="3" ry="4" fill={colors.gold} />
        <Path d="M22 32L26 36L30 32" fill="none" stroke={colors.paper} strokeWidth="2.5" strokeLinecap="round" />
      </Svg>
    );
  }

  if (kind === 'mimic') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 52 44" preserveAspectRatio="none">
        <Path d="M8 34L10 18L17 12L22 17L27 7L32 17L38 12L44 20L43 35L36 40L15 40Z" fill={colors.sky} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
        <Path d="M11 18L5 8L20 15M41 18L47 7L33 15" fill={colors.lime} stroke={colors.ink} strokeWidth="3" strokeLinejoin="round" />
        <Circle cx="20" cy="25" r="3" fill={colors.ink} />
        <Circle cx="33" cy="25" r="3" fill={colors.ink} />
        <Path d="M19 32L23 29L26 33L30 29L34 32" fill="none" stroke={colors.danger} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width="100%" height="100%" viewBox="0 0 52 44" preserveAspectRatio="none">
      <Path d="M7 39C4 31 7 26 10 22L12 10L20 17L26 4L32 17L40 10L42 22C47 27 48 33 45 39Z" fill={colors.coral} stroke={colors.ink} strokeWidth="3.5" strokeLinejoin="round" />
      <Path d="M12 14L18 19M40 14L34 19" stroke={colors.gold} strokeWidth="4" strokeLinecap="round" />
      <Ellipse cx="20" cy="27" rx="4" ry="5" fill={colors.paper} />
      <Ellipse cx="33" cy="27" rx="4" ry="5" fill={colors.paper} />
      <Circle cx="21" cy="28" r="2" fill={colors.ink} />
      <Circle cx="32" cy="28" r="2" fill={colors.ink} />
      <Path d="M19 36L24 33L28 37L33 34" fill="none" stroke={colors.ink} strokeWidth="3" strokeLinecap="round" />
    </Svg>
  );
}
