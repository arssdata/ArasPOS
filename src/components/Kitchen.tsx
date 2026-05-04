import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, Trash2, AlertCircle, RotateCcw, Search, CheckCircle, Coffee, Utensils, ClipboardCheck, ArrowRight } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { ActiveOrder, OrderStatus } from '../types';
import { format } from 'date-fns';

export function KitchenMonitorView({ activeOrders, setActiveOrders }: { activeOrders: ActiveOrder[], setActiveOrders: any }) {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-zinc-100 shadow-sm">
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
            "flex flex-col gap-4 p-4 rounded-lg border-2 border-dashed transition-all duration-300",
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
               <div>
                {filtered.map(order => (
                  <div 
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
                  </div>
                ))}
              </div>
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
