using {
  managed,
  User
} from '@sap/cds/common';

namespace camunda;

entity UserTasks : managed {
      // parentProcessInstanceKey : String; //> runtime ID of the parent process' PI
  key processInstanceKey : String; //> runtime ID of the PI
      channelId          : String; //> unique client identifier
      user               : User; //> authenticated user that "claimed" that task
      jobKey             : String; //> job identifier, later used for task completion
      formData           : String; //> json of the linked form
      variables          : String; //> json of the task's variables
}
