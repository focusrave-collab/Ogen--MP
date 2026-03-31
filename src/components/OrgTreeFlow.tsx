import { useMemo, useCallback, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
const NODE_HEIGHT = 115

// ─── Lookup helpers (shared) ─────────────────────────────────────────────────

function buildLookups(employees: Employee[]) {
  const byNumber = new Map<string, Employee>()
  const byFullName = new Map<string, Employee>()
  const byLastName = new Map<string, Employee>()
  employees.forEach(e => {
    if (e.employeeNumber) byNumber.set(e.employeeNumber.trim(), e)
    const first = e.firstName.trim()
    const last = e.lastName.trim()
    if (first || last) {
      byFullName.set(`${first} ${last}`.trim(), e)
      byFullName.set(`${last} ${first}`.trim(), e)
    }
    if (last) byLastName.set(last, e)
  })
  function findManager(dm: string): Employee | undefined {
    if (!dm) return undefined
    const s = dm.trim()
    return byNumber.get(s) ?? byFullName.get(s) ?? byLastName.get(s)
  }
  return { findManager }
}

function buildChildrenMap(employees: Employee[], findManager: (dm: string) => Employee | undefined) {
  const childrenOf = new Map<string, string[]>()
  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    if (mgr && mgr.id !== e.id) {
      const arr = childrenOf.get(mgr.id) ?? []
      arr.push(e.id)
      childrenOf.set(mgr.id, arr)
    }
  })
  return childrenOf
}

// ─── Dagre layout (LR) ───────────────────────────────────────────────────────

function applyDagreLayout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 20, ranksep: 80, marginx: 40, marginy: 40 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)

  return nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}

// ─── Default collapsed: all non-root nodes that have children ────────────────

function computeDefaultCollapsed(employees: Employee[]): Set<string> {
  const { findManager } = buildLookups(employees)
  const childrenOf = buildChildrenMap(employees, findManager)
  const result = new Set<string>()
  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    const isRoot = !mgr || mgr.id === e.id
    if (!isRoot && (childrenOf.get(e.id) ?? []).length > 0) {
      result.add(e.id)
    }
  })
  return result
}

// ─── Build nodes + edges ─────────────────────────────────────────────────────

function buildElements(
  employees: Employee[],
  collapsed: Set<string>,
  onToggle: (id: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const { findManager } = buildLookups(employees)
  const childrenOf = buildChildrenMap(employees, findManager)
  const empById = new Map(employees.map(e => [e.id, e]))

  const visible = new Set<string>()
  function visit(id: string) {
    visible.add(id)
    if (!collapsed.has(id)) {
      ;(childrenOf.get(id) ?? []).forEach(visit)
    }
  }
  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    if (!mgr || mgr.id === e.id) visit(e.id)
  })

  const nodes: Node[] = []
  const edges: Edge[] = []

  visible.forEach(id => {
    const e = empById.get(id)!
    const hasChildren = (childrenOf.get(id) ?? []).length > 0
    const isCollapsed = collapsed.has(id)
    const mgr = findManager(e.directManager)
    const isRoot = !mgr || mgr.id === e.id

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

  return { nodes: applyDagreLayout(nodes, edges), edges }
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const DIVISION_COLORS: Record<string, string> = {}
const PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899','#ef4444']
let colorIdx = 0
function getDivisionColor(division: string) {
  if (!division) return '#64748b'
  if (!DIVISION_COLORS[division]) DIVISION_COLORS[division] = PALETTE[colorIdx++ % PALETTE.length]
  return DIVISION_COLORS[division]
}

// ─── Employee node card (LR: target=Left, source=Right) ──────────────────────

function EmployeeNode({ data }: NodeProps) {
  const { employee, hasChildren, isCollapsed, isRoot, onToggle } = data as {
    employee: Employee; hasChildren: boolean; isCollapsed: boolean; isRoot: boolean; onToggle: (id: string) => void
  }
  const initials = (`${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`) || '?'
  const divColor = getDivisionColor(employee.division)

  return (
    <div style={{
      width: NODE_WIDTH, background: '#fff', borderRadius: 12, position: 'relative',
      border: isRoot ? `2px solid ${divColor}` : '1.5px solid #e2e8f0',
      boxShadow: isRoot ? `0 4px 16px ${divColor}33` : '0 2px 8px #0000001a',
      fontFamily: 'inherit', direction: 'rtl',
    }}>
      {/* Right color bar (entry side from parent in LR layout) */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: divColor, borderRadius: '10px 0 0 10px' }} />

      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />

      <div style={{ padding: '10px 12px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: employee.gender === 'נקבה' ? '#ec4899' : divColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 12,
          }}>{initials}</div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.firstName} {employee.lastName}
            </div>
            {employee.employeeNumber && (
              <div style={{ fontSize: 10, color: '#94a3b8' }}>{employee.employeeNumber}</div>
            )}
          </div>
        </div>

        {employee.role && (
          <div style={{
            display: 'inline-block', background: `${divColor}18`, color: divColor,
            borderRadius: 99, fontSize: 10, padding: '2px 8px', marginBottom: 3,
            maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{employee.role}</div>
        )}

        <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.6 }}>
          {employee.department && <div>מחלקה: {employee.department}</div>}
          {employee.division && <div>חטיבה: {employee.division}</div>}
        </div>
      </div>

      {/* Toggle button on the RIGHT (children appear to the right in LR layout) */}
      {hasChildren && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(employee.id) }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)',
            width: 22, height: 22, borderRadius: '50%',
            background: divColor, border: '2px solid #fff',
            color: '#fff', fontSize: 14, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', zIndex: 10, lineHeight: 1, boxShadow: '0 2px 6px #0003',
          }}
          title={isCollapsed ? 'הרחב' : 'כווץ'}
        >
          {isCollapsed ? '+' : '−'}
        </button>
      )}

      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { employee: EmployeeNode }

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrgTreeFlow({ employees }: { employees: Employee[] }) {
  // toggled = nodes the user has explicitly clicked (XOR with defaultCollapsed)
  const [toggled, setToggled] = useState<Set<string>>(new Set())

  const defaultCollapsed = useMemo(() => computeDefaultCollapsed(employees), [employees])

  const collapsed = useMemo(() => {
    const result = new Set(defaultCollapsed)
    toggled.forEach(id => {
      result.has(id) ? result.delete(id) : result.add(id)
    })
    return result
  }, [defaultCollapsed, toggled])

  const onToggle = useCallback((id: string) => {
    setToggled(prev => {
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
          <circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>אין עובדים להצגה</p>
        <p style={{ fontSize: 14 }}>הוסף עובדים בדף הניהול</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-left" />
        <MiniMap
          nodeColor={n => {
            const emp = (n.data as any)?.employee as Employee
            return getDivisionColor(emp?.division ?? '')
          }}
          maskColor="rgba(248,250,252,0.85)"
          position="bottom-right"
          style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}
        />
      </ReactFlow>
    </div>
  )
}
