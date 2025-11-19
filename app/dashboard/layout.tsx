import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Topbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
