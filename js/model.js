import * as THREE from '../vendor/three.module.js';
import { OrbitControls } from '../vendor/OrbitControls.js';

/** One PDF-derived shell, shared furniture data. No exterior or invented room geometry. */
export function createHouse(container, data, plan, onSelect) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eae8df');
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 120);
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  container.append(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.4;
  controls.maxDistance = 38;
  controls.maxPolarAngle = Math.PI / 2 - .025;
  const model = new THREE.Group();
  model.name = 'Jammu House — PDF-derived interior review';
  model.userData = { source: plan.source, issues: plan.issues, scope: 'Interiors only; proposed furnishings and heights' };
  scene.add(model);
  const roomScene = new THREE.Group();
  scene.add(roomScene);
  roomScene.visible = false;
  const mat = (color, roughness = .8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  const finishes = Object.fromEntries(data.materials.map(m => [m.code, mat(m.hex)]));
  const ivory = finishes.P01, white = finishes.P02, wood = finishes.J01;
  const dark = mat('#4e534b'), metal = mat('#999e96', .35, { metalness: .55 });
  const glass = mat('#c3d4cf', .12, { transparent: true, opacity: .22, depthWrite: false });
  const lightMat = mat('#fff7de', .45, { emissive: '#ffdcaa', emissiveIntensity: .5 });
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = tileCanvas.height = 256;
  const tc = tileCanvas.getContext('2d');
  tc.fillStyle = '#d9d5cb'; tc.fillRect(0, 0, 256, 256);
  tc.strokeStyle = '#c8c5ba'; tc.lineWidth = 1.4; tc.strokeRect(1, 1, 254, 254);
  const tile = new THREE.CanvasTexture(tileCanvas);
  tile.wrapS = tile.wrapT = THREE.RepeatWrapping; tile.colorSpace = THREE.SRGBColorSpace;
  const floorMat = mat('#ffffff', .92, { map: tile });
  let full = false, night = false, selected = null, isolated = false, dirty = true, stopped = false;
  const wallMeshes = [], roomGroups = new Map(), floorMeshes = [], roomLabels = [];
  function box(parent, x, y, z, w, h, d, material, name = '') {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.name = name; if(parent===roomScene)mesh.userData.temporary=true; parent.add(mesh); return mesh;
  }
  function cyl(parent, x, y, z, radius, height, material) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 24), material);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; if(parent===roomScene)m.userData.temporary=true; parent.add(m); return m;
  }
  function sphere(parent, x, y, z, r, material, scale = [1, 1, 1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), material);
    m.position.set(x, y, z); m.scale.set(...scale); m.castShadow = true; parent.add(m); return m;
  }
  function footprint(parent, points, material) {
    const shape = new THREE.Shape();
    points.forEach(([x,z],i) => i ? shape.lineTo(x,-z) : shape.moveTo(x,-z)); shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const uv = geo.attributes.uv;
    for (let i=0; i<uv.count; i++) uv.setXY(i, uv.getX(i)/.60, uv.getY(i)/.60);
    const mesh = new THREE.Mesh(geo, material); mesh.rotation.x=-Math.PI/2; mesh.receiveShadow=true;
    parent.add(mesh); return mesh;
  }
  const slab = footprint(model, plan.slab, floorMat); slab.name='Interior slab traced from PDF';
  for (const r of data.rooms) {
    const [a,b,c,d] = r.bounds;
    const f = box(model,(a+c)/2,-.055,(b+d)/2,c-a,.10,d-b,finishes.F01.clone(), r.name+' floor');
    f.userData.room=r.id; floorMeshes.push(f);
    const group = new THREE.Group(); group.name=r.name; group.userData.room=r.id;
    model.add(group); roomGroups.set(r.id, group);
  }
  function shellWall(parent, bounds, height) {
    const [a,b,c,d]=bounds;
    const m=box(parent,(a+c)/2,height/2,(b+d)/2,c-a,height,d-b,ivory,'PDF wall');
    m.userData.pdfWall=true; m.userData.bounds=bounds;
    return m;
  }
  plan.walls.forEach(w=>wallMeshes.push(shellWall(model,w.bounds,.65)));
  function windowParts(parent, w, clippedBounds) {
    const [a,b,c,d]=clippedBounds||w.bounds;
    const horizontal=c-a>d-b, width=horizontal?c-a:d-b;
    const cx=(a+c)/2, cz=(b+d)/2, h=w.head-w.sill;
    // Sill panels and frames retain the PDF opening span; all vertical values are assumptions.
    box(parent,cx,w.sill/2,cz,c-a,w.sill,d-b,ivory,'Assumed window sill');
    box(parent,cx,(w.sill+w.head)/2,cz,horizontal?width:.026,h,horizontal?.026:width,glass,w.name);
    for (const y of [w.sill,w.head]) box(parent,cx,y,cz,horizontal?width:.055,.045,horizontal?.055:width,wood);
    for (const t of [0,.5,1]) box(parent,horizontal?a+(c-a)*t:cx,(w.sill+w.head)/2,horizontal?cz:b+(d-b)*t,.034,h,.034,wood);
  }
  plan.windows.forEach(w=>windowParts(model,w));
  function itemMesh(r, f, group) {
    const [rx,rz]=r.bounds, x=rx+f.x+f.w/2, z=rz+f.z+f.d/2, w=f.w, d=f.d, h=f.h;
    const m=finishes[f.finish]||wood;
    const g=new THREE.Group();g.name=f.code+' '+f.label;g.userData={room:r.id,code:f.code,dimensionsMetres:[w,d,h],status:f.note};group.add(g);g.position.y=f.base||0;
    const B=(dx,y,dz,ww,hh,dd,mm=m)=>box(g,x+dx,y,z+dz,ww,hh,dd,mm);
    const legs=(hh,ww=w,dd=d)=>{for(const dx of [-ww/2+.065,ww/2-.065])for(const dz of [-dd/2+.065,dd/2-.065])B(dx,hh/2,dz,.04,hh,.04,wood);};
    if(f.kind==='bed-west') {
      B(0,.20,0,w,.30,d,wood); B(0,.41,0,w-.035,.18,d-.035,white);
      B(w*.19,.515,0,w*.58,.045,d-.04,m);
      B(-w/2+.05,.59,0,.10,1.08,d+.03,wood);
      for(const dz of [-d*.245,d*.245]) B(-w/2+.35,.535,dz,.48,.105,d*.42,finishes.T01);
      for(const dz of [-d/2+.04,d/2-.04]) B(w*.05,.24,dz,w*.90,.04,.02,dark);
    } else if(f.kind==='sofa-west') {
      legs(.18); B(0,.33,0,w,.32,d,m); B(-w/2+.09,.56,0,.18,.48,d,m);
      for(const dz of [-d/2+.07,d/2-.07])B(0,.50,dz,w,.30,.14,m);
      for(let i=0;i<3;i++)B(.035,.54,-d/2+.15+(i+.5)*(d-.30)/3,w-.22,.12,(d-.34)/3,m);
      B(-w*.16,.64,-d*.28,.12,.32,.35,finishes.T02);
      B(-w*.16,.64,d*.26,.12,.32,.35,finishes.T01);
    } else if(['table','desk'].includes(f.kind)) {
      legs(h-.07); B(0,h-.035,0,w,.07,d,wood);
      if(f.kind==='desk') { B(0,h+.14,-d*.18,.38,.25,.025,dark); B(0,h+.015,.09,.34,.015,.12,dark); }
      else if(h<.5) { B(-.10,h+.015,0,.18,.025,.24,white);cyl(g,x+.11,h+.10,z-.08,.065,.17,finishes.T02); }
    } else if(['chair','armchair'].includes(f.kind)) {
      legs(.40);B(0,.44,0,w,.10,d,finishes.T01);B(0,h-.20,-d/2+.05,w,.40,.10,m);
      if(f.kind==='armchair')for(const dx of [-w/2+.045,w/2-.045])B(dx,.57,0,.09,.28,d,m);
    } else if(['cabinet','wall-cabinet','media','wardrobe','counter','counter-hob','altar'].includes(f.kind)) {
      B(0,(h-.06)/2,0,w,h-.06,d,m);
      B(0,h-.025,0,w+.015,.05,d+.015, f.kind.startsWith('counter')||f.kind==='altar'?finishes.S01:m);
      const frontAlongX=w>=d, frontZ=(f.kind==='wardrobe'||(f.kind==='wall-cabinet'&&f.z<1.5))?d/2+.004:-d/2-.004, span=frontAlongX?w:d, n=Math.max(1,Math.round(span/.5));
      for(let i=1;i<n;i++) {
        const off=-span/2+i*span/n;
        B(frontAlongX?off:-w/2-.004,h/2,frontAlongX?frontZ:off,frontAlongX?.008:.006,h-.16,frontAlongX?.006:.008,finishes.F02);
      }
      if(f.kind==='wardrobe') {B(0,.09,d/2+.006,w-.06,.025,.014,dark);B(0,h-.05,d/2+.006,w-.06,.025,.014,dark);}
      if(f.kind==='media') {B(w/2-.03,1.15,0,.035,.68,d*.85,dark);B(w/2-.01,1.15,0,.008,.62,d*.79,mat('#24322e'));}
      if(f.kind==='altar') {B(0,1.10,d/2-.02,w*.90,.70,.025,ivory);cyl(g,x, h+.07,z,.10,.12,finishes.S01);}
    } else if(f.kind==='gas-hob') {
      B(0,.012,0,w,.024,d,dark);
      for(const [dx,dz,r] of [[w*.12,-d*.27,.065],[w*.12,d*.27,.055],[-w*.18,0,.047]]) {
        cyl(g,x+dx,.038,z+dz,r+.009,.020,metal);cyl(g,x+dx,.05,z+dz,r,.012,dark);
        for(const off of [-.09,.09]) {B(dx+off,.07,dz,.024,.024,.20,dark);B(dx,.07,dz+off,.20,.024,.024,dark);}
      }
      for(const dz of [-d*.23,0,d*.23])cyl(g,x-w/2+.042,.043,z+dz,.019,.032,metal);
    } else if(f.kind==='induction-hob') {
      B(0,h/2,0,w,h,d,dark);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.10,.0012,6,48),metal);ring.rotation.x=-Math.PI/2;ring.position.set(x,h+.002,z);g.add(ring);
    } else if(f.kind==='extractor') {
      B(0,.05,0,w,.10,d,metal);B(w/2-.11,(h+.1)/2,-d*.14,.22,h-.1,.28,metal);
    } else if(f.kind==='shelf'||f.kind==='shelving') {
      const ys=f.kind==='shelf'?[h/2]:[.16,.61,1.06,1.51,1.96];
      for(const y of ys)B(0,y,0,w,.035,d,wood);
      if(f.kind==='shelving')for(const dx of [-w/2+.02,w/2-.02])B(dx,h/2,0,.035,h,d,wood);
    } else if(f.kind==='fridge') {
      B(0,h/2,0,w,h,d,white);B(0,h*.30,d/2+.01,w-.05,.008,.018,dark);B(w*.37,h*.69,d/2+.028,.025,.30,.035,metal);
    } else if(f.kind==='sink') {
      B(0,h,0,w,.025,d,metal);B(0,h+.018,0,w-.07,.01,d-.07,dark);cyl(g,x,h+.12,z+d/2-.06,.018,.25,metal);B(0,h+.24,d/2-.13,.035,.032,.18,metal);
    } else if(f.kind==='vanity') {
      B(0,.56,0,w,.47,d,wood);B(0,.82,0,w+.02,.045,d,white);sphere(g,x,.88,z,.23,white,[.80,.30,1.10]);
      B(w/2+.006,1.47,0,.022,.80,d*.86,glass);
    } else if(f.kind==='wc') {
      sphere(g,x+.10,.38,z,.28,white,[1.0,.38,.65]);B(-w/2+.07,.48,0,.14,.58,d,white);B(0,.20,0,w*.54,.36,d*.65,white);
    } else if(f.kind==='shower') {
      B(0,.015,0,w,.03,d,finishes.F02);B(w*.25,1.02,-d/2,w*.50,2.02,.022,glass);
      B(w/2-.035,1.4,0,.018,.92,.025,metal);B(w/2-.12,1.90,0,.20,.025,.16,metal);
      B(0,.04,d/2-.07,w*.55,.008,.035,dark);
    } else if(f.kind==='mirror') B(0,h/2,0,w,h,d,glass);
    g.traverse(m=>{if(m.isMesh)m.userData.room=r.id;});
  }
  for(const r of data.rooms) for(const f of r.furnitureItems.filter(f=>f.placed))itemMesh(r,f,roomGroups.get(r.id));
  // Stair position only: retain drawing tread lines without inventing a rise or floor height.
  const stairs=data.rooms.find(r=>r.id==='stairs'), [sx,sz,ex,ez]=stairs.bounds, sg=roomGroups.get('stairs');
  for(let i=0;i<14;i++) box(sg,sx+(ex-sx)*i/14,.012,sz+.48,.015,.012,.95,dark,'Stair plan line — rise unknown');
  for(let i=0;i<5;i++)box(sg,sx+.8,.012,sz+1.25+i*.21,.92,.012,.015,dark,'Stair return plan line');
  function label(r) {
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
    const c=canvas.getContext('2d');c.font='500 27px Arial';c.textAlign='center';c.fillStyle='#475246';c.fillText(r.name.toUpperCase(),256,45);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2.50,.39),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
    const [a,b,cc,d]=r.bounds;mesh.rotation.x=-Math.PI/2;mesh.position.set((a+cc)/2,.027,d-.16);mesh.userData.room=r.id;
    model.add(mesh);roomLabels.push(mesh);
  }
  data.rooms.forEach(label);
  const ambient=new THREE.HemisphereLight('#fffaf0','#a1a18c',1.5);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff1d7',2.1);sun.position.set(1,15,10);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:15,bottom:-15,near:.1,far:50});sun.shadow.bias=-.00025;sun.shadow.normalBias=.018;scene.add(sun);
  const fill=new THREE.DirectionalLight('#f1f5ff',1.0);fill.position.set(14,8,-5);scene.add(fill);
  const evening=new THREE.PointLight('#ffce87',0,25,1.4);evening.position.set(6,4,6);scene.add(evening);
  function disposeRoom(){
    // Cloned furniture shares geometries/materials; only generated shell geometries are released here.
    for(const child of [...roomScene.children]) {if(child.userData.temporary)child.geometry?.dispose();roomScene.remove(child);}
  }
  function isolatedRoom(id) {
    disposeRoom();const r=data.rooms.find(r=>r.id===id);if(!r)return;
    const [a,b,c,d]=r.bounds, pad=.24;
    const f=footprint(roomScene,[[a,b],[c,b],[c,d],[a,d]],floorMat);f.userData.temporary=true;
    roomScene.add(roomGroups.get(id).clone(true));
    for(const w of plan.walls) {
      const [x,z,xx,zz]=w.bounds, clip=[Math.max(x,a-pad),Math.max(z,b-pad),Math.min(xx,c+pad),Math.min(zz,d+pad)];
      if(clip[2]<=clip[0]||clip[3]<=clip[1])continue;
      const near=(z>=d-.1||x>=c-.1);const m=shellWall(roomScene,clip,full?3:(near?.65:3));m.userData.temporary=true;
    }
    for(const w of plan.windows) {
      const [x,z,xx,zz]=w.bounds;
      if(xx>a-pad&&x<c+pad&&zz>b-pad&&z<d+pad)windowParts(roomScene,w);
    }
    for(const p of r.lightingPlan){cyl(roomScene,a+p.x,2.85,b+p.z,.075,.035,lightMat);}
  }
  function frame(bounds, overhead=false) {
    const [a,b,c,d]=bounds, cx=(a+c)/2,cz=(b+d)/2;
    controls.target.set(cx,isolated?1.35:.15,cz);
    const span=Math.max(c-a,(d-b)*.9), aspect=container.clientWidth/container.clientHeight;
    const viewAngle=Math.min(camera.fov*Math.PI/180,2*Math.atan(Math.tan(camera.fov*Math.PI/360)*aspect));
    const distance=isolated ? Math.hypot(c-a+.5,d-b+.5,3)/2/Math.sin(viewAngle/2)*1.1 : span*1.75/Math.min(1,Math.max(.5,aspect));
    if(overhead)camera.position.set(cx,distance+4,cz+.001);
    else camera.position.set(cx+distance*.44,(isolated?1.35:0)+distance*.74,cz+distance*.61);
    camera.zoom=1;camera.updateProjectionMatrix();controls.update();dirty=true;
  }
  const whole=[0,0,12.2,12.2];
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);dirty=true;}
  const observer=new ResizeObserver(resize);observer.observe(container);resize();frame(whole);
  controls.addEventListener('change',()=>dirty=true);
  function animate(){if(stopped)return;requestAnimationFrame(animate);controls.update();if(dirty){renderer.render(scene,camera);dirty=false;}}animate();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  renderer.domElement.addEventListener('pointerdown',e=>down=[e.clientX,e.clientY]);
  renderer.domElement.addEventListener('pointerup',e=>{
    if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>7)return;
    const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);
    const hit=ray.intersectObject(isolated?roomScene:model,true).find(h=>h.object.userData.room);if(hit)onSelect(hit.object.userData.room);
  });
  const api={
    reset(){selected=null;isolated=false;model.visible=true;roomScene.visible=false;roomLabels.forEach(l=>l.visible=true);frame(whole);},
    top(){frame(isolated&&selected?data.rooms.find(r=>r.id===selected).bounds:whole,true);},
    select(id){selected=id||null;for(const f of floorMeshes)f.material.color.set(f.userData.room===id?'#c4ccb8':'#c6c1b7');if(isolated&&id){isolatedRoom(id);frame(data.rooms.find(r=>r.id===id).bounds);}else if(id)frame(data.rooms.find(r=>r.id===id).bounds);else api.reset();dirty=true;},
    roomView(value){isolated=Boolean(value&&selected);model.visible=!isolated;roomScene.visible=isolated;if(isolated){isolatedRoom(selected);frame(data.rooms.find(r=>r.id===selected).bounds);}else frame(whole);dirty=true;},
    walls(value){full=value;for(const w of wallMeshes){const h=full?3:.65;w.scale.y=h/.65;w.position.y=h/2;}if(isolated)isolatedRoom(selected);dirty=true;},
    night(value){night=value;scene.background.set(night?'#323b34':'#eae8df');ambient.intensity=night?.9:1.5;sun.intensity=night?.15:2.1;fill.intensity=night?.30:1;evening.intensity=night?35:0;lightMat.emissiveIntensity=night?2:.5;dirty=true;},
    snapshot(){renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
    download(){const blob=new Blob([JSON.stringify(model.toJSON())],{type:'application/json'});const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download='jammu-pdf-interior-review.three.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);},
    dispose(){stopped=true;observer.disconnect();controls.dispose();renderer.dispose();disposeRoom();}
  };
  return api;
}
