import type { NextApiRequest, NextApiResponse } from 'next';
// 👇 DÜZELTME: loadUsers yerine getUser (Oracle Köprüsü) kullanıyoruz
import { getUser } from '../../../lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  
  if (!address) return res.status(400).json({ error: 'Missing address' });

  const cleanAddress = String(address).toLowerCase();

  try {
    // 🔍 Oracle'a Sor: Bu kullanıcı veritabanında var mı?
    // (Eski sistemde tüm users'ı yüklüyorduk, şimdi sadece ilgili kişiyi soruyoruz)
    const user = await getUser(cleanAddress);

    if (user) {
      return res.status(200).json({ exists: true, user });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error("Auth check error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
