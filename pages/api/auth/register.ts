import type { NextApiRequest, NextApiResponse } from 'next'
import { updateUser } from '../../../lib/users' // Oracle Köprüsü

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Sadece POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const { address, username } = req.body

  if (!address || !username) {
    return res.status(400).json({ ok: false, error: 'Missing address or username' })
  }

  try {
    const normalizedAddress = address.toLowerCase();
    const now = new Date().toISOString();

    console.log(`📝 [Register] Yeni kullanıcı oluşturuluyor: ${normalizedAddress} (${username})`);

    // 1. Yeni Kullanıcı Profili
    const newUserProfile = {
      id: normalizedAddress,
      username: username, 
      name: username,
      totalPoints: 0,
      bankPoints: 0,
      giftPoints: 0,
      createdAt: now,
      updatedAt: now,
      
      // HEDİYE PAKETİ: Envantere 1 adet common pack ekle
      inventory: { common: 1 }, 
      
      logs: [{
        type: 'system',
        date: now.slice(0, 10),
        note: 'user-registered-oracle'
      }]
    };

    // 2. Oracle'a Zorla Kaydet (Update User fonksiyonu yoksa oluşturur)
    await updateUser(normalizedAddress, newUserProfile);

    console.log(`✅ [Register] Kullanıcı Oracle'a başarıyla kaydedildi: ${normalizedAddress}`);

    return res.status(200).json({ ok: true, user: newUserProfile, isNewUser: true });

  } catch (error: any) {
    console.error('❌ [Register] Hata:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Registration failed' });
  }
}
