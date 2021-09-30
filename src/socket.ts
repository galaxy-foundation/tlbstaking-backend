import {server as WebSocketServer,connection} from 'websocket';
import * as http from 'http';
import * as https from 'https';

export interface IConfig {
	path?: string;
	origin?: string;
	allowIps?: string[]|null;
}
/* export type con = connection; */
export type E_beforeConnect = (ip:string, cookie:string) => void;
export type E_connect = (con:connection,ip:string, cookie:string) => void;
export type E_disconnect = (con:connection) => void;
export type E_data = (con:connection,text?:string) => void;

export interface IEvents {
	beforeConnect: E_beforeConnect|null;
	connect: E_connect|null;
	disconnect: E_disconnect|null;
	data: E_data|null;
}
export default class Socket{
	timeout:number = 5000;
	config:IConfig = {
		path: '/',
		origin: 'file://',
		allowIps: null,
	};
	events:IEvents = {
		beforeConnect: null,
		connect: null,
		disconnect: null,
		data: null,
	};
	constructor(httpServer:http.Server | https.Server,opt:IConfig|null) {
		if (opt!==null) {
			if (opt.path!==undefined) this.config.path=opt.path;
			if (opt.origin!==undefined) this.config.origin=opt.origin;
			if (opt.allowIps!==undefined) this.config.allowIps=opt.allowIps;
		}
		
		const max = 12582912; // 12MB
		const wsServer = new WebSocketServer({httpServer,maxReceivedFrameSize: max, maxReceivedMessageSize: max,autoAcceptConnections: false});
		wsServer.on('request', async (req) => {
			let ip = req.remoteAddress;
			let p = ip.lastIndexOf(':');
			if (p!==-1) ip= ip.slice(p+1);
			if (req.resource && req.origin===this.config.origin && (this.config.allowIps===null || this.config.allowIps && this.config.allowIps.indexOf(ip)!==-1)) {
				if (this.events.connect!==null) {
					const cookie = req.resource.slice(1);
					const connectable = this.events.beforeConnect!==null ? await this.events.beforeConnect(ip,cookie) : true;
					if (connectable) {
						const con = req.accept();
						this.events.connect(con,ip,cookie);
						con.on('message', buf => {
							if (buf.type==='utf8') {
								if (this.events.data!==null) this.events.data(con,buf.utf8Data)
							}
							
						});
						con.on('close', () => (this.events.disconnect && this.events.disconnect(con)));
					}
				}
			}
		});
	}
	on(event:'beforeConnect', cb:E_beforeConnect):void;
	on(event:'connect', cb:E_connect):void;
	on(event:'disconnect', cb:E_disconnect):void;
	on(event:'data', cb:E_data):void;
	on(event:'beforeConnect'|'connect'|'disconnect'|'data', cb:any):void {
		if (event==='beforeConnect') this.events.beforeConnect = cb;
		if (event==='connect') this.events.connect = cb;
		if (event==='disconnect') this.events.disconnect = cb;
		if (event==='data') this.events.data = cb;
	};
}