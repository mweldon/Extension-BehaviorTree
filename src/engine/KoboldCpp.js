import axios from 'axios';

const INSTRUCTION_WRAPPER = '### Instruction:';
const RESPONSE_WRAPPER = '### Response:';
const CONTEXT_PREAMBLE = 'You are taking the role of a copy editor for fiction writing. ' +
    'I am going to show you a role-play chat transcript and then I will ask you a series ' +
    'of questions. Please answer each question without prejudice or bias. Keep answers brief ' +
    'and do not add additional commentary. Here is the transcript:';
const QUERY_PREAMBLE = 'Please answer the following question(s) with a YES/NO and without further '
    'explanation. If there is not enough information to answer, try to provide your best estimation.';

const URL = 'http://localhost:5001/api/v1/generate';

export default class KoboldCpp {
    constructor() {
        this.args = {
            'max_context_length': 16384,
            'max_length': 10,
            'prompt': "Hello",
            'quiet': true,
            'rep_pen': 1,
            'rep_pen_range': 0,
            'rep_pen_slope': 1,
            'temperature': 0.1,
            'tfs': 1,
            'top_a': 0,
            'top_k': 100,
            'top_p': 0.9,
            'typical': 1,
            'stop_sequence': ['###', INSTRUCTION_WRAPPER, RESPONSE_WRAPPER]
        };
    }

    async performQuery(context, query) {
        this.args.prompt = this.createContext(context, query);

        const url = URL;
        const args = this.args;
        const response = await axios.post(url, args)
            .catch(function (error) {
                var argscopy = args;
                argscopy.prompt = '**REDACTED**';
                if (error.response) {
                    console.log(`Error response ${error.response.status} from POST to ${url} with args ${JSON.stringify(argscopy)}`);
                } else if (error.request) {
                    console.log(`Request error performing POST to ${url} with args ${JSON.stringify(argscopy)}`);
                } else {
                    console.log(`Unknown error performing POST to ${url} with args ${JSON.stringify(argscopy)}`);
                }
            });

        return await this.getQueryResponse(response);
    }

    createContext(context, query) {
        var result = '\n' + INSTRUCTION_WRAPPER + '\n' + CONTEXT_PREAMBLE + '\n\n';
        result += context + '\n\n';
        result += QUERY_PREAMBLE + '\n\n';
        result += query + '\n\n';
        result += RESPONSE_WRAPPER + '\n';
        return result;
    }

    async getQueryResponse(response) {

        if (response) {
            const results = response.data.results;
            const generatedText = (results.length > 0) ? results[0].text : '';

            if (generatedText.startsWith('YES')) {
                return 'YES';
            } else if (generatedText.startsWith('NO')) {
                return 'NO';
            }
        }

        return 'UNKNOWN';
    }

}
