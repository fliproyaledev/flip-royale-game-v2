// lib/users.ts (Frontend - Oracle Bridge Version)

// .env dosyasından adresleri alıyoruz
const ORACLE_URL = process.env.ORACLE_URL; // Örn: https://flip-royale-oracle-v2.vercel.app
const ORACLE_SECRET = process.env.ORACLE_SECRET; // Belirlediğin gizli şifre

// 1. KULLANICIYI GETİR (Oracle'dan)
// Bu fonksiyon eski 'loadUsers' yerine kullanılacak
export async function getUser(address: string) {
  if (!ORACLE_URL) {
    console.error("❌ ORACLE_URL .env dosyasında tanımlı değil!");
    return null;
  }

  try {
    // Oracle API'sine istek atıyoruz
    const res = await fetch(`${ORACLE_URL}/api/users/get?address=${address.toLowerCase()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ORACLE_SECRET}`,
        'Content-Type': 'application/json'
      },
      cache: 'no-store' // Her zaman en güncel veriyi çek
    });
    
    if (res.status === 404) return null; // Kullanıcı yoksa null dön
    
    if (!res.ok) {
      const err = await res.text();
      console.error("Oracle Connection Error:", err);
      return null;
    }
    
    const data = await res.json();
    return data.user; // Oracle'dan dönen kullanıcı objesi

  } catch (e) {
    console.error("Oracle Get User Error:", e);
    return null;
  }
}

// 2. KULLANICIYI GÜNCELLE (Oracle'a Kaydet)
// Bu fonksiyon eski 'saveUsers' yerine kullanılacak
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
      userData: updates // Oracle tarafında 'userData' olarak karşılıyoruz
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = "Failed to update user on Oracle";
    try {
        const errJson = JSON.parse(errText);
        errMsg = errJson.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  
  return await res.json();
}
