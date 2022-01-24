import {QueryCtrl} from 'app/plugins/sdk';
import {DEFAULT_TARGET_VALUE} from './constants';

import './css/query-editor.css!'

const defaultPercentiles = ["50", "99", "99.9", "99.99"];

export class LightStepDatasourceQueryCtrl extends QueryCtrl {
  constructor($scope, $injector)  {
    super($scope, $injector);

    let projectNames = this.datasource.projectNames();
    let defaultProjectName = this.datasource.defaultProjectName();
    if (this.target.projectName == null) {
      this.target.projectName = defaultProjectName;
    }

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
    this.target.target = this.target.target || DEFAULT_TARGET_VALUE;
    this.target.type = 'timeserie';
    this.savedSearches = {};
    this.loadStreams(defaultProjectName);
    this.showProjects = projectNames.length > 1;
    this.projects = projectNames.map(n => ({
      text: n,
      value: n
    }));
  }

  loadStreams(projectName) {
    if (this.savedSearches[projectName] == null) {
      this.savedSearches[projectName] = this.datasource.metricFindQuery(null, {projectName: projectName});
    }
  }

  getOptions(projectName) {
    let name = this.datasource.resolveProjectName(projectName);
    this.loadStreams(name);
    // Defensive copy of the results because somewhere is gets mutated after return.
    return this.savedSearches[name].then(results => results.slice());
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onProjectChanged(projectName) {
    this.loadStreams(projectName);
    this.onChangeInternal();
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }

  linkToLightStep() {
    return `${this.datasource.dashboardURL}/${this.datasource.resolveProjectName(this.target.projectName)}/operation/${(this.target.target)}`;
  }
}

LightStepDatasourceQueryCtrl.templateUrl = 'lightstep-datasource/partials/query.editor.html';
