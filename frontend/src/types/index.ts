// User types
export enum UserRole {
  EARNER = 'EARNER',
  OPERATOR = 'OPERATOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export interface User {
  id: string;
  phone: string;
  displayName: string;
  role: UserRole;
  lightningAddress?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

// Task types
export enum TaskStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  EXPIRED = 'EXPIRED',
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  rewardSats: number;
  rewardZAR: number;
  maxClaims: number;
  currentClaims: number;
  expiresAt?: string;
  status: TaskStatus;
  createdAt: string;
}

// Task claim types
export enum TaskClaimStatus {
  CLAIMED = 'CLAIMED',
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export interface TaskClaim {
  _id: string;
  taskId: Task | string;
  earnerId: User | string;
  status: TaskClaimStatus;
  claimedAt: string;
  submittedAt?: string;
  evidence?: string;
}

// Verification types
export enum VerificationDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Verification {
  _id: string;
  taskClaimId: TaskClaim | string;
  operatorId: User | string;
  decision: VerificationDecision;
  reason?: string;
  verifiedAt: string;
}

// Payout types
export enum PayoutStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export interface Payout {
  _id: string;
  taskClaimId: TaskClaim | string;
  earnerId: User | string;
  amountSats: number;
  amountZAR: number;
  lightningAddress: string;
  status: PayoutStatus;
  externalPaymentId?: string;
  errorMessage?: string;
  initiatedAt: string;
  completedAt?: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phone: string;
    displayName: string;
    role: UserRole;
    lightningAddress?: string;
  };
}

export interface ExchangeRateInfo {
  btcPriceZAR: number;
  zarPerSat: number;
  lastUpdated: string;
  cacheValidMinutes: number;
}

export interface TreasuryStats {
  balance: number;
  totalPaid: number;
  pendingPayouts: number;
  failedPayouts: number;
}

