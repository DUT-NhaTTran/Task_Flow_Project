"use client"
import Image from "next/image"
import Link from "next/link"

export default function SignUpPage() {
    return (
        <main className="min-h-screen bg-[#f3f4f6] flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 space-y-6">

                {/* Logo + Heading */}
                <div className="text-center space-y-2">
                    <div className="flex justify-center items-center gap-2 text-[#4f46e5] text-lg font-bold">
                        <span className="rotate-45">✦</span>
                        <span>TaskFlow</span>
                    </div>
                    <h1 className="text-xl font-semibold text-gray-900">Get started with TaskFlow</h1>
                    <p className="text-sm text-gray-600">14 day full access. No credit card required.</p>
                </div>

                {/* Khung chứa button */}
                <div className="bg-gray-50 p-6 rounded-lg shadow-inner space-y-4">

                    {/* Google button */}
                    <button className="flex items-center justify-center w-full py-3 px-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-medium rounded-md transition">
                        <div className="flex items-center gap-2">
                            <Image src="/google-color-svgrepo-com.svg" alt="Google" width={18} height={18} />
                            Continue with your Google work account
                        </div>
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                        <div className="flex-1 h-px bg-gray-300" />
                        or
                        <div className="flex-1 h-px bg-gray-300" />
                    </div>

                    {/* GitHub button */}
                    <button className="flex items-center justify-center w-full py-3 px-4 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2">
                            <Image src="/github-color-svgrepo-com.svg" alt="GitHub" width={18} height={18} />
                            Sign in with GitHub
                        </div>
                    </button>

                    {/* Email button */}
                    <button className="flex items-center justify-center w-full py-3 px-4 border border-gray-200 text-sm font-medium rounded-md hover:bg-gray-50 transition">
                        <div className="flex items-center gap-2">
                            <Image src="/gmail-svgrepo-com.svg" alt="Email" width={18} height={18} />
                            Continue with your work email
                        </div>
                    </button>

                </div>

                {/* Terms */}
                <p className="text-[10px] text-gray-500 text-center leading-relaxed">
                    By clicking the above button, you agree to our{" "}
                    <Link href="#" className="text-[#4f46e5] underline">
                        Terms of Service
                    </Link>{" "}
                    and acknowledge our{" "}
                    <Link href="#" className="text-[#4f46e5] underline">
                        Privacy Policy
                    </Link>.
                </p>

                {/* Log In */}
                <p className="text-xs text-center">
                    Already have an account?{" "}
                    <Link href="/auth/signin" className="text-[#4f46e5] underline font-medium">
                        Log In
                    </Link>
                </p>
            </div>
        </main>
    )
}
