import { useState } from 'react'
import OrgTreeFlow, { type SelectedNode } from '../components/OrgTreeFlow'
import type { Employee } from '../types/employee'
import type { OrgUnit } from '../types/orgUnit'

// Data is injected by the export function as window.__ORG_DATA__
declare global { interface Window { __ORG_DATA__?: { employees: Employee[]; orgUnits: OrgUnit[] } } }
const { employees: ALL_EMPLOYEES = [], orgUnits: ALL_ORG_UNITS = [] } = window.__ORG_DATA__ ?? {}

type TreeMode = 'manager' | 'orgunit' | 'combined'

const TYPE_COLOR: Record<string, string> = { 'ארגון': '#a21caf', 'חטיבה': '#1e40af', 'מחלקה': '#6d28d9', 'תכנית': '#065f46' }
const TYPE_BG: Record<string, string>    = { 'ארגון': '#fdf4ff', 'חטיבה': '#dbeafe', 'מחלקה': '#ede9fe', 'תכנית': '#d1fae5' }

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#ef4444']
const DIV_COLOR: Record<string, string> = {}
let ci = 0
function divColor(div: string) {
  if (!div) return '#64748b'
  if (!DIV_COLOR[div]) DIV_COLOR[div] = PALETTE[ci++ % PALETTE.length]
  return DIV_COLOR[div]
}

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 6, fontSize: 13, lineHeight: 1.5 }}>
      <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', minWidth: 80 }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function SidePanel({ selected }: { selected: SelectedNode | null }) {
  const panelStyle: React.CSSProperties = {
    width: 280, minWidth: 280, height: '100%', background: '#f8fafc',
    borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
    direction: 'rtl', overflow: 'hidden',
  }

  if (!selected) {
    return (
      <div style={panelStyle}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1', gap: 10, padding: 24 }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          <p style={{ fontSize: 13, textAlign: 'center', margin: 0 }}>לחץ על צומת בעץ לצפייה בפרטים</p>
        </div>
      </div>
    )
  }

  if (selected.kind === 'employee') {
    const e = selected.employee
    const color = divColor(e.division)
    const initials = `${e.firstName.charAt(0)}${e.lastName.charAt(0)}` || '?'
    return (
      <div style={panelStyle}>
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 16px 14px' }}>
          <div style={{ height: 3, background: color, borderRadius: 99, marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: e.gender === 'נקבה' ? '#ec4899' : color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{e.firstName} {e.lastName}</div>
              {e.role && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{e.role}</div>}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldRow label="מס׳ עובד"  value={e.employeeNumber} />
          <FieldRow label="ז/נ"        value={e.gender} />
          <FieldRow label="חטיבה"      value={e.division} />
          <FieldRow label="מחלקה"      value={e.department} />
          <FieldRow label="תכנית"      value={e.program} />
          <FieldRow label="מנהל ישיר"  value={e.directManager} />
          <FieldRow label="שנת קליטה"  value={e.admissionYear} />
          <FieldRow label="ת. קליטה"   value={e.admissionDate} />
          <FieldRow label="ארגון"      value={e.organization} />
          {e.notes && (
            <div style={{ marginTop: 4, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              {e.notes}
            </div>
          )}
        </div>
      </div>
    )
  }

  const u = selected.unit
  const color = TYPE_COLOR[u.type] ?? '#334155'
  const bg    = TYPE_BG[u.type]    ?? '#f1f5f9'
  return (
    <div style={panelStyle}>
      <div style={{ background: bg, borderBottom: `2px solid ${color}`, padding: '16px 16px 14px' }}>
        <div style={{
          display: 'inline-block', background: color, color: '#fff',
          borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8,
        }}>{u.type}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color }}>{u.name}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldRow label="שייך ל" value={u.parentName || '—'} />
        <FieldRow label="מנהל"   value={selected.managerName || '—'} />
      </div>
    </div>
  )
}

export default function ViewerPage() {
  const [mode, setMode] = useState<TreeMode>('combined')
  const [selected, setSelected] = useState<SelectedNode | null>(null)

  const MODES: { key: TreeMode; label: string }[] = [
    { key: 'manager',  label: 'עץ ניהולי' },
    { key: 'orgunit',  label: 'עץ ארגוני' },
    { key: 'combined', label: 'משולב' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, direction: 'rtl', height: '100vh', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexShrink: 0, boxShadow: '0 1px 4px #0001' }}>
        <span style={{ fontWeight: 700, fontSize: 18, color: '#1e293b', marginLeft: 16 }}>עוגן — עץ ארגוני</span>
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #cbd5e1', overflow: 'hidden', fontSize: 13 }}>
          {MODES.map((m, i) => (
            <button key={m.key} onClick={() => setMode(m.key)} style={{
              padding: '5px 12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m.key ? '#2563eb' : '#fff',
              color: mode === m.key ? '#fff' : '#475569',
              border: 'none', borderLeft: i > 0 ? '1px solid #cbd5e1' : 'none',
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      {/* Tree + Side panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
        <SidePanel selected={selected} />
        {/* Absolute fill so ReactFlow always gets definite dimensions */}
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: 0, left: 280, direction: 'ltr' }}>
          <OrgTreeFlow
            employees={ALL_EMPLOYEES}
            orgUnits={ALL_ORG_UNITS}
            mode={mode}
            onSelect={setSelected}
          />
        </div>
      </div>
    </div>
  )
}
