"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Hash,
  Weight,
} from "lucide-react"
import { useRouter } from "next/navigation"

interface Order {
  id: number
  retailId: number
  productId: number
  quantity: number
  deliveryDate: string
  status: string
  totalWeight?: number
  priority: string
  createdAt: string
  retail?: {
    name: string
    location?: string
  }
  product?: {
    name: string
    sku?: string
  }
}

type SortField = "id" | "deliveryDate" | "createdAt" | "quantity" | "priority" | "status"
type SortDirection = "asc" | "desc"

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState<SortField>("createdAt")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showCreateDropdown, setShowCreateDropdown] = useState(false)

  const router = useRouter()

  useEffect(() => {
    fetchOrders()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest(".create-model-dropdown")) {
        setShowCreateDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await fetch("http://localhost:3001/api/orders")
      if (!response.ok) {
        throw new Error("Failed to fetch orders")
      }
      const data = await response.json()
      setOrders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { color: "text-yellow-400 bg-yellow-400/20 border-yellow-400/30", icon: Clock },
      confirmed: { color: "text-blue-400 bg-blue-400/20 border-blue-400/30", icon: CheckCircle },
      in_transit: { color: "text-purple-400 bg-purple-400/20 border-purple-400/30", icon: Truck },
      delivered: { color: "text-green-400 bg-green-400/20 border-green-400/30", icon: CheckCircle },
    }
    return configs[status.toLowerCase() as keyof typeof configs] || configs.pending
  }

  const getPriorityConfig = (priority: string) => {
    const configs = {
      high: { color: "text-red-400 bg-red-400/20 border-red-400/30", icon: AlertTriangle },
      normal: { color: "text-gray-400 bg-gray-400/20 border-gray-400/30", icon: Package },
      low: { color: "text-green-400 bg-green-400/20 border-green-400/30", icon: Package },
    }
    return configs[priority.toLowerCase() as keyof typeof configs] || configs.normal
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const filteredAndSortedOrders = useMemo(() => {
    const filtered = orders.filter((order) => {
      const matchesStatus = filter === "all" || order.status.toLowerCase() === filter
      const matchesPriority = priorityFilter === "all" || order.priority.toLowerCase() === priorityFilter
      const matchesSearch =
        searchTerm === "" ||
        order.id.toString().includes(searchTerm) ||
        order.retail?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())

      return matchesStatus && matchesPriority && matchesSearch
    })

    return filtered.sort((a, b) => {
      let aValue: any = a[sortField]
      let bValue: any = b[sortField]

      if (sortField === "deliveryDate" || sortField === "createdAt") {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      }

      if (sortDirection === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })
  }, [orders, filter, priorityFilter, searchTerm, sortField, sortDirection])

  const stats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      confirmed: orders.filter((o) => o.status === "confirmed").length,
      inTransit: orders.filter((o) => o.status === "in_transit").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      highPriority: orders.filter((o) => o.priority === "high").length,
    }),
    [orders],
  )

  const toggleOrderSelection = (orderId: number) => {
    setSelectedOrders((prev) => (prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]))
  }

  const selectAllOrders = () => {
    if (selectedOrders.length === filteredAndSortedOrders.length) {
      setSelectedOrders([])
    } else {
      setSelectedOrders(filteredAndSortedOrders.map((order) => order.id))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-white text-xl">Loading orders...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <div className="text-red-400 text-xl">Error: {error}</div>
          <button
            onClick={fetchOrders}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Orders Management
              </h1>
              <p className="text-gray-400 text-lg">Warehouse Manager Dashboard</p>
            </div>
            <div className="relative create-model-dropdown">
              <button
                onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                className="relative px-6 py-3 bg-gradient-to-r from-green-500 via-green-600 to-green-700 hover:from-green-400 hover:via-green-500 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-600 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Model
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${showCreateDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </button>

              {/* Dropdown Menu */}
              {showCreateDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        router.push("/sample")
                        setShowCreateDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-white">Sample Model</div>
                        <div className="text-sm text-gray-400">Use pre-built templates</div>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        router.push("/new")
                        setShowCreateDropdown(false)
                      }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-gray-700 transition-colors flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                          />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-white">New Model</div>
                        <div className="text-sm text-gray-400">Create from scratch</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-4 border border-gray-600 hover:border-gray-500 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-gray-400 text-sm">Total Orders</div>
              </div>
              <Package className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 rounded-xl p-4 border border-yellow-600/30 hover:border-yellow-500/50 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
                <div className="text-gray-400 text-sm">Pending</div>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 rounded-xl p-4 border border-blue-600/30 hover:border-blue-500/50 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-400">{stats.confirmed}</div>
                <div className="text-gray-400 text-sm">Confirmed</div>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 rounded-xl p-4 border border-purple-600/30 hover:border-purple-500/50 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-400">{stats.inTransit}</div>
                <div className="text-gray-400 text-sm">In Transit</div>
              </div>
              <Truck className="h-8 w-8 text-purple-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 rounded-xl p-4 border border-green-600/30 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.delivered}</div>
                <div className="text-gray-400 text-sm">Delivered</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 rounded-xl p-4 border border-red-600/30 hover:border-red-500/50 transition-all duration-300 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-400">{stats.highPriority}</div>
                <div className="text-gray-400 text-sm">High Priority</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-6 border border-gray-700">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search orders, products, retailers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                  showFilters ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
              </button>

              <button
                onClick={fetchOrders}
                className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-all"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>

              {selectedOrders.length > 0 && (
                <button className="flex items-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all">
                  <Download className="h-4 w-4" />
                  Export ({selectedOrders.length})
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Status Filter</label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "pending", "confirmed", "in_transit", "delivered"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          filter === status ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {status === "all" ? "All" : status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-3">Priority Filter</label>
                  <div className="flex flex-wrap gap-2">
                    {["all", "high", "normal", "low"].map((priority) => (
                      <button
                        key={priority}
                        onClick={() => setPriorityFilter(priority)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          priorityFilter === priority
                            ? "bg-blue-600 text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Orders Table */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={
                        selectedOrders.length === filteredAndSortedOrders.length && filteredAndSortedOrders.length > 0
                      }
                      onChange={selectAllOrders}
                      className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>

                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("id")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      <Hash className="h-4 w-4" />
                      Order ID
                      {sortField === "id" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Retail & Product
                  </th>

                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("quantity")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Quantity
                      {sortField === "quantity" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Weight className="h-4 w-4" />
                      Weight
                    </div>
                  </th>

                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("status")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Status
                      {sortField === "status" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  </th>

                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("priority")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      Priority
                      {sortField === "priority" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  </th>

                  <th className="px-6 py-4 text-left">
                    <button
                      onClick={() => handleSort("deliveryDate")}
                      className="flex items-center gap-2 text-sm font-medium text-gray-300 uppercase tracking-wider hover:text-white transition-colors"
                    >
                      <Calendar className="h-4 w-4" />
                      Delivery
                      {sortField === "deliveryDate" &&
                        (sortDirection === "asc" ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        ))}
                    </button>
                  </th>

                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAndSortedOrders.map((order) => {
                  const statusConfig = getStatusConfig(order.status)
                  const priorityConfig = getPriorityConfig(order.priority)
                  const StatusIcon = statusConfig.icon
                  const PriorityIcon = priorityConfig.icon

                  return (
                    <tr
                      key={order.id}
                      className={`hover:bg-gray-700/50 transition-all duration-200 ${
                        selectedOrders.includes(order.id) ? "bg-blue-900/20" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={() => toggleOrderSelection(order.id)}
                          className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                        />
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-bold text-blue-400">#{order.id}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-white">
                              {order.retail?.name || `Retail ${order.retailId}`}
                            </div>
                          </div>
                          {order.retail?.location && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <MapPin className="h-3 w-3" />
                              {order.retail.location}
                            </div>
                          )}
                          <div className="text-sm text-gray-300">
                            {order.product?.name || `Product ${order.productId}`}
                          </div>
                          {order.product?.sku && (
                            <div className="text-xs text-gray-400 font-mono">SKU: {order.product.sku}</div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-semibold text-white">{order.quantity.toLocaleString()}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {order.totalWeight ? `${order.totalWeight} kg` : "-"}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${statusConfig.color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {order.status.replace("_", " ").toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full border ${priorityConfig.color}`}
                        >
                          <PriorityIcon className="h-3 w-3" />
                          {order.priority.toUpperCase()}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          {formatDate(order.deliveryDate)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredAndSortedOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <div className="text-xl text-gray-400 mb-2">No orders found</div>
              <div className="text-gray-500">Try adjusting your filters or search terms</div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mt-6 text-center text-gray-400">
          Showing {filteredAndSortedOrders.length} of {orders.length} orders
          {selectedOrders.length > 0 && <span className="ml-4 text-blue-400">{selectedOrders.length} selected</span>}
        </div>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Order ID</label>
                  <div className="text-lg font-mono text-blue-400">#{selectedOrder.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getStatusConfig(selectedOrder.status)
                      const Icon = config.icon
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full border ${config.color}`}
                        >
                          <Icon className="h-4 w-4" />
                          {selectedOrder.status.replace("_", " ").toUpperCase()}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Retail Store</label>
                  <div className="text-white">{selectedOrder.retail?.name || `Retail ${selectedOrder.retailId}`}</div>
                  {selectedOrder.retail?.location && (
                    <div className="text-sm text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {selectedOrder.retail.location}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Product</label>
                  <div className="text-white">
                    {selectedOrder.product?.name || `Product ${selectedOrder.productId}`}
                  </div>
                  {selectedOrder.product?.sku && (
                    <div className="text-sm text-gray-400 font-mono mt-1">SKU: {selectedOrder.product.sku}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Quantity</label>
                  <div className="text-xl font-semibold text-white">{selectedOrder.quantity.toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Weight</label>
                  <div className="text-xl font-semibold text-white">
                    {selectedOrder.totalWeight ? `${selectedOrder.totalWeight} kg` : "N/A"}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Priority</label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const config = getPriorityConfig(selectedOrder.priority)
                      const Icon = config.icon
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 text-sm font-semibold rounded-full border ${config.color}`}
                        >
                          <Icon className="h-4 w-4" />
                          {selectedOrder.priority.toUpperCase()}
                        </span>
                      )
                    })()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Delivery Date</label>
                  <div className="text-white flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    {formatDate(selectedOrder.deliveryDate)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Created</label>
                  <div className="text-white">{formatDate(selectedOrder.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
