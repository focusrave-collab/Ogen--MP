import { useState } from 'react'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { useOrgUnitStore } from '../store/useOrgUnitStore'
import OrgTreeFlow, { type SelectedNode } from '../components/OrgTreeFlow'
import type { Employee } from '../types/employee'
import type { OrgUnit } from '../types/orgUnit'

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
      <span style={{ color: '#94a3b8', whiteSpace: 'nowrap', minWidth: 90 }}>{label}</span>
      <span style={{ color: '#1e293b', fontWeight: 500, wordBreak: 'break-word' }}>{value}</span>
    </div>
  )
}

function buildBreadcrumb(unit: OrgUnit, allUnits: OrgUnit[]): string {
  const chain: string[] = [unit.name]
  let current = unit
  for (let i = 0; i < 10; i++) {
    if (!current.parentName) break
    const parent = allUnits.find(u => u.name === current.parentName)
    if (!parent) break
    chain.unshift(parent.name)
    current = parent
  }
  return chain.join(' / ')
}

function SidePanel({
  selected, employees, orgUnits, collapsed, onToggleCollapse,
}: {
  selected: SelectedNode | null
  employees: Employee[]
  orgUnits: OrgUnit[]
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const panelW = collapsed ? 36 : 300

  const toggleBtn = (
    <button
      onClick={onToggleCollapse}
      style={{
        position: 'absolute', top: 12, left: collapsed ? 6 : 8, zIndex: 10,
        width: 24, height: 24, borderRadius: '50%', border: '1px solid #e2e8f0',
        background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'center', boxShadow: '0 1px 4px #0001', flexShrink: 0,
      }}
      title={collapsed ? 'פתח פאנל' : 'סגור פאנל'}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
        {collapsed
          ? <polyline points="9 18 15 12 9 6" />
          : <polyline points="15 18 9 12 15 6" />
        }
      </svg>
    </button>
  )

  if (collapsed) {
    return (
      <div style={{ width: panelW, minWidth: panelW, height: '100%', background: '#f8fafc', borderRight: '1px solid #e2e8f0', position: 'relative', flexShrink: 0 }}>
        {toggleBtn}
      </div>
    )
  }

  const panelStyle: React.CSSProperties = {
    width: panelW, minWidth: panelW, height: '100%', background: '#f8fafc',
    borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column',
    direction: 'rtl', overflow: 'hidden', position: 'relative', flexShrink: 0,
  }

  if (!selected) {
    return (
      <div style={panelStyle}>
        {toggleBtn}
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

    const managerEmp = employees.find(m =>
      m.employeeNumber === e.directManager ||
      `${m.firstName} ${m.lastName}` === e.directManager ||
      `${m.lastName} ${m.firstName}` === e.directManager
    )
    const managerDisplay = managerEmp
      ? `${managerEmp.firstName} ${managerEmp.lastName}${managerEmp.role ? ` — ${managerEmp.role}` : ''}`
      : e.directManager || null

    return (
      <div style={panelStyle}>
        {toggleBtn}
        <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '44px 14px 12px' }}>
          <div style={{ height: 3, background: color, borderRadius: 99, marginBottom: 12 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {e.photo
              ? <img src={e.photo} alt="" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${color}`, flexShrink: 0 }} />
              : <div style={{
                  width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                  background: e.gender === 'נקבה' ? '#ec4899' : color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 17,
                }}>{`${e.firstName.charAt(0)}${e.lastName.charAt(0)}` || '?'}</div>
            }
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{e.firstName} {e.lastName}</div>
              {e.role && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{e.role}</div>}
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FieldRow label="מחלקה"      value={e.department} />
          <FieldRow label="מנהל ישיר"  value={managerDisplay} />
          <FieldRow label="שנת התחלה"  value={e.admissionYear} />
          {e.resume && (
            <div style={{ marginTop: 4 }}>
              <button
                onClick={() => {
                  const [header, b64] = e.resume.split(',')
                  const mime = header.split(':')[1].split(';')[0]
                  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
                  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
                  window.open(url, '_blank')
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                  background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8,
                  color: '#2563eb', fontSize: 12, fontWeight: 600, cursor: 'pointer', width: '100%',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                פתח קורות חיים
              </button>
            </div>
          )}
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
  const breadcrumb = buildBreadcrumb(u, orgUnits)

  return (
    <div style={panelStyle}>
      {toggleBtn}
      <div style={{ background: bg, borderBottom: `2px solid ${color}`, padding: '44px 14px 12px' }}>
        <div style={{
          display: 'inline-block', background: color, color: '#fff',
          borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700, marginBottom: 8,
        }}>{u.type}</div>
        <div style={{ fontWeight: 700, fontSize: 16, color }}>{u.name}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <FieldRow label="מיקום" value={breadcrumb} />
        <FieldRow label="מנהל"  value={selected.managerName || null} />
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
  const [panelCollapsed, setPanelCollapsed] = useState(false)

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
        <SidePanel
          selected={selected}
          employees={employees}
          orgUnits={orgUnits}
          collapsed={panelCollapsed}
          onToggleCollapse={() => setPanelCollapsed(v => !v)}
        />
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
