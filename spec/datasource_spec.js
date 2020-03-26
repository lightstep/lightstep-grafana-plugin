import {LightStepDatasource} from "../lightstep-datasource/datasource";

let ctx = {};
let streams;

beforeEach(function() {
  configureStreams();
  ctx.backendSrv = getBackendSrv();
  ctx.templateSrv = {
    replace: function(query) { return query }
  };
  let settings = {
    jsonData: {}
  };
  ctx.ds = new LightStepDatasource(settings, {}, ctx.backendSrv, ctx.templateSrv);
});

describe('metricFindQuery', function() {
  
  it('should return all items on empty query', function(done) {
    ctx.ds.metricFindQuery("").then(function(result) {
      expect(result).to.have.length(8);
      done();
    });
  });

  it('should return all items on null query', function(done) {
    ctx.ds.metricFindQuery(null).then(function(result) {
      expect(result).to.have.length(8);
      done();
    });
  });

  it('should return all names when using attributes(name)', function(done) {
    ctx.ds.metricFindQuery("attributes(name)").then(function(result) {
      expect(result).to.have.length(4);
      expect(result[0].text).to.equal('service0 - operation0');
      expect(result[1].text).to.equal('service1 - operation1');
      expect(result[2].text).to.equal('service0 - operation2');
      expect(result[3].text).to.equal('service1 - operation3');
      done();
    });
  });

  it('should return all queries when using attributes(query)', function(done) {
    ctx.ds.metricFindQuery("attributes(query)").then(function(result) {
      expect(result).to.have.length(4);
      expect(result[0].text).to.equal('service IN ("service0") AND operation IN ("operation0")');
      expect(result[1].text).to.equal('service IN ("service1") AND operation IN ("operation1")');
      expect(result[2].text).to.equal('service IN ("service0") AND operation IN ("operation2")');
      expect(result[3].text).to.equal('service IN ("service1") AND operation IN ("operation3")');
      done();
    });
  });

  it('should return single ID when using stream_ids(name="service0 - operation2")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(name="service0 - operation2")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('2000 [service0 - operation2]');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name!="service0 - operation2")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(name!="service0 - operation2")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('0 [service0 - operation0]');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('1000 [service1 - operation1]');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('3000 [service1 - operation3]');
      expect(result[2].value).to.equal('3000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name=~"service0.*")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(name=~"service0.*")').then(function(result) {
      expect(result).to.have.length(2);
      expect(result[0].text).to.equal('0 [service0 - operation0]');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('2000 [service0 - operation2]');
      expect(result[1].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(name!=~"service0.*")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(name!=~"service0.*")').then(function(result) {
      expect(result).to.have.length(2);
      expect(result[0].text).to.equal('1000 [service1 - operation1]');
      expect(result[0].value).to.equal('1000');
      expect(result[1].text).to.equal('3000 [service1 - operation3]');
      expect(result[1].value).to.equal('3000');
      done();
    });
  });

  it('should return single ID when using stream_ids(query="service IN ("service0") AND operation IN ("operation2")")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(query="service IN ("service0") AND operation IN ("operation2")")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('2000 [service IN ("service0") AND operation IN ("operation2")]');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(query!="service IN ("service0") AND operation IN ("operation2")")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(query!="service IN ("service0") AND operation IN ("operation2")")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('0 [service IN ("service0") AND operation IN ("operation0")]');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('1000 [service IN ("service1") AND operation IN ("operation1")]');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('3000 [service IN ("service1") AND operation IN ("operation3")]');
      expect(result[2].value).to.equal('3000');
      done();
    });
  });

  it('should return single ID when using stream_ids(query=~".*operation2.*")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(query=~".*operation2.*")').then(function(result) {
      expect(result).to.have.length(1);
      expect(result[0].text).to.equal('2000 [service IN ("service0") AND operation IN ("operation2")]');
      expect(result[0].value).to.equal('2000');
      done();
    });
  });

  it('should return multiples IDs when using stream_ids(query!=~".*operation2.*")', function(done) {
    ctx.ds.metricFindQuery('stream_ids(query!=~".*operation2.*")').then(function(result) {
      expect(result).to.have.length(3);
      expect(result[0].text).to.equal('0 [service IN ("service0") AND operation IN ("operation0")]');
      expect(result[0].value).to.equal('0');
      expect(result[1].text).to.equal('1000 [service IN ("service1") AND operation IN ("operation1")]');
      expect(result[1].value).to.equal('1000');
      expect(result[2].text).to.equal('3000 [service IN ("service1") AND operation IN ("operation3")]');
      expect(result[2].value).to.equal('3000');
      done();
    });
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