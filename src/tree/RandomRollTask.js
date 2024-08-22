import { FAILURE, SUCCESS, Task } from 'behaviortree';

// class RandomRollTaskProps {
//    lowValue,
//    highValue,
//    target,
//    successAction,
//    failureAction
// }

export class RandomRollTask extends Task {
    constructor(props) {
        super({
            start: function (blackboard) {
                console.log('start');
            },

            end: function (blackboard) {
                console.log('end');
            },

            run: function (blackboard) {
                const range = props.highValue - props.lowValue + 1;
                const result = Math.floor(Math.random() * range) + props.lowValue;
                console.log(`RandomRollTask: ${this.name}, rolled ${props.lowValue}-${props.highValue}: result ${props.target}`);
                if (result >= props.target) {
                    if (props.successAction) {
                        props.successAction(blackboard);
                    }
                    return SUCCESS;
                } else {
                    if (props.failureAction) {
                        props.failureAction(blackboard);
                    }
                    return FAILURE;
                }
            },

            ...props
        });
    }
}
