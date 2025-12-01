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
  // Cüzdan açılmadan önce işlemi hazırlar
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
  // Kullanıcı butona basınca cüzdanı tetikler
  const { data: txData, write, isLoading: isWriting } = useContractWrite(config);

  // 3. ONAY BEKLEME (Wait)
  // Blockchain onayı gelince Backend'i tetikler
  const { isLoading: isConfirming } = useWaitForTransaction({
    hash: txData?.hash,
    onSuccess: (receipt) => {
        console.log("Blockchain onayı alındı, Backend doğrulaması başlıyor...", receipt.transactionHash);
        // Sonsuz döngü olmaması için useEffect yerine burayı kullanıyoruz
        handleBackendVerification(receipt.transactionHash);
    },
    onError: (err) => {
        console.error("Blockchain hatası:", err);
        alert("Transaction failed on blockchain.");
    }
  });

  // 4. BACKEND DOĞRULAMASI
  async function handleBackendVerification(txHash: string) {
    if(isProcessing) return; // Çifte işlem koruması
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
        console.error("JSON Parse Hatası:", e);
      }

      if (res.ok && data?.ok) {
        console.log("Satın alma başarılı!");
        // 🚨 KRİTİK DEĞİŞİKLİK:
        // Alert mesajını KALDIRDIK. Direkt onSuccess() çağırıyoruz.
        // Bu sayede index.tsx'teki Paket Açma Modalı anında belirecek.
        if (onSuccess) onSuccess(); 
      } else {
        console.warn("API Uyarısı:", data?.error);
        // Hata olsa bile para gittiyse akışı bozmamak için devam ettirebiliriz
        // veya sessizce loglayabiliriz.
        if (onSuccess) onSuccess();
      }

    } catch (e) {
      console.error("Doğrulama Hatası:", e);
      // Ağ hatası olsa bile kullanıcıyı mağdur etmemek için başarı varsayabiliriz
      // veya kullanıcıya manuel kontrol etmesini söyleyebiliriz.
      alert("Transaction sent. Please check your inventory in a moment.");
    } finally {
      setIsProcessing(false);
    }
  }

  const isLoading = isWriting || isConfirming || isProcessing;

  const handleBuy = () => {
    if (!userId) return alert("Please login first");
    
    if (prepareError) {
      console.error("Prepare Error:", prepareError);
      const msg = prepareError.message.includes("insufficient funds") 
        ? "Insufficient VIRTUAL balance + ETH for gas." 
        : "Transaction preparation failed. Check console.";
      return alert(msg);
    }

    if (write) {
      write();
    } else {
      alert("Wallet not ready. Please refresh and try again.");
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
        // Buton rengini paket tipine göre ayarla (Gold/Blue)
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
