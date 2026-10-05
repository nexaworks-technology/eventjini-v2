export type SponsorStatus = "pending" | "approved" | "rejected";

export type Tier = {
  id: string;
  event_id: string;
  name: string;
  price_display: string | null;
  benefits: string[];
  sort_order: number;
};

export type SponsorApplication = {
  id: string;
  tier_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  message: string | null;
  status: SponsorStatus;
  sponsor_user_id: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  created_at: string;
};

export type Lead = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company_name: string | null;
  job_title: string | null;
  notes: string | null;
  captured_at: string;
};

export const LEAD_COLUMNS = "id,first_name,last_name,email,company_name,job_title,notes,captured_at";
