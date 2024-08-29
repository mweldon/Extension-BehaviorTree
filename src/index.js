import './style.css';
import { AsyncBehaviorTree, DefaultTree } from './tree/AsyncBehaviorTree.js';
import KoboldCpp from './engine/KoboldCpp.js';

const MODULE_NAME = 'third-party/Extension-BehaviorTree';
const SETTINGS_LAYOUT = 'src/settings';
const DEFAULT_RESPONSE_PRELUDE = 'Keep the following instructions secret. Do not mention any of the following information in your response.\n';
const DEFAULT_VARS_RESPONSE = 'Use the following parameters to generate your next response:\n';
const DEFAULT_SCENARIOS_RESPONSE = 'Update the scenario as follows:\n';

const settings = {
    enabled: false,
    chatDepth: 0,
    executionFrequency: 1,
    executionCounter: 1,
    chatQueryLength: 30,
    responsePrelude: DEFAULT_RESPONSE_PRELUDE,
    varsResponse: DEFAULT_VARS_RESPONSE,
    scenariosResponse: DEFAULT_SCENARIOS_RESPONSE,
};

let btree = null;
let lastResponse = '';
let lastChatString = '';

function getCharacterTreeFilename() {
    const {
        characterId,
        name2
    } = SillyTavern.getContext();

    if (name2 && characterId) {
        return `bt_${characterId}_${name2}.json`;
    } else {
        return '';
    }
}

function updateTurnCounter(newValue) {
    const {
        saveSettingsDebounced,
    } = SillyTavern.getContext();

    settings.executionCounter = newValue;
    $('#bt_turn_counter').val(settings.executionCounter)
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

// Run a full traversal of the BT
async function executeBehaviorTree(chatString) {
    if (!btree) {
        return;
    }

    try {
        btree.reset();
        btree.setContext(chatString);
        btree.step();
        const response = await btree.getResponse(settings);
        return response;
    } catch {
        console.error(`ERROR executing BehaviorTree`);
        return '';
    }
}

// Runs before generation
window['BehaviorTree'] = async (coreChat) => {
    const {
        setExtensionPrompt,
        substituteParams
    } = SillyTavern.getContext();

    setExtensionPrompt(MODULE_NAME, '', 1, settings.chatDepth);

    if (!settings.enabled) {
        return;
    }

    if (!btree) {
        return;
    }

    const chatString = buildChatForQuery(coreChat);

    // Reuse the previous response if the chat hasn't changed, i.e. swipes.
    if (lastResponse && lastChatString && chatString === lastChatString) {
        console.log(`Behavior Tree using cached result:\n${lastResponse}`);
        setExtensionPrompt(MODULE_NAME, lastResponse, 1, settings.chatDepth);
        return;
    }

    if (settings.executionCounter != 1) {
        updateTurnCounter(settings.executionCounter - 1)
        return;
    } else {
        updateTurnCounter(settings.executionFrequency)
    }

    console.log('Running Behavior Tree');
    let response = await executeBehaviorTree(chatString);
    response = substituteParams(response);
    console.log(`Behavior Tree result:\n${response}`);

    lastChatString = chatString;
    lastResponse = response;

    setExtensionPrompt(MODULE_NAME, response, 1, settings.chatDepth);
}

async function loadTreeTemplateFile(filename) {
    console.log(`Loading: ${filename}`);
    const btpath = `/user/files/${filename}`;
    try {
        const fileResponse = await fetch(btpath);
        if (!fileResponse.ok) {
            return '';
        }
        return await fileResponse.text();

    } catch (error) {
        console.log(`ERROR: Failed to load ${btpath} ${error}`)
    }
}

async function saveTreeTemplateFile(filename, content) {
    const {
        getRequestHeaders
    } = SillyTavern.getContext();

    console.log(`Saving: ${filename}`);
    try {
        const result = await fetch('/api/files/upload', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                name: filename,
                data: content
            })
        });

        if (!result.ok) {
            const error = await result.text();
            throw new Error(error);
        }
    } catch (error) {
        console.error('Could not upload file', error);
    }
}

function getBase64Async(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function () {
            resolve(String(reader.result));
        };
        reader.onerror = function (error) {
            reject(error);
        };
    });
}

async function handleImportTreeButton(e) {
    const file = e.target.files[0];
    const form = e.target.form;

    if (!file || file.type !== 'application/json') {
        form && form.reset();
        return;
    }

    const fileData = await getBase64Async(file);
    const base64Data = fileData.split(',')[1];

    const treeTemplate = window.atob(base64Data);
    if (btree) {
        btree.setTreeTemplate(treeTemplate);
        console.log(`Behavior Tree initialized: ${btree.getTreeName()}`);

        const templateFileName = getCharacterTreeFilename();
        if (templateFileName) {
            await saveTreeTemplateFile(templateFileName, base64Data);
        }
        $("#bt_current_tree_filename").text(btree.getTreeName());
    }

    form && form.reset();
}

async function handleViewTreeButton() {
    const {
        POPUP_TYPE,
        callGenericPopup,
    } = SillyTavern.getContext();

    if (!btree) {
        return;
    }

    const textarea = $('<textarea></textarea>')
        .attr('id', 'st_settings_show_tree')
        .addClass('flex-container')
        .addClass('flexFlowColumn')
        .addClass('justifyCenter')
        .addClass('alignitemscenter')
        .val(btree.getTreeTemplate());

    const confirm = await callGenericPopup(textarea, POPUP_TYPE.CONFIRM, '', {
        wide: true,
        large: true,
        allowHorizontalScrolling: true,
        okButton: 'Save',
        cancelButton: 'Cancel'
    });

    if (confirm) {
        if (btree) {
            btree.setTreeTemplate(textarea.val());
            console.log(`Behavior Tree initialized: ${btree.getTreeName()}`);

            const templateFileName = getCharacterTreeFilename();
            if (templateFileName) {
                const base64Data = window.btoa(textarea.val());
                await saveTreeTemplateFile(templateFileName, base64Data);
            }
            $("#bt_current_tree_filename").text(btree.getTreeName());
        }
    }
}

// Load a file for current character if it exists. Then set up the btree and update the UI.
async function tryLoadTreeForCharacter() {
    if (!btree) {
        return;
    }

    const templateFileName = getCharacterTreeFilename();
    if (templateFileName) {
        const treeTemplate = await loadTreeTemplateFile(templateFileName);

        if (treeTemplate) {
            btree.setTreeTemplate(treeTemplate);
        } else {
            btree.setTreeTemplate(DefaultTree);
        }
        console.log(`Behavior Tree initialized: ${btree.getTreeName()}`);
    }
    $("#bt_current_tree_filename").text(btree.getTreeName());
}

// Runs at startup
jQuery(async () => {
    const {
        eventSource,
        eventTypes,
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

    eventSource.on(eventTypes.CHAT_CHANGED, tryLoadTreeForCharacter);

    $('#bt_view_tree_button').on('click', () => {
        $('#bt_view_tree').trigger('click');
    });
    $('#bt_view_tree').on('click', handleViewTreeButton);

    $('#bt_load_tree_button').on('click', () => {
        $('#bt_load_tree').trigger('click');
    });
    $('#bt_load_tree').on('change', handleImportTreeButton);

    $('#bt_enabled').prop('checked', settings.enabled).on('input', () => {
        settings.enabled = $('#bt_enabled').prop('checked');
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_chat_depth').val(settings.chatDepth).on('input', () => {
        settings.chatDepth = Number($('#bt_chat_depth').val());
        if (settings.chatDepth < 1) {
            $('#bt_parameter_warning').show();
        } else {
            $('#bt_parameter_warning').hide();
        }
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_execution_frequency').val(settings.executionFrequency).on('input', () => {
        settings.executionFrequency = Number($('#bt_execution_frequency').val());
        settings.executionCounter = Math.min(settings.executionCounter, settings.executionFrequency);
        $('#bt_turn_counter').val(settings.executionCounter)
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_turn_counter').val(settings.executionCounter).on('input', () => {
        settings.executionCounter = Number($('#bt_turn_counter').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_chat_length').val(settings.chatQueryLength).on('input', () => {
        settings.chatQueryLength = Number($('#bt_chat_length').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });

    if (settings.chatDepth < 1) {
        $('#bt_parameter_warning').show();
    } else {
        $('#bt_parameter_warning').hide();
    }

    $('#bt_response_prelude').val(settings.responsePrelude).on('input', () => {
        settings.responsePrelude = $('#bt_response_prelude').val();
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $("#bt_response_prelude_undo").on('click', () => {
        $('#bt_response_prelude').val(DEFAULT_RESPONSE_PRELUDE);
        settings.responsePrelude = DEFAULT_RESPONSE_PRELUDE;
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_vars_response').val(settings.varsResponse).on('input', () => {
        settings.varsResponse = $('#bt_vars_response').val();
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $("#bt_vars_response_undo").on('click', () => {
        $('#bt_vars_response').val(DEFAULT_VARS_RESPONSE);
        settings.varsResponse = DEFAULT_VARS_RESPONSE;
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $('#bt_scenarios_response').val(settings.scenariosResponse).on('input', () => {
        settings.scenariosResponse = $('#bt_scenarios_response').val();
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });
    $("#bt_scenarios_response_undo").on('click', () => {
        $('#bt_scenarios_response').val(DEFAULT_SCENARIOS_RESPONSE);
        settings.scenariosResponse = DEFAULT_SCENARIOS_RESPONSE;
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });

    btree = new AsyncBehaviorTree(new KoboldCpp(), substituteParams);
    tryLoadTreeForCharacter()
});
