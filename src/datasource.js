import _ from "lodash";

var defaultURL = "https://api.lightstep.com"

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
    var targets = options.targets
      .filter(t => !t.hide)
      .filter(options.targets, target => {
        return target.target !== 'select metric';
      });

    if (targets.length <= 0) {
      return this.q.when({data: []});
    }
    var savedSearchID = target[0]

    var query = this.buildQueryParameters(options);
    return this.doRequest({
      url: this.url + "/public/v0.1/" + this.organizationName + "/projects/" + this.projectName + "/searches/" + savedSearchID + "/timeseries",
      data: query,
      method: 'POST'
    });
  }

  testDatasource() {
    return this.doRequest({
      url: this.url + '/',
      method: 'GET',
    }).then(response => {
      if (response.status === 200) {
        return { status: "success", message: "Data source is working", title: "Success" };
      }
    }).catch(error => {
      return { status: "error", message: error, title: "Error " };
      }
    )
  }

  annotationQuery(options) {
    return this.q.when({})
  }

  metricFindQuery(query) {
    return this.q.when({})
  }

  doRequest(options) {
    options.headers = this.headers();
    return this.backendSrv.datasourceRequest(options);
  }

  buildQueryParameters(options) {
    // remove placeholder targets
    options.targets = _;

    var targets = _.map(options.targets, target => {
      return {
        target: this.templateSrv.replace(target.target, options.scopedVars, 'regex'),
        refId: target.refId,
        hide: target.hide,
        type: target.type || 'timeserie'
      };
    });

    options.targets = targets;

    return options;
  }
}
