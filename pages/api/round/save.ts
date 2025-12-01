import type { NextApiRequest, NextApiResponse } from "next";
import { loadUsers, saveUsers } from "../../../lib/users";
import { verifyUserSignature } from "../../../lib/verify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Method Kontrolü
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // 2. Verileri Al
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
    // Hem 'Save Picks' hem de 'Lock Card' işlemlerini kapsaması için 'Flip Royale:' ile başlaması yeterlidir.
    if (!message || typeof message !== 'string' || !message.startsWith('Flip Royale:')) {
      console.warn(`[Security] Invalid message format received: ${message}`);
      return res.status(400).json({ ok: false, error: "Invalid message format." });
    }

    // C. İmza Doğrulama (Signature Verification)
    // ÖNEMLİ: UserId'yi burada verify ederken de orijinal halini kullanabiliriz ama
    // veritabanı sorgusu için mutlaka lowercase yapacağız.
    const isValid = await verifyUserSignature(userId, message, signature);

    if (!isValid) {
      console.warn(`[Security] Invalid signature attempt for user ${userId}`);
      return res.status(403).json({ ok: false, error: "Invalid signature! You are not authorized to modify this account." });
    }

    // 3. Kullanıcıyı Yükle (Veritabanı Bağlantısı)
    const users = await loadUsers();
    
    // 🛠️ FIX: Büyük/Küçük Harf duyarlılığını ortadan kaldırıyoruz.
    const normalizedUserId = userId.toLowerCase(); 
    const user = users[normalizedUserId];

    // 🕵️ DEBUG LOGLARI (VERCEL HATASI İÇİN)
    // Bu loglar Vercel'de "Functions" sekmesinde görünecek.
    if (!user) {
        console.log("------------------------------------------------");
        console.log("🚨 [DEBUG] HATA: Kullanıcı Bulunamadı!");
        console.log(`👉 Aranan ID (Frontend'den gelen): ${userId}`);
        console.log(`👉 Aranan ID (Lowercase): ${normalizedUserId}`);
        
        const existingKeys = Object.keys(users);
        console.log(`📚 Veritabanındaki Toplam Kullanıcı: ${existingKeys.length}`);
        
        // Veritabanı boş mu yoksa ID mi farklı anlamak için ilk 5 ID'yi yazdıralım
        if (existingKeys.length > 0) {
            console.log(`🔍 Örnek Mevcut ID'ler: ${existingKeys.slice(0, 5).join(', ')}`);
        } else {
            console.log("⚠️ Veritabanı (users objesi) tamamen BOŞ dönüyor!");
            console.log("⚠️ NOT: Vercel'de JSON dosyası kullanıyorsanız, kayıtlar sunucu kapanınca siliniyor olabilir.");
        }
        console.log("------------------------------------------------");

        return res.status(404).json({ 
            ok: false, 
            error: "User not found. Please register first (or database persistence issue)." 
        });
    }

    // 4. Verileri Güncelle
    let updated = false;

    if (nextRound !== undefined) {
      user.nextRound = nextRound;
      updated = true;
    }

    if (activeRound !== undefined) {
      user.activeRound = activeRound;
      updated = true;
    }

    if (currentRound !== undefined) {
      user.currentRound = currentRound;
      updated = true;
    }

    if (updated) {
        user.updatedAt = new Date().toISOString();
        
        // 5. Kaydet
        await saveUsers(users);
        console.log(`✅ [Game] Success: Data saved for ${user.username || normalizedUserId}`);
    } else {
        console.log(`ℹ️ [Game] No changes detected for ${normalizedUserId}`);
    }

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error("❌ Save API Critical Error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
  }
}
