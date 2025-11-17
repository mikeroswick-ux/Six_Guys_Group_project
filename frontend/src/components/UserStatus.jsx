import React, { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { getUserStatus } from '../services/api'
import './UserStatus.css'

function UserStatus() {
  const { address } = useWallet()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (address) {
      loadStatus()
      const interval = setInterval(loadStatus, 10000)
      return () => clearInterval(interval)
    }
  }, [address])

  const loadStatus = async () => {
    if (!address) return

    setLoading(true)
    setError(null)

    try {
      const data = await getUserStatus(address)
      setStatus(data)
    } catch (err) {
      let errorMessage = 'Failed to load'
      
      if (err.response) {
        // 服务器返回了错误响应
        errorMessage = err.response.data?.error || err.response.data?.message || `Server error: ${err.response.status}`
        if (err.response.data?.hint) {
          errorMessage += `\nHint: ${err.response.data.hint}`
        }
      } else if (err.request) {
        // 请求已发送但没有收到响应
        errorMessage = 'Cannot connect to backend server. Please ensure the API server is running (npm run server)'
      } else {
        // 其他错误
        errorMessage = err.message || 'Failed to load'
      }
      
      setError(errorMessage)
      console.error('Error loading status:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !status) {
    return (
      <div className="status-container">
        <h2>My Assets</h2>
        <div className="loading">Loading...</div>
      </div>
    )
  }

  if (error && !status) {
    return (
      <div className="status-container">
        <h2>My Assets</h2>
        <div className="error-message">{error}</div>
        <button className="retry-button" onClick={loadStatus}>
          Retry
        </button>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="status-container">
      <div className="status-header">
        <h2>My Assets</h2>
        <button className="refresh-button" onClick={loadStatus} disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <div className="card-header">
            <span className="token-icon">Ξ</span>
            <span className="token-name">ETH</span>
          </div>
          <div className="card-value">{status.balances.eth.balanceFormatted}</div>
        </div>

        <div className="status-card">
          <div className="card-header">
            <span className="token-icon">🪙</span>
            <span className="token-name">{status.balances.token0.symbol}</span>
          </div>
          <div className="card-value">{status.balances.token0.totalBalance}</div>
          <div className="card-details">
            <div>Wallet: {status.balances.token0.walletBalance}</div>
            <div>Internal: {status.balances.token0.internalBalance}</div>
          </div>
        </div>

        <div className="status-card">
          <div className="card-header">
            <span className="token-icon">🪙</span>
            <span className="token-name">{status.balances.token1.symbol}</span>
          </div>
          <div className="card-value">{status.balances.token1.totalBalance}</div>
          <div className="card-details">
            <div>Wallet: {status.balances.token1.walletBalance}</div>
            <div>Internal: {status.balances.token1.internalBalance}</div>
          </div>
        </div>

        <div className="status-card lp-card">
          <div className="card-header">
            <span className="token-icon">💎</span>
            <span className="token-name">{status.balances.lpToken.symbol}</span>
          </div>
          <div className="card-value">{status.balances.lpToken.balance}</div>
          <div className="card-details">
            <div className="lp-value">
              <span>Underlying Assets:</span>
              <div>
                {status.balances.lpToken.underlyingValue.token0} {status.balances.token0.symbol}
              </div>
              <div>
                {status.balances.lpToken.underlyingValue.token1} {status.balances.token1.symbol}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pool-info">
        <h3>Liquidity Pool Info</h3>
        <div className="pool-details">
          <div className="pool-item">
            <span className="pool-label">{status.balances.token0.symbol} Reserve:</span>
            <span className="pool-value">{status.pool.reserve0}</span>
          </div>
          <div className="pool-item">
            <span className="pool-label">{status.balances.token1.symbol} Reserve:</span>
            <span className="pool-value">{status.pool.reserve1}</span>
          </div>
        </div>
      </div>

      <div className="address-info">
        <div className="address-label">Wallet Address:</div>
        <div className="address-value">{address}</div>
      </div>
    </div>
  )
}

export default UserStatus

