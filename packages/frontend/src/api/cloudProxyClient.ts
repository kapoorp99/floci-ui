import {apiDelete, apiGet, apiPost} from './floci-client'
import type {CloudDescriptor, CloudProvider, CloudServiceDescriptor, CloudServiceType} from '@/types/cloud'
import type {CloudResource} from '@/types/resource'
import type {ServiceSchema} from '@/types/schema'

export function listClouds(signal?: AbortSignal): Promise<CloudDescriptor[]> {
    return apiGet('/clouds', 'cloud-proxy', signal)
}

export function listCloudServices(cloud: CloudProvider, signal?: AbortSignal): Promise<CloudServiceDescriptor[]> {
    return apiGet(`/clouds/${cloud}/services`, 'cloud-proxy', signal)
}

export function getServiceSchema(cloud: CloudProvider, service: CloudServiceType, signal?: AbortSignal): Promise<ServiceSchema> {
    return apiGet(`/clouds/${cloud}/services/${service}/schema`, 'cloud-proxy', signal)
}

export function listCloudResources(
    cloud: CloudProvider,
    service: CloudServiceType,
    search?: string,
    signal?: AbortSignal,
): Promise<CloudResource[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiGet(`/clouds/${cloud}/services/${service}/resources${qs}`, 'cloud-proxy', signal)
}

export function getCloudResource(
    cloud: CloudProvider,
    service: CloudServiceType,
    id: string,
    signal?: AbortSignal,
): Promise<CloudResource> {
    return apiGet(`/clouds/${cloud}/services/${service}/resources/${encodeURIComponent(id)}`, 'cloud-proxy', signal)
}

export function createCloudResource(
    cloud: CloudProvider,
    service: CloudServiceType,
    values: Record<string, unknown>,
    signal?: AbortSignal,
): Promise<CloudResource> {
    return apiPost(`/clouds/${cloud}/services/${service}/resources`, 'cloud-proxy', values, signal)
}

export function deleteCloudResource(cloud: CloudProvider, service: CloudServiceType, id: string, signal?: AbortSignal): Promise<void> {
    return apiDelete(`/clouds/${cloud}/services/${service}/resources/${encodeURIComponent(id)}`, 'cloud-proxy', signal)
}
