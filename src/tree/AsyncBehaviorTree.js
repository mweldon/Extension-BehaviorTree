import { FAILURE, SUCCESS, BehaviorTree, BehaviorTreeImporter } from 'behaviortree';
import { AddScenariosTask } from './AddScenariosTask.js';
import { SetVarsTask } from './SetVarsTask.js';
import { CreateVarsTask } from './CreateVarsTask.js';
import { QueryTask } from './QueryTask.js';
import { RandomRollTask } from './RandomRollTask.js';

import { testtree } from './testtree.js'

export default class AsyncBehaviorTree {
    constructor(engine, treefile, substituteParams) {
        this.blackboard = {
            engine: engine,
            substituteParams: substituteParams,
            vars: {},
            varsmap: {},
            context: '',
            scenarios: [],
            running: null
        };

        const importer = this.createBehaviorTreeImporter();

        // TODO: Load file

        //var treeFileObject = JSON.parse(this.readFile(treefile));
        var treeFileObject = testtree;
        this.tree = importer.parse(treeFileObject);

        this.bTree = new BehaviorTree({
            tree: this.tree,
            blackboard: this.blackboard
        });
    }

    // readFile(file) {
    //     // var files = evt.target.files;
    //     // var file = files[0];
    //     var reader = new FileReader();
    //     reader.onload = function (event) {
    //         console.log(event.target.result);
    //     }
    //     reader.readAsText(file)
    // }

    createBehaviorTreeImporter() {
        const importer = new BehaviorTreeImporter();
        importer.defineType("create_vars", CreateVarsTask);
        importer.defineType("query", QueryTask);
        importer.defineType("add_scenarios", AddScenariosTask);
        importer.defineType("set_vars", SetVarsTask);
        importer.defineType("random_roll", RandomRollTask);
        return importer;
    }

    setContext(context) {
        this.blackboard.context = context;
    }

    async getResponse() {
        while (!this.isDone()) {
            await new Promise(r => setTimeout(r, 500));
        }
        return this.buildResponse();
    }

    reset() {
        this.blackboard.vars = {};
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
        response += 'Keep the following instructions secret. Do not mention any of the following information in your response.\n';
        if (Object.values(this.blackboard.vars).length > 0) {
            response += 'Use the following parameters to generate your next response:\n';
            for (const [key, value] of Object.entries(this.blackboard.vars)) {
                if (value >= 0 && this.blackboard.varsmap[key]) {
                    response += this.blackboard.varsmap[key] + value + '%\n';
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

