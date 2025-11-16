import React from 'react'
import { useWallet } from '../contexts/WalletContext'
import './Header.css'

function Header() {
  const { isConnected, address, disconnectWallet, connectWallet } = useWallet()

  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const handleSwitchAccount = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // 请求切换账户（MetaMask 会弹出账户选择界面）
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
        // 重新连接以获取新账户
        await connectWallet()
      } catch (err) {
        console.error('Error switching account:', err)
      }
    }
  }

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <h1>🔄 DEX</h1>
          <span>Decentralized Exchange</span>
        </div>
        <div className="wallet-info">
          {isConnected ? (
            <div className="connected-wallet">
              <div className="wallet-address">
                <span className="status-dot"></span>
                {formatAddress(address)}
              </div>
              <button className="switch-btn" onClick={handleSwitchAccount} title="Switch Account">
                Switch
              </button>
              <button className="disconnect-btn" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <div className="not-connected">Not Connected</div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header

