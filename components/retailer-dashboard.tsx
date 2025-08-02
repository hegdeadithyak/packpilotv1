
"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, Package, Truck, Clock, CheckCircle } from "lucide-react"

interface ShortageAlert {
  id: string
  item: {
    name: string
    sku: string
  }
  shop: {
    name: string
  }
  severity: string
  triggeredAt: string
  resolvedFlag: boolean
  alertData: any
}

interface OrderRequest {
  id: string
  totalQuantity: number
  status: string
  priority: string
  createdAt: string
  shop: {
    name: string
  }
  warehouse: {
    name: string
  }
  sourceAlert?: {
    item: {
      name: string
    }
  }
}

export default function RetailerDashboard() {
  const [alerts, setAlerts] = useState<ShortageAlert[]>([])
  const [orders, setOrders] = useState<OrderRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlerts()
    fetchOrders()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/shortage-alerts?resolved=false')
      const data = await response.json()
      setAlerts(data)
    } catch (error) {
      console.error('Error fetching alerts:', error)
    }
  }

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/orders')
      const data = await response.json()
      setOrders(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setLoading(false)
    }
  }

  const createOrderFromAlert = async (alert: ShortageAlert) => {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopId: alert.shop.id,
          warehouseId: 'default-warehouse', // You'll need to implement proper warehouse selection
          totalQuantity: alert.alertData.suggestedQuantity || 10,
          priority: alert.severity === 'CRITICAL' ? 'URGENT' : 'MEDIUM',
          sourceAlertId: alert.id,
        }),
      })

      if (response.ok) {
        fetchOrders()
        fetchAlerts()
      }
    } catch (error) {
      console.error('Error creating order:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-500'
      case 'APPROVED': return 'bg-green-500'
      case 'REJECTED': return 'bg-red-500'
      case 'FULFILLED': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'destructive'
      case 'HIGH': return 'destructive'
      case 'MEDIUM': return 'default'
      case 'LOW': return 'secondary'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Retailer Dashboard</h1>
        <Button onClick={() => { fetchAlerts(); fetchOrders(); }}>
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.status === 'PENDING').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Truck className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">In Transit</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.status === 'APPROVED').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Fulfilled</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.status === 'FULFILLED').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shortage Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Active Shortage Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No active alerts</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <div>
                          <strong>{alert.item.name}</strong> (SKU: {alert.item.sku})
                          <br />
                          <span className="text-sm text-muted-foreground">
                            Triggered: {new Date(alert.triggeredAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <Button 
                            size="sm" 
                            onClick={() => createOrderFromAlert(alert)}
                          >
                            Create Order
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </div>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground">No orders found</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <div className="font-medium">
                      {order.sourceAlert?.item.name || 'Manual Order'} 
                      <span className="text-muted-foreground ml-2">
                        (Qty: {order.totalQuantity})
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      From: {order.warehouse.name} → To: {order.shop.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    <Badge variant="outline">
                      {order.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
