import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StayEase Admin',
    short_name: 'StayEase Admin',
    description: 'Hotel management panel',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#111827',
    icons: [{ src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' }],
  }
}
