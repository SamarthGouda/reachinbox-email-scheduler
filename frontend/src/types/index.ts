export type EmailStatus = 'SCHEDULED' | 'PROCESSING' | 'SENT' | 'FAILED';

export interface Sender {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  smtpHost: string;
  smtpPort: number;
  isDefault: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  senders?: Sender[];
}

export interface Email {
  id: string;
  campaignId?: string | null;
  senderId?: string | null;
  to: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  attempts: number;
  lastError?: string | null;
  bullJobId?: string | null;
  sequenceNumber: number;
  createdAt: string;
  updatedAt: string;
  sender?: Sender | null;
}

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
  total: number;
}

export interface ScheduleEmailPayload {
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delayMs?: number;
  hourlyLimit?: number;
  senderId?: string;
}

export interface PaginatedEmailsResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
