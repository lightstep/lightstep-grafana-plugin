import {QueryCtrl} from 'app/plugins/sdk';
import './css/query-editor.css!'

export class LightStepDatasourceQueryCtrl extends QueryCtrl {
  constructor($scope, $injector)  {
    super($scope, $injector);

    this.scope = $scope;
    this.target.type = 'timeserie';
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh(); // Asks the panel to refresh data.
  }
}

LightStepDatasourceQueryCtrl.templateUrl = 'partials/query.editor.html';

