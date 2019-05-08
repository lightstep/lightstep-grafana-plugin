'use strict';

System.register(['app/plugins/sdk', './css/query-editor.css!'], function (_export, _context) {
  "use strict";

  var QueryCtrl, _createClass, defaultPercentiles, LightStepDatasourceQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      QueryCtrl = _appPluginsSdk.QueryCtrl;
    }, function (_cssQueryEditorCss) {}],
    execute: function () {
      _createClass = function () {
        function defineProperties(target, props) {
          for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false;
            descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true;
            Object.defineProperty(target, descriptor.key, descriptor);
          }
        }

        return function (Constructor, protoProps, staticProps) {
          if (protoProps) defineProperties(Constructor.prototype, protoProps);
          if (staticProps) defineProperties(Constructor, staticProps);
          return Constructor;
        };
      }();

      defaultPercentiles = ["50", "99", "99.9", "99.99"];

      _export('LightStepDatasourceQueryCtrl', LightStepDatasourceQueryCtrl = function (_QueryCtrl) {
        _inherits(LightStepDatasourceQueryCtrl, _QueryCtrl);

        function LightStepDatasourceQueryCtrl($scope, $injector) {
          _classCallCheck(this, LightStepDatasourceQueryCtrl);

          var _this = _possibleConstructorReturn(this, (LightStepDatasourceQueryCtrl.__proto__ || Object.getPrototypeOf(LightStepDatasourceQueryCtrl)).call(this, $scope, $injector));

          if (_this.target.percentiles == null) {
            _this.target.percentiles = defaultPercentiles;
          }

          if (_this.target.showExemplars == null) {
            _this.target.showExemplars = true;
          }

          if (_this.target.showOpsCount == null) {
            _this.target.showOpsCount = true;
          }

          if (_this.target.showErrorCount == null) {
            _this.target.showErrorCount = true;
          }

          _this.scope = $scope;
          _this.target.type = 'timeserie';
          _this.savedSearches = _this.datasource.metricFindQuery();
          return _this;
        }

        _createClass(LightStepDatasourceQueryCtrl, [{
          key: 'getOptions',
          value: function getOptions(ignoredQuery) {
            // Defensive copy of the results because somewhere is gets mutated after return.
            return this.savedSearches.then(function (results) {
              return results.slice();
            });
          }
        }, {
          key: 'toggleEditorMode',
          value: function toggleEditorMode() {
            this.target.rawQuery = !this.target.rawQuery;
          }
        }, {
          key: 'onChangeInternal',
          value: function onChangeInternal() {
            this.panelCtrl.refresh(); // Asks the panel to refresh data.
          }
        }, {
          key: 'linkToLightStep',
          value: function linkToLightStep() {
            var savedSearchID = this.target.target;
            return this.datasource.dashboardURL + '/' + this.datasource.projectName + '/operation/' + savedSearchID;
          }
        }]);

        return LightStepDatasourceQueryCtrl;
      }(QueryCtrl));

      _export('LightStepDatasourceQueryCtrl', LightStepDatasourceQueryCtrl);

      LightStepDatasourceQueryCtrl.templateUrl = 'lightstep-datasource/partials/query.editor.html';
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map
