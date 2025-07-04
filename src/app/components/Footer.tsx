import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm border-t">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <span className="text-xs text-muted-foreground">Powered by</span>
          <Link 
            href="https://mantelgroup.com.au" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/mantel-logo.png"
              alt="Mantel Group"
              width={100}
              height={32}
              className="h-6 w-auto"
              priority
            />
          </Link>
        </div>
      </div>
    </footer>
  )
}