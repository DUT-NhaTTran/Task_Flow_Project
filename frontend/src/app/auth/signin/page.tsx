"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import axios from "axios"
import { useRouter } from "next/navigation"

export default function SignInPage() {
    const router = useRouter()

    // Thêm state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    // Hàm xử lý login
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError("")

        try {
            const res = await axios.post("http://localhost:8080/api/auth/login", {
                email,
                password,
            })

            const { token } = res.data
            localStorage.setItem("token", token)

            router.push("/homepage/mainpage")
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed. Please try again.")
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8 space-y-6">
                {/* Logo */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-1 text-[#4f46e5] text-2xl font-bold">
                        <span className="rotate-45">✦</span> <span>TaskFlow</span>
                    </div>
                </div>

                {/* OAuth buttons */}
                <div className="space-y-3">
                    <button className="flex items-center justify-center w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-md transition">
            <span className="flex items-center gap-2">
              <Image src="/google-color-svgrepo-com.svg" alt="Google" width={18} height={18} />
              Sign in with Google
            </span>
                    </button>

                    <button className="flex items-center justify-center w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-sm font-medium rounded-md transition">
            <span className="flex items-center gap-2">
              <Image src="/github-color-svgrepo-com.svg" alt="GitHub" width={18} height={18} />
              Sign in with GitHub
            </span>
                    </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                    <div className="flex-1 h-px bg-gray-300" />
                    or
                    <div className="flex-1 h-px bg-gray-300" />
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="text-left space-y-2">
                        <label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Username or Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="text-left space-y-2">
                        <label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs text-center">
                            {error}
                        </p>
                    )}

                    <button type="submit" className="w-full py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold rounded-md transition">
                        Log in
                    </button>
                </form>

                {/* Links */}
                <div className="space-y-1 text-center text-xs text-gray-600">
                    <Link href="#" className="hover:underline block">
                        Forgot your password?
                    </Link>
                </div>

                <div className="text-xs text-center text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/auth/signup" className="text-[#4f46e5] font-semibold hover:underline">
                        Sign up here
                    </Link>
                </div>
            </div>
        </main>
    )
}

