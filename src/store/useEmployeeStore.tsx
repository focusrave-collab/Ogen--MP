import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Employee } from '../types/employee'

const STORAGE_KEY = 'org_employees'

interface EmployeeStore {
  employees: Employee[]
  addEmployee: (emp: Omit<Employee, 'id'>) => void
  updateEmployee: (id: string, updates: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  importEmployees: (employees: Employee[]) => void
}

const EmployeeContext = createContext<EmployeeStore | null>(null)

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(employees))
  }, [employees])

  const addEmployee = (emp: Omit<Employee, 'id'>) => {
    setEmployees(prev => [...prev, { ...emp, id: crypto.randomUUID() }])
  }

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e))
  }

  const deleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id))
  }

  const importEmployees = (newEmployees: Employee[]) => {
    setEmployees(newEmployees)
  }

  return (
    <EmployeeContext.Provider value={{ employees, addEmployee, updateEmployee, deleteEmployee, importEmployees }}>
      {children}
    </EmployeeContext.Provider>
  )
}

export function useEmployeeStore() {
  const ctx = useContext(EmployeeContext)
  if (!ctx) throw new Error('useEmployeeStore must be used within EmployeeProvider')
  return ctx
}
