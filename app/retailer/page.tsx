"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  Minus, Plus, ShoppingCart, LogOut, Send, Package, AlertTriangle, Bell, X, 
  Calculator, TrendingUp, DollarSign, Truck, Building2, BarChart3, Search, 
  Filter, Eye, Settings, Zap, Target, ShoppingBag, Clock, Star, ChevronRight,
  Grid3X3, List, RefreshCw, Download, Upload, Users, Boxes
} from "lucide-react"
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
  leadTime?: number
  supplierReliability?: number
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
  const [retailInfo] = useState({ id: "RT-001", name: "Downtown Market" })
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  useEffect(() => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setDeadline(tomorrow.toISOString().split("T")[0])
    
    const threeDays = new Date()
    threeDays.setDate(threeDays.getDate() + 3)
    setCustomDeadline(threeDays.toISOString().split("T")[0])

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

        let suggestedQuantity = shortage
        if (orderingStrategy === "conservative") {
          suggestedQuantity = Math.ceil(shortage * 0.8)
        } else if (orderingStrategy === "aggressive") {
          suggestedQuantity = shortage + Math.ceil((item.maxStock || item.minStock * 2) - item.minStock) * 0.3
        }

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
          selected: urgency === "critical",
          priority,
        }
      })

    setShortageItems(shortages)
    const criticalItems = new Set(shortages.filter(item => item.urgency === "critical").map(item => item.id))
    setSelectedShortageItems(criticalItems)
  }, [orderingStrategy])

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
    alert("Request sent to warehouse successfully!")
    setOrderItems([])
  }

  const sendSelectedShortageOrders = () => {
    if (selectedShortageItems.size === 0) {
      alert("Please select items to order.")
      return
    }

    const totalCost = calculateShortageOrderTotal()

    if (budgetLimit > 0 && totalCost > budgetLimit) {
      alert(`Order total ($${totalCost.toFixed(2)}) exceeds budget limit ($${budgetLimit.toFixed(2)}). Please adjust quantities or budget.`)
      return
    }

    alert(`Selected shortage orders sent successfully! Total: $${totalCost.toFixed(2)}`)
    setShowShortagePopup(false)
    setShowTopAlert(false)
    setSelectedShortageItems(new Set())
  }

  // Filter items based on search and category
  const filteredItems = availableItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const categories = ["all", ...Array.from(new Set(availableItems.map(item => item.category)))]
  const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const criticalShortages = shortageItems.filter((item) => item.urgency === "critical")
  const shortageOrderTotal = calculateShortageOrderTotal()
  const selectedCount = selectedShortageItems.size
  const totalItems = availableItems.length
  const lowStockItems = availableItems.filter(item => item.currentStock <= item.minStock).length
  const outOfStockItems = availableItems.filter(item => !item.inStock).length

  return (
    <div className="min-h-screen bg-background">
      <CursorEffect />

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-primary rounded-xl shadow-lg">
                  <Building2 className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{retailInfo.name}</h1>
                  <p className="text-sm text-muted-foreground">ID: {retailInfo.id}</p>
                </div>
              </div>
              
              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-6 ml-8">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{totalItems} Items</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium">{lowStockItems} Low Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">{outOfStockItems} Out of Stock</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Smart Alert Banner */}
      {shortageItems.length > 0 && showTopAlert && (
        <div className="relative overflow-hidden bg-gradient-warning border-b border-warning/20">
          <div className="absolute inset-0 bg-warning/10" />
          <div className="relative container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-warning/20 rounded-lg">
                  <Zap className="h-4 w-4 text-warning-foreground" />
                </div>
                <div>
                  <p className="font-medium text-warning-foreground">
                    {criticalShortages.length > 0 
                      ? `${criticalShortages.length} critical items need immediate attention`
                      : `${shortageItems.length} items running low`
                    }
                  </p>
                  <p className="text-sm text-warning-foreground/80">
                    Smart AI ordering suggestions available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setShowShortagePopup(true)}
                  size="sm"
                  className="bg-warning hover:bg-warning/90 text-warning-foreground gap-2"
                >
                  <Target className="h-4 w-4" />
                  Smart Order
                </Button>
                <Button 
                  onClick={() => setShowTopAlert(false)}
                  variant="ghost" 
                  size="sm"
                  className="text-warning-foreground hover:bg-warning/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Inventory Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Section Header with Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Inventory Management</h2>
                <p className="text-muted-foreground mt-1">Manage your store inventory and place orders</p>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-surface rounded-lg p-1">
                  <Button 
                    onClick={() => setViewMode("grid")}
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    className="px-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button 
                    onClick={() => setViewMode("list")}
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    className="px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <Card className="bg-surface/50 border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-background"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category === "all" ? "All Categories" : category}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Grid/List */}
            <div className={viewMode === "grid" 
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" 
              : "space-y-4"
            }>
              {filteredItems.map((item) => {
                const isLowStock = item.currentStock <= item.minStock
                const isCritical = item.currentStock <= item.minStock * 0.3
                const stockPercentage = (item.currentStock / (item.maxStock || item.minStock * 2)) * 100

                if (viewMode === "list") {
                  return (
                    <Card key={item.id} className="bg-surface/30 hover:bg-surface/50 transition-colors border-border/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover border border-border bg-surface"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-foreground">{item.name}</h3>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={item.inStock ? "default" : "destructive"}>
                                  {item.inStock ? "In Stock" : "Out of Stock"}
                                </Badge>
                                {isLowStock && item.inStock && (
                                  <Badge variant="outline" className="border-warning text-warning">
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Current Stock:</span>
                                <div className="font-medium text-foreground">{item.currentStock}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Min Required:</span>
                                <div className="font-medium text-foreground">{item.minStock}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price:</span>
                                <div className="font-bold text-success text-lg">${item.price}</div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => addToOrder(item)}
                                  disabled={!item.inStock}
                                  className="gap-2"
                                >
                                  <Plus className="h-4 w-4" />
                                  Add to Order
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }

                return (
                  <Card 
                    key={item.id} 
                    className={`group relative overflow-hidden bg-surface/30 hover:bg-surface/50 transition-all duration-200 border-border/50 hover:border-border hover:shadow-lg ${
                      isCritical ? "ring-1 ring-destructive/30" : isLowStock ? "ring-1 ring-warning/30" : ""
                    }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl object-cover border border-border bg-surface"
                          />
                          {!item.inStock && (
                            <div className="absolute inset-0 bg-destructive/20 rounded-xl flex items-center justify-center">
                              <X className="h-6 w-6 text-destructive" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                            <Badge variant={item.inStock ? "default" : "destructive"} className="ml-2">
                              {item.inStock ? "In Stock" : "Out"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{item.category}</p>
                          
                          {/* Stock Level Indicator */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Stock Level</span>
                              <span className={`font-medium ${
                                isCritical ? "text-destructive" : 
                                isLowStock ? "text-warning" : "text-success"
                              }`}>
                                {item.currentStock}/{item.maxStock || item.minStock * 2}
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  isCritical ? "bg-destructive" : 
                                  isLowStock ? "bg-warning" : "bg-success"
                                }`}
                                style={{ width: `${Math.min(100, stockPercentage)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {/* Metrics */}
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-muted/50 rounded-lg p-2">
                            <span className="text-muted-foreground block">Lead Time</span>
                            <span className="font-semibold text-foreground">{item.leadTime || 2} days</span>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2">
                            <span className="text-muted-foreground block">Reliability</span>
                            <span className="font-semibold text-foreground">{item.supplierReliability || 90}%</span>
                          </div>
                        </div>

                        {/* Price and Action */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-2xl font-bold text-success">${item.price}</div>
                          <Button
                            onClick={() => addToOrder(item)}
                            disabled={!item.inStock}
                            size="sm"
                            className="gap-2 group-hover:shadow-md transition-shadow"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </div>

                      {/* Warning overlay for critical items */}
                      {isCritical && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Critical
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredItems.length === 0 && (
              <Card className="bg-surface/30 border-border/50">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No items found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Summary Card */}
            <Card className="sticky top-24 bg-surface-elevated border-border/50 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <div className="p-2 bg-gradient-primary rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-primary-foreground" />
                  </div>
                  Current Order
                </CardTitle>
                <CardDescription>
                  {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Your order is empty</p>
                    <p className="text-muted-foreground text-xs mt-1">Add items to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {orderItems.map((item) => (
                        <Card key={item.id} className="bg-background/50 border-border/30">
                          <CardContent className="p-3">
                            <div className="flex gap-3">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover border border-border"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-foreground truncate">{item.name}</h4>
                                <p className="text-xs text-muted-foreground mb-2">${item.price} each</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="font-medium w-8 text-center text-sm">{item.quantity}</span>
                                    <Button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <span className="font-semibold text-success text-sm">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator className="bg-border/50" />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Total:</span>
                        <span className="font-bold text-xl text-success">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Delivery Date</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="pl-10 bg-background"
                          />
                        </div>
                      </div>

                      <Button onClick={sendRequest} className="w-full gap-2 bg-gradient-primary hover:opacity-90 transition-opacity">
                        <Send className="h-4 w-4" />
                        Send Order Request
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-surface-elevated border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-foreground text-base">Store Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Products</span>
                  <Badge variant="outline">{totalItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Low Stock</span>
                  <Badge variant="outline" className="border-warning text-warning">{lowStockItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Out of Stock</span>
                  <Badge variant="outline" className="border-destructive text-destructive">{outOfStockItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Order Value</span>
                  <span className="font-semibold text-success">${totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Shortage Management Dialog */}
      <Dialog open={showShortagePopup} onOpenChange={setShowShortagePopup}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-surface-elevated border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <div className="p-2 bg-gradient-primary rounded-lg">
                <Calculator className="h-5 w-5 text-primary-foreground" />
              </div>
              Smart Inventory Assistant
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              AI-powered inventory optimization based on current stock levels, demand patterns, and business requirements.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-surface">
              <TabsTrigger value="items" className="text-foreground">Items Selection</TabsTrigger>
              <TabsTrigger value="strategy" className="text-foreground">Order Strategy</TabsTrigger>
              <TabsTrigger value="summary" className="text-foreground">Order Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="items" className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const criticalIds = shortageItems.filter(item => item.urgency === "critical").map(item => item.id)
                    setSelectedShortageItems(new Set(criticalIds))
                  }}
                  size="sm"
                  variant="destructive"
                  className="gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Select Critical Items
                </Button>
                <Button
                  onClick={() => setSelectedShortageItems(new Set())}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Selection
                </Button>
                <Button
                  onClick={() => {
                    const allIds = new Set(shortageItems.map(item => item.id))
                    setSelectedShortageItems(allIds)
                  }}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Target className="h-4 w-4" />
                  Select All
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {shortageItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedShortageItems.has(item.id)
                        ? "border-primary bg-primary/5"
                        : item.urgency === "critical"
                          ? "border-destructive/30 bg-destructive/5"
                          : item.urgency === "low"
                            ? "border-warning/30 bg-warning/5"
                            : "border-warning/20 bg-warning/5"
                    }`}
                    onClick={() => toggleShortageSelection(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Checkbox
                          checked={selectedShortageItems.has(item.id)}
                          onChange={() => toggleShortageSelection(item.id)}
                          className="mt-1"
                        />
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover border border-border bg-surface flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-foreground">{item.name}</h4>
                              <p className="text-sm text-muted-foreground">{item.category}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant={item.urgency === "critical" ? "destructive" : "outline"}>
                                {item.urgency}
                              </Badge>
                              <Badge variant="secondary">
                                {item.priority} priority
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                            <div className="bg-surface rounded-lg p-2">
                              <span className="text-muted-foreground block text-xs">Current</span>
                              <span className={`font-semibold ${item.currentStock === 0 ? "text-destructive" : "text-warning"}`}>
                                {item.currentStock}
                              </span>
                            </div>
                            <div className="bg-surface rounded-lg p-2">
                              <span className="text-muted-foreground block text-xs">Required</span>
                              <span className="font-semibold text-success">{item.minStock}</span>
                            </div>
                            <div className="bg-surface rounded-lg p-2">
                              <span className="text-muted-foreground block text-xs">Lead Time</span>
                              <span className="font-semibold text-foreground">{item.leadTime} days</span>
                            </div>
                            <div className="bg-surface rounded-lg p-2">
                              <span className="text-muted-foreground block text-xs">Reliability</span>
                              <span className="font-semibold text-accent">{item.supplierReliability}%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">Quantity:</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const currentQty = item.customQuantity ?? item.suggestedQuantity
                                    updateShortageQuantity(item.id, currentQty - 1)
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
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
                                  className="w-16 h-8 text-center bg-background"
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
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Suggested: {item.suggestedQuantity}</div>
                              <div className="font-semibold text-success">
                                ${(item.price * (item.customQuantity ?? item.suggestedQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-surface border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-5 w-5" />
                      Ordering Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-foreground">Select your ordering approach:</Label>
                      <div className="space-y-3">
                        {[
                          { value: "conservative", label: "Conservative", desc: "Order 80% of shortage (Lower cash commitment)", icon: "🛡️" },
                          { value: "balanced", label: "Balanced", desc: "Order exact shortage amount (Recommended)", icon: "⚖️" },
                          { value: "aggressive", label: "Aggressive", desc: "Order above minimum (Higher buffer)", icon: "🚀" }
                        ].map(({ value, label, desc, icon }) => (
                          <Card key={value} className={`cursor-pointer transition-colors ${
                            orderingStrategy === value ? "border-primary bg-primary/5" : "bg-surface hover:bg-surface/80"
                          }`}>
                            <CardContent className="p-3">
                              <div className="flex items-start space-x-3">
                                <input
                                  type="radio"
                                  id={value}
                                  name="strategy"
                                  value={value}
                                  checked={orderingStrategy === value}
                                  onChange={(e) => setOrderingStrategy(e.target.value as typeof orderingStrategy)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Label htmlFor={value} className="cursor-pointer">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg">{icon}</span>
                                      <span className="font-medium text-foreground">{label}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground">{desc}</span>
                                  </Label>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-surface border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <DollarSign className="h-5 w-5" />
                      Budget Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cashflow"
                        checked={cashFlowMode}
                        //@ts-ignore
                        onCheckedChange={setCashFlowMode}
                      />
                      <Label htmlFor="cashflow" className="text-foreground">Enable budget limit</Label>
                    </div>
                    
                    {cashFlowMode && (
                      <div className="space-y-3">
                        <Label htmlFor="budget" className="text-foreground">Maximum order budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={budgetLimit}
                          onChange={(e) => setBudgetLimit(parseFloat(e.target.value) || 0)}
                          placeholder="Enter budget limit"
                          className="bg-background"
                          min="0"
                          step="0.01"
                        />
                        <div className="p-3 bg-surface-elevated rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Current order total: <span className="font-medium text-foreground">${shortageOrderTotal.toFixed(2)}</span>
                            {budgetLimit > 0 && shortageOrderTotal > budgetLimit && (
                              <span className="text-destructive ml-2 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Exceeds budget!
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-surface border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Truck className="h-5 w-5" />
                    Delivery Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shortage-deadline" className="text-foreground">Preferred delivery date</Label>
                      <Input
                        id="shortage-deadline"
                        type="date"
                        value={customDeadline}
                        onChange={(e) => setCustomDeadline(e.target.value)}
                        className="bg-background"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-foreground">Delivery notes</Label>
                      <div className="text-sm text-muted-foreground space-y-1 bg-surface-elevated p-3 rounded-lg">
                        <p>• Critical items will be prioritized</p>
                        <p>• High priority items qualify for expedited shipping</p>
                        <p>• Lead times vary by supplier reliability</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-primary text-primary-foreground">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold">{selectedCount}</div>
                    <div className="text-sm opacity-90">Items Selected</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-success text-success-foreground">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold">${shortageOrderTotal.toFixed(2)}</div>
                    <div className="text-sm opacity-90">Total Cost</div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gradient-accent text-accent-foreground">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold">
                      {selectedShortageItems.size > 0 ? 
                        Math.round(shortageItems
                          .filter(item => selectedShortageItems.has(item.id))
                          .reduce((sum, item) => sum + item.leadTime, 0) / selectedShortageItems.size)
                        : 0
                      }
                    </div>
                    <div className="text-sm opacity-90">Avg Lead Time (days)</div>
                  </CardContent>
                </Card>
              </div>

              {selectedCount > 0 && (
                <Card className="bg-surface border-border/50">
                  <CardHeader>
                    <CardTitle className="text-foreground">Selected Items Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shortageItems
                        .filter(item => selectedShortageItems.has(item.id))
                        .map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-surface-elevated rounded-lg">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover border border-border"
                              />
                              <div>
                                <span className="font-medium text-foreground">{item.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {item.urgency}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-foreground">
                                {item.customQuantity ?? item.suggestedQuantity} units
                              </div>
                              <div className="text-success font-semibold">
                                ${(item.price * (item.customQuantity ?? item.suggestedQuantity)).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {budgetLimit > 0 && shortageOrderTotal > budgetLimit && (
                <Card className="border-destructive bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/20 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="font-medium text-destructive">Budget Exceeded</div>
                        <div className="text-sm text-muted-foreground">
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

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={sendSelectedShortageOrders}
              disabled={selectedCount === 0 || (budgetLimit > 0 && shortageOrderTotal > budgetLimit)}
              className="flex-1 gap-2 bg-gradient-primary hover:opacity-90"
            >
              <Bell className="h-4 w-4" />
              Send Selected Orders ({selectedCount} items - ${shortageOrderTotal.toFixed(2)})
            </Button>
            <Button
              onClick={() => setShowShortagePopup(false)}
              variant="outline"
              className="gap-2"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
