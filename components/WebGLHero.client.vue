<script setup lang="ts">
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let composer: EffectComposer | null = null
let onResize: (() => void) | null = null
let onScroll: (() => void) | null = null
let onPointer: ((e: PointerEvent) => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = []

const pointVertex = `uniform float uPixelRatio;uniform float uSize;attribute float aSize;attribute float aGlow;varying float vGlow;void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uSize*uPixelRatio*(10.0/max(2.0,-mv.z));vGlow=aGlow;}`
const pointFragment = `uniform vec3 uColor;uniform float uOpacity;varying float vGlow;void main(){vec2 p=gl_PointCoord-.5;float d=length(p);float core=1.0-smoothstep(.025,.11,d);float halo=1.0-smoothstep(.08,.5,d);float alpha=(core*1.5+halo*(.18+vGlow*.68))*uOpacity;if(alpha<.008)discard;gl_FragColor=vec4(uColor,alpha);}`

onMounted(async()=>{
  await nextTick()
  const canvas=document.getElementById('webgl-hero-canvas') as HTMLCanvasElement|null
  if(!canvas)return

  const mobile=window.innerWidth<800
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene=new THREE.Scene()
  scene.fog=new THREE.FogExp2(0x02040a,mobile?.035:.025)
  const camera=new THREE.PerspectiveCamera(mobile?58:48,1,.1,100)
  camera.position.set(0,0,mobile?12.5:11.5)

  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'})
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.1:1.5))
  renderer.setClearColor(0x02040a,1)
  renderer.outputColorSpace=THREE.SRGBColorSpace

  composer=new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene,camera))
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),mobile?.42:.72,.82,.045)
  bloom.threshold=.035;bloom.radius=.82;bloom.strength=mobile?.42:.72
  composer.addPass(bloom)

  const world=new THREE.Group();scene.add(world)
  let seed=42071
  const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}
  const makePointMaterial=(color:number,opacity:number,size=1)=>{const material=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(color)},uOpacity:{value:opacity},uPixelRatio:{value:renderer!.getPixelRatio()},uSize:{value:size}},vertexShader:pointVertex,fragmentShader:pointFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});disposables.push(material);return material}

  type Layer={points:THREE.Points;material:THREE.ShaderMaterial;speed:number}
  const layers:Layer[]=[]
  const starSpecs=mobile?[[850,26,.26,0xaebbd6],[520,34,.18,0x7182ad]]:[[2200,27,.34,0xc5d0e6],[1500,36,.22,0x8192ba],[1000,48,.13,0x5c6e98]]
  starSpecs.forEach((spec,li)=>{const[count,spread,opacity,color]=spec as number[],positions=new Float32Array(count*3),sizes=new Float32Array(count),glows=new Float32Array(count);for(let i=0;i<count;i++){const z=8-random()*58,depthScale=1+Math.abs(z)*.055;positions.set([(random()-.5)*spread*depthScale,(random()-.5)*spread*.58*depthScale,z],i*3);const bright=random();sizes[i]=bright>.988?2.5+random()*3.8:.55+random()*1.55;glows[i]=bright>.988?1.2:.04+random()*.14}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aGlow',new THREE.BufferAttribute(glows,1));const material=makePointMaterial(color,opacity,1),points=new THREE.Points(geometry,material);world.add(points);disposables.push(geometry);layers.push({points,material,speed:.0025+li*.0015})})

  const cloudCanvas=document.createElement('canvas');cloudCanvas.width=256;cloudCanvas.height=256
  const ctx=cloudCanvas.getContext('2d')!,gradient=ctx.createRadialGradient(128,128,0,128,128,128)
  gradient.addColorStop(0,'rgba(255,255,255,.72)');gradient.addColorStop(.14,'rgba(255,255,255,.34)');gradient.addColorStop(.38,'rgba(255,255,255,.11)');gradient.addColorStop(.72,'rgba(255,255,255,.025)');gradient.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256)
  const cloudTexture=new THREE.CanvasTexture(cloudCanvas);cloudTexture.colorSpace=THREE.SRGBColorSpace;disposables.push(cloudTexture)
  type Nebula={sprite:THREE.Sprite;base:THREE.Vector3;phase:number;opacity:number}
  const nebulae:Nebula[]=[]
  const nebulaStops=[[-3.8,1.7,1.5,0x4d67ff,5.6,.072],[3.4,.8,-2.8,0xb9c8ec,4.5,.046],[1.8,-2.2,-6.5,0x4a6fff,6.4,.065],[-4.5,-1.4,-11,0x6f80ff,7.2,.055],[3.6,2.1,-15,0xff8255,5,.047],[-1.2,.2,-20,0x5378ff,8.2,.058],[4.7,-1.9,-25,0x9caee0,6,.038],[-4.3,2.3,-31,0x395dce,8.5,.045]]
  nebulaStops.forEach(stop=>{const[x,y,z,color,scale,opacity]=stop as number[],material=new THREE.SpriteMaterial({map:cloudTexture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,depthTest:false}),sprite=new THREE.Sprite(material);sprite.position.set(x,y,z);sprite.scale.set(scale,scale*(.55+random()*.24),1);material.rotation=random()*Math.PI;world.add(sprite);nebulae.push({sprite,base:sprite.scale.clone(),phase:random()*Math.PI*2,opacity});disposables.push(material)})

  const createCluster=(x:number,y:number,z:number,color:number,count:number,radius:number)=>{const positions=new Float32Array(count*3),sizes=new Float32Array(count),glows=new Float32Array(count);for(let i=0;i<count;i++){const a=random()*Math.PI*2,r=Math.pow(random(),.72)*radius;positions.set([x+Math.cos(a)*r,y+Math.sin(a)*r*.68,z+(random()-.5)*radius*1.5],i*3);sizes[i]=.8+random()*2.7;glows[i]=random()>.94?.95:.08+random()*.18}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('aSize',new THREE.BufferAttribute(sizes,1));geometry.setAttribute('aGlow',new THREE.BufferAttribute(glows,1));const material=makePointMaterial(color,.56,1),points=new THREE.Points(geometry,material);world.add(points);disposables.push(geometry);return points}
  const clusters=[createCluster(-2.4,1.2,.5,0x5876ff,mobile?110:280,2.2),createCluster(2.9,.8,-7.5,0xd3ddf1,mobile?90:220,1.8),createCluster(1.9,-1.6,-14,0xff8a5b,mobile?90:240,2),createCluster(-3.2,-1.1,-21,0x6581ff,mobile?95:250,2.2)]

  const planetVertex=`varying vec3 vNormalW;varying vec3 vPos;varying vec2 vUv;void main(){vUv=uv;vNormalW=normalize(mat3(modelMatrix)*normal);vec4 wp=modelMatrix*vec4(position,1.0);vPos=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`
  const planetFragment=`
  uniform vec3 uDeep;uniform vec3 uMid;uniform vec3 uHigh;uniform vec3 uLightDir;uniform float uTime;uniform float uSeed;uniform float uBands;
  varying vec3 vNormalW;varying vec3 vPos;varying vec2 vUv;
  float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
  float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
  float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.02+vec3(1.7,9.2,4.1);a*=.5;}return v;}
  void main(){vec3 n=normalize(vNormalW);float light=max(dot(n,normalize(uLightDir)),0.0);float rim=pow(1.0-max(dot(n,normalize(cameraPosition-vPos)),0.0),3.2);float lat=asin(clamp(n.y,-1.,1.));vec3 p=n*(3.1+uSeed)+vec3(uTime*.018,0.,uTime*.009);float terrain=fbm(p*1.55);float fine=fbm(p*5.2);float bands=.5+.5*sin(lat*uBands+fbm(p*2.3)*4.5);float continents=smoothstep(.46,.67,terrain+fine*.18);vec3 surface=mix(uDeep,uMid,continents);surface=mix(surface,uHigh,pow(bands,4.)*.38+smoothstep(.76,.93,fine)*.22);float terminator=.08+light*.94;float nightGlow=pow(rim,2.2)*.28;surface*=terminator;surface+=uHigh*nightGlow;surface+=uMid*(fine-.45)*.1*light;gl_FragColor=vec4(surface,1.0);}`
  const atmosphereVertex=`varying vec3 vNormalW;varying vec3 vPos;void main(){vNormalW=normalize(mat3(modelMatrix)*normal);vec4 wp=modelMatrix*vec4(position,1.0);vPos=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`
  const atmosphereFragment=`uniform vec3 uColor;uniform vec3 uLightDir;varying vec3 vNormalW;varying vec3 vPos;void main(){vec3 n=normalize(vNormalW);vec3 view=normalize(cameraPosition-vPos);float rim=pow(1.0-max(dot(n,view),0.0),4.0);float day=.25+.75*max(dot(n,normalize(uLightDir)),0.0);float a=rim*day*.8;gl_FragColor=vec4(uColor*a,a);}`

  const planetGeo=new THREE.SphereGeometry(mobile?1.8:2.7,96,96)
  const planetMat=new THREE.ShaderMaterial({uniforms:{uDeep:{value:new THREE.Color(0x07122e)},uMid:{value:new THREE.Color(0x223d8d)},uHigh:{value:new THREE.Color(0x8fb2ff)},uLightDir:{value:new THREE.Vector3(-.6,.35,.72).normalize()},uTime:{value:0},uSeed:{value:1.4},uBands:{value:14}},vertexShader:planetVertex,fragmentShader:planetFragment})
  const planet=new THREE.Mesh(planetGeo,planetMat);planet.position.set(mobile?3.8:4.7,.2,-5.8);world.add(planet);disposables.push(planetGeo,planetMat)
  const atmosphereGeo=new THREE.SphereGeometry((mobile?1.8:2.7)*1.035,72,72)
  const atmosphereMat=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(0x7aa7ff)},uLightDir:{value:new THREE.Vector3(-.6,.35,.72).normalize()}},vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide})
  const atmosphere=new THREE.Mesh(atmosphereGeo,atmosphereMat);atmosphere.position.copy(planet.position);world.add(atmosphere);disposables.push(atmosphereGeo,atmosphereMat)

  const ringGeo=new THREE.RingGeometry(mobile?2.28:3.18,mobile?2.78:3.92,256)
  const ringMat=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(0x8fa5ff)},uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform vec3 uColor;uniform float uTime;varying vec2 vUv;float h(float n){return fract(sin(n)*43758.5453);}void main(){vec2 p=vUv-.5;float r=length(p);float stripe=.55+.45*sin(r*260.0+sin(r*67.0)*2.0);float dust=.65+.35*h(floor(r*420.0));float edge=smoothstep(.5,.44,abs(r-.34));float a=stripe*dust*.38;gl_FragColor=vec4(uColor*(.42+stripe*.58),a);}`,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending})
  const ring=new THREE.Mesh(ringGeo,ringMat);ring.position.copy(planet.position);ring.rotation.set(1.18,.34,.16);world.add(ring);disposables.push(ringGeo,ringMat)

  const farGeo=new THREE.SphereGeometry(1.4,72,72)
  const farMat=new THREE.ShaderMaterial({uniforms:{uDeep:{value:new THREE.Color(0x2a0706)},uMid:{value:new THREE.Color(0x7d2119)},uHigh:{value:new THREE.Color(0xffa06f)},uLightDir:{value:new THREE.Vector3(.7,.18,.5).normalize()},uTime:{value:0},uSeed:{value:5.6},uBands:{value:9}},vertexShader:planetVertex,fragmentShader:planetFragment})
  const farPlanet=new THREE.Mesh(farGeo,farMat);farPlanet.position.set(-5.2,-2.4,-24);world.add(farPlanet);disposables.push(farGeo,farMat)
  const farAtmoGeo=new THREE.SphereGeometry(1.45,56,56)
  const farAtmoMat=new THREE.ShaderMaterial({uniforms:{uColor:{value:new THREE.Color(0xff7257)},uLightDir:{value:new THREE.Vector3(.7,.18,.5).normalize()}},vertexShader:atmosphereVertex,fragmentShader:atmosphereFragment,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.BackSide})
  const farAtmo=new THREE.Mesh(farAtmoGeo,farAtmoMat);farAtmo.position.copy(farPlanet.position);world.add(farAtmo);disposables.push(farAtmoGeo,farAtmoMat)

  let targetScroll=0,smoothScroll=0,px=0,py=0
  onScroll=()=>{const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);targetScroll=window.scrollY/max}
  onPointer=e=>{px=e.clientX/window.innerWidth*2-1;py=-(e.clientY/window.innerHeight)*2+1}
  onResize=()=>{if(!renderer||!composer)return;const w=window.innerWidth,h=window.innerHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h,false);composer.setSize(w,h);const ratio=renderer.getPixelRatio();layers.forEach(l=>{l.material.uniforms.uPixelRatio.value=ratio})}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('pointermove',onPointer,{passive:true});window.addEventListener('resize',onResize);onScroll();onResize()

  const clock=new THREE.Clock()
  const render=()=>{const t=clock.getElapsedTime();smoothScroll+=(targetScroll-smoothScroll)*(reduced?1:.035);world.position.z=smoothScroll*28;world.rotation.y+=((reduced?0:px*.018+smoothScroll*.065)-world.rotation.y)*.018;world.rotation.x+=((reduced?0:py*.01)-world.rotation.x)*.018;camera.position.x+=((reduced?0:px*.28)-camera.position.x)*.025;camera.position.y+=((reduced?0:py*.18)-camera.position.y)*.025
    layers.forEach((layer,i)=>{if(!reduced){layer.points.rotation.z+=layer.speed*.08;layer.points.rotation.y=Math.sin(t*(.025+i*.008))*.018}})
    nebulae.forEach((n,i)=>{const breathe=reduced?1:1+Math.sin(t*.16+n.phase)*.045;n.sprite.scale.set(n.base.x*breathe,n.base.y*breathe,1);(n.sprite.material as THREE.SpriteMaterial).opacity=n.opacity+Math.sin(t*.11+i)*.005;if(!reduced)(n.sprite.material as THREE.SpriteMaterial).rotation+=.00012*(i%2?1:-1)})
    planetMat.uniforms.uTime.value=t;farMat.uniforms.uTime.value=t*.72;ringMat.uniforms.uTime.value=t
    if(!reduced){planet.rotation.y=t*.028;planet.rotation.x=.08+Math.sin(t*.08)*.025;atmosphere.rotation.copy(planet.rotation);ring.rotation.z=.16+Math.sin(t*.07)*.018;farPlanet.rotation.y=-t*.014;farPlanet.rotation.z=.08;farAtmo.rotation.copy(farPlanet.rotation);clusters.forEach((cluster,i)=>{cluster.rotation.z=Math.sin(t*(.04+i*.008))*.045})}
    composer?.render();frame=requestAnimationFrame(render)}
  render()
})

onBeforeUnmount(()=>{cancelAnimationFrame(frame);if(onResize)window.removeEventListener('resize',onResize);if(onScroll)window.removeEventListener('scroll',onScroll);if(onPointer)window.removeEventListener('pointermove',onPointer);disposables.forEach(item=>item.dispose());composer?.dispose();renderer?.dispose()})
</script>

<template><canvas id="webgl-hero-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none" /></template>
