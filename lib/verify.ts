// lib/verify.ts
import { verifyMessage } from 'viem'

/**
 * Kullanıcının gönderdiği imzayı doğrular.
 * @param address - Kullanıcının cüzdan adresi (0x...)
 * @param message - İmzalanan metin (Örn: "Save Picks")
 * @param signature - Cüzdandan gelen kriptografik imza
 */
export async function verifyUserSignature(
  address: string, 
  message: string, 
  signature: string
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message: message,
      signature: signature as `0x${string}`,
    })
    return valid
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}