'use strict';

System.register(['lodash', 'moment', 'app/core/app_events', 'app/core/utils/kbn'], function (_export, _context) {
  "use strict";

  var _, moment, appEvents, kbn, _createClass, maxDataPointsServer, minResolutionServer, version, LightStepDatasource;

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
    }, function (_appCoreUtilsKbn) {
      kbn = _appCoreUtilsKbn.default;
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
      version = 'v0.2';


      // TODO - this is a work around given the existing graph API
      // Having a better mechanism for click capture would be ideal.
      appEvents.on('graph-click', function (options) {
        var link = _.get(options, ['ctrl', 'dataList', _.get(options, ['item', 'seriesIndex']), 'datapoints', _.get(options, ['item', 'dataIndex']), 2]);
        if (link) {
          window.open(link, '_blank');
        }
      });

      _export('LightStepDatasource', LightStepDatasource = function () {
        function LightStepDatasource(instanceSettings, $q, backendSrv, templateSrv, timeSrv) {
          _classCallCheck(this, LightStepDatasource);

          this.type = instanceSettings.type;
          this.url = instanceSettings.url;
          this.dashboardURL = instanceSettings.jsonData.dashboardURL;
          this.name = instanceSettings.name;
          this.q = $q;
          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.timeSrv = timeSrv;
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

            var targetResponses = targets.flatMap(function (target) {
              var interpolatedIds = _this.templateSrv.replace(target.target, null, 'pipe');
              var interpolatedNames = _this.templateSrv.replaceWithText(target.target);

              if (!interpolatedIds) {
                return _this.q.when(undefined);
              }

              var streamIds = interpolatedIds.split('|');
              var streamNames = interpolatedNames.split(' + ');
              return _.zip(streamIds, streamNames).map(function (pair) {
                var streamId = pair[0];
                var streamName = pair[1];
                var query = _this.buildQueryParameters(options, target, maxDataPoints);
                var showErrorCountsAsRate = Boolean(target.showErrorCountsAsRate);
                var response = _this.doRequest({
                  url: _this.url + '/public/' + version + '/' + _this.organizationName + '/projects/' + _this.projectName + '/streams/' + streamId + '/timeseries',
                  method: 'GET',
                  params: query
                });

                response.then(function (result) {
                  if (result && result["data"]["data"]) {
                    if (target.displayName) {
                      result["data"]["data"]["name"] = _this.templateSrv.replaceWithText(target.displayName);
                    } else {
                      result["data"]["data"]["name"] = streamName;
                    }
                  }
                });

                return response.then(function (res) {
                  res.showErrorCountsAsRate = showErrorCountsAsRate;
                  return res;
                });
              });
            });

            return this.q.all(targetResponses).then(function (results) {
              var data = _.flatMap(results, function (result) {
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
              url: this.url + '/public/' + version + '/' + this.organizationName + '/projects/' + this.projectName,
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
            var interpolated = this.templateSrv.replace(query, null, 'regex');

            var queryMapper = this.defaultMapper();
            if (interpolated) {
              queryMapper = this.parseQuery(interpolated);
            }

            return this.doRequest({
              url: this.url + '/public/' + version + '/' + this.organizationName + '/projects/' + this.projectName + '/streams',
              method: 'GET'
            }).then(function (response) {
              var streams = response.data.data;
              return _.flatMap(streams, function (stream) {
                var attributes = stream["attributes"];
                var name = attributes["name"];
                var query = attributes["query"];
                var streamId = stream["id"];

                return queryMapper(name, query, streamId);
              });
            });
          }
        }, {
          key: 'defaultMapper',
          value: function defaultMapper() {
            return function (name, query, id) {
              // Don't duplicate if the name and query are the same
              if (name.trim() === query.trim()) {
                return [{ text: name, value: id }];
              }

              return [{ text: query, value: id }, { text: name, value: id }];
            };
          }
        }, {
          key: 'parseQuery',
          value: function parseQuery(query) {
            var matches = query.match(/^(stream_ids|attributes)\(.*/);
            if (matches && matches.length == 2) {
              switch (matches[1]) {
                case "stream_ids":
                  return this.parseStreamIdsQuery(query);
                case "attributes":
                  return this.parseAttributesQuery(query);
              }
            }
            throw new Error('Unknown query provided: ' + query);
          }
        }, {
          key: 'parseStreamIdsQuery',
          value: function parseStreamIdsQuery(query) {
            var _this2 = this;

            var matches = query.match(/stream_ids\(([^\!=~]+)(\!?=~?)"(.*)"\)$/);
            if (matches && matches.length == 4) {
              var attribute_name = matches[1],
                  operator = matches[2],
                  filter_value = matches[3];
              return function (name, query, id) {
                switch (attribute_name) {
                  case "name":
                    return _this2.applyOperator(name, operator, filter_value, id);
                  case "query":
                    return _this2.applyOperator(query, operator, filter_value, id);
                  default:
                    throw new Error('Unknown attribute provided in the stream_ids() query: ' + attribute_name);
                }
              };
            }
            throw new Error('Unknown query provided: ' + query);
          }
        }, {
          key: 'applyOperator',
          value: function applyOperator(attribute, operator, filter_value, id) {
            var match = void 0;
            var not = false;
            if (operator.charAt(0) == "!") {
              operator = operator.substring(1);
              not = true;
            }
            switch (operator) {
              case "=":
                match = attribute == filter_value;
                break;
              case "=~":
                var regex = new RegExp(filter_value);
                match = regex.test(attribute);
                break;
              default:
                throw new Error('Unknown operator provided: ' + operator);
            }
            match ^= not;
            return match ? [{ text: '' + attribute, value: id }] : [];
          }
        }, {
          key: 'parseAttributesQuery',
          value: function parseAttributesQuery(query) {
            var matches = query.match(/^attributes\(([^)]+)\)$/);
            if (matches && matches.length == 2) {
              return function (name, query, id) {
                switch (matches[1]) {
                  case "name":
                    return [{ text: name }];
                  case "query":
                    return [{ text: query }];
                  default:
                    throw new Error('Unknown attribute provided in the attributes() query: ' + matches[1]);
                }
              };
            }
            throw new Error('Unknown query provided: ' + query);
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

            var resolutionMs = null;
            if (target.resolution) {
              var scopedVars = this.getScopedVars(options);
              var interpolated = this.templateSrv.replace(target.resolution, scopedVars);
              resolutionMs = kbn.interval_to_ms(interpolated);
            }

            if (!resolutionMs || resolutionMs < minResolutionServer) {
              resolutionMs = Math.max(youngest.diff(oldest) / Math.min(maxDataPoints, maxDataPointsServer), minResolutionServer);
            }

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
          key: 'getScopedVars',
          value: function getScopedVars(options) {
            var range = this.timeSrv.timeRange();
            var msRange = range.to.diff(range.from);
            var sRange = Math.round(msRange / 1000);
            var regularRange = kbn.secondsToHms(msRange / 1000);
            return {
              __interval: { text: options.interval, value: options.interval },
              __range: { text: regularRange, value: regularRange }
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
            var _this3 = this;

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
                  2: _this3.traceLink(exemplar)
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
              timeMap[p[1].format()] = [p[0], p[1]];
            });

            ops[0].datapoints.forEach(function (p) {
              var timestamp = p[1].format();
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
                var res = errCount / opsCount * 100;
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
