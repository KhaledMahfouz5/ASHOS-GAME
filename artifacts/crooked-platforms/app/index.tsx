import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
} from 'react-native-svg';
import rawColors from '@/constants/colors';

const colors = rawColors.light;

type Mode = 'menu' | 'wardrobe' | 'playing' | 'lost' | 'won';
type SkinId = 'starter' | 'ember' | 'ocean' | 'royal' | 'sun' | 'ghost';

type SkinDefinition = {
  id: SkinId;
  name: string;
  price: number;
  body: string;
  accent: string;
};

type PlayerProfile = {
  coins: number;
  unlockedSkins: SkinId[];
  equippedSkin: SkinId;
  unlockedStage: number;
};

type PlatformPiece = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

type Hazard = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'teeth' | 'blob';
};

type Coin = {
  id: string;
  x: number;
  y: number;
  letter: string;
};

type Boss = {
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
};

type GameSnapshot = {
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  elapsed: number;
  bossHealth: number;
};

type GameRuntime = GameSnapshot & {
  vx: number;
  lastTime: number;
};

const initialSnapshot: GameSnapshot = {
  x: 22,
  y: 0,
  vy: 0,
  grounded: false,
  elapsed: 0,
  bossHealth: 0,
};

const skins: SkinDefinition[] = [
  { id: 'starter', name: 'الأساسي', price: 0, body: colors.lime, accent: colors.coral },
  { id: 'ember', name: 'الشرارة', price: 20, body: colors.coral, accent: colors.gold },
  { id: 'ocean', name: 'المحيط', price: 45, body: colors.sky, accent: colors.violet },
  { id: 'royal', name: 'الملكي', price: 75, body: colors.violetLight, accent: colors.lime },
  { id: 'sun', name: 'الشمس', price: 110, body: colors.gold, accent: colors.coral },
  { id: 'ghost', name: 'الشبح', price: 160, body: colors.paper, accent: colors.sky },
];

const defaultProfile: PlayerProfile = {
  coins: 0,
  unlockedSkins: ['starter'],
  equippedSkin: 'starter',
  unlockedStage: 1,
};

const PROFILE_STORAGE_KEY = 'ashos-game-player-profile-v1';

function CreatureArt({ compact = false, skinId = 'starter' }: { compact?: boolean; skinId?: SkinId }) {
  const size = compact ? 74 : 164;
  const skin = skins.find((item) => item.id === skinId) ?? skins[0];
  return (
    <Svg width={size} height={size} viewBox="0 0 164 164">
      <G transform="rotate(-8 82 82)">
        <Path
          d="M43 45C45 24 62 18 74 29C86 13 109 19 111 43C137 43 147 64 135 82C148 100 132 125 108 119C98 141 68 143 56 122C30 127 14 104 29 84C13 65 24 47 43 45Z"
          fill={skin.body}
          stroke={colors.ink}
          strokeWidth="7"
        />
        <Path d="M49 40L39 20L62 32Z" fill={skin.accent} stroke={colors.ink} strokeWidth="6" />
        <Path d="M103 36L119 18L121 47Z" fill={skin.accent} stroke={colors.ink} strokeWidth="6" />
        <Ellipse cx="65" cy="71" rx="15" ry="20" fill={colors.paper} stroke={colors.ink} strokeWidth="6" />
        <Circle cx="67" cy="77" r="7" fill={colors.ink} />
        <Ellipse cx="107" cy="66" rx="12" ry="16" fill={skin.accent} stroke={colors.ink} strokeWidth="6" />
        <Circle cx="110" cy="68" r="5" fill={colors.paper} />
        <Path
          d="M57 99C70 111 95 115 114 98"
          fill="none"
          stroke={colors.ink}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <Path d="M71 105L75 116L82 106L90 117L96 104" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
        <Path d="M48 130L42 150M111 126L119 147" stroke={colors.ink} strokeWidth="8" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

function DoorArt() {
  return (
    <Svg width={50} height={66} viewBox="0 0 50 66">
      <Path d="M6 63V15C6 7 13 3 25 3S44 7 44 15V63" fill={colors.coral} stroke={colors.ink} strokeWidth="5" />
      <Path d="M15 63V18C15 13 19 10 25 10S35 13 35 18V63" fill={colors.violet} stroke={colors.ink} strokeWidth="4" />
      <Circle cx="29" cy="39" r="3" fill={colors.lime} />
      <Path d="M8 63H42" stroke={colors.ink} strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}

function BossArt() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 100" preserveAspectRatio="none">
      <Path d="M14 95L10 58L20 24L34 34L45 8L58 30L75 7L84 34L104 20L112 59L104 95Z" fill={colors.danger} stroke={colors.ink} strokeWidth="6" />
      <Ellipse cx="43" cy="51" rx="11" ry="14" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
      <Ellipse cx="80" cy="51" rx="11" ry="14" fill={colors.paper} stroke={colors.ink} strokeWidth="5" />
      <Circle cx="46" cy="54" r="5" fill={colors.ink} />
      <Circle cx="77" cy="54" r="5" fill={colors.ink} />
      <Path d="M39 73L49 84L59 73L70 84L81 72" fill="none" stroke={colors.paper} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M23 91L19 99M99 91L103 99" stroke={colors.ink} strokeWidth="7" strokeLinecap="round" />
    </Svg>
  );
}

function TrapArt({ kind }: { kind: Hazard['kind'] }) {
  if (kind === 'blob') {
    return (
      <Svg width="100%" height="100%" viewBox="0 0 80 42" preserveAspectRatio="none">
        <Path d="M2 40C4 19 13 28 18 12C23 29 32 14 39 5C45 25 55 14 60 25C67 7 72 21 78 6V42H2Z" fill={colors.danger} stroke={colors.ink} strokeWidth="4" />
        <Circle cx="29" cy="29" r="3" fill={colors.paper} />
        <Circle cx="54" cy="27" r="3" fill={colors.paper} />
      </Svg>
    );
  }
  return (
    <Svg width="100%" height="100%" viewBox="0 0 80 42" preserveAspectRatio="none">
      <Path d="M3 39L13 8L23 39L33 8L43 39L53 8L63 39L73 8L78 39Z" fill={colors.paper} stroke={colors.ink} strokeWidth="4" />
    </Svg>
  );
}

function MusicToggle({
  enabled,
  onPress,
  testID,
}: {
  enabled: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={enabled ? 'كتم الموسيقى' : 'تشغيل الموسيقى'}
      onPress={onPress}
      style={({ pressed }) => [
        styles.musicToggle,
        enabled && styles.musicToggleActive,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={styles.musicToggleText}>{enabled ? '♫' : '×'}</Text>
    </Pressable>
  );
}

const MAX_STAGES = 500;
const BOSS_INTERVAL = 50;

const playerRanks = [
  { name: 'مبتدئ', start: 1, end: 24, color: colors.sky },
  { name: 'مغامر', start: 25, end: 74, color: colors.lime },
  { name: 'متحدّي الزعماء', start: 75, end: 149, color: colors.gold },
  { name: 'محترف', start: 150, end: 249, color: colors.coral },
  { name: 'أسطورة', start: 250, end: 399, color: colors.violetLight },
  { name: 'بطل آشش', start: 400, end: MAX_STAGES, color: colors.gold },
];

function getPlayerRank(stage: number) {
  const safeStage = Math.max(1, Math.min(MAX_STAGES, Math.floor(stage)));
  const rank = [...playerRanks].reverse().find((item) => safeStage >= item.start) ?? playerRanks[0];
  const progress = rank.end === rank.start ? 1 : (safeStage - rank.start) / (rank.end - rank.start);
  return { ...rank, progress };
}

type StageBackdropTheme = {
  name: string;
  skyTop: string;
  skyBottom: string;
  skyAlt: string;
  distant: string;
  near: string;
  accent: string;
  alternate: string;
  orb: string;
};

const stageBackdropThemes: StageBackdropTheme[] = [
  { name: 'حدائق الليمون', skyTop: colors.sky, skyBottom: colors.violet, skyAlt: colors.violetLight, distant: colors.violetLight, near: colors.violet, accent: colors.lime, alternate: colors.coral, orb: colors.gold },
  { name: 'الكثبان المرجانية', skyTop: colors.coral, skyBottom: colors.violet, skyAlt: colors.gold, distant: colors.danger, near: colors.coral, accent: colors.gold, alternate: colors.paper, orb: colors.lime },
  { name: 'جزر النجوم', skyTop: colors.midnight, skyBottom: colors.violet, skyAlt: colors.ink, distant: colors.violet, near: colors.ink, accent: colors.sky, alternate: colors.coral, orb: colors.gold },
  { name: 'القمم الجليدية', skyTop: colors.paper, skyBottom: colors.sky, skyAlt: colors.violetLight, distant: colors.sky, near: colors.violetLight, accent: colors.violet, alternate: colors.lime, orb: colors.paper },
  { name: 'حديقة اليشم', skyTop: colors.lime, skyBottom: colors.sky, skyAlt: colors.violetLight, distant: colors.sky, near: colors.violet, accent: colors.paper, alternate: colors.coral, orb: colors.gold },
  { name: 'حافة الجمر', skyTop: colors.danger, skyBottom: colors.coral, skyAlt: colors.midnight, distant: colors.coral, near: colors.midnight, accent: colors.gold, alternate: colors.lime, orb: colors.paper },
  { name: 'الكهف الملكي', skyTop: colors.violetLight, skyBottom: colors.violet, skyAlt: colors.midnight, distant: colors.midnight, near: colors.ink, accent: colors.coral, alternate: colors.gold, orb: colors.sky },
  { name: 'بحر الغيوم', skyTop: colors.paper, skyBottom: colors.sky, skyAlt: colors.violet, distant: colors.sky, near: colors.violetLight, accent: colors.violet, alternate: colors.coral, orb: colors.gold },
  { name: 'مدينة النيون', skyTop: colors.ink, skyBottom: colors.midnight, skyAlt: colors.violet, distant: colors.violet, near: colors.ink, accent: colors.lime, alternate: colors.sky, orb: colors.coral },
  { name: 'الصدع الأخير', skyTop: colors.midnight, skyBottom: colors.danger, skyAlt: colors.violet, distant: colors.violet, near: colors.ink, accent: colors.gold, alternate: colors.lime, orb: colors.coral },
];

const StageBackdrop = React.memo(function StageBackdrop({
  stage,
  width,
  height,
}: {
  stage: number;
  width: number;
  height: number;
}) {
  const themeIndex = Math.floor((stage - 1) / BOSS_INTERVAL) % stageBackdropThemes.length;
  const theme = stageBackdropThemes[themeIndex];
  const stagePhase = Math.floor(((stage - 1) % BOSS_INTERVAL) / 10);
  const stageSkyTops = [theme.skyTop, theme.skyAlt, theme.skyBottom, theme.skyAlt, theme.skyTop];
  const stageSkyBottoms = [theme.skyBottom, theme.skyTop, theme.skyAlt, theme.skyBottom, theme.skyAlt];
  const isBossStage = stage % BOSS_INTERVAL === 0;
  const isFinalStage = stage === MAX_STAGES;
  const skyTop = isFinalStage ? colors.ink : isBossStage ? colors.midnight : stageSkyTops[stagePhase];
  const skyBottom = isFinalStage ? colors.midnight : isBossStage ? colors.violet : stageSkyBottoms[stagePhase];
  const accent = isFinalStage ? colors.gold : isBossStage ? colors.coral : stagePhase % 2 ? theme.alternate : theme.accent;
  const orb = isFinalStage ? colors.coral : isBossStage ? colors.danger : stagePhase % 3 === 1 ? theme.accent : theme.orb;
  const distant = isFinalStage ? colors.danger : isBossStage ? colors.violet : theme.distant;
  const near = isFinalStage || isBossStage ? colors.ink : theme.near;
  const pulse = useSharedValue(0);
  const cometTravel = useSharedValue(0);
  const pulseRange = isBossStage ? 0.3 : 0.12;
  const pulseDuration = isFinalStage ? 360 : isBossStage ? 560 : 1450;
  const cometDuration = isFinalStage ? 820 : isBossStage ? 1250 : 3000;

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: pulseDuration, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    cometTravel.value = withRepeat(
      withTiming(width + 184, { duration: cometDuration, easing: Easing.linear }),
      -1,
      false,
    );
  }, [cometDuration, cometTravel, pulse, pulseDuration, width]);

  const orbPulseStyle = useAnimatedStyle(() => ({
    opacity: 0.68 + pulse.value * 0.28,
    transform: [{ scale: 1 + pulse.value * pulseRange }],
  }));
  const cometStyle = useAnimatedStyle(() => ({
    opacity: 0.42 + pulse.value * 0.45,
    transform: [{ translateX: cometTravel.value }, { rotateZ: '-18deg' }],
  }));

  let seed = (Math.imul(stage, 1103515245) + 12345) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const particleCount = 13 + (stage % 6);
  const particles = Array.from({ length: particleCount }, (_, index) => ({
    id: `stage-${stage}-particle-${index}`,
    x: random() * width,
    y: random() * height * 0.56,
    radius: 1 + random() * 2.4,
    opacity: 0.18 + random() * 0.38,
  }));
  const peakCount = 6;
  const peaks = Array.from({ length: peakCount + 1 }, (_, index) => ({
    x: (index / peakCount) * width,
    y: height * (0.59 + random() * 0.1),
  }));
  const ridgePath = [
    `M 0 ${height}`,
    `L 0 ${peaks[0].y}`,
    ...peaks.slice(1).map((peak) => `L ${peak.x} ${peak.y}`),
    `L ${width} ${height} Z`,
  ].join(' ');
  const duneY = height * (0.76 + random() * 0.035);
  const duneLift = height * (0.035 + random() * 0.035);
  const foregroundPath = [
    `M 0 ${height}`,
    `L 0 ${duneY}`,
    `C ${width * 0.18} ${duneY - duneLift} ${width * 0.28} ${duneY + duneLift} ${width * 0.48} ${duneY}`,
    `S ${width * 0.78} ${duneY - duneLift} ${width} ${duneY + duneLift * 0.25}`,
    `L ${width} ${height} Z`,
  ].join(' ');
  const orbX = width * (0.2 + random() * 0.58);
  const orbY = height * (0.2 + random() * 0.13);
  const orbRadius = Math.min(width, height) * (0.07 + random() * 0.025);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={[skyTop, skyBottom]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        {particles.map((particle) => (
          <Circle
            key={particle.id}
            cx={particle.x}
            cy={particle.y}
            r={particle.radius}
            fill={accent}
            opacity={particle.opacity}
          />
        ))}
        <Ellipse
          cx={orbX}
          cy={orbY}
          rx={orbRadius * 1.65}
          ry={orbRadius * 0.4}
          fill="none"
          stroke={accent}
          strokeWidth={2}
          opacity={0.46}
          transform={`rotate(-18 ${orbX} ${orbY})`}
        />
        <Path d={ridgePath} fill={distant} opacity={0.36} />
        <Path d={foregroundPath} fill={near} opacity={0.32} />
        {peaks.slice(1, -1).map((peak, index) => (
          <Circle
            key={`stage-${stage}-landmark-${index}`}
            cx={peak.x}
            cy={peak.y + height * (0.06 + random() * 0.03)}
            r={3 + random() * 7}
            fill={accent}
            opacity={0.2}
          />
        ))}
      </Svg>
      <Animated.View
        style={[
          styles.backdropOrb,
          {
            left: orbX - orbRadius,
            top: orbY - orbRadius,
            width: orbRadius * 2,
            height: orbRadius * 2,
            backgroundColor: orb,
            borderColor: accent,
          },
          orbPulseStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.backdropComet,
          {
            left: -92,
            top: height * (isBossStage ? 0.47 : 0.43),
            width: isBossStage ? 96 : 70,
            height: isBossStage ? 4 : 3,
            backgroundColor: accent,
          },
          cometStyle,
        ]}
      />
      {isBossStage && (
        <Animated.View
          style={[
            styles.backdropComet,
            {
              left: -142,
              top: height * 0.54,
              width: 42,
              height: 2,
              backgroundColor: colors.gold,
            },
            cometStyle,
          ]}
        />
      )}
    </View>
  );
});

function makeLevel(width: number, height: number, stage: number) {
  const floorY = height - 48;
  const difficulty = Math.max(0, Math.min(1, (stage - 1) / (MAX_STAGES - 1)));
  const worldWidth = width * (7.4 + difficulty * 2.6);
  const bossTier = stage % BOSS_INTERVAL === 0 ? stage / BOSS_INTERVAL : 0;
  const bossHealth = bossTier > 0 ? bossTier + 2 : 0;
  const bossWidth = bossTier > 0
    ? Math.min(116 + (bossTier - 1) * 6, width * 0.42)
    : 0;
  let seed = (Math.imul(stage, 2654435761) + 1013904223) >>> 0;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const boss: Boss | null = bossTier > 0
    ? {
        x: worldWidth - width * 1.55,
        y: floorY - 88,
        width: bossWidth,
        height: 88,
        health: bossHealth,
      }
    : null;
  const goalX = worldWidth - width * 0.48;
  const lastObstacleX = boss ? boss.x - width * 0.8 : goalX - width * 0.52;
  const obstacleCount = Math.min(18, 5 + Math.floor(difficulty * 13));
  const firstObstacleX = width * 0.88;
  const spacing = (lastObstacleX - firstObstacleX) / Math.max(1, obstacleCount);
  const pits: Array<{ start: number; end: number }> = [];
  const hazards: Hazard[] = [];
  const coins: Coin[] = [];
  const hazardPool: Hazard['kind'][] = ['teeth', 'blob'];

  for (let index = 0; index < obstacleCount; index += 1) {
    const baseX = firstObstacleX + spacing * index;
    const obstacleX = baseX + (random() - 0.5) * spacing * 0.42;
    const obstacleChoice = random();
    const obstacleWidth = 42 + random() * (20 + difficulty * 30);
    if (obstacleChoice < 0.2) {
      const pitWidth = 42 + random() * (16 + difficulty * 28);
      pits.push({ start: obstacleX, end: obstacleX + pitWidth });
    } else {
      const kind = hazardPool[Math.floor(random() * hazardPool.length)];
      hazards.push({
        id: `stage-${stage}-hazard-${index}`,
        x: obstacleX,
        y: floorY - (kind === 'teeth' ? 39 : 42),
        width: obstacleWidth,
        height: kind === 'teeth' ? 39 : 42,
        kind,
      });
    }
    if (index % 2 === 0 || random() > 0.4) {
      coins.push({
        id: `stage-${stage}-coin-${index}`,
        x: Math.max(width * 0.5, obstacleX - width * (0.22 + random() * 0.2)),
        y: floorY - (random() > 0.68 ? 82 : 42),
        letter: 'ASHOS'[index % 5],
      });
    }
  }
  pits.sort((a, b) => a.start - b.start);
  const platforms: PlatformPiece[] = [];
  let cursor = 0;
  pits.forEach((pit, index) => {
    const pitStart = Math.max(cursor + 35, pit.start);
    const pitEnd = Math.min(worldWidth - width * 0.7, pit.end);
    if (pitStart > cursor + 18) {
      platforms.push({
        id: `stage-${stage}-track-${index}`,
        x: cursor,
        y: floorY,
        width: pitStart - cursor,
        height: 48,
      });
    }
    cursor = Math.max(cursor, pitEnd);
  });
  if (cursor < worldWidth) {
    platforms.push({
      id: `stage-${stage}-track-finish`,
      x: cursor,
      y: floorY,
      width: worldWidth - cursor,
      height: 48,
    });
  }

  return {
    platforms,
    hazards,
    coins,
    boss,
    worldWidth,
    goalX,
    goalY: floorY,
  };
}

function overlaps(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const window = Dimensions.get('window');
  const musicPlayer = useAudioPlayer(require('../assets/audio/ashos-arcade-loop.wav'));
  const [mode, setMode] = useState<Mode>('menu');
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [best, setBest] = useState(0);
  const [stage, setStage] = useState(1);
  const [profile, setProfile] = useState<PlayerProfile>(defaultProfile);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initialSnapshot);
  const [gameSize, setGameSize] = useState({
    width: Math.min(window.width, 430),
    height: Math.max(540, window.height - insets.top - insets.bottom - 20),
  });
  const resultEntrance = useSharedValue(0);
  const resultWiggle = useSharedValue(0);
  const runtime = useRef<GameRuntime>({ ...initialSnapshot, vx: 0, lastTime: 0 });
  const controls = useRef({ left: false, right: false, jump: false });
  const profileRef = useRef<PlayerProfile>(defaultProfile);
  const collectedCoins = useRef<Set<string>>(new Set());
  const animation = useRef<number | null>(null);
  const running = useRef(false);
  const resultCardAnimation = useAnimatedStyle(() => ({
    opacity: resultEntrance.value,
    transform: [
      { translateY: 22 * (1 - resultEntrance.value) },
      { scale: 0.94 + resultEntrance.value * 0.06 },
    ],
  }));
  const resultCharacterAnimation = useAnimatedStyle(() => ({
    transform: [
      { translateY: mode === 'won' ? -13 * Math.abs(resultWiggle.value) : 3 * Math.abs(resultWiggle.value) },
      { rotateZ: `${mode === 'lost' ? resultWiggle.value * 9 : 0}deg` },
      { scale: mode === 'won' ? 1 + Math.abs(resultWiggle.value) * 0.08 : 1 },
    ],
  }));

  useEffect(() => {
    musicPlayer.loop = true;
    musicPlayer.volume = 0.38;
    if ((mode !== 'playing' || !musicEnabled) && musicPlayer.playing) {
      musicPlayer.pause();
    }
  }, [mode, musicEnabled, musicPlayer]);

  useEffect(() => {
    if (mode === 'won') {
      resultEntrance.value = withSpring(1, { damping: 16, stiffness: 175 });
      resultWiggle.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 170 }),
          withTiming(0, { duration: 170 }),
        ),
        2,
        false,
      );
    } else if (mode === 'lost') {
      resultEntrance.value = withSpring(1, { damping: 18, stiffness: 195 });
      resultWiggle.value = withSequence(
        withTiming(1, { duration: 65 }),
        withTiming(-1, { duration: 80 }),
        withTiming(0.6, { duration: 65 }),
        withTiming(0, { duration: 120 }),
      );
    } else {
      resultEntrance.value = 0;
      resultWiggle.value = 0;
    }
  }, [mode, resultEntrance, resultWiggle]);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
        if (!stored) return;
        const saved = JSON.parse(stored) as Partial<PlayerProfile>;
        const unlockedSkins = Array.isArray(saved.unlockedSkins)
          ? saved.unlockedSkins.filter((id): id is SkinId => skins.some((skin) => skin.id === id))
          : [];
        if (!unlockedSkins.includes('starter')) unlockedSkins.unshift('starter');
        const requestedSkin = skins.find((skin) => skin.id === saved.equippedSkin)?.id ?? 'starter';
        const nextProfile: PlayerProfile = {
          coins: typeof saved.coins === 'number' && Number.isFinite(saved.coins) ? Math.max(0, Math.floor(saved.coins)) : 0,
          unlockedSkins,
          equippedSkin: unlockedSkins.includes(requestedSkin) ? requestedSkin : 'starter',
          unlockedStage: typeof saved.unlockedStage === 'number' && Number.isFinite(saved.unlockedStage)
            ? Math.max(1, Math.min(MAX_STAGES, Math.floor(saved.unlockedStage)))
            : 1,
        };
        if (active) {
          profileRef.current = nextProfile;
          setProfile(nextProfile);
        }
      } catch (error) {
        console.warn('Could not load ASHOS GAME player profile.', error);
      } finally {
        if (active) setProfileLoaded(true);
      }
    };
    void loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const saveProfile = useCallback((nextProfile: PlayerProfile) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
    void AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextProfile)).catch((error) => {
      console.warn('Could not save ASHOS GAME player profile.', error);
    });
  }, []);

  useEffect(() => {
    const width = Math.min(window.width, 430);
    const height = Math.max(540, window.height - insets.top - insets.bottom - 20);
    setGameSize({ width, height });
  }, [insets.bottom, insets.top, window.height, window.width]);

  const level = useMemo(
    () => makeLevel(gameSize.width, gameSize.height, stage),
    [gameSize.height, gameSize.width, stage],
  );

  const resetGame = useCallback((nextStage: number) => {
    const nextLevel = makeLevel(gameSize.width, gameSize.height, nextStage);
    const next = {
      ...initialSnapshot,
      y: nextLevel.platforms[0].y - 36,
      bossHealth: nextLevel.boss?.health ?? 0,
    };
    runtime.current = { ...next, vx: 0, lastTime: 0 };
    setSnapshot(next);
  }, [gameSize.height, gameSize.width]);

  const launchStage = useCallback((nextStage: number) => {
    const safeStage = Math.max(1, Math.min(MAX_STAGES, nextStage));
    setStage(safeStage);
    resetGame(safeStage);
    collectedCoins.current = new Set();
    controls.current = { left: false, right: false, jump: false };
    running.current = true;
    setMode('playing');
    if (musicEnabled) {
      musicPlayer.loop = true;
      musicPlayer.volume = 0.38;
      musicPlayer.play();
    } else {
      musicPlayer.pause();
    }
  }, [musicEnabled, musicPlayer, resetGame]);

  const finishRun = useCallback(
    async (nextMode: Exclude<Mode, 'menu' | 'playing'>) => {
      if (!running.current) return;
      running.current = false;
      if (animation.current) cancelAnimationFrame(animation.current);
      setMode(nextMode);
      if (nextMode === 'won') {
        const currentProfile = profileRef.current;
        saveProfile({
          ...currentProfile,
          unlockedStage: Math.max(currentProfile.unlockedStage, Math.min(MAX_STAGES, stage + 1)),
        });
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBest((current) => Math.max(current, Math.max(1, Math.round(runtime.current.elapsed / 100) / 10)));
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [saveProfile, stage],
  );

  const startGame = useCallback(() => {
    launchStage(profileRef.current.unlockedStage);
  }, [launchStage]);

  const advanceStage = useCallback(() => {
    launchStage(Math.min(MAX_STAGES, stage + 1));
  }, [launchStage, stage]);

  const retryStage = useCallback(() => {
    launchStage(stage);
  }, [launchStage, stage]);

  const startFromBeginning = useCallback(() => {
    launchStage(1);
  }, [launchStage]);

  const toggleMusic = useCallback(() => {
    const nextEnabled = !musicEnabled;
    setMusicEnabled(nextEnabled);
    if (nextEnabled && mode === 'playing') {
      musicPlayer.loop = true;
      musicPlayer.volume = 0.38;
      musicPlayer.play();
    } else {
      musicPlayer.pause();
    }
    void Haptics.selectionAsync();
  }, [mode, musicEnabled, musicPlayer]);

  const chooseSkin = useCallback((skin: SkinDefinition) => {
    const currentProfile = profileRef.current;
    if (currentProfile.unlockedSkins.includes(skin.id)) {
      saveProfile({ ...currentProfile, equippedSkin: skin.id });
      void Haptics.selectionAsync();
      return;
    }
    if (currentProfile.coins < skin.price) {
      Alert.alert('العملات ما بتكفي', `بدك ${skin.price - currentProfile.coins} عملة زيادة لتفتح هالسكن.`);
      return;
    }
    saveProfile({
      ...currentProfile,
      coins: currentProfile.coins - skin.price,
      unlockedSkins: [...currentProfile.unlockedSkins, skin.id],
      equippedSkin: skin.id,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [saveProfile]);

  useEffect(() => {
    if (mode !== 'playing') return;
    running.current = true;
    const playerWidth = 31;
    const playerHeight = 36;
    const stageProgress = Math.max(0, Math.min(1, (stage - 1) / (MAX_STAGES - 1)));
    const moveSpeed = 205 + stageProgress * 42;
    const step = (time: number) => {
      if (!running.current) return;
      const current = runtime.current;
      const delta = current.lastTime ? Math.min((time - current.lastTime) / 1000, 0.032) : 0.016;
      current.lastTime = time;
      current.elapsed += delta * 1000;
      const direction = (controls.current.right ? 1 : 0) - (controls.current.left ? 1 : 0);
      current.vx = direction * moveSpeed;
      current.x = Math.max(0, Math.min(level.worldWidth - playerWidth, current.x + current.vx * delta));
      if (controls.current.jump && current.grounded) {
        current.vy = -450;
        current.grounded = false;
        controls.current.jump = false;
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const previousBottom = current.y + playerHeight;
      current.vy += 1100 * delta;
      current.y += current.vy * delta;
      current.grounded = false;

      for (const platform of level.platforms) {
        const isLanding =
          current.vy >= 0 &&
          previousBottom <= platform.y + 8 &&
          current.y + playerHeight >= platform.y &&
          current.x + playerWidth - 5 > platform.x &&
          current.x + 5 < platform.x + platform.width;
        if (isLanding) {
          current.y = platform.y - playerHeight;
          current.vy = 0;
          current.grounded = true;
        }
      }

      for (const coin of level.coins) {
        if (
          !collectedCoins.current.has(coin.id) &&
          overlaps(current.x + 4, current.y + 5, playerWidth - 8, playerHeight - 6, coin.x, coin.y, 28, 28)
        ) {
          collectedCoins.current.add(coin.id);
          const currentProfile = profileRef.current;
          saveProfile({ ...currentProfile, coins: currentProfile.coins + 1 });
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      let bossCollision = false;
      if (level.boss && current.bossHealth > 0) {
        const touchingBoss = overlaps(
          current.x + 4,
          current.y + 5,
          playerWidth - 8,
          playerHeight - 6,
          level.boss.x,
          level.boss.y,
          level.boss.width,
          level.boss.height,
        );
        if (touchingBoss) {
          const stompedBoss = current.vy >= 0 && previousBottom <= level.boss.y + 16;
          if (stompedBoss) {
            current.y = level.boss.y - playerHeight;
            current.vy = -355;
            current.grounded = false;
            current.bossHealth = Math.max(0, current.bossHealth - 1);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          } else {
            bossCollision = true;
          }
        }
      }

      const hitHazard = level.hazards.some((hazard) =>
        overlaps(current.x + 4, current.y + 5, playerWidth - 8, playerHeight - 6, hazard.x, hazard.y + 7, hazard.width, hazard.height - 7),
      );
      const fell = current.y > gameSize.height + 40;
      const reachedGoal = current.x + playerWidth > level.goalX && current.y < level.goalY + 70 && current.y + playerHeight > level.goalY - 30;
      setSnapshot({ ...current });
      if (hitHazard || bossCollision || fell) {
        void finishRun('lost');
        return;
      }
      if (reachedGoal && (!level.boss || current.bossHealth <= 0)) {
        void finishRun('won');
        return;
      }
      animation.current = requestAnimationFrame(step);
    };
    animation.current = requestAnimationFrame(step);
    return () => {
      running.current = false;
      if (animation.current) cancelAnimationFrame(animation.current);
    };
  }, [finishRun, gameSize.height, level, mode, saveProfile]);

  const hold = (key: 'left' | 'right') => ({
    onPressIn: () => {
      controls.current[key] = true;
      void Haptics.selectionAsync();
    },
    onPressOut: () => {
      controls.current[key] = false;
    },
  });

  const jump = () => {
    controls.current.jump = true;
  };
  const playerRank = getPlayerRank(profile.unlockedStage);

  if (mode === 'wardrobe') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.midnight, colors.violet]} style={[styles.wardrobeShell, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
          <View style={styles.wardrobeHeader}>
            <Pressable testID="wardrobe-back" onPress={() => setMode('menu')} style={styles.iconButton}>
              <Text style={styles.iconButtonText}>‹</Text>
            </Pressable>
            <View style={styles.wardrobeTitleBlock}>
              <Text style={styles.wardrobeTitle}>خزانة السكنات</Text>
              <Text style={styles.wardrobeSubtitle}>اختار شكل آشش المفضل عندك</Text>
            </View>
            <View style={styles.walletBadge}>
              <Text style={styles.walletGlyph}>A</Text>
              <Text style={styles.walletCount}>{profile.coins}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.skinGrid} showsVerticalScrollIndicator={false}>
            {skins.map((skin) => {
              const unlocked = profile.unlockedSkins.includes(skin.id);
              const equipped = profile.equippedSkin === skin.id;
              return (
                <View key={skin.id} style={styles.skinCard}>
                  <View style={[styles.skinPreview, { backgroundColor: skin.accent }]}>
                    <CreatureArt compact skinId={skin.id} />
                  </View>
                  <Text style={styles.skinName}>{skin.name}</Text>
                  <Text style={styles.skinCost}>
                    {equipped ? 'مستخدم حالياً' : unlocked ? 'مفتوح' : `${skin.price} عملة`}
                  </Text>
                  <Pressable
                    testID={`skin-${skin.id}`}
                    onPress={() => chooseSkin(skin)}
                    disabled={!profileLoaded}
                    style={({ pressed }) => [
                      styles.skinAction,
                      equipped && styles.skinActionEquipped,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={[styles.skinActionText, equipped && styles.skinActionEquippedText]}>
                      {equipped ? 'مجهّز' : unlocked ? 'اختيار' : 'افتح السكن'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
          <Text style={styles.wardrobeHint}>اجمع العملات بالحروف وافتح سكنات جديدة</Text>
        </LinearGradient>
      </View>
    );
  }

  if (mode === 'menu') {
    return (
      <View style={styles.root}>
        <LinearGradient colors={[colors.midnight, colors.violet]} style={[styles.menu, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.menuHeader}>
            <View style={styles.logoMark}>
              <View style={styles.logoDot} />
              <View style={styles.logoDotSmall} />
            </View>
            <Text style={styles.eyebrow}>PLAYABLE PROTOTYPE / 01</Text>
            <MusicToggle
              enabled={musicEnabled}
              onPress={toggleMusic}
              testID="music-toggle-menu"
            />
            <View style={styles.walletBadge}>
              <Text style={styles.walletGlyph}>A</Text>
              <Text style={styles.walletCount}>{profile.coins}</Text>
            </View>
          </View>
          <View style={styles.hero}>
            <View style={styles.heroHalo} />
            <CreatureArt skinId={profile.equippedSkin} />
            <View style={[styles.heroSpark, styles.sparkOne]} />
            <View style={[styles.heroSpark, styles.sparkTwo]} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>ASHOS{'\n'}GAME</Text>
            <Text style={styles.subtitle}>لعبة منصّات ما بتصدّقها</Text>
            <Text style={styles.description}>
              اجمع العملات، اقفز فوق العوائق، وافتح سكنات جديدة بطريقك للمرحلة 500.
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>500</Text>
              <Text style={styles.statLabel}>مرحلة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statRank}>{playerRank.name}</Text>
              <Text style={styles.statLabel}>تصنيفك المحلي</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>محاولات</Text>
            </View>
          </View>
          <View style={styles.rankProgressTrack}>
            <View
              style={[
                styles.rankProgressFill,
                { width: `${playerRank.progress * 100}%`, backgroundColor: playerRank.color },
              ]}
            />
          </View>
          <View style={styles.menuActions}>
            <Pressable
              testID="start-game"
              disabled={!profileLoaded}
              style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed, !profileLoaded && styles.disabledButton]}
              onPress={startGame}
            >
              <Text style={styles.startButtonText}>
                {!profileLoaded ? 'عم نجهّز...' : profile.unlockedStage > 1 ? `كمّل من المرحلة ${profile.unlockedStage}` : 'إبدأ التجربة'}
              </Text>
              <Text style={styles.startButtonArrow}>↗</Text>
            </Pressable>
            <Pressable testID="open-wardrobe" style={({ pressed }) => [styles.wardrobeButton, pressed && styles.buttonPressed]} onPress={() => setMode('wardrobe')}>
              <Text style={styles.wardrobeButtonGlyph}>✦</Text>
              <Text style={styles.wardrobeButtonText}>السكنات</Text>
            </Pressable>
          </View>
          <Text style={styles.footerHint}>حرّك بإبهامك • الطريق مستقيم بس مو آمن</Text>
        </LinearGradient>
      </View>
    );
  }

  const cameraX = Math.max(0, Math.min(level.worldWidth - gameSize.width, snapshot.x - gameSize.width * 0.28));

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.midnight, colors.violet]} style={[styles.gameShell, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
        <View style={styles.gameTopBar}>
          <Pressable testID="back-to-menu" onPress={() => setMode('menu')} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
          <View style={styles.levelLabel}>
            <Text style={styles.levelKicker}>المرحلة {stage} / {MAX_STAGES}</Text>
            <Text style={styles.levelTitle}>
              {level.boss
                ? snapshot.bossHealth > 0
                  ? `بوس المرحلة ${Math.floor(stage / BOSS_INTERVAL)}`
                  : 'الباب انفتح'
                : stageBackdropThemes[Math.floor((stage - 1) / BOSS_INTERVAL) % stageBackdropThemes.length].name}
            </Text>
          </View>
          <View style={styles.timerPill}>
            <View style={styles.timerDot} />
            <Text style={styles.timerText}>{(snapshot.elapsed / 1000).toFixed(1)}s</Text>
          </View>
          <MusicToggle
            enabled={musicEnabled}
            onPress={toggleMusic}
            testID="music-toggle-game"
          />
        </View>

        <View style={[styles.gameViewport, { width: gameSize.width, height: gameSize.height }]}>
          <StageBackdrop stage={stage} width={gameSize.width} height={gameSize.height} />
          <Text style={[styles.warning, { top: gameSize.height * 0.13 }]}>
            {level.boss
              ? snapshot.bossHealth > 0
                ? `اضربه من فوق • باقي ${snapshot.bossHealth} ضربات`
                : 'انفتح الباب! كمل للنهاية'
              : 'طريق مستقيم... بس العوائق عشوائية'}
          </Text>
          <View style={styles.inGameWallet}>
            <Text style={styles.walletGlyph}>A</Text>
            <Text style={styles.walletCount}>{profile.coins}</Text>
          </View>
          {level.platforms.map((platform) => (
            <View
              key={platform.id}
              style={[
                styles.platform,
                {
                  left: platform.x - cameraX,
                  top: platform.y,
                  width: platform.width,
                  height: platform.height,
                },
              ]}
            />
          ))}
          {level.hazards.map((hazard) => (
            <View key={hazard.id} style={[styles.hazard, { left: hazard.x - cameraX, top: hazard.y, width: hazard.width, height: hazard.height }]}>
              <TrapArt kind={hazard.kind} />
            </View>
          ))}
          {level.coins.map((coin) => (
            !collectedCoins.current.has(coin.id) && (
              <View key={coin.id} style={[styles.coin, { left: coin.x - cameraX, top: coin.y }]}>
                <Text style={styles.coinLetter}>{coin.letter}</Text>
              </View>
            )
          ))}
          {level.boss && snapshot.bossHealth > 0 && (
            <View style={[styles.boss, { left: level.boss.x - cameraX, top: level.boss.y, width: level.boss.width, height: level.boss.height }]}>
              <BossArt />
              <View style={styles.bossHealthTrack}>
                <View style={[styles.bossHealthFill, { width: `${(snapshot.bossHealth / level.boss.health) * 100}%` }]} />
              </View>
            </View>
          )}
          {(!level.boss || snapshot.bossHealth <= 0) && (
            <View style={[styles.door, { left: level.goalX - cameraX, top: level.goalY - 56 }]}>
              <DoorArt />
              <Text style={styles.doorLabel}>اهرب</Text>
            </View>
          )}
          <View style={[styles.player, { left: snapshot.x - cameraX, top: snapshot.y }]}>
            <CreatureArt compact skinId={profile.equippedSkin} />
          </View>
        </View>

        <View style={styles.controls}>
          <View style={styles.directionGroup}>
            <Pressable testID="move-left" {...hold('left')} style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}>
              <Text style={styles.controlArrow}>‹</Text>
            </Pressable>
            <Pressable testID="move-right" {...hold('right')} style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}>
              <Text style={styles.controlArrow}>›</Text>
            </Pressable>
          </View>
          <Pressable testID="jump" onPressIn={jump} style={({ pressed }) => [styles.jumpButton, pressed && styles.controlPressed]}>
            <Text style={styles.jumpGlyph}>↑</Text>
            <Text style={styles.jumpText}>نط</Text>
          </Pressable>
        </View>
      </LinearGradient>
      {(mode === 'lost' || mode === 'won') && (
        <View style={styles.overlay}>
          <Animated.View style={[styles.resultCard, resultCardAnimation]}>
            <Animated.View style={[styles.resultCharacter, resultCharacterAnimation]}>
              <CreatureArt compact skinId={profile.equippedSkin} />
            </Animated.View>
            <View style={styles.resultIcon}>{mode === 'won' ? <Text style={styles.resultIconText}>✓</Text> : <Text style={styles.resultIconText}>!</Text>}</View>
            <Text style={styles.resultKicker}>{mode === 'won' ? `خلصت المرحلة ${stage}` : `المحاولة انتهت في المرحلة ${stage}`}</Text>
            <Text style={styles.resultTitle}>
              {mode === 'won' ? (stage === MAX_STAGES ? 'خلصت اللعبة!' : 'جاهز للأصعب؟') : 'العوائق غلبتك'}
            </Text>
            <Text style={styles.resultBody}>
              {mode === 'won'
                ? stage === MAX_STAGES
                  ? 'هزمت كل البوسات، بما فيها البوس الأخير، وقطعت المراحل الـ500. بطل!'
                  : `عدّيت المرحلة ${stage}. الطريق الجاي فيه عوائق أكتر.`
                : 'جرّب مرة تانية، وخليك أسرع من الفخاخ.'}
            </Text>
            <Text style={styles.resultRank}>تصنيفك المحلي: {playerRank.name}</Text>
            {mode === 'won' && best > 0 && <Text style={styles.bestTime}>أفضل وقت {best.toFixed(1)} ث</Text>}
            <Pressable
              testID="retry-game"
              style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}
              onPress={mode === 'won' ? (stage < MAX_STAGES ? advanceStage : startFromBeginning) : retryStage}
            >
              <Text style={styles.retryText}>
                {mode === 'won' ? (stage === MAX_STAGES ? 'إبدأ من الأول' : 'المرحلة التالية') : 'أعد المرحلة'}
              </Text>
            </Pressable>
            <Pressable testID="result-menu" onPress={() => setMode('menu')} style={styles.menuLink}>
              <Text style={styles.menuLinkText}>رجوع للقائمة</Text>
            </Pressable>
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.midnight,
  },
  menu: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  menuHeader: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  walletBadge: {
    height: 31,
    minWidth: 59,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  walletGlyph: {
    color: colors.gold,
    fontSize: 13,
    fontWeight: '900',
  },
  walletCount: {
    color: colors.paper,
    fontSize: 12,
    fontWeight: '900',
  },
  logoMark: {
    width: 31,
    height: 31,
    borderRadius: 10,
    backgroundColor: colors.lime,
    position: 'relative',
    transform: [{ rotate: '-8deg' }],
  },
  logoDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ink,
    left: 8,
    top: 9,
  },
  logoDotSmall: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.coral,
    right: 5,
    top: 6,
  },
  eyebrow: {
    flex: 1,
    color: colors.sky,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.7,
    textAlign: 'center',
  },
  hero: {
    width: 210,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heroHalo: {
    width: 175,
    height: 175,
    borderRadius: 90,
    backgroundColor: colors.coral,
    opacity: 0.9,
    position: 'absolute',
    transform: [{ rotate: '12deg' }],
  },
  heroSpark: {
    width: 9,
    height: 9,
    borderRadius: 3,
    backgroundColor: colors.lime,
    position: 'absolute',
  },
  sparkOne: {
    top: 12,
    right: 23,
    transform: [{ rotate: '28deg' }],
  },
  sparkTwo: {
    bottom: 17,
    left: 19,
    transform: [{ rotate: '-20deg' }],
  },
  titleBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: -3,
  },
  title: {
    color: colors.paper,
    fontSize: 43,
    lineHeight: 40,
    letterSpacing: -1.4,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.lime,
    fontSize: 17,
    fontWeight: '700',
    marginTop: 13,
    writingDirection: 'rtl',
  },
  description: {
    maxWidth: 320,
    textAlign: 'center',
    color: colors.sky,
    opacity: 0.88,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
    writingDirection: 'rtl',
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  stat: {
    alignItems: 'center',
    minWidth: 82,
  },
  statNumber: {
    color: colors.coral,
    fontSize: 20,
    fontWeight: '800',
  },
  statRank: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statLabel: {
    color: colors.paper,
    fontSize: 10,
    marginTop: 3,
    opacity: 0.75,
  },
  rankProgressTrack: {
    width: '72%',
    height: 5,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.violetLight,
    marginTop: -10,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statDivider: {
    height: 29,
    width: 1,
    backgroundColor: colors.sky,
    opacity: 0.25,
  },
  menuActions: {
    width: '100%',
    maxWidth: 350,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startButton: {
    width: 'auto',
    flex: 1,
    maxWidth: 350,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.lime,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    shadowColor: colors.ink,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  disabledButton: {
    opacity: 0.6,
  },
  wardrobeButton: {
    width: 92,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wardrobeButtonGlyph: {
    color: colors.ink,
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '900',
  },
  wardrobeButtonText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  startButtonText: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  startButtonArrow: {
    color: colors.ink,
    fontSize: 27,
    fontWeight: '500',
  },
  footerHint: {
    color: colors.sky,
    fontSize: 10,
    opacity: 0.65,
    letterSpacing: 0.7,
  },
  buttonPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  gameShell: {
    flex: 1,
    alignItems: 'center',
  },
  gameTopBar: {
    width: '100%',
    paddingHorizontal: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  musicToggle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.violetLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  musicToggleActive: {
    backgroundColor: colors.lime,
  },
  musicToggleText: {
    color: colors.ink,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
  },
  wardrobeShell: {
    flex: 1,
  },
  wardrobeHeader: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    gap: 10,
  },
  wardrobeTitleBlock: {
    flex: 1,
    alignItems: 'center',
  },
  wardrobeTitle: {
    color: colors.paper,
    fontSize: 21,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  wardrobeSubtitle: {
    color: colors.sky,
    fontSize: 11,
    marginTop: 3,
    writingDirection: 'rtl',
  },
  skinGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 15,
    paddingBottom: 14,
  },
  skinCard: {
    width: '48%',
    minHeight: 184,
    marginBottom: 13,
    padding: 12,
    borderRadius: 20,
    backgroundColor: colors.paper,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
  },
  skinPreview: {
    width: 80,
    height: 80,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  skinName: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 7,
    writingDirection: 'rtl',
  },
  skinCost: {
    color: colors.violet,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  skinAction: {
    minWidth: 98,
    height: 31,
    paddingHorizontal: 12,
    borderRadius: 11,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },
  skinActionEquipped: {
    backgroundColor: colors.lime,
  },
  skinActionText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  skinActionEquippedText: {
    color: colors.ink,
  },
  wardrobeHint: {
    color: colors.sky,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 9,
    writingDirection: 'rtl',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.violetLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: colors.paper,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -3,
  },
  levelLabel: {
    alignItems: 'center',
  },
  levelKicker: {
    color: colors.lime,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  levelTitle: {
    color: colors.paper,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
    writingDirection: 'rtl',
  },
  timerPill: {
    minWidth: 56,
    height: 30,
    borderRadius: 12,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  timerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.coral,
  },
  timerText: {
    color: colors.paper,
    fontSize: 11,
    fontWeight: '700',
  },
  gameViewport: {
    overflow: 'hidden',
    borderRadius: 23,
    backgroundColor: colors.sky,
    borderWidth: 3,
    borderColor: colors.ink,
    position: 'relative',
  },
  backdropOrb: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    zIndex: 1,
  },
  backdropComet: {
    position: 'absolute',
    borderRadius: 4,
    zIndex: 2,
  },
  warning: {
    position: 'absolute',
    left: 12,
    right: 76,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.ink,
    backgroundColor: colors.paper,
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    writingDirection: 'rtl',
    opacity: 0.94,
  },
  inGameWallet: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 28,
    minWidth: 56,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    zIndex: 12,
  },
  platform: {
    position: 'absolute',
    backgroundColor: colors.ink,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.ink,
    shadowColor: colors.ink,
    shadowOpacity: 0.25,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 5 },
    elevation: 2,
  },
  hazard: {
    position: 'absolute',
  },
  coin: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 7,
    shadowColor: colors.ink,
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  coinLetter: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  boss: {
    position: 'absolute',
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bossHealthTrack: {
    position: 'absolute',
    top: -13,
    width: '90%',
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.ink,
    overflow: 'hidden',
  },
  bossHealthFill: {
    height: '100%',
    backgroundColor: colors.danger,
  },
  door: {
    position: 'absolute',
    alignItems: 'center',
  },
  doorLabel: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: '900',
    marginTop: -2,
    writingDirection: 'rtl',
  },
  player: {
    position: 'absolute',
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  controls: {
    width: '100%',
    paddingHorizontal: 18,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directionGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    width: 60,
    height: 52,
    borderRadius: 17,
    backgroundColor: colors.violetLight,
    borderWidth: 2,
    borderColor: colors.sky,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    backgroundColor: colors.coral,
    transform: [{ scale: 0.94 }],
  },
  controlArrow: {
    color: colors.paper,
    fontSize: 34,
    lineHeight: 35,
    marginTop: -3,
  },
  jumpButton: {
    width: 78,
    height: 58,
    borderRadius: 19,
    backgroundColor: colors.lime,
    borderWidth: 2,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpGlyph: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 23,
    fontWeight: '900',
  },
  jumpText: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '800',
    writingDirection: 'rtl',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  resultCard: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 25,
    backgroundColor: colors.paper,
    borderWidth: 3,
    borderColor: colors.ink,
    padding: 24,
    alignItems: 'center',
  },
  resultCharacter: {
    width: 74,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 4,
  },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-7deg' }],
    marginBottom: 14,
  },
  resultIconText: {
    color: colors.ink,
    fontSize: 29,
    fontWeight: '900',
  },
  resultKicker: {
    color: colors.violetLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resultTitle: {
    color: colors.ink,
    fontSize: 25,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 5,
    writingDirection: 'rtl',
  },
  resultBody: {
    color: colors.violet,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
    writingDirection: 'rtl',
  },
  resultRank: {
    color: colors.violetLight,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 12,
    writingDirection: 'rtl',
  },
  bestTime: {
    color: colors.coral,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12,
    writingDirection: 'rtl',
  },
  retryButton: {
    width: '100%',
    height: 53,
    borderRadius: 16,
    backgroundColor: colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 19,
  },
  retryText: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
    writingDirection: 'rtl',
  },
  menuLink: {
    padding: 11,
  },
  menuLinkText: {
    color: colors.violetLight,
    fontSize: 12,
    fontWeight: '700',
    writingDirection: 'rtl',
  },
});