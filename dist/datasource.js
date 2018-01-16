"use strict";

System.register(["lodash"], function (_export, _context) {
  "use strict";

  var _, _createClass, defaultURL, LightStepDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      defaultURL = "https://api.lightstep.com";

      _export("LightStepDatasource", LightStepDatasource = function () {
        function LightStepDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, LightStepDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url || defaultURL;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.organizationName = instanceSettings.jsonData.organizationName;
          this.projectName = instanceSettings.jsonData.projectName;
          this.apiKey = instanceSettings.jsonData.apiKey;
        }

        _createClass(LightStepDatasource, [{
          key: "headers",
          value: function headers() {
            return {
              'Content-Type': 'application/json',
              'Authorization': "BEARER " + this.apiKey
            };
          }
        }, {
          key: "query",
          value: function query(options) {
            var targets = options.targets.filter(function (t) {
              return !t.hide;
            }).filter(options.targets, function (target) {
              return target.target !== 'select metric';
            });

            if (targets.length <= 0) {
              return this.q.when({ data: [] });
            }
            var savedSearchID = target[0];

            var query = this.buildQueryParameters(options);
            return this.doRequest({
              url: this.url + "/public/v0.1/" + this.organizationName + "/projects/" + this.projectName + "/searches/" + savedSearchID + "/timeseries",
              data: query,
              method: 'POST'
            });
          }
        }, {
          key: "testDatasource",
          value: function testDatasource() {
            return this.doRequest({
              url: this.url + '/',
              method: 'GET'
            }).then(function (response) {
              if (response.status === 200) {
                return { status: "success", message: "Data source is working", title: "Success" };
              }
            }).catch(function (error) {
              return { status: "error", message: error, title: "Error " };
            });
          }
        }, {
          key: "annotationQuery",
          value: function annotationQuery(options) {
            return this.q.when({});
          }
        }, {
          key: "metricFindQuery",
          value: function metricFindQuery(query) {
            return this.q.when({});
          }
        }, {
          key: "doRequest",
          value: function doRequest(options) {
            options.headers = this.headers();
            return this.backendSrv.datasourceRequest(options);
          }
        }, {
          key: "buildQueryParameters",
          value: function buildQueryParameters(options) {
            var _this = this;

            // remove placeholder targets
            options.targets = _;

            var targets = _.map(options.targets, function (target) {
              return {
                target: _this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
                refId: target.refId,
                hide: target.hide,
                type: target.type || 'timeserie'
              };
            });

            options.targets = targets;

            return options;
          }
        }]);

        return LightStepDatasource;
      }());

      _export("LightStepDatasource", LightStepDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
