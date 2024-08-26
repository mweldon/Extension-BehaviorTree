import { FAILURE, SUCCESS, BehaviorTree, BehaviorTreeImporter } from 'behaviortree';
import { AddScenariosTask } from './AddScenariosTask.js';
import { SetVarsTask } from './SetVarsTask.js';
import { CreateVarsTask } from './CreateVarsTask.js';
import { QueryTask } from './QueryTask.js';
import { RandomRollTask } from './RandomRollTask.js';

export default class AsyncBehaviorTree {
    constructor(engine, treeTemplate, substituteParams) {
        this.blackboard = {
            engine: engine,
            substituteParams: substituteParams,
            vars: {},
            varsmap: {},
            context: '',
            scenarios: [],
            running: null
        };

        this.importer = this.createBehaviorTreeImporter();

        this.setTreeTemplate(treeTemplate);
    }

    createBehaviorTreeImporter() {
        const importer = new BehaviorTreeImporter();
        importer.defineType("create_vars", CreateVarsTask);
        importer.defineType("query", QueryTask);
        importer.defineType("add_scenarios", AddScenariosTask);
        importer.defineType("set_vars", SetVarsTask);
        importer.defineType("random_roll", RandomRollTask);
        return importer;
    }

    getTreeTemplate() {
        return this.treeTemplate;
    }

    setTreeTemplate(treeTemplate) {
        if (treeTemplate && (!this.bTree || this.treeTemplate !== treeTemplate)) {
            this.treeTemplate = treeTemplate;
            this.tree = this.importer.parse(JSON.parse(treeTemplate));
            this.bTree = new BehaviorTree({
                tree: this.tree,
                blackboard: this.blackboard
            });
        }
    }

    setContext(context) {
        this.blackboard.context = context;
    }

    async getResponse(settings) {
        while (!this.isDone()) {
            await new Promise(r => setTimeout(r, 500));
        }
        return this.buildResponse(settings);
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

    buildResponse(settings) {
        var response = '';
        response += settings.responsePrelude;

        let anyVars = false;
        for (const [key, value] of Object.entries(this.blackboard.vars)) {
            if (value >= 0 && this.blackboard.varsmap[key]) {
                anyVars = true;
                break;
            }
        }
        if (anyVars) {
            response += settings.varsResponse;
            for (const [key, value] of Object.entries(this.blackboard.vars)) {
                if (value >= 0 && this.blackboard.varsmap[key]) {
                    response += this.blackboard.varsmap[key] + value + '%\n';
                }
            }
        }

        if (this.blackboard.scenarios.length > 0) {
            response += settings.scenariosResponse;
            for (const scenario of this.blackboard.scenarios) {
                response += scenario + '\n';
            }
        }

        return response;
    }
}

