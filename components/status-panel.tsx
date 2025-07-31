
"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useOptimizationStore } from "@/store/optimization-store"
import { 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Zap, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  Shuffle
} from "lucide-react"

export function StatusPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Array<{ 
    id: string
    text: string
    type: 'info' | 'warning' | 'success' | 'error'
    timestamp: number
  }>>([])
  const [currentState, setCurrentState] = useState('S₀')
  const [transitionCount, setTransitionCount] = useState(0)
  
  const { 
    boxes, 
    physicsEnabled, 
    isSimulationRunning, 
    stabilityScore, 
    safetyScore,
    physicsStats 
  } = useOptimizationStore()
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdRef = useRef(0)

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Monitor physics simulation state
  useEffect(() => {
    if (isSimulationRunning) {
      addMessage('Physics simulation started', 'info')
      addMessage('Applying gravity...', 'info')
    } else {
      addMessage('Physics simulation stopped', 'warning')
    }
  }, [isSimulationRunning])

  // Monitor stability changes
  useEffect(() => {
    if (stabilityScore < 60) {
      addMessage(`Stability degraded: ${stabilityScore.toFixed(1)}%`, 'warning')
    } else if (stabilityScore > 90) {
      addMessage(`High stability achieved: ${stabilityScore.toFixed(1)}%`, 'success')
    }
  }, [stabilityScore])

  // Monitor box movements and collisions
  useEffect(() => {
    if (physicsStats?.collisions && physicsStats.collisions > 0) {
      addMessage(`Collision detected! Count: ${physicsStats.collisions}`, 'error')
    }
    
    if (physicsStats?.contacts && physicsStats.contacts > 5) {
      addMessage(`Multiple contact forces: ${physicsStats.contacts}`, 'info')
    }
  }, [physicsStats])

  // Simulate Markov state transitions with MCTS integration
  useEffect(() => {
    if (boxes.length > 0) {
      const newStateId = `S${boxes.length}`
      if (newStateId !== currentState) {
        setCurrentState(newStateId)
        setTransitionCount(prev => prev + 1)
        addMessage(`State transition: ${currentState} → ${newStateId}`, 'info')
        
        // Simulate box placement feedback
        const latestBox = boxes[boxes.length - 1]
        if (latestBox) {
          addMessage(`Box #${latestBox.id} placed at position (${latestBox.position.x.toFixed(1)}, ${latestBox.position.y.toFixed(1)}, ${latestBox.position.z.toFixed(1)})`, 'success')
          
          // Check for risky placements
          if (latestBox.position.y > 3.0) {
            addMessage(`Warning: Box #${latestBox.id} placed at risky height`, 'warning')
          }
          
          // MCTS-specific feedback
          if (boxes.length <= 15) {
            addMessage(`MCTS node explored - evaluating placement quality`, 'info')
          }
        }
      }
    }
  }, [boxes, currentState])

  const addMessage = (text: string, type: 'info' | 'warning' | 'success' | 'error') => {
    const newMessage = {
      id: `msg_${messageIdRef.current++}`,
      text,
      type,
      timestamp: Date.now()
    }
    
    setMessages(prev => {
      const updated = [...prev, newMessage]
      // Keep only last 50 messages
      return updated.slice(-50)
    })
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'info': return <Activity className="h-3 w-3 text-blue-400" />
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-400" />
      case 'success': return <CheckCircle className="h-3 w-3 text-green-400" />
      case 'error': return <Zap className="h-3 w-3 text-red-400" />
      default: return <Activity className="h-3 w-3 text-gray-400" />
    }
  }

  const getMessageBadgeVariant = (type: string) => {
    switch (type) {
      case 'warning': return 'destructive'
      case 'success': return 'default'
      case 'error': return 'destructive'
      default: return 'secondary'
    }
  }

  const clearMessages = () => {
    setMessages([])
    addMessage('Messages cleared', 'info')
  }

  const simulateForceEvent = (forceType: string) => {
    switch (forceType) {
      case 'brake':
        addMessage('Braking force triggered - boxes shifting forward', 'warning')
        break
      case 'turn':
        addMessage('Turning dynamics active - lateral forces applied', 'info')
        break
      case 'accel':
        addMessage('Acceleration applied - checking box stability', 'info')
        break
    }
  }

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 w-96 max-w-[90vw]"
      style={{ 
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        zIndex: 50,
        maxHeight: '70vh'
      }}
    >
      <Card className="bg-gray-900/95 border-gray-700 shadow-2xl backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm text-white flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-cyan-400" />
              Physics Status Panel
            </CardTitle>
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        
        {isOpen && (
          <CardContent className="space-y-3 max-h-80 overflow-hidden">
            {/* Current State Display */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Shuffle className="h-3 w-3 text-purple-400" />
                <span className="text-gray-300">Current State:</span>
                <Badge variant="outline" className="text-purple-400 border-purple-400">
                  {currentState}
                </Badge>
              </div>
              <span className="text-gray-500">Transitions: {transitionCount}</span>
            </div>

            {/* Physics Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center">
                <div className="text-gray-400">Stability</div>
                <div className={`font-bold ${stabilityScore > 80 ? 'text-green-400' : stabilityScore > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {stabilityScore.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Collisions</div>
                <div className="font-bold text-white">{physicsStats?.collisions || 0}</div>
              </div>
              <div className="text-center">
                <div className="text-gray-400">Contacts</div>
                <div className="font-bold text-white">{physicsStats?.contacts || 0}</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex space-x-1">
              <Button
                onClick={() => simulateForceEvent('brake')}
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
              >
                Test Brake
              </Button>
              <Button
                onClick={() => simulateForceEvent('turn')}
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
              >
                Test Turn
              </Button>
              <Button
                onClick={() => simulateForceEvent('accel')}
                variant="outline"
                size="sm"
                className="flex-1 h-6 text-xs"
              >
                Test Accel
              </Button>
            </div>

            {/* Messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Live Feedback</span>
                <Button
                  onClick={clearMessages}
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs text-gray-500 hover:text-white p-1"
                >
                  Clear
                </Button>
              </div>
              
              <div className="max-h-32 overflow-y-auto space-y-1 bg-gray-950/50 rounded p-2">
                {messages.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-2">
                    No messages yet...
                  </div>
                ) : (
                  messages.slice(-10).map((message) => (
                    <div key={message.id} className="flex items-start space-x-2 text-xs">
                      {getMessageIcon(message.type)}
                      <div className="flex-1">
                        <span className="text-gray-300">{message.text}</span>
                        <div className="text-gray-500 text-xs">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <Badge 
                        variant={getMessageBadgeVariant(message.type)} 
                        className="h-4 text-xs px-1"
                      >
                        {message.type}
                      </Badge>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Simulation Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Engine Status:</span>
              <div className="flex items-center space-x-1">
                {isSimulationRunning ? (
                  <>
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400">Active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    <span className="text-gray-500">Idle</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
