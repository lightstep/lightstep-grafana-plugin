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

    if (this.target.showOpsCounts == null) {
      this.target.showOpsCounts = true;
    }

    if (this.target.showErrorCounts == null) {
      this.target.showErrorCounts = true;
    }

    if (this.target.showErrorCountsAsRate == null) {
      this.target.showErrorCountsAsRate = false;
    }

    this.scope = $scope;
    this.target.type = 'timeserie';
    this.savedSearches = this.datasource.metricFindQuery();
  }

  getOptions(ignoredQuery) {
    // Defensive copy of the results because somewhere is gets mutated after return.
    return this.savedSearches.then(results => results.slice());
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

LightStepDatasourceQueryCtrl.templateUrl = 'lightstep-datasource/partials/query.editor.html';

