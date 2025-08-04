"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Minus, Plus, ShoppingCart, LogOut, Send, Package, AlertTriangle, Bell, X, Calculator, TrendingUp, DollarSign, Clock, Truck } from "lucide-react"
import { CursorEffect } from "@/components/cursor-effect"

interface Item {
  id: string
  name: string
  category: string
  price: number
  inStock: boolean
  currentStock: number
  minStock: number
  maxStock?: number
  leadTime?: number // days
  supplierReliability?: number // percentage
  image: string
}

interface OrderItem extends Item {
  quantity: number
}

interface ShortageItem {
  id: string
  name: string
  category: string
  currentStock: number
  minStock: number
  maxStock: number
  leadTime: number
  supplierReliability: number
  suggestedQuantity: number
  urgency: "critical" | "low" | "moderate"
  image: string
  price: number
  selected: boolean
  customQuantity?: number
  priority: "high" | "medium" | "low"
  lastOrderDate?: string
  averageDemand?: number
}

const availableItems: Item[] = [
  {
    id: "1",
    name: "Coca Cola 12-Pack",
    category: "Beverages",
    price: 4.99,
    inStock: true,
    currentStock: 15,
    minStock: 20,
    maxStock: 80,
    leadTime: 2,
    supplierReliability: 95,
    image: "/assets/1.png",
  },
  {
    id: "2",
    name: "Lay's Potato Chips",
    category: "Snacks",
    price: 2.49,
    inStock: true,
    currentStock: 8,
    minStock: 25,
    maxStock: 100,
    leadTime: 1,
    supplierReliability: 98,
    image: "/assets/2.png",
  },
  {
    id: "3",
    name: "Wonder Bread",
    category: "Bakery",
    price: 1.99,
    inStock: true,
    currentStock: 45,
    minStock: 30,
    maxStock: 60,
    leadTime: 1,
    supplierReliability: 92,
    image: "/assets/3.png",
  },
  {
    id: "4",
    name: "Milk Gallon",
    category: "Dairy",
    price: 3.49,
    inStock: true,
    currentStock: 3,
    minStock: 15,
    maxStock: 40,
    leadTime: 1,
    supplierReliability: 90,
    image: "/assets/4.png",
  },
  {
    id: "5",
    name: "Bananas (lb)",
    category: "Produce",
    price: 0.68,
    inStock: true,
    currentStock: 12,
    minStock: 20,
    maxStock: 50,
    leadTime: 2,
    supplierReliability: 85,
    image: "/assets/5.png",
  },
  {
    id: "7",
    name: "Tide Detergent",
    category: "Household",
    price: 12.99,
    inStock: true,
    currentStock: 22,
    minStock: 15,
    maxStock: 40,
    leadTime: 3,
    supplierReliability: 96,
    image: "/assets/7.png",
  },
  {
    id: "8",
    name: "Charmin Toilet Paper",
    category: "Household",
    price: 8.99,
    inStock: true,
    currentStock: 18,
    minStock: 20,
    maxStock: 60,
    leadTime: 2,
    supplierReliability: 94,
    image: "/assets/8.png",
  },
  {
    id: "9",
    name: "Cheerios Cereal",
    category: "Breakfast",
    price: 4.49,
    inStock: true,
    currentStock: 5,
    minStock: 12,
    maxStock: 50,
    leadTime: 2,
    supplierReliability: 97,
    image: "/assets/9.png",
  },
  {
    id: "10",
    name: "Frozen Pizza",
    category: "Frozen",
    price: 3.99,
    inStock: true,
    currentStock: 28,
    minStock: 25,
    maxStock: 80,
    leadTime: 3,
    supplierReliability: 93,
    image: "/assets/10.png",
  },
]

export default function Dashboard() {
  const router = useRouter()
  const [retailInfo, setRetailInfo] = useState<{ id: string; name: string } | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [deadline, setDeadline] = useState("")
  const [shortageItems, setShortageItems] = useState<ShortageItem[]>([])
  const [showShortagePopup, setShowShortagePopup] = useState(false)
  const [showTopAlert, setShowTopAlert] = useState(true)
  const [selectedShortageItems, setSelectedShortageItems] = useState<Set<string>>(new Set())
  const [customDeadline, setCustomDeadline] = useState("")
  const [orderingStrategy, setOrderingStrategy] = useState<"conservative" | "balanced" | "aggressive">("balanced")
  const [budgetLimit, setBudgetLimit] = useState<number>(0)
  const [cashFlowMode, setCashFlowMode] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("currentRetail")
    if (stored) {
      setRetailInfo(JSON.parse(stored))
    } else {
      router.push("/")
    }

    // Set default deadline to tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeadline(tomorrow.toISOString().split("T")[0])
    
    // Set custom shortage deadline to 3 days from now
    const threeDays = new Date()
    threeDays.setDate(threeDays.getDate() + 3)
    setCustomDeadline(threeDays.toISOString().split("T")[0])

    // Calculate shortage items with enhanced logic
    const shortages = availableItems
      .filter((item) => item.currentStock <= item.minStock)
      .map((item) => {
        const shortage = item.minStock - item.currentStock
        const urgency =
          item.currentStock === 0
            ? ("critical" as const)
            : item.currentStock <= item.minStock * 0.3
              ? ("critical" as const)
              : item.currentStock <= item.minStock * 0.6
                ? ("low" as const)
                : ("moderate" as const)

        // Calculate suggested quantity based on strategy
        let suggestedQuantity = shortage
        if (orderingStrategy === "conservative") {
          suggestedQuantity = Math.ceil(shortage * 0.8) // Order 80% of shortage
        } else if (orderingStrategy === "aggressive") {
          suggestedQuantity = shortage + Math.ceil((item.maxStock || item.minStock * 2) - item.minStock) * 0.3 // Order to 30% above min
        }

        // Determine priority based on multiple factors
        let priority: "high" | "medium" | "low" = "medium"
        if (urgency === "critical" || item.category === "Dairy" || item.category === "Produce") {
          priority = "high"
        } else if (item.supplierReliability && item.supplierReliability < 90) {
          priority = "high"
        } else if (item.leadTime && item.leadTime > 2) {
          priority = "low"
        }

        return {
          id: item.id,
          name: item.name,
          category: item.category,
          currentStock: item.currentStock,
          minStock: item.minStock,
          maxStock: item.maxStock || item.minStock * 2,
          leadTime: item.leadTime || 2,
          supplierReliability: item.supplierReliability || 90,
          suggestedQuantity,
          urgency,
          image: item.image,
          price: item.price,
          selected: urgency === "critical", // Auto-select critical items
          priority,
          lastOrderDate: "2025-07-20", // Mock data
          averageDemand: Math.ceil(item.minStock / 7), // Mock weekly average
        }
      })

    setShortageItems(shortages)
    
    // Auto-select critical items
    const criticalItems = new Set(shortages.filter(item => item.urgency === "critical").map(item => item.id))
    setSelectedShortageItems(criticalItems)
  }, [router, orderingStrategy])

  const addToOrder = (item: Item) => {
    setOrderItems((prev) => {
      const existing = prev.find((orderItem) => orderItem.id === item.id)
      if (existing) {
        return prev.map((orderItem) =>
          orderItem.id === item.id ? { ...orderItem, quantity: orderItem.quantity + 1 } : orderItem,
        )
      } else {
        return [...prev, { ...item, quantity: 1 }]
      }
    })
  }

  const updateQuantity = (itemId: string, change: number) => {
    setOrderItems((prev) => {
      return prev
        .map((item) => {
          if (item.id === itemId) {
            const newQuantity = Math.max(0, item.quantity + change)
            return newQuantity === 0 ? null : { ...item, quantity: newQuantity }
          }
          return item
        })
        .filter(Boolean) as OrderItem[]
    })
  }

  const updateShortageQuantity = (itemId: string, quantity: number) => {
    setShortageItems(prev => 
      prev.map(item => 
        item.id === itemId 
          ? { ...item, customQuantity: Math.max(0, quantity) }
          : item
      )
    )
  }

  const toggleShortageSelection = (itemId: string) => {
    setSelectedShortageItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const selectAllByPriority = (priority: "high" | "medium" | "low") => {
    const itemsWithPriority = shortageItems
      .filter(item => item.priority === priority)
      .map(item => item.id)
    
    setSelectedShortageItems(prev => {
      const newSet = new Set(prev)
      itemsWithPriority.forEach(id => newSet.add(id))
      return newSet
    })
  }

  const selectAllByUrgency = (urgency: "critical" | "low" | "moderate") => {
    const itemsWithUrgency = shortageItems
      .filter(item => item.urgency === urgency)
      .map(item => item.id)
    
    setSelectedShortageItems(prev => {
      const newSet = new Set(prev)
      itemsWithUrgency.forEach(id => newSet.add(id))
      return newSet
    })
  }

  const calculateShortageOrderTotal = () => {
    return shortageItems
      .filter(item => selectedShortageItems.has(item.id))
      .reduce((total, item) => {
        const quantity = item.customQuantity ?? item.suggestedQuantity
        return total + (item.price * quantity)
      }, 0)
  }

  const sendRequest = () => {
    if (orderItems.length === 0) return

    const request = {
      retailId: retailInfo?.id,
      retailName: retailInfo?.name,
      items: orderItems,
      deadline,
      timestamp: new Date().toISOString(),
      total: orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
      type: "regular_order"
    }

    const existingRequests = JSON.parse(localStorage.getItem("warehouseRequests") || "[]")
    localStorage.setItem("warehouseRequests", JSON.stringify([...existingRequests, request]))

    alert("Request sent to warehouse successfully!")
    setOrderItems([])
  }

  const sendSelectedShortageOrders = () => {
    if (selectedShortageItems.size === 0) {
      alert("Please select items to order.")
      return
    }

    const selectedItems = shortageItems.filter(item => selectedShortageItems.has(item.id))
    const totalCost = calculateShortageOrderTotal()

    if (budgetLimit > 0 && totalCost > budgetLimit) {
      alert(`Order total ($${totalCost.toFixed(2)}) exceeds budget limit ($${budgetLimit.toFixed(2)}). Please adjust quantities or budget.`)
      return
    }

    // Create shortage alert
    const shortageAlert = {
      retailId: retailInfo?.id,
      retailName: retailInfo?.name,
      shortageItems: selectedItems,
      timestamp: new Date().toISOString(),
      type: "shortage_alert",
      strategy: orderingStrategy,
      budgetLimit: budgetLimit || null
    }

    const existingAlerts = JSON.parse(localStorage.getItem("shortageAlerts") || "[]")
    localStorage.setItem("shortageAlerts", JSON.stringify([...existingAlerts, shortageAlert]))

    // Create individual order requests for selected items
    const shortageRequests = selectedItems.map((item) => ({
      retailId: retailInfo?.id,
      retailName: retailInfo?.name,
      items: [
        {
          id: item.id,
          name: item.name,
          quantity: item.customQuantity ?? item.suggestedQuantity,
          price: item.price,
        },
      ],
      deadline: customDeadline,
      timestamp: new Date().toISOString(),
      total: item.price * (item.customQuantity ?? item.suggestedQuantity),
      type: "shortage_request",
      priority: item.priority,
      urgency: item.urgency
    }))

    const existingRequests = JSON.parse(localStorage.getItem("warehouseRequests") || "[]")
    localStorage.setItem("warehouseRequests", JSON.stringify([...existingRequests, ...shortageRequests]))

    alert(`Selected shortage orders sent successfully! Total: $${totalCost.toFixed(2)}`)
    setShowShortagePopup(false)
    setShowTopAlert(false)
    setSelectedShortageItems(new Set())
  }

  const logout = () => {
    localStorage.removeItem("currentRetail")
    router.push("/")
  }

  if (!retailInfo) return null

  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const criticalShortages = shortageItems.filter((item) => item.urgency === "critical")
  const shortageOrderTotal = calculateShortageOrderTotal()
  const selectedCount = selectedShortageItems.size

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <CursorEffect />

      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 via-blue-900/20 to-gray-900/50" />
      <div className="absolute inset-0">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Enhanced Top Right Shortage Alert */}
      {shortageItems.length > 0 && showTopAlert && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <Card
            className="bg-red-900/30 border-red-500 backdrop-blur-md cursor-pointer hover:bg-red-900/50 transition-all duration-300 animate-pulse hover:scale-105"
            onClick={() => setShowShortagePopup(true)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-400 animate-bounce" />
                  <CardTitle className="text-red-400 text-sm font-bold">Smart Inventory Alert</CardTitle>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowTopAlert(false)
                  }}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/30 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-red-300 text-xs">
                  {criticalShortages.length > 0
                    ? `${criticalShortages.length} critical items need immediate attention!`
                    : `${shortageItems.length} items running low`}
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    {shortageItems.length} Items
                  </Badge>
                  <span className="text-xs text-red-400">Smart ordering available</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="relative z-10 bg-black/80 backdrop-blur-sm border-b border-gray-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500 animate-pulse" />
            <div>
              <h1 className="text-2xl font-bold">{retailInfo.name}</h1>
              <p className="text-gray-400">ID: {retailInfo.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={logout}
              variant="outline"
              className="border-gray-700 text-gray-300 bg-transparent hover:bg-gray-800 transition-all duration-300 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Items */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Available Items</CardTitle>
                <CardDescription className="text-gray-400">
                  Select items you want to order from the warehouse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableItems.map((item) => {
                    const isLowStock = item.currentStock <= item.minStock
                    const isCritical = item.currentStock <= item.minStock * 0.3

                    return (
                      <div
                        key={item.id}
                        className={`rounded-lg p-4 border transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                          !item.inStock
                            ? "bg-red-900/20 border-red-500/50"
                            : isCritical
                              ? "bg-red-900/10 border-red-500/30 animate-pulse"
                              : isLowStock
                                ? "bg-orange-900/10 border-orange-500/30"
                                : "bg-gray-800/50 border-gray-700 hover:bg-gray-700/50"
                        } backdrop-blur-sm`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-600"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                              <div className="flex flex-col gap-1">
                                <Badge variant={item.inStock ? "default" : "destructive"} className="text-xs">
                                  {item.inStock ? "In Stock" : "Out of Stock"}
                                </Badge>
                                {isLowStock && item.inStock && (
                                  <Badge variant="secondary" className="text-xs animate-pulse">
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-400 text-xs mb-1">{item.category}</p>
                            <p className="text-gray-400 text-xs mb-1">
                              Stock: {item.currentStock} (Min: {item.minStock})
                            </p>
                            <p className="text-gray-400 text-xs">
                              Lead time: {item.leadTime || 2} days | Reliability: {item.supplierReliability || 90}%
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-green-400 font-bold">${item.price}</span>
                          <Button
                            onClick={() => addToOrder(item)}
                            disabled={!item.inStock}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm sticky top-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 animate-bounce" />
                  Your Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orderItems.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No items selected</p>
                ) : (
                  <div className="space-y-4">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-gray-800/50 rounded-lg p-3 transition-all duration-300 hover:bg-gray-700/50 backdrop-blur-sm"
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-12 h-12 rounded object-cover border border-gray-600"
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium text-white text-sm">{item.name}</h4>
                              <span className="text-green-400 text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={() => updateQuantity(item.id, -1)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                                <Button
                                  onClick={() => updateQuantity(item.id, 1)}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-600 transition-all duration-300 cursor-pointer"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                              <span className="text-gray-400 text-xs">${item.price} each</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="border-t border-gray-700 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-semibold text-white">Total:</span>
                        <span className="font-bold text-green-400 text-lg animate-pulse">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Deadline</label>
                        <input
                          type="date"
                          value={deadline}
                          onChange={(e) => setDeadline(e.target.value)}
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-3 py-2 text-white focus:border-blue-500 transition-all duration-300 backdrop-blur-sm cursor-pointer"
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>

                      <Button
                        onClick={sendRequest}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Request to Warehouse
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Enhanced Shortage Management Dialog */}
      <Dialog open={showShortagePopup} onOpenChange={setShowShortagePopup}>
        <DialogContent className="bg-gray-900/95 backdrop-blur-sm border-red-500 text-white max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl text-red-400">
              <Calculator className="h-6 w-6 animate-bounce" />
              Smart Shortage Management System
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Select which items to order and customize quantities based on your business needs, budget, and cash flow requirements.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50">
              <TabsTrigger value="items" className="text-white">Items Selection</TabsTrigger>
              <TabsTrigger value="strategy" className="text-white">Order Strategy</TabsTrigger>
              <TabsTrigger value="summary" className="text-white">Order Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              {/* Quick Selection Buttons */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  onClick={() => selectAllByUrgency("critical")}
                  size="sm"
                  variant="destructive"
                  className="cursor-pointer"
                >
                  Select All Critical
                </Button>
                <Button
                  onClick={() => selectAllByPriority("high")}
                  size="sm"
                  variant="outline"
                  className="border-orange-500 text-orange-400 hover:bg-orange-900/30 cursor-pointer"
                >
                  Select High Priority
                </Button>
                <Button
                  onClick={() => setSelectedShortageItems(new Set())}
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 cursor-pointer"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => {
                    const allIds = new Set(shortageItems.map(item => item.id))
                    setSelectedShortageItems(allIds)
                  }}
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-400 hover:bg-blue-900/30 cursor-pointer"
                >
                  Select All
                </Button>
              </div>

              {/* Items List */}
              <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                {shortageItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg border transition-all duration-300 hover:scale-102 ${
                      selectedShortageItems.has(item.id)
                        ? "bg-blue-900/30 border-blue-500"
                        : item.urgency === "critical"
                          ? "bg-red-900/20 border-red-500/50"
                          : item.urgency === "low"
                            ? "bg-orange-900/20 border-orange-500/50"
                            : "bg-yellow-900/20 border-yellow-500/50"
                    } backdrop-blur-sm cursor-pointer`}
                    onClick={() => toggleShortageSelection(item.id)}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedShortageItems.has(item.id)}
                        onChange={() => toggleShortageSelection(item.id)}
                        className="mt-1"
                      />
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover border border-gray-600 flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-white text-lg">{item.name}</h4>
                            <p className="text-sm text-gray-400">{item.category}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <Badge variant={item.urgency === "critical" ? "destructive" : "secondary"} className="text-sm">
                              {item.urgency.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${
                              item.priority === "high" ? "border-red-500 text-red-400" :
                              item.priority === "medium" ? "border-yellow-500 text-yellow-400" :
                              "border-green-500 text-green-400"
                            }`}>
                              {item.priority.toUpperCase()} PRIORITY
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div className="bg-gray-800/50 rounded p-2">
                            <span className="text-gray-400 block">Current:</span>
                            <span className={`font-bold ${item.currentStock === 0 ? "text-red-400" : "text-yellow-400"}`}>
                              {item.currentStock}
                            </span>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <span className="text-gray-400 block">Min Required:</span>
                            <span className="font-bold text-green-400">{item.minStock}</span>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <span className="text-gray-400 block">Lead Time:</span>
                            <span className="font-bold text-blue-400">{item.leadTime} days</span>
                          </div>
                          <div className="bg-gray-800/50 rounded p-2">
                            <span className="text-gray-400 block">Reliability:</span>
                            <span className="font-bold text-purple-400">{item.supplierReliability}%</span>
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">Quantity to Order:</span>
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentQty = item.customQuantity ?? item.suggestedQuantity
                                  updateShortageQuantity(item.id, currentQty - 1)
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-600 cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                value={item.customQuantity ?? item.suggestedQuantity}
                                onChange={(e) => {
                                  e.stopPropagation()
                                  updateShortageQuantity(item.id, parseInt(e.target.value) || 0)
                                }}
                                className="w-16 h-8 text-center bg-gray-800 border-gray-600 text-white"
                                min="0"
                                max={item.maxStock}
                              />
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const currentQty = item.customQuantity ?? item.suggestedQuantity
                                  updateShortageQuantity(item.id, currentQty + 1)
                                }}
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 border-gray-600 hover:bg-gray-600 cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">Suggested: {item.suggestedQuantity}</div>
                            <div className="text-sm font-bold text-green-400">
                              ${(item.price * (item.customQuantity ?? item.suggestedQuantity)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ordering Strategy */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Ordering Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-white">Select your ordering approach:</Label>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="conservative"
                            name="strategy"
                            value="conservative"
                            checked={orderingStrategy === "conservative"}
                            onChange={(e) => setOrderingStrategy(e.target.value as "conservative")}
                            className="cursor-pointer"
                          />
                          <Label htmlFor="conservative" className="text-white cursor-pointer">
                            <span className="font-medium">Conservative</span> - Order 80% of shortage (Lower cash commitment)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="balanced"
                            name="strategy"
                            value="balanced"
                            checked={orderingStrategy === "balanced"}
                            onChange={(e) => setOrderingStrategy(e.target.value as "balanced")}
                            className="cursor-pointer"
                          />
                          <Label htmlFor="balanced" className="text-white cursor-pointer">
                            <span className="font-medium">Balanced</span> - Order exact shortage amount (Recommended)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="aggressive"
                            name="strategy"
                            value="aggressive"
                            checked={orderingStrategy === "aggressive"}
                            onChange={(e) => setOrderingStrategy(e.target.value as "aggressive")}
                            className="cursor-pointer"
                          />
                          <Label htmlFor="aggressive" className="text-white cursor-pointer">
                            <span className="font-medium">Aggressive</span> - Order above minimum (Higher buffer)
                          </Label>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Budget & Cash Flow */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Budget Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cashflow"
                          checked={cashFlowMode}
                        //@ts-ignore
                          onCheckedChange={setCashFlowMode}
                        />
                        <Label htmlFor="cashflow" className="text-white cursor-pointer">
                          Enable budget limit
                        </Label>
                      </div>
                      
                      {cashFlowMode && (
                        <div className="space-y-2">
                          <Label htmlFor="budget" className="text-white">Maximum order budget ($)</Label>
                          <Input
                            id="budget"
                            type="number"
                            value={budgetLimit}
                            onChange={(e) => setBudgetLimit(parseFloat(e.target.value) || 0)}
                            placeholder="Enter budget limit"
                            className="bg-gray-800 border-gray-600 text-white"
                            min="0"
                            step="0.01"
                          />
                          <p className="text-xs text-gray-400">
                            Current order total: ${shortageOrderTotal.toFixed(2)}
                            {budgetLimit > 0 && shortageOrderTotal > budgetLimit && (
                              <span className="text-red-400 ml-2">⚠ Exceeds budget!</span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Settings */}
                <Card className="bg-gray-800/50 border-gray-700 md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Delivery Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="shortage-deadline" className="text-white">Preferred delivery date</Label>
                        <Input
                          id="shortage-deadline"
                          type="date"
                          value={customDeadline}
                          onChange={(e) => setCustomDeadline(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white cursor-pointer"
                          min={new Date().toISOString().split("T")[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-white">Delivery notes</Label>
                        <div className="text-sm text-gray-400">
                          • Critical items will be prioritized
                          • High priority items may qualify for expedited shipping
                          • Lead times vary by supplier reliability
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Order Statistics */}
                <Card className="bg-blue-900/20 border-blue-500/50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{selectedCount}</div>
                      <div className="text-sm text-gray-400">Items Selected</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-green-900/20 border-green-500/50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">${shortageOrderTotal.toFixed(2)}</div>
                      <div className="text-sm text-gray-400">Total Cost</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-purple-900/20 border-purple-500/50">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-400">
                        {selectedShortageItems.size > 0 ? 
                          Math.round(shortageItems
                            .filter(item => selectedShortageItems.has(item.id))
                            .reduce((sum, item) => sum + item.leadTime, 0) / selectedShortageItems.size)
                          : 0
                        }
                      </div>
                      <div className="text-sm text-gray-400">Avg Lead Time (days)</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Selected Items Preview */}
              {selectedCount > 0 && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Selected Items Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shortageItems
                        .filter(item => selectedShortageItems.has(item.id))
                        .map(item => (
                          <div key={item.id} className="flex justify-between items-center p-2 bg-gray-900/50 rounded">
                            <div>
                              <span className="text-white font-medium">{item.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {item.urgency}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-white">
                                {item.customQuantity ?? item.suggestedQuantity} units
                              </div>
                              <div className="text-green-400 text-sm">
                                ${(item.price * (item.customQuantity ?? item.suggestedQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Budget Warning */}
              {budgetLimit > 0 && shortageOrderTotal > budgetLimit && (
                <Card className="bg-red-900/20 border-red-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-400" />
                      <div>
                        <div className="font-medium text-red-400">Budget Exceeded</div>
                        <div className="text-sm text-gray-300">
                          Order total (${shortageOrderTotal.toFixed(2)}) exceeds budget limit (${budgetLimit.toFixed(2)}).
                          Please adjust quantities or increase budget.
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-700">
            <Button
              onClick={sendSelectedShortageOrders}
              disabled={selectedCount === 0 || (budgetLimit > 0 && shortageOrderTotal > budgetLimit)}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bell className="h-4 w-4 mr-2" />
              Send Selected Orders ({selectedCount} items - ${shortageOrderTotal.toFixed(2)})
            </Button>
            <Button
              onClick={() => setShowShortagePopup(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 bg-transparent hover:bg-gray-800 transition-all duration-300 cursor-pointer"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .hover\\:scale-102:hover {
          transform: scale(1.02);
        }
      `}</style>
    </div>
  )
}