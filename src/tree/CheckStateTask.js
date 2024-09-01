import { FAILURE, SUCCESS, Task } from 'behaviortree';
import { handleResponseActions } from './utils.js'

export class CheckStateTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                const data = this.config.data;
                console.log(`CheckState: ${data.state} = ${data.target}`);

                let result = SUCCESS;
                if (blackboard.state[data.state] === data.target) {
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
