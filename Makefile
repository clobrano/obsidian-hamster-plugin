SRCS := main.js styles.css manifest.json
VAULT := ~/workspace/testVault/.obsidian/plugins/obsidian-hamster-plugin

build:
	npm run dev

install: ${SRCS}
	cp $^ ${VAULT}
