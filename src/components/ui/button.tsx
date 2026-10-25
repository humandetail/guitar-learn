import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ComponentProps } from 'react'

const buttonVariants = cva('inline-flex min-h-13 items-center justify-center gap-2 rounded-lg px-5 text-base font-semibold transition active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100', {
  variants: { variant: { default: 'bg-[#254dff] text-white hover:bg-[#183bd3]', outline: 'border border-[#c7d1ec] bg-transparent text-[#182138] hover:bg-[#e4eaff]' } },
  defaultVariants: { variant: 'default' },
})
export function Button({ className, variant, asChild = false, ...props }: ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={twMerge(clsx(buttonVariants({ variant }), className))} {...props} />
}
