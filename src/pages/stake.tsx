import { Fragment, useRef, useState, useEffect } from 'react';
import { Button, Modal } from 'react-bootstrap';
import useNotify from './notify'
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import * as anchor from "@project-serum/anchor";
import {AccountLayout,MintLayout,TOKEN_PROGRAM_ID,Token,ASSOCIATED_TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { TokenListProvider, TokenInfo } from '@solana/spl-token-registry';
import { programs } from '@metaplex/js'
import moment from 'moment';
import Loading from "./Loading";
// import win_horns from "./video/win_horns.mov";
// import winhorns from "../asset/video/winhorns.mp4";
import winhorns from "../asset/video/winhorns.mp4";
import winhalos from "../asset/video/winhalos.mp4";
import { FaDiscord } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa";
// import drawn from "../asset/video/drawn.mp4";
import {
  Connection,
  Keypair,
  Signer,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  ConfirmOptions,
  sendAndConfirmRawTransaction,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  Commitment,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_CLOCK_PUBKEY,
  clusterApiUrl,
  StakeInstruction
} from "@solana/web3.js";
import axios from "axios"
import { token } from '@project-serum/anchor/dist/cjs/utils';
import { createJsxClosingElement, moveEmitHelpers, PollingWatchKind } from 'typescript';
import { clearInterval } from 'timers';
import { unstable_renderSubtreeIntoContainer } from 'react-dom';
import SelectInput from '@mui/material/Select/SelectInput';

let wallet : any
// let conn = new Connection(clusterApiUrl('mainnet-beta'))
let conn = new Connection("https://ssc-dao.genesysgo.net/");
let notify : any
const { metadata: { Metadata } } = programs
const COLLECTION_NAME = "Gorilla"
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
)
const programId = new PublicKey('BYXYF76vQSBiiMGpkmBLtiUWsa5TDLQBPueFuPzPrj9E')
const idl = require('./solana_anchor.json')
const confirmOption : ConfirmOptions = {
    commitment : 'finalized',
    preflightCommitment : 'finalized',
    skipPreflight : false
}

// const REWARD_TOKEN = 'sou1ELxm3XpLWpnjP81KaoigPPCwbNUFAZ4dhqifq13' //Mainnet beta
const REWARD_TOKEN = 'sou1ELxm3XpLWpnjP81KaoigPPCwbNUFAZ4dhqifq13'

let POOL = new PublicKey('Dw14gB5BKLzy3SqkQRDjkKFcqrDtMgL9sUdZFXfG4aAq') // Devnet
// const HVH_DATA_SIZE = 8 + 32 + 32 + 32 + 32 + 8 + 1;
const HVH_DATA_SIZE = 32 * 4 + 8 + 1;
const SOLDIER_DATA_SIZE = 32 * 4 + 8 + 1 +  4 + 10;

const DEVNET_ID = 103;

let init = true;
let ownerstakedinfo: any = null;
let pD : any ;
// let claimAmount = 0
let nfts : any[] = []
let soldiers : any[] = []
let stakedNfts : any[] = []
let stakedSoldiers : any[] = []
let catchFlag : boolean = false;
let selected_soldier : any = {};
const delay_ms : Number = 30;
let stakeallflag : Boolean = true;
const axios_timeout : any = 2000;

const getTimeZoneOffset = (date : any, timeZone : any) => {

  // Abuse the Intl API to get a local ISO 8601 string for a given time zone.
  const options = {
      timeZone, calendar: 'iso8601', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
};
 // @ts-ignore
 const dateTimeFormat = new Intl.DateTimeFormat(undefined, options);
 const parts = dateTimeFormat.formatToParts(date);
 const map = new Map(parts.map((x) => [x.type, x.value]));
 const year = map.get('year');
 const month = map.get('month');
 const day = map.get('day');
 const hour = map.get('hour');
 const minute = map.get('minute');
 const second = map.get('second');
 const ms = date.getMilliseconds().toString().padStart(3, '0');
 const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}`;

 // Lie to the Date object constructor that it's a UTC time.
 const lie = new Date(`${iso}Z`);

 // Return the difference in timestamps, as minutes
 // Positive values are West of GMT, opposite of ISO 8601
 // this matches the output of `Date.getTimeZoneOffset`
 // @ts-ignore
 return -(lie - date) / 60 / 1000;
};

function sleep(time: any){
  return new Promise((resolve)=>setTimeout(resolve,time)
)
}

const getTimeStampOfDateInEnvTimeZone = (timeStamp:number, userTimezone: string, timezoneForTesting:string) => {

  const envTimeZoneOffsetInMinutes = getTimeZoneOffset(new Date(timeStamp), timezoneForTesting);
  const userTimeZoneOffsetInMInutes = getTimeZoneOffset(new Date(timeStamp), userTimezone);
  const difference = userTimeZoneOffsetInMInutes - envTimeZoneOffsetInMinutes;
  const diffInMilliseconds = difference * 60000;
  return timeStamp - diffInMilliseconds;
};

const createAssociatedTokenAccountInstruction = (
  associatedTokenAddress: anchor.web3.PublicKey,
  payer: anchor.web3.PublicKey,
  walletAddress: anchor.web3.PublicKey,
  splTokenMintAddress: anchor.web3.PublicKey
    ) => {  
  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
    { pubkey: walletAddress, isSigner: false, isWritable: false },
    { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    {
      pubkey: anchor.web3.SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  return new anchor.web3.TransactionInstruction({
    keys,
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([]),
  });
}

const getTokenListInfo = async (address:String, chainId:Number) => {
  const tokens: any = await new TokenListProvider().resolve();
  const tokenlist: any = await tokens.filterByChainId(chainId).getList();
  let tokenitem;
  await tokenlist.map((item: any) => {
    if(item.address === address) {
      tokenitem = item;
    }
  });
  return tokenitem;
}

const getMasterEdition = async (
  mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
        Buffer.from("edition"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getMetadata = async (
  mint: anchor.web3.PublicKey
    ): Promise<anchor.web3.PublicKey> => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
  )[0];
};

const getTokenWallet = async (
  wallet: anchor.web3.PublicKey,
  mint: anchor.web3.PublicKey
    ) => {
  return (
    await anchor.web3.PublicKey.findProgramAddress(
      [wallet.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  )[0];
};

const getStakeStateInfo = async (address: PublicKey) => {
  let wallet = new anchor.Wallet(Keypair.generate())
  let provider = new anchor.Provider(conn,wallet,confirmOption)
  const program = new anchor.Program(idl,programId,provider)
  let poolData = await program.account.stakeState.fetch(address)
  return poolData;
}

const getStakeDataInfo = async (address: PublicKey) => {
  let wallet = new anchor.Wallet(Keypair.generate())
  let provider = new anchor.Provider(conn,wallet,confirmOption)
  const program = new anchor.Program(idl,programId,provider)
  let poolData = await program.account.hvHData.fetch(address)
  return poolData;
}

const getSoldierDataInfo = async (address: PublicKey) => {
  let wallet = new anchor.Wallet(Keypair.generate())
  let provider = new anchor.Provider(conn,wallet,confirmOption)
  const program = new anchor.Program(idl,programId,provider)
  let poolData = await program.account.soldierData.fetch(address)
  return poolData;
}

async function getTokenAccountBalance(owner: PublicKey, mint: PublicKey) {
  let amount = 0
    if( owner != null ){
      const tokenAccount = await getTokenWallet(owner, mint)
      if(await conn.getAccountInfo(tokenAccount)){
        let resp : any = (await conn.getTokenAccountBalance(tokenAccount)).value
        amount = Number(resp.uiAmount)
      }
    }
  return amount;
}

async function getProgramAccount(owner : PublicKey, pool: PublicKey, token: PublicKey) {
  // console.log(owner, pool, token);
  return await PublicKey.findProgramAddress([owner.toBuffer(),pool.toBuffer(), token.toBuffer()], programId)
}

async function getOwnerStakeStateInfo() {
  const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
  let [stakeState] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
  if((await conn.getAccountInfo(stakeState)) == null) {
    return;
  }

  let balance = await getTokenAccountBalance(wallet.publicKey, reward_mint);

  let stateinfo = await getStakeStateInfo(stakeState);
  //halosCount hornsCount soldierHalosCount soldierHornsCount
  // console.log("state data", stateinfo)
  let halos_mul = stateinfo.halosCount.toNumber() / 10 | 0;
  let horns_mul = stateinfo.hornsCount.toNumber() / 10 | 0;

  let halos_unit = stateinfo.halosCount.toNumber() + (halos_mul + 1) * stateinfo.soldierHalosCount.toNumber();
  let horns_unit = stateinfo.hornsCount.toNumber() + (horns_mul + 1) * stateinfo.soldierHornsCount.toNumber();

  ownerstakedinfo = {
    ...stateinfo,
    souls : balance,
    halos_unit : halos_unit,
    horns_unit : horns_unit
  }
}

let init_flag= false;

export function SelectHHModal(props : any) {

  return (
    <Modal
      show = {props.show}
      onHide = {props.onHide}
      size="sm"
      aria-labelledby="contained-modal-title-vcenter"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="contained-modal-title-vcenter">
          Select Team
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {pD && <h5>
          {pD.win_team_stake} to Won team and {pD.lost_team_stake} to Lost team
        </h5>}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={props.OnHalos}>Halos</Button>
        <Button onClick={props.OnHorns}>Horns</Button>
      </Modal.Footer>
    </Modal>
  );
}

export default function Stake(){

	const [changed, setChange] = useState(true)
	const [rewardAmount, setRewardAmount] = useState(10)
	const [period, setPeriod] = useState(60)
	const [withdrawable, setWithdrawable] = useState(7)
	const [collectionName, setCollectionName] = useState(COLLECTION_NAME)
	const [rewardToken, setRewardToken] = useState(REWARD_TOKEN)
  const [todaystr, setDateTime] = useState(""); // Save the current date to be able to trigger an update
  const [loading, setLoading] = useState(false);
  const [claimableAmount, setClaimAmount] = useState(0);
  const [stakingPeriod, setStakingPeriod] = useState({start:"", end:""});
  const [withdrawPeriod, setWithdrawPeriod] = useState({start:"", end: ""});
  const [fightingFlag, setFightingFlag] = useState(0);//default halos win
  const [winTeam, setWinTeam] = useState("");
  const [modalShow, setModalShow] = useState(false);
  // const [stakeallflag, setStakeAllFlag] = useState(true);
  // const [init, setInitFlag] = useState(false);
  
  let stakedinfo;

  wallet = useWallet()
	notify = useNotify()

  useEffect(() => {
    const timer = setInterval(() => {
      getTime();
    },1000);

    return () => {
      clearInterval(timer);
    }
  }, []);

  useEffect(() => {
    if(wallet){
      if(!wallet.disconnecting && wallet.publicKey && !init_flag) {
        init_flag = true;
        console.log("get info")
        getNfts()
      }
    }
  }, [wallet])
  // useEffect(() => {
  //   if(wallet.publicKey !== undefined) {
  //     console.log("wallet", wallet)
  //     getNfts()
  //     init = false
  //   }
  // }, [loading])

  // const testTimezone = () => {

  //   const timezoneOffset = (new Date()).getTimezoneOffset();

  //   console.log("timezone offset", timezoneOffset);

  //   const date = new Date();
  //   const dateAsString = date.toString();
  //   console.log("date string", dateAsString)

  //   console.log(moment().utcOffset()); // (-240, -120, -60, 0, 60, 120, 240, etc.)
  //   // const timezone = dateAsString.match(/\(([^\)]+)\)$/)[1];

  //   // console.log(timezone);

  // }

  const setSelectSoldier = (nftaccount : any, nftmint : any) => {
    selected_soldier = {nftaccount, nftmint}
    stakeallflag = true;
    setModalShow(true)
  }

  const setSelectAllFlag = () => {
    stakeallflag = false;
    setModalShow(true);
  }

  const stakeSoldierToHalos = () => {
    if(stakeallflag)
      stakeSoldier(selected_soldier.nftaccount, selected_soldier.nftmint, pD.token_halos)
    else
      stakeSoldiersAll(pD.token_halos)
    setModalShow(false)
  }

  const stakeSoldierToHorns = () => {
    if(stakeallflag)
      stakeSoldier(selected_soldier.nftaccount, selected_soldier.nftmint, pD.token_horns)
    else 
      stakeSoldiersAll(pD.token_horns)
    setModalShow(false)
  }

  const getTime = () => {
    // testTimezone();
    const today = new Date();
    setDateTime(today.toLocaleString("en-US"));

    if(pD) {
      catchClaimPeriod();
    }

    if(pD) {
      if(moment().unix() > Date.parse(pD.end_withdraw) / 1000) {
        updateStakingPeriod();
      }
    }
  }

  const updateStakingPeriod = async () => {

    let time_period = getStakingPeriod();

    const time_interval = moment().unix() - time_period.withdraw_limit;

    let day_interval = time_interval / (time_period.total_period * pD.period);
    day_interval = day_interval | 0;

    if(time_interval < 0)
      day_interval--;

    const starttime = Date.parse(pD.abs_start_time) / 1000 + pD.period * (day_interval + 1) * time_period.total_period;
    const next_staking_limit = starttime + pD.period * pD.staking_period;
    const withdrawtime = next_staking_limit + 1;
    const next_withdraw_limit = withdrawtime + pD.period * pD.withdraw_period;

    const next_staking_start = new Date(starttime * 1000);
    const next_staking_end = new Date(next_staking_limit * 1000);
    const next_withdraw_start = new Date(withdrawtime * 1000);
    const next_withdraw_end = new Date(next_withdraw_limit * 1000);

    pD.start_time = next_staking_start;
    pD.end_time = next_staking_end;

    pD.start_withdraw = next_withdraw_start;
    pD.end_withdraw = next_withdraw_end;

    setStakingPeriod({
      start: next_staking_start.toLocaleString("en-US"),
      end: next_staking_end.toLocaleString("en-US"),
    })

    setWithdrawPeriod({
      start: next_withdraw_start.toLocaleString("en-US"),
      end: next_withdraw_end.toLocaleString("en-US")
    })
  }

  const catchClaimPeriod = async () => {

    if((moment().unix() > (Date.parse(pD.end_time) / 1000)) && (moment().unix() < (Date.parse(pD.end_withdraw) / 1000))) {
      if(catchFlag)
        return;
      getClaimAmount(conn, wallet.publicKey);

      let halos_mul = pD.halos_count / 10 | 0;
      let horns_mul = pD.horns_count / 10 | 0;

      let total_halos_soldiers = pD.halos_count + (halos_mul + 1) * pD.soldier_halos_count;
      let total_horns_soldiers = pD.horns_count + pD.soldier_horns_count * (horns_mul + 1);

      // console.log("test val", total_halos_soldiers, total_horns_soldiers)

      if(total_halos_soldiers > total_horns_soldiers) {
        setFightingFlag(0);// halos win
        setWinTeam("Halos");
      } else if(total_halos_soldiers < total_horns_soldiers) {
        setFightingFlag(1);// horns win
        setWinTeam("Horns");
      } else {
        setFightingFlag(2);// drawn
        setWinTeam("Drawn");
      }

      catchFlag = true;
    } else {
      catchFlag = false;
    }
  }

  async function validateStaking(
    conn : Connection,
    owner : PublicKey
    ){
    console.log("+ validate Staking")

    if(!wallet.connected) {
      notify('error', 'Wallet is unconnected!');
      // setLoading(false);
      return false;
    }

    const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
    const program = new anchor.Program(idl, programId, provider);

    await getPoolData();

    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);

    let [stakeState] = await getProgramAccount(owner, POOL, reward_mint);

    let balance = await getTokenAccountBalance(owner, reward_mint);

    if(balance < pD.soulAmount) {
      notify('error', 'Insufficient tokens!');
      // setLoading(false);
      return false;
    }

    // console.log(time_period.staking_limit, moment().unix(), time_period.withdraw_limit);
    
    if(moment().unix() >= Date.parse(pD.end_time) / 1000 && moment().unix() <= Date.parse(pD.end_withdraw) / 1000) {
      notify('error', 'Staking period has passed!');
      // setLoading(false)
      return false;
    }

    if((await conn.getAccountInfo(stakeState)) != null) {
      stakedinfo = await getStakeStateInfo(stakeState)
      // console.log(moment().unix(), time_period.staking_limit)
      if(moment().unix() < Date.parse(pD.end_time) / 1000) {
        if(stakedinfo.lastStakeTime.toNumber() !== 0 && stakedinfo.lastStakeTime.toNumber() < (Date.parse(pD.start_time) / 1000)) {
            if(stakedinfo.halosCount.toNumber() != 0 || stakedinfo.hornsCount.toNumber() != 0 || stakedinfo.soldierHalosCount.toNumber() != 0 || stakedinfo.soldierHornsCount.toNumber() != 0) {
              // console.log("test")
              notify('error', 'You should claim and unstake nft tokens before stake!');
              // setLoading(false)
              return false;
            }
        }
      }
    }
      
    // console.log(starttime, moment().unix(), next_staking_limit)
    if(moment().unix() > Date.parse(pD.end_withdraw) / 1000) {
      // console.log("test")
      notify('error', 'Staking period has passed!');
      // setLoading(false);
      return false;
    }

    return true;
  }

  async function stake(
    nftAccount : PublicKey,
    nftMint : PublicKey,
    hvhtype : String
    ){

    setLoading(true);

    if(!await validateStaking(conn, wallet.publicKey)) {
      setLoading(false);
      return;
    }

    console.log("+ stake")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)

    // const stakeData = Keypair.generate()
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    const metadata = await getMetadata(nftMint)
    const sourceNftAccount = nftAccount;
    const destNftAccount = await getTokenWallet(POOL,nftMint)
    const srcSoulsAccount = await getTokenWallet(wallet.publicKey, reward_mint);
    const destSoulsAccount = await getTokenWallet(POOL, reward_mint);

    const accountInfo: any = await conn.getParsedAccountInfo(metadata);
    let metadata1 : any = new Metadata(wallet.publicKey.toString(), accountInfo.value);

    let [stakeState, bump] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    let [hvh_data, bump1] = await getProgramAccount(wallet.publicKey, POOL, nftMint);

    let transaction = new Transaction()
    // signers.push(stakeState)
    if((await conn.getAccountInfo(destNftAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destNftAccount,wallet.publicKey,POOL,nftMint))
    if((await conn.getAccountInfo(destSoulsAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destSoulsAccount,wallet.publicKey,POOL,reward_mint))
    if((await conn.getAccountInfo(hvh_data)) == null) {
      transaction.add(
        await program.instruction.initHvhData(new anchor.BN(bump1),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            nftMint: nftMint,
            hvhData: hvh_data,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      )
    }

    if((await conn.getAccountInfo(stakeState)) == null) {
      transaction.add(
        await program.instruction.initStakeState(new anchor.BN(bump),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            soulsMint: reward_mint,
            stakeState: stakeState,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      )
    }

    let signers : Keypair[] = []
    // signers.push(stakeData)
    transaction.add(
      await program.instruction.stakehvh(hvhtype, {
        accounts: {
          owner : wallet.publicKey,
          pool : POOL,
          hvhData : hvh_data,
          stakeState : stakeState,
          nftMint : nftMint,
          metadata : metadata,
          sourceNftAccount : sourceNftAccount,
          destNftAccount : destNftAccount,
          sourceSoulsAccount:srcSoulsAccount,
          destSoulsAccount:destSoulsAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )

    await sendTransaction(transaction,signers)

    setLoading(false);
    await getNfts();

  }

  async function stakeAll(hvflag : boolean){

    setLoading(true);

    if(nfts.length <= 0) {
      setLoading(false);
      return;
    }

    console.log("+ stakeAll")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState, bump] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);

    let stakeData = null;
    let metadata = null;
    let sourceNftAccount = null;
    let destNftAccount = null;
    let srcSoulsAccount = null;
    let destSoulsAccount = null;

    let accountInfo: any = null;
    let metadata1 : any = null;
    // nft.account_address, nft.mint_address, nft.attributes[0].value

    // let instructions : TransactionInstruction[] = []

    let transactiona = new Transaction()
    
    if((await conn.getAccountInfo(stakeState)) == null) {
      transactiona.add(
        await program.instruction.initStakeState(new anchor.BN(bump),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            soulsMint: reward_mint,
            stakeState: stakeState,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
        )
        await sendTransaction(transactiona, [])
    }
      
    let instructions : TransactionInstruction[] = []
    // let transaction = new Transaction()
    // let signers : Keypair[] = []
    let j = 0;

    if(!await validateStaking(conn, wallet.publicKey)) {
      // await getNfts();
      setLoading(false);
      return;
    }

    let i = 0;
    
    for(let i = 0; i < nfts.length; i++) {

      if(hvflag && nfts[i].attributes[0].value != pD.token_halos) {
        // console.log("halos", nfts[i].attributes[0].value, pD.token_halos)
        continue;
      }

      if(!hvflag && nfts[i].attributes[0].value != pD.token_horns) {
        // console.log("horns", nfts[i].attributes[0].value, pD.token_horns)
        continue;
      }

      metadata = await getMetadata(nfts[i].mint_address)  
      sourceNftAccount = nfts[i].account_address   
      destNftAccount = await getTokenWallet(POOL, nfts[i].mint_address) 
      srcSoulsAccount = await getTokenWallet(wallet.publicKey, reward_mint)  
      destSoulsAccount = await getTokenWallet(POOL, reward_mint);
      
      accountInfo = await conn.getParsedAccountInfo(metadata);
      metadata1 = new Metadata(wallet.publicKey.toString(), accountInfo.value);
 
      let [hvh_data, bump1] = await getProgramAccount(wallet.publicKey, POOL, nfts[i].mint_address);

      if((await conn.getAccountInfo(hvh_data)) == null) {
        instructions.push(
          await program.instruction.initHvhData(new anchor.BN(bump1),
          {
            accounts: {
              owner : wallet.publicKey,
              pool : POOL,
              nftMint: nfts[i].mint_address,
              hvhData: hvh_data,
              systemProgram : anchor.web3.SystemProgram.programId
            }
          })
        )
        j++;
      }


      if((await conn.getAccountInfo(destNftAccount)) == null) {
        instructions.push(createAssociatedTokenAccountInstruction(destNftAccount,wallet.publicKey,POOL, nfts[i].mint_address))
        j++;
      }
      if((await conn.getAccountInfo(destSoulsAccount)) == null) {
        instructions.push(createAssociatedTokenAccountInstruction(destSoulsAccount,wallet.publicKey,POOL,reward_mint))
        j++;
      }
      
      instructions.push(
        await program.instruction.stakehvh(nfts[i].attributes[0].value, {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            hvhData : hvh_data,
            stakeState : stakeState,
            nftMint : nfts[i].mint_address,
            metadata : metadata,
            sourceNftAccount : sourceNftAccount,
            destNftAccount : destNftAccount,
            sourceSoulsAccount:srcSoulsAccount,
            destSoulsAccount:destSoulsAccount,
            tokenProgram : TOKEN_PROGRAM_ID,
            systemProgram : anchor.web3.SystemProgram.programId,
            clock : SYSVAR_CLOCK_PUBKEY
          }
        })
      )

      j++;

      if(j==3 || (i == nfts.length-1 && j != 0)) {
        let transaction = new Transaction()
        instructions.map(item=>transaction.add(item))
        await sendTransaction(transaction,[])
        j=0
        instructions=[]
        if(i == nfts.length - 1) {
          setLoading(false);
          await getNfts();
        }
      }

    }
  }


  async function validateStakingSoldier(
    conn : Connection,
    owner : PublicKey,
    hvhtype : String
    ){
    console.log("+ validate Staking Souldier")

    if(!wallet.connected) {
      notify('error', 'Wallet is unconnected!');
      // setLoading(false);
      return false;
    }

    const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
    const program = new anchor.Program(idl, programId, provider);

    await getPoolData();

    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);

    let [stakeState] = await getProgramAccount(owner, POOL, reward_mint);

    let balance = await getTokenAccountBalance(owner, reward_mint);

    //halos win
    if(hvhtype == pD.token_halos && pD.prev_win == 0) {
      if(balance < pD.win_team_stake) {
        notify('error', 'Insufficient tokens!');
        // setLoading(false);
        return false;
      }
    } 

    //horns win
    if(hvhtype == pD.token_horns && pD.prev_win == 1) {
      if(balance < pD.lost_team_stake) {
        notify('error', 'Insufficient tokens!');
        // setLoading(false);
        return false;
      }
    }

    //draw
    if(pD.prev_win == 2) {
      if(balance < pD.soulAmount) {
        notify('error', 'Insufficient tokens!');
        // setLoading(false);
        return false;
      }
    }

    // console.log(time_period.staking_limit, moment().unix(), time_period.withdraw_limit);
    
    if(moment().unix() >= Date.parse(pD.end_time) / 1000 && moment().unix() <= Date.parse(pD.end_withdraw) / 1000) {
      notify('error', 'Staking period has passed!');
      // setLoading(false)
      return false;
    }

    if((await conn.getAccountInfo(stakeState)) != null) {
      stakedinfo = await getStakeStateInfo(stakeState)
      // console.log(moment().unix(), time_period.staking_limit)
      if(moment().unix() < Date.parse(pD.end_time) / 1000) {
        if(stakedinfo.lastStakeTime.toNumber() !== 0 && stakedinfo.lastStakeTime.toNumber() < (Date.parse(pD.start_time) / 1000)) {
            if(stakedinfo.halosCount.toNumber() != 0 || stakedinfo.hornsCount.toNumber() != 0 || stakedinfo.soldierHalosCount.toNumber() != 0 || stakedinfo.soldierHornsCount.toNumber() != 0) {
              // console.log("test")
              notify('error', 'You should claim and unstake nft tokens before stake!');
              // setLoading(false)
              return false;
            }
        }
      }
    }
      
    // console.log(starttime, moment().unix(), next_staking_limit)
    if(moment().unix() > Date.parse(pD.end_withdraw) / 1000) {
      // console.log("test")
      notify('error', 'Staking period has passed!');
      // setLoading(false);
      return false;
    }

    return true;
  }

  async function stakeSoldier(
    nftAccount : PublicKey,
    nftMint : PublicKey,
    hvhtype : String
    ){

    setLoading(true);

    if(!await validateStakingSoldier(conn, wallet.publicKey, hvhtype)) {
      setLoading(false);
      return;
    }

    console.log("+ stake souldiers")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)

    // const stakeData = Keypair.generate()
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    const metadata = await getMetadata(nftMint)
    const sourceNftAccount = nftAccount;
    const destNftAccount = await getTokenWallet(POOL,nftMint)
    const srcSoulsAccount = await getTokenWallet(wallet.publicKey, reward_mint);
    const destSoulsAccount = await getTokenWallet(POOL, reward_mint);

    const accountInfo: any = await conn.getParsedAccountInfo(metadata);
    let metadata1 : any = new Metadata(wallet.publicKey.toString(), accountInfo.value);

    let [stakeState, bump] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    let [soldier_data, bump1] = await getProgramAccount(wallet.publicKey, POOL, nftMint);

    let transaction = new Transaction()
    // signers.push(stakeState)
    if((await conn.getAccountInfo(destNftAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destNftAccount,wallet.publicKey,POOL,nftMint))
    if((await conn.getAccountInfo(destSoulsAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destSoulsAccount,wallet.publicKey,POOL,reward_mint))
    if((await conn.getAccountInfo(soldier_data)) == null) {
      transaction.add(
        await program.instruction.initSoldierData(new anchor.BN(bump1),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            nftMint: nftMint,
            soldierData: soldier_data,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      )
    }

    if((await conn.getAccountInfo(stakeState)) == null) {
      transaction.add(
        await program.instruction.initStakeState(new anchor.BN(bump),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            soulsMint: reward_mint,
            stakeState: stakeState,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
      )
    }

    let signers : Keypair[] = []
    // signers.push(stakeData)
    transaction.add(
      await program.instruction.stakesoldiers(hvhtype, {
        accounts: {
          owner : wallet.publicKey,
          pool : POOL,
          soldierData : soldier_data,
          stakeState : stakeState,
          nftMint : nftMint,
          metadata : metadata,
          sourceNftAccount : sourceNftAccount,
          destNftAccount : destNftAccount,
          sourceSoulsAccount:srcSoulsAccount,
          destSoulsAccount:destSoulsAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )

    await sendTransaction(transaction,signers)

    setLoading(false);
    await getNfts();

  }

  async function stakeSoldiersAll(hvhtype : String){

    setLoading(true);

    if(soldiers.length <= 0) {
      setLoading(false);
      return;
    }

    console.log("+ stake souldier All")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState, bump] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);

    let stakeData = null;
    let metadata = null;
    let sourceNftAccount = null;
    let destNftAccount = null;
    let srcSoulsAccount = null;
    let destSoulsAccount = null;

    let accountInfo: any = null;
    let metadata1 : any = null;
    // nft.account_address, nft.mint_address, nft.attributes[0].value

    // let instructions : TransactionInstruction[] = []

    let transactiona = new Transaction()
    
    if((await conn.getAccountInfo(stakeState)) == null) {
      transactiona.add(
        await program.instruction.initStakeState(new anchor.BN(bump),
        {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            soulsMint: reward_mint,
            stakeState: stakeState,
            systemProgram : anchor.web3.SystemProgram.programId
          }
        })
        )
        await sendTransaction(transactiona, [])
    }
         
    let instructions : TransactionInstruction[] = []
    // let transaction = new Transaction()
    // let signers : Keypair[] = []
    let j = 0;

    if(!await validateStakingSoldier(conn, wallet.publicKey,hvhtype)) {
      // await getNfts();
      setLoading(false);
      return;
    }
    
    let i = 0;

    for(i = 0; i < soldiers.length; i++) {

      metadata = await getMetadata(soldiers[i].mint_address)  
      sourceNftAccount = soldiers[i].account_address   
      destNftAccount = await getTokenWallet(POOL, soldiers[i].mint_address) 
      srcSoulsAccount = await getTokenWallet(wallet.publicKey, reward_mint)  
      destSoulsAccount = await getTokenWallet(POOL, reward_mint);
      
      accountInfo = await conn.getParsedAccountInfo(metadata);
      metadata1 = new Metadata(wallet.publicKey.toString(), accountInfo.value);
 
      let [soldier_data, bump1] = await getProgramAccount(wallet.publicKey, POOL, soldiers[i].mint_address);

      if((await conn.getAccountInfo(soldier_data)) == null) {
        instructions.push(
          await program.instruction.initSoldierData(new anchor.BN(bump1),
          {
            accounts: {
              owner : wallet.publicKey,
              pool : POOL,
              nftMint: soldiers[i].mint_address,
              soldierData: soldier_data,
              systemProgram : anchor.web3.SystemProgram.programId
            }
          })
        )
        j++;
      }


      if((await conn.getAccountInfo(destNftAccount)) == null) {
        instructions.push(createAssociatedTokenAccountInstruction(destNftAccount,wallet.publicKey,POOL, soldiers[i].mint_address))
        j++;
      }
      if((await conn.getAccountInfo(destSoulsAccount)) == null) {
        instructions.push(createAssociatedTokenAccountInstruction(destSoulsAccount,wallet.publicKey,POOL,reward_mint))
        j++;
      }
      
      instructions.push(
        await program.instruction.stakesoldiers(hvhtype, {
          accounts: {
            owner : wallet.publicKey,
            pool : POOL,
            soldierData : soldier_data,
            stakeState : stakeState,
            nftMint : soldiers[i].mint_address,
            metadata : metadata,
            sourceNftAccount : sourceNftAccount,
            destNftAccount : destNftAccount,
            sourceSoulsAccount:srcSoulsAccount,
            destSoulsAccount:destSoulsAccount,
            tokenProgram : TOKEN_PROGRAM_ID,
            systemProgram : anchor.web3.SystemProgram.programId,
            clock : SYSVAR_CLOCK_PUBKEY
          }
        })
      )

      j++;

      if(j==3 || (i == soldiers.length-1 && j != 0)) {
        let transaction = new Transaction()
        instructions.map(item=>transaction.add(item))
        await sendTransaction(transaction,[])

        j=0
        instructions=[]

        if(i == soldiers.length - 1) {
          setLoading(false);
          await getNfts();
        }
      }
    }
  }

  async function validateUnStaking(stakedatainfo : any){
    console.log("+ validate UnStaking")

    if(!wallet.connected) {
      notify('error', 'Wallet is unconnected!');
      // setLoading(false);
      return false;
    }

    if(stakedatainfo.unstaked) {
      notify('error', 'Already unstaked!');
      // setLoading(false);
      return false;
    }

    await getPoolData();

    if(moment().unix() <= Date.parse(pD.end_time) / 1000) {
      notify('error', 'Please wait until the weekly staking competition is complete!');
      // setLoading(false);
      return false;
    }

    return true;
  }

  async function unstake(
    stakeData : PublicKey,
    hvhtype : String
    ){

    setLoading(true);

    let stakedatainfo = await getStakeDataInfo(stakeData);
    if(!await validateUnStaking(stakedatainfo)) {
      setLoading(false)
      return;
    }
    console.log("+ unstake")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    let stakedNft = await program.account.hvHData.fetch(stakeData)
    let account = await conn.getAccountInfo(stakedNft.nftAccount)
    let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
    const sourceNftAccount = await getTokenWallet(POOL, mint);
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState,] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    const metadata = await getMetadata(mint)

    let transaction = new Transaction()

    transaction.add(
      await program.instruction.unstakehvh(hvhtype,
        {
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          hvhData : stakeData,
          stakeState : stakeState,
          nftMint : mint,
          metadata : metadata,
          sourceNftAccount : sourceNftAccount,
          destNftAccount : stakedNft.nftAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )

    await sendTransaction(transaction,[])

    setLoading(false);
    await getNfts();

  }

  async function unstakeAll(){

    setLoading(true);

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    let stakedNFTs = await getStakedNftsForOwner(conn,wallet.publicKey)

    console.log("+unstake all");

    let j = 0;
    let stakedNft = null;
    let account = null;
    let mint = null;
    let sourceNftAccount = null;
    let metadata = null;
    let stakeData = null;
    let stakedatainfo = null;
    let instructions : TransactionInstruction[] = []

    if(stakedNFTs.length <= 0) {
      setLoading(false);
      return;
    }

    let i = 0;

    for(i = 0; i < stakedNFTs.length; i++) {
      stakeData = stakedNFTs[i].stakeData;
      stakedatainfo = await getStakeDataInfo(stakeData);
      if(!await validateUnStaking(stakedatainfo)) {
        // await getNfts();
        setLoading(false);
        return;
      }

      stakedNft = await program.account.hvHData.fetch(stakeData)
      account = await conn.getAccountInfo(stakedNft.nftAccount)
      mint = new PublicKey(AccountLayout.decode(account!.data).mint)
      sourceNftAccount = await getTokenWallet(POOL, mint);
      metadata = await getMetadata(mint)

      instructions.push(
        await program.instruction.unstakehvh(stakedNFTs[i].type,
          {
          accounts:{
            owner : wallet.publicKey,
            pool : POOL,
            hvhData : stakeData,
            stakeState : stakeState,
            nftMint : mint,
            metadata : metadata,
            sourceNftAccount : sourceNftAccount,
            destNftAccount : stakedNft.nftAccount,
            tokenProgram : TOKEN_PROGRAM_ID,
            systemProgram : anchor.web3.SystemProgram.programId,
            clock : SYSVAR_CLOCK_PUBKEY
          }
        })
      )
      
      j++;

      if((j === 4) || (i === stakedNFTs.length - 1 && j !== 0)) {

        let transaction = new Transaction()
        
        instructions.map(item=>transaction.add(item))
        
        await sendTransaction(transaction, []);

        j = 0;
        instructions = []

        if (i == stakedNFTs.length - 1) {
          setLoading(false);
          await getNfts();
        }

      }
    }   
    // await sendSingleTransaction(transaction,[])
  }

  async function validateUnStakingSoldier(stakedatainfo : any){
    console.log("+ validate UnStaking Souldier")

    if(!wallet.connected) {
      notify('error', 'Wallet is unconnected!');
      // setLoading(false);
      return false;
    }

    if(stakedatainfo.unstaked) {
      notify('error', 'Already unstaked!');
      // setLoading(false);
      return false;
    }

    await getPoolData();

    if(moment().unix() <= Date.parse(pD.end_time) / 1000) {
      notify('error', 'Please wait until the weekly staking competition is complete!');
      // setLoading(false);
      return false;
    }

    return true;
  }

  async function unstakesoldier(
    stakeData : PublicKey,
    hvhtype : String
    ){

    setLoading(true);

    let stakedatainfo = await getSoldierDataInfo(stakeData);
    if(!await validateUnStakingSoldier(stakedatainfo)) {
      setLoading(false)
      return;
    }
    console.log("+ unstake souldier")

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    let stakedNft = await program.account.soldierData.fetch(stakeData)
    let account = await conn.getAccountInfo(stakedNft.nftAccount)
    let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
    const sourceNftAccount = await getTokenWallet(POOL, mint);
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState,] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    const metadata = await getMetadata(mint)

    let transaction = new Transaction()

    transaction.add(
      await program.instruction.unstakesoldier(
        {
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          soldierData : stakeData,
          stakeState : stakeState,
          nftMint : mint,
          metadata : metadata,
          sourceNftAccount : sourceNftAccount,
          destNftAccount : stakedNft.nftAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY
        }
      })
    )

    await sendTransaction(transaction,[])

    setLoading(false);
    await getNfts();

  }

  async function unstakeSoldiersAll(){

    setLoading(true);

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)
    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    let stakedNFTs = await getStakedSoldiersForOwner(conn,wallet.publicKey)

    console.log("+unstake souldiers all");

    let j = 0;
    let stakedNft = null;
    let account = null;
    let mint = null;
    let sourceNftAccount = null;
    let metadata = null;
    let stakeData = null;
    let stakedatainfo = null;
    let instructions : TransactionInstruction[] = []

    if(stakedNFTs.length <= 0) {
      setLoading(false);
      return;
    }

    let i = 0;

    for(i = 0; i < stakedNFTs.length; i++) {
      stakeData = stakedNFTs[i].stakeData;
      stakedatainfo = await getSoldierDataInfo(stakeData);
      if(!await validateUnStakingSoldier(stakedatainfo)) {
        // await getNfts();
        setLoading(false);
        return;
      }

      stakedNft = await program.account.soldierData.fetch(stakeData)
      account = await conn.getAccountInfo(stakedNft.nftAccount)
      mint = new PublicKey(AccountLayout.decode(account!.data).mint)
      sourceNftAccount = await getTokenWallet(POOL, mint);
      metadata = await getMetadata(mint)

      instructions.push(
        await program.instruction.unstakesoldier(
          {
          accounts:{
            owner : wallet.publicKey,
            pool : POOL,
            soldierData : stakeData,
            stakeState : stakeState,
            nftMint : mint,
            metadata : metadata,
            sourceNftAccount : sourceNftAccount,
            destNftAccount : stakedNft.nftAccount,
            tokenProgram : TOKEN_PROGRAM_ID,
            systemProgram : anchor.web3.SystemProgram.programId,
            clock : SYSVAR_CLOCK_PUBKEY
          }
        })
      )
      
      j++;

      if((j === 4) || (i === stakedNFTs.length - 1 && j !== 0)) {

        let transaction = new Transaction()
        
        instructions.map(item=>transaction.add(item))
        
        await sendTransaction(transaction, []);

        j = 0;
        instructions = []

        if(i === stakedNFTs.length - 1) {
          await getNfts();
          setLoading(false);
        }

      }
    }    
    // await sendSingleTransaction(transaction,[])
  }

  async function validateClaim(stakestateinfo : any){
    console.log("+ validate UnStaking")

    if(!wallet.connected) {
      notify('error', 'Wallet is unconnected!');
      // setLoading(false);
      return false;
    }

    await getPoolData();

    if(moment().unix() <= Date.parse(pD.end_time) / 1000 || moment().unix() > Date.parse(pD.end_withdraw) / 1000) {
      notify('error', 'Not withdraw period!');
      return false;
    }

    if(stakestateinfo.lastStakeTime.toNumber() <= Date.parse(pD.start_time) / 1000) {
      notify('error', 'You should stake again!');
      return false;
    }

    if(stakestateinfo.claimed) {
      notify('error', 'Already claimed!');
      return false;
    }

    return true;
  }

  async function claim(
    ){
    console.log("+ claim")

    setLoading(true);

    let provider = new anchor.Provider(conn, wallet as any, confirmOption)
    let program = new anchor.Program(idl,programId,provider)  

    const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
    let [stakeState] = await getProgramAccount(wallet.publicKey, POOL, reward_mint);
    // console.log("test")
    if((await conn.getAccountInfo(stakeState)) === null) {
      notify('error', 'Nothing staked!');
      setLoading(false);
      return false;
    }

    // console.log("test")

    let stakedinfo = await getStakeStateInfo(stakeState);

    if(!await validateClaim(stakedinfo)) {
      setLoading(false);
      return;
    }

    const destSoulsAccount = await getTokenWallet(wallet.publicKey, reward_mint);
    const srcSoulsAccount = await getTokenWallet(POOL, reward_mint);

    let transaction = new Transaction()

    if((await conn.getAccountInfo(destSoulsAccount)) == null)
      transaction.add(createAssociatedTokenAccountInstruction(destSoulsAccount, wallet.publicKey, wallet.publicKey, reward_mint))

    transaction.add(
      await program.instruction.claim({
        accounts:{
          owner : wallet.publicKey,
          pool : POOL,
          stakeState : stakeState,
          destSoulsAccount : destSoulsAccount,
          sourceSoulsAccount : srcSoulsAccount,
          burnSoulsAccount : srcSoulsAccount,
          tokenProgram : TOKEN_PROGRAM_ID,
          systemProgram : anchor.web3.SystemProgram.programId,
          clock : SYSVAR_CLOCK_PUBKEY,
        }
      })
    )
    // }

    await sendTransaction(transaction,[])

    setLoading(false);
  
  }

  async function getNftsForOwner(
    conn : any,
	  owner : PublicKey
	  ){

      console.log("+ getNftsForOwner")

		const verifiednfts: any = []

		const allnfts: any = [];

    const nftaccounts : any = [];

		// const randWallet = new anchor.Wallet(Keypair.generate())
		// const provider = new anchor.Provider(conn,randWallet,confirmOption)
		// const program = new anchor.Program(idl,programId,provider)

		const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID});

		let tokenAccount, tokenAmount;

		for (let index = 0; index < tokenAccounts.value.length; index++) {
			tokenAccount = tokenAccounts.value[index];
			tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
			if (tokenAmount.amount == '1' && tokenAmount.decimals == 0) {
				const nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
				let tokenmetaPubkey = await Metadata.getPDA(nftMint);
				allnfts.push(tokenmetaPubkey);
        nftaccounts.push(tokenAccounts.value[index].pubkey)
			}
		}

    let nftinfo: any[] = [];
    const buffer = [...allnfts];
    let count = 100;
    while(buffer.length > 0) {
      if(buffer.length < 100) {
        count = buffer.length;
      } else {
        count = 100;
      }
      nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
    }

		// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);

		// let tokenCount = nftinfo.length

		for(let i = 0; i < nftinfo.length; i++) {

      if(nftinfo[i] == null) {
        continue;
      }
      
			let metadata : any = new Metadata(owner.toString(), nftinfo[i])

			if(metadata.data.data.symbol == pD.hvh_symbol) {

        let data: any;

				try {
          data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
        } catch(error) {
          console.log(error);
          continue;
        }

        // console.log("data loaded", data)

        if(!data) {
          // console.log("data error")
          continue;
        }

				const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}

        let nftMint = new PublicKey(metadata.data.mint)
        if(entireData.attributes.value === pD.halos || entireData.attributes.value === pD.horns) {
          verifiednfts.push({account_address : nftaccounts[i], mint_address : nftMint, ...entireData})
        }
			}
		}

    verifiednfts.sort(function (a: any, b: any) {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    })

		return verifiednfts
	}

  async function getSoldiersForOwner(
    conn : any,
	  owner : PublicKey
	  ){

    console.log("+ getSouldiersForOwner")

		const verifiednfts: any = []

		const allnfts: any = [];

    const nftaccounts: any = [];

		// const randWallet = new anchor.Wallet(Keypair.generate())
		// const provider = new anchor.Provider(conn,randWallet,confirmOption)
		// const program = new anchor.Program(idl,programId,provider)

		const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID});

		let tokenAccount, tokenAmount;

		for (let index = 0; index < tokenAccounts.value.length; index++) {
			tokenAccount = tokenAccounts.value[index];
			tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
			if (tokenAmount.amount == '1' && tokenAmount.decimals == 0) {
				const nftMint = new PublicKey(tokenAccount.account.data.parsed.info.mint)
				let tokenmetaPubkey = await Metadata.getPDA(nftMint);
				allnfts.push(tokenmetaPubkey);
        nftaccounts.push(tokenAccounts.value[index].pubkey)
			}
		}

    let nftinfo: any[] = [];
    const buffer = [...allnfts];
    let count = 100;
    while(buffer.length > 0) {
      if(buffer.length < 100) {
        count = buffer.length;
      } else {
        count = 100;
      }
      nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
    }

		// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);

		// let tokenCount = nftinfo.length

		for(let i = 0; i < nftinfo.length; i++) {

      if(nftinfo[i] == null) {
        continue;
      }
      
			let metadata : any = new Metadata(owner.toString(), nftinfo[i])

			if(metadata.data.data.symbol == pD.soldier_symbol) {

        // console.log("get data")

        let data: any;

				try {
          data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
        } catch(error) {
          console.log(error);
          continue;
        }

        // console.log("data loaded", data)

        if(!data) {
          // console.log("data error")
          continue;
        }

				const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}

        // console.log("data", entireData);

        let nftMint = new PublicKey(metadata.data.mint)
        if(entireData.attributes.value === pD.halos || entireData.attributes.value === pD.horns) {
          // console.log("mint", nftaccounts[i].toBase58(), nftMint.toBase58())
          verifiednfts.push({account_address : nftaccounts[i], mint_address : nftMint, ...entireData})
        }
			}
		}

    verifiednfts.sort(function (a: any, b: any) {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    })

		return verifiednfts
	}

  async function getStakedNftsForOwner(
    conn : any,
	  owner : PublicKey
	  ){

    console.log("+ getStakedNftsForOwner")

		const verifiednfts: any = [];

		const allnfts: any = [];

    const stakedNfts: any = [];

		const randWallet = new anchor.Wallet(Keypair.generate())
		const provider = new anchor.Provider(conn,randWallet,confirmOption)
		const program = new anchor.Program(idl,programId,provider)

		let resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: 8 + HVH_DATA_SIZE},{memcmp:{offset:8,bytes:owner.toBase58()}},{memcmp:{offset:40,bytes:POOL.toBase58()}}]
    })

    let stakedNft: any;

		for (let index = 0; index < resp.length; index++) {
      stakedNft = await program.account.hvHData.fetch(resp[index].pubkey);
      if(stakedNft.unstaked) continue;
      const nftMint = new PublicKey(stakedNft.nftMint)
      let tokenmetaPubkey = await Metadata.getPDA(nftMint);
      allnfts.push(tokenmetaPubkey);
      stakedNfts.push({data: stakedNft, account: resp[index].pubkey});
		}

    let nftinfo: any[] = [];
    const buffer = [...allnfts];
    let count = 100;
    while(buffer.length > 0) {
      if(buffer.length < 100) {
        count = buffer.length;
      } else {
        count = 100;
      }
      nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
    }

		// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);

		// let tokenCount = nftinfo.length

		for(let i = 0; i < nftinfo.length; i++) {

      if(nftinfo[i] == null) {
        continue;
      }
      
			let metadata : any = new Metadata(owner.toString(), nftinfo[i])

      // console.log("get data")

      let data: any;

      try {
        data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
      } catch(error) {
        console.log(error);
        continue;
      }

      // console.log("data loaded", data)

      if(!data) {
        // console.log("data error")
        continue;
      }

      const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}

      // console.log("data", entireData);

      let nftMint = new PublicKey(metadata.data.mint)

      // console.log("account", stakedNfts[i].account.toBase58(), nftMint.toBase58())

      // verifiednfts.push({account_address : tokenAccounts.value[i].pubkey, mint_address : nftMint, ...entireData})
      verifiednfts.push({
        stakeTime : stakedNft.stakeTime.toNumber(),
        stakeData : stakedNfts[i].account,
        name : entireData.name,
        type : entireData.attributes[0].value,
        ...entireData,
      })
		}

    verifiednfts.sort(function (a: any, b: any) {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    })

		return verifiednfts
	}

  // async function getStakedNftsForOwner(
  //   conn : Connection,
  //   owner : PublicKey,
  //   ){
  //   console.log("+ getStakedNftsForOwner")
  //   const wallet = new anchor.Wallet(Keypair.generate());
  //   const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
  //   const program = new anchor.Program(idl, programId, provider);
  //   const allTokens: any = []
  //   let resp = await conn.getProgramAccounts(programId,{
  //     dataSlice: {length: 0, offset: 0},
  //     filters: [{dataSize: 8 + HVH_DATA_SIZE},{memcmp:{offset:8,bytes:owner.toBase58()}},{memcmp:{offset:40,bytes:POOL.toBase58()}}]
  //   })

  //   // const tokenAccounts = await conn.getParsedTokenAccountsByOwner(owner, {programId: TOKEN_PROGRAM_ID});

	// 	// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);

  //   for (let index = 0; index < resp.length; index++) {
  //     try {
  //       let stakedNft = await program.account.hvHData.fetch(resp[index].pubkey)

  //       if(stakedNft.unstaked) continue;
  //       // let account = await conn.getAccountInfo(stakedNft.nftAccount)

  //       // let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
  //       let pda= await getMetadata(stakedNft.nftMint)
  //       const accountInfo: any = await conn.getParsedAccountInfo(pda);
  //       let metadata : any = new Metadata(owner.toString(), accountInfo.value);
  //       const { data }: any = await axios.get(metadata.data.data.uri, {timeout: axios_timeout})
  //       const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0])}
  //       // console.log(entireData);
  //       allTokens.push({
  //         stakeTime : stakedNft.stakeTime.toNumber(),
  //         stakeData : resp[index].pubkey,
  //         name : entireData.name,
  //         type : entireData.attributes[0].value,
  //         ...entireData,
  //       })

  //       // if(index == resp.length - 1) {
  //       //   console.log("test")
  //       //   return allTokens
  //       // }
  //     } catch(error) {
  //       console.log(error)
  //       continue
  //     }
  //   }

  //   return allTokens
  // }

  async function getStakedSoldiersForOwner(
    conn : any,
	  owner : PublicKey
	  ){

    console.log("+ getStakedNftsForOwner")

		const verifiednfts: any = [];

		const allnfts: any = [];

    const stakedNfts: any = [];

		const randWallet = new anchor.Wallet(Keypair.generate())
		const provider = new anchor.Provider(conn,randWallet,confirmOption)
		const program = new anchor.Program(idl,programId,provider)

		let resp = await conn.getProgramAccounts(programId,{
      dataSlice: {length: 0, offset: 0},
      filters: [{dataSize: 8 + SOLDIER_DATA_SIZE},{memcmp:{offset:8,bytes:owner.toBase58()}},{memcmp:{offset:40,bytes:POOL.toBase58()}}]
    })

    let stakedNft: any;

		for (let index = 0; index < resp.length; index++) {
      stakedNft = await program.account.soldierData.fetch(resp[index].pubkey);
      // console.log("test", resp[index].pubkey.toBase58())
      if(stakedNft.unstaked) continue;
      const nftMint = new PublicKey(stakedNft.nftMint)
      let tokenmetaPubkey = await Metadata.getPDA(nftMint);
      // console.log("test", resp[index].pubkey.toBase58())
      allnfts.push(tokenmetaPubkey);
      // console.log("test", resp[index].pubkey.toBase58())
      stakedNfts.push({data: stakedNft, account: resp[index].pubkey});
		}

    let nftinfo: any[] = [];
    const buffer = [...allnfts];
    let count = 100;
    while(buffer.length > 0) {
      if(buffer.length < 100) {
        count = buffer.length;
      } else {
        count = 100;
      }
      nftinfo = [...nftinfo.concat(await conn.getMultipleAccountsInfo(buffer.splice(0, count)))];
    }

		// const nftinfo: any = await conn.getMultipleAccountsInfo(allnfts);

		// let tokenCount = nftinfo.length

		for(let i = 0; i < nftinfo.length; i++) {
      

      if(nftinfo[i] == null) {
        continue;
      }

			let metadata : any = new Metadata(owner.toString(), nftinfo[i])

      // console.log("get data")

      let data: any;

      try {
        data = await axios.get(metadata.data.data.uri, {timeout: axios_timeout});
      } catch(error) {
        console.log(error);
        continue;
      }

      // console.log("data loaded", data)

      if(!data) {
        // console.log("data error")
        continue;
      }

      const entireData = { ...data.data, id: Number(data.data.name.replace( /^\D+/g, '').split(' - ')[0])}

      // console.log("data", entireData);

      let nftMint = new PublicKey(metadata.data.mint)

      // console.log("account", stakedNfts[i].account.toBase58(), nftMint.toBase58())

      // verifiednfts.push({account_address : tokenAccounts.value[i].pubkey, mint_address : nftMint, ...entireData})
      verifiednfts.push({
        stakeTime : stakedNft.stakeTime.toNumber(),
        stakeData : stakedNfts[i].account,
        stakedType : stakedNft.hvhStr,
        name : entireData.name,
        // type : entireData.attributes[0].value,
        ...entireData,
        ...entireData,
      })
    }

    verifiednfts.sort(function (a: any, b: any) {
      if (a.name < b.name) { return -1; }
      if (a.name > b.name) { return 1; }
      return 0;
    })

		return verifiednfts
	}

  // async function getStakedSoldiersForOwner(
  //   conn : Connection,
  //   owner : PublicKey,
  //   ){
  //   console.log("+ getStakedNftsForOwner")
  //   const wallet = new anchor.Wallet(Keypair.generate());
  //   const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
  //   const program = new anchor.Program(idl, programId, provider);
  //   const allTokens: any = []
  //   let resp = await conn.getProgramAccounts(programId,{
  //     dataSlice: {length: 0, offset: 0},
  //     filters: [{dataSize: 8 + SOLDIER_DATA_SIZE},{memcmp:{offset:8,bytes:owner.toBase58()}},{memcmp:{offset:40,bytes:POOL.toBase58()}}]
  //   })

  //   for (let index = 0; index < resp.length; index++) {
  //     try {
  //       let stakedNft = await program.account.soldierData.fetch(resp[index].pubkey)
  //       // console.log("test data", stakedNft)

  //       if(stakedNft.unstaked) continue;
  //       // let account = await conn.getAccountInfo(stakedNft.nftAccount)

  //       // let mint = new PublicKey(AccountLayout.decode(account!.data).mint)
  //       let pda= await getMetadata(stakedNft.nftMint)
  //       const accountInfo: any = await conn.getParsedAccountInfo(pda);
  //       let metadata : any = new Metadata(owner.toString(), accountInfo.value);
  //       const { data }: any = await axios.get(metadata.data.data.uri, {timeout: axios_timeout})
  //       const entireData = { ...data, id: Number(data.name.replace( /^\D+/g, '').split(' - ')[0])}
  //       // console.log(entireData);
  //       allTokens.push({
  //         stakeTime : stakedNft.stakeTime.toNumber(),
  //         stakeData : resp[index].pubkey,
  //         stakedType : stakedNft.hvhStr,
  //         name : entireData.name,
  //         // type : entireData.attributes[0].value,
  //         ...entireData,
  //       })

  //       // if(index == resp.length - 1) {
  //       //   console.log("test")
  //       //   return allTokens
  //       // }
  //     } catch(error) {
  //       console.log(error)
  //       continue
  //     }
      
  //   }
    
  //   return allTokens
  // }

  async function getPoolData(){
    let wallet = new anchor.Wallet(Keypair.generate())
    let provider = new anchor.Provider(conn,wallet,confirmOption)
    const program = new anchor.Program(idl,programId,provider)

    let poolData = await program.account.pool.fetch(POOL)

    const unixTime = poolData.startTime.toNumber();
    const date = new Date(unixTime * 1000);

    pD = {
      owner : poolData.owner,
      souls_mint : poolData.soulsMint,
      total_souls : poolData.totalSouls.toNumber(),
      halos_count : poolData.halosCount.toNumber(),
      horns_count : poolData.hornsCount.toNumber(),
      soldier_halos_count : poolData.soldierHalosCount.toNumber(),
      soldier_horns_count : poolData.soldierHornsCount.toNumber(),
      win_percent : poolData.winPercent.toNumber(),
      lose_percent : poolData.losePercent.toNumber(),
      burn_percent : poolData.burnPercent.toNumber(),
      prev_win : poolData.prevWin,
      burned : poolData.burned,
      win_team_stake : poolData.winTeamStake.toNumber(),
      lost_team_stake : poolData.lostTeamStake.toNumber(),
      soulAmount : poolData.soulAmount.toNumber(),
      hvh_percent : poolData.hvhPercent.toNumber(),
      soldier_percent : poolData.soldierPercent.toNumber(),
      token_unit : poolData.tokenUnit.toNumber(),
      staking_period : poolData.stakingPeriod.toNumber(),
      withdraw_period : poolData.withdrawPeriod.toNumber(),
      hvh_symbol : poolData.hvhSymbol,
      soldier_symbol : poolData.soldierSymbol,
      token_halos : poolData.tokenHalos,
      token_horns : poolData.tokenHorns,
      start_time : date.toLocaleString("en-US"),
      abs_start_time : date.toLocaleString("en-US"),
      period : poolData.period.toNumber(),
    }

    updateStakingPeriod();
  }

  const getStakingPeriod = () => {
    const total_period = pD.staking_period + pD.withdraw_period;
    const staking_limit = Date.parse(pD.abs_start_time) / 1000 + pD.period * pD.staking_period;
    const withdraw_limit = Date.parse(pD.abs_start_time) / 1000 + pD.period * total_period;

    return {total_period, staking_limit, withdraw_limit};
  }

  async function getClaimAmount(
    conn : Connection,
    owner : PublicKey
    ){
      console.log("+ getClaimAmount")
      const provider = new anchor.Provider(conn, wallet, anchor.Provider.defaultOptions());
      const program = new anchor.Program(idl, programId, provider);

      await getPoolData();

      let claimAmount = 0;

      const reward_mint : PublicKey = new PublicKey(REWARD_TOKEN);
      let [stakeState,] = await getProgramAccount(owner, POOL, reward_mint);
      if((await conn.getAccountInfo(stakeState)) == null) {
        notify('error', 'Nothing staked!');
        setClaimAmount(0);
        // catchFlag = false;
        return 0;
      }

      let stakedinfo = await getStakeStateInfo(stakeState)

      if(moment().unix() < Date.parse(pD.end_time) / 1000 || moment().unix() > Date.parse(pD.end_withdraw) / 1000) {
        notify('error', 'Not withdraw period');
        setClaimAmount(0);
        // catchFlag = false;
        return 0;
      }

      if(stakedinfo.lastStakeTime.toNumber() < Date.parse(pD.start_time) / 1000) {
        notify('error', 'You should unstake all tokens and stake again');
        setClaimAmount(0);
        // catchFlag = false;
        return 0;
      }

      let total_amount = pD.total_souls;

      let hvh_amount = total_amount * pD.hvh_percent / 100;
      let soldier_amount = total_amount * pD.soldier_percent / 100;
      let burn_amount = total_amount * pD.burn_percent / 100;

      let claim_amount = 0;

      let halos_mul = pD.halos_count / 10 | 0;
      let horns_mul = pD.horns_count / 10 | 0;

      let total_halos_soldiers = pD.halos_count + (halos_mul + 1) * pD.soldier_halos_count;
      let total_horns_soldiers = pD.horns_count + pD.soldier_horns_count * (horns_mul + 1);

      if (total_halos_soldiers > total_horns_soldiers) {
        if (pD.halos_count != 0) {
          claim_amount = hvh_amount * pD.win_percent / 100 * stakedinfo.halosCount.toNumber() / pD.halos_count;
        }
        if (pD.horns_count != 0) {
          claim_amount += hvh_amount * pD.lose_percent / 100 * stakedinfo.hornsCount.toNumber() / pD.horns_count;
        }
        if (pD.soldier_halos_count != 0) {
          claim_amount += soldier_amount * pD.win_percent  / 100 * stakedinfo.soldierHalosCount.toNumber() / pD.soldier_halos_count;
        }
        if (pD.soldier_horns_count != 0) {
          claim_amount += soldier_amount * pD.lose_percent / 100 * stakedinfo.soldierHornsCount.toNumber() / pD.soldier_horns_count;
        }
    } else if (total_halos_soldiers < total_horns_soldiers) {
        if (pD.halos_count != 0) {
          claim_amount = hvh_amount * pD.lose_percent / 100 * stakedinfo.halosCount.toNumber() / pD.halos_count;
        }
        if (pD.horns_count != 0) {
          claim_amount += hvh_amount * pD.win_percent / 100 * stakedinfo.hornsCount.toNumber() / pD.horns_count;
        }
        if (pD.soldier_halos_count != 0) {
          claim_amount += soldier_amount * pD.lose_percent / 100 * stakedinfo.soldierHalosCount.toNumber() / pD.soldier_halos_count;
        }
        if (pD.soldier_horns_count != 0) {
          claim_amount += soldier_amount * pD.win_percent / 100 * stakedinfo.soldierHornsCount.toNumber() / pD.soldier_horns_count;
        }
    } else {
          claim_amount = (stakedinfo.halosCount.toNumber() + stakedinfo.hornsCount.toNumber()) * pD.soulAmount * pD.token_unit;
        if (pD.prev_win == 0) {
          claim_amount += (stakedinfo.soldierHalosCount.toNumber() * pD.win_team_stake + stakedinfo.soldierHornsCount.toNumber() * pD.lost_team_stake) * pD.token_unit;
        } else if (pD.prev_win == 1) {
          claim_amount += (stakedinfo.soldierHalosCount.toNumber() * pD.lost_team_stake + stakedinfo.soldierHornsCount.toNumber() * pD.win_team_stake) * pD.token_unit;
        } else {
          claim_amount = (stakedinfo.soldierHalosCount.toNumber() + stakedinfo.soldierHornsCount.toNumber()) * pD.soulAmount * pD.token_unit;
        }
    }


    claimAmount = claim_amount / pD.token_unit;

    if(stakedinfo.claimed)
      claimAmount = 0;

    setClaimAmount(claimAmount);
  }

  let sendTransaction = async function sendTransaction(transaction : Transaction,signers : Keypair[]) {
    try{
      transaction.feePayer = wallet.publicKey
      transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;
      // await transaction.setSigners(wallet.publicKey,...signers.map(s => s.publicKey));
      // if(signers.length != 0)
      //   await transaction.partialSign(...signers)
      const signedTransaction = await wallet.signTransaction(transaction);
      let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
      await conn.confirmTransaction(hash);
      // await getNfts();
      // setLoading(false);
      notify('success', 'Success!');
      return true;
    } catch(err) {
      console.log(err)
      // await getNfts()
      notify('error', 'Failed Instruction!');
      setLoading(false);
    }
  }

  async function getNfts(){
    // setLoading(true);
    nfts.splice(0,nfts.length)
    stakedNfts.splice(0,stakedNfts.length)
    soldiers.slice(0, soldiers.length)
    stakedNfts.slice(0, stakedNfts.length)
    stakedSoldiers.slice(0, stakedSoldiers.length)
    notify('info', 'Loading Info!');
    await getPoolData()
    await getOwnerStakeStateInfo();
    notify('info', 'Loading HvH!');
    nfts = await getNftsForOwner(conn,wallet.publicKey)
    // notify('success', 'HvH Loaded!');
    notify('info', 'Loading Staked HvH!');
    stakedNfts = await getStakedNftsForOwner(conn,wallet.publicKey)
    // notify('success', 'Staked HvH Loaded!');
    notify('info', 'Loading Souldiers!');
    soldiers = await getSoldiersForOwner(conn, wallet.publicKey)
    // notify('success', 'Soldiers Loaded!');
    notify('info', 'Loading Staked Souldiers!');
    stakedSoldiers = await getStakedSoldiersForOwner(conn, wallet.publicKey)
    // notify('success', 'Staked Soldiers Loaded!');
    notify('info', 'Succesfully Loaded All!');
    // console.log(nfts, stakedNfts)
    // setLoading(false);
  }

	return <div className="row">
    <Loading className={loading ? "" : "loading_disable"} />
    <div className='row empty-div'>
    </div>
    <div className='row vs-label'>
      <img src="https://glittercloudsolutions.com/wp-content/uploads/2022/03/61cb5aeb6c8c4a74f25dfb6d_Asset-3@3x-1024x93.png" sizes="100vw" alt="" loading="lazy"/>
    </div>  
    <div className='row vs-video'>
      {!catchFlag && <img src="https://glittercloudsolutions.com/wp-content/uploads/2022/03/61cc0814446fd66fedd66325_video-4-metro-1920x1080-1-1536x864.gif" alt="" loading="lazy" />}
      { catchFlag && <div className="row">
        <div className='row'>
        { fightingFlag === 0 && <div className="winning-video" dangerouslySetInnerHTML={{ __html: `
            <video
              loop
              muted
              autoplay
              playsinline
              src="${winhalos}"
              class="video-style"
            />,
          ` }}></div>
          }
          { fightingFlag === 1 && <div className="winning-video" dangerouslySetInnerHTML={{ __html: `
            <video
              loop
              muted
              autoplay
              playsinline
              src="${winhorns}"
              class="video-style"
            />,
          ` }}></div>
          }
        </div>
        <div className="row winteam-label">
          { (fightingFlag === 0 || fightingFlag === 1 ) && <p>The {winTeam} Are Victorious!</p> }
          { fightingFlag === 2 && <p>The Match Was a Draw!</p> }
          <p>Claimable Amount: {claimableAmount}</p>
        </div>
      </div>
    }
    </div> 
    {pD && 
      <div className='row'>
        <div className='row'>
          <div className='col-lg-6 col-12 time-show'>
            <p>Staking Period:</p>
            <p>{stakingPeriod.start} - {stakingPeriod.end}</p>
          </div>
          <div className='col-lg-6 col-12 time-show'>
            <p>Withdraw Period:</p>
            <p>{withdrawPeriod.start} - {withdrawPeriod.end}</p>
          </div>
        </div>
      </div>
    }
    <div className='row'>
      <div className='row platform-label'>
        <p>STAKING PLATFORM</p>
      </div>
      <div className='row action-all-div'>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await stakeAll(true)}}>StakeHalos</button>
        </div>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await stakeAll(false)}}>StakeHorns</button>
        </div>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await setSelectAllFlag()}}>Stake Soldiers</button>
        </div>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await unstakeSoldiersAll()}}>Unstake Soldiers</button>
        </div>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await claim()}}>Claim</button>
        </div>
        <div className='col-12 col-md-6 col-lg-6 col-xl-6 action-div'>
          <button className="action-button" onClick={async () =>{await unstakeAll()}}>Unstake HvH</button>
        </div>
      </div>
    </div>
    <div className='row'>
      <div className='col-12 col-md-6 col-lg-6 col-xl-6'>
        <div className='row nft-div'>
          <p>YOUR WALLET NFT</p>
        </div>
        <div className='row'>
          {
            nfts.length && <div className="row">
            {
              nfts.map((nft,idx)=>{
                return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
                  <div className="w3-container w3-center">
                    <h3>{nft.name}</h3>
                      <img className="card-img-top" src={nft.image} alt="Image Error"/>
                    <h5>{nft.attributes[0].value}</h5>
                    <div className="w3-section">
                      <button className="w3-button w3-green" onClick={async ()=>{
                          await stake(nft.account_address, nft.mint_address, nft.attributes[0].value)
                        }}>Stake</button>
                    </div>
                  </div>
                </div>
              })
            }
            </div>
          }
        </div>
      </div>
      <div className='col-12 col-md-6 col-lg-6 col-xl-6'>
        <div className='row nft-div'>
          <p>YOUR STAKED NFT</p>
        </div>
        <div className='row'>
          {
            stakedNfts.map((nft,idx)=>{
              return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
              <div className="w3-container w3-center">
                <h3>{nft.name}</h3>
                  <img className="card-img-top" src={nft.image} alt="Image Error"/>
                <h5>{nft.type}</h5>
                <h5>{(new Date(nft.stakeTime * 1000)).toLocaleString("en-US")}</h5>
                <div className="w3-section">
                  <button className="w3-button w3-green" onClick={async ()=>{
                      await unstake(nft.stakeData, nft.attributes[0].value);
                    }}>UnStake</button>
                </div>
              </div>
            </div>
            })
          }
        </div>
      </div>
    </div>

    <div className='row'>
      <div className='col-12 col-md-6 col-lg-6 col-xl-6'>
        <div className='row nft-div'>
          <p>YOUR WALLET SOULDIERS</p>
        </div>
        <div className='row'>
          {
            soldiers.length && <div className="row">
            {
              soldiers.map((nft,idx)=>{
                return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
                  <div className="w3-container w3-center">
                    <h3>{nft.name}</h3>
                      <img className="card-img-top" src={nft.image} alt="Image Error"/>
                    {/* <h5>{nft.attributes[0].value}</h5> */}
                    <div className="w3-section">
                      <button className="w3-button w3-green" onClick={async ()=>{
                          setSelectSoldier(nft.account_address, nft.mint_address)
                          // await stake(nft.account_address, nft.mint_address, nft.attributes[0].value)
                        }}>Stake</button>
                    </div>
                  </div>
                </div>
              })
            }
            </div>
          }
        </div>
      </div>
      <div className='col-12 col-md-6 col-lg-6 col-xl-6'>
        <div className='row nft-div'>
          <p>YOUR STAKED SOULDIERS</p>
        </div>
        <div className='row'>
          {
            stakedSoldiers.map((nft,idx)=>{
              return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
              <div className="w3-container w3-center">
                <h3>{nft.name}</h3>
                  <img className="card-img-top" src={nft.image} alt="Image Error"/>
                <h5>{nft.stakedType}</h5>
                <h5>{(new Date(nft.stakeTime * 1000)).toLocaleString("en-US")}</h5>
                <div className="w3-section">
                  <button className="w3-button w3-green" onClick={async ()=>{
                      await unstakesoldier(nft.stakeData, nft.attributes[0].value);
                    }}>UnStake</button>
                </div>
              </div>
            </div>
            })
          }
        </div>
      </div>
    </div>
    
    <div className='row warning-label'>
      <p>
      YOU MUST UNSTAKE YOUR HORNS AND HALOS EACH WEEK AND RESTAKE THEM DURING THE STAKING PERIOD.
      </p>
      <p>
      YOU WILL NOT PARTICIPATE IN COMPETITIVE STAKING IF YOU LEAVE YOUR NFTs STAKED.
      </p>
    </div>
    { ownerstakedinfo && <div className='row state-div'>
        {/* <h3>Your Staking State</h3> */}
        <table className="table table-hover state-table">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Staked Halos Unit</th>
              <td>{ownerstakedinfo.halos_unit}</td>
            </tr>
            <tr>
              <th scope="row">Staked Horns Unit</th>
              <td>{ownerstakedinfo.horns_unit}</td>
            </tr>
            <tr>
              <th scope="row">Souls in wallet</th>
              <td>{ownerstakedinfo.souls}</td>
            </tr>
          </tbody>
        </table>
      </div>
    }
    <div className='row nft-collection-div'>
      <img src="https://glittercloudsolutions.com/wp-content/uploads/2022/03/61cc058db2a9f7c13ce75b20_web-rotate-devil-300x300.gif" alt="" loading="lazy" />
      <img src="https://glittercloudsolutions.com/wp-content/uploads/2022/03/61cc0557d84fe982e9aaf019_web-rotate-angel-300x300.gif" alt="" loading="lazy" />
    </div>
    <div className='row community-label'>
      <p>
        JOIN THE COMMUNITY
      </p>
    </div>
    <div className='row community-icon'>
      <a href="#" ><FaDiscord style={{width:"50px", height:"40px", color:"white"}}/></a>
      <a href="#" ><FaTwitter style={{width:"50px", height:"40px", color:"white"}}/></a>
    </div>
    {/* <Button variant="primary" onClick={() => setModalShow(true)}>
      Launch vertically centered modal
    </Button> */}

    <SelectHHModal
      show={modalShow}
      OnHalos={() => stakeSoldierToHalos()}
      OnHorns={() => stakeSoldierToHorns()}
      onHide={() => setModalShow(false)}
    />

    {/* <div className='row'>
      <div className='cur-time-show'>
        <p>Today: {todaystr}</p>
      </div>
    </div>
    <hr />
    <div className='row warning-label'>
      <p>
      YOU MUST UNSTAKE YOUR HORNS AND HALOS EACH WEEK AND RESTAKE THEM DURING THE STAKING PERIOD.
      </p>
      <p>
      YOU WILL NOT PARTICIPATE IN COMPETITIVE STAKING IF YOU LEAVE YOUR NFTs STAKED.
      </p>
    </div>
    <hr />
    {pD && 
      <div className='row'>
        <div className='row'>
          <div className='col-lg-6 col-12 time-show'>
            <p>Staking Period:</p>
            <p>{stakingPeriod.start} - {stakingPeriod.end}</p>
          </div>
          <div className='col-lg-6 col-12 time-show'>
            <p>Withdraw Period:</p>
            <p>{withdrawPeriod.start} - {withdrawPeriod.end}</p>
          </div>
        </div>
      </div>
    }
   	<hr/>
    { catchFlag && <div className="row">
        <div className='row' style={{display:"flex", justifyContent:"center"}}>
          <div className="winteam-label">
            { (fightingFlag === 0 || fightingFlag === 1 ) && <p>The {winTeam} Are Victorious!</p> }
            { fightingFlag === 2 && <p>The Match Was a Draw!</p> }
          </div>
        </div>

        <div className='row'>
        { fightingFlag === 0 && <div className="winning-video" dangerouslySetInnerHTML={{ __html: `
            <video
              loop
              muted
              autoplay
              playsinline
              src="${winhalos}"
              class="video-style"
            />,
          ` }}></div>
          }
          { fightingFlag === 1 && <div className="winning-video" dangerouslySetInnerHTML={{ __html: `
            <video
              loop
              muted
              autoplay
              playsinline
              src="${winhorns}"
              class="video-style"
            />,
          ` }}></div>
          }
        </div>
        <div className='row' style={{display:"flex", justifyContent:"center"}}>
            <div className="claim-label" >
              <p>Your Claimable Amount: {claimableAmount}</p>
            </div>
            <div style={{ width: "20%" }}>
              <button className="button custom-btn" onClick={async () =>{await claim()}}><span>Claim</span></button>
            </div>
        </div>
      </div>
    }
    <hr/>
    { pD && <div className='row'>
        <h3>Pool State</h3>
          <table className="table table-hover ">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Staked souls</th>
              <td>{pD.total_souls / pD.token_unit}</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Souls per NFT</th>
              <td>{pD.soulAmount}</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Staked Halos</th>
              <td>{pD.halos_count}</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Staked Horns</th>
              <td>{pD.horns_count}</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Winning</th>
              <td>{pD.win_percent}%</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Fail</th>
              <td>{pD.lose_percent}%</td>
            </tr>
          </tbody>
          <tbody>
            <tr>
              <th scope="row">Burn</th>
              <td>{pD.burn_percent}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    }
    <hr />
    { ownerstakedinfo && <div className='row'>
        <h3>Your Staking State</h3>
        <table className="table table-hover">
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Staked Halos</th>
              <td>{ownerstakedinfo.halosCount.toNumber()}</td>
            </tr>
            <tr>
              <th scope="row">Staked Horns</th>
              <td>{ownerstakedinfo.hornsCount.toNumber()}</td>
            </tr>
            <tr>
              <th scope="row">Souls in wallet</th>
              <td>{ownerstakedinfo.souls}</td>
            </tr>
          </tbody>
        </table>
      </div>
    }
    <hr />
		<div className="row">
			<div className="col-lg-6">
        <div className='row'>
          <div className='row'>
            <div className='col-6 col-md-6 col-lg-6 col-xl-6'>
              <h4>Your Wallet NFT</h4>
            </div>
            <div className='col-6 col-md-6 col-lg-6 col-xl-6'>
              <button type="button" className="stake_button" style={{float:"right"}} onClick={async () =>{
                await stakeAll(true)
              }}><span>StakeHalos</span></button>
              <button type="button" className="stake_button" style={{float:"right"}} onClick={async () =>{
                await stakeAll(false)
              }}><span>StakeHorns</span></button>
            </div>
          </div>
          <div className='row'>
            {nfts.length && <div className="row">
              {
                nfts.map((nft,idx)=>{
                  // console.log(nft);
                  return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
                  <div className="w3-container w3-center">
                    <h3>{nft.name}</h3>
                      <img className="card-img-top" src={nft.image} alt="Image Error"/>
                    <h5>{nft.attributes[0].value}</h5>
                    <div className="w3-section">
                      <button className="w3-button w3-green" onClick={async ()=>{
                          await stake(nft.account_address, nft.mint_address, nft.attributes[0].value)
                        }}>Stake</button>
                    </div>
                  </div>
                </div>
                })
              }
            </div>
}
          </div>
				</div>
			</div>
      <div className="col-lg-6">
        <div className='row'>
          <div className='row'>
            <div className='col-6 col-md-6 col-lg-6 col-xl-6'>
              <h4>Your Staked NFT</h4>
            </div>
            <div className='col-6 col-md-6 col-lg-6 col-xl-6'>
              <button type="button" className="unstake_button" style={{float:"right"}} onClick={async () =>{
                await unstakeAll()
              }}><span>UnStakeAll</span></button>
            </div>
          </div>
        </div>
        <div className='row'>
          <div className="row">
          {
            stakedNfts.map((nft,idx)=>{
              return <div className="w3-card-4 w3-dark-grey col-6 col-md-4 col-lg-4 col-xl-4" key={idx}>
              <div className="w3-container w3-center">
                <h3>{nft.name}</h3>
                  <img className="card-img-top" src={nft.image} alt="Image Error"/>
                <h5>{nft.type}</h5>
                <h5>{(new Date(nft.stakeTime * 1000)).toLocaleString("en-US")}</h5>
                <div className="w3-section">
                  <button className="w3-button w3-green" onClick={async ()=>{
                      await unstake(nft.stakeData, nft.attributes[0].value);
                    }}>UnStake</button>
                </div>
              </div>
            </div>
            })
          }
          </div>
        </div>
      </div>
		</div>
    <hr/> */}
	</div>
}