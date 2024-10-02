export enum CamundaRequest {
  started = "started",
  stopped = "stopped"
}

export interface CamundaRunReturn {
  channelId: string
  processInstanceKey: string
  processDefinitionKey?: string
  version: number
  "@odata": {
    context: string
  }
}
