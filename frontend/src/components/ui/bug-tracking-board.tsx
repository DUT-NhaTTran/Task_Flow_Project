"use client"
import React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function BugTrackingBoard() {
  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <div className="flex items-center space-x-2">
          <Link href="/project/all_projects" className="text-gray-500 hover:text-gray-700 text-sm">
            Projects
          </Link>
          <span className="text-gray-500">/</span>
          <span className="text-gray-700 text-sm">Bug Tracking System</span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">BTS board</h1>
      </div>

      <div className="flex items-center justify-center h-64 bg-gray-50 border border-gray-200 rounded-md">
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center bg-gray-200 rounded-full text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4V4.01M12 8V20M4.93 10C4.97 7.57 6.18 6.63 8.83 6.5H15.17C17.8 6.5 19.03 7.57 19.07 10C19.11 12.43 17.89 13.5 15.17 13.5H8.83C6.17 13.5 4.96 14.43 4.93 16.86C4.9 19.29 6.11 20.36 8.83 20.36H15.17C17.84 20.36 19.1 19.29 19.07 16.86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Select a Project</h3>
          <p className="text-gray-500 mb-4">Choose a project to view its board with drag and drop functionality.</p>
          <Button 
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => window.location.href = '/project/all_projects'}
          >
            Browse Projects
          </Button>
        </div>
      </div>
    </div>
  )
} 