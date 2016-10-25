import Handlebars from 'handlebars';

module.exports = function(name, pid) {
  name = Handlebars.Utils.escapeExpression(name);
  // NOTE: for testing the photo and cause of death functionality, switch result
  // var result = '<a href="#" onclick="return App.showPatientDetail(\'' + "580f8f2b1445d4235f724336" + '\',this)">' + name + '</a>';
  var result = '<a href="#" onclick="return App.showPatientDetail(\'' + pid + '\',this)">' + name + '</a>';
  return new Handlebars.SafeString(result);
}