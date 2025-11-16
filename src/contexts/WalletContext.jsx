import React, { createContext, useContext, useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { getNetworkConfig } from '../services/api'

const WalletContext = createContext()

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}

export function WalletProvider({ children }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState(null)
  const [provider, setProvider] = useState(null)
  const [signer, setSigner] = useState(null)
  const [networkConfig, setNetworkConfig] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    checkConnection()
    loadNetworkConfig()
  }, [])

  const loadNetworkConfig = async () => {
    try {
      const config = await getNetworkConfig()
      setNetworkConfig(config)
    } catch (err) {
      console.error('Failed to load network config:', err)
    }
  }

  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          await connectWallet()
        }
      } catch (err) {
        console.error('Error checking connection:', err)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setError('Please install MetaMask or another Web3 wallet')
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])
      
      const signer = await provider.getSigner()
      const address = await signer.getAddress()

      if (networkConfig) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${networkConfig.chainId.toString(16)}` }],
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: `0x${networkConfig.chainId.toString(16)}`,
                chainName: 'Localhost',
                rpcUrls: [networkConfig.rpcUrl],
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
              }],
            })
          }
        }
      }

      setProvider(provider)
      setSigner(signer)
      setAddress(address)
      setIsConnected(true)

      window.ethereum.on('accountsChanged', handleAccountsChanged)
      window.ethereum.on('chainChanged', handleChainChanged)

      return true
    } catch (err) {
      console.error('Error connecting wallet:', err)
      setError(err.message || 'Failed to connect wallet')
      return false
    } finally {
      setLoading(false)
    }
  }

  const disconnectWallet = () => {
    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      window.ethereum.removeListener('chainChanged', handleChainChanged)
    }
    setProvider(null)
    setSigner(null)
    setAddress(null)
    setIsConnected(false)
  }

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet()
    } else {
      connectWallet()
    }
  }

  const handleChainChanged = () => {
    window.location.reload()
  }

  const value = {
    isConnected,
    address,
    provider,
    signer,
    networkConfig,
    loading,
    error,
    connectWallet,
    disconnectWallet,
  }

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

