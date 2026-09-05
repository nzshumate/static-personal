import * as THREE from 'three'

// Object-space grain keeps the surface attached to the model during travel.
export const textured = (color: number, kind: 'wood' | 'stone' | 'cloth', extra: THREE.MeshStandardMaterialParameters = {}) => {
  const material = new THREE.MeshStandardMaterial({ color, roughness: kind === 'cloth' ? 0.85 : 0.94, ...extra })
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vSurface;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurface = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vSurface;
      float surfaceHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float surfaceNoise(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(mix(surfaceHash(i),surfaceHash(i+vec3(1,0,0)),f.x),mix(surfaceHash(i+vec3(0,1,0)),surfaceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(surfaceHash(i+vec3(0,0,1)),surfaceHash(i+vec3(1,0,1)),f.x),mix(surfaceHash(i+vec3(0,1,1)),surfaceHash(i+vec3(1,1,1)),f.x),f.y),f.z);
      }
    `).replace('#include <color_fragment>', `#include <color_fragment>
      vec3 grainP = vSurface * ${kind === 'wood' ? 'vec3(48.0, 2.5, 48.0)' : kind === 'cloth' ? 'vec3(150.0)' : 'vec3(12.0)'};
      float grain = surfaceNoise(grainP) * 0.65 + surfaceNoise(grainP * 3.1) * 0.35;
      diffuseColor.rgb *= 0.78 + grain * 0.32;
    `)
  }
  material.customProgramCacheKey = () => `surface-${kind}`
  return material
}

export const contactPatch = (texture: THREE.Texture, radius: number, opacity = 0.35) => {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radius * 2, radius * 2), new THREE.MeshBasicMaterial({
    map: texture, color: 0x02080a, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1
  }))
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

export const foamTexture = () => {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const pixels = ctx.createImageData(512, 64)
  for (let y = 0; y < 64; y++) for (let x = 0; x < 512; x++) {
    const center = 30 + Math.sin(x * 0.026) * 8 + Math.sin(x * 0.13) * 3
    const band = Math.exp(-Math.pow((y - center) / 8, 2))
    const breakup = Math.sin(x * 0.37 + y * 0.9) * Math.cos(x * 0.17 - y * 0.7) * 0.5 + 0.5
    const i = (y * 512 + x) * 4
    pixels.data[i] = 226; pixels.data[i + 1] = 239; pixels.data[i + 2] = 232
    pixels.data[i + 3] = band * (0.1 + breakup * 0.9) * 255
  }
  ctx.putImageData(pixels, 0, 0)
  const map = new THREE.CanvasTexture(canvas)
  map.colorSpace = THREE.SRGBColorSpace
  return map
}
