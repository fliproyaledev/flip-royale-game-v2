import type { NextApiRequest, NextApiResponse } from "next";
import { loadUsers, saveUsers } from "../../../lib/users";
import { verifyUserSignature } from "../../../lib/verify";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST isteğine izin ver
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    // Frontend'den gelen verileri al
    const { userId, nextRound, activeRound, currentRound, signature, message } = req.body;

    if (!userId) {
      return res.status(400).json({ ok: false, error: "Missing userId" });
    }

    // 🔒 GÜVENLİK KONTROLÜ (Signature Verification)
    // 1. İmza var mı?
    if (!signature) {
      return res.status(401).json({ ok: false, error: "Signature required. Please sign the transaction in your wallet." });
    }

    // 2. İmzayı Doğrula
    // Frontend'den gelen mesajı kullanıyoruz, ancak formatını kontrol ediyoruz.
    if (!message || typeof message !== 'string' || !message.startsWith('Flip Royale: Save Picks')) {
      return res.status(400).json({ ok: false, error: "Invalid message format." });
    }

    const isValid = await verifyUserSignature(userId, message, signature);

    if (!isValid) {
      console.warn(`[Security] Invalid signature attempt for user ${userId}`);
      return res.status(403).json({ ok: false, error: "Invalid signature! You are not authorized to modify this account." });
    }
    // -------------------------

    // 3. Kullanıcıyı Yükle
    const users = await loadUsers();
    const userAddress = userId.toLowerCase(); // Cüzdan adresleri küçük harf olmalı
    const user = users[userAddress];

    if (!user) {
      return res.status(404).json({ ok: false, error: "User not found. Please register first." });
    }

    // 4. Verileri Güncelle
    // Sadece gönderilen alanları güncelle (undefined olmayanları)
    if (nextRound !== undefined) {
      user.nextRound = nextRound;
    }

    if (activeRound !== undefined) {
      // Active round'u değiştirmek genellikle yasaktır ama kilit (lock) işlemi için gerekebilir
      user.activeRound = activeRound;
    }

    if (currentRound !== undefined) {
      user.currentRound = currentRound;
    }

    user.updatedAt = new Date().toISOString();

    // 5. Kaydet
    await saveUsers(users);

    console.log(`[Game] Picks saved for ${user.name || userAddress}`);

    return res.status(200).json({ ok: true });

  } catch (err: any) {
    console.error("Save API Error:", err);
    return res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
  }
}