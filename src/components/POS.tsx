import React, { useState, useMemo } from 'react';
import {
  Search, ShoppingCart, CheckCircle2, ChevronRight, ClipboardList,
  RotateCcw, X, Package, Sparkles, AlertTriangle, ArrowRight, Phone, MapPin, Truck, BookOpen
} from 'lucide-react';
import { formatCurrency, generateOrderCode, cn } from '../lib/utils';
import { Product, CartItem, Preorder, Customer } from '../types';
import { format } from 'date-fns';

interface ParsedBulkItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
  isMatched: boolean;
}

interface ParsedBulkOrder {
  lineIndex: number;
  customerName: string;
  deliveryMode: string;
  customerPhone: string;
  customerAddress: string;
  items: ParsedBulkItem[];
  total: number;
  hasInvalidLine: boolean;
  hasUnmatchedSku: boolean;
}

export function POSView({
  products,
  cart,
  setCart,
  sales,
  preorders,
  setPreorders,
  customers,
  onNavigateOnline,
}: any) {
  const [inputMode, setInputMode] = useState<'bulk' | 'catalog'>('bulk');
  const [search, setSearch] = useState('');
  const [showCheckout, setShowCheckout] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [history, setHistory] = useState<CartItem[][]>([]);

  // Bulky & AI State
  const [bulkText, setBulkText] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiTranslatedReady, setAiTranslatedReady] = useState(false);
  const [showSkuReference, setShowSkuReference] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Sort products alphabetically A-Z by product name (both for POS catalog and SKU reference)
  const sortedProducts: Product[] = useMemo(() => {
    return [...(products || [])].sort((a: Product, b: Product) =>
      (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' })
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return sortedProducts;
    return sortedProducts.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [sortedProducts, search]);

  const filteredSkuReference = useMemo(() => {
    const q = skuSearch.toLowerCase().trim();
    if (!q) return sortedProducts;
    return sortedProducts.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [sortedProducts, skuSearch]);

  // Parse standard format lines live for review:
  // Supports:
  //   Nama | SKU:Qty, SKU:Qty | Mode Kirim
  //   Nama | SKU:Qty, SKU:Qty | Mode Kirim | No. HP | Alamat
  const parsedBulkPreview: ParsedBulkOrder[] = useMemo(() => {
    const lines = bulkText.split('\n').filter((line) => line.trim() !== '');
    return lines.map((line, lineIndex) => {
      if (!line.includes('|')) {
        return {
          lineIndex,
          customerName: '',
          deliveryMode: 'Pick up',
          customerPhone: '',
          customerAddress: '',
          items: [],
          total: 0,
          hasInvalidLine: true,
          hasUnmatchedSku: false,
        };
      }

      const parts = line.split('|').map((s) => s.trim());
      const [rawName = '', rawItemsStr = '', rawDelivery = '', rawPhone = '', rawAddress = ''] = parts;

      if (!rawName || !rawItemsStr) {
        return {
          lineIndex,
          customerName: rawName,
          deliveryMode: rawDelivery || 'Pick up',
          customerPhone: rawPhone,
          customerAddress: rawAddress,
          items: [],
          total: 0,
          hasInvalidLine: true,
          hasUnmatchedSku: false,
        };
      }

      const matchedCust = (customers || []).find(
        (c: Customer) => c.name.toLowerCase().trim() === rawName.toLowerCase().trim()
      );

      const items: ParsedBulkItem[] = rawItemsStr
        .split(',')
        .map((itemStr) => itemStr.trim())
        .filter(Boolean)
        .map((itemStr) => {
          const [rawSku = '', rawQty = '1'] = itemStr.split(':').map((x) => x.trim());
          const product = sortedProducts.find(
            (p: Product) => p.sku.toLowerCase() === rawSku.toLowerCase()
          );
          const quantity = Math.max(1, parseInt(rawQty, 10) || 1);
          return {
            sku: product ? product.sku : rawSku || 'UNKNOWN',
            name: product ? product.name : `SKU tidak dikenal (${rawSku || '-'})`,
            quantity,
            price: product ? product.price : 0,
            isMatched: Boolean(product),
          };
        });

      const total = items.reduce((acc, it) => acc + it.price * it.quantity, 0);
      const hasUnmatchedSku = items.length === 0 || items.some((it) => !it.isMatched);

      return {
        lineIndex,
        customerName: rawName,
        deliveryMode: rawDelivery || 'Pick up',
        customerPhone: rawPhone || matchedCust?.phone || '',
        customerAddress: rawAddress || matchedCust?.address || '',
        items,
        total,
        hasInvalidLine: items.length === 0,
        hasUnmatchedSku,
      };
    });
  }, [bulkText, sortedProducts, customers]);

  const hasPipeFormattedLines =
    parsedBulkPreview.length > 0 && parsedBulkPreview.every((o) => !o.hasInvalidLine);
  const hasUnstructuredText =
    bulkText.trim().length > 0 && parsedBulkPreview.some((o) => o.hasInvalidLine);

  const updatePreviewLineField = (
    lineIndex: number,
    updates: Partial<Pick<ParsedBulkOrder, 'customerName' | 'deliveryMode' | 'customerPhone' | 'customerAddress'>>
  ) => {
    const nonEmptyLines = bulkText.split('\n').filter((line) => line.trim() !== '');
    const target = parsedBulkPreview[lineIndex];
    if (!target || lineIndex >= nonEmptyLines.length) return;

    const nextName = (updates.customerName ?? target.customerName).replace(/\|/g, '/');
    const nextDelivery = (updates.deliveryMode ?? target.deliveryMode).replace(/\|/g, '/');
    const nextPhone = (updates.customerPhone ?? target.customerPhone).replace(/\|/g, '/');
    const nextAddress = (updates.customerAddress ?? target.customerAddress).replace(/\|/g, '/');
    const itemsStr = target.items.map((i) => `${i.sku}:${i.quantity}`).join(', ');

    nonEmptyLines[lineIndex] =
      nextPhone || nextAddress
        ? `${nextName} | ${itemsStr} | ${nextDelivery} | ${nextPhone} | ${nextAddress}`
        : `${nextName} | ${itemsStr} | ${nextDelivery}`;

    setBulkText(nonEmptyLines.join('\n'));
  };

  const handleAiParseChat = async () => {
    if (!bulkText.trim()) {
      setAiError('Tempelkan chat pesanan WhatsApp atau catatan order terlebih dahulu.');
      return;
    }

    setIsAiParsing(true);
    setAiError(null);
    setAiWarnings([]);

    try {
      const response = await fetch('/api/ai/parse-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: bulkText,
          products: sortedProducts.map((p) => ({
            sku: p.sku,
            name: p.name,
            price: p.price,
            category: p.category,
          })),
          customers: (customers || []).map((c: Customer) => ({
            name: c.name,
            phone: c.phone,
            address: c.address,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal menerjemahkan chat pesanan.');
      }

      if (!data.standardFormatText) {
        throw new Error('AI tidak menemukan data pesanan dari teks tersebut.');
      }

      setBulkText(data.standardFormatText);
      setAiWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setAiTranslatedReady(true);
    } catch (err: any) {
      setAiError(err?.message || 'Terjadi kesalahan saat memanggil modul AI.');
    } finally {
      setIsAiParsing(false);
    }
  };

  const parseBulkOrder = () => {
    setAiError(null);
    if (parsedBulkPreview.length === 0) return;

    const invalidLine = parsedBulkPreview.find((o) => o.hasInvalidLine);
    if (invalidLine) {
      setAiError(
        'Teks belum dalam format standar. Klik "Terjemahkan Chat (AI)" terlebih dahulu, atau gunakan format: Nama | SKU:Qty | Mode Kirim'
      );
      return;
    }

    const unmatched = parsedBulkPreview.find((o) => o.hasUnmatchedSku);
    if (unmatched) {
      setAiError(
        `Pesanan "${unmatched.customerName}" memiliki SKU yang belum cocok dengan katalog. Periksa bagian Review atau Referensi SKU sebelum memproses.`
      );
      return;
    }

    const todayStr = format(new Date(), 'ddMMyy');
    const allOrders = [...(sales || []), ...(preorders || [])];
    const todayOrders = allOrders.filter((o: any) => o.id.includes(todayStr));
    let nextSeq =
      todayOrders.length === 0
        ? 1
        : Math.max(
            ...todayOrders.map((o: any) => {
              const seq = parseInt(o.id.slice(-4), 10);
              return isNaN(seq) ? 0 : seq;
            })
          ) + 1;

    const newPreorders: Preorder[] = parsedBulkPreview.map((order) => {
      const orderId = generateOrderCode('ONL', nextSeq);
      nextSeq++;

      return {
        id: orderId,
        date: new Date().toISOString(),
        customerName: order.customerName,
        customerPhone: order.customerPhone || '',
        customerAddress: order.customerAddress || '',
        items: order.items.map((it) => ({
          sku: it.sku,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
        })),
        deliveryMode: order.deliveryMode || 'Pick up',
        shippingCost: 0,
        milestone: 'produksi',
        total: order.total,
      };
    });

    setPreorders((prev: Preorder[]) => [...newPreorders, ...prev]);
    setBulkText('');
    setAiWarnings([]);
    setAiTranslatedReady(false);
    triggerToast(`${newPreorders.length} pesanan berhasil masuk ke Online (Pesanan).`);
  };

  // Manual Online Cart Helpers
  const saveHistory = () => {
    setHistory((prev) => [[...cart], ...prev].slice(0, 3));
  };

  const undoCart = () => {
    if (history.length > 0) {
      setCart(history[0]);
      setHistory((prev) => prev.slice(1));
    }
  };

  const total = cart.reduce((acc: number, item: CartItem) => acc + item.price * item.quantity, 0);

  const addToCart = (product: Product) => {
    const available = product.stock - (product.reserved || 0);
    if (available <= 0) return;
    saveHistory();
    setCart((prev: CartItem[]) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= available) return prev;
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev: CartItem[]) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const product = sortedProducts.find((p) => p.id === id);
            const available = (product?.stock || 0) - (product?.reserved || 0);
            const newQty = Math.max(0, item.quantity + delta);
            if (newQty > available) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const handleOnlineCheckout = () => {
    if (cart.length === 0) return;

    const todayStr = format(new Date(), 'ddMMyy');
    const allOrders = [...(sales || []), ...(preorders || [])];
    const todayOrders = allOrders.filter((o: any) => o.id.includes(todayStr));
    const nextSeq =
      todayOrders.length === 0
        ? 1
        : Math.max(
            ...todayOrders.map((o: any) => {
              const seq = parseInt(o.id.slice(-4), 10);
              return isNaN(seq) ? 0 : seq;
            })
          ) + 1;

    const orderId = generateOrderCode('ONL', nextSeq);
    const newPreorder: Preorder = {
      id: orderId,
      date: new Date().toISOString(),
      customerName: customerName.trim() || 'Pelanggan Online',
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items: cart.map((item: CartItem) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      deliveryMode: deliveryMode.trim() || 'Pick up',
      shippingCost: 0,
      milestone: 'produksi',
      total,
    };

    setPreorders((prev: Preorder[]) => [newPreorder, ...prev]);
    setCart([]);
    setShowCheckout(false);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setDeliveryMode('');
    triggerToast(`Pesanan Online #${orderId} masuk ke kolom Pesanan.`);
  };

  return (
    <div className="flex flex-col gap-2.5 md:gap-5">
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-3 rounded-xl shadow-md font-semibold flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
          {onNavigateOnline && (
            <button
              onClick={onNavigateOnline}
              className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
            >
              Lihat Online
            </button>
          )}
        </div>
      )}

      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 md:gap-4 bg-white p-2.5 md:p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div>
          <h2 className="text-sm md:text-xl font-bold tracking-tight text-zinc-900">
            Input Pesanan Online
          </h2>
          <p className="hidden md:block text-xs text-zinc-500">
            Mode Bulky Operation (termasuk pembaca chat WhatsApp AI) dan Katalog Online
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setInputMode('bulk')}
            className={cn(
              'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer',
              inputMode === 'bulk'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            )}
          >
            <ClipboardList className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Bulky & AI Order</span>
          </button>
          <button
            onClick={() => setInputMode('catalog')}
            className={cn(
              'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer',
              inputMode === 'catalog'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800'
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span>Katalog Online ({cart.length})</span>
          </button>
        </div>
      </div>

      {/* BULKY & AI OPERATION MODE */}
      {inputMode === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 md:gap-6 items-start">
          <div className={cn('space-y-2.5 md:space-y-4', showSkuReference ? 'lg:col-span-8' : 'lg:col-span-12')}>
            <div className="card p-2.5 md:p-5 space-y-2 md:space-y-3.5">
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-zinc-900 text-xs md:text-base flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 shrink-0" />
                    <span className="truncate">Bulk Order & AI Chat</span>
                  </h3>
                  <p className="hidden md:block text-xs text-zinc-500 mt-1">
                    Tempel chat order WhatsApp apa adanya lalu klik <span className="font-semibold text-zinc-700">Terjemahkan Chat (AI)</span> untuk konversi ke format standar sebelum dicek & disimpan.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSkuReference(!showSkuReference)}
                  className="btn btn-secondary text-[11px] md:text-xs gap-1 md:gap-1.5 py-1 px-2 md:py-2 md:px-3 whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{showSkuReference ? 'Tutup SKU' : 'Daftar Produk'}</span>
                </button>
              </div>

              <div className="hidden md:block bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs text-zinc-600 space-y-1">
                <div>
                  Format Standar: <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-800">Nama Pelanggan | SKU:Qty, SKU:Qty | Mode Kirim | No. HP | Alamat</code>
                </div>
                <div className="text-[11px] text-zinc-400">
                  No. HP & Alamat opsional — jika kosong, sistem otomatis mencocokkan dari data Pelanggan tersimpan.
                </div>
              </div>

              <textarea
                rows={8}
                value={bulkText}
                onChange={(e) => {
                  setBulkText(e.target.value);
                  setAiError(null);
                  if (aiTranslatedReady && !e.target.value.trim()) {
                    setAiTranslatedReady(false);
                    setAiWarnings([]);
                  }
                }}
                placeholder={
                  'Tempel chat WhatsApp di sini...\nContoh:\nKak Sarah pesan paket 1 campur keju 1, pempek tahu 1, kirim Paxel ke Jl. Kemang Raya No. 10 (085700100624)'
                }
                className={cn(
                  'w-full p-2.5 md:p-3.5 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xs leading-relaxed bg-white text-zinc-900 resize-y',
                  hasPipeFormattedLines
                    ? 'min-h-[170px] md:min-h-[220px]'
                    : 'h-[calc(100dvh-275px)] min-h-[240px] md:h-[calc(100vh-375px)] md:min-h-[300px]'
                )}
              />

              {aiError && (
                <div className="p-2.5 md:p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiWarnings.length > 0 && (
                <div className="p-2.5 md:p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Catatan AI untuk Dicek Ulang:</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5">
                    {aiWarnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={handleAiParseChat}
                  disabled={isAiParsing || !bulkText.trim()}
                  className="btn bg-zinc-900 text-white hover:bg-zinc-800 py-2 md:py-2.5 px-3.5 md:px-4 text-xs font-semibold gap-2 whitespace-nowrap shrink-0"
                >
                  <Sparkles className={cn('w-3.5 h-3.5 md:w-4 md:h-4', isAiParsing && 'animate-spin')} />
                  <span>
                    {isAiParsing ? 'Menerjemahkan dengan AI...' : 'Terjemahkan Chat (AI)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={parseBulkOrder}
                  disabled={!hasPipeFormattedLines || isAiParsing}
                  className="flex-1 btn btn-primary py-2 md:py-2.5 px-3.5 md:px-4 text-xs font-semibold gap-2 whitespace-nowrap"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span>
                    Proses Booking Online ({hasPipeFormattedLines ? `${parsedBulkPreview.length} Pesanan` : '0'})
                  </span>
                </button>

                {bulkText.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setBulkText('');
                      setAiError(null);
                      setAiWarnings([]);
                      setAiTranslatedReady(false);
                    }}
                    className="btn btn-secondary py-2 md:py-2.5 px-3.5 md:px-4 text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Bersihkan
                  </button>
                )}
              </div>

              {hasUnstructuredText && !isAiParsing && (
                <p className="text-[11px] md:text-xs text-blue-600 font-medium">
                  Terdeteksi teks non-standar. Klik &quot;Terjemahkan Chat (AI)&quot; untuk mengubah ke format standar agar bisa direview sebelum diproses.
                </p>
              )}
            </div>

            {/* Review Section */}
            {parsedBulkPreview.length > 0 && hasPipeFormattedLines && (
              <div className="card p-3 md:p-5 space-y-2.5 md:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-100 pb-2 md:pb-3">
                  <div>
                    <h4 className="font-bold text-zinc-900 text-xs md:text-sm">
                      Review Pesanan ({parsedBulkPreview.length} Pesanan)
                    </h4>
                    <p className="hidden md:block text-xs text-zinc-500">
                      Periksa kecocokan SKU, nomor telepon, dan alamat sebelum mengirim ke antrean Online.
                    </p>
                  </div>
                  <div className="hidden md:block font-mono tabular-nums text-sm font-bold text-blue-600">
                    Total Estimasi: {formatCurrency(parsedBulkPreview.reduce((s, o) => s + o.total, 0))}
                  </div>
                </div>

                <div className="space-y-2 md:space-y-3">
                  {parsedBulkPreview.map((order) => (
                    <div
                      key={order.lineIndex}
                      className={cn(
                        'rounded-xl border p-2.5 md:p-4 space-y-2 md:space-y-3',
                        order.hasUnmatchedSku
                          ? 'border-amber-300 bg-amber-50/40'
                          : 'border-zinc-200 bg-zinc-50/40'
                      )}
                    >
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                        <div>
                          <label className="text-[11px] font-medium text-zinc-500 block mb-1">
                            Nama Pelanggan
                          </label>
                          <input
                            type="text"
                            value={order.customerName}
                            onChange={(e) =>
                              updatePreviewLineField(order.lineIndex, { customerName: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1 mb-1">
                            <Phone className="w-3 h-3" /> No. Telepon
                          </label>
                          <input
                            type="text"
                            value={order.customerPhone}
                            placeholder="Belum ada no. HP"
                            onChange={(e) =>
                              updatePreviewLineField(order.lineIndex, { customerPhone: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-mono tabular-nums text-zinc-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1 mb-1">
                            <Truck className="w-3 h-3" /> Mode Kirim
                          </label>
                          <input
                            type="text"
                            value={order.deliveryMode}
                            onChange={(e) =>
                              updatePreviewLineField(order.lineIndex, { deliveryMode: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-medium text-zinc-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-zinc-500 flex items-center gap-1 mb-1">
                            <MapPin className="w-3 h-3" /> Alamat Kirim
                          </label>
                          <input
                            type="text"
                            value={order.customerAddress}
                            placeholder="Belum ada alamat"
                            onChange={(e) =>
                              updatePreviewLineField(order.lineIndex, { customerAddress: e.target.value })
                            }
                            className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs text-zinc-900 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="overflow-x-auto bg-white rounded-lg border border-zinc-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
                            <tr>
                              <th className="hidden md:table-cell px-3 py-2 font-semibold">SKU</th>
                              <th className="px-2.5 py-1.5 md:px-3 md:py-2 font-semibold">Produk</th>
                              <th className="px-2.5 py-1.5 md:px-3 md:py-2 font-semibold text-right md:text-center">Qty</th>
                              <th className="hidden md:table-cell px-3 py-2 font-semibold text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100">
                            {order.items.map((item, idx) => (
                              <tr key={idx} className={!item.isMatched ? 'bg-red-50/70' : ''}>
                                <td className="hidden md:table-cell px-3 py-2 font-mono font-semibold text-zinc-700">
                                  {item.sku}
                                </td>
                                <td className="px-2.5 py-1.5 md:px-3 md:py-2">
                                  <span className={cn('font-medium', !item.isMatched ? 'text-red-700' : 'text-zinc-900')}>
                                    {item.name}
                                  </span>
                                </td>
                                <td className="px-2.5 py-1.5 md:px-3 md:py-2 text-right md:text-center font-mono tabular-nums font-bold">
                                  x{item.quantity}
                                </td>
                                <td className="hidden md:table-cell px-3 py-2 text-right font-mono tabular-nums font-semibold text-zinc-800">
                                  {item.isMatched ? formatCurrency(item.price * item.quantity) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* A-Z SKU Reference Sidebar */}
          {showSkuReference && (
            <div className="lg:col-span-4 card p-3 md:p-4 space-y-2.5 md:space-y-3 lg:sticky lg:top-20">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs md:text-sm text-zinc-900">
                  <span className="md:hidden">Daftar Produk (A–Z)</span>
                  <span className="hidden md:inline">Referensi Produk & SKU (A–Z)</span>
                </h4>
                <button
                  onClick={() => setShowSkuReference(false)}
                  className="text-zinc-400 hover:text-zinc-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={skuSearch}
                  onChange={(e) => setSkuSearch(e.target.value)}
                  placeholder="Cari produk..."
                  className="w-full pl-8 pr-3 py-1.5 md:py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>
              <div className="max-h-[260px] md:max-h-[420px] overflow-y-auto divide-y divide-zinc-100">
                {filteredSkuReference.map((p) => (
                  <div key={p.id} className="py-1.5 md:py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 truncate">{p.name}</div>
                      <div className="hidden md:block font-mono text-[11px] text-zinc-500">{p.sku}</div>
                    </div>
                    <div className="md:hidden font-mono tabular-nums text-[11px] font-semibold text-blue-600 shrink-0">
                      Stok: {p.stock - (p.reserved || 0)}
                    </div>
                    <div className="hidden md:block font-mono tabular-nums font-semibold text-blue-600 shrink-0">
                      {formatCurrency(p.price)}
                    </div>
                  </div>
                ))}
                {filteredSkuReference.length === 0 && (
                  <div className="py-6 text-center text-xs text-zinc-400">Produk tidak ditemukan</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MANUAL ONLINE CATALOG MODE */}
      {inputMode === 'catalog' && (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-3 md:gap-8 items-start">
          {/* Product Selection (Sorted A-Z by Product Name) */}
          <div className="w-full lg:col-span-8 flex flex-col gap-2.5 md:gap-4">
            <div className="flex items-center gap-2 sticky top-0 z-20 bg-zinc-50 py-1 -my-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Cari produk (urutan A-Z)..."
                  className="w-full pl-10 pr-4 py-2 md:py-2.5 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-xs md:text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    document.getElementById('online-cart-panel')?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="lg:hidden px-2.5 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-bold font-mono tabular-nums whitespace-nowrap shrink-0 flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>{cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4">
              {filteredProducts.map((product: Product) => {
                const reserved = product.reserved || 0;
                const available = product.stock - reserved;
                const orderedQty = cart.find((item: CartItem) => item.id === product.id)?.quantity || 0;

                return (
                  <div
                    key={product.id}
                    role="button"
                    tabIndex={available > 0 ? 0 : -1}
                    onClick={() => available > 0 && addToCart(product)}
                    onKeyDown={(e) => {
                      if (available > 0 && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        addToCart(product);
                      }
                    }}
                    className={cn(
                      'card text-left hover:border-blue-500 hover:shadow-md transition-all group relative overflow-hidden flex flex-col gap-1 md:gap-2 p-2.5 md:p-4 select-none',
                      available > 0 ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed grayscale-[0.5]',
                      orderedQty > 0 && 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-200'
                    )}
                  >
                    <div className="text-xs md:text-sm font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight line-clamp-2 md:line-clamp-none">
                      {product.name}
                    </div>
                    <div className="hidden md:block text-xs text-zinc-500 font-mono truncate">{product.sku}</div>
                    <div className="mt-auto flex flex-col sm:flex-row justify-between items-start sm:items-end gap-0.5 md:gap-1">
                      <div className="text-zinc-500 text-[10px] md:text-xs font-mono tabular-nums">
                        <span>Qty: </span>
                        <span className={cn(available < 5 ? 'text-red-500 font-bold' : 'text-blue-600 font-bold')}>
                          {available}
                        </span>
                      </div>
                      <div className="hidden md:block text-blue-600 font-bold font-mono tabular-nums text-base">
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                    {orderedQty > 0 && (
                      <div className="flex items-center justify-between gap-1 pt-1 mt-0.5 border-t border-blue-200/70">
                        <span className="text-[10px] md:text-xs font-mono tabular-nums font-bold text-blue-700">
                          Order: {orderedQty}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(product.id, -1);
                          }}
                          title="Kurangi order"
                          className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 font-bold text-xs leading-none cursor-pointer"
                        >
                          -
                        </button>
                      </div>
                    )}
                    {available <= 0 && (
                      <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center font-black text-red-500 uppercase tracking-widest text-[10px] gap-0.5">
                        <Package className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
                        <span>Habis</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Online Cart Panel */}
          <div id="online-cart-panel" className="w-full lg:col-span-4 lg:sticky lg:top-24">
            <div className="card flex flex-col min-h-[200px] lg:h-[70vh] p-0 overflow-hidden shadow-sm border-zinc-200">
              <div className="p-3 md:p-4 border-b border-zinc-100 flex items-center gap-2 bg-zinc-50/50">
                <ShoppingCart className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                <span className="font-bold text-sm md:text-base">Keranjang Online</span>
                <span className="ml-auto bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold font-mono tabular-nums">
                  {cart.length}
                </span>
              </div>

              <div className="flex-1 overflow-auto p-3 md:p-4 space-y-2 md:space-y-4">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-1.5 opacity-50 py-6 md:py-10">
                    <ShoppingCart className="w-8 h-8 md:w-12 md:h-12" />
                    <p className="text-xs md:text-sm">Keranjang kosong</p>
                  </div>
                ) : (
                  cart.map((item: CartItem) => (
                    <div key={item.id} className="flex justify-between items-center border-b border-zinc-50 pb-2 md:pb-3">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-xs md:text-sm font-medium truncate">{item.name}</div>
                        <div className="hidden md:block text-xs text-zinc-500 font-mono tabular-nums">
                          {formatCurrency(item.price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-zinc-100 rotate-180 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                        <span className="text-xs md:text-sm font-bold font-mono tabular-nums w-4 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 md:w-7 md:h-7 flex items-center justify-center border border-zinc-200 rounded-md hover:bg-zinc-100 cursor-pointer"
                        >
                          <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 md:p-4 bg-zinc-50 border-t border-zinc-100 space-y-2 md:space-y-3">
                <div className="flex justify-between items-center text-sm md:text-lg font-bold">
                  <div className="flex items-center gap-2">
                    <span className="md:hidden text-xs text-zinc-500">Total Item: {cart.reduce((a: number, b: CartItem) => a + b.quantity, 0)}</span>
                    <span className="hidden md:inline">Subtotal</span>
                    {history.length > 0 && (
                      <button
                        onClick={undoCart}
                        className="p-1 px-2 bg-orange-100 text-orange-600 rounded text-[10px] font-black uppercase flex items-center gap-1 hover:bg-orange-200 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" /> Undo ({history.length})
                      </button>
                    )}
                  </div>
                  <span className="hidden md:inline text-blue-600 font-mono tabular-nums">{formatCurrency(total)}</span>
                </div>
                <button
                  disabled={cart.length === 0}
                  onClick={() => setShowCheckout(true)}
                  className="w-full btn btn-primary py-2.5 md:py-3 text-xs md:text-sm font-bold gap-2 shadow-sm"
                >
                  <span>Buat Pesanan Online</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Online Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-3.5 sm:p-4 w-full max-w-[330px] sm:max-w-sm shadow-lg flex flex-col gap-2.5 max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
              <h2 className="text-sm sm:text-base font-bold text-zinc-900">Detail Pesanan Online</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="p-1 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <div className="relative">
                <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5 uppercase tracking-wider">
                  Nama Pelanggan
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    setShowCustomerSuggestions(true);
                  }}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowCustomerSuggestions(false), 200)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-semibold text-xs uppercase"
                />
                {showCustomerSuggestions && customerName.trim() && (
                  <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                    {customers
                      ?.filter((c: Customer) =>
                        c.name.toLowerCase().includes(customerName.toLowerCase())
                      )
                      .map((c: Customer) => (
                        <button
                          key={c.id}
                          type="button"
                          onMouseDown={() => {
                            setCustomerName(c.name);
                            setCustomerPhone(c.phone || '');
                            setCustomerAddress(c.address || '');
                            setShowCustomerSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-zinc-50 border-b border-zinc-100 last:border-0 uppercase flex flex-col cursor-pointer"
                        >
                          <span className="text-zinc-900 font-black">{c.name}</span>
                          {(c.phone || c.address) && (
                            <span className="text-[10px] text-zinc-400 font-medium lowercase leading-tight truncate">
                              {c.phone && `Telp: ${c.phone}`} {c.address && ` | Alamat: ${c.address}`}
                            </span>
                          )}
                        </button>
                      ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5 uppercase tracking-wider">
                    No. Telepon
                  </label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0812345678"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5 uppercase tracking-wider">
                    Metode Kirim
                  </label>
                  <input
                    type="text"
                    value={deliveryMode}
                    onChange={(e) => setDeliveryMode(e.target.value)}
                    placeholder="Gojek / Paxel / Pick up"
                    className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-zinc-500 block mb-0.5 uppercase tracking-wider">
                  Alamat Pelanggan
                </label>
                <input
                  type="text"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Jl. Mangga No. 12, RT 02/03"
                  className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none text-xs"
                />
              </div>

              <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between gap-2 text-[11px] text-blue-700">
                <span>Masuk ke antrean <span className="font-bold">Pesanan</span></span>
                <span className="hidden md:inline font-black font-mono tabular-nums text-xs text-blue-700">
                  {formatCurrency(total)}
                </span>
              </div>

              <button
                onClick={handleOnlineCheckout}
                className="w-full py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all cursor-pointer"
              >
                Kirim ke Antrean Online
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
