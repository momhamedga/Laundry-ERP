import type { UserRole } from "@/types";

export type EmploymentStatus = "ACTIVE" | "SUSPENDED" | "TERMINATED" | "ARCHIVED";
export type ContractType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY";

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

export interface EmployeeStats {
  total: number;
  byStatus: Record<EmploymentStatus, number>;
  byType: Record<ContractType, number>;
  departments: number;
}

export interface CreateEmployeeInput {
  userId: string;
  employeeCode?: string;
  jobTitle?: string;
  department?: string;
  employmentType?: ContractType;
  hireDate?: string;
  nationalId?: string;
  personalPhone?: string;
  personalEmail?: string;
  address?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  baseSalary?: number;
  contractUrl?: string;
  idCardUrl?: string;
  photoUrl?: string;
  notes?: string;
}

export type UpdateEmployeeInput = Omit<CreateEmployeeInput, "userId">;

export interface ChangeEmployeeStatusInput {
  status: EmploymentStatus;
  reason?: string;
}

export interface ListEmployeesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: EmploymentStatus;
  department?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
