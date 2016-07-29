import Handlebars from 'handlebars';

module.exports = function(text, url, target) {
  text = Handlebars.Utils.escapeExpression(text);
  url  = Handlebars.Utils.escapeExpression(url);

  var result = '<a href="#" onclick="return App.paginatePatientList(\'' + url + '\')">' + text + '</a>';

  return new Handlebars.SafeString(result);
}