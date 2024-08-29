import { FAILURE, RUNNING, SUCCESS, Task } from 'behaviortree';

export class QueryTask extends Task {
    constructor(props) {
        super({
            start: function (blackboard) {
                this.isRunning = false;
                this.isFinished = false;
                this.gotYesResponse = false;
            },

            end: function (blackboard) {
                blackboard.running = null;
            },

            run: function (blackboard) {
                if (!this.config.data) {
                    return SUCCESS;
                }
                
                if (!this.isRunning && !this.isFinished) {
                    this.isRunning = true;

                    const query = blackboard.substituteParams(this.config.data);

                    console.log(`Query: ${query}`);
                    blackboard.running = blackboard.engine.performQuery(blackboard.context, query)
                        .then(response => {
                            let resultActions = null;
                            if (response === 'YES') {
                                resultActions = this.config.yes
                                this.gotYesResponse = true;
                            } else if (response === 'NO') {
                                resultActions = this.config.no
                            }

                            if (resultActions) {
                                if (resultActions.set_vars) {
                                    for (const [key, value] of Object.entries(resultActions.set_vars)) {
                                        blackboard.vars[key] = Math.max(Math.min(value, 100), -1);
                                    }
                                }
                                if (resultActions.add_scenarios) {
                                    blackboard.scenarios.push(...resultActions.add_scenarios)
                                }
                            }

                            this.isFinished = true;
                        });
                }

                if (this.isFinished) {
                    if (this.gotYesResponse) {
                        console.log("YES");
                        return SUCCESS;
                    } else {
                        console.log("NO");
                        return FAILURE;
                    }
                }

                return RUNNING;
            },

            ...props
        });
    }
}
