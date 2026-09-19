import { Circle, Send, List, BarChart3, Settings } from "lucide-react"

const navItems = [
  { label: "New Referral", icon: Send, active: true },
  { label: "My Referrals", icon: List, active: false },
  { label: "Commissions", icon: BarChart3, active: false },
  { label: "Settings", icon: Settings, active: false },
]

export function ReferralSidebar() {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 px-6 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-violet-600">
          <Circle className="size-4 fill-white text-white" />
        </span>
        <span className="text-base font-semibold text-slate-900">Orbit Partners</span>
      </div>

      <nav className="mt-2 flex flex-col gap-1 px-3" aria-label="Main">
        <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-slate-400">Menu</p>
        {navItems.map(({ label, icon: Icon, active }) => (
          <span
            key={label}
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
              active
                ? "bg-violet-50 text-violet-700"
                : "text-slate-500",
            ].join(" ")}
          >
            <Icon className="size-4" />
            {label}
          </span>
        ))}
      </nav>
    </aside>
  )
}
