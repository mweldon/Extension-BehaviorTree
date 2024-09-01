import { FAILURE, RUNNING, SUCCESS, Task } from 'behaviortree';
import { handleResponseActions } from './utils.js'

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
                        handleResponseActions(this.config.yes, blackboard);
                        console.log('Query response: YES (cached)');
                        return SUCCESS;
                    }
                    if (blackboard.state[this.name] === 'NO') {
                        handleResponseActions(this.config.no, blackboard);
                        console.log('Query response: NO (cached)');
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
                                handleResponseActions(this.config.yes, blackboard);
                                this.gotYesResponse = true;
                            } else if (response === 'NO') {
                                handleResponseActions(this.config.no, blackboard);
                            }

                            this.isFinished = true;
                        });
                }

                if (this.isFinished) {
                    if (this.gotYesResponse) {
                        if (this.config.cacheYes) {
                            blackboard.state[this.name] = 'YES';
                        }
                        console.log('Query response: YES');
                        return SUCCESS;
                    } else {
                        if (this.config.cacheNo) {
                            blackboard.state[this.name] = 'NO';
                        }
                        console.log('Query response: NO');
                        return FAILURE;
                    }
                }

                return RUNNING;
            },

            ...props
        });
    }
}
