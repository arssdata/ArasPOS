import React, { useState, useEffect, ChangeEvent } from 'react';
import { Plus, Search, Trash2, PackagePlus, Save, X, FileText, Filter, Download, CheckCircle2, Settings } from 'lucide-react';
import { formatCurrency, generateId, cn, downloadCSV } from '../lib/utils';
import { format } from 'date-fns';
import { Product, ShopInfo } from '../types';

export function InventoryView({ products, setProducts }: any) {
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortKey, setSortKey] = useState<'name' | 'stock' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '', price: 0, cost: 0, stock: 0, category: '', sku: ''
  });

  const exportToExcel = () => {
    const exportData = products.map((p: Product) => ({
      SKU: p.sku,
      Nama: p.name,
      Kategori: p.category,
      Harga: p.price,
      Modal: p.cost,
      Stok: p.stock,
      Reserved: p.reserved,
      Available: p.stock - p.reserved
    }));
    downloadCSV(exportData, `Inventaris_${format(new Date(), 'ddMMyy')}`);
  };

  const downloadTemplate = () => {
    const templateData = [{
      SKU: 'SKU-001',
      Nama: 'Produk Contoh',
      Kategori: 'Kategori',
      Harga: 10000,
      Modal: 8000,
      Stok: 50
    }];
    downloadCSV(templateData, 'Template_Inventory_Bulk');
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      if (lines.length <= 1) return;

      const importedProducts: Product[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const delimiter = lines[i].includes(';') ? ';' : ',';
        const values = lines[i].split(delimiter).map(v => v.replace(/^"|"$/g, '').trim());
        
        const sku = values[0];
        const name = values[1];
        const category = values[2];
        const price = parseFloat(values[3]) || 0;
        const cost = parseFloat(values[4]) || 0;
        const stock = parseInt(values[5]) || 0;

        if (name) {
          importedProducts.push({
            id: generateId(),
            sku: sku || generateId().slice(0, 8).toUpperCase(),
            name,
            category: category || 'Default',
            price,
            cost,
            stock,
            reserved: 0
          });
        }
      }

      if (importedProducts.length > 0) {
        setProducts((prev: Product[]) => {
          const newList = [...prev];
          let updated = 0;
          let added = 0;

          importedProducts.forEach(newItem => {
            const index = newList.findIndex(p => p.sku === newItem.sku && newItem.sku !== '');
            if (index !== -1) {
              newList[index] = {
                ...newList[index],
                stock: newList[index].stock + newItem.stock,
                price: newItem.price > 0 ? newItem.price : newList[index].price,
                cost: newItem.cost > 0 ? newItem.cost : newList[index].cost
              };
              updated++;
            } else {
              newList.push(newItem);
              added++;
            }
          });

          const msg = [];
          if (added > 0) msg.push(`${added} baru`);
          if (updated > 0) msg.push(`${updated} update stok`);
          triggerSuccess(`Selesai: ${msg.join(' & ')}`);
          
          return newList;
        });
      } else {
        triggerError("Format CSV tidak valid atau data kosong.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSave = () => {
    if (isEditing === 'new') {
      const newProduct: Product = {
        ...formData as Product,
        id: generateId()
      };
      setProducts([...products, newProduct]);
    } else {
      setProducts(products.map((p: any) => p.id === isEditing ? { ...p, ...formData } : p));
    }
    setIsEditing(null);
    setFormData({ name: '', price: 0, cost: 0, stock: 0, category: '', sku: '' });
  };

  const deleteProduct = (id: string) => {
    setProductToDelete(id);
  };

  const categories = ['All', ...Array.from(new Set(products.map((p: any) => p.category)))];

  const filteredProducts = products
    .filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a: any, b: any) => {
      let comparison = 0;
      if (sortKey === 'name') comparison = (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' });
      if (sortKey === 'stock') comparison = a.stock - b.stock;
      if (sortKey === 'price') comparison = a.price - b.price;
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSort = (key: 'name' | 'stock' | 'price') => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-2.5 md:space-y-4 relative">
      <div>
        {errorMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-4 py-2 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-xs md:text-sm">
            <CheckCircle2 className="w-4 h-4 rotate-180" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-4 py-2 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-xs md:text-sm">
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-xl font-bold tracking-tight">Daftar Produk</h2>
        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{filteredProducts.length} Item</p>
      </div>

      <div className="sticky top-0 md:top-16 z-20 bg-zinc-50/95 backdrop-blur-sm py-1.5 -mx-2.5 px-2.5 md:-mx-8 md:px-8 border-b border-zinc-200/70">
        <div className="flex items-center gap-1.5 md:gap-2 flex-nowrap">
          <div className="relative group flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Cari produk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 pr-2 py-1.5 bg-white border border-zinc-200 focus:border-blue-500 rounded-lg text-xs outline-none w-full transition-all h-8"
            />
          </div>
          <div className="relative hidden lg:block shrink-0">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-8 pr-6 py-1.5 bg-white border border-zinc-200 focus:border-blue-500 rounded-lg text-xs outline-none appearance-none transition-all cursor-pointer h-8"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <label className="btn btn-secondary gap-1 px-2 md:px-3 shadow-xs cursor-pointer flex items-center h-8 shrink-0 whitespace-nowrap">
            <Plus className="w-3 h-3 md:w-3.5 md:h-3.5 text-zinc-500" />
            <span className="text-[10px] uppercase font-bold">Import</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
          <button 
            onClick={downloadTemplate}
            className="hidden lg:flex btn btn-secondary gap-1.5 px-3 shadow-xs text-[10px] font-bold uppercase h-8 shrink-0 whitespace-nowrap"
            title="Download Template CSV"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button 
            onClick={exportToExcel}
            className="btn btn-secondary gap-1 px-2 md:px-3 shadow-xs text-[10px] font-bold uppercase h-8 shrink-0 whitespace-nowrap"
          >
            <Download className="w-3 h-3 md:w-3.5 md:h-3.5" /> Export
          </button>
          <button onClick={() => setIsEditing('new')} className="btn btn-primary gap-1 shadow-sm h-8 px-2.5 md:px-3.5 shrink-0 whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-tight">Add</span>
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th 
                className="px-2.5 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold text-zinc-500 uppercase cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Produk
                  {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="hidden md:table-cell px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase text-center">SKU</th>
              <th 
                className="px-2 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold text-zinc-500 uppercase text-right cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
                onClick={() => toggleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Harga
                  {sortKey === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-2 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold text-zinc-500 uppercase text-center cursor-pointer hover:text-blue-600 transition-colors whitespace-nowrap"
                onClick={() => toggleSort('stock')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Stok</span>
                  {sortKey === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="hidden md:table-cell px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase text-center">Reserved</th>
              <th className="hidden md:table-cell px-4 py-2.5 text-xs font-bold text-zinc-500 uppercase text-center">Available</th>
              <th className="px-1.5 py-2 md:px-4 md:py-2.5 text-[10px] md:text-xs font-bold text-zinc-500 uppercase text-right w-14 md:w-auto">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredProducts.map((p: Product) => {
              const reserved = p.reserved || 0;
              const available = p.stock - reserved;
              return (
                <tr key={p.id} className="hover:bg-zinc-50/80 transition-colors group">
                  <td className="px-2.5 py-1.5 md:px-4 md:py-2 max-w-[150px] sm:max-w-none">
                    <div className="text-xs md:text-sm font-semibold text-zinc-900 truncate sm:whitespace-normal leading-tight">{p.name}</div>
                    <div className="hidden md:block text-[11px] text-zinc-400 leading-tight">{p.category}</div>
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 text-center font-mono text-xs text-zinc-600">{p.sku}</td>
                  <td className="px-2 py-1.5 md:px-4 md:py-2 text-right font-mono tabular-nums text-[11px] md:text-xs font-semibold text-blue-600 whitespace-nowrap">
                    {formatCurrency(p.price)}
                  </td>
                  <td className="px-2 py-1.5 md:px-4 md:py-2 text-center whitespace-nowrap">
                    <span className={cn(
                      "md:hidden px-1.5 py-0.5 rounded text-[11px] font-bold font-mono tabular-nums",
                      available < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                      {p.stock}
                    </span>
                    <span className="hidden md:inline text-xs font-semibold font-mono tabular-nums text-zinc-700">
                      {p.stock}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 text-center">
                    <span className="text-xs font-semibold font-mono tabular-nums text-orange-600">{reserved}</span>
                  </td>
                  <td className="hidden md:table-cell px-4 py-2 text-center">
                    <span className={cn(
                      "px-2 py-0.5 rounded text-xs font-bold font-mono tabular-nums",
                      available < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                      {available}
                    </span>
                  </td>
                  <td className="px-1.5 py-1.5 md:px-4 md:py-2 text-right whitespace-nowrap">
                    <div className="flex justify-end gap-0.5 md:gap-1.5">
                      <button 
                        onClick={() => {
                          setIsEditing(p.id);
                          setFormData(p);
                        }}
                        className="p-1 md:p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                        title="Edit Produk"
                      >
                        <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-1 md:p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>

    {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-3.5 sm:p-4 w-full max-w-[330px] sm:max-w-sm shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">
                {isEditing === 'new' ? 'Tambah Produk Baru' : 'Edit Produk'}
              </h2>
              <button
                onClick={() => setIsEditing(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Nama Produk</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">SKU</label>
                <input 
                  type="text" 
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Kategori</label>
                <input 
                  type="text" 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Harga Jual</label>
                <input 
                  type="number" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Modal</label>
                <input 
                  type="number" 
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Stok Awal</label>
                <input 
                  type="number" 
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="pt-1 flex gap-2">
              <button onClick={() => setIsEditing(null)} className="flex-1 btn btn-secondary py-1.5 text-xs">Batal</button>
              <button 
                onClick={handleSave}
                className="flex-1 btn btn-primary py-1.5 text-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm space-y-4">
            <h3 className="font-bold text-lg">Hapus Produk?</h3>
            <p className="text-zinc-500 text-sm">Apakah Anda yakin ingin menghapus produk ini? Stok dan data lainnya akan hilang permanen.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setProductToDelete(null)} className="flex-1 btn btn-secondary">Batal</button>
              <button 
                onClick={() => {
                  setProducts((prev: Product[]) => prev.filter((p: any) => p.id !== productToDelete));
                  setProductToDelete(null);
                  triggerSuccess("Produk berhasil dihapus");
                }}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

