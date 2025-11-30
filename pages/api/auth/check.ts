import type { NextApiRequest, NextApiResponse } from 'next';
// 👇 DÜZELTME: Yanlış olan '../lib/users' yerine '@/' kullanıyoruz
import { loadUsers } from '../../../lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  
  if (!address) return res.status(400).json({ error: 'Missing address' });

  const cleanAddress = String(address).toLowerCase();

  try {
    const users = await loadUsers();
    
    // Kullanıcıyı ID'sinden (Cüzdan Adresinden) bul
    const user = users[cleanAddress];

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