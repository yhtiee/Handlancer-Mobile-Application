/**
 * Hand-maintained types mirroring supabase/migrations/0001_init.sql.
 * Regenerate with `supabase gen types typescript` once the project is linked.
 */

export type UserRole = 'user' | 'provider';
export type JobStatus =
  | 'draft'
  | 'posted'
  | 'hiring'
  | 'in_progress'
  | 'completed'
  | 'disputed'
  | 'cancelled';
export type QuoteStatus = 'submitted' | 'approved' | 'rejected' | 'revised';
export type EscrowStatus =
  | 'pending'
  | 'funded'
  | 'materials_released'
  | 'completed'
  | 'refunded';
export type TxnType = 'fund' | 'withdraw' | 'escrow_hold' | 'escrow_release' | 'payout';
export type TxnStatus = 'pending' | 'success' | 'failed';
export type MediaPhase = 'before' | 'after';
export type MediaKind = 'photo' | 'video';
export type DisputeStatus = 'open' | 'in_review' | 'resolved' | 'rejected';

export type QuoteLineItem = {
  label: string;
  type: 'material' | 'labor';
  amount: number;
};

export type Profile = {
  id: string;
  role: UserRole;
  name: string | null;
  avatar_url: string | null;
  phone: string | null;
  email: string | null;
  bio: string | null;
  location: string | null;
  latitude?: number | null;
  longitude?: number | null;
  service_radius_km?: number | null;
  availability?: 'available' | 'busy' | 'on_call' | 'offline' | null;
  business_name?: string | null;
  /**
   * Bank details deliberately live in `wallet_security`, not here: `profiles` is
   * readable by every authenticated user. Reach them via getWalletSecurity().
   */
  is_verified?: boolean;
  services: string[];
  rating: number;
  hourly_rate: number | null;
  years_experience: number | null;
  push_token: string | null;
  created_at: string;
};

export type Job = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  category: string | null;
  budget: number | null;
  location: string | null;
  is_direct: boolean;
  hired_provider_id: string | null;
  status: JobStatus;
  scheduled_for: string | null;
  created_at: string;
};

export type Quote = {
  id: string;
  job_id: string;
  provider_id: string;
  line_items: QuoteLineItem[];
  materials_cost: number;
  labor_cost: number;
  total: number;
  message: string | null;
  status: QuoteStatus;
  created_at: string;
};

export type Escrow = {
  id: string;
  job_id: string;
  total: number;
  materials_amount: number;
  materials_released: boolean;
  workmanship_released: boolean;
  status: EscrowStatus;
  /** Set when the provider asks for the materials portion; cleared by nothing. */
  materials_requested_at: string | null;
  /** Set when the provider marks the work finished and asks for review. */
  completion_requested_at: string | null;
  created_at: string;
};

export type Wallet = {
  id: string;
  owner_id: string;
  balance: number;
  currency: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  wallet_id: string;
  job_id: string | null;
  type: TxnType;
  status: TxnStatus;
  amount: number;
  reference: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  job_id: string | null;
  user_id: string;
  provider_id: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Review = {
  id: string;
  job_id: string;
  reviewer_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type JobMedia = {
  id: string;
  job_id: string;
  provider_id: string;
  phase: MediaPhase;
  kind: MediaKind;
  url: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  payload: Record<string, unknown>;
  read: boolean;
  created_at: string;
};

export type Dispute = {
  id: string;
  job_id: string;
  opened_by: string;
  reason: string | null;
  /** One of the DisputeCategory values in lib/dispute-report.ts. */
  category: string | null;
  desired_outcome: string | null;
  /** Short human-quotable ticket code, e.g. "HL-1A2B3C4D". Set by open_dispute. */
  reference: string | null;
  status: DisputeStatus;
  /** Set by admin_resolve_dispute (0009); null while the ticket is live. */
  resolution?: string | null;
  resolved_at?: string | null;
  refunded_amount?: number | null;
  released_amount?: number | null;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile>;
      jobs: Table<Job>;
      quotes: Table<Quote>;
      escrows: Table<Escrow>;
      wallets: Table<Wallet>;
      transactions: Table<Transaction>;
      conversations: Table<Conversation>;
      messages: Table<Message>;
      reviews: Table<Review>;
      job_media: Table<JobMedia>;
      notifications: Table<Notification>;
      disputes: Table<Dispute>;
    };
    Views: Record<string, never>;
    Functions: {
      fund_escrow: { Args: { p_job_id: string }; Returns: undefined };
      // Escrow releases take the transfer PIN since 0018; the ungated overloads
      // were dropped, and release_workmanship is no longer callable by clients.
      release_materials: { Args: { p_job_id: string; p_pin: string }; Returns: undefined };
      request_withdrawal: { Args: { p_amount: number; p_pin: string }; Returns: undefined };
      wallet_security_status: {
        Args: Record<string, never>;
        Returns: {
          has_pin: boolean;
          pin_locked: boolean;
          pin_locked_until: string | null;
          has_bank: boolean;
          bank_name: string | null;
          account_name: string | null;
          account_masked: string | null;
        }[];
      };
      set_transfer_pin: {
        Args: { p_pin: string; p_current_pin: string | null };
        Returns: undefined;
      };
      request_materials_release: { Args: { p_job_id: string }; Returns: undefined };
      request_completion_review: { Args: { p_job_id: string }; Returns: undefined };
      review_and_release: {
        Args: {
          p_job_id: string;
          p_rating: number;
          p_comment: string | null;
          p_pin: string;
        };
        Returns: undefined;
      };
      /**
       * Files the ticket, freezes the job and notifies the provider in one
       * transaction — see 0020. Returns the dispute row, existing or new.
       */
      open_dispute: {
        Args: {
          p_job_id: string;
          p_reason: string;
          p_category: string | null;
          p_desired_outcome: string | null;
        };
        Returns: Dispute;
      };
      push_diagnostics: {
        Args: Record<string, never>;
        Returns: {
          has_token: boolean;
          trigger_installed: boolean;
          hook_url_set: boolean;
          hook_secret_set: boolean;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      job_status: JobStatus;
      quote_status: QuoteStatus;
      escrow_status: EscrowStatus;
      txn_type: TxnType;
      txn_status: TxnStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
