export interface Ingredient {
  name: string;
  amount: number;
  uom: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  reserved: number;
  category: string;
  image?: string;
  sku: string;
  recipe?: Ingredient[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  date: string; // Completion Date
  orderDate?: string; // Original Order Date
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'transfer' | 'e-wallet';
  amountPaid: number;
  change: number;
  customerName?: string;
  serviceType?: 'Dine In' | 'Take Away' | 'Online';
  tableNumber?: string;
  orderNumber?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface ActiveOrderItem extends CartItem {
  isReady?: boolean;
}

export interface ActiveOrder extends Omit<Sale, 'items'> {
  items: ActiveOrderItem[];
  status: OrderStatus;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  message: string;
  qrisImage?: string;
  bankAccounts: BankAccount[];
  systemPin?: string;
}

export type Milestone = 'produksi' | 'penyimpanan' | 'pengiriman';

export interface PreorderItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
}

export interface Preorder {
  id: string; // Order No (CO)
  date: string;
  customerName: string;
  items: PreorderItem[];
  deliveryMode: string;
  shippingCost: number;
  milestone: Milestone;
  total: number;
}

export type View = 'dashboard' | 'pos' | 'inventory' | 'history' | 'preorders' | 'settings' | 'qris' | 'receipt' | 'kitchen';
