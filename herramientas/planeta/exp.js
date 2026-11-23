// Exporta la parte fija del planeta (imagen) y las trayectorias de las entregas (JSON)
// uso: node exp.js <nombre> <ancho> <alto> '<K json>' '<centro>' <carpeta_salida>
const {chromium}=require('playwright');const fs=require('fs');
(async()=>{
const [nombre,w,h,kjson,centro,outDir]=process.argv.slice(2);const W=+w,H=+h;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H},deviceScaleFactor:1});
const errs=[];p.on('pageerror',e=>errs.push(e.message));
const html=`<!doctype html><html><body style="margin:0;background:transparent">
<canvas id="planeta" data-centro="${centro}" data-datos="bogota-calles.txt" style="display:block;width:${W}px;height:${H}px"></canvas>
<script>window.__K=${kjson};</script><script src="planeta-gen.js"></script></body></html>`;
fs.writeFileSync(__dirname+'/pagina.html',html);
await p.goto('http://127.0.0.1:8766/pagina.html');
await p.waitForFunction(()=>window.__gen&&window.__gen.redLista&&window.__gen.rutasCa.length>0,null,{timeout:60000});
const res=await p.evaluate(({W,H})=>{
  const g=window.__gen;g.pintarCapa();
  // imagen: estrellas fijas + capa (superficie, horizonte, puntos, calles y órbitas)
  const ex=document.createElement('canvas');ex.width=W;ex.height=H;const c=ex.getContext('2d');
  let s=3;const r=()=>((s=(s*16807)%2147483647)-1)/2147483646;
  for(let i=0;i<110;i++){const x=r()*W,y=r()*H*0.6,rad=0.5+r()*1.1;c.fillStyle=`rgba(255,255,255,${0.25+r()*0.45})`;c.beginPath();c.arc(x,y,rad,0,7);c.fill();}
  c.drawImage(g.capa,0,0,W,H);
  const png=ex.toDataURL('image/png');
  // trayectorias: recorridos reales por la red de calles, proyectados a píxeles
  const rutas=[];let intentos=0;
  while(rutas.length<170&&intentos<2000){intentos++;
    const r0=g.rnd();const usaAv=r0<0.35;
    const pool=!usaAv&&r0<0.6&&g.rutasPeriferia.length?g.rutasPeriferia:usaAv?g.rutasAv:g.rutasCa;
    const {ruta,largo,av}=g.recorrido(pool[Math.floor(g.rnd()*pool.length)],0.025+g.rnd()*0.035);
    const tramo=g.dens(ruta,0.0012);
    let mejor=[],act=[];
    for(const q of tramo){const [x,y,z]=g.proj(q);if(z>0&&x>-20&&x<W+20&&y>-20&&y<H+20){act.push([Math.round(x),Math.round(y)]);}else{if(act.length>mejor.length)mejor=act;act=[];}}
    if(act.length>mejor.length)mejor=act;
    const limpio=mejor.filter((q,i)=>!i||q[0]!==mejor[i-1][0]||q[1]!==mejor[i-1][1]);
    if(limpio.length<6)continue;
    rutas.push({av:av?1:0,d:+(1.2+largo/0.014).toFixed(2),p:limpio});
  }
  // órbitas: puntos con su visibilidad (atrás del planeta no se ven)
  const tmp=document.createElement('canvas').getContext('2d');
  const orbitas=g.orbitas.map((o)=>{const pts=[];for(let k=0;k<240;k++){const a=(k/240)*Math.PI*2;const [x,y,z]=g.orbita(o,a);
    const visible=z>=0||!(g.HZ&&tmp.isPointInPath(g.HZ.sup,x,y));pts.push([Math.round(x),Math.round(y),visible&&x>-30&&x<W+30&&y>-30&&y<H+30?1:0]);}
    return {vel:o.vel,fase:+o.fase.toFixed(2),p:pts};});
  return {png,rutas,orbitas};
},{W,H});
fs.writeFileSync(`${outDir}/${nombre}.png`,Buffer.from(res.png.split(',')[1],'base64'));
// compactar: diferencias con el punto anterior
const delta=(pts)=>{const o=[];let px=0,py=0;pts.forEach(([x,y],i)=>{o.push(x-px,y-py);px=x;py=y;});return o;};
const datos={w:W,h:H,rutas:res.rutas.map(r=>({a:r.av,d:r.d,p:delta(r.p)})),orbitas:res.orbitas.map(o=>({vel:o.vel,fase:o.fase,p:o.p.flat()}))};
fs.writeFileSync(`${outDir}/${nombre}.json`,JSON.stringify(datos));
console.log(nombre,'rutas',datos.rutas.length,'json KB',Math.round(JSON.stringify(datos).length/1024),'ERR',JSON.stringify(errs));
await b.close();})();
