import { useState } from 'react'
import { useEmployeeStore } from '../store/useEmployeeStore'
import OrgTreeFlow from '../components/OrgTreeFlow'

export default function DisplayPage() {
  const { employees } = useEmployeeStore()
  const [filterDivision, setFilterDivision] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterProgram, setFilterProgram] = useState('')

  const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort()
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort()
  const programs = [...new Set(employees.map(e => e.program).filter(Boolean))].sort()

  const filtered = employees.filter(e =>
    (!filterDivision || e.division === filterDivision) &&
    (!filterDepartment || e.department === filterDepartment) &&
    (!filterProgram || e.program === filterProgram)
  )

  const hasFilter = filterDivision || filterDepartment || filterProgram

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, direction: 'rtl', minHeight: 0 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-wrap shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800 ml-4">תצוגת עץ ארגוני</h1>

        <select
          value={filterDivision}
          onChange={e => setFilterDivision(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">כל החטיבות</option>
          {divisions.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={filterDepartment}
          onChange={e => setFilterDepartment(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">כל המחלקות</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          value={filterProgram}
          onChange={e => setFilterProgram(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="">כל התכניות</option>
          {programs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {hasFilter && (
          <button
            onClick={() => { setFilterDivision(''); setFilterDepartment(''); setFilterProgram('') }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            נקה סינון
          </button>
        )}

        <div className="flex-1" />

        <div className="text-xs text-slate-400">
          {filtered.length} עובדים | לחץ על ● להרחיב/כווץ ענפים
        </div>
      </div>

      {/* Tree */}
      <div style={{ flex: 1, direction: 'ltr', width: '100%', minHeight: 0 }}>
        <OrgTreeFlow employees={filtered} />
      </div>
    </div>
  )
}
