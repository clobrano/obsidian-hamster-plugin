import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, parseYaml } from 'obsidian';
import * as dbus from 'dbus-next'
// Remember to rename these classes and interfaces!

interface ObsidianForHamsterSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ObsidianForHamsterSettings = {
	mySetting: 'default'
}

export default class ObsidianForHamster extends Plugin {
	settings: ObsidianForHamsterSettings;

	async onload() {
		await this.loadSettings();
		await this.hamsterConnect();

		this.addCommand({
			id: 'start-hamster-timer',
			name: 'Start Hamster timer',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				this.hamsterConnect();
				if (!this.hamster) {
					new Notice("Hamster is not running or not reachable");
					return;
				}
				let file = app.workspace.getActiveFile();
				let metadata = await this.getFrontmatterMetadata(file);
				let line = this.getCurrentLine(editor);
				let task = this.composeTask(line, metadata);
				if (!task)
					return
				this.hamster.AddFact(task, 0, 0, false);
			}
		});

		this.addCommand({
			id: 'stop-hamster-timer',
			name: 'Stop Hamster timer',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.hamsterConnect();
				if (!this.hamster) {
					new Notice("Hamster is not running or not reachable");
					return;
				}
				this.hamster.StopTracking(0)
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		//this.addSettingTab(new SampleSettingTab(this.app, this));

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

	async hamsterConnect() {
		if (!this.hamster) {
			try {
				this.bus = dbus.sessionBus();
				this.proxy = await this.bus.getProxyObject('org.gnome.Hamster', '/org/gnome/Hamster');
				this.hamster = await this.proxy.getInterface('org.gnome.Hamster')
			} catch (error) {
				console.log("Hamster is not running or not reachable");
			}
		}
	}

	sanitize(line: string) {
		line = line.replaceAll('- [ ] ', '')
		line = line.replaceAll('[[#', '')
		line = line.replaceAll('[[', '')
		line = line.replaceAll(']]', '')
		line = line.replaceAll('`', '')
		return line.trim()
	}

	isTask(line: string) {
		return line.startsWith('- [ ]');
	}

	async getFrontmatterMetadata(file: TFile) {
		let metadata = {}
		const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter
		if (!frontmatter) {
			return metadata
		}
		const {position: {start, end}} = frontmatter;
		const filecontent = await this.app.vault.cachedRead(file);

		const yamlContent: string = filecontent.split("\n").slice(start.line, end.line).join("\n")
		const parsedYaml = parseYaml(yamlContent);

		for (const key in parsedYaml) {
			metadata[key] = parsedYaml[key]
		}
		return metadata
	}

	getCurrentLine(editor: Editor) {
		let cursor = editor.getCursor();
		return editor.getLine(cursor.line);
	}

	composeTask(line: string, metadata) {
		if (!this.isTask(line)) {
			new Notice("This is not an actionable item");
			return null;
		}

		let task = this.sanitize(line);

		if (!task.includes("@") && metadata["project"]) {
			let project = metadata["project"]
			if (task.includes(",,")) {
				// project goes before ",,"
				const parts = task.split(",,")
				task = parts[0] + "@" + project + ",," + parts[1]
			} else {
				task += "@" + project;
			}
		}

		if (metadata["tags"]) {
			let tags = this.getTagsFromMetadata(metadata)
			console.log(tags);
			if (!task.includes(",,")) {
				task += ",,"
			}
			task += tags;
		}
		console.log(task)
		return task;
	}

	getTagsFromMetadata(metadata) {
		let tags = ""

		if (!metadata["tags"]) {
			return tags;
		}
		let parts = []
		if (Array.isArray(metadata["tags"])) {
			parts = metadata["tags"];
		} else {
			parts = metadata["tags"].split(",")
		}

		for(const i in parts) {
			tags += " #" + parts[i].trim() + ",";
		}

		return tags;
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ObsidianForHamster;

	constructor(app: App, plugin: ObsidianForHamster) {
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
