import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    "name": "My PWA",
    "short_name": "PWA",
    "start_url": "/",
    "display": "standalone",
    "scope": "/",
    "icons": [
      {
        "src": "/icon.png",
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  }
}