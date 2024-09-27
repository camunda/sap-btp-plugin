export enum CamundaRequest {
  started = "started",
  stopped = "stopped"
}

export interface CamundaRunReturn {
  channelId: string
  processInstanceKey: string
  processKey?: string
  version: number
  "@odata": {
    context: string
  }
}
