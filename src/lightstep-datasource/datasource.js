import _ from 'lodash';
import moment from 'moment';
import appEvents from 'app/core/app_events';
import {DEFAULT_TARGET_VALUE} from './constants';
import {rangeUtil} from "@grafana/data";

const maxDataPointsServer = 1440;
const minResolutionServer = 60000;
const opCountKey = "ops-counts";
const errCountKey = "error-counts";

// TODO - this is a work around given the existing graph API
// Having a better mechanism for click capture would be ideal.
appEvents.on('graph-click', options => {
  const seriesIndex = _.get(options, ['item', 'seriesIndex']);
  const dataIndex = _.get(options, ['item', 'dataIndex']);
  let link = _.get(options, [
    'ctrl',
    'dataList',
    seriesIndex,
    'datapoints',
    dataIndex,
    2,
  ]);

  // Grafana 6+ introduced a new data model that prohibits any data
  // to be attached to the datapoints property.
  if (!link) {
    link = _.get(options, [
      'ctrl',
      'dataList',
      seriesIndex,
      'meta',
      'traceLinks',
      dataIndex,
    ]);
  }

  if (link) {
    window.open(link, '_blank');
  }
});

export class LightStepDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url;
    this.dashboardURL = instanceSettings.jsonData.dashboardURL;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.organizationName = instanceSettings.jsonData.organizationName;
    this.projectName = instanceSettings.jsonData.projectName;
  }

  projectNames() {
    return this.projectName.split(",");
  }

  defaultProjectName() {
    return this.projectNames()[0];
  }

  resolveProjectName(projectName) {
    return projectName && String(projectName) !== "undefined" ? projectName : this.defaultProjectName();
  }

  headers() {
    return {
      'Content-Type': 'application/json',
    };
  }

  query(options) {
    const targets = options.targets.filter(t => !t.hide && t.target !== DEFAULT_TARGET_VALUE);
    const maxDataPoints = options.maxDataPoints;

    if (targets.length <= 0) {
      return this.q.when({data: []});
    }

    const targetResponses = targets.flatMap(target => {
      const interpolatedIds = this.templateSrv.replace(target.target, null, 'pipe');
      const interpolatedNames = this.templateSrv.replace(target.target, null, 'text');

      if (!interpolatedIds) {
        return this.q.when(undefined);
      }

      const streamIds = interpolatedIds.split('|');
      const streamNames = interpolatedNames.split(' + ');
      return _.zip(streamIds, streamNames).map(pair => {
        const streamId = pair[0];
        const streamName = pair[1];
        const queryParams = this.buildQueryParameters(options, target, maxDataPoints);
        const showErrorCountsAsRate = Boolean(target.showErrorCountsAsRate);
        const response = this.doRequest({
          url: this.projectUrl(target.projectName, `/streams/${streamId}/timeseries`),
          method: 'GET',
          params: queryParams,
        });

        response.then(result => {
          if (result && result["data"]["data"]) {
            if (target.displayName) {
              result["data"]["data"]["name"] = this.templateSrv.replace(target.displayName, null, 'text');
            } else {
              result["data"]["data"]["name"] = streamName;
            }
          }
        });

        return response.then((res) => {
          res.showErrorCountsAsRate = showErrorCountsAsRate;
          res.showOpsCounts = target.showOpsCounts;
          res.showRatePerSec = target.showRatePerSec;
          res.showRatePerMin = target.showRatePerMin;
          res.showErrorCounts = target.showErrorCounts;
          res.showErrorsPerSec = target.showErrorsPerSec;
          res.showErrorsPerMin = target.showErrorsPerMin;
          return res;
        });
      });

    });

    return this.q.all(targetResponses).then(results => {
      const data = _.flatMap(results, result => {
        if (!result) {
          return [];
        }

        const data = result["data"]["data"];
        const attributes = data["attributes"];
        const secDivisor = attributes["resolution-ms"] / 1000;
        const minDivisor = secDivisor / 60;
        const name = data["name"];

        const ops = this.parseCount(`${name} Ops counts`, opCountKey, attributes);
        const errs = this.parseCount(`${name} Error counts`, errCountKey, attributes);

        return _.concat(
          this.parseLatencies(name, attributes),
          this.parseExemplars(name, attributes, maxDataPoints, this.resolveProjectName(result.projectName)),
          result.showOpsCounts ? ops : [],
          result.showRatePerSec ? this.parseCount(`${name} Ops per sec`, opCountKey, attributes, secDivisor) : [],
          result.showRatePerMin ? this.parseCount(`${name} Ops per min`, opCountKey, attributes, minDivisor) : [],
          result.showErrorCounts ? errs : [],
          result.showErrorCountsAsRate ? this.parseRateFromCounts(`${name} Error ratio`, errs, ops) : [],
          result.showErrorsPerSec ? this.parseCount(`${name} Errors per sec`, errCountKey, attributes, secDivisor) : [],
          result.showErrorsPerMin ? this.parseCount(`${name} Errors per min`, errCountKey, attributes, minDivisor) : [],
        );
      });

      return { data: data };
    });
  }

  testDatasource() {
    return this.doRequest({
      url: this.projectUrl(null, ""),
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      } else {
        return { status: "failure", message: "HTTP error: " + response.status, title: "Error " }
      }
    });
  }

  annotationQuery(options) {
    return this.q.when({});
  }

  projectUrl(projectName, suffix) {
    return `${this.url}/projects/${this.resolveProjectName(projectName)}${suffix}`;
  }

  metricFindQuery(grafanaQuery, options) {
    const interpolated = this.templateSrv.replace(grafanaQuery, null, 'regex');

    let queryMapper = this.defaultMapper();
    if (interpolated) {
      queryMapper = this.parseQuery(interpolated);
    }

    return this.doRequest({
      url: this.projectUrl(options.projectName, "/streams"),
      method: 'GET',
    }).then(response => {
      const streams = response.data.data;
      return _.flatMap(streams, stream => {
        const attributes = stream["attributes"];
        const name = attributes["name"];
        const stream_query = attributes["query"];
        const streamId = stream["id"];

        return queryMapper(name, stream_query, streamId);
      });
    });
  }

  defaultMapper() {
    return (name, stream_query, id) => {
      // Don't duplicate if the name and stream_query are the same
      if (name.trim() === stream_query.trim()) {
        return [ { text: name, value: id } ];
      }

      return [
        { text: stream_query, value: id },
        { text: name, value: id },
      ];
    }
  }

  parseQuery(grafanaQuery) {
    if (grafanaQuery.startsWith('stream_ids(')) {
      return this.parseStreamIdsQuery(grafanaQuery);
    } else if (grafanaQuery.startsWith('attributes(')) {
      return this.parseAttributesQuery(grafanaQuery);
    } else {
      throw new Error(`Unknown query provided: ${grafanaQuery}`);
    }
  }

  parseStreamIdsQuery(grafanaQuery) {
    const matches = grafanaQuery.match(/stream_ids\(([^\!=~]+)(\!?=~?)"(.*)"\)$/)
    if (matches && matches.length == 4) {
      const attribute_name = matches[1],
            operator = matches [2],
            filter_value = matches[3];
      return (name, stream_query, id) => {
        switch (attribute_name) {
          case "name":
            return this.applyOperator(name, operator, filter_value, id)
          case "stream_query":
            return this.applyOperator(stream_query, operator, filter_value, id)
          default:
            throw new Error(`Unknown attribute provided in the stream_ids() query: ${attribute_name}`);
        }
      }
    }
    throw new Error(`Unknown query provided: ${grafanaQuery}`);
  }

  applyOperator(attribute, operator, filter_value, id) {
    let match;
    let not = false;
    if (operator.charAt(0) == "!") {
      operator = operator.substring(1);
      not = true;
    }
    switch (operator) {
      case "=":
        match = attribute == filter_value
        break;
      case "=~":
        const regex = new RegExp(filter_value)
        match = regex.test(attribute)
        break;
      default:
        throw new Error(`Unknown operator provided: ${operator}`);
    }
    match ^= not;
    return match ? [{ text: `${attribute}`, value: id }] : []
  }

  parseAttributesQuery(grafanaQuery) {
    const matches = grafanaQuery.match(/^attributes\(([^)]+)\)$/);
    if (matches && matches.length == 2) {
      return (name, stream_query, id) => {
        switch (matches[1]) {
          case "name":
            return [{ text: name }]
          case "stream_query":
            return [{ text: stream_query }]
          default:
            throw new Error(`Unknown attribute provided in the attributes() query: ${matches[1]}`);
        }
      };
    }
    throw new Error(`Unknown query provided: ${grafanaQuery}`);
  }

  doRequest(options) {
    options.headers = this.headers();
    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options, target, maxDataPoints) {
    const oldest = options.range.from;
    const youngest = options.range.to;

    let resolutionMs = null;
    if (target.resolution) {
      const scopedVars = this.getScopedVars(options);
      const interpolated = this.templateSrv.replace(target.resolution, scopedVars)
      resolutionMs = rangeUtil.intervalToMs(interpolated);
    }

    if (!resolutionMs || resolutionMs < minResolutionServer) {
      resolutionMs = Math.max(
        youngest.diff(oldest) / Math.min(
          maxDataPoints,
          maxDataPointsServer
        ),
        minResolutionServer
      );
    }

    return {
      "oldest-time": oldest.format(),
      "youngest-time": youngest.format(),
      "resolution-ms": Math.floor(resolutionMs),
      "include-exemplars": target.showExemplars ? "1" : "0",
      "include-ops-counts": (target.showRatePerSec || target.showRatePerMin || target.showOpsCounts || target.showErrorCountsAsRate) ? "1" : "0",
      "include-error-counts": (target.showErrorsPerSec || target.showErrorsPerMin || target.showErrorCounts || target.showErrorCountsAsRate) ? "1" : "0",
      "percentile": this.extractPercentiles(target.percentiles),
    };
  }

  getScopedVars(options) {
    const msRange = options.range.to.diff(options.range.from);
    const regularRange = rangeUtil.secondsToHms(msRange / 1000);
    return {
      __interval: { text: options.interval, value: options.interval },
      __range: { text: regularRange, value: regularRange },
    };
  }

  parseLatencies(name, attributes) {
    if (!attributes["time-windows"] || !attributes["latencies"]) {
      return [];
    }

    const timeWindows = attributes["time-windows"].map(timeWindow => {
      const oldest = moment(timeWindow["oldest-time"]);
      const youngest = moment(timeWindow["youngest-time"]);
      return moment((oldest + youngest) / 2);
    });

    return attributes["latencies"].map(latencies => {
      return {
        target: `${name} p${latencies["percentile"]}`,
        datapoints: _.zip(latencies["latency-ms"], timeWindows),
      };
    })
  }

  parseExemplars(name, attributes, maxDataPoints, projectName) {
    const exemplars = attributes["exemplars"];
    if (!exemplars) {
      return [];
    }
    const exemplarMap = _.groupBy(exemplars, exemplar => exemplar["has_error"]);

    return _.concat(
      this.parseExemplar(`${name} traces`, exemplarMap[false], maxDataPoints, projectName),
      this.parseExemplar(`${name} error traces`, exemplarMap[true], maxDataPoints, projectName),
    )
  }

  parseExemplar(name, exemplars, maxDataPoints, projectName) {
    if (!exemplars) {
      return []
    }
    if (maxDataPoints && exemplars.length > maxDataPoints) {
      const skip = Math.ceil(exemplars.length / maxDataPoints);
      exemplars = exemplars.filter((ignored, index) => index % skip === 0);
    }

    const datapoints = exemplars.map(exemplar => {
      return {
        0: exemplar["duration_micros"] / 1000,
        1: moment(((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2) / 1000),
        2: this.traceLink(exemplar, projectName),
      };
    });
    return [{
      target: name,
      datapoints,
      meta: {
        traceLinks: datapoints.reduce((acc, curr, idx) => {
          acc[idx] = curr[2];
          return acc;
        }, {})
      }
    }];
  }

  traceLink(exemplar, projectName) {
    const spanGuid = exemplar["span_guid"];
    if (!spanGuid) {
      return
    }
    return `${this.dashboardURL}/${this.resolveProjectName(projectName)}/trace?span_guid=${spanGuid}`
  }

  parseCount(name, key, attributes, resolution) {
    if (!attributes["time-windows"] || !attributes[key]) {
      return [];
    }

    const timeWindows = attributes["time-windows"].map(timeWindow => {
      const oldest = moment(timeWindow["oldest-time"]);
      const youngest = moment(timeWindow["youngest-time"]);
      return moment((oldest + youngest) / 2);
    });

    const points = attributes[key];

    return [{
      target: name,
      datapoints: _.zip(resolution ? points.map((val) => val / resolution) : points, timeWindows),
    }]
  }

  parseRateFromCounts(name, errors, ops) {
    if (!errors[0] || !ops[0] || !errors[0].datapoints || !ops[0].datapoints || (errors[0].datapoints.length != ops[0].datapoints.length)) {
      return [];
    }

    let timeMap = {};
    // make a map of moment ISO timestamps
    errors[0].datapoints.forEach((p) => {
      // store error count in 0
      // store original moment object in 1
      timeMap[p[1].format()] = [p[0], p[1]];
    });

    ops[0].datapoints.forEach((p) => {
      let timestamp = p[1].format();
      // retrieve corresponding error count value from timeMap
      let curr = timeMap[timestamp]; // curr[0] = error count, curr[1] is original moment object
      // only do math if the points exist & are non-zero
      let errCount = curr[0];
      if (!errCount) {
        return;
      }
      let opsCount = p[0];
      if (errCount == 0 || opsCount == 0) {
        timeMap[timestamp] = [0, curr[1]];
      } else {
        let res = (errCount / opsCount)*100;
        timeMap[timestamp] = [res, curr[1]];
      }
    });

    let datapoints = Object.keys(timeMap).map((k) => {
      // restore moment object
      let v = timeMap[k];
      return [v[0], v[1]];
    });

    return [{
      target: name,
      datapoints,
    }];
  }

  extractPercentiles(percentiles) {
    if (!percentiles) {
      return [];
    }
    return (percentiles)
      .toString()
      .split(",")
      .map(percentile => percentile.replace(/(^\s+|\s+$)/g,''))
      .filter(percentile => percentile);
  }
}
