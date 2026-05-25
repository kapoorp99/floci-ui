import type {FieldSchema, ServiceSchema, TableColumnSchema} from './types'

const computeColumns: TableColumnSchema[] = [
    {name: 'name', label: 'Name'},
    {name: 'type', label: 'Type'},
    {name: 'status', label: 'State'},
    {name: 'region', label: 'AZ'},
    {name: 'createdAt', label: 'Created'},
]

const computeFilters: FieldSchema[] = [
    {name: 'search', label: 'Search', type: 'text', required: false},
]

export function awsComputeSchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'compute',
        displayName: 'Compute',
        fields: [],
        actions: ['list', 'inspect', 'delete'],
        filters: computeFilters,
        columns: computeColumns,
        capabilities: {
            resourceActions: [
                {name: 'list',    label: 'List',            enabled: true,  status: 'available',    runtimeRequired: true},
                {name: 'inspect', label: 'Inspect',         enabled: true,  status: 'available',    runtimeRequired: true},
                {name: 'delete',  label: 'Terminate',       enabled: true,  status: 'available',    runtimeRequired: true},
                {name: 'create',  label: 'Launch instance', enabled: false, status: 'coming_soon',
                    reason: 'Requires cascading VPC → Subnet → SG selectors not yet supported by the generic adapter form.'},
            ],
        },
    }
}
