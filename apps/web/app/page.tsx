"use client"

import { useState, useEffect } from "react"
import { ClientOnly } from "@/components/client-only"
import { SwordsmanIntro } from "@/components/swordsman-intro"
import { InkWashLogin } from "@/components/ink-wash-login"
import { MainDashboard } from "@/components/main-dashboard"

export default function App() {
  const [mounted, setMounted] = useState(false)
  const [currentView, setCurrentView] = useState<"intro" | "login" | "dashboard">("intro")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userEmail, setUserEmail] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleIntroComplete = () => {
    setCurrentView("login")
  }

  const handleLogin = (email?: string) => {
    setIsLoggedIn(true)
    setUserEmail(email || "user@example.com")
    setCurrentView("dashboard")
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserEmail("")
    setCurrentView("login")
  }

  return (
    <ClientOnly fallback={<div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-lg">加载中...</div>
    </div>}>
      {currentView === "intro" && <SwordsmanIntro onComplete={handleIntroComplete} />}
      {currentView === "login" && <InkWashLogin onLogin={handleLogin} />}
      {currentView === "dashboard" && <MainDashboard onLogout={handleLogout} userEmail={userEmail} />}
    </ClientOnly>
  )
}
