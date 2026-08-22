import type { Href } from 'expo-router';

/**
 * Centralized typed hrefs. Cast to `Href` because expo-router's typed-routes
 * only regenerate against a running Metro server; these routes exist on disk and
 * resolve correctly at runtime (and typecheck once `.expo/types` refreshes).
 *
 * Secondary screens sit on each shell's Stack, ABOVE the tabs — note the absence
 * of a tab group in their paths. That is deliberate: a screen owned by a tab
 * (`/(user)/(tabs)/(jobs)/post`) would send Back to that tab's root no matter
 * which tab opened it. Keep new secondary screens out of the tab groups.
 */
export const routes = {
  // Tab roots. Used to enter a shell after auth — never redirect to '/' for
  // that, it resolves to the splash screen (`app/index.tsx`).
  userHome: '/(user)/(tabs)/(discover)' as Href,
  providerFindWork: '/(provider)/(tabs)/(find-work)' as Href,

  // User · Jobs
  postJob: '/(user)/job/post' as Href,
  postDirectJob: (providerId: string): Href => `/(user)/job/post?provider=${providerId}` as Href,
  jobDetail: (id: string): Href => `/(user)/job/${id}` as Href,
  jobQuotes: (jobId: string): Href => `/(user)/job/quotes/${jobId}` as Href,
  reviewJob: (jobId: string): Href => `/(user)/job/review/${jobId}` as Href,
  disputeJob: (jobId: string): Href => `/(user)/job/dispute/${jobId}` as Href,

  // User · Discover
  browseProviders: '/(user)/providers' as Href,
  providerProfile: (id: string): Href => `/(user)/provider/${id}` as Href,

  // Provider · Find Work
  findWorkJob: (id: string): Href => `/(provider)/find-work/${id}` as Href,
  applyToJob: (jobId: string): Href => `/(provider)/find-work/apply/${jobId}` as Href,

  // Provider · Jobs (hired)
  providerJobDetail: (id: string): Href => `/(provider)/job/${id}` as Href,

  // Provider · Quotes. The same list also renders inline in the My Jobs tab
  // (segmented control); this standalone screen is the Home quick-action target.
  providerQuotes: '/(provider)/quotes' as Href,
  providerQuote: (id: string): Href => `/(provider)/quotes/${id}` as Href,

  // Wallet (both shells)
  wallet: (shell: 'user' | 'provider'): Href => `/(${shell})/wallet` as Href,
  walletFund: (shell: 'user' | 'provider'): Href => `/(${shell})/wallet/fund` as Href,
  walletWithdraw: (shell: 'user' | 'provider'): Href => `/(${shell})/wallet/withdraw` as Href,
  walletBank: (shell: 'user' | 'provider'): Href => `/(${shell})/wallet/bank` as Href,
  walletPin: (shell: 'user' | 'provider'): Href => `/(${shell})/wallet/pin` as Href,
  walletTransaction: (shell: 'user' | 'provider', id: string): Href =>
    `/(${shell})/wallet/transaction/${id}` as Href,

  // Chat (both shells)
  chatThread: (shell: 'user' | 'provider', id: string): Href => `/(${shell})/chat/${id}` as Href,

  // Profile sub-screens (both shells)
  profileEdit: (shell: 'user' | 'provider'): Href => `/(${shell})/profile/edit` as Href,
  profileNotifications: (shell: 'user' | 'provider'): Href =>
    `/(${shell})/profile/notifications` as Href,
  profileSettings: (shell: 'user' | 'provider'): Href => `/(${shell})/profile/settings` as Href,
  profileSupport: (shell: 'user' | 'provider'): Href => `/(${shell})/profile/support` as Href,
  /** Provider-only: every review this provider has received. */
  profileReviews: '/(provider)/profile/reviews' as Href,
};
