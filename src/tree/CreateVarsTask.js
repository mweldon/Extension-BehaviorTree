import { SUCCESS, Task } from 'behaviortree';

export class CreateVarsTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                if (this.config.data) {
                    for (const [key, value] of Object.entries(this.config.data)) {
                        blackboard.varsmap[key] = value.prompt;
                        blackboard.vars[key] = value.defaultValue;
                    }
                }
                return SUCCESS;
            },

            ...props
        });
    }
}
