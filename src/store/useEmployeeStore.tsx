import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Employee } from '../types/employee'
import { supabase } from '../lib/supabase'
import { fromDb, toDb } from '../lib/employeeMapper'

interface EmployeeStore {
  employees: Employee[]
  loading: boolean
  error: string | null
  fetchEmployees: () => Promise<void>
  addEmployee: (emp: Omit<Employee, 'id'>) => Promise<void>
  updateEmployee: (id: string, updates: Partial<Employee>) => Promise<void>
  deleteEmployee: (id: string) => Promise<void>
  importEmployees: (employees: Employee[]) => Promise<void>
}

const EmployeeContext = createContext<EmployeeStore | null>(null)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEmployees = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase.from('employees').select('*')
      if (fetchError) throw fetchError
      setEmployees((data ?? []).map(fromDb))
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    const { data, error: insertError } = await supabase
      .from('employees').insert(toDb(emp, '')).select().single()
    if (insertError) { setError(insertError.message); throw insertError }
    setEmployees(prev => [...prev, fromDb(data)])
  }

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    const current = employees.find(e => e.id === id)
    if (!current) return
    const merged = { ...current, ...updates }
    const { id: _id, ...withoutId } = merged
    const { data, error: updateError } = await supabase
      .from('employees').update(toDb(withoutId, '')).eq('id', id).select().single()
    if (updateError) { setError(updateError.message); throw updateError }
    setEmployees(prev => prev.map(e => e.id === id ? fromDb(data) : e))
  }

  const deleteEmployee = async (id: string) => {
    const { error: deleteError } = await supabase.from('employees').delete().eq('id', id)
    if (deleteError) { setError(deleteError.message); throw deleteError }
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const importEmployees = async (newEmployees: Employee[]) => {
    setLoading(true)
    setError(null)
    try {
      await supabase.from('employees').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      if (newEmployees.length > 0) {
        const rows = newEmployees.map(e => { const { id: _id, ...rest } = e; return toDb(rest, '') })
        const { data, error: insertError } = await supabase.from('employees').insert(rows).select()
        if (insertError) throw insertError
        setEmployees((data ?? []).map(fromDb))
      } else {
        setEmployees([])
      }
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בייבוא נתונים')
    } finally {
      setLoading(false)
    }
  }

  return (
    <EmployeeContext.Provider value={{ employees, loading, error, fetchEmployees, addEmployee, updateEmployee, deleteEmployee, importEmployees }}>
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployeeStore() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployeeStore must be used within EmployeeProvider')
  return ctx
}
