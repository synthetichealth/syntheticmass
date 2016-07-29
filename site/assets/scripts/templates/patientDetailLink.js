import Handlebars from 'handlebars';

module.exports = function(name, pid) {
  name = Handlebars.Utils.escapeExpression(name);
  var result = '<a href="#" onclick="return App.showPatientDetail(\'' + pid + '\')">' + name + '</a>';
  return new Handlebars.SafeString(result);
}