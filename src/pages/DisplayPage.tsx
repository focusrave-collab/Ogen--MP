import { useState } from 'react'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { useOrgUnitStore } from '../store/useOrgUnitStore'
import OrgTreeFlow, { type SelectedNode } from '../components/OrgTreeFlow'

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
        {/* Header */}
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
        {/* Fields */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldRow label="מס׳ עובד"   value={e.employeeNumber} />
          <FieldRow label="ז/נ"         value={e.gender} />
          <FieldRow label="חטיבה"       value={e.division} />
          <FieldRow label="מחלקה"       value={e.department} />
          <FieldRow label="תכנית"       value={e.program} />
          <FieldRow label="מנהל ישיר"   value={e.directManager} />
          <FieldRow label="שנת קליטה"   value={e.admissionYear} />
          <FieldRow label="ת. קליטה"    value={e.admissionDate} />
          <FieldRow label="ארגון"       value={e.organization} />
          {e.notes && (
            <div style={{ marginTop: 4, padding: '8px 10px', background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
              {e.notes}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Unit
  const u = selected.unit
  const color = TYPE_COLOR[u.type] ?? '#334155'
  const bg    = TYPE_BG[u.type]    ?? '#f1f5f9'
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ background: bg, borderBottom: `2px solid ${color}`, padding: '16px 16px 14px' }}>
        <div style={{
          display: 'inline-block', background: color, color: '#fff',
          borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8,
        }}>{u.type}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color }}>{u.name}</div>
      </div>
      {/* Fields */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldRow label="שייך ל"  value={u.parentName || '—'} />
        <FieldRow label="מנהל"    value={selected.managerName || '—'} />
      </div>
    </div>
  )
}

export default function DisplayPage() {
  const { employees } = useEmployeeStore()
  const { orgUnits } = useOrgUnitStore()
  const [mode, setMode] = useState<TreeMode>('manager')
  const [filterDivision, setFilterDivision] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [selected, setSelected] = useState<SelectedNode | null>(null)

  const divisions   = [...new Set(employees.map(e => e.division).filter(Boolean))].sort()
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort()
  const programs    = [...new Set(employees.map(e => e.program).filter(Boolean))].sort()

  const filtered = employees.filter(e =>
    (!filterDivision   || e.division   === filterDivision) &&
    (!filterDepartment || e.department === filterDepartment) &&
    (!filterProgram    || e.program    === filterProgram)
  )

  const hasFilter = filterDivision || filterDepartment || filterProgram

  const MODES: { key: TreeMode; label: string }[] = [
    { key: 'manager',  label: 'עץ ניהולי' },
    { key: 'orgunit',  label: 'עץ ארגוני' },
    { key: 'combined', label: 'משולב' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, direction: 'rtl', minHeight: 0, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-wrap shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800 ml-4">תצוגת עץ ארגוני</h1>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-300 first:border-l-0 ${
                mode === m.key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {m.label}
            </button>
          ))}
        </div>

        {mode !== 'orgunit' && <>
          <select value={filterDivision} onChange={e => setFilterDivision(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">כל החטיבות</option>
            {divisions.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">כל המחלקות</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filterProgram} onChange={e => setFilterProgram(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
            <option value="">כל התכניות</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {hasFilter && (
            <button onClick={() => { setFilterDivision(''); setFilterDepartment(''); setFilterProgram('') }}
              className="text-xs text-red-500 hover:text-red-700 underline">
              נקה סינון
            </button>
          )}
        </>}

        <div className="flex-1" />
        <div className="text-xs text-slate-400">
          {filtered.length} עובדים | לחץ על ● להרחיב/כווץ ענפים
        </div>
      </div>

      {/* Tree + Side panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'hidden' }}>
        <SidePanel selected={selected} />
        <div style={{ flex: 1, direction: 'ltr', minWidth: 0, minHeight: 0 }}>
          <OrgTreeFlow
            employees={filtered}
            orgUnits={orgUnits}
            mode={mode}
            onSelect={setSelected}
          />
        </div>
      </div>
    </div>
  )
}
