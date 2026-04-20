import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
  BackgroundVariant,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import type { Employee } from '../types/employee'
import type { OrgUnit } from '../types/orgUnit'

export type TreeMode = 'manager' | 'orgunit' | 'combined'

const EMP_W = 210
const EMP_H = 115
const UNIT_W = 240
const UNIT_H = 72

// ─── Lookup helpers ───────────────────────────────────────────────────────────

function buildLookups(employees: Employee[]) {
  const byNumber = new Map<string, Employee>()
  const byFullName = new Map<string, Employee>()
  const byLastName = new Map<string, Employee>()
  employees.forEach(e => {
    if (e.employeeNumber) byNumber.set(e.employeeNumber.trim(), e)
    const first = e.firstName.trim(); const last = e.lastName.trim()
    if (first || last) { byFullName.set(`${first} ${last}`.trim(), e); byFullName.set(`${last} ${first}`.trim(), e) }
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
      const arr = childrenOf.get(mgr.id) ?? []; arr.push(e.id); childrenOf.set(mgr.id, arr)
    }
  })
  return childrenOf
}

// ─── Dagre layout ─────────────────────────────────────────────────────────────

function applyDagreLayout(nodes: Node[], edges: Edge[], nodeSizes: Map<string, { w: number; h: number }>) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 })

  nodes.forEach(n => {
    const s = nodeSizes.get(n.id) ?? { w: EMP_W, h: EMP_H }
    g.setNode(n.id, { width: s.w, height: s.h })
  })
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)

  const layouted = nodes.map(n => {
    const pos = g.node(n.id)
    const s = nodeSizes.get(n.id) ?? { w: EMP_W, h: EMP_H }
    return { ...n, position: { x: pos.x - s.w / 2, y: pos.y - s.h / 2 } }
  })

  // Extra spacing between siblings from different parents
  const parentOf = new Map<string, string>()
  edges.forEach(e => parentOf.set(e.target, e.source))
  const byRank = new Map<number, Node[]>()
  layouted.forEach(n => { const r = Math.round(n.position.y); byRank.set(r, [...(byRank.get(r) ?? []), n]) })
  const adjusted = new Map(layouted.map(n => [n.id, { ...n }]))
  byRank.forEach(rankNodes => {
    if (rankNodes.length < 2) return
    const sorted = [...rankNodes].sort((a, b) => a.position.x - b.position.x)
    let offset = 0
    for (let i = 1; i < sorted.length; i++) {
      if (parentOf.get(sorted[i - 1].id) !== parentOf.get(sorted[i].id)) offset += 50
      adjusted.get(sorted[i].id)!.position.x += offset
    }
  })
  return layouted.map(n => adjusted.get(n.id)!)
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const DIVISION_COLORS: Record<string, string> = {}
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#ef4444']
let colorIdx = 0
function getDivisionColor(division: string) {
  if (!division) return '#64748b'
  if (!DIVISION_COLORS[division]) DIVISION_COLORS[division] = PALETTE[colorIdx++ % PALETTE.length]
  return DIVISION_COLORS[division]
}

const TYPE_COLOR: Record<string, string> = { 'ארגון': '#a21caf', 'חטיבה': '#1e40af', 'מחלקה': '#6d28d9', 'תכנית': '#065f46' }
const TYPE_BG: Record<string, string> = { 'ארגון': '#fdf4ff', 'חטיבה': '#dbeafe', 'מחלקה': '#ede9fe', 'תכנית': '#d1fae5' }

// ─── Employee node ────────────────────────────────────────────────────────────

function EmployeeNode({ data }: NodeProps) {
  const { employee, hasChildren, isCollapsed, isRoot } = data as {
    employee: Employee; hasChildren: boolean; isCollapsed: boolean; isRoot: boolean
  }
  const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}` || '?'
  const divColor = getDivisionColor(employee.division)

  return (
    <div style={{
      width: EMP_W, background: '#fff', borderRadius: 12, position: 'relative',
      border: isRoot ? `2px solid ${divColor}` : '1.5px solid #e2e8f0',
      boxShadow: isRoot ? `0 4px 16px ${divColor}33` : '0 2px 8px #0000001a',
      fontFamily: 'inherit', direction: 'rtl', cursor: hasChildren ? 'pointer' : 'default',
    }}>
      <div style={{ height: 4, background: divColor, borderRadius: '10px 10px 0 0' }} />
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ padding: '8px 12px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          {employee.photo
            ? <img src={employee.photo} alt="" style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, objectFit: 'cover', border: `2px solid ${divColor}` }} />
            : <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: employee.gender === 'נקבה' ? '#ec4899' : divColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 12,
              }}>{initials}</div>
          }
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee.firstName} {employee.lastName}
            </div>
            {employee.employeeNumber && <div style={{ fontSize: 10, color: '#94a3b8' }}>{employee.employeeNumber}</div>}
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
      {hasChildren && (
        <div style={{
          position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 20, borderRadius: '50%', background: divColor, border: '2px solid #fff',
          color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10, lineHeight: 1, boxShadow: '0 2px 6px #0003', pointerEvents: 'none',
        }}>{isCollapsed ? '+' : '−'}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

// ─── Org Unit node ────────────────────────────────────────────────────────────

function UnitNode({ data }: NodeProps) {
  const { unit, managerName, hasChildren, isCollapsed } = data as {
    unit: OrgUnit; managerName: string; hasChildren: boolean; isCollapsed: boolean
  }
  const color = TYPE_COLOR[unit.type] ?? '#334155'
  const bg = TYPE_BG[unit.type] ?? '#f1f5f9'

  return (
    <div style={{
      width: UNIT_W, background: bg, borderRadius: 12, position: 'relative',
      border: `2px solid ${color}`, boxShadow: `0 3px 12px ${color}22`,
      fontFamily: 'inherit', direction: 'rtl', cursor: hasChildren ? 'pointer' : 'default',
    }}>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div style={{ padding: '10px 14px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            background: color, color: '#fff', borderRadius: 6, padding: '2px 8px',
            fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap',
          }}>{unit.type}</div>
          <div style={{ fontWeight: 700, fontSize: 14, color, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {unit.name}
          </div>
        </div>
        {managerName && (
          <div style={{ fontSize: 10, color: '#475569', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>👤</span><span>{managerName}</span>
          </div>
        )}
      </div>
      {hasChildren && (
        <div style={{
          position: 'absolute', bottom: -11, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 20, borderRadius: '50%', background: color, border: '2px solid #fff',
          color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 10, lineHeight: 1, boxShadow: '0 2px 6px #0003', pointerEvents: 'none',
        }}>{isCollapsed ? '+' : '−'}</div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  )
}

const nodeTypes = { employee: EmployeeNode, unit: UnitNode }

// ─── Mode 1: Manager tree ─────────────────────────────────────────────────────


function buildManagerElements(employees: Employee[], collapsed: Set<string>, onToggle: (id: string) => void) {
  const { findManager } = buildLookups(employees)
  const childrenOf = buildChildrenMap(employees, findManager)
  const empById = new Map(employees.map(e => [e.id, e]))
  const visible = new Set<string>()

  function visit(id: string) {
    visible.add(id)
    if (!collapsed.has(id)) (childrenOf.get(id) ?? []).forEach(visit)
  }
  employees.forEach(e => {
    const mgr = findManager(e.directManager)
    if (!mgr || mgr.id === e.id) visit(e.id)
  })

  const nodes: Node[] = []
  const edges: Edge[] = []
  const sizes = new Map<string, { w: number; h: number }>()

  visible.forEach(id => {
    const e = empById.get(id)!
    const hasChildren = (childrenOf.get(id) ?? []).length > 0
    const mgr = findManager(e.directManager)
    const isRoot = !mgr || mgr.id === e.id
    sizes.set(id, { w: EMP_W, h: EMP_H })
    nodes.push({
      id, type: 'employee', position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom, targetPosition: Position.Top,
      data: { employee: e, hasChildren, isCollapsed: collapsed.has(id), isRoot, onToggle },
    })
  })
  visible.forEach(id => {
    const e = empById.get(id)!
    const mgr = findManager(e.directManager)
    if (mgr && visible.has(mgr.id)) {
      edges.push({ id: `${mgr.id}→${id}`, source: mgr.id, target: id, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 1.5 } })
    }
  })
  return { nodes: applyDagreLayout(nodes, edges, sizes), edges }
}

// ─── Mode 2: Org unit tree ────────────────────────────────────────────────────

function buildOrgUnitElements(orgUnits: OrgUnit[], employees: Employee[], collapsed: Set<string>, onToggle: (id: string) => void) {
  const empByNumber = new Map(employees.map(e => [e.employeeNumber?.trim(), e]))
  function managerName(num: string) {
    if (!num) return ''
    const e = empByNumber.get(num.trim())
    return e ? `${e.firstName} ${e.lastName}`.trim() : num
  }

  // Build unit parent map: unit.name+type → unit
  const unitById = new Map(orgUnits.map(u => [u.id, u]))
  const childUnitsOf = new Map<string, string[]>()
  const unitRoots: string[] = []

  orgUnits.forEach(u => {
    if (!u.parentName) { unitRoots.push(u.id); return }
    const parent = orgUnits.find(p => p.name === u.parentName)
    if (parent) {
      const arr = childUnitsOf.get(parent.id) ?? []; arr.push(u.id); childUnitsOf.set(parent.id, arr)
    } else {
      unitRoots.push(u.id)
    }
  })

  const visible = new Set<string>()
  function visit(id: string) {
    visible.add(id)
    if (!collapsed.has(id)) (childUnitsOf.get(id) ?? []).forEach(visit)
  }
  unitRoots.forEach(visit)

  const nodes: Node[] = []
  const edges: Edge[] = []
  const sizes = new Map<string, { w: number; h: number }>()

  visible.forEach(id => {
    const u = unitById.get(id)!
    const hasChildren = (childUnitsOf.get(id) ?? []).length > 0
    sizes.set(id, { w: UNIT_W, h: UNIT_H })
    nodes.push({
      id, type: 'unit', position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom, targetPosition: Position.Top,
      data: { unit: u, managerName: managerName(u.managerEmployeeNumber), hasChildren, isCollapsed: collapsed.has(id), onToggle },
    })
  })
  visible.forEach(id => {
    const u = unitById.get(id)!
    if (!u.parentName) return
    const parent = orgUnits.find(p => p.name === u.parentName)
    if (parent && visible.has(parent.id))
      edges.push({ id: `${parent.id}→${id}`, source: parent.id, target: id, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 1.5 } })
  })
  return { nodes: applyDagreLayout(nodes, edges, sizes), edges }
}

// ─── Mode 3: Combined tree ────────────────────────────────────────────────────

function buildCombinedElements(orgUnits: OrgUnit[], employees: Employee[], collapsed: Set<string>, onToggle: (id: string) => void) {
  const empByNumber = new Map(employees.map(e => [e.employeeNumber?.trim(), e]))
  const { findManager } = buildLookups(employees)
  const empChildrenOf = buildChildrenMap(employees, findManager)

  function managerName(num: string) {
    if (!num) return ''
    const e = empByNumber.get(num.trim())
    return e ? `${e.firstName} ${e.lastName}`.trim() : num
  }

  // Unit hierarchy
  const childUnitsOf = new Map<string, string[]>()
  const unitRoots: string[] = []
  orgUnits.forEach(u => {
    if (!u.parentName) { unitRoots.push(u.id); return }
    const parent = orgUnits.find(p => p.name === u.parentName)
    if (parent) { const arr = childUnitsOf.get(parent.id) ?? []; arr.push(u.id); childUnitsOf.set(parent.id, arr) }
    else unitRoots.push(u.id)
  })

  // Map each employee to their most-specific org unit
  const unitByName = new Map(orgUnits.map(u => [`${u.type}::${u.name}`, u]))
  function homeUnitId(emp: Employee): string | null {
    if (emp.program?.trim()) { const u = unitByName.get(`תכנית::${emp.program.trim()}`); if (u) return u.id }
    if (emp.department?.trim()) { const u = unitByName.get(`מחלקה::${emp.department.trim()}`); if (u) return u.id }
    if (emp.division?.trim()) { const u = unitByName.get(`חטיבה::${emp.division.trim()}`); if (u) return u.id }
    return null
  }

  // Set of all employee IDs who are designated managers of any org unit
  // These employees appear ONLY through their unit node, never as direct reports
  const unitManagerEmpIds = new Set<string>()
  const empIdToManagedUnitId = new Map<string, string>()
  orgUnits.forEach(u => {
    if (!u.managerEmployeeNumber) return
    const mgr = empByNumber.get(u.managerEmployeeNumber.trim())
    if (mgr) { unitManagerEmpIds.add(mgr.id); empIdToManagedUnitId.set(mgr.id, u.id) }
  })

  // Root employees per unit: those whose direct manager is outside their unit
  // Exclude unit managers — they appear through their own unit node
  const empRootsOf = new Map<string, string[]>()
  employees.forEach(emp => {
    if (unitManagerEmpIds.has(emp.id)) return // skip: will appear as unit head
    const uid = homeUnitId(emp)
    if (!uid) return
    const mgr = findManager(emp.directManager)
    const mgrUnit = mgr ? homeUnitId(mgr) : null
    const isRootInUnit = !mgr || mgr.id === emp.id || mgrUnit !== uid
    if (isRootInUnit) {
      const arr = empRootsOf.get(uid) ?? []; arr.push(emp.id); empRootsOf.set(uid, arr)
    }
  })

  function hasUnitChildren(uid: string): boolean {
    return (childUnitsOf.get(uid) ?? []).length > 0 ||
      (empRootsOf.get(uid) ?? []).length > 0 ||
      !!orgUnits.find(u => u.id === uid && u.managerEmployeeNumber &&
        empByNumber.get(u.managerEmployeeNumber.trim()))
  }

  function isDescendantUnit(candidate: string | null, ancestor: string): boolean {
    if (!candidate) return false
    const u = orgUnits.find(u => u.id === candidate)
    if (!u || !u.parentName) return false
    const parent = orgUnits.find(p => p.name === u.parentName)
    if (!parent) return false
    return parent.id === ancestor || isDescendantUnit(parent.id, ancestor)
  }

  // Visibility traversal
  const visibleUnits = new Set<string>()
  const visibleEmps = new Set<string>()

  function visitUnit(uid: string) {
    visibleUnits.add(uid)
    if (collapsed.has(uid)) return
    const u = orgUnits.find(o => o.id === uid)
    const mgr = u?.managerEmployeeNumber ? empByNumber.get(u.managerEmployeeNumber.trim()) : null
    if (mgr) {
      // Always show the manager below the unit
      visibleEmps.add(mgr.id)
      // Only reveal sub-content (child units + emp roots) once the manager is also expanded
      if (!collapsed.has(`emp::${mgr.id}`)) {
        visitEmp(mgr.id, uid) // also visits manager's direct reports in this unit
        ;(childUnitsOf.get(uid) ?? []).forEach(visitUnit)
        ;(empRootsOf.get(uid) ?? []).forEach(eid => visitEmp(eid, uid))
      }
    } else {
      ;(childUnitsOf.get(uid) ?? []).forEach(visitUnit)
      ;(empRootsOf.get(uid) ?? []).forEach(eid => visitEmp(eid, uid))
    }
  }

  function visitEmp(eid: string, unitId: string) {
    visibleEmps.add(eid)
    if (collapsed.has(`emp::${eid}`)) return
    ;(empChildrenOf.get(eid) ?? []).forEach(childId => {
      // Skip children who manage any org unit — they appear through their unit
      if (unitManagerEmpIds.has(childId)) return
      const childUnitId = homeUnitId(employees.find(e => e.id === childId)!)
      if (childUnitId === unitId || isDescendantUnit(childUnitId, unitId)) {
        visitEmp(childId, unitId)
      }
    })
  }

  unitRoots.forEach(visitUnit)

  const nodes: Node[] = []
  const edges: Edge[] = []
  const sizes = new Map<string, { w: number; h: number }>()
  const empById = new Map(employees.map(e => [e.id, e]))

  visibleUnits.forEach(uid => {
    const u = orgUnits.find(o => o.id === uid)!
    sizes.set(uid, { w: UNIT_W, h: UNIT_H })
    nodes.push({
      id: uid, type: 'unit', position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom, targetPosition: Position.Top,
      data: { unit: u, managerName: managerName(u.managerEmployeeNumber), hasChildren: hasUnitChildren(uid), isCollapsed: collapsed.has(uid), onToggle: (id: string) => onToggle(id) },
    })
  })

  visibleEmps.forEach(eid => {
    const e = empById.get(eid)!
    const nodeId = `emp::${eid}`
    // For unit managers: children = managed unit's sub-units + emp roots + own non-manager direct reports
    // For regular emps: children = direct reports who are not unit managers
    const managedUid = empIdToManagedUnitId.get(eid)
    const actualHasChildren = managedUid
      ? (childUnitsOf.get(managedUid) ?? []).length > 0 ||
        (empRootsOf.get(managedUid) ?? []).length > 0 ||
        (empChildrenOf.get(eid) ?? []).some(cid => !unitManagerEmpIds.has(cid))
      : (empChildrenOf.get(eid) ?? []).some(cid => !unitManagerEmpIds.has(cid))
    sizes.set(nodeId, { w: EMP_W, h: EMP_H })
    nodes.push({
      id: nodeId, type: 'employee', position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom, targetPosition: Position.Top,
      data: { employee: e, hasChildren: actualHasChildren, isCollapsed: collapsed.has(nodeId), isRoot: false, onToggle: (id: string) => onToggle(id) },
    })
  })

  // Build unit→manager map for edge routing
  const unitMgrEmpId = new Map<string, string>()
  orgUnits.forEach(u => {
    if (!u.managerEmployeeNumber) return
    const mgr = empByNumber.get(u.managerEmployeeNumber.trim())
    if (mgr && visibleEmps.has(mgr.id)) unitMgrEmpId.set(u.id, mgr.id)
  })

  // Edges
  visibleUnits.forEach(uid => {
    if (collapsed.has(uid)) return
    const mgrId = unitMgrEmpId.get(uid)

    if (mgrId) {
      // unit → manager
      edges.push({ id: `u${uid}→mgr${mgrId}`, source: uid, target: `emp::${mgrId}`, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 1.5 } })
      if (!collapsed.has(`emp::${mgrId}`)) {
        // manager → child units
        ;(childUnitsOf.get(uid) ?? []).forEach(childUid => {
          if (visibleUnits.has(childUid))
            edges.push({ id: `mgr${mgrId}→u${childUid}`, source: `emp::${mgrId}`, target: childUid, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 1.5 } })
        })
        // manager → root employees (not unit managers)
        ;(empRootsOf.get(uid) ?? []).forEach(eid => {
          if (visibleEmps.has(eid))
            edges.push({ id: `mgr${mgrId}→e${eid}`, source: `emp::${mgrId}`, target: `emp::${eid}`, type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 1.5 } })
        })
      }
    } else {
      // No manager: unit → child units + root employees directly
      ;(childUnitsOf.get(uid) ?? []).forEach(childUid => {
        if (visibleUnits.has(childUid))
          edges.push({ id: `u${uid}→u${childUid}`, source: uid, target: childUid, type: 'smoothstep', style: { stroke: '#94a3b8', strokeWidth: 1.5 } })
      })
      ;(empRootsOf.get(uid) ?? []).forEach(eid => {
        if (visibleEmps.has(eid))
          edges.push({ id: `u${uid}→e${eid}`, source: uid, target: `emp::${eid}`, type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 1.5 } })
      })
    }
  })

  // Employee → direct reports (skip unit managers — they connect through their unit)
  visibleEmps.forEach(eid => {
    if (!collapsed.has(`emp::${eid}`)) {
      ;(empChildrenOf.get(eid) ?? []).forEach(cid => {
        if (visibleEmps.has(cid) && !unitManagerEmpIds.has(cid))
          edges.push({ id: `e${eid}→e${cid}`, source: `emp::${eid}`, target: `emp::${cid}`, type: 'smoothstep', style: { stroke: '#cbd5e1', strokeWidth: 1.5 } })
      })
    }
  })

  return { nodes: applyDagreLayout(nodes, edges, sizes), edges }
}

// ─── Default collapsed per mode ───────────────────────────────────────────────

function computeDefaultCollapsed(employees: Employee[], orgUnits: OrgUnit[], mode: TreeMode): Set<string> {
  const result = new Set<string>()
  if (mode === 'manager') {
    const { findManager } = buildLookups(employees)
    const childrenOf = buildChildrenMap(employees, findManager)
    employees.forEach(e => {
      const mgr = findManager(e.directManager)
      const isRoot = !mgr || mgr.id === e.id
      if (!isRoot && (childrenOf.get(e.id) ?? []).length > 0) result.add(e.id)
    })
  } else if (mode === 'orgunit') {
    const childUnitsOf = new Map<string, string[]>()
    orgUnits.forEach(u => {
      const parent = orgUnits.find(p => p.name === u.parentName)
      if (parent) { const arr = childUnitsOf.get(parent.id) ?? []; arr.push(u.id); childUnitsOf.set(parent.id, arr) }
    })
    orgUnits.forEach(u => {
      if (u.parentName && (childUnitsOf.get(u.id) ?? []).length > 0) result.add(u.id)
    })
  } else {
    // combined: collapse all non-root units, all emp nodes with children
    const childUnitsOf = new Map<string, string[]>()
    orgUnits.forEach(u => {
      const parent = orgUnits.find(p => p.name === u.parentName)
      if (parent) { const arr = childUnitsOf.get(parent.id) ?? []; arr.push(u.id); childUnitsOf.set(parent.id, arr) }
    })
    orgUnits.forEach(u => {
      if (u.parentName) result.add(u.id)
    })
    const { findManager } = buildLookups(employees)
    const empChildrenOf = buildChildrenMap(employees, findManager)
    employees.forEach(e => {
      if ((empChildrenOf.get(e.id) ?? []).length > 0) result.add(`emp::${e.id}`)
    })
  }
  return result
}

// ─── FlowPanel ────────────────────────────────────────────────────────────────

function FlowPanel({ onExpandAll, onCollapseAll, nodes, anchorRef }: {
  onExpandAll: () => void; onCollapseAll: () => void
  nodes: Node[]; anchorRef: React.MutableRefObject<{ id: string; x: number; y: number } | null>
}) {
  const { fitView, getViewport, setViewport } = useReactFlow()
  useEffect(() => { const t = setTimeout(() => fitView({ padding: 0.15 }), 100); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (!anchorRef.current) return
    const { id, x: oldX, y: oldY } = anchorRef.current; anchorRef.current = null
    const newNode = nodes.find(n => n.id === id)
    if (!newNode) return
    const vp = getViewport()
    setViewport({ x: vp.x + (oldX - newNode.position.x) * vp.zoom, y: vp.y + (oldY - newNode.position.y) * vp.zoom, zoom: vp.zoom })
  }, [nodes])

  return (
    <Panel position="top-left">
      <div style={{ display: 'flex', gap: 6, direction: 'rtl' }}>
        <button onClick={() => { onExpandAll(); setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50) }} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#3b82f6', boxShadow: '0 1px 4px #0001', fontFamily: 'inherit',
        }}>פתח הכל</button>
        <button onClick={() => { onCollapseAll(); setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50) }} style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px',
          fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748b', boxShadow: '0 1px 4px #0001', fontFamily: 'inherit',
        }}>סגור הכל</button>
      </div>
    </Panel>
  )
}

// ─── Selected node type (exported for parent components) ─────────────────────

export type SelectedNode =
  | { kind: 'employee'; employee: Employee }
  | { kind: 'unit'; unit: OrgUnit; managerName: string }

// ─── Main component ───────────────────────────────────────────────────────────

export default function OrgTreeFlow({ employees, orgUnits = [], mode = 'manager', onSelect }: {
  employees: Employee[]
  orgUnits?: OrgUnit[]
  mode?: TreeMode
  onSelect?: (node: SelectedNode) => void
}) {
  const employeesRef = useRef(employees)
  employeesRef.current = employees
  const orgUnitsRef = useRef(orgUnits)
  orgUnitsRef.current = orgUnits

  const defaultCollapsed = useMemo(() => computeDefaultCollapsed(employees, orgUnits, mode), [employees, orgUnits, mode])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => computeDefaultCollapsed(employees, orgUnits, mode))

  // Reset on mode or data change
  const prevKeyRef = useRef('')
  const key = `${mode}-${employees.length}-${orgUnits.length}`
  if (prevKeyRef.current !== key) { prevKeyRef.current = key; setCollapsed(computeDefaultCollapsed(employees, orgUnits, mode)) }

  const nodesRef = useRef<Node[]>([])
  const anchorRef = useRef<{ id: string; x: number; y: number } | null>(null)

  const onToggle = useCallback((id: string) => {
    const node = nodesRef.current.find(n => n.id === id)
    if (node) anchorRef.current = { id, x: node.position.x, y: node.position.y }

    setCollapsed(prev => {
      const emps = employeesRef.current
      const units = orgUnitsRef.current
      const { findManager } = buildLookups(emps)
      const empChildrenOf = buildChildrenMap(emps, findManager)
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        // Reset descendants
        function resetEmpDescendants(eid: string) {
          ;(empChildrenOf.get(eid) ?? []).forEach(cid => {
            const cNodeId = mode === 'combined' ? `emp::${cid}` : cid
            if ((empChildrenOf.get(cid) ?? []).length > 0) next.add(cNodeId)
            else next.delete(cNodeId)
            resetEmpDescendants(cid)
          })
        }
        // For unit nodes
        if (mode !== 'manager') {
          const childUnitsOf = new Map<string, string[]>()
          units.forEach(u => {
            const parent = units.find(p => p.name === u.parentName)
            if (parent) { const arr = childUnitsOf.get(parent.id) ?? []; arr.push(u.id); childUnitsOf.set(parent.id, arr) }
          })
          function resetUnitDescendants(uid: string) {
            ;(childUnitsOf.get(uid) ?? []).forEach(cuid => { next.add(cuid); resetUnitDescendants(cuid) })
          }
          if (!id.startsWith('emp::')) resetUnitDescendants(id)
        }
        // For employee nodes
        const empId = id.startsWith('emp::') ? id.slice(5) : id
        resetEmpDescendants(empId)
      }
      return next
    })
  }, [mode])

  const expandAll = useCallback(() => setCollapsed(new Set()), [])
  const collapseAll = useCallback(() => setCollapsed(defaultCollapsed), [defaultCollapsed])

  const { nodes, edges } = useMemo(() => {
    if (mode === 'manager') return buildManagerElements(employees, collapsed, onToggle)
    if (mode === 'orgunit') return buildOrgUnitElements(orgUnits, employees, collapsed, onToggle)
    return buildCombinedElements(orgUnits, employees, collapsed, onToggle)
  }, [employees, orgUnits, mode, collapsed, onToggle])

  nodesRef.current = nodes

  if (employees.length === 0 && orgUnits.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: 12 }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
        <p style={{ fontSize: 18, fontWeight: 500, margin: 0 }}>אין נתונים להצגה</p>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes}
        minZoom={0.05} maxZoom={2}
        nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
        onNodeClick={(_e, node) => {
          const d = node.data as any
          if (d.hasChildren) onToggle(node.id)
          if (onSelect) {
            if (d.employee) onSelect({ kind: 'employee', employee: d.employee })
            else if (d.unit) onSelect({ kind: 'unit', unit: d.unit, managerName: d.managerName ?? '' })
          }
        }}
      >
        <FlowPanel onExpandAll={expandAll} onCollapseAll={collapseAll} nodes={nodes} anchorRef={anchorRef} />
        <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#cbd5e1" />
        <Controls showInteractive={false} position="bottom-left" />
      </ReactFlow>
    </div>
  )
}
