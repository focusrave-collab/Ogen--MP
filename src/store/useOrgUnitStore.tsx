import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { OrgUnit } from '../types/orgUnit'
import type { Employee } from '../types/employee'
import { supabase } from '../lib/supabase'

interface OrgUnitStore {
  orgUnits: OrgUnit[]
  loading: boolean
  error: string | null
  syncFromEmployees: (employees: Employee[]) => Promise<void>
  updateManager: (id: string, managerEmployeeNumber: string) => Promise<void>
}

function fromDb(row: any): OrgUnit {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    parentName: row.parent_name ?? '',
    managerEmployeeNumber: row.manager_employee_number ?? '',
  }
}

const OrgUnitContext = createContext<OrgUnitStore | null>(null)

export function OrgUnitProvider({ children }: { children: ReactNode }) {
  const [orgUnits, setOrgUnits] = useState<OrgUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOrgUnits = async () => {
    const { data, error: e } = await supabase.from('org_units').select('*').order('type').order('name')
    if (e) { setError(e.message); return }
    setOrgUnits((data ?? []).map(fromDb))
  }

  useEffect(() => { fetchOrgUnits() }, [])

  const syncFromEmployees = async (employees: Employee[]) => {
    setLoading(true)
    setError(null)
    try {
      const toInsert: { name: string; type: string; parent_name: string }[] = []

      // חטיבות
      const divisions = new Set(employees.map(e => e.division.trim()).filter(Boolean))
      divisions.forEach(d => toInsert.push({ name: d, type: 'חטיבה', parent_name: '' }))

      // מחלקות — record first division seen for each department
      const deptParent = new Map<string, string>()
      employees.forEach(e => {
        if (e.department.trim() && !deptParent.has(e.department.trim()))
          deptParent.set(e.department.trim(), e.division.trim())
      })
      deptParent.forEach((div, dept) => toInsert.push({ name: dept, type: 'מחלקה', parent_name: div }))

      // תכניות — record first department seen for each program
      const progParent = new Map<string, string>()
      employees.forEach(e => {
        if (e.program.trim() && !progParent.has(e.program.trim()))
          progParent.set(e.program.trim(), e.department.trim())
      })
      progParent.forEach((dept, prog) => toInsert.push({ name: prog, type: 'תכנית', parent_name: dept }))

      if (toInsert.length > 0) {
        const { error: upsertError } = await supabase
          .from('org_units')
          .upsert(toInsert, { onConflict: 'name,type', ignoreDuplicates: true })
        if (upsertError) throw upsertError
      }
      await fetchOrgUnits()
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בסנכרון')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const updateManager = async (id: string, managerEmployeeNumber: string) => {
    const { data, error: e } = await supabase
      .from('org_units')
      .update({ manager_employee_number: managerEmployeeNumber })
      .eq('id', id)
      .select()
      .single()
    if (e) { setError(e.message); throw e }
    setOrgUnits(prev => prev.map(u => u.id === id ? fromDb(data) : u))
  }

  return (
    <OrgUnitContext.Provider value={{ orgUnits, loading, error, syncFromEmployees, updateManager }}>
      {children}
    </OrgUnitContext.Provider>
  )
}

export function useOrgUnitStore() {
  const ctx = useContext(OrgUnitContext)
  if (!ctx) throw new Error('useOrgUnitStore must be used within OrgUnitProvider')
  return ctx
}
