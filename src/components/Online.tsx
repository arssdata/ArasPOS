import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Search, Trash2, Download, Save, QrCode, CheckCircle, Printer,
  Truck, PackagePlus, ClipboardList, Filter, Calendar, Clock, ArrowRight, RotateCcw, X, ChevronRight, ChevronLeft, ChevronDown, ShoppingCart, CheckCircle2
} from 'lucide-react';
import { formatCurrency, generateId, generateOrderCode, cn } from '../lib/utils';
import { Product, Sale, ShopInfo, Preorder, PreorderItem, Milestone } from '../types';
import { format } from 'date-fns';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export function OnlineView({ preorders, setPreorders, sales, products, setProducts, setSales, shopInfo, downloadAsPNG, downloadAsPDF, isDownloading, customers }: any) {
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
  const [ordersToCancel, setOrdersToCancel] = useState<string[] | null>(null);
  const [editingDeliveryForm, setEditingDeliveryForm] = useState<{
    id: string;
    customerName: string;
    deliveryMode: string;
    shippingCost: number;
    customerPhone: string;
    customerAddress: string;
    total: number;
  } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedMilestones, setCollapsedMilestones] = useState<Record<Milestone, boolean>>({
    produksi: false,
    penyimpanan: false,
    pengiriman: false,
  });

  const toggleCollapseMilestone = (m: Milestone) => {
    setCollapsedMilestones(prev => ({ ...prev, [m]: !prev[m] }));
  };

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

  const cancelOrders = (ids: string[]) => {
    const targetOrders = preorders.filter((o: Preorder) => ids.includes(o.id));
    if (targetOrders.length === 0) return;

    saveHistory();
    // Release reserved stock for orders that have already left 'produksi'
    setProducts((prev: Product[]) =>
      prev.map((p) => {
        const reservedToRelease = targetOrders.reduce((acc, order) => {
          if (order.milestone === 'produksi') return acc;
          const item = order.items.find((i) => i.sku === p.sku);
          return acc + (item ? item.quantity : 0);
        }, 0);

        if (reservedToRelease > 0) {
          return {
            ...p,
            reserved: Math.max(0, (p.reserved || 0) - reservedToRelease),
          };
        }
        return p;
      })
    );

    setPreorders(preorders.filter((o: Preorder) => !ids.includes(o.id)));
    setSelectedOrders((prev) => prev.filter((id) => !ids.includes(id)));
    setOrdersToCancel(null);
    triggerSuccess(
      targetOrders.length === 1
        ? `Pesanan ${targetOrders[0].id} dibatalkan.`
        : `${targetOrders.length} pesanan dibatalkan.`
    );
  };

  const moveMilestone = (milestone: Milestone, next: Milestone) => {
    // Enforce sequence: produksi -> penyimpanan -> pengiriman
    const allowedMoves: Record<Milestone, Milestone> = {
      'produksi': 'penyimpanan',
      'penyimpanan': 'pengiriman',
      'pengiriman': 'pengiriman' // Nowhere else to go
    };

    if (allowedMoves[milestone] !== next) {
      triggerError(`Alur tidak valid! Harus mengikuti urutan: Pesanan -> Penyimpanan -> Sudah Kirim, Waiting Bayar.`);
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
      triggerError('Hanya pesanan di milestone "Sudah Kirim, Waiting Bayar" yang bisa ditutup.');
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

  const updatePreorderInfo = (id: string, updates: Partial<Preorder>) => {
    setPreorders((prev: Preorder[]) => prev.map((p: Preorder) => p.id === id ? { ...p, ...updates } : p));
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

  const getIngredientSummary = () => {
    const summary = getSummary();
    const ingredientSummary: Record<string, { name: string, amount: number, uom: string }> = {};
    let hasAnyRecipe = false;

    Object.entries(summary).forEach(([sku, data]) => {
      const prod = products.find((p: any) => p.sku === sku);
      if (prod && prod.recipe && prod.recipe.length > 0) {
        hasAnyRecipe = true;
        prod.recipe.forEach((ing: any) => {
          const key = ing.name.toLowerCase().trim();
          const totalAmount = (ing.amount || 0) * data.qty;
          if (!ingredientSummary[key]) {
            ingredientSummary[key] = { name: ing.name, amount: 0, uom: ing.uom || '' };
          }
          ingredientSummary[key].amount += totalAmount;
        });
      }
    });

    return { 
      ingredients: Object.values(ingredientSummary).sort((a, b) => a.name.localeCompare(b.name)), 
      hasAnyRecipe 
    };
  };

  const getSkuIngredientSummary = () => {
    const summary = getSummary();
    const skuSummary: { sku: string; name: string; qty: number; ingredients: { name: string; amount: number; uom: string }[] }[] = [];
    let hasAnyRecipe = false;

    Object.entries(summary).forEach(([sku, data]) => {
      const prod = products.find((p: any) => p.sku === sku);
      const recipe = prod?.recipe || [];
      if (recipe.length > 0) {
        hasAnyRecipe = true;
      }
      const ingredients = recipe.map((ing: any) => ({
        name: ing.name,
        amount: (ing.amount || 0) * data.qty,
        uom: ing.uom || ''
      }));
      skuSummary.push({
        sku,
        name: data.name,
        qty: data.qty,
        ingredients
      });
    });

    return { skuSummary, hasAnyRecipe };
  };

  interface LabelCard {
    id: string;
    orderId: string;
    customerName: string;
    customerPhone?: string;
    customerAddress?: string;
    deliveryMode: string;
    items: PreorderItem[];
    partIndex: number;
    totalParts: number;
  }

  const getLabelCards = (): LabelCard[] => {
    const selectedPreorders = preorders.filter((p: Preorder) => selectedOrders.includes(p.id));
    const cards: LabelCard[] = [];

    for (const order of selectedPreorders) {
      const items = order.items || [];
      if (items.length === 0) continue;

      const itemChunks: PreorderItem[][] = [];
      const itemsPerCard = 8; // Max 8 items per card to fit perfectly and minimize split parts
      for (let i = 0; i < items.length; i += itemsPerCard) {
        itemChunks.push(items.slice(i, i + itemsPerCard));
      }

      const totalParts = itemChunks.length;
      itemChunks.forEach((chunkItems, idx) => {
        cards.push({
          id: `${order.id}-part-${idx + 1}`,
          orderId: order.id,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          customerAddress: order.customerAddress,
          deliveryMode: order.deliveryMode || 'Pick up',
          items: chunkItems,
          partIndex: idx + 1,
          totalParts: totalParts
        });
      });
    }

    return cards;
  };

  const getChunkedLabels = () => {
    const cards = getLabelCards();
    const chunks: LabelCard[][] = [];
    const chunkSize = 20;
    for (let i = 0; i < cards.length; i += chunkSize) {
      chunks.push(cards.slice(i, i + chunkSize));
    }
    return chunks;
  };

  const downloadLabels = async () => {
    const chunks = getChunkedLabels();
    if (chunks.length === 0) return;
    
    for (let i = 0; i < chunks.length; i++) {
      const pageId = `labels-print-area-page-${i + 1}`;
      const fileName = `Labels_${format(new Date(), 'ddMMyy')}_Page_${i + 1}`;
      await downloadAsPNG(pageId, fileName);
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
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
    <div className="space-y-3 md:space-y-6 lg:pb-10">
      <div className="sticky top-0 z-30 bg-zinc-50 pt-0.5 -mt-1 space-y-2 md:space-y-4 no-print">
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-stretch md:items-center">
          <div className="flex items-center gap-1.5 flex-1 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text"
                placeholder="Cari Pelanggan, SKU, atau ID Pesanan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 md:py-3 bg-white border border-zinc-200 rounded-xl text-xs md:text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
              />
            </div>
            {history.length > 0 && (
              <button
                onClick={undoMove}
                className="md:hidden btn bg-orange-100 text-orange-700 hover:bg-orange-200 text-[10px] font-bold gap-1 px-2 py-2 border border-orange-200 rounded-xl whitespace-nowrap shrink-0"
                title="Undo langkah terakhir"
              >
                <RotateCcw className="w-3 h-3 shrink-0" />
                <span>Undo ({history.length})</span>
              </button>
            )}
            <span className="md:hidden text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-2 rounded-xl whitespace-nowrap shrink-0">
              {selectedOrders.length} Terpilih
            </span>
          </div>

          {/* Mobile Compact 2-Row Toolbar */}
          <div className="md:hidden bg-blue-50/90 backdrop-blur-md p-1.5 rounded-xl border border-blue-100 shadow-sm space-y-1">
            <div className="grid grid-cols-4 gap-1">
              <button 
                disabled={selectedOrders.length === 0 || isDownloading}
                onClick={() => downloadAsPNG('summary-print-area', `Summary_Produksi_${format(new Date(), 'ddMMyy')}`)}
                className="btn btn-secondary text-[9.5px] gap-1 px-1 py-1.5 whitespace-nowrap"
              >
                {isDownloading ? <Clock className="w-3 h-3 animate-spin shrink-0" /> : <ClipboardList className="w-3 h-3 shrink-0" />}
                <span className="truncate">Summary</span>
              </button>
              <button 
                disabled={selectedOrders.length === 0 || isDownloading}
                onClick={downloadLabels}
                className="btn btn-secondary text-[9.5px] gap-1 px-1 py-1.5 whitespace-nowrap"
              >
                {isDownloading ? <Clock className="w-3 h-3 animate-spin shrink-0" /> : <Printer className="w-3 h-3 shrink-0" />}
                <span className="truncate">Label</span>
              </button>
              <button 
                onClick={handleCheckAvi}
                className="btn bg-blue-600 text-white hover:bg-blue-700 text-[9.5px] gap-1 px-1 py-1.5 shadow-sm whitespace-nowrap"
              >
                <Search className="w-3 h-3 shrink-0" />
                <span className="truncate">Cek Ready</span>
              </button>
              <button 
                disabled={!isCheckingAvi || selectedOrders.length === 0}
                onClick={handleSaveReadyOrders}
                className="btn bg-orange-500 text-white hover:bg-orange-600 text-[9.5px] gap-1 px-1 py-1.5 shadow-sm whitespace-nowrap"
              >
                <Save className="w-3 h-3 shrink-0" />
                <span className="truncate">Keep Stok</span>
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('produksi', 'penyimpanan')}
                className="btn bg-white border border-green-200 text-green-700 hover:bg-green-50 text-[9.5px] gap-1 px-1 py-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span className="truncate">Ngadon Pesanan</span>
              </button>
              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('penyimpanan', 'pengiriman')}
                className="btn bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[9.5px] gap-1 px-1 py-1.5 whitespace-nowrap"
              >
                <PackagePlus className="w-3 h-3 shrink-0" />
                <span className="truncate">Siap Kirim</span>
              </button>
              <button 
                disabled={selectedOrders.length === 0}
                onClick={finalizeOrders}
                className="btn bg-green-600 text-white hover:bg-green-700 text-[9.5px] gap-1 px-1 py-1.5 shadow-sm whitespace-nowrap"
              >
                <CheckCircle className="w-3 h-3 shrink-0" />
                <span className="truncate">Selesai Bayar</span>
              </button>
              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => setOrdersToCancel([...selectedOrders])}
                className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-[9.5px] gap-1 px-1 py-1.5 whitespace-nowrap"
              >
                <X className="w-3 h-3 shrink-0" />
                <span className="truncate">Cancel</span>
              </button>
            </div>
          </div>

          {/* Desktop Toolbar */}
           <div className="hidden md:flex flex-wrap gap-3 items-center bg-blue-50/80 backdrop-blur-md p-4 rounded-xl border border-blue-100 shadow-sm">
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
                onClick={downloadLabels}
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
                <Search className="w-3.5 h-3.5" /> Cek Stok Ready
              </button>

              <button 
                disabled={!isCheckingAvi || selectedOrders.length === 0}
                onClick={handleSaveReadyOrders}
                className="btn bg-orange-500 text-white hover:bg-orange-600 text-[10px] gap-1.5 py-1.5 shadow-sm whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" /> Keep Stok
              </button>

              <div className="h-6 w-px bg-blue-200 shrink-0 mx-1" />

              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('produksi', 'penyimpanan')}
                className="btn bg-white border border-green-200 text-green-700 hover:bg-green-50 text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Ngadon Pesanan
              </button>

              <button 
                disabled={selectedOrders.length === 0}
                onClick={() => moveMilestone('penyimpanan', 'pengiriman')}
                className="btn bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
              >
                <PackagePlus className="w-3.5 h-3.5" /> Siap Kirim
              </button>

               <button 
                 disabled={selectedOrders.length === 0}
                 onClick={finalizeOrders}
                 className="btn bg-green-600 text-white hover:bg-green-700 text-[10px] gap-1.5 py-1.5 shadow-sm whitespace-nowrap"
               >
                 <CheckCircle className="w-3.5 h-3.5" /> Selesai Bayar
               </button>

               <button 
                 disabled={selectedOrders.length === 0}
                 onClick={() => setOrdersToCancel([...selectedOrders])}
                 className="btn bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
               >
                 <X className="w-3.5 h-3.5" /> Cancel
               </button>
             </div>
         </div>
       </div>

        <div className="relative">
          {(errorMsg || successMsg) && (
            <div>
              {errorMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-sm">
                  <CheckCircle2 className="w-4 h-4 rotate-180" /> {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-sm">
                  <CheckCircle2 className="w-4 h-4" /> {successMsg}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col lg:flex-row lg:gap-6 gap-2.5 md:gap-8 pb-0">
            {milestones.map(m => {
              const milestoneOrders = filteredPreorders.filter((p: Preorder) => p.milestone === m);
              const isCollapsed = collapsedMilestones[m];
              const allSelected = milestoneOrders.length > 0 && milestoneOrders.every(p => selectedOrders.includes(p.id));

              return (
              <div key={m} className="w-full lg:min-w-[300px] lg:flex-1 flex flex-col gap-2 md:gap-4">
                <div className={cn(
                  "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border shadow-xs transition-colors",
                  m === 'produksi' ? "bg-blue-50 border-blue-200" :
                  m === 'penyimpanan' ? "bg-amber-50 border-amber-200" :
                  "bg-emerald-50 border-emerald-200"
                )}>
                  <button
                    type="button"
                    onClick={() => toggleCollapseMilestone(m)}
                    className="flex items-center gap-2 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className={cn(
                        "w-4 h-4 shrink-0",
                        m === 'produksi' ? "text-blue-500" :
                        m === 'penyimpanan' ? "text-amber-600" :
                        "text-emerald-600"
                      )} />
                    ) : (
                      <ChevronDown className={cn(
                        "w-4 h-4 shrink-0",
                        m === 'produksi' ? "text-blue-500" :
                        m === 'penyimpanan' ? "text-amber-600" :
                        "text-emerald-600"
                      )} />
                    )}
                    <h4 className={cn(
                      "text-xs font-black uppercase tracking-wider truncate",
                      m === 'produksi' ? "text-blue-800" :
                      m === 'penyimpanan' ? "text-amber-800" :
                      "text-emerald-800"
                    )}>
                      {m === 'produksi' && '🛠️ Pesanan'}
                      {m === 'penyimpanan' && '📦 Penyimpanan'}
                      {m === 'pengiriman' && '🚚 Sudah Kirim, Waiting Bayar'}
                    </h4>
                    <span className={cn(
                      "text-[10px] font-bold font-mono tabular-nums px-1.5 py-0.5 rounded shrink-0",
                      m === 'produksi' ? "bg-blue-100 text-blue-700" :
                      m === 'penyimpanan' ? "bg-amber-100 text-amber-800" :
                      "bg-emerald-100 text-emerald-800"
                    )}>
                      {milestoneOrders.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectAllInMilestone(m);
                      }}
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-tight whitespace-nowrap shrink-0 cursor-pointer",
                        m === 'produksi' ? "text-blue-700 hover:text-blue-900" :
                        m === 'penyimpanan' ? "text-amber-700 hover:text-amber-900" :
                        "text-emerald-700 hover:text-emerald-900"
                      )}
                    >
                      {allSelected ? 'Deselect' : 'Select All'}
                    </button>
                  )}
                </div>

                {!isCollapsed && (
                <div className={cn(
                  "flex flex-col gap-2 md:gap-3 border-2 border-dashed rounded-lg p-1.5 md:p-2 transition-all duration-300",
                  milestoneOrders.length === 0 ? "min-h-[36px] md:min-h-[150px]" : "min-h-0 md:min-h-[500px]",
                  m === 'produksi' ? "bg-blue-50/30 border-blue-100" :
                  m === 'penyimpanan' ? "bg-amber-50/30 border-amber-100" :
                  "bg-emerald-50/30 border-emerald-100"
                )}>
                  {milestoneOrders
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // FIFO
                    .map((order: Preorder) => (
                    <motion.div 
                      layoutId={order.id}
                      key={order.id}
                      onClick={() => toggleSelect(order.id)}
                      className={cn(
                        "card p-2.5 md:p-4 space-y-1.5 md:space-y-3 cursor-pointer transition-all border-2 relative",
                        selectedOrders.includes(order.id) ? "border-blue-500 shadow-md ring-2 ring-blue-100 ring-offset-1" : "hover:border-zinc-300",
                        isCheckingAvi && aviReadyOrders.includes(order.id) && "border-green-500 bg-green-50/30"
                      )}
                    >
                      {isCheckingAvi && aviReadyOrders.includes(order.id) && (
                        <div className="absolute -top-2 -right-2 bg-green-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-white uppercase tracking-tighter">
                          Stock Ready
                        </div>
                      )}
                      <div className="flex justify-between items-center gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 rounded shrink-0">{order.id}</span>
                          <span className="font-bold text-xs md:text-sm tracking-tight truncate text-zinc-900">{order.customerName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[9px] md:text-[10px] text-zinc-400 font-mono tabular-nums">{format(new Date(order.date), 'HH:mm • dd MMM')}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOrdersToCancel([order.id]);
                            }}
                            className="p-0.5 text-zinc-300 hover:text-red-500 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="space-y-0.5 md:space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="text-[11px] flex justify-between text-zinc-600 leading-tight">
                            <span className="truncate pr-2">{item.name}</span>
                            <span className="font-bold font-mono tabular-nums shrink-0">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-1.5 md:pt-2 border-t border-zinc-100 flex flex-col gap-1.5 md:gap-2" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center gap-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded flex items-center gap-1 w-fit">
                              <Truck className="w-3 h-3 shrink-0" /> {order.deliveryMode}
                            </span>
                            {order.shippingCost > 0 && (
                              <span className="text-[10px] text-zinc-400 font-medium">Ongkir: {formatCurrency(order.shippingCost)}</span>
                            )}
                            {order.milestone === 'penyimpanan' && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingDeliveryForm({
                                    id: order.id,
                                    customerName: order.customerName,
                                    deliveryMode: order.deliveryMode || 'Pick up',
                                    shippingCost: order.shippingCost || 0,
                                    customerPhone: order.customerPhone || '',
                                    customerAddress: order.customerAddress || '',
                                    total: order.total,
                                  })
                                }
                                className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 px-2 py-0.5 rounded transition-colors cursor-pointer"
                              >
                                Atur Kirim
                              </button>
                            )}
                          </div>
                          <span className="text-xs md:text-sm font-black font-mono tabular-nums text-blue-600 whitespace-nowrap shrink-0">
                            {formatCurrency(order.total + order.shippingCost)}
                          </span>
                        </div>

                        {order.milestone === 'pengiriman' && (
                          <div className="flex gap-1.5 md:gap-2">
                            <button 
                              onClick={() => sendWhatsAppReceipt(order)}
                              className="flex-1 flex items-center justify-center gap-1 py-1 md:py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100 hover:bg-green-100 transition-colors cursor-pointer"
                            >
                              <ShoppingCart className="w-3 h-3 md:w-3.5 md:h-3.5" /> WA
                            </button>
                            <button 
                               onClick={() => setDownloadingReceiptOrder(order)}
                              className="px-2.5 md:px-3 py-1 md:py-1.5 flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg border border-blue-100 hover:bg-blue-100 cursor-pointer"
                              title="Download PNG"
                            >
                              <Download className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
  
        {/* Compact Delivery & Customer Info Popup Modal */}
      {editingDeliveryForm && (
        <div className="fixed inset-0 bg-black/55 z-[60] flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-3.5 sm:p-4 w-full max-w-[330px] sm:max-w-sm shadow-lg space-y-2.5">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-zinc-900 truncate">
                  Atur Kirim • {editingDeliveryForm.customerName}
                </h3>
                <span className="text-[10px] font-mono text-blue-600 font-semibold">{editingDeliveryForm.id}</span>
              </div>
              <button
                onClick={() => setEditingDeliveryForm(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Metode Kirim</label>
                  <input
                    type="text"
                    value={editingDeliveryForm.deliveryMode}
                    onChange={(e) =>
                      setEditingDeliveryForm({ ...editingDeliveryForm, deliveryMode: e.target.value })
                    }
                    placeholder="Gojek / Paxel"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Ongkir (Rp)</label>
                  <input
                    type="number"
                    value={editingDeliveryForm.shippingCost || ''}
                    onChange={(e) =>
                      setEditingDeliveryForm({
                        ...editingDeliveryForm,
                        shippingCost: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    placeholder="0"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">No. Telepon</label>
                <input
                  type="text"
                  value={editingDeliveryForm.customerPhone}
                  onChange={(e) =>
                    setEditingDeliveryForm({ ...editingDeliveryForm, customerPhone: e.target.value })
                  }
                  placeholder="0812345678"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 uppercase block mb-0.5">Alamat Lengkap</label>
                <input
                  type="text"
                  value={editingDeliveryForm.customerAddress}
                  onChange={(e) =>
                    setEditingDeliveryForm({ ...editingDeliveryForm, customerAddress: e.target.value })
                  }
                  placeholder="Alamat pengiriman..."
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              <div className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200/70 rounded-lg flex items-center justify-between text-[11px]">
                <span className="font-bold text-zinc-500 uppercase">Final CO</span>
                <span className="font-black font-mono tabular-nums text-xs text-blue-600">
                  {formatCurrency(editingDeliveryForm.total + (editingDeliveryForm.shippingCost || 0))}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => setEditingDeliveryForm(null)}
                className="flex-1 btn btn-secondary py-1.5 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  updatePreorderInfo(editingDeliveryForm.id, {
                    deliveryMode: editingDeliveryForm.deliveryMode.trim() || 'Pick up',
                    shippingCost: editingDeliveryForm.shippingCost || 0,
                    customerPhone: editingDeliveryForm.customerPhone,
                    customerAddress: editingDeliveryForm.customerAddress,
                  });
                  setEditingDeliveryForm(null);
                  triggerSuccess('Info pengiriman diperbarui.');
                }}
                className="flex-1 btn btn-primary py-1.5 text-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Cancel Confirmation Modal */}
      {ordersToCancel && ordersToCancel.length > 0 && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-4 sm:p-5 w-full max-w-sm shadow-lg space-y-3">
            <h3 className="font-bold text-base">Batalkan Pesanan?</h3>
            <p className="text-zinc-500 text-xs sm:text-sm">
              {ordersToCancel.length === 1 ? (
                <>
                  Apakah Anda yakin ingin membatalkan pesanan{' '}
                  <span className="font-bold text-zinc-900">{ordersToCancel[0]}</span>?
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin membatalkan{' '}
                  <span className="font-bold text-zinc-900">{ordersToCancel.length} pesanan terpilih</span>?
                </>
              )}
            </p>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setOrdersToCancel(null)} className="flex-1 btn btn-secondary py-2 text-xs">Tidak, Kembali</button>
              <button 
                onClick={() => cancelOrders(ordersToCancel)}
                className="flex-1 btn bg-red-600 text-white hover:bg-red-700 py-2 text-xs"
              >
                Ya, Batalkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Areas (Rendered off-screen via fixed positioning so they don't expand scroll height) */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none' }}>
        {/* Summary Print Area Container */}
        <div id="summary-print-area" className="space-y-6">
          {/* Page 1: Summary Produksi */}
          <div 
            className="print-area-root bg-white p-5 w-[794px] min-h-[1123px] relative font-sans text-zinc-900 border border-zinc-200 shadow-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-3.5">
              <div className="text-center border-b border-zinc-300 pb-2.5 mt-0 leading-normal">
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">{shopInfo.name}</h2>
                <div className="text-sm font-bold uppercase tracking-wider mt-0.5">Summary Produksi Pesanan</div>
                <p className="text-zinc-500 font-mono mt-0.5 uppercase tracking-wide text-[8.5px]">Dibuat: {format(new Date(), 'dd MMMM yyyy HH:mm')} | {selectedOrders.length} Pesanan Online Terpilih | Halaman 1</p>
              </div>

              {/* POINT 1: Summary of whole pending production need to produce */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 border-l-4 border-zinc-900 pl-2.5 py-0.5">
                  <h3 className="font-black text-[11px] uppercase tracking-wider">Point 1: Total Bahan / Produk Harus Disiapkan</h3>
                </div>
                <div className="overflow-hidden rounded border border-zinc-400">
                  <table className="w-full border-separate text-zinc-900" style={{ borderSpacing: 0 }}>
                    <thead>
                      <tr className="bg-zinc-900 text-white text-left">
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400">SKU</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400">Nama Produk</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider text-center border-r border-b border-zinc-400 w-20">Qty</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider text-center border-r border-b border-zinc-400 w-12">Cek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(getSummary()).map(([sku, data]) => (
                        <tr key={sku} className="font-bold">
                          <td className="p-1 font-mono text-zinc-500 text-[8.5px] border-r border-b border-zinc-300">{sku}</td>
                          <td className="p-1 text-[8.5px] uppercase break-words whitespace-normal text-left border-r border-b border-zinc-300">{data.name}</td>
                          <td className="p-1 text-center text-[8.5px] border-r border-b border-zinc-300">{data.qty}</td>
                          <td className="p-1 border-r border-b border-zinc-300 w-12"></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* POINT 2: Summary of each customer order which products */}
              <div className="space-y-1.5 pt-1.5">
                <div className="flex items-center gap-2 border-l-4 border-zinc-900 pl-2.5 py-0.5">
                  <h3 className="font-black text-[11px] uppercase tracking-wider">Point 2: Kategorisasi Pesanan per Pelanggan</h3>
                </div>
                <div className="overflow-hidden rounded border border-zinc-400">
                  <table className="w-full border-separate text-zinc-900" style={{ borderSpacing: 0 }}>
                    <thead>
                      <tr className="bg-zinc-900 text-white text-left">
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400 w-24">No. Pesanan</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400 w-32">Pelanggan</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400">Produk (SKU)</th>
                        <th className="p-1 text-[9px] font-black uppercase tracking-wider text-center border-r border-b border-zinc-400 w-16">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preorders.filter((p: Preorder) => selectedOrders.includes(p.id)).map((p: Preorder) => (
                        p.items.map((item, idx) => (
                          <tr key={`${p.id}-${item.sku}-${idx}`} className="font-bold">
                            {idx === 0 ? (
                              <td className="p-1 font-mono text-[8.5px] border-r border-b border-zinc-300 bg-zinc-50 text-zinc-800 leading-tight align-top" rowSpan={p.items.length}>
                                {p.id}
                              </td>
                            ) : null}
                            {idx === 0 ? (
                              <td className="p-1 text-[8.5px] uppercase border-r border-b border-zinc-300 bg-zinc-50 text-zinc-900 leading-tight break-words max-w-[120px] align-top" rowSpan={p.items.length}>
                                {p.customerName}
                              </td>
                            ) : null}
                            <td className="p-1 text-[8.5px] uppercase border-r border-b border-zinc-300 text-left leading-normal">
                              {item.name} <span className="text-zinc-500 font-mono text-[7.5px]">({item.sku})</span>
                            </td>
                            <td className="p-1 text-center text-[8.5px] border-r border-b border-zinc-300 font-mono">
                              {item.quantity}
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3.5 border-t border-zinc-300 flex justify-between items-end text-[8px] font-black uppercase tracking-wider text-zinc-400">
              <div className="space-y-1.5">
                <div>Bagian Produksi:</div>
                <div className="h-7 w-32 border-b border-zinc-900" />
              </div>
              <div className="text-right">
                Dihasilkan oleh Sistem UMKM Pintar
              </div>
            </div>
          </div>

          {/* Page 2: Kebutuhan Bahan Baku */}
          <div 
            className="print-area-root bg-white p-5 w-[794px] min-h-[1123px] relative font-sans text-zinc-900 border border-zinc-200 shadow-sm flex flex-col justify-between"
            style={{ boxSizing: 'border-box' }}
          >
            <div className="space-y-4">
              <div className="text-center border-b border-zinc-300 pb-2.5 mt-0 leading-normal">
                <h2 className="text-xl font-black uppercase tracking-tight text-zinc-900">{shopInfo.name}</h2>
                <div className="text-sm font-bold uppercase tracking-wider mt-0.5">Kebutuhan Bahan Baku Produksi</div>
                <p className="text-zinc-500 font-mono mt-0.5 uppercase tracking-wide text-[8.5px]">Dibuat: {format(new Date(), 'dd MMMM yyyy HH:mm')} | Halaman 2</p>
              </div>

              {!getSkuIngredientSummary().hasAnyRecipe ? (
                <div className="border border-dashed border-zinc-300 rounded p-12 text-center my-8">
                  <p className="text-zinc-500 font-bold uppercase tracking-wide text-xs">
                    Resep belum di set di bagian pengaturan
                  </p>
                  <p className="text-zinc-400 text-[10px] mt-1 font-semibold">
                    Silakan masuk ke menu Pengaturan untuk menghubungkan SKU produk dengan bahan baku.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Point 1: Requirement for total per SKU */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 border-l-4 border-zinc-900 pl-2.5 py-0.5">
                      <h3 className="font-black text-[10px] uppercase tracking-wider">Point 1: Rincian Kebutuhan Bahan Baku per SKU</h3>
                    </div>
                    <div className="space-y-2.5">
                      {getSkuIngredientSummary().skuSummary.map((item, idx) => (
                        <div key={item.sku} className="border border-zinc-300 rounded overflow-hidden">
                          <div className="bg-zinc-100 px-2 py-1 text-[8.5px] font-black uppercase tracking-wider flex justify-between border-b border-zinc-300">
                            <span>{item.name} ({item.sku})</span>
                            <span className="text-blue-700 font-mono">Jumlah Produksi: {item.qty} Pcs</span>
                          </div>
                          {item.ingredients.length === 0 ? (
                            <div className="p-2 text-[8px] italic text-zinc-400 font-bold uppercase tracking-wide">
                              Resep belum di set di bagian pengaturan
                            </div>
                          ) : (
                            <table className="w-full border-separate text-zinc-900" style={{ borderSpacing: 0 }}>
                              <thead>
                                <tr className="bg-zinc-50 text-left text-[8px] font-bold uppercase tracking-wider text-zinc-500">
                                  <th className="p-1 border-r border-b border-zinc-200">Nama Bahan Baku</th>
                                  <th className="p-1 text-center border-r border-b border-zinc-200 w-24">Kebutuhan Bahan</th>
                                  <th className="p-1 text-center border-b border-zinc-200 w-20">Satuan (UOM)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.ingredients.map((ing, ingIdx) => (
                                  <tr key={ingIdx} className="font-bold text-[8.5px]">
                                    <td className="p-1 border-r border-b border-zinc-200 uppercase text-left">{ing.name}</td>
                                    <td className="p-1 text-center border-r border-b border-zinc-200 font-mono text-blue-600">
                                      {ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)}
                                    </td>
                                    <td className="p-1 text-center border-b border-zinc-200 uppercase text-zinc-500">{ing.uom}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Point 2: Total requirement for whole batch production */}
                  <div className="space-y-1.5 pt-1.5">
                    <div className="flex items-center gap-2 border-l-4 border-zinc-900 pl-2.5 py-0.5">
                      <h3 className="font-black text-[10px] uppercase tracking-wider">Point 2: Total Akumulasi Kebutuhan Seluruh Batch</h3>
                    </div>
                    <div className="overflow-hidden rounded border border-zinc-400">
                      <table className="w-full border-separate text-zinc-900" style={{ borderSpacing: 0 }}>
                        <thead>
                          <tr className="bg-zinc-900 text-white text-left">
                            <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400 w-12 text-center">No</th>
                            <th className="p-1 text-[9px] font-black uppercase tracking-wider border-r border-b border-zinc-400">Nama Bahan Baku</th>
                            <th className="p-1 text-[9px] font-black uppercase tracking-wider text-center border-r border-b border-zinc-400 w-24">Jumlah</th>
                            <th className="p-1 text-[9px] font-black uppercase tracking-wider text-center border-r border-b border-zinc-400 w-20">Satuan (UOM)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getIngredientSummary().ingredients.map((ing, idx) => (
                            <tr key={idx} className="font-bold">
                              <td className="p-1 text-center text-[8.5px] border-r border-b border-zinc-300">{idx + 1}</td>
                              <td className="p-1 text-[8.5px] uppercase border-r border-b border-zinc-300 text-left">{ing.name}</td>
                              <td className="p-1 text-center text-[8.5px] border-r border-b border-zinc-300 font-mono text-blue-600">{ing.amount % 1 === 0 ? ing.amount : ing.amount.toFixed(2)}</td>
                              <td className="p-1 text-center text-[8.5px] border-r border-b border-zinc-300 uppercase">{ing.uom}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3.5 border-t border-zinc-300 flex justify-between items-end text-[8px] font-black uppercase tracking-wider text-zinc-400">
              <div className="space-y-1.5">
                <div>Bagian Gudang/Dapur:</div>
                <div className="h-7 w-32 border-b border-zinc-900" />
              </div>
              <div className="text-right">
                Dihasilkan oleh Sistem UMKM Pintar
              </div>
            </div>
          </div>
        </div>

        {/* Label Print Area (Chunked A4 4x5 layouts) */}
        {getChunkedLabels().map((chunk, pageIndex) => (
          <div 
            key={pageIndex}
            id={`labels-print-area-page-${pageIndex + 1}`}
            className="print-area-root labels-grid bg-white p-4 w-[794px] h-[1123px] relative font-sans text-zinc-900 border border-zinc-200 shadow-sm"
            style={{ 
              boxSizing: 'border-box',
              width: '794px',
              height: '1123px',
              padding: '16px',
              display: 'block',
              backgroundColor: '#ffffff',
              color: '#18181b'
            }}
          >
            {chunk.map((card: LabelCard, idx: number) => (
              <div 
                key={card.id} 
                className="bg-white border border-zinc-900 text-zinc-900 font-sans overflow-hidden rounded shadow-sm"
                style={{ 
                  boxSizing: 'border-box',
                  width: '180px',
                  height: '208px',
                  maxHeight: '208px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  color: '#18181b',
                  border: '1px solid #18181b',
                  padding: '10px 10px 8px 10px',
                  borderRadius: '4px',
                  float: 'left',
                  marginRight: (idx + 1) % 4 === 0 ? '0px' : '12px',
                  marginBottom: '12px'
                }}
              >
                {/* Upper content group */}
                <div className="flex flex-col gap-1 min-h-0">
                  {/* Top bar: Order ID & Delivery */}
                  <div className="flex justify-between items-center border-b border-zinc-200 pb-1 shrink-0">
                    <div>
                      <div className="text-[5.5px] font-black uppercase tracking-wider text-zinc-400 leading-tight">Order ID</div>
                      <div className="font-bold text-[8px] leading-tight font-mono tracking-tight text-zinc-900 mt-0.5">{card.orderId}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-[8px] text-zinc-900 uppercase tracking-tight leading-tight">{card.deliveryMode}</div>
                    </div>
                  </div>

                  {/* Customer Block */}
                  <div className="bg-zinc-950 text-white px-1.5 py-0.5 rounded-sm text-center my-0.5 shrink-0 flex flex-col items-center justify-center min-h-[18px]">
                    <div className="text-[7.5px] font-black uppercase tracking-tight truncate w-full leading-tight text-center pt-0.5" title={card.customerName}>
                      {card.customerName}{card.totalParts > 1 ? ` (${card.partIndex}/${card.totalParts})` : ''}
                    </div>
                    {card.customerPhone && (
                      <div className="text-[5.5px] font-mono font-bold text-zinc-300 leading-none pb-0.5">
                        {card.customerPhone}
                      </div>
                    )}
                  </div>

                  {/* Customer Address Info Block */}
                  {card.customerAddress && (
                    <div className="text-[6.5px] font-medium text-zinc-700 leading-tight border-b border-zinc-100 pb-1 px-1 break-words line-clamp-2" title={card.customerAddress}>
                      {card.customerAddress}
                    </div>
                  )}

                  {/* Items Table (compact, no bubbles) */}
                  <div 
                    className="overflow-y-auto min-h-0 py-0.5 max-h-[95px]"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <table className="w-full text-[8px] border-collapse">
                      <tbody>
                        {card.items.map((item, idx) => (
                          <tr key={idx} className="border-b border-zinc-100 last:border-none">
                            <td className="py-0.5 pr-1 font-bold text-zinc-900 uppercase truncate max-w-[125px] leading-tight" title={item.name}>
                              {item.name}
                            </td>
                            <td className="py-0.5 pl-1 font-mono font-black text-right text-zinc-900 w-6 shrink-0 leading-tight">
                              x{item.quantity}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="pt-1 border-t border-dashed border-zinc-200 flex items-center justify-center shrink-0">
                  <div className="text-[7.5px] font-black uppercase tracking-tight text-zinc-800 truncate w-full leading-none text-center">
                    {shopInfo.name}
                  </div>
                </div>
              </div>
            ))}
            {/* Fill the rest of grid cells with empty placeholders to keep grid structured if less than 20 labels */}
            {chunk.length < 20 && Array.from({ length: 20 - chunk.length }).map((_, i) => (
              <div 
                key={`empty-${i}`} 
                className="bg-white" 
                style={{
                  boxSizing: 'border-box',
                  width: '180px',
                  height: '208px',
                  backgroundColor: '#ffffff',
                  float: 'left',
                  marginRight: (chunk.length + i + 1) % 4 === 0 ? '0px' : '12px',
                  marginBottom: '12px'
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Receipt Download Modal for Online */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-zinc-100 rounded-lg p-6 w-full max-w-sm shadow-sm relative">
            <button onClick={() => setSelectedOrderForReceipt(null)} className="absolute top-4 right-4 text-zinc-400 no-print cursor-pointer hover:text-zinc-600 transition-colors"><X /></button>
            <div 
              id="online-receipt" 
              className="bg-white p-6 rounded shadow-sm border font-mono text-sm space-y-4"
              style={{
                backgroundColor: '#ffffff',
                color: '#18181b',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                fontFamily: 'monospace, SFMono-Regular, Courier, monospace',
                width: '384px',
                maxWidth: '100%',
                boxSizing: 'border-box',
                margin: '0 auto'
              }}
            >
              <div className="text-center border-b pb-4 space-y-1" style={{ textAlign: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '16px' }}>
                <h3 className="font-bold text-lg uppercase tracking-tight" style={{ fontWeight: 700, fontSize: '18px', textTransform: 'uppercase', margin: 0 }}>{shopInfo.name}</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed" style={{ fontSize: '10px', color: '#71717a', margin: '4px 0 0 0', lineHeight: 1.5 }}>{shopInfo.address}</p>
                <p className="text-[10px] text-zinc-500" style={{ fontSize: '10px', color: '#71717a', margin: '2px 0 0 0' }}>{shopInfo.phone}</p>
              </div>
              <div className="text-[10px] space-y-0.5 py-1 border-b italic" style={{ fontSize: '10px', fontStyle: 'italic', borderBottom: '1px solid #e4e4e7', padding: '8px 0' }}>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ORDER ID:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrderForReceipt.id}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span>TGL:</span>
                  <span>{format(new Date(selectedOrderForReceipt.date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span>CUST:</span>
                  <span style={{ fontWeight: 600 }}>{selectedOrderForReceipt.customerName}</span>
                </div>
              </div>
              <div className="space-y-1.5 py-2 border-b" style={{ borderBottom: '1px solid #e4e4e7', padding: '8px 0' }}>
                {selectedOrderForReceipt.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px] gap-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginBottom: '6px' }}>
                    <span className="flex-1 uppercase leading-tight" style={{ flex: 1, textTransform: 'uppercase', wordBreak: 'break-word' }}>{item.name} x{item.quantity}</span>
                    <span className="font-bold whitespace-nowrap" style={{ fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 space-y-1.5 text-xs" style={{ paddingTop: '8px' }}>
                <div className="flex justify-between text-[11px] text-zinc-500 font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#52525b', fontWeight: 700, marginBottom: '4px' }}>
                  <span>SUBTOTAL</span>
                  <span>{formatCurrency(selectedOrderForReceipt.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500 font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#52525b', fontWeight: 700, marginBottom: '4px' }}>
                  <span>ONGKIR ({selectedOrderForReceipt.deliveryMode || 'Kirim'})</span>
                  <span>{formatCurrency(selectedOrderForReceipt.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1.5 border-t" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, borderTop: '1px solid #18181b', paddingTop: '8px', marginTop: '8px' }}>
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedOrderForReceipt.total + selectedOrderForReceipt.shippingCost)}</span>
                </div>
              </div>
              <div className="pt-4 border-t text-center text-zinc-400 text-[10px] italic leading-tight" style={{ borderTop: '1px solid #e4e4e7', paddingTop: '16px', textAlign: 'center', color: '#a1a1aa', fontSize: '10px', fontStyle: 'italic', marginTop: '16px' }}>
                <p>{shopInfo.message}</p>
              </div>
              <div className="pt-6 flex flex-col items-center gap-3" style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider" style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0', textAlign: 'center' }}>Scan / Upload QRIS untuk pembayaran:</p>
                {shopInfo.qrisImage && (
                  <div className="w-48 h-48 border-2 border-zinc-100 shadow-sm bg-white" style={{ width: '192px', height: '192px', border: '2px solid #f4f4f5', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={shopInfo.qrisImage} 
                      className="w-full h-full object-contain" 
                      alt="QRIS" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
       <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none' }}>
          {downloadingReceiptOrder && (
            <div 
              id="hidden-online-receipt" 
              className="bg-white p-6 rounded shadow-sm border font-mono text-sm space-y-4"
              style={{
                backgroundColor: '#ffffff',
                color: '#18181b',
                padding: '24px',
                borderRadius: '8px',
                border: '1px solid #e4e4e7',
                fontFamily: 'monospace, SFMono-Regular, Courier, monospace',
                width: '384px',
                boxSizing: 'border-box'
              }}
            >
              <div className="text-center border-b pb-4 space-y-1" style={{ textAlign: 'center', borderBottom: '1px solid #e4e4e7', paddingBottom: '16px' }}>
                <h3 className="font-bold text-lg uppercase tracking-tight" style={{ fontWeight: 700, fontSize: '18px', textTransform: 'uppercase', margin: 0 }}>{shopInfo.name}</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed" style={{ fontSize: '10px', color: '#71717a', margin: '4px 0 0 0', lineHeight: 1.5 }}>{shopInfo.address}</p>
                <p className="text-[10px] text-zinc-500" style={{ fontSize: '10px', color: '#71717a', margin: '2px 0 0 0' }}>{shopInfo.phone}</p>
              </div>
              <div className="text-[10px] space-y-0.5 py-1 border-b italic" style={{ fontSize: '10px', fontStyle: 'italic', borderBottom: '1px solid #e4e4e7', padding: '8px 0' }}>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>ORDER ID:</span>
                  <span style={{ fontWeight: 600 }}>{downloadingReceiptOrder.id}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span>TGL:</span>
                  <span>{format(new Date(downloadingReceiptOrder.date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                  <span>CUST:</span>
                  <span style={{ fontWeight: 600 }}>{downloadingReceiptOrder.customerName}</span>
                </div>
              </div>
              <div className="space-y-1.5 py-2 border-b" style={{ borderBottom: '1px solid #e4e4e7', padding: '8px 0' }}>
                {downloadingReceiptOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-[10px] gap-2" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', marginBottom: '6px' }}>
                    <span className="flex-1 uppercase leading-tight" style={{ flex: 1, textTransform: 'uppercase', wordBreak: 'break-word' }}>{item.name} x{item.quantity}</span>
                    <span className="font-bold whitespace-nowrap" style={{ fontWeight: 700, whiteSpace: 'nowrap', marginLeft: '8px' }}>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 space-y-1.5 text-xs" style={{ paddingTop: '8px' }}>
                <div className="flex justify-between text-[11px] text-zinc-500 font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#52525b', fontWeight: 700, marginBottom: '4px' }}>
                  <span>SUBTOTAL</span>
                  <span>{formatCurrency(downloadingReceiptOrder.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-zinc-500 font-bold" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#52525b', fontWeight: 700, marginBottom: '4px' }}>
                  <span>ONGKIR ({downloadingReceiptOrder.deliveryMode || 'Kirim'})</span>
                  <span>{formatCurrency(downloadingReceiptOrder.shippingCost)}</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1.5 border-t" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 900, borderTop: '1px solid #18181b', paddingTop: '8px', marginTop: '8px' }}>
                  <span>TOTAL</span>
                  <span>{formatCurrency(downloadingReceiptOrder.total + downloadingReceiptOrder.shippingCost)}</span>
                </div>
              </div>
              <div className="pt-4 border-t text-center text-zinc-400 text-[10px] italic leading-tight" style={{ borderTop: '1px solid #e4e4e7', paddingTop: '16px', textAlign: 'center', color: '#a1a1aa', fontSize: '10px', fontStyle: 'italic', marginTop: '16px' }}>
                <p>{shopInfo.message}</p>
              </div>
              <div className="pt-6 flex flex-col items-center gap-3" style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px', marginTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider" style={{ fontSize: '10px', color: '#71717a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px 0', textAlign: 'center' }}>Scan / Upload QRIS untuk pembayaran:</p>
                {shopInfo.qrisImage && (
                  <div className="w-48 h-48 border-2 border-zinc-100 shadow-sm bg-white" style={{ width: '192px', height: '192px', border: '2px solid #f4f4f5', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img 
                      src={shopInfo.qrisImage} 
                      className="w-full h-full object-contain" 
                      alt="QRIS" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
