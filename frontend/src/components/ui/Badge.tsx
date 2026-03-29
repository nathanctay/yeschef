import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import type { HTMLAttributes } from 'react'

const badgeVariants = cva(
  'inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium',
  {
    variants: {
      variant: {
        default: 'bg-[rgba(241,231,218,0.8)] text-[#6B7280]',
        primary:
          'bg-[rgba(229,57,53,0.1)] text-[#E53935] border border-[rgba(229,57,53,0.2)]',
        private: 'bg-[rgba(241,231,218,0.5)] text-[#6B7280]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}
