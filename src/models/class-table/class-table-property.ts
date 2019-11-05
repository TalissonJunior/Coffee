import { ClassTablePropertyType } from "./class-table-property-type";

export interface ClassTableProperty {
    name: string;
    columnName: string;
    description: string;
    type: ClassTablePropertyType;
    isForeignKey: boolean;
    isPrimaryKey: boolean;
    isRequired: boolean;
    hasChangeMethod: boolean;
}