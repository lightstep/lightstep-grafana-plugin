import {LightStepDatasource} from './datasource';
import {LightStepDatasourceQueryCtrl} from './query_ctrl';

class LightStepConfigCtrl {}
LightStepConfigCtrl.templateUrl = 'partials/config.html';

class LightStepQueryOptionsCtrl {}
LightStepQueryOptionsCtrl.templateUrl = 'partials/query.options.html';

class LightStepAnnotationsQueryCtrl {}
LightStepAnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html'

export {
  LightStepDatasource as Datasource,
  LightStepDatasourceQueryCtrl as QueryCtrl,
  LightStepConfigCtrl as ConfigCtrl,
  LightStepQueryOptionsCtrl as QueryOptionsCtrl,
  LightStepAnnotationsQueryCtrl as AnnotationsQueryCtrl
};
