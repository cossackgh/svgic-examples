import React, { useState, useEffect } from 'react'
import { useSvgic } from '@svgic/core/react'
import { ZoomPlugin } from '@svgic/core/plugins/zoom'
import type { SvgicItem } from '@svgic/core'

const data: SvgicItem[] = [
  { id: 'room-101', title: 'Conference Room A' },
  { id: 'room-102', title: 'Open Space'         },
  { id: 'room-103', title: 'Meeting Room B'     },
  { id: 'room-201', title: 'Directors Office'   },
  { id: 'room-202', title: 'Break Room'         },
  { id: 'room-203', title: 'Storage'            },
]

const zoom = ZoomPlugin({ wheelMode: 'ctrl', minScale: 0.5, maxScale: 6 })

const groups = {
  free: ['room-101', 'room-103', 'room-202'],
  busy: ['room-102', 'room-201'],
}

export default function SvgicHookDemo() {
  const [selected, setSelected] = useState<SvgicItem | null>(null)

  const { containerRef, client } = useSvgic({
    src: '/svgs/rooms.svg',
    layers: { rooms: { role: 'interactive' } },
    data,
    plugins: [zoom],
    style: {
      default: { fill: '#2d2d52', cursor: 'pointer', transition: 'fill 0.15s' },
      hover:   { fill: '#4a4a80' },
      states: {
        free: { fill: '#1a4731', stroke: '#2d9e5a', strokeWidth: 1.5 },
        busy: { fill: '#4a1e1e', stroke: '#e03030', strokeWidth: 1.5 },
      },
    },
  })

  useEffect(() => {
    if (!client) return
    client.on('click', (_id, item) => setSelected(item))
  }, [client])

  function applyHighlight(state: 'free' | 'busy') {
    client?.clearHighlight()
    client?.setHighlight(state, groups[state])
  }

  const btnBase: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: 5,
    border: '1px solid var(--vp-c-divider)',
    background: 'var(--vp-c-bg-soft)',
    color: 'var(--vp-c-text-2)',
    fontSize: 12,
    cursor: 'pointer',
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--vp-c-text-3)' }}>Highlight:</span>
          <button style={{ ...btnBase, color: '#2d9e5a', borderColor: '#2d9e5a44' }} onClick={() => applyHighlight('free')}>Free</button>
          <button style={{ ...btnBase, color: '#e03030', borderColor: '#e0303044' }} onClick={() => applyHighlight('busy')}>Busy</button>
          <button style={btnBase} onClick={() => client?.clearHighlight()}>Clear</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--vp-c-text-3)' }}>Zoom to:</span>
          <button style={btnBase} onClick={() => zoom.focusElement('room-101', { scale: 3 })}>101</button>
          <button style={btnBase} onClick={() => zoom.focusElement('room-202', { scale: 3 })}>202</button>
          <button style={btnBase} onClick={() => zoom.reset()}>Reset</button>
        </div>
      </div>

      <div ref={containerRef} style={{ width: '100%', aspectRatio: '3/2' }} />

      <div style={{
        marginTop: 12,
        padding: '8px 14px',
        borderRadius: 6,
        background: 'var(--vp-c-bg-soft)',
        fontSize: 14,
        minHeight: 36,
        display: 'flex',
        alignItems: 'baseline',
      }}>
        {selected
          ? <strong style={{ color: 'var(--vp-c-text-1)' }}>{selected.title}</strong>
          : <span style={{ color: 'var(--vp-c-text-3)', fontStyle: 'italic' }}>Click a room</span>
        }
      </div>
    </div>
  )
}
