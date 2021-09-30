require("dotenv").config();

import * as fs from 'fs';
import * as crypto from 'crypto';


export const enc=(p:string|number):string|null=>{
	try {
		if(typeof p!='string') p=p.toString();
		if (process.env.CRYPTOKEY!==undefined) {
			let secret:string=process.env.CRYPTOKEY;
			let iv = secret.substr(0,16);
			let encryptor = crypto.createCipheriv('AES-256-CBC', secret, iv);
			let s=encryptor.update(p, 'utf8', 'hex') + encryptor.final('hex');
			/* let x = encBase58(s); */
			return encodeURIComponent(s)
		}
	} catch (err) {}
	return null;
};

export const dec=(c:string):string|null=>{
	try {
		if (process.env.CRYPTOKEY!==undefined) {
			let secret=process.env.CRYPTOKEY;
			let iv = secret.substr(0,16);
			let decryptor = crypto.createDecipheriv('AES-256-CBC', secret, iv);
			let s=decryptor.update(c, 'hex', 'utf8') + decryptor.final('utf8');
			return decodeURIComponent(s)
		}
	} catch (err) {}
	return null;
};

/* export const encNum = (num:number) => {
	let t = enc(num);
	if (t===null) return null;
	return `${t.slice(0,4)}-${t.slice(4,12)}-${t.slice(12,20)}-${t.slice(20,28)}-${t.slice(28)}`;
}
export const decNum = (enc:string) => {
	if (enc!=='') {
		return dec(enc.replace(/-/g,''));
	}
	return null;
} */

export const setlog=(title:string='started',msg:string|Error|null=null):void=>{
    const date = new Date();
    let y:number = date.getUTCFullYear();
    let m:number = date.getUTCMonth() + 1;
    let d:number = date.getUTCDate();
    let hh:number = date.getUTCHours();
    let mm:number = date.getUTCMinutes();
    let ss:number = date.getUTCSeconds();
    let datetext:string = [y,('0' + m).slice(-2),('0' + d).slice(-2)].join('-');
    let timetext:string = [('0' + hh).slice(-2),('0' + mm).slice(-2),('0' + ss).slice(-2)].join(':');
    if (msg instanceof Error) msg = msg.stack || msg.message;
    let bStart = 0;
    if (title==='started') {
        bStart = 1;
        title = 'WebApp Started.';
    }
    if (msg) msg = msg.split(/\r\n|\r|\n/g).map(v=>'\t'+v).join('');
    let text = `[${timetext}] ${title}\r\n${msg===null?'':msg+'\r\n'}`;
    fs.appendFileSync(__dirname+'/../logs/'+datetext+'.log',(bStart?'\r\n\r\n\r\n':'')+text);
    if (process.env.NODE_ENV !== 'production') console.log(text);
};

export interface DATEFIELDS {
	prefixAgo: string,
	prefixFromNow: string,
	suffixAgo: string,
	suffixFromNow: string,
	seconds: string,
	minute: string,
	minutes: string,
	hour: string,
	hours: string,
	day: string,
	days: string,
	month: string,
	months: string,
	year: string,
	years: string,
	wordSeparator: string,
	inPast?: string,
	numbers?: Array<number>
}
export interface DATELANGS {
	'en':DATEFIELDS,
	'zh-cn':DATEFIELDS,
	'zh-tw':DATEFIELDS,
	'ko':DATEFIELDS,
	'ja':DATEFIELDS,
}

const DLN:DATELANGS={
	"en": {
        prefixAgo: '',
        prefixFromNow: '',
        suffixAgo: "ago",
        suffixFromNow: "from now",
        inPast: 'any moment now',
        seconds: "less than a minute",
        minute: "about a minute",
        minutes: "%d minutes",
        hour: "about an hour",
        hours: "about %d hours",
        day: "a day",
        days: "%d days",
        month: "about a month",
        months: "%d months",
        year: "about a year",
        years: "%d years",
        wordSeparator: " ",
        numbers: []
    },
	"zh-cn": {
		prefixAgo: '',
		prefixFromNow: '',
		suffixAgo: "之前",
		suffixFromNow: "之后",
		seconds: "不到1分钟",
		minute: "大约1分钟",
		minutes: "%d分钟",
		hour: "大约1小时",
		hours: "大约%d小时",
		day: "1天",
		days: "%d天",
		month: "大约1个月",
		months: "%d个月",
		year: "大约1年",
		years: "%d年",
		numbers: [],
		wordSeparator: ""
	},
	"zh-tw": {
		prefixAgo: '',
		prefixFromNow: '',
		suffixAgo: "之前",
		suffixFromNow: "之後",
		seconds: "不到1分鐘",
		minute: "大約1分鐘",
		minutes: "%d分鐘",
		hour: "大約1小時",
		hours: "%d小時",
		day: "大約1天",
		days: "%d天",
		month: "大約1個月",
		months: "%d個月",
		year: "大約1年",
		years: "%d年",
		wordSeparator: ""
	},
	ja: {
		prefixAgo: "",
		prefixFromNow: "今から",
		suffixAgo: "前",
		suffixFromNow: "後",
		seconds: "1 分未満",
		minute: "約 1 分",
		minutes: "%d 分",
		hour: "約 1 時間",
		hours: "約 %d 時間",
		day: "約 1 日",
		days: "約 %d 日",
		month: "約 1 ヶ月",
		months: "約 %d ヶ月",
		year: "約 1 年",
		years: "約 %d 年",
		wordSeparator: ""
	},
	ko: {
		prefixAgo: '',
		prefixFromNow: '',
		suffixAgo: "전",
		suffixFromNow: "후",
		seconds: "1분",
		minute: "약 1분",
		minutes: "%d분",
		hour: "약 1시간",
		hours: "약 %d시간",
		day: "하루",
		days: "%d일",
		month: "약 1개월",
		months: "%d개월",
		year: "약 1년",
		years: "%d년",
		wordSeparator: " "
	}
};

export const getDateText=(lang:keyof DATELANGS,value:number,isPast:boolean,unit?:keyof DATEFIELDS):string=>{
	const ln:DATEFIELDS = DLN[lang];
	if(unit=='seconds') return ln.seconds;
	/* if(value>1) unit+='s'; */
	let s='';
	if(!isPast && ln.prefixAgo) s+=ln.prefixAgo+ln.wordSeparator;
	if(isPast && ln.prefixFromNow) s+=ln.prefixFromNow+ln.wordSeparator;
	
	if(unit!==undefined) {
		const v:any = ln[unit];
		if (typeof v==='string') s+=v.replace('%d',value.toString());
    }
	if(!isPast && ln.suffixAgo) s+=ln.wordSeparator+ln.suffixAgo;
	if(isPast && ln.suffixFromNow) s+=ln.wordSeparator+ln.suffixFromNow;
	return s;
}

export const offsetDate=(time:number,lang:keyof DATELANGS)=>{
	if(!time) return '';
	let now=Date.now();
	let diff = Math.round((now-time) / 86400);
	let isPast=false;
	if(diff<0) {
		diff=-diff;
		isPast=true;
	}
	let y = Math.floor(diff / 365);
	if(y) return getDateText(lang,y,isPast,y===1?'year':'years');
	let m = Math.floor(diff / 31);
	if(m) return getDateText(lang,m,isPast,m===1?'month':'months');
	if(diff==0) {
		diff = now-time;
		if(diff<0) {
			diff=-diff;
			isPast=true;
		}
		let h = Math.floor(diff / 3600);
		if(h) return getDateText(lang,h,isPast,h===1?'hour':'hours');
		m = Math.floor(diff / 60);
		if(m) return getDateText(lang,m,isPast,m===1?'minute':'minutes');
		return getDateText(lang,0,isPast,'seconds');
	}
	return getDateText(lang,diff,isPast,diff===1?'day':'days');
}

export const formatDate=(time?:number,dateOnly?:true|false|'smart',offset:string='+8.0')=>{
	let iOffset:number = Number(offset);
	let date:Date = time===undefined ? new Date(Date.now()*1000 + (3600000 * iOffset)) : (typeof time==='number'?new Date(time*1000 + (3600000 * iOffset)):new Date(+time + (3600000 * iOffset)));
	let y=date.getUTCFullYear();
	let m=date.getUTCMonth() + 1;
	let d=date.getUTCDate();
	let hh=date.getUTCHours();
	let mm=date.getUTCMinutes();
	/* let ss=date.getUTCSeconds(); */
	let dt=("0" + m).slice(-2) + "-" + ("0" + d).slice(-2);
	let tt=("0" + hh).slice(-2) + ":" + ("0" + mm).slice(-2);
	if(dateOnly==='smart') {
		let date2 = new Date(Date.now()*1000 + (3600000 * iOffset));
		let y2=date2.getUTCFullYear();
		let m2=date2.getUTCMonth() + 1;
		let d2=date2.getUTCDate();
		if(y==y2) {
			if(m!=m2 || d!=d2) return dt;
			return tt;
		}
		return y+'-'+dt;
	}
    return y+'-'+dt+(dateOnly===true?"":" "+tt);
}

export const N=(v:number|string,p=8)=>Number(Number(v.toString().replace(/[^\d.]/g,'')).toFixed(p));
export const NF=(num:number|string,p?:number)=>{
	if (p!==undefined) num = N(num,p);
	return num.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
};