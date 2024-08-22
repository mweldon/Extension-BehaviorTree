import { Sequence } from 'behaviortree';
import { QueryTask } from './QueryTask.js';
import { RandomRollTask } from './RandomRollTask.js';

export default class TestTree {
    myTask1 = new QueryTask({
        name: 'TestQuery1',
        query: 'Does {{user}} have a lamb?',
        successAction: (blackboard) => blackboard.scenarios.push('Lambs are great.')
    });
    myTask2 = new RandomRollTask({
        name: 'D6',
        lowValue: 1,
        highValue: 6,
        target: 1,
        successAction: (blackboard) => blackboard.scenarios.push('You are lucky!'),
        failureAction: (blackboard) => blackboard.scenarios.push('You are unlucky.')
    });
    myTask3 = new QueryTask({
        name: 'TestQuery2',
        query: 'Is the lamb white?',
        successAction: (blackboard) => blackboard.scenarios.push('But I like brown lambs better.'),
            failureAction: (blackboard) => blackboard.scenarios.push('I never liked the color white.')
    });
    myTask4 = new QueryTask({
        name: 'TestQuery3',
        query: 'Does {{user}} have a cow?',
        failureAction: (blackboard) => blackboard.scenarios.push('No cows!')
    });

    root = new Sequence({
        nodes: [
            this.myTask1,
            this.myTask2,
            this.myTask3,
            this.myTask4
        ]
    });

    vars = {};
}
