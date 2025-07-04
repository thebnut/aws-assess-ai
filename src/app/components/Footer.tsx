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
            className="hover:opacity-80 transition-opacity flex items-center gap-2"
          >
            {/* Mantel Logo - Replace with actual logo image */}
            <svg 
              width="100" 
              height="32" 
              viewBox="0 0 200 64" 
              className="h-6 w-auto"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Triangle shapes similar to Mantel logo */}
              <path d="M20 50 L40 20 L60 50 Z" fill="#8BBEE8" opacity="0.8" />
              <path d="M30 50 L50 20 L70 50 Z" fill="#C97A7E" opacity="0.8" />
              
              {/* Mantel text */}
              <text x="85" y="42" fill="#2C5282" fontSize="28" fontWeight="bold" fontFamily="system-ui">
                Mantel
              </text>
            </svg>
          </Link>
        </div>
      </div>
    </footer>
  )
}