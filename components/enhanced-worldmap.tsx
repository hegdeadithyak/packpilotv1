"use client"

import { useRef, useMemo } from "react"
import { motion } from "framer-motion"

interface MapProps {
  dots?: Array<{
    start: { lat: number; lng: number; label?: string }
    end: { lat: number; lng: number; label?: string }
  }>
  lineColor?: string
}

export function EnhancedWorldMap({
  dots = [
    {
      start: { lat: 40.7128, lng: -74.006 }, // New York
      end: { lat: 51.5074, lng: -0.1278 }, // London
    },
    {
      start: { lat: 35.6762, lng: 139.6503 }, // Tokyo
      end: { lat: -33.8688, lng: 151.2093 }, // Sydney
    },
    {
      start: { lat: 28.6139, lng: 77.209 }, // Delhi
      end: { lat: 55.7558, lng: 37.6176 }, // Moscow
    },
    {
      start: { lat: -23.5505, lng: -46.6333 }, // São Paulo
      end: { lat: 1.3521, lng: 103.8198 }, // Singapore
    },
    {
      start: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
      end: { lat: 31.2304, lng: 121.4737 }, // Shanghai
    },
  ],
  lineColor = "#0ea5e9",
}: MapProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Memoize world map dots to prevent recreation on every render
  const worldDots = useMemo(() => {
    const dots = []
    const width = 800
    const height = 400
    const dotSpacing = 12 // Increased spacing to reduce dot count

    for (let x = 0; x < width; x += dotSpacing) {
      for (let y = 0; y < height; y += dotSpacing) {
        const normalizedX = x / width
        const normalizedY = y / height

        // Simplified continent shapes with fewer conditions
        const isLand =
          // North America
          (normalizedX > 0.1 && normalizedX < 0.35 && normalizedY > 0.2 && normalizedY < 0.7) ||
          // South America
          (normalizedX > 0.15 && normalizedX < 0.3 && normalizedY > 0.5 && normalizedY < 0.9) ||
          // Europe/Africa
          (normalizedX > 0.4 && normalizedX < 0.65 && normalizedY > 0.1 && normalizedY < 0.8) ||
          // Asia
          (normalizedX > 0.6 && normalizedX < 0.9 && normalizedY > 0.1 && normalizedY < 0.6) ||
          // Australia
          (normalizedX > 0.75 && normalizedX < 0.85 && normalizedY > 0.7 && normalizedY < 0.8)

        if (isLand && Math.random() > 0.4) { // Reduced density
          dots.push({ x, y, delay: Math.random() * 3 })
        }
      }
    }
    return dots
  }, [])

  // Memoize projection calculations
  const projectedPoints = useMemo(() => {
    const projectPoint = (lat: number, lng: number) => {
      const x = (lng + 180) * (800 / 360)
      const y = (90 - lat) * (400 / 180)
      return { x, y }
    }

    return dots.map(dot => ({
      start: projectPoint(dot.start.lat, dot.start.lng),
      end: projectPoint(dot.end.lat, dot.end.lng),
    }))
  }, [dots])

  // Memoize curved paths
  const paths = useMemo(() => {
    const createCurvedPath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const midX = (start.x + end.x) / 2
      const midY = Math.min(start.y, end.y) - 50
      return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`
    }

    return projectedPoints.map(points => createCurvedPath(points.start, points.end))
  }, [projectedPoints])

  // Memoize floating particles positions
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({ // Reduced from 30 to 15
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
    }))
  }, [])

  return (
    <div className="w-full h-full relative font-sans bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/70 via-blue-900/30 to-gray-900/70" />

      {/* World map dots */}
      <svg viewBox="0 0 800 400" className="w-full h-full absolute inset-0 pointer-events-none select-none">
        {/* Render world map dots with CSS animations instead of individual style animations */}
        <g className="animate-pulse">
          {worldDots.map((dot, i) => (
            <circle
              key={`world-dot-${i}`}
              cx={dot.x}
              cy={dot.y}
              r="1.2"
              fill="rgba(59, 130, 246, 0.6)"
              style={{
                animationDelay: `${dot.delay}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </g>

        <defs>
          <linearGradient id="path-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="5%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="95%" stopColor={lineColor} stopOpacity="1" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Connection paths */}
        {paths.map((path, i) => (
          <motion.path
            key={`path-${i}`}
            d={path}
            fill="none"
            stroke="url(#path-gradient)"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 2,
              delay: 0.5 * i,
              ease: "easeOut",
              repeat: Infinity,
              repeatDelay: 3,
            }}
          />
        ))}

        {/* Connection points with simplified animations */}
        {projectedPoints.map((points, i) => (
          <g key={`points-${i}`}>
            {/* Start point */}
            <circle cx={points.start.x} cy={points.start.y} r="3" fill={lineColor} />
            <circle cx={points.start.x} cy={points.start.y} r="3" fill={lineColor} opacity="0.5">
              <animate attributeName="r" values="3;12;3" dur="3s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" repeatCount="indefinite" />
            </circle>
            
            {/* End point */}
            <circle cx={points.end.x} cy={points.end.y} r="3" fill={lineColor} />
            <circle cx={points.end.x} cy={points.end.y} r="3" fill={lineColor} opacity="0.5">
              <animate attributeName="r" values="3;12;3" dur="3s" begin="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin="1s" repeatCount="indefinite" />
            </circle>
          </g>
        ))}
      </svg>

      {/* Floating particles with reduced count and optimized animations */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              animation: `float ${particle.duration}s infinite ${particle.delay}s ease-in-out`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          25% { transform: translateY(-10px) translateX(5px); opacity: 0.7; }
          50% { transform: translateY(-5px) translateX(-5px); opacity: 0.5; }
          75% { transform: translateY(-15px) translateX(3px); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}