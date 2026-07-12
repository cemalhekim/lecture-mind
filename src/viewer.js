const q=s=>document.querySelector(s),id=new URLSearchParams(location.search).get('id');
let data,zoom=1,selected=0,pan;

fetch('/api/map?id='+encodeURIComponent(id)).then(r=>r.json()).then(d=>{
  data=d;q('#title').textContent=d.title;draw();select(0);setTimeout(fit,60);
});

function positions(){
  const byId=Object.fromEntries(data.concepts.map(c=>[c.id,c]));
  const incoming=Object.fromEntries(data.concepts.map(c=>[c.id,[]]));
  data.edges.forEach(e=>{if(byId[e.from]&&byId[e.to])incoming[e.to].push(e.from)});
  const level={};
  function depth(id,trail=new Set()){
    if(level[id]!==undefined)return level[id];
    if(trail.has(id))return 0;
    trail.add(id);const parents=incoming[id]||[];
    level[id]=parents.length?1+Math.max(...parents.map(p=>depth(p,new Set(trail)))):0;
    return level[id];
  }
  data.concepts.forEach(c=>depth(c.id));
  const groups={};data.concepts.forEach((c,i)=>(groups[level[c.id]]??=[]).push({...c,order:i}));
  const pos={},nodeW=240,nodeH=84,colGap=135,rowGap=72,padX=70,padY=90;
  Object.keys(groups).sort((a,b)=>a-b).forEach(k=>{
    const group=groups[k].sort((a,b)=>a.order-b.order),total=group.length*nodeH+(group.length-1)*rowGap;
    group.forEach((c,i)=>pos[c.id]={x:padX+(+k)*(nodeW+colGap),y:Math.max(padY,(700-total)/2+i*(nodeH+rowGap))});
  });
  return {pos,width:Math.max(1100,(Math.max(...Object.values(level))+1)*(nodeW+colGap)+padX+40),height:700,nodeW,nodeH};
}

function draw(){
  const svg=q('#map'),layout=positions(),{pos,width,height,nodeW,nodeH}=layout;
  svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.style.width=`${width}px`;svg.style.height=`${height}px`;
  svg.innerHTML='<defs><marker id="a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10z" fill="#9eaaa3"/></marker></defs>';
  const columnStep=nodeW+135;
  data.edges.forEach((e,i)=>{
    const a=pos[e.from],b=pos[e.to];if(!a||!b)return;
    const x1=a.x+nodeW,y1=a.y+nodeH/2,x2=b.x,y2=b.y+nodeH/2,gap=x2-x1;
    let path;
    if(gap<=columnStep-nodeW+8){
      const middle=x1+gap/2;
      path=`M${x1} ${y1} H${middle} V${y2} H${x2}`;
    }else{
      const upper=(a.y+b.y)/2<height/2,corridor=(upper?34:height-34)+(upper?1:-1)*(i%5)*7;
      const exit=x1+24+(i%3)*7,entry=x2-24-(i%3)*7;
      path=`M${x1} ${y1} H${exit} V${corridor} H${entry} V${y2} H${x2}`;
    }
    svg.insertAdjacentHTML('beforeend',`<path class="edge" marker-end="url(#a)" d="${path}"/>`);
  });
  data.concepts.forEach((c,i)=>{
    const p=pos[c.id],eq=c.equation.replace(/\n/g,' · ').slice(0,34),title=c.title.length>30?c.title.slice(0,29)+'…':c.title;
    svg.insertAdjacentHTML('beforeend',`<g class="node" data-i="${i}" transform="translate(${p.x} ${p.y})"><rect width="${nodeW}" height="${nodeH}"/><rect class="accent" width="5" height="${nodeH}"/><text class="k" x="18" y="21">${String(i+1).padStart(2,'0')} · ${c.category.toUpperCase()}</text><text class="t" x="18" y="48">${title}</text><text class="f" x="18" y="69">${eq}</text></g>`);
  });
  svg.onclick=e=>{const n=e.target.closest('.node');if(n)select(+n.dataset.i)};
}

function select(i){
  selected=i;const c=data.concepts[i];document.querySelectorAll('.node').forEach((n,j)=>n.classList.toggle('active',i===j));
  q('#index').textContent=String(i+1).padStart(2,'0');q('#category').textContent=c.category;
  ['title','motivation','problem','intuition','connection','misconception','equation'].forEach(k=>q('#'+(k==='title'?'concept':k)).textContent=c[k]);q('#note').textContent=c.equationNote;
}

const canvas=q('#canvas');
canvas.addEventListener('selectstart',e=>e.preventDefault());canvas.addEventListener('dragstart',e=>e.preventDefault());
canvas.onpointerdown=e=>{if(e.button!==0||e.target.closest('.node'))return;pan=[e.clientX,e.clientY,canvas.scrollLeft,canvas.scrollTop];canvas.setPointerCapture(e.pointerId);canvas.classList.add('drag')};
canvas.onpointermove=e=>{if(pan){canvas.scrollLeft=pan[2]-e.clientX+pan[0];canvas.scrollTop=pan[3]-e.clientY+pan[1]}};
canvas.onpointerup=canvas.onpointercancel=()=>{pan=null;canvas.classList.remove('drag')};
canvas.addEventListener('wheel',e=>{if(!e.ctrlKey&&!e.metaKey)return;e.preventDefault();const rect=canvas.getBoundingClientRect(),old=zoom,mx=(canvas.scrollLeft+e.clientX-rect.left)/old,my=(canvas.scrollTop+e.clientY-rect.top)/old;setZoom(old*Math.exp(-e.deltaY*.008));canvas.scrollLeft=mx*zoom-(e.clientX-rect.left);canvas.scrollTop=my*zoom-(e.clientY-rect.top)},{passive:false});
function setZoom(v){zoom=Math.max(.42,Math.min(1.35,v));q('#map').style.transformOrigin='0 0';q('#map').style.transform=`scale(${zoom})`}
function fit(){setZoom(Math.min(1,(canvas.clientWidth-36)/q('#map').scrollWidth,(canvas.clientHeight-36)/q('#map').scrollHeight));canvas.scrollTo(0,0)}
q('#fit').onclick=fit;
