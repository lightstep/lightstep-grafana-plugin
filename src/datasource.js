import _ from 'lodash';
import moment from 'moment';
import appEvents from 'app/core/app_events';

var defaultURL = "https://api.lightstep.com";

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
    let targets = options.targets.filter(t => !t.hide);

    if (targets.length <= 0) {
      return this.q.when({data: []});
    }

    let responses = _.map(targets, target => {
      let savedSearchID = target.target;

      let query = this.buildQueryParameters(options);
      let response = this.doRequest({
        url: `${this.url}/public/v0.1/${this.organizationName}/projects/${this.projectName}/searches/${savedSearchID}/timeseries`,
        method: 'GET',
        params: query,
      });

      return response;
    });

    return this.q.all(responses).then(results => {
      let data = _.flatMap(results, result => {
        let data = result["data"]["data"];
        let attributes = data["attributes"];
        let name = data["id"].replace("/timeseries", "");

        let exemplars = {
          target: `${name} exemplars`,
          datapoints: _.map(attributes["exemplars"], exemplar => {
            return [
              exemplar["duration_micros"] / 1000,
              moment(((exemplar["oldest_micros"] + exemplar["youngest_micros"]) / 2) / 1000),
            ];
          }),
        };

        let timeWindows = _.map(attributes["time-windows"], timeWindow => {
          let oldest = moment(timeWindow["oldest-time"]);
          let youngest = moment(timeWindow["youngest-time"]);
          return moment((oldest + youngest) / 2);
        });

        return _.concat(
          _.map(attributes["latencies"], latencies => {
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
    return this.q.when({})
  }

  doRequest(options) {
    options.headers = this.headers();
    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    let oldest = options.range.from;
    let youngest = options.range.to;
    let resolutionMs = Math.max(60000, oldest.diff(youngest) / 1440);

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
