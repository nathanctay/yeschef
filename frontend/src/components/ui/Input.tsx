import { useId } from 'react'
import { cn } from '../../lib/utils'
import type { InputHTMLAttributes } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-[#1F2937]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'w-full rounded-lg border border-[#F1E7DA] bg-white px-3 py-2 text-sm text-[#1F2937] placeholder:text-[#6B7280]',
          'focus:outline-none focus:border-[#E53935] focus:ring-1 focus:ring-[#E53935]',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
