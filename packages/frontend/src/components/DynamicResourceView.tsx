import {useMemo, useState} from 'react'
import {Eye, Filter, RefreshCw, Table2, Workflow} from 'lucide-react'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {
    createCloudResource,
    deleteCloudResource,
    getServiceSchema,
    listCloudResources,
} from '@/api/cloudProxyClient'
import {DynamicFormRenderer} from '@/components/DynamicFormRenderer'
import {ResourceInspector} from '@/components/ResourceInspector'
import {ResourceTable} from '@/components/ResourceTable'
import type {CloudProvider, CloudServiceType} from '@/types/cloud'
import type {CloudResource} from '@/types/resource'

interface DynamicResourceViewProps {
    cloud: CloudProvider
    service: CloudServiceType
}

export function DynamicResourceView({cloud, service}: DynamicResourceViewProps) {
    const qc = useQueryClient()
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<CloudResource | undefined>()
    const resourcesKey = useMemo(() => ['cloud-resources', cloud, service, search], [cloud, service, search])

    const schemaQuery = useQuery({
        queryKey: ['cloud-schema', cloud, service],
        queryFn: ({signal}) => getServiceSchema(cloud, service, signal),
    })

    const resourcesQuery = useQuery({
        queryKey: resourcesKey,
        queryFn: ({signal}) => listCloudResources(cloud, service, search, signal),
        enabled: schemaQuery.isSuccess,
    })

    const createMut = useMutation({
        mutationFn: (values: Record<string, unknown>) => createCloudResource(cloud, service, values),
        onSuccess: () => qc.invalidateQueries({queryKey: ['cloud-resources', cloud, service]}),
    })

    const deleteMut = useMutation({
        mutationFn: (resource: CloudResource) => deleteCloudResource(cloud, service, resource.id),
        onSuccess: (_, resource) => {
            if (selected?.id === resource.id) setSelected(undefined)
            void qc.invalidateQueries({queryKey: ['cloud-resources', cloud, service]})
        },
    })

    if (schemaQuery.isLoading) {
        return <div className="empty compact"><h3>Loading schema</h3></div>
    }

    if (schemaQuery.isError || !schemaQuery.data) {
        return (
            <div className="cloud-coming-soon">
                <div>
                    <p className="eyebrow">Coming Soon</p>
                    <h3>{cloud.toUpperCase()} {service}</h3>
                    <p className="muted">The proxy already exposes this provider as a placeholder. No adapter is registered yet.</p>
                </div>
                <div className="coming-soon-grid">
                    <StatusTile label="Cloud" value={cloud.toUpperCase()} state="placeholder"/>
                    <StatusTile label="Service" value={service} state="placeholder"/>
                    <StatusTile label="Adapter" value="Not registered" state="pending"/>
                    <StatusTile label="Runtime" value="Future" state="pending"/>
                </div>
            </div>
        )
    }

    const schema = schemaQuery.data
    const resources = resourcesQuery.data ?? []

    return (
        <div className="dynamic-resource-view">
            <section className="dynamic-stage">
                <div className="dynamic-stage-header">
                    <div>
                        <p className="eyebrow">Dynamic View</p>
                        <h3>{schema.displayName}</h3>
                    </div>
                    <div className="schema-action-list">
                        {schema.actions.map((action) => <span key={action} className="schema-action">{action}</span>)}
                    </div>
                </div>

                <div className="dynamic-stage-grid">
                    <FeatureTile icon={Filter} title="Filters" value={`${schema.filters.length}`}/>
                    <FeatureTile icon={Table2} title="Columns" value={`${schema.columns.length}`}/>
                    <FeatureTile icon={Workflow} title="Actions" value={`${schema.actions.length}`}/>
                    <FeatureTile icon={Eye} title="Inspector" value="Enabled"/>
                </div>
            </section>

            <div className="resource-workbench">
                <section className="resource-main">
                    <div className="resource-action-panel">
                        <div>
                            <p className="eyebrow">Dynamic Actions</p>
                            <h3>Create {schema.service} resource</h3>
                        </div>
                        <DynamicFormRenderer schema={schema} isSubmitting={createMut.isPending} onSubmit={(values) => createMut.mutate(values)}/>
                    </div>

                    <section className="table-panel">
                        <div className="input-row resource-table-bar">
                            <div>
                                <p className="eyebrow">Resources</p>
                                <span className="muted">{resources.length} normalized resources</span>
                            </div>
                            <div className="resource-table-tools">
                                <input className="input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter resources"/>
                                <button className="button" type="button" onClick={() => resourcesQuery.refetch()}>
                                    <RefreshCw size={14}/>
                                    Refresh
                                </button>
                            </div>
                        </div>
                        <ResourceTable
                            schema={schema}
                            resources={resources}
                            selectedId={selected?.id}
                            deletingId={deleteMut.variables?.id}
                            onSelect={setSelected}
                            onDelete={(resource) => deleteMut.mutate(resource)}
                        />
                    </section>
                </section>
                <ResourceInspector resource={selected}/>
            </div>
        </div>
    )
}

function FeatureTile({icon, title, value}: {icon: React.ElementType; title: string; value: string}) {
    const Icon = icon
    return (
        <div className="feature-tile">
            <Icon size={22}/>
            <span>{title}</span>
            <strong>{value}</strong>
        </div>
    )
}

function StatusTile({label, value, state}: {label: string; value: string; state: 'placeholder' | 'pending'}) {
    return (
        <div className={`status-tile ${state}`}>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    )
}
