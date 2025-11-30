import type { NextApiRequest, NextApiResponse } from 'next'
import { loadUsers, saveUsers, debitBank } from '../../../lib/users'
import { TOKENS } from '../../../lib/tokens'

// ---------------------------------------------------------
// 1. KART HAVUZLARINI AYIR (Rarity'ye Göre)
// ---------------------------------------------------------
// Token listenizdeki 'about' veya 'type' alanına göre filtreliyoruz.
// 'Firstborn' = Unicorn/Super Rare kabul edildi.
const POOLS = {
  sentient: TOKENS.filter(t => t.about === 'Sentient').map(t => t.id),
  genesis: TOKENS.filter(t => t.about === 'Genesis').map(t => t.id),
  unicorn: TOKENS.filter(t => t.about === 'Firstborn').map(t => t.id),
}

// Yedek havuz (Hata durumunda boş dönmemek için)
const BACKUP_POOL = TOKENS.map(t => t.id)

// ---------------------------------------------------------
// 2. ŞANS ORANLARI (Ağırlık Tablosu)
// ---------------------------------------------------------
type PackConfig = {
  costPoints: number;
  weights: { sentient: number; genesis: number; unicorn: number };
}

const PACK_CONFIGS: Record<string, PackConfig> = {
  'common': {
    costPoints: 5000,
    // %95 Sentient, %4 Genesis, %1 Unicorn
    weights: { sentient: 95, genesis: 4, unicorn: 1 }
  },
  'rare': {
    costPoints: 10000,
    // %60 Sentient, %30 Genesis, %10 Unicorn 
    weights: { sentient: 60, genesis: 30, unicorn: 10 }
  }
}

// Yardımcı: Ağırlıklı Rastgele Seçim Fonksiyonu
function pickRarity(weights: { sentient: number; genesis: number; unicorn: number }): keyof typeof POOLS {
  const totalWeight = weights.sentient + weights.genesis + weights.unicorn;
  let random = Math.random() * totalWeight;

  if (random < weights.sentient) return 'sentient';
  random -= weights.sentient;

  if (random < weights.genesis) return 'genesis';
  return 'unicorn';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  try {
    // User ID (Header veya Body'den)
    let userId = (req.headers['x-user-id'] as string) || req.body.userId

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Unauthorized: Missing User ID' })
    }

    // ---------------------------------------------------------
    // 3. İSTEK KONTROLÜ
    // ---------------------------------------------------------
    const { count, packType, useInventory } = req.body
    const type = (packType === 'rare') ? 'rare' : 'common'
    const qty = Number(count || 1)

    if (qty < 1) return res.status(400).json({ ok: false, error: 'Invalid quantity' })

    const config = PACK_CONFIGS[type]
    const totalCost = config.costPoints * qty

    // ---------------------------------------------------------
    // 4. KULLANICI VE BAKİYE KONTROLÜ
    // ---------------------------------------------------------
    const users = await loadUsers()
    const user = users[userId] // Cüzdan adresi (küçük harf olmalı)

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' })
    }

    // Puan Yeterli mi?
    if (useInventory) {
      // Check if user has packs in inventory
      const currentPacks = (user.inventory && user.inventory[type]) || 0
      if (currentPacks < qty) {
        return res.status(400).json({
          ok: false,
          error: `Insufficient ${type} packs in inventory.`
        })
      }
      // Decrement inventory
      if (!user.inventory) user.inventory = {}
      user.inventory[type] = currentPacks - qty
      if (user.inventory[type] <= 0) delete user.inventory[type]
    } else {
      const totalAvailable = user.bankPoints + user.giftPoints
      if (totalAvailable < totalCost) {
        return res.status(400).json({
          ok: false,
          error: `Insufficient points. Need ${totalCost.toLocaleString()} pts.`
        })
      }
      // Puan Düş
      debitBank(user, totalCost, `buy-${type}-pack-x${qty}`)
    }

    // ---------------------------------------------------------
    // 5. KART ÜRETİMİ (RNG)
    // ---------------------------------------------------------
    const newCards: string[] = []

    // Her paket için 5 kart
    for (let i = 0; i < qty * 5; i++) {
      // 1. Bu kartın nadirliği ne olacak?
      const rarity = pickRarity(config.weights);

      // 2. O nadirlikteki havuzdan rastgele bir kart seç
      let pool = POOLS[rarity];

      // Havuz boşsa (örn: hiç unicorn yoksa) yedek havuzdan seç
      if (!pool || pool.length === 0) pool = BACKUP_POOL;

      const randomId = pool[Math.floor(Math.random() * pool.length)]
      newCards.push(randomId)

      // Envantere ekle
      if (!user.inventory) user.inventory = {}
      user.inventory[randomId] = (user.inventory[randomId] || 0) + 1
    }

    // ---------------------------------------------------------
    // 6. KAYDET VE BİTİR
    // ---------------------------------------------------------
    await saveUsers(users)

    return res.status(200).json({
      ok: true,
      user,
      newCards,
      cost: totalCost,
      packType: type
    })

  } catch (err: any) {
    console.error('[API] Purchase Pack Error:', err)
    return res.status(500).json({ ok: false, error: err.message || 'Server error' })
  }
}