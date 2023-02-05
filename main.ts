import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as dbus from 'dbus-next'
// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: 'default'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();

		try {
			this.bus = dbus.sessionBus();
			this.proxy = await this.bus.getProxyObject('org.gnome.Hamster', '/org/gnome/Hamster');
			this.hamster = await this.proxy.getInterface('org.gnome.Hamster')
		} catch (error) {
			console.log("Hamster is not running or not reachable");
		}

		this.addCommand({
			id: 'start-hamster-timer',
			name: 'Start Hamster timer',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!this.hamster) {
					new Notice("Hamster is not running or not reachable");
					return;
				}
				let cursor = editor.getCursor();
				let line = editor.getLine(cursor.line);
				let task = this.sanitize(line);
				this.hamster.AddFact(task, 0, 0, false);
			}
		});
		
		this.addCommand({
			id: 'stop-hamster-timer',
			name: 'Stop Hamster timer',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				if (!this.hamster) {
					new Notice("Hamster is not running or not reachable");
					return;
				}
				this.hamster.StopTracking(0)
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	sanitize(line: string) {
		return line.replace('- [ ] ', '').trim()
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					console.log('Secret: ' + value);
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
