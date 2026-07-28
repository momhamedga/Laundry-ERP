import type { Customer } from "@prisma/client";
import { ApiError } from "../../middlewares/error.middleware.js";
import type {
  CreateCustomerDto,
  ListCustomersQuery,
  UpdateCustomerDto,
  UpdateNotesDto,
} from "./customers.dto.js";
import type { CustomersRepository, RawCustomerStats } from "./customers.repository.js";
import type {
  CustomerProfile,
  CustomerStats,
  ListCustomersResult,
} from "./customers.types.js";
import {
  buildCustomerOrderBy,
  buildCustomerWhere,
  buildPaginationMeta,
  decimalToNumber,
  toSkipTake,
} from "./customers.utils.js";

export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  // ==================== Guards ====================

  private async getCustomerOrFail(id: string): Promise<Customer> {
    const customer = await this.repo.findById(id);
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
  }

  /** Business Rule: لا يُسمح بعميلين بنفس رقم الهاتف */
  private async ensurePhoneAvailable(phone: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findByPhone(phone);
    if (existing && existing.id !== excludeId) {
      throw new ApiError(409, "Phone number is already registered to another customer");
    }
  }

  // ==================== List / Get ====================

  async list(query: ListCustomersQuery): Promise<ListCustomersResult> {
    const { skip, take } = toSkipTake(query.page, query.limit);
    const [customers, total] = await this.repo.findManyWithCount(
      buildCustomerWhere(query),
      buildCustomerOrderBy(query),
      skip,
      take,
    );

    return {
      customers,
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async getById(id: string): Promise<Customer> {
    return this.getCustomerOrFail(id);
  }

  /** بحث سريع بالهاتف - يستفيد من الفهرس الفريد مباشرة */
  async getByPhone(phone: string): Promise<Customer> {
    const customer = await this.repo.findByPhone(phone);
    if (!customer) throw new ApiError(404, "Customer not found");
    return customer;
  }

  // ==================== Create / Update ====================

  async create(dto: CreateCustomerDto): Promise<Customer> {
    await this.ensurePhoneAvailable(dto.phone);

    return this.repo.create({
      name: dto.name,
      phone: dto.phone,
      email: dto.email ?? null,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
    });
  }

  async update(id: string, dto: UpdateCustomerDto): Promise<Customer> {
    await this.getCustomerOrFail(id);
    if (dto.phone !== undefined) {
      await this.ensurePhoneAvailable(dto.phone, id);
    }

    return this.repo.update(id, {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.address !== undefined ? { address: dto.address } : {}),
      ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
    });
  }

  async updateNotes(id: string, dto: UpdateNotesDto): Promise<Customer> {
    await this.getCustomerOrFail(id);
    return this.repo.update(id, { notes: dto.notes });
  }

  // ==================== Soft Delete / Restore ====================

  /**
   * Business Rule: لا حذف فعلي أبداً - الطلبات مرتبطة بـ Restrict
   * النظام يدعم Soft Delete عبر isActive
   */
  async softDelete(id: string): Promise<void> {
    const customer = await this.getCustomerOrFail(id);
    if (!customer.isActive) {
      throw new ApiError(400, "Customer is already deactivated");
    }
    await this.repo.update(id, { isActive: false });
  }

  async restore(id: string): Promise<Customer> {
    const customer = await this.getCustomerOrFail(id);
    if (customer.isActive) {
      throw new ApiError(400, "Customer is already active");
    }
    return this.repo.update(id, { isActive: true });
  }

  // ==================== Merge (Structure Only) ====================

  /**
   * دمج عميلين مكررين - Structure فقط
   * TODO(merge): نقل الطلبات والمدفوعات من source إلى target في
   * transaction واحدة، ثم تعطيل source وتوثيق الدمج في notes
   */
  merge(): never {
    throw new ApiError(501, "Customer merge is not implemented yet");
  }

  // ==================== Statistics / Profile ====================

  private toStats(raw: RawCustomerStats): CustomerStats {
    const totalSpent = decimalToNumber(raw.financials.total);
    const totalPaid = decimalToNumber(raw.financials.paidAmount);

    return {
      totalOrders: raw.totalOrders,
      activeOrders: raw.activeOrders,
      totalSpent,
      totalPaid,
      balanceDue: Number((totalSpent - totalPaid).toFixed(2)),
      lastOrderAt: raw.lastOrderAt,
    };
  }

  /** تُحسب من قاعدة البيانات مباشرة - لا قيم مخزنة */
  async getStats(id: string): Promise<CustomerStats> {
    await this.getCustomerOrFail(id);
    return this.toStats(await this.repo.getStats(id));
  }

  /** Profile كامل: البيانات + آخر 10 طلبات + الإحصائيات */
  async getProfile(id: string): Promise<CustomerProfile> {
    const customer = await this.getCustomerOrFail(id);
    const [recentOrders, rawStats] = await Promise.all([
      this.repo.findRecentOrders(id),
      this.repo.getStats(id),
    ]);

    return { customer, recentOrders, stats: this.toStats(rawStats) };
  }
}
