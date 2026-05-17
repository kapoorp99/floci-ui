import type {
    CloudDescriptor,
    CloudProvider,
    CloudResource,
    CloudServiceDescriptor,
    CloudServiceType,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'
import {storageSchemaFor} from '../cloud-spi/storageSchema'
import {CloudAdapterRegistry} from '../registry/CloudAdapterRegistry'

export class CloudProxyService {
    constructor(private readonly registry: CloudAdapterRegistry) {}

    clouds(): CloudDescriptor[] {
        return [
            {id: 'aws', displayName: 'AWS', availability: 'available'},
            {id: 'azure', displayName: 'Azure', availability: 'available'},
            {id: 'gcp', displayName: 'GCP Coming Soon', availability: 'coming_soon'},
        ]
    }

    services(cloud: CloudProvider): CloudServiceDescriptor[] {
        if (cloud === 'gcp') {
            return [{cloud, service: 'storage', displayName: 'Storage Coming Soon', availability: 'coming_soon'}]
        }

        return [{
            cloud,
            service: 'storage',
            displayName: cloud === 'aws' ? 'S3 Storage' : 'Azure Blob Storage',
            availability: this.registry.get(cloud, 'storage') ? 'available' : 'coming_soon',
        }]
    }

    schema(cloud: CloudProvider, service: CloudServiceType): ServiceSchema | null {
        const adapter = this.registry.get(cloud, service)
        if (adapter) return adapter.schema()
        return storageSchemaFor(cloud)
    }

    async listResources(cloud: CloudProvider, service: CloudServiceType, query: ResourceQuery): Promise<CloudResource[]> {
        return this.requireAdapter(cloud, service).list(query)
    }

    async getResource(cloud: CloudProvider, service: CloudServiceType, id: string): Promise<CloudResource | null> {
        return this.requireAdapter(cloud, service).get(id)
    }

    async createResource(cloud: CloudProvider, service: CloudServiceType, input: CreateResourceInput): Promise<CloudResource> {
        return this.requireAdapter(cloud, service).create(input)
    }

    async deleteResource(cloud: CloudProvider, service: CloudServiceType, id: string): Promise<void> {
        await this.requireAdapter(cloud, service).delete(id)
    }

    private requireAdapter(cloud: CloudProvider, service: CloudServiceType) {
        const adapter = this.registry.get(cloud, service)
        if (!adapter) throw new Error(`No adapter registered for ${cloud}/${service}`)
        return adapter
    }
}
