import { ClassTableProperty } from "./class-table-property";

export interface ClassTable {
    name: string;
    tableName: string;
    properties: Array<ClassTableProperty>;
}