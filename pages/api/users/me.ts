import type { NextApiRequest, NextApiResponse } from 'next';
// DİKKAT: Eski loadUsers fonksiyonunu DEĞİL, yeni getUser fonksiyonunu kullanıyoruz
import { getUser } from '../../../lib/users'; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ ok: false, error: 'Missing User ID' });
  }

  try {
    // Oracle'dan veriyi çek
    const user = await getUser(userId.toLowerCase());

    if (user) {
      return res.status(200).json({ ok: true, user });
    } else {
      // Eğer Oracle'da bile yoksa 404 dön
      return res.status(404).json({ ok: false, error: 'User not found in Oracle' });
    }

  } catch (error: any) {
    return res.status(500).json({ ok: false, error: 'Internal Server Error' });
  }
}
