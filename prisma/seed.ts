
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create roles
  const retailerRole = await prisma.role.upsert({
    where: { name: 'RETAILER' },
    update: {},
    create: {
      name: 'RETAILER',
      permissions: {
        canViewInventory: true,
        canCreateOrders: true,
        canViewOrders: true
      }
    }
  })

  const warehouseRole = await prisma.role.upsert({
    where: { name: 'WAREHOUSE_AGENT' },
    update: {},
    create: {
      name: 'WAREHOUSE_AGENT',
      permissions: {
        canApproveOrders: true,
        canManageInventory: true,
        canViewAllOrders: true
      }
    }
  })

  // Create warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { id: 'warehouse-1' },
    update: {},
    create: {
      id: 'warehouse-1',
      name: 'Walmart Distribution Center #6094',
      address: '24555 Katy Freeway, Katy, TX 77494',
      geoLocation: { lat: 29.7604, lng: -95.689 },
      truckId: 'truck-001'
    }
  })

  // Create retail shops
  const shops = await Promise.all([
    prisma.retailShop.upsert({
      where: { id: 'shop-1' },
      update: {},
      create: {
        id: 'shop-1',
        name: 'Walmart Supercenter #5260',
        address: '2425 East Pioneer Parkway, Arlington, TX 76010',
        geoLocation: { lat: 32.7074, lng: -97.0682 },
        linkedWarehouseId: warehouse.id
      }
    }),
    prisma.retailShop.upsert({
      where: { id: 'shop-2' },
      update: {},
      create: {
        id: 'shop-2',
        name: 'Walmart Supercenter #1349',
        address: '8555 Preston Road, Frisco, TX 75034',
        geoLocation: { lat: 33.129, lng: -96.8236 },
        linkedWarehouseId: warehouse.id
      }
    })
  ])

  // Create items
  const items = await Promise.all([
    prisma.item.upsert({
      where: { sku: 'WMT-001' },
      update: {},
      create: {
        id: 'item-1',
        name: 'Grocery Essentials Pack',
        sku: 'WMT-001',
        unit: 'pack',
        baselineReorderThreshold: 10
      }
    }),
    prisma.item.upsert({
      where: { sku: 'WMT-002' },
      update: {},
      create: {
        id: 'item-2',
        name: 'Electronics Bundle',
        sku: 'WMT-002',
        unit: 'bundle',
        baselineReorderThreshold: 5
      }
    })
  ])

  // Create inventory records
  await Promise.all([
    prisma.inventoryRecord.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId: warehouse.id,
          itemId: items[0].id
        }
      },
      update: {},
      create: {
        warehouseId: warehouse.id,
        itemId: items[0].id,
        currentStock: 100,
        reservedStock: 0
      }
    }),
    prisma.inventoryRecord.upsert({
      where: {
        warehouseId_itemId: {
          warehouseId: warehouse.id,
          itemId: items[1].id
        }
      },
      update: {},
      create: {
        warehouseId: warehouse.id,
        itemId: items[1].id,
        currentStock: 50,
        reservedStock: 0
      }
    })
  ])

  console.log('Database seeded successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
