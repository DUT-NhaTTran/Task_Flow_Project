"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import axios from "axios"
import { useRouter } from "next/navigation"
import { useUser } from "@/contexts/UserContext"
import UserStorageService from "@/services/userStorageService"

export default function SignInPage() {
    const router = useRouter()
    const { setCurrentUserId } = useUser()

    // Thêm state
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoggingIn, setIsLoggingIn] = useState(false)

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setIsLoggingIn(true);

        try {
            console.log("🔑 Starting login process...");

            // Step 1: Login via Auth service  
            const loginRes = await axios.post("http://localhost:8080/api/auth/login", {
                email,
                password,
            });

            const { token, userId, accountData } = loginRes.data;
            
            console.log("✅ Login successful, received:", {
                userId,
                hasToken: !!token,
                accountData: accountData || "Not provided"
            });

            // Step 2: Fetch user profile from Users service
            console.log("👤 Fetching user profile from Users service...");
            const userProfileRes = await axios.get(`http://localhost:8086/api/users/${userId}`);
            
            if (userProfileRes.data?.status !== "SUCCESS") {
                throw new Error("Failed to fetch user profile");
            }

            const userProfile = userProfileRes.data.data;
            console.log("✅ User profile fetched:", {
                username: userProfile.username,
                email: userProfile.email,
                id: userProfile.id
            });

            // Step 3: Prepare account info (use from login response or create from available data)
            const accountInfo = accountData || {
                id: userId,
                email: email,
                isEmailVerified: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isActive: true, 
                username: userProfile.username // 👈 thêm dòng này

            };

            // Step 4: Save using UserStorageService (includes both account + user profile)
            console.log("💾 Saving complete user data using UserStorageService...");
            UserStorageService.saveLoggedInUser(accountInfo, userProfile, token);

            // Step 5: Update UserContext for backward compatibility
            setCurrentUserId(userId);
            
            // Step 6: Debug log saved data
            console.log("🔍 Verifying saved data:");
            UserStorageService.debugLogUserData();

            // Step 7: Check localStorage for verification
            console.log("🔍 Verification - localStorage contents:", {
                taskflow_logged_user: localStorage.getItem("taskflow_logged_user") ? "✅ Saved" : "❌ Missing",
                taskflow_user_session: localStorage.getItem("taskflow_user_session") ? "✅ Saved" : "❌ Missing",
                token: localStorage.getItem("token") ? "✅ Saved" : "❌ Missing",
                userId: localStorage.getItem("userId") ? "✅ Saved" : "❌ Missing"
            });

            console.log("🎉 Login completed successfully! Redirecting...");
            
            // Navigate to main page
            router.push("/project/project_homescreen");

        } catch (error: any) {
            console.error("❌ Login failed:", error);
            
            if (error.response?.status === 401) {
                setError("Invalid email or password");
            } else if (error.response?.status === 404) {
                setError("User not found");
            } else if (error.message?.includes("fetch user profile")) {
                setError("Login successful but failed to load user profile");
            } else {
                setError("Login failed. Please try again.");
            }
        } finally {
            setIsLoggingIn(false);
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

                    <button 
                        type="submit" 
                        className="w-full py-2 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold rounded-md transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={isLoggingIn}
                    >
                        {isLoggingIn ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div>
                                <span>Logging in...</span>
                            </div>
                        ) : (
                            "Log in"
                        )}
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

