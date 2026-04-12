import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Employee } from '../types/employee'
import { sql } from '../lib/neonClient'
import { fromDb } from '../lib/employeeMapper'

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
      const rows = await sql`SELECT * FROM employees ORDER BY created_at`
      setEmployees(rows.map(fromDb))
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בטעינת נתונים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEmployees() }, [])

  const addEmployee = async (emp: Omit<Employee, 'id'>) => {
    try {
      const [row] = await sql`
        INSERT INTO employees
          (gender, employee_number, first_name, last_name, role, program, department, division, direct_manager, admission_year, admission_date, organization, notes)
        VALUES
          (${emp.gender}, ${emp.employeeNumber}, ${emp.firstName}, ${emp.lastName}, ${emp.role}, ${emp.program}, ${emp.department}, ${emp.division}, ${emp.directManager}, ${emp.admissionYear}, ${emp.admissionDate}, ${emp.organization}, ${emp.notes})
        RETURNING *`
      setEmployees(prev => [...prev, fromDb(row)])
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  const updateEmployee = async (id: string, updates: Partial<Employee>) => {
    try {
      const current = employees.find(e => e.id === id)
      if (!current) return
      const m = { ...current, ...updates }
      const [row] = await sql`
        UPDATE employees SET
          gender = ${m.gender}, employee_number = ${m.employeeNumber},
          first_name = ${m.firstName}, last_name = ${m.lastName},
          role = ${m.role}, program = ${m.program}, department = ${m.department},
          division = ${m.division}, direct_manager = ${m.directManager},
          admission_year = ${m.admissionYear}, admission_date = ${m.admissionDate},
          organization = ${m.organization}, notes = ${m.notes}
        WHERE id = ${id} RETURNING *`
      setEmployees(prev => prev.map(e => e.id === id ? fromDb(row) : e))
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  const deleteEmployee = async (id: string) => {
    try {
      await sql`DELETE FROM employees WHERE id = ${id}`
      setEmployees(prev => prev.filter(e => e.id !== id))
    } catch (err: any) {
      setError(err.message); throw err
    }
  }

  const importEmployees = async (newEmployees: Employee[]) => {
    setLoading(true)
    setError(null)
    try {
      await sql`TRUNCATE TABLE employees`
      setEmployees([])
      if (newEmployees.length > 0) {
        for (const emp of newEmployees) {
          await sql`
            INSERT INTO employees
              (gender, employee_number, first_name, last_name, role, program, department, division, direct_manager, admission_year, admission_date, organization, notes)
            VALUES
              (${emp.gender}, ${emp.employeeNumber}, ${emp.firstName}, ${emp.lastName}, ${emp.role}, ${emp.program}, ${emp.department}, ${emp.division}, ${emp.directManager}, ${emp.admissionYear}, ${emp.admissionDate}, ${emp.organization}, ${emp.notes})`
        }
        await fetchEmployees()
      }
    } catch (err: any) {
      setError(err.message ?? 'שגיאה בייבוא נתונים')
      throw err
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
