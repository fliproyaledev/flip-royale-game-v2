import { useState, useEffect } from 'react';
// 👇 V1 İÇİN DOĞRU HOOK'LAR BUNLARDIR:
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
  // Bu hook, cüzdan açılmadan önce işlemi simüle eder ve hata varsa söyler.
  const { config, error: prepareError } = usePrepareContractWrite({
    address: VIRTUAL_TOKEN_ADDRESS as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'transfer',
    args: [
      DEV_WALLET_ADDRESS as `0x${string}`,
      parseUnits(price.toString(), 18) // 18 decimal varsayımı
    ],
    enabled: Boolean(userId), // Sadece kullanıcı varsa çalışır
  });

  // 2. YAZMA İŞLEMİ (Write)
  // Hazırlanan konfigürasyonu kullanarak cüzdanı açar.
  const { data: txData, write, isLoading: isWriting } = useContractWrite(config);

  // 3. ONAY BEKLEME (Wait)
  // İşlem ağa gönderildikten sonra onaylanmasını bekler.
  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: txData?.hash,
  });

  // İşlem onaylandığında Backend'e bildir
  useEffect(() => {
    if (isSuccess && txData?.hash && !isProcessing) {
      handleBackendVerification(txData.hash);
    }
  }, [isSuccess, txData, isProcessing]);

  async function handleBackendVerification(txHash: string) {
    setIsProcessing(true);
    try {
      const res = await fetch('/api/shop/verify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          txHash,
          amount: price,
          packType
        })
      });

      const data = await res.json();
      if (data.ok) {
        alert("Purchase Successful! Pack added to inventory.");
        if (onSuccess) onSuccess();
      } else {
        alert("Payment verified but pack delivery failed: " + (data.error || 'Unknown error'));
      }
    } catch (e) {
      alert("Server error checking transaction. Please contact support.");
    } finally {
      setIsProcessing(false);
    }
  }

  const isLoading = isWriting || isConfirming || isProcessing;

  // Eğer cüzdan bağlı değilse veya bakiye yetersizse `write` fonksiyonu undefined olabilir
  const handleBuy = () => {
    if (!userId) return alert("Please login first");
    if (prepareError) {
      console.error("Prepare Error:", prepareError);
      return alert("Transaction cannot be prepared. Check your balance or network.");
    }
    if (write) {
      write();
    } else {
      alert("Wallet not ready or insufficient funds.");
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
        whiteSpace: 'nowrap'
      }}
    >
      {isWriting ? 'Check Wallet...' :
        isConfirming ? 'Confirming...' :
          isProcessing ? 'Verifying...' :
            `Buy for ${price} VIRTUAL`}
    </button>
  );
}