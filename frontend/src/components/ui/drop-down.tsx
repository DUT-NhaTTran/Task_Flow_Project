"use client"

import { ChevronDown } from "lucide-react"
import * as React from "react"

interface DropdownProps {
    placeholder?: string
    options: string[]
    onSelect?: (value: string) => void
}

export function Dropdown({ placeholder = "Select an option", options, onSelect }: DropdownProps) {
    const [selected, setSelected] = React.useState(placeholder)
    const [open, setOpen] = React.useState(false)

    const handleSelect = (option: string) => {
        setSelected(option)
        setOpen(false)
        onSelect?.(option)
    }

    return (
        <div className="relative w-full text-sm">
            <button
                onClick={() => setOpen(!open)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <span className={selected === placeholder ? "text-gray-400" : ""}>{selected}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {open && (
                <div className="absolute z-10 mt-1 w-full border rounded-md bg-white shadow">
                    {options.map((option) => (
                        <button
                            key={option}
                            onClick={() => handleSelect(option)}
                            className="block w-full px-4 py-2 text-left hover:bg-gray-100"
                        >
                            {option}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
