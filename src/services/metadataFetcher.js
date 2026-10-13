export const MetadataFetcher = {
  /**
   * Fetches page metadata (title, description, image) for a given link URL
   */
  async fetchUrlMetadata(url) {
    if (!url || typeof url !== 'string') {
      throw new Error('Valid URL required')
    }

    const cleanUrl = url.trim()
    let domain = ''
    try {
      const parsedUrl = new URL(cleanUrl)
      domain = parsedUrl.hostname.replace('www.', '')
    } catch {
      domain = 'web'
    }

    // 1. Try internal Vite server proxy middleware
    try {
      const res = await fetch(`/api/scrape?url=${encodeURIComponent(cleanUrl)}`, {
        signal: AbortSignal.timeout(6000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.title || data.image || data.description) {
          return {
            title: data.title || '',
            description: data.description || '',
            image: data.image || null,
            siteName: data.siteName || domain,
            url: cleanUrl,
          }
        }
      }
    } catch (e) {
      // Internal proxy failed, try fallback
    }

    // 2. Try Microlink free API fallback
    try {
      const microlinkRes = await fetch(
        `https://api.microlink.io?url=${encodeURIComponent(cleanUrl)}`,
        { signal: AbortSignal.timeout(6000) }
      )
      if (microlinkRes.ok) {
        const json = await microlinkRes.json()
        if (json.status === 'success' && json.data) {
          const d = json.data
          return {
            title: d.title || '',
            description: d.description || '',
            image: d.image?.url || null,
            siteName: d.publisher || domain,
            url: cleanUrl,
          }
        }
      }
    } catch (e) {
      // Fallback failed
    }

    // 3. Fallback placeholder
    return {
      title: `Offer at ${domain}`,
      description: `Post clipped from ${cleanUrl}`,
      image: null,
      siteName: domain,
      url: cleanUrl,
    }
  },
}
