<script setup lang="ts">
import * as THREE from 'three'

let frame = 0
let renderer: THREE.WebGLRenderer | null = null
let onResize: (() => void) | null = null
let onScroll: (() => void) | null = null
let onPointer: ((event: PointerEvent) => void) | null = null

onMounted(async () => {
  await nextTick()
  const canvas = document.getElementById('cinematic-atmosphere') as HTMLCanvasElement | null
  if (!canvas) return

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(48, 1, .1, 100)
  camera.position.z = 8

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.35))

  let seed = 93117
  const random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646 }
  const count = window.innerWidth < 800 ? 450 : 1100
  const positions = new Float32Array(count * 3)
  const sizes = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - .5) * 20
    positions[i * 3 + 1] = (random() - .5) * 12
    positions[i * 3 + 2] = -random() * 12
    sizes[i] = .4 + random() * 1.7
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uPointer: { value: new THREE.Vector2() }
    },
    vertexShader: `
      attribute float aSize;
      uniform float uTime;
      uniform float uProgress;
      uniform vec2 uPointer;
      varying float vAlpha;
      void main(){
        vec3 p=position;
        float depth=1.0+(-p.z)*.035;
        p.x += uPointer.x*(.08+.07*depth);
        p.y += uPointer.y*(.05+.04*depth);
        p.y += sin(uTime*.11+p.x*.8+p.z)*.045;
        p.x += cos(uTime*.08+p.y*.7)*.025;
        vec4 mv=modelViewMatrix*vec4(p,1.0);
        gl_Position=projectionMatrix*mv;
        gl_PointSize=aSize*(85.0/-mv.z);
        float land=smoothstep(.13,.3,uProgress)*(1.0-smoothstep(.82,.96,uProgress));
        float ocean=smoothstep(.84,1.0,uProgress);
        vAlpha=mix(.34,.13,land)+ocean*.18;
      }
    `,
    fragmentShader: `
      uniform float uProgress;
      varying float vAlpha;
      void main(){
        vec2 q=gl_PointCoord-.5;
        float d=length(q);
        if(d>.5)discard;
        float a=smoothstep(.5,.0,d)*vAlpha;
        vec3 space=vec3(.72,.82,1.0);
        vec3 land=vec3(.82,.92,.88);
        vec3 warm=vec3(1.0,.72,.42);
        vec3 deep=vec3(.33,.88,.94);
        vec3 c=mix(space,land,smoothstep(.12,.38,uProgress));
        c=mix(c,warm,smoothstep(.48,.63,uProgress)*(1.0-smoothstep(.63,.75,uProgress)));
        c=mix(c,deep,smoothstep(.82,1.0,uProgress));
        gl_FragColor=vec4(c,a);
      }
    `
  })

  const points = new THREE.Points(geometry, material)
  scene.add(points)

  let target = 0
  let progress = 0
  let px = 0
  let py = 0
  onScroll = () => { target = scrollY / Math.max(document.documentElement.scrollHeight - innerHeight, 1) }
  onPointer = (event) => { px = event.clientX / innerWidth * 2 - 1; py = -(event.clientY / innerHeight) * 2 + 1 }
  onResize = () => {
    if (!renderer) return
    camera.aspect = innerWidth / Math.max(innerHeight, 1)
    camera.updateProjectionMatrix()
    renderer.setSize(innerWidth, innerHeight, false)
  }
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('pointermove', onPointer, { passive: true })
  addEventListener('resize', onResize)
  onScroll(); onResize()

  const clock = new THREE.Clock()
  const tick = () => {
    progress += (target - progress) * .045
    material.uniforms.uTime.value = clock.getElapsedTime()
    material.uniforms.uProgress.value = progress
    material.uniforms.uPointer.value.x += (px - material.uniforms.uPointer.value.x) * .035
    material.uniforms.uPointer.value.y += (py - material.uniforms.uPointer.value.y) * .035
    points.rotation.z = Math.sin(clock.elapsedTime * .025) * .008
    renderer?.render(scene, camera)
    frame = requestAnimationFrame(tick)
  }
  tick()

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    removeEventListener('scroll', onScroll!)
    removeEventListener('pointermove', onPointer!)
    removeEventListener('resize', onResize!)
    geometry.dispose(); material.dispose(); renderer?.dispose()
  })
})
</script>

<template><canvas id="cinematic-atmosphere" aria-hidden="true" style="position:fixed;inset:0;width:100vw;height:100vh;z-index:2;pointer-events:none" /></template>
