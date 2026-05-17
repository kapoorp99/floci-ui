export type CloudProvider = 'aws' | 'azure' | 'gcp'

export type CloudServiceType = 'storage'

export type CloudAvailability = 'available' | 'coming_soon'

export interface CloudDescriptor {
    id: CloudProvider
    displayName: string
    availability: CloudAvailability
}

export interface CloudServiceDescriptor {
    cloud: CloudProvider
    service: CloudServiceType
    displayName: string
    availability: CloudAvailability
}

export type FieldType = 'text' | 'select'

export interface FieldSchema {
    name: string
    label: string
    type: FieldType
    required: boolean
    options?: Array<{label: string; value: string}>
}

export type ActionSchema = 'list' | 'create' | 'delete' | 'inspect'

export interface TableColumnSchema {
    name: string
    label: string
}

export interface ServiceSchema {
    cloud: CloudProvider
    service: CloudServiceType
    displayName: string
    fields: FieldSchema[]
    actions: ActionSchema[]
    filters: FieldSchema[]
    columns: TableColumnSchema[]
}

export interface CloudResource {
    id: string
    name: string
    cloud: Extract<CloudProvider, 'aws' | 'azure'>
    service: CloudServiceType
    type: 'bucket' | 'container'
    region: string | null
    createdAt: string | null
    metadata: Record<string, unknown>
}

export interface ResourceQuery {
    search?: string
}

export interface CreateResourceInput {
    values: Record<string, unknown>
}

export interface CloudServiceAdapter {
    readonly cloud: Extract<CloudProvider, 'aws' | 'azure'>
    readonly service: CloudServiceType
    schema(): ServiceSchema
    list(query?: ResourceQuery): Promise<CloudResource[]>
    get(id: string): Promise<CloudResource | null>
    create(input: CreateResourceInput): Promise<CloudResource>
    delete(id: string): Promise<void>
}
