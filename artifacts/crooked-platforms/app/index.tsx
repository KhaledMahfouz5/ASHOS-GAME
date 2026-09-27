import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';
import rawColors from '@/constants/colors';

const colors = rawColors.light;

type Mode = 'menu' | 'playing' | 'lost' | 'won';
type PlatformKind = 'solid' | 'fake';

type PlatformPiece = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: PlatformKind;
};

type Hazard = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  kind: 'teeth' | 'blob';
};

type GameSnapshot = {
  x: number;
  y: number;
  vy: number;
  grounded: boolean;
  fakeTriggered: number | null;
  elapsed: number;
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
  fakeTriggered: null,
  elapsed: 0,
};

function CreatureArt({ compact = false }: { compact?: boolean }) {
  const size = compact ? 74 : 164;
  return (
    <Svg width={size} height={size} viewBox="0 0 164 164">
      <G transform="rotate(-8 82 82)">
        <Path
          d="M43 45C45 24 62 18 74 29C86 13 109 19 111 43C137 43 147 64 135 82C148 100 132 125 108 119C98 141 68 143 56 122C30 127 14 104 29 84C13 65 24 47 43 45Z"
          fill={colors.lime}
          stroke={colors.ink}
          strokeWidth="7"
        />
        <Path d="M49 40L39 20L62 32Z" fill={colors.coral} stroke={colors.ink} strokeWidth="6" />
        <Path d="M103 36L119 18L121 47Z" fill={colors.coral} stroke={colors.ink} strokeWidth="6" />
        <Ellipse cx="65" cy="71" rx="15" ry="20" fill={colors.paper} stroke={colors.ink} strokeWidth="6" />
        <Circle cx="67" cy="77" r="7" fill={colors.ink} />
        <Ellipse cx="107" cy="66" rx="12" ry="16" fill={colors.coral} stroke={colors.ink} strokeWidth="6" />
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

const MAX_STAGES = 3;
const stageNames = ['الممر المايل', 'مصنع الأكاذيب', 'قبو المستحيل'] as const;

function makeLevel(width: number, height: number, stage: number) {
  const floorY = height - 48;
  const step = width * (stage === 1 ? 0.3 : stage === 2 ? 0.29 : 0.275);
  const count = stage === 1 ? 13 : stage === 2 ? 15 : 17;
  const heightPattern =
    stage === 1
      ? [0, 88, 166, 92, 204, 132, 220, 108, 188, 76, 234, 126, 252]
      : stage === 2
        ? [0, 105, 190, 72, 228, 112, 258, 92, 218, 60, 270, 132, 244, 84, 286]
        : [0, 122, 214, 82, 262, 96, 276, 64, 242, 88, 294, 70, 268, 118, 310, 82, 284];
  const fakeIndices = stage === 1 ? [3, 8] : stage === 2 ? [2, 5, 9, 12] : [2, 4, 7, 10, 13];
  const blobIndices = stage === 1 ? [4, 9] : stage === 2 ? [3, 6, 10, 13] : [2, 5, 8, 11, 14];
  const platforms: PlatformPiece[] = Array.from({ length: count }, (_, index) => {
    const isStart = index === 0;
    const isFinish = index === count - 1;
    return {
      id: `stage-${stage}-platform-${index}`,
      x: index * step,
      y: floorY - (isStart ? 0 : heightPattern[index]),
      width: isStart ? width * 0.42 : isFinish ? width * 0.3 : width * (stage === 3 && index % 4 === 0 ? 0.2 : 0.24),
      height: isStart ? 48 : 18,
      kind: fakeIndices.includes(index) ? 'fake' : 'solid',
    };
  });
  const hazards: Hazard[] = [];
  for (let index = 1; index < platforms.length; index += 1) {
    const previous = platforms[index - 1];
    const current = platforms[index];
    const gap = Math.max(16, current.x - (previous.x + previous.width));
    if (stage > 1 || index % 2 === 0) {
      hazards.push({
        id: `stage-${stage}-teeth-${index}`,
        x: previous.x + previous.width + gap * 0.25,
        y: floorY - 39,
        width: Math.max(22, gap * 0.55),
        height: 39,
        kind: 'teeth',
      });
    }
    if (blobIndices.includes(index)) {
      hazards.push({
        id: `stage-${stage}-blob-${index}`,
        x: current.x + current.width * 0.22,
        y: current.y - 38,
        width: current.width * 0.56,
        height: 38,
        kind: 'blob',
      });
    }
  }
  const finish = platforms[platforms.length - 1];
  return {
    platforms,
    hazards,
    worldWidth: finish.x + finish.width + width * 0.18,
    goalX: finish.x + finish.width * 0.32,
    goalY: finish.y,
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
  const [mode, setMode] = useState<Mode>('menu');
  const [best, setBest] = useState(0);
  const [stage, setStage] = useState(1);
  const [snapshot, setSnapshot] = useState<GameSnapshot>(initialSnapshot);
  const [gameSize, setGameSize] = useState({
    width: Math.min(window.width, 430),
    height: Math.max(540, window.height - insets.top - insets.bottom - 20),
  });
  const runtime = useRef<GameRuntime>({ ...initialSnapshot, vx: 0, lastTime: 0 });
  const controls = useRef({ left: false, right: false, jump: false });
  const animation = useRef<number | null>(null);
  const running = useRef(false);

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
    };
    runtime.current = { ...next, vx: 0, lastTime: 0 };
    setSnapshot(next);
  }, [gameSize.height, gameSize.width]);

  const finishRun = useCallback(
    async (nextMode: Exclude<Mode, 'menu' | 'playing'>) => {
      running.current = false;
      if (animation.current) cancelAnimationFrame(animation.current);
      setMode(nextMode);
      if (nextMode === 'won') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setBest((current) => Math.max(current, Math.max(1, Math.round(runtime.current.elapsed / 100) / 10)));
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [],
  );

  const startGame = useCallback(() => {
    setStage(1);
    resetGame(1);
    controls.current = { left: false, right: false, jump: false };
    running.current = true;
    setMode('playing');
  }, [resetGame]);

  const advanceStage = useCallback(() => {
    const nextStage = Math.min(MAX_STAGES, stage + 1);
    setStage(nextStage);
    resetGame(nextStage);
    controls.current = { left: false, right: false, jump: false };
    running.current = true;
    setMode('playing');
  }, [resetGame, stage]);

  useEffect(() => {
    if (mode !== 'playing') return;
    running.current = true;
    const playerWidth = 31;
    const playerHeight = 36;
    const step = (time: number) => {
      if (!running.current) return;
      const current = runtime.current;
      const delta = current.lastTime ? Math.min((time - current.lastTime) / 1000, 0.032) : 0.016;
      current.lastTime = time;
      current.elapsed += delta * 1000;
      const direction = (controls.current.right ? 1 : 0) - (controls.current.left ? 1 : 0);
      current.vx = direction * 205;
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
        const collapsed = platform.kind === 'fake' && current.fakeTriggered !== null && current.elapsed - current.fakeTriggered > 420;
        if (collapsed) continue;
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
          if (platform.kind === 'fake' && current.fakeTriggered === null) {
            current.fakeTriggered = current.elapsed;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      }

      const hitHazard = level.hazards.some((hazard) =>
        overlaps(current.x + 4, current.y + 5, playerWidth - 8, playerHeight - 6, hazard.x, hazard.y + 7, hazard.width, hazard.height - 7),
      );
      const fell = current.y > gameSize.height + 40;
      const reachedGoal = current.x + playerWidth > level.goalX && current.y < level.goalY + 70 && current.y + playerHeight > level.goalY - 30;
      setSnapshot({ ...current });
      if (hitHazard || fell) {
        void finishRun('lost');
        return;
      }
      if (reachedGoal) {
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
  }, [finishRun, gameSize.height, level, mode]);

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
          </View>
          <View style={styles.hero}>
            <View style={styles.heroHalo} />
            <CreatureArt />
            <View style={[styles.heroSpark, styles.sparkOne]} />
            <View style={[styles.heroSpark, styles.sparkTwo]} />
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>ASHOS{'\n'}GAME</Text>
            <Text style={styles.subtitle}>لعبة منصّات ما بتصدّقها</Text>
            <Text style={styles.description}>
              كل خطوة ممكن تكون كذبة. اقفز، جرّب، وخلّي عينك مفتوحة للفخ اللي ما بيشبه حاله.
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>03</Text>
              <Text style={styles.statLabel}>فخاخ غريبة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>03</Text>
              <Text style={styles.statLabel}>مراحل صعبة</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statNumber}>∞</Text>
              <Text style={styles.statLabel}>محاولات</Text>
            </View>
          </View>
          <Pressable testID="start-game" style={({ pressed }) => [styles.startButton, pressed && styles.buttonPressed]} onPress={startGame}>
            <Text style={styles.startButtonText}>إبدأ التجربة</Text>
            <Text style={styles.startButtonArrow}>↗</Text>
          </Pressable>
          <Text style={styles.footerHint}>حرّك بإبهامك • لا تثق بالأرض</Text>
        </LinearGradient>
      </View>
    );
  }

  const fakeCollapsed = snapshot.fakeTriggered !== null && snapshot.elapsed - snapshot.fakeTriggered > 420;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[colors.midnight, colors.violet]} style={[styles.gameShell, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
        <View style={styles.gameTopBar}>
          <Pressable testID="back-to-menu" onPress={() => setMode('menu')} style={styles.iconButton}>
            <Text style={styles.iconButtonText}>‹</Text>
          </Pressable>
          <View style={styles.levelLabel}>
            <Text style={styles.levelKicker}>STAGE {stage} / {MAX_STAGES}</Text>
            <Text style={styles.levelTitle}>{stageNames[stage - 1]}</Text>
          </View>
          <View style={styles.timerPill}>
            <View style={styles.timerDot} />
            <Text style={styles.timerText}>{(snapshot.elapsed / 1000).toFixed(1)}s</Text>
          </View>
        </View>

        <View style={[styles.gameViewport, { width: gameSize.width, height: gameSize.height }]}>
          <View style={styles.backgroundGrid} />
          <View style={[styles.sun, { left: gameSize.width * 0.67, top: gameSize.height * 0.12 }]} />
          <Text style={[styles.warning, { top: gameSize.height * 0.13 }]}>المسافة أطول مما بتفكّر</Text>
          {level.platforms.map((platform) => {
            const collapsed = platform.kind === 'fake' && fakeCollapsed;
            return (
              <View
                key={platform.id}
                style={[
                  styles.platform,
                  {
                    left: platform.x - Math.max(0, Math.min(level.worldWidth - gameSize.width, snapshot.x - gameSize.width * 0.28)),
                    top: platform.y,
                    width: platform.width,
                    height: platform.height,
                    opacity: collapsed ? 0.18 : 1,
                    transform: [{ rotate: platform.kind === 'fake' ? '-4deg' : '0deg' }],
                  },
                  platform.kind === 'fake' && styles.fakePlatform,
                ]}
              >
                {platform.kind === 'fake' && <Text style={styles.fakeMark}>?</Text>}
              </View>
            );
          })}
          {level.hazards.map((hazard) => (
            <View key={hazard.id} style={[styles.hazard, { left: hazard.x - Math.max(0, Math.min(level.worldWidth - gameSize.width, snapshot.x - gameSize.width * 0.28)), top: hazard.y, width: hazard.width, height: hazard.height }]}>
              <TrapArt kind={hazard.kind} />
            </View>
          ))}
          <View style={[styles.door, { left: level.goalX - Math.max(0, Math.min(level.worldWidth - gameSize.width, snapshot.x - gameSize.width * 0.28)), top: level.goalY - 56 }]}>
            <DoorArt />
            <Text style={styles.doorLabel}>اهرب</Text>
          </View>
          <View style={[styles.player, { left: snapshot.x - Math.max(0, Math.min(level.worldWidth - gameSize.width, snapshot.x - gameSize.width * 0.28)), top: snapshot.y }]}>
            <CreatureArt compact />
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
          <View style={styles.resultCard}>
            <View style={styles.resultIcon}>{mode === 'won' ? <Text style={styles.resultIconText}>✓</Text> : <Text style={styles.resultIconText}>!</Text>}</View>
            <Text style={styles.resultKicker}>{mode === 'won' ? `خلصت المرحلة ${stage}` : `المحاولة انتهت في المرحلة ${stage}`}</Text>
            <Text style={styles.resultTitle}>
              {mode === 'won' ? (stage === MAX_STAGES ? 'خلصت اللعبة!' : 'جاهز للأصعب؟') : 'الأرض كذبت عليك'}
            </Text>
            <Text style={styles.resultBody}>
              {mode === 'won'
                ? stage === MAX_STAGES
                  ? 'مرقت من كل الممرات وما خليت ولا فخ يضحك عليك.'
                  : 'المرحلة الجاية أطول، والمنصّات فيها بتكذب أسرع.'
                : 'جرّب مرة تانية، وخليك أسرع من الفخاخ.'}
            </Text>
            {mode === 'won' && best > 0 && <Text style={styles.bestTime}>أفضل وقت {best.toFixed(1)} ث</Text>}
            <Pressable testID="retry-game" style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]} onPress={mode === 'won' && stage < MAX_STAGES ? advanceStage : startGame}>
              <Text style={styles.retryText}>
                {mode === 'won' ? (stage === MAX_STAGES ? 'إبدأ من الأول' : 'المرحلة التالية') : 'رجّع المحاولة'}
              </Text>
            </Pressable>
            <Pressable testID="result-menu" onPress={() => setMode('menu')} style={styles.menuLink}>
              <Text style={styles.menuLinkText}>رجوع للقائمة</Text>
            </Pressable>
          </View>
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
    color: colors.sky,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.7,
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
  statLabel: {
    color: colors.paper,
    fontSize: 10,
    marginTop: 3,
    opacity: 0.75,
  },
  statDivider: {
    height: 29,
    width: 1,
    backgroundColor: colors.sky,
    opacity: 0.25,
  },
  startButton: {
    width: '100%',
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
  backgroundGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
    backgroundColor: colors.paper,
  },
  sun: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.gold,
    opacity: 0.9,
  },
  warning: {
    position: 'absolute',
    left: 17,
    color: colors.ink,
    fontSize: 10,
    fontWeight: '800',
    writingDirection: 'rtl',
    opacity: 0.68,
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
  fakePlatform: {
    backgroundColor: colors.lime,
    borderColor: colors.ink,
  },
  fakeMark: {
    position: 'absolute',
    right: 8,
    top: -2,
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  hazard: {
    position: 'absolute',
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