"use client"

import { ChevronDown } from "lucide-react"
import * as React from "react"
import Link from "next/link"

interface DropdownMenuProps {
    title: string
    items: { label: string; href: string }[]
}

export function DropdownMenu({ title, items }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded text-sm font-medium transition"
            >
                <span>{title}</span>
                <ChevronDown className="h-3 w-3" />
            </button>

            {open && (
                <div
                    className="absolute left-0 mt-2 w-64 bg-white border rounded-md shadow-lg p-2 z-10"
                    onMouseLeave={() => setOpen(false)}
                >
                    <div className="text-xs font-semibold text-gray-400 mb-1">Recent</div>

                    {items.map((item, index) => (
                        <Link
                            key={index}
                            href={item.href}
                            className="block px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800"
                        >
                            {item.label}
                        </Link>
                    ))}

                    <div className="border-t my-2" />
                    <Link href="#" className="block px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800">
                        View all {title.toLowerCase()}
                    </Link>
                    <Link href="#" className="block px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800">
                        Create {title.toLowerCase()}
                    </Link>
                </div>
            )}
        </div>
    )
}
