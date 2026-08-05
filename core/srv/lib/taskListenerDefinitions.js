const TASK_LISTENER_DEFINITIONS = [
  {
    type: "sap-tl-creating",
    description: "camunda user task worker for creating jobs"
  },
  {
    type: "sap-tl-completing-success",
    description: "camunda user task worker for completing jobs"
  },
  {
    type: "sap-tl-completing-fail",
    description: "camunda user task worker for completing jobs"
  }
]

module.exports = {
  TASK_LISTENER_DEFINITIONS
}
