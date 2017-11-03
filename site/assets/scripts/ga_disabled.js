/** 
 * This function must be defined, even if we are in staging or development mode
**/

window.trackOutboundLink = function(url) {
  console.log('Tracking: ' + url);
  setTimeout(function(){document.location=url},500); // Mimic production callback
}
