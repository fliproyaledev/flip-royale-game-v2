// lib/constants.ts

// Base Ağındaki VIRTUAL Token Kontrat Adresi
export const VIRTUAL_TOKEN_ADDRESS = '0x0b3e328455c4059eeb9e3f84b5543f74e24e7e1b';

// SENİN CÜZDAN ADRESİN (Paralar buraya gelecek)
// 👇 BURAYI KENDİ CÜZDAN ADRESİNLE DEĞİŞTİR 👇
export const DEV_WALLET_ADDRESS = '0x59749215DA9aedc456B173146c0890Af87F6E6f4';

// 1 Paket Fiyatı (VIRTUAL Cinsinden)
export const PACK_PRICE = 0.1;

// ERC-20 Standart ABI (Transfer işlemi için gerekli)
export const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
] as const;
