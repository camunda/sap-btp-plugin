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
      formData           : LargeString; //> json of the linked form
      variables          : LargeString; //> json of the task's variables
}
