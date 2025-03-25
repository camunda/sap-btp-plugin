using {managed, User} from '@sap/cds/common';

namespace camunda;

// store websocket ids associated with a started bpmn process id
entity BrowserClients : managed {
    channelId            : String;
    processDefinitionKey : String;
    bpmnProcessId        : String;
    version              : Integer;
    processInstanceKey   : String;
    tenantId             : String;
    user                 : User; //> authenticated user hitting the app
}
