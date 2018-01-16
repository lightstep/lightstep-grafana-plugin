GRUNT=./node_modules/grunt-cli/bin/grunt
YARN=yarn

.PHONY: install
install:
	$(YARN)

.PHONY: build
build: install
	$(GRUNT)

.PHONY: test
test: install
	$(GRUNT) mochaTest
