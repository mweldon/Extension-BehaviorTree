import AsyncBehaviorTree from './tree/AsyncBehaviorTree.js';
import AuroraTree from './tree/AuroraTree.js';
import KoboldCpp from './engine/KoboldCpp.js';

const MODULE_NAME = 'third-party/Extension-BehaviorTree';
const SETTINGS_LAYOUT = 'src/settings';

const settings = {
    enabled: false
};

var btree = null;

window['BehaviorTree'] = async (coreChat) => {
    const {
        name1,
        name2,
        setExtensionPrompt
    } = SillyTavern.getContext();

    console.log(`BehaviorTree generateInterceptor user: ${name1}, char: ${name2}`);

    if (!settings.enabled) {
        return;
    }

    if (btree == null) {
        return;
    }

    let chatString = "";
    const maxChatLength = Math.min(30, coreChat.length);
    for (let i = coreChat.length-maxChatLength; i < coreChat.length; i++) {
        const message = coreChat[i];
        chatString += `${message.name}: ${message.mes}\n`;
    }

    try {
        btree.reset();
        btree.setContext(chatString);
        btree.setTags({
            'user': name1,
            'char': name2
        });

        btree.step();
        const response = await btree.getResponse();
        console.log(`Result: ${response}`);

        setExtensionPrompt(MODULE_NAME, response, 1, 0);
    } catch {
        console.error(`ERROR calling BehaviorTree`);
        setExtensionPrompt(MODULE_NAME, '', 1, 0);
    }
}

jQuery(async () => {
    const {
        extensionSettings,
        renderExtensionTemplateAsync,
        saveSettingsDebounced
    } = SillyTavern.getContext();

    console.log('BehaviorTree started');

    if (!extensionSettings.behaviortree) {
        extensionSettings.behaviortree = settings;
    }

    Object.assign(settings, extensionSettings.behaviortree);
    const getContainer = () => $(document.getElementById('behaviortree_container') ?? document.getElementById('extensions_settings2'));
    getContainer().append(await renderExtensionTemplateAsync(MODULE_NAME, SETTINGS_LAYOUT));

    $('#behaviortree_enabled').prop('checked', settings.enabled).on('input', () => {
        settings.enabled = $('#behaviortree_enabled').prop('checked');
        Object.assign(extensionSettings.behaviortree, settings);
        saveSettingsDebounced();
    });

    btree = new AsyncBehaviorTree(new KoboldCpp(), new AuroraTree());
});
