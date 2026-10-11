import * as THREE from '../vendor/three.module.js';

// A rendered viewpoint inside the same model. Drag changes where you look,
// never the architecture or viewpoint position.
export function createPanorama(container){
 const renderer=new THREE.WebGLRenderer({antialias:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
 container.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(74,1,.1,20);
 const geometry=new THREE.SphereGeometry(10,64,40);geometry.scale(-1,1,1);
 const material=new THREE.MeshBasicMaterial({color:0xffffff});const sphere=new THREE.Mesh(geometry,material);scene.add(sphere);
 let yaw=0,pitch=0,active=false,serial=0,drag=null,initialYaw=0,initialPitch=0;
 const touches=new Map();let pinch=null;
 function draw(){if(!active)return;camera.lookAt(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));renderer.render(scene,camera);}
 function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();draw();}
 const observer=new ResizeObserver(resize);observer.observe(container);
 function adjust(dYaw=0,dPitch=0,dZoom=0){yaw+=dYaw;pitch=THREE.MathUtils.clamp(pitch+dPitch,-1.2,1.2);camera.fov=THREE.MathUtils.clamp(camera.fov+dZoom,38,92);camera.updateProjectionMatrix();draw();}
 container.addEventListener('pointerdown',e=>{touches.set(e.pointerId,[e.clientX,e.clientY]);container.setPointerCapture(e.pointerId);drag=[e.clientX,e.clientY];if(touches.size===2){const p=[...touches.values()];pinch=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);}});
 container.addEventListener('pointermove',e=>{
  if(!touches.has(e.pointerId))return;touches.set(e.pointerId,[e.clientX,e.clientY]);
  if(touches.size===2){const p=[...touches.values()];const gap=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinch)adjust(0,0,(pinch-gap)*.10);pinch=gap;drag=null;return;}
  if(drag)adjust(-(e.clientX-drag[0])*.004,(e.clientY-drag[1])*.004);drag=[e.clientX,e.clientY];
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])container.addEventListener(event,e=>{touches.delete(e.pointerId);drag=null;pinch=null;});
 container.addEventListener('keydown',e=>{const keys={ArrowLeft:[-.14,0,0],ArrowRight:[.14,0,0],ArrowUp:[0,.10,0],ArrowDown:[0,-.10,0],'+':[0,0,-6],'=':[0,0,-6],'-':[0,0,6]};if(keys[e.key]){e.preventDefault();adjust(...keys[e.key]);}});
 return {
  async load(url,startYaw=0,startPitch=0){const id=++serial;const texture=await new THREE.TextureLoader().loadAsync(url);if(id!==serial){texture.dispose();return false;}texture.colorSpace=THREE.SRGBColorSpace;material.map?.dispose();material.map=texture;material.needsUpdate=true;initialYaw=startYaw;initialPitch=startPitch;yaw=startYaw;pitch=startPitch;camera.fov=74;camera.updateProjectionMatrix();active=true;resize();return true;},
  show(value){active=value;if(value)resize();},adjust,
  reset(){yaw=initialYaw;pitch=initialPitch;camera.fov=74;camera.updateProjectionMatrix();draw();},
  state(){return {yaw,pitch,fov:camera.fov,active};},
  dispose(){serial++;active=false;observer.disconnect();material.map?.dispose();material.dispose();geometry.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}
