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
      if (sortKey === 'name') comparison = a.name.localeCompare(b.name);
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
    <div className="space-y-4 md:space-y-6 relative">
      <div>
        {errorMsg && (
          <div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <CheckCircle2 className="w-4 h-4 rotate-180" /> {errorMsg}
          </div>
        )}
        {successMsg && (
          <div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Daftar Produk</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">{filteredProducts.length} Items Ditemukan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              placeholder="Cari Nama / SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-xs outline-none w-full sm:w-48 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <select 
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="pl-9 pr-8 py-2 bg-zinc-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl text-xs outline-none appearance-none transition-all cursor-pointer"
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <label className="btn btn-secondary gap-2 px-3 md:px-4 shadow-sm cursor-pointer flex items-center h-10">
            <Plus className="w-3.5 md:w-4 h-3.5 md:h-4 text-zinc-400" />
            <span className="text-[10px] uppercase font-black">Import Bulk</span>
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
          <button 
            onClick={downloadTemplate}
            className="btn btn-secondary gap-2 px-3 md:px-4 shadow-sm text-[10px] font-black uppercase h-10"
            title="Download Template CSV"
          >
            <Download className="w-3.5 md:w-4 h-3.5 md:h-4" /> Template
          </button>
          <button 
            onClick={exportToExcel}
            className="btn btn-secondary gap-2 px-3 md:px-4 shadow-sm text-[10px] font-black uppercase h-10"
          >
            <Download className="w-3.5 md:w-4 h-3.5 md:h-4" /> Export
          </button>
          <button onClick={() => setIsEditing('new')} className="btn btn-primary gap-2 shadow-md h-10 md:px-6">
            <Plus className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-tight">Tambah</span>
          </button>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-100">
              <th 
                className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => toggleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Produk
                  {sortKey === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-center">SKU</th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-right cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => toggleSort('price')}
              >
                <div className="flex items-center justify-end gap-1">
                  Harga Jual
                  {sortKey === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th 
                className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-center cursor-pointer hover:text-blue-600 transition-colors"
                onClick={() => toggleSort('stock')}
              >
                <div className="flex items-center justify-center gap-1">
                  Total Stok
                  {sortKey === 'stock' && (sortOrder === 'asc' ? '↑' : '↓')}
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-center">Reserved</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-center">Available</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {filteredProducts.map((p: Product) => {
              const reserved = p.reserved || 0;
              const available = p.stock - reserved;
              return (
                <tr key={p.id} className="hover:bg-zinc-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-zinc-400">{p.category}</div>
                  </td>
                  <td className="px-6 py-4 text-center font-mono text-xs">{p.sku}</td>
                  <td className="px-6 py-4 text-right font-medium text-blue-600">{formatCurrency(p.price)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-semibold text-zinc-600">{p.stock}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-semibold text-orange-600">{reserved}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold",
                      available < 10 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                    )}>
                      {available}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 px-1">
                      <button 
                        onClick={() => {
                          setIsEditing(p.id);
                          setFormData(p);
                        }}
                        className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteProduct(p.id)}
                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
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
      </div>
    </div>

    {isEditing && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-8 w-full max-w-lg shadow-sm"
          >
            <h2 className="text-xl font-bold mb-6">{isEditing === 'new' ? 'Tambah Produk Baru' : 'Edit Produk'}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Nama Produk</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">SKU</label>
                <input 
                  type="text" 
                  value={formData.sku}
                  onChange={e => setFormData({...formData, sku: e.target.value})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Kategori</label>
                <input 
                  type="text" 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Harga Jual (Rp)</label>
                <input 
                  type="number" 
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Modal (Rp)</label>
                <input 
                  type="number" 
                  value={formData.cost}
                  onChange={e => setFormData({...formData, cost: parseFloat(e.target.value)})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Stok Awal</label>
                <input 
                  type="number" 
                  value={formData.stock}
                  onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                  className="w-full p-2.5 border border-zinc-200 rounded-lg"
                />
              </div>
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setIsEditing(null)} className="flex-1 btn btn-secondary">Batal</button>
              <button 
                onClick={handleSave}
                className="flex-1 btn btn-primary"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm space-y-4">
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

