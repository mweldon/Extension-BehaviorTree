import { FAILURE, SUCCESS, BehaviorTree, BehaviorTreeImporter } from 'behaviortree';
import { AddScenariosTask } from './AddScenariosTask.js';
import { SetVarsTask } from './SetVarsTask.js';
import { CreateVarsTask } from './CreateVarsTask.js';
import { QueryTask } from './QueryTask.js';
import { RandomRollTask } from './RandomRollTask.js';

export class AsyncBehaviorTree {
    constructor(engine, substituteParams) {
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

        this.setTreeTemplate(DefaultTree);
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

    getTreeName() {
        return this.tree.name;
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

        let anyVars = false;
        for (const [key, value] of Object.entries(this.blackboard.vars)) {
            if (value >= 0 && this.blackboard.varsmap[key]) {
                anyVars = true;
                break;
            }
        }

        if (anyVars || this.blackboard.scenarios.length > 0) {
            response += settings.responsePrelude;
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

export const DefaultTree = "{\n" +
"   \"type\":\"sequence\",\n" +
"   \"name\":\"Default tree\",\n" +
"   \"nodes\":[\n" +
"      {\n" +
"         \"type\":\"create_vars\",\n" +
"         \"data\":{\n" +
"            \"var1\":{\n" +
"               \"value\":-1,\n" +
"               \"prompt\":\"How much {{char}} tries to do something: \"\n" +
"            },\n" +
"            \"var2\":{\n" +
"               \"value\":-1,\n" +
"               \"prompt\":\"Likelihood that {{char}} will act a certain way: \"\n" +
"            }\n" +
"         }\n" +
"      },\n" +
"      {\n" +
"         \"type\":\"sequence\",\n" +
"         \"name\":\"Check some stuff\",\n" +
"         \"nodes\":[\n" +
"            {\n" +
"               \"type\":\"random_roll\",\n" +
"               \"data\":{\n" +
"                  \"low\":1,\n" +
"                  \"high\":20,\n" +
"                  \"target\":13\n" +
"               },\n" +
"               \"yes\":{\n" +
"                  \"set_vars\":{\n" +
"                     \n" +
"                  },\n" +
"                  \"add_scenarios\":[\n" +
"                     \n" +
"                  ]\n" +
"               },\n" +
"               \"no\":{\n" +
"                  \"set_vars\":{\n" +
"                     \n" +
"                  },\n" +
"                  \"add_scenarios\":[\n" +
"                     \n" +
"                  ]\n" +
"               }\n" +
"            },\n" +
"            {\n" +
"               \"type\":\"query\",\n" +
"               \"data\":\"\",\n" +
"               \"yes\":{\n" +
"                  \"set_vars\":{\n" +
"                     \n" +
"                  },\n" +
"                  \"add_scenarios\":[\n" +
"                     \n" +
"                  ]\n" +
"               },\n" +
"               \"no\":{\n" +
"                  \"set_vars\":{\n" +
"                     \n" +
"                  },\n" +
"                  \"add_scenarios\":[\n" +
"                     \n" +
"                  ]\n" +
"               }\n" +
"            }\n" +
"         ]\n" +
"      }\n" +
"   ]\n" +
"}"
