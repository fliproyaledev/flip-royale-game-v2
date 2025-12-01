import type { NextApiRequest, NextApiResponse } from 'next';
// 👇 ÖNEMLİ: Oracle Köprüsünü kullanıyoruz
import { getUser } from '../../../lib/users'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Frontend genellikle ?userId=... parametresiyle çağırır
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing User ID' });
  }

  try {
    const cleanId = userId.toLowerCase();

    // 🔍 Oracle'dan Kullanıcı Verisini Çek
    const user = await getUser(cleanId);

    if (user) {
      // Kullanıcı bulundu, veriyi döndür
      return res.status(200).json({ ok: true, user });
    } else {
      // Kullanıcı Oracle'da yoksa
      return res.status(404).json({ ok: false, error: 'User not found in Oracle' });
    }

  } catch (error: any) {
    console.error('API Error (me.ts):', error);
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}
