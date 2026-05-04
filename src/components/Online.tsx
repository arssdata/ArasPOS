import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Trash2, Download, Save, QrCode, CheckCircle, Printer,
  Truck, PackagePlus, ClipboardList, Filter, Calendar, Clock, ArrowRight, RotateCcw, X, ChevronRight, ChevronLeft, ShoppingCart, CheckCircle2
} from 'lucide-react';
import { formatCurrency, generateId, generateOrderCode, cn } from '../lib/utils';
import { Product, Sale, ShopInfo, Preorder, PreorderItem, ActiveOrder, OrderStatus } from '../types';
import { format } from 'date-fns';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export function OnlineView({ preorders, setPreorders, sales, products, setProducts, setSales, shopInfo, downloadAsPNG, downloadAsPDF, isDownloading }: any) {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Preorder | null>(null);
  const [downloadingReceiptOrder, setDownloadingReceiptOrder] = useState<Preorder | null>(null);
  const [isCheckingAvi, setIsCheckingAvi] = useState(false);

  useEffect(() => {
    if (downloadingReceiptOrder) {
      const timer = setTimeout(async () => {
        try {
          await downloadAsPNG('hidden-online-receipt', `Receipt_${downloadingReceiptOrder.id}`);
        } catch (err) {
          console.error('Direct download failed:', err);
        } finally {
          setDownloadingReceiptOrder(null);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [downloadingReceiptOrder, downloadAsPNG]);
  const [aviReadyOrders, setAviReadyOrders] = useState<string[]>([]);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const saveHistory = () => {
    setHistory(prev => [{ preorders: [...preorders], products: [...products], sales: [...sales] }, ...prev].slice(0, 3));
  };

  const undoMove = () => {
    if (history.length > 0) {
      const last = history[0];
      setPreorders(last.preorders);
      setProducts(last.products);
      setSales(last.sales);
      setHistory(prev => prev.slice(1));
    }
  };

  const milestones: Milestone[] = ['produksi', 'penyimpanan', 'pengiriman'];

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCheckAvi = () => {
    setIsCheckingAvi(true);
    const productionOrders = preorders.filter((p: Preorder) => p.milestone === 'produksi');
    
    // Virtual stock for calculation
    const virtualStock = products.map((p: Product) => ({
      sku: p.sku,
      available: (p.stock || 0) - (p.reserved || 0)
    }));

    const readyIds: string[] = [];

    productionOrders.forEach((order: Preorder) => {
      let isReady = true;
      order.items.forEach(item => {
        const stockItem = virtualStock.find(vs => vs.sku === item.sku);
        if (!stockItem || stockItem.available < item.quantity) {
          isReady = false;
        }
      });

      if (isReady) {
        readyIds.push(order.id);
        order.items.forEach(item => {
          const stockItem = virtualStock.find(vs => vs.sku === item.sku);
          if (stockItem) stockItem.available -= item.quantity;
        });
      }
    });

    setAviReadyOrders(readyIds);
  };

  const handleSaveReadyOrders = () => {
    const ordersToMove = preorders.filter((p: Preorder) => 
      selectedOrders.includes(p.id) && p.milestone === 'produksi' && aviReadyOrders.includes(p.id)
    );

    if (ordersToMove.length === 0) {
      triggerError("Pilih pesanan status 'Ready' di kolom Produksi.");
      return;
    }

    saveHistory();
    setProducts((prev: Product[]) => prev.map(p => {
      const totalReservedNeeded = ordersToMove.reduce((acc, order) => {
        const item = order.items.find(i => i.sku === p.sku);
        return acc + (item ? item.quantity : 0);
      }, 0);

      if (totalReservedNeeded > 0) {
        return { ...p, reserved: (p.reserved || 0) + totalReservedNeeded };
      }
      return p;
    }));

    setPreorders(preorders.map((p: Preorder) => 
      ordersToMove.some(o => o.id === p.id) ? { ...p, milestone: 'penyimpanan' } : p
    ));

    setSelectedOrders([]);
    setIsCheckingAvi(false);
    setAviReadyOrders([]);
  };

  const cancelOrder = (id: string) => {
    const order = preorders.find(o => o.id === id);
    if (!order) return;

    saveHistory();
    // If milestone is not 'produksi', it means stock was already added/reserved
    if (order.milestone !== 'produksi') {
      setProducts((prev: Product[]) => prev.map(p => {
        const item = order.items.find(i => i.sku === p.sku);
        if (item) {
          // Release reserved stock but keep the stock (as it was produced)
          // Actually, if we cancel, the stock is now "available" for others.
          // Since our logic for 'produksi' -> 'penyimpanan' is stock++ and reserved++,
          // cancelling in storage means we just reserved--.
          return { 
            ...p, 
            reserved: Math.max(0, (p.reserved || 0) - item.quantity) 
          };
        }
        return p;
      }));
    }

    setPreorders(preorders.filter(o => o.id !== id));
    setOrderToCancel(null);
  };

  const moveMilestone = (milestone: Milestone, next: Milestone) => {
    // Enforce sequence: produksi -> penyimpanan -> pengiriman
    const allowedMoves: Record<Milestone, Milestone> = {
      'produksi': 'penyimpanan',
      'penyimpanan': 'pengiriman',
      'pengiriman': 'pengiriman' // Nowhere else to go
    };

    if (allowedMoves[milestone] !== next) {
      triggerError(`Alur tidak valid! Harus mengikuti urutan: Produksi -> Penyimpanan -> Pengiriman.`);
      return;
    }

    saveHistory();
    const selectedOrdersData = preorders.filter((p: Preorder) => selectedOrders.includes(p.id) && p.milestone === milestone);

    // If moving from 'produksi' to 'penyimpanan', increase stock and reservation
    if (milestone === 'produksi' && next === 'penyimpanan') {
      setProducts((prev: Product[]) => prev.map(p => {
        const totalNeeded = selectedOrdersData.reduce((acc, order) => {
          const item = order.items.find(i => i.sku === p.sku);
          return acc + (item ? item.quantity : 0);
        }, 0);
        
        if (totalNeeded > 0) {
          return {
            ...p,
            stock: (p.stock || 0) + totalNeeded,
            reserved: (p.reserved || 0) + totalNeeded
          };
        }
        return p;
      }));
    }

    setPreorders(preorders.map((p: Preorder) => {
      if (selectedOrders.includes(p.id) && p.milestone === milestone) {
        return { ...p, milestone: next };
      }
      return p;
    }));
    setSelectedOrders([]);
  };

  const finalizeOrders = () => {
    // Only finalize orders that are in 'pengiriman' milestone
    const inCorrectMilestone = preorders.filter((p: Preorder) => selectedOrders.includes(p.id) && p.milestone === 'pengiriman');
    
    if (inCorrectMilestone.length !== selectedOrders.length) {
      triggerError('Hanya pesanan di milestone "Pending Kirim & Bayar" yang bisa ditutup.');
      return;
    }

    saveHistory();
    // Convert to sales
    const ordersToFinalize = preorders.filter((p: Preorder) => selectedOrders.includes(p.id));
    
    // Decrease stock and reserved qty when finalized
    setProducts((prev: Product[]) => prev.map(p => {
      const totalFinalized = ordersToFinalize.reduce((acc, order) => {
        const item = order.items.find(i => i.sku === p.sku);
        return acc + (item ? item.quantity : 0);
      }, 0);
      
      if (totalFinalized > 0) {
        return {
          ...p,
          stock: p.stock - totalFinalized,
          reserved: Math.max(0, p.reserved - totalFinalized)
        };
      }
      return p;
    }));

    const newSales = ordersToFinalize.map((p: Preorder) => ({
      id: p.id,
      date: new Date().toISOString(),
      orderDate: p.date,
      customerName: p.customerName,
      items: p.items.map(item => {
        const product = products.find((prod: any) => prod.sku === item.sku);
        return {
          ...product,
          quantity: item.quantity
        };
      }),
      total: p.total + p.shippingCost,
      serviceType: 'Online',
      paymentMethod: 'cash', // Default
      amountPaid: p.total + p.shippingCost,
      change: 0
    }));

    setSales((prev: any) => [...newSales, ...prev]);
    setPreorders(preorders.filter((p: Preorder) => !selectedOrders.includes(p.id)));
    setSelectedOrders([]);
  };

  const updateDelivery = (id: string, mode: string, cost: number) => {
    setPreorders(preorders.map((p: Preorder) => p.id === id ? { ...p, deliveryMode: mode, shippingCost: cost } : p));
  };

  const selectAllInMilestone = (milestone: Milestone) => {
    const ids = preorders.filter((p: Preorder) => p.milestone === milestone).map((p: Preorder) => p.id);
    setSelectedOrders(prev => {
      const otherSelected = prev.filter(id => !ids.includes(id));
      const allInMilestoneSelected = ids.every(id => prev.includes(id)) && ids.length > 0;
      
      if (allInMilestoneSelected) {
        return otherSelected;
      } else {
        const unique = Array.from(new Set([...prev, ...ids]));
        return unique;
      }
    });
  };

  const sendWhatsAppReceipt = (order: Preorder) => {
    const subtotal = order.total;
    const finalTotal = subtotal + order.shippingCost;
    const bankText = shopInfo.bankAccounts && shopInfo.bankAccounts.length > 0 
      ? shopInfo.bankAccounts.map((b: any) => `${b.bankName}: ${b.accountNumber} (A/N ${b.accountName || '-'})`).join('\n')
      : '[MENUNGGU REKENING TOKO]';

    const text = `Invoice Order\n` +
      `*${shopInfo.name}*\n\n` +
      `Customer : ${order.customerName || '-'}\n` +
      `No : ${order.id}\n` +
      `Tanggal : ${format(new Date(order.date), 'dd/MM/yy HH:mm')}\n` +
      `CP : ${shopInfo.phone}\n` +
      `--------------------------\n` +
      `${order.items.map(i => `${i.name} (x${i.quantity}) - ${formatCurrency(i.price * i.quantity)}`).join('\n')}\n` +
      `--------------------------\n` +
      `Subtotal: ${formatCurrency(subtotal)}\n` +
      `Ongkir : ${formatCurrency(order.shippingCost)}\n` +
      `*TOTAL: ${formatCurrency(finalTotal)}*\n\n` +
      `*PEMBAYARAN KE:*\n${bankText}\n` +
      `QRIS terlampir di struk pembelian\n\n` +
      `${shopInfo.message}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const toggleSelect = (id: string) => {
    setSelectedOrders(prev => 
      prev.includes(id) ? prev.filter(oid => oid !== id) : [...prev, id]
    );
  };

  const getSummary = () => {
    const summary: Record<string, { name: string, qty: number }> = {};
    preorders.filter((p: Preorder) => selectedOrders.includes(p.id)).forEach(p => {
      p.items.forEach(item => {
        if (!summary[item.sku]) summary[item.sku] = { name: item.name, qty: 0 };
        summary[item.sku].qty += item.quantity;
      });
    });
    return summary;
  };

  const filteredPreorders = preorders.filter((p: Preorder) => {
    const term = searchTerm.toLowerCase();
    const matchesCustomer = (p.customerName || '').toLowerCase().includes(term);
    const matchesProduct = p.items.some(item => 
      item.name.toLowerCase().includes(term) || item.sku.toLowerCase().includes(term)
    );
    const matchesId = p.id.toLowerCase().includes(term);
    return matchesCustomer || matchesProduct || matchesId;
  });

  return (
    <div className="space-y-4 md:space-y-6 lg:pb-10">
      <div className="sticky top-0 z-30 bg-zinc-50 pt-1 -mt-1 space-y-4 md:space-y-6 no-print">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              placeholder="Cari Pelanggan, SKU, atau ID Pesanan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
            />
          </div>

           <div className="flex flex-wrap gap-2 md:gap-3 items-center bg-blue-50/80 backdrop-blur-md p-2 md:p-4 rounded-xl border border-blue-100 shadow-sm">
              <span className="text-[10px] font-black text-blue-600 uppercase mr-2 whitespace-nowrap">{selectedOrders.length} Terpilih</span>
              
               <button 
                disabled={selectedOrders.length === 0 || isDownloading}
                onClick={() => downloadAsPNG('summary-print-area', `Summary_Produksi_${format(new Date(), 'ddMMyy')}`)}
                className="btn btn-secondary text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                {isDownloading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <ClipboardList className="w-3.5 h-3.5" />} Summary
              </button>
              
              <button 
                disabled={selectedOrders.length === 0 || isDownloading}
                onClick={() => downloadAsPNG('labels-print-area', `Labels_${format(new Date(), 'ddMMyy')}`)}
                className="btn btn-secondary text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                {isDownloading ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />} Label
              </button>

              {history.length > 0 && (
                <button 
                  onClick={undoMove}
                  className="btn bg-orange-100 text-orange-700 hover:bg-orange-200 text-[10px] gap-1.5 py-1.5 border border-orange-200 whitespace-nowrap"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> UNDO ({history.length})
                </button>
              )}

              <div className="h-6 w-px bg-blue-200 shrink-0 mx-1" />

              <button 
                onClick={handleCheckAvi}
                className="btn bg-blue-600 text-white hover:bg-blue-700 text-[10px] gap-1.5 py-1.5 shadow-sm whitespace-nowrap"
              >
                <Search className="w-3.5 h-3.5" /> Hitung Stok
              </button>

              <button 
                disabled={!isCheckingAvi || selectedOrders.length === 0}
                onClick={handleSaveReadyOrders}
                className="btn bg-orange-500 text-white hover:bg-orange-600 text-[10px] gap-1.5 py-1.5 shadow-sm whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" /> Simpan Stok
              </button>

              <div className="h-6 w-px bg-blue-200 shrink-0 mx-1" />

              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('produksi', 'penyimpanan')}
                className="btn bg-white border border-green-200 text-green-700 hover:bg-green-50 text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Selesai Produksi
              </button>

              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('penyimpanan', 'pengiriman')}
                className="btn bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Siap Bayar
              </button>

               <button 
                 disabled={selectedOrders.length === 0}
                 onClick={finalizeOrders}
                 className="btn bg-green-600 text-white hover:bg-green-700 text-[10px] gap-1.5 py-1.5 shadow-sm whitespace-nowrap"
               >
                 <CheckCircle className="w-3.5 h-3.5" /> Selesai Bayar
               </button>
             </div>
         </div>
       </div>

       <div className="space-y-6 relative">
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

          <div className="flex flex-col lg:flex-row lg:gap-6 gap-8 pb-4">
            {milestones.map(m => (
              <div key={m} className="w-full lg:min-w-[300px] lg:flex-1 flex flex-col gap-4">
                <div className="flex flex-col gap-2 px-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      {m === 'produksi' && '🛠️ Pending Produksi'}
                      {m === 'penyimpanan' && '📦 Penyimpanan'}
                      {m === 'pengiriman' && '🚚 Pending Kirim & Bayar'}
                    </h4>
                    <span className="text-[10px] font-bold bg-zinc-200 text-zinc-600 px-1.5 rounded">
                      {filteredPreorders.filter((p: Preorder) => p.milestone === m).length}
                    </span>
                  </div>
                  <button 
                    onClick={() => selectAllInMilestone(m)}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-tight text-left self-start"
                  >
                    {filteredPreorders.filter((p: Preorder) => p.milestone === m).every(p => selectedOrders.includes(p.id)) && filteredPreorders.filter((p: Preorder) => p.milestone === m).length > 0 ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className={cn(
                  "flex flex-col gap-3 border-2 border-dashed rounded-lg p-2 transition-all duration-300",
                  filteredPreorders.filter((p: Preorder) => p.milestone === m).length === 0 ? "min-h-[60px] md:min-h-[150px]" : "min-h-[150px] md:min-h-[500px]",
                  m === 'produksi' ? "bg-red-50/40 border-red-100" :
                  m === 'penyimpanan' ? "bg-orange-50/40 border-orange-100" :
                  "bg-green-50/40 border-green-100"
                )}>
                  {filteredPreorders.filter((p: Preorder) => p.milestone === m)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // FIFO
                    .map((order: Preorder) => (
                    <div 
                      layoutId={order.id}
                      key={order.id}
                      onClick={() => toggleSelect(order.id)}
                      className={cn(
                        "card p-4 space-y-3 cursor-pointer transition-all border-2 relative",
                        selectedOrders.includes(order.id) ? "border-blue-500 shadow-md ring-2 ring-blue-100 ring-offset-1" : "hover:border-zinc-300",
                        isCheckingAvi && aviReadyOrders.includes(order.id) && "border-green-500 bg-green-50/30"
                      )}
                    >
                      {isCheckingAvi && aviReadyOrders.includes(order.id) && (
                        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[8px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-white uppercase tracking-tighter">
                          Stock Ready
                        </div>
                      )}
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded">{order.id}</span>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrderToCancel(order.id);
                            }}
                            className="p-1 text-zinc-300 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="text-[10px] text-zinc-400">{format(new Date(order.date), 'HH:mm • dd MMM')}</span>
                        </div>
                      </div>
                      <div className="font-bold text-sm tracking-tight">{order.customerName}</div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-[11px] flex justify-between text-zinc-500">
                            <span>{item.name}</span>
                            <span className="font-bold">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-2 border-t border-zinc-50 flex flex-col gap-2" onClick={e => e.stopPropagation()}>
                        {order.milestone === 'penyimpanan' ? (
                          <div className="space-y-3 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                            <div className="flex items-center justify-between text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                              <span>Atur Pengiriman</span>
                              <Truck className="w-3.5 h-3.5" />
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                value={order.deliveryMode}
                                onChange={(e) => updateDelivery(order.id, e.target.value, order.shippingCost)}
                                placeholder="MOT"
                                className="text-[10px] bg-white border border-zinc-200 px-2 py-1.5 rounded w-20 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                              />
                              <input 
                                type="number"
                                value={order.shippingCost || ''}
                                onChange={(e) => updateDelivery(order.id, order.deliveryMode, parseInt(e.target.value) || 0)}
                                placeholder="Harga Ongkir"
                                className="text-[10px] bg-white border border-zinc-200 px-2 py-1.5 rounded flex-1 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                              />
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-zinc-200/50">
                              <span className="text-[10px] text-zinc-400 uppercase font-black">Final CO:</span>
                              <span className="text-sm font-black text-blue-600 whitespace-nowrap">{formatCurrency(order.total + order.shippingCost)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                <Truck className="w-3 h-3" /> {order.deliveryMode}
                              </span>
                              {order.shippingCost > 0 && (
                                <span className="text-[10px] text-zinc-400 font-medium pl-1">Ongkir: {formatCurrency(order.shippingCost)}</span>
                              )}
                            </div>
                            <span className="text-sm font-black text-blue-600 whitespace-nowrap">{formatCurrency(order.total + order.shippingCost)}</span>
                          </div>
                        )}

                        {order.milestone === 'pengiriman' && (
                          <div className="flex gap-2">
                            <button 
                              onClick={() => sendWhatsAppReceipt(order)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100 hover:bg-green-100 transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" /> WA
                            </button>
                            <button 
                               onClick={() => setDownloadingReceiptOrder(order)}
                              className="px-3 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg border border-blue-100 hover:bg-blue-100"
                              title="Download PNG"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
  
        {/* Cancel Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-lg p-6 w-full max-w-sm shadow-sm space-y-4">
            <h3 className="font-bold text-lg">Batalkan Pesanan?</h3>
            <p className="text-zinc-500 text-sm">Apakah Anda yakin ingin membatalkan pesanan <span className="font-bold text-zinc-900">{orderToCancel}</span>? Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setOrderToCancel(null)} className="flex-1 btn btn-secondary">Tidak, Kembali</button>
              <button 
                onClick={() => cancelOrder(orderToCancel)}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Areas (Rendered off-screen for capture) */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* Summary Print Area */}
        <div 
          id="summary-print-area"
          className="bg-white rounded p-8 sm:p-20 w-full max-w-[210mm] min-h-[297mm] relative font-sans text-zinc-900 border border-zinc-200 shadow-sm"
        >
          <div className="space-y-6">
            <div className="text-center border-b-2 border-zinc-900 pb-6 mt-4 leading-relaxed">
              <h2 className="text-3xl font-black uppercase tracking-normal">{shopInfo.name}</h2>
              <div className="text-xl font-bold uppercase tracking-widest mt-1">Summary Produksi Pesanan</div>
              <p className="text-zinc-500 font-mono mt-2 uppercase tracking-widest text-xs">Dibuat: {format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
              <p className="text-zinc-400 text-xs mt-1 font-bold">{selectedOrders.length} Pesanan Online Terpilih</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 border-l-8 border-blue-600 pl-4 py-1">
                <h3 className="font-black text-xl uppercase tracking-widest">Total Bahan / Produk Harus Disiapkan</h3>
              </div>
              <div className="border-2 border-zinc-900 rounded-lg overflow-hidden">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-zinc-900 text-white text-left">
                      <th className="p-2 text-xs font-black uppercase tracking-widest border border-zinc-700">SKU</th>
                      <th className="p-2 text-xs font-black uppercase tracking-widest border border-zinc-700">Nama Produk</th>
                      <th className="p-2 text-xs font-black uppercase tracking-widest text-center border border-zinc-700">Qty</th>
                      <th className="p-2 text-xs font-black uppercase tracking-widest text-center border border-zinc-700 w-16">Cek</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-0">
                    {Object.entries(getSummary()).map(([sku, data]) => (
                      <tr key={sku} className="font-bold">
                        <td className="p-2 font-mono text-zinc-500 text-xs border border-zinc-300">{sku}</td>
                        <td className="p-2 text-sm uppercase break-words whitespace-normal text-left border border-zinc-300">{data.name}</td>
                        <td className="p-2 text-center border border-zinc-300">{data.qty}</td>
                        <td className="p-2 border border-zinc-300 w-16"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 border-t pt-6 flex justify-between items-end text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
              <div className="space-y-4">
                <div>Bagian Produksi:</div>
                <div className="h-12 w-40 border-b-2 border-zinc-900" />
              </div>
              <div className="text-right">
                Dihasilkan oleh Sistem UMKM Pintar
              </div>
            </div>
          </div>
        </div>

        {/* Label Print Area */}
        <div 
          id="labels-print-area"
          className="bg-white rounded p-3 sm:p-5 w-full max-w-4xl relative shadow-sm"
        >
          <div className="grid grid-cols-2 gap-4 justify-center">
            {preorders.filter((p: Preorder) => selectedOrders.includes(p.id)).map(order => (
              <div key={order.id} className="bg-white p-3 sm:p-5 w-full border-2 border-zinc-900 text-zinc-900 flex flex-col gap-2 font-sans">
                <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-relaxed">Nomor Pesanan</div>
                    <div className="font-black text-2xl leading-none tracking-tighter break-words">{order.id}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-relaxed">Kurir</div>
                    <div className="font-black text-lg text-zinc-900 break-words">{order.deliveryMode.toUpperCase()}</div>
                  </div>
                </div>
                
                <div className="space-y-1 bg-zinc-900 text-white p-3 rounded-lg">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 leading-relaxed">Nama Pelanggan</div>
                  <div className="text-2xl font-black uppercase break-words whitespace-normal">{order.customerName}</div>
                </div>

                <div className="space-y-2 flex-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 leading-relaxed">Daftar Item:</div>
                  <div className="space-y-1 border-y-2 border-dashed border-zinc-200 py-3">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-50 p-1.5 rounded-lg border border-zinc-100">
                        <span className="font-black uppercase text-sm break-words whitespace-normal pr-2 leading-tight">{item.name}</span>
                        <span className="bg-zinc-900 text-white px-3 py-0.5 rounded-full font-black text-lg shrink-0 leading-none">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4 p-3 border-t-2 border-zinc-900">
                   <div className="h-8 w-40 flex items-center justify-center gap-[1px] opacity-40">
                     {Array.from({length: 40}).map((_, i) => (
                       <div key={i} className="bg-zinc-900" style={{ width: Math.random() > 0.5 ? '3px' : '1px', height: '100%' }} />
                     ))}
                   </div>
                   <div className="text-right">
                     <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Powered by</div>
                     <div className="text-[10px] font-black uppercase tracking-tight">{shopInfo.name}</div>
                   </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Receipt Download Modal for Online */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-100 rounded-lg p-6 w-full max-w-sm shadow-sm relative">
            <button onClick={() => setSelectedOrderForReceipt(null)} className="absolute top-4 right-4 text-zinc-400 no-print cursor-pointer hover:text-zinc-600 transition-colors"><X /></button>
            <div id="online-receipt" className="bg-white p-6 rounded shadow-sm border font-mono text-sm space-y-4">
              <div className="text-center border-b pb-4 space-y-1">
                <h3 className="font-bold text-lg uppercase tracking-tight">{shopInfo.name}</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed">{shopInfo.address}</p>
                <p className="text-[10px] text-zinc-500">{shopInfo.phone}</p>
              </div>
              <div className="text-[10px] space-y-0.5 py-1 border-b italic">
                <div className="flex justify-between">
                  <span>ORDER ID:</span>
                  <span>{selectedOrderForReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>TGL:</span>
                  <span>{format(new Date(selectedOrderForReceipt.date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between">
                  <span>CUST:</span>
                  <span>{selectedOrderForReceipt.customerName}</span>
                </div>
              </div>
              <div className="space-y-1.5 py-2 border-b">
                {selectedOrderForReceipt.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-[10px] gap-2">
                      <span className="flex-1 uppercase leading-tight">{item.name} x{item.quantity}</span>
                      <span className="font-bold whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                ))}
              </div>
              <div className="pt-2 space-y-1 text-xs">
                <div className="flex justify-between font-black text-sm">
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedOrderForReceipt.total + selectedOrderForReceipt.shippingCost)}</span>
                </div>
                {selectedOrderForReceipt.shippingCost > 0 && (
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>ONGKIR ({selectedOrderForReceipt.deliveryMode})</span>
                    <span>{formatCurrency(selectedOrderForReceipt.shippingCost)}</span>
                  </div>
                )}
              </div>
               <div className="pt-4 border-t text-center text-zinc-400 text-[10px] italic leading-tight">
                 <p>{shopInfo.message}</p>
               </div>
               <div className="pt-6 flex flex-col items-center gap-3">
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Scan QRIS untuk pembayaran:</p>
                 {shopInfo.qrisImage && (
                   <div className="w-32 h-32 overflow-hidden rounded-xl border-2 border-zinc-100 shadow-sm bg-white">
                     <img 
                       src={shopInfo.qrisImage} 
                       className="w-full h-full object-cover" 
                       alt="QRIS" 
                     />
                   </div>
                 )}
               </div>
             </div>
            <button 
              onClick={() => downloadAsPNG('online-receipt', `Receipt_${selectedOrderForReceipt.id}`)}
              disabled={isDownloading}
              className="w-full mt-6 btn bg-green-600 text-white py-4 font-black tracking-widest text-xs uppercase shadow-sm hover:bg-green-700 disabled:bg-zinc-300 flex items-center justify-center gap-2 transition-all"
            >
              {isDownloading ? <Clock className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} DOWNLOAD PNG (WA)
            </button>
          </div>
        </div>
      )}
       {/* Hidden Receipt for Direct Download */}
       <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }}>
         {downloadingReceiptOrder && (
           <div id="hidden-online-receipt" className="bg-white p-6 rounded shadow-sm border font-mono text-sm space-y-4 w-[400px]">
             <div className="text-center border-b pb-4 space-y-1">
               <h3 className="font-bold text-lg uppercase tracking-tight">{shopInfo.name}</h3>
               <p className="text-[10px] text-zinc-500 leading-relaxed">{shopInfo.address}</p>
               <p className="text-[10px] text-zinc-500">{shopInfo.phone}</p>
             </div>
             <div className="text-[10px] space-y-0.5 py-1 border-b italic">
               <div className="flex justify-between">
                 <span>ORDER ID:</span>
                 <span>{downloadingReceiptOrder.id}</span>
               </div>
               <div className="flex justify-between">
                 <span>TGL:</span>
                 <span>{format(new Date(downloadingReceiptOrder.date), 'dd/MM/yy HH:mm')}</span>
               </div>
               <div className="flex justify-between">
                 <span>CUST:</span>
                 <span>{downloadingReceiptOrder.customerName}</span>
               </div>
             </div>
             <div className="space-y-1.5 py-2 border-b">
               {downloadingReceiptOrder.items.map((item: any, i: number) => (
                 <div key={i} className="flex justify-between text-[10px] gap-2">
                   <span className="flex-1 uppercase leading-tight">{item.name} x{item.quantity}</span>
                   <span className="font-bold whitespace-nowrap">{formatCurrency(item.price * item.quantity)}</span>
                 </div>
               ))}
             </div>
             <div className="pt-2 space-y-1 text-xs">
               <div className="flex justify-between font-black text-sm">
                 <span>TOTAL</span>
                 <span>{formatCurrency(downloadingReceiptOrder.total + downloadingReceiptOrder.shippingCost)}</span>
               </div>
               {downloadingReceiptOrder.shippingCost > 0 && (
                 <div className="flex justify-between text-[10px] text-zinc-500">
                   <span>ONGKIR ({downloadingReceiptOrder.deliveryMode})</span>
                   <span>{formatCurrency(downloadingReceiptOrder.shippingCost)}</span>
                 </div>
               )}
             </div>
             <div className="pt-4 border-t text-center text-zinc-400 text-[10px] italic leading-tight">
               <p>{shopInfo.message}</p>
             </div>
             <div className="pt-6 flex flex-col items-center gap-3">
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Scan QRIS untuk pembayaran:</p>
               {shopInfo.qrisImage && (
                 <div className="w-32 h-32 overflow-hidden rounded-xl border-2 border-zinc-100 shadow-sm bg-white">
                   <img 
                     src={shopInfo.qrisImage} 
                     className="w-full h-full object-cover" 
                     alt="QRIS" 
                   />
                 </div>
               )}
             </div>
           </div>
         )}
       </div>
     </div>


  );
}
