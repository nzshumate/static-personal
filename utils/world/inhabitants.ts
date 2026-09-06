import * as THREE from 'three'
import { batchStaticGroup as bake } from './batching'
import { textured } from './surfaces'
import { makeRng } from './math'

type V = [number, number, number]
const material = (color: number, roughness = 0.75) => new THREE.MeshStandardMaterial({ color, roughness })
const ball = (g: THREE.Object3D, m: THREE.Material, p: V, s: V) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), m)
  mesh.position.set(...p); mesh.scale.set(...s); g.add(mesh); return mesh
}
const line = (g: THREE.Object3D, m: THREE.Material, points: V[], radius: number) => {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false), m)
  g.add(mesh); return mesh
}
const face = (g: THREE.Object3D, m: THREE.Material, points: V[], indices: number[]) => {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  // One winding per triangle preserves normals; DoubleSide handles thin fabric and leaves.
  const seen = new Set<string>(), triangles: number[] = []
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = indices.slice(i, i + 3)
    const key = [...triangle].sort((a,b) => a-b).join(',')
    if (!seen.has(key)) { seen.add(key); triangles.push(...triangle) }
  }
  m.side = THREE.DoubleSide
  geo.setIndex(triangles); geo.computeVertexNormals()
  const mesh = new THREE.Mesh(geo, m); g.add(mesh); return mesh
}
export const makeTent = () => {
  const g = new THREE.Group()
  const red = textured(0xa83729, 'cloth', { side: THREE.DoubleSide })
  const inner = material(0x261912)
  const seam = material(0xe2b28a)
  face(g, red, [[-.65,0,.6],[0,.9,.6],[.65,0,.6],[-.65,0,-.6],[0,.9,-.6],[.65,0,-.6]], [0,3,4,0,4,1,1,4,5,1,5,2,3,5,4])
  face(g, inner, [[-.58,.02,-.575],[0,.83,-.575],[.58,.02,-.575]], [0,1,2])
  face(g, red, [[-.65,0,.61],[0,.9,.61],[-.42,.02,.7],[.65,0,.61],[.42,.02,.7]], [0,1,2,1,3,4])
  for (const z of [-.61,.62]) {
    line(g,seam,[[-.65,0,z],[0,.91,z],[.65,0,z]],.013)
    for (const side of [-1,1]) {
      line(g,seam,[[side*.36,.48,z],[side*.96,.015,z*1.4]],.006)
      line(g,material(0x56534a),[[side*.96,0,z*1.4],[side*.96,.06,z*1.4]],.014)
    }
  }
  line(g,seam,[[0,.91,-.6],[0,.91,.6]],.012)
  const bed = new THREE.Mesh(new THREE.CapsuleGeometry(.15,.5,4,10),material(0xb69e74))
  bed.rotation.x=Math.PI/2;bed.position.set(-.12,.12,.02);bed.scale.set(.8,1,.7);g.add(bed)
  const floor=new THREE.Mesh(new THREE.BoxGeometry(1.12,.025,1.1),textured(0x71684c,'cloth'));floor.position.y=.022;g.add(floor)
  const pillow=ball(g,material(0xd5c3a6),[-.12,.105,-.32],[.16,.065,.1])
  pillow.rotation.y=.12
  for(let i=0;i<6;i++)line(g,seam,[[-.23,.16,-.2+i*.09],[-.12,.19,-.2+i*.09],[-.01,.16,-.2+i*.09]],.003)
  const pack=ball(g,textured(0x596448,'cloth'),[.3,.17,-.14],[.13,.17,.08])
  line(g,seam,[[.22,.14,-.052],[.22,.27,-.052],[.37,.27,-.052],[.37,.14,-.052]],.006)
  const glass=new THREE.MeshStandardMaterial({color:0xf0bc6e,emissive:0xffb44b,emissiveIntensity:.9,roughness:.35})
  const lantern=new THREE.Mesh(new THREE.CylinderGeometry(.038,.038,.09,12),glass);lantern.position.set(.31,.095,.38);g.add(lantern)
  for(const y of [.045,.145]){const lid=new THREE.Mesh(new THREE.CylinderGeometry(.047,.047,.016,12),material(0x383c32));lid.position.set(.31,y,.38);g.add(lid)}
  line(g,seam,[[.275,.15,.38],[.28,.21,.38],[.34,.21,.38],[.345,.15,.38]],.004)
  for(const side of [-1,1]) {
    ball(g,textured(0x584431,'cloth'),[.32+side*.045,.046,.76],[.039,.044,.09])
    line(g,seam,[[side*.42,.03,.705],[side*.23,.45,.66],[0,.9,.615]],.006)
  }
  const baked=bake(g)
  const lamp=new THREE.PointLight(0xffb66e,.45,1.8,2);lamp.position.set(.25,.25,.25);baked.add(lamp)
  return baked
}

export const makeEvergreen = (seed: number) => {
  const random=makeRng(7193+seed*137), coverage=.22+random()*.42, wind=random()*Math.PI*2
  const g = new THREE.Group(), bark=textured(0x574737,'wood'), green=material(0x29483e), snow=material(0xdbe5e8)
  g.add(new THREE.Mesh(tapered([[0,0,0],[.02,1.2,0],[0,2.7,0]],[.065,.039,.003],1,24),bark))
  for(let tier=0;tier<11;tier++) {
    const y=.35+tier*.218, radius=Math.pow(1-tier/11,.9)*(.62+random()*.2)
    for(let b=0;b<7;b++) {
      const a=b/7*Math.PI*2+tier*.63+seed
      const dx=Math.cos(a),dz=Math.sin(a)
      line(g,bark,[[0,y+.15,0],[dx*radius*.5,y,dz*radius*.5],[dx*radius,y+.08,dz*radius]],.013)
      for(let k=1;k<5;k++) {
        const r=radius*k/5, width=radius*.28*(1-k/6)
        for(const side of [-1,1]) {
          const p:V=[dx*r,y+.04,dz*r]
          const q:V=[dx*(r+radius*.2)-dz*width*side,y-.035,dz*(r+radius*.2)+dx*width*side]
          const tip:V=[dx*(r+radius*.32),y+.11,dz*(r+radius*.32)]
          face(g,green,[p,q,tip],[0,1,2,2,1,0])
        }
        if(k<4 && random()<coverage*(.75+Math.cos(a-wind)*.35)) {
          const drift=.6+random()*.9
          const patch=ball(g,snow,[dx*r+(random()-.5)*.025,y+.085+random()*.025,dz*r],[width*drift,.014+random()*.03,width*(.45+random()*.65)])
          patch.rotation.y=a+random()*.4
        }
      }
    }
  }
  for(let i=0;i<7;i++) {
    const a=i/7*Math.PI*2
    face(g,green,[[0,2.72,0],[Math.cos(a)*.07,2.47,Math.sin(a)*.07],[Math.cos(a+.7)*.055,2.5,Math.sin(a+.7)*.055]],[0,1,2])
  }
  return bake(g)
}

export const makeSnowman = () => {
  const g=new THREE.Group(),snow=material(0xe5edf0),coal=material(0x262b30),cloth=textured(0xb34030,'cloth'),twig=material(0x59432b)
  ball(g,snow,[0,.23,0],[.25,.25,.23]);ball(g,snow,[0,.52,0],[.19,.2,.18]);ball(g,snow,[0,.77,0],[.145,.15,.14])
  for(const x of [-.049,.049])ball(g,coal,[x,.81,.132],[.018,.018,.01])
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.035,.16,10),material(0xd9762d));nose.rotation.x=Math.PI/2;nose.position.set(0,.767,.2);g.add(nose)
  for(let i=0;i<5;i++)ball(g,coal,[(i-2)*.025,.715+Math.abs(i-2)*.008,.129],[.008,.008,.008])
  for(const y of [.38,.49,.59])ball(g,coal,[0,y,.178],[.02,.02,.012])
  const scarf=new THREE.Mesh(new THREE.TorusGeometry(.148,.029,8,24),cloth);scarf.rotation.x=Math.PI/2;scarf.position.y=.655;g.add(scarf)
  line(g,cloth,[[.08,.65,.13],[.14,.55,.17],[.1,.42,.18]],.032)
  for(const s of [-1,1]){line(g,twig,[[s*.13,.54,0],[s*.32,.6,0],[s*.43,.7,.02]],.014);line(g,twig,[[s*.32,.6,0],[s*.4,.59,.04]],.01)}
  const hat=new THREE.Mesh(new THREE.CylinderGeometry(.115,.12,.15,20),coal);hat.position.y=.94;g.add(hat)
  const brim=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.025,24),coal);brim.position.y=.87;g.add(brim)
  return bake(g)
}

export const makeGlider = () => {
  const g=new THREE.Group(),cream=material(0xb52822,.38),red=material(0x761c19,.4),glass=material(0x2d5665,.16)
  ball(g,cream,[0,0,0],[.56,.065,.075]);ball(g,glass,[.22,.053,0],[.17,.053,.058])
  for(const s of [-1,1]) {
    face(g,cream,[[.12,0,0],[-.12,0,0],[-.19,.055,s*1.5],[-.08,.06,s*1.5]],[0,1,2,0,2,3,2,1,0,3,2,0])
    face(g,red,[[-.19,.055,s*1.5],[-.08,.06,s*1.5],[-.1,.08,s*1.7],[-.19,.08,s*1.7]],[0,1,2,0,2,3,2,1,0,3,2,0])
    ball(g,cream,[-.44,.045,s*.18],[.12,.017,.25])
  }
  face(g,red,[[-.53,0,0],[-.5,.28,0],[-.36,.03,0]],[0,1,2,2,1,0])
  return bake(g)
}

export const makeScorpion = () => {
  const g=new THREE.Group(),shell=material(0x685039,.5),joint=material(0x35281f),legs:THREE.Group[]=[],claws:THREE.Group[]=[]
  ball(g,shell,[0,.1,0],[.2,.08,.105])
  for(let i=0;i<6;i++)ball(g,shell,[-.07-i*.043,.11,0],[.042,.067-i*.004,.103-i*.008])
  for(const s of [-1,1]) {
    for(let i=0;i<4;i++) {
      const leg=new THREE.Group();leg.position.set(.1-i*.085,.1,s*.065)
      line(leg,shell,[[0,0,0],[.06-i*.035,.04,s*.16],[.08-i*.06,-.095,s*.26]],.012);g.add(leg);legs.push(leg)
    }
    const claw=new THREE.Group();g.add(claw);claws.push(claw)
    line(claw,shell,[[.14,.1,s*.07],[.26,.14,s*.16],[.37,.12,s*.19]],.022)
    ball(claw,shell,[.4,.12,s*.19],[.065,.035,.048])
    for(const q of [-1,1])line(claw,shell,[[.42,.12,s*.19+q*.035],[.51,.125,s*.19+q*.032],[.535,.12,s*.19]],.012)
  }
  const tail=new THREE.Group();tail.position.set(-.26,.1,0);g.add(tail)
  for(let i=0;i<7;i++){const a=i/6*Math.PI*.85;ball(tail,shell,[-Math.sin(a)*.17,.045+i*.045,0],[.043,.039,.036])}
  line(tail,joint,[[-.077,.315,0],[.0,.34,0],[.055,.28,0]],.013)
  for(const s of [-1,1])ball(g,joint,[.175,.158,s*.035],[.012,.012,.01])
  return {group:g,update:(t:number)=>{const phase=t%14,alert=THREE.MathUtils.smoothstep(phase,6,7)*(1-THREE.MathUtils.smoothstep(phase,9,10));legs.forEach((leg,i)=>{leg.rotation.y=Math.sin(t*14+i*Math.PI*.7)*.22*(1-alert);leg.rotation.x=Math.cos(t*14+i*Math.PI*.7)*.06*(1-alert)});claws.forEach((claw,i)=>{claw.rotation.z=alert*.38;claw.rotation.y=(i?1:-1)*(alert*.2+Math.sin(t*3)*.035)});tail.rotation.x=Math.sin(t*1.7)*.1;tail.rotation.z=-alert*.55-Math.exp(-Math.pow((phase-8.5)*7,2))*.5}}
}

export const makeShell = (kind: number) => {
  const g=new THREE.Group(),ivory=material(kind%2 ? 0xdcc7a7 : 0xe7c6b9,.48),ridge=material(0xf4e1c5,.5)
  if(kind%3===0) {
    for(let i=0;i<28;i++) {
      const a=i*.36,r=.025+i*.006
      ball(g,ivory,[Math.cos(a)*r,.045+i*.003,Math.sin(a)*r],[.045+i*.002,.04,.045+i*.002])
    }
    ball(g,material(0x93674e),[.17,.04,-.06],[.075,.017,.1])
  } else {
    for(let i=0;i<17;i++) {
      const a=-1.28+i/16*2.56,points:V[]=[]
      for(let k=0;k<8;k++){const r=k/7*.3;points.push([Math.sin(a)*r,.018+Math.sin(k/7*Math.PI)*.08,Math.cos(a)*r])}
      line(g,i%2?ivory:ridge,points,.013)
    }
    ball(g,ivory,[0,.02,.13],[.19,.026,.16])
  }
  return bake(g)
}

// Smooth, tapered anatomy with elliptical cross sections, shared by limbs and tails.
const tapered = (points: V[], radii: number[], depth = 1, segments = 40) => {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
  const frames = curve.computeFrenetFrames(segments, false), vertices: number[] = [], uv: number[] = [], indices: number[] = []
  for (let i=0;i<=segments;i++) {
    const t=i/segments, p=curve.getPointAt(t), f=t*(radii.length-1), j=Math.min(radii.length-2,Math.floor(f))
    const radius=THREE.MathUtils.lerp(radii[j]!,radii[j+1]!,f-j)
    for(let k=0;k<=24;k++) {
      const a=k/24*Math.PI*2
      const v=p.clone().addScaledVector(frames.normals[i]!,Math.cos(a)*radius).addScaledVector(frames.binormals[i]!,Math.sin(a)*radius*depth)
      vertices.push(v.x,v.y,v.z);uv.push(k/24,t)
      if(i<segments&&k<24){const n=i*25+k;indices.push(n,n+25,n+1,n+1,n+25,n+26)}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo
}

const shellTexture = () => {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512
  const ctx=canvas.getContext('2d')!;ctx.fillStyle='#29352a';ctx.fillRect(0,0,512,512)
  for(let row=-1;row<7;row++)for(let col=-1;col<7;col++) {
    const x=col*102+(row%2)*51,y=row*86
    ctx.beginPath()
    for(let k=0;k<6;k++){const a=k*Math.PI/3+Math.PI/6;ctx.lineTo(x+Math.cos(a)*56,y+Math.sin(a)*56)}
    ctx.closePath()
    const shade=ctx.createRadialGradient(x-12,y-15,2,x,y,60)
    shade.addColorStop(0,'#a09862');shade.addColorStop(.55,'#696b43');shade.addColorStop(1,'#3d4930')
    ctx.fillStyle=shade;ctx.fill();ctx.strokeStyle='#b0a675';ctx.lineWidth=2;ctx.stroke()
    ctx.save();ctx.clip()
    for(let i=0;i<32;i++) {
      const a=i/32*Math.PI*2,r=35+Math.sin(i*8+col)*15
      ctx.beginPath();ctx.moveTo(x+Math.cos(a)*8,y+Math.sin(a)*8);ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r)
      ctx.strokeStyle=i%2?'rgba(40,45,22,.22)':'rgba(205,184,112,.22)';ctx.lineWidth=1;ctx.stroke()
    }
    ctx.restore()
  }
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;return map
}

const paddle = (side: number, length: number) => {
  const vertices:number[]=[],indices:number[]=[],uv:number[]=[]
  for(let i=0;i<=20;i++)for(let j=0;j<=8;j++) {
    const t=i/20,w=(.06+Math.sin(Math.PI*t)*.115)*(1-t*.65), across=j/8*2-1
    vertices.push(-t*t*.28+across*w,Math.sin(t*Math.PI)*.025+(1-across*across)*.018,side*t*length)
    uv.push(j/8,t)
    if(i<20&&j<8){const n=i*9+j;indices.push(n,n+9,n+1,n+1,n+9,n+10)}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo
}

export const makeTurtle = () => {
  const g=new THREE.Group(),skin=textured(0x899078,'stone',{roughness:.65}),dark=material(0x3c4630),rim=material(0xb4ac7a),eye=material(0x14201c,.16)
  const carapace=new THREE.MeshStandardMaterial({map:shellTexture(),roughness:.48})
  const geo=new THREE.SphereGeometry(1,64,32,0,Math.PI*2,0,Math.PI/2)
  const pos=geo.getAttribute('position'),uv=geo.getAttribute('uv')
  for(let i=0;i<pos.count;i++)uv.setXY(i,.5+pos.getX(i)*.49,.5+pos.getZ(i)*.49)
  const shell=new THREE.Mesh(geo,carapace);shell.scale.set(.56,.205,.39);shell.position.set(-.035,.015,0);g.add(shell)
  ball(g,rim,[-.035,-.025,0],[.55,.075,.385])
  line(g,dark,[[-.48,-.058,0],[-.2,-.098,0],[.2,-.09,0],[.46,-.057,0]],.003)
  for (const x of [-.3,-.12,.08,.27]) for (const side of [-1,1]) {
    line(g,dark,[[x,-.096,0],[x+.02,-.076,side*.2],[x+.04,-.041,side*.31]],.003)
  }
  const edge:V[]=Array.from({length:49},(_,i)=>[-.035+Math.cos(i/48*Math.PI*2)*.553,.015,Math.sin(i/48*Math.PI*2)*.387])
  line(g,dark,edge,.009)
  for(let i=0;i<26;i++) {
    const a=i/26*Math.PI*2
    line(g,dark,[[-.035+Math.cos(a)*.51,-.015,Math.sin(a)*.35],[-.035+Math.cos(a)*.55,.019,Math.sin(a)*.386]],.004)
  }
  const neck=new THREE.Mesh(tapered([[.38,-.01,0],[.54,.015,0],[.65,.02,0]],[.095,.083,.09],.9),skin);g.add(neck)
  const head=ball(g,skin,[.69,.028,0],[.135,.097,.102]);head.rotation.z=-.07
  ball(g,rim,[.755,-.017,0],[.083,.04,.078])
  for(const side of [-1,1]) {
    ball(g,dark,[.726,.064,side*.086],[.028,.026,.012]);ball(g,eye,[.731,.066,side*.096],[.018,.019,.008]);ball(g,rim,[.737,.073,side*.102],[.004,.005,.002])
    line(g,dark,[[.805,.002,side*.035],[.777,-.013,side*.07],[.711,-.018,side*.078]],.003)
    ball(g,dark,[.796,.054,side*.029],[.006,.005,.003])
    for(let i=0;i<7;i++)ball(g,dark,[.62+(i%3)*.043,.098-Math.floor(i/3)*.014,side*(.025+Math.floor(i/3)*.023)],[.013,.003,.009])
  }
  const flippers:{group:THREE.Group,side:number,front:boolean}[]=[]
  for(const side of [-1,1])for(const front of [true,false]) {
    const f=new THREE.Group();f.position.set(front?.3:-.4,-.035,side*(front?.25:.22));g.add(f)
    const finMat=textured(0x899078,'stone',{roughness:.7,side:THREE.DoubleSide})
    f.add(new THREE.Mesh(paddle(side,front?.66:.31),finMat))
    for(let i=1;i<7;i++) {
      const t=i/8
      line(f,dark,[[-t*t*.28-.04,.025,side*t*(front?.66:.31)],[-t*t*.28,.035,side*(t+.025)*(front?.66:.31)],[-t*t*.28+.04,.025,side*t*(front?.66:.31)]],.003)
    }
    flippers.push({group:f,side,front})
  }
  g.add(new THREE.Mesh(tapered([[-.49,-.02,0],[-.58,-.02,0],[-.64,-.015,0]],[.035,.022,.001],1,16),skin))
  return {group:g,update:(t:number)=>{
    flippers.forEach(({group,side,front})=>{
      const stroke=t*1.05+(front?0:.65)
      group.rotation.x=side*(Math.sin(stroke)*(front?.38:.12)-.08)
      group.rotation.y=side*Math.cos(stroke)*(front?.12:.07)
      group.rotation.z=Math.sin(stroke-.5)*(front?.045:.025)
    })
  }}
}

export const makeMermaid = () => {
  const g=new THREE.Group(),skin=material(0xbc9380,.72),hair=material(0x4b2c25,.7),eye=material(0x343c38),lip=material(0x996f68)
  const scales=new THREE.MeshStandardMaterial({color:0x42786f,metalness:.22,roughness:.43})
  scales.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vScaleUv;').replace('#include <uv_vertex>','#include <uv_vertex>\nvScaleUv=uv;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vScaleUv;').replace('#include <color_fragment>',`#include <color_fragment>
      vec2 cell=vScaleUv*vec2(30.0,42.0);cell.x+=mod(floor(cell.y),2.0)*0.5;
      vec2 f=fract(cell)-0.5;
      float arc=smoothstep(0.025,0.08,abs(length(vec2(f.x,f.y*.85+0.17))-0.47));
      diffuseColor.rgb*=mix(0.64,1.12,arc);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.17,0.3,0.28),vScaleUv.y*.35);`)
  }
  scales.customProgramCacheKey=()=> 'mermaid-scales-v2'
  const torso=new THREE.Mesh(tapered([[0,.3,0],[-.015,.43,0],[0,.57,0],[.012,.7,0]],[.137,.085,.124,.105],.7),skin);g.add(torso)
  g.add(new THREE.Mesh(tapered([[.012,.68,0],[.013,.755,0],[.014,.79,0]],[.049,.033,.041],.9,20),skin))
  const head=ball(g,skin,[.014,.867,.002],[.075,.105,.072])
  ball(g,skin,[.014,.815,.025],[.048,.042,.048])
  ball(g,hair,[.014,.91,-.024],[.081,.075,.071])
  const bodice=textured(0x596c70,'cloth',{roughness:.65})
  ball(g,bodice,[-.046,.587,.058],[.066,.063,.026]);ball(g,bodice,[.056,.587,.058],[.065,.063,.026])
  line(g,bodice,[[-.103,.58,0],[0,.545,.07],[.11,.58,0]],.016)
  const arms: THREE.Group[] = []
  for(const side of [-1,1]) {
    const arm=new THREE.Group();arm.position.set(.01+side*.106,.665,0);g.add(arm)
    arm.add(new THREE.Mesh(tapered([[0,0,0],[side*.065,-.1,.007],[side*.091,-.195,.038],[side*.135,-.27,.058]],[.037,.031,.023,.017],.85,28),skin))
    ball(arm,skin,[side*.138,-.29,.061],[.021,.034,.013])
    for(let finger=0;finger<4;finger++)arm.add(new THREE.Mesh(tapered([[side*(.123+finger*.01),-.305,.063],[side*(.123+finger*.011),-.331-finger%2*.005,.069],[side*(.127+finger*.011),-.343,.073]],[.005,.004,.001],.8,8),skin))
    line(arm,skin,[[side*.119,-.28,.069],[side*.106,-.302,.08]],.007)
    arm.userData.side=side;arms.push(arm)
    const x=.014+side*.027
    ball(g,skin,[x,.875,.065],[.022,.013,.007]);ball(g,eye,[x,.875,.071],[.012,.005,.002])
    line(g,hair,[[x-.017,.895,.061],[x,.899,.064],[x+.013,.896,.061]],.0025)
    ball(g,skin,[.014+side*.072,.86,0],[.011,.021,.013])
  }
  ball(g,skin,[.014,.853,.074],[.01,.022,.014])
  line(g,lip,[[0,.824,.061],[.014,.821,.065],[.028,.824,.061]],.003)
  const tailGeo=tapered([[0,.31,0],[.012,.12,0],[.06,-.15,.015],[.15,-.4,.028],[.19,-.66,.03]],[.138,.143,.115,.065,.018],.75,56)
  const tail=new THREE.Mesh(tailGeo,scales);g.add(tail)
  const rest=Float32Array.from(tailGeo.getAttribute('position').array)
  const fin=new THREE.Group();g.add(fin)
  const finMat=new THREE.MeshStandardMaterial({color:0x89a89c,metalness:.08,roughness:.45,side:THREE.DoubleSide,transparent:true,opacity:.76})
  for(const side of [-1,1]) {
    const vertices:number[]=[],indices:number[]=[]
    for(let i=0;i<=20;i++)for(let j=0;j<=12;j++) {
      const u=i/20,v=j/12
      const x=side*(u*.31),y=-Math.sin(u*Math.PI*.8)*(.06+v*.2),z=Math.sin(u*Math.PI)*Math.sin(v*Math.PI)*.035
      vertices.push(x,y,z)
      if(i<20&&j<12){const n=i*13+j;indices.push(n,n+13,n+1,n+1,n+13,n+14)}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();fin.add(new THREE.Mesh(geo,finMat))
    for(let k=0;k<7;k++)line(fin,scales,[[0,0,0],[side*.14,-(.03+k*.018),.01],[side*.29,-(.035+k*.02),0]],.002)
  }
  const locks:{mesh:THREE.Mesh,rest:Float32Array}[]=[]
  for(let i=0;i<18;i++) {
    const x=.014+(i-8.5)*.008
    const geo=tapered([[x,.936,-.035],[x*1.5,.8,-.06],[x*1.8+.018,.63,-.08],[x*2.1+.065,.49,-.105]],[.011,.012,.009,.001],.65,24)
    const mesh=new THREE.Mesh(geo,hair);g.add(mesh);locks.push({mesh,rest:Float32Array.from(geo.getAttribute('position').array)})
  }
  return {group:g,update:(t:number)=>{
    const attr=tailGeo.getAttribute('position')
    const bend=(y:number)=>{const w=THREE.MathUtils.clamp((.3-y)/.96,0,1);return Math.sin(t*1.1-w*2.1)*w*w*.09}
    for(let i=0;i<attr.count;i++)attr.setXYZ(i,rest[i*3]!+bend(rest[i*3+1]!),rest[i*3+1]!,rest[i*3+2]!)
    attr.needsUpdate=true;tailGeo.computeVertexNormals()
    fin.position.set(.19+bend(-.66),-.66,.03);fin.rotation.z=Math.sin(t*1.1-2.1)*.13;fin.rotation.x=Math.sin(t*1.1-2.7)*.16
    head.rotation.z=Math.sin(t*.4)*.015
    arms.forEach(arm=>{arm.rotation.z=Math.sin(t*.65+arm.userData.side)*.035;arm.rotation.x=Math.sin(t*.7)*.025})
    locks.forEach(({mesh,rest},i)=>{
      const p=mesh.geometry.getAttribute('position')
      for(let k=0;k<p.count;k++){const y=rest[k*3+1]!,w=Math.max(0,(.94-y)/.45);p.setXYZ(k,rest[k*3]!+Math.sin(t*.75-w*2+i*.13)*w*w*.027,y,rest[k*3+2]!+Math.sin(t*.6-w*2)*w*.018)}
      p.needsUpdate=true
    })
  }}
}

export const makeAlligator = () => {
  const group=new THREE.Group(),hide=textured(0x4e5940,'stone',{roughness:.72}),ridge=material(0x303d2b),belly=material(0x888568),mouth=material(0x51443a),tooth=material(0xc9c4a0)
  ball(group,hide,[-.12,0,0],[.62,.16,.25]);ball(group,belly,[.22,-.065,0],[.4,.085,.19])
  const armor=new THREE.Group()
  for(let row=0;row<13;row++)for(let col=-2;col<=2;col++) {
    const x=-.58+row*.078,z=col*.075,y=.15*Math.sqrt(Math.max(.05,1-(x/.7)**2-(z/.3)**2))
    const plate=ball(armor,hide,[x,y,z],[.035,.012,.031]);plate.rotation.z=-x*.1
    line(armor,ridge,[[x-.027,y+.008,z-.023],[x,y+.017,z],[x+.027,y+.008,z+.023]],.0025)
  }
  group.add(bake(armor))
  const tail=new THREE.Group();tail.position.x=-.52;group.add(tail)
  tail.add(new THREE.Mesh(tapered([[0,0,0],[-.38,-.01,.02],[-.8,-.02,.13],[-1.15,-.015,.17]],[.16,.115,.065,.001],.7),hide))
  for(let i=0;i<9;i++)for(const side of [-1,1]) {
    const x=-.58+i*.13
    const plate=new THREE.Mesh(new THREE.ConeGeometry(.035,.047,4),ridge)
    plate.position.set(x,.14-Math.abs(x)*.08,side*.075);plate.rotation.y=Math.PI/4;group.add(plate)
  }
  for(const side of [-1,1])for(const x of [-.4,.24]) {
    line(group,hide,[[x,-.035,side*.16],[x-.09,-.085,side*.32],[x+.05,-.12,side*.4]],.043)
    for(let k=0;k<3;k++)line(group,belly,[[x+.03,-.12,side*.38],[x+.13+k*.025,-.13,side*(.36+k*.03)]],.009)
  }
  ball(group,hide,[.43,.02,0],[.28,.115,.19])
  const lower=new THREE.Group();lower.position.set(.35,-.04,0);group.add(lower)
  ball(lower,hide,[.36,0,0],[.39,.055,.15]);ball(lower,mouth,[.34,.041,0],[.36,.008,.126])
  const upper=new THREE.Group();upper.position.set(.35,.055,0);group.add(upper)
  ball(upper,hide,[.35,.035,0],[.4,.075,.16]);ball(upper,mouth,[.35,-.025,0],[.36,.008,.13])
  for(const side of [-1,1]) {
    ball(upper,hide,[.075,.09,side*.115],[.075,.06,.05])
    ball(upper,material(0xc1ac5c,.4),[.09,.115,side*.151],[.025,.024,.01])
    ball(upper,material(0x131e17),[.092,.117,side*.159],[.005,.017,.003])
    ball(upper,ridge,[.66,.09,side*.06],[.018,.008,.012])
    for(let i=0;i<9;i++) {
      const x=.1+i*.065,z=side*(.115-Math.max(0,x-.45)*.12)
      for(const top of [false,true]) {
        const fang=new THREE.Mesh(new THREE.ConeGeometry(.01,.035+(i%3)*.008,6),tooth)
        fang.position.set(x,top?-.033:.063,z);if(top)fang.rotation.z=Math.PI
        ;(top?upper:lower).add(fang)
      }
    }
  }
  const tailMesh=tail.children[0] as THREE.Mesh
  const tailRest=Float32Array.from(tailMesh.geometry.getAttribute('position').array)
  // Small scutes sit on the snout ellipsoid, including its narrowing tip.
  for(let i=0;i<8;i++) for(const z of [-.055,0,.055]) {
    const x=.2+i*.065, surface=1-Math.pow((x-.35)/.4,2)-Math.pow(z/.16,2)
    if(surface>.08) ball(upper,ridge,[x,.035+.075*Math.sqrt(surface),z],[.018,.0025,.012])
  }
  return {group,update:(time:number,open:number,effort=0)=>{
    upper.rotation.z=open*.5;lower.rotation.z=-open*.13
    const attr=tailMesh.geometry.getAttribute('position')
    for(let i=0;i<attr.count;i++) {
      const x=tailRest[i*3]!,w=Math.min(1,Math.abs(x)/1.15)
      attr.setXYZ(i,x,tailRest[i*3+1]!,tailRest[i*3+2]!+Math.sin(time*(1.05+effort)-w*3)*w*w*(.07+effort*.07))
    }
    attr.needsUpdate=true;tailMesh.geometry.computeVertexNormals()
    tail.rotation.y=Math.sin(time*.8)*.03
  }}
}
