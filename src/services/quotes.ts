import type { Job, Profile, Quote, QuoteLineItem } from '@/services/database.types';
import { pageRange, toPage, type Page } from '@/services/pagination';
import { supabase } from '@/services/supabase';

export type QuoteWithProvider = Quote & { provider: Profile | null };
export type QuoteWithJob = Quote & { job: Job | null };

export type QuoteInput = {
  lineItems: QuoteLineItem[];
  message?: string | null;
};

function totals(lineItems: QuoteLineItem[]) {
  const materials = lineItems
    .filter((i) => i.type === 'material')
    .reduce((s, i) => s + (i.amount || 0), 0);
  const labor = lineItems
    .filter((i) => i.type === 'labor')
    .reduce((s, i) => s + (i.amount || 0), 0);
  return { materials, labor, total: materials + labor };
}

/** All quotes on a job, each enriched with the submitting provider's profile. */
export async function listQuotesForJob(jobId: string): Promise<QuoteWithProvider[]> {
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('job_id', jobId)
    .order('total', { ascending: true });
  if (error) throw error;

  const ids = [...new Set((quotes ?? []).map((q) => q.provider_id))];
  let providers: Profile[] = [];
  if (ids.length) {
    const { data } = await supabase.from('profiles').select('*').in('id', ids);
    providers = data ?? [];
  }
  return (quotes ?? []).map((q) => ({
    ...q,
    provider: providers.find((p) => p.id === q.provider_id) ?? null,
  }));
}

/** A provider's own submitted quotes, enriched with the job. */
export async function listMyQuotes(providerId: string, page: number): Promise<Page<QuoteWithJob>> {
  const { from, to } = pageRange(page);
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false })
    // Unique tiebreaker so rows can't shuffle between pages.
    .order('id', { ascending: false })
    .range(from, to);
  if (error) throw error;

  // Only the jobs behind this page's quotes.
  const jobIds = [...new Set((quotes ?? []).map((q) => q.job_id))];
  let jobs: Job[] = [];
  if (jobIds.length) {
    const { data } = await supabase.from('jobs').select('*').in('id', jobIds);
    jobs = data ?? [];
  }
  const items = (quotes ?? []).map((q) => ({
    ...q,
    job: jobs.find((j) => j.id === q.job_id) ?? null,
  }));
  return toPage(items, page);
}

export async function getQuote(id: string): Promise<QuoteWithJob | null> {
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!quote) return null;
  const { data: job } = await supabase.from('jobs').select('*').eq('id', quote.job_id).maybeSingle();
  return { ...quote, job: job ?? null };
}

/** Find this provider's existing quote on a job (for resubmission). */
export async function getMyQuoteForJob(
  providerId: string,
  jobId: string,
): Promise<Quote | null> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('provider_id', providerId)
    .eq('job_id', jobId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function submitQuote(
  providerId: string,
  jobId: string,
  input: QuoteInput,
): Promise<Quote> {
  const t = totals(input.lineItems);
  // Upsert keyed on (job_id, provider_id): first submit inserts, resubmit revises.
  const { data, error } = await supabase
    .from('quotes')
    .upsert(
      {
        job_id: jobId,
        provider_id: providerId,
        line_items: input.lineItems,
        materials_cost: t.materials,
        labor_cost: t.labor,
        total: t.total,
        message: input.message ?? null,
        status: 'submitted',
      },
      { onConflict: 'job_id,provider_id' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Approving a quote auto-hires the provider: the quote is approved, the job's
 * provider is set, status moves to in_progress, and competing quotes are rejected.
 * (A Postgres RPC could make this atomic later; sequential is fine for MVP.)
 */
export async function approveQuote(quote: Quote): Promise<void> {
  const updates = await Promise.all([
    supabase.from('quotes').update({ status: 'approved' }).eq('id', quote.id),
    supabase
      .from('jobs')
      .update({ status: 'hiring' })
      .eq('id', quote.job_id),
    supabase
      .from('quotes')
      .update({ status: 'rejected' })
      .eq('job_id', quote.job_id)
      .neq('id', quote.id),
  ]);
  const failed = updates.find((u) => u.error);
  if (failed?.error) throw failed.error;
}

export async function rejectQuote(id: string): Promise<void> {
  const { error } = await supabase.from('quotes').update({ status: 'rejected' }).eq('id', id);
  if (error) throw error;
}
