"use client"

import { ChevronDown } from "lucide-react"
import * as React from "react"
import Link from "next/link"

interface DropdownItem {
    label: string
    href?: string
    onClick?: () => void
    icon?: React.ReactNode
}

interface DropdownMenuProps {
    title: string | React.ReactNode
    items: DropdownItem[]
    className?: string
}

export function DropdownMenu({ title, items, className = "" }: DropdownMenuProps) {
    const [open, setOpen] = React.useState(false)

    return (
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center space-x-1 hover:bg-gray-100 px-2 py-1 rounded text-sm font-medium transition ${className}`}
            >
                {typeof title === 'string' ? <span>{title}</span> : title}
                <ChevronDown className="h-3 w-3" />
            </button>

            {open && (
                <div
                    className="absolute left-0 mt-2 w-64 bg-white border rounded-md shadow-lg p-2 z-10"
                    onMouseLeave={() => setOpen(false)}
                >
                    {items.map((item, index) => (
                        item.href ? (
                            <Link
                                key={index}
                                href={item.href}
                                className="flex items-center px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800"
                                onClick={() => {
                                    setOpen(false)
                                    item.onClick?.()
                                }}
                            >
                                {item.icon && <span className="mr-2">{item.icon}</span>}
                                {item.label}
                            </Link>
                        ) : (
                            <button
                                key={index}
                                className="flex items-center w-full text-left px-2 py-1 rounded hover:bg-gray-100 text-sm text-gray-800"
                                onClick={() => {
                                    setOpen(false)
                                    item.onClick?.()
                                }}
                            >
                                {item.icon && <span className="mr-2">{item.icon}</span>}
                                {item.label}
                            </button>
                        )
                    ))}
                </div>
            )}
        </div>
    )
}
