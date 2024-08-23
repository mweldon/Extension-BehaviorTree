import AsyncBehaviorTree from './tree/AsyncBehaviorTree.js';
import AuroraTree from './tree/AuroraTree.js';
import KoboldCpp from './engine/KoboldCpp.js';

const MODULE_NAME = 'third-party/Extension-BehaviorTree';
const SETTINGS_LAYOUT = 'src/settings';

const settings = {
    enabled: false,
    chatDepth: 0,
    executionFrequency: 1,
    executionCounter: 1,
    chatQueryLength: 30
};

let btree = null;
let lastResponse = '';
let lastChatString = '';

function updateCounter(newValue) {
    const {
        saveSettingsDebounced,
    } = SillyTavern.getContext();

    settings.executionCounter = newValue;
    $('#bt-counter').val(settings.executionCounter)
    saveSettingsDebounced();
}

function buildChatForQuery(coreChat) {
    let chatString = "";
    const maxChatLength = Math.min(settings.chatQueryLength, coreChat.length);
    for (let i = coreChat.length - maxChatLength; i < coreChat.length; i++) {
        const message = coreChat[i];
        chatString += `${message.name}: ${message.mes}\n`;
    }
    return chatString;
}

async function executeBehaviorTree(chatString) {
    try {
        btree.reset();
        btree.setContext(chatString);
        btree.step();
        const response = await btree.getResponse();
        return response;
    } catch {
        console.error(`ERROR executing BehaviorTree`);
        return '';
    }
}

window['BehaviorTree'] = async (coreChat) => {
    const {
        setExtensionPrompt,
        substituteParams
    } = SillyTavern.getContext();

    if (!settings.enabled) {
        return;
    }

    if (btree == null) {
        return;
    }

    if (settings.executionCounter != 1) {
        updateCounter(settings.executionCounter - 1)
        return;
    } else {
        updateCounter(settings.executionFrequency)
    }

    const chatString = buildChatForQuery(coreChat);

    // Reuse the previous response if the chat hasn't changed, i.e. swipes.
    if (lastResponse && lastChatString && chatString === lastChatString) {
        console.log(`Behavior Tree using cached result:\n${lastResponse}`);
        setExtensionPrompt(MODULE_NAME, lastResponse, 1, settings.chatDepth);
        return;
    }

    console.log('Running Behavior Tree');
    let response = await executeBehaviorTree(chatString);
    response = substituteParams(response);
    console.log(`Behavior Tree result:\n${response}`);

    lastChatString = chatString;
    lastResponse = response;

    setExtensionPrompt(MODULE_NAME, response, 1, settings.chatDepth);
}

jQuery(async () => {
    const {
        extensionSettings,
        renderExtensionTemplateAsync,
        saveSettingsDebounced,
        substituteParams
    } = SillyTavern.getContext();

    console.log('BehaviorTree started');

    if (!extensionSettings.behaviortree) {
        extensionSettings.behaviortree = settings;
    }

    Object.assign(settings, extensionSettings.behaviortree);
    const getContainer = () => $(document.getElementById('behaviortree_container') ?? document.getElementById('extensions_settings2'));
    getContainer().append(await renderExtensionTemplateAsync(MODULE_NAME, SETTINGS_LAYOUT));

    $('#bt_enabled').prop('checked', settings.enabled).on('input', () => {
        settings.enabled = $('#bt_enabled').prop('checked');
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt-chat-depth').val(settings.chatDepth).on('input', () => {
        settings.chatDepth = Number($('#bt-chat-depth').val());
        if (settings.chatDepth < 1) {
            $('#bt-parameter-warning').show();
        } else {
            $('#bt-parameter-warning').hide();
        }
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt-execution-frequency').val(settings.executionFrequency).on('input', () => {
        settings.executionFrequency = Number($('#bt-execution-frequency').val());
        settings.executionCounter = Math.min(settings.executionCounter, settings.executionFrequency);
        $('#bt-counter').val(settings.executionCounter)
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt-counter').val(settings.executionCounter).on('input', () => {
        settings.executionCounter = Number($('#bt-counter').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt-chat-length').val(settings.chatQueryLength).on('input', () => {
        settings.chatQueryLength = Number($('#bt-chat-length').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });

    if (settings.chatDepth < 1) {
        $('#bt-parameter-warning').show();
    } else {
        $('#bt-parameter-warning').hide();
    }

    btree = new AsyncBehaviorTree(new KoboldCpp(), new AuroraTree(), substituteParams);
});
