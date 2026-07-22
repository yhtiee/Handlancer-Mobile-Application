import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Avatar, Button, Card, Icon, Input, LocationInput, LocationValue, Screen, SkillsInput } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/providers/auth-provider';
import { updateProfile, uploadAvatarImage } from '@/services/profiles';
import { useTheme } from '@/hooks/use-theme';

const AVAILABILITY_OPTIONS: { label: string; value: 'available' | 'busy' | 'on_call' | 'offline' }[] = [
  { label: 'Available', value: 'available' },
  { label: 'Busy', value: 'busy' },
  { label: 'On Call', value: 'on_call' },
  { label: 'Offline', value: 'offline' },
];

export function EditProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const isProvider = profile?.role === 'provider';

  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState(profile?.name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [latitude, setLatitude] = useState<number | null | undefined>(profile?.latitude);
  const [longitude, setLongitude] = useState<number | null | undefined>(profile?.longitude);
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [bioFocused, setBioFocused] = useState(false);
  const [services, setServices] = useState<string[]>(profile?.services ?? []);
  const [yearsExperience, setYearsExperience] = useState(
    profile?.years_experience ? String(profile.years_experience) : '',
  );
  const [serviceRadiusKm, setServiceRadiusKm] = useState(
    profile?.service_radius_km ? String(profile.service_radius_km) : '20',
  );
  const [availability, setAvailability] = useState<
    'available' | 'busy' | 'on_call' | 'offline'
  >(profile?.availability || 'available');
  const [businessName, setBusinessName] = useState(profile?.business_name ?? '');
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [accountNumber, setAccountNumber] = useState(profile?.account_number ?? '');
  const [accountName, setAccountName] = useState(profile?.account_name ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function handleLocationChange(loc: LocationValue) {
    setLocation(loc.address);
    if (loc.latitude !== undefined) setLatitude(loc.latitude);
    if (loc.longitude !== undefined) setLongitude(loc.longitude);
  }

  async function pickAvatarImage() {
    if (!profile) return;
    setError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setError('Permission needed to access photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setUploadingAvatar(true);
      const uploadedUrl = await uploadAvatarImage(profile.id, asset.uri, asset.mimeType);
      setAvatarUrl(uploadedUrl);
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    setError(null);
    setNameError(null);

    if (!name.trim()) {
      setNameError('Enter your name');
      return;
    }

    if (!profile) return;

    setSaving(true);

    try {
      await updateProfile(profile.id, {
        avatar_url: avatarUrl,
        name: name.trim(),
        phone: phone.trim() || null,
        location: location.trim() || null,
        latitude,
        longitude,
        bio: bio.trim() || null,
        services: isProvider ? services : profile.services ?? [],
        // years_experience: yearsExperience ? parseInt(yearsExperience, 10) : null,
        service_radius_km: serviceRadiusKm ? parseInt(serviceRadiusKm, 10) : 20,
        availability,
        business_name: businessName.trim() || null,
        bank_name: bankName.trim() || null,
        account_number: accountNumber.trim() || null,
        account_name: accountName.trim() || null,
      });

      await refreshProfile();
      router.back();
    } catch (e) {
      console.log(e)
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: isProvider ? 'Edit Provider Profile' : 'Edit Profile' }} />

      {/* Header Avatar Display with Interactive Photo Edit Badge */}
      <View style={styles.avatarSection}>
        <Pressable onPress={pickAvatarImage} disabled={uploadingAvatar} style={styles.avatarWrapper}>
          <Avatar uri={avatarUrl} name={name || profile?.name} size={96} />
          <View style={[styles.avatarEditBadge, { backgroundColor: theme.tint }]}>
            {uploadingAvatar ? (
              <ActivityIndicator size="small" color={theme.tintText} />
            ) : (
              <Icon name="camera" size={16} color={theme.tintText} />
            )}
          </View>
        </Pressable>
        <Pressable onPress={pickAvatarImage} disabled={uploadingAvatar}>
          <Text style={[styles.avatarHint, { color: theme.tint }]}>
            {uploadingAvatar ? 'Uploading photo...' : 'Change profile photo'}
          </Text>
        </Pressable>
      </View>

      {/* Personal Identity */}
      <SectionCard title="Basic Information">
        <Input
          label="Full Name"
          value={name}
          onChangeText={(val) => {
            setName(val);
            setNameError(null);
          }}
          error={nameError}
          placeholder="Your full name or business name"
        />

        <Input
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          placeholder="+234 800 000 0000"
          keyboardType="phone-pad"
        />

        <LocationInput
          label="Base Location"
          value={location}
          onChangeLocation={handleLocationChange}
          placeholder="e.g. Lekki Phase 1, Lagos"
        />
      </SectionCard>

      {/* Professional Overview & Services */}
      {isProvider ? (
        <>
          <SectionCard title="Professional Profile">
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Bio & Service Overview</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                onFocus={() => setBioFocused(true)}
                onBlur={() => setBioFocused(false)}
                placeholder="Describe your services, skills, equipment, and experience..."
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[
                  styles.textArea,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: bioFocused ? theme.tint : theme.border,
                  },
                ]}
              />
            </View>

            <SkillsInput
              label="Services & Skills Offered"
              skills={services}
              onChangeSkills={setServices}
            />

            <View style={styles.row}>
              {/* <View style={styles.halfWidth}>
                <Input
                  label="Experience (Years)"
                  value={yearsExperience}
                  onChangeText={setYearsExperience}
                  placeholder="e.g. 5"
                  keyboardType="numeric"
                />
              </View> */}
              {/* <View style={styles.halfWidth}>
                <Input
                  label="Coverage Radius (km)"
                  value={serviceRadiusKm}
                  onChangeText={setServiceRadiusKm}
                  placeholder="e.g. 20"
                  keyboardType="numeric"
                />
              </View> */}
            </View>

            {/* Availability Status */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Current Availability</Text>
              <View style={styles.availabilityRow}>
                {AVAILABILITY_OPTIONS.map((opt) => {
                  const isSelected = availability === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setAvailability(opt.value)}
                      style={[
                        styles.availChip,
                        {
                          backgroundColor: isSelected ? theme.tint : theme.backgroundElement,
                          borderColor: isSelected ? theme.tint : theme.border,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.availChipText,
                          { color: isSelected ? theme.tintText : theme.text },
                        ]}>
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SectionCard>

          {/* Business & Bank Payout Details */}
          <SectionCard title="Business & Bank Details">
            <Input
              label="Registered Business Name (Optional)"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Syeila Plumbing Services Ltd"
            />

            <Input
              label="Bank Name"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. GTBank, Access Bank, Kuda"
            />

            <Input
              label="Account Number (NUBAN)"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="10-digit account number"
              keyboardType="numeric"
              maxLength={10}
            />

            <Input
              label="Account Holder Name"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="Name as registered with bank"
            />
          </SectionCard>
        </>
      ) : (
        <SectionCard title="About You">
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Bio</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              onFocus={() => setBioFocused(true)}
              onBlur={() => setBioFocused(false)}
              placeholder="Tell us about yourself..."
              placeholderTextColor={theme.textSecondary}
              multiline
              style={[
                styles.textArea,
                {
                  color: theme.text,
                  backgroundColor: theme.backgroundElement,
                  borderColor: bioFocused ? theme.tint : theme.border,
                },
              ]}
            />
          </View>
        </SectionCard>
      )}

      {error ? (
        <Text selectable style={[styles.error, { color: theme.danger }]}>
          {error}
        </Text>
      ) : null}

      <Button title="Save Changes" size="lg" loading={saving} onPress={save} />
    </Screen>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Card padded style={styles.card}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{title}</Text>
      <View style={styles.cardContent}>{children}</View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { gap: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.six },
  avatarSection: { alignItems: 'center', gap: Spacing.two },
  avatarWrapper: { position: 'relative' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
  },
  avatarHint: { fontSize: 14, fontWeight: '700' },
  card: { gap: Spacing.three },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  cardContent: { gap: Spacing.three },
  field: { gap: Spacing.one },
  label: { fontSize: 13, fontWeight: '600' },
  textArea: {
    minHeight: 90,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: Spacing.two },
  halfWidth: { flex: 1 },
  availabilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  availChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  availChipText: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 14, textAlign: 'center' },
});
