import type { NextApiRequest, NextApiResponse } from 'next'
import { loadUsers, saveUsers } from '../../../lib/users'
import { TOKENS } from '../../../lib/tokens'

// ---------------------------------------------------------
// 1. KART HAVUZLARINI AYIR (Rarity'ye Göre)
// ---------------------------------------------------------
const POOLS = {
    sentient: TOKENS.filter(t => t.about === 'Sentient').map(t => t.id),
    genesis: TOKENS.filter(t => t.about === 'Genesis').map(t => t.id),
    unicorn: TOKENS.filter(t => t.about === 'Firstborn').map(t => t.id),
}

// Yedek havuz
const BACKUP_POOL = TOKENS.map(t => t.id)

// ---------------------------------------------------------
// 2. ŞANS ORANLARI (Ağırlık Tablosu)
// ---------------------------------------------------------
type PackConfig = {
    weights: { sentient: number; genesis: number; unicorn: number };
}

const PACK_CONFIGS: Record<string, PackConfig> = {
    'common': {
        // %95 Sentient, %4 Genesis, %1 Unicorn
        weights: { sentient: 95, genesis: 4, unicorn: 1 }
    },
    'rare': {
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

        const { packType } = req.body
        const type = (packType === 'rare') ? 'rare' : 'common'

        // ---------------------------------------------------------
        // 3. KULLANICI VE ENVANTER KONTROLÜ
        // ---------------------------------------------------------
        const users = await loadUsers()
        const user = users[userId]

        if (!user) {
            return res.status(404).json({ ok: false, error: 'User not found' })
        }

        if (!user.inventory || !user.inventory[type] || user.inventory[type] < 1) {
            return res.status(400).json({ ok: false, error: `No ${type} packs found in inventory` })
        }

        // Paketi düş
        user.inventory[type] -= 1
        if (user.inventory[type] <= 0) {
            delete user.inventory[type]
        }

        // ---------------------------------------------------------
        // 4. KART ÜRETİMİ (RNG)
        // ---------------------------------------------------------
        const config = PACK_CONFIGS[type]
        const newCards: string[] = []

        // Her paket için 5 kart
        for (let i = 0; i < 5; i++) {
            const rarity = pickRarity(config.weights);
            let pool = POOLS[rarity];
            if (!pool || pool.length === 0) pool = BACKUP_POOL;

            const randomId = pool[Math.floor(Math.random() * pool.length)]
            newCards.push(randomId)

            // Envantere ekle
            user.inventory[randomId] = (user.inventory[randomId] || 0) + 1
        }

        // ---------------------------------------------------------
        // 5. KAYDET VE BİTİR
        // ---------------------------------------------------------
        await saveUsers(users)

        return res.status(200).json({
            ok: true,
            user,
            newCards,
            packType: type
        })

    } catch (err: any) {
        console.error('[API] Open Pack Error:', err)
        return res.status(500).json({ ok: false, error: err.message || 'Server error' })
    }
}
