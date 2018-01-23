import _ from 'lodash';
import moment from 'moment';
import appEvents from 'app/core/app_events';

const defaultApiURL = "https://api.lightstep.com";
const defaultDashobardURL = "https://app.lightstep.com";

// TODO - this is a work around given the existing graph API
// Having a better mechanism for click capture would be ideal.
appEvents.on('graph-click', options => {
  const link = _.get(options, [
    'ctrl',
    'dataList',
    _.get(options, ['item', 'seriesIndex']),
    'datapoints',
    _.get(options, ['item', 'dataIndex']),
    'link',
  ]);
  if (link) {
    window.open(link, '_blank');
  }
});

export class LightStepDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = instanceSettings.url || defaultApiURL;
    this.dashboardURL = instanceSettings.jsonData.dashboardURL || defaultDashobardURL;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
    this.organizationName = instanceSettings.jsonData.organizationName;
    this.projectName = instanceSettings.jsonData.projectName;
    this.apiKey = instanceSettings.jsonData.apiKey;
  }

  headers() {
    return {
      'Content-Type': 'application/json',
      'Authorization': "BEARER " + this.apiKey,
    };
  }

  query(options) {
    const targets = options.targets.filter(t => !t.hide);

    if (targets.length <= 0) {
      return this.q.when({data: []});
    }

    const responses = targets.map(target => {
      const savedSearchID = target.target;

      const query = this.buildQueryParameters(options, target);
      const response = this.doRequest({
        url: `${this.url}/public/v0.1/${this.organizationName}/projects/${this.projectName}/searches/${savedSearchID}/timeseries`,
        method: 'GET',
        params: query,
      });

      return response;
    });

    return this.q.all(responses).then(results => {
      const data = _.flatMap(results, result => {
        const data = result["data"]["data"];
        const attributes = data["attributes"];
        const name = data["id"].replace("/timeseries", "");

        return _.concat(
          this.parseLatencies(name, attributes),
          this.parseExemplars(name, attributes),
        );
      });

      return { data: data };
    });
  }

  testDatasource() {
    return this.doRequest({
      url: `${this.url}/public/v0.1/${this.organizationName}/projects/${this.projectName}/`,
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    }).catch(error => {
      return { status: "error", message: error, title: "Error " };
    });
  }

  annotationQuery(options) {
    return this.q.when({});
  }

  metricFindQuery() {
    return this.doRequest({
      url: `${this.url}/public/v0.1/${this.organizationName}/projects/${this.projectName}/searches`,
      method: 'GET',
    }).then(response => {
      const searches = response.data.data;
      return _.flatMap(searches, search => {
        const attributes = search["attributes"];
        const name = attributes["name"];
        const query = attributes["query"];
        const savedSearchId = search["id"];

        // Don't duplicate if the name and query are the same
        if (name.trim() === query.trim()) {
          return [ { text: name, value: savedSearchId } ];
        }

        return [
          { text: query, value: savedSearchId },
          { text: name, value: savedSearchId },
        ];
      });
    });
  }

  doRequest(options) {
    options.headers = this.headers();
    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options, target) {
    const oldest = options.range.from;
    const youngest = options.range.to;
    const resolutionMs = Math.max(60000, oldest.diff(youngest) / 1440);

    return {
      "oldest-time": oldest.format(),
      "youngest-time": youngest.format(),
      "resolution-ms": Math.floor(resolutionMs),
      "include-exemplars": target.showExemplars ? "1" : "0",
      "percentile": this.extractPercentiles(target.percentiles),
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

  parseExemplars(name, attributes) {
    const exemplars = attributes["exemplars"]
    if (!exemplars) {
      return [];
    }
    const exemplarMap = _.groupBy(exemplars, exemplar => exemplar["has_error"]);

    return _.concat(
      this.parseExemplar(`${name} exemplars`, exemplarMap[false]),
      this.parseExemplar(`${name} error exemplars`, exemplarMap[true]),
    )
  }

  parseExemplar(name, exemplars) {
    if (!exemplars) {
      return []
    }
    return [{
      target: name,
      datapoints: exemplars.map(exemplar => {
        return {
          0: exemplar["duration_micros"] / 1000,
          1: moment(((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2) / 1000),
          "link": this.traceLink(exemplar),
        };
      }),
    }];
  }

  traceLink(exemplar) {
    const spanGuid = exemplar["span_guid"];
    if (!spanGuid) {
      return
    }
    return `${this.dashboardURL}/${this.projectName}/trace?span_guid=${spanGuid}`
  }

  extractPercentiles(percentiles) {
    if (!percentiles) {
      return [];
    }
    return percentiles
      .split(",")
      .map(percentile => percentile.replace(/(^\s+|\s+$)/g,''))
      .filter(percentile => percentile);
  }
}
