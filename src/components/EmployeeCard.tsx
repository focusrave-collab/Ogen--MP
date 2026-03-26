import type { Employee } from '../types/employee'

interface Props {
  employee: Employee
  isRoot?: boolean
}

const genderColors: Record<string, string> = {
  'זכר': '#3b82f6',
  'נקבה': '#ec4899',
}

export default function EmployeeCard({ employee, isRoot = false }: Props) {
  const avatarColor = genderColors[employee.gender] || '#64748b'
  const initials = `${employee.firstName.charAt(0) || '?'}${employee.lastName.charAt(0) || ''}`

  return (
    <div
      className={`rounded-xl shadow-md border transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 ${
        isRoot
          ? 'border-blue-300 bg-gradient-to-b from-blue-50 to-white min-w-[180px]'
          : 'border-slate-200 bg-white min-w-[160px]'
      }`}
      style={{ maxWidth: '200px', cursor: 'default' }}
    >
      {isRoot && (
        <div className="h-1 rounded-t-xl bg-gradient-to-l from-blue-600 to-blue-400" />
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: avatarColor }}
          >
            {initials || '?'}
          </div>
          <div className="overflow-hidden">
            <p className="font-semibold text-slate-800 text-sm leading-tight truncate">
              {employee.firstName} {employee.lastName}
            </p>
            <p className="text-xs text-slate-500 truncate">{employee.employeeNumber}</p>
          </div>
        </div>

        {employee.role && (
          <div className="mb-1.5">
            <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full truncate max-w-full">
              {employee.role}
            </span>
          </div>
        )}

        <div className="space-y-0.5">
          {employee.department && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span className="text-slate-400">מחלקה:</span>
              <span className="truncate text-slate-600">{employee.department}</span>
            </div>
          )}
          {employee.division && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span className="text-slate-400">חטיבה:</span>
              <span className="truncate text-slate-600">{employee.division}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
