import { MessageType } from "sap/ui/core/library"

export interface WebSocketData {
  jobKey?: string
  formData?: string

  channelId: string
  type: "form" | "message" | "final-task-success" | "final-task-fail" | "errorObserver" | "variables"
  jobKey?: string // from user task handler
  parentProcessInstanceKey?: string // from user task handler, if running as a subprocess
  message?: Message // from any handler relaying a message
  data: { duration: string }
  [key: string]: string | VarsToShow[] // from user task- and final task handler
  variables?: {
    [key: string]: string
    bdaasTitle: string
    bdaasBusyText: string
  }
}

// from final task handler
export interface VarsToShow {
  label: string
  value: string
  modelKey: string
}

// from any handler, relaying a message
export interface Message {
  text: string
  description: string
  additionalText: string
  type: MessageType
}
