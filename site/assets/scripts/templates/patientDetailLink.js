import Handlebars from 'handlebars';

module.exports = function(name, pid) {
  name = Handlebars.Utils.escapeExpression(name);
  var result = '<a href="/dashboard/?patient='+ pid +'" onclick="App.showPatientDetail(\'' + pid + '\',this);return false;">' + name + '</a>';
  return new Handlebars.SafeString(result);
}