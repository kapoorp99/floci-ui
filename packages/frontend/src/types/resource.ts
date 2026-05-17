import type {CloudProvider, CloudServiceType} from './cloud'

export interface CloudResource {
    id: string
    name: string
    cloud: Exclude<CloudProvider, 'gcp'>
    service: CloudServiceType
    type: 'bucket' | 'container'
    region: string | null
    createdAt: string | null
    metadata: Record<string, unknown>
}
