import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  makeBalloon,
  makeBear,
  makeBird,
  makeCabin,
  makeCactus,
  makeCloud,
  makeCrab,
  makeFirefly,
  makeFish,
  makeFox,
  makeFrog,
  makeHeron,
  makeJelly,
  makeLighthouse,
  makeLilyPad,
  makePalm,
  makeSailboat,
  makeShark,
  makeSkier,
  makeSnake,
  makeTumbleweed,
  makeUmbrella,
  makeYeti,
  matte,
  cypressGeometry,
  setGroupOpacity
} from './details'
import { makeMushroom, makeCampfire, makeBones, makeDragonfly } from './actors'
import { contactPatch, textured, foamTexture } from './surfaces'
import { lerp, makeRng, smoothstep } from './math'
import { domeFragment, domeVertex, pointFragment, pointVertex, sunFragment, sunVertex, terrainFragment, terrainVertex, waterFragment, waterVertex } from './shaders'

export const Z_STEP = 26

export type BiomeSystem = {
  groups: THREE.Group[]
  update: (time: number, progress: number, reduced: boolean) => void
}

const LIGHT = new THREE.Vector3(-0.58, 0.62, 0.52).normalize()

const softTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
  gradient.addColorStop(0, 'rgba(255,255,255,0.7)')
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.16)')
  gradient.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const addDome = (group: THREE.Group, zenith: number, horizon: number, sunColor: number, sunPos: THREE.Vector3) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uZenith: { value: new THREE.Color(zenith) },
      uHorizon: { value: new THREE.Color(horizon) },
      uSunColor: { value: new THREE.Color(sunColor) },
      uSunPos: { value: sunPos.clone() },
      uOpacity: { value: 1 }
    },
    vertexShader: domeVertex,
    fragmentShader: domeFragment,
    side: THREE.BackSide,
    depthWrite: false
  })
  group.add(new THREE.Mesh(new THREE.SphereGeometry(42, 48, 32), material))
}

const addSprite = (group: THREE.Group, map: THREE.Texture, color: number, opacity: number, position: THREE.Vector3, scale: THREE.Vector2, additive = false) => {
  const material = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.copy(position)
  sprite.scale.set(scale.x, scale.y, 1)
  group.add(sprite)
  return sprite
}

const addPoints = (
  group: THREE.Group,
  renderer: THREE.WebGLRenderer,
  count: number,
  color: number,
  size: number,
  place: (i: number) => THREE.Vector3
) => {
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const p = place(i)
    positions.set([p.x, p.y, p.z], i * 3)
    sizes[i] = 0.55 + Math.random() * 1.6
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: 0.62 },
      uPixelRatio: { value: renderer.getPixelRatio() },
      uSize: { value: size }
    },
    vertexShader: pointVertex,
    fragmentShader: pointFragment,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const points = new THREE.Points(geometry, material)
  group.add(points)
  return { points, material }
}

const displace = (geometry: THREE.PlaneGeometry, height: (x: number, z: number) => number) => {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
  geometry.computeVertexNormals()
}

const addTerrain = (group: THREE.Group, geometry: THREE.PlaneGeometry, low: number, mid: number, high: number, seed: number, offsetZ = 0) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uLow: { value: new THREE.Color(low) },
      uMid: { value: new THREE.Color(mid) },
      uHigh: { value: new THREE.Color(high) },
      uLightDir: { value: LIGHT.clone() },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uRipple: { value: 0 }
    },
    vertexShader: terrainVertex,
    fragmentShader: terrainFragment
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.z = offsetZ
  group.add(mesh)
  return material
}

const addStar = (group: THREE.Group, glow: THREE.Texture, position: THREE.Vector3, scale: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: sunVertex,
    fragmentShader: sunFragment
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), material)
  mesh.position.copy(position)
  mesh.scale.setScalar(scale)
  const corona = addSprite(group, glow, 0xff9a4a, 0.3, position, new THREE.Vector2(scale * 4.2, scale * 4.2), true)
  group.add(mesh)
  return { mesh, material, corona }
}

const addMoon = (group: THREE.Group, glow: THREE.Texture, position: THREE.Vector3, scale: number, color = 0xd5e2ef) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), matte(color, { roughness: 1 }))
  mesh.position.copy(position)
  mesh.scale.setScalar(scale)
  group.add(mesh)
  addSprite(group, glow, color, 0.16, position, new THREE.Vector2(scale * 5.5, scale * 5.5), true)
  return mesh
}

const addWater = (deep: number, shallow: number, amp: number, opacity: number, width: number, depth: number, segs: number) => {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: amp },
      uDeep: { value: new THREE.Color(deep) },
      uShallow: { value: new THREE.Color(shallow) },
      uOpacity: { value: opacity }
    },
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
    transparent: true
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth, segs, Math.floor(segs * 0.6)), material)
  mesh.rotation.x = -Math.PI / 2
  return { mesh, material }
}

export const createBiomes = (renderer: THREE.WebGLRenderer, mobile: boolean): BiomeSystem => {
  const random = makeRng(91337)
  const glow = softTexture()
  const groups: THREE.Group[] = []
  const tick: Array<(time: number, progress: number, reduced: boolean) => void> = []
  const dummy = new THREE.Object3D()

  const sky = new THREE.Group()
  addDome(sky, 0x12457e, 0x97bed4, 0xffc878, new THREE.Vector3(-10, 9, -8))
  sky.add(new THREE.HemisphereLight(0xb7d4f0, 0x243044, 0.62))
  const skyFill = new THREE.DirectionalLight(0xe8f0f8, 0.9)
  skyFill.position.set(-6, 8, 4)
  sky.add(skyFill)
  const skySun = addStar(sky, glow, new THREE.Vector3(-8.4, 3.4, -10), 0.42)
  const clouds: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 7 : 11); i++) {
    const cloud = makeCloud(random)
    const depth = random()
    cloud.position.set(-11 + random() * 16 - depth * 3, -0.4 + random() * 3.6 + depth * 0.8, -4 - depth * 14)
    cloud.scale.setScalar(0.9 + depth * 1.6)
    cloud.userData.homeX = cloud.position.x
    cloud.userData.drift = 0.12 + random() * 0.18
    sky.add(cloud)
    clouds.push(cloud)
  }
  const balloons = [makeBalloon(0xc45a3a), makeBalloon(0x3a6aa8), makeBalloon(0xd4a24a)]
  balloons.forEach((item, i) => {
    item.group.scale.setScalar([1.55, 0.95, 0.62][i]!)
    sky.add(item.group)
  })
  const birds = Array.from({ length: mobile ? 5 : 7 }, () => makeBird(0x1a222b))
  birds.forEach((item) => {
    item.group.scale.setScalar(1.3)
    sky.add(item.group)
  })
  tick.push((time, _progress, reduced) => {
    skySun.material.uniforms.uTime!.value = time
    skySun.corona.scale.setScalar(1.7 + Math.sin(time * 0.6) * 0.06)
    if (reduced) return
    balloons[0]!.group.position.set(mobile ? -0.8 : -3.2, (mobile ? 2.8 : 1.2) + Math.sin(time * 0.22) * 0.16, -3.6)
    balloons[1]!.group.position.set(mobile ? -2.6 : -6.4, 2.3 + Math.sin(time * 0.18 + 1) * 0.12, -8.5)
    balloons[2]!.group.position.set(1.6, 2.9 + Math.sin(time * 0.16 + 2) * 0.1, -13)
    balloons.forEach((item) => item.update(time, reduced))
    clouds.forEach((cloud, i) => {
      cloud.position.x = cloud.userData.homeX + Math.sin(time * 0.05 + i) * cloud.userData.drift
    })
    birds.forEach((item, i) => {
      const t = ((time * 0.021) % 1)
      const wing = Math.ceil(i / 2)
      item.group.position.set(-17 + t * 34 - wing * 0.52, 0.5 + wing * (i % 2 ? 0.2 : -0.12) + Math.sin(t * Math.PI) * 0.5, -7 - wing * 0.7)
      item.update(time, reduced)
    })
  })
  groups.push(sky)

  const mountains = new THREE.Group()
  addDome(mountains, 0x2a3a4c, 0xc5d2de, 0xffd7a0, new THREE.Vector3(8, 5, -10))
  mountains.add(new THREE.HemisphereLight(0xe4eaf0, 0x2a3038, 0.7))
  const cabinX = 1.1
  const cabinZ = 3.4
  const slopeHeight = (x: number, z: number) => {
    const wave = Math.sin(x * 0.32) + Math.sin(x * 0.74 + 1.1) * 0.58 + Math.sin(x * 1.55 + z * 0.22) * 0.2
    const fall = Math.pow(Math.max(0, 1 - Math.abs(z) / 12), 1.12)
    const crags = (Math.sin(x * 3.2 + z * 1.8) * 0.10 + Math.sin(x * 6.8 - z * 2.9) * 0.045) * fall
    return -3.35 + Math.max(0, wave + 1.2) * 2.65 * fall + crags
  }
  // A bench is cut into the face so the cabin has level ground to stand on.
  const shelfY = slopeHeight(cabinX, cabinZ) - 0.28
  const ridgeHeight = (x: number, z: number) => {
    const natural = slopeHeight(x, z)
    const d = Math.hypot((x - cabinX) * 0.8, (z - cabinZ) * 1.25)
    return lerp(natural, shelfY, 1 - smoothstep(1.15, 2.5, d))
  }
  const ridge = new THREE.PlaneGeometry(64, 48, mobile ? 100 : 200, mobile ? 70 : 140)
  ridge.rotateX(-Math.PI / 2)
  displace(ridge, ridgeHeight)
  const mountainMat = addTerrain(mountains, ridge, 0x4a5560, 0x8b95a1, 0xeef3f6, 1.2)
  mountainMat.uniforms.uLightDir!.value.set(0.58, 0.7, 0.42).normalize()
  // Distant range, lighter and lower contrast, so the near ridge has something to sit against.
  const farRange = new THREE.PlaneGeometry(70, 18, mobile ? 50 : 90, 20)
  farRange.rotateX(-Math.PI / 2)
  displace(farRange, (x, z) => {
    const wave = Math.sin(x * 0.21 + 0.6) + Math.sin(x * 0.47 + 2.1) * 0.55 + Math.sin(x * 1.1) * 0.15
    const fall = Math.max(0, 1 - Math.abs(z) / 9)
    return -2.3 + Math.max(0, wave + 1.05) * 2.2 * fall
  })
  const farMat = addTerrain(mountains, farRange, 0x8b97a3, 0xb7c2cc, 0xe4e9ee, 0.7, -20)
  farMat.uniforms.uLightDir!.value.set(0.4, 0.75, 0.4).normalize()
  for (let i = 0; i < 8; i++) {
    addSprite(mountains, glow, 0xdbe6ef, 0.07, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -5 - random() * 8), new THREE.Vector2(5.4 + random() * 4, 1.5), true)
  }
  const snowField = addPoints(mountains, renderer, mobile ? 260 : 600, 0xf6f8fb, 0.88, () =>
    new THREE.Vector3((random() - 0.5) * 22, (random() - 0.5) * 10, -1 - random() * 12)
  )
  const cabin = makeCabin()
  cabin.position.set(cabinX, shelfY - 0.02, cabinZ)
  cabin.scale.setScalar(1.35)
  cabin.rotation.y = 0.22
  mountains.add(cabin)
  const cabinShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.05, 20),
    new THREE.MeshBasicMaterial({ map: glow, color: 0x263445, transparent: true, opacity: 0.5, depthWrite: false })
  )
  cabinShadow.rotation.x = -Math.PI / 2
  cabinShadow.scale.set(1.35, 1, 1)
  cabinShadow.position.set(cabinX + 0.1, shelfY + 0.012, cabinZ + 0.05)
  mountains.add(cabinShadow)
  const path = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 2.8),
    new THREE.MeshBasicMaterial({ color: 0x5c6874, transparent: true, opacity: 0.16, depthWrite: false })
  )
  path.rotation.x = -Math.PI / 2
  path.rotation.z = 0.35
  path.position.set(cabinX + 0.9, shelfY + 0.01, cabinZ + 1.5)
  mountains.add(path)
  const fire = addSprite(cabin, glow, 0xff7a2a, 0.55, new THREE.Vector3(-0.22, 0.32, 0.42), new THREE.Vector2(0.32, 0.26), true)
  const chimneyFire = addSprite(cabin, glow, 0xff5520, 0.5, new THREE.Vector3(-0.28, 1.2, -0.1), new THREE.Vector2(0.22, 0.18), true)
  const smoke = addSprite(cabin, glow, 0xb8c0c6, 0.55, new THREE.Vector3(-0.28, 1.55, -0.1), new THREE.Vector2(0.55, 1.15))
  const smoke2 = addSprite(cabin, glow, 0xa8b0b6, 0.4, new THREE.Vector3(-0.18, 2.05, -0.04), new THREE.Vector2(0.48, 0.95))
  const smoke3 = addSprite(cabin, glow, 0x9aa2a8, 0.28, new THREE.Vector3(-0.08, 2.5, 0.02), new THREE.Vector2(0.4, 0.8))
  const hearth = new THREE.PointLight(0xff7a2a, 1.4, 4.5)
  hearth.position.set(-0.2, 0.35, 0.4)
  cabin.add(hearth)
  const skier = makeSkier()
  mountains.add(skier.group)
  const sprayPositions=new Float32Array(36*3)
  const sprayGeometry=new THREE.BufferGeometry()
  sprayGeometry.setAttribute('position',new THREE.BufferAttribute(sprayPositions,3))
  const skiSpray=new THREE.Points(sprayGeometry,new THREE.PointsMaterial({color:0xe5eef3,size:0.018,transparent:true,opacity:0.5,depthWrite:false}))
  skiSpray.frustumCulled=false;mountains.add(skiSpray)
  const trackPositions=new Float32Array(48*2*2*3),trackIndices:number[]=[]
  for(let lane=0;lane<2;lane++) for(let i=0;i<47;i++) {
    const a=lane*96+i*2;trackIndices.push(a,a+2,a+1,a+1,a+2,a+3)
  }
  const trackGeometry=new THREE.BufferGeometry();trackGeometry.setAttribute('position',new THREE.BufferAttribute(trackPositions,3));trackGeometry.setIndex(trackIndices)
  const tracks=new THREE.Mesh(trackGeometry,new THREE.MeshBasicMaterial({color:0x506a7b,transparent:true,opacity:0.18,depthWrite:false,side:THREE.DoubleSide}))
  tracks.frustumCulled=false;mountains.add(tracks)
  const skierShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 12),
    new THREE.MeshBasicMaterial({ color: 0x3a4652, transparent: true, opacity: 0.3, depthWrite: false })
  )
  skierShadow.rotation.x = -Math.PI / 2
  skierShadow.scale.set(1.1, 0.55, 1)
  mountains.add(skierShadow)
  const yeti = makeYeti()
  const yetiX = 7.4
  const yetiZ = -4.6
  yeti.position.set(yetiX, ridgeHeight(yetiX, yetiZ) + 0.32, yetiZ)
  yeti.scale.setScalar(1.25)
  yeti.rotation.y = -1.25
  mountains.add(yeti)
  tick.push((time, _progress, reduced) => {
    mountainMat.uniforms.uTime!.value = time
    snowField.points.position.y = -((time * 0.16) % 1.7)
    const window = cabin.userData.window as THREE.Mesh
    const ember = cabin.userData.ember as THREE.Mesh
    const flicker = Math.abs(Math.sin(time * 9))
    ;(window.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.75 + flicker * 1.25
    ;(ember.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.2 + flicker * 1.4
    hearth.intensity = 1.1 + flicker * 0.9
    fire.material.opacity = 0.32 + flicker * 0.4
    fire.scale.set(0.28 + Math.sin(time * 11) * 0.05, 0.24 + Math.sin(time * 13) * 0.06, 1)
    chimneyFire.material.opacity = 0.28 + flicker * 0.38
    chimneyFire.scale.set(0.18 + Math.sin(time * 12) * 0.04, 0.16 + Math.sin(time * 15) * 0.05, 1)
    smoke.position.y = 1.55 + Math.sin(time * 0.8) * 0.12
    smoke.material.opacity = 0.38 + Math.sin(time * 0.9) * 0.12
    smoke2.position.y = 2.05 + Math.sin(time * 0.7 + 1) * 0.16
    smoke2.material.opacity = 0.22 + Math.sin(time * 0.8 + 0.6) * 0.1
    smoke3.position.y = 2.5 + Math.sin(time * 0.6 + 1.7) * 0.18
    smoke3.material.opacity = 0.12 + Math.sin(time * 0.7 + 1.1) * 0.08
    if (reduced) return
    // Long diagonal run down the right face toward the camera; fades in and out at the loop ends.
    const t = (time * 0.045) % 1
    const path = (u: number) => {
      const x = 3.3 + u * 2.3
      const z = 1.0 + u * 6.5 + Math.sin(u*Math.PI*4)*0.18
      return new THREE.Vector3(x,ridgeHeight(x,z),z)
    }
    const here=path(t), ahead=path(t+0.002)
    const direction=ahead.clone().sub(here).normalize()
    const sx=here.x, sy=here.y, sz=here.z
    const normal=new THREE.Vector3(-(ridgeHeight(sx+0.03,sz)-ridgeHeight(sx-0.03,sz))/0.06,1,-(ridgeHeight(sx,sz+0.03)-ridgeHeight(sx,sz-0.03))/0.06).normalize()
    const lateral=new THREE.Vector3().crossVectors(direction,normal).normalize()
    const surfaceUp=new THREE.Vector3().crossVectors(lateral,direction).normalize()
    skier.group.scale.setScalar(0.88)
    skier.group.position.copy(here).y+=0.018
    skier.group.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(direction,surfaceUp,lateral))
    skier.group.userData.turn=Math.sin(t*Math.PI*4)
    const alpha = smoothstep(0, 0.08, t) * (1 - smoothstep(0.9, 1, t))
    setGroupOpacity(skier.group, alpha)
    skierShadow.position.set(sx, sy + 0.012, sz)
    ;(skierShadow.material as THREE.MeshBasicMaterial).opacity = 0.3 * alpha
    skier.update(time)
    ;(skiSpray.material as THREE.PointsMaterial).opacity=alpha*0.45
    ;(tracks.material as THREE.MeshBasicMaterial).opacity=alpha*0.18
    for(let i=0;i<36;i++) {
      const age=(time*1.3+i/36)%1
      const p=path(Math.max(0,t-age*0.025))
      const offset=(i%2 ? 1:-1)*(0.05+age*0.16)
      sprayPositions[i*3]=p.x+lateral.x*offset
      sprayPositions[i*3+1]=p.y+0.025+Math.sin(age*Math.PI)*0.085
      sprayPositions[i*3+2]=p.z+lateral.z*offset
    }
    sprayGeometry.attributes.position!.needsUpdate=true
    for(let lane=0;lane<2;lane++) for(let i=0;i<48;i++) {
      const at=Math.max(0,t-i*0.0025),p=path(at),q=path(at+0.001)
      const side=new THREE.Vector3(-(q.z-p.z),0,q.x-p.x).normalize()
      for(let edge=0;edge<2;edge++) {
        const offset=(lane?1:-1)*0.071+(edge?1:-1)*0.007
        const x=p.x+side.x*offset,z=p.z+side.z*offset,idx=(lane*96+i*2+edge)*3
        trackPositions[idx]=x;trackPositions[idx+1]=ridgeHeight(x,z)+0.012;trackPositions[idx+2]=z
      }
    }
    trackGeometry.attributes.position!.needsUpdate=true
    yeti.rotation.y = -1.25 + Math.sin(time * 0.2) * 0.1
  })
  groups.push(mountains)

  const forest = new THREE.Group()
  addDome(forest, 0x06140f, 0x163028, 0x8fe0a8, new THREE.Vector3(7, 8, -12))
  forest.add(new THREE.HemisphereLight(0x8fb59a, 0x08140f, 0.72))
  const forestMoon = new THREE.DirectionalLight(0xcfe6d8, 0.85)
  forestMoon.position.set(6.8, 5.2, 2)
  forest.add(forestMoon)
  addMoon(forest, glow, new THREE.Vector3(6.8, 3.6, -11), 0.26, 0xcfe6d8)
  const floor = new THREE.PlaneGeometry(80, 60, mobile ? 60 : 100, mobile ? 40 : 70)
  floor.rotateX(-Math.PI / 2)
  displace(floor, (x, z) => -3.05 + Math.sin(x * 0.4) * 0.12 + Math.sin(z * 0.55) * 0.1)
  const forestFloor = addTerrain(forest, floor, 0x142019, 0x293d25, 0x4b5430, 2.4)
  const forestFloorY = (x: number, z: number) => -3.05 + Math.sin(x * 0.4) * 0.12 + Math.sin(z * 0.55) * 0.1
  const treeCount = mobile ? 44 : 84
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.14, 2.6, 6), textured(0x524331, 'wood'), treeCount)
  const leafParts: THREE.BufferGeometry[] = []
  for (let i = 0; i < (mobile ? 170 : 320); i++) {
    const azimuth = random() * Math.PI * 2
    const y = random() * 2 - 1
    const radius = Math.sqrt(1 - y * y) * (0.65 + random() * 0.35)
    const size = 0.045 + random() * 0.035
    // Folded leaf blades catch light independently and leave a fine, irregular silhouette.
    const leaf = new THREE.BufferGeometry()
    const outline = [[-1,0], [-0.6,0.45], [0,0.6], [0.6,0.45], [1,0], [0.6,-0.45], [0,-0.6], [-0.6,-0.45]]
    const blade: number[] = []
    outline.forEach(([x,z], j) => {
      const next = outline[(j + 1) % outline.length]
      blade.push(0,0.13,0, x!,0,z!, next![0]!,0,next![1]!)
    })
    leaf.setAttribute('position', new THREE.Float32BufferAttribute(blade, 3))
    leaf.scale(size * 1.25, size, size)
    leaf.rotateZ((random() - 0.5) * 2.2)
    leaf.rotateX((random() - 0.5) * 1.5)
    leaf.rotateY(azimuth)
    leaf.translate(Math.cos(azimuth) * radius * 0.65, y * 0.6, Math.sin(azimuth) * radius * 0.65)
    leaf.computeVertexNormals()
    const tone = 0.62 + random() * 0.38
    leaf.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({length:24}, () => [tone * 0.92, tone, tone * 0.83]).flat(), 3))
    leafParts.push(leaf)
  }
  const canopyGeometry = mergeGeometries(leafParts)
  leafParts.forEach(part => part.dispose())
  const canopies = new THREE.InstancedMesh(canopyGeometry, matte(0x376347, { roughness: 0.96, side: THREE.DoubleSide, vertexColors: true }), treeCount * 3)
  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.024, 0.065, 1, 7), textured(0x524331, 'wood'), treeCount * 3)
  let canopyIndex = 0
  for (let i = 0; i < treeCount; i++) {
    const x = (random() - 0.5) * 24
    const z = -1.2 - random() * 14
    const s = 0.78 + random() * 1.55
    const lean = (random() - 0.5) * 0.09
    const floorY = forestFloorY(x, z)
    dummy.position.set(x, floorY + 1.3 * s - 0.1, z)
    dummy.scale.set(s * (0.85 + random() * 0.4), s, s * (0.85 + random() * 0.4))
    dummy.rotation.set(lean, random() * Math.PI, lean * 0.6)
    dummy.updateMatrix()
    const shadow = contactPatch(glow, s * 1.5, 0.6)
    shadow.position.set(x, floorY + 0.012, z)
    forest.add(shadow)
    trunks.setMatrixAt(i, dummy.matrix)
    trunks.setColorAt(i, new THREE.Color().setHSL(0.08, 0.22, 0.55 + random() * 0.2))
    for (let branch = 0; branch < 3; branch++) {
      const a = branch / 3 * Math.PI * 2 + i
      const start = new THREE.Vector3(x, floorY + s * 1.7, z)
      const end = new THREE.Vector3(x + Math.cos(a) * s * 0.5, floorY + s * 2.6, z + Math.sin(a) * s * 0.5)
      const span = end.clone().sub(start)
      dummy.position.copy(start).add(end).multiplyScalar(0.5)
      dummy.scale.set(s, span.length(), s)
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), span.normalize())
      dummy.updateMatrix()
      branches.setMatrixAt(i * 3 + branch, dummy.matrix)
    }
    const lobes = 2 + Math.round(random())
    for (let k = 0; k < 3; k++) {
      const spread = (random() - 0.5) * 0.5 * s
      const lift = 2.4 * s + k * 0.22 * s + random() * 0.2 * s
      dummy.position.set(x + spread, floorY + lift, z + (random() - 0.5) * 0.5 * s)
      const lobeScale = k < lobes ? s * (0.6 + random() * 0.32) : 0.0001
      dummy.scale.set(lobeScale * (0.9 + random() * 0.3), lobeScale * (0.8 + random() * 0.3), lobeScale)
      dummy.rotation.set(0, random() * Math.PI, 0)
      dummy.updateMatrix()
      canopies.setColorAt(canopyIndex, new THREE.Color().setHSL(0.23 + random() * 0.07, 0.25, 0.5 + random() * 0.3))
      canopies.setMatrixAt(canopyIndex++, dummy.matrix)
    }
  }
  forest.add(trunks, canopies, branches)
  const fernCount = mobile ? 40 : 90
  const fernVertices: number[] = []
  for (let frond = 0; frond < 7; frond++) {
    const angle = frond / 7 * Math.PI * 2
    const point = (r: number, y: number, side: number) => [Math.cos(angle) * r - Math.sin(angle) * side, y, Math.sin(angle) * r + Math.cos(angle) * side]
    for (let leaflet = 1; leaflet < 7; leaflet++) {
      const t = leaflet / 7
      const r = t * 0.38
      const y = Math.sin(t * Math.PI * 0.85) * 0.3
      const width = (1 - t) * 0.105
      for (const side of [-1, 1]) fernVertices.push(...point(r - 0.045, y - 0.03, 0), ...point(r + 0.04, y, width * side), ...point(r + 0.025, y + 0.025, 0))
    }
  }
  const fernGeometry = new THREE.BufferGeometry()
  fernGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fernVertices, 3))
  fernGeometry.computeVertexNormals()
  const ferns = new THREE.InstancedMesh(fernGeometry, matte(0x376b3b, { roughness: 1, side: THREE.DoubleSide }), fernCount)
  for (let i = 0; i < fernCount; i++) {
    const x = (random() - 0.5) * 22
    const z = -1 - random() * 8
    const s = 0.5 + random() * 0.9
    dummy.position.set(x, forestFloorY(x, z) + 0.18 * s, z)
    dummy.scale.set(s * (1 + random() * 0.5), s, s)
    dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3)
    dummy.updateMatrix()
    ferns.setMatrixAt(i, dummy.matrix)
  }
  forest.add(ferns)
  // Low, scattered leaf litter connects the foreground props to the forest floor.
  const litter = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 5, 3), matte(0x807047, { roughness: 1 }), mobile ? 180 : 420)
  for (let i = 0; i < litter.count; i++) {
    const x = (random() - 0.5) * 18, z = 3.5 - random() * 11
    dummy.position.set(x, forestFloorY(x,z) + 0.008, z)
    dummy.scale.set(0.7 + random(), 0.07, 0.35 + random() * 0.5)
    dummy.rotation.set(0, random() * Math.PI, 0)
    dummy.updateMatrix(); litter.setMatrixAt(i,dummy.matrix)
    litter.setColorAt(i,new THREE.Color().setHSL(0.09 + random() * 0.1,0.22,0.25 + random() * 0.25))
  }
  forest.add(litter)
  const shafts = new THREE.Group()
  const shaftMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){float edge=pow(max(0.0,1.0-abs(vUv.x-.5)*2.0),2.5);
      float ends=smoothstep(0.0,.3,vUv.y)*(1.0-smoothstep(.85,1.0,vUv.y));
      float dust=.8+.2*sin(vUv.y*18.0-uTime*.15);
      gl_FragColor=vec4(.65,.78,.53,edge*ends*dust*.065);}`
  })
  for (let i=0;i<5;i++) {
    const shaft=new THREE.Mesh(new THREE.PlaneGeometry(0.65+i*.16,8),shaftMaterial)
    shaft.position.set(-4+i*2.1,.5,-5-i*.7); shaft.rotation.z=-.27
    shafts.add(shaft)
  }
  forest.add(shafts)
  const rocks = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0), textured(0x536056, 'stone'), mobile ? 8 : 16)
  for (let i = 0; i < rocks.count; i++) {
    const x = (random() - 0.5) * 20
    const z = -1.4 - random() * 6
    const s = 0.5 + random() * 1.2
    dummy.position.set(x, forestFloorY(x, z) + 0.06 * s, z)
    dummy.scale.set(s * (1 + random() * 0.6), s * 0.55, s)
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, 0)
    dummy.updateMatrix()
    rocks.setMatrixAt(i, dummy.matrix)
  }
  forest.add(rocks)
  for (let i = 0; i < 8; i++) {
    addSprite(forest, glow, 0xb7d0c2, 0.05, new THREE.Vector3((random() - 0.5) * 14, -2 + random(), -3 - random() * 8), new THREE.Vector2(6 + random() * 5, 1.3))
  }
  const bugs = Array.from({ length: mobile ? 9 : 14 }, () => makeFirefly())
  bugs.forEach((item) => forest.add(item.group))
  for (let i = 0; i < 12; i++) {
    const mushroom = makeMushroom(random)
    const x = -5.5 + (i % 4) * 1.8 + random() * 0.3
    const z = 1.8 - Math.floor(i / 4) * 0.75
    mushroom.position.set(x, forestFloorY(x,z), z)
    mushroom.scale.setScalar(0.7 + random() * 0.6)
    forest.add(mushroom)
  }
  const camp = makeCampfire(random)
  camp.group.position.set(-2.8,forestFloorY(-2.8,2.2),2.2)
  camp.group.scale.setScalar(1.2)
  forest.add(camp.group)
  const bear = makeBear()
  bear.scale.setScalar(1.9)
  forest.add(bear)
  const fox = makeFox()
  fox.scale.setScalar(2)
  forest.add(fox)
  const bearContact = contactPatch(glow,0.65,0.38), foxContact = contactPatch(glow,0.55,0.3)
  forest.add(bearContact,foxContact)
  tick.push((time, _progress, reduced) => {
    forestFloor.uniforms.uTime!.value = time
    camp.update(time)
    shaftMaterial.uniforms.uTime!.value = time
    if (reduced) return
    const walk = (animal: THREE.Group, center: number, depth: number, phase: number, radius: number, rate: number, scale: number) => {
      const a = time * rate + phase
      const x = center + Math.sin(a) * radius, z = depth + Math.cos(a) * radius * 0.38
      const dx = Math.cos(a) * radius * rate, dz = -Math.sin(a) * radius * 0.38 * rate
      animal.position.set(x,forestFloorY(x,z),z)
      animal.rotation.y=-Math.atan2(dz,dx)
      // Integrate distance around the ellipse numerically once per update; gait follows travel.
      const last = animal.userData.lastTime ?? time
      const dt = Math.max(0, Math.min(0.1,time-last))
      animal.userData.distance = (animal.userData.distance ?? 0) + Math.hypot(dx,dz)*dt/scale
      animal.userData.lastTime=time
      animal.userData.groundAt=(localX:number,localZ:number)=>{
        const foot=new THREE.Vector3(localX,0,localZ).applyQuaternion(animal.quaternion).multiplyScalar(scale).add(animal.position)
        return (forestFloorY(foot.x,foot.z)-animal.position.y)/scale
      }
      animal.userData.animate(animal.userData.distance,time,Math.hypot(dx,dz))
    }
    walk(bear,mobile ? -1.2 : -4.4,0.5,0,0.9,0.12,1.9)
    walk(fox,mobile ? 0.8 : -0.9,1.3,1.4,0.8,0.23,2)
    bearContact.position.copy(bear.position).y += 0.016
    foxContact.position.copy(fox.position).y += 0.016
    bugs.forEach((item, i) => {
      item.group.position.set(Math.sin(time * item.group.userData.speed + i) * 5.5, -1.6 + Math.sin(time * 0.8 + i) * 1.1, -2.2 - (i % 5) * 1.1)
      item.update(time, reduced)
    })
  })
  groups.push(forest)

  const desert = new THREE.Group()
  addDome(desert, 0x1a2438, 0xf0b46a, 0xff9a40, new THREE.Vector3(-9, 5, -8))
  desert.add(new THREE.HemisphereLight(0xffd7a0, 0x4a2a10, 0.85))
  const desertSun = addStar(desert, glow, new THREE.Vector3(-8.6, 3.2, -9), 0.55)
  const duneHeight = (x: number, z: number) => -2.7 + Math.sin(x * 0.36 + z * 0.16) * 0.82 + Math.sin(x * 0.14 - z * 0.28) * 0.48
  const dunes = new THREE.PlaneGeometry(80, 60, mobile ? 100 : 180, mobile ? 80 : 140)
  dunes.rotateX(-Math.PI / 2)
  displace(dunes, duneHeight)
  const duneMat = addTerrain(desert, dunes, 0x8a4a22, 0xc48a48, 0xf0d08a, 3.1)
  duneMat.uniforms.uRipple!.value = 0.11
  const cactusSpots = [
    [-7.4, -3.2, 1.05],
    [-5.9, -5.6, 0.8],
    [-2.1, -4.1, 0.95],
    [1.8, -6.4, 0.7]
  ]
  cactusSpots.forEach(([x, z, s]) => {
    const cactus = makeCactus(random)
    cactus.position.set(x!, duneHeight(x!, z!) - 0.04, z!)
    cactus.scale.setScalar(s!)
    cactus.rotation.y = random() * Math.PI
    desert.add(cactus)
    const shadow = contactPatch(glow, s! * 0.85, 0.48)
    shadow.position.set(x! + 0.2, duneHeight(x!, z!) + 0.018, z!)
    shadow.scale.y = 1.8
    desert.add(shadow)
  })
  const stones = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.09, 0), textured(0x927353, 'stone'), mobile ? 14 : 28)
  for (let i = 0; i < stones.count; i++) {
    const x = (random() - 0.5) * 20
    const z = -1.5 - random() * 6
    const s = 0.5 + random() * 1.1
    dummy.position.set(x, duneHeight(x, z) + 0.04 * s, z)
    dummy.scale.set(s * (1 + random() * 0.6), s * 0.6, s)
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, 0)
    dummy.updateMatrix()
    stones.setMatrixAt(i, dummy.matrix)
  }
  desert.add(stones)
  const pyramid = new THREE.Mesh(new THREE.ConeGeometry(1.35, 1.6, 4), matte(0xb8864c, { roughness: 1 }))
  pyramid.position.set(6.6, duneHeight(6.6, -8.2) + 0.72, -8.2)
  pyramid.rotation.y = 0.62
  desert.add(pyramid)
  const bones=makeBones()
  bones.position.set(4.4,duneHeight(4.4,0.7)+0.01,0.7)
  bones.scale.setScalar(1.45); bones.rotation.y=-0.4
  desert.add(bones)
  const snake = makeSnake()
  snake.group.scale.setScalar(1.9)
  desert.add(snake.group)
  const tumble = makeTumbleweed(random)
  tumble.group.scale.setScalar(1.5)
  desert.add(tumble.group)
  for (let i = 0; i < 5; i++) {
    addSprite(desert, glow, 0xf3c17e, 0.05, new THREE.Vector3((random() - 0.5) * 16, -0.2 + random() * 3, -4 - random() * 8), new THREE.Vector2(6.2, 2.1), true)
  }
  const dust = addPoints(desert, renderer, mobile ? 60 : 140, 0xf0d08a, 0.9, () =>
    new THREE.Vector3((random() - 0.5) * 24, -2.6 + random() * 1.4, -1 - random() * 9)
  )
  dust.material.uniforms.uOpacity!.value = 0.22
  tick.push((time, _progress, reduced) => {
    desertSun.material.uniforms.uTime!.value = time
    duneMat.uniforms.uTime!.value = time
    if (reduced) return
    dust.points.position.x = (time * 0.6) % 4
    // Tumbleweed enters and exits off frame; height follows the dune under it.
    const tx = -13 + ((time * 0.34 * 1.5) % 26)
    tumble.group.position.set(tx, duneHeight(tx, -2.3), -2.3)
    tumble.update(time, reduced)
    // The snake crosses slowly, head first, hugging the dune surface.
    const sx = -9 + ((time * 0.11) % 17)
    snake.group.position.set(sx, duneHeight(sx, -2.6) + 0.01, -2.6)
    snake.group.rotation.x = -Math.atan2(duneHeight(sx, -2.3) - duneHeight(sx, -2.9), 0.6) * 0.6
    snake.group.rotation.z = Math.atan2(duneHeight(sx + 0.3, -2.6) - duneHeight(sx - 0.3, -2.6), 0.6)
    snake.update(time)
  })
  groups.push(desert)

  const swamp = new THREE.Group()
  addDome(swamp, 0x071412, 0x1c332c, 0x8fbf88, new THREE.Vector3(6, 7, -10))
  swamp.add(new THREE.HemisphereLight(0x8fbfa8, 0x081412, 0.48))
  addMoon(swamp, glow, new THREE.Vector3(-6.4, 3.4, -12), 0.24, 0xc5e0d4)
  const swampWater = addWater(0x071c1c, 0x2c5648, 0.05, 0.96, 90, 70, mobile ? 70 : 120)
  swampWater.mesh.position.y = -2.88
  swamp.add(swampWater.mesh)
  const waterY = -2.88
  const cypressCount = mobile ? 16 : 30
  const parts = cypressGeometry()
  const bark = textured(0x4a4236, 'wood')
  parts.crown.dispose()
  parts.crownB.dispose()
  const foliage = matte(0x314c3d, { roughness: 1, side: THREE.DoubleSide, vertexColors: true })
  const cypress = new THREE.InstancedMesh(parts.trunk, bark, cypressCount)
  const crowns = new THREE.InstancedMesh(canopyGeometry.clone().scale(1.4, 1.8, 1.4), foliage, cypressCount)
  const crownsB = new THREE.InstancedMesh(canopyGeometry.clone().scale(1.2, 1.1, 1.2), matte(0x3d5946, { roughness: 1, side: THREE.DoubleSide, vertexColors: true }), cypressCount)
  const knees = new THREE.InstancedMesh(parts.knee, bark, cypressCount * 3)
  const mossStrands = new THREE.InstancedMesh(parts.moss, matte(0x5f6f5a, { roughness: 1 }), cypressCount * 2)
  const rings = new THREE.InstancedMesh(
    parts.ring,
    new THREE.MeshBasicMaterial({ color: 0x03100f, transparent: true, opacity: 0.55, depthWrite: false }),
    cypressCount
  )
  // Trees cluster in loose stands, with a few standing alone in open water.
  const stands = [[-7, -6], [-2.5, -9.5], [4.2, -5], [8, -10]]
  for (let i = 0; i < cypressCount; i++) {
    const stand = stands[i % stands.length]
    const lone = random() > 0.8
    const x = lone ? (random() - 0.5) * 22 : stand![0]! + (random() - 0.5) * 5.5
    const z = lone ? -3 - random() * 11 : stand![1]! + (random() - 0.5) * 4.5
    const depth = Math.min(1, Math.max(0, (-z - 3) / 12))
    const s = 0.7 + random() * 0.5 + depth * 0.45
    const baseY = waterY - 0.3 * s
    dummy.position.set(x, baseY, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.06)
    dummy.updateMatrix()
    cypress.setMatrixAt(i, dummy.matrix)
    const crownY = baseY + 4.4 * s
    dummy.position.set(x + (random() - 0.5) * 0.3 * s, crownY - 0.4 * s, z)
    dummy.scale.set(s * (0.85 + random() * 0.4), s * (0.9 + random() * 0.5), s)
    dummy.rotation.set((random() - 0.5) * 0.12, random() * Math.PI, (random() - 0.5) * 0.12)
    dummy.updateMatrix()
    crowns.setMatrixAt(i, dummy.matrix)
    dummy.position.set(x + (random() - 0.5) * 0.9 * s, crownY - 1.3 * s, z + (random() - 0.5) * 0.6 * s)
    dummy.scale.set(s * (0.8 + random() * 0.5), s * (0.7 + random() * 0.5), s)
    dummy.rotation.set((random() - 0.5) * 0.3, random() * Math.PI, (random() - 0.5) * 0.3)
    dummy.updateMatrix()
    crownsB.setMatrixAt(i, dummy.matrix)
    for (let k = 0; k < 3; k++) {
      const a = random() * Math.PI * 2
      const r = (0.55 + random() * 0.5) * s
      dummy.position.set(x + Math.cos(a) * r, waterY + 0.06 * s, z + Math.sin(a) * r)
      dummy.scale.set(s, s * (0.5 + random() * 0.8), s)
      dummy.rotation.set((random() - 0.5) * 0.3, 0, (random() - 0.5) * 0.3)
      dummy.updateMatrix()
      knees.setMatrixAt(i * 3 + k, dummy.matrix)
    }
    for (let k = 0; k < 2; k++) {
      const a = random() * Math.PI * 2
      dummy.position.set(x + Math.cos(a) * 0.5 * s, crownY - 1.65 * s, z + Math.sin(a) * 0.5 * s)
      dummy.scale.set(s, s * (0.7 + random() * 0.7), s)
      dummy.rotation.set((random() - 0.5) * 0.1, 0, (random() - 0.5) * 0.1)
      dummy.updateMatrix()
      mossStrands.setMatrixAt(i * 2 + k, dummy.matrix)
    }
    dummy.position.set(x, waterY + 0.008, z)
    dummy.scale.set(s, s, s)
    dummy.rotation.set(-Math.PI / 2, 0, 0)
    dummy.updateMatrix()
    rings.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(cypress, crowns, crownsB, knees, mossStrands, rings)
  const reedCount = mobile ? 36 : 84
  const reeds = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.01, 0.022, 1, 4), matte(0x4d5c2e, { roughness: 1 }), reedCount)
  const reedBeds = [[-6.2, -2.4], [-4.6, -3.1], [3.6, -2.2], [6.4, -3.4], [0.8, -2.8]]
  for (let i = 0; i < reedCount; i++) {
    const bed = reedBeds[i % reedBeds.length]
    const h = 0.55 + random() * 0.7
    dummy.position.set(bed![0]! + (random() - 0.5) * 1.6, waterY + h / 2 - 0.08, bed![1]! + (random() - 0.5) * 1)
    dummy.scale.set(1, h, 1)
    dummy.rotation.set((random() - 0.5) * 0.2, 0, (random() - 0.5) * 0.2)
    dummy.updateMatrix()
    reeds.setMatrixAt(i, dummy.matrix)
  }
  swamp.add(reeds)
  const duckweed = addPoints(swamp, renderer, mobile ? 60 : 140, 0x6f8f3a, 0.55, () =>
    new THREE.Vector3((random() - 0.5) * 16, waterY + 0.01, -1.5 - random() * 7)
  )
  duckweed.material.blending = THREE.NormalBlending
  duckweed.material.uniforms.uOpacity!.value = 0.7
  for (let i = 0; i < (mobile ? 10 : 18); i++) {
    addSprite(swamp, glow, 0x8fa392, 0.08, new THREE.Vector3((random() - 0.5) * 12, -0.3 + random() * 2.4, -3 - random() * 8), new THREE.Vector2(1.15, 3.4))
  }
  const wisps = addPoints(swamp, renderer, mobile ? 40 : 90, 0xb8ff9a, 1.15, () =>
    new THREE.Vector3((random() - 0.5) * 14, -2.4 + random() * 3.2, -2 - random() * 9)
  )
  const pads: THREE.Group[] = []
  for (let i = 0; i < (mobile ? 8 : 14); i++) {
    const pad = makeLilyPad(random)
    pad.scale.setScalar(1.8)
    pad.position.set((random() - 0.5) * 8, -2.84, -1.8 - random() * 4)
    if (i < 3) pad.position.set(-3.4 + i * 2.8, -2.84, 1.0 - i * 0.6)
    pad.rotation.y = random() * Math.PI
    swamp.add(pad)
    pads.push(pad)
  }
  const dragonflies = [makeDragonfly(), makeDragonfly()]
  dragonflies.forEach(item=>{item.group.scale.setScalar(1.7);swamp.add(item.group)})
  for(let i=0;i<18;i++) {
    const x=-6+(i%6)*2.3,z=-2-Math.floor(i/6)*1.5
    const h=0.65+random()*0.4
    const stalk=new THREE.Mesh(new THREE.CylinderGeometry(0.009,0.012,h,6),matte(0x737348))
    stalk.position.set(x,waterY+h/2,z);swamp.add(stalk)
    const catkin=new THREE.Mesh(new THREE.CapsuleGeometry(0.035,0.2,4,8),textured(0x5d3e28,'cloth'))
    catkin.position.set(x,waterY+h,z);swamp.add(catkin)
  }
  const frogs = [makeFrog(), makeFrog(), makeFrog()]
  frogs.forEach((frog, i) => {
    frog.scale.setScalar(2.2)
    frog.position.copy(pads[i]!.position)
    frog.position.y += 0.01
    swamp.add(frog)
  })
  const boat = new THREE.Group()
  const hull = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), textured(0x765139, 'wood', { side: THREE.DoubleSide }))
  hull.scale.set(0.7, 0.16, 0.2)
  boat.add(hull)
  const rimCurve = new THREE.CatmullRomCurve3(Array.from({length:32}, (_, i) => new THREE.Vector3(Math.cos(i / 32 * Math.PI * 2) * 0.7, 0, Math.sin(i / 32 * Math.PI * 2) * 0.2)), true)
  boat.add(new THREE.Mesh(new THREE.TubeGeometry(rimCurve, 48, 0.018, 5, true), textured(0xa27c50, 'wood')))
  for (const x of [-0.25, 0.25]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.32), textured(0x9a7348, 'wood'))
    bench.position.set(x, -0.025, 0)
    boat.add(bench)
  }
  swamp.add(boat)
  const heron = makeHeron()
  heron.scale.setScalar(1.7)
  heron.rotation.y = 0.5
  swamp.add(heron)
  const gator = new THREE.Group()
  const gatorBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), matte(0x2a4a28))
  gatorBody.scale.set(2.1, 0.45, 0.7)
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), new THREE.MeshStandardMaterial({ color: 0xc4e36a, emissive: 0xc4e36a, emissiveIntensity: 1.1, fog: false }))
  const eyeR = eyeL.clone()
  eyeL.position.set(0.22, 0.06, 0.06)
  eyeR.position.set(0.22, 0.06, -0.06)
  gator.add(gatorBody, eyeL, eyeR)
  swamp.add(gator)
  tick.push((time, _progress, reduced) => {
    swampWater.material.uniforms.uTime!.value = time
    wisps.points.position.y = Math.sin(time * 0.25) * 0.12
    if (reduced) return
    dragonflies.forEach((item,i)=>{
      item.group.position.set(-2.4+i*4.5+Math.sin(time*0.65+i)*0.35,-1.4+Math.sin(time*1.1+i)*0.12,-2.3+Math.sin(time*0.4+i)*0.25)
      item.group.rotation.y=Math.sin(time*0.3+i)*0.4
      item.update(time)
    })
    pads.forEach((pad, i) => {
      pad.position.y = -2.84 + Math.sin(time * 0.6 + i) * 0.012
    })
    frogs.forEach((frog, i) => {
      frog.position.y = pads[i]!.position.y + 0.01
      frog.userData.animate(time,i*2.1)
      frog.rotation.y = Math.sin(time * 0.2 + i) * 0.4
    })
    boat.position.set(-1.4 + Math.sin(time * 0.12) * 1.1, -2.72, -4.2)
    boat.rotation.z = Math.sin(time * 0.5) * 0.04
    heron.position.set(-3.1, waterY - 0.01, -2.9)
    heron.rotation.y = 0.5 + Math.sin(time * 0.15) * 0.08
    gator.position.set(3.2 + Math.sin(time * 0.08) * 0.45, -2.9 + Math.sin(time * 0.3) * 0.02, -3.5)
  })
  groups.push(swamp)

  const beach = new THREE.Group()
  addDome(beach, 0x315675, 0xe6c6a2, 0xff8a40, new THREE.Vector3(-9, 3, -8))
  beach.add(new THREE.HemisphereLight(0xd8eef2, 0x243038, 0.62))
  const beachSun = addStar(beach, glow, new THREE.Vector3(-8.2, 1.6, -11), 0.48)
  const shore = new THREE.PlaneGeometry(100, 64, mobile ? 70 : 120, mobile ? 45 : 80)
  shore.rotateX(-Math.PI / 2)
  displace(shore, (x, z) => -3.12 + Math.sin(x * 0.5) * 0.08 + Math.max(0, z + 2) * 0.04 - Math.max(0, -z - 8) * 0.24)
  const sandMat = addTerrain(beach, shore, 0x8a6a3a, 0xc9ae7a, 0xe8d4a0, 4.2)
  sandMat.uniforms.uRipple!.value = 0.05
  const sea = addWater(0x123c49, 0x397d86, 0.055, 1, 100, 70, mobile ? 80 : 140)
  sea.mesh.position.set(0, -3.08, -45)
  beach.add(sea.mesh)
  // Wet sand: a darker, slightly glossy band the swash keeps reaching.
  const wetSand = new THREE.Mesh(
    new THREE.PlaneGeometry(40, 2.4),
    new THREE.MeshStandardMaterial({ color: 0x8e7350, roughness: 0.32, metalness: 0.05, transparent: true, opacity: 0.85, fog: false })
  )
  wetSand.rotation.x = -Math.PI / 2
  wetSand.position.set(0, -3.1, -10.3)
  beach.add(wetSand)
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 1.3),
    new THREE.MeshBasicMaterial({ map: foamTexture(), color: 0xf4fbff, transparent: true, opacity: 0.48, depthWrite: false })
  )
  foam.rotation.x = -Math.PI / 2
  foam.position.set(0, -3.04, -10.4)
  beach.add(foam)
  const foam2 = foam.clone()
  foam2.material = (foam.material as THREE.MeshBasicMaterial).clone()
  foam2.scale.set(0.7, 0.6, 1)
  beach.add(foam2)
  const palms: THREE.Group[] = []
  const palmSpots = mobile ? [[-1.4, -1, 0.8], [1.2, -2.5, 0.65], [2.3, -3, 0.75]] : [
    [3.2, 1.9, 0.95],
    [4.6, 1.2, 0.9],
    [5.8, 2.0, 0.98]
  ]
  palmSpots.forEach(([x, z, s]) => {
    const palm = makePalm(random)
    palm.position.set(x!, -3.12 + Math.sin(x! * 0.5) * 0.08 + Math.max(0, z! + 2) * 0.04, z!)
    palm.scale.setScalar(s!)
    beach.add(palm)
    const shadow = contactPatch(glow, 1.4 * s!, 0.48)
    shadow.position.set(x! + 0.2, -3.12 + Math.sin(x! * 0.5) * 0.08 + Math.max(0, z! + 2) * 0.04 + 0.018, z!)
    beach.add(shadow)
    palms.push(palm)
  })
  const lightHouse = makeLighthouse()
  lightHouse.position.set(-7.6, -3.12, -7.8)
  lightHouse.scale.setScalar(1.1)
  beach.add(lightHouse)
  const beam = addSprite(beach, glow, 0xfff1c4, 0.2, new THREE.Vector3(-7.6, -0.45, -7.8), new THREE.Vector2(3.4, 0.4), true)
  const sail = makeSailboat()
  sail.scale.setScalar(1.6)
  beach.add(sail)
  const umbrella = makeUmbrella()
  umbrella.position.set(2.1, -3.12, 0.6)
  umbrella.rotation.y = -0.4
  beach.add(umbrella)
  const crab = makeCrab()
  beach.add(crab)
  const gulls = Array.from({ length: 4 }, () => makeBird(0xf0f3f6))
  gulls.forEach((item) => {
    item.group.scale.setScalar(1.6)
    beach.add(item.group)
  })
  tick.push((time, _progress, reduced) => {
    beachSun.material.uniforms.uTime!.value = time
    sandMat.uniforms.uTime!.value = time
    sea.material.uniforms.uTime!.value = time
    // Swash: the foam line runs up the sand and drains back, the second line trailing it.
    const swash = Math.sin(time * 0.55)
    foam.position.z = -10.4 + swash * 0.55
    ;(foam.material as THREE.MeshBasicMaterial).opacity = 0.28 + Math.max(0, swash) * 0.3
    foam2.position.z = -10.9 + Math.sin(time * 0.55 - 0.9) * 0.4
    ;(foam2.material as THREE.MeshBasicMaterial).opacity = 0.08 + Math.max(0, Math.sin(time * 0.55 - 0.9)) * 0.1
    wetSand.position.z = -10.1 + swash * 0.3
    beam.material.rotation = time * 0.35
    beam.scale.x = 2.6 + Math.sin(time * 0.8) * 0.4
    palms.forEach((palm, i) => {
      palm.rotation.z = Math.sin(time * 0.35 + i) * 0.025
    })
    if (reduced) return
    sail.position.set(2.8 + Math.sin(time * 0.12) * 1.4, -2.9, -13.8)
    sail.rotation.z = Math.sin(time * 0.6) * 0.04
    if (sail.userData.flag) sail.userData.flag.rotation.y = Math.sin(time * 3.2) * 0.25
    crab.position.set(1.4 + Math.sin(time * 0.25) * 0.7, -3.08, -4.8)
    gulls.forEach((item, i) => {
      const t = ((time * 0.06 + i * 0.22) % 1)
      item.group.position.set(-16 + t * 32, 0.9 + i * 0.22 + Math.sin(t * Math.PI * 2) * 0.25, -7 - (i % 2) * 1.2)
      item.update(time, reduced)
    })
  })
  groups.push(beach)

  const ocean = new THREE.Group()
  // An unbroken water column: darkness below, scattered surface light above.
  const abyss = new THREE.ShaderMaterial({
    vertexShader: domeVertex,
    fragmentShader: `
      varying vec3 vDir;
      uniform float uTime;
      void main() {
        vec3 d = normalize(vDir);
        float height = smoothstep(-0.55, 0.85, d.y);
        vec3 color = mix(vec3(0.001, 0.005, 0.012), vec3(0.013, 0.065, 0.085), height);
        float source = exp(-length((d.xy - vec2(-0.34, 0.8)) * vec2(2.8, 1.8)) * 2.4);
        color += vec3(0.025, 0.095, 0.11) * source;
        // Broad, irregular shafts, with no tiled caustic pattern behind the animals.
        float x = d.x + d.y * 0.25;
        float shafts = pow(max(0.0, sin(x * 18.0 + sin(x * 7.0) + uTime * 0.025)), 12.0);
        shafts *= smoothstep(-0.35, 0.65, d.y) * (1.0 - smoothstep(0.7, 1.0, d.y));
        color += vec3(0.014, 0.045, 0.052) * shafts * 0.4;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false
  })
  ocean.add(new THREE.Mesh(new THREE.SphereGeometry(60, 48, 32), abyss))
  ocean.add(new THREE.HemisphereLight(0x87b7c5, 0x02070c, 0.28))
  const oceanKey = new THREE.DirectionalLight(0xa8ccd5, 1.4)
  oceanKey.position.set(-5, 8, 4)
  ocean.add(oceanKey)
  const marine = addPoints(ocean, renderer, mobile ? 75 : 160, 0x7fadb6, 0.32, () =>
    new THREE.Vector3((random() - 0.5) * 20, (random() - 0.5) * 12, -1 - random() * 14)
  )
  marine.material.uniforms.uOpacity!.value = 0.18
  const fishColors = [0x537a83, 0x829caa, 0x9a8766, 0x617b91]
  const fish = Array.from({ length: mobile ? 8 : 12 }, (_, i) => {
    const item = makeFish(fishColors[i % fishColors.length]!, i % 3)
    const depth = random()
    item.group.userData = {
      ...item.group.userData,
      dir: i % 3 ? 1 : -1,
      speed: 0.09 + random() * 0.12,
      y: -2.4 + random() * 3.2 + depth,
      z: -2 - depth * 8,
      span: 10 + depth * 7,
      wander: 0.6 + random() * 1.4,
      phase: random() * 10
    }
    item.group.scale.setScalar((0.8 + random() * 0.3) * (1 - depth * 0.25))
    ocean.add(item.group)
    return item
  })
  const jelly = [makeJelly(0xc5d9d6), makeJelly(0xa9c0c9), makeJelly(0xc3cdc5)]
  jelly.forEach((item, i) => {
    item.group.scale.setScalar([1.0, 0.68, 0.46][i]!)
    ocean.add(item.group)
  })
  const shark = makeShark()
  ocean.add(shark.group)
  tick.push((time, _progress, reduced) => {
    abyss.uniforms.uTime!.value = time
    marine.points.position.y = -((time * 0.08) % 1.2)
    if (reduced) return
    fish.forEach((item, i) => {
      // Each fish follows a slow wandering path; heading comes from where it is going, not a fixed facing.
      const data = item.group.userData
      const pathAt = (t: number) => {
        const loop = ((t * data.speed + data.phase) % (data.span * 2)) - data.span
        return new THREE.Vector3(
          data.dir * loop,
          data.y + Math.sin(t * 0.3 + i) * 0.22,
          data.z + Math.sin(t * 0.22 + i * 1.3) * data.wander
        )
      }
      const here = pathAt(time)
      const ahead = pathAt(time + 0.5)
      item.group.position.copy(here)
      item.group.rotation.y = Math.atan2(ahead.x - here.x, ahead.z - here.z) - Math.PI / 2
      item.group.rotation.z = (ahead.y - here.y) * 1.5
      item.update(time, reduced)
    })
    jelly.forEach((item, i) => {
      item.group.position.set((mobile ? [-1.0, -2.2, 1.1] : [-3.6, -6.5, -0.8])[i]! + Math.sin(time * 0.07 + i) * 0.25, [0.7, 1.8, 2.5][i]! + Math.sin(time * 0.28 + i * 2) * 0.13, [-1.6, -5.5, -8][i]!)
      item.group.rotation.z = Math.sin(time * 0.13 + i) * 0.07
      item.update(time, reduced)
    })
    // A closed, continuous oval: heading follows the tangent, never a modulo reset.
    const phase = time * 0.055 + 0.65
    shark.group.position.set(Math.sin(phase) * 9.5, -1.0 + Math.sin(phase * 2) * 0.16, -8 + Math.cos(phase) * 4.2)
    const dx = Math.cos(phase) * 9.5
    const dz = -Math.sin(phase) * 4.2
    shark.group.rotation.set(0, -Math.atan2(dz, dx), Math.sin(phase) * 0.025)
    shark.update(time, reduced)
  })
  groups.push(ocean)

  groups.forEach((group, index) => {
    group.position.z = -(index + 1) * Z_STEP
  })

  // Compose every station once; animate only the station currently in view.
  tick.forEach(fn => fn(12, 0, false))
  return {
    groups,
    update: (time, progress, reduced) => {
      // Initialize every actor at a composed pose, including reduced-motion visits.
      const index = Math.round(progress * 7) - 1
      if (index >= 0) tick[index]?.(reduced ? 12 : time, progress, false)
    }
  }
}
