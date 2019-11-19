import { ClassTableForeignKey } from './class-table-foreign'
import { ClassTablePropertyEnumType } from './class-table-property-enum-type';

export interface ClassTableProperty {
  name: string
  columnName: string
  description: string
  type: string
  enumType: ClassTablePropertyEnumType
  isForeignKey: boolean
  isPrimaryKey: boolean
  isRequired: boolean
  hasChangeMethod: boolean
  foreign: ClassTableForeignKey
}
