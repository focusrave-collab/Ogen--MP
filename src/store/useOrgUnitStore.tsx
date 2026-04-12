import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { OrgUnit } from '../types/orgUnit'
import type { Employee } from '../types/employee'
import { sql } from '../lib/neonClient'

interface OrgUnitStore {
  orgUnits: OrgUnit[]
  loading: boolean
  error: string | null
  syncFromEmployees: (employees: Employee[]) => Promise<void>
  updateManager: (id: string, managerEmployeeNumber: string) => Promise<void>
  updateOrgUnit: (id: string, updates: Partial<Pick<OrgUnit, 'name' | 'type' | 'parentName'>>) => Promise<void>
  deleteOrgUnit: (id: string) => Promise<void>
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
    const rows = await sql`SELECT * FROM org_units ORDER BY type, name`
    setOrgUnits(rows.map(fromDb))
  }

  useEffect(() => { fetchOrgUnits() }, [])

  const syncFromEmployees = async (employees: Employee[]) => {
    setLoading(true)
    setError(null)
    try {
      const toInsert: { name: string; type: string; parent_name: string }[] = []

      const divisions = new Set(employees.map(e => e.division.trim()).filter(Boolean))
      divisions.forEach(d => toInsert.push({ name: d, type: 'חטיבה', parent_name: '' }))

      const deptParent = new Map<string, string>()
      employees.forEach(e => {
        if (e.department.trim() && !deptParent.has(e.department.trim()))
          deptParent.set(e.department.trim(), e.division.trim())
      })
      deptParent.forEach((div, dept) => toInsert.push({ name: dept, type: 'מחלקה', parent_name: div }))

      const progParent = new Map<string, string>()
      employees.forEach(e => {
        if (e.program.trim() && !progParent.has(e.program.trim()))
          progParent.set(e.program.trim(), e.department.trim())
      })
      progParent.forEach((dept, prog) => toInsert.push({ name: prog, type: 'תכנית', parent_name: dept }))

      for (const u of toInsert) {
        await sql`
          INSERT INTO org_units (name, type, parent_name)
          VALUES (${u.name}, ${u.type}, ${u.parent_name})
          ON CONFLICT (name, type) DO NOTHING`
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
    try {
      const [row] = await sql`
        UPDATE org_units SET manager_employee_number = ${managerEmployeeNumber}
        WHERE id = ${id} RETURNING *`
      setOrgUnits(prev => prev.map(u => u.id === id ? fromDb(row) : u))
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  const updateOrgUnit = async (id: string, updates: Partial<Pick<OrgUnit, 'name' | 'type' | 'parentName'>>) => {
    try {
      const current = orgUnits.find(u => u.id === id)
      if (!current) return
      const m = { ...current, ...updates }
      const [row] = await sql`
        UPDATE org_units SET name = ${m.name}, type = ${m.type}, parent_name = ${m.parentName}
        WHERE id = ${id} RETURNING *`
      setOrgUnits(prev => prev.map(u => u.id === id ? fromDb(row) : u))
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  const deleteOrgUnit = async (id: string) => {
    try {
      await sql`DELETE FROM org_units WHERE id = ${id}`
      setOrgUnits(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  return (
    <OrgUnitContext.Provider value={{ orgUnits, loading, error, syncFromEmployees, updateManager, updateOrgUnit, deleteOrgUnit }}>
      {children}
    </OrgUnitContext.Provider>
  )
}

export function useOrgUnitStore() {
  const ctx = useContext(OrgUnitContext)
  if (!ctx) throw new Error('useOrgUnitStore must be used within OrgUnitProvider')
  return ctx
}
