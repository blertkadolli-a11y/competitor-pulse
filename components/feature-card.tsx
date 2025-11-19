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
      <motion.div whileHover={{ scale: 1.03, y: -5 }} transition={{ duration: 0.2 }}>
        <Card className="h-full shadow-sm hover:shadow-lg transition-shadow">
          <CardHeader>
            <motion.div
              className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              whileHover={{ rotate: 5 }}
            >
              <Icon className="h-6 w-6" />
            </motion.div>
            <CardTitle className="text-xl">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

