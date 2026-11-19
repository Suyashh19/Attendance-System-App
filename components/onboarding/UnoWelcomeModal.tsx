import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useAuthStore } from '../../store/authStore';
import { Text } from '../Text';

export function UnoWelcomeModal() {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const showWelcomeIntro = useOnboardingStore((s) => s.showWelcomeIntro);
  const startTour = useOnboardingStore((s) => s.startTour);
  const openFeatureGuides = useOnboardingStore((s) => s.openFeatureGuides);
  const skipTour = useOnboardingStore((s) => s.skipTour);
  const user = useAuthStore((s) => s.user);

  if (!showWelcomeIntro) return null;

  const handleStart = () => {
    startTour(0);
  };

  const handleBrowse = () => {
    openFeatureGuides();
  };

  const handleSkip = () => {
    skipTour(user?.id);
  };

  // Responsive modal dimensions
  const modalWidth = Math.min(screenWidth * 0.94, 420);
  const maxModalHeight = screenHeight - insets.top - insets.bottom - 24;

  return (
    <Modal
      transparent
      visible={showWelcomeIntro}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleSkip}
    >
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: 'rgba(11, 19, 43, 0.72)' },
        ]}
        className="justify-center items-center px-3"
      >
        <View
          style={[
            styles.modalContainer,
            {
              width: modalWidth,
              maxHeight: maxModalHeight,
            },
          ]}
        >
          {/* Organic Asymmetrical SVG Background with Layered Continuous Lavender Gradient */}
          <Svg
            style={StyleSheet.absoluteFillObject}
            width="100%"
            height="100%"
            viewBox="0 0 436 690"
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="modalBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                {/* Very light lavender near the top */}
                <Stop offset="0%" stopColor="#F8F5FF" />
                <Stop offset="16%" stopColor="#FAF7FE" />
                {/* Soft white/lavender transition through the center */}
                <Stop offset="36%" stopColor="#FFFFFF" />
                <Stop offset="58%" stopColor="#F6F1FD" />
                {/* Slightly deeper lavender near the bottom, blending into the campus */}
                <Stop offset="82%" stopColor="#EFE6FC" />
                <Stop offset="100%" stopColor="#E2D4F8" />
              </LinearGradient>
            </Defs>
            <Path
              d="M 0 70 C 0 35 30 8 85 6 C 145 4 195 18 250 32 C 305 44 350 16 395 2 C 420 -6 436 20 436 60 L 436 625 C 436 655 410 670 360 676 C 300 682 255 676 200 681 C 140 687 115 692 85 692 C 40 692 15 670 0 625 Z"
              fill="url(#modalBgGrad)"
            />
          </Svg>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            style={{ width: '100%' }}
          >
            {/* Upper Content with 20px Horizontal Padding */}
            <View style={styles.upperContent}>
              {/* A. Uno Header */}
              <View style={styles.headerRow}>
                {/* Left: Uno Sparkle Logo + Titles */}
                <View style={styles.headerLeft}>
                  {/* Purple Uno Sparkle / Logo */}
                  <View style={styles.sparkleContainer}>
                    <Svg width={36} height={36} viewBox="0 0 36 36" fill="none">
                      {/* Main large 4-point sparkle */}
                      <Path
                        d="M 15 2 C 15 9 10 14 3 14 C 10 14 15 19 15 26 C 15 19 20 14 27 14 C 20 14 15 9 15 2 Z"
                        fill="#7F56D9"
                      />
                      {/* Secondary lower-left sparkle */}
                      <Path
                        d="M 7 22 C 7 24.5 4.8 26.5 2 26.5 C 4.8 26.5 7 28.5 7 31 C 7 28.5 9.2 26.5 12 26.5 C 9.2 26.5 7 24.5 7 22 Z"
                        fill="#9E77ED"
                      />
                      {/* Small upper-right sparkle */}
                      <Path
                        d="M 29 4 C 29 6.2 27.2 8 25 8 C 27.2 8 29 9.8 29 12 C 29 9.8 30.8 8 33 8 C 30.8 8 29 6.2 29 4 Z"
                        fill="#9E77ED"
                      />
                    </Svg>
                  </View>

                  {/* Main title & subtitle */}
                  <View style={styles.headerTextCol}>
                    <Text style={styles.headerTitle}>It's Uno</Text>
                    <Text style={styles.headerSubtitle}>Your Academic Assistant</Text>

                    {/* Three-segment onboarding progress indicator */}
                    <View style={styles.progressRow}>
                      <View style={[styles.progressBar, styles.progressActive]} />
                      <View style={[styles.progressBar, styles.progressInactive]} />
                      <View style={[styles.progressBar, styles.progressInactive]} />
                    </View>
                  </View>
                </View>

                {/* Close button on the top-right */}
                <TouchableOpacity
                  onPress={handleSkip}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  activeOpacity={0.7}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Close welcome"
                >
                  <Ionicons name="close" size={19} color="#342E59" />
                </TouchableOpacity>
              </View>

              {/* B. Welcome Section with Robot and Radial Lavender Glow */}
              <View style={styles.welcomeSection}>
                {/* Left Column: Heading + Underline + Description */}
                <View style={styles.welcomeLeftCol}>
                  <Text style={styles.welcomeHeading}>Welcome, Professor</Text>

                  {/* Purple underline accent beneath heading */}
                  <Svg width={116} height={6} viewBox="0 0 116 6" style={styles.underlineAccent}>
                    <Path
                      d="M 2 3 Q 58 6 114 2"
                      stroke="#7F56D9"
                      strokeWidth={3}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </Svg>

                  <Text style={styles.welcomeDescription}>
                    Let's set up your courses, take live attendance, and manage reports in a few quick steps.
                  </Text>
                </View>

                {/* Right Column: Uno Academic Robot with Subtle Radial Lavender Glow */}
                <View style={styles.robotContainer}>
                  {/* Subtle Radial Lavender Glow behind the Robot */}
                  <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                    <Defs>
                      <RadialGradient
                        id="robotRadialGlow"
                        cx="50%"
                        cy="46%"
                        r="48%"
                        fx="50%"
                        fy="46%"
                      >
                        <Stop offset="0%" stopColor="#D5C5FA" stopOpacity={0.8} />
                        <Stop offset="42%" stopColor="#E5DBFD" stopOpacity={0.45} />
                        <Stop offset="75%" stopColor="#F3EEFE" stopOpacity={0.15} />
                        <Stop offset="100%" stopColor="#FAF7FF" stopOpacity={0} />
                      </RadialGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#robotRadialGlow)" />
                  </Svg>

                  {/* High-Res Transparent Robot Artwork */}
                  <Image
                    source={require('../../assets/uno_academic_robot.png')}
                    style={styles.robotImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* C. Feature Cards (Row of 3 with Subtle White-to-Lavender Gradients) */}
              <View style={styles.cardsRow}>
                {/* Card 1: Academic Setup */}
                <View style={styles.featureCard}>
                  <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="cardGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#FFFFFF" />
                        <Stop offset="65%" stopColor="#FAF7FF" />
                        <Stop offset="100%" stopColor="#F2ECFD" />
                      </LinearGradient>
                    </Defs>
                    <Rect
                      width="100%"
                      height="100%"
                      rx={18}
                      fill="url(#cardGrad1)"
                      stroke="#ECE3F8"
                      strokeWidth={1}
                    />
                  </Svg>
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconWrap}>
                      <Ionicons name="book-outline" size={24} color="#7F56D9" />
                    </View>
                    <Text style={styles.cardTitle}>Academic{'\n'}Setup</Text>
                    <Text style={styles.cardDesc}>Semesters &{'\n'}course rosters</Text>
                  </View>
                </View>

                {/* Card 2: Live Attendance */}
                <View style={styles.featureCard}>
                  <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="cardGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#FFFFFF" />
                        <Stop offset="65%" stopColor="#FAF7FF" />
                        <Stop offset="100%" stopColor="#F2ECFD" />
                      </LinearGradient>
                    </Defs>
                    <Rect
                      width="100%"
                      height="100%"
                      rx={18}
                      fill="url(#cardGrad2)"
                      stroke="#ECE3F8"
                      strokeWidth={1}
                    />
                  </Svg>
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconWrap}>
                      <Ionicons name="play-outline" size={24} color="#7F56D9" />
                    </View>
                    <Text style={styles.cardTitle}>Live{'\n'}Attendance</Text>
                    <Text style={styles.cardDesc}>15-second{'\n'}secure session</Text>
                  </View>
                </View>

                {/* Card 3: Attendance & Leaves */}
                <View style={styles.featureCard}>
                  <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="cardGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
                        <Stop offset="0%" stopColor="#FFFFFF" />
                        <Stop offset="65%" stopColor="#FAF7FF" />
                        <Stop offset="100%" stopColor="#F2ECFD" />
                      </LinearGradient>
                    </Defs>
                    <Rect
                      width="100%"
                      height="100%"
                      rx={18}
                      fill="url(#cardGrad3)"
                      stroke="#ECE3F8"
                      strokeWidth={1}
                    />
                  </Svg>
                  <View style={styles.cardContent}>
                    <View style={styles.cardIconWrap}>
                      <Ionicons name="bar-chart-outline" size={24} color="#7F56D9" />
                    </View>
                    <Text style={styles.cardTitle}>Attendance{'\n'}& Leaves</Text>
                    <Text style={styles.cardDesc}>Leaves, manual{'\n'}edits & exports</Text>
                  </View>
                </View>
              </View>

              {/* D. Action Buttons */}
              <View style={styles.actionsContainer}>
                {/* Primary button: Refined Deep-Purple-to-Violet Linear Gradient */}
                <TouchableOpacity
                  onPress={handleStart}
                  activeOpacity={0.88}
                  style={[styles.primaryBtn, styles.primaryBtnShadow]}
                  accessibilityRole="button"
                  accessibilityLabel="Start Guided Tour"
                >
                  <Svg style={StyleSheet.absoluteFillObject} width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="btnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor="#7839EE" />
                        <Stop offset="45%" stopColor="#672CE7" />
                        <Stop offset="100%" stopColor="#4F16CE" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" rx={26} fill="url(#btnGradient)" />
                  </Svg>
                  <View style={styles.primaryBtnInner}>
                    <Text style={styles.primaryBtnText}>Start Guided Tour</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                  </View>
                </TouchableOpacity>

                {/* Secondary button: Browse Feature Topics */}
                <TouchableOpacity
                  onPress={handleBrowse}
                  activeOpacity={0.8}
                  style={styles.secondaryBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Browse Feature Topics"
                >
                  <Text style={styles.secondaryBtnText}>Browse Feature Topics</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    position: 'relative',
    alignSelf: 'center',
    borderRadius: 38,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
  },
  scrollContent: {
    paddingTop: 28,
    paddingBottom: 18,
  },
  upperContent: {
    width: '100%',
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  // A. Header Row
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sparkleContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  headerTextCol: {
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1D194B',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontWeight: '500',
    color: '#655F85',
    marginTop: 1,
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressBar: {
    width: 30,
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    backgroundColor: '#6938EF',
  },
  progressInactive: {
    backgroundColor: '#DDD4FA',
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAE4F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  // B. Welcome Section
  welcomeSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  welcomeLeftCol: {
    flex: 1,
    paddingRight: 6,
  },
  welcomeHeading: {
    fontSize: 21,
    fontWeight: '800',
    color: '#1E1B4B',
    letterSpacing: -0.4,
  },
  underlineAccent: {
    marginTop: 2,
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5565',
    lineHeight: 18.5,
  },
  robotContainer: {
    width: 128,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  robotImage: {
    width: '100%',
    height: '100%',
  },

  // C. Feature Cards
  cardsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  featureCard: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7F56D9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E1B4B',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 10,
    fontWeight: '400',
    color: '#667085',
    textAlign: 'center',
    lineHeight: 13,
  },

  // D. Action Buttons
  actionsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginBottom: 8,
  },
  primaryBtnShadow: {
    shadowColor: '#6938EF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryBtnInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#DDD4FA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7F56D9',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryBtnText: {
    color: '#6938EF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
