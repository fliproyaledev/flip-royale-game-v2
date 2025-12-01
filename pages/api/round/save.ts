import type { NextApiRequest, NextApiResponse } from "next";
import { getUser, updateUser } from "../../../lib/users"; 
import { verifyUserSignature } from "../../../lib/verify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 🔍 DEBUG: Metod Logu
  console.log(`📡 [API] Gelen İstek Metodu: ${req.method}`);

  // 1. CORS Preflight
  if (req.method === "OPTIONS") {
     return res.status(200).end();
  }

  // 2. Sadece POST izni
  if (req.method !== "POST") {
    return res.status(405).json({ 
        ok: false, 
        error: `Method not allowed. Beklenen: POST, Gelen: ${req.method}` 
    });
  }

  try {
    // 3. Verileri Al
    const { userId, nextRound, activeRound, currentRound, signature, message } = req.body;

    if (!userId) return res.status(400).json({ ok: false, error: "Missing userId" });

    // 🔒 GÜVENLİK: İmza Kontrolü
    if (!signature) {
      return res.status(401).json({ ok: false, error: "Signature required." });
    }

    // Mesaj Kontrolü
    if (!message || typeof message !== 'string' || !message.startsWith('Flip Royale:')) {
      return res.status(400).json({ ok: false, error: "Invalid message format." });
    }

    // İmza Doğrulama
    const isValid = await verifyUserSignature(userId, message, signature);
    if (!isValid) {
      return res.status(403).json({ ok: false, error: "Invalid signature!" });
    }

    // 4. Kullanıcıyı ORACLE'dan Yükle
    const normalizedUserId = userId.toLowerCase();
    
    // Köprü üzerinden Oracle'a soruyoruz
    const user = await getUser(normalizedUserId);

    if (!user) {
        console.log(`🚨 [DEBUG] Kullanıcı Oracle'da bulunamadı: ${normalizedUserId}`);
        return res.status(404).json({ 
            ok: false, 
            error: "User not found. Please register first." 
        });
    }

    // 5. Güncellenecek Verileri Hazırla
    const updates: any = {};
    let hasChanges = false;

    if (nextRound !== undefined) {
      updates.nextRound = nextRound;
      hasChanges = true;
    }

    if (activeRound !== undefined) {
      updates.activeRound = activeRound;
      hasChanges = true;
    }

    if (currentRound !== undefined) {
      updates.currentRound = currentRound;
      hasChanges = true;
    }

    // 6. Oracle'a Kaydet
    if (hasChanges) {
        updates.updatedAt = new Date().toISOString();
        
        await updateUser(normalizedUserId, updates);
        
        // HATA DÜZELTİLDİ: TypeScript'i (user as any) ile susturuyoruz
        const userNameLog = user.name || (user as any).username || normalizedUserId;
        console.log(`✅ [Game] Data synced to Oracle for ${userNameLog}`);
    } else {
        console.log(`ℹ️ [Game] No changes detected for ${normalizedUserId}`);
    }

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error("❌ Save API Error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
  }
}
