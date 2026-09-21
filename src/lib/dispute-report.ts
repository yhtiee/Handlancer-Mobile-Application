import { formatMoney } from '@/components/ui/money-text';
import { formatDate, formatDateTime } from '@/lib/date';
import type { Dispute, Escrow, JobMedia, Profile } from '@/services/database.types';
import type { JobWithOwner } from '@/services/jobs';

/**
 * The one place a dispute is turned into words.
 *
 * Support's problem is never that people write too little — it is that the
 * first message is "the guy did a bad job", and three round trips go by before
 * anyone knows which job, how much is held, or what the reporter actually wants.
 * So the report is assembled here from what the app already knows, and the only
 * parts a human writes are the parts only a human can.
 *
 * Email and WhatsApp render from the same builder. If they diverged, the channel
 * someone picked would decide how fast they got helped.
 */

/** The three questions support asks every time, asked once, up front. */
export type DisputeAnswers = {
  category: DisputeCategory;
  description: string;
  outcome: DisputeOutcome;
};

export type DisputeCategory =
  | 'quality'
  | 'incomplete'
  | 'no_show'
  | 'damage'
  | 'overcharged'
  | 'conduct'
  | 'other';

export type DisputeOutcome = 'redo' | 'partial_refund' | 'full_refund' | 'advice';

export const DISPUTE_CATEGORIES: { value: DisputeCategory; label: string; hint: string }[] = [
  { value: 'quality', label: 'Poor quality', hint: 'The work was done, but not to standard' },
  { value: 'incomplete', label: 'Unfinished', hint: 'Marked complete, but parts are missing' },
  { value: 'no_show', label: 'Did not show up', hint: 'The provider never arrived or stopped coming' },
  { value: 'damage', label: 'Damage', hint: 'Something of mine was damaged during the job' },
  { value: 'overcharged', label: 'Wrong amount', hint: 'Charged for more than was agreed' },
  { value: 'conduct', label: 'Conduct', hint: 'How the provider behaved on site' },
  { value: 'other', label: 'Something else', hint: 'None of the above fits' },
];

export const DISPUTE_OUTCOMES: { value: DisputeOutcome; label: string }[] = [
  { value: 'redo', label: 'The provider returns and fixes it' },
  { value: 'partial_refund', label: 'A partial refund' },
  { value: 'full_refund', label: 'A full refund' },
  { value: 'advice', label: "I'm not sure — I need advice" },
];

export function categoryLabel(value: DisputeCategory): string {
  return DISPUTE_CATEGORIES.find((c) => c.value === value)?.label ?? 'Something else';
}

export function outcomeLabel(value: DisputeOutcome): string {
  return DISPUTE_OUTCOMES.find((o) => o.value === value)?.label ?? 'Not stated';
}

/**
 * How long a reporter's own account may be.
 *
 * Not an editorial judgement — the whole report travels inside a `wa.me` query
 * string, and an unbounded description is the one field that could push that URL
 * past what a browser or Android intent will carry. Everything else in the
 * report has a known ceiling.
 */
export const MAX_DESCRIPTION = 1500;

/** `in_progress` → `In progress`. The raw enum is not for support to decode. */
function humanStatus(status: string): string {
  const spaced = status.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export type DisputeReportInput = {
  job: JobWithOwner;
  escrow: Escrow | null | undefined;
  provider: Profile | null | undefined;
  reporter: Profile | null | undefined;
  media: JobMedia[] | undefined;
  answers: DisputeAnswers;
  /** Present once the ticket is filed; its reference is what support searches on. */
  dispute: Dispute | null | undefined;
  /** How many screenshots the reporter picked, so the report can account for them. */
  attachmentCount?: number;
};

/** Channel-specific tail. Email can carry files; WhatsApp needs a human to attach them. */
export type ReportChannel = 'email' | 'whatsapp' | 'clipboard';

/** Labelled lines, padded so the values sit in a column in a monospace mail client. */
function block(rows: [string, string | null | undefined][]): string {
  const present = rows.filter(([, value]) => value != null && value !== '');
  if (!present.length) return '';
  const width = Math.max(...present.map(([label]) => label.length));
  return present.map(([label, value]) => `${(label + ':').padEnd(width + 2)}${value}`).join('\n');
}

function section(heading: string, body: string): string {
  return body.trim() ? `${heading}\n${body.trim()}` : '';
}

/**
 * What is still at stake, and what has already gone out. Support's first
 * question on every ticket, because it bounds what they can actually do: money
 * already in the provider's wallet cannot be pulled back from inside the app.
 */
function moneyBlock(escrow: Escrow | null | undefined): string {
  if (!escrow) return 'No escrow was funded on this job.';

  const materialsOut = escrow.materials_released ? escrow.materials_amount : 0;
  const held = escrow.workmanship_released ? 0 : escrow.total - materialsOut;

  return block([
    ['Agreed total', formatMoney(escrow.total)],
    [
      'Materials',
      escrow.materials_amount > 0
        ? `${formatMoney(escrow.materials_amount)} — ${escrow.materials_released ? 'already released to the provider' : 'still held'}`
        : 'None in this quote',
    ],
    [
      'Final payment',
      escrow.workmanship_released ? 'Already released' : 'NOT released — awaiting this dispute',
    ],
    ['Still in escrow', formatMoney(held > 0 ? held : 0)],
  ]);
}

/**
 * Proof the provider already uploaded, as links.
 *
 * These are public storage URLs, so support can open them without an account —
 * which is the difference between reading the ticket and having to ask for the
 * photos. Capped: a job with thirty photos would push the WhatsApp deep link
 * past what an Android intent will carry, and the rest are one tap away in the
 * admin view anyway.
 */
function evidenceBlock(media: JobMedia[] | undefined): string {
  if (!media?.length) return 'No before/after media was uploaded to this job.';

  const shown = media.slice(0, 6);
  const lines = shown.map(
    (m) => `• ${m.phase === 'before' ? 'Before' : 'After'} (${m.kind}) — ${m.url}`,
  );
  if (media.length > shown.length) {
    lines.push(`• …and ${media.length - shown.length} more in the app`);
  }
  return lines.join('\n');
}

function attachmentsBlock(channel: ReportChannel, count: number): string {
  if (channel === 'email') {
    return count > 0
      ? `${count} screenshot${count === 1 ? '' : 's'} attached to this email.`
      : 'No screenshots attached. If you have any, attach them to this email before sending.';
  }
  if (channel === 'whatsapp') {
    return 'Send your screenshots into this chat straight after this message.';
  }
  return 'Attach any screenshots you have when you send this.';
}

/** The subject line. Leads with the reference so a reply threads to the ticket. */
export function buildDisputeSubject(input: DisputeReportInput): string {
  const ref = input.dispute?.reference;
  return `${ref ? `[${ref}] ` : ''}Dispute — ${input.job.title}`;
}

/**
 * The full report.
 *
 * Ordered by what support needs first: what happened and what the reporter
 * wants, then the facts backing it. A reader who stops after the first screen
 * still has enough to act.
 */
export function buildDisputeReport(
  input: DisputeReportInput,
  channel: ReportChannel = 'email',
): string {
  const { job, escrow, provider, reporter, media, answers, dispute } = input;

  const header = dispute?.reference
    ? `HANDLANCER DISPUTE · ${dispute.reference}`
    : 'HANDLANCER DISPUTE';

  const parts = [
    header,
    section('WHAT WENT WRONG', `${categoryLabel(answers.category)}\n\n${answers.description.trim()}`),
    section('WHAT I WOULD LIKE', outcomeLabel(answers.outcome)),
    section(
      'THE JOB',
      block([
        ['Title', job.title],
        ['Job ID', job.id],
        ['Category', job.category],
        ['Location', job.location],
        ['Posted', formatDate(job.created_at)],
        ['Scheduled', job.scheduled_for ? formatDate(job.scheduled_for) : null],
        ['Status', humanStatus(job.status)],
      ]),
    ),
    section(
      'THE PROVIDER',
      block([
        ['Name', provider?.business_name || provider?.name || 'Not recorded'],
        ['Phone', provider?.phone],
        ['Provider ID', job.hired_provider_id],
      ]),
    ),
    section(
      'RAISED BY',
      block([
        ['Name', reporter?.name || 'Not recorded'],
        ['Phone', reporter?.phone],
        ['Email', reporter?.email],
        ['Account ID', job.owner_id],
      ]),
    ),
    section('THE MONEY', moneyBlock(escrow)),
    section('EVIDENCE ALREADY IN THE APP', evidenceBlock(media)),
    section('SCREENSHOTS', attachmentsBlock(channel, input.attachmentCount ?? 0)),
    `Sent from the HandLancer app · ${formatDateTime(new Date().toISOString())}`,
  ];

  return parts.filter(Boolean).join('\n\n');
}

/**
 * The provider's side of the same ticket.
 *
 * A dispute the provider can only read is not a fair process — and support
 * cannot settle one until they have heard both accounts. This is the same
 * skeleton, pre-addressed to the same reference, with the account they have to
 * write themselves left as a prompt rather than a blank page.
 */
export function buildProviderResponse(input: {
  job: JobWithOwner;
  escrow: Escrow | null | undefined;
  provider: Profile | null | undefined;
  dispute: Dispute | null | undefined;
  media: JobMedia[] | undefined;
}): string {
  const { job, escrow, provider, dispute, media } = input;

  return [
    dispute?.reference ? `HANDLANCER DISPUTE RESPONSE · ${dispute.reference}` : 'HANDLANCER DISPUTE RESPONSE',
    section(
      'THE JOB',
      block([
        ['Title', job.title],
        ['Job ID', job.id],
        ['Raised as', dispute?.category ? categoryLabel(dispute.category as DisputeCategory) : null],
        ['Disputed on', dispute ? formatDate(dispute.created_at) : null],
      ]),
    ),
    section(
      'RESPONDING PROVIDER',
      block([
        ['Name', provider?.business_name || provider?.name || 'Not recorded'],
        ['Phone', provider?.phone],
        ['Provider ID', job.hired_provider_id],
      ]),
    ),
    section('MY ACCOUNT OF THE JOB', '<Replace this line with what happened, in your own words.>'),
    section(
      'WHAT I CAN EVIDENCE',
      '<Dates you attended, what was agreed, materials bought, anything the client approved at the time. Attach photos and receipts.>',
    ),
    section('THE MONEY', moneyBlock(escrow)),
    section('MY PROOF-OF-WORK ALREADY IN THE APP', evidenceBlock(media)),
    `Sent from the HandLancer app · ${formatDateTime(new Date().toISOString())}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}
