import { useState, useRef } from 'react'
import { useEmployeeStore } from '../store/useEmployeeStore'
import { useOrgUnitStore } from '../store/useOrgUnitStore'
import type { Employee } from '../types/employee'
import { EMPTY_EMPLOYEE } from '../types/employee'

const COLUMNS: { key: keyof Omit<Employee, 'id'>; label: string; width?: number }[] = [
  { key: 'gender', label: 'ז/נ', width: 70 },
  { key: 'employeeNumber', label: "מס' עובד", width: 90 },
  { key: 'firstName', label: 'שם', width: 90 },
  { key: 'lastName', label: 'שם משפחה', width: 110 },
  { key: 'role', label: 'תפקיד', width: 140 },
  { key: 'program', label: 'תכנית', width: 110 },
  { key: 'department', label: 'מחלקה', width: 110 },
  { key: 'division', label: 'חטיבה', width: 110 },
  { key: 'directManager', label: 'מנהל ישיר', width: 110 },
  { key: 'admissionYear', label: 'שנת קליטה', width: 100 },
  { key: 'admissionDate', label: 'ת. קליטה', width: 110 },
  { key: 'organization', label: 'ארגון', width: 110 },
  { key: 'notes', label: 'הערות', width: 160 },
]

const GENDER_OPTIONS = ['זכר', 'נקבה', 'אחר']

interface EditingCell {
  rowId: string
  field: keyof Omit<Employee, 'id'>
}

export default function ManagePage() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, importEmployees, error } = useEmployeeStore()
  const { orgUnits, loading: orgLoading, error: orgError, syncFromEmployees, updateManager } = useOrgUnitStore()
  const [editing, setEditing] = useState<EditingCell | null>(null)
  const [editValue, setEditValue] = useState('')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const filtered = employees.filter(e =>
    search === '' ||
    `${e.firstName} ${e.lastName} ${e.employeeNumber} ${e.role} ${e.department}`.toLowerCase().includes(search.toLowerCase())
  )

  function startEdit(rowId: string, field: keyof Omit<Employee, 'id'>, value: string) {
    setEditing({ rowId, field })
    setEditValue(value)
  }

  function commitEdit() {
    if (!editing) return
    updateEmployee(editing.rowId, { [editing.field]: editValue })
    setEditing(null)
    setEditValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') { setEditing(null); setEditValue('') }
  }

  function addRow() {
    addEmployee({ ...EMPTY_EMPLOYEE })
  }

  function exportCSV() {
    const header = ['מס"ד', ...COLUMNS.map(c => c.label)].join(',')
    const rows = employees.map((e, i) =>
      [i + 1, ...COLUMNS.map(c => `"${(e[c.key] || '').replace(/"/g, '""')}`)].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'employees.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCSVText(text: string) {
    const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean)
    if (lines.length < 2) return
    const dataLines = lines.slice(1)
    const imported: Employee[] = dataLines
      .map(line => {
        const parts = line.split(',').map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'))
        const emp: Employee = { id: crypto.randomUUID(), ...EMPTY_EMPLOYEE }
        COLUMNS.forEach((col, idx) => { emp[col.key] = parts[idx + 1] || '' })
        return emp
      })
      .filter(emp => emp.firstName || emp.lastName || emp.employeeNumber)
    importEmployees(imported).catch(err => alert('שגיאת ייבוא: ' + (err?.message ?? err)))
  }

  function importCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const buffer = ev.target?.result as ArrayBuffer
      // Try UTF-8 first; if it contains replacement chars (�), fall back to Windows-1255
      const utf8Text = new TextDecoder('utf-8').decode(buffer)
      const text = utf8Text.includes('\uFFFD')
        ? new TextDecoder('windows-1255').decode(buffer)
        : utf8Text
      parseCSVText(text)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  // Sort org units: חטיבות → מחלקות → תכניות, then by name
  const TYPE_ORDER = { 'חטיבה': 0, 'מחלקה': 1, 'תכנית': 2 }
  const sortedUnits = [...orgUnits].sort((a, b) =>
    TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.name.localeCompare(b.name, 'he')
  )

  return (
    <div className="flex flex-col flex-1 overflow-auto p-4" style={{ direction: 'rtl' }}>
      {error && (
        <div className="mb-3 px-4 py-2 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
          שגיאה: {error}
        </div>
      )}
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h1 className="text-xl font-bold text-slate-800 ml-2">ניהול ועריכה</h1>
        <input
          type="text"
          placeholder="חיפוש..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
        />
        <div className="flex-1" />
        <button
          onClick={() => importEmployees(employees.filter(e => e.firstName || e.lastName || e.employeeNumber))}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          נקה שורות ריקות
        </button>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          הוסף עובד
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          ייצוא CSV
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-slate-600 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          ייבוא CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
        <button
          onClick={() => employees.length > 0 && setConfirmDeleteAll(true)}
          disabled={employees.length === 0}
          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          מחק הכל
        </button>
      </div>

      {/* Employees Table */}
      <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm bg-white" style={{ maxHeight: '45vh' }}>
        <table className="w-full text-sm border-collapse" style={{ minWidth: 1400 }}>
          <thead>
            <tr className="bg-slate-700 text-white sticky top-0 z-10">
              <th className="px-3 py-2.5 text-center font-semibold border-l border-slate-600 w-12">מס"ד</th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className="px-3 py-2.5 text-right font-semibold border-l border-slate-600 whitespace-nowrap"
                  style={{ minWidth: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-semibold w-16">מחיקה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 2} className="text-center py-16 text-slate-400">
                  {search ? 'לא נמצאו תוצאות' : 'אין עובדים. לחץ "הוסף עובד" להתחיל.'}
                </td>
              </tr>
            ) : (
              filtered.map((emp, idx) => (
                <tr
                  key={emp.id}
                  className={`border-b border-slate-100 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50`}
                >
                  <td className="px-3 py-2 text-center text-slate-400 text-xs border-l border-slate-100">{idx + 1}</td>
                  {COLUMNS.map(col => {
                    const isEditing = editing?.rowId === emp.id && editing?.field === col.key
                    const value = emp[col.key] || ''
                    return (
                      <td
                        key={col.key}
                        className="px-2 py-1.5 border-l border-slate-100 cursor-pointer"
                        onClick={() => !isEditing && startEdit(emp.id, col.key, value)}
                      >
                        {isEditing ? (
                          col.key === 'gender' ? (
                            <select
                              autoFocus
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              className="w-full border border-blue-400 rounded px-1 py-0.5 text-sm focus:outline-none bg-white"
                            >
                              <option value="">--</option>
                              {GENDER_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                          ) : (
                            <input
                              autoFocus
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={handleKeyDown}
                              className="w-full border border-blue-400 rounded px-1 py-0.5 text-sm focus:outline-none"
                              style={{ minWidth: 60 }}
                            />
                          )
                        ) : (
                          <span className="block truncate text-slate-700" style={{ maxWidth: col.width }}>
                            {value}
                          </span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1.5 text-center border-l border-slate-100">
                    <button
                      onClick={() => setConfirmDeleteId(emp.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded p-1 transition-colors"
                      title="מחק עובד"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-2 text-xs text-slate-400 text-right">
        סה"כ: {employees.length} עובדים {search && `| מוצגים: ${filtered.length}`}
      </div>

      {/* Org Units Section */}
      <div className="mt-6">
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-bold text-slate-800">יחידות ארגוניות</h2>
          <button
            onClick={() => syncFromEmployees(employees).catch(e => alert('שגיאה: ' + e.message))}
            disabled={orgLoading || employees.length === 0}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            {orgLoading ? 'מסנכרן...' : 'סנכרן מעובדים'}
          </button>
          {orgError && <span className="text-red-500 text-sm">{orgError}</span>}
        </div>
        <div className="overflow-auto rounded-xl border border-slate-200 shadow-sm bg-white" style={{ maxHeight: '40vh' }}>
          <table className="w-full text-sm border-collapse" style={{ minWidth: 600 }}>
            <thead>
              <tr className="bg-slate-700 text-white sticky top-0 z-10">
                <th className="px-3 py-2.5 text-right font-semibold border-l border-slate-600 w-24">סוג</th>
                <th className="px-3 py-2.5 text-right font-semibold border-l border-slate-600">שם</th>
                <th className="px-3 py-2.5 text-right font-semibold border-l border-slate-600">שייך ל</th>
                <th className="px-3 py-2.5 text-right font-semibold w-64">מנהל</th>
              </tr>
            </thead>
            <tbody>
              {sortedUnits.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-slate-400">
                    לחץ "סנכרן מעובדים" כדי לטעון את היחידות הארגוניות
                  </td>
                </tr>
              ) : (
                sortedUnits.map((unit) => {
                  const TYPE_BG: Record<string, string> = {
                    'חטיבה': 'bg-blue-50',
                    'מחלקה': 'bg-white',
                    'תכנית': 'bg-slate-50',
                  }
                  const TYPE_BADGE: Record<string, string> = {
                    'חטיבה': 'bg-blue-100 text-blue-700',
                    'מחלקה': 'bg-purple-100 text-purple-700',
                    'תכנית': 'bg-emerald-100 text-emerald-700',
                  }
                  return (
                    <tr key={unit.id} className={`border-b border-slate-100 ${TYPE_BG[unit.type]}`}>
                      <td className="px-3 py-2 border-l border-slate-100">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[unit.type]}`}>
                          {unit.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-l border-slate-100 font-medium text-slate-700">
                        {unit.type === 'מחלקה' && <span className="text-slate-300 ml-1">└</span>}
                        {unit.type === 'תכנית' && <span className="text-slate-300 ml-1 mr-3">└</span>}
                        {unit.name}
                      </td>
                      <td className="px-3 py-2 border-l border-slate-100 text-slate-500 text-sm">
                        {unit.parentName || '—'}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={unit.managerEmployeeNumber}
                          onChange={e => updateManager(unit.id, e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                        >
                          <option value="">— ללא מנהל —</option>
                          {employees
                            .filter(e => e.firstName || e.lastName)
                            .sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'he'))
                            .map(e => (
                              <option key={e.id} value={e.employeeNumber}>
                                {e.firstName} {e.lastName}{e.employeeNumber ? ` (${e.employeeNumber})` : ''}
                              </option>
                            ))
                          }
                        </select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-slate-400 text-right">
          סה"כ: {orgUnits.length} יחידות ארגוניות
        </div>
      </div>

      {/* אישור מחיקת שורה */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="text-red-500 mb-3">
              <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">מחיקת עובד</h2>
            <p className="text-slate-500 text-sm mb-5">האם אתה בטוח שברצונך למחוק עובד זה?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteId(null)} className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">ביטול</button>
              <button onClick={() => { deleteEmployee(confirmDeleteId); setConfirmDeleteId(null) }} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">מחק</button>
            </div>
          </div>
        </div>
      )}

      {/* אישור מחיקת הכל */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
            <div className="text-red-500 mb-3">
              <svg className="mx-auto" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1">מחיקת כל העובדים</h2>
            <p className="text-slate-500 text-sm mb-5">פעולה זו תמחק את כל {employees.length} העובדים ולא ניתן לבטלה.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirmDeleteAll(false)} className="px-5 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors">ביטול</button>
              <button onClick={() => { importEmployees([]); setConfirmDeleteAll(false) }} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">מחק הכל</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
