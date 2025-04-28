"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
    const router = useRouter()
    const [token, setToken] = useState<string | null>(null)

    useEffect(() => {
        const storedToken = localStorage.getItem("token")
        if (!storedToken) {
            router.push("/auth/login") // Nếu chưa login, redirect về login
        } else {
            setToken(storedToken) // Nếu có token, cho ở lại
        }
    }, [router])

    if (!token) {
        return <div className="text-center mt-10 text-gray-500">Checking login...</div>
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="bg-white p-10 rounded-xl shadow-lg text-center space-y-4">
                <h1 className="text-2xl font-bold text-[#4f46e5]">🎉 Welcome to Dashboard!</h1>
                <p className="text-gray-600">You have successfully logged in.</p>
            </div>
        </main>
    )
}
