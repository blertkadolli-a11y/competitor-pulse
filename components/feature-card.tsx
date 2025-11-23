'use client'

import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface FeatureCardProps {
  title: string
  description: string
  icon: LucideIcon
  index: number
}

export function FeatureCard({ title, description, icon: Icon, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <motion.div whileHover={{ scale: 1.05, y: -6 }} transition={{ duration: 0.25 }}>
        <Card className="h-full border-white/10 bg-white/5/10 shadow-[0_15px_35px_rgba(4,0,36,0.6)] hover:shadow-[0_25px_45px_rgba(4,0,36,0.8)] transition-all">
          <CardHeader>
            <motion.div
              className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E6FF] via-[#7A00FF] to-[#FF007A] text-white shadow-[0_0_25px_rgba(0,230,255,0.35)]"
              whileHover={{ rotate: 5 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
            <CardTitle className="text-xl text-white">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base text-muted-foreground/90">{description}</CardDescription>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

