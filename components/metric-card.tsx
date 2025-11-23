'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  index: number
}

export function MetricCard({ title, value, description, icon: Icon, index }: MetricCardProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}>
      <Card className="relative overflow-hidden border-white/10">
        <div className="absolute inset-0 opacity-40 blur-3xl bg-gradient-to-r from-[#00E6FF]/30 via-transparent to-[#FF007A]/30 pointer-events-none" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-white/90">{title}</CardTitle>
          <div className="rounded-full bg-white/10 p-2 shadow-inner">
            <Icon className="h-4 w-4 text-[#00E6FF]" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-semibold text-white">{value}</div>
          {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
        </CardContent>
      </Card>
    </motion.div>
  )
}

