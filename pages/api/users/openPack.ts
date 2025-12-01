import type { NextApiRequest, NextApiResponse } from 'next';

// 1. Ortam Değişkenlerini Al
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_SECRET = process.env.ORACLE_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 2. Sadece POST İsteği
    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    // 3. Ayar Kontrolü
    if (!ORACLE_URL || !ORACLE_SECRET) {
        console.error("❌ ORACLE ayarları eksik (.env kontrol et)");
        return res.status(500).json({ ok: false, error: 'Server configuration error' });
    }

    try {
        // 4. İstemciden Veriyi Al
        // User ID header'dan veya body'den gelebilir
        const userId = (req.headers['x-user-id'] as string) || req.body.userId;
        const { packType } = req.body;

        if (!userId) {
            return res.status(401).json({ ok: false, error: 'Unauthorized: Missing User ID' });
        }

        // 5. İsteği ORACLE'a Yönlendir (Köprü)
        // Kart üretimi ve envanter güncellemesi Oracle'da yapılacak.
        const oracleRes = await fetch(`${ORACLE_URL}/api/users/open-pack`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ORACLE_SECRET}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: userId.toLowerCase(), // ID'yi normalize et
                packType: packType || 'common'
            })
        });

        const data = await oracleRes.json();

        // 6. Oracle Hata Verdiyse (Örn: Paket yoksa)
        if (!oracleRes.ok) {
            console.warn("Oracle Open Pack Failed:", data);
            return res.status(oracleRes.status).json({ 
                ok: false, 
                error: data.error || 'Failed to open pack on Oracle' 
            });
        }

        // 7. Başarılı Sonucu (Kartları) Frontend'e Döndür
        return res.status(200).json(data);

    } catch (err: any) {
        console.error('[API] Open Pack Bridge Error:', err);
        return res.status(500).json({ ok: false, error: err.message || 'Internal Server Error' });
    }
}
