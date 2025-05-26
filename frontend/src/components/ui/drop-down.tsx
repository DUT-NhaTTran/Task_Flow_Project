"use client"

import { ChevronDown } from "lucide-react"
import * as React from "react"

interface DropdownProps {
    placeholder?: string
    options: string[]
    onSelect?: (value: string) => void
    defaultValue?: string
    disabled?: boolean
}

export function Dropdown({ 
    placeholder = "Select an option", 
    options, 
    onSelect, 
    defaultValue, 
    disabled = false 
}: DropdownProps) {
    const [selected, setSelected] = React.useState(defaultValue || placeholder)
    const [open, setOpen] = React.useState(false)

    // Update selected value when defaultValue changes
    React.useEffect(() => {
        if (defaultValue) {
            setSelected(defaultValue)
        }
    }, [defaultValue])

    const handleSelect = (option: string) => {
        setSelected(option)
        setOpen(false)
        onSelect?.(option)
    }

    return (
        <div className="relative w-full text-sm">
            <button
                onClick={() => !disabled && setOpen(!open)}
                className={`w-full border ${disabled ? 'bg-gray-100 text-gray-400' : 'border-gray-300'} rounded-md px-3 py-2 flex items-center justify-between text-left ${!disabled && 'focus:outline-none focus:ring-2 focus:ring-blue-500'}`}
                disabled={disabled}
            >
                <span className={selected === placeholder ? "text-gray-400" : ""}>{selected}</span>
                <ChevronDown className={`h-4 w-4 ${disabled ? 'text-gray-300' : 'text-gray-500'}`} />
            </button>

            {open && !disabled && (
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
