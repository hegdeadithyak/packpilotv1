
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shopId = searchParams.get('shopId')
    const resolved = searchParams.get('resolved')

    const where: any = {}
    if (shopId) where.shopId = shopId
    if (resolved !== null) where.resolvedFlag = resolved === 'true'

    const alerts = await prisma.shortageAlert.findMany({
      where,
      include: {
        item: true,
        shop: true,
        orderRequests: true
      },
      orderBy: {
        triggeredAt: 'desc'
      }
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching shortage alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch shortage alerts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { itemId, shopId, alertData, severity } = body

    const alert = await prisma.shortageAlert.create({
      data: {
        itemId,
        shopId,
        alertData,
        severity
      },
      include: {
        item: true,
        shop: true
      }
    })

    // Trigger automatic order creation based on alert
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        retailShops: {
          some: {
            id: shopId
          }
        }
      }
    })

    if (warehouse) {
      await prisma.orderRequest.create({
        data: {
          shopId,
          warehouseId: warehouse.id,
          totalQuantity: alertData.suggestedQuantity || 1,
          priority: severity === 'CRITICAL' ? 'URGENT' : 'MEDIUM',
          sourceAlertId: alert.id,
          status: 'PENDING'
        }
      })
    }

    return NextResponse.json(alert, { status: 201 })
  } catch (error) {
    console.error('Error creating shortage alert:', error)
    return NextResponse.json({ error: 'Failed to create shortage alert' }, { status: 500 })
  }
}
