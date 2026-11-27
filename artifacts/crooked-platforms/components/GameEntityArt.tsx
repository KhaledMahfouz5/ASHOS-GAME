import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import rawColors from '@/constants/colors';

export type EnemyKind = 'magma' | 'bat' | 'mimic';
export type BossKind =
  | 'ember'
  | 'bat'
  | 'thorn'
  | 'crystal'
  | 'storm'
  | 'mire'
  | 'void'
  | 'gear'
  | 'sun'
  | 'final'
  | 'agent'
  | 'soldier'
  | 'chaosRobot';

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

const bossPalettes: Record<BossKind, { body: string; accent: string }> = {
  ember: { body: colors.coral, accent: colors.gold },
  bat: { body: colors.violet, accent: colors.sky },
  thorn: { body: colors.sky, accent: colors.lime },
  crystal: { body: colors.violetLight, accent: colors.paper },
  storm: { body: colors.violet, accent: colors.gold },
  mire: { body: colors.lime, accent: colors.coral },
  void: { body: colors.midnight, accent: colors.violetLight },
  gear: { body: colors.coral, accent: colors.gold },
  sun: { body: colors.gold, accent: colors.coral },
  final: { body: colors.danger, accent: colors.gold },
  agent: { body: colors.ink, accent: colors.sky },
  soldier: { body: colors.midnight, accent: colors.coral },
  chaosRobot: { body: colors.midnight, accent: colors.violetLight },
};

export function BossArt({ kind, evolved = false }: { kind: BossKind; evolved?: boolean }) {
  if (kind === 'agent') {
    return (
      <Image
        source={require('../assets/characters/secret-agent-boss.jpg')}
        style={{ width: '100%', height: '100%', borderRadius: 12, borderWidth: 3, borderColor: colors.ink }}
        resizeMode="cover"
        accessibilityLabel="العميل السري"
      />
    );
  }
  if (kind === 'soldier') {
    return (
      <Image
        source={require('../assets/characters/battlefield-boss.jpg')}
        style={{ width: '100%', height: '100%', borderRadius: 12, borderWidth: 3, borderColor: colors.ink }}
        resizeMode="cover"
        accessibilityLabel="الجندي المدجّج"
      />
    );
  }
  if (kind === 'chaosRobot') {
    return (
      <Image
        source={
          evolved
            ? require('../assets/characters/chaos-robot-evolved.jpg')
            : require('../assets/characters/chaos-robot-boss.jpg')
        }
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 12,
          borderWidth: 3,
          borderColor: evolved ? colors.violetLight : colors.ink,
        }}
        resizeMode="cover"
        accessibilityLabel={evolved ? 'روبوت الفوضى المتطور' : 'روبوت الفوضى'}
      />
    );
  }

  const palette = bossPalettes[kind];
  const bodyPath = kind === 'crystal'
    ? 'M12 94L16 53L31 17L46 40L60 5L76 41L96 13L108 53L104 94Z'
    : kind === 'bat'
      ? 'M12 49L3 25L24 42L39 13L58 39L81 13L98 42L117 25L107 57L103 94L16 94Z'
      : 'M14 95L10 58L20 24L34 34L45 8L58 30L75 7L84 34L104 20L112 59L104 95Z';

  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 100" preserveAspectRatio="none">
      {kind === 'sun' && (
        <Path d="M17 34L7 16L29 25L31 5L47 23L60 3L72 23L91 6L91 27L113 17L102 40Z" fill={palette.accent} stroke={colors.ink} strokeWidth="4" strokeLinejoin="round" />
      )}
      {kind === 'bat' && (
        <Path d="M23 47L3 30L8 58L2 73L28 67M97 47L117 30L112 58L118 73L92 67Z" fill={palette.accent} stroke={colors.ink} strokeWidth="5" strokeLinejoin="round" />
      )}
      {kind === 'thorn' && (
        <Path d="M18 42L12 8L34 34L45 2L58 31L76 3L84 36L108 10L100 49Z" fill={palette.accent} stroke={colors.ink} strokeWidth="4" strokeLinejoin="round" />
      )}
      {kind === 'storm' && (
        <Path d="M64 28L47 53L62 52L51 77L79 45L64 47L76 28Z" fill={palette.accent} stroke={colors.ink} strokeWidth="3" strokeLinejoin="round" />
      )}
      {kind === 'gear' && (
        <>
          <Circle cx="15" cy="61" r="12" fill={palette.accent} stroke={colors.ink} strokeWidth="4" />
          <Circle cx="105" cy="61" r="12" fill={palette.accent} stroke={colors.ink} strokeWidth="4" />
          <Circle cx="15" cy="61" r="4" fill={colors.ink} />
          <Circle cx="105" cy="61" r="4" fill={colors.ink} />
        </>
      )}
      <Path d={bodyPath} fill={palette.body} stroke={colors.ink} strokeWidth="6" strokeLinejoin="round" />
      {(kind === 'ember' || kind === 'final') && (
        <Path d="M29 25L22 5L41 22M77 23L91 3L92 30" fill="none" stroke={palette.accent} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {kind === 'crystal' && (
        <Path d="M58 26L51 39L60 47L68 38Z" fill={palette.accent} stroke={colors.ink} strokeWidth="3" />
      )}
      {kind === 'mire' && (
        <Path d="M26 81C20 91 27 97 31 86M88 79C83 92 92 98 96 84" fill="none" stroke={palette.accent} strokeWidth="7" strokeLinecap="round" />
      )}
      {kind === 'void' && <Circle cx="60" cy="58" r="8" fill={palette.accent} stroke={colors.ink} strokeWidth="3" />}
      <Ellipse cx="42" cy="53" rx="11" ry="14" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
      <Ellipse cx="80" cy="53" rx="11" ry="14" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
      <Circle cx="45" cy="56" r="5" fill={colors.ink} />
      <Circle cx="77" cy="56" r="5" fill={colors.ink} />
      <Path d="M39 75L49 85L59 75L70 85L82 73" fill="none" stroke={palette.accent} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {kind === 'final' && (
        <Path d="M48 17L53 8L58 17L63 8L68 17" fill="none" stroke={colors.paper} strokeWidth="4" strokeLinecap="round" />
      )}
      <Path d="M23 91L19 99M99 91L103 99" stroke={colors.ink} strokeWidth="7" strokeLinecap="round" />
    </Svg>
  );
}
