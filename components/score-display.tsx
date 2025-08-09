"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, Shield, Target } from "lucide-react"

interface ScoreDisplayProps {
  stabilityScore: number
  safetyScore: number
  optimizationScore: number
}

export function ScoreDisplay({ stabilityScore, safetyScore, optimizationScore }: ScoreDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400"
    if (score >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-400/20"
    if (score >= 60) return "bg-yellow-400/20"
    return "bg-red-400/20"
  }

  return null;
}
