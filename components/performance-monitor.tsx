"use client"

import { useState, useEffect, useRef } from "react"
import { Activity } from "lucide-react"

export function PerformanceMonitor() {
  const [fps, setFps] = useState(0)
  const [memoryUsage, setMemoryUsage] = useState(0)
  const frameCount = useRef(0)
  const lastTime = useRef(performance.now())

  useEffect(() => {
    const updatePerformance = () => {
      frameCount.current++
      const currentTime = performance.now()

      if (currentTime - lastTime.current >= 1000) {
        setFps(frameCount.current)
        frameCount.current = 0
        lastTime.current = currentTime

        // Memory usage (if available)
        if ("memory" in performance) {
          const memory = (performance as any).memory
          setMemoryUsage(memory.usedJSHeapSize / 1024 / 1024)
        }
      }

      requestAnimationFrame(updatePerformance)
    }

    updatePerformance()
  }, [])

  return (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center space-x-1">
        <Activity className="h-4 w-4 text-green-400" />
        <span className="text-primary">FPS:</span>
        <span
          className={`font-bold ${fps > 60 ? "text-green-400" : fps > 30 ? "text-yellow-400" : "text-red-400"}`}
        >
          {fps}
        </span>
      </div>
      {memoryUsage > 0 && (
        <div className="flex items-center space-x-1">
          <span className="text-primary">Memory:</span>
          <span className="text-white font-bold">{memoryUsage.toFixed(1)}MB</span>
        </div>
      )}
    </div>
  )
}
