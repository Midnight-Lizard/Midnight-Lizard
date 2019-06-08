import { injectable } from "../Utils/DI";
import { ICommandListener } from "./ICommandListener";
import { ISettingsBus } from "../Settings/ISettingsBus";
import { IStorageManager } from "../Settings/IStorageManager";

export abstract class ICommandProcessor { }

@injectable(ICommandProcessor)
export class CommandProcessor implements ICommandProcessor
{
    constructor(commandListener: ICommandListener,
        protected readonly _settingsBus: ISettingsBus,
        protected readonly _storageManager: IStorageManager)
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