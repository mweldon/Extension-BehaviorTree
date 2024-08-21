import { eventSource, event_types, getRequestHeaders, is_send_press, saveSettingsDebounced } from '../../../../script.js';
import { extension_settings, getContext, renderExtensionTemplateAsync } from '../../../extensions.js';
import { SECRET_KEYS, secret_state } from '../../../secrets.js';
import { collapseNewlines } from '../../../power-user.js';
import { bufferToBase64, debounce } from '../../../utils.js';
import { decodeTextTokens, getTextTokens, tokenizers } from '../../../tokenizers.js';

const MODULE_NAME = 'third-party/Extension-BehaviorTree';

const settings = {
    enabled: false
};

// /**
//  * Called when a chat event occurs to generate a HypeBot reply.
//  * @param {boolean} clear Clear the hypebot bar.
//  */
// function onChatEvent(clear) {
//     if (clear) {
//         setHypeBotText('');
//     }

//     abortController?.abort();
//     generateDebounced();
// }

// /**
//  * Generates a HypeBot reply.
//  */
// async function generateHypeBot() {
//     if (!settings.enabled || is_send_press) {
//         return;
//     }

//     if (!secret_state[SECRET_KEYS.NOVEL]) {
//         setHypeBotText('<div class="hypebot_nokey">No API key found. Please enter your API key in the NovelAI API Settings to use the HypeBot.</div>');
//         return;
//     }

//     console.debug('Generating HypeBot reply');
//     setHypeBotText(`<span class="hypebot_name">${settings.name}</span> is ${getWaitingVerb()}...`);

//     const context = getContext();
//     const chat = context.chat.slice();
//     let prompt = '';

//     for (let index = chat.length - 1; index >= 0; index--) {
//         const message = chat[index];

//         if (message.is_system || !message.mes) {
//             continue;
//         }

//         prompt = `\n${message.mes}\n${prompt}`;

//         if (prompt.length >= MAX_STRING_LENGTH) {
//             break;
//         }
//     }

//     prompt = collapseNewlines(prompt.replaceAll(/[*[\]{}]/g, ''));

//     if (!prompt) {
//         setHypeBotText(`<span class="hypebot_name">${settings.name}</span> ${EMPTY_VERBS[Math.floor(Math.random() * EMPTY_VERBS.length)]}.`);
//         return;
//     }

//     const sliceLength = MAX_PROMPT - MAX_LENGTH;
//     const encoded = getTextTokens(tokenizers.GPT2, prompt).slice(-sliceLength);

//     // Add a stop string token to the end of the prompt
//     encoded.push(49527);

//     const base64String = await bufferToBase64(new Uint16Array(encoded).buffer);

//     const parameters = {
//         input: base64String,
//         model: 'hypebot',
//         streaming: false,
//         temperature: 1,
//         max_length: MAX_LENGTH,
//         min_length: 1,
//         top_k: 0,
//         top_p: 1,
//         tail_free_sampling: 0.95,
//         repetition_penalty: 1,
//         repetition_penalty_range: 2048,
//         repetition_penalty_slope: 0.18,
//         repetition_penalty_frequency: 0,
//         repetition_penalty_presence: 0,
//         phrase_rep_pen: 'off',
//         bad_words_ids: [],
//         stop_sequences: [[48585]],
//         generate_until_sentence: true,
//         use_cache: false,
//         use_string: false,
//         return_full_text: false,
//         prefix: 'vanilla',
//         logit_bias_exp: [],
//         order: [0, 1, 2, 3],
//     };

//     abortController = new AbortController();

//     const response = await fetch('/api/novelai/generate', {
//         headers: getRequestHeaders(),
//         body: JSON.stringify(parameters),
//         method: 'POST',
//         signal: abortController.signal,
//     });

//     if (response.ok) {
//         const data = await response.json();
//         const ids = Array.from(new Uint16Array(Uint8Array.from(atob(data.output), c => c.charCodeAt(0)).buffer));
//         const tokens = decodeTextTokens(tokenizers.GPT2, ids);
//         const output = (typeof tokens === 'string' ? tokens : tokens.text).replace(/�/g, '').trim();

//         setHypeBotText(formatReply(output));
//     } else {
//         setHypeBotText('<div class="hypebot_error">Something went wrong while generating a HypeBot reply. Please try again.</div>');
//     }
// }

var btree = null;

window['BehaviorTree'] = async (name, args = {}, options = {}) => {
    console.log('MWTEST: generateInterceptor');

    if (!settings.enabled) {
        return;
    }

    if (btree == null) {
        return;
    }
}

// eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, async (data) => {
//     console.log('MWTEST: CHAT_COMPLETION_PROMPT_READY');

//     if (!settings.enabled) {
//         return;
//     }
// });

// eventSource.on(event_types.CHARACTER_MESSAGE_RENDERED, async (data) => {
//     console.log('MWTEST: CHARACTER_MESSAGE_RENDERED');

//     if (!settings.enabled) {
//         return;
//     }
// });

jQuery(async () => {
    console.log('MWTEST: BT start');

    if (!extension_settings.behaviortree) {
        extension_settings.behaviortree = settings;
    }

    Object.assign(settings, extension_settings.hypebot);
    const getContainer = () => $(document.getElementById('behaviortree_container') ?? document.getElementById('extensions_settings2'));
    getContainer().append(await renderExtensionTemplateAsync(MODULE_NAME, 'settings'));

    $('#behaviortree_enabled').prop('checked', settings.enabled).on('input', () => {
        settings.enabled = $('#behaviortree_enabled_enabled').prop('checked');
        Object.assign(extension_settings.behaviortree, settings);
        saveSettingsDebounced();
    });
});
