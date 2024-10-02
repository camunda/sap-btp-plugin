using {managed} from '@sap/cds/common';

namespace zeebe;

// store websocket ids associated with a started bpmn process id
entity BrowserClients : managed {
    channelId            : String;
    processDefinitionKey : String;
    bpmnProcessId        : String;
    version              : Integer;
    processInstanceKey   : String;
    tenantId             : String;
}
