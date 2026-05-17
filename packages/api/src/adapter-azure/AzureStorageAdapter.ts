import {azureStorageSchema} from '../cloud-spi/storageSchema'
import type {CloudResource, CloudServiceAdapter, CreateResourceInput, ResourceQuery, ServiceSchema} from '../cloud-spi/types'

export interface AzureEndpointProperties {
    endpoint: string
}

export class AzureStorageAdapter implements CloudServiceAdapter {
    readonly cloud = 'azure' as const
    readonly service = 'storage' as const

    constructor(private readonly props: AzureEndpointProperties) {}

    schema(): ServiceSchema {
        return azureStorageSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const xml = await this.azureFetch('/?comp=list', {method: 'GET'}).then((res) => res.text())
        return filterBySearch(parseContainers(xml), query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const resources = await this.list()
        return resources.find((resource) => resource.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const containerName = stringValue(input.values.containerName)
        if (!containerName) throw new Error('containerName is required')

        await this.azureFetch(`/${encodeURIComponent(containerName)}?restype=container`, {method: 'PUT'})
        return normalizeContainer(containerName, null)
    }

    async delete(id: string): Promise<void> {
        await this.azureFetch(`/${encodeURIComponent(id)}?restype=container`, {method: 'DELETE'})
    }

    private async azureFetch(path: string, init: RequestInit): Promise<Response> {
        const res = await fetch(`${this.props.endpoint}${path}`, {
            ...init,
            headers: {
                'x-ms-version': '2021-12-02',
                ...(init.headers ?? {}),
            },
        })

        if (!res.ok) {
            throw new Error(`Azure Blob request failed: HTTP ${res.status}`)
        }

        return res
    }
}

function parseContainers(xml: string): CloudResource[] {
    const matches = xml.matchAll(/<Container>\s*<Name>([^<]+)<\/Name>[\s\S]*?(?:<Last-Modified>([^<]+)<\/Last-Modified>)?[\s\S]*?<\/Container>/g)
    return [...matches].map((match) => normalizeContainer(decodeXml(match[1]), match[2] ? decodeXml(match[2]) : null))
}

function normalizeContainer(name: string, createdAt: string | null): CloudResource {
    return {
        id: name,
        name,
        cloud: 'azure',
        service: 'storage',
        type: 'container',
        region: null,
        createdAt,
        metadata: {},
    }
}

function stringValue(value: unknown): string {
    return typeof value === 'string' ? value.trim() : ''
}

function filterBySearch(resources: CloudResource[], search?: string): CloudResource[] {
    const normalized = search?.trim().toLowerCase()
    if (!normalized) return resources
    return resources.filter((resource) => resource.name.toLowerCase().includes(normalized))
}

function decodeXml(value: string): string {
    return value
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}
