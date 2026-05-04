import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, ShoppingCart, Printer, CheckCircle2, 
  ChevronRight, ChevronLeft, CreditCard, Wallet, Banknote, 
  ClipboardList, PackagePlus, Truck, CheckCircle, Download, Save, QrCode, Coffee, Layout, BarChart3, TrendingUp, TrendingDown, ClipboardCheck, Utensils, Clock, ArrowRight, RotateCcw, Calendar, Filter, X, Package
} from 'lucide-react';
import { formatCurrency, generateId, generateOrderCode, cn } from '../lib/utils';
import { Product, Sale, CartItem, ShopInfo, Preorder, Milestone, PreorderItem, ActiveOrder, OrderStatus } from '../types';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function POSView({ products, setProducts, cart, setCart, sales, setSales, preorders, setPreorders, setActiveOrders, shopInfo, isDownloading, downloadAsPNG }: any) {
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [serviceType, setServiceType] = useState<'Dine In' | 'Take Away' | 'Online'>('Dine In');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [showOrderList, setShowOrderList] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [showBulkOrder, setShowBulkOrder] = useState(false);

  const saveHistory = () => {
    setHistory(prev => [[...cart], ...prev].slice(0, 3));
  };

  const undoCart = () => {
    if (history.length > 0) {
      setCart(history[0]);
      setHistory(prev => prev.slice(1));
    }
  };

  const parseBulkOrder = () => {
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    // Process only the first line for the current cart
    const line = lines[0];
    const [name, itemsStr, delivery] = line.split('|').map(s => s.trim());
    
    if (!name || !itemsStr) {
      alert("Format tidak valid. Gunakan: Nama | SKU:Qty, SKU:Qty | Kurir");
      return;
    }

    const itemsToAdd: CartItem[] = itemsStr.split(',').map(itemStr => {
      const [sku, qty] = itemStr.trim().split(':');
      const product = products.find((p: any) => p.sku === sku);
      if (!product) {
        console.warn(`Product with SKU ${sku} not found`);
      }
      return {
        id: product?.id || generateId(),
        sku: sku || 'N/A',
        name: product?.name || `Product ${sku || 'Unknown'}`,
        quantity: parseInt(qty) || 1,
        price: product?.price || 0
      };
    });

    setCart(itemsToAdd);
    setCustomerName(name);
    setServiceType('Online');
    setDeliveryMode(delivery || 'Pick up');
    setBulkText('');
    setShowBulkOrder(false);
  };

  const filteredProducts = products.filter((p: any) => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const total = cart.reduce((acc: any, item: any) => acc + (item.price * item.quantity), 0);
  const change = (parseFloat(amountPaid) || 0) - total;

  const addToCart = (product: Product) => {
    const available = product.stock - product.reserved;
    if (available <= 0) return;
    saveHistory();
    setCart((prev: any) => {
      const existing = prev.find((item: any) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= available) return prev;
        return prev.map((item: any) => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev: any) => prev.map((item: any) => {
      if (item.id === id) {
        const product = products.find((p: any) => p.id === id);
        const available = (product?.stock || 0) - (product?.reserved || 0);
        const newQty = Math.max(0, item.quantity + delta);
        if (newQty > available) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter((item: any) => item.quantity > 0));
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const todayStr = format(new Date(), 'ddMMyy');
    const allOrders = [...(sales || []), ...(preorders || [])];
    const todayOrders = allOrders.filter(o => o.id.includes(todayStr));
    const nextSeq = todayOrders.length === 0 ? 1 : 
      Math.max(...todayOrders.map(o => {
        const seq = parseInt(o.id.slice(-4));
        return isNaN(seq) ? 0 : seq;
      })) + 1;
    
    const prefix = serviceType === 'Dine In' ? 'DIN' : serviceType === 'Take Away' ? 'TKA' : 'ONL';
    const orderId = generateOrderCode(prefix, nextSeq);

    let finalOrderNumber = orderNumber;
    if (serviceType === 'Take Away') {
      const todayTA = sales.filter((s: any) => 
        format(new Date(s.date), 'ddMMyy') === todayStr && 
        (s.serviceType === 'Take Away' || s.id.startsWith('TKA'))
      ).length;
      finalOrderNumber = (todayTA + 1).toString().padStart(3, '0');
    }

    if (serviceType === 'Online') {
      // Create single CO for Online Kanban
      const newPreorder: Preorder = {
        id: orderId,
        date: new Date().toISOString(),
        customerName: customerName || 'Pelanggan Online',
        items: cart.map(item => ({
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        deliveryMode: deliveryMode || 'Gojek/Grab',
        shippingCost: 0,
        milestone: 'produksi',
        total
      };

      setPreorders((prev: Preorder[]) => [newPreorder, ...prev]);
    } else {
      // Create Sale
      const saleData: Sale = {
        id: orderId,
        date: new Date().toISOString(),
        orderDate: new Date().toISOString(),
        items: cart,
        total,
        paymentMethod: paymentMethod === 'transfer' ? 'transfer' : 'cash',
        amountPaid: paymentMethod === 'cash' ? (parseFloat(amountPaid) || total) : total,
        change: paymentMethod === 'cash' ? (change > 0 ? change : 0) : 0,
        customerName: customerName || 'Pelanggan',
        serviceType,
        tableNumber: serviceType === 'Dine In' ? tableNumber : undefined,
        orderNumber: serviceType === 'Take Away' ? (finalOrderNumber || orderNumber) : undefined
      };

      setSales((prev: any) => [saleData, ...prev]);
      
      // Also add to Active Orders for Kitchen Monitor
      const activeOrder: ActiveOrder = {
        ...saleData,
        items: cart.map(item => ({ ...item, isReady: false })),
        status: 'pending'
      };
      setActiveOrders((prev: ActiveOrder[]) => [...prev, activeOrder]);

      // Update stock
      setProducts((prev: any) => prev.map((p: any) => {
        const cartItem = cart.find((item: any) => item.id === p.id);
        if (cartItem) {
          return { 
            ...p, 
            stock: p.stock - cartItem.quantity 
          };
        }
        return p;
      }));
      
      // Auto-show Order List for printing
      setShowOrderList(saleData);
    }

    setCart([]);
    setShowCheckout(false);
    setAmountPaid('');
    setCustomerName('');
    setDeliveryMode('');
    setTableNumber('');
    setOrderNumber('');
    setPaymentMethod('cash');
  };

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Search and Title Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-zinc-100 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter text-blue-600 whitespace-normal leading-tight">
          {shopInfo.name} Order
        </h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={() => setShowBulkOrder(!showBulkOrder)}
            className="btn btn-secondary text-[10px] gap-1.5 py-2 px-3 whitespace-nowrap"
          >
            <ClipboardList className="w-3.5 h-3.5" /> Bulk Order
          </button>
          <div className="relative flex-1 sm:w-64 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Cari produk..." 
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {showBulkOrder && (
        <div className="card p-4 space-y-4 bg-blue-50/50 border-blue-100 border-2 animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-blue-900 text-sm flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Bulk Order Input
            </h3>
            <button onClick={() => setShowBulkOrder(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>
          <p className="text-[10px] text-blue-600/70 leading-relaxed">
            Format: <code className="font-mono bg-white px-1 rounded border">Nama Pelanggan | SKU:Qty, SKU:Qty | Mode Kirim</code><br/>
            Contoh: <code className="font-mono bg-white px-1 rounded border">Budi Hartono | KPY-001:2, GLA-002:1 | Gojek</code>
          </p>
          <textarea 
            rows={4}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder="Ketik pesanan di sini..."
            className="w-full p-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xs bg-white"
          />
          <button 
            onClick={parseBulkOrder}
            className="w-full btn btn-primary py-2 text-xs"
          >
            Proses ke Keranjang
          </button>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Product Selection */}
        <div className="w-full lg:col-span-8 flex flex-col gap-4 md:gap-6">

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
          {filteredProducts.map((product: Product) => {
            const reserved = product.reserved || 0;
            const available = product.stock - reserved;
            
            return (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={available <= 0}
                className={cn(
                  "card text-left hover:border-blue-500 hover:shadow-md transition-all group relative overflow-hidden flex flex-col gap-1.5 md:gap-2 p-3 md:p-4 cursor-pointer",
                  available <= 0 && "opacity-60 cursor-not-allowed grayscale-[0.5]"
                )}
              >
                <div className="text-xs md:text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2 md:line-clamp-none">{product.name}</div>
                <div className="text-[10px] md:text-xs text-zinc-500 font-mono truncate">{product.sku}</div>
                <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-1">
                  <div className="text-zinc-500 text-[10px] md:text-xs">
                    <span className="hidden sm:inline">Tersedia: </span>
                    <span className={cn(available < 5 ? "text-red-500 font-bold" : "text-blue-600 font-bold")}>{available}</span>
                  </div>
                  <div className="text-blue-600 font-bold text-xs md:text-base">{formatCurrency(product.price)}</div>
                </div>
                {available <= 0 && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center font-black text-red-500 uppercase tracking-widest text-[10px] gap-1">
                    <Package className="w-5 h-5 opacity-50" />
                    <span>Habis</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-full lg:col-span-4 lg:sticky lg:top-24">
        <div className="card flex flex-col min-h-[300px] lg:h-[70vh] p-0 overflow-hidden shadow-sm lg:shadow-md border-2 border-blue-50 lg:border-zinc-200">
          <div className="p-4 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50/50">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            <span className="font-bold">Keranjang</span>
            <span className="ml-auto bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">{cart.length}</span>
          </div>

          <div className="px-4 py-3 border-b border-zinc-50">
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-lg">
              {(['Dine In', 'Take Away', 'Online'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setServiceType(type)}
                  className={cn(
                    "text-[10px] py-1.5 rounded-md font-bold transition-all uppercase tracking-tight",
                    serviceType === type ? "bg-white text-blue-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 opacity-50">
                <ShoppingCart className="w-12 h-12" />
                <p className="text-sm">Keranjang kosong</p>
              </div>
            ) : (
              cart.map((item: CartItem) => (
                <div key={item.id} className="flex justify-between items-start border-b border-zinc-50 pb-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-zinc-500">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-zinc-100 rotate-180"><ChevronRight className="w-4 h-4 cursor-pointer"/></button>
                    <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-zinc-100"><ChevronRight className="w-4 h-4 cursor-pointer"/></button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-zinc-50 border-t border-zinc-100 space-y-3">
            <div className="flex justify-between items-center text-lg font-bold">
              <div className="flex items-center gap-2">
                <span>Total</span>
                {history.length > 0 && (
                  <button 
                    onClick={undoCart}
                    className="p-1 px-2 bg-orange-100 text-orange-600 rounded text-[10px] font-black uppercase flex items-center gap-1 hover:bg-orange-200"
                  >
                    <RotateCcw className="w-3 h-3" /> Undo ({history.length})
                  </button>
                )}
              </div>
              <span className="text-blue-600">{formatCurrency(total)}</span>
            </div>
            <button 
              disabled={cart.length === 0}
              onClick={() => setShowCheckout(true)}
              className="w-full btn btn-primary py-3 text-base shadow-lg shadow-blue-200"
            >
              Bayar Sekarang
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-5 sm:p-8 w-full max-w-sm sm:max-w-md shadow-sm flex flex-col gap-4 sm:gap-6 max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-between items-center no-print">
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-zinc-800">Checkout</h2>
              <button 
                onClick={() => setShowCheckout(false)} 
                className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4 sm:space-y-6 no-scrollbar">
              <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-zinc-500 block mb-2 uppercase tracking-wider">Nama Pelanggan</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold placeholder:font-normal placeholder:text-zinc-300"
                />
              </div>

              {serviceType === 'Online' && (
                <div>
                  <label className="text-sm font-medium text-zinc-500 block mb-2 uppercase tracking-wider">Metode Pengiriman</label>
                  <input 
                    type="text" 
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                    placeholder="Contoh: Gojek, JNE, Ambil Sendiri"
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold placeholder:font-normal placeholder:text-zinc-300"
                  />
                </div>
              )}

              {serviceType === 'Dine In' && (
                <div>
                  <label className="text-sm font-medium text-zinc-500 block mb-2 uppercase tracking-wider">No. Meja</label>
                  <input 
                    type="text" 
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Contoh: Meja 05"
                    className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-bold placeholder:font-normal placeholder:text-zinc-300"
                  />
                </div>
              )}

              {serviceType === 'Take Away' && (
                <div>
                  <label className="text-sm font-medium text-zinc-500 block mb-2 uppercase tracking-wider">No. Antrean</label>
                  <div className="p-4 bg-zinc-50 border border-zinc-200 border-dashed rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Antrean:</span>
                    <span className="text-xl font-black text-blue-600 italic">AUTO</span>
                  </div>
                </div>
              )}

              {serviceType !== 'Online' && (
                <div>
                  <label className="text-sm font-medium text-zinc-500 block mb-3 uppercase tracking-wider">Metode Pembayaran</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPaymentMethod('cash')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                        paymentMethod === 'cash' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-zinc-100 hover:bg-zinc-50"
                      )}
                    >
                      <Banknote className="w-6 h-6" />
                      <span className="text-xs font-semibold">Tunai</span>
                    </button>
                    <button 
                      onClick={() => setPaymentMethod('transfer')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all cursor-pointer",
                        paymentMethod === 'transfer' ? "border-blue-600 bg-blue-50 text-blue-600" : "border-zinc-100 hover:bg-zinc-50"
                      )}
                    >
                      <QrCode className="w-6 h-6" />
                      <span className="text-xs font-semibold">QRIS / Transfer</span>
                    </button>
                  </div>
                </div>
              )}

              {serviceType !== 'Online' ? (
                paymentMethod === 'cash' ? (
                  <div>
                    <label className="text-sm font-medium text-zinc-500 block mb-2 uppercase tracking-wider">Jumlah Dibayar</label>
                    <input 
                      type="number" 
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={total.toString()}
                      className="w-full text-2xl font-bold p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    />
                    
                    <div className="mt-6 p-4 bg-zinc-100 rounded-xl space-y-2 font-mono">
                      <div className="flex justify-between text-zinc-500 text-sm">
                        <span>Total Tagihan</span>
                        <span className="font-semibold">{formatCurrency(total)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Kembalian</span>
                        <span className={cn(change < 0 ? "text-red-500" : "text-green-600")}>
                          {formatCurrency(change)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex flex-col items-center gap-4">
                      {shopInfo.qrisImage && (
                        <div className="bg-white p-2 rounded-xl shadow-sm">
                          <img src={shopInfo.qrisImage} alt="QRIS" className="w-32 h-32 object-contain" />
                        </div>
                      )}
                      <div className="text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Rekening Tujuan</p>
                        {shopInfo.bankAccounts?.map((acc: any, i: number) => (
                          <div key={i} className="mb-2 last:mb-0">
                            <p className="font-black text-sm text-blue-900">{acc.bankName} - {acc.accountNumber}</p>
                            <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-tighter">A/N: {acc.accountName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-zinc-100 rounded-xl">
                      <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Bayar:</span>
                      <span className="text-xl font-black text-blue-600">{formatCurrency(total)}</span>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-lg text-center space-y-3">
                  <Package className="w-10 h-10 text-blue-400 mx-auto" />
                  <div>
                    <h4 className="font-bold text-blue-900">Pesanan Online</h4>
                    <p className="text-xs text-blue-600/70">Pesanan akan masuk ke kolom <span className="font-bold">Pending Produksi</span> di menu Online untuk diproses lebih lanjut.</p>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-blue-100">
                    <span className="text-xs font-bold text-zinc-400 uppercase">Subtotal CO:</span>
                    <span className="text-lg font-black text-blue-600">{formatCurrency(total)}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={handleCheckout}
                className={cn(
                  "w-full py-4 text-lg font-black uppercase tracking-widest rounded-xl shadow-lg transition-all",
                  serviceType !== 'Online' && paymentMethod === 'cash' && change < 0 
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed" 
                    : "bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]"
                )}
                disabled={serviceType !== 'Online' && paymentMethod === 'cash' && change < 0}
              >
                {serviceType === 'Online' ? 'Buat Pesanan Online' : 'Konfirmasi Penjualan'}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Order List / Bill Modal for Dine In / Take Away / Online */}
      {showOrderList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg p-4 sm:p-8 w-full max-w-sm shadow-sm relative my-auto"
          >
            <button onClick={() => setShowOrderList(null)} className="absolute top-2 sm:top-4 right-2 sm:right-4 text-zinc-400 hover:text-zinc-600 no-print cursor-pointer"><X /></button>
            <div id="bill-ticket" className="bg-white p-4 sm:p-6 border-2 border-dashed border-zinc-200 font-mono text-xs sm:text-sm space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="font-black text-xl uppercase italic tracking-tighter">Order Ticket</h3>
                <p className="text-[10px] text-zinc-400 uppercase mt-1">{format(new Date(), 'dd/MM/yy HH:mm')}</p>
              </div>

              <div className="flex justify-between items-center py-2 border-b-2 border-zinc-900 border-dotted text-xs">
                <div className="font-black uppercase">
                  <div>Tipe: {showOrderList.serviceType}</div>
                  <div className="text-lg">
                    {showOrderList.serviceType === 'Dine In' ? `Meja: ${showOrderList.tableNumber}` : `Antrean: ${showOrderList.orderNumber}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-zinc-400">#NOTA</div>
                  <div className="font-black">#{showOrderList.id}</div>
                </div>
              </div>

              <div className="space-y-4 py-4">
                {showOrderList.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div className="flex gap-3">
                      <span className="font-black text-lg">x{item.quantity}</span>
                      <span className="font-bold uppercase leading-tight pt-1">{item.name}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-zinc-900 border-dotted pt-4">
                 <p className="text-[10px] text-center text-zinc-400 font-bold uppercase tracking-widest leading-relaxed">
                   Pelanggan: {showOrderList.customerName}<br/>
                   * PESANAN HARAP SEGERA DIPROSES *
                 </p>
              </div>
            </div>

             <div className="flex gap-2 w-full mt-6 no-print">
               <button 
                 onClick={() => window.print()} 
                 className="flex-1 btn btn-primary py-3 flex items-center justify-center gap-2 font-bold shadow-lg"
               >
                 <Printer className="w-5 h-5" /> Cetak Ticket Order
               </button>
               <button 
                 onClick={() => downloadAsPNG('bill-ticket', `Ticket_${showOrderList?.id || 'Order'}`)}
                 disabled={isDownloading}
                 className="flex-1 btn bg-green-600 text-white py-3 font-bold shadow-lg hover:bg-green-700 disabled:bg-zinc-400 flex items-center justify-center gap-2"
               >
                 {isDownloading ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PNG (WA)
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

