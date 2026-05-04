import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, 
  PieChart, Pie, Cell, BarChart, Bar, Legend 
} from 'recharts';
import { 
  format, startOfMonth, endOfMonth, startOfDay, endOfDay, startOfWeek, endOfWeek, 
  addDays, addWeeks, addMonths, isWithinInterval, subMonths, isSameMonth, eachWeekOfInterval, eachDayOfInterval 
} from 'date-fns';
import { formatCurrency, cn } from '../lib/utils';
import { Product, Sale } from '../types';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart, Users, PackagePlus, Calendar, BarChart3 } from 'lucide-react';

export function DashboardView({ sales, products }: any) {
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 backdrop-blur-md p-4 rounded-lg border border-zinc-100 shadow-sm">
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
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card flex flex-col gap-1 border-l-4 border-l-blue-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Omzet</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(totalRevenue)}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> {timeWindow}</div>
        </div>
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card flex flex-col gap-1 border-l-4 border-l-green-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Profit</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900 truncate">{formatCurrency(totalProfit)}</span>
          <div className="text-[8px] md:text-[10px] text-green-600 font-bold mt-1 uppercase flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Estimasi Net</div>
        </div>
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card flex flex-col gap-1 border-l-4 border-l-orange-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Order Qty</span>
          <span className="text-sm md:text-2xl font-black text-zinc-900">{filteredSales.length}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase">Transaksi Berhasil</div>
        </div>
        <div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="card flex flex-col gap-1 border-l-4 border-l-red-600 bg-white/50 backdrop-blur-sm p-3 md:p-4">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-relaxed">Stok Tipis</span>
          <span className={cn("text-sm md:text-2xl font-black", lowStock > 0 ? "text-red-600" : "text-zinc-900")}>{lowStock}</span>
          <div className="text-[8px] md:text-[10px] text-zinc-400 font-bold mt-1 uppercase">Item Butuh Restock</div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 md:gap-8">
        {/* Trend Section */}
        <div className="w-full lg:col-span-8 space-y-6">
          <div className="card space-y-4 md:space-y-6 bg-white overflow-hidden relative group p-4 md:p-6 shadow-sm border-none">
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

