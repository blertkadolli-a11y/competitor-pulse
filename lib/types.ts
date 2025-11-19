// Competitor Tracking Types
export interface Competitor {
  id: string;
  user_id: string;
  name: string;
  website: string;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  [key: string]: string | undefined;
}

export interface Snapshot {
  id: string;
  competitor_id: string;
  html_content?: string;
  changes_summary: ChangesSummary;
  created_at: string;
}

export interface ChangesSummary {
  text_changes?: string[];
  pricing_changes?: PricingChange[];
  feature_changes?: FeatureChange[];
  new_sections?: string[];
  removed_sections?: string[];
  [key: string]: any;
}

export interface PricingChange {
  old_price?: string;
  new_price?: string;
  description: string;
}

export interface FeatureChange {
  type: 'added' | 'removed' | 'modified';
  feature: string;
  description?: string;
}

export interface Alert {
  id: string;
  competitor_id: string;
  type: 'pricing' | 'content' | 'feature' | 'other';
  message: string;
  created_at: string;
  is_read: boolean;
}

export interface Change {
  id: string;
  competitor_id: string;
  snapshot_id: string;
  previous_snapshot_id?: string;
  change_type: 'text' | 'pricing' | 'feature' | 'new_section' | 'removed_section';
  description: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Report {
  id: string;
  user_id: string;
  report_type: 'daily' | 'weekly';
  content: string;
  date_range_start: string;
  date_range_end: string;
  created_at: string;
}

export interface CompetitorReport {
  id: string;
  competitor_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string;
  email?: string;
  name?: string;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  subscription_status?: 'active' | 'canceled' | 'past_due' | 'trialing';
  email_frequency?: 'daily' | 'weekly' | 'off';
  email_preferences_updated_at?: string;
  created_at: string;
  updated_at: string;
}

// Alias for backwards compatibility
export interface User extends Profile {}

