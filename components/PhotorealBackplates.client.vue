<script setup lang="ts">
const layers=[
  {id:'orbit',start:0,peak:.035,end:.14},
  {id:'sky',start:.07,peak:.17,end:.28},
  {id:'mountain',start:.19,peak:.305,end:.42},
  {id:'forest',start:.32,peak:.445,end:.56},
  {id:'desert',start:.46,peak:.575,end:.69},
  {id:'swamp',start:.59,peak:.705,end:.82},
  {id:'beach',start:.72,peak:.84,end:.94},
  {id:'ocean',start:.84,peak:.96,end:1.01}
]
const worldOpacity=[1,.2,.13,.08,.08,.1,.13,.58]
let onScroll:(()=>void)|null=null
let frame=0
const clamp=(v:number)=>Math.max(0,Math.min(1,v))
const smooth=(a:number,b:number,v:number)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t)}
const pulse=(v:number,a:number,b:number,c:number)=>v<=a||v>=c?0:v<b?smooth(a,b,v):1-smooth(b,c,v)

onMounted(()=>{
  const root=document.getElementById('photoreal-backplates')
  if(!root)return
  let target=0,current=0
  onScroll=()=>{target=window.scrollY/Math.max(document.documentElement.scrollHeight-window.innerHeight,1)}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll()
  const tick=()=>{
    current+=(target-current)*.055
    layers.forEach(layer=>{
      const el=root.querySelector<HTMLElement>(`[data-backplate="${layer.id}"]`)
      if(!el)return
      const amount=pulse(current,layer.start,layer.peak,layer.end)
      el.style.opacity=String(amount)
      const drift=(current-layer.peak)*18
      el.style.transform=`scale(1.045) translate3d(${drift*.16}px,${drift}px,0)`
    })
    const fi=clamp(current)*7,idx=Math.min(6,Math.floor(fi)),m=fi-idx
    const opacity=worldOpacity[idx]+(worldOpacity[idx+1]-worldOpacity[idx])*m
    document.documentElement.style.setProperty('--world-opacity',String(opacity))
    const atmosphere=root.querySelector<HTMLElement>('.backplate-atmosphere')
    if(atmosphere)atmosphere.style.opacity=String(.12+smooth(.1,.95,current)*.22)
    frame=requestAnimationFrame(tick)
  }
  tick()
})

onBeforeUnmount(()=>{
  cancelAnimationFrame(frame)
  document.documentElement.style.removeProperty('--world-opacity')
  if(onScroll)window.removeEventListener('scroll',onScroll)
})
</script>

<template>
  <div id="photoreal-backplates" class="photoreal-backplates" aria-hidden="true">
    <div data-backplate="orbit" class="photo-backplate photo-orbit" />
    <div data-backplate="sky" class="photo-backplate photo-sky" />
    <div data-backplate="mountain" class="photo-backplate photo-mountain" />
    <div data-backplate="forest" class="photo-backplate photo-forest" />
    <div data-backplate="desert" class="photo-backplate photo-desert" />
    <div data-backplate="swamp" class="photo-backplate photo-swamp" />
    <div data-backplate="beach" class="photo-backplate photo-beach" />
    <div data-backplate="ocean" class="photo-backplate photo-ocean" />
    <div class="backplate-atmosphere" />
    <div class="backplate-vignette" />
  </div>
</template>
