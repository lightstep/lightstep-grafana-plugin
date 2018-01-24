import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

const defaultPercentiles = ["50", "99", "99.9", "99.99"];

export class LightStepDatasourceQueryCtrl extends QueryCtrl {
  constructor($scope, $injector)  {
    super($scope, $injector);

    if (this.target.percentiles == null) {
      this.target.percentiles = defaultPercentiles;
    }

    if (this.target.showExemplars == null) {
      this.target.showExemplars = true;
    }

    this.scope = $scope;
    this.target.type = 'timeserie';
    this.savedSearches = this.datasource.metricFindQuery();
  }

  getOptions(query) {
    return this.savedSearches;
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  linkToLightStep() {
    const savedSearchID = this.target.target;
    return `${this.datasource.dashboardURL}/${this.datasource.projectName}/operation/${savedSearchID}`;
  }
}

LightStepDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

