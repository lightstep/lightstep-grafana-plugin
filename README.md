# Lightstep Datasource for Streams

Lightstep datasource for [streams]((https://docs.lightstep.com/docs/monitor-a-service-level-indicator-with-streams)) in Grafana. 

Looking for [Lightstep metrics](https://lightstep.com/metrics/) in Grafana? Check out the [Lightstep Metrics Datasource](https://grafana.com/grafana/plugins/lightstep-metrics-datasource/).

## Requirements

* Grafana 7 or 8
* Unsigned plugin permissions for: lightstep-app,grafana-lightstep-datasource,grafana-lightstep-graph
* [Lightstep streams](https://docs.lightstep.com/docs/monitor-a-service-level-indicator-with-streams)
* Lightstep API Key with viewer role

## Installing

1. Download the latest zip archive from the [Releases page](https://github.com/lightstep/lightstep-grafana-plugin/releases). 

2. Install the plugin from the zip archive, [see Grafana documentation here](https://grafana.com/docs/grafana/latest/plugins/installation). 

3. Modify the `allow_loading_unsigned_plugins` property in `grafana.ini` to the following value:

```
[plugins]
allow_loading_unsigned_plugins = lightstep-app,grafana-lightstep-datasource,grafana-lightstep-graph
```

5. [Provision the data source](https://grafana.com/docs/grafana/latest/administration/provisioning/#data-sources) with your API key using `secureJsonData`. An example file for provisioning the plugin with a sample datasource can be found in the [`provisioning`](./provisioning/datasources) directory of this repository. This is a breaking change as of v1.2.0, and the Lightstep API key can no longer be set in the settings page.

6. Restart Grafana, and login. You should see the data source you provisioned in step 5 and can use it to start creating dashboards.

## Templating
See the [Templating](https://grafana.com/docs/grafana/latest/reference/templating/) documentation for an introduction to the templating feature and the different types of template variables.

### Query variable
The Lightstep datasource provides the following queries that you can specify in the `Query` field in the Variable edit view of Grafana.

| Name         | Description |
| ------------ |-------------| 
| `attributes(name)` <br/>`attributes(stream_query)`    | Returns the Name or the Stream Query of all Streams. This is can be used with the `Regex` field in Grafana to build a dropdown |
| `stream_ids(stream_query=~"regex")` <br/>`stream_ids(stream_query!=~"regex")` <br/>`stream_ids(stream_query="value")` <br/>`stream_ids(stream_query!="value")`    | Returns the Stream ID of all matching Streams. The datasource uses the Stream ID to request the timeseries data in the various panel/visualization. |
| `stream_ids(name=~"regex")` <br/>`stream_ids(name!=~"regex")` <br/>`stream_ids(name="value")` <br/>`stream_ids(name!="value")`    | Returns the Stream ID of all matching Streams. The datasource uses the Stream ID to request the timeseries data in the various panel/visualization. |

### Using interval and range variables
It's possible to use some [global built-in variables](https://grafana.com/docs/grafana/latest/reference/templating/#global-built-in-variables) in the `Resolution` field.
Currently, only `$__range` and `$__interval` are supported.

## Testing

### Running on docker for development and testing
It's possible to use the `docker-compose.yml` file in this repo to quickly install this plugin in a new instance of Grafana for development in testing. The `docker-compose.yml` configuration automatically provisions the plugin and creates a default datasource using the files in the `provisioning` directory.

```
  # build assets from source
  $ make build

  # create volume so you don't lose your config across container start/stops
  $ docker volume create grafana-data-lgp 

  # bring up docker connected to your API key
  $ export LIGHTSTEP_API_KEY=your_api_key
  $ docker-compose up

  # grafana is now running on localhost:3000
```

### Using the CLI

```
  # Note: you will still need to manually provision the datasource and edit your grafana.ini file to allow unsigned plugins
  $ make release
  $ grafana-cli --pluginUrl ./lightstep-grafana-plugin-release.zip plugins install lightstep-app
```
