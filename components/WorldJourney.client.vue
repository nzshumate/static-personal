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
const pulse=(v:number,a:number,b:number,c:number)=>v<a||v>c?0:v<b?smooth(a,b,v):1-smooth(b,c,v)

onMounted(async()=>{
  await nextTick()
  const canvas=document.getElementById('world-journey-canvas') as HTMLCanvasElement|null
  if(!canvas)return
  const mobile=window.innerWidth<800
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const scene=new THREE.Scene()
  scene.background=new THREE.Color(0x010309)
  scene.fog=new THREE.FogExp2(0x010309,.012)
  const camera=new THREE.PerspectiveCamera(mobile?60:46,1,.1,260)
  camera.position.set(0,.3,12)

  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1:1.45))
  renderer.outputColorSpace=THREE.SRGBColorSpace
  renderer.toneMapping=THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure=1.05
  renderer.shadowMap.enabled=!mobile
  renderer.shadowMap.type=THREE.PCFSoftShadowMap

  composer=new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene,camera))
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),mobile?.24:.42,.62,.12)
  bloom.threshold=.12;bloom.radius=.62;bloom.strength=mobile?.24:.42
  composer.addPass(bloom)

  const world=new THREE.Group();scene.add(world)
  const hemi=new THREE.HemisphereLight(0xbfd8ff,0x142018,1.05);scene.add(hemi)
  const key=new THREE.DirectionalLight(0xffefd1,3.8);key.position.set(-8,10,8);key.castShadow=!mobile;scene.add(key)
  if(key.shadow){key.shadow.mapSize.set(mobile?512:1024,mobile?512:1024);key.shadow.camera.near=.1;key.shadow.camera.far=80}

  let seed=240913
  const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646}
  const mat=(color:number,rough=.72,metal=.02)=>{const m=new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});disposables.push(m);return m}
  const glow=(color:number,opacity=.7)=>{const m=new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});disposables.push(m);return m}
  const zStep=22
  const groups=Array.from({length:8},(_,i)=>{const g=new THREE.Group();g.position.z=-i*zStep;world.add(g);return g})
  const [space,sky,mountain,forest,desert,swamp,beach,ocean]=groups

  // Shared soft sprite used for clouds, haze, mist and underwater light volumes.
  const softCanvas=document.createElement('canvas');softCanvas.width=256;softCanvas.height=256
  const sctx=softCanvas.getContext('2d')!,sg=sctx.createRadialGradient(128,128,0,128,128,128)
  sg.addColorStop(0,'rgba(255,255,255,.92)');sg.addColorStop(.2,'rgba(255,255,255,.52)');sg.addColorStop(.55,'rgba(255,255,255,.12)');sg.addColorStop(1,'rgba(255,255,255,0)');sctx.fillStyle=sg;sctx.fillRect(0,0,256,256)
  const softTex=new THREE.CanvasTexture(softCanvas);softTex.colorSpace=THREE.SRGBColorSpace;disposables.push(softTex)
  const addSprite=(g:THREE.Group,color:number,opacity:number,pos:THREE.Vector3,scale:THREE.Vector2)=>{const m=new THREE.SpriteMaterial({map:softTex,color,transparent:true,opacity,depthWrite:false,blending:THREE.NormalBlending});const s=new THREE.Sprite(m);s.position.copy(pos);s.scale.set(scale.x,scale.y,1);g.add(s);disposables.push(m);return s}

  // SPACE — richer solar system and atmospheric planets.
  const starCount=mobile?1800:5200,starPos=new Float32Array(starCount*3),starCol=new Float32Array(starCount*3)
  const starColors=[new THREE.Color(0xbfd3ff),new THREE.Color(0xfff0cf),new THREE.Color(0x8ca9ff)]
  for(let i=0;i<starCount;i++){const z=-18+random()*42;starPos.set([(random()-.5)*42,(random()-.5)*24,z],i*3);const c=starColors[Math.floor(random()*starColors.length)];starCol.set([c.r,c.g,c.b],i*3)}
  const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(starPos,3));starGeo.setAttribute('color',new THREE.BufferAttribute(starCol,3))
  const starMat=new THREE.PointsMaterial({size:mobile?.02:.03,vertexColors:true,transparent:true,opacity:.9,sizeAttenuation:true});space.add(new THREE.Points(starGeo,starMat));disposables.push(starGeo,starMat)

  const sunShader=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`varying vec3 vN;void main(){vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uTime;varying vec3 vN;float h(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}void main(){float n=h(floor(vN*28.+uTime*.2));vec3 c=mix(vec3(1.,.33,.05),vec3(1.,.92,.42),.45+n*.55);gl_FragColor=vec4(c,1.);}`})
  const sunGeo=new THREE.SphereGeometry(1.32,64,64),sun=new THREE.Mesh(sunGeo,sunShader);sun.position.set(-6.4,2.6,-4.5);space.add(sun);disposables.push(sunGeo,sunShader)
  const halo=addSprite(space,0xffa65d,.34,sun.position.clone(),new THREE.Vector2(4.4,4.4))

  const planetVert=`varying vec3 vN;varying vec3 vP;void main(){vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vP=mv.xyz;gl_Position=projectionMatrix*mv;}`
  const planetFrag=`uniform vec3 uA;uniform vec3 uB;uniform vec3 uLight;uniform float uSeed;uniform float uBands;varying vec3 vN;varying vec3 vP;float h(vec3 p){return fract(sin(dot(p,vec3(17.1,41.7,93.3)))*43758.5453);}float n(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1)),f.x),f.y),f.z);}void main(){vec3 N=normalize(vN),V=normalize(-vP);float lam=.08+.92*max(dot(N,normalize(uLight)),0.);float rim=pow(1.-max(dot(N,V),0.),3.);float detail=n(N*(5.+uSeed))+n(N*(15.+uSeed))*.22;float band=.5+.5*sin(asin(clamp(N.y,-1.,1.))*uBands+detail*2.8);vec3 c=mix(uA,uB,smoothstep(.34,.72,detail*.72+band*.28));c*=lam;c+=uB*rim*.32;gl_FragColor=vec4(c,1.);}`
  const planetData=[
    [2.7,.38,0x4c5064,0x9d8d7e,11,0.1],
    [4.15,.62,0x704824,0xe0b274,7,.55],
    [5.9,.78,0x071d36,0x4d8ed1,16,1.2],
    [7.85,.5,0x5d2019,0xc46542,10,1.9]
  ] as const
  const orbiters:THREE.Mesh[]=[]
  planetData.forEach(([r,s,a,b,bands,phase],i)=>{const geo=new THREE.SphereGeometry(s,64,64),m=new THREE.ShaderMaterial({uniforms:{uA:{value:new THREE.Color(a)},uB:{value:new THREE.Color(b)},uLight:{value:new THREE.Vector3(-.6,.5,.8)},uSeed:{value:i*2.4+1},uBands:{value:bands}},vertexShader:planetVert,fragmentShader:planetFrag});const p=new THREE.Mesh(geo,m);p.userData={r,phase,speed:.07-i*.009};space.add(p);orbiters.push(p);disposables.push(geo,m);const og=new THREE.RingGeometry(r-.007,r+.007,180),om=glow(0x7f95bd,.08);const o=new THREE.Mesh(og,om);o.rotation.x=Math.PI/2;o.position.copy(sun.position);space.add(o);disposables.push(og)})

  const sat=new THREE.Group();const satCore=new THREE.Mesh(new THREE.BoxGeometry(.52,.34,.52),mat(0xc7ced6,.25,.9)),panelMat=mat(0x102e63,.24,.35),panelGeo=new THREE.BoxGeometry(1.15,.035,.44),pa=new THREE.Mesh(panelGeo,panelMat),pb=pa.clone();pa.position.x=-.98;pb.position.x=.98;sat.add(satCore,pa,pb);sat.position.set(5.5,.8,1);space.add(sat);disposables.push(satCore.geometry,panelGeo)
  const ufo=new THREE.Group(),uBody=new THREE.Mesh(new THREE.CylinderGeometry(.34,.68,.14,40),mat(0x9da9b7,.18,.92)),uDome=new THREE.Mesh(new THREE.SphereGeometry(.24,28,14,0,Math.PI*2,0,Math.PI/2),glow(0x7bf0ec,.58));uBody.rotation.x=Math.PI/2;uDome.rotation.x=Math.PI;uDome.position.y=.08;ufo.add(uBody,uDome);space.add(ufo);disposables.push(uBody.geometry,uDome.geometry)
  const cometGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(-4.6,.85,-.45)]),cometMat=glow(0xeaf7ff,.62),comet=new THREE.Line(cometGeo,cometMat);space.add(comet);disposables.push(cometGeo)

  // SKY — gradient atmosphere, layered translucent cloud volumes, aircraft and birds.
  const skyDomeGeo=new THREE.SphereGeometry(36,48,32),skyDomeMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uTop:{value:new THREE.Color(0x295c96)},uHorizon:{value:new THREE.Color(0xb9d6e4)}},vertexShader:`varying float vY;void main(){vY=normalize(position).y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform vec3 uTop;uniform vec3 uHorizon;varying float vY;void main(){float h=smoothstep(-.25,.8,vY);gl_FragColor=vec4(mix(uHorizon,uTop,h),1.);}`});const skyDome=new THREE.Mesh(skyDomeGeo,skyDomeMat);sky.add(skyDome);disposables.push(skyDomeGeo,skyDomeMat)
  const clouds:THREE.Sprite[]=[]
  for(let i=0;i<(mobile?22:54);i++){const c=addSprite(sky,0xf5f7fa,.16+random()*.18,new THREE.Vector3((random()-.5)*28,-.5+random()*9,-5-random()*16),new THREE.Vector2(2.5+random()*4,.8+random()*1.6));clouds.push(c)}
  const plane=new THREE.Group(),fus=new THREE.Mesh(new THREE.CylinderGeometry(.11,.22,1.9,18),mat(0xdfe7ef,.22,.72)),wing=new THREE.Mesh(new THREE.BoxGeometry(1.8,.045,.52),mat(0x9eb2c8,.3,.55));fus.rotation.z=Math.PI/2;plane.add(fus,wing);sky.add(plane);disposables.push(fus.geometry,wing.geometry)
  const heli=new THREE.Group(),hb=new THREE.Mesh(new THREE.SphereGeometry(.34,24,16),mat(0x25313d,.34,.55)),rotor=new THREE.Mesh(new THREE.BoxGeometry(2.1,.02,.07),mat(0xaab7c2,.25,.8));hb.scale.set(1.45,.8,.8);rotor.position.y=.43;heli.add(hb,rotor);sky.add(heli);disposables.push(hb.geometry,rotor.geometry)
  const birds:THREE.Line[]=[];for(let i=0;i<16;i++){const bg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.2,0,0),new THREE.Vector3(0,.09,0),new THREE.Vector3(.2,0,0)]),bm=new THREE.LineBasicMaterial({color:0x1d2831,transparent:true,opacity:.82});const b=new THREE.Line(bg,bm);b.position.set((random()-.5)*15,1+random()*5,-3-random()*7);sky.add(b);birds.push(b);disposables.push(bg,bm)}

  // MOUNTAINS — displaced terrain instead of cone primitives.
  const terrainGeo=new THREE.PlaneGeometry(34,18,mobile?70:120,mobile?40:70);terrainGeo.rotateX(-Math.PI/2)
  const pos=terrainGeo.attributes.position as THREE.BufferAttribute
  for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);const ridge=Math.sin(x*.38)+Math.sin(x*.81+1.2)*.52+Math.sin(x*1.71)*.15;const fall=Math.pow(Math.max(0,1-Math.abs(z)/10),1.2);pos.setY(i,-3.6+Math.max(0,ridge+1.25)*2.35*fall+Math.sin(z*.6+x*.17)*.22)}
  terrainGeo.computeVertexNormals();const terrainMat=new THREE.MeshStandardMaterial({color:0xaeb8c3,roughness:.93,metalness:0});const terrain=new THREE.Mesh(terrainGeo,terrainMat);terrain.position.z=-7;terrain.castShadow=!mobile;terrain.receiveShadow=!mobile;mountain.add(terrain);disposables.push(terrainGeo,terrainMat)
  const snowCap=terrain.clone();snowCap.material=new THREE.MeshStandardMaterial({color:0xf2f5f7,roughness:.98,polygonOffset:true,polygonOffsetFactor:-1});snowCap.scale.y=1.012;snowCap.position.y=.045;mountain.add(snowCap);disposables.push(snowCap.material as THREE.Material)
  const skier=new THREE.Group(),skierBody=new THREE.Mesh(new THREE.CapsuleGeometry(.08,.36,4,8),mat(0xd62f3a,.5)),skiGeo=new THREE.BoxGeometry(.8,.018,.055),ski1=new THREE.Mesh(skiGeo,mat(0x10161c,.3,.62)),ski2=ski1.clone();ski1.position.set(0,-.34,.1);ski2.position.set(0,-.34,-.1);skier.add(skierBody,ski1,ski2);mountain.add(skier);disposables.push(skierBody.geometry,skiGeo)
  const yeti=new THREE.Group(),yb=new THREE.Mesh(new THREE.SphereGeometry(.38,20,16),mat(0xd9dddf,.92)),yh=new THREE.Mesh(new THREE.SphereGeometry(.22,18,14),mat(0xcbd0d3,.94));yb.scale.set(.78,1.45,.6);yh.position.y=.56;yeti.add(yb,yh);yeti.position.set(5,-1.5,-4);mountain.add(yeti);disposables.push(yb.geometry,yh.geometry)
  const snowCount=mobile?520:1300,snowPos=new Float32Array(snowCount*3);for(let i=0;i<snowCount;i++)snowPos.set([(random()-.5)*24,(random()-.5)*13,-1-random()*15],i*3);const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(snowPos,3));const snowMat=new THREE.PointsMaterial({color:0xffffff,size:.035,transparent:true,opacity:.64});const snowPts=new THREE.Points(snowGeo,snowMat);mountain.add(snowPts);disposables.push(snowGeo,snowMat)
  for(let i=0;i<(mobile?4:9);i++)addSprite(mountain,0xdce8ef,.05+random()*.035,new THREE.Vector3((random()-.5)*16,-1+random()*4,-4-random()*8),new THREE.Vector2(5+random()*5,1.2+random()*1.6))

  // FOREST — instanced trees, fog layers and fireflies.
  const treeCount=mobile?55:125,treeTrunkGeo=new THREE.CylinderGeometry(.07,.12,1.7,7),treeCrownGeo=new THREE.ConeGeometry(.62,2.4,9),treeTrunkMat=mat(0x32251d,.98),treeCrownMat=mat(0x123626,.92),trunks=new THREE.InstancedMesh(treeTrunkGeo,treeTrunkMat,treeCount),crowns=new THREE.InstancedMesh(treeCrownGeo,treeCrownMat,treeCount),dummy=new THREE.Object3D()
  for(let i=0;i<treeCount;i++){const x=(random()-.5)*24,z=-2-random()*15,s=.72+random()*1.65;dummy.position.set(x,-2.45,z);dummy.scale.setScalar(s);dummy.rotation.y=random()*Math.PI;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);dummy.position.y=-1.1*s;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix)}forest.add(trunks,crowns);disposables.push(treeTrunkGeo,treeCrownGeo)
  const fireCount=mobile?90:220,firePos=new Float32Array(fireCount*3);for(let i=0;i<fireCount;i++)firePos.set([(random()-.5)*20,-2+random()*6,-2-random()*10],i*3);const fg=new THREE.BufferGeometry();fg.setAttribute('position',new THREE.BufferAttribute(firePos,3));const fm=new THREE.PointsMaterial({color:0xd8ff9d,size:.055,transparent:true,opacity:.76,blending:THREE.AdditiveBlending});const fireflies=new THREE.Points(fg,fm);forest.add(fireflies);disposables.push(fg,fm)
  for(let i=0;i<(mobile?3:7);i++)addSprite(forest,0xbdd9ce,.045+random()*.035,new THREE.Vector3((random()-.5)*15,-2.7+random(),-3-random()*8),new THREE.Vector2(7+random()*6,1+random()*1.2))

  // DESERT — height-field dunes, mesas and atmospheric haze.
  const duneGeo=new THREE.PlaneGeometry(34,18,mobile?60:110,mobile?34:64);duneGeo.rotateX(-Math.PI/2);const dp=duneGeo.attributes.position as THREE.BufferAttribute;for(let i=0;i<dp.count;i++){const x=dp.getX(i),z=dp.getZ(i);dp.setY(i,-3.45+Math.sin(x*.42+z*.18)*.45+Math.sin(x*.16-z*.31)*.28+Math.cos(z*.74)*.09)}duneGeo.computeVertexNormals();const duneMat=new THREE.MeshStandardMaterial({color:0xc78a49,roughness:1});const dunes=new THREE.Mesh(duneGeo,duneMat);dunes.position.z=-6;desert.add(dunes);disposables.push(duneGeo,duneMat)
  for(let i=0;i<4;i++){const geo=new THREE.CylinderGeometry(.7+random()*.55,1.4+random()*.8,2.8+random()*2.2,9),m=mat(0x93492d,.98),mesa=new THREE.Mesh(geo,m);mesa.position.set(-7+i*4.7,-1.8,-6-random()*5);mesa.scale.y=.8+random()*.7;desert.add(mesa);disposables.push(geo)}
  const tumble=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,2),new THREE.MeshBasicMaterial({color:0x82603e,wireframe:true,transparent:true,opacity:.82}));desert.add(tumble);disposables.push(tumble.geometry,tumble.material)
  for(let i=0;i<6;i++)addSprite(desert,0xf3c17e,.025+random()*.025,new THREE.Vector3((random()-.5)*16,-1+random()*4,-4-random()*9),new THREE.Vector2(6+random()*5,2+random()*2))

  // SWAMP — animated reflective water, instanced cypress, reeds and mist.
  const waterGeo=new THREE.PlaneGeometry(30,20,90,60),waterMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uDeep:{value:new THREE.Color(0x071c1c)},uLight:{value:new THREE.Color(0x345f50)}},vertexShader:`uniform float uTime;varying vec3 vP;varying vec3 vN;void main(){vec3 p=position;p.z+=sin(p.x*.7+uTime*.55)*.05+sin(p.y*.95-uTime*.38)*.04;vP=p;vN=normal;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uDeep;uniform vec3 uLight;varying vec3 vP;void main(){float ripple=.5+.5*sin(vP.x*1.7+vP.y*2.1);vec3 c=mix(uDeep,uLight,ripple*.13);gl_FragColor=vec4(c,.92);}`,transparent:true,side:THREE.DoubleSide});const swampWater=new THREE.Mesh(waterGeo,waterMat);swampWater.rotation.x=-Math.PI/2;swampWater.position.y=-2.95;swamp.add(swampWater);disposables.push(waterGeo,waterMat)
  const cypressCount=mobile?24:56,cypressGeo=new THREE.CylinderGeometry(.1,.28,4.5,8),cypressMat=mat(0x46372a,.97),cypress=new THREE.InstancedMesh(cypressGeo,cypressMat,cypressCount);for(let i=0;i<cypressCount;i++){dummy.position.set((random()-.5)*23,-1.2,-2-random()*13);dummy.scale.set(.8+random()*.9,.8+random()*1.35,.8+random()*.9);dummy.rotation.z=(random()-.5)*.08;dummy.updateMatrix();cypress.setMatrixAt(i,dummy.matrix)}swamp.add(cypress);disposables.push(cypressGeo)
  const reedCount=mobile?80:180,reedGeo=new THREE.CylinderGeometry(.012,.022,1.25,5),reedMat=mat(0x47633e,.98),reeds=new THREE.InstancedMesh(reedGeo,reedMat,reedCount);for(let i=0;i<reedCount;i++){dummy.position.set((random()-.5)*22,-2.35,-2-random()*12);dummy.scale.y=.55+random()*1.3;dummy.rotation.z=(random()-.5)*.18;dummy.updateMatrix();reeds.setMatrixAt(i,dummy.matrix)}swamp.add(reeds);disposables.push(reedGeo)
  for(let i=0;i<(mobile?5:10);i++)addSprite(swamp,0xa6b8a6,.028+random()*.035,new THREE.Vector3((random()-.5)*17,-2.1+random()*2,-3-random()*9),new THREE.Vector2(6+random()*6,1.1+random()*1.8))

  // BEACH — wave shader, foam line, wet sand and palms.
  const sandGeo=new THREE.PlaneGeometry(32,12,30,10),sandMat=new THREE.MeshStandardMaterial({color:0xd3b17d,roughness:.94}),sand=new THREE.Mesh(sandGeo,sandMat);sand.rotation.x=-Math.PI/2;sand.position.set(0,-3.2,-3);beach.add(sand);disposables.push(sandGeo,sandMat)
  const seaGeo=new THREE.PlaneGeometry(36,22,mobile?70:130,mobile?40:80),seaMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uDeep:{value:new THREE.Color(0x07536b)},uShallow:{value:new THREE.Color(0x44a7ae)}},vertexShader:`uniform float uTime;varying vec2 vUv;varying float vWave;void main(){vUv=uv;vec3 p=position;float w=sin(p.x*.72+uTime)*.09+sin(p.y*1.15-uTime*.72)*.055+sin((p.x+p.y)*1.8+uTime*.45)*.022;p.z+=w;vWave=w;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,fragmentShader:`uniform vec3 uDeep;uniform vec3 uShallow;varying vec2 vUv;varying float vWave;void main(){vec3 c=mix(uDeep,uShallow,smoothstep(.05,.9,vUv.y));float spec=smoothstep(.06,.13,vWave)*.22;c+=vec3(spec);gl_FragColor=vec4(c,.94);}`,transparent:true,side:THREE.DoubleSide});const sea=new THREE.Mesh(seaGeo,seaMat);sea.rotation.x=-Math.PI/2;sea.position.set(0,-2.82,-10);beach.add(sea);disposables.push(seaGeo,seaMat)
  const foamGeo=new THREE.PlaneGeometry(28,.35,80,1),foamMat=new THREE.MeshBasicMaterial({color:0xf4fbff,transparent:true,opacity:.32,blending:THREE.AdditiveBlending}),foam=new THREE.Mesh(foamGeo,foamMat);foam.rotation.x=-Math.PI/2;foam.position.set(0,-2.77,-2.1);beach.add(foam);disposables.push(foamGeo,foamMat)
  const palmTrunk=mat(0x4e3827,.95),palmLeaf=mat(0x2f704a,.88);for(const x of [-6.5,6.2]){const palm=new THREE.Group(),trunk=new THREE.Mesh(new THREE.CylinderGeometry(.12,.2,4.2,10),palmTrunk);trunk.rotation.z=x<0?-.13:.11;palm.add(trunk);for(let i=0;i<8;i++){const leaf=new THREE.Mesh(new THREE.ConeGeometry(.16,2.2,8),palmLeaf);leaf.position.y=2.05;leaf.rotation.z=Math.PI/2;leaf.rotation.y=i/8*Math.PI*2;palm.add(leaf)}palm.position.set(x,-1.1,-4);beach.add(palm);disposables.push(trunk.geometry)}

  // OCEAN — deeper gradient, caustic shafts, fish, jellyfish, particles and seabed.
  const oceanVeilGeo=new THREE.PlaneGeometry(36,22),oceanVeilMat=new THREE.ShaderMaterial({uniforms:{uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform float uTime;varying vec2 vUv;float c=sin((vUv.x+uTime*.018)*46.)*sin((vUv.y-uTime*.013)*38.);void main(){vec3 top=vec3(.015,.18,.24),deep=vec3(.002,.018,.045);vec3 col=mix(top,deep,smoothstep(.05,1.,1.-vUv.y));col+=vec3(.03,.14,.16)*pow(max(c,0.),10.)*.2;gl_FragColor=vec4(col,.94);}`,transparent:true});const oceanVeil=new THREE.Mesh(oceanVeilGeo,oceanVeilMat);oceanVeil.position.z=-9;ocean.add(oceanVeil);disposables.push(oceanVeilGeo,oceanVeilMat)
  const marineCount=mobile?850:2300,mp=new Float32Array(marineCount*3);for(let i=0;i<marineCount;i++)mp.set([(random()-.5)*24,(random()-.5)*14,-1-random()*16],i*3);const mg=new THREE.BufferGeometry();mg.setAttribute('position',new THREE.BufferAttribute(mp,3));const mm=new THREE.PointsMaterial({color:0xb7eef2,size:.024,transparent:true,opacity:.52,blending:THREE.AdditiveBlending});const marine=new THREE.Points(mg,mm);ocean.add(marine);disposables.push(mg,mm)
  const fish:THREE.Group[]=[];for(let i=0;i<(mobile?10:24);i++){const f=new THREE.Group(),body=new THREE.Mesh(new THREE.SphereGeometry(.2+random()*.08,16,10),mat(i%4===0?0x294f57:0x0a2028,.66)),tail=new THREE.Mesh(new THREE.ConeGeometry(.15,.3,3),body.material);body.scale.set(1.65,.7,.45);tail.rotation.z=Math.PI/2;tail.position.x=-.42;f.add(body,tail);f.userData={phase:random()*14,speed:.18+random()*.28,y:-3+random()*6,z:-2-random()*10,dir:i%2?1:-1};ocean.add(f);fish.push(f);disposables.push(body.geometry,tail.geometry)}
  const jelly:THREE.Group[]=[];for(let i=0;i<5;i++){const j=new THREE.Group(),bell=new THREE.Mesh(new THREE.SphereGeometry(.34+random()*.08,26,14,0,Math.PI*2,0,Math.PI/2),glow(i%2?0x72e6dc:0x7aa6ff,.28));bell.rotation.x=Math.PI;j.add(bell);for(let k=0;k<6;k++){const lg=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3((k-2.5)*.075,-.05,0),new THREE.Vector3((k-2.5)*.055,-1.4,.03)]),lm=new THREE.LineBasicMaterial({color:i%2?0x72e6dc:0x7aa6ff,transparent:true,opacity:.15});j.add(new THREE.Line(lg,lm));disposables.push(lg,lm)}j.position.set(i%2?4.5:-4.5,-1+i*1.25,-3-i);ocean.add(j);jelly.push(j);disposables.push(bell.geometry)}
  const rockGeo=new THREE.IcosahedronGeometry(1,2),rockMat=mat(0x092128,.98),rockCount=mobile?14:30,rocks=new THREE.InstancedMesh(rockGeo,rockMat,rockCount);for(let i=0;i<rockCount;i++){dummy.position.set((random()-.5)*22,-4.5,-2-random()*12);dummy.scale.set(.4+random()*1.3,.22+random()*.5,.35+random());dummy.rotation.set(random(),random(),random());dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix)}ocean.add(rocks);disposables.push(rockGeo)
  for(let i=0;i<(mobile?5:10);i++){const beam=addSprite(ocean,0x72d9e4,.024+random()*.025,new THREE.Vector3((random()-.5)*12,2-random()*2,-4-random()*7),new THREE.Vector2(.6+random()*.7,11+random()*5));beam.material.rotation=(-.15+random()*.3)}

  const palette=[0x010309,0x5a86aa,0xaebfce,0x132f27,0xc98c4b,0x162c28,0x39899b,0x03172c].map(c=>new THREE.Color(c))
  let target=0,progress=0,px=0,py=0
  onScroll=()=>{const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);target=window.scrollY/max}
  onPointer=e=>{px=e.clientX/window.innerWidth*2-1;py=-(e.clientY/window.innerHeight)*2+1}
  onResize=()=>{if(!renderer||!composer)return;const w=window.innerWidth,h=window.innerHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h)}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('resize',onResize);onScroll();onResize()

  const clock=new THREE.Clock()
  const render=()=>{const t=clock.getElapsedTime();progress+=(target-progress)*(reduced?1:.032);const travel=progress*(groups.length-1)*zStep;world.position.z=travel
    const fi=progress*(palette.length-1),idx=Math.min(palette.length-2,Math.floor(fi)),mix=fi-idx,bg=palette[idx].clone().lerp(palette[idx+1],mix);scene.background=bg;(scene.fog as THREE.FogExp2).color.copy(bg);(scene.fog as THREE.FogExp2).density=.011+smooth(.78,1,progress)*.026
    hemi.intensity=1.1-smooth(.65,1,progress)*.42;key.intensity=3.8-smooth(.72,1,progress)*2.5;renderer!.toneMappingExposure=1.03+Math.sin(progress*Math.PI)*.08-smooth(.82,1,progress)*.18
    camera.position.x+=(px*.26-camera.position.x)*.022;camera.position.y+=((py*.15-smooth(.84,1,progress)*.82)-camera.position.y)*.022;camera.rotation.z+=(px*.0018-camera.rotation.z)*.018

    sunShader.uniforms.uTime.value=t;halo.scale.setScalar(1+Math.sin(t*.8)*.028)
    orbiters.forEach((p,i)=>{const a=t*p.userData.speed+p.userData.phase;p.position.set(sun.position.x+Math.cos(a)*p.userData.r,sun.position.y+Math.sin(a*.9)*p.userData.r*.28,sun.position.z+Math.sin(a)*p.userData.r*.62);p.rotation.y=t*(.08+i*.02)})
    sat.rotation.y=t*.1;sat.rotation.x=Math.sin(t*.18)*.18;ufo.position.set(-10+(t%8)*2.7,2.15+Math.sin(t*1.5)*.28,-1.8);ufo.rotation.z=Math.sin(t*.9)*.05;comet.position.set(8-((t*.72)%16),4-((t*.72)%16)*.3,-4)
    clouds.forEach((c,i)=>{c.position.x+=Math.sin(t*.035+i)*.0012;c.position.y+=Math.sin(t*.05+i*.7)*.0005});plane.position.set(-8+((t*.38)%16),2+Math.sin(t*.5)*.12,-2);plane.rotation.z=Math.sin(t*.3)*.025;rotor.rotation.y=t*14;heli.position.set(6-((t*.27)%12),-.15+Math.sin(t*.6)*.1,-1);birds.forEach((b,i)=>{b.position.x=-7+((t*.18+i*.72)%14);b.position.y=1.4+(i%4)*.5+Math.sin(t*.8+i)*.07})
    snowPts.position.y=-((t*.13)%1.8);snowPts.position.x=Math.sin(t*.18)*.18;skier.position.set(-6+((t*.32)%12),-2.05+Math.sin(t*.42)*.08,-1.9);skier.rotation.z=-.18;yeti.visible=pulse(progress,.24,.31,.39)>.05&&Math.sin(t*.25)>.05
    fireflies.rotation.y=Math.sin(t*.08)*.035;fireflies.position.y=Math.sin(t*.3)*.04;tumble.position.set(-7+((t*.42)%14),-2.7+Math.abs(Math.sin(t*1.6))*.55,-2.5);tumble.rotation.z=t*1.7
    waterMat.uniforms.uTime.value=t;seaMat.uniforms.uTime.value=t;foam.position.z=-2.1+Math.sin(t*.7)*.16;foam.material.opacity=.24+Math.sin(t*.9)*.06;oceanVeilMat.uniforms.uTime.value=t
    marine.position.y=-((t*.08)%1.2);marine.position.x=Math.sin(t*.06)*.08;fish.forEach((f,i)=>{const loop=((t*f.userData.speed+f.userData.phase)%16)-8;f.position.set(f.userData.dir*loop,f.userData.y+Math.sin(t*.4+i)*.14,f.userData.z);f.rotation.y=f.userData.dir>0?0:Math.PI});jelly.forEach((j,i)=>{j.position.y+=Math.sin(t*.3+i)*.0014;j.scale.y=.96+Math.sin(t*.9+i)*.035;j.rotation.z=Math.sin(t*.2+i)*.05})
    composer?.render();frame=requestAnimationFrame(render)}
  render()
})

onBeforeUnmount(()=>{cancelAnimationFrame(frame);if(onResize)window.removeEventListener('resize',onResize);if(onScroll)window.removeEventListener('scroll',onScroll);if(onPointer)window.removeEventListener('pointermove',onPointer);disposables.forEach(x=>x.dispose());composer?.dispose();renderer?.dispose()})
</script>

<template><canvas id="world-journey-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none" /></template>
