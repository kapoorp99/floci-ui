import {FormEvent, useEffect, useState} from 'react'
import {Plus} from 'lucide-react'
import type {FieldSchema, ServiceSchema} from '@/types/schema'

interface DynamicFormRendererProps {
    schema: ServiceSchema
    isSubmitting: boolean
    onSubmit: (values: Record<string, unknown>) => void
}

export function DynamicFormRenderer({schema, isSubmitting, onSubmit}: DynamicFormRendererProps) {
    const [values, setValues] = useState<Record<string, string>>({})

    useEffect(() => {
        setValues(defaultValues(schema.fields))
    }, [schema])

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        onSubmit(values)
    }

    return (
        <form className="dynamic-form" onSubmit={submit}>
            {schema.fields.map((field) => (
                <label key={field.name} className="dynamic-field">
                    <span>{field.label}</span>
                    <FieldInput field={field} value={values[field.name] ?? ''} onChange={(value) => setValues((prev) => ({...prev, [field.name]: value}))}/>
                </label>
            ))}
            <button className="button primary" type="submit" disabled={isSubmitting}>
                <Plus size={14}/>
                Create
            </button>
        </form>
    )
}

function FieldInput({field, value, onChange}: {field: FieldSchema; value: string; onChange: (value: string) => void}) {
    if (field.type === 'select') {
        return (
            <select className="input" value={value} required={field.required} onChange={(event) => onChange(event.target.value)}>
                <option value="">Default</option>
                {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        )
    }

    return (
        <input
            className="input"
            value={value}
            required={field.required}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.label}
        />
    )
}

function defaultValues(fields: FieldSchema[]): Record<string, string> {
    return Object.fromEntries(fields.map((field) => [field.name, '']))
}
