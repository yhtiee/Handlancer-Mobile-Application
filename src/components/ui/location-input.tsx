import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LocationValue = {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationInputProps = {
  label?: string;
  value: string;
  onChangeLocation: (val: LocationValue) => void;
  placeholder?: string;
  error?: string | null;
};

function isExpoLocationAvailable(): boolean {
  try {
    const { NativeModulesProxy } = require('expo-modules-core');
    if (NativeModulesProxy?.ExpoLocation) return true;
    if ((globalThis as Record<string, any>)?.ExpoModules?.ExpoLocation) return true;
    return false;
  } catch (e) {
    return false;
  }
}

export function LocationInput({
  label = 'Location',
  value,
  onChangeLocation,
  placeholder = 'e.g. Lekki, Lagos',
  error,
}: LocationInputProps) {
  const theme = useTheme();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  async function handleUseDeviceLocation() {
    setLocError(null);
    setLocating(true);

    try {
      // 1. Try Native expo-location module ONLY if native module is registered in app binary
      if (isExpoLocationAvailable()) {
        try {
          const LocationModule = require('expo-location');
          const { status } = await LocationModule.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            setLocError('Permission to access location was denied');
            setLocating(false);
            return;
          }

          const pos = await LocationModule.getCurrentPositionAsync({
            accuracy: LocationModule.Accuracy.Balanced,
          });

          const { latitude, longitude } = pos.coords;
          let addressString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

          try {
            const [geocode] = await LocationModule.reverseGeocodeAsync({ latitude, longitude });
            if (geocode) {
              const parts = [
                geocode.name || geocode.street,
                geocode.district || geocode.subregion,
                geocode.city,
                geocode.region,
              ].filter((p): p is string => Boolean(p && p.trim() && !p.includes('undefined')));

              if (parts.length > 0) {
                const uniqueParts = Array.from(new Set(parts));
                addressString = uniqueParts.join(', ');
              }
            }
          } catch (e) {
            // Keep coordinate fallback
          }

          onChangeLocation({
            address: addressString,
            latitude,
            longitude,
          });
          setLocating(false);
          return;
        } catch (e) {
          // Native expo location failed
        }
      }

      // 2. Try Web / Browser Geolocation API
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const latitude = pos.coords.latitude;
            const longitude = pos.coords.longitude;
            let addressString = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

            try {
              const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
              );
              const data = await res.json();
              if (data?.display_name) {
                const addr = data.address || {};
                const parts = [
                  addr.road || addr.suburb,
                  addr.city || addr.town || addr.county || addr.state,
                ].filter(Boolean);
                if (parts.length) addressString = parts.join(', ');
              }
            } catch (e) {
              // Fallback to coordinates
            }

            onChangeLocation({
              address: addressString,
              latitude,
              longitude,
            });
            setLocating(false);
          },
          (err) => {
            setLocError('Could not fetch location automatically. Please type it in.');
            setLocating(false);
          },
          { timeout: 10000, enableHighAccuracy: true },
        );
        return;
      }

      setLocError('Location service is unavailable on this device. Please type your location manually.');
    } catch (err) {
      setLocError(err instanceof Error ? err.message : 'Could not fetch device location');
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.container}>
      <Input
        label={label}
        value={value}
        onChangeText={(text) => onChangeLocation({ address: text })}
        placeholder={placeholder}
        error={error || locError}
      />

      <Pressable
        onPress={handleUseDeviceLocation}
        disabled={locating}
        style={({ pressed }) => [
          styles.gpsBtn,
          {
            backgroundColor: theme.tint + '14',
            borderColor: theme.tint + '33',
            opacity: pressed || locating ? 0.7 : 1,
          },
        ]}>
        {locating ? (
          <ActivityIndicator size="small" color={theme.tint} />
        ) : (
          <Icon name="location-outline" size={16} color={theme.tint} />
        )}
        <Text style={[styles.gpsBtnText, { color: theme.tint }]}>
          {locating ? 'Getting current location...' : 'Use current location'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + 2,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignSelf: 'flex-start',
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
