import { FAILURE, RUNNING, SUCCESS, Task } from 'behaviortree';

export class QueryTask extends Task {
    constructor(props) {
        super({
            start: function (blackboard) {
                if (!this.name) {
                    this.name = crypto.randomUUID();
                }

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

                if (this.name in blackboard.state) {
                    console.log(`Query: ${this.name}`);
                    if (blackboard.state[this.name] === 'YES') {
                        handleResponse(this.config.yes, blackboard);
                        console.log('YES (cached)');
                        return SUCCESS;
                    }
                    if (blackboard.state[this.name] === 'NO') {
                        handleResponse(this.config.no, blackboard);
                        console.log('NO (cached)');
                        return FAILURE;
                    }
                }

                if (!this.isRunning && !this.isFinished) {
                    this.isRunning = true;

                    const query = blackboard.substituteParams(this.config.data);

                    console.log(`Query: ${query}`);
                    blackboard.running = blackboard.engine.performQuery(blackboard.context, query)
                        .then(response => {
                            this.gotYesResponse = response === 'YES';
                            if (response === 'YES') {
                                handleResponse(this.config.yes, blackboard);
                                this.gotYesResponse = true;
                            } else if (response === 'NO') {
                                handleResponse(this.config.no, blackboard);
                            }

                            this.isFinished = true;
                        });
                }

                if (this.isFinished) {
                    if (this.gotYesResponse) {
                        if (this.config.cacheYes) {
                            blackboard.state[this.name] = 'YES';
                        }
                        console.log('YES');
                        return SUCCESS;
                    } else {
                        if (this.config.cacheNo) {
                            blackboard.state[this.name] = 'NO';
                        }
                        console.log('NO');
                        return FAILURE;
                    }
                }

                return RUNNING;
            },

            ...props
        });
    }
}

function handleResponse(resultActions, blackboard) {
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
}

