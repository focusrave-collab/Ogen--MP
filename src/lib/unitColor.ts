import type { OrgUnit } from '../types/orgUnit'

const TYPE_COLOR: Record<string, string> = {
  'ארגון': '#a21caf', 'חטיבה': '#1e40af', 'מחלקה': '#6d28d9', 'תכנית': '#065f46',
}

export function resolveUnitColor(unit: OrgUnit, allUnits: OrgUnit[]): string {
  if (unit.color) return unit.color
  if (unit.parentName) {
    const parent = allUnits.find(u => u.name === unit.parentName)
    if (parent) return resolveUnitColor(parent, allUnits)
  }
  return TYPE_COLOR[unit.type] ?? '#64748b'
}

export function resolveEmployeeUnitColor(
  emp: { program?: string; department?: string; division?: string; employeeNumber?: string },
  allUnits: OrgUnit[],
  fallback: string,
): string {
  const find = (name: string, type: string) =>
    allUnits.find(u => u.name === name.trim() && u.type === type)
  const unit =
    (emp.program?.trim() ? find(emp.program, 'תכנית') : null) ||
    (emp.department?.trim() ? find(emp.department, 'מחלקה') : null) ||
    (emp.division?.trim() ? find(emp.division, 'חטיבה') : null) ||
    (emp.employeeNumber?.trim() ? allUnits.find(u => u.managerEmployeeNumber?.trim() === emp.employeeNumber!.trim()) : null)
  return unit ? resolveUnitColor(unit, allUnits) : fallback
}
