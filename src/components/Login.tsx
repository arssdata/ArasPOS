import React, { useState } from 'react';
import { Store, ArrowRight } from 'lucide-react';
import { ShopInfo } from '../types';

interface LoginProps {
  shopInfo: ShopInfo;
  onLogin: (password: string) => void;
  loginPassword: string;
  setLoginPassword: (val: string) => void;
}

export const Login = ({ shopInfo, onLogin, loginPassword, setLoginPassword }: LoginProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginPassword);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 w-full max-w-sm shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-blue-600 rounded-lg mx-auto flex items-center justify-center mb-4 shadow-sm shadow-blue-500/20">
            <Store className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">{shopInfo.name}</h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest leading-relaxed">Sistem POS & Inventory Pintar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pl-1">PIN / Password</label>
            <input 
              type="password"
              autoFocus
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              placeholder="••••"
              className="w-full p-4 bg-zinc-50 border border-zinc-100 rounded-lg text-center text-2xl tracking-[0.5em] focus:ring-4 focus:ring-blue-600/10 focus:outline-none focus:bg-white transition-all font-mono"
            />
          </div>
          <button type="submit" className="w-full btn btn-primary py-4 rounded-lg flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 font-black tracking-widest">
            MASUK <ArrowRight className="w-5 h-5" />
          </button>
        </form>
        
        <div className="pt-4 text-center">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Demo PIN: 1234</p>
        </div>
      </div>
    </div>
  );
};
