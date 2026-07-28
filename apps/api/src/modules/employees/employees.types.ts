import type { ContractType, EmployeeProfile, EmploymentStatus, UserRole } from "@prisma/client";

export type { ContractType, EmploymentStatus };

export interface PaginationMeta extends Record<string, unknown> {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/** ملف الموظف مع بيانات مستخدمه الأساسية (اسم/بريد/دور/حالة الحساب) */
export interface EmployeeView {
  id: string;
  userId: string;
  user: {
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    phone: string | null;
    branchId: string | null;
  };
  employeeCode: string | null;
  jobTitle: string | null;
  department: string | null;
  employmentType: ContractType;
  status: EmploymentStatus;
  hireDate: string | null;
  terminatedAt: string | null;
  nationalId: string | null;
  personalPhone: string | null;
  personalEmail: string | null;
  address: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  baseSalary: number | null;
  contractUrl: string | null;
  idCardUrl: string | null;
  photoUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployeeWithUser = EmployeeProfile & {
  user: {
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
    phone: string | null;
    branchId: string | null;
  };
};

export interface ListEmployeesResult {
  employees: EmployeeView[];
  meta: PaginationMeta;
}

export interface EmployeeStats {
  total: number;
  byStatus: Record<EmploymentStatus, number>;
  byType: Record<ContractType, number>;
  departments: number;
}

export interface EmployeeDocumentView {
  id: string;
  employeeProfileId: string;
  type: import("@prisma/client").EmployeeDocumentType;
  name: string;
  number: string | null;
  url: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  expiringSoon: boolean;
  expired: boolean;
  employeeName?: string;
  note: string | null;
  createdAt: string;
}
