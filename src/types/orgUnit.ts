export interface OrgUnit {
  id: string
  name: string
  type: 'ארגון' | 'חטיבה' | 'מחלקה' | 'תכנית'
  parentName: string
  managerEmployeeNumber: string
}
