@protocol: [
    {
        kind: 'odata',
        path: '/odata/v4/inbound'
    },
    {
        kind: 'rest',
        path: '/inbound'
    }
]
service Inbound {
    @open
    @cds.persistence.skip
    entity Process {
        key bpmnProcessId : String;
        user          : String default 'anonymous';
        wait          : Boolean default false;
    //> we expect a structure like this ...
    // variables     : Composition of many {};
    //> ...to provide pre-defined variables for starting a process instance
    //> example:
    // {
    //   "bpmnProcessId": "processId",
    //   "user": "beck",
    //   "variables": {
    //     "some_key": "some_value",
    //     "some_other_key": 10
    //     }
    // }
    }
}

annotate Inbound with @(requires : 'authenticated-user');

