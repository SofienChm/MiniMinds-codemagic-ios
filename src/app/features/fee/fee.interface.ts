export interface FeeModel {
  id?: number;
  childId: number;
  childName?: string;
  parentName?: string;
  parentEmail?: string;
  amount: number;
  description: string;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue';
  feeType: 'monthly' | 'one-time' | 'late-fee';
  notes?: string;
  paymentNotes?: string;
  daysOverdue?: number;
  createdAt?: string;
  child?: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    parent?: {
      id?: number;
      firstName: string;
      lastName: string;
      email?: string;
    };
  };
}

export interface CreateFeeModel {
  childId: number;
  amount: number;
  description: string;
  dueDate: string;
  feeType?: string;
  notes?: string;
}

export interface PayFeeModel {
  feeId: number;
  paidDate?: string;
  paymentNotes?: string;
}

export interface FeesSummary {
  totalFees: number;
  paidFees: number;
  pendingFees: number;
  overdueFees: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}