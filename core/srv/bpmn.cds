using {camunda} from '../db/user-tasks';

service BPMN {
    type RunTime {
        channelId            : String; //> websocket "channel" identifier
        processInstanceKey   : String; //> -"-
        processDefinitionKey : String; //> camunda runtime
        version              : Integer; //> -"-
    }

    // channel id is a unique identifier linking
    // a UI client's websocket with the service layer
    action runProcess(bpmnProcessId : String, channelId : String, variables : String) returns RunTime;
    action completeUsertask(jobKey : String, variables : String);
    action deleteChannel(channelId : String); //> when the process is finished

    entity UserTasks as projection on camunda.UserTasks where user = $user;
}

annotate BPMN with @(requires: 'authenticated-user');
