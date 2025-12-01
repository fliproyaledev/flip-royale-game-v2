import { getDefaultWallets } from '@rainbow-me/rainbowkit';
import { configureChains, createConfig } from 'wagmi';
import { publicProvider } from 'wagmi/providers/public';

// Eğer Base ağı wagmi/chains içinde yoksa (eski sürümlerde olabilir),
// onu manuel olarak tanımlayarak hatayı garanti çözeriz:
export const base = {
  id: 8453,
  name: 'Base',
  network: 'base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['https://mainnet.base.org'] },
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'Basescan', url: 'https://basescan.org' },
  },
} as const;

// Proje ID'si
const projectId = process.env.NEXT_PUBLIC_WALLET_PROJECT_ID || '64eacce4072beecbb82a5c6f1c612552';

// 1. Zincirleri yapılandır
const { chains, publicClient } = configureChains(
  [base],
  [publicProvider()]
);

// 2. Cüzdanları al
const { connectors } = getDefaultWallets({
  appName: 'Flip Royale',
  projectId,
  chains
});

// 3. Config oluştur
export const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
})

// Zincirleri dışa aktar ( _app.tsx kullanacak )
export { chains };
