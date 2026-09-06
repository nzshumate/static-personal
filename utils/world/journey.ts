// Anchor positions are shared by the renderer and chapter navigation.
export const readJourneyProgress = () => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.journey-scene'))
  if (sections.length < 2) return 0
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight)
  const scroll = Math.min(max, Math.max(0, scrollY))
  const stops = sections.map(section => Math.min(max, section.offsetTop))
  for (let i = 0; i < stops.length - 1; i++) {
    if (scroll <= stops[i + 1]!) {
      return (i + (scroll - stops[i]!) / Math.max(1, stops[i + 1]! - stops[i]!)) / (stops.length - 1)
    }
  }
  return 1
}
