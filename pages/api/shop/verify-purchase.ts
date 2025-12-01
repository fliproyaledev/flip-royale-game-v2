import type { NextApiRequest, NextApiResponse } from 'next';

// Ortam değişkenlerini alıyoruz
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_SECRET = process.env.ORACLE_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Sadece POST İsteği
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 2. Oracle Ayarlarını Kontrol Et
  if (!ORACLE_URL || !ORACLE_SECRET) {
    console.error("❌ ORACLE ayarları eksik!");
    return res.status(500).json({ ok: false, error: 'Server configuration error' });
  }

  try {
    // 3. Frontend'den Gelen Verileri Al
    const { userId, txHash, packType, count } = req.body;

    if (!userId || !txHash) {
      return res.status(400).json({ ok: false, error: 'Missing userId or txHash' });
    }

    console.log(`Processing Crypto Purchase: ${txHash} for user ${userId}`);

    // 4. İsteği ORACLE'a Yönlendir (Köprü)
    // "paymentMethod: CRYPTO" diyerek Oracle'ın puan düşmesini engelliyoruz.
    const oracleRes = await fetch(`${ORACLE_URL}/api/users/purchase`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ORACLE_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId.toLowerCase(), // ID'yi normalize et
            packType: packType || 'common',
            count: count || 1,
            useInventory: false,
            paymentMethod: 'CRYPTO', // <--- Bu çok önemli, Oracle bunu görünce puan düşmez
            txHash: txHash
        })
    });

    // 5. Oracle Yanıtını İşle
    const data = await oracleRes.json();

    if (!oracleRes.ok) {
        console.error("Oracle Purchase Failed:", data);
        // Hata mesajını frontend'e ilet
        return res.status(oracleRes.status).json({ 
            ok: false, 
            error: data.error || 'Verification failed with Oracle' 
        });
    }

    // 6. Başarılı!
    return res.status(200).json({ ok: true, ...data });

  } catch (error: any) {
    console.error("Verify Purchase Bridge Error:", error);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
