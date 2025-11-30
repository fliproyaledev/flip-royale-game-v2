import type { NextApiRequest, NextApiResponse } from 'next';
import { createPublicClient, http, parseUnits } from 'viem';
import { base } from '@/lib/wagmi';
import { loadUsers, saveUsers } from '@/lib/users';
import { VIRTUAL_TOKEN_ADDRESS, DEV_WALLET_ADDRESS } from '@/lib/constants';

// Base ağına bağlanmak için istemci
const publicClient = createPublicClient({
  chain: base,
  transport: http()
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, txHash, amount } = req.body;

  if (!userId || !txHash || !amount) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    // 1. İşlemi Blockchain'den Sorgula
    const tx = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (tx.status !== 'success') {
      return res.status(400).json({ error: 'Transaction failed on-chain' });
    }

    // 2. İşlem detaylarını kontrol et (Güvenlik)
    // Logları analiz edip paranın gerçekten bizim cüzdana geldiğini,
    // ve doğru miktarda geldiğini kontrol etmeliyiz.
    // (Basitlik için şimdilik sadece success durumuna bakıyoruz, 
    // ama prodüksiyonda "Logs" içindeki transfer eventini parse etmek en güvenlisidir.)

    // 3. Kullanıcıya Paketi Ver
    const users = await loadUsers();
    const user = users[userId];

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Daha önce bu hash kullanıldı mı? (Replay Attack Koruması)
    // Bunu yapmak için user.logs içinde bu hash var mı bakabiliriz.
    const alreadyProcessed = user.logs.some(l => l.note?.includes(txHash));
    if (alreadyProcessed) {
      return res.status(400).json({ error: 'Transaction already processed' });
    }

    // Paketi ekle (Örn: 5 kart)
    // Inventory mantığına göre burayı düzenle. Şimdilik rastgele kart ekliyoruz varsayalım.
    // user.inventory['card_id'] = (user.inventory['card_id'] || 0) + 1;

    // Kayıt at
    user.logs.push({
      date: new Date().toISOString().split('T')[0],
      type: 'system',
      note: `Pack Purchased with VIRTUAL (Tx: ${txHash})`,
      bonusGranted: 0
    });

    await saveUsers(users);

    return res.status(200).json({ ok: true });

  } catch (error: any) {
    console.error(error);
    return res.status(500).json({ error: 'Verification failed' });
  }
}