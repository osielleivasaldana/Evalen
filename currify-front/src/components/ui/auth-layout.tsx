import * as React from "react"
import { cn } from "../../lib/utils"

export interface AuthLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  features?: {
    icon: React.ReactNode
    title: string
    description: string
  }[]
}

function AuthLayout({ children, title, subtitle, features }: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex overflow-hidden bg-background font-jakarta">
      {/* LEFT PANEL - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-brand overflow-hidden items-center justify-center">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          {/* Diagonal lines pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="diagonal-pattern" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="28" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#diagonal-pattern)" />
          </svg>

          {/* Gradient orbs */}
          <div className="absolute top-[-30%] left-[-20%] w-[70%] h-[70%] bg-white/20 rounded-full blur-[180px] animate-pulse" style={{ animationDuration: '8s' }} />
          <div className="absolute bottom-[-25%] right-[-15%] w-[60%] h-[60%] bg-purple-300/20 rounded-full blur-[160px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
          <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] bg-indigo-300/15 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '12s', animationDelay: '0.5s' }} />

          {/* Floating dots */}
          <div className="absolute top-[15%] right-[20%] w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute top-[25%] left-[15%] w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-[30%] left-[25%] w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-xl px-12 text-white flex flex-col justify-center h-full">
          {/* Logo */}
          <div className="relative mb-14 group">
            <div className="absolute -inset-6 bg-white/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition duration-700" />
            <div className="relative">
              <svg width="280" height="75" viewBox="0 0 180 48" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                <defs>
                  <linearGradient id="evalen-gradient-auth" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e0e7ff" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path d="M0 8 L0 40 L24 40 L24 35 L6 35 L6 26 L20 26 L20 21 L6 21 L6 13 L24 13 L24 8 Z" fill="url(#evalen-gradient-auth)" filter="url(#glow)" />
                <path d="M18 8 L24 8 L6 40 L0 40 Z" fill="rgba(126, 58, 242, 0.3)" />
                <text x="30" y="34" fontFamily="'Plus Jakarta Sans', sans-serif" fontSize="28" fontWeight="700" fill="#ffffff" letterSpacing="-1">valen</text>
              </svg>
            </div>
          </div>

          {/* Headline */}
          {title && (
            <h1 className="text-5xl font-bold leading-tight mb-6 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-purple-200">
                {title}
              </span>
            </h1>
          )}

          {subtitle && (
            <p className="text-lg text-white/70 mb-12 leading-relaxed font-normal max-w-lg">
              {subtitle}
            </p>
          )}

          {/* Features */}
          {features && (
            <div className="space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-5 group cursor-default">
                  <div className="relative">
                    <div className="absolute inset-0 bg-white/20 blur-lg rounded-2xl group-hover:bg-white/30 transition-all duration-500" />
                    <div className="relative w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-base mb-0.5">{feature.title}</h3>
                    <p className="text-sm text-white/55 font-medium">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Trust badge */}
          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-xs text-white/40 font-semibold tracking-widest uppercase">
              Used by forward-thinking teams
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative bg-background">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}

export { AuthLayout }
