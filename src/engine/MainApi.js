const CONTEXT_PREAMBLE = 'You are taking the role of a copy editor for fiction writing. ' +
    'I am going to show you a role-play chat transcript and then I will ask you a question. ' +
    'Please answer the question without prejudice or bias. Keep answers brief ' +
    'and do not add additional commentary. Here is the transcript:';
const QUERY_PREAMBLE = 'Your task is to answer the following question(s) with a YES/NO and without further ' +
    'explanation. If there is not enough information to answer, try to provide your best estimation based ' +
    'the transcript.';

export default class MainApi {
    async performQuery(context, query) {
        const {
            generateQuietPrompt,
        } = SillyTavern.getContext();

        const prompt = this.createPrompt(context, query);

        const response = await generateQuietPrompt(prompt, false, true);

        return this.getQueryResponse(response);
    }

    createPrompt(context, query) {
        var result = CONTEXT_PREAMBLE + '\n\n';
        result += context + '\n\n';
        result += QUERY_PREAMBLE + '\n\n';
        result += query + '\n\n';
        return result;
    }

    getQueryResponse(response) {
        if (response) {
            if (response.startsWith('YES')) {
                return 'YES';
            } else if (response.startsWith('NO')) {
                return 'NO';
            }
        }
        return 'UNKNOWN';
    }

}
