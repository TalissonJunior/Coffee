import { ClassTableForeignKey } from './class-table-foreign'

export interface ClassTableProperty {
  name: string
  columnName: string
  description: string
  type: string
  isForeignKey: boolean
  isPrimaryKey: boolean
  isRequired: boolean
  hasChangeMethod: boolean
  foreign: ClassTableForeignKey
}
