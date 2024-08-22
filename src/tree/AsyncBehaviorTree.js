import { BehaviorTree } from 'behaviortree';
import { FAILURE, RUNNING, SUCCESS } from 'behaviortree';

export default class AsyncBehaviorTree {
    constructor(engine, tree) {
        this.blackboard = {
            engine: engine,
            vars: tree.vars,
            context: '',
            tags: {
                'char': '',
                'user': ''
            },
            scenarios: [],
            running: null
        };

        this.bTree = new BehaviorTree({
            tree: tree.root,
            blackboard: this.blackboard
        });
    }

    setContext(context) {
        this.blackboard.context = context;
    }

    setTags(tags) {
        this.blackboard.tags = tags;
    }

    async getResponse() {
        while (!this.isDone()) {
            await new Promise(r => setTimeout(r, 500));
        }

        const response = this.buildResponse()
            .replace(/\{\{user\}\}/g, this.blackboard.tags.user)
            .replace(/\{\{char\}\}/g, this.blackboard.tags.char);
        return response;
    }

    reset() {
        this.blackboard.context = '';
        this.blackboard.scenarios = [];
    }

    isDone() {
        return this.bTree.lastResult === SUCCESS || this.bTree.lastResult === FAILURE;
    }

    async step() {
        this.bTree.step();
        if (!this.isDone()) {
            if (this.bTree.blackboard.running !== null) {
                this.bTree.blackboard.running.then(() => this.step());
            }
        }
    }

    buildResponse() {
        var response = '';
        if (Object.values(this.blackboard.vars).length > 0) {
            response += 'Generate the next response for {{char}} given the following parameters:\n';
            for (const varEntry of Object.values(this.blackboard.vars)) {
                if (varEntry.value >= 0) {
                    response += varEntry.prompt + varEntry.value + '%\n';
                }
            }
        }
        if (this.blackboard.scenarios.length > 0) {
            response += 'Update the scenario as follows:\n';
            for (const scenario of this.blackboard.scenarios) {
                response += scenario + '\n';
            }
        }
        return response;
    }
}

