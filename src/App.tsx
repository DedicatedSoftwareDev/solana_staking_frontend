import { useMemo, useState, useEffect } from "react";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { SnackbarProvider } from 'notistack';
import {
    getLedgerWallet,
    getPhantomWallet,
    getSlopeWallet,
    getSolflareWallet,
    getSolletExtensionWallet,
    getSolletWallet,
    getTorusWallet,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import {WalletConnect} from './wallet'
// import Mint from './pages/mint'
import Stake from './pages/stake'
import './bootstrap.min.css';
import './App.css';
import '@solana/wallet-adapter-react-ui/styles.css';
import { display } from "@mui/system";

import { BsListUl } from 'react-icons/bs'; 
import { BsX } from 'react-icons/bs';

export default function App(){
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [getPhantomWallet()], []);
  const [mobileLink, setMobileLink] = useState(false);

  const toggleMenu = () => {
    setMobileLink(!mobileLink);
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <SnackbarProvider>
              <div className="container-fluid">
                <div className="header">
                  <div className="logo-div">
                    <a href="#">
                      <img className="logo-img" src="https://glittercloudsolutions.com/wp-content/uploads/2022/03/61cb59f7b776f0f2a68c93e2_Asset-2@4x.png" alt="" loading="lazy" sizes="100vw"/>
                    </a>
                  </div>
                  <div className="menu-div">
                    {/* <button className="menu-icon"> */}
                    { !mobileLink && <a href="#" onClick={toggleMenu}><BsListUl style={{width:"50px", height:"40px", color:"white", float:"right"}}/></a> }
                    { mobileLink && <a href="#" onClick={toggleMenu}><BsX style={{width:"50px", height:"40px", color:"white", float:"right"}}/></a> }
                    {/* </button> */}
                  </div>
                  <div className="header-link">
                    <a href="#">
                      <p>Home</p>
                    </a>
                    <a href="#">
                      <p>About Us</p>
                    </a>
                    <a href="#">
                      <p>Contact</p>
                    </a>
                  </div>
                  <div className="wallet-connect">
                    <WalletConnect />
                  </div>
                </div>
                <div className={mobileLink ? "mobile-nav" : "d-none"}>
                  <a href="#" onClick={toggleMenu}>
                    <p>Home</p>
                  </a>
                  <a href="#" onClick={toggleMenu}>
                    <p>About Us</p>
                  </a>
                  <a href="#" onClick={toggleMenu}>
                    <p>Contact</p>
                  </a>
                  <div className={"mobile-walletconnect"}>
                    <WalletConnect />
                  </div>
                </div>
                <div className="row">
                  <Stake/>
                </div>
              </div>
            </SnackbarProvider>
          </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );  
}