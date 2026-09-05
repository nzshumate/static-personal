export const usePageMeta = (title: string, description: string) => {
  const fullTitle = title + ' | Nathan Shumate'
  useSeoMeta({ title: fullTitle, description, ogTitle: fullTitle, ogDescription: description, ogType: 'website', twitterCard: 'summary' })
}
