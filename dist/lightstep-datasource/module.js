'use strict';

System.register(['./datasource', './query_ctrl'], function (_export, _context) {
  "use strict";

  var LightStepDatasource, LightStepDatasourceQueryCtrl, LightStepConfigCtrl, LightStepQueryOptionsCtrl, LightStepAnnotationsQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  return {
    setters: [function (_datasource) {
      LightStepDatasource = _datasource.LightStepDatasource;
    }, function (_query_ctrl) {
      LightStepDatasourceQueryCtrl = _query_ctrl.LightStepDatasourceQueryCtrl;
    }],
    execute: function () {
      _export('ConfigCtrl', LightStepConfigCtrl = function LightStepConfigCtrl() {
        _classCallCheck(this, LightStepConfigCtrl);
      });

      LightStepConfigCtrl.templateUrl = 'lightstep-datasource/partials/config.html';

      _export('QueryOptionsCtrl', LightStepQueryOptionsCtrl = function LightStepQueryOptionsCtrl() {
        _classCallCheck(this, LightStepQueryOptionsCtrl);
      });

      LightStepQueryOptionsCtrl.templateUrl = 'lightstep-datasource/partials/query.options.html';

      _export('AnnotationsQueryCtrl', LightStepAnnotationsQueryCtrl = function LightStepAnnotationsQueryCtrl() {
        _classCallCheck(this, LightStepAnnotationsQueryCtrl);
      });

      LightStepAnnotationsQueryCtrl.templateUrl = 'lightstep-datasource/partials/annotations.editor.html';

      _export('Datasource', LightStepDatasource);

      _export('QueryCtrl', LightStepDatasourceQueryCtrl);

      _export('ConfigCtrl', LightStepConfigCtrl);

      _export('QueryOptionsCtrl', LightStepQueryOptionsCtrl);

      _export('AnnotationsQueryCtrl', LightStepAnnotationsQueryCtrl);
    }
  };
});
//# sourceMappingURL=module.js.map
