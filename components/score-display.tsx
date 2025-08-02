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

  return (
    <div className="flex space-x-4">
      <Card className="bg-gray-800/50 border border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${getScoreBackground(stabilityScore)}`}>
              <TrendingUp className={`h-4 w-4 ${getScoreColor(stabilityScore)}`} />
            </div>
            <div>
              <div className="text-xs text-primary">Stability</div>
              <div className={`text-sm font-bold ${getScoreColor(stabilityScore)}`}>
                {stabilityScore.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${getScoreBackground(safetyScore)}`}>
              <Shield className={`h-4 w-4 ${getScoreColor(safetyScore)}`} />
            </div>
            <div>
              <div className="text-xs text-primary">Safety</div>
              <div className={`text-sm font-bold ${getScoreColor(safetyScore)}`}>
                {safetyScore.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-800/50 border border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center space-x-2">
            <div className={`p-1 rounded ${getScoreBackground(optimizationScore)}`}>
              <Target className={`h-4 w-4 ${getScoreColor(optimizationScore)}`} />
            </div>
            <div>
              <div className="text-xs text-primary">Optimization</div>
              <div className={`text-sm font-bold ${getScoreColor(optimizationScore)}`}>
                {optimizationScore.toFixed(1)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
