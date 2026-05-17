import {useEffect, useState} from 'react'
import {Cloud, DatabaseZap} from 'lucide-react'
import {useQuery} from '@tanstack/react-query'
import {listClouds, listCloudServices} from '@/api/cloudProxyClient'
import {CloudSelector} from '@/components/CloudSelector'
import {DynamicResourceView} from '@/components/DynamicResourceView'
import {ServiceSelector} from '@/components/ServiceSelector'
import type {CloudProvider, CloudServiceType} from '@/types/cloud'

export function CloudExplorerPage() {
    const [cloud, setCloud] = useState<CloudProvider>('aws')
    const [service, setService] = useState<CloudServiceType>('storage')

    const cloudsQuery = useQuery({
        queryKey: ['clouds'],
        queryFn: ({signal}) => listClouds(signal),
    })

    const servicesQuery = useQuery({
        queryKey: ['cloud-services', cloud],
        queryFn: ({signal}) => listCloudServices(cloud, signal),
    })

    useEffect(() => {
        const firstAvailable = servicesQuery.data?.find((item) => item.availability === 'available')
        const firstService = firstAvailable ?? servicesQuery.data?.[0]
        if (firstService) setService(firstService.service)
    }, [servicesQuery.data])

    return (
        <>
            <div className="page-header cloud-explorer-header">
                <div className="page-title">
                    <Cloud size={20}/>
                    <div>
                        <h2>Cloud Explorer</h2>
                        <p className="muted">Unified local runtime console</p>
                    </div>
                </div>
                <div className="cloud-header-selectors">
                    <label>
                        <span>Cloud</span>
                        <CloudSelector clouds={cloudsQuery.data ?? []} selected={cloud} onSelect={setCloud}/>
                    </label>
                    <label>
                        <span>Service</span>
                        <ServiceSelector services={servicesQuery.data ?? []} selected={service} onSelect={setService}/>
                    </label>
                </div>
            </div>
            <div className="content cloud-explorer">
                <div className="cloud-runtime-strip">
                    <div>
                        <DatabaseZap size={16}/>
                        <span>Proxy API</span>
                        <strong>/api/clouds/{cloud}/services/{service}</strong>
                    </div>
                    <div>
                        <span>Runtime</span>
                        <strong>{cloud === 'aws' ? 'Floci AWS Core :4566' : cloud === 'azure' ? 'Floci-AZ :4577' : 'Future Floci-GP'}</strong>
                    </div>
                    <div>
                        <span>Adapter</span>
                        <strong>{cloud === 'gcp' ? 'Coming Soon' : `${cloud.toUpperCase()} Storage Adapter`}</strong>
                    </div>
                </div>
                <DynamicResourceView cloud={cloud} service={service}/>
            </div>
        </>
    )
}
