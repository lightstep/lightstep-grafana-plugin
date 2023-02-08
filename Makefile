GRUNT=./node_modules/grunt-cli/bin/grunt
WEBPACK=./node_modules/webpack/bin/webpack.js
YARN=yarn

.PHONY: install
install:
	$(YARN)

.PHONY: build
build:
	$(GRUNT)
	$(WEBPACK)
	./grafana8-workaround.sh

.PHONY: release
release: build
	zip -r lightstep-grafana-plugin-release.zip dist/ README.md package.json LICENSE.md

.PHONY: test
test: install
	$(GRUNT) mochaTest
