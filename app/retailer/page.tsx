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
import { Minus, Plus, ShoppingCart, LogOut, Send, Package, AlertTriangle, Bell, X, Calculator, TrendingUp, DollarSign, Truck, Building2, BarChart3, Search, Filter, Eye, Settings, Zap, Target, ShoppingBag, Clock, Star, ChevronRight, Grid3X3, List, RefreshCw, Download, Upload, Users, Boxes } from 'lucide-react'

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

const availableItems: Item[] = [{ id: "1", name: "Coca Cola 12-Pack", category: "Beverages", price: 4.99, inStock: true, currentStock: 15, minStock: 20, maxStock: 80, leadTime: 2, supplierReliability: 95, image: "/assets/1.png", },
{ id: "2", name: "Lay's Potato Chips", category: "Snacks", price: 2.49, inStock: true, currentStock: 8, minStock: 25, maxStock: 100, leadTime: 1, supplierReliability: 98, image: "/assets/2.png", }, { id: "3", name: "Wonder Bread", category: "Bakery", price: 1.99, inStock: true, currentStock: 45, minStock: 30, maxStock: 60, leadTime: 1, supplierReliability: 92, image: "/assets/3.png", }, { id: "4", name: "Milk Gallon", category: "Dairy", price: 3.49, inStock: true, currentStock: 3, minStock: 15, maxStock: 40, leadTime: 1, supplierReliability: 90, image: "/assets/4.png", }, { id: "5", name: "Bananas (lb)", category: "Produce", price: 0.68, inStock: true, currentStock: 12, minStock: 20, maxStock: 50, leadTime: 2, supplierReliability: 85, image: "/assets/5.png", }, { id: "7", name: "Tide Detergent", category: "Household", price: 12.99, inStock: true, currentStock: 22, minStock: 15, maxStock: 40, leadTime: 3, supplierReliability: 96, image: "/assets/7.png", }, { id: "8", name: "Charmin Toilet Paper", category: "Household", price: 8.99, inStock: true, currentStock: 18, minStock: 20, maxStock: 60, leadTime: 2, supplierReliability: 94, image: "/assets/8.png", }, { id: "9", name: "Cheerios Cereal", category: "Breakfast", price: 4.49, inStock: true, currentStock: 5, minStock: 12, maxStock: 50, leadTime: 2, supplierReliability: 97, image: "/assets/9.png", }, { id: "10", name: "Frozen Pizza", category: "Frozen", price: 3.99, inStock: true, currentStock: 28, minStock: 25, maxStock: 80, leadTime: 3, supplierReliability: 93, image: "/assets/10.png", },
{
  id: "11",
  name: "Medical Crate",
  category: "Medical",
  price: 30.99,
  inStock: true,
  currentStock: 28,
  minStock: 25,
  maxStock: 80,
  leadTime: 3,
  supplierReliability: 93,
  image: "/placeholder.svg?height=64&width=64&text=Frozen+Pizza",
}]

export default function InventoryDashboard() {
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
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-xl shadow-lg">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{retailInfo.name}</h1>
                  <p className="text-sm text-gray-600">ID: {retailInfo.id}</p>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="hidden lg:flex items-center gap-6 ml-8">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900">{totalItems} Items</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-gray-900">{lowStockItems} Low Stock</span>
                </div>
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-900">{outOfStockItems} Out of Stock</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-50">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-50">
                <Settings className="h-4 w-4" />
                Settings
              </Button>
              <Button variant="outline" className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-50">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Smart Alert Banner */}
      {shortageItems.length > 0 && showTopAlert && (
        <div className="relative overflow-hidden bg-orange-100 border-b border-orange-200">
          <div className="container mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-orange-200 rounded-lg">
                  <Zap className="h-4 w-4 text-orange-700" />
                </div>
                <div>
                  <p className="font-medium text-orange-800">
                    {criticalShortages.length > 0
                      ? `${criticalShortages.length} critical items need immediate attention`
                      : `${shortageItems.length} items running low`
                    }
                  </p>
                  <p className="text-sm text-orange-700">
                    Smart AI ordering suggestions available
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowShortagePopup(true)}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white gap-2"
                >
                  <Target className="h-4 w-4" />
                  Smart Order
                </Button>
                <Button
                  onClick={() => setShowTopAlert(false)}
                  variant="ghost"
                  size="sm"
                  className="text-orange-700 hover:bg-orange-200"
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
                <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
                <p className="text-gray-600 mt-1">Manage your store inventory and place orders</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
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
                <Button variant="outline" size="sm" className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-50">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <Card className="bg-white border-gray-200">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search products..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white text-gray-900 placeholder-gray-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {categories.map(category => (
                        <option key={category} value={category} className="text-gray-900">
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
                    <Card key={item.id} className="bg-white hover:bg-gray-50 transition-colors border-gray-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-gray-100"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-gray-900">{item.name}</h3>
                                <p className="text-sm text-gray-600">{item.category}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={item.inStock ? "default" : "destructive"} className={item.inStock ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}>
                                  {item.inStock ? "In Stock" : "Out of Stock"}
                                </Badge>
                                {isLowStock && item.inStock && (
                                  <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">
                                    Low Stock
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">Current Stock:</span>
                                <div className="font-medium text-gray-900">{item.currentStock}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Min Required:</span>
                                <div className="font-medium text-gray-900">{item.minStock}</div>
                              </div>
                              <div>
                                <span className="text-gray-600">Price:</span>
                                <div className="font-bold text-green-600 text-lg">${item.price}</div>
                              </div>
                              <div className="flex justify-end">
                                <Button
                                  onClick={() => addToOrder(item)}
                                  disabled={!item.inStock}
                                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
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
                    className={`group relative overflow-hidden bg-white hover:bg-gray-50 transition-all duration-200 border-gray-200 hover:border-gray-300 hover:shadow-lg ${isCritical ? "ring-1 ring-red-300" : isLowStock ? "ring-1 ring-orange-300" : ""
                      }`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="relative">
                          <img
                            src={item.image || "/placeholder.svg"}
                            alt={item.name}
                            className="w-16 h-16 rounded-xl object-cover border border-gray-200 bg-gray-100"
                          />
                          {!item.inStock && (
                            <div className="absolute inset-0 bg-red-100 rounded-xl flex items-center justify-center">
                              <X className="h-6 w-6 text-red-500" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                            <Badge variant={item.inStock ? "default" : "destructive"} className={`ml-2 ${item.inStock ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300"}`}>
                              {item.inStock ? "In Stock" : "Out"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{item.category}</p>

                          {/* Stock Level Indicator */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600">Stock Level</span>
                              <span className={`font-medium ${isCritical ? "text-red-600" :
                                isLowStock ? "text-orange-600" : "text-green-600"
                                }`}>
                                {item.currentStock}/{item.maxStock || item.minStock * 2}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${isCritical ? "bg-red-500" :
                                  isLowStock ? "bg-orange-500" : "bg-green-500"
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
                          <div className="bg-gray-100 rounded-lg p-2">
                            <span className="text-gray-600 block">Lead Time</span>
                            <span className="font-semibold text-gray-900">{item.leadTime || 2} days</span>
                          </div>
                        </div>

                        {/* Price and Action */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="text-2xl font-bold text-green-600">${item.price}</div>
                          <Button
                            onClick={() => addToOrder(item)}
                            disabled={!item.inStock}
                            size="sm"
                            className="gap-2 group-hover:shadow-md transition-shadow bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                        </div>
                      </div>

                      {/* Warning overlay for critical items */}
                      {isCritical && (
                        <div className="absolute top-2 left-2">
                          <Badge variant="destructive" className="gap-1 bg-red-100 text-red-800 border-red-300">
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
              <Card className="bg-white border-gray-200">
                <CardContent className="p-12 text-center">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No items found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="space-y-6">
            {/* Order Summary Card */}
            <Card className="sticky top-24 bg-white border-gray-200 shadow-xl">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-gray-900">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  Current Order
                </CardTitle>
                <CardDescription className="text-gray-600">
                  {orderItems.length} {orderItems.length === 1 ? 'item' : 'items'} selected
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-sm">Your order is empty</p>
                    <p className="text-gray-500 text-xs mt-1">Add items to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {orderItems.map((item) => (
                        <Card key={item.id} className="bg-gray-50 border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex gap-3">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm text-gray-900 truncate">{item.name}</h4>
                                <p className="text-xs text-gray-600 mb-2">${item.price} each</p>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => updateQuantity(item.id, -1)}
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0 border-gray-300 text-gray-700 hover:bg-gray-100"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="font-medium w-8 text-center text-sm text-gray-900">{item.quantity}</span>
                                    <Button
                                      onClick={() => updateQuantity(item.id, 1)}
                                      size="sm"
                                      variant="outline"
                                      className="h-7 w-7 p-0 border-gray-300 text-gray-700 hover:bg-gray-100"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <span className="font-semibold text-green-600 text-sm">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Separator className="bg-gray-200" />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total:</span>
                        <span className="font-bold text-xl text-green-600">
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-900">Delivery Date</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            min={new Date().toISOString().split("T")[0]}
                            className="pl-10 bg-white text-gray-900"
                          />
                        </div>
                      </div>

                      <Button onClick={sendRequest} className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                        <Send className="h-4 w-4" />
                        Send Order Request
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-gray-900 text-base">Store Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Products</span>
                  <Badge variant="outline" className="border-gray-300 text-gray-700 bg-gray-50">{totalItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Low Stock</span>
                  <Badge variant="outline" className="border-orange-500 text-orange-600 bg-orange-50">{lowStockItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Out of Stock</span>
                  <Badge variant="outline" className="border-red-500 text-red-600 bg-red-50">{outOfStockItems}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Order Value</span>
                  <span className="font-semibold text-green-600">${totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Shortage Management Dialog */}
      <Dialog open={showShortagePopup} onOpenChange={setShowShortagePopup}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Calculator className="h-5 w-5 text-white" />
              </div>
              Smart Inventory Assistant
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              AI-powered inventory optimization based on current stock levels, demand patterns, and business requirements.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="items" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100">
              <TabsTrigger value="items" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900">Items Selection</TabsTrigger>
              <TabsTrigger value="strategy" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900">Order Strategy</TabsTrigger>
              <TabsTrigger value="summary" className="text-gray-900 data-[state=active]:bg-white data-[state=active]:text-gray-900">Order Summary</TabsTrigger>
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
                  className="gap-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Select Critical Items
                </Button>
                <Button
                  onClick={() => setSelectedShortageItems(new Set())}
                  size="sm"
                  variant="outline"
                  className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
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
                  className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Target className="h-4 w-4" />
                  Select All
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {shortageItems.map((item) => (
                  <Card
                    key={item.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedShortageItems.has(item.id)
                      ? "border-blue-500 bg-blue-50"
                      : item.urgency === "critical"
                        ? "border-red-300 bg-red-50"
                        : item.urgency === "low"
                          ? "border-orange-300 bg-orange-50"
                          : "border-orange-200 bg-orange-50"
                      }`}
                    onClick={() => toggleShortageSelection(item.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <Checkbox
                          checked={selectedShortageItems.has(item.id)}
                          onCheckedChange={() => toggleShortageSelection(item.id)}
                          className="mt-1"
                        />
                        <img
                          src={item.image || "/placeholder.svg"}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 bg-gray-100 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-gray-900">{item.name}</h4>
                              <p className="text-sm text-gray-600">{item.category}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant={item.urgency === "critical" ? "destructive" : "outline"} className={item.urgency === "critical" ? "bg-red-100 text-red-800 border-red-300" : "border-orange-500 text-orange-600 bg-orange-50"}>
                                {item.urgency}
                              </Badge>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-300">
                                {item.priority} priority
                              </Badge>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mb-3">
                            <div className="bg-gray-100 rounded-lg p-2">
                              <span className="text-gray-600 block text-xs">Current</span>
                              <span className={`font-semibold ${item.currentStock === 0 ? "text-red-600" : "text-orange-600"}`}>
                                {item.currentStock}
                              </span>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-2">
                              <span className="text-gray-600 block text-xs">Required</span>
                              <span className="font-semibold text-green-600">{item.minStock}</span>
                            </div>
                            <div className="bg-gray-100 rounded-lg p-2">
                              <span className="text-gray-600 block text-xs">Lead Time</span>
                              <span className="font-semibold text-gray-900">{item.leadTime} days</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-600">Quantity:</span>
                              <div className="flex items-center gap-2">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const currentQty = item.customQuantity ?? item.suggestedQuantity
                                    updateShortageQuantity(item.id, currentQty - 1)
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 border-gray-300 text-gray-700 hover:bg-gray-100"
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
                                  className="w-16 h-8 text-center bg-white text-gray-900"
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
                                  className="h-8 w-8 p-0 border-gray-300 text-gray-700 hover:bg-gray-100"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-600">Suggested: {item.suggestedQuantity}</div>
                              <div className="font-semibold text-green-600">
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
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <TrendingUp className="h-5 w-5" />
                      Ordering Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <Label className="text-gray-900">Select your ordering approach:</Label>
                      <div className="space-y-3">
                        {[
                          { value: "conservative", label: "Conservative", desc: "Order 80% of shortage (Lower cash commitment)", icon: "🛡️" },
                          { value: "balanced", label: "Balanced", desc: "Order exact shortage amount (Recommended)", icon: "⚖️" },
                          { value: "aggressive", label: "Aggressive", desc: "Order above minimum (Higher buffer)", icon: "🚀" }
                        ].map(({ value, label, desc, icon }) => (
                          <Card key={value} className={`cursor-pointer transition-colors ${orderingStrategy === value ? "border-blue-500 bg-blue-50" : "bg-white hover:bg-gray-50"
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
                                      <span className="font-medium text-gray-900">{label}</span>
                                    </div>
                                    <span className="text-sm text-gray-600">{desc}</span>
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

                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-gray-900">
                      <DollarSign className="h-5 w-5" />
                      Budget Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="cashflow"
                        checked={cashFlowMode}
                        onCheckedChange={setCashFlowMode}
                      />
                      <Label htmlFor="cashflow" className="text-gray-900">Enable budget limit</Label>
                    </div>

                    {cashFlowMode && (
                      <div className="space-y-3">
                        <Label htmlFor="budget" className="text-gray-900">Maximum order budget ($)</Label>
                        <Input
                          id="budget"
                          type="number"
                          value={budgetLimit}
                          onChange={(e) => setBudgetLimit(parseFloat(e.target.value) || 0)}
                          placeholder="Enter budget limit"
                          className="bg-white text-gray-900 placeholder-gray-500"
                          min="0"
                          step="0.01"
                        />
                        <div className="p-3 bg-white rounded-lg">
                          <p className="text-sm text-gray-600">
                            Current order total: <span className="font-medium text-gray-900">${shortageOrderTotal.toFixed(2)}</span>
                            {budgetLimit > 0 && shortageOrderTotal > budgetLimit && (
                              <span className="text-red-600 ml-2 flex items-center gap-1">
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

              <Card className="bg-gray-50 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-gray-900">
                    <Truck className="h-5 w-5" />
                    Delivery Preferences
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="shortage-deadline" className="text-gray-900">Preferred delivery date</Label>
                      <Input
                        id="shortage-deadline"
                        type="date"
                        value={customDeadline}
                        onChange={(e) => setCustomDeadline(e.target.value)}
                        className="bg-white text-gray-900"
                        min={new Date().toISOString().split("T")[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-900">Delivery notes</Label>
                      <div className="text-sm text-gray-600 space-y-1 bg-white p-3 rounded-lg">
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
                <Card className="bg-blue-600 text-white">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-white">{selectedCount}</div>
                    <div className="text-sm text-blue-100">Items Selected</div>
                  </CardContent>
                </Card>

                <Card className="bg-green-600 text-white">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-white">${shortageOrderTotal.toFixed(2)}</div>
                    <div className="text-sm text-green-100">Total Cost</div>
                  </CardContent>
                </Card>

                <Card className="bg-purple-600 text-white">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold text-white">
                      {selectedShortageItems.size > 0 ?
                        Math.round(shortageItems
                          .filter(item => selectedShortageItems.has(item.id))
                          .reduce((sum, item) => sum + item.leadTime, 0) / selectedShortageItems.size)
                        : 0
                      }
                    </div>
                    <div className="text-sm text-purple-100">Avg Lead Time (days)</div>
                  </CardContent>
                </Card>
              </div>

              {selectedCount > 0 && (
                <Card className="bg-gray-50 border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-gray-900">Selected Items Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shortageItems
                        .filter(item => selectedShortageItems.has(item.id))
                        .map(item => (
                          <div key={item.id} className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image || "/placeholder.svg"}
                                alt={item.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                              />
                              <div>
                                <span className="font-medium text-gray-900">{item.name}</span>
                                <Badge variant="outline" className="ml-2 text-xs border-orange-500 text-orange-600 bg-orange-50">
                                  {item.urgency}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-gray-900">
                                {item.customQuantity ?? item.suggestedQuantity} units
                              </div>
                              <div className="text-green-600 font-semibold">
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
                <Card className="border-red-500 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <div className="font-medium text-red-600">Budget Exceeded</div>
                        <div className="text-sm text-gray-600">
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

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              onClick={sendSelectedShortageOrders}
              disabled={selectedCount === 0 || (budgetLimit > 0 && shortageOrderTotal > budgetLimit)}
              className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
            >
              <Bell className="h-4 w-4" />
              Send Selected Orders ({selectedCount} items - ${shortageOrderTotal.toFixed(2)})
            </Button>
            <Button
              onClick={() => setShowShortagePopup(false)}
              variant="outline"
              className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}