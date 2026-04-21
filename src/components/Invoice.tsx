import React, { forwardRef } from 'react';
import { CartItem, ShopInfo } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

interface InvoiceProps {
  shopInfo: ShopInfo;
  items: CartItem[];
  total: number;
  amountPaid: number;
  change: number;
  saleId: string;
}

export const Invoice = forwardRef<HTMLDivElement, InvoiceProps>(({
  shopInfo,
  items,
  total,
  amountPaid,
  change,
  saleId,
}, ref) => {
  return (
    <div className="hidden">
      <div ref={ref} className="p-8 w-[80mm] bg-white text-black font-mono text-sm leading-tight">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold uppercase">{shopInfo.name}</h2>
          <p className="text-xs">{shopInfo.address}</p>
          <p className="text-xs">{shopInfo.phone}</p>
        </div>
        
        <div className="border-t border-dashed border-black my-2"></div>
        
        <div className="flex justify-between text-xs mb-2">
          <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
          <span>#{saleId}</span>
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        <div className="space-y-1 mb-4">
          {items.map((item, idx) => (
            <div key={`${item.id}-${idx}`}>
              <div className="flex justify-between">
                <span className="truncate max-w-[50mm]">{item.name}</span>
                <span>{formatCurrency(item.price * item.quantity)}</span>
              </div>
              <div className="text-[10px] text-gray-600">
                {item.quantity} x {formatCurrency(item.price)}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-black my-2"></div>

        <div className="space-y-1">
          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Bayar</span>
            <span>{formatCurrency(amountPaid)}</span>
          </div>
          <div className="flex justify-between text-xs font-bold">
            <span>Kembalian</span>
            <span>{formatCurrency(change)}</span>
          </div>
        </div>

        <div className="border-t border-dashed border-black my-4"></div>

        <div className="text-center text-[10px] italic">
          <p>{shopInfo.message}</p>
          <p className="mt-2 text-xs font-bold font-sans">WiraPOS - Solusi UMKM</p>
        </div>
      </div>
    </div>
  );
});

Invoice.displayName = 'Invoice';
