import { createContext, useContext, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export const PageActionContext = createContext<{ page: string; host: HTMLDivElement | null }>({ page: '', host: null })

export function PageActions({ page, children }: { page: string; children: ReactNode }) {
  const target = useContext(PageActionContext)
  return target.page === page && target.host ? createPortal(children, target.host) : null
}
