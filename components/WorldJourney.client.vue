<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let frame=0
let renderer:THREE.WebGLRenderer|null=null
let composer:EffectComposer|null=null
let onResize:(()=>void)|null=null
let onScroll:(()=>void)|null=null
let onPointer:((e:PointerEvent)=>void)|null=null
const disposables:Array<THREE.BufferGeometry|THREE.Material|THREE.Texture>=[]
const clamp=(v:number,a=0,b=1)=>Math.max(a,Math.min(b,v))
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)}

onMounted(async()=>{
  await nextTick()
  const canvas=document.getElementById('world-journey-canvas') as HTMLCanvasElement|null
  if(!canvas)return
  const mobile=window.innerWidth<800
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene=new THREE.Scene()
  scene.background=new THREE.Color(0x02040a)
  scene.fog=new THREE.FogExp2(0x02040a,.018)
  const camera=new THREE.PerspectiveCamera(mobile?58:48,1,.1,220)
  camera.position.set(0,0,12)
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1:1.35))
  renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.05
  composer=new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene,camera))
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),mobile?.28:.48,.72,.09)
  bloom.threshold=.08;bloom.radius=.7;bloom.strength=mobile?.28:.48
  composer.addPass(bloom)

  const world=new THREE.Group();scene.add(world)
  scene.add(new THREE.HemisphereLight(0xbfd4ff,0x132018,1.2))
  const sunLight=new THREE.DirectionalLight(0xfff1d6,3.2);sunLight.position.set(-8,8,10);scene.add(sunLight)
  let seed=240913
  const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646}
  const mat=(color:number,rough=.7,metal=.02)=>{const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});disposables.push(m);return m}
  const glow=(color:number,opacity=.7)=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});disposables.push(m);return m}
  const add=(g:THREE.Group,obj:THREE.Object3D)=>{g.add(obj);return obj}
  const zStep=20
  const groups=Array.from({length:8},(_,i)=>{const g=new THREE.Group();g.position.z=-i*zStep;world.add(g);return g})
  const [space,sky,mountain,forest,desert,swamp,beach,ocean]=groups

  // SPACE — layered solar system, star field, rings, satellite and UFO.
  const starCount=mobile?1600:4300
  const starPos=new Float32Array(starCount*3)
  for(let i=0;i<starCount;i++)starPos.set([(random()-.5)*34,(random()-.5)*20,-15+random()*34],i*3)
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3))
  const starMat=new THREE.PointsMaterial({color:0xd7e2ff,size:mobile?.022:.032,transparent:true,opacity:.88,sizeAttenuation:true});disposables.push(starGeo,starMat);space.add(new THREE.Points(starGeo,starMat))
  const sunGeo=new THREE.SphereGeometry(1.25,48,48),sunMat=new THREE.MeshBasicMaterial({color:0xffc66c});disposables.push(sunGeo,sunMat)
  const sun=new THREE.Mesh(sunGeo,sunMat);sun.position.set(-6,2.5,-4);space.add(sun)
  const sunHaloGeo=new THREE.SphereGeometry(1.5,32,32),sunHaloMat=glow(0xffa44b,.18);disposables.push(sunHaloGeo);const sunHalo=new THREE.Mesh(sunHaloGeo,sunHaloMat);sunHalo.position.copy(sun.position);space.add(sunHalo)
  const planetData=[[2.6,.42,0x7b8da8,0],[4,.68,0xd6a36d,.25],[5.7,.78,0x3f75bd,.7],[7.6,.5,0xbc5d3f,1.4]] as const
  const orbiters:THREE.Mesh[]=[]
  planetData.forEach(([r,s,c,phase],i)=>{const geo=new THREE.SphereGeometry(s,36,36),m=mat(c,.78);disposables.push(geo);const p=new THREE.Mesh(geo,m);p.userData={r,phase,speed:.08-i*.011};space.add(p);orbiters.push(p);const og=new THREE.RingGeometry(r-.006,r+.006,160),om=glow(0x91a7d4,.1);disposables.push(og);const o=new THREE.Mesh(og,om);o.rotation.x=Math.PI/2;o.position.copy(sun.position);space.add(o)})
  const sat=new THREE.Group();const satBody=new THREE.Mesh(new THREE.BoxGeometry(.5,.32,.5),mat(0xbac2cf,.28,.9));const panelM=mat(0x173b75,.25,.3);const pg=new THREE.BoxGeometry(1.1,.04,.4);const p1=new THREE.Mesh(pg,panelM),p2=p1.clone();p1.position.x=-.95;p2.position.x=.95;sat.add(satBody,p1,p2);sat.position.set(6,1,1);space.add(sat);disposables.push(satBody.geometry,pg)
  const ufo=new THREE.Group();const ug=new THREE.CylinderGeometry(.36,.68,.14,32),um=mat(0x8a96a7,.22,.82),ud=new THREE.SphereGeometry(.24,24,12,0,Math.PI*2,0,Math.PI/2),udm=glow(0x84e9e8,.66);const ub=new THREE.Mesh(ug,um),dome=new THREE.Mesh(ud,udm);ub.rotation.x=Math.PI/2;dome.rotation.x=Math.PI;dome.position.y=.08;ufo.add(ub,dome);space.add(ufo);disposables.push(ug,ud)
  const cometGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(-4,.8,-.4)]),cometMat=glow(0xe9f5ff,.68);disposables.push(cometGeo);const comet=new THREE.Line(cometGeo,cometMat);space.add(comet)

  // SKY — layered clouds, jet, helicopter, birds.
  const cloudMat=mat(0xf1f5f8,1)
  const cloudPuffs:THREE.Mesh[]=[]
  for(let i=0;i<(mobile?16:34);i++){const geo=new THREE.SphereGeometry(.65+random()*1.2,20,16);disposables.push(geo);const puff=new THREE.Mesh(geo,cloudMat);puff.scale.set(1.7,.55,.85);puff.position.set((random()-.5)*24,-1+random()*8,-7-random()*11);sky.add(puff);cloudPuffs.push(puff)}
  const plane=new THREE.Group();const fus=new THREE.Mesh(new THREE.CylinderGeometry(.12,.24,1.8,16),mat(0xcbd4df,.25,.65));fus.rotation.z=Math.PI/2;const wing=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,.5),mat(0x8fa6c2,.35,.5));plane.add(fus,wing);plane.position.set(-7,2,-2);sky.add(plane);disposables.push(fus.geometry,wing.geometry)
  const heli=new THREE.Group();const hg=new THREE.SphereGeometry(.34,20,14),hm=mat(0x252f3b,.36,.5);const hb=new THREE.Mesh(hg,hm);hb.scale.set(1.4,.8,.8);const rotor=new THREE.Mesh(new THREE.BoxGeometry(2,.025,.08),mat(0x97a6b6,.3,.8));rotor.position.y=.42;heli.add(hb,rotor);heli.position.set(5,-.2,-1);sky.add(heli);disposables.push(hg,rotor.geometry)
  const birds:THREE.Line[]=[]
  for(let i=0;i<12;i++){const bg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.18,0,0),new THREE.Vector3(0,.08,0),new THREE.Vector3(.18,0,0)]),bm=new THREE.LineBasicMaterial({color:0x26313a,transparent:true,opacity:.8});disposables.push(bg,bm);const b=new THREE.Line(bg,bm);b.position.set((random()-.5)*12,1+random()*5,-3-random()*5);sky.add(b);birds.push(b)}

  // MOUNTAINS — snow peaks, skier, yeti easter egg, drifting snow.
  const snowM=mat(0xe8edf2,.92),rockM=mat(0x5d6874,.94)
  for(let i=0;i<8;i++){const geo=new THREE.ConeGeometry(2.7+random()*2.3,5+random()*4,7);disposables.push(geo);const peak=new THREE.Mesh(geo,i%3?snowM:rockM);peak.position.set(-12+i*3.4,-2,-5-random()*5);peak.rotation.y=random();mountain.add(peak)}
  const skier=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.35,4,8),mat(0xd8363d,.55));const ski1=new THREE.Mesh(new THREE.BoxGeometry(.75,.025,.06),mat(0x111820,.35,.6)),ski2=ski1.clone();ski1.position.set(0,-.32,.1);ski2.position.set(0,-.32,-.1);skier.add(body,ski1,ski2);mountain.add(skier);disposables.push(body.geometry,ski1.geometry)
  const yeti=new THREE.Group();const ybody=new THREE.Mesh(new THREE.SphereGeometry(.4,16,14),mat(0xd5d9db,1));ybody.scale.set(.8,1.4,.6);const yhead=new THREE.Mesh(new THREE.SphereGeometry(.22,14,12),mat(0xc8cccf,1));yhead.position.y=.56;yeti.add(ybody,yhead);yeti.position.set(5.2,-1.25,-4);mountain.add(yeti);disposables.push(ybody.geometry,yhead.geometry)
  const snowCount=mobile?420:1000,snowPos=new Float32Array(snowCount*3);for(let i=0;i<snowCount;i++)snowPos.set([(random()-.5)*20,(random()-.5)*12,-1-random()*12],i*3);const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));const snowPtsMat=new THREE.PointsMaterial({color:0xffffff,size:.04,transparent:true,opacity:.6});disposables.push(snowGeo,snowPtsMat);const snowPts=new THREE.Points(snowGeo,snowPtsMat);mountain.add(snowPts)

  // FOREST — dense pines, ground fog, fireflies.
  const trunkM=mat(0x35251d,1),pineM=mat(0x15352a,.96)
  for(let i=0;i<(mobile?30:70);i++){const tree=new THREE.Group();const tg=new THREE.CylinderGeometry(.08,.13,1.5,8),cg=new THREE.ConeGeometry(.65+random()*.25,2.1+random(),10);disposables.push(tg,cg);const t=new THREE.Mesh(tg,trunkM),c=new THREE.Mesh(cg,pineM);c.position.y=1.2;t.position.y=.1;tree.add(t,c);tree.position.set((random()-.5)*22,-3.1,-2-random()*12);tree.scale.setScalar(.8+random()*1.4);forest.add(tree)}
  const fireCount=mobile?70:180,firePos=new Float32Array(fireCount*3);for(let i=0;i<fireCount;i++)firePos.set([(random()-.5)*18,-2+random()*6,-2-random()*9],i*3);const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(firePos,3));const fm=new THREE.PointsMaterial({color:0xc9ff86,size:.06,transparent:true,opacity:.7,blending:THREE.AdditiveBlending});disposables.push(fg,fm);const fireflies=new THREE.Points(fg,fm);forest.add(fireflies)

  // DESERT — dunes, mesas, heat-haze look via warm palette, tumbleweed.
  const duneM=mat(0xc58b4b,1),mesaM=mat(0x9a4e2e,1)
  for(let i=0;i<10;i++){const geo=new THREE.SphereGeometry(2.5+random()*2.6,20,12);disposables.push(geo);const dune=new THREE.Mesh(geo,duneM);dune.scale.set(1.8,.22,1);dune.position.set(-11+i*2.5,-3.4,-3-random()*7);desert.add(dune)}
  for(let i=0;i<4;i++){const geo=new THREE.CylinderGeometry(.8+random()*.5,1.5+random()*.8,3+random()*2,8);disposables.push(geo);const mesa=new THREE.Mesh(geo,mesaM);mesa.position.set(-7+i*4.8,-1.7,-6-random()*4);desert.add(mesa)}
  const tumble=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,1),new THREE.MeshBasicMaterial({color:0x8f6c43,wireframe:true}));disposables.push(tumble.geometry,tumble.material);desert.add(tumble)

  // SWAMP — dark water, cypress trunks, knees, reeds, fireflies.
  const waterGeo=new THREE.PlaneGeometry(28,18,30,20),waterMat=new THREE.MeshStandardMaterial({color:0x112e2d,roughness:.25,metalness:.05,transparent:true,opacity:.82});disposables.push(waterGeo,waterMat);const swampWater=new THREE.Mesh(waterGeo,waterMat);swampWater.rotation.x=-Math.PI/2;swampWater.position.y=-2.9;swamp.add(swampWater)
  const swampWood=mat(0x433529,1)
  for(let i=0;i<(mobile?18:42);i++){const geo=new THREE.CylinderGeometry(.12+random()*.18,.22+random()*.24,3+random()*4,8);disposables.push(geo);const tr=new THREE.Mesh(geo,swampWood);tr.position.set((random()-.5)*20,-1.3,-2-random()*10);tr.rotation.z=(random()-.5)*.08;swamp.add(tr)}
  for(let i=0;i<50;i++){const geo=new THREE.CylinderGeometry(.018,.025,.7+random()*1.2,5);disposables.push(geo);const reed=new THREE.Mesh(geo,mat(0x49633e,1));reed.position.set((random()-.5)*20,-2.2,-2-random()*9);swamp.add(reed)}

  // BEACH — ocean plane, palms, gulls, shoreline.
  const beachSand=new THREE.Mesh(new THREE.PlaneGeometry(30,12),mat(0xd6b276,1));beachSand.rotation.x=-Math.PI/2;beachSand.position.set(0,-3.2,-4);beach.add(beachSand);disposables.push(beachSand.geometry)
  const seaMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uColorA:{value:new THREE.Color(0x0b5571)},uColorB:{value:new THREE.Color(0x35a0ad)}},vertexShader:`uniform float uTime;varying vec2 vUv;void main(){vUv=uv;vec3 p=position;p.z+=sin(p.x*.8+uTime)*.08+sin(p.y*1.3+uTime*.8)*.06;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uColorA;uniform vec3 uColorB;varying vec2 vUv;void main(){vec3 c=mix(uColorA,uColorB,vUv.y);gl_FragColor=vec4(c,.9);}`,transparent:true,side:THREE.DoubleSide});disposables.push(seaMat)
  const seaGeo=new THREE.PlaneGeometry(34,22,50,40),sea=new THREE.Mesh(seaGeo,seaMat);sea.rotation.x=-Math.PI/2;sea.position.set(0,-2.8,-10);beach.add(sea);disposables.push(seaGeo)
  const palmM=mat(0x4c3727,1),leafM=mat(0x356b46,.95)
  for(const x of [-6.5,6.2]){const palm=new THREE.Group();const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.2,4,9),palmM);trunk.rotation.z=x<0?-.14:.1;for(let i=0;i<7;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.18,2,7),leafM);leaf.position.y=2;leaf.rotation.z=Math.PI/2;leaf.rotation.y=i/7*Math.PI*2;palm.add(leaf)}palm.add(trunk);palm.position.set(x,-1.1,-4);beach.add(palm);disposables.push(trunk.geometry)}

  // UNDERWATER — marine snow, fish, jellyfish, rays of light, seabed.
  const marineCount=mobile?700:1800,mp=new Float32Array(marineCount*3);for(let i=0;i<marineCount;i++)mp.set([(random()-.5)*22,(random()-.5)*13,-1-random()*15],i*3);const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(mp,3));const mm=new THREE.PointsMaterial({color:0xa6e8f0,size:.025,transparent:true,opacity:.55,blending:THREE.AdditiveBlending});disposables.push(mg,mm);const marine=new THREE.Points(mg,mm);ocean.add(marine)
  const fish:THREE.Group[]=[]
  for(let i=0;i<(mobile?8:18);i++){const f=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(.22,12,8),mat(0x0a2028,.7));body.scale.set(1.6,.7,.45);const tail=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,3),body.material);tail.rotation.z=Math.PI/2;tail.position.x=-.42;f.add(body,tail);f.userData={phase:random()*14,speed:.18+random()*.25,y:-3+random()*6,z:-2-random()*9,dir:i%2?1:-1};ocean.add(f);fish.push(f);disposables.push(body.geometry,tail.geometry)}
  const jelly:THREE.Group[]=[]
  for(let i=0;i<4;i++){const j=new THREE.Group();const bell=new THREE.Mesh(new THREE.SphereGeometry(.36,24,12,0,Math.PI*2,0,Math.PI/2),glow(i%2?0x72e6dc:0x7aa6ff,.34));bell.rotation.x=Math.PI;j.add(bell);for(let k=0;k<5;k++){const lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3((k-2)*.08,-.05,0),new THREE.Vector3((k-2)*.06,-1.3,0)]),lm=new THREE.LineBasicMaterial({color:i%2?0x72e6dc:0x7aa6ff,transparent:true,opacity:.18});disposables.push(lg,lm);j.add(new THREE.Line(lg,lm))}j.position.set(i%2?4.5:-4.5,-1+i*1.5,-3-i);ocean.add(j);jelly.push(j);disposables.push(bell.geometry)}
  for(let i=0;i<16;i++){const geo=new THREE.IcosahedronGeometry(.4+random()*.9,1);disposables.push(geo);const rock=new THREE.Mesh(geo,mat(0x092128,1));rock.scale.set(1.2,.5,.8);rock.position.set((random()-.5)*20,-4.3,-2-random()*10);ocean.add(rock)}

  const palette=[0x02040a,0x5d86a6,0xb7c8d8,0x17342b,0xd39a57,0x182e2b,0x3b8192,0x051825].map(c=>new THREE.Color(c))
  let target=0,progress=0,px=0,py=0
  onScroll=()=>{const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);target=window.scrollY/max}
  onPointer=e=>{px=e.clientX/window.innerWidth*2-1;py=-(e.clientY/window.innerHeight)*2+1}
  onResize=()=>{if(!renderer||!composer)return;const w=window.innerWidth,h=window.innerHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h)}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('resize',onResize);onScroll();onResize()

  const clock=new THREE.Clock()
  const render=()=>{const t=clock.getElapsedTime();progress+=(target-progress)*(reduced?1:.035);const travel=progress*(groups.length-1)*zStep;world.position.z=travel
    const fi=progress*(palette.length-1),idx=Math.min(palette.length-2,Math.floor(fi)),mix=fi-idx,bg=palette[idx].clone().lerp(palette[idx+1],mix);scene.background=bg;(scene.fog as THREE.FogExp2).color.copy(bg);(scene.fog as THREE.FogExp2).density=.016+smooth(.82,1,progress)*.022
    camera.position.x+=(px*.28-camera.position.x)*.025;camera.position.y+=((py*.16-smooth(.84,1,progress)*.7)-camera.position.y)*.025;camera.rotation.z+=(px*.002-camera.rotation.z)*.02
    orbiters.forEach((p,i)=>{const a=t*p.userData.speed+p.userData.phase;p.position.set(sun.position.x+Math.cos(a)*p.userData.r,sun.position.y+Math.sin(a*.9)*p.userData.r*.28,sun.position.z+Math.sin(a)*p.userData.r*.62)});sunHalo.scale.setScalar(1+Math.sin(t*.8)*.035)
    sat.rotation.y=t*.12;sat.rotation.x=Math.sin(t*.2)*.2;ufo.position.set(-10+(t%8)*2.7,2.2+Math.sin(t*1.6)*.3,-1.8);ufo.rotation.z=Math.sin(t*.9)*.06;comet.position.set(8-((t*.75)%16),4-((t*.75)%16)*.3,-4)
    cloudPuffs.forEach((c,i)=>c.position.x+=Math.sin(t*.04+i)*.0015);plane.position.x=-8+((t*.38)%16);plane.position.y=2+Math.sin(t*.5)*.12;rotor.rotation.y=t*13;heli.position.x=6-((t*.27)%12);birds.forEach((b,i)=>{b.position.x=-7+((t*.18+i*.7)%14);b.position.y=1.4+(i%4)*.55+Math.sin(t*.8+i)*.08})
    snowPts.position.y=-((t*.12)%1.8);skier.position.set(-6+((t*.33)%12),-2.1+Math.sin(t*.45)*.08,-1.8);skier.rotation.z=-.18;yeti.visible=Math.sin(t*.22)>.1;yeti.rotation.y=Math.sin(t*.3)*.2
    fireflies.rotation.y=Math.sin(t*.08)*.03;tumble.position.set(-7+((t*.42)%14),-2.7+Math.abs(Math.sin(t*1.6))*.55,-2.5);tumble.rotation.z=t*1.7
    swampWater.material instanceof THREE.MeshStandardMaterial&&(swampWater.material.opacity=.78+Math.sin(t*.3)*.03);seaMat.uniforms.uTime.value=t
    marine.position.y=-((t*.08)%1.2);fish.forEach((f,i)=>{const loop=((t*f.userData.speed+f.userData.phase)%16)-8;f.position.set(f.userData.dir*loop,f.userData.y+Math.sin(t*.4+i)*.15,f.userData.z);f.rotation.y=f.userData.dir>0?0:Math.PI});jelly.forEach((j,i)=>{j.position.y+=Math.sin(t*.3+i)*.0015;j.rotation.z=Math.sin(t*.2+i)*.05})
    composer?.render();frame=requestAnimationFrame(render)}
  render()
})

onBeforeUnmount(()=>{cancelAnimationFrame(frame);if(onResize)window.removeEventListener('resize',onResize);if(onScroll)window.removeEventListener('scroll',onScroll);if(onPointer)window.removeEventListener('pointermove',onPointer);disposables.forEach(x=>x.dispose());composer?.dispose();renderer?.dispose()})
</script>

<template><canvas id="world-journey-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none" /></template>
