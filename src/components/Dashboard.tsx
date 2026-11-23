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
    <div className="space-y-2.5 md:space-y-6 pb-1 md:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 bg-white p-2.5 md:p-4 rounded-xl border border-zinc-200/80 shadow-xs">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="p-1.5 md:p-2 bg-blue-600 rounded-lg md:rounded-xl text-white shrink-0">
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black text-zinc-900 uppercase tracking-tight leading-tight">Ringkasan Bisnis</h2>
            <p className="hidden md:block text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Panel Kontrol Penjualan</p>
          </div>
        </div>

        <div className="flex bg-zinc-100 p-0.5 md:p-1 rounded-lg md:rounded-xl">
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
                "flex-1 sm:flex-initial px-2.5 md:px-4 py-1 md:py-1.5 rounded-md md:rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer",
                timeWindow === w.id ? "bg-white text-blue-600 shadow-xs" : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {timeWindow !== 'total' && (
        <div className="flex items-center justify-center gap-3 bg-white px-2 py-1 md:p-2 rounded-lg md:rounded-xl border border-zinc-200/70">
          <button onClick={() => navigateDate(-1)} className="p-1 md:p-1.5 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
          <span className="text-[11px] md:text-xs font-black uppercase tracking-wider text-zinc-700">{getFormattedRange()}</span>
          <button onClick={() => navigateDate(1)} className="p-1 md:p-1.5 hover:bg-zinc-100 rounded-md transition-colors cursor-pointer"><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-5">
        <div className="card flex flex-col gap-0.5 md:gap-1 border-l-4 border-l-blue-600 bg-white p-2.5 md:p-4">
          <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-wider">Omzet</span>
          <span className="text-xs md:text-2xl font-black font-mono tabular-nums text-zinc-900 truncate">{formatCurrency(totalRevenue)}</span>
          <div className="hidden md:flex text-[10px] text-zinc-400 font-bold mt-1 uppercase items-center gap-1"><Calendar className="w-3 h-3" /> {timeWindow}</div>
        </div>
        <div className="card flex flex-col gap-0.5 md:gap-1 border-l-4 border-l-green-600 bg-white p-2.5 md:p-4">
          <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-wider">Profit</span>
          <span className="text-xs md:text-2xl font-black font-mono tabular-nums text-zinc-900 truncate">{formatCurrency(totalProfit)}</span>
          <div className="hidden md:flex text-[10px] text-green-600 font-bold mt-1 uppercase items-center gap-1"><TrendingUp className="w-3 h-3" /> Estimasi Net</div>
        </div>
        <div className="card flex flex-col gap-0.5 md:gap-1 border-l-4 border-l-orange-600 bg-white p-2.5 md:p-4">
          <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-wider">Order Qty</span>
          <span className="text-xs md:text-2xl font-black font-mono tabular-nums text-zinc-900">{filteredSales.length}</span>
          <div className="hidden md:block text-[10px] text-zinc-400 font-bold mt-1 uppercase">Transaksi Berhasil</div>
        </div>
        <div className="card flex flex-col gap-0.5 md:gap-1 border-l-4 border-l-red-600 bg-white p-2.5 md:p-4">
          <span className="text-[9px] md:text-[10px] font-black text-zinc-400 uppercase tracking-wider">Stok Tipis</span>
          <span className={cn("text-xs md:text-2xl font-black font-mono tabular-nums", lowStock > 0 ? "text-red-600" : "text-zinc-900")}>{lowStock}</span>
          <div className="hidden md:block text-[10px] text-zinc-400 font-bold mt-1 uppercase">Item Butuh Restock</div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-2.5 md:gap-6">
        {/* Trend Section */}
        <div className="w-full lg:col-span-8">
          <div className="card space-y-2 md:space-y-4 bg-white overflow-hidden relative p-2.5 md:p-6 shadow-xs">
            <div className="flex justify-between items-center">
              <div className="z-10">
                <h3 className="font-black text-zinc-900 uppercase tracking-tight text-xs md:text-base">{trendLabel()}</h3>
                <p className="hidden md:block text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Visualisasi Performa Penjualan</p>
              </div>
              <BarChart3 className="hidden md:block text-blue-50 w-20 h-20 absolute -right-4 -top-4 opacity-50" />
            </div>
            
            <div className="h-[140px] md:h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={getChartData()} margin={{ top: 6, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '8px 10px', fontSize: '11px' }}
                    formatter={(value: number) => [formatCurrency(value), 'Penjualan']}
                    labelStyle={{ fontWeight: '900', color: '#18181b', marginBottom: '2px', textTransform: 'uppercase', fontSize: '10px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Side Performance Cards */}
        <div className="w-full lg:col-span-4 space-y-2.5 md:space-y-4">
          <div className="card p-2.5 md:p-4 space-y-2 md:space-y-3 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 md:pb-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="text-green-500 w-3.5 h-3.5 md:w-4 md:h-4" />
                <h3 className="font-bold text-xs md:text-sm uppercase tracking-tight">Produk Terlaris</h3>
              </div>
              <span className="text-[9px] font-black text-zinc-400 uppercase">{timeWindow === 'total' ? 'Semua' : timeWindow}</span>
            </div>
            <div className="space-y-1.5 md:space-y-2.5">
              {hotProducts.length > 0 ? hotProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-zinc-800 truncate">{p.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono tabular-nums font-bold text-zinc-500">{p.sold}x</span>
                    <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded text-[9px] font-black">TOP</span>
                  </div>
                </div>
              )) : (
                <div className="py-3 text-center text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Data Kosong</div>
              )}
            </div>
          </div>

          <div className="card p-2.5 md:p-4 space-y-2 md:space-y-3 border-dashed border-zinc-200 bg-zinc-50/40 shadow-none border">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 md:pb-2.5">
              <div className="flex items-center gap-1.5">
                <TrendingDown className="text-red-400 w-3.5 h-3.5 md:w-4 md:h-4" />
                <h3 className="font-bold text-xs md:text-sm uppercase tracking-tight text-zinc-600">Butuh Evaluasi</h3>
              </div>
              <span className="text-[9px] font-bold text-zinc-400 uppercase">Terendah</span>
            </div>
            <div className="space-y-1.5 md:space-y-2 opacity-80">
              {coldProducts.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-zinc-600 truncate">{p.name}</span>
                  <span className="text-[10px] font-mono tabular-nums text-zinc-400 font-bold shrink-0">{p.sold} terjual</span>
                </div>
              ))}
            </div>
          </div>

          {lowStock > 0 && (
            <div className="card p-2.5 md:p-4 space-y-2 md:space-y-3 border-red-100 bg-red-50/30">
              <div className="flex items-center gap-1.5 border-b border-red-100 pb-1.5 md:pb-2.5">
                <PackagePlus className="text-red-600 w-3.5 h-3.5 md:w-4 md:h-4" />
                <h3 className="font-bold text-xs md:text-sm uppercase tracking-tight text-red-700">Restock Segera</h3>
              </div>
              <div className="space-y-1.5 md:space-y-2">
                {lowStockProducts.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-bold text-zinc-800 truncate">{p.name}</span>
                    <div className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-black font-mono tabular-nums shrink-0">
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

