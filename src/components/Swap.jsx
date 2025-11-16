import React, { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { getSwapQuote, executeSwap, checkApproval, buildApproval } from '../services/api'
import { ethers } from 'ethers'
import './Swap.css'

function Swap() {
  const { address, signer, networkConfig } = useWallet()
  const [tokenIn, setTokenIn] = useState('')
  const [tokenOut, setTokenOut] = useState('')
  const [amountIn, setAmountIn] = useState('')
  const [amountOut, setAmountOut] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [needsApproval, setNeedsApproval] = useState(false)

  useEffect(() => {
    if (networkConfig?.contracts) {
      setTokenIn(networkConfig.contracts.Token0 || '')
      setTokenOut(networkConfig.contracts.Token1 || '')
    }
  }, [networkConfig])

  useEffect(() => {
    if (amountIn && tokenIn && address) {
      fetchQuote()
      checkTokenApproval()
    } else {
      setAmountOut('')
    }
  }, [amountIn, tokenIn, address])

  const fetchQuote = async () => {
    if (!amountIn || !tokenIn) return

    try {
      const quote = await getSwapQuote(tokenIn, amountIn, address)
      setAmountOut(quote.amountOut || '0')
      setError(null)
    } catch (err) {
      console.error('Error fetching quote:', err)
      setAmountOut('0')
    }
  }

  const checkTokenApproval = async () => {
    if (!tokenIn || !address) return

    try {
      const approval = await checkApproval(tokenIn, address)
      const amountInWei = ethers.parseUnits(amountIn || '0', 18)
      setNeedsApproval(approval.allowance < amountInWei)
    } catch (err) {
      console.error('Error checking approval:', err)
    }
  }

  const handleApprove = async () => {
    if (!signer || !tokenIn) return

    setLoading(true)
    setError(null)

    try {
      const approvalData = await buildApproval(tokenIn, 'max', address)
      const tx = await signer.sendTransaction(approvalData)
      await tx.wait()
      setNeedsApproval(false)
      setSuccess('Approval successful!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message || 'Approval failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSwap = async () => {
    if (!signer || !amountIn || !tokenIn || !tokenOut) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (needsApproval) {
        setError('Please approve token first')
        setLoading(false)
        return
      }

      const minAmountOut = (parseFloat(amountOut) * 0.95).toFixed(6)
      const swapData = await executeSwap(tokenIn, amountIn, minAmountOut, address, address)

      if (swapData.requiresApproval) {
        setNeedsApproval(true)
        setError('Token approval required')
        setLoading(false)
        return
      }

      const tx = await signer.sendTransaction({
        to: swapData.data.to,
        data: swapData.data.data,
        value: swapData.data.value
      })

      setSuccess('Transaction submitted, waiting for confirmation...')
      const receipt = await tx.wait()
      setSuccess('Swap successful!')
      setAmountIn('')
      setAmountOut('')
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.message || 'Swap failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSwitch = () => {
    const temp = tokenIn
    setTokenIn(tokenOut)
    setTokenOut(temp)
    const tempAmount = amountIn
    setAmountIn(amountOut)
    setAmountOut(tempAmount)
  }

  return (
    <div className="swap-container">
      <h2>Token Swap</h2>
      
      <div className="swap-card">
        <div className="swap-input-group">
          <label>Pay</label>
          <div className="input-wrapper">
            <input
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
              disabled={loading}
            />
            <div className="token-select">
              <span>{tokenIn ? `${tokenIn.slice(0, 6)}...${tokenIn.slice(-4)}` : 'Select Token'}</span>
            </div>
          </div>
        </div>

        <button className="switch-button" onClick={handleSwitch} disabled={loading}>
          ⇅
        </button>

        <div className="swap-input-group">
          <label>Receive (Estimated)</label>
          <div className="input-wrapper">
            <input
              type="text"
              placeholder="0.0"
              value={amountOut}
              readOnly
              className="readonly"
            />
            <div className="token-select">
              <span>{tokenOut ? `${tokenOut.slice(0, 6)}...${tokenOut.slice(-4)}` : 'Select Token'}</span>
            </div>
          </div>
        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        {needsApproval ? (
          <button
            className="action-button approve-button"
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Approve Token'}
          </button>
        ) : (
          <button
            className="action-button swap-button"
            onClick={handleSwap}
            disabled={loading || !amountIn || !amountOut}
          >
            {loading ? 'Processing...' : 'Swap'}
          </button>
        )}
      </div>
    </div>
  )
}

export default Swap

