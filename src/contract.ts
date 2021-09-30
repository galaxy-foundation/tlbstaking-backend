import Model from './model';
const Events = new Model('v3_events');


const Web3 = require('web3');
const fs = require('fs');

const privkey = process.env.PRIVKEY
const chainid = Number(process.env.CHAIN_ID)
const blocktime = Number(process.env.BLOCKTIME) * 1000;
const rpc = process.env.NETWORK_URL

const web3 = new Web3(rpc);

const v1conf = JSON.parse(fs.readFileSync(__dirname + '/../../frontend/src/config/v2.json').toString());
const contractTlb:string = v1conf[chainid].tlb.contract;
const precisionTlb:number = v1conf[chainid].tlb.precision;
const contractUsdt:string = v1conf[chainid].usdt.contract;
const precisionUsdt:number = v1conf[chainid].usdt.precision;
const abiTlb:any = JSON.parse(fs.readFileSync(__dirname + '/../../frontend/src/config/TLBStaking-v2.json').toString());
const abiErc20:any = JSON.parse(fs.readFileSync(__dirname + '/../../frontend/src/config/erc20-v2.json').toString());
const p1 = 10 ** precisionTlb;
const p2 = 10 ** precisionUsdt;


export default class Contract {
	blocks:Array<{
		number:number,
		hash:string,
		time:number
	}> = [];

	cb:(balance:number,res:any)=>void;
	constructor(cb) {
		this.cb = cb;
		this.cronContract();
		const now = Math.round(new Date().getTime()/1000);
		setTimeout(()=>this.cronRedeem(),(now % 86400)*1000)
		/* this.initEvent(); */
	}
	async initEvent() {
		const max = 7222160;
		let i=7192404
		while(i<max) {
			let start = i;
			let end = i+5000;
			if (end>max) end = max;
			let res:any = await this.events(start,end);
			if (res) {
				await Events.insert(res);
				console.log('event: start='+start+' end='+end+' result:'+res.length)
			} else {
				console.log('event: start='+start+' end='+end+' result:0')
			}
			i = end;
		}
	}
	async events(fromBlock,toBlock) {
		try {
			const result = [];
			let contract = new web3.eth.Contract(abiTlb, contractTlb);
			let rows = await Promise.all([
				/* event AddUser(address guest, uint amount);
				event UpdateUser(address guest, uint amount);
				event AddMiner(address guest, uint amount);
				
				event Insurance(address lucky, uint benefit);
				event RedeemOrder(uint _orderCount,uint _sumTps); */

				contract.getPastEvents('AddUser', {fromBlock,toBlock}),
				contract.getPastEvents('AddMiner', {fromBlock,toBlock}),
				contract.getPastEvents('Insurance', {fromBlock,toBlock}),
				contract.getPastEvents('RedeemOrder', {fromBlock,toBlock}),
			])
			if (rows) {
				for(let ve of rows) {
					if (ve) {
						for(let v of ve) {
							if (v.address===contractTlb) {
								let json = null;
								if (v.event==='AddUser') {
									json = {
										guest:v.returnValues.guest,
										totalUsers:Number(v.returnValues.amount)
									}
								} else if (v.event==='AddMiner') {
									json = {
										guest:v.returnValues.guest,
										power:Number(v.returnValues.amount)
									}
								} else if (v.event==='Insurance') {
									json = {
										lucky:v.returnValues.lucky,
										benefit:Number(v.returnValues.benefit) / p2
									}
								} else if (v.event==='RedeemOrder') {
									json = {
										_orderCount:v.returnValues._orderCount,
										_sumTps:Number(v.returnValues._sumTps) / p1
									}
								}
								result.push({
									event: v.event,
									height: v.blockNumber,
									hash: v.transactionHash,
									args: json ? JSON.stringify(json) : null
								})
							}
						}
					}
				}
			}
			return result;
		} catch (err) {
			return {err};
		}
	}
	async call(to, method, ...args) {
		try {
			let contract = new web3.eth.Contract(to===contractUsdt?abiErc20:abiTlb, to);
			let res = await contract.methods[method](...args).call();
			return res;
		} catch (err) {
			return {err};
		}
	}
	async callBySigner(to, method, ...args) {
		try {
			let account = web3.eth.accounts.privateKeyToAccount(privkey);
			let contract = new web3.eth.Contract(to===contractUsdt?abiErc20:abiTlb, to, {from:account.address});
			let data = contract.methods[method](...args).encodeABI();
			let gasPrice = await web3.eth.getGasPrice();
			let gasLimit = await contract.methods[method](...args).estimateGas();
			let json = {gasPrice, gasLimit, to, value: 0x0, data};
			let signedTx = await web3.eth.accounts.signTransaction( json, privkey);
			let txid;
			let receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => txid = res);
			if (receipt && receipt.transactionHash) {
				return true;
			} else {
				console.log('failed', txid);
			}
		} catch (err) {
			console.log(err)
		}
		return false;
	}

	async cronContract() {
		let time = +new Date();
		try {
			let result:any = {}
			let res = await web3.eth.getBlock("latest");
			if (res && !res.err) {
				const block = {
					number: res.number,
					hash: res.hash,
					time: res.timestamp
				};
				if (this.blocks.length===10) this.blocks.shift();
				this.blocks.push(block);
				
				let events:any = await this.events(res.number,res.number);
				if (events && events.length) {
					await Events.insert(events);
				}
			}
			let balance = 0;
			res = await this.call(contractUsdt, 'balanceOf', contractTlb);
			if (res) {
				balance = Math.round(Number(res) / p2);
			}
			res = await this.call(contractTlb, 'contractInfo');
			if (res && !res.err) {
				let i = 0;
				result.price = 			Number(res[i++]) / p2;
				result.currentLayer = 	Number(res[i++]);
				result.totalUsers = 	Number(res[i++]);
				result.totalMineable = 	Number(res[i++]) / p1;
				result.insuranceTime = 	Number(res[i++]);
	
				result.totalDeposit = 	Number(res[i++]) / p2;
				result.totalwithdraw = 	Number(res[i++]) / p2;
				result.redeemAmount = 	Number(res[i++]) * 10 / p2 ;
				result.totalSupply = 	Number(res[i++]) / p1;
				result.totalBurnt = 	Number(res[i++]) / p1;
				result.insuranceCounterTime = Number(res[i++]);
				result.insuranceAmount= Number(res[i++]) / p2;
				// miner
				result.minerCount = 	Number(res[i++]);
				result.minerTotalPower =Number(res[i++]);
				result.minerTierPrice1 =Number(res[i++]) / p2;
				result.minerTierPrice2 =Number(res[i++]) / p2;
				result.minerTierPrice3 =Number(res[i++]) / p2;
				result.minerTierPrice4 =Number(res[i++]) / p2;
	
				let c1 = 	            Number(res[i++]);
				let c2 = 	            Number(res[i++]);
				let c3 = 	            Number(res[i++]);
				let c4 =                result.minerCount - c1 - c2 - c3;
				if (c4<0) c4 = 0;
				if (result.minerCount) {
					result.minerTier1 = Number((c1 * 100 / result.minerCount).toFixed(2));
					result.minerTier2 = Number((c2 * 100 / result.minerCount).toFixed(2))
					result.minerTier3 = Number((c3 * 100 / result.minerCount).toFixed(2))
					result.minerTier4 = Number((c4 * 100 / result.minerCount).toFixed(2))
				} else {
					result.minerTier1 = 0;
					result.minerTier2 = 0;
					result.minerTier3 = 0;
					result.minerTier4 = 0;
				}
			}
			res = await this.call(contractTlb, 'orderHistory');
			if (res && Array.isArray(res) && res.length) {
				result.orders = (Array.isArray(res[0]) ? res : [res]).map(v=>[Number(v[0]),Number(v[1]),Number(v[2])/p1,Number(v[3])]);
			}
			res = await this.call(contractTlb, 'minerList');
			if (res && res[0] && res[1] && res[2]) {
				result.minerList = [];
				for(let i = 0; i<res[0].length; i++) {
					let address = res[0][i];
					let power = Number(res[1][i]);
					let lastblock = Number(res[2][i]);
					if (lastblock) {
						result.minerList.push([
							address,
							power,
							lastblock,
						])
					}
				}
				const now = Math.round(new Date().getTime()/1000);
				if (now > 1628470979 + 86400 * 60 && now - result.insuranceCounterTime >= 129600) {
					await this.callBySigner(contractTlb, 'checkInsurance');
				}
				
			}

			
			this.cb(balance,{contract:result,blocks:this.blocks})
		} catch (err) {
			console.error(err)
		}
		let spent = +new Date() - time;
		console.log("contractInfo", spent+'ms');
		let delay = blocktime - spent;
		if (delay<0) {
			this.cronContract();
		} else {
			setTimeout(()=>this.cronContract(),delay)
		}
	}
	cronRedeem() {
		setTimeout(()=>this.cronRedeem(),86400000)
		
		this.callBySigner(contractTlb, 'redeemSellOrders');
	}
}