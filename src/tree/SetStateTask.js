import { SUCCESS, Task } from 'behaviortree';

export class SetStateTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                if (this.config.data) {
                    for (const [key, value] of Object.entries(this.config.data)) {
                        blackboard.state[key] = value;
                    }
                }
                return SUCCESS;
            },

            ...props
        });
    }
}
