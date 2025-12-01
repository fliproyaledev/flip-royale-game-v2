import type { NextApiRequest, NextApiResponse } from 'next';

// .env dosyasındaki Oracle adresini ve şifresini alıyoruz
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_SECRET = process.env.ORACLE_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Method Kontrolü (Sadece POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // 2. Oracle Ayarlarının Kontrolü
  if (!ORACLE_URL || !ORACLE_SECRET) {
    console.error("❌ ORACLE_URL veya ORACLE_SECRET .env dosyasında eksik!");
    return res.status(500).json({ ok: false, error: 'Server configuration error' });
  }

  try {
    // 3. İstemciden Gelen Verileri Al
    // User ID header'dan veya body'den gelebilir
    const userId = (req.headers['x-user-id'] as string) || req.body.userId;
    const { packType, count, useInventory } = req.body;

    if (!userId) {
        return res.status(400).json({ ok: false, error: "Unauthorized: Missing User ID" });
    }

    // 4. İsteği Oracle'a Yönlendir (PROXY)
    // Tüm kart çekme, puan düşme ve kaydetme işlemleri Oracle'da yapılır.
    const oracleRes = await fetch(`${ORACLE_URL}/api/users/purchase`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ORACLE_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId.toLowerCase(), // ID'yi normalize et
            packType,
            count,
            useInventory
        })
    });

    // 5. Oracle'dan Gelen Yanıtı İşle
    const data = await oracleRes.json();

    if (!oracleRes.ok) {
        console.error("Oracle Purchase Error:", data);
        return res.status(oracleRes.status).json({ 
            ok: false, 
            error: data.error || 'Purchase failed on Oracle' 
        });
    }

    // 6. Başarılı Sonucu Frontend'e Döndür
    return res.status(200).json(data);

  } catch (error: any) {
    console.error("Purchase Bridge Error:", error);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
