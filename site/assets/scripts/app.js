"use strict";

import jQuery from 'jquery';
import colorbrewer from './colorbrewer';
import DataCatalogCensus from './data-catalog';
import DataCatalogSynth from './data-catalog-synth';
import layers_dropdown_tmpl from './templates/layers_dropdown.hbs'
import layer_details_tmpl   from './templates/layer_details.hbs'
import region_details_tmpl  from './templates/region_details.hbs'
import bar_tooltip_tmpl from './templates/bar_tooltip.hbs'
import AppStyles from './config';
import * as Patients from './patients';

// Which source of data (census or synthetic) are we pulling from
var DataCatalog = DataCatalogCensus;

var App = window.App = {
  dataSet:{},
  baseRegions:{},
  baseRegionIndex:{},
  hover_layer: {},
  infoBox:{},
  legend:{},
  map:{},
  overlayPts:{},
  selectedFeature:{},
  selected_layer: {}
};

$(document).ready(function() {
  App.map = L.map("main_map",{doubleClickZoom:false,scrollWheelZoom:false}).setView([42.380349,-71.533836],8);
  const original_bounds = App.map.getBounds();
  
  const tiles = new L.TileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}
  );
  App.map.addLayer(tiles);
  App.map.on("mouseout",() => App.map.removeLayer(App.hover_layer));
  // pre-fetch the geometry layers
  
  loadGeoLayer("cousub", DataCatalogSynth);
  loadGeoLayer("county", DataCatalogSynth);
  loadGeoLayer("cousub", DataCatalogCensus);
  loadGeoLayer("county", DataCatalogCensus)
    .done(function(data) {
      App.baseRegions = L.geoJson(data,{style:AppStyles.baseStyle}).addTo(App.map);
      _.each(App.baseRegions.getLayers(),function(layer) {
        App.baseRegionIndex[layer.feature.properties.ct_fips] = layer;
      });
      loadDataSet("county_stats")
        .done(function(data) {
          App.dataSet.catalogKey = "pop";
          addDataLegend();
          showLayerDetails("pop");
          $("#sort_chart").text("Sort by " + DataCatalog.demographics["pop"].name);
        });
    });
  
  // populate the layers dropdown
  $("#data_form").append(layers_dropdown_tmpl({layers:_.where(DataCatalog.demographics,{active:true})}));

  $("#layer_select").change(function(e){
    const datasetId = $(e.target).val();
    App.dataSet.catalogKey = datasetId;
    const fn = function() {
      showLayerDetails(datasetId);
      $("#sort_chart").text("Sort by " + DataCatalog.demographics[datasetId].name);
    } 
    if (datasetId) {
      if (_.findWhere(App.dataSet.valueSet.properties,{key:datasetId})) {
        fn();  
      } else {
        const currCatalogKey = DataCatalog.demographics[datasetId];
        if (currCatalogKey) {
          const setName = App.geoLayer.geometry + "_" + currCatalogKey.data_set_name;
          if (DataCatalog.dataSets[setName]) {
            var promise = loadDataSet(setName);
          } else {
            alert(`Dataset ${setName} not available`);
          }
        }
        promise.done(fn);
      }
    }
  });
  
  $("#geo_layers").change(function(e, datasourceChanged = false) {
    const layer = $(e.target).val()
    const geopromise = loadGeoLayer(layer);
    App.map.removeLayer(App.selected_layer);

    // temp hack to force CCD data to load:
    if (App.dataSet.valueSet.geometry != App.geoLayer.geometry || datasourceChanged) {
      // we've changed geometry, so we need to refetch a dataSet for this new geometry
      App.dataSet.json = null;
      const currCatalogKey = DataCatalog.demographics[App.dataSet.catalogKey];
      if (currCatalogKey) {
        var promise = loadDataSet(App.geoLayer.geometry + "_" + currCatalogKey.data_set_name);
      }
      promise.done(function(){
        showLayerDetails(App.dataSet.catalogKey);
      });
    }
  }); 

  $("#data_source_switch").change(function(e) {
    const datasource = $(e.target).val();

    if (datasource === "census") {
      DataCatalog = DataCatalogCensus;
    } 
    else if (datasource === "synthea") {
      DataCatalog = DataCatalogSynth;
    }
    // Reset everything so the map is regenerated
    $("#geo_layers").trigger("change", true);
  });
  
  $("#sort_chart").click(sortChart);
  $("#sort_chart_name").click(sortChartByName);
  $("#zoom_to_all").click((e) => {e.stopPropogation;App.map.fitBounds(original_bounds);return false;});
});


function showLayerDetails(layerKey) {
  let layer = DataCatalog.demographics[layerKey];
  App.dataSet.layer = layer;
  let valueKey = layer.value_key;
  App.dataSet.valueKey = valueKey;
  _.extend(layer,{region:App.dataSet.valueSet.geometry_label});

  $("#layer_details").empty().append(layer_details_tmpl(layer));
  $("#region_details").hide();
  $("#layer_details").show();
  
  App.dataSet.values = _.pluck(App.dataSet.json,valueKey);
  const maxObj = _.max(App.dataSet.json,(d)=>{return d[valueKey]});
  const minObj = _.min(App.dataSet.json,(d)=>{return d[valueKey]});

  App.dataSet.maxValue = d3.max(App.dataSet.values);
  App.dataSet.minValue = d3.min(App.dataSet.values);
  renderFeatures(layerKey);
  
  const median = d3.median(App.dataSet.values);
  const mean = d3.mean(App.dataSet.values);
  
  const maxFeature = _findFeatureById(maxObj[App.dataSet.valueSet.primary_key]);
  const minFeature = _findFeatureById(minObj[App.dataSet.valueSet.primary_key]);

  const fmt=_getFormatter(layer);
  $("#detail_median").text(fmt(median));
  $("#detail_max").text(maxObj[App.dataSet.valueSet.name_key] + " " + App.dataSet.valueSet.geometry_label + ": " + fmt(maxObj[valueKey]) )
    .mouseover(function() {
      maxFeature.fireEvent("mouseover",maxFeature);
    })
    .mouseout(function() {
      maxFeature.fireEvent("mouseout",maxFeature);
    })
    .click(function() {
      App.map.fitBounds(maxFeature.getBounds());
      maxFeature.fireEvent("click",maxFeature);
    });
  
  $("#detail_min").text(minObj[App.dataSet.valueSet.name_key] + " " + App.dataSet.valueSet.geometry_label + ": " + fmt(minObj[valueKey]) )
    .mouseover(function() {
      minFeature.fireEvent("mouseover",minFeature);
    })
    .mouseout(function() {
      minFeature.fireEvent("mouseout",minFeature);
    })
    .click(function() {
      App.map.fitBounds(minFeature.getBounds());
      minFeature.fireEvent("click",minFeature);
    });
    App.legend.update();
    App.infoBox.update();
    renderChart();
    
}


function renderChart() {
  const fmt = d3.format(".3f");
  var chart_data = {
    bindto:"#chart",
    data:{
      x : 'x',
      columns: [
        ['x'].concat(_.pluck(App.dataSet.json,App.dataSet.valueSet.primary_key)),
        [App.dataSet.valueKey].concat(_.map(App.dataSet.values,function(d){return fmt(d)}))
       ],
      names: {
        [App.dataSet.valueKey] : DataCatalog.demographics[App.dataSet.catalogKey].legend_title
      },
      type:'bar',
      xSort:false,
      onmouseover : function (d) {
        var item_id = App.dataSet.json[d.index][App.dataSet.valueSet.primary_key];
        var feature = _findFeatureById(item_id);
        feature.fireEvent("mouseover");
      },
      onmouseout : function(d) {
        var item_id = App.dataSet.json[d.index][App.dataSet.valueSet.primary_key];
        var feature = _findFeatureById(item_id);
        feature.fireEvent("mouseout");
      },
      onclick : function(d) {
        this.unselect([DataCatalog.demographics[App.dataSet.catalogKey].legend]); //this.selected());
        this.select([DataCatalog.demographics[App.dataSet.catalogKey].legend],[d.index])
        var item_id = App.dataSet.json[d.index][App.dataSet.valueSet.primary_key];
        var feature = _findFeatureById(item_id);
        bringToCenter(feature);
        feature.fireEvent("click");
      },
      selection : {
        enabled:true
      } 
    },
    bar: {width: {ratio:0.8}},
    axis: {
          x: {
              type: 'category',
              tick:{values:[]}
          },
          y : {
            tick: {
                format: _getFormatter(App.dataSet.layer)
            }
        }
      },
    tooltip: {
          contents: function (d, defaultTitleFormat, defaultValueFormat, color) {
            let val2, val2_name, col2 = null;
            const fmt = _getFormatter(App.dataSet.layer);
            const name = App.dataSet.json[d[0].index][App.dataSet.valueSet.name_key];
            const val = fmt(d[0].value);
            const val_name = App.dataSet.layer.legend_label; //d[0].name;
            const col = color(d[0].id);
            if (d.length > 1) {
              val2 = fmt(d[1].value);
              val2_name = d[1].name;
              col2 = color(d[1].id);
            }
           return bar_tooltip_tmpl({name,val,val_name,col,val2,val2_name,col2});
          }
    }  
      
  };
  var chart = c3.generate(chart_data);
  App.chart = chart;
  var mean = d3.mean(_.pluck(App.dataSet.json,App.dataSet.valueKey));
  App.chart.ygrids.add([{value: mean,text:'Mean'}]);
}

function bringToCenter(feature) {
  const bounds = feature.getBounds();
  App.map.panInsideBounds(bounds);
}


function _sortByKey(array_data,key) {
  return _.sortBy(array_data,function(item){return item[key]});
}

function sortChart(e) {
  if (e) {e.preventDefault();}
  var sorted = _sortByKey(App.dataSet.json,App.dataSet.valueKey);
  _updateChart(sorted);
}

function sortChartByName(e) {
  if (e) {e.preventDefault();}
  var sorted = _sortByKey(App.dataSet.json,App.dataSet.valueSet.name_key);
  _updateChart(sorted);
}

function _updateChart(sorted) {
  var fmt = d3.format(".3f");
  App.dataSet.json = sorted;
  
  var cols = _.map(App.chart.data(),function(obj) {
    return [obj.id].concat(_.map(_.pluck(App.dataSet.json,obj.id),function(d){return fmt(d)}))
  });
  var columns = [['x'].concat(_.pluck(App.dataSet.json,App.dataSet.valueSet.primary_key))].concat(cols);
  App.chart.load({
    columns:columns
  });

  var mean = d3.mean(_.pluck(sorted,App.dataSet.valueKey));
  App.chart.ygrids.add([{value: mean,text:'Mean'}]);
  return false;
}

// Edited by Louis--added extra function argument so that both data sources can be loaded manually.
function loadGeoLayer(layerKey, loadedCatalog = DataCatalog) {
  var layer = loadedCatalog.geoLayers[layerKey];
  App.geoLayer = layer;
  App.geoId = layerKey;

  var promise = $.getJSON(layer.url)
    .done(function(data) {
      if (App.geoFeatureLayer) {
        // leave the county borders on when we display the ccd's
        // App.geoFeatureLayer.clearLayers();
      }
      loadedCatalog.geoLayers[layerKey].geoJson = data;

    })
    .fail(function(e) {
      console.log("Fail",e);
    });
  return promise;
}

function loadDataSet(layerKey) {
  var dataSet = _.findWhere(DataCatalog.dataSets,{id:layerKey});
  App.dataSet.valueSet = dataSet;
  App.dataSet.dataId = layerKey;
  var promise = $.getJSON(dataSet.url);
  promise.done(function(data) {
    // if we have loaded a data layer that is in the same geometry as the current geo layer,
    // then we can merge in the values
    // save the data back into the dataset entry in the data catalog, so we can access it later
    DataCatalog.dataSets[layerKey].json = data;
    if (App.dataSet.json && (App.dataSet.valueSet.geometry == App.geoLayer.geometry)) {
      var dataIndex = _.indexBy(data,App.dataSet.valueSet.primary_key);
      
      _.each(App.dataSet.index,function(e){
        _.extend(e,dataIndex[e[App.dataSet.valueSet.primary_key]]);
      });
    } else {
      // we've switched geometry so we need to clear out the data 
      App.dataSet.json = data;
      App.dataSet.index = _.indexBy(App.dataSet.json,App.dataSet.valueSet.primary_key);
    }
  });
 return promise;
}

function addDataLegend() {
  let info = L.control();
  info.onAdd = function(map) {
      this._div = L.DomUtil.create('div', 'info info-box'); // create a div with a class "info"
      this.update();
      return this._div;
  };

  // method that we will use to update the control based on feature properties passed
  info.update = function (props) {
    let filterObj = {},
        parentStr="";
   const layer = DataCatalog.demographics[App.dataSet.catalogKey];
   const fmt = _getFormatter(layer);
    var html = '<h3>' + DataCatalog.demographics[App.dataSet.catalogKey].legend_title +'</h3>';
    if (props) {
      filterObj[App.dataSet.valueSet.primary_key] = props[App.dataSet.valueSet.primary_key];
      const currItem = _.where(App.dataSet.json,filterObj)[0];
      if (App.dataSet.valueSet.parent_name_key) {
        parentStr = " - " + currItem[App.dataSet.valueSet.parent_name_key] + " " + App.geoLayer.parent_geometry_label;
      }
      this._div.innerHTML =  html +
       '<b>' + currItem[App.dataSet.valueSet.name_key] + parentStr + '</b><br>' + fmt(currItem[App.dataSet.valueKey]);
    } else {
      this._div.innerHTML = html + 
          '<br>Hover over a ' + App.dataSet.valueSet.geometry_label;  // will need to update this based on county/ccd geometry
    }
  };

  info.addTo(App.map);
  App.infoBox = info;
  
  let legend = L.control({position:'bottomright'});
  legend.onAdd = function(map) {
    this._div = L.DomUtil.create('div', 'info legend');
    this.update();
    return this._div;
  };

  legend.update = function(props) {
    const layer = DataCatalog.demographics[App.dataSet.catalogKey],
          fmt1 = _getValueFormatter(layer),
          fmt2 = _getFormatter(layer);
          
    const palette = DataCatalog.demographics[App.dataSet.catalogKey].palette || 'YlOrRd';
    const colors = colorbrewer[palette][8];
    let minVal = App.dataSet.minValue,
        maxVal = App.dataSet.maxValue;
    
    /* Some datasets don't look good with the d3.scale, so we do a little manual adjustment */
    if (App.dataSet.valueKey == "pct_female" || App.dataSet.valueKey == "pct_male") {
      minVal = 0.4;
      maxVal = 0.6;
    }
    if (App.dataSet.valueKey == "pop" && App.geoId == "cousub") {
      maxVal = Math.min(maxVal,75000);
    }
    if (App.dataSet.valueKey == "pop_sm" && App.geoId == "cousub") {
      maxVal = 1500;
      minVal = 50;
    }
    if (App.dataSet.valueKey == "pop_sm" && App.geoId == "county") {
      maxVal = 320;
      minVal = 100;
    }
    
    const q = d3.scale.quantile().domain([minVal,maxVal]).range(colors);
    const range = [Math.min(App.dataSet.minValue,minVal)].concat(q.quantiles());
    range.push(Math.max(App.dataSet.maxValue,maxVal));
    this._div.innerHTML = '<p>' + DataCatalog.demographics[App.dataSet.catalogKey].legend + '</p>';
    for (var i=1; i < range.length; i++) {
      this._div.innerHTML += '<i style="background:' + colors[i-1] + '"></i>' +
        fmt1(range[i-1]) + '&ndash;' + fmt2(range[i]) + '<br>';
    }
  };
  
  legend.addTo(App.map);
  App.legend = legend;
}
  
function renderFeatures(layerKey) {
  App.dataSet.catalogKey = layerKey;
  const palette = DataCatalog.demographics[App.dataSet.catalogKey].palette || 'YlOrRd';
  let colors = colorbrewer[palette][5];
  let minVal = App.dataSet.minValue;
  let maxVal = App.dataSet.maxValue;
  /* Some datasets don't look good with the d3.scale, so we do a little manual adjustment */
  if (App.dataSet.valueKey == "pct_female" || App.dataSet.valueKey == "pct_male") {
    minVal = 0.4;
    maxVal = 0.6;
  }
  if (App.dataSet.valueKey == "pop" && App.geoId == "cousub") {
    maxVal = Math.min(maxVal,75000);
    minVal = 0;

  }
  if (App.dataSet.valueKey == "pop_sm" && App.geoId == "cousub") {
    maxVal = 2000;
    minVal = 50;
    colors = colorbrewer[palette][9];
  }
  if (App.dataSet.valueKey == "pop_sm" && App.geoId == "county") {
    maxVal = 320;
    minVal = 100;
  }
  const q = d3.scale.quantile().domain([minVal,maxVal]).range(colors);
  const styleFn = function(feature) {
    return {weight:2, fillOpacity:AppStyles.fillOpacity, opacity:AppStyles.borderOpacity, color:AppStyles.borderColor, fillColor : q(feature.properties[App.dataSet.valueKey])}
 }

  if (App.geoFeatureLayer) {
    App.geoFeatureLayer.clearLayers();
  }
  App.map.removeLayer(App.hover_layer);

  function highlightFeature(e) {
    const featureLayer = e.target;
    App.map.removeLayer(App.hover_layer);
    let newLayer = L.multiPolygon(featureLayer.getLatLngs(),featureLayer.options);
    newLayer.setStyle(AppStyles.newFeature);
    if (App.infoBox) {
      App.infoBox.update(featureLayer.feature.properties);
    }
    newLayer.addTo(App.map);
    App.hover_layer = newLayer;
   
    const filterObj = {
      [App.dataSet.valueSet.primary_key] : featureLayer.feature.properties[App.geoLayer.primary_key]
    };
    var rank = _.findIndex(App.dataSet.json, filterObj);
    App.chart.select(null,[rank],true);
  }
  
  function onEachFeature(feature,layer) {
    layer.on({
      mouseover:highlightFeature,
      dblclick:(e) => { App.map.fitBounds(e.target.getBounds()); },
      click:_showDetails
      });
      
    function _showDetails(e) {
      $("#layer_details").hide();
       
      var props = _.extend({},e.target.feature.properties);
    
      // check to see if this is the current selected feature
      
      if (App.selected_feature && App.selected_feature[App.dataSet.valueSet.primary_key] == props[App.dataSet.valueSet.primary_key]) {
        $("#region_details").show();
        return;
      } else {
        App.selected_feature = props;
        App.map.removeLayer(App.selected_layer);

        let layer = e.target;
        let newLayer = L.multiPolygon(layer.getLatLngs(),layer.options);
        newLayer.setStyle(AppStyles.selectedFeature);
        newLayer.addTo(App.map);
        App.selected_layer = newLayer;
        App.map.removeLayer(App.hover_layer);

        let pop_fmt = _getFormatter(DataCatalog.demographics.pop);
        let pop_sm_fmt = _getFormatter(DataCatalog.demographics.pop_sm);
        props.name = e.target.feature.properties[App.dataSet.valueSet.name_key];
        props.pop = pop_fmt(props.pop);
        props.pop_sm = pop_sm_fmt(props.pop_sm) + " people per sq. mi.";
        props.sq_mi = _getFormatter(DataCatalog.demographics.sq_mi)(props.sq_mi);

        const html = $("#region_details").empty().append(region_details_tmpl(props)).show();
      
        /* select the corresponding bar in the chart */
        App.chart.unselect([DataCatalog.demographics[App.dataSet.catalogKey].legend]);
        const filterObj = {
          [App.dataSet.valueSet.primary_key] : props[App.dataSet.valueSet.primary_key]
        }
        const ix = _.findIndex(App.dataSet.json,filterObj);
        App.chart.select(null,[ ix ],true );
        $("#region_details [data-toggle='popover']").popover({container:'body'});
        $("#zoom_to_feature_btn").on('click',function() {
          App.map.fitBounds(e.target.getBounds());
        });

        $("#load_resident_list").on('click',function(){
          const promise = Patients.loadPatients({city:props.name});
          promise.done((data) => {
            const html = Patients.generatePatientsHTML(data);
            $("#region_patients").html(html);
          });
        });
                  
        $("#region_details h2 button").on('click',function(){
          if (App.selected_layer) {
            App.map.removeLayer(App.selected_layer);
          }
          App.chart.unselect();
          $("#region_details").hide();
          $("#layer_details").show();
        });
      } // end else we clicked a different feature
    }
}
  
  App.geoFeatureLayer = L.geoJson(App.geoLayer.geoJson);

  App.geoFeatureLayer.eachLayer(function(layer) {  
    var valueKey = App.dataSet.valueSet.primary_key;
    let filterObj = {
      [valueKey] : layer.feature.properties[valueKey]
    };
    const obj = App.dataSet.index[layer.feature.properties[valueKey]];
//    if (obj) {
      _.extend(layer.feature.properties,obj);
//    }
  });
  App.geoFeatureLayer = L.geoJson(App.geoLayer.geoJson, {style:styleFn,onEachFeature:onEachFeature}).addTo(App.map);
}

App.paginatePatientList = function(url = null) {
  if (url !== null) {
    const promise = Patients.loadPaginationURL(url);
    promise.done((data) => {
      const html = Patients.generatePatientsHTML(data);
      $("#region_patients").html(html);
    });
  }
  return false;
}
App.showPatientDetail = function(pid) {
  console.log(`PID=${pid}`);
  const promise = Patients.loadPatient(pid);
  promise.done((data) => {
    const html = Patients.generatePatientDetail(data);
    $("#patient_detail_view").html(html);
  });
}
/* Utility methods */
/* return a function to format values for a specific demographic attribute */
function _getFormatter({format_specifier=".1f",unit_label = ""}) {
  const fmt = d3.format(format_specifier);
  return (val) => { return fmt(val) + unit_label; }
}
function _getValueFormatter({value_format_specifier=".1f",format_specifier=".1f"}) {
  const fmt = d3.format(value_format_specifier);
  const mult = format_specifier.lastIndexOf("%") > -1 ? 100 :1;
  return (val) => {return fmt(val*mult)}
}

function _findFeatureById(id) {
var feature = null;
  App.geoFeatureLayer.eachLayer(function(f) {
    if (f.feature.properties[App.dataSet.valueSet.primary_key] == id) {
      feature = f;
    }
  });
  return feature
}

function _findBaseFeatureById(id) {
  return App.baseRegionIndex[id];
}

