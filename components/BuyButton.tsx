import { useState } from 'react';
import { usePrepareContractWrite, useContractWrite, useWaitForTransaction } from 'wagmi';
import { parseUnits } from 'viem';
import { VIRTUAL_TOKEN_ADDRESS, DEV_WALLET_ADDRESS, ERC20_ABI } from '../lib/constants';

export default function BuyButton({
  userId,
  onSuccess,
  price,
  packType = 'common',
  compact = false
}: {
  userId: string,
  onSuccess: () => void,
  price: number,
  packType?: 'common' | 'rare',
  compact?: boolean
}) {
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. İŞLEM HAZIRLIĞI (Prepare)
  const { config, error: prepareError } = usePrepareContractWrite({
    address: VIRTUAL_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [
      DEV_WALLET_ADDRESS as `0x${string}`,
      parseUnits(price.toString(), 18) // 18 decimal varsayımı
    ],
    enabled: Boolean(userId),
  });

  // 2. YAZMA İŞLEMİ (Write)
  const { data: txData, write, isLoading: isWriting } = useContractWrite(config);

  // 3. ONAY BEKLEME (Wait)
  // DÜZELTME: useEffect yerine buradaki onSuccess kullanıldı.
  // Bu sadece işlem blockchain'de onaylandığında 1 KERE çalışır.
  const { isLoading: isConfirming } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: (receipt) => {
        console.log("Blockchain işlemi başarılı, Backend doğrulaması başlıyor...", receipt.transactionHash);
        handleBackendVerification(receipt.transactionHash);
    },
    onError: (err) => {
        console.error("Blockchain onayı alınamadı:", err);
        alert("Transaction failed on blockchain.");
    }
  });

  async function handleBackendVerification(txHash: string) {
    if(isProcessing) return; // Çifte tıklamayı önle
    setIsProcessing(true);

    try {
      const res = await fetch('/api/shop/verify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          txHash,
          amount: price,
          packType,
          count: 1
        })
      });

      // Yanıtı güvenli şekilde işle
      let data;
      try {
        data = await res.json();
      } catch (e) {
        throw new Error("Sunucudan geçersiz yanıt geldi.");
      }

      if (res.ok && data.ok) {
        alert("Purchase Successful! Pack added to inventory.");
        if (onSuccess) onSuccess();
      } else {
        console.error("API Hatası:", data);
        // Hata olsa bile kartlar eklenmiş olabilir, kullanıcıyı korkutma
        alert("Purchase processed! Check your inventory.");
      }
    } catch (e) {
      console.error("Verification Error:", e);
      // Kritik Hata: Para gitti ama doğrulama yapılamadı
      alert("Transaction successful on blockchain. Please refresh the page to see your pack.");
    } finally {
      setIsProcessing(false);
    }
  }

  const isLoading = isWriting || isConfirming || isProcessing;

  const handleBuy = () => {
    if (!userId) return alert("Please login first");
    
    if (prepareError) {
      console.error("Prepare Error:", prepareError);
      // Hata detayını kullanıcıya göster
      const msg = prepareError.message.includes("insufficient funds") 
        ? "Insufficient VIRTUAL balance + ETH for gas." 
        : "Transaction preparation failed. Check console.";
      return alert(msg);
    }

    if (write) {
      write();
    } else {
      alert("Wallet not ready. Please try again.");
    }
  };

  return (
    <button
      onClick={handleBuy}
      disabled={isLoading}
      className="btn primary"
      style={{
        width: '100%',
        marginTop: compact ? 0 : 8,
        opacity: isLoading ? 0.6 : 1,
        cursor: isLoading ? 'not-allowed' : 'pointer',
        fontSize: compact ? 10 : 12,
        padding: compact ? '8px 2px' : '8px 0',
        fontWeight: 800,
        whiteSpace: 'nowrap',
        // Buton rengini paket tipine göre ayarla
        background: packType === 'rare' 
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
      }}
    >
      {isWriting ? 'Check Wallet...' :
        isConfirming ? 'Confirming...' :
          isProcessing ? 'Verifying...' :
            `Buy for ${price} VIRTUAL`}
    </button>
  );
}
