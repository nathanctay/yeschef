import { cva, type VariantProps } from 'cva'
import { cn } from '../../lib/utils'
import type { ButtonHTMLAttributes } from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E53935] focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary:
          'bg-[#E53935] text-white hover:bg-[#CC332F]',
        secondary:
          'bg-white border border-[#F1E7DA] text-[#1F2937] hover:border-[#E53935] hover:text-[#E53935]',
        ghost:
          'text-[#6B7280] hover:text-[#1F2937] hover:bg-[rgba(241,231,218,0.5)]',
        danger:
          'text-[#E53935] border border-[#E53935] hover:bg-[rgba(229,57,53,0.08)]',
      },
      size: {
        sm: 'text-sm px-3 py-1.5 rounded-lg',
        md: 'text-sm px-4 py-2 rounded-xl',
        lg: 'text-base px-6 py-3 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
