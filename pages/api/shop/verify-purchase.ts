import type { NextApiRequest, NextApiResponse } from 'next';

const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_SECRET = process.env.ORACLE_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Sadece POST
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { userId, txHash, packType, count } = req.body;

    if (!userId || !txHash) {
        return res.status(400).json({ ok: false, error: 'Missing parameters' });
    }

    // 2. İsteği ORACLE'a Yönlendir (Köprü)
    // Yerel veritabanı (loadUsers) KULLANMIYORUZ. Direkt Oracle'a soruyoruz.
    const oracleRes = await fetch(`${ORACLE_URL}/api/users/purchase`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ORACLE_SECRET}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userId: userId.toLowerCase(),
            packType: packType || 'common',
            count: count || 1,
            useInventory: false,
            paymentMethod: 'CRYPTO', // <--- Puan düşmemesi için
            txHash: txHash
        })
    });

    const data = await oracleRes.json();

    if (!oracleRes.ok) {
        // Oracle hata verdiyse (User not found vb.)
        return res.status(oracleRes.status).json({ ok: false, error: data.error });
    }

    // 3. Başarılı
    return res.status(200).json({ ok: true, ...data });

  } catch (error: any) {
    console.error("Bridge Error:", error);
    return res.status(500).json({ ok: false, error: "Internal Server Error" });
  }
}
