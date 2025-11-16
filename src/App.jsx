import React, { useState } from 'react'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import Header from './components/Header'
import WalletConnect from './components/WalletConnect'
import Swap from './components/Swap'
import Trade from './components/Trade'
import UserStatus from './components/UserStatus'
import './App.css'

function AppContent() {
  const { isConnected } = useWallet()
  const [activeTab, setActiveTab] = useState('swap')

  return (
    <div className="app">
      <Header />
      <main className="main-content">
        {!isConnected ? (
          <div className="connect-container">
            <WalletConnect />
          </div>
        ) : (
          <div className="tabs-container">
            <div className="tabs">
              <button
                className={`tab ${activeTab === 'swap' ? 'active' : ''}`}
                onClick={() => setActiveTab('swap')}
              >
                交换
              </button>
              <button
                className={`tab ${activeTab === 'trade' ? 'active' : ''}`}
                onClick={() => setActiveTab('trade')}
              >
                买卖
              </button>
              <button
                className={`tab ${activeTab === 'status' ? 'active' : ''}`}
                onClick={() => setActiveTab('status')}
              >
                我的资产
              </button>
            </div>

            <div className="tab-content">
              {activeTab === 'swap' && <Swap />}
              {activeTab === 'trade' && <Trade />}
              {activeTab === 'status' && <UserStatus />}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}

export default App

