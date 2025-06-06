// src/app/layout.tsx

import './globals.css'
import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { NavigationProvider } from '@/contexts/NavigationContext'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className={inter.className}>
            <body>
                <NavigationProvider>
                    {children}
                </NavigationProvider>
            </body>
        </html>
    )
}
