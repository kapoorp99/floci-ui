import type {CloudProvider, FieldSchema, ServiceSchema, TableColumnSchema} from './types'

const storageColumns: TableColumnSchema[] = [
    {name: 'name', label: 'Name'},
    {name: 'type', label: 'Type'},
    {name: 'cloud', label: 'Cloud'},
    {name: 'region', label: 'Region'},
    {name: 'createdAt', label: 'Created At'},
]

const storageFilters: FieldSchema[] = [
    {name: 'search', label: 'Search', type: 'text', required: false},
]

export function awsStorageSchema(): ServiceSchema {
    return {
        cloud: 'aws',
        service: 'storage',
        displayName: 'S3 Storage',
        fields: [
            {name: 'bucketName', label: 'Bucket Name', type: 'text', required: true},
            {
                name: 'region',
                label: 'Region',
                type: 'select',
                required: false,
                options: [
                    {label: 'US East (N. Virginia)', value: 'us-east-1'},
                    {label: 'US West (Oregon)', value: 'us-west-2'},
                ],
            },
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        filters: storageFilters,
        columns: storageColumns,
    }
}

export function azureStorageSchema(): ServiceSchema {
    return {
        cloud: 'azure',
        service: 'storage',
        displayName: 'Azure Blob Storage',
        fields: [
            {name: 'containerName', label: 'Container Name', type: 'text', required: true},
        ],
        actions: ['list', 'create', 'delete', 'inspect'],
        filters: storageFilters,
        columns: storageColumns,
    }
}

export function storageSchemaFor(cloud: CloudProvider): ServiceSchema | null {
    if (cloud === 'aws') return awsStorageSchema()
    if (cloud === 'azure') return azureStorageSchema()
    return null
}
