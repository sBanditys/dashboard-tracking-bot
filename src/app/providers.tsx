'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { usePathname, useSearchParams } from 'next/navigation'
import NProgress from 'nprogress'
import { Suspense, useEffect, useState } from 'react'
import { Toaster } from 'sonner'

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Configure NProgress on mount
    NProgress.configure({
      showSpinner: false,
      trickleSpeed: 200,
      minimum: 0.08,
    })

    // Add custom styling for accent-purple color
    const style = document.createElement('style')
    style.id = 'nprogress-custom-styles'
    style.textContent = `
      #nprogress {
        pointer-events: none;
      }
      #nprogress .bar {
        background: #8B5CF6 !important;
        position: fixed;
        z-index: 9999;
        top: 0;
        left: 0;
        width: 100%;
        height: 2px;
      }
      #nprogress .peg {
        display: block;
        position: absolute;
        right: 0px;
        width: 100px;
        height: 100%;
        box-shadow: 0 0 10px #8B5CF6, 0 0 5px #8B5CF6;
        opacity: 1.0;
        transform: rotate(3deg) translate(0px, -4px);
      }
    `

    // Only add if not already present
    if (!document.getElementById('nprogress-custom-styles')) {
      document.head.appendChild(style)
    }

    return () => {
      // Cleanup on unmount
      const existingStyle = document.getElementById('nprogress-custom-styles')
      if (existingStyle) {
        existingStyle.remove()
      }
    }
  }, [])

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  return null
}

function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes - prevent memory growth
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
      >
        <NavigationProgress />
        <Toaster
          position="top-right"
          visibleToasts={3}
          theme="dark"
          toastOptions={{
            style: {
              background: '#2d2d2d',
              border: '1px solid #404040',
              color: '#ffffff',
            },
          }}
        />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
