import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

interface Slide {
  id: number;
  artwork: any;
  title1: string;
  title2: string;
  desc: string;
}

const SLIDES: Slide[] = [
  {
    id: 1,
    artwork: require('../assets/onboarding-art-1.png'),
    title1: 'A Happier Home',
    title2: 'Together.',
    desc: 'Track chores, split expenses, and stay connected with your roommates — all in one place.',
  },
  {
    id: 2,
    artwork: require('../assets/onboarding-art-2.png'),
    title1: 'Manage Daily Chores',
    title2: 'Effortlessly.',
    desc: 'Assign tasks, track progress, and make sure everything gets done — without any confusion.',
  },
  {
    id: 3,
    artwork: require('../assets/onboarding-art-3.png'),
    title1: 'Split Expenses',
    title2: 'Fairly.',
    desc: 'Keep track of shared expenses and settle up easily with your roommates.',
  },
];

export default function MobileSplashScreen() {
  const router = useRouter();
  const [currentIdx, setCurrentIdx] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLast = currentIdx === SLIDES.length - 1;

  const updateIndex = (newIdx: number) => {
    if (newIdx !== currentIdx && newIdx >= 0 && newIdx < SLIDES.length) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setCurrentIdx(newIdx);
    }
  };

  const handleNext = () => {
    if (currentIdx < SLIDES.length - 1) {
      const nextIdx = currentIdx + 1;
      isProgrammaticScroll.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isProgrammaticScroll.current = false;
      }, 450);

      scrollViewRef.current?.scrollTo({ x: nextIdx * width, animated: true });
      updateIndex(nextIdx);
    } else {
      router.replace('/(auth)/sign-in');
    }
  };

  const handleSkip = () => {
    const lastIdx = SLIDES.length - 1;
    isProgrammaticScroll.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);

    scrollViewRef.current?.scrollTo({ x: lastIdx * width, animated: true });
    updateIndex(lastIdx);
  };

  const handleDotPress = (idx: number) => {
    if (idx === currentIdx) return;
    isProgrammaticScroll.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);

    scrollViewRef.current?.scrollTo({ x: idx * width, animated: true });
    updateIndex(idx);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isProgrammaticScroll.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / width);
    updateIndex(newIdx);
  };

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isProgrammaticScroll.current = false;
    const offsetX = e.nativeEvent.contentOffset.x;
    const newIdx = Math.round(offsetX / width);
    updateIndex(newIdx);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* 1. Swipeable ScrollView between 1 <-> 2 <-> 3 */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((item) => (
          <View key={item.id} style={[styles.slideContainer, { width }]}>
            {/* Artwork Image */}
            <View style={styles.artworkContainer}>
              <Image
                source={item.artwork}
                style={styles.artworkImage}
                contentFit="contain"
                contentPosition="top center"
                priority="high"
              />
            </View>

            {/* Text Headline & Description */}
            <View style={styles.textContainer}>
              <Text style={styles.title1}>{item.title1}</Text>
              <Text style={styles.title2}>{item.title2}</Text>
              <Text style={styles.description}>{item.desc}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* 2. Fixed Bottom Navigation Bar (Non-overlapping, cleanly spaced) */}
      <View style={styles.bottomNav}>
        {/* Left: Skip Button */}
        <View style={styles.navLeftSlot}>
          <TouchableOpacity
            onPress={handleSkip}
            activeOpacity={0.7}
            disabled={isLast}
            style={[styles.skipBtn, { opacity: isLast ? 0 : 1 }]}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        {/* Center: Pagination Dots (Clean uniform circles, zero overlap with button) */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, idx) => {
            const isActive = idx === currentIdx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => handleDotPress(idx)}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Right: Smooth Unified Morphing Action Button (Circle <-> Pill) */}
        <View style={styles.navRightSlot}>
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.88}
            style={[
              styles.actionBtn,
              isLast ? styles.pillActionBtn : styles.circleActionBtn,
            ]}
            accessibilityLabel={isLast ? "Get Started" : "Next slide"}
          >
            {isLast && (
              <Text numberOfLines={1} style={styles.getStartedText}>
                Get Started
              </Text>
            )}
            <ArrowRight
              size={isLast ? 18 : 22}
              color="#FFFFFF"
              strokeWidth={2.4}
            />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  artworkContainer: {
    width: '100%',
    aspectRatio: 285 / 428,
    backgroundColor: '#FFFFFF',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  title1: {
    fontSize: 27,
    fontWeight: '800',
    color: '#07194A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  title2: {
    fontSize: 27,
    fontWeight: '800',
    color: '#0878F9',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: '#77839F',
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 300,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 76,
  },
  navLeftSlot: {
    width: 65,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#77839F',
  },
  dotsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0878F9',
    transform: [{ scale: 1.15 }],
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D4E8FF',
  },
  navRightSlot: {
    minWidth: 65,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionBtn: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0878F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0878F9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  circleActionBtn: {
    width: 48,
    paddingHorizontal: 0,
  },
  pillActionBtn: {
    paddingHorizontal: 20,
    gap: 8,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 0,
  },
});
