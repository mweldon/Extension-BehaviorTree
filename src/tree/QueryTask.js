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
                if (!this.isRunning && !this.isFinished) {
                    this.isRunning = true;

                    const query = blackboard.substituteParams(this.config.data);

                    console.log(`Query: ${query}`);
                    blackboard.running = blackboard.engine.performQuery(blackboard.context, query)
                        .then(response => {
                            let queryActions = null;
                            if (response === 'YES') {
                                queryActions = this.config.yes
                                this.gotYesResponse = true;
                            } else if (response === 'NO') {
                                queryActions = this.config.no
                            }

                            if (queryActions) {
                                if (queryActions.set_vars) {
                                    for (const [key, value] of Object.entries(queryActions.set_vars)) {
                                        blackboard.vars[key] = Math.max(Math.min(value, 100), -1);
                                    }
                                }
                                if (queryActions.add_scenarios) {
                                    blackboard.scenarios.push(...queryActions.add_scenarios)
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
