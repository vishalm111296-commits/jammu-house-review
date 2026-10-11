import { createHouse } from './model.js?v=interiors-03';
const roomFinishCodes=r=>[...new Set([...r.finishCodes,...r.furnitureItems.map(f=>f.finish)])];
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
const money = n => '₹'+(n/100000).toFixed(2)+' lakh';
const mm = n => Math.round(n*1000);
let data, research, plan, model, current=-1, studioId='lobby', layer='furniture', playing=false, timer, fullWalls=false, isNight=false, isolated=false, svgId=0;
let notes=[];
const storageKey='jammu-interior-review-v2';
const joineryKinds=new Set(['cabinet','wall-cabinet','media','wardrobe','counter','counter-hob','altar','shelf','shelving','vanity']);
const roomById = id => data.rooms.find(r=>r.id===id);
const dimensions = f => `${mm(f.w)} × ${mm(f.d)} × ${mm(f.h)}`;
function saveFile(name,contents,type='application/json'){
  const u=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
function roomDetails(room){
  if(!room){$('room-detail').innerHTML='<p class="eyebrow">YOUR UPLOADED PDF</p><h3>Inside your home.</h3><p>Eleven indoor spaces, connected as drawn. Kitchen and puja positions stay fixed; the bathroom remains accessed through the family bedroom and dressing.</p><h4>THE FAMILY</h4><p>Parents and two babies in the family bedroom. Grandparents in the other bedroom.</p><h4>THE DESIGN</h4><p>Warm ivory, pale oak and soft stone. All purchases are new. AC is requested in the two bedrooms.</p><span class="status-pill">INTERIOR DESIGN REVIEW</span><p>Choose a room, then use “Room cutaway” to see its furniture more closely.</p>';return;}
  const issue=plan.issues.find(x=>x.room===room.id);
  $('room-detail').innerHTML=`<p class="eyebrow">${esc(room.title)}</p><h3>${esc(room.name)}</h3><p class="dimension">${esc(room.dimensions)} · PDF label</p><h4>MATERIAL DIRECTION</h4><p>${esc(room.finishes)}</p><h4>LAYOUT INTENT</h4><p>${esc(room.furniture[0])}</p><h4>LIGHT & COMFORT</h4><p>${esc(room.lighting)}</p>${issue?`<span class="status-pill review">${esc(issue.id)} · CHECK REQUIRED</span><p>${esc(issue.title)}. See this room’s detailed sheet below.</p>`:'<span class="status-pill">PROPOSED FURNITURE & FINISHES</span>'}`;
}
function choose(id,focus=true){
  current=id==='all'?-1:data.rooms.findIndex(r=>r.id===id);const room=data.rooms[current];
  $('room-select').value=room?.id||'all';$('tour-label').textContent=room?.name||'Whole interior';roomDetails(room);
  if(room){studioId=room.id;renderStudio();}
  if(focus&&model){model.select(room?.id);if(room){isolated=true;model.roomView(true);$('room-view').setAttribute('aria-pressed','true');}if(!room){isolated=false;$('room-view').setAttribute('aria-pressed','false');}if($('top').classList.contains('active')){$('top').classList.remove('active');$('iso').classList.add('active');}}
  document.querySelectorAll('#plan-view [data-room]').forEach(el=>{el.setAttribute('fill-opacity',el.dataset.room===id?'.22':'0');el.setAttribute('stroke-opacity',el.dataset.room===id?'1':'0');});
}
function move(delta){const i=(current+1+delta+data.rooms.length+1)%(data.rooms.length+1)-1;choose(i<0?'all':data.rooms[i].id);}
function stopTour(){playing=false;clearInterval(timer);$('play-tour').textContent='Start room tour';$('play-tour').setAttribute('aria-pressed','false');}
function showPlan(value){
  $('plan-view').hidden=!value;const canvas=$('viewport').querySelector('canvas');if(canvas)canvas.hidden=value;
  document.querySelectorAll('.model-panel .segmented button').forEach(b=>b.classList.remove('active'));$(value?'plan':'iso').classList.add('active');
  $('view-help').textContent=value?'Original PDF · tap a room for its design sheet':'Drag to rotate · pinch or scroll to zoom';
}
function renderPlan(){
  $('plan-view').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="55 135 485 515" role="img" aria-label="Unaltered original PDF with selectable interior room overlays"><image href="assets/source-plan.svg" x="0" y="0" width="595" height="842"/>${data.rooms.map(r=>{const [a,b,c,d]=r.pdfBounds;return `<rect tabindex="0" role="button" aria-label="Select ${esc(r.name)}" data-room="${r.id}" x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="#6d8660" fill-opacity="0" stroke="#698058" stroke-opacity="0" stroke-width="1.6"/>`;}).join('')}</svg>`;
  $('plan-view').addEventListener('click',e=>{if(e.target.dataset.room){stopTour();choose(e.target.dataset.room);}});
  $('plan-view').addEventListener('keydown',e=>{if(e.target.dataset.room&&['Enter',' '].includes(e.key)){e.preventDefault();stopTour();choose(e.target.dataset.room);}});
}
function roomSVG(r,activeLayer='furniture'){
  const [a,b,c,d]=r.bounds, w=mm(c-a), dep=mm(d-b), pad=330, font=Math.max(76,w/40), clip='room-clip-'+(++svgId);
  const xy=([x,z,xx,zz])=>[mm(x-a),mm(z-b),mm(xx-x),mm(zz-z)];
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${w+pad*2} ${dep+pad*2}" role="img" aria-label="${esc(r.name)} ${activeLayer} proposal on the PDF room footprint, dimensions in millimetres" style="font-family:Arial,sans-serif"><defs><clipPath id="${clip}"><rect x="-245" y="-245" width="${w+490}" height="${dep+490}"/></clipPath></defs><rect x="0" y="0" width="${w}" height="${dep}" fill="#f0ede3" stroke="#b8c1ad" stroke-width="9" stroke-dasharray="30 25"/><g clip-path="url(#${clip})">`;
  for(const wall of plan.walls){const [x,y,ww,hh]=xy(wall.bounds);if(x+ww< -245||x>w+245||y+hh< -245||y>dep+245)continue;s+=`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#626b5e"/>`;}
  for(const win of plan.windows){const [x,y,ww,hh]=xy(win.bounds);if(x+ww< -245||x>w+245||y+hh< -245||y>dep+245)continue;s+=`<rect x="${x}" y="${y}" width="${ww}" height="${hh}" fill="#d8e2da" stroke="#6d928d" stroke-width="12"><title>${esc(win.name)} — PDF opening span</title></rect>`;}
  s+='</g>';
  const materials=Object.fromEntries(data.materials.map(m=>[m.code,m.hex]));
  for(const f of r.furnitureItems.filter(x=>x.placed)){
    const storage=joineryKinds.has(f.kind), mounted=Boolean(f.base)&&f.kind!=='sink', muted=activeLayer==='lighting'||(activeLayer==='storage'&&!storage);
    const x=mm(f.x),y=mm(f.z),fw=mm(f.w),fd=mm(f.d), stroke=muted?'#c4c9bb':'#8c7a60', fill=muted?'#e2e4d9':(materials[f.finish]||'#d7c3a0');
    s+=`<g opacity="${muted?'.42':'1'}"><rect x="${x}" y="${y}" width="${fw}" height="${fd}" rx="${['table','chair','armchair'].includes(f.kind)?65:15}" fill="${mounted?'none':fill}" stroke="${stroke}" stroke-width="11" ${mounted?'stroke-dasharray="35 25"':''}><title>${esc(f.code+' '+f.label)} · ${dimensions(f)} mm · proposal</title></rect>`;
    if(f.kind==='bed-west'){
      s+=`<rect x="${x+20}" y="${y+25}" width="85" height="${fd-50}" fill="#a68b65"/><line x1="${x+fw*.40}" y1="${y+20}" x2="${x+fw*.40}" y2="${y+fd-20}" stroke="#f8f5ed" stroke-width="28"/>`;
      for(const off of [.12,.56])s+=`<rect x="${x+145}" y="${y+fd*off}" width="410" height="${fd*.32}" rx="45" fill="#faf7ee"/>`;
    }
    if(!muted&&!mounted&&f.kind!=='sink'&&f.kind!=='mirror'){
      const vertical=fw<fd*.55, small=fw<500&&fd<600;
      s+=`<text x="${x+fw/2}" y="${y+fd/2+font*.30}" text-anchor="middle" font-size="${small?font*.8:font}" fill="#394735"${vertical?` transform="rotate(-90 ${x+fw/2} ${y+fd/2})"`:''}>${small?'•':esc(f.code)}</text>`;
    }
    s+='</g>';
  }
  if(r.id==='stairs'){
    for(let i=0;i<14;i++)s+=`<line x1="${w*i/14}" y1="0" x2="${w*i/14}" y2="950" stroke="#919b88" stroke-width="12"/>`;
    s+=`<text x="${w/2}" y="${dep*.70}" text-anchor="middle" font-size="${font}" fill="#54634b">STAIR FOOTPRINT · SECTION PENDING</text>`;
  }
  if(activeLayer==='lighting')for(const l of r.lightingPlan){const x=mm(l.x),y=mm(l.z);s+=`<circle cx="${x}" cy="${y}" r="105" fill="#fbf0c9" stroke="#ac8140" stroke-width="12"/><path d="M ${x-65} ${y} h 130 M ${x} ${y-65} v 130" stroke="#ac8140" stroke-width="10"/><text x="${x+150}" y="${y+font*.3}" font-size="${font}" fill="#765825">${l.code}</text>`;}
  s+=`<g stroke="#89987d" stroke-width="7"><path d="M 0 -270 V -160 M ${w} -270 V -160 M 0 -225 H ${w}"/><path d="M -270 0 H -160 M -270 ${dep} H -160 M -225 0 V ${dep}"/></g><rect x="${w/2-255}" y="-310" width="510" height="165" fill="#fcfbf6"/><text x="${w/2}" y="-195" text-anchor="middle" font-size="${font}" fill="#4c6042">${w}</text><text x="-185" y="${dep/2}" text-anchor="middle" transform="rotate(-90 -185 ${dep/2})" font-size="${font}" fill="#4c6042">${dep}</text><text x="${w/2}" y="${dep+290}" text-anchor="middle" font-size="${font*.78}" fill="#7f8877">DRAWN PDF FOOTPRINT · FURNITURE PROPOSED</text></svg>`;
  return s;
}
function itemRows(r){return r.furnitureItems.map(f=>`<tr><td><strong>${esc(f.code)} · ${esc(f.label)}</strong><small>${esc(f.finish)} · ${f.placed?'Proposed footprint':'PLACEMENT ON HOLD'}</small></td><td>${f.quantity}</td><td>${dimensions(f)} mm</td><td>${esc(f.note)}</td></tr>`).join('');}
function issuesHtml(issues){return issues.map(i=>`<article class="issue-card"><h4>${esc(i.id)} / ${esc(i.title)}</h4><p>${esc(i.detail)}</p></article>`).join('');}
function renderStudio(){
  const r=roomById(studioId);if(!r)return;
  document.querySelectorAll('#room-tabs button').forEach(b=>{b.classList.toggle('active',b.dataset.room===r.id);b.setAttribute('aria-pressed',String(b.dataset.room===r.id));});
  $('sheet-number').textContent=`ROOM ${String(data.rooms.indexOf(r)+1).padStart(2,'0')} / INTERIOR DESIGN SHEET`;
  $('sheet-title').textContent=r.name;$('sheet-dimension').textContent=`${r.dimensions} · PDF label · ${r.issues.length?'dimension / layout review required':'furniture and heights proposed'}`;
  $('room-drawing').innerHTML=roomSVG(r,layer);
  $('drawing-key').innerHTML=`<span>${layer==='lighting'?'Faint furniture footprint':'Proposed furniture'}</span><span>PDF opening span</span><span>${layer==='lighting'?'Proposed light point':'Final products pending'}</span>`;
  const finishChips='<div class="finish-chips">'+roomFinishCodes(r).map(code=>{const m=data.materials.find(m=>m.code===code);return `<span class="finish-chip"><i style="background:${m.hex}"></i>${code} ${esc(m.name)}</span>`;}).join('')+'</div>';
  const held=r.furnitureItems.filter(f=>!f.placed);
  const layouts={
    furniture:`<p class="eyebrow">THE FURNITURE STORY</p><h4>${esc(r.title)}</h4><ul>${r.furniture.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${held.map(f=>`<p class="hold-note"><b>${esc(f.code)} / ${f.quantity} items held for fit check.</b> ${esc(f.note)}</p>`).join('')}<div class="sheet-divider"><h4>Finish direction</h4><p>${esc(r.finishes)}</p>${finishChips}</div>`,
    lighting:`<p class="eyebrow">LIGHT IN LAYERS</p><h4>Atmosphere and useful light.</h4><p>${esc(r.lighting)}</p><ul>${r.lightingPlan.map(l=>`<li><b>${l.code}</b> / ${esc(l.label)}</li>`).join('')}</ul><div class="sheet-divider"><h4>Service coordination</h4><p>${esc(r.services)}</p><p>${esc(r.serviceNote)}</p></div>`,
    storage:`<p class="eyebrow">STORAGE & JOINERY</p><h4>Keep everyday life in order.</h4><p>${esc(r.joineryNote)}</p><ul>${r.furnitureItems.filter(f=>joineryKinds.has(f.kind)).map(f=>`<li><b>${esc(f.code)}</b> ${esc(f.label)}<br>${dimensions(f)} mm · ${esc(f.finish)}</li>`).join('')||'<li>No additional joinery assigned to this room until storage needs and circulation are checked.</li>'}</ul><div class="sheet-divider"><h4>Material care</h4><p>${esc(r.climate)}</p>${finishChips}</div>`
  };
  $('room-sheet').innerHTML=layouts[layer];$('room-items').innerHTML=itemRows(r);
  $('room-issues').innerHTML=issuesHtml(plan.issues.filter(i=>i.room===r.id));
}
function renderSpecifications(){
  $('material-library').innerHTML=data.materials.map(m=>`<article class="material-card"><div class="material-swatch" style="background-color:${m.hex}"><span>${m.code}</span><small>${m.hex}</small></div><h3>${esc(m.name)}</h3><p><b>${esc(m.application)}</b></p><p>${esc(m.spec)}</p><details><summary>Care & maintenance</summary><p>${esc(m.care)}</p></details></article>`).join('');
  $('light-schedule').innerHTML=data.lightingSchedule.map(l=>`<tr><td>${l.code} · ${esc(l.name)}</td><td>${esc(l.temperature)}</td><td>${esc(l.control)}</td><td>${esc(l.status)}</td></tr>`).join('');
  function list(){const rid=$('schedule-room').value;$('all-items').innerHTML=data.rooms.filter(r=>rid==='all'||r.id===rid).flatMap(r=>r.furnitureItems.map(f=>`<tr><td><strong>${esc(f.code)} · ${esc(f.label)}</strong><small>${esc(r.name)}</small></td><td>${f.quantity}</td><td>${dimensions(f)}</td><td>${f.finish}</td><td>${f.placed?'Size proposal; product pending':'Cot placement held for review'}</td></tr>`)).join('');}
  list();$('schedule-room').addEventListener('change',list);
  $('download-items').addEventListener('click',()=>{
    const csv=[['Room','Code','Item','Quantity','Width mm','Depth mm','Height mm','Finish code','Status','Before ordering'],...data.rooms.flatMap(r=>r.furnitureItems.map(f=>[r.name,f.code,f.label,f.quantity,mm(f.w),mm(f.d),mm(f.h),f.finish,f.placed?'Proposal':'Placement on hold',f.note]))].map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');
    saveFile('jammu-interior-item-schedule.csv','\uFEFF'+csv,'text/csv;charset=utf-8');
  });
}
function renderSource(){
  $('source-issues').innerHTML=issuesHtml(plan.issues.filter(i=>['D01','D02','D03'].includes(i.id)));
  $('dimension-audit').innerHTML=plan.audit.map(a=>`<tr><td>${esc(roomById(a.room).name)}</td><td>${a.labelMm?a.labelMm.map(Math.round).join(' × '):'No room W × D label'}</td><td>${a.drawnMm.join(' × ')}</td><td>${a.status==='review'?'Reconcile with architect':a.status==='no-room-size'?'Stair section required':'Within drawing-scale rounding'}</td></tr>`).join('');
  $('source-fingerprint').textContent=`Source identity (SHA-256): ${plan.source.sha256}. Scale reference: 40 ft = 12.192 m; original PDF points y 156.26–613.31. No other revision supplies geometry.`;
}
function renderReview(){
  try{const stored=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(stored))notes=stored.filter(n=>n&&typeof n.text==='string'&&typeof n.room==='string').slice(0,100);}catch{notes=[];$('review-status').textContent='Saved notes could not be read; you can still download new notes.';}
  const paint=()=>{$('saved-notes').innerHTML=notes.map((n,i)=>`<article class="saved-note"><h4>${esc(roomById(n.room)?.name||'Whole interior')}</h4><p>${esc(n.text)}</p><button type="button" data-remove="${i}" aria-label="Remove note ${i+1}">Remove this note</button></article>`).join('');};
  function persist(){try{localStorage.setItem(storageKey,JSON.stringify(notes));return true;}catch{return false;}}
  $('review-form').addEventListener('submit',e=>{e.preventDefault();const text=$('review-note').value.trim();if(!text){$('review-status').textContent='Write a short note before saving.';return;}if(notes.length>=100){$('review-status').textContent='Download your notes, then remove older ones to make room.';return;}notes.push({room:$('review-room').value,text,created:new Date().toISOString()});const saved=persist();$('review-note').value='';paint();$('review-status').textContent=saved?'Saved on this device. Download your notes to share them in our chat.':'Browser storage is unavailable. Download your notes before closing this page.';});
  $('saved-notes').addEventListener('click',e=>{if(e.target.dataset.remove===undefined)return;notes.splice(Number(e.target.dataset.remove),1);const saved=persist();paint();$('review-status').textContent=saved?'Note removed from this device.':'Removed for this session; browser storage is unavailable.';});
  $('export-review').addEventListener('click',()=>saveFile('jammu-interior-review-notes.json',JSON.stringify({project:'Jammu House',sourcePdfSha256:plan.source.sha256,edition:3,notes},null,2)));
  paint();
}
function renderPrintBook(){
  const head='<div class="book-head"><b>JH / JAMMU HOUSE</b><span>INTERIOR DESIGN REVIEW 03 · 11 OCT 2026</span></div>';
  const foot='<p class="book-foot">PDF-derived horizontal footprint · proposed furniture, finishes and heights · not for construction or fabrication. Confirm dimensions at the shell and obtain coordinated technical drawings.</p>';
  const cover=`<article class="book-page">${head}<p class="eyebrow" style="margin-top:38px">YOUR FAMILY / YOUR PLAN / YOUR HOME</p><h1>The interior<br>of your everyday.</h1><p class="book-title-note">Eleven indoor spaces. A warm ivory, pale oak and soft stone palette. Room plans, furniture reservations, material and lighting intent, and the decisions still to settle.</p><img class="book-cover-plan" src="assets/source-plan.png" alt="Uploaded architectural plan"><p><b>Source:</b> BANSI VERMA_010920.pdf · page 1. Parents and two babies in the family bedroom; grandparents in the other bedroom. Kitchen, puja and bathroom access retained.</p>${foot}</article>`;
  const pages=data.rooms.map((r,i)=>`<article class="book-page">${head}<h2>${String(i+1).padStart(2,'0')} / ${esc(r.name)}</h2><p>${esc(r.dimensions)} · printed PDF label · diagram dimensions are the scaled PDF footprint</p><div class="book-plan">${roomSVG(r)}</div><div class="book-columns"><div><h3>Layout & finishes</h3><p>${esc(r.finishes)}</p><ul>${r.furniture.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div><h3>Light & services</h3><p>${esc(r.lighting)}</p><p>${esc(r.services)}</p><p><b>Finish codes:</b> ${roomFinishCodes(r).join(' · ')}</p></div></div>${issuesHtml(plan.issues.filter(x=>x.room===r.id))}${foot}</article>`).join('');
  const materialPage=`<article class="book-page">${head}<h2>The material schedule</h2><table class="schedule-table"><thead><tr><th>Code / material</th><th>Application</th><th>Specification to approve</th></tr></thead><tbody>${data.materials.map(m=>`<tr><td>${m.code} / ${esc(m.name)}</td><td>${esc(m.application)}</td><td>${esc(m.spec)}</td></tr>`).join('')}</tbody></table><h2>Lighting intent</h2><table class="schedule-table"><thead><tr><th>Code / purpose</th><th>Temperature</th><th>Before sign-off</th></tr></thead><tbody>${data.lightingSchedule.map(l=>`<tr><td>${l.code} / ${esc(l.name)}</td><td>${esc(l.temperature)}</td><td>${esc(l.status)}</td></tr>`).join('')}</tbody></table>${foot}</article>`;
  const costPage=`<article class="book-page">${head}<h2>The cost & decision plan</h2><p>Indicative interior allowance: ${$('budget-total').textContent}, including 15% contingency. All purchases are new. These are unquoted planning allowances, not a supplier offer.</p><table class="schedule-table"><thead><tr><th>Category</th><th>Planning range</th><th>Basis</th></tr></thead><tbody>${data.budget.map(b=>`<tr><td>${esc(b.category)}</td><td>${money(b.low)}–${money(b.high)}</td><td>${esc(b.basis)}</td></tr>`).join('')}</tbody></table><p>Shell construction, roof, structural work, exterior openings, design fees and statutory approvals are excluded. Obtain a separate civil BOQ; only the plinth exists.</p><h3>Before design sign-off</h3><ul>${data.pending.map(p=>`<li>${esc(p)}</li>`).join('')}</ul><p>Original source SHA-256:<br><small>${plan.source.sha256}</small></p><p>Furniture CSV, full room sheets and research sources: <a href="https://vishalm111296-commits.github.io/jammu-house-review/">Open the review website</a>.</p>${foot}</article>`;
  $('print-book').innerHTML=cover+pages+materialPage+costPage;
}

function chart(){const c=research.climate;if(!c?.months){$('climate-chart').innerHTML='<p>Official monthly climate normals are still being verified. Numeric temperatures and rainfall are intentionally not filled in.</p>';$('climate-source').textContent='No made-up monthly values. See the research status below.';return;}
 const months=c.months;const maxT=Math.ceil(Math.max(...months.map(m=>m.high))/5)*5;const maxRain=Math.ceil(Math.max(...months.map(m=>m.rain))/50)*50;
 let svg='<svg viewBox="0 0 920 320" role="img" aria-label="Jammu monthly mean daily maximum and minimum temperature, and monthly rainfall"><text x="65" y="20" font-size="12" fill="#405e4b">Temperature °C</text><text x="755" y="20" font-size="12" fill="#788672">Rainfall mm</text>';
 for(let v=0;v<=maxT;v+=10){const y=260-v/maxT*215;svg+=`<line x1="65" x2="865" y1="${y}" y2="${y}" stroke="#dcded3"/><text x="47" y="${y+4}" font-size="10" fill="#788672">${v}</text>`;}
 for(let v=0;v<=maxRain;v+=100){const y=260-v/maxRain*215;svg+=`<text x="875" y="${y+4}" font-size="10" fill="#788672">${v}</text>`;}
 for(let i=0;i<12;i++){const m=months[i],x=95+i*67.5,y=260-m.rain/maxRain*215;svg+=`<rect x="${x-12}" y="${y}" width="24" height="${260-y}" fill="#d0d9c0"><title>${esc(m.name)} rain ${m.rain} mm</title></rect><text x="${x}" y="283" text-anchor="middle" font-size="11" fill="#65745e">${esc(m.name)}</text>`;}
 for(const [key,colour] of [['high','#bf8251'],['low','#577865']]){const points=months.map((m,i)=>`${95+i*67.5},${260-m[key]/maxT*215}`).join(' ');svg+=`<polyline points="${points}" fill="none" stroke="${colour}" stroke-width="2.5"/>`;months.forEach((m,i)=>{const x=95+i*67.5,y=260-m[key]/maxT*215;svg+=`<circle cx="${x}" cy="${y}" r="4" fill="${colour}"><title>${esc(m.name)} ${key==='high'?'mean daily maximum':'mean daily minimum'} ${m[key]} °C</title></circle>`;});}
 svg+='<text x="160" y="313" font-size="10" fill="#bf8251">● Mean daily maximum</text><text x="385" y="313" font-size="10" fill="#577865">● Mean daily minimum</text><text x="620" y="313" font-size="10" fill="#788672">■ Monthly rainfall</text></svg>';$('climate-chart').innerHTML=svg;
 const wettest=months.reduce((a,b)=>a.rain>b.rain?a:b),hottest=months.reduce((a,b)=>a.high>b.high?a:b),coldest=months.reduce((a,b)=>a.low<b.low?a:b);
 $('climate-summary').innerHTML=`<div class="climate-metrics"><div><strong>${hottest.high}°C</strong><small>${hottest.name} mean daily high</small></div><div><strong>${coldest.low}°C</strong><small>${coldest.name} mean daily low</small></div><div><strong>${wettest.rain} mm</strong><small>${wettest.name} monthly rain</small></div></div>`;
 $('climate-source').innerHTML=`Source: <a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.source)}</a> · ${esc(c.period)} · station ${esc(c.station)}. Climate averages, not a forecast or design extremes. Checked ${esc(research.checked)}.`;
 const table=document.createElement('details');table.innerHTML='<summary>See all 12 months: temperature, rain and humidity</summary><div style="overflow-x:auto"><table class="budget-table"><thead><tr><th>Month</th><th>Mean high / low °C</th><th>Rain mm</th><th>17:30 IST humidity %</th></tr></thead><tbody>'+months.map(m=>`<tr><td>${esc(m.name)}</td><td>${m.high} / ${m.low}</td><td>${m.rain}</td><td>${m.humidity}</td></tr>`).join('')+'</tbody></table></div><p>Humidity is the late-afternoon observation, not the daily average. Monthly rainfall values total 1402.0 mm; the source separately rounds its annual total to 1401.9 mm.</p>';$('climate-source').after(table);

}
const seasons={winter:{title:'Winter / Dec–Feb',text:'Keep the light interior comfortable in colder weather.',items:['Allow controllable southeast daylight; use lined curtains after sunset.','Prioritise roof insulation, draught control and a planned safe heating strategy.','Warm 3000 K evening lighting and removable rugs add comfort without darkening every wall.']},spring:{title:'Spring / Mar–Apr',text:'Use pleasant periods for natural ventilation.',items:['Open screened windows when outdoor air is cooler and air quality allows.','Use light, adjustable curtains; keep ventilation paths clear.','Clean fans and filters before the hotter period.']},summer:{title:'Summer / May–Jun',text:'Reduce heat gains before adding cooling equipment.',items:['Shade exposed SW walls and NW rear glazing; size overhangs from actual window geometry.','Use insulated roof construction and an exterior reflective finish chosen with the architect.','Use fans and efficient cooling, with capacities based on room heat-load calculations.']},monsoon:{title:'Monsoon / Jul–Sep',text:'Plan for rain and indoor humidity.',items:['Coordinate the building waterproofing with the architect; keep moisture out before installing interior finishes.','Use extraction in kitchen and bathroom; provide cupboard ventilation and sealed joinery edges.','Choose slip-resistant wet-area floors and quick-drying curtains; never paint over dampness.']},autumn:{title:'Autumn / Oct–Nov',text:'Reset the house after the rains.',items:['Inspect waterproofing, window seals and concealed dampness.','Use comfortable-day ventilation and adjustable shading.','Prepare safe heating and check filters before winter.']}};
function season(name){const s=seasons[name];$('season-detail').innerHTML=`<div><h3>${s.title}</h3><p>${s.text}</p></div><ul>${s.items.map(x=>`<li>${x}</li>`).join('')}</ul>`;document.querySelectorAll('[data-season]').forEach(b=>b.classList.toggle('active',b.dataset.season===name));}
function budget(){const lo=data.budget.reduce((s,x)=>s+x.low,0),hi=data.budget.reduce((s,x)=>s+x.high,0);$('budget-total').textContent=money(lo*1.15)+' – '+money(hi*1.15);$('budget-rows').innerHTML=data.budget.map(x=>`<tr><td>${esc(x.category)}</td><td>${money(x.low)} – ${money(x.high)}</td><td>${esc(x.basis)}</td></tr>`).join('');$('contingency').textContent=money(lo*.15)+' – '+money(hi*.15);function update(){const f=Number($('budget-level').value)/100;$('budget-selected').textContent=money((lo+(hi-lo)*f)*1.15)+' incl. contingency';}update();$('budget-level').addEventListener('input',update);}
async function init(){
  renderPlan();
  for(const r of data.rooms)for(const id of ['room-select','schedule-room','review-room']){const option=document.createElement('option');option.value=r.id;option.textContent=r.name;$(id).append(option);}
  $('room-tabs').innerHTML=data.rooms.map(r=>`<button data-room="${r.id}" aria-pressed="${r.id===studioId}">${esc(r.name)}</button>`).join('');
  $('room-tabs').addEventListener('click',e=>{if(e.target.dataset.room){studioId=e.target.dataset.room;renderStudio();}});
  document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>{layer=b.dataset.layer;document.querySelectorAll('[data-layer]').forEach(x=>x.classList.toggle('active',x===b));renderStudio();}));
  $('sheet-3d').addEventListener('click',()=>{stopTour();choose(studioId);showPlan(!model);if(model){isolated=true;model.roomView(true);$('room-view').setAttribute('aria-pressed','true');}$('home-model').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
  $('room-select').addEventListener('change',e=>{stopTour();choose(e.target.value);});
  roomDetails();renderStudio();budget();chart();season('winter');renderSource();renderSpecifications();renderReview();
  document.querySelectorAll('[data-season]').forEach(b=>b.addEventListener('click',()=>season(b.dataset.season)));
  $('palette').innerHTML=data.palette.map(x=>`<article><div class="swatch" style="background:${esc(x.hex)}"></div><h4>${esc(x.name)}</h4><p>${esc(x.hex)}<br>${esc(x.use)}</p></article>`).join('');
  $('references').innerHTML=research.references.map(x=>`<article class="reference-card"><span class="reference-status">${esc(x.status)}</span><h3>${esc(x.title)}</h3><p>${esc(x.finding)}</p><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open source →</a></article>`).join('');
  $('assumptions').textContent=plan.source.basis+' '+plan.source.verticalAssumptions+' '+data.project.bearingStatus+'. Two cot placements are held for a safe fit check; no cot product or position is approved.';
  $('pending').innerHTML=data.pending.map(p=>`<li>${esc(p)}</li>`).join('');$('sleeping-note').textContent=data.sleepingNote;
  renderPrintBook();$('print').addEventListener('click',()=>window.print());
  $('previous').addEventListener('click',()=>{stopTour();move(-1);});$('next-room').addEventListener('click',()=>{stopTour();move(1);});
  $('play-tour').addEventListener('click',()=>{if(playing){stopTour();return;}playing=true;$('play-tour').textContent='Pause tour';$('play-tour').setAttribute('aria-pressed','true');move(1);timer=setInterval(()=>move(1),6500);});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopTour();});
  $('plan').addEventListener('click',()=>{stopTour();showPlan(true);});$('iso').addEventListener('click',()=>{stopTour();showPlan(false);choose('all');});
  $('top').addEventListener('click',()=>{stopTour();showPlan(false);model?.top();$('iso').classList.remove('active');$('top').classList.add('active');});
  $('reset').addEventListener('click',()=>{stopTour();choose('all');showPlan(!model);model?.reset();});
  $('room-view').addEventListener('click',()=>{stopTour();if(!model)return;if(current<0){choose(studioId);isolated=true;}else{isolated=!isolated;}model.roomView(isolated);$('room-view').setAttribute('aria-pressed',String(isolated));showPlan(false);});
  $('walls').addEventListener('click',()=>{fullWalls=!fullWalls;model?.walls(fullWalls);$('walls').textContent=fullWalls?'Cutaway walls':'Full walls';$('walls').setAttribute('aria-pressed',String(fullWalls));});
  $('night').addEventListener('click',()=>{isNight=!isNight;model?.night(isNight);$('night').textContent=isNight?'Daylight mood':'Evening mood';$('night').setAttribute('aria-pressed',String(isNight));});
  $('download').addEventListener('click',()=>model?.download());
  try{
    model=createHouse($('viewport'),data,plan,id=>{stopTour();choose(id);});$('loading').remove();
    // Reproducible screenshots from this model; no generated room imagery or external assets.
    window.interiorStudio={snapshot:()=>model.snapshot(),choose:id=>choose(id),roomView:value=>{isolated=value;model.roomView(value);},reset:()=>{choose('all');model.reset();}};
  }catch(error){
    console.warn('3D unavailable:',error.message);$('loading').remove();showPlan(true);
    const note=document.createElement('p');note.className='fallback';note.textContent='3D is unavailable on this device. The original PDF and all room design sheets are ready to explore.';$('viewport').append(note);
    for(const id of ['iso','top','room-view','walls','night','download'])$(id).disabled=true;
  }
  const requestedRoom=new URLSearchParams(location.search).get('room');
  if(data.rooms.some(r=>r.id===requestedRoom))choose(requestedRoom);
  window.homeReady=true;
}
try{
  const responses=await Promise.all(['home','research','plan'].map(n=>fetch(`data/${n}.json?v=interiors-03`)));
  if(responses.some(r=>!r.ok))throw new Error('Design data could not be loaded');
  [data,research,plan]=await Promise.all(responses.map(r=>r.json()));
  await init();
}catch(error){$('loading').textContent='The studio could not load. Reload the website, or open the source PDF below.';console.error(error);}
