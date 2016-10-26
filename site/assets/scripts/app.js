"use strict";

import jQuery from 'jquery';
import moment from 'moment';
import page from 'page';
import Wkt from './lib/Wicket/wicket';
import colorbrewer from './colorbrewer';
import DataCatalogCensus from './data-catalog';
import DataCatalogSynth from './data-catalog-synth';
import layers_dropdown_tmpl from './templates/layers_dropdown.hbs'
import layer_details_tmpl   from './templates/layer_details.hbs'
import region_details_tmpl  from './templates/region_details.hbs'
import bar_tooltip_tmpl from './templates/bar_tooltip.hbs'
import AppStyles from './config';
import * as Patients from './patients';

const BASE_URL = `${API_HOST}`;
const BASE_URL_DIRECT_SERVICE = BASE_URL + "/SendDirectEmailService/webresources/direct/send/patient"

// Which source of data (census or synthetic) are we pulling from
var DataCatalog = DataCatalogCensus;

var App = window.App = {
  baseRegions:{},
  baseRegionIndex:{},
  dataSet:{},
  geoLayer: {},
  geoId: null,
  hover_layer: {},
  infoBox:{},
  legend:null,
  map:{},
  mapView: {},
  overlayPts:{},
  selected_feature:{},
  selected_layer: {}
};

var Router = window.Router = {
  ctx:null,
  parse:(ctx,next) => {
    Router.ctx = ctx;
    Router.validate();
    next();
    },
  goto:(fields) => {
    let path = "/dashboard/";
    if (fields.source == undefined) {fields.source = Router.ctx.params.source? Router.ctx.params.source : 'census';}
    if (fields.region == undefined) {fields.region = Router.ctx.params.region? Router.ctx.params.region : 'county';}
    if (fields.datavalue == undefined) {fields.datavalue = Router.ctx.params.datavalue? Router.ctx.params.datavalue : 'pop';}
    path += [fields.source,fields.region,fields.datavalue].join('/');
    page.replace(path);
  },
  route : (ctx) => {
    let {source='synthea',region='town',datavalue='pop'} = ctx.params;
    Router.ctx = ctx;
    Router.validate();
  },
  show: (ctx) => { 
    Router.ctx = ctx;
  },
  validate: () => {
    let {source='synthea',region='town',datavalue='pop'} = Router.ctx.params;
    if (source != 'synthea' && source != 'census') {source='synthea'}
    if (region != 'town' && region != 'county') {region = 'town'}
    Router.ctx.params.source = source;
    Router.ctx.params.region = region;
  }
}

$(document).ready(function() {
  App.map = L.map("main_map",{doubleClickZoom:false,scrollWheelZoom:false}).setView([42.1,-71.333836],8);
  const original_bounds = App.map.getBounds();
  App.mapView = $("#map_view");
  const tiles = new L.TileLayer('//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}
  );
  page.base('/dashboard');
  page('/:source/:region/:datavalue',Router.route);
  page('/:source/:region',Router.route);
  page('/:source',Router.route);

  page('*',Router.parse);
  page({ click:false, popstate:true });  // dispatch:false
  page('/dashboard',Router.show);


  
  let s = moment(new Date("2016-06-30"));
  $(".navbar-header .navbar-brand").append(": Day " + moment(new Date()).diff(s,'days'));  
  App.map.addLayer(tiles);
  App.map.on("mouseout",() => App.map.removeLayer(App.hover_layer));
  // pre-fetch the geometry layers

  let {source='synthea',region='town',datavalue='pop'} = Router.ctx.params;

  
  $("#geo_layers_switch").val(region);
  $("#data_source_switch").val(source);

  DataCatalog = (source == "synthea" ? DataCatalogSynth:DataCatalogCensus);

  loadGeoLayer("county", DataCatalogCensus)
    .done(function(data) {
      App.baseRegions = L.geoJson(data,{style:AppStyles.baseStyle}).addTo(App.map);
      _.each(App.baseRegions.getLayers(),function(layer) {
        App.baseRegionIndex[layer.feature.properties.ct_fips] = layer;
      });
      loadGeoLayer(region, DataCatalog)
        .done(function() {
          let valueset = `${region}_stats`;
          loadValueSet(valueset)
            .done(function(data) {
              let dataval = _.indexOf(App.dataSet.valueSet.demographics,datavalue) > -1 ? datavalue : "pop";
              App.dataSet.catalogKey = dataval;
              
              $("#layer_select").val(dataval);
              populateDemographicsDropdown(App.dataSet.valueSet,DataCatalog);
              showLayerDetails(App.dataSet.catalogKey);
            });
        });
      });
    
  

  
  $("#geo_layers_switch").change(function(e) {
    const geoLayerKey = $(e.target).val()
    App.map.removeLayer(App.selected_layer);
    const geopromise = loadGeoLayer(geoLayerKey)
    .done(function(data) {
      refreshDataLayer(DataCatalog);
      Router.goto({region:geoLayerKey});
    });
  }); 

  $("#data_source_switch").change(function(e) {
    const datasource = $(e.target).val();
    if (datasource === "census") {
      DataCatalog = DataCatalogCensus;
    } else if (datasource === "synthea") {
      DataCatalog = DataCatalogSynth;
    }
    // Reset everything so the map is regenerated
    refreshDataLayer(DataCatalog);
    Router.goto({source:datasource});
  });
  
  $("#layer_select").change(function(e){
    const datasetId = $(e.target).val();
    $("#region_details").hide();
    $("#layer_details").show();
    showLayerDetails(datasetId);
  });  
  
  $("#sort_chart").click(sortChart);
  $("#sort_chart_name").click(sortChartByName);
  $("#zoom_to_all").click((e) => {e.stopPropogation;App.map.fitBounds(original_bounds);return false;});

});

/** Lookup the value set to use in the current DataCatalog given a geometryId and a demographics key
**/
function findValueSet(geometry,demographicsKey) {
  return DataCatalog.valueSets[geometry + "_" + 'stats']; //DataCatalog.demographics[demographicsKey].data_set_name];
}
function refreshDataLayer(catalog) {
/* determine what needs to be done with the current data layer
 - it might need to change because the current selected demographic is not in the 
 geoLayer or datasource.
 */
  App.dataSet.valueSet = findValueSet(App.geoId,App.dataSet.catalogKey);

  // we might need to switch the current value in the dropdown because it isn't avail in the new dataSet
  const layerKey = populateDemographicsDropdown(App.dataSet.valueSet,DataCatalog);
  App.dataSet.catalogKey = layerKey;
  loadValueSet(App.dataSet.valueSet.id)
    .done(function(){
      showLayerDetails(App.dataSet.catalogKey);
    });
}

function switchDataLayer(layerKey) {
  if (layerKey == undefined || layerKey == "") return;
  $("#layer_select").val(layerKey);
  showLayerDetails(layerKey);
}

function populateDemographicsDropdown(valueSet,catalog) {
  // populate the layers dropdown
  let demographics = _.where(_.pick(catalog.demographics,valueSet.demographics),{active:true});
  $("#layer_select").html(layers_dropdown_tmpl({layers:demographics}));

  const isKeyAvail = _.findWhere(demographics,{key:App.dataSet.catalogKey});
  const currentKey = isKeyAvail ? App.dataSet.catalogKey : $("#layer_select").val();
  App.dataSet.catalogKey = currentKey;
  $("#layer_select").val(currentKey);
  Router.goto({datavalue:currentKey});
  return currentKey;
}

function showLayerDetails(layerKey) {
  let layer = DataCatalog.demographics[layerKey];
  App.dataSet.catalogKey = layerKey;
  App.dataSet.layer = layer;
  let valueKey = layer.value_key;
  App.dataSet.valueKey = valueKey;
  _.extend(layer,{region:App.dataSet.valueSet.geometry_label,isPopulation:(layerKey === "pop")});

  $("#patient_detail_view button.close").trigger('click');
  $("#layer_details").empty().append(layer_details_tmpl(layer));

  $("#sort_chart").text("Sort by " + layer.name);

  App.dataSet.values = _.map(_.pluck(App.dataSet.json,valueKey),(x)=>x===undefined?0:x);
  const fmt=_getFormatter(layer);

  const maxObj = _.max(App.dataSet.json,(d)=>{return d[valueKey]});
  const minObj = _.min(App.dataSet.json,(d)=>{return d[valueKey]});
  if (layerKey == "pop") {
    const total_pop = _.reduce(App.dataSet.values,(m,n)=>{return m+n},0);
    $("#detail_total_population").text(fmt(total_pop));
  }
  App.dataSet.maxValue = d3.max(App.dataSet.values);
  App.dataSet.minValue = d3.min(App.dataSet.values);
  renderFeatures(layerKey);
  
  const median = d3.median(App.dataSet.values);
  const mean = d3.mean(App.dataSet.values);
  
  const maxFeature = _findFeatureById(maxObj[App.dataSet.valueSet.primary_key]);
  const minFeature = _findFeatureById(minObj[App.dataSet.valueSet.primary_key]);

  $("#detail_mean").text(fmt(mean));
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
  if (App.legend) {
    App.legend.update();
  } else {
    addDataLegend();
  }
  App.infoBox.update();
  renderChart();
  Router.goto({datavalue:layerKey});

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

  return false;
}

/** Load a geoLayer from a DataCatalog. This layer is expected to have only geo Features
 * and provide only the basic properties for each feature.
 */
 
function loadGeoLayer(layerKey, loadedCatalog = DataCatalog) {
  const layer = loadedCatalog.geoLayers[layerKey];
  App.geoLayer = layer;
  App.geoId = layerKey;
  if (layer.geoJson && layer.geoJson.features && (layer.geoJson.features.length > 0) ) {
    return new jQuery.Deferred().resolve();
  } else {
    const promise = $.getJSON(layer.url)
      .done(function(data) {
        App.geoLayer.geoJson = data;
      })
      .fail(function(e) {
        console.log("Failure loading geography layer",e);
      });
    return promise;
  }
}

/** Load one of the valueSets in the DataCatalog. The layerKey should be 
 *  one of 'county_stats' or 'town_stats' 
 */
function loadValueSet(layerKey) {
  const valueSet = _.findWhere(DataCatalog.valueSets,{id:layerKey});
  App.dataSet.valueSet = valueSet;
  const promise = $.getJSON(valueSet.url)
    .done(function(data) {
      DataCatalog.valueSets[layerKey].json = data;
      App.dataSet.json = data;
      App.dataSet.index = _.indexBy(App.dataSet.json,App.dataSet.valueSet.primary_key);
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
      if (currItem != undefined && App.dataSet.valueSet.parent_name_key) {
        parentStr = " - " + currItem[App.dataSet.valueSet.parent_name_key] + " " + App.geoLayer.parent_geometry_label;
      }
      const dataVal = currItem[App.dataSet.valueKey] === undefined ? "n/a" : fmt(currItem[App.dataSet.valueKey]);
      this._div.innerHTML =  html +
       '<b>' + currItem[App.dataSet.valueSet.name_key] + parentStr + '</b><br>' + dataVal;
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
    let colors = colorbrewer[palette][7];
    let minVal = App.dataSet.minValue,
        maxVal = App.dataSet.maxValue;
    
    /* Some datasets don't look good with the d3.scale, so we do a little manual adjustment */
    if (App.dataSet.valueKey == "pct_female" || App.dataSet.valueKey == "pct_male") {
      minVal = 0.4;
      maxVal = 0.6;
    }
    if (App.dataSet.valueKey == "pop" && App.geoId == "town") {
      maxVal = Math.min(maxVal,75000);
    }
    if (App.dataSet.valueKey == "pop_sm" && App.geoId == "town") {
      maxVal = 1500;
      minVal = 50;
      colors = colorbrewer[palette][9];
    }
    if (App.dataSet.valueKey == "pop_sm" && App.geoId == "county") {
      maxVal = 320;
      minVal = 100;
    }
    
    const q = d3.scale.quantile().domain(App.dataSet.values).range(colors);
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
  const palette = DataCatalog.demographics[App.dataSet.catalogKey].palette || 'YlOrRd';
  let colors = colorbrewer[palette][7];
  let minVal = App.dataSet.minValue;
  let maxVal = App.dataSet.maxValue;
  /* Some datasets don't look good with the d3.scale, so we do a little manual adjustment */
  if (App.dataSet.valueKey == "pct_female" || App.dataSet.valueKey == "pct_male") {
    minVal = 0.4;
    maxVal = 0.6;
  }
  if (App.dataSet.valueKey == "pop" && App.geoId == "town") {
    maxVal = Math.min(maxVal,75000);
    minVal = 0;

  }
  if (App.dataSet.valueKey == "pop_sm" && App.geoId == "town") {
    maxVal = 2000;
    minVal = 50;
    colors = colorbrewer[palette][9];
  }
  if (App.dataSet.valueKey == "pop_sm" && App.geoId == "county") {
    maxVal = 320;
    minVal = 100;
  }
  const q = d3.scale.quantile().domain(App.dataSet.values).range(colors);
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
    let newLayer = L.polygon(featureLayer.getLatLngs(),featureLayer.options);
    newLayer.setStyle(AppStyles.newFeature);
    if (App.infoBox) {
      App.infoBox.update(featureLayer.feature.properties);
    }
    newLayer.on({
      click:function(){featureLayer.fire('click');}
    });
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
    
     
        App.selected_feature = props;
        App.map.removeLayer(App.selected_layer);

        const layer = e.target;
        let newLayer = L.polygon(layer.getLatLngs(),layer.options);
        newLayer.setStyle(AppStyles.selectedFeature);
        newLayer.addTo(App.map);
        App.selected_layer = newLayer;
        App.map.removeLayer(App.hover_layer);

        const pop_fmt = _getFormatter(DataCatalog.demographics.pop);
        const pop_sm_fmt = _getFormatter(DataCatalog.demographics.pop_sm);
        props.name = e.target.feature.properties[App.dataSet.valueSet.name_key];
        props.pop = pop_fmt(props.pop);
        props.pop_sm = pop_sm_fmt(props.pop_sm);
        props.sq_mi = _getFormatter(DataCatalog.demographics.sq_mi)(props.sq_mi);
        props.showResidents = (App.geoLayer.geometry == "town") && DataCatalog.source == 'Synthea';
        const demos = _.without(App.dataSet.valueSet.demographics,"pop","pop_sm");
        props.demographics = _.map(demos,function(key){
        
          const fmt = _getFormatter(DataCatalog.demographics[key]);
          const dataVal = props[key] === undefined ? "n/a" : fmt(props[key]);
          const sorted = _.sortBy(App.dataSet.json,key);
          const idx = _.sortedIndex(sorted,App.selected_feature,key) +1;
          const length = sorted.length;
          const pos = `${idx} of ${length}`;
          const selectedKey = App.dataSet.catalogKey == key ? true : false;
          return {name:DataCatalog.demographics[key].name,datasetId:key,val:dataVal,pos:pos,selectedKey:selectedKey}
        });
          
        const html = $("#region_details").empty().append(region_details_tmpl(props)).show();
        $("#region_details a.showDemographicBtn").on('click',function(evt) {
          evt.preventDefault();
          const datasetId = $(evt.target).data("datasetid");
          switchDataLayer(datasetId);
          $("#region_details tr").removeClass("selected");
          $(`#region_details tr[data-datasetid=${datasetId}]`).addClass("selected");
          App.selected_layer.bringToFront();
        });
        
        /* select the corresponding bar in the chart */
        App.chart.unselect([DataCatalog.demographics[App.dataSet.catalogKey].legend]);
        const filterObj = {
          [App.dataSet.valueSet.primary_key] : props[App.dataSet.valueSet.primary_key]
        }
        const idx = _.findIndex(App.dataSet.json,filterObj);
        App.chart.select(null,[ idx ],true );
        $("#region_details [data-toggle='popover']").popover({container:'body'});
        $("#zoom_to_feature_btn").on('click',function(e) {
          layer.stopPropogation;
          e.preventDefault();
          App.map.fitBounds(layer.getBounds());
        });

        $("#load_resident_list").on('click',function(){
          const promise = Patients.loadPatients({city:props.name}, App.dataSet.catalogKey);
          $("#region_patients").append('<div data-loader="circle" class="loader"></div>');
          promise.done((data) => {
            const html = Patients.generatePatientsHTML(data, props.name, App.dataSet.catalogKey);
            const points = Patients.generatePatientLocations(data);
            $("#region_patients").html(html);
            /* var wkt = new Wkt.Wkt();
            for (const point of points) {
              wkt.read(points.point);
            }
            console.log(wkt);
            console.log(wkt.toObject());
            */
            
          })
         .fail(function(e) {
            alert("Failure loading residents list");
            $("#region_patients div[data-loader]").remove();
            console.log("Failure loading residents list",e);
          });
        });
                  
        $("#region_details h2 button").on('click',function(){
          if (App.selected_layer) {
            App.map.removeLayer(App.selected_layer);
          }
        $("#patient_detail_view button.close p_record").trigger('click');
          App.chart.unselect();
          $("#region_details").hide();
          $("#layer_details").show();
        });
    }
}
  
  App.geoFeatureLayer = L.geoJson(App.geoLayer.geoJson);

  App.geoFeatureLayer.eachLayer(function(layer) {  
    const valueKey = App.dataSet.valueSet.primary_key;
    const obj = App.dataSet.index[layer.feature.properties[valueKey]];
      _.extend(layer.feature.properties,obj);
  });
  App.geoFeatureLayer = L.geoJson(App.geoLayer.geoJson, {style:styleFn,onEachFeature:onEachFeature}).addTo(App.map);
}

App.paginatePatientList = function(url = null) {
  if (url !== null) {
    const promise = Patients.loadPaginationURL(url);
    promise.done((data) => {
      const html = Patients.generatePatientsHTML(data, App.selected_feature.name, App.dataSet.catalogKey);
      $("#region_patients").html(html);
    });
  }
  return false;
}
App.showPatientDetail = function(pid,elem) {
  $("#region_patients table tr").removeClass("selected");
  $(elem).parents("tr").addClass("selected");
  const promise = Patients.loadPatient(pid);
  promise.done((data) => {
    App.mapView.hide();
    Patients.displayPatientDetail(data,$("#patient_detail_view"));
    $('#patient_tab_nav a').click(function (e) {
      e.preventDefault()
      $(this).tab('show')
    });
    $("#patient_detail_view #p_record_button").on('click',function() {
      $("#patient_detail_view").hide();
      $("#region_patients table tr").removeClass("selected");
      App.mapView.show();
    });
    $('#p_direct_form').submit(function (e) {
      e.preventDefault();
      var form = $('#p_direct_form')[0];
      var formData = new FormData(form)
      console.log(form);
      $.ajax({
        type:"POST",
        url: BASE_URL_DIRECT_SERVICE,
        data: formData,
        // Needs to be used for file uploading
        contentType: false,
        processData: false, 
        success: function (response) {
          $('#send_modal').modal('toggle');
        },
        error: function (jqXHR, textStatus, errorThrown ) {
          alert("There was an error in sending your email.")
          // Do we want to toggle the modal or not?
          $('#send_modal').modal('toggle');
        }
      });
      return false;
    }); 

    $(document).ready(function () {
      if (sessionStorage["to"]) {
        $('#to').val(sessionStorage["to"]);
      }
    });
    $('.stored').change(function () {
        sessionStorage[$(this).attr('name')] = $(this).val();
    });
  });
  return false;
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

