import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as MailComposer from 'expo-mail-composer';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Button, Card, GlobalLoader, Icon, type IconName, Screen } from '@/components/ui';
import { Radius, Spacing, Type } from '@/constants/theme';
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP_DISPLAY, whatsappUrl } from '@/constants/support';
import {
  buildDisputeReport,
  buildDisputeSubject,
  DISPUTE_CATEGORIES,
  DISPUTE_OUTCOMES,
  MAX_DESCRIPTION,
  type DisputeCategory,
  type DisputeOutcome,
  type DisputeReportInput,
} from '@/lib/dispute-report';
import { useAuth } from '@/providers/auth-provider';
import { useJobDispute, useOpenDispute } from '@/queries/use-disputes';
import { useJob } from '@/queries/use-jobs';
import { useJobMedia } from '@/queries/use-media';
import { useProvider } from '@/queries/use-providers';
import { useEscrow } from '@/queries/use-wallet';
import { useTheme } from '@/hooks/use-theme';

const MIN_DESCRIPTION = 30;

/**
 * The sad path: what the client does instead of approving and reviewing.
 *
 * Two steps on purpose. Step one gets the three facts support always has to ask
 * for anyway and files the ticket — that is the moment the job freezes and the
 * provider is notified, and it must not depend on the user successfully getting
 * through to a mail app. Step two is the hand-off: the app has already written
 * the report, so all that is left is choosing a channel to send it down.
 *
 * Nothing here settles the escrow. Only support can, via admin_resolve_dispute
 * (migration 0009) — which is why every word on this screen is about getting a
 * complete, readable report in front of a human as fast as possible.
 */
export default function DisputeJob() {
  const theme = useTheme();
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile } = useAuth();

  const { data: job, isLoading } = useJob(jobId);
  const { data: escrow } = useEscrow(jobId);
  const { data: media } = useJobMedia(jobId);
  const { data: provider } = useProvider(job?.hired_provider_id ?? '');
  const { data: existing } = useJobDispute(jobId);
  const openDispute = useOpenDispute(jobId);

  const [category, setCategory] = useState<DisputeCategory | null>(null);
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState<DisputeOutcome | null>(null);
  const [shots, setShots] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sentVia, setSentVia] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // A ticket already filed — on this visit or a previous one — puts the screen
  // straight into the hand-off, so someone returning to chase it up gets the
  // reference and the buttons rather than a blank form they already filled in.
  const live = existing && (existing.status === 'open' || existing.status === 'in_review')
    ? existing
    : null;
  const filed = openDispute.data ?? live;
  const step: 'describe' | 'send' = filed ? 'send' : 'describe';

  // Rehydrated from the row when the screen opens onto an existing ticket, so
  // the report reads the same on the second visit as it did on the first.
  const answers = {
    category: (category ?? (filed?.category as DisputeCategory | null) ?? 'other') as DisputeCategory,
    description: description || filed?.reason || '',
    outcome: (outcome ??
      (filed?.desired_outcome as DisputeOutcome | null) ??
      'advice') as DisputeOutcome,
  };

  const reportInput: DisputeReportInput | null = useMemo(
    () =>
      job
        ? {
            job,
            escrow,
            provider,
            reporter: profile,
            media,
            answers,
            dispute: filed,
            attachmentCount: shots.length,
          }
        : null,
    // `answers` and `filed` are rebuilt each render from the state below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [job, escrow, provider, profile, media, filed, shots.length, category, description, outcome],
  );

  if (isLoading || !job) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <Stack.Screen options={{ title: 'Report a Problem' }} />
        {isLoading ? (
          <GlobalLoader backgroundColor="transparent" />
        ) : (
          <Text style={[Type.body, { color: theme.textSecondary }]}>Job not found.</Text>
        )}
      </View>
    );
  }

  /** Files the ticket. Everything consequential happens server-side in one go. */
  async function fileDispute() {
    setError(null);
    if (!category) return setError('Choose what went wrong.');
    if (description.trim().length < MIN_DESCRIPTION) {
      return setError(
        `Please describe the problem in a little more detail — at least ${MIN_DESCRIPTION} characters.`,
      );
    }
    if (!outcome) return setError('Tell us what you would like to happen.');

    try {
      await openDispute.mutateAsync({
        reason: description.trim(),
        category,
        desiredOutcome: outcome,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the dispute.');
    }
  }

  /**
   * Screenshots. Only the email route can carry them; WhatsApp needs the user to
   * attach them by hand, which the report says in as many words.
   *
   * No permission request: SDK 56 does not need one to launch the library, and
   * asking for one the picker will not use only adds a way to fail.
   */
  async function pickScreenshots() {
    setError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      setShots((prev) => [...prev, ...result.assets].slice(0, 6));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your photos.');
    }
  }

  async function emailSupport() {
    if (!reportInput) return;
    setError(null);
    try {
      if (!(await MailComposer.isAvailableAsync())) {
        setError(
          `No mail app is set up on this phone. Use WhatsApp below, or copy the report and email it to ${SUPPORT_EMAIL} from anywhere.`,
        );
        return;
      }
      await MailComposer.composeAsync({
        recipients: [SUPPORT_EMAIL],
        subject: buildDisputeSubject(reportInput),
        body: buildDisputeReport(reportInput, 'email'),
        attachments: shots.map((s) => s.uri),
      });
      // Android always reports "sent" and iOS reports a cancel as a dismissal,
      // so the result is not trustworthy enough to claim delivery. The prompt
      // below just tells the user where things stand.
      setSentVia('email');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open your mail app.');
    }
  }

  async function whatsappSupport() {
    if (!reportInput) return;
    setError(null);
    try {
      await Linking.openURL(whatsappUrl(buildDisputeReport(reportInput, 'whatsapp')));
      setSentVia('whatsapp');
    } catch {
      setError(
        `Could not open WhatsApp. Message ${SUPPORT_WHATSAPP_DISPLAY} directly, or copy the report below.`,
      );
    }
  }

  async function copyReport() {
    if (!reportInput) return;
    await Clipboard.setStringAsync(buildDisputeReport(reportInput, 'clipboard'));
    setSentVia('clipboard');
  }

  return (
    <>
      <Stack.Screen
        options={{ title: step === 'describe' ? 'Report a Problem' : 'Contact Support' }}
      />
      <Screen contentContainerStyle={styles.content}>
        {step === 'describe' ? (
          <DescribeStep
            job={job.title}
            category={category}
            onCategory={(value) => {
              setCategory(value);
              setError(null);
            }}
            description={description}
            onDescription={(value) => {
              setDescription(value);
              if (value.trim().length >= MIN_DESCRIPTION) setError(null);
            }}
            outcome={outcome}
            onOutcome={(value) => {
              setOutcome(value);
              setError(null);
            }}
          />
        ) : (
          <SendStep
            reference={filed?.reference ?? null}
            providerName={provider?.business_name || provider?.name || 'the provider'}
            shots={shots}
            onPickShots={pickScreenshots}
            onClearShots={() => setShots([])}
            // The email variant, since that is the leading action and the only
            // one whose attachment line changes with what has been picked.
            report={reportInput ? buildDisputeReport(reportInput, 'email') : ''}
            showReport={showReport}
            onToggleReport={() => setShowReport((v) => !v)}
            sentVia={sentVia}
            onEmail={emailSupport}
            onWhatsapp={whatsappSupport}
            onCopy={copyReport}
          />
        )}

        {error ? (
          <Text selectable style={[Type.callout, { color: theme.danger }]}>
            {error}
          </Text>
        ) : null}

        {step === 'describe' ? (
          <Button
            title="Open dispute"
            size="lg"
            variant="destructive"
            icon="warning"
            loading={openDispute.isPending}
            onPress={fileDispute}
          />
        ) : (
          <Button title="Back to the job" variant="ghost" onPress={() => router.back()} />
        )}
      </Screen>
    </>
  );
}

/* ────────────────────────── Step one: what happened ────────────────────────── */

function DescribeStep({
  job,
  category,
  onCategory,
  description,
  onDescription,
  outcome,
  onOutcome,
}: {
  job: string;
  category: DisputeCategory | null;
  onCategory: (value: DisputeCategory) => void;
  description: string;
  onDescription: (value: string) => void;
  outcome: DisputeOutcome | null;
  onOutcome: (value: DisputeOutcome) => void;
}) {
  const theme = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.stack}>
      {/* What the button they are about to press actually does. Opening a
          dispute is not reversible from inside the app, so it is spelled out
          before the form, not after it. */}
      <View
        style={[
          styles.notice,
          { backgroundColor: theme.warning + '14', borderColor: theme.warning + '38' },
        ]}>
        <Icon name="shield-half" size={18} color={theme.warning} />
        <View style={styles.noticeBody}>
          <Text style={[Type.bodyMedium, { color: theme.text }]}>
            Opening a dispute on “{job}” will:
          </Text>
          <Bullet text="Hold every naira still in escrow — nothing can be released until it is settled" />
          <Bullet text="Notify the provider that the job is disputed" />
          <Bullet text="Pause the approve-and-review flow for this job" />
          <Bullet text="Hand you a reference to quote to our support team" />
        </View>
      </View>

      <Field
        n={1}
        label="What went wrong?"
        hint="Pick the closest fit — support uses it to route your case."
      />
      <View style={styles.chips}>
        {DISPUTE_CATEGORIES.map((c) => {
          const on = category === c.value;
          return (
            <Pressable
              key={c.value}
              onPress={() => onCategory(c.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.chip,
                {
                  backgroundColor: on ? theme.tint + '1F' : theme.backgroundElement,
                  borderColor: on ? theme.tint : theme.border,
                },
              ]}>
              <Text style={[Type.callout, { color: on ? theme.tint : theme.text }]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {category ? (
        <Text style={[Type.caption, { color: theme.textSecondary }]}>
          {DISPUTE_CATEGORIES.find((c) => c.value === category)?.hint}
        </Text>
      ) : null}

      <Field
        n={2}
        label="Tell us what happened"
        hint="Dates, what was agreed, what was actually delivered, and anything you already raised with the provider."
      />
      <TextInput
        value={description}
        onChangeText={onDescription}
        placeholder={
          'e.g. The provider finished on 18 Sept but two of the sockets do not work and the wall was left unpatched. I messaged him on the 19th and he said he would return — he has not.'
        }
        placeholderTextColor={theme.textSecondary}
        multiline
        maxLength={MAX_DESCRIPTION}
        style={[
          styles.textArea,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}
      />
      <Text style={[Type.caption, { color: theme.textSecondary }]}>
        {description.trim().length < MIN_DESCRIPTION
          ? `${MIN_DESCRIPTION - description.trim().length} more characters`
          : description.length > MAX_DESCRIPTION - 200
            ? `${MAX_DESCRIPTION - description.length} characters left`
            : 'Thanks — that is enough for support to work with.'}
      </Text>

      <Field n={3} label="What would you like to happen?" hint="Your preference, not a promise." />
      <View style={styles.options}>
        {DISPUTE_OUTCOMES.map((o) => {
          const on = outcome === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onOutcome(o.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              style={[
                styles.option,
                {
                  backgroundColor: on ? theme.tint + '12' : theme.backgroundElement,
                  borderColor: on ? theme.tint : theme.border,
                },
              ]}>
              <Icon
                name={on ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={on ? theme.tint : theme.textSecondary}
              />
              <Text style={[Type.body, { color: theme.text, flex: 1 }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

/* ───────────────────────── Step two: send it to support ───────────────────────── */

function SendStep({
  reference,
  providerName,
  shots,
  onPickShots,
  onClearShots,
  report,
  showReport,
  onToggleReport,
  sentVia,
  onEmail,
  onWhatsapp,
  onCopy,
}: {
  reference: string | null;
  providerName: string;
  shots: ImagePicker.ImagePickerAsset[];
  onPickShots: () => void;
  onClearShots: () => void;
  report: string;
  showReport: boolean;
  onToggleReport: () => void;
  sentVia: string | null;
  onEmail: () => void;
  onWhatsapp: () => void;
  onCopy: () => void;
}) {
  const theme = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify().damping(18)} style={styles.stack}>
      {/* Confirmation first: the consequential part is already done, and the
          user should not be left wondering whether it took. */}
      <View
        style={[
          styles.notice,
          { backgroundColor: theme.success + '12', borderColor: theme.success + '38' },
        ]}>
        <Icon name="checkmark-circle" size={18} color={theme.success} />
        <View style={styles.noticeBody}>
          <Text style={[Type.bodyMedium, { color: theme.text }]}>Your dispute is on record</Text>
          <Text style={[Type.callout, { color: theme.textSecondary }]}>
            The escrow is frozen and {providerName} has been notified. Nothing is released until
            support settles it.
          </Text>
          {reference ? (
            <View style={[styles.ref, { backgroundColor: theme.backgroundSelected }]}>
              <Text style={[Type.caption, { color: theme.textSecondary }]}>REFERENCE</Text>
              <Text selectable style={[Type.h3, { color: theme.text, letterSpacing: 1 }]}>
                {reference}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.stack}>
        <Text style={[Type.h3, { color: theme.text }]}>Now send it to support</Text>
        <Text style={[Type.body, { color: theme.textSecondary }]}>
          We have written the report for you — your job reference, the provider, exactly what is
          held in escrow, and the photos already on the job are all in it. Pick a channel and it
          goes across filled in.
        </Text>
      </View>

      {/* ── Screenshot guidance. The single biggest determinant of how fast a
            ticket is resolved, so it gets its own card rather than a line of
            small print under the buttons. ─────────────────────────────── */}
      <Card>
        <View style={styles.cardHead}>
          <Icon name="images" size={18} color={theme.tint} />
          <Text style={[Type.title, { color: theme.text }]}>Add screenshots</Text>
        </View>
        <Text style={[Type.callout, { color: theme.textSecondary, marginTop: Spacing.two }]}>
          Not required, but a case with evidence is usually settled in a single reply. Worth
          including:
        </Text>
        <View style={{ marginTop: Spacing.two }}>
          <Bullet text="Photos of the problem itself, in good light and wide enough to show context" />
          <Bullet text="Your chat with the provider — especially anything they agreed to" />
          <Bullet text="The quote or receipt if the amount is what you are disputing" />
          <Bullet text="Full-screen captures, not crops: the timestamps are the point" />
        </View>

        <View style={[styles.shotRow, { borderTopColor: theme.border }]}>
          <Text style={[Type.callout, { color: theme.textSecondary, flex: 1 }]}>
            {shots.length
              ? `${shots.length} attached — they will go with the email`
              : 'Nothing attached yet'}
          </Text>
          {shots.length ? (
            <Pressable onPress={onClearShots} hitSlop={8}>
              <Text style={[Type.callout, { color: theme.danger }]}>Clear</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={onPickShots} hitSlop={8}>
            <Text style={[Type.callout, { color: theme.tint }]}>
              {shots.length ? 'Add more' : 'Choose'}
            </Text>
          </Pressable>
        </View>
        <Text style={[Type.caption, { color: theme.textSecondary, marginTop: Spacing.two }]}>
          WhatsApp cannot receive attachments from a link — send your screenshots into the chat
          right after the message.
        </Text>
      </Card>

      {/* ── The channels. Email leads because it carries attachments and gives
            support a thread; WhatsApp is the faster one to reach a person. ── */}
      <View style={styles.stack}>
        <Button title="Email support" size="lg" icon="mail" onPress={onEmail} />
        <Text style={[Type.caption, { color: theme.textSecondary }]}>
          Opens your mail app, addressed to {SUPPORT_EMAIL} with the report and your screenshots
          already attached.
        </Text>

        <Button
          title="Send on WhatsApp"
          size="lg"
          variant="secondary"
          icon="logo-whatsapp"
          onPress={onWhatsapp}
        />
        <Text style={[Type.caption, { color: theme.textSecondary }]}>
          Opens a chat with {SUPPORT_WHATSAPP_DISPLAY}, message pre-written.
        </Text>

        <Button title="Copy the report" variant="ghost" icon="copy" onPress={onCopy} />
      </View>

      {sentVia ? (
        <View style={[styles.sent, { backgroundColor: theme.tint + '12' }]}>
          <Icon name="information-circle" size={16} color={theme.tint} />
          <Text style={[Type.callout, { color: theme.text, flex: 1 }]}>
            {sentVia === 'clipboard'
              ? 'Report copied. Paste it into an email or message to support.'
              : 'Check that the message actually sent — nothing reaches support until it leaves your outbox.'}
          </Text>
        </View>
      ) : null}

      {/* ── The exact text, on demand. People are being asked to send a message
            in their own name; they are entitled to read it first. ─────── */}
      <Pressable onPress={onToggleReport} style={styles.reveal} hitSlop={8}>
        <Icon name={showReport ? 'chevron-down' : 'chevron-forward'} size={16} color={theme.tint} />
        <Text style={[Type.callout, { color: theme.tint }]}>
          {showReport ? 'Hide the report' : 'Preview what will be sent'}
        </Text>
      </Pressable>
      {showReport ? (
        <Card padded={false}>
          <Text selectable style={[styles.report, { color: theme.textSecondary }]}>
            {report}
          </Text>
        </Card>
      ) : null}

      <Text style={[Type.caption, { color: theme.textSecondary }]}>
        Support aims to reply within one business day. You will get a notification here the moment
        the dispute is settled, and the escrow moves only then.
      </Text>
    </Animated.View>
  );
}

/* ────────────────────────────── Small pieces ────────────────────────────── */

function Field({ n, label, hint }: { n: number; label: string; hint: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldHead}>
        <View style={[styles.step, { backgroundColor: theme.tint + '1F' }]}>
          <Text style={[Type.micro, { color: theme.tint }]}>{n}</Text>
        </View>
        <Text style={[Type.h3, { color: theme.text }]}>{label}</Text>
      </View>
      <Text style={[Type.caption, { color: theme.textSecondary }]}>{hint}</Text>
    </View>
  );
}

function Bullet({ text, icon = 'ellipse' }: { text: string; icon?: IconName }) {
  const theme = useTheme();
  return (
    <View style={styles.bullet}>
      <Icon name={icon} size={5} color={theme.textSecondary} />
      <Text style={[Type.callout, { color: theme.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: Spacing.three, gap: Spacing.four },
  stack: { gap: Spacing.three },

  notice: {
    flexDirection: 'row',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  noticeBody: { flex: 1, gap: Spacing.two },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 3 },

  field: { gap: Spacing.one },
  fieldHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  step: {
    width: 20,
    height: 20,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },

  textArea: {
    minHeight: 150,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: 16,
    lineHeight: 22,
    textAlignVertical: 'top',
  },

  options: { gap: Spacing.two },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    borderWidth: 1,
  },

  ref: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    gap: 2,
  },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  shotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },

  sent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.twoHalf,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
  },

  reveal: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  report: {
    fontFamily: process.env.EXPO_OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    lineHeight: 16,
    padding: Spacing.three,
  },
});
