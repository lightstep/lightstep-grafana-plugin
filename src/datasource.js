import _ from 'lodash';
import moment from 'moment';
import appEvents from 'app/core/app_events';

const defaultURL = "https://api.lightstep.com";

appEvents.on('graph-click', options => {
  console.log(`TODO(LS-2233) - somehow open the lightstep trace summary page of ${options["item"]}`)
});

export class LightStepDatasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
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

      const query = this.buildQueryParameters(options);
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

        const exemplars = {
          target: `${name} exemplars`,
          datapoints: attributes["exemplars"].map(exemplar => {
            return [
              exemplar["duration_micros"] / 1000,
              moment(((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2) / 1000),
            ];
          }),
        };

        const timeWindows = attributes["time-windows"].map(timeWindow => {
          const oldest = moment(timeWindow["oldest-time"]);
          const youngest = moment(timeWindow["youngest-time"]);
          return moment((oldest + youngest) / 2);
        });

        return _.concat(
          attributes["latencies"].map(latencies => {
            return {
              target: `${name} p${latencies["percentile"]}`,
              datapoints: _.zip(latencies["latency-ms"], timeWindows),
            };
          }),
          [exemplars],
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

  metricFindQuery(query) {
    // TODO(LS-2230) - implement auto-complete here.
    return this.q.when({});
  }

  doRequest(options) {
    options.headers = this.headers();
    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    const oldest = options.range.from;
    const youngest = options.range.to;
    const resolutionMs = Math.max(60000, oldest.diff(youngest) / 1440);

    return {
      "oldest-time": oldest.format(),
      "youngest-time": youngest.format(),
      "resolution-ms": Math.floor(resolutionMs),
      // TODO(LS-2278) - both of these configurable.
      "include-exemplars": "1",
      "percentile": [ "50", "99", "99.9", "99.99" ],
    }
  }
}
