'use strict';

System.register(['lodash', 'moment', 'app/core/app_events'], function (_export, _context) {
  "use strict";

  var _, moment, appEvents, _createClass, defaultApiURL, defaultDashboardURL, maxDataPointsServer, minResolutionServer, LightStepDatasource;

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

      defaultApiURL = "https://api.lightstep.com";
      defaultDashboardURL = "https://app.lightstep.com";
      maxDataPointsServer = 1440;
      minResolutionServer = 60000;


      // TODO - this is a work around given the existing graph API
      // Having a better mechanism for click capture would be ideal.
      appEvents.on('graph-click', function (options) {
        var link = _.get(options, ['ctrl', 'dataList', _.get(options, ['item', 'seriesIndex']), 'datapoints', _.get(options, ['item', 'dataIndex']), 'link']);
        if (link) {
          window.open(link, '_blank');
        }
      });

      _export('LightStepDatasource', LightStepDatasource = function () {
        function LightStepDatasource(instanceSettings, $q, backendSrv, templateSrv) {
          _classCallCheck(this, LightStepDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url || defaultApiURL;
          this.dashboardURL = instanceSettings.jsonData.dashboardURL || defaultDashboardURL;
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
            var maxDataPoints = options.maxDataPoints;

            if (targets.length <= 0) {
              return this.q.when({ data: [] });
            }

            var responses = targets.map(function (target) {
              var savedSearchID = target.target;

              var query = _this.buildQueryParameters(options, target, maxDataPoints);
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

                return _.concat(_this.parseLatencies(name, attributes), _this.parseExemplars(name, attributes, maxDataPoints));
              });

              return { data: data };
            });
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return metricFindQuery().then(function (response) {
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
          value: function metricFindQuery() {
            return this.doRequest({
              url: this.url + '/public/v0.1/' + this.organizationName + '/projects/' + this.projectName + '/searches',
              method: 'GET'
            }).then(function (response) {
              var searches = response.data.data;
              return _.flatMap(searches, function (search) {
                var attributes = search["attributes"];
                var name = attributes["name"];
                var query = attributes["query"];
                var savedSearchId = search["id"];

                // Don't duplicate if the name and query are the same
                if (name.trim() === query.trim()) {
                  return [{ text: name, value: savedSearchId }];
                }

                return [{ text: query, value: savedSearchId }, { text: name, value: savedSearchId }];
              });
            });
          }
        }, {
          key: 'doRequest',
          value: function doRequest(options) {
            options.headers = this.headers();
            return this.backendSrv.datasourceRequest(options);
          }
        }, {
          key: 'buildQueryParameters',
          value: function buildQueryParameters(options, target, maxDataPoints) {
            var oldest = options.range.from;
            var youngest = options.range.to;

            var resolutionMs = Math.max(youngest.diff(oldest) / Math.min(maxDataPoints, maxDataPointsServer), minResolutionServer);

            return {
              "oldest-time": oldest.format(),
              "youngest-time": youngest.format(),
              "resolution-ms": Math.floor(resolutionMs),
              "include-exemplars": target.showExemplars ? "1" : "0",
              "percentile": this.extractPercentiles(target.percentiles)
            };
          }
        }, {
          key: 'parseLatencies',
          value: function parseLatencies(name, attributes) {
            if (!attributes["time-windows"] || !attributes["latencies"]) {
              return [];
            }

            var timeWindows = attributes["time-windows"].map(function (timeWindow) {
              var oldest = moment(timeWindow["oldest-time"]);
              var youngest = moment(timeWindow["youngest-time"]);
              return moment((oldest + youngest) / 2);
            });

            return attributes["latencies"].map(function (latencies) {
              return {
                target: name + ' p' + latencies["percentile"],
                datapoints: _.zip(latencies["latency-ms"], timeWindows)
              };
            });
          }
        }, {
          key: 'parseExemplars',
          value: function parseExemplars(name, attributes, maxDataPoints) {
            var exemplars = attributes["exemplars"];
            if (!exemplars) {
              return [];
            }
            var exemplarMap = _.groupBy(exemplars, function (exemplar) {
              return exemplar["has_error"];
            });

            return _.concat(this.parseExemplar(name + ' exemplars', exemplarMap[false], maxDataPoints), this.parseExemplar(name + ' error exemplars', exemplarMap[true], maxDataPoints));
          }
        }, {
          key: 'parseExemplar',
          value: function parseExemplar(name, exemplars, maxDataPoints) {
            var _this2 = this;

            if (!exemplars) {
              return [];
            }
            if (maxDataPoints && exemplars.length > maxDataPoints) {
              var skip = Math.floor(exemplars.length / maxDataPoints) + 1;
              exemplars = exemplars.filter(function (ignored, index) {
                return index % skip === 0;
              });
            }
            return [{
              target: name,
              datapoints: exemplars.map(function (exemplar) {
                return {
                  0: exemplar["duration_micros"] / 1000,
                  1: moment((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2 / 1000),
                  "link": _this2.traceLink(exemplar)
                };
              })
            }];
          }
        }, {
          key: 'traceLink',
          value: function traceLink(exemplar) {
            var spanGuid = exemplar["span_guid"];
            if (!spanGuid) {
              return;
            }
            return this.dashboardURL + '/' + this.projectName + '/trace?span_guid=' + spanGuid;
          }
        }, {
          key: 'extractPercentiles',
          value: function extractPercentiles(percentiles) {
            if (!percentiles) {
              return [];
            }
            return percentiles.toString().split(",").map(function (percentile) {
              return percentile.replace(/(^\s+|\s+$)/g, '');
            }).filter(function (percentile) {
              return percentile;
            });
          }
        }]);

        return LightStepDatasource;
      }());

      _export('LightStepDatasource', LightStepDatasource);
    }
  };
});
//# sourceMappingURL=datasource.js.map
