import React, { useState } from 'react'
import { SvgicReact } from '@svgic/core/react'
import type { SvgicItem } from '@svgic/core'

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A', description: 'Capacity: 12' },
  { id: 'room-102', title: 'Open Space',         description: 'Capacity: 30' },
  { id: 'room-103', title: 'Meeting Room B',     description: 'Capacity: 6'  },
  { id: 'room-201', title: 'Directors Office',   description: 'Capacity: 4'  },
  { id: 'room-202', title: 'Break Room',         description: 'Capacity: 10' },
  { id: 'room-203', title: 'Storage',            description: 'Capacity: —'  },
]

export default function SvgicReactDemo() {
  const [selected, setSelected] = useState<SvgicItem | null>(null)

  return (
    <div>
      <SvgicReact
        src="/svgs/rooms.svg"
        layers={{ rooms: { role: 'interactive' } }}
        data={data}
        popup={{ placement: 'cursor' }}
        styleConfig={{
          default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
          hover:   { fill: '#4a4a80' },
        }}
        style={{ width: '100%', aspectRatio: '3/2' }}
        onClick={(_id, item) => setSelected(item)}
      />

      <div style={{
        marginTop: 12,
        padding: '8px 14px',
        borderRadius: 6,
        background: 'var(--vp-c-bg-soft)',
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
        fontSize: 14,
        minHeight: 36,
      }}>
        {selected ? (
          <>
            <strong style={{ color: 'var(--vp-c-text-1)' }}>{selected.title}</strong>
            <span style={{ color: 'var(--vp-c-text-2)' }}>{String(selected.description)}</span>
          </>
        ) : (
          <span style={{ color: 'var(--vp-c-text-3)', fontStyle: 'italic' }}>Click a room</span>
        )}
      </div>
    </div>
  )
}
