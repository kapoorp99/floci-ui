import {Hono} from 'hono'
import type {CloudProvider, CloudServiceType} from '../cloud-spi/types'
import {createCloudProxyService} from '../cloudProxy'
import {CloudProxyService} from '../service/CloudProxyService'

export function createCloudRoutes(service: CloudProxyService = createCloudProxyService()) {
    const app = new Hono()

    app.get('/', (c) => c.json(service.clouds()))

    app.get('/:cloud/services', (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        if (!isCloudProvider(cloud)) return c.json({error: 'Unknown cloud'}, 404)
        return c.json(service.services(cloud))
    })

    app.get('/:cloud/services/:service/schema', (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        const serviceType = c.req.param('service') as CloudServiceType
        if (!isCloudProvider(cloud) || !isServiceType(serviceType)) return c.json({error: 'Unknown cloud or service'}, 404)

        const schema = service.schema(cloud, serviceType)
        if (!schema || service.services(cloud).find((item) => item.service === serviceType)?.availability !== 'available') {
            return c.json({error: 'Schema not available'}, 404)
        }

        return c.json(schema)
    })

    app.get('/:cloud/services/:service/resources', async (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        const serviceType = c.req.param('service') as CloudServiceType
        if (!isCloudProvider(cloud) || !isServiceType(serviceType)) return c.json({error: 'Unknown cloud or service'}, 404)

        const resources = await service.listResources(cloud, serviceType, {search: c.req.query('search')})
        return c.json(resources)
    })

    app.get('/:cloud/services/:service/resources/:id', async (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        const serviceType = c.req.param('service') as CloudServiceType
        if (!isCloudProvider(cloud) || !isServiceType(serviceType)) return c.json({error: 'Unknown cloud or service'}, 404)

        const resource = await service.getResource(cloud, serviceType, c.req.param('id'))
        if (!resource) return c.json({error: 'Resource not found'}, 404)
        return c.json(resource)
    })

    app.post('/:cloud/services/:service/resources', async (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        const serviceType = c.req.param('service') as CloudServiceType
        if (!isCloudProvider(cloud) || !isServiceType(serviceType)) return c.json({error: 'Unknown cloud or service'}, 404)

        const values = await c.req.json<Record<string, unknown>>()
        const resource = await service.createResource(cloud, serviceType, {values})
        return c.json(resource, 201)
    })

    app.delete('/:cloud/services/:service/resources/:id', async (c) => {
        const cloud = c.req.param('cloud') as CloudProvider
        const serviceType = c.req.param('service') as CloudServiceType
        if (!isCloudProvider(cloud) || !isServiceType(serviceType)) return c.json({error: 'Unknown cloud or service'}, 404)

        await service.deleteResource(cloud, serviceType, c.req.param('id'))
        return c.json({ok: true})
    })

    return app
}

function isCloudProvider(value: string): value is CloudProvider {
    return value === 'aws' || value === 'azure' || value === 'gcp'
}

function isServiceType(value: string): value is CloudServiceType {
    return value === 'storage'
}

export default createCloudRoutes()
