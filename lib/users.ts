// lib/users.ts

// 1. ORACLE KÖPRÜ AYARLARI
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_SECRET = process.env.ORACLE_SECRET;

// ─────────────────────────────────────────────────────────────
// TYPES (Diğer dosyaların ihtiyaç duyduğu tipler)
// ─────────────────────────────────────────────────────────────

export type LogEntry = {
  date: string
  type: 'daily' | 'duel' | 'system'
  dailyDelta?: number
  bonusGranted?: number
  note?: string
}

export type RoundPick = {
  tokenId: string
  dir: 'UP' | 'DOWN'
  duplicateIndex: number
  locked: boolean
  pLock?: number
  pointsLocked?: number
  startPrice?: number
}

export type RoundHistoryEntry = {
  roundNumber: number
  date: string
  totalPoints: number
  items: {
    tokenId: string
    symbol: string
    dir: 'UP' | 'DOWN'
    duplicateIndex: number
    points: number
    startPrice?: number
    closePrice?: number
  }[]
}

export type UserRecord = {
  id: string
  name?: string
  avatar?: string
  walletAddress?: string
  totalPoints: number
  bankPoints: number
  giftPoints: number
  logs: LogEntry[]
  createdAt?: string
  updatedAt: string
  activeRound?: RoundPick[]
  nextRound?: (RoundPick | null)[]
  currentRound?: number
  lastSettledDay?: string
  inventory?: Record<string, number>
  lastDailyPack?: string
  roundHistory?: RoundHistoryEntry[]
}

// ─────────────────────────────────────────────────────────────
// NEW ORACLE BRIDGE FUNCTIONS (Yeni Sistem)
// ─────────────────────────────────────────────────────────────

// 1. KULLANICIYI GETİR (Oracle'dan)
export async function getUser(address: string): Promise<UserRecord | null> {
  if (!ORACLE_URL) {
    console.error("❌ ORACLE_URL .env dosyasında tanımlı değil!");
    return null;
  }

  try {
    const res = await fetch(`${ORACLE_URL}/api/users/get?address=${address.toLowerCase()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ORACLE_SECRET}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    
    if (res.status === 404) return null;
    
    if (!res.ok) {
      console.error("Oracle Connection Error:", await res.text());
      return null;
    }
    
    const data = await res.json();
    return data.user as UserRecord;

  } catch (e) {
    console.error("Oracle Get User Error:", e);
    return null;
  }
}

// 2. KULLANICIYI GÜNCELLE (Oracle'a Kaydet)
export async function updateUser(address: string, updates: any) {
  if (!ORACLE_URL) throw new Error("ORACLE_URL tanımlı değil");

  const res = await fetch(`${ORACLE_URL}/api/users/update`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ORACLE_SECRET}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address: address.toLowerCase(),
      userData: updates
    })
  });

  if (!res.ok) {
    throw new Error("Failed to update user on Oracle");
  }
  
  return await res.json();
}

// ─────────────────────────────────────────────────────────────
// LEGACY HELPER FUNCTIONS (Eski dosyaların hata vermemesi için)
// ─────────────────────────────────────────────────────────────

// ⚠️ UYARI: Bu fonksiyon eski 'loadUsers' yerine geçer ama artık boş döner.
// Duels gibi eski sistemler bunu kullanıyorsa güncellenmeleri gerekir ama build hatası vermez.
export async function loadUsers(): Promise<Record<string, UserRecord>> {
  console.warn("⚠️ loadUsers() called in Oracle mode. This function is deprecated.");
  return {}; // Build hatasını önlemek için boş obje dönüyoruz
}

export async function saveUsers(map: Record<string, UserRecord>): Promise<void> {
  console.warn("⚠️ saveUsers() called in Oracle mode. Use updateUser() instead.");
}

// Helper: Kullanıcı nesnesi oluşturma mantığı (Hala kullanılabilir)
export function getOrCreateUser(map: Record<string, UserRecord>, userId: string): UserRecord {
  // Map boş gelse bile tekil işlem için mantığı koruyoruz
  if (!userId) throw new Error("Invalid User ID");
  
  let user = map[userId];
  if (!user) {
    const now = new Date().toISOString();
    user = {
      id: userId,
      totalPoints: 0,
      bankPoints: 0,
      giftPoints: 0,
      logs: [{ type: 'system', date: now.slice(0, 10), bonusGranted: 0, note: 'new-user' }],
      createdAt: now,
      updatedAt: now,
      activeRound: [],
      nextRound: Array(5).fill(null),
      currentRound: 1,
      inventory: { common: 1 },
      roundHistory: []
    } as UserRecord;
    // Map'e eklesek de bu sadece local memory'de kalır, Oracle'a gitmez.
    // Ancak fonksiyonun imzası bozulmasın diye bırakıyoruz.
    map[userId] = user;
  }
  return user;
}

// Logic Helper: Puan ekleme (Hala kullanılabilir)
export function creditBank(user: UserRecord, amount: number, note?: string, dateIso?: string) {
  if (!Number.isFinite(amount)) return;
  user.bankPoints += amount;
  user.updatedAt = new Date().toISOString();
}

// Logic Helper: Günlük puan (Hala kullanılabilir)
export function applyDailyDelta(user: UserRecord, dateIso: string, delta: number, note?: string) {
  if (delta > 0) {
    user.totalPoints += delta;
    user.bankPoints += delta;
  }
  user.updatedAt = new Date().toISOString();
}

export function grantDailyBonus(user: UserRecord, dateIso: string, bonus: number, note?: string) {
    if (bonus > 0) {
      user.totalPoints += bonus
      user.bankPoints += bonus
      user.updatedAt = new Date().toISOString()
    }
}
