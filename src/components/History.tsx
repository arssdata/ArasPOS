import React, { useState, useEffect } from 'react';
import { Search, Trash2, Printer, Download, Save, Filter, Calendar, ChevronLeft, ChevronRight, X, Clock } from 'lucide-react';
import { formatCurrency, cn, downloadCSV } from '../lib/utils';
import { Sale, ShopInfo, CartItem } from '../types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, addDays, addWeeks, addMonths } from 'date-fns';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

export function HistoryView({ sales, shopInfo, downloadAsPNG, isDownloading }: any) {
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
        'Tipe Order': s.serviceType || 'Online',
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
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-tighter bg-purple-50 text-purple-600">
                    {s.serviceType || 'Online'}
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
          <div className="bg-zinc-100 rounded-lg p-6 w-full max-w-sm shadow-sm relative">
            <button onClick={() => setSelectedSale(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 no-print cursor-pointer"><X /></button>
            <div 
              id="receipt" 
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
                <p className="text-xs text-zinc-500 leading-relaxed" style={{ fontSize: '12px', color: '#71717a', margin: '4px 0 0 0', lineHeight: 1.5 }}>{shopInfo.address}</p>
                <p className="text-xs text-zinc-500" style={{ fontSize: '12px', color: '#71717a', margin: '2px 0 0 0' }}>{shopInfo.phone}</p>
              </div>

              <div className="text-xs space-y-1 py-1 border-b italic" style={{ fontSize: '12px', fontStyle: 'italic', borderBottom: '1px solid #e4e4e7', padding: '8px 0' }}>
                <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Nota: #{selectedSale.id}</span>
                  <span>{format(new Date(selectedSale.date), 'dd/MM/yy HH:mm')}</span>
                </div>
                <div className="flex justify-between font-bold not-italic" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontStyle: 'normal', marginTop: '4px' }}>
                  <span>Kasir: {selectedSale.customerName || 'Staff'}</span>
                  <div className="text-right" style={{ textAlign: 'right' }}>
                    <div>{selectedSale.serviceType || 'Online'}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3 py-2" style={{ padding: '8px 0' }}>
                {selectedSale.items.map((item: CartItem) => (
                  <div key={item.id} className="space-y-0.5" style={{ marginBottom: '6px' }}>
                    <div className="flex justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="font-bold uppercase text-xs" style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '12px' }}>{item.name}</span>
                    </div>
                    <div className="flex justify-between text-xs text-zinc-500" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#71717a' }}>
                      <span>{item.quantity} x {formatCurrency(item.price)}</span>
                      <span>{formatCurrency(item.quantity * item.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 space-y-2 font-bold" style={{ borderTop: '1px solid #18181b', paddingTop: '12px', marginTop: '8px', fontWeight: 700 }}>
                <div className="flex justify-between text-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 900 }}>
                  <span>TOTAL</span>
                  <span>{formatCurrency(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-normal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#71717a', fontWeight: 400, marginTop: '4px' }}>
                  <span>DIBAYAR ({selectedSale.paymentMethod.toUpperCase()})</span>
                  <span>{formatCurrency(selectedSale.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500 font-normal" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#71717a', fontWeight: 400, marginTop: '4px' }}>
                  <span>KEMBALIAN</span>
                  <span>{formatCurrency(selectedSale.change)}</span>
                </div>
              </div>

              <div className="pt-6 border-t text-center text-zinc-400 text-xs italic" style={{ borderTop: '1px solid #e4e4e7', paddingTop: '24px', textAlign: 'center', color: '#a1a1aa', fontSize: '12px', fontStyle: 'italic', marginTop: '16px' }}>
                <p>{shopInfo.message}</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 no-print">
              <button 
                onClick={() => window.print()}
                className="flex-1 btn btn-primary py-3 font-bold shadow-lg"
              >
                <Printer className="w-4 h-4 mr-2" /> Print
              </button>
              <button 
                onClick={() => downloadAsPNG('receipt', `Receipt_${selectedSale.id}`)}
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

