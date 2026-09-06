import * as THREE from 'three'
import { textured } from './surfaces'
import { batchStaticGroup } from './batching'

const matte = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...extra })
const sphere = (parent: THREE.Object3D, material: THREE.Material, at: number[], size: number[]) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), material)
  mesh.position.fromArray(at); mesh.scale.fromArray(size); parent.add(mesh)
  return mesh
}
const segment = (parent: THREE.Object3D, material: THREE.Material, radius: number) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.8, radius, 1, 10), material)
  parent.add(mesh); return mesh
}
const up = new THREE.Vector3(0, 1, 0)
const connect = (mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
  const direction = b.clone().sub(a)
  mesh.position.copy(a).add(b).multiplyScalar(0.5)
  mesh.scale.y = direction.length()
  mesh.quaternion.setFromUnitVectors(up, direction.normalize())
}

const quadruped = (fox: boolean) => {
  const group = new THREE.Group()
  const coat = textured(fox ? 0xad5428 : 0x61422e, 'cloth')
  const dark = matte(fox ? 0x332c26 : 0x392a21)
  const cream = matte(fox ? 0xe6d9b9 : 0x947659)
  const black = matte(0x101416, { roughness: 0.3 })
  const body = new THREE.Group(); group.add(body)
  sphere(body, coat, [0, 0.32, 0], fox ? [0.24,0.115,0.105] : [0.32,0.22,0.19])
  sphere(body, coat, [0.14,0.38,0], fox ? [0.12,0.14,0.1] : [0.18,0.235,0.19])
  sphere(body, cream, [0.18,0.29,0], fox ? [0.085,0.115,0.092] : [0.07,0.13,0.14])
  const head = new THREE.Group(); head.position.set(fox ? 0.24 : 0.32,0.44,0); body.add(head)
  sphere(head, coat, [0,0,0], fox ? [0.09,0.09,0.075] : [0.145,0.14,0.13])
  sphere(head, cream, [fox ? 0.085 : 0.12,-0.035,0], fox ? [0.09,0.036,0.045] : [0.095,0.065,0.077])
  sphere(head, black, [fox ? 0.16 : 0.2,-0.028,0], fox ? [0.02,0.016,0.026] : [0.027,0.025,0.041])
  for (const side of [-1,1]) {
    sphere(head, black, [0.045,0.018,side * (fox ? 0.066 : 0.117)], [0.013,0.012,0.008])
    sphere(head, matte(0xe7d4a2), [0.05,0.022,side * (fox ? 0.072 : 0.124)], [0.0035,0.0035,0.002])
    const ear = new THREE.Mesh(fox ? new THREE.ConeGeometry(0.038,0.11,12) : new THREE.SphereGeometry(0.042,12,10), coat)
    ear.position.set(-0.035,fox ? 0.107 : 0.125,side * (fox ? 0.055 : 0.085)); head.add(ear)
    sphere(head, dark, [-0.015,fox ? 0.105 : 0.127,side * (fox ? 0.057 : 0.085)], [0.011,fox ? 0.032 : 0.022,0.022])
  }
  const tail = new THREE.Group(); tail.position.set(fox ? -0.22 : -0.3,0.34,0); body.add(tail)
  if (fox) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(-0.15,-0.035,0),new THREE.Vector3(-0.32,-0.1,0),new THREE.Vector3(-0.46,-0.045,0)])
    const geometry = new THREE.TubeGeometry(curve,24,0.07,12,false)
    const pos = geometry.attributes.position as THREE.BufferAttribute
    const colors: number[] = []
    for (let i=0;i<pos.count;i++) {
      const c = pos.getX(i)<-0.33 ? new THREE.Color(0xe9dec3) : new THREE.Color(0xac5125)
      colors.push(c.r,c.g,c.b)
    }
    geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
    tail.add(new THREE.Mesh(geometry,matte(0xffffff,{vertexColors:true})))
  } else sphere(tail,coat,[-0.02,0,0],[0.05,0.045,0.04])
  const legs = Array.from({length:4},(_,i) => {
    const upper=segment(group,coat,fox ? 0.025 : 0.057)
    const lower=segment(group,dark,fox ? 0.018 : 0.038)
    const paw=new THREE.Group(); group.add(paw)
    sphere(paw,dark,[0.025,0.025,0],fox ? [0.042,0.024,0.027] : [0.071,0.037,0.055])
    if (!fox) for(let j=0;j<3;j++) sphere(paw,matte(0xa2977b),[0.083,0.019,(j-1)*0.027],[0.021,0.006,0.006])
    return {upper,lower,paw,x:i<2 ? 0.17 : -0.18,z:(i%2 ? -1:1)*(fox ? 0.072:0.135)}
  })
  group.userData.animate = (distance: number, time: number, speed: number) => {
    const stride=fox ? 0.12:0.14
    const cycle=distance/(stride*2)
    body.position.y=Math.cos(cycle*Math.PI*4)*0.009
    body.rotation.x=Math.sin(cycle*Math.PI*2)*0.025
    head.rotation.y=Math.sin(time*0.37)*0.11
    head.rotation.z=-0.05+Math.sin(time*0.63)*0.025
    tail.rotation.y=Math.sin(cycle*Math.PI*2-0.6)*(fox ? 0.16:0.05)
    const offsets=fox ? [0,0.5,0.5,0] : [0,0.5,0.75,0.25]
    legs.forEach((leg,i)=>{
      const p=(cycle+offsets[i]!)%1
      const stance=p<0.62
      const swing=stance ? p/0.62 : (p-0.62)/0.38
      const travel=stance ? 1-swing*2 : -Math.cos(swing*Math.PI)
      const lift=stance ? 0 : Math.sin(swing*Math.PI)*(fox ? 0.065:0.055)
      const foot=new THREE.Vector3(leg.x+travel*stride,0.018+lift,leg.z)
      foot.y += group.userData.groundAt?.(foot.x,foot.z) ?? 0
      const hip=new THREE.Vector3(leg.x,0.33+body.position.y,leg.z*0.83)
      const knee=hip.clone().lerp(foot,0.52)
      knee.x += i<2 ? 0.035 : -0.055
      knee.z += Math.sign(leg.z)*0.015
      connect(leg.upper,hip,knee); connect(leg.lower,knee,foot)
      leg.paw.position.copy(foot); leg.paw.rotation.z=stance ? 0 : -Math.sin(swing*Math.PI)*0.18
    })
    body.scale.y=1+Math.sin(time*1.8)*0.007*(1-Math.min(speed,1))
  }
  group.userData.animate(0,0,0)
  return group
}
export const makeBear = () => quadruped(false)
export const makeFox = () => quadruped(true)

export const makeSkier = () => {
  const group=new THREE.Group(), torso=new THREE.Group(); group.add(torso)
  const jacket=textured(0xb73730,'cloth'), pants=matte(0x26343f), trim=matte(0xddd8c8)
  const equipment=matte(0x252b33,{roughness:0.3,metalness:0.4})
  const hip=sphere(torso,pants,[0,0,0],[0.058,0.045,0.064])
  const chest=sphere(torso,jacket,[0.045,0.13,0],[0.079,0.135,0.068]); chest.rotation.z=-0.22
  sphere(torso,jacket,[-0.025,0.15,0],[0.051,0.087,0.065])
  const zip=new THREE.Mesh(new THREE.BoxGeometry(0.003,0.16,0.004),trim); zip.position.set(0.109,0.15,0); zip.rotation.z=-0.22; torso.add(zip)
  const head=new THREE.Group(); head.position.set(0.09,0.285,0); torso.add(head)
  sphere(head,matte(0xd2ae91),[0,0,0],[0.049,0.054,0.044])
  const helmet=new THREE.Mesh(new THREE.SphereGeometry(0.059,20,14,0,Math.PI*2,0,Math.PI*0.68),equipment); helmet.position.y=0.01; head.add(helmet)
  const goggles=sphere(head,matte(0x92b6c7,{metalness:0.65,roughness:0.12}),[0.04,0.006,0],[0.025,0.024,0.05])
  for(const side of [-1,1]) {
    const strap=new THREE.Mesh(new THREE.BoxGeometry(0.075,0.012,0.008),trim); strap.position.set(-0.006,0.006,side*0.049); head.add(strap)
  }
  const limbs=([-1,1] as const).map(side=>{
    const z=side*0.08
    const skiShape=new THREE.Shape(); skiShape.moveTo(-0.46,-0.028); skiShape.lineTo(0.4,-0.028); skiShape.quadraticCurveTo(0.55,0,0.4,0.028); skiShape.lineTo(-0.46,0.028); skiShape.quadraticCurveTo(-0.53,0,-0.46,-0.028)
    const geometry=new THREE.ExtrudeGeometry(skiShape,{depth:0.012,bevelEnabled:true,bevelSize:0.003,bevelThickness:0.002,bevelSegments:2,steps:1})
    geometry.rotateX(Math.PI/2)
    const position=geometry.attributes.position as THREE.BufferAttribute
    for(let i=0;i<position.count;i++) if(position.getX(i)>0.34) position.setY(i,position.getY(i)+Math.pow((position.getX(i)-0.34)/0.2,2)*0.065)
    geometry.computeVertexNormals()
    const ski=new THREE.Mesh(geometry,matte(side<0 ? 0xc9b775:0x9f4134,{roughness:0.35})); ski.position.set(0,0.015,z); group.add(ski)
    const binding=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.025,0.05),equipment); binding.position.set(0,0.035,z); group.add(binding)
    const boot=sphere(group,equipment,[0.018,0.075,z],[0.07,0.045,0.035])
    const thigh=segment(group,pants,0.031), shin=segment(group,pants,0.025)
    const arm=segment(group,jacket,0.025), forearm=segment(group,jacket,0.021)
    const glove=sphere(group,equipment,[0,0,0],[0.023,0.024,0.02])
    const pole=segment(group,matte(0xa1b4c0,{metalness:0.7,roughness:0.3}),0.0035)
    const basket=new THREE.Mesh(new THREE.TorusGeometry(0.017,0.003,5,12),equipment); basket.rotation.x=Math.PI/2; group.add(basket)
    return {side,z,thigh,shin,arm,forearm,glove,pole,basket,ski,boot}
  })
  return {group,update:(time:number)=>{
    const turn=Number(group.userData.turn ?? Math.sin(time*1.2))
    const compression=0.015+Math.abs(turn)*0.035
    torso.position.set(-0.025,0.31-compression,turn*0.045)
    torso.rotation.x=turn*0.11
    limbs.forEach(l=>{
      const hipAt=new THREE.Vector3(-0.025,torso.position.y,turn*0.045+l.z*0.65)
      const knee=new THREE.Vector3(0.075,0.2-compression*0.4,l.z+turn*0.023)
      connect(l.thigh,hipAt,knee); connect(l.shin,knee,new THREE.Vector3(0.01,0.09,l.z))
      const shoulder=new THREE.Vector3(0.01,torso.position.y+0.2,l.side*0.078+turn*0.04)
      const elbow=new THREE.Vector3(0.09,torso.position.y+0.09,l.side*0.12)
      const hand=new THREE.Vector3(0.18,torso.position.y+0.11,l.side*0.14)
      connect(l.arm,shoulder,elbow); connect(l.forearm,elbow,hand); l.glove.position.copy(hand)
      const tip=new THREE.Vector3(-0.2,0.018,l.side*0.22)
      connect(l.pole,hand,tip); l.basket.position.copy(tip).y+=0.025
      l.ski.rotation.x=turn*0.08
    })
  }}
}

export const makeFrog = () => {
  const group=new THREE.Group()
  const skin=matte(0x52764b,{roughness:0.43}), bellyMat=matte(0xc8c392,{roughness:0.65})
  const body=sphere(group,skin,[0,0.075,0],[0.095,0.058,0.071])
  sphere(group,bellyMat,[0.025,0.047,0],[0.075,0.025,0.061])
  sphere(group,skin,[0.072,0.092,0],[0.065,0.035,0.068])
  const throat=sphere(group,bellyMat,[0.097,0.058,0],[0.031,0.024,0.044])
  const eyes: THREE.Mesh[]=[]
  for(const side of [-1,1]) {
    sphere(group,skin,[0.067,0.12,side*0.042],[0.027,0.028,0.025])
    const eye=sphere(group,matte(0xb3a452,{roughness:0.23}),[0.08,0.126,side*0.05],[0.018,0.019,0.019])
    const pupil=sphere(group,matte(0x111b16,{roughness:0.15}),[0.092,0.128,side*0.057],[0.008,0.005,0.012]); eyes.push(pupil)
    sphere(group,matte(0xf1efe2),[0.097,0.136,side*0.062],[0.003,0.003,0.003])
    const haunch=sphere(group,skin,[-0.06,0.052,side*0.073],[0.063,0.039,0.035]); haunch.rotation.y=-side*0.45
    const shin=segment(group,skin,0.013); connect(shin,new THREE.Vector3(-0.103,0.038,side*0.086),new THREE.Vector3(-0.029,0.014,side*0.11))
    const arm=segment(group,skin,0.011); connect(arm,new THREE.Vector3(0.056,0.072,side*0.046),new THREE.Vector3(0.095,0.012,side*0.081))
    for(let toe=0;toe<3;toe++) {
      for(const rear of [false,true]) {
        const start=new THREE.Vector3(rear ? -0.028:0.095,0.01,side*(rear ? 0.11:0.081))
        const end=start.clone().add(new THREE.Vector3(0.026+(toe===1?0.01:0),-0.002,(toe-1)*0.015))
        const digit=segment(group,skin,0.003); connect(digit,start,end)
        sphere(group,skin,end.toArray(),[0.006,0.003,0.005])
      }
    }
    const mouth=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.12,0.077,0),new THREE.Vector3(0.12,0.077,side*0.034),new THREE.Vector3(0.08,0.074,side*0.061)]),12,0.0015,4,false),matte(0x31462c)); group.add(mouth)
  }
  const spotMat=matte(0x304f33,{roughness:0.45})
  for(let i=0;i<16;i++) {
    const x=-0.067+(i%4)*0.032,z=(Math.floor(i/4)-1.5)*0.025
    const y=0.075+0.058*Math.sqrt(Math.max(0,1-x*x/0.009-z*z/0.005))
    sphere(group,spotMat,[x,y,z],[0.008+(i%3)*0.002,0.002,0.006])
  }
  group.userData.animate=(time:number,phase:number)=>{
    const breath=0.5+0.5*Math.sin(time*2.3+phase)
    throat.scale.y=0.024+Math.pow(breath,3)*0.012
    body.scale.y=0.058+breath*0.0015
    const blink=Math.pow(Math.max(0,Math.sin(time*0.6+phase)),60)
    eyes.forEach(eye=>eye.scale.y=0.005*(1-blink*0.85))
  }
  return group
}

export const makeMushroom = (random:()=>number) => {
  const group=new THREE.Group()
  const h=0.14+random()*0.12, r=0.09+random()*0.07
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(0.023,0.035,h,12),textured(0xd1bea0,'wood')); stem.position.y=h/2; group.add(stem)
  const cap=sphere(group,textured(random()>0.55?0x9c4b32:0x987650,'stone',{roughness:0.7}),[0,h,0],[r,r*0.43,r])
  cap.rotation.z=(random()-.5)*.1
  const underside=new THREE.Mesh(new THREE.CircleGeometry(r*0.93,32),matte(0xcbbb9c,{side:THREE.DoubleSide})); underside.rotation.x=Math.PI/2; underside.position.y=h-0.015; group.add(underside)
  const gillMaterial=matte(0x9b856b)
  for(let i=0;i<22;i++) {
    const a=i/22*Math.PI*2
    const gill=segment(group,gillMaterial,0.0015)
    connect(gill,new THREE.Vector3(Math.cos(a)*0.03,h-0.017,Math.sin(a)*0.03),new THREE.Vector3(Math.cos(a)*r*0.88,h-0.017,Math.sin(a)*r*0.88))
  }
  const fleck=matte(0xe4d5b4)
  for(let i=0;i<14;i++) {
    const a=random()*Math.PI*2,d=Math.sqrt(random())*r*0.88
    sphere(group,fleck,[Math.cos(a)*d,h+Math.sqrt(1-d*d/(r*r))*r*0.43,Math.sin(a)*d],[0.008+random()*0.006,0.003,0.008])
  }
  const collar=new THREE.Mesh(new THREE.TorusGeometry(0.03,0.008,6,18),fleck); collar.rotation.x=Math.PI/2; collar.position.y=h*0.68; group.add(collar)
  return batchStaticGroup(group)
}

export const makeCampfire = (random:()=>number) => {
  const group=new THREE.Group()
  const wood=textured(0x38271c,'wood'),stone=textured(0x706a5d,'stone')
  for(let i=0;i<10;i++) {
    const a=i/10*Math.PI*2
    const rock=sphere(group,stone,[Math.cos(a)*0.42,0.065,Math.sin(a)*0.42],[0.095,0.064,0.077]); rock.rotation.y=a
  }
  for(let i=0;i<5;i++) {
    const a=i/5*Math.PI*2
    const log=segment(group,wood,0.055)
    connect(log,new THREE.Vector3(Math.cos(a)*0.32,0.055,Math.sin(a)*0.32),new THREE.Vector3(-Math.cos(a)*0.22,0.12,-Math.sin(a)*0.22))
    sphere(group,matte(0xa35223,{emissive:0xeb4312,emissiveIntensity:1.1}),[Math.cos(a)*0.18,0.09,Math.sin(a)*0.18],[0.05,0.024,0.04])
  }
  const flameMat=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},transparent:true,depthWrite:false,side:THREE.DoubleSide,
    vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`uniform float uTime;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){float y=vUv.y;float n=noise(vec2(vUv.x*7.,y*5.-uTime*2.6));float x=abs(vUv.x-.5+sin(y*9.-uTime*3.)*y*.055);float width=(1.-y)*.32+n*.10;float a=(1.-smoothstep(width*.45,width,x))*smoothstep(0.,.1,y)*(1.-smoothstep(.65+n*.25,1.,y));vec3 c=mix(vec3(2.8,1.6,.38),vec3(1.3,.16,.018),smoothstep(.08,.85,y));gl_FragColor=vec4(c,a*.8);}`
  })
  for(let i=0;i<3;i++) {
    const flame=new THREE.Mesh(new THREE.PlaneGeometry(0.66,0.8),flameMat); flame.position.y=0.4; flame.rotation.y=i*Math.PI/3; group.add(flame)
  }
  const light=new THREE.PointLight(0xff8b42,2.5,5,2); light.position.y=0.35; group.add(light)
  const positions=new Float32Array(36*3)
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.BufferAttribute(positions,3))
  const sparks=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffb45b,size:0.014,transparent:true,opacity:0.75,depthWrite:false,blending:THREE.AdditiveBlending})); group.add(sparks)
  return {group,update:(time:number)=>{
    flameMat.uniforms.uTime!.value=time
    light.intensity=2.2+Math.sin(time*7)*0.22+Math.sin(time*11.7)*0.18
    for(let i=0;i<36;i++) {
      const t=(time*(0.23+(i%5)*0.023)+i/36)%1
      positions[i*3]=Math.sin(i*2.4+t*4)*0.1+t*0.18; positions[i*3+1]=0.15+t*0.95; positions[i*3+2]=Math.cos(i*1.7+t*3)*0.11
    }
    geometry.attributes.position!.needsUpdate=true
  }}
}

export const makeBones = () => {
  const group=new THREE.Group(),bone=textured(0xc7b895,'stone'),socket=matte(0x453c2e)
  const spine=segment(group,bone,0.027); connect(spine,new THREE.Vector3(-0.48,0.06,0),new THREE.Vector3(0.25,0.1,0))
  for(let i=0;i<6;i++) {
    const x=-0.4+i*0.105, r=0.23-Math.abs(i-2)*0.018
    sphere(group,bone,[x,0.07,0],[0.044,0.034,0.048])
    for(const side of [-1,1]) {
      const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x,0.09,0),new THREE.Vector3(x,0.25,side*r*0.55),new THREE.Vector3(x+0.045,0.13,side*r),new THREE.Vector3(x+0.075,0.02,side*r*0.8)])
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,18,0.012,6,false),bone))
    }
  }
  const skull=new THREE.Group(); skull.position.set(0.42,0.07,0); skull.rotation.z=-0.12; group.add(skull)
  sphere(skull,bone,[0,0.035,0],[0.13,0.09,0.12]); sphere(skull,bone,[0.13,0,0],[0.15,0.045,0.065])
  for(const side of [-1,1]) {
    sphere(skull,socket,[0.025,0.055,side*0.101],[0.039,0.032,0.025])
    const hornCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-0.035,0.08,side*0.075),new THREE.Vector3(-0.075,0.13,side*0.22),new THREE.Vector3(-0.03,0.23,side*0.3)])
    const horn=new THREE.TubeGeometry(hornCurve,18,0.022,7,false)
    const pos=horn.attributes.position as THREE.BufferAttribute
    for(let i=0;i<pos.count;i++){const t=Math.floor(i/8)/18;const center=hornCurve.getPointAt(t);pos.setXYZ(i,center.x+(pos.getX(i)-center.x)*(1-t*.9),center.y+(pos.getY(i)-center.y)*(1-t*.9),center.z+(pos.getZ(i)-center.z)*(1-t*.9))}
    horn.computeVertexNormals(); skull.add(new THREE.Mesh(horn,bone))
  }
  return group
}

export const makeDragonfly = () => {
  const group=new THREE.Group(),body=matte(0x347f88,{metalness:0.4,roughness:0.35})
  sphere(group,body,[0,0,0],[0.16,0.012,0.015]); sphere(group,body,[0.12,0,0],[0.033,0.023,0.028])
  const wings: THREE.Mesh[]=[]
  for(const side of [-1,1]) for(const x of [-0.025,0.055]) {
    const wing=sphere(group,matte(0xc2ded4,{transparent:true,opacity:0.3,roughness:0.2,side:THREE.DoubleSide,depthWrite:false}),[x,0.005,side*0.105],[0.045,0.0015,0.13]); wing.rotation.y=side*0.2; wings.push(wing)
  }
  return {group,update:(time:number)=>wings.forEach((wing,i)=>{wing.rotation.x=Math.sin(time*42+i%2)*0.25})}
}

export const makeSnake = () => {
  const group=new THREE.Group(),rings=80,sides=14
  const positions=new Float32Array((rings+1)*(sides+1)*3),uvs:number[]=[],indices:number[]=[]
  for(let i=0;i<=rings;i++) for(let j=0;j<=sides;j++) {
    uvs.push(i/rings,j/sides)
    if(i<rings&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,b,a+1,b,b+1,a+1)}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices)
  const scales=matte(0x9e8555,{roughness:0.57})
  scales.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vScales;').replace('#include <begin_vertex>','#include <begin_vertex>\nvScales=uv;')
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vScales;').replace('#include <color_fragment>',`#include <color_fragment>
      float top=cos(vScales.y*6.28318);
      float saddles=smoothstep(.25,.55,cos(vScales.x*55.)-abs(sin(vScales.y*6.28318))*.7)*smoothstep(-.2,.5,top);
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.12,.085,.04),saddles*.78);
      float scaleEdge=pow(abs(sin(vScales.x*420.+sin(vScales.y*88.)*.7)*sin(vScales.y*88.)),10.);
      diffuseColor.rgb*=1.-scaleEdge*.22;
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.56,.45,.28),(1.-smoothstep(-.7,-.3,top))*.7);`)
  }
  scales.customProgramCacheKey=()=> 'snake-scales'
  const body=new THREE.Mesh(geometry,scales); body.frustumCulled=false; group.add(body)
  const head=new THREE.Group();group.add(head)
  sphere(head,scales,[0.025,0,0],[0.072,0.033,0.047])
  sphere(head,matte(0xb6a170),[0.035,-0.023,0],[0.063,0.009,0.041])
  for(const side of [-1,1]) {
    sphere(head,matte(0xb4953c,{roughness:0.25}),[0.038,0.016,side*0.038],[0.012,0.011,0.008])
    sphere(head,matte(0x11140e),[0.04,0.017,side*0.045],[0.003,0.008,0.002])
    sphere(head,matte(0x3c3222),[0.078,0.009,side*0.017],[0.004,0.003,0.003])
  }
  const tongue=new THREE.Group();tongue.position.set(0.085,-0.006,0);head.add(tongue)
  for(const side of [-1,1]) {
    const tine=segment(tongue,matte(0x83433f),0.0018)
    connect(tine,new THREE.Vector3(0,0,0),new THREE.Vector3(0.063,0,side*0.012))
  }
  const point=(t:number,time:number)=>new THREE.Vector3(-t*1.4,0,Math.sin(time*1.8-t*9)*(0.022+t*0.11))
  const update=(time:number, groundAt: (x:number,z:number)=>number = () => 0)=>{
    for(let i=0;i<=rings;i++) {
      const t=i/rings,center=point(t,time),next=point(t+0.001,time)
      const tangent=next.sub(center).normalize(),lateral=new THREE.Vector3(-tangent.z,0,tangent.x)
      const radius=0.004+Math.pow(1-t,0.65)*0.039
      for(let j=0;j<=sides;j++) {
        const angle=j/sides*Math.PI*2,idx=(i*(sides+1)+j)*3
        positions[idx]=center.x+lateral.x*Math.sin(angle)*radius
        positions[idx+1]=0.009+radius*.7+Math.cos(angle)*radius*.7
        positions[idx+2]=center.z+lateral.z*Math.sin(angle)*radius
        positions[idx+1]=positions[idx+1]!+groundAt(positions[idx]!,positions[idx+2]!)
      }
    }
    geometry.attributes.position!.needsUpdate=true;geometry.computeVertexNormals()
    const at=point(0,time),behind=point(0.01,time)
    head.position.set(at.x,groundAt(at.x,at.z)+0.043,at.z);head.rotation.z=Math.atan2(groundAt(at.x,at.z)-groundAt(behind.x,behind.z),at.distanceTo(behind));head.rotation.y=-Math.atan2(at.z-behind.z,at.x-behind.x)
    const flick=Math.max(0,Math.sin(time*0.82))
    tongue.visible=flick>0.96;tongue.scale.x=0.7+Math.sin(time*30)*0.3
  }
  update(0)
  return {group,update}
}
