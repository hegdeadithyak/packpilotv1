
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get('shopId')
    const status = searchParams.get('status')

    const where: any = {}
    if (shopId) where.shopId = shopId
    if (status) where.status = status

    const orders = await prisma.orderRequest.findMany({
      where,
      include: {
        shop: true,
        warehouse: true,
        sourceAlert: true,
        orderDecisions: {
          include: {
            decider: true
          }
        },
        statusHistory: {
          include: {
            changedBy: true
          },
          orderBy: {
            changedAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { shopId, warehouseId, totalQuantity, priority, sourceAlertId } = body

    const order = await prisma.orderRequest.create({
      data: {
        shopId,
        warehouseId,
        totalQuantity,
        priority,
        sourceAlertId,
        status: 'PENDING'
      },
      include: {
        shop: true,
        warehouse: true,
        sourceAlert: true
      }
    })

    // Create initial status history entry
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        changedByUserId: 'system', // You'll need to handle user context
        comment: 'Order created'
      }
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
