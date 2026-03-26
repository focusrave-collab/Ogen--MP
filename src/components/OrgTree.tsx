import { useMemo } from 'react'
import type { Employee } from '../types/employee'
import EmployeeCard from './EmployeeCard'

interface TreeNode {
  employee: Employee
  children: TreeNode[]
}

function buildTree(employees: Employee[]): TreeNode[] {
  const empMap = new Map<string, Employee>()
  employees.forEach(e => {
    if (e.employeeNumber) empMap.set(e.employeeNumber, e)
  })

  const roots: TreeNode[] = []
  const nodeMap = new Map<string, TreeNode>()

  employees.forEach(e => {
    nodeMap.set(e.id, { employee: e, children: [] })
  })

  employees.forEach(e => {
    const node = nodeMap.get(e.id)!
    const hasManager = e.directManager && empMap.has(e.directManager)

    if (!hasManager) {
      roots.push(node)
    } else {
      const managerEmp = empMap.get(e.directManager)!
      const managerNode = nodeMap.get(managerEmp.id)
      if (managerNode) {
        managerNode.children.push(node)
      } else {
        roots.push(node)
      }
    }
  })

  return roots
}

function TreeNodeComponent({ node, isRoot = false }: { node: TreeNode; isRoot?: boolean }) {
  const hasChildren = node.children.length > 0

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="employee-card">
        <EmployeeCard employee={node.employee} isRoot={isRoot} />
      </div>

      {hasChildren && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          {/* Vertical line from card to horizontal bar */}
          <div style={{ width: 2, height: 28, background: '#94a3b8', flexShrink: 0 }} />

          {/* Children row */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', position: 'relative' }}>
            {node.children.map((child, idx) => {
              const isFirst = idx === 0
              const isLast = idx === node.children.length - 1
              const isOnly = node.children.length === 1
              return (
                <div
                  key={child.employee.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 12px', position: 'relative' }}
                >
                  {/* Top connector: horizontal + short vertical */}
                  <div style={{ position: 'relative', width: '100%', height: 28, flexShrink: 0 }}>
                    {/* horizontal line - left half */}
                    {!isOnly && !isFirst && (
                      <div style={{
                        position: 'absolute',
                        top: 0, right: '50%', left: 0,
                        height: 2, background: '#94a3b8',
                      }} />
                    )}
                    {/* horizontal line - right half */}
                    {!isOnly && !isLast && (
                      <div style={{
                        position: 'absolute',
                        top: 0, left: '50%', right: 0,
                        height: 2, background: '#94a3b8',
                      }} />
                    )}
                    {/* vertical line down to child */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: 2,
                      height: '100%',
                      background: '#94a3b8',
                    }} />
                  </div>

                  <TreeNodeComponent node={child} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgTree({ employees }: { employees: Employee[] }) {
  const roots = useMemo(() => buildTree(employees), [employees])

  if (roots.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: '#94a3b8' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>אין עובדים להצגה</p>
        <p style={{ fontSize: 14, marginTop: 8 }}>הוסף עובדים בדף הניהול</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: 48, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
      {roots.map(root => (
        <TreeNodeComponent key={root.employee.id} node={root} isRoot={true} />
      ))}
    </div>
  )
}
