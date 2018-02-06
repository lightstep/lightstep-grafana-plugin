import {LightStepDatasource} from './datasource';
import {LightStepDatasourceQueryCtrl} from './query_ctrl';

class LightStepConfigCtrl {}
LightStepConfigCtrl.templateUrl = 'lightstep-datasource/partials/config.html';

class LightStepQueryOptionsCtrl {}
LightStepQueryOptionsCtrl.templateUrl = '/public/plugisn/grafana-lightstep-datasource/partials/query.options.html';

class LightStepAnnotationsQueryCtrl {}
LightStepAnnotationsQueryCtrl.templateUrl = '/public/plugisn/grafana-lightstep-datasource/partials/annotations.editor.html'

export {
  LightStepDatasource as Datasource,
  LightStepDatasourceQueryCtrl as QueryCtrl,
  LightStepConfigCtrl as ConfigCtrl,
  LightStepQueryOptionsCtrl as QueryOptionsCtrl,
  LightStepAnnotationsQueryCtrl as AnnotationsQueryCtrl
};
