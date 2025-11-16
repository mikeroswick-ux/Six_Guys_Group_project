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
        <h2>连接钱包</h2>
        <p>连接您的 Web3 钱包以开始使用 DEX</p>
        
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
          {loading || connecting ? '连接中...' : '连接 MetaMask'}
        </button>

        <div className="wallet-info">
          <p className="info-text">
            💡 提示：请确保已安装 MetaMask 或其他 Web3 钱包扩展
          </p>
        </div>
      </div>
    </div>
  )
}

export default WalletConnect

