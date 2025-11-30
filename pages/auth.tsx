import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { useRouter } from 'next/router';

export default function AuthPage() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [status, setStatus] = useState<'idle' | 'checking' | 'registering' | 'logging_in'>('idle');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  // --- HYDRATION FIX (Sadece Client'ta Render Et) ---
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // --------------------------------------------------

  // Cüzdan bağlandığında otomatik kontrol et
  useEffect(() => {
    if (mounted && isConnected && address) {
      checkUser(address);
    } else if (mounted && !isConnected) {
      setStatus('idle');
      setError('');
    }
  }, [isConnected, address, mounted]);

  async function checkUser(walletAddress: string) {
    setStatus('checking');
    setError('');

    try {
      const res = await fetch(`/api/auth/check?address=${walletAddress}`);
      const data = await res.json();

      if (data.exists) {
        loginUser(data.user);
      } else {
        setStatus('registering');
      }
    } catch (e) {
      console.error(e);
      setError('Connection failed. Please try again.');
      setStatus('idle');
      disconnect();
    }
  }

  async function handleRegister() {
    if (!username || username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError('Username can only contain letters, numbers, and underscores.');
      return;
    }

    if (!address) return;

    setStatus('logging_in');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, username })
      });

      const data = await res.json();

      if (data.ok) {
        loginUser(data.user);
      } else {
        setError(data.error || 'Registration failed');
        setStatus('registering');
      }
    } catch (e) {
      setError('Registration error');
      setStatus('registering');
    }
  }

  function loginUser(user: any) {
    localStorage.setItem('flipflop-user', JSON.stringify({
      id: user.id,
      username: user.name || user.username,
      avatar: user.avatar
    }));

    router.push('/');
  }

  // Eğer sayfa henüz tarayıcıda yüklenmediyse boş dön (Hydration hatasını engeller)
  if (!mounted) return null;

  return (
    <div className="app" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, rgba(16,185,129,0.15) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.95) 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 48,
        width: '100%',
        maxWidth: 450,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        textAlign: 'center'
      }}>

        <div style={{ marginBottom: 30 }}>
          <img src="/logo.png" alt="Flip Royale" style={{ width: 100, marginBottom: 20, filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 8 }}>Flip Royale</h1>
          <p className="muted" style={{ fontSize: 14 }}>Connect your wallet to start playing</p>
          <div style={{ marginTop: 12, background: 'rgba(16, 185, 129, 0.2)', color: '#86efac', padding: '8px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            🎁 New players get 1 Common Pack!
          </div>
        </div>

        {!isConnected && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <ConnectButton label="Connect Wallet" showBalance={false} />
          </div>
        )}

        {isConnected && status === 'checking' && (
          <div className="muted" style={{ marginTop: 20 }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>🔍</span> Checking account...
          </div>
        )}

        {isConnected && status === 'logging_in' && (
          <div className="muted" style={{ marginTop: 20 }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>🚀</span> Entering the arena...
          </div>
        )}

        {isConnected && status === 'registering' && (
          <div style={{ marginTop: 20, textAlign: 'left' }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Connected Wallet</p>
              <code style={{ display: 'block', fontSize: 13, color: '#86efac', wordBreak: 'break-all' }}>
                {address}
              </code>
            </div>

            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 8 }}>
              Choose Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: CryptoKing"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.08)',
                color: 'white',
                fontSize: 16,
                marginBottom: 16,
                outline: 'none'
              }}
            />

            <button
              onClick={handleRegister}
              className="btn primary"
              style={{ width: '100%', padding: '14px', fontSize: 16, borderRadius: 10 }}
            >
              Create Account
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button onClick={() => disconnect()} className="btn ghost" style={{ fontSize: 12, opacity: 0.7 }}>
                Disconnect & Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 20, color: '#fca5a5', background: 'rgba(220, 38, 38, 0.15)', padding: 12, borderRadius: 8, fontSize: 14 }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}