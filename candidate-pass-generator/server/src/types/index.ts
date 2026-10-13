export interface NormalizedCandidate {
  candidateId: string;
  registrationId?: string;
  name: string;
  email: string;
  college?: string;
  events: string[];
  food?: string;
  phone?: string;
  sourceRowNumber: number;
}

export interface GeneratedPass {
  candidateId: string;
  passId: string;
  pdfPath: string;
  generatedAt: string;
}

export interface DeliveryResult {
  candidateId: string;
  passId: string;
  recipient: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  error?: string;
  sentAt?: string;
}

export interface EventConfig {
  eventName: string;
  department: string;
  organization: string;
  date: string;
  venue: string;
  contact?: string;
  website?: string;
  logoPath?: string;
}

export interface PassData {
  event: EventConfig;
  candidate: NormalizedCandidate;
  passId: string;
}

export interface EmailJob {
  candidateId: string;
  passId: string;
  recipient: string;
  pdfPath: string;
}
