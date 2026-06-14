export type Role = "ADMIN" | "OPERATOR" | "FINANCIAL" | "VIEWER";

export type ClientStatus =
  | "NEW_LEAD"
  | "FIRST_CONTACT_SENT"
  | "EXPLANATION_SENT"
  | "WAITING_INTEREST_CONFIRMATION"
  | "COLLECTING_DATA"
  | "WAITING_CPF"
  | "WAITING_QUOTA_CHOICE"
  | "QUOTA_RESERVED"
  | "PAYMENT_LINK_SENT"
  | "WAITING_PAYMENT"
  | "PARTICIPANT"
  | "NEEDS_HUMAN"
  | "COLD"
  | "WITHDRAWN"
  | "DEFAULTED"
  | "WINNER"
  | "CANCELLED";

export type GroupStatus = "OPEN" | "IN_PROGRESS" | "PAUSED" | "FINISHED" | "CANCELLED";
export type QuotaStatus = "AVAILABLE" | "RESERVED" | "WAITING_PAYMENT" | "ACTIVE" | "DEFAULTED" | "WINNER" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED" | "EXEMPT";
export type DrawStatus = "SCHEDULED" | "DONE" | "CANCELLED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export interface Automation {
  id: string;
  clientId: string;
  currentStep: string;
  status: string;
  fallbackCount: number;
  humanRequired: boolean;
  finished: boolean;
  client?: Client;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cpf?: string;
  origin?: string;
  status: ClientStatus;
  notes?: string;
  kommoContactId?: string;
  kommoLeadId?: string;
  automation?: Automation;
  conversationMessages?: ConversationMessage[];
  automationEvents?: AutomationEvent[];
  quotas?: Quota[];
  payments?: Payment[];
  drawsWon?: Draw[];
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  quotaValue: string | number;
  quotaQuantity: number;
  prizeValue?: string | number;
  prizeDescription?: string;
  status: GroupStatus;
  quotas?: Quota[];
  payments?: Payment[];
  draws?: Draw[];
  _count?: { quotas: number; payments: number; draws: number };
  createdAt: string;
}

export interface Quota {
  id: string;
  groupId: string;
  clientId?: string;
  number: number;
  status: QuotaStatus;
  group?: Group;
  client?: Client;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  clientId: string;
  groupId: string;
  quotaId?: string;
  amount: string | number;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
  method?: string;
  paymentLink?: string;
  notes?: string;
  client?: Client;
  group?: Group;
  quota?: Quota;
}

export interface Draw {
  id: string;
  groupId: string;
  title: string;
  drawDate: string;
  drawnNumber?: number;
  status: DrawStatus;
  notes?: string;
  group?: Group;
  winningClient?: Client;
  winningQuota?: Quota;
}

export interface ConversationMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  channel: "WHATSAPP" | "KOMMO" | "SYSTEM";
  message: string;
  createdAt: string;
}

export interface AutomationEvent {
  id: string;
  type: string;
  message?: string;
  createdAt: string;
}
