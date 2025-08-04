"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Store, Warehouse, Shield } from "lucide-react"
import { EnhancedWorldMap } from "@/components/enhanced-worldmap"
import { CursorEffect } from "@/components/cursor-effect"

export default function LoginPage() {
  const router = useRouter()
  const [showContent, setShowContent] = useState(false)
  const [retailLoginData, setRetailLoginData] = useState({ retailId: "", password: "" })
  const [warehouseLoginData, setWarehouseLoginData] = useState({ username: "", password: "" })
  const [signupData, setSignupData] = useState({
    shopName: "",
    retailId: "",
    password: "",
    confirmPassword: "",
    address: "",
    phone: "",
  })

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const handleRetailLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (retailLoginData.retailId && retailLoginData.password) {
      localStorage.setItem(
        "currentRetail",
        JSON.stringify({
          id: retailLoginData.retailId,
          name: `Retail Shop ${retailLoginData.retailId}`,
        }),
      )
      router.push("/retailer")
    }
  }

  const handleWarehouseLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (warehouseLoginData.username === "warehouse_admin" && warehouseLoginData.password === "walmart2024") {
      localStorage.setItem(
        "warehouseAuth",
        JSON.stringify({
          id: "WH001",
          name: "Walmart Central Warehouse",
          role: "admin",
        }),
      )
      router.push("/truck")
    } else {
      alert("Invalid warehouse credentials!")
    }
  }

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    if (signupData.password === signupData.confirmPassword && signupData.shopName) {
      localStorage.setItem(
        "currentRetail",
        JSON.stringify({
          id: signupData.retailId,
          name: signupData.shopName,
        }),
      )
      router.push("/dashboard")
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
      <CursorEffect />

      {/* Full screen world map background */}
      <div className="absolute inset-0">
        <EnhancedWorldMap />
      </div>

      {/* Centered transparent login container */}
      <div className="relative z-10 w-full max-w-md mx-auto p-8">
        {/* Static Title */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in-up">
            <Warehouse className="h-10 w-10 text-blue-500 animate-pulse" />
            <div className="text-4xl font-bold text-white">Walmart Connect</div>
          </div>
          <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="text-gray-400 text-lg">Global Retail-Warehouse Network</div>
          </div>
        </div>

        {/* Animated Form */}
        <div
          className={`transition-all duration-1000 ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <Tabs defaultValue="retail-login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-900/30 backdrop-blur-md border border-gray-700/50 mb-6">
              <TabsTrigger
                value="retail-login"
                className="data-[state=active]:bg-gray-700/50 text-gray-300 text-xs transition-all duration-300 hover:bg-gray-600/30 cursor-pointer"
              >
                Retail Login
              </TabsTrigger>
              <TabsTrigger
                value="warehouse-login"
                className="data-[state=active]:bg-gray-700/50 text-gray-300 text-xs transition-all duration-300 hover:bg-gray-600/30 cursor-pointer"
              >
                Warehouse
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="data-[state=active]:bg-gray-700/50 text-gray-300 text-xs transition-all duration-300 hover:bg-gray-600/30 cursor-pointer"
              >
                New Shop
              </TabsTrigger>
            </TabsList>

            <TabsContent value="retail-login">
              <Card className="bg-gray-900/20 border-gray-700/50 backdrop-blur-md hover:bg-gray-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Store className="h-5 w-5 animate-pulse" />
                    Retail Login
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Enter your retail ID and password to access your dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRetailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="retailId" className="text-gray-300">
                        Retail ID
                      </Label>
                      <Input
                        id="retailId"
                        type="text"
                        placeholder="Enter your retail ID"
                        value={retailLoginData.retailId}
                        onChange={(e) => setRetailLoginData({ ...retailLoginData, retailId: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-blue-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-gray-300">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={retailLoginData.password}
                        onChange={(e) => setRetailLoginData({ ...retailLoginData, password: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-blue-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600/80 to-blue-700/80 hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 cursor-pointer backdrop-blur-sm"
                    >
                      Login to Dashboard
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warehouse-login">
              <Card className="bg-gray-900/20 border-gray-700/50 backdrop-blur-md hover:bg-gray-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Shield className="h-5 w-5 animate-pulse" />
                    Warehouse Admin Login
                  </CardTitle>
                  <CardDescription className="text-gray-400">Authorized warehouse personnel only</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWarehouseLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="warehouseUsername" className="text-gray-300">
                        Username
                      </Label>
                      <Input
                        id="warehouseUsername"
                        type="text"
                        placeholder="warehouse_admin"
                        value={warehouseLoginData.username}
                        onChange={(e) => setWarehouseLoginData({ ...warehouseLoginData, username: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-red-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="warehousePassword" className="text-gray-300">
                        Password
                      </Label>
                      <Input
                        id="warehousePassword"
                        type="password"
                        placeholder="Enter warehouse password"
                        value={warehouseLoginData.password}
                        onChange={(e) => setWarehouseLoginData({ ...warehouseLoginData, password: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-red-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-red-600/80 to-red-700/80 hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 cursor-pointer backdrop-blur-sm"
                    >
                      Access Warehouse System
                    </Button>
                  </form>
                  <div className="mt-4 p-3 bg-gray-800/30 rounded-lg backdrop-blur-sm border border-gray-700/50">
                    <p className="text-xs text-gray-400 text-center">
                      Demo Credentials:
                      <br />
                      Username: warehouse_admin
                      <br />
                      Password: walmart2024
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card className="bg-gray-900/20 border-gray-700/50 backdrop-blur-md hover:bg-gray-900/30 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/10">
                <CardHeader>
                  <CardTitle className="text-white">Create New Retail Account</CardTitle>
                  <CardDescription className="text-gray-400">
                    Register your retail shop with Walmart warehouse system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="shopName" className="text-gray-300">
                        Shop Name
                      </Label>
                      <Input
                        id="shopName"
                        type="text"
                        placeholder="Enter your shop name"
                        value={signupData.shopName}
                        onChange={(e) => setSignupData({ ...signupData, shopName: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newRetailId" className="text-gray-300">
                        Retail ID
                      </Label>
                      <Input
                        id="newRetailId"
                        type="text"
                        placeholder="Choose a retail ID"
                        value={signupData.retailId}
                        onChange={(e) => setSignupData({ ...signupData, retailId: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-gray-300">
                        Address
                      </Label>
                      <Input
                        id="address"
                        type="text"
                        placeholder="Shop address"
                        value={signupData.address}
                        onChange={(e) => setSignupData({ ...signupData, address: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-gray-300">
                        Phone Number
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Contact number"
                        value={signupData.phone}
                        onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword" className="text-gray-300">
                        Password
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="Create password"
                        value={signupData.password}
                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-gray-300">
                        Confirm Password
                      </Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm password"
                        value={signupData.confirmPassword}
                        onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                        className="bg-gray-800/30 border-gray-700/50 text-white placeholder:text-gray-500 focus:border-green-500 transition-all duration-300 cursor-pointer backdrop-blur-sm"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600/80 to-green-700/80 hover:from-green-700 hover:to-green-800 transition-all duration-300 transform hover:scale-105 cursor-pointer backdrop-blur-sm"
                    >
                      Create Account
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}