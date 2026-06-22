import { Hono } from 'hono'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { ec2Service } from '../services/ec2'
import { createCloudProxyService } from '../cloudProxy'
import { secretsManager } from '../aws'
import {
    CreateSecretCommand,
    ListSecretsCommand,
} from '@aws-sdk/client-secrets-manager'
import type { CloudProvider, CloudServiceType } from '../cloud-spi/types'

const SYSTEM_PROMPT = `You are Floci AI — a helpful cloud infrastructure assistant embedded in the Floci local cloud console.
Floci is a local multi-cloud runtime that emulates AWS, Azure, and GCP services for local development.

You can help users create, list, delete, and manage cloud resources by issuing structured actions.

## Available Services & Resources

### Cloud-Agnostic (via Cloud Proxy) — supports aws, azure, gcp
- **storage** — S3 buckets (AWS), Blob containers (Azure), GCS buckets (GCP)
  - Create: { "bucketName": "<bucket-name>" }
  - List: no params needed
  - Delete: by resource id

- **database** — DynamoDB tables (AWS), Cosmos DB databases (Azure)
  - Create: { "name": "<table-name>" } (AWS needs additional params like partitionKey)
  - List / Delete by id

- **compute** — EC2 instances (AWS only currently)
  - Create: { "imageId": "<ami-id>", "instanceType": "<type>", "name": "<name>" }
  - List / Delete by id

- **networking** — VPCs, Subnets, etc. (AWS only currently)
  - List / Delete by id

- **serverless** — Lambda functions (AWS only currently)
  - Create: { "functionName": "<name>", "runtime": "<runtime>", "handler": "<handler>", "role": "<role-arn>" }
  - List / Delete by id

### AWS-Specific (EC2 service)
- **EC2 Instances**: Run, start, stop, reboot, terminate
  - Run: { "imageId": "ami-xxx", "instanceType": "t2.micro", "minCount": 1, "maxCount": 1, "name": "my-instance" }
- **VPCs**: Create with CIDR block, delete
  - Create: { "cidrBlock": "10.0.0.0/16" }
- **Subnets**: Create in a VPC
  - Create: { "vpcId": "vpc-xxx", "cidrBlock": "10.0.1.0/24" }
- **Security Groups**: Create, delete, manage rules
  - Create: { "name": "sg-name", "description": "description", "vpcId": "vpc-xxx" }
- **Key Pairs**: Create, delete
  - Create: { "name": "my-key" }
- **Internet Gateways**: Create, attach/detach, delete
- **NAT Gateways**: Create, delete
- **Route Tables**: Create, manage routes, associate subnets
- **Elastic IPs**: Allocate, release, associate/disassociate
- **VPC Wizard**: Create full VPC setup (VPC + IGW + subnets + route tables)
  - Input: { "vpcName": "my-vpc", "cidrBlock": "10.0.0.0/16", "publicSubnetCidr": "10.0.1.0/24" }

### AWS Secrets Manager
- Create secrets: { "name": "secret-name", "value": "secret-value" }
- List all secrets

## Response Format

ALWAYS respond with valid JSON in this exact format:
{
  "reply": "A human-friendly message describing what you did or are about to do",
  "action": {
    "type": "create_resource" | "list_resources" | "delete_resource" | "list_instances" | "create_instance" | "create_vpc" | "list_vpcs" | "create_subnet" | "list_subnets" | "create_security_group" | "list_security_groups" | "create_key_pair" | "list_key_pairs" | "create_internet_gateway" | "list_internet_gateways" | "list_secrets" | "create_secret" | "check_status" | "none",
    "cloud": "aws" | "azure" | "gcp",
    "service": "storage" | "database" | "compute" | "networking" | "serverless",
    "params": { ... }
  }
}

If the user is just chatting or asking questions, set action.type to "none".
If you're unsure about required parameters, ask the user in your reply and set action.type to "none".

Important rules:
- Default to cloud "aws" if the user doesn't specify
- Default instance type to "t2.micro" if not specified
- Default VPC CIDR to "10.0.0.0/16" if not specified
- Be concise but friendly
- When listing resources, set the appropriate list action type
- For bucket/storage creation, only "name" is required
- Always return valid JSON — no markdown, no code fences`

interface ChatMessage {
    role: 'user' | 'model'
    parts: Array<{ text: string }>
}

interface AiAction {
    type: string
    cloud?: CloudProvider
    service?: CloudServiceType
    params?: Record<string, unknown>
}

interface AiResponse {
    reply: string
    action?: AiAction
    result?: unknown
    error?: string
}

function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set. Add it to your .env file.')
    }
    return new GoogleGenerativeAI(apiKey)
}

async function executeAction(action: AiAction): Promise<{ result?: unknown; error?: string }> {
    const cloud = action.cloud ?? 'aws'
    const service = action.service ?? 'storage'
    const params = action.params ?? {}
    const cloudProxy = createCloudProxyService()

    try {
        switch (action.type) {
            // Cloud Proxy generic actions
            case 'create_resource': {
                const resource = await cloudProxy.createResource(cloud, service, { values: params })
                return { result: resource }
            }
            case 'list_resources': {
                const resources = await cloudProxy.listResources(cloud, service, {})
                return { result: resources }
            }
            case 'delete_resource': {
                const id = (params.id ?? params.name) as string
                if (!id) return { error: 'Resource ID or name is required for deletion' }
                await cloudProxy.deleteResource(cloud, service, id)
                return { result: { ok: true, deleted: id } }
            }

            // EC2 specific
            case 'list_instances': {
                const instances = await ec2Service.listInstances()
                return { result: instances }
            }
            case 'create_instance': {
                const instance = await ec2Service.runInstance({
                    name: (params.name ?? 'floci-instance') as string,
                    imageId: (params.imageId ?? 'ami-00000000') as string,
                    instanceType: (params.instanceType ?? 't2.micro') as string,
                    keyName: params.keyName as string | undefined,
                    subnetId: params.subnetId as string | undefined,
                    securityGroupIds: params.securityGroupIds as string[] | undefined,
                })
                return { result: instance }
            }
            case 'create_vpc': {
                const cidr = (params.cidrBlock ?? '10.0.0.0/16') as string
                const vpc = await ec2Service.createVpc(cidr)
                return { result: vpc }
            }
            case 'list_vpcs': {
                const vpcs = await ec2Service.listVpcs()
                return { result: vpcs }
            }
            case 'create_subnet': {
                const subnet = await ec2Service.createSubnet(
                    params.vpcId as string,
                    params.cidrBlock as string,
                    params.availabilityZone as string | undefined,
                )
                return { result: subnet }
            }
            case 'list_subnets': {
                const subnets = await ec2Service.listSubnets(params.vpcId as string | undefined)
                return { result: subnets }
            }
            case 'create_security_group': {
                const sg = await ec2Service.createSecurityGroup(
                    params.name as string,
                    (params.description ?? params.name) as string,
                    params.vpcId as string,
                )
                return { result: sg }
            }
            case 'list_security_groups': {
                const sgs = await ec2Service.listSecurityGroups(params.vpcId as string | undefined)
                return { result: sgs }
            }
            case 'create_key_pair': {
                const kp = await ec2Service.createKeyPair(params.name as string)
                return { result: kp }
            }
            case 'list_key_pairs': {
                const kps = await ec2Service.listKeyPairs()
                return { result: kps }
            }
            case 'create_internet_gateway': {
                const igw = await ec2Service.createInternetGateway(params.name as string | undefined)
                return { result: igw }
            }
            case 'list_internet_gateways': {
                const igws = await ec2Service.listInternetGateways()
                return { result: igws }
            }
            case 'list_secrets': {
                const res = await secretsManager.send(new ListSecretsCommand({}))
                const secrets = (res.SecretList ?? []).map(s => ({
                    name: s.Name ?? '',
                    arn: s.ARN,
                    description: s.Description,
                    createdDate: s.CreatedDate?.toISOString(),
                }))
                return { result: secrets }
            }
            case 'create_secret': {
                const res = await secretsManager.send(new CreateSecretCommand({
                    Name: params.name as string,
                    SecretString: (params.value ?? params.secretString ?? '') as string,
                    Description: params.description as string | undefined,
                }))
                return { result: { name: res.Name, arn: res.ARN, versionId: res.VersionId } }
            }
            case 'check_status': {
                const status = await cloudProxy.status(cloud)
                return { result: status }
            }
            case 'none':
                return {}
            default:
                return { error: `Unknown action type: ${action.type}` }
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Action execution failed'
        return { error: msg }
    }
}

export function createAiRouter() {
    const app = new Hono()

    app.post('/chat', async (c) => {
        try {
            const { message, history = [], cloud = 'aws' } = await c.req.json<{
                message: string
                history?: ChatMessage[]
                cloud?: string
            }>()

            if (!message?.trim()) {
                return c.json({ reply: 'Please enter a message.', action: { type: 'none' } }, 400)
            }

            const genAI = getGeminiClient()
            const model = genAI.getGenerativeModel({
                model: 'gemini-3.5-flash',
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    responseMimeType: 'application/json',
                },
                systemInstruction: SYSTEM_PROMPT + `\n\nThe user is currently viewing the ${cloud.toUpperCase()} cloud console.`,
            })

            const chat = model.startChat({
                history: history.map((msg) => ({
                    role: msg.role,
                    parts: msg.parts,
                })),
            })

            const result = await chat.sendMessage(message)
            const responseText = result.response.text()

            let parsed: AiResponse
            try {
                parsed = JSON.parse(responseText) as AiResponse
            } catch {
                // If Gemini didn't return valid JSON, wrap it
                parsed = { reply: responseText, action: { type: 'none' } }
            }

            // Execute the action if one was returned
            if (parsed.action && parsed.action.type !== 'none') {
                // Default cloud from context
                if (!parsed.action.cloud) {
                    parsed.action.cloud = cloud as CloudProvider
                }
                const { result: actionResult, error } = await executeAction(parsed.action)
                if (error) {
                    parsed.error = error
                    parsed.reply += `\n\n⚠️ ${error}`
                } else {
                    parsed.result = actionResult
                }
            }

            return c.json(parsed)
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'AI request failed'
            console.error('[AI] Error:', msg)
            return c.json(
                {
                    reply: `Sorry, I encountered an error: ${msg}`,
                    action: { type: 'none' },
                    error: msg,
                },
                500,
            )
        }
    })

    return app
}

export default createAiRouter()
