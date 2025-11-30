import type { NextApiRequest, NextApiResponse } from 'next';
import { loadUsers, saveUsers, getOrCreateUser } from '../../../lib/users';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).end();

    const { address, username } = req.body;
    console.log('[REGISTER] Request received:', { address, username });

    if (!address) {
      console.error('[REGISTER] Missing address');
      return res.status(400).json({ ok: false, error: 'Missing address' });
    }

    // Cüzdan adresini küçük harfe çevir (ID olarak bu kullanılacak)
    const cleanAddress = String(address).toLowerCase();

    const users = await loadUsers();

    // Eğer zaten varsa hata ver (Güvenlik)
    if (users[cleanAddress]) {
      console.warn('[REGISTER] User already exists:', cleanAddress);
      return res.status(400).json({ ok: false, error: 'User already exists' });
    }

    // Yeni kullanıcı oluştur
    // ID = Cüzdan Adresi
    const newUser = getOrCreateUser(users, cleanAddress);

    // Ekstra bilgileri işle
    newUser.name = username; // Seçtiği isim
    newUser.walletAddress = cleanAddress; // Cüzdan adresi

    // Listeye ekle ve kaydet
    users[cleanAddress] = newUser;

    // WELCOME GIFT: Add 1 Common Pack
    if (!users[cleanAddress].inventory) {
      users[cleanAddress].inventory = {};
    }
    users[cleanAddress].inventory['common'] = (users[cleanAddress].inventory['common'] || 0) + 1;

    await saveUsers(users);
    console.log('[REGISTER] Success:', cleanAddress);

    return res.status(200).json({ ok: true, user: newUser, isNewUser: true });
  } catch (error: any) {
    console.error('[REGISTER] Error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Internal Server Error' });
  }
}