import { FAILURE, SUCCESS, Task } from 'behaviortree';
import { handleResponseActions } from './utils.js'

export class RandomRollTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                const data = this.config.data;
                const range = data.high - data.low + 1;
                const rand = Math.random();
                const roll = Math.floor(rand * range) + data.low;
                console.log(`Random roll ${data.low}-${data.high}, target ${data.target}, result ${roll}`);

                let result = SUCCESS;
                if (roll >= data.target) {
                    handleResponseActions(this.config.yes, blackboard);
                    result = SUCCESS;
                } else {
                    handleResponseActions(this.config.no, blackboard);
                    result = FAILURE;
                }

                return result;
            },

            ...props
        });
    }
}
