import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PackPilot',
  description: 'Created with ❤️',
  icons: '/logo_image.jpg',
  generator: 'Adithya Hegde Kota',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
