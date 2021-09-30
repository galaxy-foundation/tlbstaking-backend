import {enc} from './helper';

export default function(page:number,total:number,count:number, url:string, pagetype:string):string {
	if(pagetype === ''){
		if(total==1) return '';
		let html='';
		var query = '?';
        let p = url.indexOf('?');
        if (p!==-1) {
            let x = url.slice(p+1).split('&');
            for (var v of x) {
                if (v.indexOf('p=')===0) continue;
                query += v + '&';
            }
        }
		if (total > 0) {
			let pagerid = 'pager'+Math.round(Math.random()*100000000);
			html=`<ul id="${pagerid}" class="pagination text-center">`;
			if (page == 1) {
				html+=`<li class="disabled"><a class="arrow"></a></li>`
			} else {
				html+=`<li><a class="arrow" href="${query}p=${enc((page-1)+'.'+count)}#${pagerid}"></a></li>`
			}
			let pagelimit = 8;
			let start = Math.floor((page-1) / pagelimit) * pagelimit + 1;
			let end = start + pagelimit - 1;
			if (end>total) end = total;
			for (let i=start; i <= end; i++) {
				if (i == start && i > 1) html+='<li class="disabled"><a>...</a></li>'
				if (i == page) {
					html+=`<li class="active"><a class="active">${i}</a></li>`
				} else {
					html+=`<li><a href="${query}p=${enc(i+'.'+count)}#${pagerid}">${i}</a></li>`
				}
				if (i == end && i < total) html+='<li class="disabled"><a>...</a></li>'
			}
			if (page == total) {
				html+='<li class="disabled"><a class="arrow next"></a></li>'
			} else {
				html+=`<li><a class="arrow next" href="${query}p=${enc((page+1)+'.'+count)}#${pagerid}"></a></li>`
			}
			html+='</ul>';
		}
		return html;

	/* } else if(pagetype === 'prev'){
		
		if(total==1) return '';
		let html='';
		
		let url = req.originalUrl;
		let p = url.lastIndexOf('?');
		
		if (p!==-1) url = url.slice(0,p);
		url += '?';
		if (req.query) {
			for(let k in req.query) {
				if (k==='page') continue;
				url += k + '=' + req.query[k] + '&';
			}
		}
		if (total > 0) {
			html='<ul class="pagination text-center">';
			if (current == 1) {
			} else {
				html+='<li><a href="'+url+'page='+enc((page-1)+'.'+count)+'#pager">下一页</a></li>'
			}
			html+='</ul>';
		}
		
		return html;

	} else if(pagetype === 'next'){
		
		if(total==1) return '';
		let html='';
		
		let url = req.originalUrl;
		let p = url.lastIndexOf('?');
		
		if (p!==-1) url = url.slice(0,p);
		url += '?';
		if (req.query) {
			for(let k in req.query) {
				if (k==='page') continue;
				url += k + '=' + req.query[k] + '&';
			}
		}
		if (total > 0) {
			html='<ul class="pagination text-center">';
			if (current == total) {
			} else {
				html+='<li><a href="'+url+'page='+enc(current + 1)+'#pager">上一页</a></li>'
			}
			html+='</ul>';
		}
		
		return html;

	} else {
		return ''; */
	}
	return ''
}