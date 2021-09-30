require("dotenv").config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
/* const isProduction = process.env.NODE_ENV === 'production'; */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import * as shrinkRay from 'shrink-ray-current'
import * as cors from 'cors'
import * as bodyParser from 'body-parser'

import {setlog} from './helper';
import Contract from './contract';

import Model from './model';
/* import * as express_graphql from 'express-graphql'; */
/* import { graphqlHTTP } from 'express-graphql'; */
/* import { ApolloServer } from 'apollo-server-express'; */
/* import { buildSchema } from 'graphql';
const express_graphql = require('express-graphql'); */

const Users = new Model('v3_users','key');
const Logs = new Model('v3_logs','key');
/* const Events = new Model('v3_events'); */

const data:any = {};

/* 
const schema = buildSchema(`
	type Query {
		contract(
			address: String, 
			totaldeposit:Int, 
			totalwithdraw:Int, 
			withdrawable:Int, 
			score: Int, 
			minepower: Int, 
			minerewards: Int, 
			minerefpower: Int, 
			minepending: Int, 
		): String
	}
`); */

// The root provides a resolver function for each API endpoint
/* const root = {
	contract: (params:any,req:any) => {
		const address = params.address;
		const totaldeposit = params.totaldeposit;
		const totalwithdraw = params.totalwithdraw;
		const withdrawable = params.withdrawable;
		const score = params.score;
		const minepower = params.minepower;
		const minerewards = params.minerewards;
		const minerefpower = params.minerefpower;
		const minepending = params.minepending;
		if (address!=='') {
			Users.insertOrUpdate({
				key:address,
				totaldeposit,
				totalwithdraw,
				withdrawable,
				score,
				minepower, 
				minerewards, 
				minerefpower, 
				minepending, 
				updated: Math.round(new Date().getTime()/1000)
			});
		}
		
		return JSON.stringify(data);
	},
};
 */

/* if (isProduction) { */
	process.on("uncaughtException", (err:Error) => setlog('exception',err));
	process.on("unhandledRejection", (err:Error) => setlog('rejection',err));
/* } */

Date.now = () => Math.round((new Date().getTime()) / 1000);

class WebApp {
	start() { 
		const app = express()
		const server = http.createServer(app);
		const key = fs.readFileSync(__dirname+'/../certs/server.key', 'utf8');
		const cert = fs.readFileSync(__dirname+'/../certs/cdcf5746e8dc92d1.crt', 'utf8');
		const caBundle = fs.readFileSync(__dirname+'/../certs/gd_bundle-g2-g1.crt', 'utf8');
		const ca = caBundle.split('-----END CERTIFICATE-----\n') .map((cert:any) => cert +'-----END CERTIFICATE-----\n');
		ca.pop();

		let options = {cert,key,ca};
		const httpsServer = https.createServer(options,app);
		app.use(shrinkRay());
		app.use(cors({
			origin: function(origin, callback){
				const hosts = [
					'http://localhost',
					'https://localhost:8443',

					'http://162.0.222.70',
					'https://162.0.222.70',

					'http://tlbstaking.com',
					'https://tlbstaking.com',
					'http://localhost:3000'
				]
				if (origin===undefined || hosts.indexOf(origin)!==-1) {
					
					return callback(null, true);	  
				}
				console.log(origin);
				return;
			}
		}));

		app.use(express.static(path.normalize(__dirname + '/../files')));
		const FRONTENDPATH = path.normalize(__dirname + '/../../frontend/build');
		app.use(express.static(FRONTENDPATH));
		app.use(bodyParser.json());
		app.post('/graphql', (req:any,res:any) => {
			if (req.body.address!=='') {
				let ip:any  = req.headers['x-real-ip'] || req.connection.remoteAddress || '';
				if (!ip) {
					console.log(req.headers);
				}
				if (ip!=='::1') {
					let p = ip.lastIndexOf(':');
					if(p!=-1) ip=ip.slice(p+1);
				}
				
				Users.insertOrUpdate({
					key: req.body.address,
					ip,
					referer: req.body.referer || null,
					minereferer: req.body.minereferer || null,
					usdt: req.body.usdt || 0,
					tlb: req.body.tlb || 0,
					refcount: req.body.refcount || 0,
					children: req.body.children || 0,
					sh: req.body.sh || null,
					parent: req.body.parent || null,
					childdata: req.body.childdata ? JSON.stringify(req.body.childdata) : null,
					orders: req.body.orders ? JSON.stringify(req.body.orders) : null,
					
					totaldeposit: req.body.totaldeposit || 0,
					totalwithdraw: req.body.totalwithdraw || 0,
					withdrawable: req.body.withdrawable || 0,
					score: req.body.score || 0,
					minepower: req.body.minepower || 0, 
					minerewards: req.body.minerewards || 0, 
					minerefpower: req.body.minerefpower || 0, 
					minepending: req.body.minepending || 0, 
					updated: Math.round(new Date().getTime()/1000)
				});
			}
			res.send(data);
		});
		app.get('*', (req,res) =>res.sendFile(FRONTENDPATH+'/index.html'));
		
		let time = +new Date();
		setlog();
		Model.connect({
			host: process.env.DB_HOST,
			port: Number(process.env.DB_PORT),
			user: process.env.DB_USER,
			password: process.env.DB_PASS,
			database: process.env.DB_NAME
		}).then(async (res:any)=>{
			if (res===true) {
				setlog(`Connected MySQL ${+new Date()-time}ms`);
				time = +new Date();
				let port = Number(process.env.HTTP_PORT);
				await new Promise(resolve=>server.listen(port, ()=>resolve(true)));
				setlog(`Started HTTP service on port ${port}. ${+new Date()-time}ms`);
				time = +new Date();
				port = Number(process.env.HTTPS_PORT);
				await new Promise(resolve=>httpsServer.listen(port, ()=>resolve(true)));
				setlog(`Started HTTPS service on port ${port}. ${+new Date()-time}ms`);

				new Contract(async (balance:number,res:any)=>{
					if (res.blocks && res.contract) {
						const now = Math.round(new Date().getTime()/1000);
						let price = res.contract.price * 1e4;
						let totaldeposit = res.contract.totalDeposit;
						let totalwithdraw = res.contract.totalwithdraw;
						let totalsupply = res.contract.totalSupply;
						let totalburnt = res.contract.totalBurnt;
						let layers = res.contract.currentLayer;
						let users = res.contract.totalUsers;
						let totalpower = res.contract.minerTotalPower;
						await Logs.insertOrUpdate({
							key: (now - now%3600),
							balance,
							price,
							totaldeposit,
							totalwithdraw,
							totalsupply,
							totalburnt,
							layers,
							users,
							totalpower
						});

						const ranks:any = [];
						const tvls:any = [];
	
						let rows:any = await Users.find({score:{$ne:0},key:{$ne:'0xF0A808E9ce2F8E1F8a3B508727840E10f74F2268'}},{score:-1},'`key`,`score`',{limit:5});
						if (rows) rows.map(v=>ranks.push([v.key,v.score]));
						rows = await Logs.find({},{key:-1},'`key`,`totaldeposit`,`totalpower`,`price`',{limit:24});
						if (rows) {
							for(let k=rows.length-1;k>=0; k--) tvls.push([rows[k].key,rows[k].totaldeposit,rows[k].totalpower,rows[k].price])
						}
						data.contract = {...res.contract, ranks, tvls};
						data.blocks = res.blocks;
					}
				})
				setlog(`Started contract`);
			} else {
				setlog('MySQL',res);
				return process.exit(1)
			}
		})
	}
}

const app = new WebApp();
app.start();