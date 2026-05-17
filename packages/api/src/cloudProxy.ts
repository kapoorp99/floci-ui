import {CloudAdapterRegistry} from './registry/CloudAdapterRegistry'
import {AwsStorageAdapter} from './adapter-aws/AwsStorageAdapter'
import {AzureStorageAdapter} from './adapter-azure/AzureStorageAdapter'
import {CloudProxyService} from './service/CloudProxyService'

export function createCloudProxyService(): CloudProxyService {
    const azureEndpoint = process.env.FLOCI_AZURE_ENDPOINT ?? process.env.FLOCI_AZ_ENDPOINT ?? 'http://localhost:4577'
    const registry = new CloudAdapterRegistry([
        new AwsStorageAdapter(),
        new AzureStorageAdapter({endpoint: azureEndpoint}),
    ])

    return new CloudProxyService(registry)
}
