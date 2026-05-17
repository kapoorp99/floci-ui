import type {CloudResource} from '@/types/resource'

interface ResourceInspectorProps {
    resource?: CloudResource
}

export function ResourceInspector({resource}: ResourceInspectorProps) {
    if (!resource) {
        return (
            <div className="resource-inspector empty compact">
                <h3>Select a resource</h3>
                <p>Inspect normalized metadata returned by the cloud proxy.</p>
            </div>
        )
    }

    return (
        <aside className="resource-inspector">
            <div className="widget-header">
                <h3>{resource.name}</h3>
                <span className="badge neutral">{resource.type}</span>
            </div>
            <div className="inspector-grid">
                <InspectorItem label="Cloud" value={resource.cloud}/>
                <InspectorItem label="Service" value={resource.service}/>
                <InspectorItem label="Region" value={resource.region ?? '-'}/>
                <InspectorItem label="Created At" value={resource.createdAt ?? '-'}/>
            </div>
            <pre className="metadata-block">{JSON.stringify(resource.metadata, null, 2)}</pre>
        </aside>
    )
}

function InspectorItem({label, value}: {label: string; value: string}) {
    return (
        <div>
            <p className="metric-label">{label}</p>
            <p className="metric-value mono">{value}</p>
        </div>
    )
}
