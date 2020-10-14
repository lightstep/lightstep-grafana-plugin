# Lightstep Datasource

Once you install the LightStep Datasource plugin, you should be able to add Lightstep graphs into your Grafana dashboards.

After installing the plugin (see [Installing Plugins](https://grafana.com/docs/grafana/latest/plugins/installation)), you will need a Lightstep API key (Account Settings > API Keys) with the Viewer role to configure it. 

Follow the configuration screen instructions to configure the plugin.

This plugin supports Grafana v7 and earlier.

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
