import './style.css';
import { AsyncBehaviorTree, DefaultTree } from './tree/AsyncBehaviorTree.js';
import KoboldCpp from './engine/KoboldCpp.js';
import MainApi from './engine/MainApi.js';
import { bt_logo, bt_logo_disabled } from './images.js';

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
    chatQueryLength: 20,
    responsePrelude: DEFAULT_RESPONSE_PRELUDE,
    varsResponse: DEFAULT_VARS_RESPONSE,
    scenariosResponse: DEFAULT_SCENARIOS_RESPONSE,
    backendApi: 'main',
    koboldCppEndpoint: 'http://127.0.0.1:5001',
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
    } catch (error) {
        console.error('Error executing behavior tree:', error);
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

    // This is a guess, but probably good.
    const isSwipe = lastChatString && chatString === lastChatString;

    // Reuse the previous response for swipes.
    if (lastResponse && isSwipe) {
        console.log(`Behavior Tree using cached result:\n${lastResponse}`);
        setExtensionPrompt(MODULE_NAME, lastResponse, 1, settings.chatDepth);
        return;
    }

    if (settings.executionCounter > 1) {
        // Don't decrement the counter for swipes
        if (!isSwipe) {
            updateTurnCounter(settings.executionCounter - 1)
        }
        lastResponse = '';
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
    const btpath = `/user/files/${filename}`;
    let result = '';
    try {
        console.log(`Loading: ${btpath}`);
        const fileResponse = await fetch(btpath);
        if (fileResponse.ok) {
            result = await fileResponse.text();
        }
    } catch (error) {
        console.error(`Error loading ${btpath}:`, error);
    }

    return result;
}

async function saveTreeTemplateFile(filename, content) {
    const {
        getRequestHeaders
    } = SillyTavern.getContext();

    try {
        console.log(`Saving: ${filename}`);
        const result = await fetch('/api/files/upload', {
            method: 'POST',
            headers: getRequestHeaders(),
            body: JSON.stringify({
                name: filename,
                data: content
            })
        });

        if (!result.ok) {
            console.error(await result.text());
        }
    } catch (error) {
        console.error('Error uploading file:', error);
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

function enableLoadSave(isEnabled) {
    if (isEnabled) {
        //console.log("save enabled");
        $('#bt_view_tree_button').off('click').on('click', () => {
            $('#bt_view_tree').trigger('click');
        });
        $('#bt_view_tree').off('click').on('click', handleViewTreeButton);

        $('#bt_view_state_button').off('click').on('click', () => {
            $('#bt_view_state').trigger('click');
        });
        $('#bt_view_state').off('click').on('click', handleViewStateButton);

        $('#bt_load_tree_button').off('click').on('click', () => {
            $('#bt_load_tree').trigger('click');
        });
        $('#bt_load_tree').off('change').on('change', handleImportTreeButton);

        $('#bt_restore_tree_button').off('click').on('click', () => {
            $('#bt_restore_tree').trigger('click');
        });
        $('#bt_restore_tree').off('click').on('click', handleRestoreTreeButton);
    } else {
        //console.log("save disabled");
        $('#bt_view_tree_button').off('click');
        $('#bt_view_tree').off('click');
        $('#bt_view_state_button').off('click');
        $('#bt_view_state').off('click');
        $('#bt_load_tree_button').off('click');
        $('#bt_load_tree').off('change');
        $('#bt_restore_tree_button').off('click');
        $('#bt_restore_tree').off('click');
    }
}

async function handleImportTreeButton(e) {
    const file = e.target.files[0];
    const form = e.target.form;

    if (!btree) {
        return;
    }

    if (!file || file.type !== 'application/json') {
        form && form.reset();
        $(this).val('');
        return;
    }

    try {
        enableLoadSave(false);

        const fileData = await getBase64Async(file);
        const base64Data = fileData.split(',')[1];

        const treeTemplate = window.atob(base64Data);
        reloadTreeAndSave(treeTemplate, base64Data);
    } catch (error) {
        console.error('Error saving tree:', error)
    } finally {
        enableLoadSave(true);
    }

    form && form.reset();
    $(this).val('');
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
        .attr('id', 'bt_settings_show_tree')
        .addClass('flex-container')
        .addClass('flexFlowColumn')
        .addClass('justifyCenter')
        .addClass('alignitemscenter')
        .val(btree.getTreeTemplate());

    const editSave = await callGenericPopup(textarea, POPUP_TYPE.CONFIRM, '', {
        wide: true,
        large: true,
        allowHorizontalScrolling: true,
        okButton: 'Save',
        cancelButton: 'Cancel'
    });

    try {
        enableLoadSave(false);

        if (editSave) {
            reloadTreeAndSave(textarea.val(), null);
        }
    } catch (error) {
        console.error('Error saving tree:', error)
    } finally {
        enableLoadSave(true);
    }
}

async function handleViewStateButton() {
    const {
        POPUP_TYPE,
        callGenericPopup,
    } = SillyTavern.getContext();

    if (!btree) {
        return;
    }

    const textarea = $('<textarea></textarea>')
        .attr('id', 'bt_settings_show_tree')
        .addClass('flex-container')
        .addClass('flexFlowColumn')
        .addClass('justifyCenter')
        .addClass('alignitemscenter')
        .val(btree.getState());

    const confirm = await callGenericPopup(textarea, POPUP_TYPE.CONFIRM, '', {
        wide: true,
        large: true,
        allowHorizontalScrolling: true,
        okButton: 'Save',
        cancelButton: 'Cancel'
    });

    try {
        enableLoadSave(false);

        if (confirm) {
            lastChatString = null;   // Clear the cached response

            btree.setState(textarea.val());
        }
    } catch (error) {
        console.error('Error saving state data:', error)
    } finally {
        enableLoadSave(true);
    }
}

async function handleRestoreTreeButton() {
    const {
        POPUP_TYPE,
        callGenericPopup,
    } = SillyTavern.getContext();

    if (!btree) {
        return;
    }

    const confirm = await callGenericPopup("Do you want to overwrite the behavior tree with an empty tree?", POPUP_TYPE.CONFIRM);

    try {
        enableLoadSave(false);

        if (confirm) {
            reloadTreeAndSave(DefaultTree, null);
        }
    } catch (error) {
        console.error('Error saving tree:', error)
    } finally {
        enableLoadSave(true);
    }
}

function setQueryApi(source) {
    if (!btree) {
        return;
    }

    if (source === 'main') {
        console.log('Setting Main API engine for Behavior Tree');
        btree.setEngine(new MainApi());
    } else if (source == 'koboldcpp') {
        console.log('Setting KoboldCpp engine for Behavior Tree');
        btree.setEngine(new KoboldCpp(settings.koboldCppEndpoint));
    }
}

function switchSourceControls(source) {
    $('#bt_settings [data-bt-query-source]').each((_, element) => {
        const sourceElement = element.dataset.btQuerySource.split(',').map(s => s.trim());
        $(element).toggle(sourceElement.includes(source));
    });
}

async function reloadTreeAndSave(treeTemplate, base64Data) {
    const {
        POPUP_TYPE,
        callGenericPopup,
    } = SillyTavern.getContext();

    lastChatString = null;   // Clear the cached response

    const confirm = await callGenericPopup("Do you want to clear the state data?", POPUP_TYPE.CONFIRM);

    btree.setTreeTemplate(treeTemplate, confirm);
    console.log(`Behavior Tree initialized: ${btree.getTreeName()}`);

    const templateFileName = getCharacterTreeFilename();
    if (templateFileName) {
        if (!base64Data) {
            base64Data = window.btoa(treeTemplate);
        }
        await saveTreeTemplateFile(templateFileName, base64Data);
    }

    $("#bt_current_tree_filename").text(btree.getTreeName());
}

// Load a file for current character if it exists. Then set up the btree and update the UI.
async function tryLoadTreeForCharacter() {
    if (!btree) {
        return;
    }

    const templateFileName = getCharacterTreeFilename();
    if (templateFileName) {
        lastChatString = null;   // Clear the cached response

        const treeTemplate = await loadTreeTemplateFile(templateFileName);

        if (treeTemplate) {
            btree.setTreeTemplate(treeTemplate, true);
        } else {
            btree.setTreeTemplate(DefaultTree, true);
        }
        console.log(`Behavior Tree initialized: ${btree.getTreeName()}`);
    }
    $("#bt_current_tree_filename").text(btree.getTreeName());
}

function updateLogo() {
    $('#bt_logo_image').attr("src", settings.enabled ? bt_logo : bt_logo_disabled);
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

    console.log('Behavior Tree extension started');

    if (!extensionSettings.behaviortree) {
        extensionSettings.behaviortree = settings;
    }

    Object.assign(settings, extensionSettings.behaviortree);
    const getContainer = () => $(document.getElementById('behaviortree_container') ?? document.getElementById('extensions_settings2'));
    getContainer().append(await renderExtensionTemplateAsync(MODULE_NAME, SETTINGS_LAYOUT));

    eventSource.on(eventTypes.CHAT_CHANGED, tryLoadTreeForCharacter);

    enableLoadSave(true);

    updateLogo();

    $('#bt_enabled').prop('checked', settings.enabled).on('input', () => {
        settings.enabled = $('#bt_enabled').prop('checked');
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
        updateLogo();
    });
    $('#bt_query_api').val(settings.backendApi).on('change', () => {
        settings.backendApi = String($('#bt_query_api').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
        setQueryApi(settings.backendApi);
        switchSourceControls(settings.backendApi);
    });
    $('#bt_koboldcpp_api_url_text').val(settings.koboldCppEndpoint).on('change', () => {
        settings.koboldCppEndpoint = String($('#bt_koboldcpp_api_url_text').val());
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
        setQueryApi(settings.backendApi);
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

    btree = new AsyncBehaviorTree(null, substituteParams);
    setQueryApi(settings.backendApi);
    switchSourceControls(settings.backendApi);
    tryLoadTreeForCharacter();
});
