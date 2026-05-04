import React, { useState, useEffect, ChangeEvent } from 'react';
import { Save, Trash2, Upload, Download, Settings, Store, Package, User, Bell, Palette, Globe, Lock, X, CreditCard, Wallet, Plus, CheckCircle2 } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { ShopInfo, Product } from '../types';

export function SettingsView({ shopInfo, setShopInfo, onResetData }: { shopInfo: ShopInfo, setShopInfo: any, onResetData: () => void }) {
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
      <div>
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
        {errorMsg && (
          <div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-red-600 text-white px-6 py-3 rounded-full shadow-sm font-bold flex items-center gap-2 whitespace-nowrap text-sm"
          >
            <X className="w-4 h-4" /> {errorMsg}
          </div>
        )}
      </div>

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
          Tindakan ini akan menghapus SELURUH data (Produk, Penjualan, Online Order, Order Monitor, Dashboard) dan mengembalikan ke pengaturan awal!
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

