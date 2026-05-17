import {CreateBucketCommand, DeleteBucketCommand, ListBucketsCommand} from '@aws-sdk/client-s3'
import {s3} from '../aws'
import {awsStorageSchema} from '../cloud-spi/storageSchema'
import type {CloudResource, CloudServiceAdapter, CreateResourceInput, ResourceQuery, ServiceSchema} from '../cloud-spi/types'

export class AwsStorageAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'storage' as const

    schema(): ServiceSchema {
        return awsStorageSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const res = await s3.send(new ListBucketsCommand({}))
        const resources = (res.Buckets ?? []).map((bucket): CloudResource => ({
            id: bucket.Name ?? '',
            name: bucket.Name ?? '',
            cloud: 'aws',
            service: 'storage',
            type: 'bucket',
            region: null,
            createdAt: bucket.CreationDate?.toISOString() ?? null,
            metadata: {},
        }))

        return filterBySearch(resources, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        const resources = await this.list()
        return resources.find((resource) => resource.id === id) ?? null
    }

    async create(input: CreateResourceInput): Promise<CloudResource> {
        const bucketName = stringValue(input.values.bucketName)
        if (!bucketName) throw new Error('bucketName is required')

        await s3.send(new CreateBucketCommand({Bucket: bucketName}))
        return {
            id: bucketName,
            name: bucketName,
            cloud: 'aws',
            service: 'storage',
            type: 'bucket',
            region: stringValue(input.values.region) || null,
            createdAt: null,
            metadata: {},
        }
    }

    async delete(id: string): Promise<void> {
        await s3.send(new DeleteBucketCommand({Bucket: id}))
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
