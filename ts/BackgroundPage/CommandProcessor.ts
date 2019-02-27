/// <reference path="../DI/-DI.ts" />
/// <reference path="../Settings/ISettingsBus.ts" />
/// <reference path="../Settings/IStorageManager.ts" />
/// <reference path="../Settings/ColorScheme.ts" />
/// <reference path="./ICommandListener.ts" />

namespace MidnightLizard.BackgroundPage
{
    export abstract class ICommandProcessor { }

    @DI.injectable(ICommandProcessor)
    class CommandProcessor implements ICommandProcessor
    {
        constructor(commandListener: MidnightLizard.BackgroundPage.ICommandListener,
            protected readonly _settingsBus: MidnightLizard.Settings.ISettingsBus,
            protected readonly _storageManager: MidnightLizard.Settings.IStorageManager)
        {
            commandListener.onCommand.addListener(this.processCommand, this);
        }

        protected async processCommand(command?: string)
        {
            console.log(command);
            switch (command)
            {
                case "global-toggle":
                    this._storageManager.get<{ isEnabled: boolean }>({ isEnabled: true })
                        .then(global =>
                        {
                            this._storageManager.set({ isEnabled: !global.isEnabled });
                            this._settingsBus.toggleIsEnabled(!global.isEnabled)
                                .then(tabRequests => tabRequests
                                    .forEach(req => req
                                        .catch(ex => console.error("Toggle request to the tab faild with: " + ex.message || ex))));
                        });
                    break;

                case "current-toggle":
                    try
                    {
                        const currentSettings = await this._settingsBus.getCurrentSettings();
                        currentSettings.runOnThisSite = !currentSettings.runOnThisSite;
                        this._settingsBus.applySettings(currentSettings);
                    }
                    catch (ex)
                    {
                        console.error("Current website toggle request to the tab faild with: " + ex.message || ex);
                    }
                    break;

                default:
                    break;
            }
        }
    }
}