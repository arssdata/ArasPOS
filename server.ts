import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "data.json");

  app.use(express.json({ limit: '50mb' }));

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // API routes
  app.post("/api/ai/parse-orders", async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(500).json({
        error: "GEMINI_API_KEY belum dikonfigurasi. Silakan periksa Settings > Secrets.",
      });
    }

    const { rawText, products = [], customers = [] } = req.body || {};
    if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
      return res.status(400).json({ error: "Teks order tidak boleh kosong." });
    }

    try {
      const catalogList = (Array.isArray(products) ? products : []).map((p: any) => ({
        sku: p.sku,
        name: p.name,
        price: p.price,
        category: p.category,
      }));

      const customerList = (Array.isArray(customers) ? customers : []).map((c: any) => ({
        name: c.name,
        phone: c.phone || "",
        address: c.address || "",
      }));

      const systemInstruction = [
        "Anda adalah modul pembaca pesanan WhatsApp dan chat pelanggan untuk sistem POS UMKM Indonesia (WiraPOS).",
        "Tugas Anda adalah membaca teks chat WhatsApp / catatan pesanan yang tidak terstruktur (bisa berisi 1 atau banyak pesanan sekaligus) dan menerjemahkannya ke format pesanan standar.",
        "Aturan pencocokan PRODUK & SKU:",
        "1. Cocokkan setiap item pesanan dengan katalog produk yang tersedia berdasarkan nama produk, singkatan umum (misal 'ks'/'selam'/'kapal selam', 'keju', 'tahu', 'lenjer', 'campur', 'otak2'), atau SKU.",
        "2. Jika item cocok dengan produk di katalog, wajib isi `sku` persis seperti di katalog, `matchedProductName` sesuai nama katalog, dan `isMatched: true`.",
        "3. Jika item benar-benar tidak ditemukan di katalog, isi `sku` dengan teks ringkas item atau 'UNKNOWN', `matchedProductName` dengan nama asli yang diminta, `isMatched: false`, dan tambahkan penjelasan ke `warnings`.",
        "4. Pastikan `quantity` berupa bilangan bulat positif (default 1 jika tidak disebut).",
        "Aturan pencocokan PELANGGAN, NO. HP, ALAMAT & KURIR:",
        "1. Ekstrak `customerName`, `customerPhone`, `customerAddress`, dan `deliveryMode` (misal Paxel, Gojek, Grab, JNE, OTS, Rumah Ibun, Pick up). Jika kurir tidak disebut, isi 'Pick up'.",
        "2. Cocokkan nama atau nomor HP dengan daftar pelanggan tersimpan (`customers`). Jika pelanggan ada di daftar dan nomor HP atau alamat tidak tertulis di chat, lengkapi dari daftar pelanggan. Jika chat menuliskan nomor HP atau alamat secara eksplisit, prioritaskan data dari chat.",
        "3. Jangan mengarang nomor HP atau alamat jika tidak ada di chat maupun di daftar pelanggan—kembalikan string kosong `\"\"`.",
        "4. Bersihkan simbol pipe `|` di dalam nama, nomor HP, atau alamat agar tidak merusak format kolom.",
      ].join("\n");

      const prompt = [
        "KATALOG PRODUK (SKU | Nama | Harga):",
        JSON.stringify(catalogList),
        "",
        "DAFTAR PELANGGAN TERSIMPAN:",
        JSON.stringify(customerList),
        "",
        "TEKS PESANAN / CHAT WHATSAPP:",
        rawText.trim(),
      ].join("\n");

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              orders: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    customerName: { type: Type.STRING, description: "Nama pelanggan" },
                    customerPhone: { type: Type.STRING, description: "Nomor telepon/WhatsApp pelanggan atau string kosong" },
                    customerAddress: { type: Type.STRING, description: "Alamat pengiriman lengkap atau string kosong" },
                    deliveryMode: { type: Type.STRING, description: "Mode pengiriman/kurir, misal Gojek, Paxel, OTS, Pick up" },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          sku: { type: Type.STRING, description: "SKU persis dari katalog" },
                          matchedProductName: { type: Type.STRING, description: "Nama produk dari katalog" },
                          quantity: { type: Type.INTEGER, description: "Jumlah pesanan" },
                          rawItemText: { type: Type.STRING, description: "Teks asli item dari chat" },
                          isMatched: { type: Type.BOOLEAN, description: "True jika SKU ditemukan di katalog" },
                        },
                        required: ["sku", "matchedProductName", "quantity", "rawItemText", "isMatched"],
                      },
                    },
                  },
                  required: ["customerName", "customerPhone", "customerAddress", "deliveryMode", "items"],
                },
              },
              warnings: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Peringatan jika ada item tidak dikenal atau info ambigu",
              },
            },
            required: ["orders", "warnings"],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? "{}").trim());
      const orders = Array.isArray(parsed.orders) ? parsed.orders : [];
      const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];

      const sanitizeField = (val: string) => (val || "").replace(/\|/g, "/").replace(/\r?\n/g, ", ").trim();

      const standardLines = orders.map((order: any) => {
        const name = sanitizeField(order.customerName) || "Pelanggan Online";
        const itemsStr = (Array.isArray(order.items) ? order.items : [])
          .map((item: any) => `${sanitizeField(item.sku || "UNKNOWN")}:${Math.max(1, parseInt(item.quantity, 10) || 1)}`)
          .join(", ");
        const delivery = sanitizeField(order.deliveryMode) || "Pick up";
        const phone = sanitizeField(order.customerPhone);
        const address = sanitizeField(order.customerAddress);

        if (phone || address) {
          return `${name} | ${itemsStr} | ${delivery} | ${phone} | ${address}`;
        }
        return `${name} | ${itemsStr} | ${delivery}`;
      });

      return res.json({
        orders,
        warnings,
        standardFormatText: standardLines.join("\n"),
      });
    } catch (error: any) {
      console.error("Gemini parse-orders error:", error);
      const status = error?.status || 500;
      let message = error?.message || "Gagal memproses chat dengan AI.";
      if (status === 403 || status === 400 || message.includes("API_KEY_INVALID") || message.includes("PERMISSION_DENIED")) {
        message = "API Key Gemini tidak valid atau ditolak. Periksa Settings > Secrets.";
      } else if (status === 429 || message.includes("RESOURCE_EXHAUSTED")) {
        message = "Kuota API Gemini tercapai. Silakan coba lagi beberapa saat atau periksa billing API Key.";
      }
      return res.status(status >= 400 && status < 600 ? status : 500).json({ error: message });
    }
  });

  app.get("/api/data", (req, res) => {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        res.json(JSON.parse(data));
      } catch (e) {
        console.error("Error parsing data.json:", e);
        res.status(500).json({ error: "Internal Server Error: Invalid data file" });
      }
    } else {
      res.json({});
    }
  });

  app.post("/api/data", (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ status: "ok" });
  });

  const isProduction = 
    process.env.NODE_ENV === "production" || 
    (!!process.argv[1] && (process.argv[1].endsWith(".cjs") || process.argv[1].includes("dist/")));

  // Vite middleware for development
  if (!isProduction) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });

      if (vite.config.server.hmr === false) {
        app.get("/@vite/client", async (req, res, next) => {
          try {
            const result = await vite.transformRequest(req.originalUrl);
            if (!result) {
              return next();
            }
            const code = result.code.replace(
              "const createWebSocketModuleRunnerTransport = (options) => {",
              "const createWebSocketModuleRunnerTransport = () => ({ async connect() {}, async disconnect() {}, send() {} }); const _unusedCreateWebSocketModuleRunnerTransport = (options) => {"
            );
            res.status(200).set({
              "Content-Type": "application/javascript; charset=utf-8",
              "Cache-Control": "no-cache",
            });
            return res.send(code);
          } catch (err) {
            return next(err);
          }
        });
      }

      app.use(vite.middlewares);
    } catch (e) {
      console.error("Vite not found, falling back to static production mode");
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
