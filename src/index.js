import AsyncBehaviorTree from './tree/AsyncBehaviorTree.js';
import TestTree from './tree/TestTree.js';
import KoboldCpp from './engine/KoboldCpp.js';

const { extensionSettings, renderExtensionTemplateAsync, saveSettingsDebounced } = SillyTavern.getContext();

const MODULE_NAME = 'third-party/Extension-BehaviorTree';
const SETTINGS_LAYOUT = 'src/settings';

const settings = {
    enabled: false
};

var btree = null;

window['BehaviorTree'] = async (name, args = {}, options = {}) => {
    console.log('BehaviorTree generateInterceptor');

    if (!settings.enabled) {
        return;
    }

    if (btree == null) {
        return;
    }
}

jQuery(async () => {
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

    btree = new AsyncBehaviorTree(new KoboldCpp(), new TestTree());
});
