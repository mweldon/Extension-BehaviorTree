import { FAILURE, SUCCESS, Task } from 'behaviortree';

export class RandomRollTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                const data = this.config.data;
                const range = data.high - data.low + 1;
                const rand = Math.random();
                const roll = Math.floor(rand * range) + data.low;
                console.log(`Random roll ${data.low}-${data.high}, target ${data.target}, result ${roll}`);

                let resultActions = null;
                let result = SUCCESS;
                if (roll >= data.target) {
                    resultActions = this.config.yes
                    result = SUCCESS;
                } else {
                    resultActions = this.config.no
                    result = FAILURE;
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

                return result;
            },

            ...props
        });
    }
}
