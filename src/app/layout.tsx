import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Footer from './components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AWS Migration Assessment Tool',
  description: 'AI-driven AWS migration assessment tool by Mantel Group',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen pb-16">
          {children}
        </div>
        <Footer />
      </body>
    </html>
  )
}