<script setup lang="ts">
import * as THREE from 'three'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let onResize: (() => void) | null = null
let onScroll: (() => void) | null = null
const disposables: Array<THREE.BufferGeometry | THREE.Material> = []
const clamp01=(v:number)=>Math.max(0,Math.min(1,v))
const smooth=(a:number,b:number,v:number)=>{const t=clamp01((v-a)/(b-a));return t*t*(3-2*t)}

onMounted(async()=>{
  await nextTick()
  const canvas=document.getElementById('underwater-world-canvas') as HTMLCanvasElement|null
  if(!canvas)return
  const mobile=window.innerWidth<800
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const scene=new THREE.Scene()
  const camera=new THREE.PerspectiveCamera(mobile?60:48,1,.1,80)
  camera.position.z=12
  renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'})
  renderer.setClearColor(0x000000,0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1:1.25))
  renderer.outputColorSpace=THREE.SRGBColorSpace

  let seed=71237
  const random=()=>{seed=seed*16807%2147483647;return(seed-1)/2147483646}

  const veilGeo=new THREE.PlaneGeometry(40,24)
  const veilMat=new THREE.ShaderMaterial({uniforms:{uBlend:{value:0},uTime:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,fragmentShader:`uniform float uBlend;uniform float uTime;varying vec2 vUv;float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){float d=1.-vUv.y;float n=h(floor(vUv*70.+uTime*.02))*.018;vec3 top=vec3(.015,.15,.22),mid=vec3(.006,.06,.105),deep=vec3(.001,.014,.035);vec3 c=mix(top,mid,smoothstep(.05,.65,d));c=mix(c,deep,smoothstep(.55,1.,d));c+=n;gl_FragColor=vec4(c,uBlend*(.72+d*.24));}`,transparent:true,depthWrite:false})
  const veil=new THREE.Mesh(veilGeo,veilMat);veil.position.z=-6;scene.add(veil);disposables.push(veilGeo,veilMat)

  const snowCount=mobile?420:1400
  const pos=new Float32Array(snowCount*3),sizes=new Float32Array(snowCount)
  for(let i=0;i<snowCount;i++){pos.set([(random()-.5)*20,(random()-.5)*12,-1-random()*16],i*3);sizes[i]=.8+random()*2.4}
  const snowGeo=new THREE.BufferGeometry();snowGeo.setAttribute('position',new THREE.BufferAttribute(pos,3));snowGeo.setAttribute('aSize',new THREE.BufferAttribute(sizes,1))
  const snowMat=new THREE.ShaderMaterial({uniforms:{uOpacity:{value:0},uPixelRatio:{value:renderer.getPixelRatio()}},vertexShader:`uniform float uPixelRatio;attribute float aSize;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=aSize*uPixelRatio*(8./max(2.,-mv.z));}`,fragmentShader:`uniform float uOpacity;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.08,.5,d))*uOpacity;if(a<.01)discard;gl_FragColor=vec4(.58,.9,.96,a);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})
  const snow=new THREE.Points(snowGeo,snowMat);scene.add(snow);disposables.push(snowGeo,snowMat)

  const shafts:THREE.Mesh[]=[]
  for(let i=0;i<(mobile?4:8);i++){
    const g=new THREE.PlaneGeometry(.35+random()*.7,10+random()*5)
    const m=new THREE.MeshBasicMaterial({color:0x72dcea,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})
    const s=new THREE.Mesh(g,m);s.position.set(-7+random()*14,4+random()*2,-2-random()*6);s.rotation.z=-.18+random()*.36;scene.add(s);shafts.push(s);disposables.push(g,m)
  }

  const bubbles:THREE.Mesh[]=[]
  for(let i=0;i<(mobile?16:36);i++){
    const g=new THREE.RingGeometry(.025,.042,18)
    const m=new THREE.MeshBasicMaterial({color:0xa3ecff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})
    const b=new THREE.Mesh(g,m);b.scale.setScalar(.7+random()*2);b.userData.x=-8+random()*16;b.userData.speed=.22+random()*.5;b.userData.phase=random()*6.28;b.position.set(b.userData.x,-6+random()*12,-1-random()*10);scene.add(b);bubbles.push(b);disposables.push(g,m)
  }

  const fish:THREE.Group[]=[]
  const bodyGeo=new THREE.SphereGeometry(.22,12,8),tailGeo=new THREE.ConeGeometry(.16,.3,3)
  disposables.push(bodyGeo,tailGeo)
  for(let i=0;i<(mobile?6:14);i++){
    const group=new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:0x03131d,transparent:true,opacity:0,depthWrite:false});const body=new THREE.Mesh(bodyGeo,mat);body.scale.set(1.5,.65,.4);group.add(body);const tail=new THREE.Mesh(tailGeo,mat.clone());tail.rotation.z=Math.PI/2;tail.position.x=-.43;group.add(tail);group.userData.dir=i%2?1:-1;group.userData.speed=.18+random()*.32;group.userData.phase=random()*12;group.userData.y=-3+random()*6;group.userData.z=-2-random()*8;scene.add(group);fish.push(group);disposables.push(mat,tail.material as THREE.Material)
  }

  const jelly:THREE.Group[]=[]
  for(let j=0;j<(mobile?2:4);j++){
    const group=new THREE.Group();const g=new THREE.SphereGeometry(.36+j*.04,22,12,0,Math.PI*2,0,Math.PI/2);const m=new THREE.MeshBasicMaterial({color:j%2?0x66e0d7:0x6faeff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});const bell=new THREE.Mesh(g,m);bell.rotation.x=Math.PI;group.add(bell);for(let t=0;t<5;t++){const lineGeo=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3((t-2)*.1,-.05,0),new THREE.Vector3((t-2)*.08,-1.2,.04),new THREE.Vector3((t-2)*.11,-1.8,-.02)]);const line=new THREE.Line(lineGeo,new THREE.LineBasicMaterial({color:j%2?0x77e5dd:0x7eb3ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending}));group.add(line);disposables.push(lineGeo,line.material as THREE.Material)}group.position.set(j%2?4.4:-4.6,-.8+j*1.5,-3-j*1.8);scene.add(group);jelly.push(group);disposables.push(g,m)
  }

  const seabed=new THREE.Group()
  for(let i=0;i<(mobile?8:18);i++){const g=new THREE.IcosahedronGeometry(.5+random()*.9,1);const m=new THREE.MeshBasicMaterial({color:0x031219,transparent:true,opacity:0});const r=new THREE.Mesh(g,m);r.scale.set(1+random()*1.5,.5+random()*.6,.8+random());r.position.set(-9+random()*18,-5.1+random()*.7,-2-random()*10);seabed.add(r);disposables.push(g,m)}
  scene.add(seabed)

  let target=0,smoothScroll=0
  onScroll=()=>{const max=Math.max(document.documentElement.scrollHeight-window.innerHeight,1);target=window.scrollY/max}
  onResize=()=>{if(!renderer)return;const w=window.innerWidth,h=window.innerHeight;camera.aspect=w/Math.max(h,1);camera.updateProjectionMatrix();renderer.setSize(w,h,false);snowMat.uniforms.uPixelRatio.value=renderer.getPixelRatio()}
  window.addEventListener('scroll',onScroll,{passive:true});window.addEventListener('resize',onResize);onScroll();onResize()

  const clock=new THREE.Clock()
  const render=()=>{const t=clock.getElapsedTime();smoothScroll+=(target-smoothScroll)*(reduced?1:.045);const p=smoothScroll,ocean=smooth(.5,.78,p),deep=smooth(.72,1,p),bottom=smooth(.82,.96,p);veilMat.uniforms.uBlend.value=ocean;veilMat.uniforms.uTime.value=t;snowMat.uniforms.uOpacity.value=ocean*(.18+deep*.34);if(!reduced){snow.rotation.z=Math.sin(t*.03)*.01;snow.position.y=Math.sin(t*.08)*.07}
    shafts.forEach((s,i)=>{(s.material as THREE.MeshBasicMaterial).opacity=ocean*(1-deep*.88)*(.025+(i%3)*.016)})
    bubbles.forEach(b=>{(b.material as THREE.MeshBasicMaterial).opacity=ocean*(.12+deep*.2);if(!reduced){b.position.y+=b.userData.speed*.012;b.position.x=b.userData.x+Math.sin(t*.6+b.userData.phase)*.18;if(b.position.y>6.5)b.position.y=-6.5}})
    fish.forEach((f,i)=>{const a=smooth(.69,.83,p),dir=f.userData.dir,loop=((t*f.userData.speed+f.userData.phase)%16)-8;f.position.set(dir*loop,f.userData.y+Math.sin(t*.35+i)*.16,f.userData.z);f.rotation.y=dir>0?0:Math.PI;f.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material&{opacity?:number};if(m&&'opacity'in m)m.opacity=a*(.15+(i%4)*.025)})})
    jelly.forEach((j,i)=>{const a=smooth(.66+i*.03,.79+i*.02,p);j.traverse(o=>{const m=(o as THREE.Mesh).material as THREE.Material&{opacity?:number};if(m&&'opacity'in m)m.opacity=a*((o instanceof THREE.Line)?.18:.28)});if(!reduced){j.position.y+=Math.sin(t*.35+i)*.0017;j.rotation.z=Math.sin(t*.2+i)*.05}})
    seabed.children.forEach(o=>{const m=(o as THREE.Mesh).material as THREE.MeshBasicMaterial;m.opacity=bottom*.82})
    camera.position.y+=((-ocean*.9-deep*.6)-camera.position.y)*.018
    renderer?.render(scene,camera);frame=requestAnimationFrame(render)}
  render()
})

onBeforeUnmount(()=>{cancelAnimationFrame(frame);if(onResize)window.removeEventListener('resize',onResize);if(onScroll)window.removeEventListener('scroll',onScroll);disposables.forEach(x=>x.dispose());renderer?.dispose()})
</script>

<template><canvas id="underwater-world-canvas" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none" /></template>
