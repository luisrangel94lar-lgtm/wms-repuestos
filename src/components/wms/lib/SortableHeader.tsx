'use client'

import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface SortableHeaderProps {
  field: string
  children: React.ReactNode
  align?: 'left' | 'center' | 'right'
  sortField: string
  sortDir: 'asc' | 'desc'
  onSort: (field: string) => void
}

export function SortableHeader({ field, children, align = 'left', sortField, sortDir, onSort }: SortableHeaderProps) {
  const isActive = sortField === field
  return (
    <TableHead
      className={cn(
        'text-xs cursor-pointer select-none hover:text-foreground transition-colors',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        isActive && 'text-foreground'
      )}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive && (
          <span className="text-[10px] opacity-70">{sortDir === 'asc' ? '↑' : '↓'}</span>
        )}
      </span>
    </TableHead>
  )
}
