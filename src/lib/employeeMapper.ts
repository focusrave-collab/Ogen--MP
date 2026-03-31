import type { Employee } from '../types/employee'

export function fromDb(row: any): Employee {
  return {
    id: row.id,
    gender: row.gender || '',
    employeeNumber: row.employee_number || '',
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    role: row.role || '',
    program: row.program || '',
    department: row.department || '',
    division: row.division || '',
    directManager: row.direct_manager || '',
    admissionYear: row.admission_year || '',
    admissionDate: row.admission_date || '',
    organization: row.organization || '',
    notes: row.notes || '',
  }
}

export function toDb(emp: Omit<Employee, 'id'>, _userId?: string) {
  return {
    gender: emp.gender,
    employee_number: emp.employeeNumber,
    first_name: emp.firstName,
    last_name: emp.lastName,
    role: emp.role,
    program: emp.program,
    department: emp.department,
    division: emp.division,
    direct_manager: emp.directManager,
    admission_year: emp.admissionYear,
    admission_date: emp.admissionDate,
    organization: emp.organization,
    notes: emp.notes,
  }
}
