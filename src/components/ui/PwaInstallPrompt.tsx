/**
 * PwaInstallPrompt.tsx
 *
 * Shows a bottom-right install banner when the browser fires
 * the `beforeinstallprompt` event (Chrome/Edge/Android).
 *
 * - Persists dismissal in localStorage so it doesn't re-appear for 30 days.
 * - Automatically hides on iOS (where the prompt API isn't available) and
 *   shows manual "Add to Home Screen" instructions instead.
 */

import { useState, useEffect } from 'react'
import { X, Download, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const DISMISSED_KEY = 'admin-pwa-dismissed-until'
const DISMISS_DAYS  = 30

function isDismissed(): boolean {
  const until = localStorage.getItem(DISMISSED_KEY)
  if (!until) return false
  return Date.now() < Number(until)
}

function dismiss() {
  localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_DAYS * 86400_000))
}

// Detect iOS (no beforeinstallprompt support)
function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// Detect standalone mode (already installed)
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null)
  const [showBanner, setShowBanner]         = useState(false)
  const [showIos, setShowIos]               = useState(false)
  const [installing, setInstalling]         = useState(false)
  const [installed, setInstalled]           = useState(false)

  useEffect(() => {
    // Already installed or dismissed — don't show
    if (isStandalone() || isDismissed()) return

    // iOS: show manual instructions after a short delay
    if (isIos()) {
      const t = setTimeout(() => setShowIos(true), 3000)
      return () => clearTimeout(t)
    }

    // Chrome/Edge: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowBanner(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setInstalled(true)
      setShowBanner(false)
      setDeferredPrompt(null)
    })

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      // Cast through unknown to satisfy strict TypeScript
      const prompt = deferredPrompt as unknown as {
        prompt: () => void
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
      }
      prompt.prompt()
      const { outcome } = await prompt.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setShowBanner(false)
      } else {
        dismiss()
        setShowBanner(false)
      }
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    dismiss()
    setShowBanner(false)
    setShowIos(false)
  }

  // ── Chrome/Edge install banner ─────────────────────────────────────────────
  if (showBanner && !installed) {
    return (
      <div
        role="dialog"
        aria-label="Install FitTrack Admin app"
        aria-live="polite"
        className={cn(
          'fixed bottom-4 right-4 z-50 w-80 rounded-xl border border-border bg-card shadow-2xl',
          'animate-fade-in',
        )}
      >
        <div className="p-4 flex items-start gap-3">
          {/* Icon */}
          <div className="shrink-0 flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden border border-border">
            <img src="/icon-96.png" alt="FitTrack Admin icon" className="h-full w-full" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install FitTrack Admin</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Add to your home screen for faster access and offline support.
            </p>
          </div>

          {/* Close */}
          <button
            onClick={handleDismiss}
            aria-label="Dismiss install prompt"
            className="shrink-0 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold py-2 px-3 hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {installing ? 'Installing…' : 'Install app'}
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-lg border border-border bg-secondary text-secondary-foreground text-sm font-medium py-2 px-3 hover:bg-secondary/80 transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    )
  }

  // ── iOS instructions ───────────────────────────────────────────────────────
  if (showIos) {
    return (
      <div
        role="dialog"
        aria-label="Add to Home Screen instructions for iOS"
        aria-live="polite"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 rounded-xl border border-border bg-card shadow-2xl animate-fade-in"
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden border border-border">
                <img src="/icon-96.png" alt="" className="h-full w-full" aria-hidden="true" />
              </div>
              <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
            </div>
            <button onClick={handleDismiss} aria-label="Close" className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">1</span>
              Tap the <strong className="text-foreground mx-1">Share</strong> button in Safari's toolbar
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">2</span>
              Scroll down and tap <strong className="text-foreground mx-1">Add to Home Screen</strong>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-[10px] font-bold">3</span>
              Tap <strong className="text-foreground mx-1">Add</strong> to confirm
            </li>
          </ol>
        </div>
      </div>
    )
  }

  return null
}
