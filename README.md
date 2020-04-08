# LightStep Datasource

Once you install the LightStep Datasource plugin, you should be able to add LightStep graphs into your Grafana dashboards.

We are currently alpha testing this plugin.

After installing the plugin (see [Installing Plugins](http://docs.grafana.org/plugins/installation/)), you will need to reach out to your LightStep representative to enable your account for alpha access and generate the API key needed in the configuration screen.

Follow the configuration screen instructions to configure the plugin.

## Templating
See the [Templating](https://grafana.com/docs/grafana/latest/reference/templating/) documentation for an introduction to the templating feature and the different types of template variables.

### Query variable
The LightStep data source provides the following queries that you can specify in the `Query` field in the Variable edit view.

| Name         | Description |
| ------------ |-------------| 
| attributes(name)<br/>attributes(query)    | Returns the Name of all Streams. This is can be used with the `Regex` field in Grafana to build a dropdown |
| stream_ids(query=~"regex")<br/>stream_ids(query!=~"regex")<br/>stream_ids(query="value")<br/>stream_ids(query!="value")    | Returns the Stream ID of all matching Streams. The datasource uses the Stream ID to request the timeseries data in the various panel/visualization. |

### Using interval and range variables
It's possible to use some [global built-in variables](https://grafana.com/docs/grafana/latest/reference/templating/#global-built-in-variables) in the `Resolution` field.
Currently, only `$__range` and `$__interval` are supported.