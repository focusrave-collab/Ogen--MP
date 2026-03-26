import { useState, useRef, useEffect } from 'react'
import { useEmployeeStore } from '../store/useEmployeeStore'
import OrgTree from '../components/OrgTree'

export default function DisplayPage() {
  const { employees } = useEmployeeStore()
  const [zoom, setZoom] = useState(1)
  const [filterDivision, setFilterDivision] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const panStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort()
  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))].sort()
  const programs = [...new Set(employees.map(e => e.program).filter(Boolean))].sort()

  const filtered = employees.filter(e =>
    (!filterDivision || e.division === filterDivision) &&
    (!filterDepartment || e.department === filterDepartment) &&
    (!filterProgram || e.program === filterProgram)
  )

  function onMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.employee-card')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY, ox: panOffset.x, oy: panOffset.y }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!isPanning || !panStart.current) return
    setPanOffset({
      x: panStart.current.ox + e.clientX - panStart.current.x,
      y: panStart.current.oy + e.clientY - panStart.current.y,
    })
  }

  function onMouseUp() {
    setIsPanning(false)
    panStart.current = null
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    setZoom(z => Math.min(2, Math.max(0.3, z - e.deltaY * 0.001)))
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => e.preventDefault()
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [])

  function resetView() {
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }

  return (
    <div className="flex flex-col flex-1" style={{ direction: 'rtl', height: 'calc(100vh - 64px)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-wrap shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800 ml-4">תצוגת עץ ארגוני</h1>

        {/* Filters */}
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

        {(filterDivision || filterDepartment || filterProgram) && (
          <button
            onClick={() => { setFilterDivision(''); setFilterDepartment(''); setFilterProgram('') }}
            className="text-xs text-red-500 hover:text-red-700 underline"
          >
            נקה סינון
          </button>
        )}

        <div className="flex-1" />

        {/* Zoom controls */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-2 py-1">
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow text-slate-600 font-bold text-lg transition-colors"
            title="הקטן"
          >−</button>
          <span className="text-sm font-mono text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-white hover:shadow text-slate-600 font-bold text-lg transition-colors"
            title="הגדל"
          >+</button>
        </div>
        <button
          onClick={resetView}
          className="text-sm text-slate-500 hover:text-slate-700 border border-slate-300 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
        >
          איפוס תצוגה
        </button>
      </div>

      {/* Tree canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: isPanning ? 'grabbing' : 'grab', background: '#f8fafc' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute', inset: 0, opacity: 0.4,
            backgroundImage: 'radial-gradient(circle, #94a3b8 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: 'top center',
            padding: '40px 80px',
            top: 0, left: 0, right: 0,
          }}
        >
          <OrgTree employees={filtered} />
        </div>
      </div>

      {/* Status bar */}
      <div className="px-4 py-1.5 bg-white border-t border-slate-200 text-xs text-slate-400 flex gap-4">
        <span>עובדים: {filtered.length}</span>
        <span>גרור להזזה | גלגלת להגדלה/הקטנה</span>
      </div>
    </div>
  )
}
