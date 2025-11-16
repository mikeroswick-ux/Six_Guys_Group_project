import React, { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './WalletConnect.css'

function WalletConnect() {
  const { connectWallet, loading, error } = useWallet()
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    setConnecting(true)
    await connectWallet()
    setConnecting(false)
  }

  return (
    <div className="wallet-connect">
      <div className="wallet-connect-card">
        <div className="wallet-icon">🔐</div>
        <h2>Connect Wallet</h2>
        <p>Connect your Web3 wallet to start using DEX</p>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <button
          className="connect-button"
          onClick={handleConnect}
          disabled={loading || connecting}
        >
          {loading || connecting ? 'Connecting...' : 'Connect MetaMask'}
        </button>

        <div className="wallet-info">
          <p className="info-text">
            💡 Tip: Please ensure MetaMask or another Web3 wallet extension is installed
          </p>
        </div>
      </div>
    </div>
  )
}

export default WalletConnect

