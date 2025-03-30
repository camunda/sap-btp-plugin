export enum CamundaRequest {
  started = "started",
  stopped = "stopped",
  finished = "finished"
}

export interface CamundaRunReturn {
  channelId: string
  processInstanceKey: string
  processDefinitionKey?: string
  processKey?: string
  version: number
  "@odata": {
    context: string
  }
}
