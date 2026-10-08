import type { Href } from 'expo-router';

import { formatMoney } from '@/components/ui/money-text';
import { categoryLabel } from '@/constants/categories';
import { timeAgo } from '@/lib/date';
import { routes } from '@/lib/routes';
import type { Escrow, Job } from '@/services/database.types';
import type { QuoteWithProvider } from '@/services/quotes';

/**
 * Where a job sits from the client's side:
 * - `needs`: waiting on the client (compare, pay, release, approve, post)
 * - `underway`: someone is working, nothing to do
 * - `waiting`: posted, no quotes yet
 * - `done`: completed or cancelled
 */
export type JobLane = 'needs' | 'underway' | 'waiting' | 'done';

export type JobStep = {
  lane: JobLane;
  /** What is happening, in a sentence a client would say. */
  headline: string;
  detail?: string;
  /** The one thing to do next, if anything. `money` marks a payment action (teal). */
  action?: { label: string; href: Href; money?: boolean };
};

/** Quotes a client can still act on. */
export function liveQuotes(quotes?: QuoteWithProvider[] | null) {
  return (quotes ?? []).filter((q) => q.status === 'submitted' || q.status === 'revised');
}

/**
 * The client's next step on a job, derived from the job, its escrow and its
 * quotes. Both the Jobs list and the job screen read this, so a job never says
 * one thing in the list and another when you open it.
 */
export function jobNextStep(
  job: Job,
  escrow: Escrow | null | undefined,
  quotes: QuoteWithProvider[] | null | undefined,
  providerName?: string | null,
): JobStep {
  const who = providerName?.trim().split(' ')[0] || 'Your provider';
  const trade = categoryLabel(job.category).toLowerCase();

  switch (job.status) {
    case 'draft':
      return {
        lane: 'needs',
        headline: 'Not posted yet',
        detail: 'Only you can see this job. Post it to start getting quotes.',
        action: { label: 'Post it', href: routes.jobDetail(job.id) },
      };

    case 'posted':
    case 'hiring': {
      const approved = (quotes ?? []).find((q) => q.status === 'approved');
      if (approved && (!escrow || escrow.status === 'pending')) {
        const name = approved.provider?.name?.trim().split(' ')[0] ?? 'your provider';
        return {
          lane: 'needs',
          headline: `Pay ${formatMoney(approved.total)} to start`,
          detail: `You accepted ${name}’s quote. Work starts once the money is in escrow.`,
          action: { label: 'Pay into escrow', href: routes.jobDetail(job.id), money: true },
        };
      }
      const live = liveQuotes(quotes);
      if (live.length) {
        const lowest = Math.min(...live.map((q) => q.total));
        return {
          lane: 'needs',
          headline: `${live.length} ${live.length === 1 ? 'quote' : 'quotes'} in, from ${formatMoney(lowest)}`,
          detail: 'Compare what each price buys, then accept one.',
          action: { label: 'Compare quotes', href: routes.jobQuotes(job.id), money: true },
        };
      }
      return {
        lane: 'waiting',
        headline: 'No quotes yet',
        detail: `Posted ${timeAgo(job.created_at)}. ${capitalise(trade)} providers nearby can see it.`,
        action: job.category
          ? { label: 'Invite someone', href: routes.browseProvidersIn(job.category) }
          : undefined,
      };
    }

    case 'in_progress': {
      if (escrow?.completion_requested_at && !escrow.workmanship_released) {
        const remaining = escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);
        return {
          lane: 'needs',
          headline: `${who} says it’s done`,
          detail: `Check the work, then release the last ${formatMoney(remaining)}.`,
          action: { label: 'Check the work', href: routes.reviewJob(job.id), money: true },
        };
      }
      if (
        escrow &&
        escrow.materials_amount > 0 &&
        escrow.materials_requested_at &&
        !escrow.materials_released
      ) {
        return {
          lane: 'needs',
          headline: `${who} needs ${formatMoney(escrow.materials_amount)} for materials`,
          detail: 'Release it from escrow so they can buy what the job needs.',
          action: { label: 'Release materials', href: routes.jobDetail(job.id), money: true },
        };
      }
      return {
        lane: 'underway',
        headline: `${who} is on it`,
        detail:
          escrow && escrow.materials_released
            ? 'Materials bought. You approve the work when it’s finished.'
            : 'You approve each payment from escrow as the work goes.',
      };
    }

    case 'disputed':
      return {
        lane: 'underway',
        headline: 'Dispute open',
        detail: 'Escrow is frozen while support settles it.',
        action: { label: 'See the dispute', href: routes.disputeJob(job.id) },
      };

    case 'completed':
      return { lane: 'done', headline: 'Finished', detail: `Paid to ${who}` };

    default:
      return { lane: 'done', headline: 'Cancelled' };
  }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * The provider's side of the same job:
 * - `yours`: something only the provider can do (ask for materials, finish)
 * - `waiting`: waiting on the client (paying, releasing, checking the work)
 * - `done`: paid, or closed
 */
export type ProviderLane = 'yours' | 'waiting' | 'done';

export type ProviderStep = {
  lane: ProviderLane;
  headline: string;
  detail?: string;
  /** Label for the action, done on the job screen (requests need a confirm). */
  action?: { label: string; money?: boolean };
};

export function providerNextStep(
  job: Job,
  escrow: Escrow | null | undefined,
  clientName?: string | null,
): ProviderStep {
  const client = clientName?.trim().split(' ')[0] || 'The client';

  if (job.status === 'disputed') {
    return {
      lane: 'waiting',
      headline: 'Dispute open',
      detail: 'Escrow is frozen while support settles it. Add your side from the job.',
    };
  }
  if (job.status === 'completed') {
    return { lane: 'done', headline: escrow ? `Paid ${formatMoney(escrow.total)}` : 'Finished' };
  }
  if (job.status === 'cancelled') return { lane: 'done', headline: 'Cancelled' };

  if (!escrow || escrow.status === 'pending') {
    return {
      lane: 'waiting',
      headline: `Waiting for ${client} to pay`,
      detail: 'Don’t start until the money is in escrow. You’ll get a notification.',
    };
  }

  const remaining = escrow.total - (escrow.materials_released ? escrow.materials_amount : 0);
  if (escrow.materials_amount > 0 && !escrow.materials_released) {
    if (!escrow.materials_requested_at) {
      return {
        lane: 'yours',
        headline: `Ask for ${formatMoney(escrow.materials_amount)} for materials`,
        detail: `${client} releases it from escrow so you can buy what the job needs.`,
        action: { label: 'Ask for materials money' },
      };
    }
    return {
      lane: 'waiting',
      headline: `Asked ${client} for ${formatMoney(escrow.materials_amount)}`,
      detail: 'Waiting for them to release the materials money.',
    };
  }

  if (!escrow.completion_requested_at && !escrow.workmanship_released) {
    return {
      lane: 'yours',
      headline: 'Finish and mark it done',
      detail: `Add your after photos, then ask ${client} to release the last ${formatMoney(remaining)}.`,
      action: { label: 'Mark it done', money: true },
    };
  }

  return {
    lane: 'waiting',
    headline: `${client} is checking your work`,
    detail: `${formatMoney(remaining)} comes to your wallet when they approve.`,
  };
}
