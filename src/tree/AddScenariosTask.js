import { SUCCESS, Task } from 'behaviortree';

export class AddScenariosTask extends Task {
    constructor(props) {
        super({
            run: function (blackboard) {
                if (this.config.data) {
                    blackboard.scenarios.push(...this.config.data)
                }
                return SUCCESS;
            },

            ...props
        });
    }
}
