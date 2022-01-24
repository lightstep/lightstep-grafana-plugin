import {LightStepDatasource} from "../lightstep-datasource/datasource";
import moment from 'moment';

let ctx = {};
let streams;

beforeEach(function() {
  configureStreams();
  ctx.backendSrv = getBackendSrv();
  ctx.templateSrv = {
    replace: function(query) {
      if (query == '$__range') {
        return '1h'
      }
      if (query == '$__interval') {
        return '15m'
      }
      return query
    }
  };
  let settings = {
    jsonData: {}
  };
  ctx.ds = new LightStepDatasource(settings, {}, ctx.backendSrv, ctx.templateSrv);
});

describe('metricFindQuery', function() {

  function metricFindQuery(query) {
    return ctx.ds.metricFindQuery(query, {projectName:"foo"})
  }

  it('should return all items on empty query', function(done) {
    metricFindQuery("").then(function(result) {
      expect(result).to.have.length(8);
      done();
    });
  });

  it('should return all items on null query', function(done) {
    metricFindQuery(null).then(function(result) {
      expect(result).to.have.length(8);
      done();
    });
  });

  it('should return all names when using attributes(name)', function(done) {
    metricFindQuery("attributes(name)").then(function(result) {
      expect(result).to.have.length(4);
      expect(result[0].text).to.equal('service0 - operation0');
      expect(result[1].text).to.equal('service1 - operation1');
      expect(result[2].text).to.equal('service0 - operation2');
      expect(result[3].text).to.equal('service1 - operation3');
      done();
    });
  });

  it('should return all queries when using attributes(stream_query)', function(done) {
    metricFindQuery("attributes(stream_query)").then(function(result) {
      expect(result).to.have.length(4);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation0")');
      expect(result[1].text).to.equal('service IN ("service1") AND operation IN ("operation1")');
      expect(result[2].text).to.equal('service IN ("service0") AND operation IN ("operation2")');
      expect(result[3].text).to.equal('service IN ("service1") AND operation IN ("operation3")');
      done();
    });
  });

  it('should return single ID when using stream_ids(name="service0 - operation2")', function(done) {
    metricFindQuery('stream_ids(name="service0 - operation2")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('service0 - operation2');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name!="service0 - operation2")', function(done) {
    metricFindQuery('stream_ids(name!="service0 - operation2")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('service0 - operation0');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('service1 - operation1');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('service1 - operation3');
      expect(result[2].value).to.equal('3000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name=~"service0.*")', function(done) {
    metricFindQuery('stream_ids(name=~"service0.*")').then(function(result) {
      expect(result).to.have.length(2);
      expect(result[0].text).to.equal('service0 - operation0');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('service0 - operation2');
      expect(result[1].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name!=~"service0.*")', function(done) {
    metricFindQuery('stream_ids(name!=~"service0.*")').then(function(result) {
      expect(result).to.have.length(2);
      expect(result[0].text).to.equal('service1 - operation1');
      expect(result[0].value).to.equal('1000');
      expect(result[1].text).to.equal('service1 - operation3');
      expect(result[1].value).to.equal('3000');
      done();
    });
  });

  it('should return single ID when using stream_ids(stream_query="service IN ("service0") AND operation IN ("operation2")")', function(done) {
    metricFindQuery('stream_ids(stream_query="service IN ("service0") AND operation IN ("operation2")")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation2")');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(stream_query!="service IN ("service0") AND operation IN ("operation2")")', function(done) {
    metricFindQuery('stream_ids(stream_query!="service IN ("service0") AND operation IN ("operation2")")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation0")');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('service IN ("service1") AND operation IN ("operation1")');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('service IN ("service1") AND operation IN ("operation3")');
      expect(result[2].value).to.equal('3000');
      done();
    });
  });

  it('should return single ID when using stream_ids(stream_query=~".*operation2.*")', function(done) {
    metricFindQuery('stream_ids(stream_query=~".*operation2.*")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation2")');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(stream_query!=~".*operation2.*")', function(done) {
    metricFindQuery('stream_ids(stream_query!=~".*operation2.*")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation0")');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('service IN ("service1") AND operation IN ("operation1")');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('service IN ("service1") AND operation IN ("operation3")');
      expect(result[2].value).to.equal('3000');
      done();
    });
  });
});

describe('buildQueryParameters', function() {
  it('should return default resolution when empty', function(done) {
    let result = ctx.ds.buildQueryParameters({ range: getRange() }, {}, 1000);
    expect(result["resolution-ms"]).to.equal(60000);
    done();
  });

  it('should return requested resolution when provided', function(done) {
    let result = ctx.ds.buildQueryParameters({ range: getRange() }, { resolution: '15m' }, 1000);

    expect(result["resolution-ms"]).to.equal(900000);
    done();
  });

  it('should return the minimum resolution when provided with something smaller', function(done) {
    let result = ctx.ds.buildQueryParameters({ range: getRange() }, { resolution: '15s' }, 1000);

    expect(result["resolution-ms"]).to.equal(60000);
    done();
  });

  it('should return the proper resolution when provided with $__interval', function(done) {
    let result = ctx.ds.buildQueryParameters({ range: getRange() }, { resolution: '$__interval' }, 1000);

    expect(result["resolution-ms"]).to.equal(900000);
    done();
  });

  it('should return the proper resolution when provided with $__range', function(done) {
    let result = ctx.ds.buildQueryParameters({ range: getRange() }, { resolution: '$__range' }, 1000);

    expect(result["resolution-ms"]).to.equal(3600000);
    done();
  });
});

function configureStreams() {
  streams = [];
  for (let i = 0; i < 4; i++) {
    const svc = `service${i%2}`;
    const op = `operation${i}`;
    streams.push({
      attributes: {
        name: `${svc} - ${op}`,
        query: `service IN ("${svc}") AND operation IN ("${op}")`
      },
      id: `${i * 1000}`
    });
  }
}

function getBackendSrv() {
  return {
    datasourceRequest: function() {
      return Promise.resolve({
        data: {
          data: streams
        }
      })
    }
  };
}

function getRange() {
  return {
    // April 1, 2020 10:00:00 AM UTC
    from: moment(1585735200000),
    // April 1, 2020 11:00:00 AM UTC
    to: moment(1585738800000)
  }
}
