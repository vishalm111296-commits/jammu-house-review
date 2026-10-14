// Orthographic design studies. All plan coordinates come from the shared PDF model.
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const mm = value => Math.round(value * 1000);
let serial = 0;
const line = (x1,y1,x2,y2,colour='#6c7984',width=8,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colour}" stroke-width="${width}" ${extra}/>`;
const text = (x,y,value,size=72,extra='') => `<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(value)}</text>`;
function dim(x1,y1,x2,y2,label,size=74){
 const horizontal=y1===y2, tick=40;
 return `<g fill="#455d6b" stroke="#8b9ca4" stroke-width="6">${line(x1,y1,x2,y2)}${line(x1-tick,y1+tick,x1+tick,y1-tick)}${line(x2-tick,y2+tick,x2+tick,y2-tick)}</g>`+(horizontal?text((x1+x2)/2,y1-24,label,size,'text-anchor="middle" fill="#455d6b"'):text(x1-28,(y1+y2)/2,label,size,`text-anchor="middle" fill="#455d6b" transform="rotate(-90 ${x1-28} ${(y1+y2)/2})"`));
}
export function planSVG(room,plan,home,{layer='layout',selected='',dimensions=true,labels=true,interactive=true}={}){
 const [a,b,c,d]=room.bounds,scale=plan.source.calibration.metresPerPoint,w=mm((room.pdfBounds[2]-room.pdfBounds[0])*scale),h=mm((room.pdfBounds[3]-room.pdfBounds[1])*scale),pad=510,font=Math.max(66,Math.min(100,w/38)),clip='sheet-clip-'+(++serial);
 const xy=([x,z,xx,zz])=>[mm(x-a),mm(z-b),mm(xx-x),mm(zz-z)];
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${pad} -${pad} ${w+pad*2} ${h+pad*2+130}" role="${interactive?'group':'img'}" aria-label="${esc(room.name)} ${layer} study. Dimensions in millimetres from the PDF, not surveyed." class="drawing-svg" style="font-family:Arial,sans-serif"><defs><clipPath id="${clip}"><rect x="-245" y="-245" width="${w+490}" height="${h+490}"/></clipPath></defs><rect x="-${pad}" y="-${pad}" width="${w+pad*2}" height="${h+pad*2+130}" fill="#fff"/><rect width="${w}" height="${h}" fill="#faf9f5" stroke="#cbd2d5" stroke-width="5" stroke-dasharray="20 20"/><g clip-path="url(#${clip})">`;
 for(const wall of plan.walls){const [x,y,ww,hh]=xy(wall.bounds);if(x+ww< -245||x>w+245||y+hh< -245||y>h+245)continue;s+=`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#34444d"/>`;}
 for(const window of plan.windows){const [x,y,ww,hh]=xy(window.bounds);if(x+ww< -245||x>w+245||y+hh< -245||y>h+245)continue;s+=`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#e6f1f5" stroke="#7398aa" stroke-width="9"><title>${esc(window.name)}: PDF span; heights unconfirmed</title></rect>`+line(x+(ww<hh?ww/2:0),y+(ww>hh?hh/2:0),x+(ww<hh?ww/2:ww),y+(ww>hh?hh/2:hh),'#7398aa',5);}
 s+='</g>';
 for(const f of room.furnitureItems.filter(i=>i.placed)){
  const x=mm(f.x),y=mm(f.z),fw=mm(f.w),fh=mm(f.d),mounted=!!f.base&&f.kind!=='sink',active=f.code===selected,light=layer==='lighting';
  const control=interactive?`data-item="${f.code}" tabindex="0" role="button" aria-label="Inspect ${esc(f.label)}, ${f.code}"`:'';
  s+=`<g ${control} class="plan-item ${active?'is-selected':''}" opacity="${light?'.28':'1'}"><rect x="${x}" y="${y}" width="${fw}" height="${fh}" rx="${['chair','armchair','table'].includes(f.kind)?45:5}" fill="${active?'#d6eaf2':mounted?'none':['counter','wardrobe','shelving','cabinet','altar','desk'].includes(f.kind)?'#e9dfce':'#f2eee6'}" stroke="${active?'#176880':'#9b9181'}" stroke-width="${active?18:8}" ${mounted?'stroke-dasharray="28 18"':''}/>`;
  if(f.kind==='bed-west'){
   s+=`<rect x="${x+15}" y="${y+20}" width="100" height="${fh-40}" fill="#b4a18a"/>`+line(x+fw*.4,y+20,x+fw*.4,y+fh-20,'#c4bcae',12);
   for(const n of [.13,.57])s+=`<rect x="${x+170}" y="${y+fh*n}" width="380" height="${fh*.27}" rx="30" fill="white" stroke="#c4bcae" stroke-width="5"/>`;
  }
  if(f.kind==='gas-hob')for(const [px,py] of [[.3,.22],[.7,.5],[.3,.78]])s+=`<circle cx="${x+fw*px}" cy="${y+fh*py}" r="60" fill="none" stroke="#625e58" stroke-width="10"/>`;
  if(f.kind==='induction-hob')s+=`<circle cx="${x+fw/2}" cy="${y+fh/2}" r="95" fill="none" stroke="#625e58" stroke-width="8"/>`;
  if(labels&&!light&&(!mounted||['gas-hob','induction-hob'].includes(f.kind))){const sz=Math.min(font,Math.max(48,fw/4)),tx=f.code==='KB-01'?x+270:x+fw/2,ty=f.code==='KB-02'?1530:y+fh/2;s+=`<rect x="${tx-135}" y="${ty-42}" width="270" height="100" rx="8" fill="#fff" fill-opacity=".92"/>`+text(tx,ty+28,f.code,sz,'text-anchor="middle" fill="#3a4347"');}
  s+=`<title>${esc(f.code+' · '+f.label)} · ${mm(f.w)} × ${mm(f.d)} × ${mm(f.h)} mm; proposal</title></g>`;
 }
 if(layer==='lighting')room.lightingPlan.forEach((l,i)=>{const x=mm(l.x),y=mm(l.z);s+=`<circle cx="${x}" cy="${y}" r="100" fill="#fff1c7" stroke="#a3782e" stroke-width="10"/>${line(x-65,y,x+65,y,'#a3782e')}${line(x,y-65,x,y+65,'#a3782e')}`+text(x+140,y+25,`${l.code} / ${i+1}`,font,'fill="#846322"');});
 if(room.id==='stairs')s+=text(w/2,h/2,'STAIR SECTION NOT SUPPLIED',font,'text-anchor="middle" fill="#707b81"');
 if(dimensions){
  s+=line(0,-90,0,-400)+line(w,-90,w,-400)+dim(0,-345,w,-345,w,font);
  s+=line(-90,0,-400,0)+line(-90,h,-400,h)+dim(-345,0,-345,h,h,font);
  const f=room.furnitureItems.find(f=>f.code===selected&&f.placed);
  if(f){const x=mm(f.x),y=mm(f.z),fw=mm(f.w),fh=mm(f.d);s+=dim(x,y+fh+100,x+fw,y+fh+100,fw,60);if(x>200)s+=line(0,y,x,y,'#3c87a0',8,'stroke-dasharray="24 20"')+text(x/2,y-24,`${x} offset`,56,'text-anchor="middle" fill="#176880"');}
 }
 [['A',w/2,-140],['B',w+135,h/2],['C',w/2,h+145],['D',-135,h/2]].forEach(([v,x,y])=>s+=`<circle cx="${x}" cy="${y}" r="62" fill="white" stroke="#9ba9af" stroke-width="6"/>`+text(x,y+23,v,65,'text-anchor="middle" fill="#596b74"'));
 s+=text(0,h+360,'PDF wall faces · furniture proposed · mm · do not scale for site work',Math.max(52,w/67),'fill="#647781"');
 s+=text(0,h+480,'DESIGN DEVELOPMENT / NOT FOR CONSTRUCTION',Math.max(53,w/70),'fill="#967340"');
 return s+'</svg>';
}

export const elevationSets={
 kitchen:[{name:'Front counter · wall C',axis:'x',items:['KB-01','KB-02','SK-01','KU-02'],window:'KW / kitchen'},{name:'Cooking counter · wall B',axis:'z',items:['KB-02','GH-01','IH-01','EX-01']}],
 dressing:[{name:'Wardrobe · wall A',axis:'x',items:['WR-01']}],
 bath:[{name:'Vanity · wall B',axis:'z',items:['VA-01'],window:'Bathroom side window'}]
};
export function elevationSVG(room,plan,home,spec){
 const [a,b,c,d]=room.bounds,axis=spec.axis,w=mm(axis==='x'?c-a:d-b),h=mm(home.project.ceilingHeight),pad=490,font=Math.max(64,w/44);
 let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-${pad} -${pad} ${w+2*pad} ${h+2*pad+180}" class="drawing-svg" role="img" aria-label="${esc(room.name+' '+spec.name)}. Proposed envelope only, not fabrication dimensions." style="font-family:Arial,sans-serif"><rect x="-${pad}" y="-${pad}" width="${w+2*pad}" height="${h+2*pad+180}" fill="white"/>${line(0,h,w,h,'#3b4d58',12)}${line(0,0,w,0,'#a2adb2',7,'stroke-dasharray="24 24"')}${line(0,0,0,h,'#d1d8db',5)}${line(w,0,w,h,'#d1d8db',5)}`;
 const win=plan.windows.find(v=>v.name===spec.window);
 if(win){const start=mm(axis==='x'?win.bounds[0]-a:win.bounds[1]-b),span=mm(axis==='x'?win.bounds[2]-win.bounds[0]:win.bounds[3]-win.bounds[1]);s+=`<rect x="${start}" y="${h-mm(win.head)}" width="${span}" height="${mm(win.head-win.sill)}" fill="#eef5f8" stroke="#8bacbd" stroke-width="8" stroke-dasharray="20 16"/>`+text(start+span/2,h-mm(win.sill)-80,'Opening height TBD',54,'text-anchor="middle" fill="#5d7d8d"');}
 for(const code of spec.items){const f=room.furnitureItems.find(i=>i.code===code),x=mm(axis==='x'?f.x:f.z),fw=mm(axis==='x'?f.w:f.d),height=mm(f.h),base=mm(f.base||0),y=h-base-height;
  s+=`<rect x="${x}" y="${y}" width="${fw}" height="${height}" fill="${f.kind==='extractor'?'#e8edf0':'#e9dfce'}" fill-opacity=".8" stroke="#9b8a71" stroke-width="8" ${['gas-hob','induction-hob','extractor'].includes(f.kind)?'stroke-dasharray="22 14"':''}/>`;
  if(height>180)s+=text(x+fw/2,y+height/2+25,code,68,'text-anchor="middle" fill="#4d5558"');
  else s+=text(x+fw/2,y-45,code,58,'text-anchor="middle" fill="#4d5558"');
  if(['counter','wardrobe','vanity','wall-cabinet'].includes(f.kind))s+=dim(x,y-110,x+fw,y-110,fw,60);
 }
 s+=dim(0,h+240,w,h+240,w,font)+dim(-230,0,-230,h,`${h} proposed`,font);
 s+=text(0,-230,spec.name,font+15,'fill="#344c5b"')+text(0,h+390,`Horizontal: plan ${axis==='x'?'X':'Y'} axis · vertical: proposed heights above finished floor`,Math.max(52,w/69),'fill="#647781"')+text(0,h+520,'ENVELOPE ONLY / NO CUT-OUTS, HARDWARE OR FABRICATION RELEASE',Math.max(45,w/77),'fill="#967340"');
 return s+'</svg>';
}

export function sourceMini(home){
 return `<svg viewBox="55 140 490 490" xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Select an interior room on the original PDF"><image href="assets/source-plan.svg" x="0" y="0" width="595" height="842"/>${home.rooms.map(r=>{const [x,y,xx,yy]=r.pdfBounds;return `<rect x="${x}" y="${y}" width="${xx-x}" height="${yy-y}" tabindex="0" role="button" aria-label="Open ${esc(r.name)} drawings" data-room="${r.id}" fill="#2985a3" fill-opacity=".02" stroke="#2985a3" stroke-opacity="0" stroke-width="2"/>`;}).join('')}</svg>`;
}
