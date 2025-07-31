
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const warehouseId = searchParams.get('warehouseId')
    const itemId = searchParams.get('itemId')

    const where: any = {}
    if (warehouseId) where.warehouseId = warehouseId
    if (itemId) where.itemId = itemId

    const inventory = await prisma.inventoryRecord.findMany({
      where,
      include: {
        warehouse: true,
        item: true
      }
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { warehouseId, itemId, currentStock, reservedStock } = body

    const inventory = await prisma.inventoryRecord.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId,
          itemId
        }
      },
      update: {
        currentStock,
        reservedStock,
        lastUpdated: new Date()
      },
      create: {
        warehouseId,
        itemId,
        currentStock,
        reservedStock
      },
      include: {
        warehouse: true,
        item: true
      }
    })

    return NextResponse.json(inventory)
  } catch (error) {
    console.error('Error updating inventory:', error)
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 })
  }
}
