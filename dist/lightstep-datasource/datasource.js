'use strict';

System.register(['lodash', 'moment', 'app/core/app_events'], function (_export, _context) {
  "use strict";

  var _, moment, appEvents, _createClass, maxDataPointsServer, minResolutionServer, LightStepDatasource;

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
          this.url = instanceSettings.url;
          this.dashboardURL = instanceSettings.jsonData.dashboardURL;
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
              var savedSearchID = _this.templateSrv.replace(target.target);
              var savedSearchName = _this.templateSrv.replaceWithText(target.target);

              if (!savedSearchID) {
                return _this.q.when(undefined);
              }

              var query = _this.buildQueryParameters(options, target, maxDataPoints);
              var showErrorCountsAsRate = Boolean(target.showErrorCountsAsRate);
              var response = _this.doRequest({
                url: _this.url + '/public/v0.1/' + _this.organizationName + '/projects/' + _this.projectName + '/searches/' + savedSearchID + '/timeseries',
                method: 'GET',
                params: query
              });

              response.then(function (result) {
                if (result && result["data"]["data"]) {
                  if (target.displayName) {
                    result["data"]["data"]["name"] = _this.templateSrv.replaceWithText(target.displayName);
                  } else {
                    result["data"]["data"]["name"] = savedSearchName;
                  }
                }
              });

              return response.then(function (res) {
                res.showErrorCountsAsRate = showErrorCountsAsRate;
                return res;
              });
            });

            return this.q.all(responses).then(function (response) {
              var data = _.flatMap(response, function (result) {
                if (!result) {
                  return [];
                }
                var data = result["data"]["data"];
                var attributes = data["attributes"];
                var name = data["name"];
                var ops = _this.parseCount(name + ' Ops counts', "ops-counts", attributes);
                var errs = _this.parseCount(name + ' Error counts', "error-counts", attributes);
                if (result.showErrorCountsAsRate) {
                  errs = _this.parseRateFromCounts(name + ' Error rate', errs, ops);
                }

                return _.concat(_this.parseLatencies(name, attributes), _this.parseExemplars(name, attributes, maxDataPoints), ops, errs);
              });

              return { data: data };
            });
          }
        }, {
          key: 'testDatasource',
          value: function testDatasource() {
            return this.doRequest({
              url: this.url + '/public/v0.1/' + this.organizationName + '/projects/' + this.projectName,
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
              "include-ops-counts": target.showOpsCounts ? "1" : "0",
              "include-error-counts": target.showErrorCounts ? "1" : "0",
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

            return _.concat(this.parseExemplar(name + ' traces', exemplarMap[false], maxDataPoints), this.parseExemplar(name + ' error traces', exemplarMap[true], maxDataPoints));
          }
        }, {
          key: 'parseExemplar',
          value: function parseExemplar(name, exemplars, maxDataPoints) {
            var _this2 = this;

            if (!exemplars) {
              return [];
            }
            if (maxDataPoints && exemplars.length > maxDataPoints) {
              var skip = Math.ceil(exemplars.length / maxDataPoints);
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
          key: 'parseCount',
          value: function parseCount(name, key, attributes) {
            if (!attributes["time-windows"] || !attributes[key]) {
              return [];
            }

            var timeWindows = attributes["time-windows"].map(function (timeWindow) {
              var oldest = moment(timeWindow["oldest-time"]);
              var youngest = moment(timeWindow["youngest-time"]);
              return moment((oldest + youngest) / 2);
            });

            return [{
              target: name,
              datapoints: _.zip(attributes[key], timeWindows)
            }];
          }
        }, {
          key: 'parseRateFromCounts',
          value: function parseRateFromCounts(name, errors, ops) {
            if (!errors[0] || !ops[0] || !errors[0].datapoints || !ops[0].datapoints || errors[0].datapoints.length != ops[0].datapoints.length) {
              return [];
            }

            var timeMap = {};
            // make a map of moment ISO timestamps
            errors[0].datapoints.forEach(function (p) {
              // store error count in 0
              // store original moment object in 1
              timeMap[p[1].toISOString()] = [p[0], p[1]];
            });

            ops[0].datapoints.forEach(function (p) {
              var timestamp = p[1].toISOString();
              // retrieve corresponding error count value from timeMap
              var curr = timeMap[timestamp]; // curr[0] = error count, curr[1] is original moment object
              // only do math if the points exist & are non-zero
              var errCount = curr[0];
              if (!errCount) {
                return;
              }
              var opsCount = p[0];
              if (errCount == 0 || opsCount == 0) {
                timeMap[timestamp] = [0, curr[1]];
              } else {
                var res = (errCount / opsCount * 100).toFixed(2);
                timeMap[timestamp] = [res, curr[1]];
              }
            });

            var datapoints = Object.keys(timeMap).map(function (k) {
              // restore moment object
              var v = timeMap[k];
              return [v[0], v[1]];
            });

            return [{
              target: name,
              datapoints: datapoints
            }];
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
