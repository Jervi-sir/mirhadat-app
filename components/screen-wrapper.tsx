import React, { useCallback, useEffect, useRef } from 'react';
import {
  View,
  ViewStyle,
  Keyboard,
  TouchableWithoutFeedback,
  StatusBar,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Animated, // ⬅️ add
  Easing,   // ⬅️ add
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type Props = {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  disableTopInset?: boolean;
  dismissKeyboardOnPress?: boolean;
  statusBarStyle?: 'default' | 'light-content' | 'dark-content';
  statusBarBg?: string;
  backgroundImage?: ImageSourcePropType;
  backgroundResizeMode?: 'cover' | 'contain' | 'stretch' | 'center' | 'repeat';
  backgroundOverlayColor?: string;
  backgroundFallbackColor?: string;

  /** Enable smooth floating animation for the background image */
  animateBackground?: boolean;

  /** Max movement from center in px (both axes). Default 22 */
  backgroundAnimationRadius?: number;

  /** Base speed (lower=faster). Default 12000 ms for one X cycle */
  backgroundAnimationSpeedMs?: number;

  /** Add slight rotation sway (degrees). Default 2 */
  backgroundAnimationRotateDeg?: number;
};

const AnimatedImageBackground = Animated.createAnimatedComponent(ImageBackground);

export const ScreenWrapper: React.FC<Props> = ({
  children,
  style,
  disableTopInset = false,
  dismissKeyboardOnPress = false,
  statusBarStyle = 'dark-content',
  statusBarBg,
  backgroundImage,
  backgroundResizeMode = 'cover',
  backgroundOverlayColor,
  backgroundFallbackColor = '#111523',
  animateBackground = false,
  backgroundAnimationRadius = 12,
  backgroundAnimationSpeedMs = 42000,
  backgroundAnimationRotateDeg = 0,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(statusBarStyle, true);
      if (statusBarBg) {
        StatusBar.setBackgroundColor(statusBarBg, true);
        StatusBar.setTranslucent(false);
      }
      return () => {
        StatusBar.setBarStyle('dark-content', true);
      };
    }, [statusBarStyle, statusBarBg])
  );

  // Make body transparent if we have an image behind it
  const bodyBaseBg = backgroundImage ? 'transparent' : '#F5F5F5';

  const Body = (
    <View
      style={[
        { flex: 1, backgroundColor: bodyBaseBg, paddingTop: disableTopInset ? 10 : insets.top },
        style,
      ]}
    >
      {children}
    </View>
  );

  const Content = dismissKeyboardOnPress ? (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false} touchSoundDisabled>
      <View style={{ flex: 1 }}>{Body}</View>
    </TouchableWithoutFeedback>
  ) : (
    Body
  );

  if (!backgroundImage) return Content;

  if (!animateBackground) {
    return (
      <ImageBackground
        source={backgroundImage}
        resizeMode={backgroundResizeMode}
        style={{ flex: 1, backgroundColor: backgroundFallbackColor }}
      >
        {backgroundOverlayColor ? (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: backgroundOverlayColor }} />
        ) : null}
        {Content}
      </ImageBackground>
    );
  }

  // --- Animated version ---
  // Two loops out of phase for X & Y + tiny rotation.
  const x = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(0)).current;
  const r = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const easing = Easing.inOut(Easing.quad);

    // X oscillation
    Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: backgroundAnimationSpeedMs, easing, useNativeDriver: true }),
        Animated.timing(x, { toValue: 0, duration: backgroundAnimationSpeedMs, easing, useNativeDriver: true }),
      ])
    ).start();

    // Y oscillation (different speed creates pseudo-circular motion)
    Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: 1, duration: Math.round(backgroundAnimationSpeedMs * 1.35), easing, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: Math.round(backgroundAnimationSpeedMs * 1.35), easing, useNativeDriver: true }),
      ])
    ).start();

    // slight rotate sway
    Animated.loop(
      Animated.sequence([
        Animated.timing(r, { toValue: 1, duration: Math.round(backgroundAnimationSpeedMs * 1.8), easing, useNativeDriver: true }),
        Animated.timing(r, { toValue: 0, duration: Math.round(backgroundAnimationSpeedMs * 1.8), easing, useNativeDriver: true }),
      ])
    ).start();
  }, [backgroundAnimationSpeedMs, x, y, r]);

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: [-backgroundAnimationRadius, backgroundAnimationRadius],
  });

  const translateY = y.interpolate({
    inputRange: [0, 1],
    outputRange: [backgroundAnimationRadius, -backgroundAnimationRadius],
  });

  const rotate = r.interpolate({
    inputRange: [0, 1],
    outputRange: [`-${backgroundAnimationRotateDeg}deg`, `${backgroundAnimationRotateDeg}deg`],
  });

  // Slightly oversize the image so edges don't show during movement.
  const overscan = 70; // px
  const bgStyle = {
    width: width + overscan,
    height: height + overscan,
    left: -overscan / 2,
    top: -overscan / 2,
  };

  return (
    <View style={{ flex: 1, backgroundColor: backgroundFallbackColor }}>
      <AnimatedImageBackground
        source={backgroundImage}
        resizeMode={backgroundResizeMode}
        style={[
          StyleSheet.absoluteFill,
          bgStyle,
          { transform: [{ translateX }, { translateY }, { rotate }] },
        ]}
      >
        {backgroundOverlayColor ? (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: backgroundOverlayColor }} />
        ) : null}
      </AnimatedImageBackground>

      {Content}
    </View>
  );
};
