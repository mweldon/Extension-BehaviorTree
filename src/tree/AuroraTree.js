import { Sequence } from 'behaviortree';
import { QueryTask } from './QueryTask.js';

export default class AuroraTree {
    hypnosisTask = new QueryTask({
        name: 'hypnosisTask',
        query: 'At this point of the conversation, is {{user}} hypnotized?',
        successAction: (blackboard) => blackboard.vars.hypnosis.value = 10,
        failureAction: (blackboard) => blackboard.vars.hypnosis.value = 100
    });

    attractionTask = new QueryTask({
        name: 'attractionTask',
        query: 'Does {{user}} enjoy having sexual thoughts about girls?',
        successAction: (blackboard) => {
            blackboard.vars.lesbianTease.value = -1;
        },
        failureAction: (blackboard) => blackboard.vars.lesbianTease.value = 50
    });

    slutTask = new QueryTask({
        name: 'slutTask',
        query: 'At this point of the conversation, is {{user}} a obsessed with lesbian sex?',
        successAction: (blackboard) => blackboard.vars.lesbianSlut.value = 50,
        failureAction: (blackboard) => {
            blackboard.vars.lesbianSlut.value = 100;
            blackboard.vars.vulgar.value = 100;
            blackboard.scenarios.push('Make {{user}} think about nothing else but lesbian sexual acts.');
        }
    });

    recruitTask = new QueryTask({
        name: 'recruitTask',
        query: 'At this point of the conversation, does {{user}} want more girls to be lesbian sluts just like her?',
        successAction: (blackboard) => {
            blackboard.vars.vulgar.value = 100;
            blackboard.scenarios.push('Reward {{user}} with an orgasm for being such a good little slut.');
        },
        failureAction: (blackboard) => {
            blackboard.vars.vulgar.value = 100;
            blackboard.scenarios.push('Make {{user}} want to recruit more girls for Aurora to turn into lesbian sluts.');
        }
    });

    root = new Sequence({
        nodes: [
            this.hypnosisTask,
            this.attractionTask,
            this.slutTask,
            this.recruitTask
        ]
    });

    vars = {
        'hypnosis': {
            'value': 0,
            'prompt': 'Aggressiveness toward hypnotizing {{user}}: '
        },
        'lesbianTease': {
            'value': 0,
            'prompt': 'Chance of teasing {{user}} with lesbian thoughts: '
        },
        'lesbianSlut': {
            'value': -1,
            'prompt': 'Aggressiveness toward turning {{user}} into a lesbian slut: '
        },
        'vulgar': {
            'value': -1,
            'prompt': 'Vulgar language about lesbian sexual acts such as cunt, pussy, fuck, lick, cum, clit, etc.: '
        }
    }
}
