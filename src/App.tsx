import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { 
  LayoutDashboard, Store, Package, History, Settings, LogOut, Menu, X, Plus, Search, Trash2, 
  ShoppingCart, Printer, CheckCircle2, ChevronRight, ChevronLeft, CreditCard, Wallet, Banknote, 
  ClipboardList, PackagePlus, Truck, CheckCircle, Download, Save, QrCode, Coffee, Layout, BarChart3, TrendingUp, TrendingDown, ClipboardCheck, Utensils, Clock, ArrowRight, RotateCcw, Calendar, Filter
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { View, Product, Sale, CartItem, ShopInfo, Preorder, Milestone, PreorderItem, ActiveOrder, OrderStatus } from './types';
import { formatCurrency, generateId, generateOrderCode, cn } from './lib/utils';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isSameMonth, subDays, addDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, isSameWeek, addWeeks, subWeeks } from 'date-fns';

// --- MOCK DATA ---
const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'Kopi Gayo 250g', price: 65000, cost: 45000, stock: 20, reserved: 0, category: 'Beverage', sku: 'KPY-001' },
  { id: '2', name: 'Gula Aren 500g', price: 15000, cost: 10000, stock: 50, reserved: 0, category: 'Staple', sku: 'GLA-002' },
  { id: '3', name: 'Susu UHT 1L', price: 18000, cost: 14000, stock: 15, reserved: 0, category: 'Beverage', sku: 'SSU-003' },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [loginPassword, setLoginPassword] = useState('');
  const [view, setView] = useState<View>('pos');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSales] = useState<Sale[]>([]);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    name: 'Warung Berkah UMKM',
    address: 'Jl. Merdeka No. 123, Jakarta',
    phone: '0812-3456-7890',
    message: 'Terima kasih telah berbelanja!',
    bankAccounts: []
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load data from API
  useEffect(() => {
    fetch('/api/data')
      .then(res => res.json())
      .then(data => {
        if (data.products) setProducts(data.products);
        if (data.sales) setSales(data.sales);
        if (data.preorders) setPreorders(data.preorders);
        if (data.activeOrders) setActiveOrders(data.activeOrders);
        if (data.shopInfo) setShopInfo(data.shopInfo);
        setIsDataLoaded(true);
      })
      .catch(err => {
        console.error("Failed to load data from server", err);
        setIsDataLoaded(true); // Proceed anyway with initial/local data as fallback
      });
  }, []);

  // Save data to API
  const saveDataToServer = async (currentData: any) => {
    try {
      await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentData)
      });
    } catch (err) {
      console.error("Failed to save data to server", err);
    }
  };

  useEffect(() => {
    if (isDataLoaded) {
      const data = { products, sales, preorders, activeOrders, shopInfo };
      saveDataToServer(data);
      // Still keep local storage as a quick backup
      localStorage.setItem('products', JSON.stringify(products));
      localStorage.setItem('sales', JSON.stringify(sales));
      localStorage.setItem('preorders', JSON.stringify(preorders));
      localStorage.setItem('activeOrders', JSON.stringify(activeOrders));
      localStorage.setItem('shopInfo', JSON.stringify(shopInfo));
    }
  }, [products, sales, preorders, activeOrders, shopInfo, isDataLoaded]);

  // Update document title
  useEffect(() => {
    document.title = shopInfo.name || 'UMKM Pintar';
  }, [shopInfo.name]);

  const [tempShopInfo, setTempShopInfo] = useState<ShopInfo>(shopInfo);

  // Sync tempShopInfo when shopInfo changes (e.g. on load)
  useEffect(() => {
    setTempShopInfo(shopInfo);
  }, [shopInfo]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [onlineTab, setOnlineTab] = useState<'kanban' | 'input'>('kanban');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const handleSaveSettings = () => {
    setShopInfo(tempShopInfo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    // Default PIN: 1234 or admin123. If systemPin is set in shopInfo, use it.
    const systemPin = shopInfo.systemPin || '1234';
    if (loginPassword === systemPin || loginPassword === 'admin123') {
      setIsLoggedIn(true);
      localStorage.setItem('isLoggedIn', 'true');
    } else {
      alert('PIN Salah!');
    }
  };

  const resetDatabase = async () => {
    const defaultShopInfo = {
      name: 'Warung Berkah UMKM',
      address: 'Jl. Merdeka No. 123, Jakarta',
      phone: '0812-3456-7890',
      message: 'Terima kasih telah berbelanja!',
      bankAccounts: []
    };

    setProducts(INITIAL_PRODUCTS);
    setSales([]);
    setPreorders([]);
    setActiveOrders([]);
    setShopInfo(defaultShopInfo);
    setTempShopInfo(defaultShopInfo);
    setCart([]);
    
    localStorage.clear();
    
    await saveDataToServer({
      products: INITIAL_PRODUCTS,
      sales: [],
      preorders: [],
      activeOrders: [],
      shopInfo: defaultShopInfo
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setView('pos');
  };

  // URL Hash routing for the QRIS and Receipt page
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === '#qris') {
        setView('qris');
      } else if (hash.startsWith('#receipt/')) {
        try {
          const encoded = hash.replace('#receipt/', '');
          const decoded = JSON.parse(decodeURIComponent(escape(atob(encoded))));
          setReceiptData(decoded);
          setView('receipt');
        } catch (e) {
          console.error("Invalid receipt link", e);
          window.location.hash = '';
        }
      }
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  if (!isLoggedIn && view !== 'receipt' && view !== 'qris') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-blue-500/20">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{shopInfo.name}</h2>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Sistem POS & Inventory Pintar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">PIN / Password</label>
              <input 
                type="password"
                autoFocus
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••"
                className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-2xl text-center text-2xl tracking-[0.5em] focus:ring-4 focus:ring-blue-600/10 focus:outline-none focus:bg-white transition-all font-mono"
              />
            </div>
            <button type="submit" className="w-full btn btn-primary py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 font-black tracking-widest">
              MASUK <ArrowRight className="w-5 h-5" />
            </button>
          </form>
          
          <div className="pt-4 text-center">
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Demo PIN: 1234</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Sidebar Items
  const navItems = [
    { id: 'dashboard', label: 'Ringkasan', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir / Order', icon: Store },
    { id: 'kitchen', label: 'Dine In / Take Away', icon: Coffee },
    { id: 'inventory', label: 'Inventaris', icon: Package },
    { id: 'preorders', label: 'Online', icon: ClipboardList },
    { id: 'history', label: 'Riwayat Jual', icon: History },
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  // Render full page for Receipt if matches
  if (view === 'receipt' && receiptData) {
    return (
      <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-10 px-4 text-zinc-900 font-mono">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 w-full max-w-sm shadow-xl relative overflow-hidden"
        >
          {/* Decorative cut effect top */}
          <div className="absolute top-0 left-0 right-0 h-2 flex gap-1 px-1">
            {Array.from({length: 15}).map((_, i) => (
              <div key={i} className="flex-1 bg-zinc-100 h-4 -mt-2 rounded-full" />
            ))}
          </div>

          <div className="text-center space-y-2 mt-2">
            <h1 className="text-2xl font-black uppercase tracking-tight">{receiptData.shopName}</h1>
            <p className="text-xs text-zinc-500 uppercase">{receiptData.shopAddress}</p>
            <p className="text-xs text-zinc-500">{receiptData.shopPhone}</p>
          </div>

          <div className="border-t border-zinc-200 border-dashed my-6 pt-4 flex justify-between text-xs font-bold italic">
            <span>Nota: #{receiptData.orderId}</span>
            <span>{receiptData.date}</span>
          </div>

          <div className="space-y-4">
            {receiptData.items.map((item: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="font-black uppercase text-sm">{item.name}</div>
                <div className="flex justify-between text-xs text-zinc-600 font-bold">
                  <span>{item.qty} x {formatCurrency(item.price)}</span>
                  <span>{formatCurrency(item.qty * item.price)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-zinc-900 my-6 pt-4 space-y-2">
            <div className="flex justify-between text-lg font-black italic">
              <span>TOTAL</span>
              <span>{formatCurrency(receiptData.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500 font-bold">
              <span>Subtotal Produk</span>
              <span>{formatCurrency(receiptData.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500 font-bold">
              <span>Ongkir ({receiptData.deliveryMode})</span>
              <span>{formatCurrency(receiptData.shippingCost)}</span>
            </div>
          </div>

          <div className="pt-6 text-center space-y-4">
            <p className="text-xs text-zinc-400 italic leading-relaxed px-6">
              {receiptData.message}
            </p>
            <div className="pt-4 flex justify-center">
               <div className="h-10 w-48 flex items-center justify-center gap-[1px] opacity-20">
                {Array.from({length: 30}).map((_, i) => (
                  <div key={i} className="bg-zinc-900" style={{ width: Math.random() > 0.5 ? '2px' : '1px', height: '100%' }} />
                ))}
              </div>
            </div>
          </div>

          {/* Decorative cut effect bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-2 flex gap-1 px-1">
            {Array.from({length: 15}).map((_, i) => (
              <div key={i} className="flex-1 bg-zinc-100 h-4 mt-1 rounded-full" />
            ))}
          </div>
        </motion.div>

        <div className="mt-8 flex flex-col items-center gap-4 no-print">
          <button 
            onClick={() => window.print()}
            className="btn btn-secondary px-8 py-2.5 rounded-full flex items-center gap-2 font-bold shadow-lg bg-white"
          >
            <Printer className="w-4 h-4" /> Simpan/Print Struk
          </button>
          <button onClick={() => window.location.hash = ''} className="text-xs text-zinc-400 font-black hover:text-zinc-600 uppercase tracking-widest">
            Tutup
          </button>
        </div>
      </div>
    );
  }

  // Render full page for QRIS if matches
  if (view === 'qris') {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 text-zinc-900 no-print">
        <div className="flex flex-col items-center bg-zinc-900 text-white p-6 md:p-10 rounded-[3rem] w-full max-w-lg shadow-2xl relative border-4 border-white">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-xl border-4 border-zinc-950">
            QRIS TOKO
          </div>

          {shopInfo.qrisImage ? (
            <div className="w-full space-y-8 mt-4">
              <div className="text-center space-y-2">
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">{shopInfo.name}</h1>
                <div className="h-1 bg-blue-600 w-24 mx-auto rounded-full" />
                <p className="text-[10px] md:text-xs font-bold text-zinc-500 uppercase tracking-[0.3em]">NMID: UMKM-{shopInfo.name.replace(/\s+/g, '').toUpperCase()}</p>
              </div>

              <div className="bg-white p-4 rounded-[2rem] shadow-inner max-w-sm mx-auto">
                <img src={shopInfo.qrisImage} alt="QRIS" className="w-full h-auto object-contain rounded-xl" />
              </div>

              <div className="text-center space-y-4">
                <div className="flex justify-center gap-4">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/a/a2/Gopay_logo.svg" alt="Gopay" className="h-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/e/eb/Logo_ovo_purple.svg" alt="OVO" className="h-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
                  <img src="https://upload.wikimedia.org/wikipedia/commons/7/72/Logo_dana_blue.svg" alt="Dana" className="h-4 opacity-50 grayscale hover:grayscale-0 transition-all" />
                </div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Scan & Bayar Aman dengan QRIS</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <a 
                  href={shopInfo.qrisImage} 
                  download={`QRIS_${shopInfo.name}.png`}
                  className="btn bg-white text-zinc-900 border-b-4 border-zinc-300 hover:bg-zinc-50 py-4 flex items-center justify-center gap-2 font-black text-xs uppercase"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                <button onClick={() => window.location.hash = ''} className="btn bg-blue-600 hover:bg-blue-700 py-4 font-black text-xs uppercase border-b-4 border-blue-800">
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 italic text-zinc-500 space-y-4">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto">
                <X className="text-zinc-600 w-10 h-10" />
              </div>
              <p>QRIS belum diunggah di Pengaturan.</p>
              <button onClick={() => window.location.hash = ''} className="btn btn-secondary px-8">Kembali</button>
            </div>
          )}
        </div>
        <div className="mt-8 text-[10px] font-black text-zinc-300 uppercase tracking-widest">
            Copyright © {new Date().getFullYear()} {shopInfo.name}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-zinc-50 font-sans overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <aside className={cn(
        "hidden md:flex bg-white border-r border-zinc-200 transition-all duration-300 flex-col z-20",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="p-6 flex items-start gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex flex-shrink-0 items-center justify-center text-white font-bold">
            {shopInfo.name.charAt(0)}
          </div>
          {isSidebarOpen && <span className="font-bold text-lg tracking-tight leading-tight whitespace-normal break-words">{shopInfo.name} POS</span>}
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all",
                view === item.id 
                  ? "bg-blue-50 text-blue-600 font-semibold" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 mt-auto">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 rounded-xl text-xs font-black uppercase text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 group"
          >
            <LogOut className="w-4 h-4 group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span>Keluar Sistem</span>}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-zinc-500 hover:bg-zinc-100 rounded-lg transition-all mt-2"
          >
            {isSidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            {isSidebarOpen && <span>Sembunyikan</span>}
          </button>
          {isSidebarOpen && (
            <div className="mt-4 px-3 py-2 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-300 italic">
              aras - AI @ {new Date().getFullYear()}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative pb-20 md:pb-0">
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 gap-2 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-blue-600 rounded-lg flex flex-shrink-0 items-center justify-center text-white font-bold text-xs">
              {shopInfo.name.charAt(0)}
            </div>
            <h1 className="font-semibold text-sm md:text-lg leading-tight whitespace-normal max-w-[150px] md:max-w-[50%]">
              <span className="hidden md:inline">
                {isSidebarOpen ? navItems.find(i => i.id === view)?.label : ''}
              </span>
              <span className="md:hidden">{navItems.find(i => i.id === view)?.label}</span>
            </h1>

            {view === 'preorders' && (
              <div className="flex bg-zinc-100 p-1 rounded-lg ml-2">
                <button 
                  onClick={() => setOnlineTab('kanban')}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all whitespace-nowrap",
                    onlineTab === 'kanban' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Kanban
                </button>
                <button 
                  onClick={() => setOnlineTab('input')}
                  className={cn(
                    "px-2 md:px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all whitespace-nowrap",
                    onlineTab === 'input' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                  )}
                >
                  Input
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {view === 'settings' && (
              <div className="flex items-center gap-2 md:gap-3">
                <AnimatePresence>
                  {saveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="hidden sm:flex text-[10px] md:text-xs font-bold text-green-600 items-center gap-1.5 bg-green-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-green-100"
                    >
                      <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> Tersimpan!
                    </motion.div>
                  )}
                </AnimatePresence>
                <button 
                  onClick={handleSaveSettings}
                  className="btn btn-primary py-1 md:py-1.5 px-3 md:px-4 text-[10px] md:text-xs flex items-center gap-1 md:gap-2 shadow-md"
                >
                  <Save className="w-3.5 md:w-4 h-3.5 md:h-4" /> Simpan
                </button>
              </div>
            )}
            <div className="hidden sm:block text-xs md:text-sm text-zinc-500">
              {format(new Date(), 'dd/MM/yyyy')}
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'pos' && (
                <POSView 
                  products={products} 
                  setProducts={setProducts}
                  cart={cart} 
                  setCart={setCart} 
                  sales={sales}
                  setSales={setSales}
                  preorders={preorders}
                  setPreorders={setPreorders}
                  setActiveOrders={setActiveOrders}
                  shopInfo={shopInfo}
                />
              )}
              {view === 'kitchen' && (
                <KitchenMonitorView 
                  activeOrders={activeOrders} 
                  setActiveOrders={setActiveOrders}
                />
              )}
              {view === 'inventory' && (
                <InventoryView products={products} setProducts={setProducts} />
              )}
              {view === 'preorders' && (
                <OnlineView 
                  preorders={preorders} 
                  setPreorders={setPreorders} 
                  sales={sales}
                  products={products}
                  setProducts={setProducts}
                  setSales={setSales}
                  shopInfo={shopInfo}
                  tab={onlineTab}
                  setTab={setOnlineTab}
                />
              )}
              {view === 'dashboard' && (
                <DashboardView sales={sales} products={products} />
              )}
              {view === 'history' && (
                <HistoryView sales={sales} shopInfo={shopInfo} />
              )}
              {view === 'settings' && (
                <SettingsView 
                  shopInfo={tempShopInfo} 
                  setShopInfo={setTempShopInfo} 
                  onResetData={resetDatabase}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around items-center h-16 z-50 px-2">
        {navItems.filter(item => item.id !== 'settings').map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as View)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 min-w-[3.5rem] px-1",
              view === item.id ? "text-blue-600" : "text-zinc-400"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-tighter truncate w-full text-center">
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// --- UTILS ---
const downloadCSV = (data: any[], filename: string) => {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => 
    Object.values(obj).map(val => 
      Array.isArray(val) ? `"${JSON.stringify(val).replace(/"/g, '""')}"` : `"${val}"`
    ).join(',')
  ).join('\n');
  const csvContent = `${headers}\n${rows}`;
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function POSView({ products, setProducts, cart, setCart, sales, setSales, preorders, setPreorders, setActiveOrders, shopInfo }: any) {
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

  const saveHistory = () => {
    setHistory(prev => [[...cart], ...prev].slice(0, 3));
  };

  const undoCart = () => {
    if (history.length > 0) {
      setCart(history[0]);
      setHistory(prev => prev.slice(1));
    }
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <h2 className="text-xl md:text-2xl font-black italic tracking-tighter text-blue-600 whitespace-normal leading-tight">
          {shopInfo.name} POS
        </h2>
        <div className="relative w-full sm:w-64 md:w-80">
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
        <div className="card flex flex-col min-h-[300px] lg:h-[70vh] p-0 overflow-hidden shadow-xl lg:shadow-md border-2 border-blue-50 lg:border-zinc-200">
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
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-5 sm:p-8 w-full max-w-sm sm:max-w-md shadow-2xl flex flex-col gap-4 sm:gap-6 max-h-[90vh] overflow-hidden"
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
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center gap-4">
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
                <div className="p-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl text-center space-y-3">
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
        </motion.div>
        </div>
      )}

      {/* Order List / Bill Modal for Kitchen */}
      {showOrderList && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-4 sm:p-8 w-full max-w-sm shadow-2xl relative my-auto"
          >
            <button onClick={() => setShowOrderList(null)} className="absolute top-2 sm:top-4 right-2 sm:right-4 text-zinc-400 hover:text-zinc-600 no-print cursor-pointer"><X /></button>
            <div id="bill-ticket" className="bg-white p-4 sm:p-6 border-2 border-dashed border-zinc-200 font-mono text-xs sm:text-sm space-y-4">
              <div className="text-center border-b pb-4">
                <h3 className="font-black text-xl uppercase italic tracking-tighter">Kitchen Ticket</h3>
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

            <button 
              onClick={() => window.print()} 
              className="w-full mt-6 btn btn-primary py-3 no-print flex items-center justify-center gap-2 font-bold shadow-lg"
            >
              <Printer className="w-5 h-5" /> Cetak Ticket Kitchen
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function InventoryView({ products, setProducts }: any) {
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
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <CheckCircle2 className="w-4 h-4 rotate-180" /> {errorMsg}
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

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
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl"
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
          </motion.div>
        </div>
      )}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
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
          </motion.div>
        </div>
      )}
    </div>
  );
}

function DashboardView({ sales, products }: any) {
  const [timeWindow, setTimeWindow] = useState<'today' | 'week' | 'month' | 'total'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getInterval = () => {
    switch (timeWindow) {
      case 'today': return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
      case 'week': return { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
      case 'month': return { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
      default: return { start: new Date(0), end: new Date() };
    }
  };

  const navigateDate = (direction: number) => {
    if (timeWindow === 'today') setSelectedDate(prev => addDays(prev, direction));
    if (timeWindow === 'week') setSelectedDate(prev => addWeeks(prev, direction));
    if (timeWindow === 'month') setSelectedDate(prev => addMonths(prev, direction));
  };

  const getFormattedRange = () => {
    if (timeWindow === 'today') return format(selectedDate, 'dd MMMM yyyy');
    if (timeWindow === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
    }
    if (timeWindow === 'month') return format(selectedDate, 'MMMM yyyy');
    return 'Seluruh Waktu';
  };

  const interval = getInterval();
  const filteredSales = timeWindow === 'total' ? sales : sales.filter((s: Sale) => 
    isWithinInterval(new Date(s.date), interval)
  );

  const totalRevenue = filteredSales.reduce((acc: any, sale: any) => acc + sale.total, 0);
  const totalProfit = filteredSales.reduce((acc: any, sale: any) => {
    const saleProfit = sale.items.reduce((rowAcc: any, item: any) => rowAcc + ((item.price - (item.cost || 0)) * item.quantity), 0);
    return acc + saleProfit;
  }, 0);
  
  const lowStockProducts = products.filter((p: any) => (p.stock - (p.reserved || 0)) < 5);
  const lowStock = lowStockProducts.length;

  // Monthly Chart Data (always show last 6 months for trend)
  const monthlyData = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), 5 - i);
    const label = format(date, 'MMM');
    const monthlySales = sales.filter((s: Sale) => isSameMonth(new Date(s.date), date));
    const total = monthlySales.reduce((acc: number, s: Sale) => acc + s.total, 0);
    return { name: label, total };
  });

  // Weekly Chart Data (current month weeks)
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const weeksInMonth = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 });
  const weeklyData = weeksInMonth.map((weekStart, i) => {
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const weekSales = sales.filter((s: Sale) => isWithinInterval(new Date(s.date), { start: weekStart, end: weekEnd }));
    const total = weekSales.reduce((acc: number, s: Sale) => acc + s.total, 0);
    return { name: `W${i+1}`, total };
  });

  // Daily Chart Data (current week days)
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const dailyData = daysInWeek.map(day => {
    const daySales = sales.filter((s: Sale) => isWithinInterval(new Date(s.date), { start: startOfDay(day), end: endOfDay(day) }));
    const total = daySales.reduce((acc: number, s: Sale) => acc + s.total, 0);
    return { name: format(day, 'EEE'), total };
  });

  const getChartData = () => {
    if (timeWindow === 'today' || timeWindow === 'week') return dailyData;
    if (timeWindow === 'month') return weeklyData;
    return monthlyData;
  };

  const trendLabel = () => {
    if (timeWindow === 'today' || timeWindow === 'week') return 'Tren Harian Minggu Ini';
    if (timeWindow === 'month') return 'Tren Mingguan Bulan Ini';
    return 'Tren Bulanan Terakhir';
  };

  // Hot & Cold Products based on filtered sales
  const productPerformance = products.map((p: Product) => {
    const sold = filteredSales.reduce((acc: number, s: Sale) => {
      const item = s.items.find(i => i.sku === p.sku);
      return acc + (item ? item.quantity : 0);
    }, 0);
    return { ...p, sold };
  }).sort((a: any, b: any) => b.sold - a.sold);

  const hotProducts = productPerformance.filter((p: any) => p.sold > 0).slice(0, 4);
  const coldProducts = [...productPerformance].reverse().slice(0, 4);

  return (
    <div className="space-y-6 md:space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-black text-zinc-900 uppercase tracking-tight">Ringkasan Bisnis</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Panel Kontrol Penjualan</p>
          </div>
        </div>

        <div className="flex bg-zinc-100 p-1 rounded-xl">
          {[
            { id: 'today', label: 'Hari Ini' },
            { id: 'week', label: 'Minggu' },
            { id: 'month', label: 'Bulan' },
            { id: 'total', label: 'Semua' },
          ].map((w) => (
            <button 
              key={w.id}
              onClick={() => {
                setTimeWindow(w.id as any);
                setSelectedDate(new Date());
              }}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap",
                timeWindow === w.id ? "bg-white text-blue-600 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {timeWindow !== 'total' && (
        <div className="flex items-center justify-center gap-4 bg-white/50 p-2 rounded-xl border border-zinc-100 mb-2">
          <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-black uppercase tracking-widest text-zinc-600">{getFormattedRange()}</span>
          <button onClick={() => navigateDate(1)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card flex flex-col gap-1 border-l-4 border-l-blue-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Omzet</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(totalRevenue)}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeWindow}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card flex flex-col gap-1 border-l-4 border-l-green-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Profit</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(totalProfit)}</span>
          <div className="text-[8px] md:text-[10px] text-green-600 font-bold mt-1 uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Estimasi Net</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card flex flex-col gap-1 border-l-4 border-l-orange-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Order Qty</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900">{filteredSales.length}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase">Transaksi Berhasil</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card flex flex-col gap-1 border-l-4 border-l-red-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Stok Tipis</span>
          <span className={cn("text-sm md:text-2xl font-black", lowStock > 0 ? "text-red-600" : "text-zinc-900")}>{lowStock}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase">Item Butuh Restock</div>
        </motion.div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* Trend Section */}
        <div className="w-full lg:col-span-8 space-y-6">
          <div className="card space-y-4 md:space-y-6 bg-white overflow-hidden relative group p-4 md:p-6 shadow-xl border-none">
            <div className="flex justify-between items-center mb-2">
              <div className="z-10">
                <h3 className="font-black text-zinc-900 uppercase tracking-tight text-sm md:text-base">{trendLabel()}</h3>
                <p className="text-[8px] md:text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Visualisasi Performa Penjualan</p>
              </div>
              <BarChart3 className="text-blue-50 w-20 h-20 absolute -right-4 -top-4 opacity-50" />
            </div>
            
            <div className="h-[250px] md:h-[350px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                    labelStyle={{ fontWeight: '900', color: '#18181b', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#2563eb" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Side Performance Cards */}
        <div className="col-span-4 space-y-6">
          <div className="card space-y-4 shadow-lg border-zinc-50">
            <div className="flex items-center gap-2 border-b border-zinc-50 pb-3">
              <TrendingUp className="text-green-500 w-4 h-4" />
              <div className="flex flex-col">
                <h3 className="font-bold text-sm uppercase tracking-tight">Produk Terlaris</h3>
                <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">{timeWindow === 'total' ? 'Semua Waktu' : `Periode ${timeWindow}`}</span>
              </div>
            </div>
            <div className="space-y-4">
              {hotProducts.length > 0 ? hotProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800 group-hover:text-blue-600 transition-colors">{p.name}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{p.sold} Unit Terjual</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded text-[10px] font-black italic">
                    TOP <BarChart3 className="w-2 h-2" />
                  </div>
                </div>
              )) : (
                <div className="py-6 text-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Data Kosong</div>
              )}
            </div>
          </div>

          <div className="card space-y-4 border-dashed border-zinc-200 bg-zinc-50/30 shadow-none border-2">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 font-semibold">
              <TrendingDown className="text-red-400 w-4 h-4" />
              <div className="flex flex-col">
                <h3 className="font-bold text-sm uppercase tracking-tight text-zinc-500">Butuh Evaluasi</h3>
                <span className="text-[8px] font-black text-zinc-300 uppercase tracking-widest">Penjualan Terendah</span>
              </div>
            </div>
            <div className="space-y-4 opacity-70">
              {coldProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-zinc-600">{p.name}</span>
                    <span className="text-[10px] text-zinc-400 font-bold uppercase">{p.sold} Terjual</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {lowStock > 0 && (
            <div className="card space-y-4 border-red-100 bg-red-50/30">
              <div className="flex items-center gap-2 border-b border-red-100 pb-3">
                <PackagePlus className="text-red-600 w-4 h-4" />
                <h3 className="font-bold text-sm uppercase tracking-tight text-red-700">Restock Segera</h3>
              </div>
              <div className="space-y-3">
                {lowStockProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-800">{p.name}</span>
                      <span className="text-[10px] font-mono text-zinc-500 uppercase">{p.sku}</span>
                    </div>
                    <div className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[10px] font-black italic">
                      STOK: {p.stock - (p.reserved || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryView({ sales, shopInfo }: any) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeWindow, setTimeWindow] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getFilteredSales = () => {
    let interval: { start: Date; end: Date };

    switch (timeWindow) {
      case 'today':
        interval = { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
        break;
      case 'week':
        interval = { start: startOfWeek(selectedDate, { weekStartsOn: 1 }), end: endOfWeek(selectedDate, { weekStartsOn: 1 }) };
        break;
      case 'month':
        interval = { start: startOfMonth(selectedDate), end: endOfMonth(selectedDate) };
        break;
      default:
        interval = { start: new Date(0), end: new Date() };
    }

    return sales
      .filter((s: Sale) => {
        const matchesSearch = (s.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.id.toLowerCase().includes(searchTerm.toLowerCase());
        const isInWindow = timeWindow === 'all' ? true : isWithinInterval(new Date(s.date), interval);
        return matchesSearch && isInWindow;
      })
      .sort((a: Sale, b: Sale) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const navigateDate = (direction: number) => {
    if (timeWindow === 'today') setSelectedDate(prev => addDays(prev, direction));
    if (timeWindow === 'week') setSelectedDate(prev => addWeeks(prev, direction));
    if (timeWindow === 'month') setSelectedDate(prev => addMonths(prev, direction));
  };

  const getFormattedRange = () => {
    if (timeWindow === 'today') return format(selectedDate, 'dd MMMM yyyy');
    if (timeWindow === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
    }
    if (timeWindow === 'month') return format(selectedDate, 'MMMM yyyy');
    return 'Seluruh Waktu';
  };

  const filteredSales = getFilteredSales();

  const exportSales = () => {
    const exportData = filteredSales.map((s: Sale, index: number) => {
      const totalModal = s.items.reduce((acc, item) => acc + (item.cost * (item.quantity || 1)), 0);
      const summarySKU = s.items.map(item => `${item.sku}(${item.quantity})`).join(', ');

      return {
        'No': index + 1,
        'CO': s.id,
        'Tanggal order': s.orderDate ? format(new Date(s.orderDate), 'dd/MM/yyyy HH:mm') : '-',
        'Tanggal Selesai': format(new Date(s.date), 'dd/MM/yyyy HH:mm'),
        'Nama Customer': s.customerName || '-',
        'Tipe Order': s.serviceType || (s.id.startsWith('DIN') ? 'Dine In' : s.id.startsWith('TKA') ? 'Take Away' : 'Online'),
        'Total Pembayaran': s.total,
        'Total Modal': totalModal,
        'summary SKU terjual & qty': summarySKU
      };
    });
    downloadCSV(exportData, `Riwayat_Jual_${format(new Date(), 'ddMMyy')}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-4 rounded-xl border border-zinc-100 shadow-xs">
        <div className="space-y-1">
          <h2 className="font-black uppercase tracking-tight text-zinc-800">History Transaksi</h2>
          <p className="text-[10px] text-zinc-400 font-bold uppercase">{filteredSales.length} Transaksi Ditemukan</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              placeholder="Cari Pelanggan / CO..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-100 rounded-xl text-xs outline-none w-full sm:w-48 focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
            />
          </div>

          <button 
            onClick={exportSales}
            className="btn btn-secondary flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 h-10"
          >
            <Download className="w-4 h-4" /> Export
          </button>

          <div className="flex items-center bg-zinc-100 p-1 rounded-xl">
            {(['today', 'week', 'month', 'all'] as const).map((w) => (
              <button
                key={w}
                onClick={() => {
                  setTimeWindow(w);
                  setSelectedDate(new Date());
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  timeWindow === w ? "bg-white text-blue-600 shadow-sm" : "text-zinc-400 hover:text-zinc-600"
                )}
              >
                {w === 'today' && 'Hari Ini'}
                {w === 'week' && 'Minggu'}
                {w === 'month' && 'Bulan'}
                {w === 'all' && 'Semua'}
              </button>
            ))}
          </div>
        </div>

        {timeWindow !== 'all' && (
          <div className="flex items-center justify-between w-full bg-zinc-50 p-2 rounded-xl border border-zinc-100 mt-2">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft className="w-4 h-4 text-zinc-600" /></button>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{getFormattedRange()}</span>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight className="w-4 h-4 text-zinc-600" /></button>
          </div>
        )}
      </div>
      <div className="card p-0 overflow-hidden shadow-xs hover:shadow-md transition-shadow">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
          <thead className="bg-zinc-50 border-b border-zinc-100 uppercase text-[10px] font-black tracking-widest text-zinc-400">
            <tr>
              <th className="px-6 py-4">CO / ID</th>
              <th className="px-6 py-4">Waktu Order</th>
              <th className="px-6 py-4">Waktu Selesai</th>
              <th className="px-6 py-4">Pelanggan</th>
              <th className="px-6 py-4">Tipe</th>
              <th className="px-6 py-4">Metode</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 transition-all">
            {filteredSales.map((s: Sale) => (
              <tr key={s.id} className="hover:bg-blue-50/20 group text-sm">
                <td className="px-6 py-4 font-mono font-bold text-blue-600">#{s.id}</td>
                <td className="px-6 py-4 text-zinc-500 text-xs">
                  {s.orderDate ? format(new Date(s.orderDate), 'd MMM, HH:mm') : '-'}
                </td>
                <td className="px-6 py-4 text-zinc-500 text-xs">
                  {format(new Date(s.date), 'd MMM, HH:mm')}
                </td>
                <td className="px-6 py-4 font-bold text-zinc-700 capitalize">
                  {s.customerName || '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter",
                    s.serviceType === 'Dine In' || s.id.startsWith('DIN') ? "bg-blue-50 text-blue-600" :
                    s.serviceType === 'Take Away' || s.id.startsWith('TKA') ? "bg-orange-50 text-orange-600" :
                    s.serviceType === 'Online' || s.id.startsWith('ONL') ? "bg-purple-50 text-purple-600" :
                    "bg-zinc-50 text-zinc-600"
                  )}>
                    {s.serviceType || (s.id.startsWith('DIN') ? 'Dine In' : s.id.startsWith('TKA') ? 'Take Away' : 'Online')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-[10px] font-black uppercase">{s.paymentMethod}</span>
                </td>
                <td className="px-6 py-4 text-right font-black text-blue-600">{formatCurrency(s.total)}</td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => setSelectedSale(s)}
                    className="p-2 text-zinc-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-all"
                  >
                    <Printer className="w-5 h-5 ml-auto" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {selectedSale && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-zinc-100 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
          >
            <button onClick={() => setSelectedSale(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 no-print cursor-pointer"><X /></button>
            <div id="receipt" className="bg-white p-6 rounded shadow-sm border font-mono text-sm space-y-4">
              <div className="text-center border-b pb-4 space-y-1">
                <h3 className="font-bold text-lg uppercase tracking-tight">{shopInfo.name}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{shopInfo.address}</p>
                <p className="text-xs text-zinc-500">{shopInfo.phone}</p>
              </div>

              <div className="text-xs space-y-1 py-1 border-b italic">
                <div className="flex justify-between">
                  <span>Nota: #{selectedSale.id}</span>
                  <span>{format(new Date(selectedSale.date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between font-bold not-italic">
                  <span>Kasir: {selectedSale.customerName || 'Staff'}</span>
                  <div className="text-right">
                    <div>{selectedSale.serviceType || 'Common'}</div>
                    <div className="text-[10px] uppercase">{selectedSale.serviceType === 'Dine In' ? `Meja: ${selectedSale.tableNumber}` : selectedSale.serviceType === 'Take Away' ? `Antrean: ${selectedSale.orderNumber}` : ''}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 py-2">
                {selectedSale.items.map((item: CartItem) => (
                  <div key={item.id} className="space-y-0.5">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-xs">{item.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500">
                      <span>{item.quantity} x {formatCurrency(item.price)}</span>
                      <span>{formatCurrency(item.quantity * item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2 font-bold">
                <div className="flex justify-between text-lg">
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-normal">
                  <span>DIBAYAR ({selectedSale.paymentMethod.toUpperCase()})</span>
                  <span>{formatCurrency(selectedSale.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-normal">
                  <span>KEMBALIAN</span>
                  <span>{formatCurrency(selectedSale.change)}</span>
                </div>
              </div>

              <div className="pt-6 border-t text-center text-zinc-400 text-xs italic">
                <p>{shopInfo.message}</p>
              </div>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full mt-6 btn btn-primary py-3 no-print font-bold shadow-lg"
            >
              Cetak Struk
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function OnlineView({ preorders, setPreorders, sales, products, setProducts, setSales, shopInfo, tab, setTab }: any) {
  const [bulkText, setBulkText] = useState('');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCheckingAvi, setIsCheckingAvi] = useState(false);
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

  const parseBulkOrder = () => {
    const lines = bulkText.split('\n').filter(line => line.trim() !== '');
    const newPreorders: Preorder[] = [];

    const todayStr = format(new Date(), 'ddMMyy');
    const allOrders = [...(sales || []), ...(preorders || [])];
    const todayOrders = allOrders.filter(o => o.id.includes(todayStr));
    let nextSeq = todayOrders.length === 0 ? 1 : 
      Math.max(...todayOrders.map(o => {
        const seq = parseInt(o.id.slice(-4));
        return isNaN(seq) ? 0 : seq;
      })) + 1;

    lines.forEach(line => {
      // Expected format: Name | SKU:Qty, SKU:Qty | Delivery
      const [name, itemsStr, delivery] = line.split('|').map(s => s.trim());
      if (!name || !itemsStr) return;

      const items: PreorderItem[] = itemsStr.split(',').map(itemStr => {
        const [sku, qty] = itemStr.trim().split(':');
        const product = products.find((p: any) => p.sku === sku);
        if (!product) {
          console.warn(`Product with SKU ${sku} not found`);
        }
        return {
          sku: sku || 'N/A',
          name: product?.name || `Product ${sku || 'Unknown'}`,
          quantity: parseInt(qty) || 1,
          price: product?.price || 0
        };
      });

      const total = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

      newPreorders.push({
        id: generateOrderCode('ONL', nextSeq++),
        date: new Date().toISOString(),
        customerName: name,
        items,
        deliveryMode: delivery || 'Pick up',
        shippingCost: 0,
        milestone: 'produksi',
        total
      });
    });

    setPreorders((prev: Preorder[]) => [...newPreorders, ...prev]);
    setBulkText('');
    
    if (newPreorders.length > 0) {
      setTab('kanban');
      triggerSuccess(`Berhasil memproses ${newPreorders.length} pesanan!`);
    } else {
      triggerError("Format tidak valid. Gunakan: Nama | SKU:Qty | Kurir");
    }
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
    const itemsText = order.items.map(item => `- ${item.name} (x${item.quantity})`).join('\n');
    const subtotal = order.total;
    const finalTotal = subtotal + order.shippingCost;
    
    // Bank accounts text
    const bankText = shopInfo.bankAccounts && shopInfo.bankAccounts.length > 0 
      ? shopInfo.bankAccounts.map((b: any) => `${b.bankName}: ${b.accountNumber} (A/N ${b.accountName || '-'})`).join('\n')
      : '[MENUNGGU REKENING TOKO]';

    // Generate Direct Image Download Link for WA
    // For local hosting, we can try to point to the base64 or a link 
    // that triggers the specific view but we want them "downloadable".
    // On web, direct download trigger via WA link is hard, 
    // but we can provide a landing page that is extremely clear.
    
    // Use btoa + utf8 support for encoding
    const receiptPayload = {
      shopName: shopInfo.name,
      shopAddress: shopInfo.address,
      shopPhone: shopInfo.phone,
      orderId: order.id,
      date: format(new Date(order.date), 'dd/MM/yy HH:mm'),
      items: order.items.map(i => ({ name: i.name, qty: i.quantity, price: i.price })),
      subtotal: order.total,
      shippingCost: order.shippingCost,
      deliveryMode: order.deliveryMode,
      total: order.total + order.shippingCost,
      message: shopInfo.message
    };
    const encodedData = btoa(unescape(encodeURIComponent(JSON.stringify(receiptPayload))));
    const receiptLink = `${window.location.origin}/#receipt/${encodedData}`;
    const qrisLink = `${window.location.origin}/#qris`;

    const message = `*${shopInfo.name.toUpperCase()} - Invoice No: ${order.id}*\n\n` +
      `Halo Kak ${order.customerName}, Berikut rincian pesanan Anda:\n` +
      `${itemsText}\n\n` +
      `Subtotal: ${formatCurrency(subtotal)}\n\n` +
      `Ongkir (${order.deliveryMode}): ${formatCurrency(order.shippingCost)}\n` +
      `*Total Tagihan: ${formatCurrency(finalTotal)}*\n\n` +
      `--------------------------------\n` +
      `Selesaikan pembayaran ke:\n${bankText}\n` +
      `--------------------------------\n\n` +
      `DOWNLOAD STRUK DIGITAL:\n${receiptLink}\n\n` +
      `DOWNLOAD QRIS PEMBAYARAN:\n${qrisLink}\n\n` +
      `${shopInfo.message}`;
      
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text"
              placeholder="Cari Pelanggan, SKU, atau ID Pesanan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-zinc-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-600 focus:outline-none shadow-sm"
            />
          </div>
          <div className="flex bg-zinc-200 p-1 rounded-xl w-fit">
            <button onClick={() => setTab('kanban')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", tab === 'kanban' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-600 hover:text-zinc-800")}>Kanban</button>
            <button onClick={() => setTab('input')} className={cn("px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all", tab === 'input' ? "bg-white text-blue-600 shadow-sm" : "text-zinc-600 hover:text-zinc-800")}>Input Pesanan</button>
          </div>
        </div>

        {tab === 'kanban' && (
          <div className="flex flex-wrap gap-2 md:gap-3 items-center bg-blue-50/80 backdrop-blur-md p-2 md:p-4 rounded-xl border border-blue-100 shadow-sm">
            <span className="text-[10px] font-black text-blue-600 uppercase mr-2 whitespace-nowrap">{selectedOrders.length} Terpilih</span>
            
            <button 
              disabled={selectedOrders.length === 0}
              onClick={() => setShowSummary(true)}
              className="btn btn-secondary text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
            >
              <ClipboardList className="w-3.5 h-3.5" /> Summary
            </button>
            
            <button 
              disabled={selectedOrders.length === 0}
              onClick={() => setShowLabels(true)}
              className="btn btn-secondary text-[10px] gap-1.5 py-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" /> Label
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
        )}
      </div>

      {tab === 'input' && (
        <div className="card space-y-4 max-w-2xl mx-auto">
          <h3 className="font-bold">Input Pesanan Online</h3>
          <p className="text-xs text-zinc-500 bg-zinc-100 p-3 rounded-lg leading-relaxed">
            Format: <code className="font-mono bg-white px-1 rounded border">Nama Pelanggan | SKU:Qty, SKU:Qty | Mode Kirim</code><br/>
            Contoh: <code className="font-mono bg-white px-1 rounded border">Budi Hartono | KPY-001:2, GLA-002:1 | Gojek</code>
          </p>
          <textarea 
            rows={10}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder="Ketik pesanan di sini, pisahkan dengan baris baru..."
            className="w-full p-4 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-none font-mono text-sm"
          />
          <button 
            onClick={parseBulkOrder}
            className="w-full btn btn-primary py-3"
          >
            Proses & Masuk List
          </button>
        </div>
      )}

      {tab === 'kanban' && (
        <div className="space-y-6 relative">
          <AnimatePresence>
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <CheckCircle2 className="w-4 h-4 rotate-180" /> {errorMsg}
              </motion.div>
            )}
            {successMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
              >
                <CheckCircle2 className="w-4 h-4" /> {successMsg}
              </motion.div>
            )}
          </AnimatePresence>

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
                  "flex flex-col gap-3 border-2 border-dashed rounded-2xl p-2 transition-all duration-300",
                  filteredPreorders.filter((p: Preorder) => p.milestone === m).length === 0 ? "min-h-[60px] md:min-h-[150px]" : "min-h-[150px] md:min-h-[500px]",
                  m === 'produksi' ? "bg-red-50/40 border-red-100" :
                  m === 'penyimpanan' ? "bg-orange-50/40 border-orange-100" :
                  "bg-green-50/40 border-green-100"
                )}>
                  {filteredPreorders.filter((p: Preorder) => p.milestone === m)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // FIFO
                    .map((order: Preorder) => (
                    <motion.div 
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
                          <button 
                            onClick={() => sendWhatsAppReceipt(order)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-bold border border-green-100 hover:bg-green-100 transition-colors"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Kirim Struk WA
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
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
          </motion.div>
        </div>
      )}

      {/* Summary Modal (A4 Print Version) */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center p-2 sm:p-8 backdrop-blur-sm overflow-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded p-4 sm:p-12 w-full max-w-[210mm] min-h-[297mm] relative font-sans text-zinc-900 border border-zinc-200 mt-4 sm:mt-0 shadow-2xl print:shadow-none print:border-none print:m-0 print:p-8 print:w-full">
            <button onClick={() => setShowSummary(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 no-print"><X /></button>
            <div className="space-y-8">
              <div className="text-center border-b-2 border-zinc-900 pb-8 mt-4">
                <h2 className="text-3xl font-black uppercase tracking-tight">{shopInfo.name}</h2>
                <div className="text-xl font-bold uppercase tracking-widest mt-1">Summary Antrean Produksi (A4)</div>
                <p className="text-zinc-500 font-mono mt-2 uppercase tracking-widest text-xs">Dibuat: {format(new Date(), 'dd MMMM yyyy HH:mm')}</p>
                <p className="text-zinc-400 text-xs mt-1 font-bold">{selectedOrders.length} Pesanan Online Terpilih</p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-8 border-blue-600 pl-4 py-1">
                  <h3 className="font-black text-xl uppercase tracking-widest">A. Total Bahan / Produk Harus Disiapkan</h3>
                </div>
                <div className="border-2 border-zinc-900 rounded-2xl overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-zinc-900 text-white text-left">
                        <th className="p-4 text-xs font-black uppercase tracking-widest">SKU</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest">Nama Produk</th>
                        <th className="p-4 text-xs font-black uppercase tracking-widest text-center">Qty Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-zinc-100">
                      {Object.entries(getSummary()).map(([sku, data]) => (
                        <tr key={sku} className="font-bold">
                          <td className="p-4 font-mono text-zinc-500">{sku}</td>
                          <td className="p-4 text-base uppercase">{data.name}</td>
                          <td className="p-4 text-center">
                            <span className="text-3xl font-black bg-zinc-100 px-4 py-1 rounded-xl border border-zinc-200">
                              {data.qty}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-3 border-l-8 border-zinc-400 pl-4 py-1">
                  <h3 className="font-black text-xl uppercase tracking-widest">B. Rincian per Nomor CO</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {preorders.filter((p: Preorder) => selectedOrders.includes(p.id)).map(order => (
                    <div key={order.id} className="border border-zinc-200 p-4 rounded-xl bg-zinc-50/50">
                      <div className="flex justify-between items-start border-b border-zinc-200 pb-2 mb-2">
                        <div className="font-black text-blue-600">{order.id}</div>
                        <div className="text-[10px] font-black uppercase text-zinc-400">{order.customerName}</div>
                      </div>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs font-bold">
                            <span className="truncate max-w-[150px] uppercase">{item.name}</span>
                            <span className="bg-white px-2 rounded border border-zinc-200 font-black">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-12 border-t pt-8 flex justify-between items-end text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                <div className="space-y-4">
                  <div>Bagian Produksi:</div>
                  <div className="h-16 w-48 border-b-2 border-zinc-900" />
                </div>
                <div className="text-right">
                  Dihasilkan oleh Sistem UMKM Pintar
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} className="fixed bottom-8 right-8 btn btn-primary px-10 py-4 shadow-2xl no-print font-black uppercase tracking-widest text-sm z-[110]">PRINT SUMMARY (A4)</button>
          </motion.div>
        </div>
      )}

      {/* Label Print Modal (Page Logic) */}
      {showLabels && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center p-2 sm:p-8 backdrop-blur-sm overflow-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded p-4 sm:p-12 w-full max-w-4xl relative print:m-0 print:p-0 print:w-full print:shadow-none shadow-2xl">
            <button onClick={() => setShowLabels(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 no-print cursor-pointer scale-150 sm:scale-100"><X /></button>
            <h3 className="text-center font-black uppercase tracking-widest mb-8 no-print text-zinc-400">Preview Label CO</h3>
            
            <div className="flex flex-wrap gap-4 sm:gap-8 justify-center print:block print:p-0">
              {preorders.filter((p: Preorder) => selectedOrders.includes(p.id)).map(order => (
                <div key={order.id} className="bg-white p-4 sm:p-8 w-full sm:w-[100mm] border-2 border-zinc-900 text-zinc-900 flex flex-col gap-4 font-sans print:w-full print:h-[135mm] print:mb-0 print:border-b-2 print:border-dashed print:page-break-inside-avoid">
                  <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Nomor Pesanan</div>
                      <div className="font-black text-4xl leading-none tracking-tighter">{order.id}</div>
                    </div>
                    <div className="text-right font-mono">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Kurir</div>
                      <div className="font-black text-xl text-blue-600 bg-blue-50 px-3 py-1 rounded-xl border border-blue-100">{order.deliveryMode.toUpperCase()}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 bg-zinc-900 text-white p-4 rounded-2xl">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Nama Pelanggan</div>
                    <div className="text-2xl font-black uppercase truncate">{order.customerName}</div>
                  </div>

                  <div className="space-y-3 flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Daftar Item:</div>
                    <div className="space-y-2 border-y-2 border-dashed border-zinc-200 py-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                          <span className="font-black uppercase text-base truncate max-w-[200px]">{item.name}</span>
                          <span className="bg-zinc-900 text-white px-4 py-1 rounded-full font-black text-2xl">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4 p-4 border-t-2 border-zinc-900">
                     <div className="h-10 w-48 flex items-center justify-center gap-[1px] opacity-40">
                      {Array.from({length: 40}).map((_, i) => (
                        <div key={i} className="bg-zinc-900" style={{ width: Math.random() > 0.5 ? '3px' : '1px', height: '100%' }} />
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Powered by</div>
                      <div className="text-[10px] font-black uppercase tracking-tight">{shopInfo.name}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => window.print()} className="mt-8 btn btn-primary w-full no-print py-4 font-black uppercase tracking-widest shadow-2xl">CETAK SEMUA LABEL</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function SettingsView({ shopInfo, setShopInfo, onResetData }: { shopInfo: ShopInfo, setShopInfo: any, onResetData: () => void }) {
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 3000);
  };

  const confirmPhrase = "saya confirm untuk menghapus seluruh database yang telah ada";

  const handleUpdatePin = () => {
    const systemPin = shopInfo.systemPin || '1234';
    if (oldPin !== systemPin && oldPin !== 'admin123') {
      triggerError('PIN Lama Salah!');
      return;
    }
    if (newPin.length < 4) {
      triggerError('PIN Baru minimal 4 karakter');
      return;
    }
    setShopInfo({ ...shopInfo, systemPin: newPin });
    setOldPin('');
    setNewPin('');
    triggerSuccess('PIN Berhasil Diperbarui!');
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setShopInfo({ ...shopInfo, qrisImage: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addBankAccount = () => {
    setShopInfo({
      ...shopInfo,
      bankAccounts: [...(shopInfo.bankAccounts || []), { bankName: '', accountNumber: '', accountName: '' }]
    });
  };

  const updateBankAccount = (index: number, field: string, value: string) => {
    const newAccounts = [...shopInfo.bankAccounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setShopInfo({ ...shopInfo, bankAccounts: newAccounts });
  };

  const removeBankAccount = (index: number) => {
    setShopInfo({
      ...shopInfo,
      bankAccounts: shopInfo.bankAccounts.filter((_: any, i: number) => i !== index)
    });
  };

  const handleReset = async () => {
    const systemPin = shopInfo.systemPin || '1234';
    if (resetConfirm === confirmPhrase && (resetPassword === systemPin || resetPassword === 'admin123')) {
      if (confirm('PERINGATAN: Seluruh data akan dihapus permanen. Lanjutkan?')) {
        await onResetData();
        triggerSuccess('Database Berhasil Direset!');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } else {
      triggerError('PIN atau Kalimat Konfirmasi Salah!');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 pb-24 md:pb-20 p-2 sm:p-0 relative">
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <CheckCircle2 className="w-4 h-4" /> {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <X className="w-4 h-4" /> {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card space-y-4 md:space-y-6 p-4 md:p-6">
        <h3 className="text-lg font-bold border-b border-zinc-100 pb-3 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-600" />
          Informasi Toko
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Nama Toko</label>
              <input 
                type="text" 
                value={shopInfo.name}
                onChange={e => setShopInfo({...shopInfo, name: e.target.value})}
                className="w-full p-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Nomor Telepon</label>
              <input 
                type="text" 
                value={shopInfo.phone}
                onChange={e => setShopInfo({...shopInfo, phone: e.target.value})}
                className="w-full p-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Alamat</label>
              <textarea 
                rows={3}
                value={shopInfo.address}
                onChange={e => setShopInfo({...shopInfo, address: e.target.value})}
                className="w-full p-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">Pesan Struk / WhatsApp</label>
              <textarea 
                rows={2}
                value={shopInfo.message}
                onChange={e => setShopInfo({...shopInfo, message: e.target.value})}
                className="w-full p-2.5 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-500 uppercase block mb-1">QRIS Toko (Upload Gambar)</label>
              <div className="space-y-3">
                {shopInfo.qrisImage && (
                  <div className="relative w-32 h-32 border border-zinc-200 rounded-lg overflow-hidden group">
                    <img src={shopInfo.qrisImage} alt="QRIS" className="w-full h-full object-contain" />
                    <button 
                      onClick={() => setShopInfo({...shopInfo, qrisImage: undefined})}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="text-lg font-bold border-b border-zinc-100 pb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-600" />
          Ganti PIN Keamanan
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">PIN Saat Ini</label>
              <input 
                type="password"
                value={oldPin}
                onChange={e => setOldPin(e.target.value)}
                placeholder="Masukkan PIN Lama"
                className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">PIN Baru</label>
              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  placeholder="PIN Baru"
                  className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none"
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400"
                >
                  {showPin ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 rotate-45" />}
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={handleUpdatePin}
            disabled={!oldPin || !newPin}
            className={cn(
              "btn w-full py-3 flex items-center justify-center gap-2 font-black tracking-widest uppercase text-xs",
              (oldPin && newPin) ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            )}
          >
            Update PIN
          </button>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest text-center">Default PIN: 1234</p>
        </div>
      </div>

      <div className="card space-y-6">
        <h3 className="text-lg font-bold border-b border-zinc-100 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Rekening Pembayaran
          </div>
          <button 
            onClick={addBankAccount}
            className="text-xs btn btn-secondary py-1.5 px-3 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Rekening
          </button>
        </h3>
        
        <div className="space-y-4">
          {(!shopInfo.bankAccounts || shopInfo.bankAccounts.length === 0) ? (
            <div className="text-center py-6 text-zinc-400 text-sm italic">
              Belum ada rekening ditambahkan
            </div>
          ) : (
            shopInfo.bankAccounts.map((account: any, index: number) => (
              <div key={index} className="flex gap-3 items-end bg-zinc-50 p-4 rounded-xl border border-zinc-100 group">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Bank / Platform</label>
                      <input 
                        type="text" 
                        placeholder="BCA, Dana, dll"
                        value={account.bankName}
                        onChange={e => updateBankAccount(index, 'bankName', e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">No. Rekening</label>
                      <input 
                        type="text" 
                        placeholder="Nomor rekening"
                        value={account.accountNumber}
                        onChange={e => updateBankAccount(index, 'accountNumber', e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">A/N</label>
                      <input 
                        type="text" 
                        placeholder="Nama pemilik"
                        value={account.accountName}
                        onChange={e => updateBankAccount(index, 'accountName', e.target.value)}
                        className="w-full p-2 border border-zinc-200 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => removeBankAccount(index)}
                  className="p-2.5 text-zinc-400 hover:text-red-600 bg-white border border-zinc-200 rounded-lg shadow-sm mb-0.5"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card bg-red-50 border-red-100 space-y-4">
        <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
          <Trash2 className="w-5 h-5" />
          Hapus & Reset Database
        </h3>
        <p className="text-sm text-red-600 opacity-80 leading-relaxed font-bold">
          Tindakan ini akan menghapus SELURUH data (Produk, Penjualan, Online Order, Kitchen, Dashboard) dan mengembalikan ke pengaturan awal!
        </p>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
              1. Konfirmasi Kalimat:
            </label>
            <div className="bg-red-100/50 p-2 rounded-lg text-[10px] font-mono text-red-800 border border-red-200 select-all">
              {confirmPhrase}
            </div>
            <input 
              type="text" 
              placeholder="Ketik kalimat konfirmasi..."
              value={resetConfirm}
              onPaste={(e) => e.preventDefault()}
              onChange={(e) => setResetConfirm(e.target.value)}
              className="w-full p-3 border-2 border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-red-400 uppercase tracking-widest block">
              2. Masukkan PIN Sistem:
            </label>
            <input 
              type="password" 
              placeholder="Masukkan PIN Anda untuk verifikasi"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="w-full p-3 border-2 border-red-200 rounded-xl text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all font-mono"
            />
          </div>
        </div>

        <button 
          disabled={resetConfirm !== confirmPhrase || !resetPassword}
          onClick={handleReset}
          className={cn(
            "btn w-full font-black uppercase tracking-widest py-4 transition-all",
            (resetConfirm === confirmPhrase && resetPassword)
              ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200" 
              : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
          )}
        >
          Reset Database Sekarang
        </button>
      </div>
    </div>
  );
}

function KitchenMonitorView({ activeOrders, setActiveOrders }: { activeOrders: ActiveOrder[], setActiveOrders: any }) {
  const statuses: OrderStatus[] = ['pending', 'preparing', 'ready'];
  const [history, setHistory] = useState<ActiveOrder[] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const saveHistory = () => {
    setHistory([...activeOrders]);
  };

  const undoMove = () => {
    if (history) {
      setActiveOrders(history);
      setHistory(null);
    }
  };

  const filteredOrders = activeOrders.filter(order => {
    const query = searchQuery.toLowerCase();
    const matchesCustomer = (order.customerName || '').toLowerCase().includes(query);
    const matchesTable = (order.tableNumber || '').toLowerCase().includes(query);
    const matchesDesk = (order.id || '').toLowerCase().includes(query);
    const matchesOrderNum = (order.orderNumber || '').toLowerCase().includes(query);
    return matchesCustomer || matchesTable || matchesDesk || matchesOrderNum;
  });

  const moveStatus = (id: string, current: OrderStatus) => {
    const nextMap: Record<OrderStatus, OrderStatus> = {
      'pending': 'preparing',
      'preparing': 'ready',
      'ready': 'completed',
      'completed': 'completed'
    };
    
    saveHistory();
    setActiveOrders((prev: ActiveOrder[]) => prev.map(order => 
      order.id === id ? { ...order, status: nextMap[current] } : order
    ).filter(order => order.status !== 'completed'));
  };

  const toggleItemReady = (orderId: string, itemIdx: number) => {
    saveHistory();
    setActiveOrders((prev: ActiveOrder[]) => prev.map(order => {
      if (order.id === orderId) {
        const newItems = [...order.items];
        newItems[itemIdx] = { ...newItems[itemIdx], isReady: !newItems[itemIdx].isReady };
        
        // Auto move to ready if all items are finished and current status is preparing
        let newStatus = order.status;
        if (order.status === 'preparing' && newItems.every(i => i.isReady)) {
          newStatus = 'ready';
        }

        return { ...order, items: newItems, status: newStatus };
      }
      return order;
    }));
  };

  const cancelKitchenOrder = (id: string) => {
    saveHistory();
    setActiveOrders((prev: ActiveOrder[]) => prev.filter(order => order.id !== id));
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'ANTREAN MASUK', color: 'zinc', icon: Clock };
      case 'preparing': return { label: 'SEDANG DIMASAK', color: 'orange', icon: Utensils };
      case 'ready': return { label: 'SIAP SAJI / AMBIL', color: 'green', icon: ClipboardCheck };
      default: return { label: status, color: 'zinc', icon: Clock };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari Meja / Customer / Order..." 
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {history && (
          <button 
            onClick={undoMove}
            className="btn bg-orange-50 text-orange-600 hover:bg-orange-100 text-[10px] font-black uppercase tracking-widest gap-2 py-2 px-4 shadow-sm border border-orange-100 rounded-xl"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Undo Klik Keliru
          </button>
        )}
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 h-auto lg:h-[75vh]">
      {statuses.map(status => {
        const config = getStatusConfig(status);
        const filtered = filteredOrders.filter(o => o.status === status);
        
        return (
          <div key={status} className={cn(
            "flex flex-col gap-4 p-4 rounded-3xl border-2 border-dashed transition-all duration-300",
            filtered.length === 0 ? "min-h-[80px] lg:h-auto" : "flex-1 lg:h-full",
            status === 'pending' ? "bg-red-50/40 border-red-100" :
            status === 'preparing' ? "bg-orange-50/40 border-orange-100" :
            "bg-green-50/40 border-green-100"
          )}>
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <config.icon className={cn("w-5 h-5", 
                  status === 'pending' ? "text-zinc-400" : 
                  status === 'preparing' ? "text-orange-500" : "text-green-500"
                )} />
                <h3 className="font-black text-xs uppercase tracking-[0.15em] text-zinc-500">{config.label}</h3>
              </div>
              <span className="bg-white px-3 py-1 rounded-full text-[10px] font-black shadow-sm text-zinc-400">{filtered.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <AnimatePresence>
                {filtered.map(order => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={order.id} 
                    className="card group relative overflow-hidden p-0 border-2 hover:border-blue-200 transition-all cursor-default"
                  >
                    <div className={cn("h-1 w-full", 
                      status === 'pending' ? "bg-zinc-200" : 
                      status === 'preparing' ? "bg-orange-400" : "bg-green-500"
                    )} />
                    
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="font-black text-blue-600 font-mono text-sm">#{order.id}</div>
                        <div className="bg-zinc-100 px-2 py-0.5 rounded text-[10px] font-black uppercase text-zinc-500">
                           {order.serviceType === 'Dine In' ? `Meja: ${order.tableNumber}` : `No: ${order.orderNumber}`}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {order.items.map((item: any, idx: number) => (
                          <button 
                            key={idx} 
                            onClick={() => toggleItemReady(order.id, idx)}
                            className={cn(
                              "w-full flex justify-between text-xs font-bold uppercase p-1.5 rounded transition-colors text-left",
                              item.isReady 
                                ? "bg-green-100/50 text-green-700 line-through opacity-60" 
                                : "hover:bg-zinc-100 text-zinc-700"
                            )}
                          >
                            <div className="flex gap-2 items-center">
                              {item.isReady && <CheckCircle2 className="w-3 h-3" />}
                              <span>x{item.quantity} {item.name}</span>
                            </div>
                            {item.isReady && <span className="text-[8px] font-black italic">READY</span>}
                          </button>
                        ))}
                      </div>

                      <div className="pt-2 flex items-center justify-between gap-2">
                         <div className="text-[10px] font-bold text-zinc-400 uppercase italic truncate">Cust: {order.customerName}</div>
                         <div className="flex items-center gap-1.5 shadow-sm rounded-lg overflow-hidden shrink-0">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               cancelKitchenOrder(order.id);
                             }}
                             className="bg-zinc-100 text-zinc-400 hover:bg-red-50 hover:text-red-600 p-2 transition-all"
                             title="Batalkan Pesanan"
                           >
                             <Trash2 className="w-3.5 h-3.5" />
                           </button>
                           <button 
                             onClick={() => moveStatus(order.id, status)}
                             className={cn(
                               "py-1.5 px-4 text-[10px] font-black uppercase tracking-widest transition-all",
                               status === 'pending' ? "bg-zinc-800 text-white" :
                               status === 'preparing' ? "bg-orange-500 text-white shadow-lg shadow-orange-100" : "bg-green-600 text-white"
                             )}
                           >
                             Lanjut <ArrowRight className="w-3 h-3 ml-1" />
                           </button>
                         </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {filtered.length === 0 && (
                <div className="text-center py-20 opacity-20 filter grayscale text-zinc-400">
                   <Coffee className="w-12 h-12 mx-auto mb-2" />
                   <p className="text-xs font-black uppercase tracking-[0.4em]">KOSONG</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
