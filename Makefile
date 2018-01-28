GRUNT=./node_modules/grunt-cli/bin/grunt
WEBPACK=./node_modules/webpack/bin/webpack.js
YARN=yarn

.PHONY: install
install:
	$(YARN)

.PHONY: build
build: install
	$(GRUNT)
	$(WEBPACK)

.PHONY: test
test: install
	$(GRUNT) mochaTest
