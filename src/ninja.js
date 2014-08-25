(function (codeMirror, angular) {
  if (!codeMirror) throw new Error('codemirror is required.');

  // bootstrap main function
  (function(fn){
    if (typeof exports == "object" && typeof module == "object") // CommonJS
      module.exports = fn();
    else if (typeof define == "function" && define.amd) // AMD
      return define([], fn);
    else if (angular) // Angular.js
      return angular.module('ninja', []).service('ninja', ninja);
    else 
      this.ninja = fn();
  })(Ninja);

  function Ninja() {
    
  }
})(window.codemirror, window.angular);
