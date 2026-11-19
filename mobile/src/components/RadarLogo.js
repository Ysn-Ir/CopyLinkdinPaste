import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export function RadarLogo({ size = 32, showWordmark = true, wordmarkSize = 16, subtitle = null, light = false }) {
  const outerSize = size
  const innerSize = size * 0.62
  const dotSize = Math.max(5, size * 0.22)
  const dotOffset = size * 0.22

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.radarCircle,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderColor: light ? '#FFFFFF' : '#09090B',
          },
        ]}
      >
        {/* Inner concentric ring */}
        <View
          style={[
            styles.radarInnerCircle,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              borderColor: light ? 'rgba(255, 255, 255, 0.4)' : '#CBD5E1',
            },
          ]}
        />

        {/* Crosshair horizontal */}
        <View
          style={[
            styles.crosshairH,
            {
              width: outerSize * 0.88,
              backgroundColor: light ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 116, 139, 0.4)',
            },
          ]}
        />

        {/* Crosshair vertical */}
        <View
          style={[
            styles.crosshairV,
            {
              height: outerSize * 0.88,
              backgroundColor: light ? 'rgba(255, 255, 255, 0.3)' : 'rgba(100, 116, 139, 0.4)',
            },
          ]}
        />

        {/* Center transceiver core */}
        <View
          style={{
            width: Math.max(3, size * 0.14),
            height: Math.max(3, size * 0.14),
            borderRadius: Math.max(3, size * 0.14) / 2,
            backgroundColor: light ? '#FFFFFF' : '#09090B',
            position: 'absolute',
          }}
        />

        {/* Tactical Crimson Beacon Dot */}
        <View
          style={[
            styles.beaconDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              top: dotOffset,
              right: dotOffset,
            },
          ]}
        />
      </View>

      {showWordmark && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.wordmark,
              {
                fontSize: wordmarkSize,
                color: light ? '#FFFFFF' : '#09090B',
              },
            ]}
          >
            RADAR
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: light ? 'rgba(255, 255, 255, 0.7)' : '#64748B',
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  radarCircle: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  radarInnerCircle: {
    borderWidth: 1,
    position: 'absolute',
  },
  crosshairH: {
    height: 1,
    position: 'absolute',
  },
  crosshairV: {
    width: 1,
    position: 'absolute',
  },
  beaconDot: {
    position: 'absolute',
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  textContainer: {
    justifyContent: 'center',
  },
  wordmark: {
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: -1,
  },
})
