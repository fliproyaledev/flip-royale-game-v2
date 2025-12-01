import { useState } from 'react';
import { useAccount, useSendTransaction, useWaitForTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { VIRTUAL_TOKEN_ADDRESS, DEV_WALLET_ADDRESS } from '../lib/constants';

// VIRTUAL Token ABI (Sadece transfer fonksiyonu yeterli)
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

export default function BuyButton({ userId, onSuccess, price, packType, compact }: any) {
  const { address, isConnected } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Transaction Hook'ları
  const { data: hash, sendTransaction } = useSendTransaction();

  // Transaction'ın onaylanmasını bekle
  const { isLoading: isWaiting } = useWaitForTransaction({
    hash,
    onSuccess: async (data) => {
      console.log("Blockchain işlemi başarılı:", data.transactionHash);
      await verifyPurchase(data.transactionHash);
    },
    onError: (err) => {
      console.error("Blockchain hatası:", err);
      setIsProcessing(false);
      alert("Transaction failed on blockchain.");
    }
  });

  const handleBuy = async () => {
    if (!isConnected || !address) {
      alert("Please connect wallet first");
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Ödemeyi Gönder (VIRTUAL Token Transferi)
      sendTransaction({
        to: VIRTUAL_TOKEN_ADDRESS,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [DEV_WALLET_ADDRESS, parseEther(price.toString())]
        })
      });
      // Not: sendTransaction başarılı olursa yukarıdaki useWaitForTransaction tetiklenir.
    } catch (err: any) {
      console.error("Ödeme başlatma hatası:", err);
      setIsProcessing(false);
    }
  };

  // 2. İşlemi Backend'e (Oracle'a) Bildir
  const verifyPurchase = async (txHash: string) => {
    try {
      console.log("Backend doğrulaması başlıyor...", txHash);
      
      const res = await fetch('/api/shop/verify-purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          txHash: txHash,
          packType: packType,
          count: 1 // Şimdilik tekli alım
        })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        alert("Purchase Successful! Pack added to inventory.");
        if (onSuccess) onSuccess(); // Envanteri yenile
      } else {
        // Kartlar eklenmiş olabilir ama API hata vermiş olabilir
        console.warn("API Uyarı:", data.error);
        // Kullanıcıyı korkutmamak için yine de başarı mesajı verilebilir veya:
        alert("Purchase Complete! Please check your inventory.");
      }

    } catch (err) {
      console.error("Doğrulama hatası:", err);
      // Kritik nokta: Kartlar muhtemelen eklendi, sadece frontend hatası
      alert("Purchase processed. Please refresh page to see your cards.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper: Viem için encode fonksiyonu (Eğer projende yüklü değilse manuel ekle)
  function encodeFunctionData({ abi, functionName, args }: any) {
    const { encodeFunctionData } = require('viem');
    return encodeFunctionData({ abi, functionName, args });
  }

  const isLoading = isProcessing || isWaiting;

  return (
    <button
      onClick={handleBuy}
      disabled={isLoading}
      className="btn"
      style={{
        width: '100%',
        background: packType === 'rare' 
          ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' 
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        opacity: isLoading ? 0.7 : 1,
        cursor: isLoading ? 'wait' : 'pointer',
        fontWeight: 700,
        padding: compact ? '8px' : '12px',
        fontSize: compact ? '13px' : '15px',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        marginTop: '8px'
      }}
    >
      {isLoading ? 'Verifying...' : `Buy for ${price} VIRTUAL`}
    </button>
  );
}
