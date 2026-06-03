import {ListFunctionsCommand, GetFunctionCommand} from '@aws-sdk/client-lambda'
import {awsServerlessSchema} from '../cloud-spi/serverlessSchema'
import type {
    CloudResource,
    CloudServiceAdapter,
    CreateResourceInput,
    ResourceQuery,
    ServiceSchema,
} from '../cloud-spi/types'
import {lambda} from '../aws'

export class AwsServerlessAdapter implements CloudServiceAdapter {
    readonly cloud = 'aws' as const
    readonly service = 'serverless' as const

    schema(): ServiceSchema {
        return awsServerlessSchema()
    }

    async list(query: ResourceQuery = {}): Promise<CloudResource[]> {
        const res = await lambda.send(new ListFunctionsCommand({}))
        const resources: CloudResource[] = (res.Functions ?? []).map((fn) => ({
            id: fn.FunctionName ?? fn.FunctionArn ?? '',
            name: fn.FunctionName ?? '',
            cloud: 'aws' as const,
            service: 'serverless' as const,
            type: 'lambda',
            region: null,
            createdAt: null,
            status: fn.State ?? null,
            metadata: {
                arn: fn.FunctionArn,
                runtime: fn.Runtime,
                handler: fn.Handler,
                lastModified: fn.LastModified,
                memorySize: fn.MemorySize,
                timeout: fn.Timeout,
                codeSize: fn.CodeSize,
                packageType: fn.PackageType,
                description: fn.Description,
            },
        }))

        return filterBySearch(resources, query.search)
    }

    async get(id: string): Promise<CloudResource | null> {
        try {
            const res = await lambda.send(new GetFunctionCommand({FunctionName: id}))
            const config = res.Configuration

            if (!config) return null

            return {
                id: config.FunctionName ?? config.FunctionArn ?? id,
                name: config.FunctionName ?? id,
                cloud: 'aws',
                service: 'serverless',
                type: 'lambda',
                region: null,
                createdAt: null,
                status: config.State ?? null,
                metadata: {
                    arn: config.FunctionArn,
                    runtime: config.Runtime,
                    handler: config.Handler,
                    lastModified: config.LastModified,
                    memorySize: config.MemorySize,
                    timeout: config.Timeout,
                    codeSize: config.CodeSize,
                    packageType: config.PackageType,
                    description: config.Description,
                    role: config.Role,
                    version: config.Version,
                    codeSha256: config.CodeSha256,
                },
            }
        } catch (error) {
            if (hasHttpStatus(error, 404)) return null
            throw error
        }
    }

    async create(_input: CreateResourceInput): Promise<CloudResource> {
        throw new Error('Creating Lambda functions through the unified serverless adapter is not implemented yet')
    }

    async delete(_id: string): Promise<void> {
        throw new Error('Deleting Lambda functions through the unified serverless adapter is not implemented yet')
    }
}

function filterBySearch(resources: CloudResource[], search?: string): CloudResource[] {
    const normalized = search?.trim().toLowerCase()
    if (!normalized) return resources
    return resources.filter((r) => r.name.toLowerCase().includes(normalized))
}

function hasHttpStatus(error: unknown, status: number): boolean {
    if (typeof error !== 'object' || error === null) return false
    const metadata = (error as {$metadata?: {httpStatusCode?: number}}).$metadata
    return metadata?.httpStatusCode === status
}