import { IAppAccessors, IConfigurationExtend, IConfigurationModify, IEnvironmentRead, IHttp, ILogger, IMessageBuilder, IMessageExtender, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IMessage, IMessageAttachment, IPreMessageSentModify } from '@rocket.chat/apps-engine/definition/messages';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType, ISetting } from '@rocket.chat/apps-engine/definition/settings';

export class FilterApp extends App implements IPreMessageSentModify {
    private filterList;

    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
        this.filterList = [];
    }

    private parseConfig(text) {
        let newFilterList = [];

        try {
            newFilterList = JSON.parse(text);
            this.filterList = newFilterList;

            return true;
        } catch (e) {
            return false;
        }
    }

    public async onEnable(environment: IEnvironmentRead, configurationModify: IConfigurationModify): Promise<boolean> {
        const metaFilterList = await environment.getSettings().getValueById('filterList') as string;

        return this.parseConfig(metaFilterList);
    }

    public async onSettingUpdated(setting: ISetting, configurationModify: IConfigurationModify, read: IRead, http: IHttp): Promise<void> {
        if (setting.id !== 'filterList') {
            return;
        }

        this.parseConfig(setting.value);
    }

    public async checkPreMessageSentModify(message: IMessage): Promise<boolean> {
        return typeof message.text === 'string';
    }

    public async executePreMessageSentModify(message: IMessage, builder: IMessageBuilder, read: IRead, http: IHttp, persistence: IPersistence): Promise<IMessage> {
        let text = message.text || '';

        Object.keys(this.filterList).forEach((key) => {
            const filter = this.filterList[key] || {};

            text = text.replace(new RegExp(filter.regex || '', filter.flags || 'gi'), filter.replacement || '');
        });

        return builder.setText(text).getMessage();
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
        await configuration.settings.provideSetting({
            id: 'filterList',
            type: SettingType.STRING,
            packageValue: '[\n  {\n    "regex": "rocketchat",\n    "flags": "gi",\n    "replacement": "Rocket.Chat"\n  }\n]',
            required: false,
            public: false,
            multiline: true,
            i18nLabel: 'FilterApp_FilterList',
            i18nDescription: 'FilterApp_FilterList_Description',
        });
    }
}
