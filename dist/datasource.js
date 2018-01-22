'use strict';

System.register(['lodash', 'moment', 'app/core/app_events'], function (_export, _context) {
  "use strict";

  var _, moment, appEvents, _createClass, defaultURL, LightStepDatasource;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_lodash) {
      _ = _lodash.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreApp_events) {
      appEvents = _appCoreApp_events.default;
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


      appEvents.on('graph-click', function (options) {
        console.log('TODO(LS-2233) - somehow open the lightstep trace summary page of ' + options["item"]);
      });

      _export('LightStepDatasource', LightStepDatasource = function () {
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
          key: 'headers',
          value: function headers() {
            return {
              'Content-Type': 'application/json',
              'Authorization': "BEARER " + this.apiKey
            };
          }
        }, {
          key: 'query',
          value: function query(options) {
            var _this = this;

            var targets = options.targets.filter(function (t) {
              return !t.hide;
            });

            if (targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            var responses = targets.map(function (target) {
              var savedSearchID = target.target;

              var query = _this.buildQueryParameters(options);
              var response = _this.doRequest({
                url: _this.url + '/public/v0.1/' + _this.organizationName + '/projects/' + _this.projectName + '/searches/' + savedSearchID + '/timeseries',
                method: 'GET',
                params: query
              });

              return response;
            });

            return this.q.all(responses).then(function (results) {
              var data = _.flatMap(results, function (result) {
                var data = result["data"]["data"];
                var attributes = data["attributes"];
                var name = data["id"].replace("/timeseries", "");

                var exemplars = {
                  target: name + ' exemplars',
                  datapoints: attributes["exemplars"].map(function (exemplar) {
                    return [exemplar["duration_micros"] / 1000, moment((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2 / 1000)];
                  })
                };

                var timeWindows = attributes["time-windows"].map(function (timeWindow) {
                  var oldest = moment(timeWindow["oldest-time"]);
                  var youngest = moment(timeWindow["youngest-time"]);
                  return moment((oldest + youngest) / 2);
                });

                return _.concat(attributes["latencies"].map(function (latencies) {
                  return {
                    target: name + ' p' + latencies["percentile"],
                    datapoints: _.zip(latencies["latency-ms"], timeWindows)
                  };
                }), [exemplars]);
              });

              return { data: data };
            });
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return this.doRequest({
              url: this.url + '/public/v0.1/' + this.organizationName + '/projects/' + this.projectName + '/',
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
          key: 'annotationQuery',
          value: function annotationQuery(options) {
            return this.q.when({});
          }
        }, {
          key: 'metricFindQuery',
          value: function metricFindQuery(query) {
            // TODO(LS-2230) - implement auto-complete here.
            return this.q.when({});
          }
        }, {
          key: 'doRequest',
          value: function doRequest(options) {
            options.headers = this.headers();
            return this.backendSrv.datasourceRequest(options);
          }
        }, {
          key: 'buildQueryParameters',
          value: function buildQueryParameters(options) {
            var oldest = options.range.from;
            var youngest = options.range.to;
            var resolutionMs = Math.max(60000, oldest.diff(youngest) / 1440);

            return {
              "oldest-time": oldest.format(),
              "youngest-time": youngest.format(),
              "resolution-ms": Math.floor(resolutionMs),
              // TODO(LS-2278) - both of these configurable.
              "include-exemplars": "1",
              "percentile": ["50", "99", "99.9", "99.99"]
            };
          }
        }]);

        return LightStepDatasource;
      }());

      _export('LightStepDatasource', LightStepDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
