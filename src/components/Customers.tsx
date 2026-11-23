import React, { useState, useMemo } from 'react';
import { 
  Users, UserPlus, Search, Edit2, Trash2, Phone, MapPin, Plus, X, Save, Calendar, ShoppingBag,
  ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { Customer, Sale, Preorder } from '../types';
import { generateId } from '../lib/utils';

interface CustomersViewProps {
  customers: Customer[];
  setCustomers: (customers: Customer[] | ((prev: Customer[]) => Customer[])) => void;
  sales?: Sale[];
  preorders?: Preorder[];
}

export function CustomersView({ customers, setCustomers, sales = [], preorders = [] }: CustomersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Sorting state
  const [sortBy, setSortBy] = useState<'name' | 'pax' | 'lastOrder' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'name' | 'pax' | 'lastOrder') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc'); // default descending since high pax and recent orders are usually more useful first
    }
  };

  // Dynamic statistics calculation
  const getCustomerStats = (customerName: string) => {
    const nameLower = customerName.toLowerCase().trim();
    if (!nameLower) return { totalPax: 0, lastOrderTimestamp: 0, lastOrderDate: '-' };

    const matchingSales = sales.filter(
      (s) => s.customerName && s.customerName.toLowerCase().trim() === nameLower
    );
    const matchingPreorders = preorders.filter(
      (p) => p.customerName && p.customerName.toLowerCase().trim() === nameLower
    );

    const salesPax = matchingSales.reduce(
      (sum, s) => sum + (s.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0),
      0
    );
    const preordersPax = matchingPreorders.reduce(
      (sum, p) => sum + (p.items || []).reduce((acc, item) => acc + (item.quantity || 0), 0),
      0
    );
    const totalPax = salesPax + preordersPax;

    const dates: Date[] = [];
    matchingSales.forEach((s) => {
      const d = s.orderDate ? new Date(s.orderDate) : new Date(s.date);
      if (!isNaN(d.getTime())) dates.push(d);
    });
    matchingPreorders.forEach((p) => {
      const d = new Date(p.date);
      if (!isNaN(d.getTime())) dates.push(d);
    });

    let lastOrderDateStr = '-';
    let lastOrderTimestamp = 0;
    if (dates.length > 0) {
      const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
      lastOrderTimestamp = latest.getTime();
      const day = String(latest.getDate()).padStart(2, '0');
      const month = String(latest.getMonth() + 1).padStart(2, '0');
      const year = latest.getFullYear();
      const hours = String(latest.getHours()).padStart(2, '0');
      const minutes = String(latest.getMinutes()).padStart(2, '0');
      lastOrderDateStr = `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    return { totalPax, lastOrderTimestamp, lastOrderDate: lastOrderDateStr };
  };

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setAddress(customer.address);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCustomer) {
      // Edit existing
      setCustomers((prev: Customer[]) => prev.map((c) => 
        c.id === editingCustomer.id ? { ...c, name, phone, address } : c
      ));
    } else {
      // Add new
      const newCustomer: Customer = {
        id: generateId(),
        name,
        phone,
        address
      };
      setCustomers((prev: Customer[]) => [...prev, newCustomer]);
    }

    setIsModalOpen(false);
    setName('');
    setPhone('');
    setAddress('');
    setEditingCustomer(null);
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
      setCustomers((prev: Customer[]) => prev.filter((c) => c.id !== id));
    }
  };

  // Filter and sort memoized
  const processedCustomers = useMemo(() => {
    // Map with stats to optimize performance
    const withStats = customers.map(c => {
      const stats = getCustomerStats(c.name);
      return {
        ...c,
        totalPax: stats.totalPax,
        lastOrderTimestamp: stats.lastOrderTimestamp,
        lastOrderDate: stats.lastOrderDate,
      };
    });

    // Apply text search filtering
    const filtered = withStats.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Apply sorting
    if (sortBy) {
      filtered.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortBy === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
          if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        } else if (sortBy === 'pax') {
          valA = a.totalPax;
          valB = b.totalPax;
        } else if (sortBy === 'lastOrder') {
          valA = a.lastOrderTimestamp;
          valB = b.lastOrderTimestamp;
        }

        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
    }

    return filtered;
  }, [customers, searchTerm, sortBy, sortOrder, sales, preorders]);

  return (
    <div className="space-y-6">
      {/* Title & Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-zinc-100 shadow-sm">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" /> Database Pelanggan
          </h2>
          <p className="text-xs text-zinc-500 mt-1">Daftar pelanggan terdaftar untuk mempermudah kasir dan pengiriman online.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="btn btn-primary text-xs py-2.5 px-4 flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Tambah Pelanggan
        </button>
      </div>

      {/* Search and Table Card */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari nama, telp, atau alamat..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs bg-white border border-zinc-200 pl-9 pr-4 py-2 rounded-lg w-full focus:ring-1 focus:ring-blue-500 outline-none font-medium"
            />
          </div>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
            Total: {processedCustomers.length} Pelanggan
          </span>
        </div>

        {/* Customer list table */}
        <div className="overflow-x-auto">
          {processedCustomers.length === 0 ? (
            <div className="text-center py-16 text-zinc-400 space-y-3">
              <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-300">
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wider">Tidak ada data pelanggan</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-100 text-[10px] font-black uppercase text-zinc-400 bg-zinc-50/50 select-none">
                  <th className="p-4 w-12 text-center">No</th>
                  <th 
                    className="p-4 cursor-pointer hover:bg-zinc-100/50 hover:text-zinc-700 transition-colors"
                    onClick={() => handleSort('name')}
                    title="Urutkan berdasarkan Nama"
                  >
                    <div className="flex items-center gap-1.5">
                      Nama Pelanggan
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4">No. Telepon</th>
                  <th className="p-4">Alamat Rumah</th>
                  <th 
                    className="p-4 text-center cursor-pointer hover:bg-zinc-100/50 hover:text-zinc-700 transition-colors"
                    onClick={() => handleSort('pax')}
                    title="Urutkan berdasarkan Total Order Pax"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Total Order Pax
                      {sortBy === 'pax' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-300" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-center cursor-pointer hover:bg-zinc-100/50 hover:text-zinc-700 transition-colors"
                    onClick={() => handleSort('lastOrder')}
                    title="Urutkan berdasarkan Tanggal Order Terakhir"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Last Order Date
                      {sortBy === 'lastOrder' ? (
                        sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" /> : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-zinc-300" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 w-28 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {processedCustomers.map((customer, index) => {
                  return (
                    <tr key={customer.id} className="border-b border-zinc-100 hover:bg-zinc-50/30 transition-all text-xs">
                      <td className="p-4 font-bold text-zinc-400 text-center">{index + 1}</td>
                      <td className="p-4 font-black uppercase text-zinc-900">{customer.name}</td>
                      <td className="p-4 font-mono text-zinc-600">
                        {customer.phone ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-zinc-400" /> {customer.phone}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="p-4 font-medium text-zinc-600 max-w-sm truncate" title={customer.address}>
                        {customer.address ? (
                          <span className="inline-flex items-center gap-1.5 w-full">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span className="truncate">{customer.address}</span>
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          customer.totalPax > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                            : 'bg-zinc-50 text-zinc-400 border border-zinc-100'
                        }`}>
                          <ShoppingBag className="w-3 h-3 shrink-0" />
                          {customer.totalPax} Pax
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {customer.lastOrderDate !== '-' ? (
                          <span className="inline-flex items-center gap-1 font-mono text-zinc-600 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            {customer.lastOrderDate}
                          </span>
                        ) : (
                          <span className="text-zinc-300">-</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-1">
                          <button 
                            onClick={() => openEditModal(customer)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(customer.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg border w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50">
              <h3 className="font-black text-sm uppercase tracking-wider text-zinc-900">
                {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Nama Lengkap</label>
                <input 
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-bold text-zinc-900 uppercase"
                />
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Nomor Telepon / WhatsApp</label>
                <input 
                  type="text"
                  placeholder="Contoh: 08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs bg-white border border-zinc-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Alamat Pengiriman / Rumah</label>
                <textarea 
                  placeholder="Tuliskan alamat lengkap pengiriman di sini..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full text-xs bg-white border border-zinc-200 px-3 py-2.5 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none font-medium text-zinc-700 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex gap-3 pt-4 border-t border-zinc-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary flex-1 py-3 text-xs font-black uppercase tracking-wider"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary flex-1 py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
