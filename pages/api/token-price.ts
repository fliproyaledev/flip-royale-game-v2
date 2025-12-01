import type { NextApiRequest, NextApiResponse } from 'next';

const ORACLE_URL = process.env.ORACLE_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!ORACLE_URL) {
    // Oracle ayarlı değilse boş dön
    return res.status(200).json({ p0: 0, pLive: 0, pClose: 0, source: 'fallback' });
  }

  try {
    // 1. Oracle'dan TÜM fiyatları çek (Cache olduğu için hızlıdır)
    const response = await fetch(`${ORACLE_URL}/api/prices/get-all`, {
        next: { revalidate: 30 } // 30 saniye cache
    });

    if (!response.ok) throw new Error("Oracle fetch failed");

    const allPrices: any[] = await response.json();

    // 2. İstenen token'ı bul (ID veya Symbol eşleşmesi)
    const targetId = String(token).toLowerCase();
    
    // Virtual için özel kontrol
    if (targetId === 'virtual') {
        const vData = allPrices.find((p: any) => p.tokenId === 'virtual' || p.symbol === 'VIRTUAL');
        if (vData) return res.status(200).json(vData);
    }

    const priceData = allPrices.find((p: any) => 
        p.tokenId === targetId || p.symbol.toLowerCase() === targetId
    );

    if (priceData) {
        return res.status(200).json(priceData);
    } else {
        // Bulunamazsa fallback
        return res.status(200).json({ p0: 0, pLive: 0, pClose: 0, source: 'fallback' });
    }

  } catch (error) {
    console.error("Price Bridge Error:", error);
    return res.status(200).json({ p0: 0, pLive: 0, pClose: 0, source: 'error-fallback' });
  }
}
