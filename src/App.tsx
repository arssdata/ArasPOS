import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { 
  LayoutDashboard, Store, Package, History, Settings, LogOut, Menu, X, Plus, Search, Trash2, 
  ShoppingCart, Printer, CheckCircle2, ChevronRight, ChevronLeft, CreditCard, Wallet, Banknote, 
  ClipboardList, PackagePlus, Truck, CheckCircle, Download, Save, QrCode, Coffee, Layout, BarChart3, TrendingUp, TrendingDown, ClipboardCheck, Utensils, Clock, ArrowRight, RotateCcw, Calendar, Filter
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, 
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';

import { Login } from './components/Login';
import { DashboardView } from './components/Dashboard';
import { POSView } from './components/POS';
import { InventoryView } from './components/Inventory';
import { OnlineView } from './components/Online';
import { HistoryView } from './components/History';
import { SettingsView } from './components/Settings';
import { KitchenMonitorView } from './components/Kitchen';
import { formatCurrency, generateId, generateOrderCode, cn } from './lib/utils';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, addMonths, isSameMonth, subDays, addDays, startOfDay, endOfDay, isWithinInterval, startOfWeek, endOfWeek, eachDayOfInterval, eachWeekOfInterval, isSameWeek, addWeeks, subWeeks } from 'date-fns';
import { Product, CartItem, Sale, ActiveOrder, ShopInfo, Preorder, View, Milestone } from './types';
import { collection, onSnapshot, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './lib/firebase';


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
  const [products, setProductsState] = useState<Product[]>(INITIAL_PRODUCTS);
  const [sales, setSalesState] = useState<Sale[]>([]);
  const [preorders, setPreordersState] = useState<Preorder[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Background Firestore sync helpers
  const syncProductsToFirestore = async (next: Product[]) => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'products'));
      const existingIds = snapshot.docs.map(d => d.id);
      const nextIds = next.map(p => p.id);
      
      existingIds.forEach(id => {
        if (!nextIds.includes(id)) {
          batch.delete(doc(db, 'products', id));
        }
      });
      next.forEach(p => {
        batch.set(doc(db, 'products', p.id), p);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to sync products:", err);
    }
  };

  const syncSalesToFirestore = async (next: Sale[]) => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'sales'));
      const existingIds = snapshot.docs.map(d => d.id);
      const nextIds = next.map(s => s.id);
      
      existingIds.forEach(id => {
        if (!nextIds.includes(id)) {
          batch.delete(doc(db, 'sales', id));
        }
      });
      next.forEach(s => {
        batch.set(doc(db, 'sales', s.id), s);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to sync sales:", err);
    }
  };

  const syncPreordersToFirestore = async (next: Preorder[]) => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'preorders'));
      const existingIds = snapshot.docs.map(d => d.id);
      const nextIds = next.map(p => p.id);
      
      existingIds.forEach(id => {
        if (!nextIds.includes(id)) {
          batch.delete(doc(db, 'preorders', id));
        }
      });
      next.forEach(p => {
        batch.set(doc(db, 'preorders', p.id), p);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to sync preorders:", err);
    }
  };

  const syncActiveOrdersToFirestore = async (next: ActiveOrder[]) => {
    try {
      const batch = writeBatch(db);
      const snapshot = await getDocs(collection(db, 'activeOrders'));
      const existingIds = snapshot.docs.map(d => d.id);
      const nextIds = next.map(a => a.id);
      
      existingIds.forEach(id => {
        if (!nextIds.includes(id)) {
          batch.delete(doc(db, 'activeOrders', id));
        }
      });
      next.forEach(a => {
        batch.set(doc(db, 'activeOrders', a.id), a);
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to sync activeOrders:", err);
    }
  };

  const syncShopInfoToFirestore = async (next: ShopInfo) => {
    try {
      await setDoc(doc(db, 'shopInfo', 'settings'), next);
    } catch (err) {
      console.error("Failed to sync shopInfo:", err);
    }
  };

  const setProducts = useCallback((newProductsOrUpdater: Product[] | ((prev: Product[]) => Product[])) => {
    setProductsState((prev) => {
      const next = typeof newProductsOrUpdater === 'function' ? newProductsOrUpdater(prev) : newProductsOrUpdater;
      syncProductsToFirestore(next);
      return next;
    });
  }, []);

  const setSales = useCallback((newSalesOrUpdater: Sale[] | ((prev: Sale[]) => Sale[])) => {
    setSalesState((prev) => {
      const next = typeof newSalesOrUpdater === 'function' ? newSalesOrUpdater(prev) : newSalesOrUpdater;
      syncSalesToFirestore(next);
      return next;
    });
  }, []);

  const setPreorders = useCallback((newPreordersOrUpdater: Preorder[] | ((prev: Preorder[]) => Preorder[])) => {
    setPreordersState((prev) => {
      const next = typeof newPreordersOrUpdater === 'function' ? newPreordersOrUpdater(prev) : newPreordersOrUpdater;
      syncPreordersToFirestore(next);
      return next;
    });
  }, []);


  const downloadAsPNG = useCallback(async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert(`Error: Elemen ${elementId} tidak ditemukan.`);
      return;
    }
    
    setIsDownloading(true);
    
    // Temporarily replace oklch/oklab in original document style tags to prevent html2canvas parsing errors
    const originalStyles = new Map<HTMLStyleElement, string>();
    try {
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach((styleTag) => {
        if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
          originalStyles.set(styleTag, styleTag.textContent);
          styleTag.textContent = styleTag.textContent
            .replace(/oklch\([^)]+\)/g, 'rgb(120, 120, 120)')
            .replace(/oklab\([^)]+\)/g, 'rgb(120, 120, 120)');
        }
      });
    } catch (styleErr) {
      console.error('Error pre-cleaning original styles:', styleErr);
    }

    try {
      // Alert untuk memastikan tombol bekerja
      console.log(`Starting download for ${elementId}...`);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Robust cleanup for oklch and oklab colors across style tags, inline styles, and stylesheet rules
          try {
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach((s) => {
              if (s.textContent && (s.textContent.includes('oklch') || s.textContent.includes('oklab'))) {
                s.textContent = s.textContent
                  .replace(/oklch\([^)]+\)/g, 'rgb(120, 120, 120)')
                  .replace(/oklab\([^)]+\)/g, 'rgb(120, 120, 120)');
              }
            });
          } catch (e) {
            console.error('Error cleaning style tags:', e);
          }

          try {
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el: any) => {
              if (el.style) {
                for (let i = 0; i < el.style.length; i++) {
                  const prop = el.style[i];
                  const val = el.style.getPropertyValue(prop);
                  if (val && (val.includes('oklch') || val.includes('oklab'))) {
                    el.style.setProperty(prop, 'rgb(120, 120, 120)');
                  }
                }
              }
            });
          } catch (e) {
            console.error('Error cleaning inline styles:', e);
          }

          try {
            const sheets = clonedDoc.styleSheets;
            for (let i = 0; i < sheets.length; i++) {
              const sheet = sheets[i];
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];
                    if (rule && 'style' in rule) {
                      const styleRule = rule as any;
                      if (styleRule.style) {
                        for (let k = 0; k < styleRule.style.length; k++) {
                          const prop = styleRule.style[k];
                          const val = styleRule.style.getPropertyValue(prop);
                          if (val && (val.includes('oklch') || val.includes('oklab'))) {
                            styleRule.style.setProperty(prop, 'rgb(120, 120, 120)');
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore cross-origin stylesheet errors
              }
            }
          } catch (globalE) {
            console.error('Error cleaning stylesheets:', globalE);
          }

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            /* Base reset for high-fidelity captured documents */
            body {
              background-color: rgb(255, 255, 255) !important;
              color: rgb(9, 9, 11) !important;
            }
            .print-area-root {
              background-color: rgb(255, 255, 255) !important;
              color: rgb(9, 9, 11) !important;
            }
            
            /* Background styles */
            .bg-zinc-950 {
              background-color: rgb(9, 9, 11) !important;
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-950 * {
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-900, .bg-black {
              background-color: rgb(24, 24, 27) !important;
            }
            .bg-zinc-900 *, .bg-black * {
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-100 {
              background-color: rgb(244, 244, 245) !important;
            }
            .bg-zinc-50 {
              background-color: rgb(250, 250, 250) !important;
            }
            .bg-zinc-50\\/50 {
              background-color: rgb(252, 252, 253) !important;
            }
            .bg-blue-50 {
              background-color: rgb(239, 246, 255) !important;
            }
            .bg-green-50 {
              background-color: rgb(240, 253, 244) !important;
            }
            .bg-zinc-200 {
              background-color: rgb(228, 228, 231) !important;
            }
            
            /* Text colors */
            .text-white {
              color: rgb(255, 255, 255) !important;
            }
            .text-zinc-900, .text-black, .text-zinc-800, .text-zinc-850 {
              color: rgb(9, 9, 11) !important;
            }
            .text-zinc-500 {
              color: rgb(113, 113, 122) !important;
            }
            .text-zinc-400 {
              color: rgb(161, 161, 170) !important;
            }
            .text-blue-600 {
              color: rgb(37, 99, 235) !important;
            }
            .text-green-700, .text-green-600 {
              color: rgb(22, 163, 74) !important;
            }
            
            /* Border colors and styles */
            .border, .border-t, .border-b, .border-l, .border-r {
              border-color: rgb(212, 212, 216) !important; /* fallback border-zinc-300 */
            }
            .border-zinc-900, .border-black {
              border-color: rgb(9, 9, 11) !important;
            }
            .border-zinc-400 {
              border-color: rgb(161, 161, 170) !important;
            }
            .border-zinc-300 {
              border-color: rgb(212, 212, 216) !important;
            }
            .border-zinc-200, .border-zinc-200\\/60 {
              border-color: rgb(228, 228, 231) !important;
            }
            .border-dashed {
              border-style: dashed !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
       canvas.toBlob((blob) => {
        if (!blob) {
          alert('Gagal membuat file gambar.');
          setIsDownloading(false);
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
         link.download = `${fileName}.png`;
        link.href = url;
        
        // Tambahkan ke body untuk kompatibilitas browser mobile tertentu
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        setIsDownloading(false);
       }, 'image/png');
      
    } catch (error) {
       console.error('Download PNG failed:', error);
      alert(`Terjadi kesalahan: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDownloading(false);
    } finally {
      // Restore original styles
      try {
        originalStyles.forEach((originalContent, styleTag) => {
          styleTag.textContent = originalContent;
        });
      } catch (restoreErr) {
        console.error('Error restoring original styles:', restoreErr);
      }
    }
  }, []);

  const downloadAsPDF = useCallback(async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert(`Error: Element ${elementId} tidak ditemukan.`);
      return;
    }

    setIsDownloading(true);

    // Temporarily replace oklch/oklab in original document style tags to prevent html2canvas parsing errors
    const originalStyles = new Map<HTMLStyleElement, string>();
    try {
      const styleTags = document.querySelectorAll('style');
      styleTags.forEach((styleTag) => {
        if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
          originalStyles.set(styleTag, styleTag.textContent);
          styleTag.textContent = styleTag.textContent
            .replace(/oklch\([^)]+\)/g, 'rgb(120, 120, 120)')
            .replace(/oklab\([^)]+\)/g, 'rgb(120, 120, 120)');
        }
      });
    } catch (styleErr) {
      console.error('Error pre-cleaning original styles:', styleErr);
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Robust cleanup for oklch and oklab colors across style tags, inline styles, and stylesheet rules
          try {
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach((s) => {
              if (s.textContent && (s.textContent.includes('oklch') || s.textContent.includes('oklab'))) {
                s.textContent = s.textContent
                  .replace(/oklch\([^)]+\)/g, 'rgb(120, 120, 120)')
                  .replace(/oklab\([^)]+\)/g, 'rgb(120, 120, 120)');
              }
            });
          } catch (e) {
            console.error('Error cleaning style tags:', e);
          }

          try {
            const allElements = clonedDoc.querySelectorAll('*');
            allElements.forEach((el: any) => {
              if (el.style) {
                for (let i = 0; i < el.style.length; i++) {
                  const prop = el.style[i];
                  const val = el.style.getPropertyValue(prop);
                  if (val && (val.includes('oklch') || val.includes('oklab'))) {
                    el.style.setProperty(prop, 'rgb(120, 120, 120)');
                  }
                }
              }
            });
          } catch (e) {
            console.error('Error cleaning inline styles:', e);
          }

          try {
            const sheets = clonedDoc.styleSheets;
            for (let i = 0; i < sheets.length; i++) {
              const sheet = sheets[i];
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (rules) {
                  for (let j = 0; j < rules.length; j++) {
                    const rule = rules[j];
                    if (rule && 'style' in rule) {
                      const styleRule = rule as any;
                      if (styleRule.style) {
                        for (let k = 0; k < styleRule.style.length; k++) {
                          const prop = styleRule.style[k];
                          const val = styleRule.style.getPropertyValue(prop);
                          if (val && (val.includes('oklch') || val.includes('oklab'))) {
                            styleRule.style.setProperty(prop, 'rgb(120, 120, 120)');
                          }
                        }
                      }
                    }
                  }
                }
              } catch (e) {
                // Ignore cross-origin stylesheet errors
              }
            }
          } catch (globalE) {
            console.error('Error cleaning stylesheets:', globalE);
          }

          const style = clonedDoc.createElement('style');
          style.innerHTML = `
            /* Base reset for high-fidelity captured documents */
            body {
              background-color: rgb(255, 255, 255) !important;
              color: rgb(9, 9, 11) !important;
            }
            .print-area-root {
              background-color: rgb(255, 255, 255) !important;
              color: rgb(9, 9, 11) !important;
            }
            
            /* Background styles */
            .bg-zinc-950 {
              background-color: rgb(9, 9, 11) !important;
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-950 * {
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-900, .bg-black {
              background-color: rgb(24, 24, 27) !important;
            }
            .bg-zinc-900 *, .bg-black * {
              color: rgb(255, 255, 255) !important;
            }
            .bg-zinc-100 {
              background-color: rgb(244, 244, 245) !important;
            }
            .bg-zinc-50 {
              background-color: rgb(250, 250, 250) !important;
            }
            .bg-zinc-50\\/50 {
              background-color: rgb(252, 252, 253) !important;
            }
            .bg-blue-50 {
              background-color: rgb(239, 246, 255) !important;
            }
            .bg-green-50 {
              background-color: rgb(240, 253, 244) !important;
            }
            .bg-zinc-200 {
              background-color: rgb(228, 228, 231) !important;
            }
            
            /* Text colors */
            .text-white {
              color: rgb(255, 255, 255) !important;
            }
            .text-zinc-900, .text-black, .text-zinc-800, .text-zinc-850 {
              color: rgb(9, 9, 11) !important;
            }
            .text-zinc-500 {
              color: rgb(113, 113, 122) !important;
            }
            .text-zinc-400 {
              color: rgb(161, 161, 170) !important;
            }
            .text-blue-600 {
              color: rgb(37, 99, 235) !important;
            }
            .text-green-700, .text-green-600 {
              color: rgb(22, 163, 74) !important;
            }
            
            /* Border colors and styles */
            .border, .border-t, .border-b, .border-l, .border-r {
              border-color: rgb(212, 212, 216) !important; /* fallback border-zinc-300 */
            }
            .border-zinc-900, .border-black {
              border-color: rgb(9, 9, 11) !important;
            }
            .border-zinc-400 {
              border-color: rgb(161, 161, 170) !important;
            }
            .border-zinc-300 {
              border-color: rgb(212, 212, 216) !important;
            }
            .border-zinc-200, .border-zinc-200\\/60 {
              border-color: rgb(228, 228, 231) !important;
            }
            .border-dashed {
              border-style: dashed !important;
            }
          `;
          clonedDoc.head.appendChild(style);
        }
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${fileName}.pdf`);
      setIsDownloading(false);
    } catch (error) {
      console.error('Download PDF failed:', error);
      alert(`Terjadi kesalahan saat mengunduh PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDownloading(false);
    } finally {
      // Restore original styles
      try {
        originalStyles.forEach((originalContent, styleTag) => {
          styleTag.textContent = originalContent;
        });
      } catch (restoreErr) {
        console.error('Error restoring original styles:', restoreErr);
      }
    }
  }, []);
  const [activeOrders, setActiveOrdersState] = useState<ActiveOrder[]>([]);
  const [shopInfo, setShopInfoState] = useState<ShopInfo>({
    name: 'Warung Berkah UMKM',
    address: 'Jl. Merdeka No. 123, Jakarta',
    phone: '0812-3456-7890',
    message: 'Terima kasih telah berbelanja!',
    bankAccounts: []
  });

  const setActiveOrders = useCallback((newActiveOrdersOrUpdater: ActiveOrder[] | ((prev: ActiveOrder[]) => ActiveOrder[])) => {
    setActiveOrdersState((prev) => {
      const next = typeof newActiveOrdersOrUpdater === 'function' ? newActiveOrdersOrUpdater(prev) : newActiveOrdersOrUpdater;
      syncActiveOrdersToFirestore(next);
      return next;
    });
  }, []);

  const setShopInfo = useCallback((newShopInfoOrUpdater: ShopInfo | ((prev: ShopInfo) => ShopInfo)) => {
    setShopInfoState((prev) => {
      const next = typeof newShopInfoOrUpdater === 'function' ? newShopInfoOrUpdater(prev) : newShopInfoOrUpdater;
      syncShopInfoToFirestore(next);
      return next;
    });
  }, []);

  // Listen to Firestore changes for real-time multi-device synchronization
  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      if (snapshot.empty) {
        // If Firestore products collection is empty, seed it with INITIAL_PRODUCTS
        syncProductsToFirestore(INITIAL_PRODUCTS);
        return;
      }
      const items: Product[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as Product);
      });
      // Sort alphabetically by name
      items.sort((a, b) => a.name.localeCompare(b.name));
      setProductsState(items);
    }, (err) => console.error("Firestore products listen error:", err));

    const unsubSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const items: Sale[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as Sale);
      });
      // Sort by date descending (newest sales first)
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSalesState(items);
    }, (err) => console.error("Firestore sales listen error:", err));

    const unsubPreorders = onSnapshot(collection(db, 'preorders'), (snapshot) => {
      const items: Preorder[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as Preorder);
      });
      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPreordersState(items);
    }, (err) => console.error("Firestore preorders listen error:", err));

    const unsubActiveOrders = onSnapshot(collection(db, 'activeOrders'), (snapshot) => {
      const items: ActiveOrder[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as ActiveOrder);
      });
      // Keep active orders in consistent order
      items.sort((a, b) => a.id.localeCompare(b.id));
      setActiveOrdersState(items);
    }, (err) => console.error("Firestore activeOrders listen error:", err));

    const unsubShopInfo = onSnapshot(doc(db, 'shopInfo', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        setShopInfoState(docSnap.data() as ShopInfo);
      } else {
        // Seed default shop info if not exists
        const defaultShopInfo = {
          name: 'Warung Berkah UMKM',
          address: 'Jl. Merdeka No. 123, Jakarta',
          phone: '0812-3456-7890',
          message: 'Terima kasih telah berbelanja!',
          bankAccounts: []
        };
        syncShopInfoToFirestore(defaultShopInfo);
      }
    }, (err) => console.error("Firestore shopInfo listen error:", err));

    return () => {
      unsubProducts();
      unsubSales();
      unsubPreorders();
      unsubActiveOrders();
      unsubShopInfo();
    };
  }, []);

  useEffect(() => {
    document.title = shopInfo.name || 'ArasPOS';
  }, [shopInfo.name]);


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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const handleSaveSettings = () => {
    setShopInfo(tempShopInfo);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleLogin = (password: string) => {
    // Default PIN: 1234 or admin123. If systemPin is set in shopInfo, use it.
    const systemPin = shopInfo.systemPin || '1234';
    if (password === systemPin || password === 'admin123') {
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
      <Login 
        shopInfo={shopInfo} 
        loginPassword={loginPassword} 
        setLoginPassword={setLoginPassword} 
        onLogin={handleLogin} 
      />
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
        <div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 w-full max-w-sm shadow-sm relative overflow-hidden"
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
        </div>

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
        <div className="flex flex-col items-center bg-zinc-900 text-white p-6 md:p-10 rounded-[3rem] w-full max-w-lg shadow-sm relative border-4 border-white">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white px-8 py-3 rounded-full font-black uppercase tracking-widest shadow-sm border-4 border-zinc-950">
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
          {isSidebarOpen && <span className="font-bold text-lg tracking-tight leading-tight whitespace-normal break-words">{shopInfo.name}</span>}
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
         <header className="hidden md:flex h-16 bg-white border-b border-zinc-200 items-center justify-between px-4 md:px-8 sticky top-0 z-10 gap-2 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="md:hidden w-8 h-8 bg-blue-600 rounded-lg flex flex-shrink-0 items-center justify-center text-white font-bold text-xs">
              {shopInfo.name.charAt(0)}
            </div>
             <h1 className="font-semibold text-sm md:text-lg leading-tight whitespace-normal max-w-[150px] md:max-w-[50%]">
               <span className="hidden md:inline">
                 {isSidebarOpen ? navItems.find(i => i.id === view)?.label : ''}
               </span>
               <span className="hidden">{navItems.find(i => i.id === view)?.label}</span>
             </h1>
           </div>
           
           <div className="flex items-center gap-2 md:gap-4">
            {view === 'settings' && (
              <div className="flex items-center gap-2 md:gap-3">
                <div>
                  {saveSuccess && (
                    <div 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="hidden sm:flex text-[10px] md:text-xs font-bold text-green-600 items-center gap-1.5 bg-green-50 px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-green-100"
                    >
                      <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5" /> Tersimpan!
                    </div>
                  )}
                </div>
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
          <div>
            <div
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
                  isDownloading={isDownloading}
                  downloadAsPNG={downloadAsPNG}
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
                   downloadAsPNG={downloadAsPNG}
                   downloadAsPDF={downloadAsPDF}
                   isDownloading={isDownloading}
                 />
               )}
              {view === 'dashboard' && (
                <DashboardView sales={sales} products={products} />
              )}
              {view === 'history' && (
                <HistoryView 
                  sales={sales} 
                  shopInfo={shopInfo} 
                  downloadAsPNG={downloadAsPNG}
                  isDownloading={isDownloading}
                />
              )}
              {view === 'settings' && (
                <SettingsView 
                  shopInfo={tempShopInfo} 
                  setShopInfo={setTempShopInfo} 
                  onResetData={resetDatabase}
                  products={products}
                  setProducts={setProducts}
                />
              )}
            </div>
          </div>
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


