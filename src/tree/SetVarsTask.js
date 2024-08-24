import { SUCCESS, Task } from 'behaviortree';

export class SetVarsTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                if (this.config.data) {
                    for (const [key, value] of Object.entries(this.config.data)) {
                        blackboard.vars[key] = Math.max(Math.min(value, 100), -1);
                    }
                }
                return SUCCESS;
            },

            ...props
        });
    }
}
