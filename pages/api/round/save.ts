import type { NextApiRequest, NextApiResponse } from "next";
import { loadUsers, saveUsers } from "../../../lib/users";
import { verifyUserSignature } from "../../../lib/verify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔍 DEBUG: Gelen isteğin metodunu logla
  console.log(`📡 [API] Gelen İstek Metodu: ${req.method}`);

  // 1. CORS Preflight (OPTIONS) isteklerine izin ver
  // Tarayıcılar POST atmadan önce "Atabilir miyim?" diye sorar.
  if (req.method === "OPTIONS") {
     return res.status(200).end();
  }

  // 2. Sadece POST isteğine izin ver
  if (req.method !== "POST") {
    console.warn(`⚠️ [API] Method Not Allowed. Gelen: ${req.method}`);
    return res.status(405).json({ 
        ok: false, 
        error: `Method not allowed. Beklenen: POST, Gelen: ${req.method}` 
    });
  }

  try {
    // 3. Verileri Al
    const { userId, nextRound, activeRound, currentRound, signature, message } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    // 🔒 GÜVENLİK KONTROLÜ
    
    // A. İmza Kontrolü
    if (!signature) {
      return res.status(401).json({ ok: false, error: "Signature required. Please sign the transaction in your wallet." });
    }

    // B. Mesaj Formatı Kontrolü
    if (!message || typeof message !== 'string' || !message.startsWith('Flip Royale:')) {
      console.warn(`[Security] Invalid message format received: ${message}`);
      return res.status(400).json({ ok: false, error: "Invalid message format." });
    }

    // C. İmza Doğrulama (Signature Verification)
    const isValid = await verifyUserSignature(userId, message, signature);

    if (!isValid) {
      console.warn(`[Security] Invalid signature attempt for user ${userId}`);
      return res.status(403).json({ ok: false, error: "Invalid signature! You are not authorized to modify this account." });
    }

    // 4. Kullanıcıyı Yükle
    const users = await loadUsers();
    
    // 🛠️ FIX: Büyük/Küçük Harf duyarlılığını ortadan kaldırıyoruz.
    const normalizedUserId = userId.toLowerCase(); 
    const user = users[normalizedUserId];

    // 🕵️ DEBUG LOGLARI (VERCEL HATASI İÇİN)
    if (!user) {
        console.log("------------------------------------------------");
        console.log("🚨 [DEBUG] HATA: Kullanıcı Bulunamadı!");
        console.log(`👉 Aranan ID (Frontend): ${userId}`);
        console.log(`👉 Aranan ID (Lowercase): ${normalizedUserId}`);
        
        const existingKeys = Object.keys(users);
        console.log(`📚 Veritabanındaki Toplam Kullanıcı: ${existingKeys.length}`);
        
        if (existingKeys.length > 0) {
            console.log(`🔍 Örnek Mevcut ID'ler: ${existingKeys.slice(0, 5).join(', ')}`);
        } else {
            console.log("⚠️ Veritabanı (users objesi) tamamen BOŞ dönüyor!");
            console.log("⚠️ UYARI: Vercel'de JSON dosyası kullanıyorsanız, veriler silinmiş olabilir.");
        }
        console.log("------------------------------------------------");

        return res.status(404).json({ 
            ok: false, 
            error: "User not found. Please register first." 
        });
    }

    // 5. Verileri Güncelle
    let updated = false;

    if (nextRound !== undefined) {
      user.nextRound = nextRound;
      updated = true;
    }

    if (activeRound !== undefined) {
      // Active round güncellemesi (genellikle Lock işlemi için)
      user.activeRound = activeRound;
      updated = true;
    }

    if (currentRound !== undefined) {
      user.currentRound = currentRound;
      updated = true;
    }

    if (updated) {
        user.updatedAt = new Date().toISOString();
        
        // 6. Kaydet
        await saveUsers(users);
        
        // Güvenli Loglama (TypeScript hatasını önlemek için 'any' cast yapıyoruz)
        const userNameLog = (user as any).name || (user as any).username || normalizedUserId;
        console.log(`✅ [Game] Success: Data saved for ${userNameLog}`);
    } else {
        console.log(`ℹ️ [Game] No changes detected for ${normalizedUserId}`);
    }

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error("❌ Save API Critical Error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
  }
}
