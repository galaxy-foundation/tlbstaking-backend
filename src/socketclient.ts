import {client as WebSocketClient,connection, IStringified} from 'websocket';
import * as http from 'http';
import * as https from 'https';

export type E_connect = (con:connection) => void;
export type E_disconnect = () => void;
export type E_data = (con:connection,text?:string) => void;

export interface IEvents {
	connect?: E_connect;
	disconnect?: E_disconnect;
	data?: E_data;
}


export class SocketClient{
	url:string='';
	timeout = 5000;
	connected = false;
	socket:connection|null=null;
	_timeHandler:NodeJS.Timeout|null=null;
	events:IEvents={};
	
	constructor(url:string) {
		this.url = url;
		this.connect();
	}
	connect() {
		const client = new WebSocketClient();
		client.on('connectFailed', (err: Error)=>{
			if (this.connected && this.events.disconnect!==undefined) this.events.disconnect();
			this.connected=false;
			this.reconnect();
		});
		client.on('connect', (con:connection)=>{
			this.socket = con;
			this.connected = true;
			if (this._timeHandler!==null) {
				clearTimeout(this._timeHandler);
				this._timeHandler=null;
			}
			if (this.events.connect!==undefined) this.events.connect(con);
			con.on('close', ()=>{
				if (this.connected) {
					if (this.events.disconnect!==undefined) this.events.disconnect();
					this.connected=false;
					this.reconnect();
				} else {
					console.log('Chain-API already disconnected.')
				}
			});
			con.on('message', (buf)=>{
				if (buf.type === 'utf8') {
					this.events.data && this.events.data(con,buf.utf8Data);
				}
			});
		});
		client.connect(this.url, "", this.url.replace('ws://','http://'))
	}
	on(event:'connect', cb:E_connect):void;
	on(event:'disconnect', cb:E_disconnect):void;
	on(event:'data', cb:E_data):void;
	on(event:'connect'|'disconnect'|'data', cb:any):void {
		if (event==='connect') this.events.connect = cb;
		if (event==='disconnect') this.events.disconnect = cb;
		if (event==='data') this.events.data = cb;
	};
	reconnect() {
		if (this.connected) return;
		if (this._timeHandler!==null) clearTimeout(this._timeHandler);
		this._timeHandler = setTimeout(()=>this.connect(),1000);
	}
	send(raw:IStringified) {
		if (this.socket && this.socket.connected) {
			this.socket.sendUTF(raw);
			return false;
		}
		return false;
	}
}


