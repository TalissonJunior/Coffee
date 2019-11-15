import { ClassTableProperty } from './class-table-property'

export interface ClassTable {
  name: string
  tableName: string
  properties: Array<ClassTableProperty>
  isMiddleTable: boolean
  hasRelations: boolean
  tableRelations: Array<ClassTable>
  // Used on context to create relations
  firstMiddleTablePropety: ClassTableProperty
  secondMiddleTablePropety: ClassTableProperty
}
