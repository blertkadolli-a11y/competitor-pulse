'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

interface PricingCardProps {
  name: string
  price: string
  description: string
  features: string[]
  highlighted?: boolean
  index: number
  onGetStarted?: () => void
}

export function PricingCard({ name, price, description, features, highlighted, index, onGetStarted }: PricingCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ delay: index * 0.1, duration: 0.5 }}
    >
      <motion.div
        whileHover={{ scale: 1.03, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <Card
          className={`h-full shadow-sm hover:shadow-xl transition-shadow ${
            highlighted ? 'border-primary ring-2 ring-primary' : ''
          }`}
        >
          <CardHeader>
            <CardTitle className="text-2xl">{name}</CardTitle>
            <CardDescription>{description}</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">{price}</span>
              {price !== 'Custom' && <span className="text-muted-foreground">/month</span>}
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {features.map((feature, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 + i * 0.05 }}
                >
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-sm">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
            <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button className="w-full" variant={highlighted ? 'default' : 'outline'} size="lg" onClick={onGetStarted}>
                Get Started
              </Button>
            </motion.div>
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  )
}

