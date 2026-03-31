import { useMemo, useCallback, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
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

// ─── Dagre layout (TB) ───────────────────────────────────────────────────────

function applyDagreLayout(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)

  const layouted = nodes.map(n => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })

  // Add extra horizontal spacing between nodes from different parents
  const parentOf = new Map<string, string>()
  edges.forEach(e => parentOf.set(e.target, e.source))

  const byRank = new Map<number, Node[]>()
  layouted.forEach(n => {
    const rank = Math.round(n.position.y)
    byRank.set(rank, [...(byRank.get(rank) ?? []), n])
  })

  const adjusted = new Map(layouted.map(n => [n.id, { ...n }]))
  byRank.forEach(rankNodes => {
    if (rankNodes.length < 2) return
    const sorted = [...rankNodes].sort((a, b) => a.position.x - b.position.x)
    let offset = 0
    for (let i = 1; i < sorted.length; i++) {
      const prevParent = parentOf.get(sorted[i - 1].id)
      const currParent = parentOf.get(sorted[i].id)
      if (prevParent !== currParent) offset += 50
      const node = adjusted.get(sorted[i].id)!
      node.position = { x: node.position.x + offset, y: node.position.y }
    }
  })

  return layouted.map(n => adjusted.get(n.id)!)
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

// ─── Employee node card (TB: target=Top, source=Bottom) ─────────────────────

function EmployeeNode({ data }: NodeProps) {
  const { employee, hasChildren, isCollapsed, isRoot } = data as {
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
      cursor: hasChildren ? 'pointer' : 'default',
    }}>
      {/* Top color bar */}
      <div style={{ height: 4, background: divColor, borderRadius: '10px 10px 0 0' }} />

      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />

      <div style={{ padding: '8px 12px 10px' }}>
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

      {/* Visual indicator at bottom - click handled by onNodeClick on ReactFlow */}
      {hasChildren && (
        <div style={{
          position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 20, borderRadius: '50%',
          background: divColor, border: '2px solid #fff',
          color: '#fff', fontSize: 13, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, lineHeight: 1, boxShadow: '0 2px 6px #0003',
          pointerEvents: 'none',
        }}>
          {isCollapsed ? '+' : '−'}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { employee: EmployeeNode }

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrgTreeFlow({ employees }: { employees: Employee[] }) {
  const employeesRef = useRef(employees)
  employeesRef.current = employees

  const defaultCollapsed = useMemo(() => computeDefaultCollapsed(employees), [employees])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => computeDefaultCollapsed(employees))

  // Reset when employee list changes (import etc.)
  const prevCountRef = useRef(employees.length)
  if (prevCountRef.current !== employees.length) {
    prevCountRef.current = employees.length
    setCollapsed(computeDefaultCollapsed(employees))
  }

  const onToggle = useCallback((id: string) => {
    setCollapsed(prev => {
      const { findManager } = buildLookups(employeesRef.current)
      const childrenOf = buildChildrenMap(employeesRef.current, findManager)
      const next = new Set(prev)

      if (next.has(id)) {
        // Opening: just remove from collapsed
        next.delete(id)
      } else {
        // Closing: collapse this node AND reset all descendants to default
        next.add(id)
        function resetDescendants(nodeId: string) {
          ;(childrenOf.get(nodeId) ?? []).forEach(childId => {
            const childHasChildren = (childrenOf.get(childId) ?? []).length > 0
            if (childHasChildren) next.add(childId)
            else next.delete(childId)
            resetDescendants(childId)
          })
        }
        resetDescendants(id)
      }
      return next
    })
  }, [])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])
  const collapseAll = useCallback(() => setCollapsed(defaultCollapsed), [defaultCollapsed])

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
        onNodeClick={(_e, node) => {
          const hasChildren = (node.data as any).hasChildren
          if (hasChildren) onToggle(node.id)
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-left" />
        <Panel position="top-left">
          <div style={{ display: 'flex', gap: 6, direction: 'rtl' }}>
            <button onClick={expandAll} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: '#3b82f6', boxShadow: '0 1px 4px #0001', fontFamily: 'inherit',
            }}>פתח הכל</button>
            <button onClick={collapseAll} style={{
              background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
              padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              color: '#64748b', boxShadow: '0 1px 4px #0001', fontFamily: 'inherit',
            }}>סגור הכל</button>
          </div>
        </Panel>
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
