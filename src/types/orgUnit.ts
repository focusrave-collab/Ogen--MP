export interface OrgUnit {
  id: string
  name: string
  type: 'חטיבה' | 'מחלקה' | 'תכנית'
  parentName: string
  managerEmployeeNumber: string
}
