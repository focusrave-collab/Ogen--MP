import { useMemo, useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import type { Employee } from '../types/employee'

const NODE_WIDTH = 210
const NODE_HEIGHT = 120

// ─── Dagre layout ────────────────────────────────────────────────────────────

function applyDagreLayout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 50, marginx: 20, marginy: 20 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}

// ─── Build nodes + edges ─────────────────────────────────────────────────────

function buildElements(
  employees: Employee[],
  collapsed: Set<string>,
  onToggle: (id: string) => void
): { nodes: Node[]; edges: Edge[] } {
  // Lookup by employee number (primary) or full name (fallback)
  const byNumber = new Map<string, Employee>()
  const byFullName = new Map<string, Employee>()
  const byLastName = new Map<string, Employee>()
  employees.forEach(e => {
    if (e.employeeNumber) byNumber.set(e.employeeNumber.trim(), e)
    const first = e.firstName.trim()
    const last = e.lastName.trim()
    if (first || last) {
      byFullName.set(`${first} ${last}`.trim(), e)   // שם שם_משפחה
      byFullName.set(`${last} ${first}`.trim(), e)   // שם_משפחה שם
    }
    if (last) byLastName.set(last, e)
  })

  function findManager(dm: string): Employee | undefined {
    if (!dm) return undefined
    const s = dm.trim()
    return byNumber.get(s) ?? byFullName.get(s) ?? byLastName.get(s)
  }

  // Build children map
  const childrenOf = new Map<string, string[]>()
  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    if (mgr && mgr.id !== e.id) {
      const arr = childrenOf.get(mgr.id) ?? []
      arr.push(e.id)
      childrenOf.set(mgr.id, arr)
    }
  })

  // Collect visible nodes (DFS from roots, stop at collapsed)
  const visible = new Set<string>()
  const empById = new Map(employees.map(e => [e.id, e]))

  function visit(id: string) {
    visible.add(id)
    if (!collapsed.has(id)) {
      ;(childrenOf.get(id) ?? []).forEach(visit)
    }
  }

  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    if (!mgr || mgr.id === e.id) visit(e.id) // root
  })

  const nodes: Node[] = []
  const edges: Edge[] = []

  visible.forEach(id => {
    const e = empById.get(id)!
    const hasChildren = (childrenOf.get(id) ?? []).length > 0
    const isCollapsed = collapsed.has(id)
    const isRoot = !findManager(e.directManager) || findManager(e.directManager)!.id === e.id

    nodes.push({
      id,
      type: 'employee',
      position: { x: 0, y: 0 },
      data: { employee: e, hasChildren, isCollapsed, isRoot, onToggle },
    })
  })

  visible.forEach(id => {
    const e = empById.get(id)!
    const mgr = findManager(e.directManager)
    if (mgr && visible.has(mgr.id)) {
      edges.push({
        id: `${mgr.id}→${id}`,
        source: mgr.id,
        target: id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      })
    }
  })

  const layouted = applyDagreLayout(nodes, edges)
  return { nodes: layouted, edges }
}

// ─── Employee node card ───────────────────────────────────────────────────────

const DIVISION_COLORS: Record<string, string> = {}
const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899']
let colorIdx = 0
function getDivisionColor(division: string) {
  if (!division) return '#64748b'
  if (!DIVISION_COLORS[division]) {
    DIVISION_COLORS[division] = PALETTE[colorIdx++ % PALETTE.length]
  }
  return DIVISION_COLORS[division]
}

function EmployeeNode({ data }: NodeProps) {
  const { employee, hasChildren, isCollapsed, isRoot, onToggle } = data as {
    employee: Employee
    hasChildren: boolean
    isCollapsed: boolean
    isRoot: boolean
    onToggle: (id: string) => void
  }

  const initials = `${employee.firstName.charAt(0) ?? ''}${employee.lastName.charAt(0) ?? ''}` || '?'
  const divColor = getDivisionColor(employee.division)

  return (
    <div
      style={{
        width: NODE_WIDTH,
        background: '#fff',
        borderRadius: 12,
        border: isRoot ? `2px solid ${divColor}` : '1.5px solid #e2e8f0',
        boxShadow: isRoot ? `0 4px 16px ${divColor}33` : '0 2px 8px #0000001a',
        fontFamily: 'inherit',
        position: 'relative',
        direction: 'rtl',
      }}
    >
      {/* Top color bar */}
      <div style={{ height: 4, background: divColor, borderRadius: '10px 10px 0 0' }} />

      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div style={{ padding: '10px 12px 10px' }}>
        {/* Avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: employee.gender === 'נקבה' ? '#ec4899' : divColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.firstName} {employee.lastName}
            </div>
            {employee.employeeNumber && (
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{employee.employeeNumber}</div>
            )}
          </div>
        </div>

        {/* Role badge */}
        {employee.role && (
          <div style={{
            display: 'inline-block', background: `${divColor}18`, color: divColor,
            borderRadius: 99, fontSize: 10, padding: '2px 8px', marginBottom: 4,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {employee.role}
          </div>
        )}

        {/* Department / Division */}
        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
          {employee.department && <div>מחלקה: {employee.department}</div>}
          {employee.division && <div>חטיבה: {employee.division}</div>}
        </div>
      </div>

      {/* Expand/collapse button */}
      {hasChildren && (
        <button
          onClick={() => onToggle(employee.id)}
          style={{
            position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: divColor, border: '2px solid #fff',
            color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, lineHeight: 1,
            boxShadow: '0 2px 6px #0003',
          }}
          title={isCollapsed ? 'הרחב' : 'כווץ'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { employee: EmployeeNode }

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  employees: Employee[]
}

export default function OrgTreeFlow({ employees }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const onToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const { nodes, edges } = useMemo(
    () => buildElements(employees, collapsed, onToggle),
    [employees, collapsed, onToggle]
  )

  if (employees.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: 12 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>אין עובדים להצגה</p>
        <p style={{ fontSize: 14 }}>הוסף עובדים בדף הניהול</p>
      </div>
    )
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
      <Controls showInteractive={false} position="bottom-left" />
    </ReactFlow>
  )
}
