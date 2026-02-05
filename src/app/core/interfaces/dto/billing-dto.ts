export interface TenantBilling {
  id: number;
  tenantId: number;
  tenantName: string;
  tenantLogo?: string;
  amount: number;
  currency: string;
  paymentDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  status: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateBillingRequest {
  tenantId: number;
  amount: number;
  currency?: string;
  paymentDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  status?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface UpdateBillingRequest {
  amount: number;
  currency?: string;
  paymentDate: Date;
  periodStart?: Date;
  periodEnd?: Date;
  status?: string;
  paymentMethod?: string;
  invoiceNumber?: string;
  notes?: string;
}

export interface TenantBillingSummary {
  id: number;
  name: string;
  logo?: string;
  isActive: boolean;
  subscriptionPlan: string;
  totalPaid: number;
  totalPending: number;
  lastPaymentDate?: Date;
  paymentCount: number;
}

export interface BillingSummary {
  totalRevenue: number;
  totalPending: number;
  paidTenantsCount: number;
  unpaidTenantsCount: number;
  tenants: TenantBillingSummary[];
}

export interface TenantBillingHistory {
  tenant: {
    id: number;
    name: string;
    logo?: string;
    isActive: boolean;
    subscriptionPlan: string;
  };
  totalPaid: number;
  totalPending: number;
  billings: TenantBilling[];
}

export interface BillingStats {
  year: number;
  totalRevenue: number;
  totalTransactions: number;
  monthlyBreakdown: { month: number; amount: number; count: number }[];
  statusBreakdown: { status: string; amount: number; count: number }[];
}
