export type ProductType = 'item' | 'service';

export type PaymentMethod = 'cash' | 'transfer' | 'dharani';

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  buyPrice?: number;
  productType?: ProductType;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  buyPrice?: number;
  quantity: number;
}

export interface SoldItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  buyPrice?: number;
}

export interface SaleRecord {
  id: string;
  items: SoldItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'paid' | 'unpaid';
  timestamp: Date;
}

export type ExpenseType = 'stock' | 'rent' | 'utilities' | 'transport' | 'other';

export interface ExpenseRecord {
  id: string;
  title: string;
  description?: string;
  amount: number;
  expenseType: ExpenseType;
  timestamp: Date;
}

export interface BusinessInfo {
  name: string;
  accountNumber: string;
  accountName: string;
  viberNumber: string;
}

// Pagination types for handling large datasets
export interface PaginatedResult<T> {
  data: T[];
  hasNextPage: boolean;
  total?: number; // Optional: total count across all pages
  cursor?: string; // Last item ID for cursor-based pagination
}

export interface PaginationOptions {
  limit?: number;
  cursor?: string; // Start after this ID (for cursor-based pagination)
  offset?: number; // For offset-based pagination
  fromDate?: Date; // Filter by date range (server-side)
  toDate?: Date;
  searchQuery?: string; // Server-side search
}
