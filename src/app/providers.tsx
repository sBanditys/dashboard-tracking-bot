'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, useTheme } from 'next-themes'
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
        background: #c6a66d !important;
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
        box-shadow: 0 0 10px #c6a66d, 0 0 5px #c6a66d;
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

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  const isLight = resolvedTheme === 'light'

  return (
    <Toaster
      position="top-right"
      visibleToasts={3}
      theme={isLight ? 'light' : 'dark'}
      toastOptions={{
        duration: 5000,
        style: {
          background: isLight ? '#fffdfa' : '#19150f',
          border: isLight ? '1px solid rgba(116, 94, 63, 0.24)' : '1px solid rgba(208, 173, 109, 0.22)',
          color: isLight ? '#1b1813' : '#f6f1e6',
          boxShadow: isLight
            ? '0 1px 3px rgba(34, 26, 14, 0.08), 0 14px 32px rgba(34, 26, 14, 0.08)'
            : '0 2px 6px rgba(0, 0, 0, 0.35), 0 20px 40px rgba(0, 0, 0, 0.28)',
        },
      }}
    />
  )
}

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
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
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={true} nonce={nonce}>
        <NavigationProgress />
        <ThemedToaster />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  )
}
