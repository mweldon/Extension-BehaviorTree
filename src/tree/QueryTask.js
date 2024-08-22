import { FAILURE, RUNNING, SUCCESS, Task } from 'behaviortree';

// class QueryTaskProps {
//     query;
//     successAction;
//     failureAction;
// }

export class QueryTask extends Task {
    constructor(props) {
        super({
            start: function (blackboard) {
                console.log('start');
                this.isRunning = false;
                this.isFinished = false;
                this.gotYesResponse = false;
            },

            end: function (blackboard) {
                blackboard.running = null;
                console.log('end');
            },

            run: function (blackboard) {
                if (!this.isRunning && !this.isFinished) {
                    this.isRunning = true;
                    
                    const query = props.query
                        .replace(/\{\{user\}\}/g, blackboard.tags.user)
                        .replace(/\{\{char\}\}/g, blackboard.tags.char);

                    console.log(`QueryTask: ${this.name}, ${query}`);
                    blackboard.running = blackboard.engine.performQuery(blackboard.context, query)
                        .then(response => {
                            if (response === 'YES') {
                                if (props.successAction) {
                                    props.successAction(blackboard);
                                }
                                this.gotYesResponse = true;
                            } else if (response === 'NO') {
                                if (props.failureAction) {
                                    props.failureAction(blackboard);
                                }
                            }
                            this.isFinished = true;
                        });
                }

                if (this.isFinished) {
                    if (this.gotYesResponse) {
                        console.log("SUCCESS");
                        return SUCCESS;
                    } else {
                        console.log("FAILURE");
                        return FAILURE;
                    }
                }

                console.log("RUNNING");     
                return RUNNING;          
            },

            ...props
        });
    }
}
