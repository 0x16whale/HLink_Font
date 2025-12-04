import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import HLinkABI from "./json/HLink.json";
import './App.css';

import { ConnectButton } from '@rainbow-me/rainbowkit'

const CONTRACT_ADDRESS = "0x45532Daa1106B82259cE95321CDaF2b54757cc98";
const BSC_MAINNET_RPC = "https://bsc-rpc.publicnode.com";

const cuurent_projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID;

function HLinkApp() {
  const [blockNumber, setBlockNumber] = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [lockState, setLockState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [lockType, setLockType] = useState(0);
  const [period, setPeriod] = useState('');
  const [mintAmountBatch, setMintAmountBatch] = useState('');
  const [userAddress, setUserAddress] = useState('');

  const [mintReceiver, setMintReceiver] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [globalLockState, setGlobalLockState] = useState(false);
  const [userLockAddress, setUserLockAddress] = useState('');
  const [userLockState, setUserLockState] = useState(false);
  const [queryUserAddress, setQueryUserAddress] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [userReleaseAmount, setUserReleaseAmount] = useState(null);

  useEffect(() => {
    const fetchBlockNumber = async () => {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
        const blockNumber = await rpcProvider.getBlockNumber();
        setBlockNumber(blockNumber);
      } catch (err) {
        console.error('Failed to fetch block number:', err);
      }
    };

    fetchBlockNumber();
    const interval = setInterval(fetchBlockNumber, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchTotalSupply = useCallback(async () => {
    try {
      setLoading(true);
      const ethersProvider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, ethersProvider);
      const supply = await contract.totalSupply();
      const formatted = ethers.formatEther(supply);
      setTotalSupply(formatted);
    } catch (err) {
      console.error('Failed to fetch total supply:', err);
      setError('Failed to fetch total supply: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLockState = useCallback(async () => {
    try {
      const ethersProvider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, ethersProvider);
      const state = await contract.lockState();
      setLockState(state);
    } catch (err) {
      console.error('Failed to fetch lock state:', err);
      setError('Failed to fetch lock state: ' + err.message);
    }
  }, []);

  useEffect(() => {
    fetchTotalSupply();
    fetchLockState();
  }, [fetchTotalSupply, fetchLockState]);

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message);
      setSuccess(null);
    } else {
      setSuccess(message);
      setError(null);
    }
    setTimeout(() => {
      setError(null);
      setSuccess(null);
    }, 5000);
  };

  const getProviderAndSigner = async () => {
    if (!window.ethereum) {
      showMessage('Please install a wallet extension like MetaMask', true);
      return null;
    }

    try {
      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await ethersProvider.getSigner();
      return { ethersProvider, signer };
    } catch (err) {
      console.error('Failed to get provider/signer:', err);
      showMessage('Failed to connect to wallet: ' + err.message, true);
      return null;
    }
  };

  const getReadOnlyContract = () => {
    try {
      const ethersProvider = new ethers.JsonRpcProvider(BSC_MAINNET_RPC);
      return new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, ethersProvider);
    } catch (err) {
      console.error('Failed to create contract:', err);
      return null;
    }
  };

  const handleMint = async () => {
    if (!mintReceiver || !mintAmount) {
      showMessage('Please fill in receiver address and amount', true);
      return;
    }

    try {
      setLoading(true);
      const connection = await getProviderAndSigner();
      if (!connection) return;
      
      const { signer } = connection;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, signer);
      const amount = ethers.parseEther(mintAmount);
      const tx = await contract.mint(mintReceiver, amount);
      showMessage('Transaction submitted, waiting for confirmation...');
      await tx.wait();
      showMessage('Mint successful!');
      setMintReceiver('');
      setMintAmount('');
      fetchTotalSupply();
    } catch (err) {
      console.error('Mint failed:', err);
      showMessage('Mint failed: ' + (err.reason || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetLock = async () => {
    try {
      setLoading(true);
      const connection = await getProviderAndSigner();
      if (!connection) return;
      
      const { signer } = connection;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, signer);
      const tx = await contract.setLock(globalLockState);
      showMessage('Transaction submitted, waiting for confirmation...');
      await tx.wait();
      showMessage('Global lock set successfully!');
      fetchLockState();
    } catch (err) {
      console.error('Failed to set global lock:', err);
      showMessage('Failed to set global lock: ' + (err.reason || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  const handleSetUserLock = async () => {
    if (!userLockAddress) {
      showMessage('Please fill in user address', true);
      return;
    }

    try {
      setLoading(true);
      const connection = await getProviderAndSigner();
      if (!connection) return;
      
      const { signer } = connection;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, signer);
      console.log("userLockAddress:", userLockAddress);
      console.log("userLockState:", userLockState);

      const tx = await contract.setUserLock(userLockAddress, userLockState);
      showMessage('Transaction submitted, waiting for confirmation...');
      await tx.wait();
      showMessage('User lock set successfully!');
      setUserLockAddress('');
    } catch (err) {
      console.error('Failed to set user lock:', err);
      showMessage('Failed to set user lock: ' + (err.reason || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchSetUser = async () => {
    if (!userAddress || !mintAmountBatch) {
      showMessage('Please fill in user address and mint amount', true);
      return;
    }

    try {
      setLoading(true);
      const connection = await getProviderAndSigner();
      if (!connection) return;
      
      const { signer } = connection;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, signer);
      
      let paramsGroup = [{
        thisLockType: Number(lockType), 
        period: Number(period) || 0, 
        mintAmount: ethers.parseEther(mintAmountBatch),
        user: userAddress
      }];

      const tx = await contract.batchSetUser(paramsGroup);
      showMessage('Transaction submitted, waiting for confirmation...');
      await tx.wait();
      showMessage('User set successfully!');
      
      setLockType(1);
      setPeriod('');
      setMintAmountBatch('');
      setUserAddress('');
    } catch (err) {
      console.error('Failed to batch set user:', err);
      showMessage('Failed to set user: ' + (err.reason || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  const handleGetUserInfo = async () => {
    if (!queryUserAddress) {
      showMessage('Please fill in user address', true);
      return;
    }

    try {
      setLoading(true);
      const contract = getReadOnlyContract();
      if (!contract) return;
      
      const info = await contract.getUserInfo(queryUserAddress);
      const lockTypeMap = { 0: 'Suspend', 1: 'Linear' };
      const lockTypeText = info.lockType === 0 ? 'Suspend' : 'Linear'; 
      
      setUserInfo({
        whitelist: info.whitelist,
        lockType: lockTypeText,
        startTime: new Date(Number(info.startTime) * 1000).toLocaleString(),
        lastWithdrawTime: info.lastWithdrawTime > 0 
          ? new Date(Number(info.lastWithdrawTime) * 1000).toLocaleString() 
          : 'N/A',
        endTime: info.endTime > 0 
          ? new Date(Number(info.endTime) * 1000).toLocaleString() 
          : 'N/A',
        alreadyMint: ethers.formatEther(info.alreadyMint),
        totalMint: ethers.formatEther(info.totalMint)
      });
    } catch (err) {
      console.error('Failed to get user info:', err);
      showMessage('Failed to get user info: ' + err.message, true);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleGetUserReleaseAmount = async () => {
    if (!queryUserAddress) {
      showMessage('Please fill in user address', true);
      return;
    }

    try {
      setLoading(true);
      const contract = getReadOnlyContract();
      if (!contract) return;
      
      const amount = await contract.getUserReleaseAmount(queryUserAddress);
      setUserReleaseAmount(ethers.formatEther(amount));
    } catch (err) {
      console.error('Failed to get release amount:', err);
      showMessage('Failed to get release amount: ' + err.message, true);
      setUserReleaseAmount(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    try {
      setLoading(true);
      const connection = await getProviderAndSigner();
      if (!connection) return;
      
      const { signer } = connection;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, HLinkABI.abi, signer);
      const tx = await contract.release();
      showMessage('Transaction submitted, waiting for confirmation...');
      await tx.wait();
      showMessage('Release successful!');
    } catch (err) {
      console.error('Release failed:', err);
      showMessage('Release failed: ' + (err.reason || err.message), true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="block-number">
        Block Height: {blockNumber ? blockNumber.toLocaleString() : 'Loading...'}
      </div>

      <div className="app-content">
        <header className="app-header">
          <div className="connect-button-wrapper">
            <ConnectButton />
          </div>
          <p>Contract: <a href={`https://bscscan.com/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer">{CONTRACT_ADDRESS}</a></p>
        </header>

        <div className="wallet-section">


        </div>

        {error && <div className="message error">{error}</div>}
        {success && <div className="message success">{success}</div>}

        <div className="info-section">
          <h2>Token Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Total Supply:</label>
              <span>{totalSupply ? `${parseFloat(totalSupply).toLocaleString()} HLINK` : 'Loading...'}</span>
            </div>
            <div className="info-item">
              <label>Global Lock:</label>
              <span>{lockState !== null ? (lockState ? '🔒 Locked' : '🔓 Unlocked') : 'Loading...'}</span>
            </div>
            <div className="info-item">
              <label>Max Supply:</label>
              <span>1,000,000,000 HLINK</span>
            </div>
          </div>
          <button onClick={fetchTotalSupply} className="btn btn-secondary" disabled={loading}>
            Refresh
          </button>
        </div>

        <div className="functions-section">
          <div className="function-card">
            <h3>Mint Tokens</h3>
            <div className="form-group">
              <label>Receiver Address:</label>
              <input
                type="text"
                value={mintReceiver}
                onChange={(e) => setMintReceiver(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>Amount (HLINK):</label>
              <input
                type="text"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                placeholder="1000"
              />
            </div>
            <button onClick={handleMint} className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Mint'}
            </button>
          </div>

          <div className="function-card">
            <h3>Set Global Lock</h3>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={globalLockState}
                  onChange={(e) => setGlobalLockState(e.target.checked)}
                />
                Lock (non-whitelist users cannot transfer)
              </label>
            </div>
            <button onClick={handleSetLock} className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Set'}
            </button>
          </div>

          <div className="function-card">
            <h3>Set User Lock</h3>
            <div className="form-group">
              <label>User Address:</label>
              <input
                type="text"
                value={userLockAddress}
                onChange={(e) => setUserLockAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={userLockState}
                  onChange={(e) => setUserLockState(e.target.checked)}
                />
                Lock
              </label>
            </div>
            <button onClick={handleSetUserLock} className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Set'}
            </button>
          </div>

          <div className="function-card">
            <h3>Set User Parameters</h3>
            <div className="form-group">
              <label>Lock Type:</label>
              <select
                value={lockType}
                onChange={(e) => setLockType(Number(e.target.value))}
                className="form-select"
              >
                <option value={0}>0 = Suspend</option>
                <option value={1}>1 = Linear</option>
              </select>
            </div>
            <div className="form-group">
              <label>Period (seconds):</label>
              <input
                type="number"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="86400 = 1 day"
              />
            </div>
            <div className="form-group">
              <label>Mint Amount (HLINK):</label>
              <input
                type="text"
                value={mintAmountBatch}
                onChange={(e) => setMintAmountBatch(e.target.value)}
                placeholder="1 = 1 HLINK"
              />
            </div>
            <div className="form-group">
              <label>User Address:</label>
              <input
                type="text"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            
            <button onClick={handleBatchSetUser} className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Set User'}
            </button>
          </div>

          <div className="function-card">
            <h3>Query User Info</h3>
            <div className="form-group">
              <label>User Address:</label>
              <input
                type="text"
                value={queryUserAddress}
                onChange={(e) => setQueryUserAddress(e.target.value)}
                placeholder="0x..."
              />
            </div>
            <div className="button-group">
              <button onClick={handleGetUserInfo} className="btn btn-primary" disabled={loading}>
                {loading ? 'Querying...' : 'Query User Info'}
              </button>
              <button onClick={handleGetUserReleaseAmount} className="btn btn-primary" disabled={loading}>
                {loading ? 'Querying...' : 'Query Release Amount'}
              </button>
            </div>
            {userInfo && (
              <div className="user-info-display">
                <h4>User Information:</h4>
                <ul>
                  <li>Whitelist: {userInfo.whitelist ? 'Yes' : 'No'}</li>
                  <li>Lock Type: {userInfo.lockType}</li>
                  <li>Start Time: {userInfo.startTime}</li>
                  <li>Last Withdraw: {userInfo.lastWithdrawTime}</li>
                  <li>End Time: {userInfo.endTime}</li>
                  <li>Already Minted: {parseFloat(userInfo.alreadyMint).toLocaleString()} HLINK</li>
                  <li>Total Mint: {parseFloat(userInfo.totalMint).toLocaleString()} HLINK</li>
                </ul>
              </div>
            )}
            {userReleaseAmount !== null && (
              <div className="user-info-display">
                <h4>Release Amount:</h4>
                <p>{parseFloat(userReleaseAmount).toLocaleString()} HLINK</p>
              </div>
            )}
          </div>

          <div className="function-card">
            <h3>Release Tokens</h3>
            <p>Release linear release tokens for your current account</p>
            <button onClick={handleRelease} className="btn btn-primary" disabled={loading}>
              {loading ? 'Processing...' : 'Release'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
      <HLinkApp />
  );
}

export default App;