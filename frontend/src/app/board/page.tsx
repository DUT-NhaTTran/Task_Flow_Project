import { BugTrackingBoard } from "@/components/ui/bug-tracking-board"
import { TopNavigation } from "@/components/ui/top-navigation"
import { Sidebar } from "@/components/ui/sidebar"
import { NotificationBanner } from "@/components/ui/notification-banner"

export default function Home() {
    return (
        <div className="flex flex-col h-screen bg-white">
            <TopNavigation />
            <div className="flex flex-1 overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto">
                    <BugTrackingBoard />
                </main>
            </div>
        </div>
    )
}
